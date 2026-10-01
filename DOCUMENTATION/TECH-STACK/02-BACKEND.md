# 2 · Backend Tech Stack

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value · 🆕 named while splitting |

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md).
2. Check whether any backend tool, module, rule or limit there is missing from this file.
3. Cross-check with the full docs: [../02-PRD.md](../02-PRD.md), [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (F1–F13 "Backend" columns, §3 global rules, §7 permissions), [../05-AI-SPEC.md](../05-AI-SPEC.md), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) (§8 functions — the backend calls these).
4. Also read: [03-DATABASE.md](03-DATABASE.md), [04-AUTH.md](04-AUTH.md), [05-STORAGE-PHOTOS.md](05-STORAGE-PHOTOS.md), [06-AI.md](06-AI.md).
5. Missing something → add it here (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 2 (server-side authorization, with the database), 4 (photo upload + EXIF strip, with storage), 7 (aggregations), 10 (secrets), 11 (CSV), 12 (error logging), 13 and 18 (AI call and limit, with the AI part).

---

## 1. Scope

The backend is the **Next.js server side**: it receives requests from the screens, validates them, does the work that cannot run inside the database (photos, AI calls, CSV files), and calls the database functions that make every change. **Business rules live in the database functions** (06); the backend never re-implements them differently.

---

## 2. Tools

| Tool | Used for | Why |
|---|---|---|
| **Next.js server actions** | Every form change: create/edit/cancel report, assign, complete, feedback, pickups, trips, setup | Same app as the frontend; no separate API server [Rec] |
| **Next.js route handlers** | Multipart uploads (photos, AI analysis), CSV download, signed-link requests | Need raw request bodies and file responses |
| **Node.js runtime** 🆕 | Photo and AI routes (`export const runtime = 'nodejs'`) | `sharp` does not run on the Edge runtime [Verify] |
| **`@supabase/supabase-js` + `@supabase/ssr`** 🆕 | Two clients: **user client** (anon key + session cookie → RLS applies) and **admin client** (service-role key, fixed list of uses) | Official way to use Supabase sessions in Next.js [Verify package names] |
| **zod** | Validate every input; validate AI output | "Server validates every field" (03 §3) |
| **`sharp`** | Re-encode photos to JPEG, strip metadata | EXIF location removal on the server (D6) [Verify output has no metadata] |
| **AI adapter `lib/ai/`** | `classifyWastePhoto()` → Gemini | See [06-AI.md](06-AI.md) |
| **CSV builder (no library)** | Admin export with formula escaping | Small, no extra dependency (G9) |
| **Vercel function logs** | Errors and timings | Enough for a prototype; Sentry deferred |

---

## 3. The two Supabase clients (most important backend rule)

| Client | Key | Used for | Never used for |
|---|---|---|---|
| **User client** | anon/publishable key + the user's session cookie | All reads for screens; all calls to status-change functions (`supabase.rpc(...)`) — RLS and the functions check the user | — |
| **Admin client** | `SUPABASE_SERVICE_ROLE_KEY` (server only) | (1) upload and delete photo files, (2) create signed links **after** the user client has proved the user can read that record, (3) insert `ai_runs` rows (06 S1), (4) create staff accounts and set their role, (5) seed and reset scripts | Any read or change the user client can do; anything in the browser |

---

## 4. The standard server action pattern

```
1. Get the session (user client). No session → "Please log in".
2. Parse input with the zod schema. Invalid → field errors back to the form (data kept).
3. Extra server work if needed (photo upload, AI run id).
4. Call the database function as the user: supabase.rpc('assign_report', {...}).
5. Map a database error to a plain message (table below). Clean up any uploaded file on failure.
6. Refresh the affected pages (revalidatePath) and return success.
```

| Database message | Shown to the user |
|---|---|
| `Not allowed` | "You can't do this." |
| `This case cannot be assigned in its current status` (and other status errors) | "This case has changed. Please refresh." |
| `Daily report limit reached` | "You've reached today's report limit." |
| `Invalid photo` | "Photo upload failed. Please try again." |
| check-constraint errors (length, ranges) | "Some details are too long or not valid." |
| anything else | "Something went wrong. Please try again." (full error only in logs) |

---

## 5. Modules and what each calls

| Module | Server actions / routes | Database functions (06) | Flow |
|---|---|---|---|
| Auth support | sign-up page lists; staff creation | `list_orgs_for_signup`, `list_areas_for_signup`; admin client for staff | F1, F2.3 |
| Setup | settings, areas, locations, disposal sites, vehicles, schedules, deactivate/reactivate, QR sheet | direct admin writes (RLS) · `deactivate_user` · `reactivate_user` · `get_qr_sheet` | F2 |
| Reports | analyze photo, create (🆕 with raw GPS, pin correction, required category), edit, cancel, follow, 🆕 add evidence, resolve QR, duplicate check | `create_report`, `edit_report`, `cancel_report`, `follow_report`, `add_evidence`, `resolve_qr`, `open_case_at` | F3 |
| Case lifecycle | assign, reject, correct type/category, complete, return, feedback (🆕 + optional satisfaction), close, reopen, instruction, 🆕 delay note | `assign_report`, `reject_report`, `correct_issue_type`, `set_waste_category`, `complete_report`, `return_report`, `submit_feedback`, `close_report`, `reopen_report`, `add_instruction`, `add_delay_note` | F4, F5 |
| Case summaries 🆕 (P1) | followers' list, higher-authority queue | `followed_cases`, `authority_cases`, `case_summary` | F4, F5.2b |
| Pickups | create, edit, cancel, schedule, reschedule, decline, collect, refuse | `create_pickup` … `refuse_pickup` (each writes `pickup_events`) | F6 |
| Trips | plan (admin writes), start, stop taps, disposal scan, end, estimate | `start_trip`, `record_stop`, `record_disposal_scan`, `end_trip`, `get_vehicle_eta` | F9, F12 |
| Hotspots | top locations, location history, prevention reviews | reads + admin writes on `prevention_reviews` | F7 |
| Dashboards | per-role counts, scorecards, leaderboard, next collection, case people | `get_dashboard_counts`, `get_scorecards`, `get_leaderboard`, `get_next_collection`, `case_people` | F8, F13 |
| Flags | review flag | `review_flag` | F13.3 |
| Notifications | list, mark read | reads + `read_at` update (column grant) | F11 |
| Export (Could) | `GET /api/export?type=&from=&to=&area=` | org-scoped reads as the user (admin only) | F8 |
| Job health | admin view | `get_job_health` | 06 I6 |

The exact inputs, outputs and errors of each action go in the **API contract** (next document).

---

## 6. Special flows

**Photo upload (with [05-STORAGE-PHOTOS.md](05-STORAGE-PHOTOS.md))**
1. Receive multipart (JPEG from the browser, ≤ ~1 MB demo).
2. Check the real file type from its first bytes; reject anything else.
3. `sharp`: auto-rotate, re-encode JPEG, no metadata.
4. Upload with the admin client to `<org_id>/reports/<report_id>/before.jpg` (the server generates `report_id` first).
5. Call `create_report` as the user with that path. If it fails → delete the uploaded file (nothing saved, 03 F3.6).

**AI analysis (with [06-AI.md](06-AI.md))**
1. Check `ai_quota_left()` as the user; over the limit → return "not available" (manual choice).
2. Re-encode the photo (same as above) **without storing it**.
3. Call `classifyWastePhoto()` with an 8 s timeout (demo); validate with zod.
4. Insert the `ai_runs` row with the admin client (`user_id` = the caller) and return the suggestion + `ai_run_id`.

**Viewing a photo:** read the record with the user client (RLS decides) → create a signed link with the admin client for `signed_link_minutes` (demo 10) → return only the link.

**CSV export:** build rows from an org-scoped query; escape cells starting with `=`, `+`, `-`, `@`; `Content-Disposition: attachment`.

---

## 7. Limits to respect

| Limit | Setting |
|---|---|
| Server action body size | Next.js default ~1 MB; photos go through route handlers, or raise `serverActions.bodySizeLimit` [Verify] |
| Vercel function request size | Keep photos small (browser resize) [Verify current limit] |
| Function duration | AI call has its own 8 s timeout (demo) so the request never hangs |

---

## 8. Logging rules

- Log: action name, user id, organisation id, duration, error code.
- **Never log:** passwords, session tokens, keys, signed links, photo contents, AI prompts containing photos.

---

## 9. Where it lives

```
app/**/actions.ts        server actions per area
app/api/photos/          upload route (Node.js runtime)
app/api/ai/classify/     AI analysis route (Node.js runtime)
app/api/export/          CSV route
lib/supabase/            server.ts (user client), admin.ts (service role), middleware helper
lib/validation/          zod schemas (shared with frontend)
lib/errors.ts            database error → user message
lib/photos.ts            file-type check + sharp
lib/ai/                  adapter (see 06-AI)
```

## 10. Testing

Vitest for `lib/errors.ts`, `lib/photos.ts` (a photo with GPS EXIF comes out without it), zod schemas, CSV escaping; Playwright for the main actions per role (08-DEVOPS).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Service-role key used where the user client should be | Fixed list of uses (§3); code review; lint rule or folder rule: only `lib/supabase/admin.ts` imports the key |
| Upload succeeds, database call fails | Delete the file in the same request |
| Large photo rejected by the platform | Browser resize first |

## 12. Confirm at setup [Verify]

`@supabase/ssr` usage for the current Next.js version · Node.js runtime for `sharp` · body size limits · `sharp` output has no metadata.

### Implementation checkpoint 🆕 (2026-10-01)

Pickup changes use server actions backed by the eight database functions in the new pickup migration. A dedicated, authenticated `/api/pickup-photo` handler verifies scheduled status and worker/admin permission before storing a private JPEG; the database function validates its organisation/pickup path. The existing report-photo endpoint is unchanged. Password recovery uses Supabase Auth's reset email and a PKCE callback route; its redirect origin and Supabase allowlist must be configured for the deployed site.

### Implementation checkpoint 🆕 (2026-10-01, case lifecycle, exports, staff)

### F14 SWMS bot read contract 🆕 (2026-10-01)

`POST /api/bot` accepts a bounded text question and short conversation history. It derives identity from the verified session, reads only user-facing guidance and RLS-filtered current rows through the session-scoped client, and returns text plus fixed app links. It never executes a write suggested by a user or model. An authenticated Gemini call is optional and quota-reserved; unavailable model or quota returns grounded guidance and current record summaries. The public homepage gets guidance only. Do not send raw private notes, photos, names, emails, phone numbers, or credentials to the provider.

Privacy clarification 🆕: current row summaries are answered locally and are never included in a Gemini request. The worker read also covers assigned duties and own trips when those tables are available. The server sends only general guidance questions to Gemini, with the UI warning against entering personal details.

### Case lifecycle, exports and staff — continued

Server actions now exist for every case change in §5 "Case lifecycle" except `set_waste_category`: reject, close, correct type (`features/admin/actions.ts`), return (`features/worker/actions.ts`), delay note (`features/staff/actions.ts`), instruction (`features/escalations/actions.ts`), reopen, add evidence and follow (`features/reports/actions.ts`). Each parses input with zod, calls the database function as the user, and maps the database message through `toUserMessage`. `POST /api/photos` also accepts `kind=evidence` for the reporter, or a follower while the case is open; a failed save removes the uploaded file. Prevention reviews are admin writes under row rules. `GET /api/export` (admin only) builds reports or pickups as CSV with formula-cell escaping (`lib/csv.ts`, unit-tested), days in the organisation's time zone, no resident names or contact details. Staff invites use the admin client (use 4 in §3): `inviteUserByEmail`, then the role is set. `next.config.ts` sets `logging.serverFunctions: false`, because the development log otherwise prints every server-action argument, including passwords. Node 22 or newer is required for the Supabase client outside the browser (see `.nvmrc`).
