# Product Requirements Document (PRD) — Waste Management System

| | |
|---|---|
| **Version** | v4 — 2026-09-30: synced with [03-FULL-APP-FLOW.md](03-FULL-APP-FLOW.md) v3.1 (earlier v3 content kept) |
| **AI update** | v5 — 2026-09-30: AI and intelligence features added (🧠); details in [05-AI-SPEC.md](05-AI-SPEC.md) |
| **Owners** | Project team (research and documentation · development · presentation) |
| **Source of truth** | Problem statement photo `PROBLEM STATEMENT DETAIL/PHOTO-2026-09-30-09-33-56.jpg`; detail in [03-FULL-APP-FLOW.md](03-FULL-APP-FLOW.md) |
| **Status** | Proposed build scope agreed with the team. Not validated with a real operator. |

**Data rule:** every organisation, person, bin, location, deadline and incident is labelled *Demo data*. No claim of real municipal dispatch, AI accuracy, savings or impact.

## 1. Problem (from the statement)
Waste collection often relies on manual processes. This leads to overflowing bins, missed or delayed collection, improper segregation and difficulty reporting problems. Citizens lack one simple place to report overflowing bins, garbage on roads, missed collection or illegal dumping, and to track whether a complaint was resolved. Awareness of segregation and disposal is low. Administrators lack central data to identify hotspots, monitor complaints and improve collection services.

## 2. Goals and success criteria (for the prototype)
| Goal (from statement) | How the prototype shows it | Check |
|---|---|---|
| Simple central reporting | One report form, photo + location + type | A report can be submitted in a few taps; reporting speed target is a hypothesis to test, not a claim |
| Track resolution | Case timeline with owner, status, due date, before/after photos | Resident sees every status change |
| Pickup when needed | Separate pickup request lifecycle | Request moves requested → scheduled → collected |
| Identify hotspots | Top locations by repeated incidents after closure + prevention review | Seeded location appears flagged |
| Monitor complaints | Dashboard counts, overdue, disputed | Counts match seeded data |
| Improve collection service | Service measures: avg time to close, % closed before due, pickups collected on requested date | Measures compute from seeded data (demo numbers, not real performance) |
| Segregation awareness | Awareness guide + segregation option in reports and pickups | Guide loads without login, every item cites a source |
| Routine collection on time ("missed or delayed collection") | Area collection schedules; each run recorded on time / late / missed | Seeded runs show all three results |
| Segregation at source | Worker marks *segregated yes / no* at pickups and trip stops; per-organisation segregation policy | Not-segregated counts appear by area |
| Accountability for delays | Overdue flag → admin alert → escalation to supervisor | Seeded escalated case appears in the supervisor queue |

**Non-goals:** proving real-world impact, global uniqueness, AI accuracy, or live government integration.

## 3. Users and demo order
Demo order (team decision): **City Ward leads**, Residential Society second as proof of multiple organisations. The organisation type also supports `campus` and `public_place` so all contexts in the statement are covered by configuration; only ward and society are seeded.

| Role | Ward label | Society label | Needs |
|---|---|---|---|
| Resident | Citizen | Resident | Report quickly, request pickup, see outcome, learn segregation |
| Worker / Driver | Sanitation worker or vehicle driver | Society staff or driver | Know tasks and route, see how much is left, record completion |
| Admin | Ward officer | Society secretary | See all work, assign, handle disputes, spot repeat places, measure service |
| Supervisor | Senior officer | Committee head | See escalated (long-overdue) cases and service measures; reassign or instruct |
| Higher authority 🧠 | Municipal commissioner ("state / national authority" only as a label) | Managing committee | See level-2 escalations, scorecards and performance flags; record outcomes and notes |

Every record carries `org_id`; access rules must enforce isolation (not the column alone).

