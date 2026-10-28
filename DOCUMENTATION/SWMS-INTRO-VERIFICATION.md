# SWMS startup intro — verification, 2026-10-28

Implemented the owner's explicit six-second intro request in the existing Next.js 16.3.7 / React 19 app. The root layout already contained an unfinished intro integration; its previous source was preserved locally at `/private/tmp/swms-intro-before-20261028` before editing. Existing header edits were left in place. Authentication, server actions, role layouts and database functions were not modified.

## Result and limits

- Live Three.js Earth sphere with constant Y-axis rotation, cloud sphere, atmospheric shader, cyan/gold lights and GPU cleanup; parallel shader compilation where supported. Low-power preference, 1.5 pixel-ratio cap and a CSS textured-planet fallback.
- Animated image layers reveal S, W, M, S, the green bin, reflections and tagline from the exact second supplied reference. These are simulated 3D letters and photographic reflections, not independently modeled meshes or ray-traced reflections. Leaves/orbits/light rays are CSS effects. Earth-to-S is a crossfade, not a geometry morph.
- Original PNG SHA-256: `77ee5224cf60e5ea8cd3ef09da7644b534ed811773cef2f69399f5c4debc3c5b`, identical to the attachment. The served lossless WebP is 1,239,930 bytes; decoded RGB buffer equality against the original passed (4,320,000 bytes). The source PNG is preserved.
- Exactly 6,000 ms of scheduled playback, including 450 ms of dissolve into the mounted existing page. One play per tab session. Skip Intro/Escape, reduced-motion bypass/change listener, storage protection, independent deadline, visibility-resume deadline and inert/focus cleanup. A failed logo immediately dismisses the overlay.
- The intro never chooses a route, signs anyone in or fetches account data. Existing proxy/role layouts continue to determine the destination. The entire current screen including the bot remains mounted behind the overlay.

## Checks

| Check | Status | Evidence |
|---|---|---|
| `tsc --noEmit` | Passed | Local bundled Node 24.22.1, installed TypeScript |
| `npm run lint` | Passed | Zero errors and zero warnings after final edits |
| `npm run build` | Passed | Next.js production build, 31 generated static-page entries; original public, auth, protected and API routes retained |
| `vitest run tests/unit` | Passed | 4 test files, 13 tests, including 3 intro timing regressions |
| Desktop Chrome, 1440×900 | Passed | All eight stages captured; final run 6,000.5 ms from overlay appearance to removal; 104 increasing Earth rotation samples, 2.119872 → 2.745552 radians |
| Mobile Chrome viewport, 390×844 | Passed | Full final logo and tagline visible; screen continues afterward; no horizontal overflow |
| Skip, keyboard and focus | Passed | Click Skip and Escape; Tab stays on Skip during playback; app is no longer inert afterward |
| Session/navigation | Passed | Internal link to login and subsequent reload do not replay the intro |
| Reduced motion | Passed | Initial preference bypass and changing the preference mid-intro both release the app |
| Storage failure | Passed | Throwing `getItem`/`setItem` still allows skip and internal navigation |
| WebGL unavailable | Passed | Forced-null WebGL context uses fallback and still exits by deadline |
| Failed logo image | Passed | Aborted image request releases the existing app |
| No JavaScript | Passed | Server-rendered homepage remains accessible; pending cover is hidden through noscript |
| Existing protected route | Passed | Signed-out `/admin` still redirects to `/login`; login form remains usable |
| Browser page errors | Passed | Zero uncaught page errors during sequence and behavior checks |
| Signed-in role dashboard playback | Not run | No account was used; signed-out routing, shared root integration and compiled protected layouts were checked |
| Real phone / Safari / low-end hardware | Not run | Chrome desktop and emulated phone viewport only; cold/slow rendering may use the CSS planet |
| `git diff --check` | Passed | Whitespace check on tracked changes |

The first cold browser capture did not catch the early Earth stage; the gate still completed at approximately six seconds. Parallel shader compilation was added, and subsequent captures confirmed all eight stages and real WebGL rotation. The deadline does not wait for optional rendering. There is no audio.

## Changed files

- `swms-app/features/intro/`: `IntroGate.tsx`, `SWMSIntro.tsx`, `earthScene.ts`, `timeline.ts`, `intro.module.css`, `index.ts`.
- `swms-app/app/layout.tsx`: persistent root gate encloses the existing page and bot.
- `swms-app/public/brand/intro/`: supplied original PNG, lossless WebP, Earth day/cloud textures and asset credits.
- `swms-app/package.json`, `package-lock.json`: `three` 0.186.1 and development-only `@types/three` 0.186.0. No other intentional package upgrades.
- `swms-app/tests/unit/intro-timeline.test.ts`: reveal order, hold/dissolve and stage boundaries.
- `DOCUMENTATION/02-PRD.md`, `TECH-STACK/01-FRONTEND.md`, this report, and `swms-app/README.md`: additive requirement, technical and verification notes.
- Local-only `CLAUDE.md` and `AGENT.md`: synchronized checkpoint log. Existing instruction text retained.

Local browser captures and capture scripts are in `/private/tmp/swms-intro-qa/`. The saved final desktop and mobile views are also in `PRESENTATION/intro-preview-2026-10-28/`. These are local evidence, not production assets. Browser CLI diagnostic output in `.playwright-cli/` is not part of the commit below.

## Commit checkpoint

Confidentiality review passed for the file list below: no keys, tokens, actual environment files, passwords, personal records or private instructions included. Repository author email uses GitHub no-reply. No commit, push, database write or deployment was performed. The unrelated header changes and local presentation artifacts are excluded from this suggested commit.

Run manually from the project root after reviewing:

```bash
git add swms-app/features/intro swms-app/public/brand/intro swms-app/tests/unit/intro-timeline.test.ts swms-app/app/layout.tsx swms-app/package.json swms-app/package-lock.json swms-app/README.md DOCUMENTATION/02-PRD.md DOCUMENTATION/TECH-STACK/01-FRONTEND.md DOCUMENTATION/SWMS-INTRO-VERIFICATION.md
git diff --cached --check
git diff --cached --stat
git commit -m "Add six-second cinematic SWMS startup intro"
```

To replay locally, remove only `swms_intro_played` from this origin's sessionStorage and reload, or use a fresh private window. Reduced-motion users bypass playback by design.
