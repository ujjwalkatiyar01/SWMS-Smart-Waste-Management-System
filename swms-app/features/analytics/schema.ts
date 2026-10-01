// Shapes of the dashboard analytics: KPI cards with the change against the previous period, daily
// series for bar / line charts and breakdowns for donut and bar lists. Built from the organisation's data.

export const RANGES = [7, 14, 30] as const;
export type RangeDays = (typeof RANGES)[number];

/** Chart colours, mapped to brand tokens in the widgets. */
export type Tone = "leaf" | "lime" | "sky" | "amber" | "danger" | "muted" | "ink";

export interface Kpi {
  label: string;
  value: number | null;
  /** Value in the previous period of the same length; null when a comparison makes no sense (a snapshot). */
  previous: number | null;
  format: "count" | "percent" | "hours" | "km";
  /** Which direction is good news; "neutral" shows the change without good / bad colour. */
  better: "up" | "down" | "neutral";
  hint?: string;
}

export interface Series {
  key: string;
  label: string;
  tone: Tone;
}

export interface DayPoint {
  day: string; // YYYY-MM-DD, organisation's local date
  values: Record<string, number>;
}

export interface Slice {
  label: string;
  value: number;
  tone: Tone;
}

export interface StackRow {
  label: string;
  values: Record<string, number>;
}
