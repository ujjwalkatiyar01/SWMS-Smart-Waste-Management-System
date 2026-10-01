# SWMS app (Next.js)

The web application for the Smart Waste Management System. Project overview, features and documentation: see the [main README](../README.md) and [DOCUMENTATION/](../DOCUMENTATION/).

## Run locally

Requirements: Node.js 22 or newer (`nvm use` reads `.nvmrc`); Supabase needs 22+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What is built

- **Awareness page** (`/awareness`): four-stream segregation guide (Solid Waste Management Rules, 2026) and e-waste, English / हिन्दी, official source per item.
- **Home page** (`/`, file `app/(public)/page.tsx`): headline, animated park scene with a tappable bin mascot, a sample case tracker, how the loop works, issue types and the six features.
- Folders for every other screen, the API routes, the database migrations and the tests are in place; they are filled in as each part is built.

### Current implementation checkpoint (2026-10-01)

The earlier folder map and build notes above describe the initial scaffold. The app now has live Supabase login/sign-up, report and case flows, role dashboards, `/pickup/new` and `/pickup/[id]`, and account recovery screens. The pickup form, staff actions, private photo evidence, status timeline, notifications, and automatic missed-pickup complaint are connected to the configured Supabase project. The login/sign-up frame shows `public/images/auth/clean-city-scene.webp` and the requested clean-city headline. The AI analyzer, trip screens, admin setup/map and several Should/Could pages from the PRD are still pending; do not treat the folder map as a completed route list. `NEXT_PUBLIC_SITE_URL` is optional for local reset links and required for a deployed URL; allow the callback URL in Supabase Auth settings. Existing hosted access checks and 16 offline schema tests pass.

🆕 The required AI photo-suggestion UI and server adapter were added after that checkpoint. They use `gemini-3.5-flash-lite` only when `GEMINI_API_KEY` is set; otherwise both screens keep manual guidance. The AI quota migration was applied to the configured Supabase project. The latest local suite passes 20 tests across schema and JPEG units. Live AI classification is still unverified because the key is empty.

## Stack in this folder

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · lucide-react icons · fonts Plus Jakarta Sans and Instrument Serif (`next/font`).

## Folder map

```
app/(public)/        home, login, sign-up, password reset, awareness
app/(public)/(auth)/ login + sign-up share one layout (frame stays while switching tabs)
app/(resident)/      report, case, pickup screens
app/(worker)/        worker tasks and trips
app/(admin)/         dashboard, map, setup, trips, flags, audit
app/(supervisor)/    supervisor queue
app/(authority)/     higher-authority queue
app/api/             photo upload, AI category suggestion, CSV export
components/layout/   site header, footer, navigation links
components/shared/   small reusable pieces (logo, scroll reveal, demo label)
components/ui/       shadcn/ui components
features/home/       home page: sections, widgets, scene, content (entry: index.ts)
features/awareness/  awareness page: guide section, language toggle (text + sources in content/awareness.json)
features/auth/       login + sign-up: frame, forms, island scene; schema.ts + actions.ts (demo, TODO(backend))
                     current frame uses the generated city scene in public/images/auth/
lib/                 Supabase clients, validation, AI adapter
supabase/            database migrations (from 06-PHYSICAL-SCHEMA), seed.sql, config.toml
scripts/             seed-users (sample logins), check-db (live security check), supabase-db (push, types)
tests/schema/        offline database test (PGlite): npm run test:schema
public/images/       illustrations (credits in public/images/issues/CREDITS.md)
```

## Keys

The home page needs no keys. When the backend is added, create `.env.local` (never committed):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only
GEMINI_API_KEY=                 # server only
```

All organisations, people, places and cases shown in the app are sample data.

© 2026 SWMS team. All rights reserved. See [LICENSE](../LICENSE).

### Implementation checkpoint (2026-10-01, later)

Built and tested against the hosted Supabase project: login, sign-up and recovery; reports with photos, AI suggestion (manual fallback when no key is set), duplicate warning with follow, and evidence; the full case lifecycle (assign, return, complete, feedback, dispute, close with a reason, reject, reopen, correct type, delay note, instruction); pickups; the admin dashboard, case list, place history with prevention reviews, map, CSV export and setup including people; supervisor and higher-authority queues; resident points, badges and opt-in leaderboard; and the awareness guide. Not built: simulated vehicle trips and their screens, performance flags, the setup audit page. The folder map above is complete; `features/` holds one folder per area.

```bash
npm run seed:demo        # sample cases, pickups and reviews (safe to repeat)
npm run reset:demo       # clears case and pickup data of the two sample organisations first
npm run test:unit        # Vitest
npm run test:schema      # database rules offline (PGlite)
npm run test:e2e         # Playwright, needs the app running and the sample logins
```
