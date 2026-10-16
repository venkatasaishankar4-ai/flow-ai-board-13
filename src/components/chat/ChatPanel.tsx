import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Check, Loader2, MessageSquarePlus, Square, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Thread = { id: string; title: string; messages: UIMessage[] };
const newThread = (): Thread => ({ id: crypto.randomUUID(), title: "New chat", messages: [] });

export function ChatPanel({ onClose }: { onClose: () => void }) {
  // Threads live only in this session (not saved), per the user's choice.
  const [threads, setThreads] = useState<Thread[]>(() => [newThread()]);
  const [activeId, setActiveId] = useState(() => threads[0]!.id);
  const active = threads.find((t) => t.id === activeId) ?? threads[0]!;

  const save = (id: string, messages: UIMessage[]) =>
    setThreads((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        const first = messages.find((m) => m.role === "user");
        const text = first?.parts.find((p) => p.type === "text");
        const title = text && "text" in text ? text.text.slice(0, 36) : t.title;
        return { ...t, messages, title };
      }),
    );

  return (
    <aside className="flex h-full w-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <FlowAvatar />
          <div>
            <div className="font-display font-semibold leading-tight">Flow</div>
            <div className="text-xs text-muted-foreground">Your board copilot</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="New chat"
            onClick={() => {
              const t = newThread();
              setThreads((ts) => [t, ...ts]);
              setActiveId(t.id);
            }}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {threads.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2.5">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`shrink-0 truncate rounded-lg px-3 py-1.5 text-xs font-medium max-w-40 ${t.id === activeId ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}
      <ChatWindow key={active.id} thread={active} onChange={save} />
    </aside>
  );
}

function FlowAvatar() {
  return (
    <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-ink text-ink-foreground">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M4 7h10M4 12h16M4 17h7" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary" />
    </div>
  );
}

const SUGGESTIONS = [
  "What's on my plate this week?",
  "Add a task to design the onboarding flow, high priority",
  "Move everything in progress to done",
];

function ChatWindow({ thread, onChange }: { thread: Thread; onChange: (id: string, m: UIMessage[]) => void }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
      },
    }),
    onError: (e) => toast.error(e.message || "The assistant couldn't respond."),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      taRef.current?.focus();
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    onChange(thread.id, messages);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, thread.id]);

  useEffect(() => taRef.current?.focus(), []);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="animate-pop pt-6">
            <h3 className="text-2xl font-semibold tracking-tight">Hi! How can I help with your board?</h3>
            <p className="mt-1 text-sm text-muted-foreground">I can answer questions and create or move tasks.</p>
            <div className="mt-5 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border bg-card px-4 py-3 text-left text-sm shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-primary-soft">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end animate-pop">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-ink-foreground">
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-2 animate-pop">
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return (
                    <div key={i} className="text-sm leading-relaxed [&_li]:ml-4 [&_li]:list-disc [&_p]:my-1.5 [&_strong]:font-semibold">
                      <ReactMarkdown>{p.text}</ReactMarkdown>
                    </div>
                  );
                if (p.type.startsWith("tool-")) {
                  const tp = p as { type: string; state?: string };
                  const name = tp.type.replace("tool-", "").replace("_", " ");
                  const done = tp.state === "output-available";
                  return (
                    <div key={i} className="inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
                      {done ? <Check className="h-3.5 w-3.5 text-tag-green" /> : <Wrench className="h-3.5 w-3.5 animate-pulse" />}
                      <span className="capitalize">{name}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ),
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="m-4 rounded-2xl border bg-card p-2 shadow-[var(--shadow-card)] focus-within:border-primary/50"
      >
        <textarea
          ref={taRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask Flow anything…"
          className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex justify-end">
          {busy ? (
            <button type="button" onClick={() => stop()} className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-ink-foreground">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button disabled={!input.trim()} className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40">
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </>
  );
}
