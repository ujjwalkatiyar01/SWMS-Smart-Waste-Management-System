// GET /api/export?type=reports|pickups&from=YYYY-MM-DD&to=YYYY-MM-DD&area=<name> — CSV download for admins
// (02-PRD F5, 02-BACKEND §6). Read as the admin, so row rules keep it to their own organisation.
// No resident names, emails or phone numbers are exported; reports name the assigned worker, pickups carry the
// address the resident typed.

import { z } from "zod";
import type { Db } from "@/features/staff/server";
import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const query = z.object({
  type: z.enum(["reports", "pickups"]),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  area: z.string().trim().max(80).optional(),
});

const LIMIT = 5000;

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return new Response("You can't do this.", { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = query.safeParse({ ...params, from: params.from || undefined, to: params.to || undefined, area: params.area || undefined });
  if (!parsed.success) return new Response("Choose a type and valid dates.", { status: 400 });
  const { type, from, to, area } = parsed.data;

  const db = (await createClient()) as unknown as Db; // the shared client is not typed with the generated schema yet
  const { data: org } = await db.from("organizations").select("timezone").eq("id", me.orgId).single();
  // Dates mean days in the organisation's time zone (03 §3), not in UTC.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: org?.timezone ?? "Asia/Kolkata" });
  const inRange = (iso: string) => {
    const d = day.format(new Date(iso));
    return (!from || d >= from) && (!to || d <= to);
  };
  const local = (iso: string | null) => (iso ? new Date(iso).toISOString() : "");

  let csv: string;
  if (type === "reports") {
    const { data, error } = await db
      .from("reports")
      .select(
        "id, created_at, issue_type, waste_category, status, due_at, closed_at, sla_met, feedback, satisfaction, far_from_site, escalation_level, locations!reports_location_id_fkey(name, areas!locations_area_id_fkey(name)), worker:users!reports_assigned_worker_id_fkey(name)",
      )
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) return new Response("Could not build the file.", { status: 500 });
    const rows = data
      .filter((r) => inRange(r.created_at) && (!area || r.locations?.areas?.name === area))
      .map((r) => [
        r.id, local(r.created_at), r.issue_type, r.waste_category, r.status, r.locations?.areas?.name, r.locations?.name,
        r.worker?.name, local(r.due_at), local(r.closed_at), r.sla_met, r.feedback, r.satisfaction, r.far_from_site, r.escalation_level,
      ]);
    csv = toCsv(
      ["id", "reported_at", "issue_type", "waste_category", "status", "area", "place", "assigned_worker", "due_at", "closed_at", "closed_before_due", "feedback", "satisfaction", "completed_far_from_site", "escalation_level"],
      rows,
    );
  } else {
    const { data, error } = await db
      .from("pickup_requests")
      .select("id, created_at, waste_type, preferred_date, slot, status, address, segregation_ok, decline_reason, refuse_reason")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (error) return new Response("Could not build the file.", { status: 500 });
    const rows = data.filter((p) => inRange(p.created_at)).map((p) => [
      p.id, local(p.created_at), p.waste_type, p.preferred_date, p.slot, p.status, p.address, p.segregation_ok, p.decline_reason ?? p.refuse_reason,
    ]);
    csv = toCsv(["id", "requested_at", "waste_type", "date", "slot", "status", "address", "segregated", "reason"], rows);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="swms-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
