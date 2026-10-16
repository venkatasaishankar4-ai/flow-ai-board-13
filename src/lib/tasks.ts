import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Status = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export const COLUMNS: { id: Status; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export const COLUMN_ACCENT: Record<Status, { dot: string; text: string }> = {
  todo: { dot: "bg-tag-orange", text: "text-tag-orange" },
  in_progress: { dot: "bg-tag-blue", text: "text-tag-blue" },
  done: { dot: "bg-tag-green", text: "text-tag-green" },
};

export const TAGS = ["Design", "Development", "Research", "Testing", "Marketing"] as const;

export const TAG_STYLES: Record<string, string> = {
  design: "bg-tag-violet-bg text-tag-violet",
  development: "bg-tag-amber-bg text-tag-amber",
  research: "bg-tag-orange-bg text-tag-orange",
  testing: "bg-tag-blue-bg text-tag-blue",
  marketing: "bg-tag-green-bg text-tag-green",
};
export const tagStyle = (t?: string | null) =>
  TAG_STYLES[(t ?? "").toLowerCase()] ?? "bg-secondary text-muted-foreground";

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tasks").select("*").order("position");
    if (error) throw error;
    return data as Task[];
  },
});
