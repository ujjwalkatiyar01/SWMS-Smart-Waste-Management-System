# SWMS app (Next.js)

The web application for the Smart Waste Management System. Project overview, features and documentation: see the [main README](../README.md) and [DOCUMENTATION/](../DOCUMENTATION/).

## Run locally

Requirements: Node.js 20.9 or newer (24 LTS recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What is built

- **Home page** (`/`, file `app/(public)/page.tsx`): headline, animated park scene with a tappable bin mascot, a sample case tracker, how the loop works, issue types and the six features.
- Folders for every other screen, the API routes, the database migrations and the tests are in place; they are filled in as each part is built.

## Stack in this folder

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · lucide-react icons · fonts Plus Jakarta Sans and Instrument Serif (`next/font`).

## Folder map

```
app/(public)/        home, login, sign-up, password reset, awareness
app/(resident)/      report, case, pickup screens
app/(worker)/        worker tasks and trips
app/(admin)/         dashboard, map, setup, trips, flags, audit
app/(supervisor)/    supervisor queue
app/(authority)/     higher-authority queue
app/api/             photo upload, AI category suggestion, CSV export
components/          shared UI and home-page sections
lib/                 Supabase clients, validation, AI adapter
supabase/            database migrations and tests
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
