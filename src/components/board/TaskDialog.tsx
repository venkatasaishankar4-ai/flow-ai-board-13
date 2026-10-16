import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COLUMNS, TAGS, type Priority, type Status, type Task } from "@/lib/tasks";

export type TaskDraft = {
  title: string;
  description: string;
  status: Status;
  tag: string;
  priority: Priority;
  due_date: string;
};

export function TaskDialog({
  open,
  onOpenChange,
  initial,
  defaultStatus,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Task | null;
  defaultStatus: Status;
  onSave: (d: TaskDraft) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<TaskDraft>(blank(defaultStatus));
  useEffect(() => {
    if (!open) return;
    setD(
      initial
        ? {
            title: initial.title,
            description: initial.description ?? "",
            status: initial.status as Status,
            tag: initial.tag ?? "",
            priority: initial.priority as Priority,
            due_date: initial.due_date ?? "",
          }
        : blank(defaultStatus),
    );
  }, [open, initial, defaultStatus]);

  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-medium transition ${active ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:bg-accent"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{initial ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!d.title.trim()) return;
            onSave(d);
          }}
        >
          <Input autoFocus placeholder="Task title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className="h-11 rounded-xl text-base" />
          <Textarea placeholder="Description (optional)" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="min-h-20 rounded-xl" />
          <Field label="Column">
            {COLUMNS.map((c) => (
              <button type="button" key={c.id} className={chip(d.status === c.id)} onClick={() => setD({ ...d, status: c.id })}>{c.title}</button>
            ))}
          </Field>
          <Field label="Tag">
            {TAGS.map((t) => (
              <button type="button" key={t} className={chip(d.tag === t)} onClick={() => setD({ ...d, tag: d.tag === t ? "" : t })}>{t}</button>
            ))}
          </Field>
          <Field label="Priority">
            {(["low", "medium", "high"] as const).map((p) => (
              <button type="button" key={p} className={chip(d.priority === p) + " capitalize"} onClick={() => setD({ ...d, priority: p })}>{p}</button>
            ))}
          </Field>
          <Field label="Due date">
            <Input type="date" value={d.due_date} onChange={(e) => setD({ ...d, due_date: e.target.value })} className="h-10 w-48 rounded-xl" />
          </Field>
          <div className="flex items-center justify-between pt-2">
            {onDelete ? (
              <button type="button" onClick={onDelete} className="text-sm font-medium text-destructive hover:underline">Delete task</button>
            ) : <span />}
            <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] hover:opacity-90">
              {initial ? "Save changes" : "Add task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function blank(status: Status): TaskDraft {
  return { title: "", description: "", status, tag: "", priority: "medium", due_date: "" };
}