## 4. User stories
- As a **resident**, I report an overflowing bin with a photo and location so someone responsible can act.
- As a **resident**, I request a pickup for bulky or hazardous waste so it is collected on a chosen date.
- As a **resident**, I see who owns my complaint, its due date and the result, and can say whether it was really resolved.
- As a **worker / driver**, I see my assigned tasks, how many are done and left in my area or trip, and upload proof when done.
- As an **admin**, I see new, overdue and disputed work at a glance, pick an area to see how much is left, and assign it.
- As an **admin**, I see which places keep getting new incidents and record a prevention action.
- As an **admin**, I see service measures to judge whether collection is improving.
- As **anyone**, I read how to segregate and dispose of waste.
- As a **resident**, I see when collection is next due in my area, and report it if it is missed.
- As a **resident**, I can follow an existing open case instead of reporting it again, and reopen my case within 3 days if the problem was not really fixed.
- As a **worker / driver**, I can return a task I cannot complete, with a reason, and run my trip stop by stop.
- As an **admin**, I can reject invalid or duplicate reports with a reason and decline or reschedule pickups.
- As a **supervisor**, I see cases that stayed overdue beyond the escalation time and can reassign them or add instructions.
- 🧠 As a **resident**, I take a photo and the app suggests the waste category and warns me if it looks hazardous or biomedical.
- 🧠 As a **resident**, I earn points and badges when my reports are verified.
- 🧠 As an **admin or supervisor**, I see SLA compliance, predicted hotspots and performance flags, and record what was done.
- 🧠 As a **higher authority**, I see cases and areas that stayed unresolved beyond level-2 escalation.

## 5. Features (priority: M = must, S = should, C = could)

### F1. Registration and login — M
- Sign up: name, email, phone (optional), password, organisation. Self sign-up creates a resident; demo admin accounts are pre-seeded; admins create worker accounts in the UI (F5).
- Log in → role-specific home. Log out. **Password reset** by email link (Could; depends on the auth provider supporting it).
- **Accept:** seeded logins for every role (1 admin, 1 supervisor, 1 higher authority 🆕, 2 workers, 3 residents) per organisation work; resident cannot open admin pages; one organisation cannot see the other's records.
- **Also (v4):** resident chooses a **home area** at sign-up; admins create worker/driver **and supervisor** accounts, which receive an invite email; deactivated users cannot log in. Login goes to the auth service; every later request passes the 5-step check (session, active, organisation, role/ownership, allowed status change).

### F2. Report waste issues — M
- Issue types: overflowing bin, garbage on road, missed collection, illegal dumping, **improper segregation / mixed waste**, other.
- Photo **mandatory** (camera or gallery upload), location, optional note.
- Location: device GPS if allowed; otherwise choose a registered location or type an address. Store which source was used. Registered-bin QR prefill — C. 🆕 If a QR scan fails, the resident types the code printed under the QR or picks the location; a code from another organisation is not accepted.
- System sets due date from the organisation's configurable demo deadline for that type.
- Resident can **edit or cancel** own report only while it is *Submitted* (before assignment); cancel sets *Cancelled* and is logged on the timeline.
- **Accept:** submit works with GPS allowed and denied, and with gallery upload when camera is unavailable; submit is blocked without a photo; the report appears as *Submitted* with a due date; edit/cancel disappears once assigned.
- **Also (v4):** daily report limit per resident (demo 10); photo location metadata (EXIF) stripped before storage; nothing is saved until the photo upload and submit both finish; choosing *missed collection* prefills the resident's area and scheduled window; if the chosen registered location already has an open case, the resident may **follow** it (Could). Admin may **reject** a submitted report with a reason (see F5).
- 🆕 **Also (research re-audit):** the resident can drag the map pin to where the waste actually is; if the phone is far from the chosen or scanned bin, a *location mismatch* is shown and flagged for admins (never a block). A waste category is required (*mixed / uncertain* allowed). A follower or the reporter can add a photo or note to an open case (Could).

