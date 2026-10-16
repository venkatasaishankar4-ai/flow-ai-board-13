import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createRunIdFetch } from "@/lib/ai/run-id.server";

const statusEnum = z.enum(["todo", "in_progress", "done"]);
const priorityEnum = z.enum(["low", "medium", "high"]);

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = auth.slice(7);
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const db = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", key);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data: userData, error: userErr } = await db.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const { messages } = (await request.json()) as { messages: UIMessage[] };

        const tools = {
          list_tasks: tool({
            description: "List all tasks on the user's Kanban board.",
            inputSchema: z.object({}),
            execute: async () => {
              const { data, error } = await db
                .from("tasks")
                .select("id,title,description,status,tag,priority,due_date")
                .order("position");
              if (error) return { error: error.message };
              return { tasks: data };
            },
          }),
          create_task: tool({
            description: "Create a new task card on the board.",
            inputSchema: z.object({
              title: z.string(),
              description: z.string().nullable(),
              status: statusEnum.nullable(),
              tag: z.string().nullable().describe("e.g. Design, Development, Research, Testing, Marketing"),
              priority: priorityEnum.nullable(),
              due_date: z.string().nullable().describe("YYYY-MM-DD"),
            }),
            execute: async (i) => {
              const { data, error } = await db
                .from("tasks")
                .insert({
                  user_id: userId,
                  title: i.title,
                  description: i.description,
                  status: i.status ?? "todo",
                  tag: i.tag,
                  priority: i.priority ?? "medium",
                  due_date: i.due_date,
                  position: Date.now(),
                })
                .select("id,title,status")
                .single();
              if (error) return { error: error.message };
              return { created: data };
            },
          }),
          update_task: tool({
            description: "Update or move an existing task (by id). Use list_tasks first to find ids.",
            inputSchema: z.object({
              id: z.string(),
              title: z.string().nullable(),
              description: z.string().nullable(),
              status: statusEnum.nullable(),
              tag: z.string().nullable(),
              priority: priorityEnum.nullable(),
              due_date: z.string().nullable(),
            }),
            execute: async ({ id, ...rest }) => {
              const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
              for (const [k, v] of Object.entries(rest)) if (v !== null) patch[k] = v;
              if (rest.status) patch.position = Date.now();
              const { data, error } = await db.from("tasks").update(patch).eq("id", id).select("id,title,status").single();
              if (error) return { error: error.message };
              return { updated: data };
            },
          }),
        };

        const runId = createRunIdFetch(request.headers.get("X-Lovable-AIG-Run-ID") ?? undefined);
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runId.fetch,
        });

        const today = new Date().toISOString().slice(0, 10);
        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions: `You are Flow, a friendly, concise project assistant inside a Kanban board app. Today is ${today}. Columns: todo (To Do), in_progress (In Progress), done (Done). Always call list_tasks before answering questions about the board or modifying existing tasks. You can create and update/move tasks. Confirm what you changed in a short summary. Use markdown sparingly.`,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        const res = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onError: (e) => {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes("402")) return "AI credits are used up. Add credits to keep chatting.";
            if (msg.includes("429")) return "Too many requests — please wait a moment.";
            return "The assistant ran into a problem. Please try again.";
          },
        });
        const id = runId.getRunId();
        if (id) res.headers.set("X-Lovable-AIG-Run-ID", id);
        return res;
      },
    },
  },
});
