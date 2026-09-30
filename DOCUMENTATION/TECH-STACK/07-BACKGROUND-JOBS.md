# 7 · Background Jobs Tech Stack

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value |

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md) (D2, G5, §5 item 10).
2. Check whether any job, schedule or time-zone rule there is missing from this file.
3. Cross-check with the full docs: [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (§9 jobs, F5, F6.5, F12.5, F13), [../05-AI-SPEC.md](../05-AI-SPEC.md) (A3–A5), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) (§9).
4. Also read: [03-DATABASE.md](03-DATABASE.md), [08-DEVOPS.md](08-DEVOPS.md).
5. Missing something → add it here and in 06 (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 5 (scheduled jobs every 15 min), 8 (time zone, with G5).

---

## 1. Tools

| Tool | Why |
|---|---|
| **Supabase Cron (pg_cron)** calling SQL functions in the `private` schema | Runs inside the database, every 15 min / hourly / daily [Doc]; no public endpoint to call (04 §5 item 10) |
| Not Vercel Cron | Hobby plan runs jobs only once per day [Doc] (D2) |

---

## 2. The 7 jobs

| Job | Schedule (UTC) | Function | Does | Runs twice safely? |
|---|---|---|---|---|
| Overdue | every 15 min | `private.job_overdue()` | Open case past `due_at` → flag once, event, notify admins | ✅ tested |
| Escalation L1 + L2 | every 15 min | `private.job_escalation()` | `due_at + 12 h` → level 1, supervisors; `due_at + 24 h` → level 2, higher authority (demo) | ✅ tested |
| Missed pickups | every 15 min | `private.job_missed_pickups()` | Scheduled past slot end (`morning_slot_end` 12:00 / `afternoon_slot_end` 17:00 local, demo) or requested past preferred date → `missed` + linked complaint + notify | rule written |
| Routine collection | every 15 min | `private.job_routine_collection()` | Schedule window ended today → `collection_runs` on_time / missed (+ admins notified); `end_trip` later turns missed into late | rule written |
| No-reply | hourly | `private.job_no_reply()` | `awaiting_review` longer than `no_reply_hours` (demo 24) → tell admins they may close "no response" | rule written |
| Hotspot risk 🧠 | daily 00:30 UTC (06:00 IST) | `private.job_hotspot_risk()` | 0–100 score per location for tomorrow from **distinct incidents only** (🆕 R6); labelled *prediction from demo data, not validated* | ✅ tested |
| Performance flags 🧠 | daily 00:45 UTC (06:15 IST) | `private.job_performance_flags()` | SLA below 70 % with ≥ 5 closed cases over 7 days (demo) → flag routed per 05 A4 | rule written |

All jobs write events with `actor_id = null` (the system) and notifications like any other change.

---

## 3. Time zones (G5)

- pg_cron schedules are in **UTC** [Verify].
- Inside each job, "today", slot ends and schedule windows are compared in the **organisation's time zone** (`now() at time zone organizations.timezone`, demo Asia/Kolkata).
- Hour-based rules (overdue, escalation) use exact timestamps, so time zones do not affect them.

## 4. Job health (06 I6)

`get_job_health()` shows admins the last run and result of each job from pg_cron's run history (`cron.job_run_details`) [Verify]. Check it in the pre-demo checklist ([08-DEVOPS.md](08-DEVOPS.md)).

## 5. Demo tips

- Seed data puts some `due_at` values in the past (relative to now) so overdue and escalated cases exist when the demo starts.
- To show a job live, run it once by hand in the SQL editor: `select private.job_overdue();`.

## 6. Where it lives

```
supabase/migrations/0008_jobs.sql   job functions + cron.schedule(...)
```

## 7. Testing

Call each job twice → one event and one notification per case; move the clock by editing `due_at` in a test; check local-time windows with the demo schedule.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Wrong time zone → collections marked missed at the wrong hour | Local-time comparison; test with the demo schedule |
| Free project paused → jobs stop [Verify] | Open the app before the demo; check job health |
| A job fails silently | `get_job_health()` |

## 9. Confirm at setup [Verify]

pg_cron enabled in the project · UTC schedule behaviour · `cron.job_run_details` available.
