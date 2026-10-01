"use client";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()}
    className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-white print:hidden">Print QR sheet</button>;
}
