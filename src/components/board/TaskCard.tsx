import { CalendarDays, Signal } from "lucide-react";
import { tagStyle, type Task } from "@/lib/tasks";

const PRIORITY: Record<string, { label: string; bar: string | null }> = {
  low: { label: "text-tag-blue", bar: null },
  medium: { label: "text-tag-orange", bar: "bg-tag-orange" },
  high: { label: "text-destructive", bar: "bg-destructive" },
};

export function TaskCard({
  task,
  onOpen,
  onDragStart,
  dragging,
}: {
  task: Task;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  dragging: boolean;
  }) {
  const due = task.due_date ? new Date(task.due_date + "T00:00:00") : null;
  const overdue = due && task.status !== "done" && due < new Date(new Date().toDateString());
  const priority = PRIORITY[task.priority] ?? { label: "text-muted-foreground", bar: null };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={`relative group cursor-grab overflow-hidden rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] card-lift animate-pop active:cursor-grabbing ${dragging ? "rotate-2 opacity-40" : ""}`}
    >
      {priority.bar && <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${priority.bar}`} />}
      <div className="flex items-start justify-between gap-2">
        {task.tag ? (
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagStyle(task.tag)}`}>{task.tag}</span>
        ) : <span />}
        <span className={`flex items-center gap-1.5 text-xs font-semibold capitalize ${priority.label}`}>
          {priority.bar && task.priority !== "high" && <span className={`h-0.5 w-3 rounded-full ${priority.bar}`} />}
          <Signal className="h-3.5 w-3.5" /> {task.priority}
        </span>
      </div>
      <div className="mt-3 font-semibold leading-snug">{task.title}</div>
      {task.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>}
      {due && (
        <div className={`mt-4 flex items-center gap-1.5 border-t pt-3 text-xs font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
          <CalendarDays className="h-3.5 w-3.5" />
          {due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}
    </div>
  );
}
