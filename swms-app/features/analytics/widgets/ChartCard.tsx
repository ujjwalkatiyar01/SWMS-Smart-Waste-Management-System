// Frame for one chart: title, period, optional headline figure on the right, and the chart.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ChartCard({ title, period, aside, children, className }: { title: string; period?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-3xl border border-leaf-900/5 bg-white p-5 shadow-card sm:p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-ui font-semibold text-leaf-950/70">{title}</h3>
          {period && <p className="mt-1 text-sm text-leaf-950/60">{period}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Screen-reader table with the same numbers as the chart (WCAG: charts alone are not readable). */
export function SrTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => (j === 0 ? <th key={j} scope="row">{v}</th> : <td key={j}>{v}</td>))}</tr>)}</tbody>
    </table>
  );
}

export function EmptyChart({ text = "No data in this period yet." }: { text?: string }) {
  return <p className="flex min-h-40 items-center justify-center rounded-2xl bg-leaf-50 px-4 text-center text-ui text-leaf-950/70">{text}</p>;
}
