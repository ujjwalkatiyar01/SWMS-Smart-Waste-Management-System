# 5 · Storage & Photos Tech Stack

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value · 🆕 named while splitting |

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md) (D6, G8, §5 item 5).
2. Check whether any photo format, limit, path or privacy rule there is missing from this file.
3. Cross-check with the full docs: [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (§3 photos rule, F3.2, F3.6, F4.4, F6.3, F9.4), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) (§10 storage, audit S2).
4. Also read: [01-FRONTEND.md](01-FRONTEND.md) (picker), [02-BACKEND.md](02-BACKEND.md) (upload route), [06-AI.md](06-AI.md).
5. Missing something → add it here (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 4 (private storage, signed links, phone upload, EXIF strip).

---

## 1. Tools

| Step | Tool | Why |
|---|---|---|
| Pick / take photo | File + camera input (browser) | Built in |
| HEIC → JPEG | Browser decode, or a library such as `heic2any` 🆕 when the browser cannot | Server HEIC decoding may be unavailable [Verify] |
| Resize | Browser canvas → JPEG, long side ~1600 px, target ≤ 1 MB (demo) | Small uploads; under platform request limits |
| Type check | Server reads the first bytes (JPEG signature) | File names and browser types can lie |
| EXIF strip + re-encode | **`sharp`** on the server (auto-rotate, JPEG, no metadata) | Removes hidden GPS location (03 §3) [Verify output] |
| Store | **Supabase Storage**, bucket `photos`, **private** | Private by default [Doc] |
| View | **Signed links**, valid `signed_link_minutes` (demo 10) | Time-limited access [Doc: `createSignedUrl`] |

---

## 2. Photos in the app

| Photo | Required? | Who takes it | Path |
|---|---|---|---|
| Report before-photo | **Yes** (except the auto-created missed-pickup complaint) | Resident / admin | `<org_id>/reports/<report_id>/before.jpg` |
| Report after-photo | **Yes** to complete | Assigned worker | `<org_id>/reports/<report_id>/after.jpg` |
| Reopen photo | Optional | Reporter | `<org_id>/reports/<report_id>/reopen-<n>.jpg` |
| Added evidence 🆕 (R4) | Optional | Reporter or follower | `<org_id>/reports/<report_id>/evidence-<n>.jpg` |
| Pickup collected / refused photo | Optional / required for refuse | Worker | `<org_id>/pickups/<pickup_id>.jpg` |
| Trip photos (stop, disposal site) | Optional | Driver | `<org_id>/trips/<trip_id>/<event_id>.jpg` |
| AI analysis photo | Sent to the AI, **not stored** | — | — |

The database functions refuse a path outside the user's organisation and that record's folder (tested, 06 S2).

---

## 3. Rules

- Notice on every upload: **"Avoid faces and vehicle numbers."**
- Accepted in the picker: JPEG, PNG, WebP, iPhone HEIC → always stored as JPEG. Anything else: **"This file type is not supported. Please take or choose a photo."** (form data kept).
- **No storage access rules for users**: only the server uploads, deletes and creates signed links, and only after the database has confirmed the user may read that record. (Clarifies 04 §5 item 5, see 00 §6.)
- **Nothing half-saved:** if the database call fails after upload, the server deletes the file (03 F3.6).
- Screens receive only signed links, never storage paths or public URLs.
- Photos support review; they do not prove that the problem was solved (from our research).

## 4. Where it lives

```
components/PhotoPicker.tsx     pick, HEIC convert, resize, notice (frontend)
lib/photos.ts                  type check + sharp (backend)
app/api/photos/                upload route, Node.js runtime
bucket: photos (private)       created in Supabase (migration or dashboard)
```

## 5. Testing

A photo with GPS EXIF comes out without it · a HEIC photo from an iPhone uploads · a PDF renamed `.jpg` is rejected · a path for another organisation is refused · a signed link stops working after its time.

## 6. Risks

| Risk | Mitigation |
|---|---|
| iPhone HEIC fails | Browser conversion + clear message |
| Large file rejected by the platform | Resize first |
| Orphan files after failed submit | Delete in the same request |
| Free storage quota [Verify] | Small JPEGs; demo data only |

## 7. Confirm at setup [Verify]

HEIC behaviour on iPhone Safari and Android Chrome · `sharp` strips all metadata by default · Supabase free storage and bandwidth limits.
