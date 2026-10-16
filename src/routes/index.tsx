import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Columns3, Database } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowboard — Kanban board with an AI copilot" },
      { name: "description", content: "Plan work in To Do, In Progress and Done columns, and let an AI assistant create and move tasks for you." },
      { property: "og:title", content: "Flowboard — Kanban board with an AI copilot" },
      { property: "og:description", content: "Plan work visually and let AI move your tasks. Saved to your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-40 bottom-[-12rem] h-[30rem] w-[30rem] rounded-full bg-primary" />
      <div className="pointer-events-none absolute right-24 -top-16 h-40 w-40 rounded-full bg-tag-violet" />
      <div className="pointer-events-none absolute bottom-24 right-40 h-14 w-14 rounded-full bg-tag-amber" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6">
        <header className="flex items-center justify-between py-8">
          <Logo />
          <Link to="/auth" className="rounded-xl border bg-card px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)] hover:bg-accent">
            Sign in
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
          <span className="mb-6 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Kanban + AI copilot
          </span>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Move work forward,<br />one card at a time.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Drag tasks from To Do to Done, and ask your assistant to plan, create and reorganise them for you.
          </p>
          <Link
            to="/board"
            className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 font-medium text-ink-foreground shadow-[var(--shadow-lift)] transition hover:-translate-y-0.5"
          >
            Open my board <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="mt-20 grid w-full max-w-3xl gap-4 md:grid-cols-3">
            {[
              { icon: Columns3, t: "Drag & drop", d: "To Do, In Progress, Done." },
              { icon: Bot, t: "AI that acts", d: "Ask it to add or move cards." },
              { icon: Database, t: "Always saved", d: "Pick up where you left off." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border bg-card p-5 text-left shadow-[var(--shadow-card)]">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-semibold">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
