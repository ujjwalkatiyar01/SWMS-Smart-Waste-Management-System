// CSV download of reports or pickups by date and area (02-PRD F5). A plain form: the browser downloads the file.

import { Download } from "lucide-react";

const field = "h-11 rounded-lg border border-input bg-card px-3 text-ui outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ExportForm({ areaNames }: { areaNames: string[] }) {
  return (
    <form method="get" action="/api/export" className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
        Data
        <select name="type" defaultValue="reports" className={field}>
          <option value="reports">Reports</option>
          <option value="pickups">Pickups</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
        From
        <input type="date" name="from" className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
        To
        <input type="date" name="to" className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
        Area <span className="font-normal text-muted-foreground">(reports only)</span>
        <select name="area" defaultValue="" className={field}>
          <option value="">All areas</option>
          {areaNames.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800">
        <Download className="size-4" aria-hidden /> Download CSV
      </button>
    </form>
  );
}