### F3. Waste pickup request — M
- Waste type (wet, dry, hazardous, bulky, e-waste), preferred date and slot (morning / afternoon), address or location, note.
- Statuses *Requested → Scheduled → Collected*, or *Cancelled* before collection, or *Missed* if the slot passes uncollected — a missed pickup automatically creates a linked *missed collection* complaint that follows complaint tracking.
- Admin schedules, **reschedules** or **declines with a reason** (outside area, type not accepted); a request never scheduled by its preferred date also becomes *Missed*; a missed pickup can be rescheduled. Admin may assign a worker; worker or admin marks collected (optional photo) and whether the waste was **segregated (yes / no)**. What happens next follows the organisation's **segregation policy** setting: *collect + educate* (default: collect and send the awareness link), *warn then escalate* (repeat households or locations get a warning and are flagged to admins), or *refuse allowed* (worker may refuse with photo and reason; resident can request again). The app never fines anyone.
- **Area collection schedule (routine collection):** admin sets collection days and time window per area; residents see "next collection in my area"; each routine collection is recorded as on time, late or missed; a *missed collection* report is prefilled with the area and schedule.
- **Accept:** full lifecycle visible to the resident on its own list, separate from issue reports.
- **Also (v4):** resident can edit the request while *Requested*; max open pickups per resident (demo 2); statuses are *Requested, Scheduled, Collected, Cancelled, Declined, Missed, Refused* (refused only when the policy allows); a pickup can be collected at a trip stop; a missed pickup's complaint is linked through the report, and the resident sees a link to it.
- **Accept (v4):** a declined, a rescheduled, a missed-with-complaint and (in the warn-then-escalate organisation) a warned household appear in seed data.

### F4. Complaint tracking — M
- *My items* list: reports and pickups with status, owner, due date.
- Case page: timeline of events (who, what, when), before/after photos side by side.
- Report statuses: *Submitted → Assigned → Awaiting review → Closed*, or *Disputed* → reassigned / closed with reason. *Overdue* is computed from the due date and never resets.
- **Worker / driver dashboard:** today's counts (assigned, done, remaining, overdue), list of own tasks and pickups with status, area filter, and trip progress (stops done / left) when F7 is used.
- Worker completion step: completion photo + note + GPS → *Awaiting review*; if the worker is farther than the configured distance (demo 100 m) from the report, admins see a **far-from-site** warning (not a block). Worker may instead **return** the task with a reason (site blocked, needs equipment, wrong location); admin reassigns; due date does not reset.
- Resident may **reopen** a closed case within the reopen window (demo: 3 days); later problems are new reports.
- **Overdue → escalation:** at the due time the case is flagged overdue and admins are alerted; if still open after the escalation time (demo: 12 h) it is escalated to supervisors.
- Resident feedback: *Resolved / Partly resolved / Not resolved* + optional comment. Negative answer → *Disputed* → admin review (not proof of misconduct). No reply shows *No response*, never *satisfied*.
- **Accept:** every change appears on the timeline; worker completion never shows as *Closed* until resident confirms or admin closes with reason.
- 🆕 **Also (research re-audit):** after Resolved / Partly / Not resolved, an optional **satisfaction** question (Satisfied / Neutral / Unsatisfied) is stored separately; each answer is tied to its completion attempt. On an overdue case, the admin or assigned worker can record the **delay reason and next step** (due time unchanged). **Followers and the higher authority see a summary only** (status, type, place, dates, overdue/escalation, event types) — no photos, notes, feedback or names.
- **Also (v4):** full report statuses are *Submitted, Assigned, Returned, Awaiting review, Disputed, Closed, Reopened, Cancelled, Rejected*; *Overdue*, *Escalated* and *Far from site* are flags. Overdue applies to submitted, assigned, returned, disputed and reopened cases. The timeline is visible to the reporter, followers, the assigned worker and admins. A deactivated worker's open cases return to admins. After the reopen window closes the Reopen button disappears. Supervisors can add instructions or reassign escalated cases.
- **In-app notifications (v4):** bell with unread count for new work, assignment, completion, return, dispute, reopen, overdue, escalation, rejection, pickup declined / rescheduled / missed / refused, not-segregated and warnings, followed-case changes, routine collection missed and deactivated-worker tasks. No SMS or push; email only for password reset and staff invites.

