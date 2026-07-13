# Light Healthcare — HMS

An AI-native hospital management system built for both **super specialty hospitals** and **small hospitals/clinics** in India. Staff work in role-scoped web portals, patients book and track care from a mobile app, and a FastAPI service hosts the AI endpoints — all on one Supabase backend.

**Core value:** the live patient flow — *book → check-in → consult → order tests → dispense → bill* — works end-to-end **in real time** across every role portal without a page refresh, at both a 10-bed clinic and a 500-bed multi-department hospital.

---

## Monorepo layout

```
apps/
  web/           Next.js 15 (App Router) — staff portals: reception, doctor,
                 diagnostics, pharmacy, admin. Role-scoped routing + Realtime.
  mobile/        Expo SDK 52 (expo-router + NativeWind) — patient app:
                 phone-OTP auth, booking with QR, appointments, reports, profile.
  ai-services/   FastAPI — typed AI endpoints (triage, drug-interaction,
                 ambient scribe). Mock logic in v1; production Dockerfile.
packages/
  shared-types/  Generated Supabase Database types + shared enums (no `any`).
  ui/            Shared component library (thin in v1).
supabase/
  seed-dev.sql   Idempotent dev seed (patients, appointments, medicines…).
  migrations/    RLS fixes + policies applied to the cloud project.
```

**Stack:** Next.js 15 · React 19 · TypeScript (strict) · Tailwind + shadcn-style components · Expo + NativeWind · Supabase (Postgres, Auth, Realtime, Storage, RLS) · FastAPI + Pydantic v2 · pnpm workspaces + Turborepo · Playwright + Vitest + pytest.

---

## Quick start

```bash
pnpm install

# Web (staff portals)
cp apps/web/.env.local.example apps/web/.env.local   # fill Supabase URL + anon key
pnpm --filter @light/web dev                          # http://localhost:3000

# Mobile (patient app)
cp apps/mobile/.env.example apps/mobile/.env          # same Supabase values (EXPO_PUBLIC_*)
cd apps/mobile && npx expo start

# AI services
cd apps/ai-services
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000                # http://localhost:8000/health
```

### Test accounts (dev project, password `Test1234!`)

| Portal | Email | Lands on |
|--------|-------|----------|
| Reception | `reception@test.com` | `/reception` |
| Doctor | `doctor@test.com` | `/doctor` |
| Diagnostics | `lab@test.com` | `/diagnostics` |
| Pharmacy | `pharmacist@test.com` | `/pharmacy` |
| Patient (mobile dev login) | `patient@test.com` | app tabs |

---

## What's built

### Staff portals (web)

- **Auth & shell** — email/password login, middleware reads `staff.role` and routes to the right portal while blocking cross-role access. Every page renders in a shared `DashboardLayout` (role accent colors, collapsible sidebar, loading/error/empty states everywhere).
- **Reception** — live appointment queue (Supabase Realtime, reconnection-safe), check-in and past-slot no-show, status tabs + search + stats cards, patient registry with zod-validated registration, billing for completed visits with duplicate-payment guard.
- **Doctor** — live list of today's checked-in patients, consultation page with patient history tabs (visits / orders with result links / prescriptions), start→complete visit lifecycle (race-safe visit creation), test ordering and prescriptions with a searchable medicine picker, cross-visit patient history behind an IDOR ownership guard.
- **Diagnostics** — live pending orders with type icons, accept → upload result file to a **private** Storage bucket (viewed via signed URLs) → notes → complete, completed-orders browser with date/type filters.
- **Pharmacy** — live pending prescriptions with stock warnings, **atomic dispensing via the `dispense_medicine` Postgres RPC** (row-locked stock decrement + status flip in one transaction), inventory with compare-and-swap inline stock edits and low-stock-first sorting, dispensed history.

### Patient app (mobile)

- Phone-OTP sign-in (production path; needs an SMS provider — see below) with auto patient-row creation on first sign-in; `__DEV__`-only email login for development (verified stripped from release bundles).
- Booking wizard: department → doctor → free slot → confirm via the **atomic `book_appointment` RPC** (no double-booking) → QR code of the appointment id.
- Appointments list (upcoming first) with per-appointment QR, reports grouped by visit (diagnosis, result files via signed URLs, prescriptions), editable profile.

### AI services (FastAPI)

| Endpoint | In | Out |
|----------|----|----|
| `POST /api/triage` | symptoms, age, gender | suggested department, urgency (`low…emergency`), reasoning |
| `POST /api/drug-check` | current medicines, new medicine | `safe` + interaction list (pair, severity, description) |
| `POST /api/scribe` | audio URL (validated, never fetched in mock) | chief complaint, diagnosis, notes, structured SOAP |

Mock logic in v1 (deterministic, input-sensitive); real model calls are the designed V2 step. Ships with `/health`, env-driven CORS (no wildcard), and a non-root `python:3.12-slim` Dockerfile.

---

## Security model

- **RLS everywhere** — every table has row-level security; helper functions (`current_staff_role()` etc.) are `SECURITY DEFINER` to avoid policy recursion. Staff see role-scoped data; patients see only their own rows (plus the doctor directory and medicine catalog, least-privilege).
- **Atomic money/stock paths** — dispensing and booking go through Postgres RPCs with row locks; no client-side stock or slot writes exist.
- **Storage** — result files live in a private bucket; access is via short-lived signed URLs only.
- Auth split: staff = email/password, patients = phone OTP. No staff self-signup.

## Testing

```bash
pnpm --filter @light/web typecheck && pnpm --filter @light/web build
cd apps/web && pnpm exec playwright test        # 15 e2e specs, self-resetting seed
pnpm --filter @light/mobile test                # 28 unit tests
cd apps/ai-services && .venv/bin/pytest -q      # 9 API tests
```

E2E specs run against the live dev Supabase project with seeded data (`supabase/seed-dev.sql`) and restore any state they mutate, so consecutive full-suite runs stay green.

---

## Known gaps / next steps

- **Phone OTP delivery** needs an SMS provider (e.g. Twilio) configured in the Supabase dashboard — the app code path is complete.
- **Multi-location** is deliberately unsolved in v1 (no `hospital_id` anywhere); tracked as a scale target so nothing hardcodes it away.
- Queue pagination/virtualization lands when daily volume demands it (design target: hundreds of appointments/day).
- V2: Razorpay checkout, insurance claims UI, audit-log viewer, real AI model calls.

Planning artifacts (roadmap, per-phase plans, verification reports) live in `.planning/`.
