# Requirements — Light Healthcare HMS v1

Source: HMS build brief (2026-07-09). Auto-scoped: every feature in the brief is v1.

## v1 Requirements

### Authentication & Access

- [x] **AUTH-01**: Staff can log in with email/password on a centered card UI; errors surface as toasts; no signup path
- [x] **AUTH-02**: Authenticated staff land on their role home (/reception, /doctor, /diagnostics, /pharmacy, /admin) and cannot open another role's portal
- [x] **AUTH-03**: Staff can log out from the header on any portal page
- [ ] **AUTH-04**: Patients can sign in on mobile via phone OTP; a patient row is auto-created on first sign-in

### Shared Shell

- [x] **SHELL-01**: All portal pages render inside a DashboardLayout: collapsible sidebar (hamburger on mobile), role-specific nav + accent color (reception blue, doctor purple, diagnostics amber, pharmacy green, admin gray), header with portal name, staff name from DB, logout
- [x] **SHELL-02**: Every page shows a skeleton while loading, an error state on failure, and an empty state when no rows

### Reception

- [x] **RECEP-01**: Reception sees today's appointment queue live (Realtime) ordered by slot time, with patient name, doctor, IST slot time, color-coded status badge
- [x] **RECEP-02**: Reception can check in a booked appointment and mark past-slot booked rows no-show
- [x] **RECEP-03**: Reception can filter the queue by status tabs and search by patient name/phone; stats cards show today totals (total, checked-in, waiting, completed)
- [x] **RECEP-04**: Reception can search patients by name/phone/ABHA and open a patient's info + appointment/visit history
- [x] **RECEP-05**: Reception can register a new patient (name, dob, phone, email, address, ABHA) with zod validation
- [x] **RECEP-06**: Reception sees today's completed visits needing billing and can record a payment (amount, method) with pending/paid badges

### Doctor

- [x] **DOC-01**: Doctor sees their checked-in/in-consultation patients for today live (Realtime) with age, slot time, status, chief complaint
- [x] **DOC-02**: Doctor can open a consultation view with patient header and history tabs (past visits, past orders with result links, past prescriptions)
- [x] **DOC-03**: Doctor can start a consultation (checked_in → in_consultation), record complaint/diagnosis/notes, and complete the visit (saves visit, appointment → completed) with optimistic updates
- [x] **DOC-04**: Doctor can add test orders (lab/ct/mri/xray + instructions) and prescriptions (searchable medicine, dosage, duration, quantity), removable before save
- [x] **DOC-05**: Doctor can browse all patients they have seen and open full cross-visit history

### Diagnostics

- [x] **DIAG-01**: Lab tech sees ordered tests live (Realtime) with patient, type icon, doctor, instructions, and can accept them (→ in_progress)
- [x] **DIAG-02**: Lab tech can upload a result file to the scan-results Storage bucket, add result notes, and mark the order completed (sets completed_at)
- [x] **DIAG-03**: Lab tech can browse completed orders with date-range and type filters and open result files

### Pharmacy

- [x] **PHARM-01**: Pharmacist sees pending prescriptions live (Realtime) with patient, medicine, dosage, duration, quantity, doctor, and current stock with low-stock warning
- [x] **PHARM-02**: Pharmacist dispenses via the atomic dispense_medicine RPC (stock decrement + status flip in one transaction; insufficient stock surfaces as error toast)
- [x] **PHARM-03**: Pharmacist can manage inventory: full list with stock/unit/price/threshold, inline stock edit, low-stock items surfaced first, add-medicine form
- [x] **PHARM-04**: Pharmacist can browse dispensed history with date-range filter

### Mobile (Patient App)

- [x] **MOB-01**: Patient sees home screen with upcoming appointment card and quick actions
- [x] **MOB-02**: Patient can book: department → doctor (with specialization) → free slot → confirm (creates appointment, marks slot booked) → QR code of appointment id
- [ ] **MOB-03**: Patient sees their appointments (upcoming first) with status badges and per-appointment QR for check-in
- [ ] **MOB-04**: Patient sees visit reports grouped by visit date: diagnosis, test results with file viewer, prescriptions
- [ ] **MOB-05**: Patient can view and edit profile details incl. ABHA ID

### AI Services

- [ ] **AI-01**: POST /api/triage accepts {symptoms, patient_age, patient_gender} and returns typed {suggested_department, urgency, reasoning} (mock)
- [ ] **AI-02**: POST /api/drug-check accepts {current_medicines[], new_medicine} and returns typed {safe, interactions[]} (mock)
- [ ] **AI-03**: POST /api/scribe accepts {audio_url} and returns typed SOAP-structured note (mock)
- [ ] **AI-04**: Service ships with CORS, /health, production Dockerfile (python 3.12-slim, uvicorn)

## v2 Requirements

- **V2-01**: Razorpay checkout for patient payments (columns already present)
- **V2-02**: Insurance claim submission/tracking UI
- **V2-03**: Audit-log viewer for admin
- **V2-04**: Real model calls behind ai-services endpoints

## Out of Scope

- ABDM/ABHA API integration — text field only; certification effort not justified for v1
- Staff self-signup — accounts admin-created only; reduces attack surface
- Offline mode for tablets — Realtime-first design; revisit if connectivity complaints

## Traceability

<!-- Filled by roadmap. Maps REQ-IDs to phases. -->

| REQ-ID | Phase |
|--------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| SHELL-01 | Phase 1 |
| SHELL-02 | Phase 1 |
| RECEP-01 | Phase 2 |
| RECEP-02 | Phase 2 |
| RECEP-03 | Phase 2 |
| RECEP-04 | Phase 2 |
| RECEP-05 | Phase 2 |
| RECEP-06 | Phase 2 |
| DOC-01 | Phase 2 |
| DOC-02 | Phase 2 |
| DOC-03 | Phase 2 |
| DOC-04 | Phase 2 |
| DOC-05 | Phase 2 |
| DIAG-01 | Phase 3 |
| DIAG-02 | Phase 3 |
| DIAG-03 | Phase 3 |
| PHARM-01 | Phase 3 |
| PHARM-02 | Phase 3 |
| PHARM-03 | Phase 3 |
| PHARM-04 | Phase 3 |
| AUTH-04 | Phase 4 |
| MOB-01 | Phase 4 |
| MOB-02 | Phase 4 |
| MOB-03 | Phase 4 |
| MOB-04 | Phase 4 |
| MOB-05 | Phase 4 |
| AI-01 | Phase 5 |
| AI-02 | Phase 5 |
| AI-03 | Phase 5 |
| AI-04 | Phase 5 |