### F5. Admin dashboard — M
- Counts: new, assigned, awaiting review, disputed, overdue, closed; pickups by status.
- **Area overview:** choose an area (for example a ward zone or a society block) → done vs remaining, overdue, and status breakdown for that area; per-worker progress (assigned, done, remaining).
- Case list filtered by status and type; assign, reassign, close with reason, **reject an invalid, duplicate or out-of-area report with a reason** (reporter notified; excluded from hotspots), **correct a wrong issue type** (due time recalculated, change logged); schedule pickups.
- **Segregation and routine collection measures:** not-segregated count by area; routine collections on time / late / missed.
- **CSV export (Could):** reports and pickups by date and area.
- **Service measures (S):** average time from report to close; % closed before due; pickups collected on requested date; feedback counts (resolved / partly / not resolved / no response). Labelled as demo data.
- **Top locations:** places ranked by distinct incidents in the last *window* days (demo: 30), flagged at *threshold* (demo: 3; configurable, not a validated rule). 🆕 A report made while a case was already open at that place is not counted as a new incident.
- **Manage setup (Could):** admin adds, edits and deactivates **areas** (ward zones / society blocks), locations (name, area, type, map pin, optional QR), worker/driver and supervisor accounts, vehicles and collection schedules. Deactivating a worker returns their open cases to admins. 🆕 Admin can print a QR sheet for bins, spots and disposal sites (random codes, can be regenerated).
- **Map view (Could):** reports as pins coloured by status, flagged locations highlighted, last known vehicle positions (F7).
- **Prevention review:** cause, action (pickup frequency, bin capacity or location, dumping enforcement, other), owner, review date, status, outcome.
- **Accept:** seeded data shows non-zero counts, one overdue, one disputed, one flagged location with a prevention review, and computed service measures.
- **Also (v4):** counts include returned, rejected and far-from-site; *repeat not-segregated households / locations* list (warn-then-escalate policy); routine collections on time / late / missed; areas come from the **areas** list, not free text; rejected and cancelled reports are excluded from hotspots.
- **Supervisor dashboard (v4):** escalated queue, overdue by area and by worker, service measures, prevention reviews (read-only); can reassign and add instructions, cannot close.
- **Organisation settings (v4):** deadlines per issue type, escalation hours, reopen window, no-reply hours, recurrence threshold and window, time zone, abuse limits, far-from-site distance, segregation policy and warning threshold — all demo values.

### F6. Waste awareness section — M
- Public page (no login): wet / dry / hazardous / e-waste guide, what goes where, disposal tips, how to use the app.
- Every item cites an official source (content supplied and checked by the project team).
- **Language:** English and Hindi toggle on this page only; the rest of the UI is English. Hindi text must be written or checked by a Hindi-speaking team member, not unreviewed machine translation.
- **Accept:** loads at mobile width; each item shows its source; both languages show the same items.

### F7. Vehicle trip tracking (simulated) — C
- Admin registers vehicles (number, type, assigned worker) and plans a trip: date + ordered list of locations to visit.
- Worker starts the trip on a phone; at each stop taps *Arrived* and *Collected / Skipped (reason)*. Each tap stores phone GPS (with accuracy), time and worker. Trip ends with *Reached disposal site* tap (optional photo).
- All points stored in the database; admin sees trip progress, missed stops and last known position on the map.
- **Label:** "Simulated with the worker's phone — not vehicle GPS hardware." A tap records that the worker reported an event at that place; it does **not** prove waste quantity or lawful disposal.
- **Accept:** a seeded trip shows completed, skipped and pending stops; a live tap from a phone appears on the admin map.
- **Also (v4):** trips can be created from an area collection schedule; each run is recorded as on time, late or missed; at each stop the driver marks *segregated yes / no* and may refuse only if the policy allows; a tap is accepted only for a stop that belongs to that driver's trip.

