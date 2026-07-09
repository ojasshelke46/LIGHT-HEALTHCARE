# Phase 2: Reception & Doctor Flow - Context

**Gathered:** 2026-07-09 (auto mode, single pass)
**Status:** Ready for planning

<domain>
## Phase Boundary

Reception runs the live queue (check-in/no-show/search/stats), patient registry, and billing. Doctors see today's checked-in patients live, run consultations (history tabs, complaint/diagnosis/notes), order tests, prescribe medicines, complete visits. Requirements RECEP-01..06, DOC-01..05. No diagnostics/pharmacy UI (Phase 3), no mobile (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Realtime strategy (D-15)
- **D-15:** One shared hook `useRealtimeList` in `apps/web/src/lib/hooks/use-realtime.ts`: takes a fetcher (typed supabase select with joins) + table name(s) to watch. Subscribes `postgres_changes` on the table(s); ANY insert/update/delete → debounced refetch (300ms). Refetch-on-change (not patch-in-place) because rows need joined data (patient/doctor names) that events don't carry.
- **D-16:** Reconnection handling MANDATORY: on `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` status → remove channel, resubscribe with exponential backoff (1s, 2s, 4s… cap 30s); refetch on resubscribe and on `visibilitychange` back to visible. Hook returns `{ data, loading, error, refetch, connected }`.

### Visit lifecycle (D-17) — resolves brief-vs-schema conflict
- **D-17:** `orders.visit_id`/`prescriptions.visit_id` are NOT NULL → the visit row must exist before adds. Flow: **Start Consultation** = update appointment → `in_consultation` AND insert `visits` row (appointment_id, patient_id, doctor_id). "Add Order"/"Add Prescription" then insert immediately with the real visit_id ("removable before save" = delete the row). **Complete Visit** = update visits row (complaint/diagnosis/notes, completed_at) + appointment → `completed`.
- **D-18:** If a visit row already exists for the appointment (e.g. reopened after refresh), reuse it — query by appointment_id before inserting.

### Reception queue (D-19)
- **D-19:** `/reception` client page: `useRealtimeList` on `appointments` filtered to today (IST day bounds computed client-side, passed as gte/lt on slot_time) with joins `patients(name, phone)` and `doctors(id, staff(name))`. Order slot_time ASC.
- **D-20:** Status tabs (All | Booked | Checked In | In Consultation | Completed) + search (name/phone) filter CLIENT-SIDE on the fetched today-set (small n). Stats cards computed from same array: total, checked-in, waiting (= checked_in), completed.
- **D-21:** Check-in button on `booked` rows → status `checked_in`. No-show button only on `booked` rows whose slot_time < now. Both optimistic with rollback + sonner toasts.
- **D-22:** Status badge colors: booked=slate, checked_in=blue, in_consultation=yellow, completed=green, no_show=red, cancelled=slate-outline.

### Patients registry (D-23)
- **D-23:** `/reception/patients`: server-side search via `.or("name.ilike.%q%,phone.ilike.%q%,abha_id.ilike.%q%")` debounced 300ms; list capped 50. Register form (Sheet) zod-validated: name+phone required, dob/email/address/abha optional; phone `^[0-9]{10}$` (Indian 10-digit), unique-violation → friendly toast.
- **D-24:** Patient detail `/reception/patients/[id]` (server component): info card + appointment history + visit history (diagnosis, date). Read-only in v1.

### Billing (D-25)
- **D-25:** `/reception/billing`: today's completed visits LEFT JOIN payments — rows with no payment = "needs billing". Create-payment form (Sheet): amount (positive number, zod), method select (cash | card | upi), status recorded as `paid` (reception collects at counter). Existing payments listed with pending/paid badge. Services rendered = visit diagnosis + orders count (informational).

### Doctor today (D-26)
- **D-26:** `/doctor` client page: `useRealtimeList` on appointments filtered doctor_id = own staff id (doctors.id === staff.id) + today + status in (checked_in, in_consultation). Cards show patient name, age (from dob, years), IST slot time, status badge, chief complaint if visit row exists. Click → `/doctor/consult/[appointmentId]`.

