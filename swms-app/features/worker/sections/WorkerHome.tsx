// Worker / Driver home (02-PRD F4): today's counts, area filter, own tasks with status and due time.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DueLabel, EmptyState, ISSUE_TYPE_LABEL, PICKUP_WASTE_LABEL, StatCard, StatGrid } from "@/features/staff";
import { firstName } from "@/lib/auth/session";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { getWorkerHome } from "../server";

type Home = Awaited<ReturnType<typeof getWorkerHome>>;

export function WorkerHome({ data }: { data: Home }) {
  const { counts } = data;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow text-leaf-600">Worker / Driver</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-leaf-950">Today, {firstName(data.name)}</h1>
      </header>

      <StatGrid label="Today's work">
        <StatCard label="Assigned" value={counts.assigned} />
        <StatCard label="Done" value={counts.done} />
        <StatCard label="Remaining" value={counts.remaining} tone={counts.remaining ? "warning" : "plain"} />
        <StatCard label="Overdue" value={counts.overdue} tone={counts.overdue ? "danger" : "plain"} />
      </StatGrid>

      {data.areas.length > 1 && (
        <nav aria-label="Filter by area" className="flex flex-wrap gap-2">
          <AreaChip href="/worker" active={!data.areaId}>
            All areas
          </AreaChip>
          {data.areas.map((a) => (
            <AreaChip key={a.id} href={`/worker?area=${a.id}`} active={data.areaId === a.id}>
              {a.name}
            </AreaChip>
          ))}
        </nav>
      )}

      <section aria-labelledby="todo-title">
        <h2 id="todo-title" className="text-xl font-bold text-leaf-950">
          To do
        </h2>
        <div className="mt-4">
          {data.todo.length ? (
            <TaskList tasks={data.todo} />
          ) : (
            <EmptyState title="No open tasks" hint="New tasks appear here when an admin assigns them to you." />
          )}
        </div>
      </section>

      <section aria-labelledby="done-title">
        <h2 id="done-title" className="text-xl font-bold text-leaf-950">
          Done today
        </h2>
        <div className="mt-4">
          {data.doneToday.length ? (
            <TaskList tasks={data.doneToday} />
          ) : (
            <EmptyState title="Nothing marked done yet today" />
          )}
        </div>
      </section>

      <section aria-labelledby="pickups-title">
        <h2 id="pickups-title" className="text-xl font-bold text-leaf-950">
          Scheduled pickups
        </h2>
        <div className="mt-4">
          {data.pickups.length ? (
            <ul className="flex flex-col gap-2">
              {data.pickups.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pickup/${p.id}`}
                    className="flex min-h-11 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-leaf-50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-leaf-950">{PICKUP_WASTE_LABEL[p.waste_type] ?? p.waste_type} pickup</span>
                        <StatusBadge status={p.status} />
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(p.preferred_date)} · {p.slot === "morning" ? "Morning" : "Afternoon"}
                        {p.address && ` · ${p.address}`}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No pickups scheduled for you" />
          )}
        </div>
      </section>
    </div>
  );
}

function AreaChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-4 text-ui font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-leaf-950 hover:bg-leaf-50",
      )}
    >
      {children}
    </Link>
  );
}

function TaskList({ tasks }: { tasks: Home["todo"] }) {
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link
            href={`/case/${t.id}`}
            className="flex min-h-11 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-leaf-50"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-leaf-950">{ISSUE_TYPE_LABEL[t.issueType] ?? t.issueType}</span>
                <StatusBadge status={t.status} />
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {t.placeName}
                {t.areaName && ` · ${t.areaName}`}
              </span>
              <DueLabel dueAt={t.dueAt} status={t.status} />
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
