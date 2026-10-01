# 8 · DevOps Tech Stack (hosting, setup, release, testing, demo)

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value · 🆕 named while splitting |

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md) (§8 setup, G3, G4, G7, §10 risks).
2. Check whether any hosting, tooling, test or demo step there is missing from this file.
3. Cross-check with the full docs: [../02-PRD.md](../02-PRD.md) (definition of done), [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (§11 demo data), [../05-AI-SPEC.md](../05-AI-SPEC.md) (§9 test set), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) (§2 migration order, §11 tests).
4. Also read every other part file — DevOps runs all of them.
5. Missing something → add it here (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 6 (HTTPS), 10 (hosting, secrets), 12 (error logs), 16 (demo reset), 17 (automated tests).

---

## 1. Hosting

| Service | Hosts | Plan |
|---|---|---|
| **Vercel** | Next.js app (frontend + backend), HTTPS | Hobby (free) [Verify limits] |
| **Supabase** | Postgres, Auth, Storage, Cron | Free [Verify limits and pausing when inactive] |
| Region 🆕 | Choose a Supabase region close to users (e.g. Mumbai) and the matching Vercel function region | Lower delay in India [Verify availability] |

Node.js **24 LTS** on Vercel. Current stable version of each package, recorded in `package.json` [Verify].

---

## 2. Environment variables (names only)

| Name | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server) + `.env.local`; never `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | Vercel (server) + `.env.local` |
| SMTP settings | Supabase dashboard only |

`.env.local` is in `.gitignore`; an `.env.example` lists the names with empty values.

---

## 3. Source control and release (G7)

- **GitHub repository in its own project folder.** Note: this machine's home folder is itself a git repository and the project folder is currently untracked inside it — run `git init` in the project folder (or a new code folder) so project commits do not land in the home repository.
- Branches: `main` = production; one short branch per feature; pull request → review → merge.
- **Vercel Git integration:** a preview deploy for every branch, production from `main`.
- **Quality checks before merge:** ESLint, Prettier, `tsc --noEmit`, Vitest.

---

## 4. Local setup

```
1. Install Node 24 LTS and the Supabase CLI (local Supabase needs Docker [Verify]).
2. supabase start                 # local Postgres, Auth, Storage
3. supabase db reset              # runs migrations 0001–0009 + seed.sql
4. node scripts/seed-users        # one login per role per organisation
5. supabase gen types typescript --local > types/database.ts
6. npm run dev
```

🆕 **Without Docker (current laptop):** `npm run test:schema` (PGlite, stand-ins for Supabase Auth, pg_cron, storage) → `npm run db:push -- --dry-run` → `npm run db:push` (migrations + seed.sql to the hosted project via `SUPABASE_DB_URL`) → `npm run seed:users` → `npm run check:db` → `npm run db:types`. Scripts read `.env.local` and never print it.

Schema changes: new file in `supabase/migrations/` → `supabase db reset` locally → push to the Supabase project (`supabase db push`) [Verify].

---

## 5. Testing (G4)

| Test | Tool | Checks |
|---|---|---|
| Schema smoke test | **PGlite** (already written, 57 checks) | Tables, rules, functions, jobs, audit fixes — seconds, no Docker |
| RLS tests | pgTAP via `supabase test db` [Verify] | Every role of both organisations; cross-organisation reads return nothing |
| Rules | **Vitest** | SLA / deadline helpers, risk formula, arrival estimate, zod schemas, error mapping, CSV escaping, EXIF removal |
| End to end | **Playwright** | Per role: log in → home → main action (report, assign, complete, feedback, pickup, trip) |
| AI test set | `scripts/ai-testset` | ≥ 10 photos per category; hazard recall (06-AI) |
| Phone check | Manual, over HTTPS | Camera, GPS, QR scan, iPhone HEIC photo |

---

## 6. Demo data and reset (G3)

- `scripts/reset-demo` = clear the two demo organisations → `seed.sql` → `scripts/seed-users`.
- Seed times are relative to `now()`, so overdue, escalated and "last week" data are always correct.
- "Demo data" label on every page.

---

## 7. Pre-demo checklist

1. Open the app and the Supabase dashboard ~10 minutes early (wakes a paused free project).
2. Run `scripts/reset-demo`.
3. Check `get_job_health()` — all 7 jobs ran recently.
4. Log in once per role on both organisations.
5. Try one AI analysis (key works, quota left); if not, show the manual fallback.
6. On a phone: camera, GPS, QR scan work over HTTPS.
7. Map tiles load (OSM attribution visible); if not, use the lists.

---

## 8. Logs and monitoring

Vercel function logs + Supabase logs; Sentry deferred. Never log passwords, tokens, keys, signed links or photos.

## 9. Where it lives

```
.env.example   .gitignore   package.json
supabase/migrations/  supabase/seed.sql  supabase/tests/
scripts/seed-users  scripts/reset-demo  scripts/ai-testset
tests/unit/ (vitest)  tests/e2e/ (playwright)  tests/schema/ (PGlite smoke test)
```

## 10. Risks

| Risk | Mitigation |
|---|---|
| Free Supabase project paused | Checklist step 1 |
| Commits land in the home-folder repository | `git init` in the project folder first |
| Secrets committed | `.gitignore`, `.env.example`, review |
| Demo data stale or changed | `reset-demo` before every demo |

## 11. Confirm at setup [Verify]

Vercel and Supabase free limits · region availability · Docker for local Supabase · `supabase db push` flow · pgTAP.

### Implementation checkpoint 🆕 (2026-10-01, scripts and tests)

- `npm run seed:demo` adds or refreshes the sample scenario in both organisations (about 12 cases in every status and flag, a place with repeat incidents and a prevention review, pickups in every state including a missed one with its linked complaint, a follower, points, risk scores, a vehicle and morning schedules per area). Fixed ids, times relative to now, nothing deleted. `npm run reset:demo` first deletes every case, pickup and related row of the two demo organisations (including test data) and their stored photos, then seeds again. It is the project's version of `scripts/reset-demo` in §6 and leaves users, places and settings alone (except two sample leaderboard choices).
- Tests: `npm run test:unit` (Vitest), `npm run test:schema` (PGlite, 43 tests), `npm run test:e2e` (Playwright with the installed Chrome: role logins and access rules, the core story, pickups, the case lifecycle). The end-to-end tests use the sample logins and remove what they create.
- Commands that read `.env.local` (`check:db`, `db:push`, `seed:*`) need Node 22 or newer.
