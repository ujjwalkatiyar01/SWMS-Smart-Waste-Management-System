# AI and Intelligence Specification

| | |
|---|---|
| **Version** | v1 — 2026-09-30 |
| **Builds on** | [02-PRD.md](02-PRD.md) · [03-FULL-APP-FLOW.md](03-FULL-APP-FLOW.md) · [04-TECH-STACK.md](04-TECH-STACK.md) · our research |
| **Evidence labels** | **[Doc]** checked in official documentation · **[Research]** from our research · **[Rec]** our recommendation · **[Demo]** demo setting, not validated |

## 0. Ground rules for every AI and prediction feature

1. **AI suggests; people decide.** Every AI output can be changed by the resident or staff. AI never closes a case, assigns equipment, punishes anyone, awards money or counts as proof. [Research]
2. **Always a manual path.** If the AI is slow, unavailable or unsure, the user chooses manually and the flow continues. [Rec]
3. **Show uncertainty.** Every suggestion shows a confidence level and allows *mixed / uncertain*. [Research]
4. **Label it.** Screens say "AI suggestion" or "Prediction from demo data — not validated". No accuracy claims until measured (§9). [Research]
5. **Log it.** Every AI call is stored in `ai_runs` (input reference, output, confidence, model, time, error) so results can be checked and explained. [Rec]
6. **Privacy.** Demo photos only while using a free tier whose content may be used by the provider (§8). Location metadata is stripped before any photo is sent. [Doc + Rec]

---

## 1. Features at a glance

| # | Feature | Type | Priority [Rec] | Uses an AI model? |
|---|---|---|---|---|
| A1 | **Waste photo analyzer** — suggests the waste category and flags biomedical / hazardous | AI (vision) | Must | Yes |
| A2 | **SLA engine** — deadlines per issue type and waste category, SLA compliance % | Rules | Must | No |
| A3 | **Escalation chain** — admin → supervisor → higher authority | Rules + job | Must | No |
| A4 | **Performance monitoring** — scorecards and flags for workers, admins and areas | Rules + job | Should | No |
| A5 | **Hotspot risk prediction** — which locations are likely to get new incidents | Statistical score | Should | No (optional AI wording of the explanation — Could) |
| A6 | **Vehicle arrival estimate** — when the collection vehicle is likely to arrive | Estimate from trip taps | Could | No |
| A7 | **Dumping verification (simulated)** — disposal-site scan + GPS geofence; flags stops at unapproved places | Rules | Could | No |
| A8 | **Citizen rewards** — points and badges for verified reports, no cash | Rules | Could | No |

Only A1 calls an AI model. A2–A8 are rules and statistics: cheaper, explainable and testable. Calling them "AI" in the pitch would be misleading; call them **intelligence features** or **predictions**. [Rec]

---

## 2. A1 — Waste photo analyzer

**Where:** report form (F3 in the app flow) after the photo is chosen; also offered on the awareness page as "Which bin does this go in?" (photo → category + guidance, no report created).

**Categories (team decision):** `wet` · `dry` · `biomedical` · `hazardous` · `e_waste` · `mixed_uncertain`

**Flow**
1. Browser resizes the photo → server re-encodes and strips EXIF (see 04-TECH-STACK D6).
2. Server calls the AI adapter `classifyWastePhoto(image)` with a timeout (demo 8 s).
3. The result pre-selects the waste category, shows confidence and a one-line reason.
4. If `biomedical` or `hazardous` is suggested → red notice: *"Possible hazardous / biomedical waste. Do not touch. Keep a safe distance."* The case uses the shorter hazardous SLA (A2) **only after** the resident or admin keeps that category.
5. The resident may change the category before submitting; admins may correct it later (logged).
6. On error, timeout or `mixed_uncertain` → the resident picks manually; the report is never blocked.

**Output contract (structured JSON)**
```json
{
  "category": "wet | dry | biomedical | hazardous | e_waste | mixed_uncertain",
  "confidence": "high | medium | low",
  "hazard": true,
  "visible_items": ["plastic bottles", "food waste"],
  "reason": "one short sentence"
}
```
- Server validates the JSON with zod; anything invalid is treated as `mixed_uncertain`.
- `low` confidence is shown as *uncertain*; the category is **not** pre-selected.

