# 4 · Authentication & Authorization Tech Stack

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value · 🆕 named while splitting |

**Authentication** = who you are (login). **Authorization** = what you may see and do (role, organisation, ownership, status).

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md) (D3 email decision, §5 security).
2. Check whether any login, role, key or permission rule there is missing from this file.
3. Cross-check with the full docs: [../02-PRD.md](../02-PRD.md) (F1), [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (F1, F2.3, §2 roles, §3 "every request" rule, §7 permissions), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) (§6 sign-up, §7 access rules).
4. Also read: [02-BACKEND.md](02-BACKEND.md), [03-DATABASE.md](03-DATABASE.md), [01-FRONTEND.md](01-FRONTEND.md).
5. Missing something → add it here (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 1 (auth, sessions, reset, invites, roles), 2 (per-record authorization), 10 (secrets).

---

## 1. Tools

| Tool | Used for | Why |
|---|---|---|
| **Supabase Auth** (email + password) | Accounts, hashed passwords, sessions, reset links | Passwords never touch our code or tables [Rec] |
| **`@supabase/ssr`** 🆕 | Session stored in secure cookies; read by Server Components, server actions and middleware | Needed so the server calls the database **as the user** [Verify] |
| **Next.js middleware** 🆕 | Refresh the session on each request; send logged-out users to `/login`; send each role to its home | Smooth routing; not the security gate [Verify] |
| **Postgres RLS + status-change functions** | The real authorization | Checked in the database for every request (03-DATABASE) |
| **Built-in Supabase email → custom SMTP** | Reset and staff invite emails | Built-in: **2 emails/hour, team addresses only** [Doc] → demo approach D3; custom SMTP before real use |

---

## 2. Roles

| Role | Home | How the account is created |
|---|---|---|
| Resident | `/my` | Self sign-up (role forced to `resident` by the database trigger) |
| Worker / Driver | `/worker` | Admin adds in setup (server creates the account) |
| Admin | `/admin` | Seed script (demo); admin adds in setup |
| Supervisor | `/supervisor` | Admin adds in setup |
| Higher authority 🧠 (demo role) | `/authority` | Seed script / admin |
| Public | `/awareness` | No account |

Permissions per action: [../03-FULL-APP-FLOW.md §7](../03-FULL-APP-FLOW.md).

---

## 3. The 5-check gate (every request)

| # | Check | Where |
|---|---|---|
| 1 | Valid session | Supabase Auth cookie (`@supabase/ssr`) |
| 2 | User is `active` | Helper `my_org()` / `my_role()` return nothing for inactive users → every rule fails; middleware also signs them out with a message |
| 3 | Same organisation | Every access rule and function checks `org_id` |
| 4 | Role and ownership allowed | Access rules (reads) + functions (changes) |
| 5 | Status change allowed | Status-change functions (03 §6) |

Hiding buttons in the frontend is only for a cleaner screen; checks 1–5 happen on the server and in the database.

---

## 4. Flows

| Flow | How |
|---|---|
| **Sign-up** (F1.1) | Page lists organisations and areas (`list_orgs_for_signup`, `list_areas_for_signup`, allowed without login) → `signUp` with metadata `org_id`, `area_id`, `name`, `phone` → trigger creates the profile with role `resident`; area must belong to the organisation |
| **Email confirmation** | Off for the demo (D3) |
| **Login** (F1.2) | `signInWithPassword` → middleware reads the role → role home; inactive → "Your account is not active" |
| **Logout** (F1.5) | `signOut`; cookies cleared |
| **Password reset** (F1.4) | `/reset-password` → reset email link → `/update-password` sets the new password. Demo: only a team email address (D3) |
| **Staff account** (F2.3) | Admin submits the form → server (admin client) creates the user with confirmed email and sets role + organisation; invite email only with custom SMTP (D3) |
| **Deactivate / reactivate** | `deactivate_user` (open cases → returned, pickups unassigned) / `reactivate_user`; access stops immediately because every rule checks `active` |
| **Demo logins** | One per role per organisation, created by `scripts/seed-users`; credentials kept in the project's seed/example config, not in chat or the PPT |

---

## 5. Keys

| Key | Where it may exist | Why |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Public address of the project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (may be called *publishable*) | Browser + server | Safe to expose; access rules protect the data [Verify naming] |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** (`lib/supabase/admin.ts`, scripts) | Bypasses access rules — used only for the fixed list in [02-BACKEND.md §3](02-BACKEND.md) |
| `GEMINI_API_KEY` | **Server only** | See [06-AI.md](06-AI.md) |

Keys only in environment variables, never committed (04 §5 item 6).

---

## 6. Security rules

- Password minimum length set in Supabase Auth settings (recommend 8) [Verify default].
- Supabase Auth has its own rate limits on login and email endpoints [Doc: 04 §12 rate limits].
- Never log passwords, tokens or reset links.
- Logged-out users can read nothing except the two sign-up lists and the static awareness page (tested: anon → permission denied on tables).
- A resident can pick any organisation at sign-up (open sign-up, 03 F1); admins deactivate misuse.

## 7. Where it lives

```
middleware.ts                session refresh + role redirect
lib/supabase/server.ts       user client (cookies)
lib/supabase/admin.ts        service-role client (only file that reads the key)
app/(public)/login, signup, reset-password, update-password
supabase/migrations/0005_signup.sql, 0006_rls.sql, 0009_grants.sql
scripts/seed-users
```

## 8. Testing

For each role of both organisations: log in → correct home; try to open another role's page → redirected; try to read the other organisation's data → nothing; deactivated user → blocked immediately (06 §11).

## 9. Risks

| Risk | Mitigation |
|---|---|
| Reset / invite emails fail for non-team addresses | D3 demo approach; custom SMTP before real use |
| Service-role key leaks to the browser | Only `lib/supabase/admin.ts` reads it; no `NEXT_PUBLIC_` prefix |
| Role checked only in the frontend | Database rules are the gate (tested) |

## 10. Confirm at setup [Verify]

`@supabase/ssr` pattern for the Next.js version · session lifetime · password minimum · anon vs publishable key naming.

### Implementation checkpoint 🆕 (2026-10-01)

`/reset-password` requests the Supabase Auth recovery email; `/auth/callback` exchanges the PKCE code and `/update-password` changes the password in the recovered session. The redirect uses `NEXT_PUBLIC_SITE_URL` when set, or the request origin for local use. Supabase must allow the callback URL and its demo email service remains limited to team addresses until custom SMTP is configured. Email delivery and the full link round trip have not yet been verified live.

### Implementation checkpoint 🆕 (2026-10-01, verified staff sign-up)

User decision: sign-up offers Resident, Worker (waste collector or driver) and Administrator. Worker and administrator sign-ups need a staff ID and work email listed in the organisation's staff list (`staff_roster`, migration `20261001000800`); the sign-up trigger gives the role and worker type from that list, never from the form, and each ID works once. This qualifies the earlier rule "sign-up always creates a resident" (06 §6); invites from Setup → People still work. The list is the organisation's own record, not a government check. With email confirmation off (D3), knowing a listed ID and its email is enough to claim it — enable confirmation before real use.