### Other Should / Could extras### F8–F13. AI and intelligence features 🧠 (full detail in [05-AI-SPEC.md](05-AI-SPEC.md))
- **F8 AI waste photo analyzer — M:** suggests wet, dry, biomedical, hazardous, e-waste or mixed / uncertain with confidence and reason; hazard warning; resident and admin can change it; manual fallback; also a "Which bin?" helper on the awareness page. **Accept:** suggestion appears for demo photos; an AI error still allows submit; changed suggestions are counted. 🆕 Daily AI limit per user (demo 20) and per organisation (demo 200); over the limit the resident chooses manually and submit still works.
- **F9 SLA engine and escalation chain — M:** deadlines per issue type, shorter hazardous deadline (demo 6 h), SLA compliance %; escalation admin → supervisor (due + 12 h) → higher authority (due + 24 h). **Accept:** seeded level-1 and level-2 escalations appear in the right queues.
- **F10 Performance monitoring — S:** scorecards for workers, admins and areas; flags only with enough volume; routed up the chain; outcomes recorded; no automatic penalty. **Accept:** one open flag at each level in seed data.
- **F11 Hotspot risk prediction — S:** daily 0–100 score per location with factors; labelled *prediction from demo data, not validated*. **Accept:** map and top-5 list show scores and factors.
- **F12 Vehicle arrival estimate and dumping verification (simulated) — C:** estimate from trip taps; disposal-site QR scan (simulating RFID) + GPS geofence; unapproved-stop flags. **Accept:** one verified and one outside-geofence trip in seed data. 🆕 If the site QR cannot be scanned, the driver types the printed code; it counts only with GPS inside the geofence.
- **F13 Citizen rewards — C:** points for verified reports only, badges at 10 / 30 / 50 verified reports, opt-in area leaderboard, no cash. **Accept:** a rejected report earns no points. 🆕 A report earns each reward reason only once (no double points).


- S: in-app notification badge when own case status changes.
- C: duplicate warning when an open case already exists at the same registered location — the resident can **follow** that case (receives its updates) or report a different issue.
- C: QR prefill for registered bins.

## 6. Non-functional requirements
- **Device:** responsive web app; residents and workers on phone width, admin on laptop.
- **Performance:** compress photos on the client before upload (proposed limit ~1600 px long edge); pages usable on a normal mobile connection. Proposed targets, not measured.
- **Visibility:** a case's photos, outcome and feedback are visible only to the reporter, the assigned worker (task details) and admins of that organisation. No public feed in the MVP.
- **Language:** English UI; awareness page English + Hindi.
- **Authentication:** every user logs in through the auth provider; passwords are hashed by it and never stored or logged in plain text; sessions expire; password reset by email link.
- **Authorization:** role (resident, worker/driver, admin, supervisor) and `org_id` are stored in the database and checked on the server for every request and every status change, not only by hiding buttons.
- **Security and privacy:** org isolation enforced on the server/database and photo storage; photo URLs not publicly guessable; reporter contact details never shown to other residents; passwords handled by the auth provider, never stored in plain text; demo logins not published.
- **Integrity:** status transitions enforced on the server; timeline is append-only.
- **Accessibility:** readable contrast, labelled form fields, buttons large enough to tap, status shown in text not colour only.
- **Honesty:** *Demo data* label visible in the header of every page.
- **Additions (v4):**
  - Supervisor is a fourth role; authorization checks cover all four roles.
  - Visibility of a case also extends to followers (timeline) and supervisors (escalated cases). 🆕 (research re-audit) Followers and the higher authority see a summary and event types only — not photos, notes, feedback or names.
  - Time zone per organisation (demo Asia/Kolkata); stored in UTC, shown in local time.
  - Photos: EXIF stripped, private storage, short-lived signed links, upload notice to avoid faces and vehicle numbers.
  - 🆕 Photo formats: JPEG, PNG, WebP and iPhone HEIC accepted; converted to JPEG on the device (demo ≤ 1 MB); unsupported files show a clear message and keep the form data.
  - 🆕 Demo data can be reset before every demo, with times relative to the current time so overdue and escalated examples stay correct.
  - Abuse limits: reports per day and open pickups per resident.
  - Background jobs run as the *system* actor and log their changes as events.
  - Server error logs never contain passwords or photo links; secrets only in environment variables.

