# 1 · Frontend Tech Stack

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value · 🆕 named while splitting |

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md).
2. Check whether any frontend tool, screen, label or rule there is missing from this file.
3. Cross-check with the full docs: [../02-PRD.md](../02-PRD.md), [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (F1–F13, §2 roles, §3 global rules, §7 permissions, §4.0 workflow), [../05-AI-SPEC.md](../05-AI-SPEC.md), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) (§8.3 read functions).
4. Also read the neighbouring parts this one depends on: [02-BACKEND.md](02-BACKEND.md), [04-AUTH.md](04-AUTH.md), [05-STORAGE-PHOTOS.md](05-STORAGE-PHOTOS.md), [06-AI.md](06-AI.md).
5. Missing something → add it here (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 6 (GPS, camera, map), 7 (refresh), 8 (show local time), 9 (EN/HI), 10 (responsive UI), 12 (map tiles), 14 (QR scan and print).

---

## 1. Scope

| The frontend owns | The frontend does NOT own |
|---|---|
| Screens for every role, forms, lists, dashboards, map, timeline | Deciding permissions — it only hides buttons for a cleaner screen; the server and database decide (04-AUTH) |
| Camera, GPS, QR scanning, photo resize and HEIC conversion | Stripping EXIF, storing photos, creating signed links (backend + storage) |
| Showing AI suggestions, hazard notice, labels | Calling Gemini or holding any key (AI part, server only) |
| Showing local times in the organisation's time zone | Computing due times, overdue, escalation (database) |
| Language toggle on the awareness page | Translating anything automatically (content is written and checked by the project team) |

---

## 2. Tools

| Tool | Used for | Why |
|---|---|---|
| **Next.js App Router + TypeScript** | Pages, layouts per role group, Server Components for reading data, Client Components for camera/GPS/map/QR | One codebase for every role; typed end to end [Rec] |
| **React** | Components | Comes with Next.js |
| **Tailwind CSS** | Styling, responsive layout (phone first, then laptop) | Fast and consistent [Rec] |
| **shadcn/ui** | Buttons, forms, dialogs, tabs, tables, badges, toasts, dropdowns | Accessible components copied into the project, easy to change [Rec] |
| **lucide-react** 🆕 | Icons | Default icon set of shadcn/ui [Verify] |
| **zod** (shared with backend) | Same schema shows field errors in the form and is re-checked on the server | One source of truth for rules [Rec] |
| **Leaflet + react-leaflet** | Admin map, trip progress, location pin picker | Free, no billing key [Rec]. **Loaded only in the browser** (dynamic import with server rendering off) because Leaflet needs `window` (G9) |
| **OpenStreetMap tiles** | Map background | Free; **attribution must be visible**; best-effort, heavy use can be blocked [Doc] |
| **Browser Geolocation API** | Report location with accuracy, worker completion GPS, trip taps | Built in; needs HTTPS and permission [Doc] |
| **File / camera input** (`accept="image/*"`, `capture`) | Before/after photos, pickup and trip photos | Built in; gallery fallback if camera is denied |
| **Canvas resize** | JPEG, long side ~1600 px, target ≤ 1 MB (demo) | Small uploads on mobile data; under the server request limit (G8) |
| **HEIC conversion library** 🆕 (e.g. `heic2any`) | Convert iPhone HEIC to JPEG when the browser cannot decode HEIC itself | Server-side HEIC decoding may be unavailable (G8) [Verify library and browser behaviour] |
| **QR scanner library** (`html5-qrcode` or `@zxing/browser`) | Scan bin QR on the report form; scan disposal-site QR on the trip | The built-in barcode API is not in every browser [Verify] (G1) |
| **`qrcode` package** | Printable QR sheet on admin setup | Generates QR images in the browser [Verify] (G1) |
| **Noto Sans Devanagari via `next/font`** | Hindi text on the awareness page | Correct Hindi glyphs on every phone [Verify] (G9) |
| **Plus Jakarta Sans + Instrument Serif via `next/font`** 🆕 | Interface text; italic serif accent line in headings | Friendly, readable, self-hosted (no request to Google from the browser) [Rec] |
| **CSS animations** (Tailwind `@theme` keyframes) 🆕 | Home page motion: entrance, mascot bob/blink/hop, scroll reveal | No animation library needed; all motion off under `prefers-reduced-motion` [Rec] |
| **`Intl.DateTimeFormat`** | Show all times in the organisation's time zone (demo Asia/Kolkata) | Built in; times are stored in UTC (03 §3) |
| **Browser storage (localStorage)** | Remember EN / हिन्दी choice | Per-device convenience only (03 F10.2) |
| **Polling (~30 s)** | Notification bell count, dashboard refresh | Simplest reliable refresh (D4); Supabase Realtime later (Could) |

---

## 3. Screens (routes)

| Route | Role | What it shows / does | Flow |
|---|---|---|---|
| `/` 🆕 | Public | Home page: logo, headline, animated park scene with a tappable bin mascot (tips about what the app does), demo case tracker card (tap to step through submitted → assigned → awaiting review → closed, labelled Demo), how-it-works loop (tap a step), issue types, the six features, calls to action (Report an issue, Segregation guide, Log in, Sign up); no invented statistics | User request 2026-09-30 |
| `/awareness` | Public | Wet, dry, hazardous, e-waste; which bin; disposal tips; how to use the app; EN / हिन्दी toggle; source per item; "Report an issue" / "Request a pickup" buttons | F10 |
| `/awareness` — as built 🆕 | Public | Follows the Solid Waste Management Rules, 2026 (in force 1 April 2026, replacing the 2016 rules): four streams **wet, dry, sanitary, special care** (special care = the earlier "hazardous"), plus e-waste (E-Waste (Management) Rules, 2022). Text and official PIB sources (English + Hindi releases) in `content/awareness.json`; stream names and examples use the official PIB Hindi release; UI strings and the "how to use" steps in Hindi still need a Hindi-speaking team member's check (PRD F6). No bin colours shown (not verified for the 2026 rules). "Request a pickup" button added when `/pickup/new` exists; "Which bin?" when the AI route exists. Code: `features/awareness/` | F10 |
| `/awareness` — "Which bin?" | Logged in | Photo → AI bin suggestion, no report created; limit message "Try again tomorrow, or see the guide below" | F10.1b |
| `/login`, `/signup` | Public | Sign-up: name, email, phone (optional), password, organisation, home area (lists from `list_orgs_for_signup`, `list_areas_for_signup`) | F1 |
| `/login`, `/signup` — look 🆕 | Public | One shared layout (`app/(public)/(auth)/layout.tsx`): framed panel, slowly turning planet behind the frame, floating clean-city island (towers, trees, wind turbine, pond, sorted bins), liquid-glass card with a Log in / Sign up switch (each tab is its own URL); bottom-left notch links to Home and the segregation guide; show/hide password; errors under each field; "Preview mode" note while accounts are browser-only | User request 2026-09-30 |
| `/login`, `/signup` — visual update 🆕 | Public | The earlier floating island is replaced in the shared layout by a locally stored, generated realistic city scene (`public/images/auth/clean-city-scene.webp`, shown as conceptual art). The headline reads "Cleaner city, one report at a time." Login copy: "Spot a problem. Follow the fix." The form, links and preview notice stay in place. | User request 2026-09-30 |
| `/reset-password`, `/update-password` 🆕 | Public | Ask for reset link; set new password from the link | F1.4 |
| `/my` | Resident | Own reports, followed cases, pickups (status, owner first name, due, overdue, timeline); next collection in my area; points, badges (10/30/50), opt-in leaderboard; vehicle estimate for a pickup on a trip | F8, F12.3, F13.7, F9.6 |
| `/report/new` | Resident, admin | Issue type → photo (required) → AI suggestion → location (GPS / registered / QR / address) → duplicate warning → note → submit | F3 |
| `/case/[id]` | Reporter, assigned worker, admin, supervisor (full view) · 🆕 followers and higher authority (summary view only, P1) | Full view: before/after photos, status, due, flags (incl. location mismatch), timeline, case people (first names), feedback + satisfaction; actions shown by role and status. Summary view: `CaseSummary` | F4 |
| `/pickup/new` | Resident, admin | Waste type, date, slot, address/location, note | F6.1 |
| `/pickup/[id]` 🆕 | Requester, assigned worker, admin | Pickup status and timeline (`pickup_events`, incl. old date/slot on reschedule); link to the auto-created complaint if missed | F6, D1 |
| `/worker` | Worker / driver | Today: assigned, done, remaining, overdue; area filter; tasks and pickups | F8 |
| `/worker/trip` | Driver | Start (GPS) → stops: Arrived / Collected / Skipped + reason / Refused (if policy); Segregated? yes/no; disposal-site QR scan or typed code; End | F9 |
| `/admin` | Admin | Counts by status; overdue, disputed, returned, far-from-site; area overview; per-worker progress; pickups; feedback counts; service measures; routine collections on time/late/missed; not-segregated by area; repeat not-segregated; top locations; SLA %; top predicted hotspots | F8, F7, F13 |
| `/admin/location/[id]` | Admin | Location history with photos; prevention review form | F7.2–7.3 |
| `/admin/map` | Admin | Report pins by status, flagged locations, risk colours, last vehicle positions, OSM attribution | F8, F13.4 |
| `/admin/setup` | Admin | Tabs: settings (incl. segregation policy, slot end times) · areas · locations + disposal sites · **print QR sheet** · people (add, deactivate, reactivate) · vehicles · collection schedules · job health | F2, 06 I4/I6 |
| `/admin/trips` 🆕 | Admin | Plan trips: vehicle, driver, date, ordered stops (locations / pickups), from a schedule | F9.1, F12.2 |
| `/admin/flags` 🆕 | Admin | Worker performance flags with outcome buttons | F13.3 |
| `/admin/audit` 🆕 | Admin | Setup change history (who, what, old → new) | 06 F3 |
| Admin CSV export (Could) | Admin | Button on `/admin`: reports and pickups by date and area | F8 |
| `/supervisor` | Supervisor | Escalated queue; overdue by area and worker; service measures; prevention reviews (read-only); all flags; add instruction / reassign | F5, F8, F13 |
| `/authority` | Higher authority | Level-2 escalations; scorecards; SLA compliance; risk scores; admin and area flags; add instruction notes (no closing, no settings) | F5.2b, F13 |

---

## 4. Shared components

| Component | Rule |
|---|---|
| `DemoLabel` | "Demo data" in the header on every page (03 §3) |
| `NotificationBell` | Unread count, list, mark as read; polls ~30 s |
| `StatusBadge` | Status **in text** plus colour, never colour only (PRD accessibility) |
| `OverdueTag`, flag chips | "Overdue by Xh", "Escalated", "Far from site", "Not verified" |
| `Timeline` | Events with actor, time (local), note, photo |
| `PhotoPicker` | Camera/gallery, HEIC → JPEG, resize, preview, notice **"Avoid faces and vehicle numbers."**, unsupported file → **"This file type is not supported. Please take or choose a photo."** |
| `LocationPicker` | GPS with accuracy → registered location → address; "Scan bin QR" → `resolve_qr`; typed code fallback. 🆕 (R1) **Draggable map pin** to the actual waste spot; sends raw phone GPS separately; if the phone is far from the chosen bin shows **"You seem far from this bin"** (submit still allowed) |
| `CategoryPicker` | AI suggestion pre-selected only for high/medium confidence; low = "uncertain", not pre-selected; label "AI suggestion"; resident can change. 🆕 (R7) **Required** — *mixed / uncertain* is a valid choice |
| `FeedbackForm` 🆕 | Resolved / Partly / Not resolved + comment; optional **Satisfied / Neutral / Unsatisfied** (R2) |
| `AddEvidence` 🆕 | Reporter or follower adds a photo or note to an open case (R4) |
| `DelayNote` 🆕 | Admin or assigned worker: delay reason + next step on an overdue case (R5) |
| `CaseSummary` 🆕 | What followers and the higher authority see: status, type, place, dates, overdue/escalation, event types — **no photos, notes, feedback or names** (P1) |
| `HazardNotice` | Red: **"Possible hazardous / biomedical waste. Do not touch. Keep a safe distance."** |
| `DuplicateNotice` | "An open case exists here: **Follow it** or **Report a different issue**" (from `open_case_at`) |
| `QrScanner`, `QrSheet` | Scan with fallback; printable sheet (code + location name) |
| `MapView` | Client-only; attribution always visible |
| `EmptyState`, `ErrorMessage`, `Retry` | Every list has an empty message; on failure the form keeps its data and offers Retry (03 §3, F3.6) |
| `LanguageToggle` | Awareness page only; remembered on the device |
| `Logo` 🆕 | The supplied SWMS logo, unchanged (`public/brand/logo.png`, transparent PNG) via `next/image` |
| `FlipMedia` 🆕 | Two-sided media box on the home issue cards: shows the icon; hover/focus flips to a real photo; on touch screens the first tap flips, the next tap opens the link; instant under reduced motion. Photos in `public/images/issues/` (Unsplash License, credits in `CREDITS.md`; illustrations only, not app data) |
| `Reveal` 🆕 | Fades sections in on scroll; content stays visible without JavaScript and with reduced motion |
| `EstimateBadge`, `PredictionLabel`, `SimulatedLabel` | "Vehicle expected around … (estimate)"; "Prediction from demo data, not validated"; "Simulated with the driver's phone — not vehicle GPS hardware" |

---

## 5. How the frontend talks to the backend

- **Reads:** Server Components read through the Supabase server client **as the logged-in user**, so the database access rules decide what appears (02-BACKEND, 04-AUTH).
- **Changes:** forms call **server actions**; photos and AI analysis go to **route handlers** (multipart). The frontend never calls a database table directly for a change.
- **After a change:** the page refreshes its data; errors from the server are shown as plain messages (mapping in 02-BACKEND).
- **Never in the browser:** the service-role key, the Gemini key, raw storage paths (only short-lived signed links).

---

## 6. UX rules

- Reporting should take about **15 seconds** (target, untested).
- Phone first; large tap targets; labelled fields; readable contrast (PRD accessibility).
- Loading states on every submit; buttons disabled while sending; no double submit.
- Show only the actions the current role and status allow (the server still checks).
- Times always in the organisation's time zone with the date.
- Every AI, prediction, estimate and simulated value carries its label (05-AI-SPEC §0).

### 6.1 Design tokens 🆕 (defined in `swms-app/app/globals.css`; use these, never raw hex, px sizes or ad-hoc shadows in screens)

| Group | Tokens | Use |
|---|---|---|
| Brand | `leaf-50` … `leaf-950`, `lime-soft`, `sky-soft`, `cream` | Brand surfaces and text (from the logo). Main text `leaf-950`; secondary text `leaf-950/80` or `muted-foreground`; primary button `primary` (= `leaf-700`), hover `leaf-800` |
| Status | `success` / `success-soft`, `warning` / `warning-soft` / `warning-line`, `danger` / `danger-soft` | Status badges, overdue, "Demo" labels, hazard notice, errors. Always with text, never colour only |
| Type | Plus Jakarta Sans (interface), Instrument Serif italic (accent word in headings only); sizes from the Tailwind scale plus `text-ui` (15px) and `text-lead` (17px); minimum `text-xs` (12px) | |
| Text styles | `eyebrow` (small uppercase section label), `section-title` (section heading), `accent-serif` (serif accent inside a heading) | Same heading look on every page |
| Shadows | `shadow-card`, `shadow-float`, `shadow-cta` | Cards, floating bubbles, primary buttons |
| Glass + motion 🆕 | `shadow-glass`, `sky-mid`; `animate-float`, `animate-blob`, `animate-turn`, `animate-orbit`, `animate-enter` | Liquid-glass card and its moving colour blobs, floating island, turbine, planet, form entrance (login/sign-up); all off under reduced motion |

Contrast checked (WCAG AA ≥ 4.5:1 for text): lowest pair on the home page is `leaf-600` on `cream`, 4.99:1. The illustration SVGs (park scene, mascot) keep their own fixed colours; they are artwork, not interface.

---

## 7. Where it lives

```
app/
  (public)/page.tsx (home 🆕), awareness, login, signup, reset-password, update-password 🆕
  (resident)/my, report/new, pickup/new, pickup/[id] 🆕, case/[id]
  (worker)/worker, worker/trip
  (admin)/admin, admin/location/[id], admin/map, admin/setup, admin/trips 🆕, admin/flags 🆕, admin/audit 🆕
  (supervisor)/supervisor
  (authority)/authority
components/          DemoLabel, NotificationBell, StatusBadge, Timeline, PhotoPicker, LocationPicker,
                     CategoryPicker, HazardNotice, DuplicateNotice, QrScanner, QrSheet, MapView, EmptyState …
components/home/     🆕 home page sections: SiteHeader, Hero, HeroScene, Mascot, CaseTrackerCard, HowItWorks, IssueTypes, Features, SiteFooter
                     (moved 2026-09-30 into the feature-based layout below; code unchanged)
components/layout/   🆕 site chrome shared by pages: SiteHeader, SiteFooter, nav-links
components/shared/   🆕 small reusable pieces: Logo, Reveal, DemoLabel
features/<feature>/  🆕 one folder per feature, entry point index.ts; pages import only from it
  home/sections/     Hero, HowItWorks, IssueTypes, Features
  home/widgets/      CaseTrackerCard, Mascot, FlipMedia
  home/scene/        HeroScene + skyline data + parts/ (Tower, Tree, Bench, Lamp, Cloud)
  home/content/      page text and lists (no UI code)
  auth/ …            next: login and sign-up follow the same pattern
  auth/ 🆕           sections/AuthShell · widgets/ LoginForm, SignUpForm, AuthTabs, fields, SubmitButton, useAuthForm · scene/ CleanCityIsland, PlanetBackdrop · schema.ts (zod) · actions.ts (login, signUp, getSignUpOptions; demo until the backend exists)
components/ui/       shadcn/ui components
public/brand/logo.png 🆕 logo as supplied
lib/validation/      zod schemas shared with the backend
lib/time.ts          organisation time-zone formatting
content/awareness.json      🆕 built: streams, how-to steps, UI text, sources (EN + HI)
features/awareness/         🆕 AwarenessGuide section, LanguageToggle + useLanguage (choice kept in browser storage)
```

---

## 8. Testing

- **Playwright** smoke test per role: log in, reach the home screen, do the main action (08-DEVOPS).
- Manual phone check over HTTPS: camera, GPS permission, QR scan, HEIC photo from an iPhone.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| OSM tiles missing | Map is secondary; lists still work |
| QR scan fails (low light, damaged code) | Typed code fallback; disposal result `no_scan` is flagged, never blocks |
| HEIC photo cannot be read | Conversion library; clear unsupported-file message |
| GPS denied or inaccurate | Registered location or address; accuracy stored |
| Leaflet breaks the build | Client-only import |

## 10. Confirm at setup [Verify]

🆕 **Next.js 16 renamed `middleware.ts` to `proxy.ts`** (checked in the installed Next.js 16.3.7 docs); 04-AUTH N2 still says middleware — team to confirm before auth work · QR library choice · HEIC library and browser behaviour · `next/font` Noto Sans Devanagari · shadcn/ui icon set · current versions recorded in `package.json`.

### Implementation checkpoint 🆕 (2026-10-01)

The current app includes `/pickup/new`, `/pickup/[id]`, pickup cards in `/my`, admin/worker pickup links, a notification bell with 30-second refresh, and `/reset-password` plus `/update-password`. Pickup pages follow the existing home palette and typography. The shared auth frame now uses the generated clean-city photo alongside the form, with the requested headline and login punchline; the earlier decorative scene source remains in the repository. The awareness page links to the pickup form. The pickup flow and auth frame compiled in the production build; live email delivery still depends on Supabase email configuration and an allowed redirect URL. Other planned routes in section 3 remain unimplemented unless listed in the build output.

🆕 The report form now requests an AI photo suggestion after a photo is chosen, and the awareness page has the separate “Which bin?” helper. Both keep manual guidance when the AI key is absent, over limit or unavailable. The UI uses the existing home design tokens. The helper copy is marked English within the bilingual guide; Hindi copy still requires a Hindi-speaking review before calling it localized.

### Implementation checkpoint 🆕 (2026-10-01, case lifecycle, admin tools, resident extras)

Built beyond the earlier checkpoint, all using the existing tokens and shared layout:
- `/case/[id]` shows role panels only where 03 §7 allows them: admin **review** (reject while submitted, close with a reason and a "counts for points" choice, correct the issue type), worker **return task** with a reason, **delay note** (admin or assigned worker, only when overdue), supervisor / higher-authority **instruction**, reporter or follower **add evidence** (photo and/or note; shown with its photo on the timeline), reporter **reopen** inside the reopen window. The duplicate notice on the report form now offers **Follow this case**.
- `/admin/cases` 🆕 (not listed in §3): all cases filtered by status, type and area; the filters live in the URL and every dashboard count links to its filter. `/admin/location/[id]`: a place's repeat-incident flag, risk score, cases, and prevention reviews (create, mark done with outcome). `/admin/map`: Leaflet + OpenStreetMap, loaded only in the browser, attribution visible, pins by worst open case, dark ring for flagged places, circle size by predicted risk, a legend, and a text list so nothing depends on colour. `/admin/setup` gains **People** (invite worker or supervisor, deactivate, reactivate). The admin dashboard has a toolbar (cases, map, setup) and a CSV export form.
- `/my` now also shows the next routine collection for the resident's area, points and badges (10 / 30 / 50 verified reports), the opt-in area leaderboard (first name and points only) and "Cases I follow" (summary only).
- New shared piece: `components/shared/ReasonForm` (one required text field plus extra controls, pending state, plain errors, refresh on success). `StatCard` accepts an optional link.
- Still not built from §3: `/worker/trip`, `/admin/trips`, `/admin/flags`, `/admin/audit`. Not verified: the real invite email (Supabase built-in email only reaches team addresses) and a real phone (camera, GPS, QR scan).

### Implementation checkpoint 🆕 (2026-10-01, staff sign-up and live vehicles)

### F14 SWMS bot launcher 🆕 (2026-10-01)

The requested animated bin mascot is reused as a small labelled chat launcher. It is fixed on the homepage right and on signed-in resident/worker screens left, clear of the main page controls at phone width. The chat has a visible heading, close button, message log, labelled text field, loading and failure states, keyboard focus, and reduced-motion support from the existing CSS. It follows the home's leaf/cream palette and Plus Jakarta Sans typography. Bot answers include links to the relevant app screen when available.

Launcher refinement 🆕 (2026-10-01): the owner requested a transparent clickable mascot at the bottom, with only “Ask” below it. The long “Ask SWMS bot” launcher text is removed; the open chat retains its SWMS bot heading and bottom question field. The homepage launcher stays on the right and signed-in app launcher on the left.

### Staff sign-up and live vehicles — continued

New `features/trips/` (`DriverTrip`, `LiveVehicles` with a client-only Leaflet `VehicleMap`, polling every 15 s while visible). `QrScanner` moved to `components/shared/` (used by the report form and the driver's vehicle scan). `features/auth/widgets/ChoiceCards.tsx` for "Who are you?" and "Type of work". Pages: `/worker` (driver trip + live map), `/my` and `/admin/map` (live vehicles), `/admin/setup#staff-ids`, vehicle codes on `/admin/setup/qr`. Login page has a Resident / Staff switch (`/login?as=staff`, also in the footer).

### Demo QR walkthrough 🆕 (2026-10-01)

`/admin/setup/qr` adds a screen-only demo section alongside the existing printable sheet. It generates labelled Worker, Waste collector and Driver demo QR images and accepts an uploaded PNG, JPEG or WebP QR image. `@zxing/browser` decodes the image locally. The decoded value is matched against only the demo URLs for this site or the active location/vehicle codes already returned by the admin-only sheet functions. It shows the matching documented sequence and never calls a write action, follows an arbitrary URL, uploads the image, or treats a QR as staff authentication. Unknown and cross-organisation codes show a clear failure state. The existing printable codes and operational scanner flows are unchanged.

The generated role QR images encode `/demo/qr?demo=worker|collector|driver`, a public read-only page that shows the same walkthrough on a phone. Only the admin sheet handles operational location and vehicle tokens; the public route never receives those tokens.
