# Light Healthcare — HMS

## What This Is

An AI-native hospital management system built for both super specialty hospitals and small hospitals/clinics in India. Staff (reception, doctors, diagnostics, pharmacy, admin) work in role-scoped Next.js web portals; patients book appointments and view reports from an Expo mobile app; a FastAPI service hosts AI endpoints (triage, drug-interaction, ambient scribe). Everything runs on one Supabase project (Postgres + Auth + Realtime + Storage).

## Core Value

The live patient flow — book → check-in → consult → order tests → dispense → bill — works end-to-end in real time across every role portal without a page refresh, at both a 10-bed clinic and a 500-bed multi-department super specialty hospital.

## Scale Targets (design for now, not retrofit later)

- **Departments:** UI (department pickers, doctor lists) must handle 15-20+ departments cleanly — cardiology, neurology, oncology, ortho, etc. — never assume 2-3.
- **Doctors:** multiple doctors per department, each with an independent slot calendar. No one-doctor-per-department assumption anywhere.
- **Queue/volume:** reception queue and doctor dashboards must stay usable at hundreds of appointments/day; add pagination or virtualization as volume grows rather than hardcoding small-list assumptions.
- **Roles:** current 5 roles (reception/doctor/lab_tech/pharmacist/admin) are the v1 floor, not the ceiling — ward nurse, OT staff, separate billing desk come later. Keep the staff_role enum + role-scoped RLS pattern easy to extend.
- **Multi-location (known gap):** not required now and not solved — there is no hospital_id anywhere. Avoid new single-hospital hardcoding that would make multi-location impossible later.

## Requirements

### Validated

- ✓ Supabase schema (14 tables, enums, RLS, helper functions) — live in project `rylceydkrydmpysmibba`
- ✓ Monorepo scaffold (pnpm workspaces + turbo: apps/web, apps/mobile, apps/ai-services, packages/shared-types, packages/ui) — existing
- ✓ Next.js auth plumbing: @supabase/ssr clients (browser/server/middleware) + role-routing middleware — existing
- ✓ Generated Database types in @light/shared-types — this session
- ✓ `dispense_medicine` atomic RPC (security definer, stock guard) — applied this session

### Active

- [ ] Staff login (email/password, no signup, role-redirect)
- [ ] Shared DashboardLayout: collapsible sidebar, role accent colors, header with staff name + logout
- [ ] Reception: realtime queue (today, status tabs, stats, search, check-in, no-show)
- [ ] Reception: patient registry (search, register, history view)
- [ ] Reception: billing (today's completed visits, create payment, status badges)
- [ ] Doctor: today's checked-in/in-consultation list (realtime)
- [ ] Doctor: consultation panel (history tabs, complaint/diagnosis/notes, order tests, prescribe, complete visit)
- [ ] Doctor: all-patients list with cross-visit history
- [ ] Diagnostics: pending orders (realtime, accept), in-progress (upload result to Storage, notes, complete), completed (filters)
- [ ] Pharmacy: pending prescriptions (realtime, stock warnings, atomic dispense via RPC)
- [ ] Pharmacy: inventory (inline stock edit, low-stock highlight, add medicine)
- [ ] Pharmacy: dispensed history with date filter
- [ ] Admin: landing stub
- [ ] Mobile: phone-OTP auth, auto-create patient row on first sign-in
- [ ] Mobile: booking flow (department → doctor → slot → confirm → QR)
- [ ] Mobile: appointments list with QR, reports viewer, profile edit
- [ ] AI services: FastAPI with /api/triage, /api/drug-check, /api/scribe (typed Pydantic mocks), production Dockerfile

### Out of Scope

- Razorpay live integration — columns exist; payment recording is manual method+amount for v1
- Insurance claim workflows — schema ready, no UI demand yet
- ABDM/ABHA API integration — ABHA ID stored as text only for v1
- Real AI model calls in ai-services — placeholder mocks until models chosen
- Staff self-signup — accounts are admin-created only (security decision)
- Audit-log UI — table populated later; no viewer in v1

## Context

- Supabase project `rylceydkrydmpysmibba` is the single backend. Schema, RLS policies, and helper functions (`current_staff_id`, `current_staff_role`, `current_patient_id`) already deployed. 3 departments, 2 staff (1 doctor) seeded.
- `apps/web/.env.local` holds URL + anon key. Service-role key still placeholder — needed only for future admin routes.
- Existing web code is placeholder-quality except supabase clients and middleware, which are correct and stay.
- Storage bucket `scan-results` required for diagnostics uploads.
- Hospital staff use tablets at counters — responsive layouts are a hard requirement, not polish.

## Constraints

- **Tech stack**: Next.js 15 App Router + Tailwind + shadcn-style components; Expo + NativeWind; FastAPI — fixed by brief
- **Typing**: every Supabase query through generated `Database` types; no `any` — brief mandate
- **Realtime**: queue/orders/prescriptions views must live-update with reconnection handling — core value depends on it
- **Timezone**: all displayed dates in IST (Asia/Kolkata) — Indian hospital
- **Validation/UX**: zod on all forms; loading/error/empty states everywhere; sonner toasts; skeletons per page
- **Accessibility**: aria labels + keyboard navigation on interactive elements
- **Auth split**: staff = email/password, patients = phone OTP — different portals, same Supabase Auth
- **Dual-scale target**: every feature must work at both small-clinic and super specialty scale (many departments, many doctors per department, high daily volume) — see Scale Targets

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Auto-mode GSD init, research skipped | Brief prescribes stack/features/architecture fully; research would re-derive givens | — Pending |
| Hand-rolled shadcn-style primitives in apps/web (no shadcn CLI run) | Non-interactive session; keeps dependency surface small; same component API | — Pending |
| `in_consultation` (DB enum) is canonical; shared-types `in_consult` fixed | Type layer must mirror live schema | ✓ Good |
| dispense_medicine RPC with row lock + double-dispense guard | Brief demanded atomicity; guard prevents replay | — Pending |
| Intl.DateTimeFormat with Asia/Kolkata over date-fns-tz | One less dependency; date-fns still used for relative/parse | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-09 after initialization*