**Instruction to the model (summary):** classify only what is visible; prefer `mixed_uncertain` when unsure or when several categories are mixed; set `hazard: true` for syringes, needles, blood-stained material, medicines, chemicals, batteries, broken glass or unknown containers; never guess location, people or identity; answer only in the JSON format.

**Stored:** `reports.ai_category`, `ai_confidence`, `ai_hazard`, `ai_reason`, `waste_category` (final human choice), and one `ai_runs` row.

**Dashboard use:** counts of reports by final waste category and by "AI suggestion changed by a human" (a simple signal of AI quality).

---

## 3. A2 — SLA engine

The existing deadline rules become an explicit SLA policy.

| Rule | Detail |
|---|---|
| SLA per issue type | `deadline_hours_json` (existing; demo values) |
| Hazard override | If final `waste_category` is `biomedical` or `hazardous`, the due time is the shorter of the type deadline and `hazardous_deadline_hours` (demo 6 h) [Demo] |
| Clock | Starts at report creation; never resets on reassign, return or reopen (existing rule) |
| SLA met | Case closed (resident confirmed or admin closed with reason) before `due_at` |
| SLA compliance % | Closed cases in a period that met SLA ÷ all closed cases, per organisation, area, worker and admin |
| Pickups | Collected on the requested date = pickup SLA met |
| Routine collection | Collection runs on time / late / missed (existing F12) |

Shown on admin, supervisor and higher-authority dashboards. Labelled demo.

---

## 4. A3 — Escalation chain

| Level | When (demo) | Who is notified | Where it appears |
|---|---|---|---|
| 0 → Overdue | `now > due_at` | Admins | All role views (existing) |
| 1 → Supervisor | Still open at `due_at + escalation_after_hours` (12 h) | Supervisors | Supervisor queue (existing) |
| 2 → Higher authority | Still open at `due_at + escalation_level2_after_hours` (24 h) | Higher authority | Higher-authority queue (new) |

- **Higher authority** is a new demo role (for example "Municipal commissioner" or "Society managing committee"). A label such as "State / national authority" may be shown **only as a label**; there is no real government integration. [Rec]
- Each level writes an `escalated` event with the level and notifies once.
- Performance flags (A4) follow the same chain.

---

## 5. A4 — Performance monitoring

**Scorecards** (per period, demo 7 days):

| Subject | Measures |
|---|---|
| Worker / driver | Tasks assigned, done, SLA met %, overdue, returned, disputed after completion, far-from-site count, trip stops skipped |
| Admin | Time from report to assignment, SLA met % of their organisation or area, disputes resolved, open escalations |
| Area | SLA met %, overdue, routine collections missed, not-segregated count, risk score (A5) |

**Flags** (daily job):
- A flag is raised when a measure crosses a threshold **and** there is enough volume (demo: SLA met < 70 % with at least 5 closed cases). [Demo]
- Worker flags → admins and supervisors. Admin or area flags → supervisors and higher authority. Supervisor-level flags → higher authority.
- A flag is a **review signal**, not a verdict. The reviewer records an outcome: *acknowledged — workload*, *acknowledged — action taken*, *not valid*. Nothing is deducted or punished automatically. [Research]

**Stored:** `performance_flags` (subject type and id, metric, value, threshold, period, raised to role, status, outcome note).

---

## 6. A5 — Hotspot risk prediction

**Honest name:** *Risk score — prediction from demo data, not validated.*

**Daily job computes, per registered location (demo formula):**
```
risk = 50 × (incidents last 7 days ÷ max in org)
     + 30 × (incidents last 30 days ÷ max in org)
     + 20 × (share of past incidents on tomorrow's weekday)
     (+ 10 if an overdue case is open, capped at 100)
```
Rejected and cancelled reports are excluded (as in F7).

**Shown:** admin map colours locations by risk; "Top predicted hotspots for tomorrow" list with the factors behind each score; supervisor sees the same read-only. An optional AI-written one-line explanation is a Could.

**Stored:** `location_risk` (location, score, factors, computed_at).

**Check:** compare yesterday's top-5 predicted locations with where incidents actually happened (hit rate), shown as a demo metric — not a validated accuracy claim.

---

## 7. A6–A8 — Vehicle estimate, dumping verification, rewards

