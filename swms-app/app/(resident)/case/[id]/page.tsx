import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AssignPanel, ReviewPanel } from "@/features/admin";
import { InstructionPanel } from "@/features/escalations";
import { CaseView, EvidencePanel, ReopenPanel, isFinished } from "@/features/reports";
import { getCase } from "@/features/reports/server";
import { DelayNotePanel } from "@/features/staff";
import { CompletePanel, ReturnPanel } from "@/features/worker";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";

export const metadata: Metadata = { title: "Case — SWMS" };

// One case page for every role (01-FRONTEND §3); role panels appear only where 03 §7 allows the action.
// The database functions behind each panel check role, organisation and status again.
export default async function CasePage({ params }: PageProps<"/case/[id]">) {
  const { id } = await params;
  const [data, me] = await Promise.all([getCase(id), getCurrentUser()]);
  if (!data || !me) notFound();

  const full = data.kind === "full";
  const open = !isFinished(data.status);
  const isAdmin = me.role === "admin";
  const isAssignedWorker = full && data.viewer.isAssignedWorker;

  const panels = [
    full && (isAdmin || me.role === "supervisor") && <AssignPanel key="assign" reportId={data.id} />,
    isAssignedWorker && data.status === "assigned" && <CompletePanel key="complete" reportId={data.id} />,
    isAssignedWorker && data.status === "assigned" && <ReturnPanel key="return" reportId={data.id} />,
    full && isAdmin && open && <ReviewPanel key="review" reportId={data.id} status={data.status} issueType={data.issueType} />,
    full && (isAdmin || isAssignedWorker) && data.overdue && <DelayNotePanel key="delay" reportId={data.id} />,
    (me.role === "supervisor" || me.role === "higher_authority") && open && <InstructionPanel key="instruction" reportId={data.id} />,
    full && data.viewer.isReporter && open && <EvidencePanel key="evidence" reportId={data.id} />,
    // A follower sees the summary only (P1) and may still add evidence; the database checks they follow the case.
    !full && me.role === "resident" && open && <EvidencePanel key="evidence" reportId={data.id} />,
    full && data.canReopen && <ReopenPanel key="reopen" reportId={data.id} />,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={ROLE_HOME[me.role]}
        className="inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-ui font-semibold text-leaf-900 hover:bg-leaf-100"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <CaseView
        data={data}
        actions={
          panels.length > 0 && (
            <section aria-label="Actions" className="flex flex-col gap-4">
              {panels}
            </section>
          )
        }
      />
    </div>
  );
}