## 7. Edge cases and error states
- GPS denied or inaccurate → manual location; camera denied → gallery upload.
- Upload fails or photo too large → clear error, keep the form data.
- Worker opens a task not assigned to them → blocked.
- Resident gives feedback twice → latest counts; both kept on timeline.
- Admin closes without resident reply → requires reason "no response"; feedback stays *none*.
- Reassign after overdue → original due date kept; overdue duration still shown.
- Empty states on every list ("No reports yet").
- Worker deactivated with open tasks → cases become *Returned*, pickups unassigned, admins notified.
- Pickup never scheduled by its preferred date → *Missed* + linked complaint.
- Worker completes far from the site → accepted, admins see a *far-from-site* warning.
- Invalid or duplicate report → admin rejects with a reason; reporter notified.
- Routine collection window passes without the trip completed → run marked *missed*, admins notified.
- Waste not segregated → handled by the organisation's segregation policy; never an automatic fine.

## 8. Assumptions, dependencies and risks
- Real deployment would need an operator, verified locations and staff, agreed deadlines and a reviewer; none exist for this prototype, so all are demo data.
- Deadlines, recurrence threshold and window are demo settings, not policy.
- Tech stack is final (approved by the team 2026-09-30): [04-TECH-STACK.md](04-TECH-STACK.md) and [TECH-STACK/](TECH-STACK/00-FULL-TECH-STACK.md); hosting, storage and email accounts are not yet created.
- Escalation time, reopen window, no-reply hours, abuse limits, far-from-site distance, collection schedules and the segregation warning threshold are demo settings, not policy.
- Whether workers may refuse unsegregated waste is a local rule that has not been verified; the policy is configurable for that reason.
- **Risk:** every extra was selected, which widens scope. Build order is F1 → F2 → F4 → F5 counts → F3 → F6 → 🧠 F8 AI analyzer → 🧠 F9 SLA and escalation → service measures → admin setup → map → edit/cancel → F7 simulated trips → password reset → 🧠 F10 performance → F11 hotspot risk → F12 vehicle estimate and dumping check → F13 rewards. Extras are built only after every Must feature passes its acceptance checks.

## 9. Out of scope (deferred)
AI feedback summaries, cash rewards, video evidence, hardware vehicle GPS/telematics, weighbridge records, RFID hardware, biometrics, public feedback feed, full Hindi UI, automatic equipment or bin assignment, live municipal integration, SMS/push/email notifications, GPS-radius clustering.