### A6 — Vehicle arrival estimate (simulated trips)
- Estimate = last tap time + (average minutes per completed stop on this trip, or demo 8 min if none yet) × stops remaining before the target stop.
- Shown to residents whose pickup or area is on today's trip: *"Vehicle expected around 10:40 (estimate)"*; admins see it per stop.
- Label: *estimate from the driver's phone taps*. No table; computed on request.

### A7 — Dumping verification (simulated)
- **Disposal sites** are locations of kind `disposal_site` with a geofence radius (demo 150 m) and a site QR code.
- At trip end the driver scans the site QR (**simulating an RFID tag read**) and the phone GPS is compared with the geofence.
- Result on the trip: `verified` (scan + inside geofence) · `outside_geofence` · `no_scan`. Anything but `verified` is flagged to admins.
- **Unapproved stop flag:** an *arrived* tap not at a planned stop or disposal site is flagged as a *possible illegal dumping stop* for review.
- Label: *"Simulated — not RFID hardware. A scan and GPS point show the driver reported being at the site; they do not prove the load was fully and lawfully disposed of."* [Research]

### A8 — Citizen rewards (team decision: points, badges, no cash)
- **Points only for verified reports:** a report earns points when it closes as resident-confirmed or admin-closed as valid. Rejected, cancelled and duplicate (followed) reports earn nothing. [Research: raw counts reward volume and duplicates]
- Demo points: 10 per verified report, +5 if the photo analyzer category was kept or correctly set, +5 for a correct hazardous flag. [Demo]
- **Badges:** 10, 30 and 50 verified reports (the requested "30 complaints" milestone becomes 30 *verified* reports). [Demo]
- **Leaderboard** per area, opt-in only (first name + area), default hidden. [Rec]
- No cash, vouchers or payments in this build.

**Stored:** `reward_events` (user, report, points, reason) ledger; badges computed from it; `users.show_on_leaderboard`.

---

## 8. Provider, privacy and cost

| Item | Decision |
|---|---|
| Provider for the demo | **Google Gemini API, free tier** (team decision). The free tier has free input and output on certain models, and **content may be used to improve Google's products**. [Doc] Rate limits vary by project and are shown in Google AI Studio. [Doc] |
| Model | A Gemini model with image input that is free on the current pricing page — confirm the exact model ID at setup. [Verify] |
| Switchable adapter | All AI calls go through one server module (`lib/ai/`). Switching to another provider (e.g. Claude API or Vercel AI Gateway) changes only this module and its key. [Rec] |
| Key | `GEMINI_API_KEY`, server-only environment variable; never sent to the browser. |
| Data sent | Only the EXIF-stripped, resized photo and the instruction. No names, emails, phone numbers or exact addresses. |
| Photos | Demo photos only while on the free tier; no real faces or vehicle numbers. For real use, move to a paid tier or provider whose terms fit the data. [Rec] |
| Limits | On a 429 or timeout, fall back to manual selection and log the error in `ai_runs`. |

Other checked options: Vercel AI Gateway has a monthly free credit on a subset of models and needs a payment method on the team to unlock it [Doc]; no ongoing free tier for the Claude API was confirmed in official sources.

---

## 9. Testing the AI before any claim

1. Build a small labelled test set of **demo or licensed photos**: at least 10 per category, including mixed piles, low light, partial views, clean scenes and unclear cases. [Research]
2. Run the analyzer once on the set; record category accuracy, how often `mixed_uncertain` was chosen, and **hazard recall** (how many hazardous / biomedical photos were flagged).
3. Report the actual numbers and failures in the demo. A small test is not a city-scale benchmark. [Research]
4. Track in the app: share of AI suggestions changed by humans.

---

## 10. Sources

- Google — Gemini Developer API pricing (free tier; free-tier content used to improve products): https://ai.google.dev/gemini-api/docs/pricing
- Google — Gemini API rate limits (view active limits in AI Studio): https://ai.google.dev/gemini-api/docs/rate-limits
- Vercel — AI Gateway pricing (free tier credit, subset of models): https://vercel.com/docs/ai-gateway/pricing
- Vercel — AI Gateway getting started (payment method unlocks free credits): https://vercel.com/docs/ai-gateway/getting-started
- Our research: TACO litter-detection limits, feedback interpretation, scan ≠ disposal, rewards risk, municipal operations
