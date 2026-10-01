// Organisation time-zone formatting (03 §3: stored in UTC, shown in local time).
export const ORG_TIME_ZONE = "Asia/Kolkata"; // demo organisation setting

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: ORG_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("en-IN", {
  timeZone: ORG_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string) {
  return dateOnly.format(new Date(iso));
}

/** "in 5h", "in 2d", "3h ago" — short relative label. */
export function relative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const h = Math.round(abs / 36e5);
  const label = h < 1 ? `${Math.max(1, Math.round(abs / 6e4))}m` : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
  return diff >= 0 ? `in ${label}` : `${label} ago`;
}

/** Hours past due, or 0 when not overdue. */
export function hoursOverdue(dueIso: string, now = Date.now()) {
  const diff = now - new Date(dueIso).getTime();
  return diff > 0 ? Math.max(1, Math.round(diff / 36e5)) : 0;
}

const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: ORG_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: ORG_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** The organisation's local date as YYYY-MM-DD, `offset` days from today. */
export function orgDay(offset = 0, now = Date.now()) {
  return isoDay.format(new Date(now + offset * 864e5));
}

/** The organisation's local time as HH:MM. */
export function orgClock(now = Date.now()) {
  return clock.format(new Date(now));
}

/** "Mon 6 Oct" for a YYYY-MM-DD date without shifting it by time zone. */
export function formatDay(day: string) {
  return formatDate(`${day}T12:00:00+05:30`);
}
