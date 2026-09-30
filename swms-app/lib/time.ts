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
