# Roadmap: Light Healthcare — HMS

## Overview

Five phases carry the HMS from a bare (but schema-live) monorepo to a working v1: first the shared staff shell and auth that every web portal depends on, then the front half of the live patient flow (reception queue/registration/billing + doctor consultation/orders), then the back half that fulfills those orders (diagnostics results, pharmacy dispensing), and in parallel two independent tracks — the Expo patient app and the FastAPI AI services — that don't block or get blocked by the staff-portal work.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Staff Auth & Shared Shell** - Staff log in, land on their role home, and every portal page renders inside the shared DashboardLayout
- [ ] **Phase 2: Reception & Doctor Flow** - Reception runs the live queue/registry/billing; doctors consult, order, and prescribe in real time
- [ ] **Phase 3: Diagnostics & Pharmacy Flow** - Diagnostics fulfills test orders; pharmacy dispenses atomically against live stock
- [ ] **Phase 4: Mobile Patient App** - Patients authenticate via OTP, book appointments, and view their care history
- [ ] **Phase 5: AI Services** - FastAPI ships typed mock endpoints for triage, drug-check, and scribe, container-ready

## Phase Details

### Phase 1: Staff Auth & Shared Shell
**Goal**: Staff can securely log into their role-scoped portal and every page renders inside a consistent, resilient layout
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, SHELL-01, SHELL-02
**Success Criteria** (what must be TRUE):
  1. Staff can log in with email/password and land on their role home (/reception, /doctor, /diagnostics, /pharmacy, /admin); opening another role's URL is blocked
  2. Login errors surface as toasts, not silent failures or raw error text
  3. Every portal page renders inside the shared DashboardLayout: collapsible sidebar (hamburger on mobile), role accent color, header with staff name and logout
  4. Staff can log out from the header on any page and return to login
  5. Every page shows a skeleton while loading, an error state on failure, and an empty state when there are no rows
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — Foundation: shared-types enum fix, deps, ROLE_THEME + formatIST, failing login e2e (walking-skeleton scaffold)
- [x] 01-02-PLAN.md — Login slice: hand-rolled primitives + zod/sonner login + Toaster
- [x] 01-03-PLAN.md — Shell slice: DashboardLayout, role layouts, logout, PortalShell removed
- [x] 01-04-PLAN.md — Async conventions (loading/error/empty) + remaining primitives
- [x] 01-05-PLAN.md — Human-verify checkpoint (tablet-first shell)
**UI hint**: yes

### Phase 2: Reception & Doctor Flow
**Goal**: Reception manages the live front-desk flow end-to-end and doctors run consultations that produce orders and prescriptions
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: RECEP-01, RECEP-02, RECEP-03, RECEP-04, RECEP-05, RECEP-06, DOC-01, DOC-02, DOC-03, DOC-04, DOC-05
**Success Criteria** (what must be TRUE):
  1. Reception's queue updates live (no refresh), ordered by slot time with color-coded status badges, and reception can check patients in, mark no-shows, filter by status tabs, search by name/phone, and see live stats cards
  2. Reception can search/register patients (with zod-validated fields) and open a patient's appointment/visit history
  3. Reception can record a payment (amount, method) for a completed visit and see pending/paid status badges
  4. Doctor's checked-in/in-consultation list updates live, and doctor can open a consultation view with history tabs, record complaint/diagnosis/notes, add test orders and prescriptions, and complete the visit with optimistic updates
  5. Doctor can browse all patients they've seen with full cross-visit history
**Plans**: 8 plans
Plans:
- [x] 02-01-PLAN.md — Foundation: dev seed, useRealtimeList hook (D-15/D-16), D-31 nav, status/age/IST helpers
- [x] 02-02-PLAN.md — Reception live queue: realtime board, tabs/search/stats, optimistic check-in + no-show, queue e2e
- [x] 02-03-PLAN.md — Patient registry: injection-safe search, zod register Sheet, patient detail with history
- [ ] 02-04-PLAN.md — Billing: today's completed visits, needs-billing/paid badges, record-payment Sheet
- [ ] 02-05-PLAN.md — Doctor today: live checked-in/in-consultation cards linking to consult
- [ ] 02-06-PLAN.md — Consultation: patient header + history tabs, Start/Complete visit lifecycle (D-17/D-18), consult e2e
- [ ] 02-07-PLAN.md — Consult orders + prescriptions: add/remove test orders, medicine combobox prescriptions, add/remove e2e
- [ ] 02-08-PLAN.md — Doctor all-patients: searchable seen-patients list + cross-visit history grouped by visit
**UI hint**: yes

### Phase 3: Diagnostics & Pharmacy Flow
**Goal**: Diagnostics fulfills doctor-ordered tests and pharmacy dispenses prescribed medicine safely against live stock
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DIAG-01, DIAG-02, DIAG-03, PHARM-01, PHARM-02, PHARM-03, PHARM-04
**Success Criteria** (what must be TRUE):
  1. Lab tech sees ordered tests live, accepts them into progress, uploads a result file to Storage with notes, and marks the order completed
  2. Lab tech can browse completed orders with date-range and type filters and open result files
  3. Pharmacist sees pending prescriptions live with current stock and low-stock warnings
  4. Pharmacist dispenses medicine via the atomic dispense_medicine RPC; insufficient stock surfaces as an error toast rather than a partial dispense
  5. Pharmacist can manage inventory (inline stock edit, low-stock items surfaced first, add-medicine form) and browse dispensed history with a date-range filter
**Plans**: TBD
**UI hint**: yes

### Phase 4: Mobile Patient App
**Goal**: Patients can authenticate, book appointments, and view their care history from the Expo app
**Mode:** mvp
**Depends on**: Nothing beyond the already-validated Supabase foundation (independent of Phases 2-3)
**Requirements**: AUTH-04, MOB-01, MOB-02, MOB-03, MOB-04, MOB-05
**Success Criteria** (what must be TRUE):
  1. Patient can sign in via phone OTP, with a patient row auto-created on first sign-in
  2. Patient sees a home screen with an upcoming-appointment card and quick actions
  3. Patient can book an appointment (department -> doctor -> free slot -> confirm) and receive a QR code of the appointment id
  4. Patient sees their appointments (upcoming first) with status badges and per-appointment QR, and views visit reports grouped by date (diagnosis, test results with file viewer, prescriptions)
  5. Patient can view and edit profile details, including ABHA ID
**Plans**: TBD
**UI hint**: yes

### Phase 5: AI Services
**Goal**: The FastAPI service exposes typed mock AI endpoints and is ready to deploy as a container
**Mode:** mvp
**Depends on**: Nothing beyond the already-validated Supabase foundation (independent of Phases 2-4)
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. POST /api/triage accepts {symptoms, patient_age, patient_gender} and returns a typed {suggested_department, urgency, reasoning}
  2. POST /api/drug-check accepts {current_medicines[], new_medicine} and returns a typed {safe, interactions[]}
  3. POST /api/scribe accepts {audio_url} and returns a typed SOAP-structured note
  4. Service exposes /health and CORS, and builds into a production Docker image (python 3.12-slim, uvicorn)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Staff Auth & Shared Shell | 0/5 | Not started | - |
| 2. Reception & Doctor Flow | 0/8 | Planned | - |
| 3. Diagnostics & Pharmacy Flow | 0/TBD | Not started | - |
| 4. Mobile Patient App | 0/TBD | Not started | - |
| 5. AI Services | 0/TBD | Not started | - |
