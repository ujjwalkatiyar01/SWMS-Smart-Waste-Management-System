"use client";

// Marks an open prevention review done and records the outcome.

import { ReasonForm } from "@/components/shared/ReasonForm";
import { completePreventionReview } from "../actions";

export function ReviewDone({ reviewId }: { reviewId: string }) {
  return (
    <ReasonForm
      label="Outcome"
      hint="What changed at this place?"
      submitLabel="Mark review done"
      doneMessage="Review marked done."
      onSubmit={(outcome) => completePreventionReview({ reviewId, outcome })}
    />
  );
}