### Consultation page (D-27)
- **D-27:** Full page (not Sheet) — tablet-friendly: `/doctor/consult/[appointmentId]`. Header: patient name/age/phone/ABHA. History tabs (existing Tabs primitive): Past Visits, Past Orders (result links open result_url), Past Prescriptions (medicine names joined).
- **D-28:** Consultation form: chief complaint (input), diagnosis (input), notes (textarea). Autosaved to local state; persisted on Complete Visit. Orders section: type select (lab/ct/mri/xray) + instructions textarea + Add button; list added-this-visit with remove (deletes row). Prescriptions: medicine combobox (client-side filter of medicines list), dosage/duration/quantity inputs, Add + removable list. Quantity positive int zod.
- **D-29:** Buttons: "Start Consultation" visible when checked_in; "Complete Visit" visible when in_consultation — validates diagnosis non-empty; success → toast + redirect /doctor.

### Doctor all-patients (D-30)
- **D-30:** `/doctor/patients`: distinct patients from this doctor's visits, searchable client-side; click → `/doctor/patients/[id]` full cross-visit history (visits + orders + prescriptions grouped by visit).

### Navigation
- **D-31:** Update ROLE_THEME nav: reception = Queue(/reception), Patients(/reception/patients), Billing(/reception/billing); doctor = Today's Patients(/doctor), All Patients(/doctor/patients). Icons lucide (ListChecks, Users, Receipt, CalendarClock, Stethoscope etc. — executor discretion).

### Claude's Discretion
Empty-state copy, card layouts, skeleton shapes, exact debounce values, age calc edge cases.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Established Phase-1 foundation (REUSE, do not rebuild)
- `apps/web/src/components/dashboard-layout.tsx` — shell + D-13 async-state conventions in header comment
- `apps/web/src/components/ui/` — 11 primitives (button, card, input, label, badge, skeleton, sheet, tabs, textarea, select, table)
- `apps/web/src/components/{empty-state,portal-loading,portal-error}.tsx` — async-state trio
- `apps/web/src/lib/theme.ts` — ROLE_THEME (nav arrays live here)
- `apps/web/src/lib/format.ts` — formatIST (all displayed timestamps)
- `apps/web/src/lib/staff.ts` — getStaff() server helper
- `apps/web/src/lib/supabase/{client,server}.ts` — typed client factories

### Types & schema
- `packages/shared-types/src/database.types.ts` — Database types; appointments/visits/orders/prescriptions/payments/medicines/patients tables
- `.planning/phases/01-staff-auth-shared-shell/01-VERIFICATION.md` — what Phase 1 guarantees

### Project docs
- `.planning/REQUIREMENTS.md` — RECEP-01..06, DOC-01..05
- `.planning/PROJECT.md` — constraints (typed queries, zod, sonner, IST, a11y, tablet)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All UI primitives + async-state components from Phase 1
- e2e scaffold (playwright.config.ts) — extend with reception/doctor specs
- Seeded logins: doctor@test.com / reception@test.com (Test1234!), staff rows exist; 3 departments, 1 doctor row

### Established Patterns
- Client pages: "use client" + typed createClient(); server pages: await createClient()
- Optimistic updates with rollback + sonner (login page pattern)
- PostgREST null-guard cast pattern (staff.ts / middleware.ts)

### Integration Points
- RLS policies exist on all tables — staff role policies must allow reception/doctor reads+writes used here; if an RLS denial surfaces during execution, STOP and report (don't silently work around)
- Realtime requires tables in `supabase_realtime` publication — executor must verify `alter publication supabase_realtime add table appointments, prescriptions, orders;` (idempotent check first) or flag it

</code_context>

<specifics>
## Specific Ideas

Brief mandates: instant queue updates without refresh, color-coded badges per exact mapping, stock-style stats cards on queue, optimistic UI w/ rollback in consultation, searchable medicine dropdown.

</specifics>

<deferred>
## Deferred Ideas

- QR check-in scanning at reception (depends on Phase 4 mobile QR) — Phase 4+
- Payment receipt printing — backlog

</deferred>

---

*Phase: 2-Reception & Doctor Flow*
*Context gathered: 2026-07-09*