## 10. Glossary
- **Incident:** one report of a waste problem at a place and time.
- **Recurrence:** a new incident at a location after an earlier incident there was closed.
- **Awaiting review:** worker says done; not yet confirmed.
- **Disputed:** resident says partly or not resolved.
- **Overdue:** open past its due date (computed).
- **Prevention review:** admin record of cause and action for a repeat location.
- **Returned:** worker could not complete the task and gave a reason.
- **Reopened:** resident reopened a closed case within the reopen window.
- **Rejected:** admin marked a submitted report invalid, duplicate or out of area, with a reason.
- **Escalated:** still open after due time + escalation hours; shown to supervisors.
- **Far from site:** worker's completion GPS is beyond the configured distance from the report.
- **Area:** a named zone or block from the organisation's areas list.
- **Collection schedule / run:** routine collection days and window per area / one day's result (on time, late, missed).
- **Segregation policy:** organisation setting for not-segregated waste: collect + educate, warn then escalate, or refuse allowed.
- **Follower:** a resident who follows an existing open case instead of re-reporting it.
- **System actor:** a background job acting without a user.
- **SLA:** the service deadline for a case; *SLA met* = closed before the due time.
- **Higher authority:** demo role receiving level-2 escalations and flags above supervisors.
- **Risk score:** a prediction from past incidents, not a validated forecast.
- **Performance flag:** a review signal raised when a measure crosses a threshold with enough volume; never a penalty.
- **Dumping verification (simulated):** disposal-site QR scan + GPS geofence; not proof of lawful disposal.

## 11. Definition of done (per feature)
Acceptance checks pass on a phone and a laptop, seed data demonstrates it, org isolation holds, and it appears in the demo script (a later document, after the API contract and build plan; 04 is now the tech stack).

## 12. Team decisions (2026-09-30)
- Photo mandatory for reports.
- Outcome and feedback visible to reporter, assigned worker and org admins only.
- English UI; awareness page English + Hindi.
- Extras selected: password reset, resident edit/cancel, admin manages locations and workers, admin map view, simulated vehicle trip tracking stored in the database.
- Overdue → admin alert → escalation to a **Supervisor** role.
- Worker may return a task with a reason; resident may reopen within 3 days (demo).
- Missed pickup is marked missed **and** creates a linked complaint.
- Admin may reject invalid reports and decline or reschedule pickups.
- Area collection schedules, segregation marking at collection, case following (Could), deactivated-worker handling and CSV export (Could).
- Segregation handling is a per-organisation policy, default *collect + educate*.
- Areas are a managed list (table), not free text.
- 🧠 AI features: categories wet, dry, biomedical, hazardous, e-waste, mixed / uncertain; rewards = points for verified reports, badges, no cash; escalation admin → supervisor → higher authority; Gemini free tier via a switchable adapter, demo photos only.

## 13. Still open

### F14. SWMS bot — user request, 2026-10-01 🆕

Residents and workers can ask natural-language questions about using the app and their own current work. A small animated SWMS bin opens a chat: right side on the public homepage, left side on signed-in app screens. The public bot explains user-facing workflows and links to relevant pages. Signed-in answers may use current reports and pickups for the resident, or assigned cases and pickups for the worker, after the server enforces the existing session, role and organisation rules. The bot is read-only: it never changes a case, schedules a pickup, or treats an AI answer as official proof. It says when information is unavailable and links to the actual record. Project documentation supplies approved workflow guidance, not private instruction files or secrets. The bot keeps a usable documented-help fallback if the model key or quota is unavailable. Acceptance: keyboard and phone use work, public users cannot see private data, one organisation cannot learn about another, and a worker sees only assigned records. This new explicit request expands the earlier A1-only model scope; the original wording remains as history.

### Earlier open items
- Creation of hosting, storage and email accounts (development). Tech stack approved 2026-09-30.
- Awareness content in English and Hindi with official sources (project team).

### Demo QR walkthrough — user request, 2026-10-01 🆕

On the admin QR page, an administrator can upload a QR image and see the corresponding demo walkthrough for a worker, waste collector, driver, registered bin/spot, vehicle, or disposal site. The page also provides labelled sample QR images for the worker, collector and driver walkthroughs. Demo scans are read-only: they explain the documented steps and never sign in a user, start a trip, complete a duty, submit a report or change database records. Existing operational QR codes retain their current role and organisation checks; an unknown or other-organisation code opens no workflow. The disposal-site result is presented as the documented flow until its app action is implemented. Acceptance: image upload and sample scans work on desktop and phone widths, the matching steps appear, invalid images and unrecognised codes get a clear message, and no action runs from the demo.
