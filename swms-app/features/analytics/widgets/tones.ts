// Brand colours for chart series. Text values always sit next to the colour, so colour is never the only cue.
import type { Tone } from "../schema";

export const TONE: Record<Tone, { bg: string; soft: string; stroke: string; fill: string }> = {
  leaf: { bg: "bg-leaf-600", soft: "bg-leaf-100", stroke: "stroke-leaf-600", fill: "fill-leaf-600/15" },
  lime: { bg: "bg-leaf-300", soft: "bg-lime-soft", stroke: "stroke-leaf-300", fill: "fill-leaf-300/20" },
  sky: { bg: "bg-sky-600", soft: "bg-sky-soft", stroke: "stroke-sky-600", fill: "fill-sky-600/10" },
  amber: { bg: "bg-amber-500", soft: "bg-amber-100", stroke: "stroke-amber-500", fill: "fill-amber-500/15" },
  danger: { bg: "bg-danger", soft: "bg-danger-soft", stroke: "stroke-danger", fill: "fill-danger/10" },
  muted: { bg: "bg-stone-400", soft: "bg-stone-100", stroke: "stroke-stone-400", fill: "fill-stone-400/10" },
  ink: { bg: "bg-leaf-900", soft: "bg-leaf-100", stroke: "stroke-leaf-900", fill: "fill-leaf-900/10" },
};

/** Axis maximum with four whole-number steps (counts never show 3.8 or 1.3). */
export function niceMax(value: number) {
  const raw = Math.max(1, value / 4);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw && Number.isInteger(s)) ?? Math.ceil(raw);
  return step * 4;
}

const short = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
/** "30 Sept" / "Tue, 30 Sept" for a YYYY-MM-DD day. */
export const dayShort = (day: string) => short.format(new Date(`${day}T00:00:00Z`));
export const dayLong = (day: string) => long.format(new Date(`${day}T00:00:00Z`));
