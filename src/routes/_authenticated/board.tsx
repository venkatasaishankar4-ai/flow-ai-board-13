import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LayoutGrid, LogOut, Plus, Search, Sparkles as _unused, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COLUMNS, tasksQuery, type Status, type Task } from "@/lib/tasks";
import { Logo } from "@/components/Logo";
import { TaskCard } from "@/components/board/TaskCard";
import { TaskDialog, type TaskDraft } from "@/components/board/TaskDialog";
import { ChatPanel } from "@/components/chat/ChatPanel";
void _unused;

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { title: "My board — Flowboard" },
      { name: "description", content: "Your Kanban board with To Do, In Progress and Done columns and an AI copilot." },
      { property: "og:title", content: "My board — Flowboard" },
      { property: "og:description", content: "Your Kanban board with an AI copilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: BoardPage,
});

const DOT: Record<Status, string> = { todo: "bg-muted-foreground", in_progress: "bg-primary", done: "bg-tag-green" };

function BoardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null; status: Status }>({ open: false, task: null, status: "todo" });
  const [chatOpen, setChatOpen] = useState(true);

  const filtered = useMemo(
    () => tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()) || (t.tag ?? "").toLowerCase().includes(query.toLowerCase())),
    [tasks, query],
  );

  const setCache = (fn: (ts: Task[]) => Task[]) => qc.setQueryData<Task[]>(tasksQuery.queryKey, (ts) => fn(ts ?? []));

  const move = useMutation({
    mutationFn: async ({ id, status, position }: { id: string; status: Status; position: number }) => {
      const { error } = await supabase.from("tasks").update({ status, position, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, status, position }) =>
      setCache((ts) => ts.map((t) => (t.id === id ? { ...t, status, position } : t)).sort((a, b) => a.position - b.position)),
    onError: (e) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  async function saveTask(d: TaskDraft) {
    const payload = {
      title: d.title.trim(),
      description: d.description || null,
      status: d.status,
      tag: d.tag || null,
      priority: d.priority,
      due_date: d.due_date || null,
    };
    const res = dialog.task
      ? await supabase.from("tasks").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", dialog.task.id)
      : await supabase.from("tasks").insert({ ...payload, user_id: user.id, position: Date.now() });
    if (res.error) return toast.error(res.error.message);
    toast.success(dialog.task ? "Task updated" : "Task added");
    setDialog((s) => ({ ...s, open: false }));
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function deleteTask() {
    if (!dialog.task) return;
    const { error } = await supabase.from("tasks").delete().eq("id", dialog.task.id);
    if (error) return toast.error(error.message);
    setDialog((s) => ({ ...s, open: false }));
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = user.email?.split("@")[0] ?? "You";

  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Sidebar */}
      <nav className="hidden w-56 shrink-0 flex-col rounded-3xl bg-surface p-5 shadow-[var(--shadow-panel)] lg:flex">
        <Logo />
        <div className="mt-10 space-y-1">
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5 text-sm font-semibold">
            <LayoutGrid className="h-4 w-4 text-primary" /> Board
          </div>
          <button onClick={() => setChatOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Bot className="h-4 w-4" /> Ask Flow
          </button>
        </div>
        <div className="mt-8 space-y-3 rounded-2xl bg-column p-4">
          {COLUMNS.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><span className={`h-2 w-2 rounded-full ${DOT[c.id]}`} />{c.title}</span>
              <span className="font-semibold">{tasks.filter((t) => t.status === c.id).length}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 border-t pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft font-semibold capitalize text-primary">{name[0]}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold capitalize">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
          <button title="Sign out" onClick={signOut} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      {/* Main board */}
      <main className="flex min-w-0 flex-1 flex-col rounded-3xl bg-surface shadow-[var(--shadow-panel)]">
        <header className="flex flex-wrap items-center gap-3 px-8 pt-7">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border bg-card px-3 sm:max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="ml-auto flex gap-2">
            {!chatOpen && (
              <button onClick={() => setChatOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-accent">
                <Bot className="h-4 w-4 text-primary" /> Ask AI
              </button>
            )}
            <button onClick={() => setDialog({ open: true, task: null, status: "todo" })} className="flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-ink-foreground shadow-[var(--shadow-card)] hover:opacity-90">
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        </header>
        <div className="px-8 pb-2 pt-6">
          <h1 className="text-4xl font-semibold tracking-tight">My Board</h1>
          <p className="mt-1 text-sm text-muted-foreground">Drag cards between columns. Everything saves automatically.</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-auto px-8 pb-8 pt-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.id);
            const isOver = overCol === col.id && dragId;
            return (
              <section
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.id);
                }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = dragId;
                  setDragId(null);
                  setOverCol(null);
                  if (!id) return;
                  move.mutate({ id, status: col.id, position: Date.now() });
                }}
                className={`flex min-h-64 flex-col rounded-2xl p-3 transition-colors ${isOver ? "bg-primary-soft ring-2 ring-primary/30 ring-dashed" : "bg-column"}`}
              >
                <div className="mb-3 flex items-center justify-between px-1.5">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                    {col.title} <span className="font-sans text-base font-normal text-muted-foreground">{items.length}</span>
                  </h2>
                  <button onClick={() => setDialog({ open: true, task: null, status: col.id })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  {items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      dragging={dragId === t.id}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(t.id);
                      }}
                      onOpen={() => setDialog({ open: true, task: t, status: t.status as Status })}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="grid flex-1 place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
                      Drop cards here
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {chatOpen && (
        <div className="hidden w-96 shrink-0 overflow-hidden rounded-3xl shadow-[var(--shadow-panel)] md:flex">
          <ChatPanel onClose={() => setChatOpen(false)} />
        </div>
      )}

      <TaskDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))}
        initial={dialog.task}
        defaultStatus={dialog.status}
        onSave={saveTask}
        onDelete={dialog.task ? deleteTask : undefined}
      />
    </div>
  );
}
