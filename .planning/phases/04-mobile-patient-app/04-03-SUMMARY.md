---
phase: 04-mobile-patient-app
plan: 03
subsystem: mobile
tags: [expo, react-native, supabase, rls, storage, signed-url, vitest]

requires:
  - phase: 04-mobile-patient-app (plan 01)
    provides: Expo scaffold, supabase client, session context, ui.tsx primitives, QRView, AppointmentCard, status.ts
  - phase: 04-mobile-patient-app (plan 02)
    provides: Home tab + booking wizard patterns (fetcher-cast, focus-refetch, Alert-based toasts)
provides:
  - Appointments tab: upcoming-first list with status badges, tap -> per-appointment QR detail modal
  - Reports tab: visits grouped by IST date, orders with signed-URL result-file viewer, prescriptions with medicine names
  - resolveResultUrl pure resolver (mirrors apps/web/src/lib/results.ts), unit-tested
affects: [mobile-patient-app-plan-04, any future phase touching patient-facing RLS on staff/medicines]

tech-stack:
  added: []
  patterns:
    - "Pure dependency-injected resolver module (reportUrl.ts) kept free of RN/supabase imports so it runs under vitest in node — same shape as lib/booking.ts, lib/phone.ts"
    - "Client-side upcoming/past split-then-concat for ordering a single fetched+sorted list, since PostgREST can't express 'asc then desc' in one order clause"
    - "RN Modal (transparent, slide-up sheet) for per-item detail views, reusing QRView"

key-files:
  created:
    - apps/mobile/components/AppointmentDetailModal.tsx
    - apps/mobile/lib/reportUrl.ts
    - apps/mobile/lib/reportUrl.test.ts
    - apps/mobile/components/ReportVisitGroup.tsx
    - supabase/migrations/20260713_patient_staff_doctor_select.sql (proposed, NOT applied)
  modified:
    - apps/mobile/app/(tabs)/appointments.tsx
    - apps/mobile/app/(tabs)/reports.tsx

key-decisions:
  - "Cast the 3-level-deep nested visits query (visits -> orders/prescriptions -> medicine) through `as unknown as VisitWithDetails[]` — PostgREST's TS overload resolution collapses this deeper embed to a literal GenericStringError shape that TS refuses to cast directly (a stricter version of the fetcher-cast quirk already documented for 1-2-level embeds elsewhere in the repo)"
  - "Kept order/prescription status badge maps local to ReportVisitGroup.tsx rather than extending lib/status.ts, to stay within this plan's files_modified scope"
  - "Found (live REST, dev patient token) that patient sessions cannot read `staff` or `medicines` — both return null/empty via RLS with no error, so doctor names and medicine names silently fall back to generic labels app-wide; wrote (but did NOT apply) a migration proposing least-privilege patient SELECT grants, logged as a STATE.md blocker rather than self-applying an auth/RLS boundary change without service-role credentials"

patterns-established:
  - "Detail-modal pattern: project a fetched row into a minimal `*Detail` prop type (AppointmentDetail) at the call site, keeping the modal component decoupled from the screen's raw fetch shape"
  - "Per-item async loading state via a single `openingId` (or similar) state slot, scoped to one in-flight action at a time, for list rows that each trigger their own async resolve+open"

requirements-completed: [MOB-03, MOB-04]

duration: 16min
completed: 2026-07-13
---

# Phase 04 Plan 03: Appointments + Reports tabs Summary

**Appointments tab (upcoming-first list + per-appointment QR modal) and Reports tab (visits-by-date with signed-URL result viewer + prescriptions), both RLS-scoped reads; live REST validation surfaced a pre-existing patient-RLS gap on `staff`/`medicines` that silently degrades doctor/medicine name display app-wide.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-07-13T23:16 IST (after 04-02 metadata commit)
- **Completed:** 2026-07-13T23:31 IST
- **Tasks:** 3 (Task 2 was TDD: RED + GREEN)
- **Files modified:** 6 mobile files + 1 proposed (unapplied) migration + 1 deferred-items log

## Accomplishments

- Appointments tab lists the patient's own appointments, split client-side into upcoming (`slot_time >= now`, ascending) then past (descending), rendered via the shared `AppointmentCard` with status badges; tapping a card opens `AppointmentDetailModal` — a slide-up RN `Modal` showing doctor/department/time/status plus a per-appointment `QRView` for check-in (MOB-03).
- `reportUrl.ts` — a pure, dependency-injected resolver (`isHttpUrl`, `resolveResultUrl`) mirroring `apps/web/src/lib/results.ts`'s http-passthrough-or-sign rule, built RED (failing test against a nonexistent module) -> GREEN (implementation), fully unit-tested (7 vitest cases: passthrough w/ signer-not-called, storage-path w/ signer-called, null input, signer-returns-null, signer-throws).
- Reports tab fetches the nested `visits -> orders + prescriptions(medicine)` embed (RLS-scoped, T-04-08), groups visits by IST calendar date, and renders each via `ReportVisitGroup`: diagnosis/notes/chief_complaint, per-order type/status/instructions with an "Open result" control that signs a Storage path via `storage.createSignedUrl(path, 3600)` (T-04-09) and opens only `http(s)` URLs via `Linking.openURL` (T-04-10), and per-prescription medicine name/dosage/duration/quantity/status badge (MOB-04).
- Live REST-verified (dev patient token, direct against the cloud project) both the appointments doctor-embed shape and the nested visits/orders/prescriptions shape under RLS — confirmed row counts and confirmed the visits/orders nesting returns real data (2 visits, one with an in-progress MRI order).

## Task Commits

Each task was committed atomically:

1. **Task 1: Appointments tab — upcoming-first list + QR detail modal (MOB-03)** - `c5c4345` (feat)
2. **Task 2: Result-file URL resolver (TDD)** - `7693bc1` (test, RED) -> `7960217` (feat, GREEN)
3. **Task 3: Reports tab — visits grouped by date + file viewer + prescriptions (MOB-04)** - `f571cb3` (feat)

**Deviation commits (Rule 4 — proposed, not self-applied):**
- `a4e68c8` (fix) — proposed `staff` patient-read RLS policy scoped to doctors
- `5be5568` (fix) — extended the proposal with `medicines` patient-read RLS policy + logged both findings to deferred-items.md

**Plan metadata:** (this commit, following SUMMARY)

_Note: Task 2 was `tdd="true"` — RED then GREEN, no REFACTOR needed (implementation was already minimal)._

## Files Created/Modified

- `apps/mobile/app/(tabs)/appointments.tsx` - Own appointments, upcoming-first (client-side split + concat), status badges, tap -> detail modal
- `apps/mobile/components/AppointmentDetailModal.tsx` - Slide-up modal: doctor/dept/time/status + per-appointment QRView
- `apps/mobile/lib/reportUrl.ts` - Pure `isHttpUrl` / `resolveResultUrl` resolver, dependency-injected signer
- `apps/mobile/lib/reportUrl.test.ts` - 7 vitest cases covering the full behavior contract
- `apps/mobile/app/(tabs)/reports.tsx` - Nested visits fetch, grouped by IST date
- `apps/mobile/components/ReportVisitGroup.tsx` - Per-visit diagnosis/notes, orders with signed-URL "Open result", prescriptions with medicine name + status badge
- `supabase/migrations/20260713_patient_staff_doctor_select.sql` - Proposed (NOT applied) patient-read grants on `staff` (role='doctor') and `medicines`
- `.planning/phases/04-mobile-patient-app/deferred-items.md` - Logged both RLS findings with root cause, live-verification evidence, and impact scoping

## Decisions Made

- Cast the reports nested-embed result through `as unknown as VisitWithDetails[]` rather than a direct `as VisitWithDetails[]` — the plan's 3-level-deep select string (visits -> orders/prescriptions -> medicine) collapses PostgREST's TS inference to a literal `GenericStringError` shape that TS's "sufficiently overlapping" check rejects for a direct cast; routing through `unknown` first is the standard escape hatch, consistent with (but one level deeper than) the fetcher-cast pattern already used in `index.tsx`/`BookingWizard.tsx`.
- Kept `ORDER_STATUS_BADGE`/`PRESCRIPTION_STATUS_BADGE` maps local to `ReportVisitGroup.tsx` (not added to `lib/status.ts`) to stay strictly within this plan's `files_modified` list; color semantics mirror `apps/web/src/lib/status.ts` exactly per D-55.
- Did not apply the proposed `staff`/`medicines` RLS migration myself — it's a security-boundary change in healthcare code (Standing Order Section 3 critical point) requiring service-role/dashboard access this sandboxed executor doesn't hold and shouldn't seek out; written as a reviewable SQL file and logged as a blocker instead (Rule 4 posture).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deep-nested PostgREST embed cast needed `unknown` intermediary**
- **Found during:** Task 3 (Reports tab), `tsc --noEmit`
- **Issue:** `data as VisitWithDetails[]` failed to compile (`TS2352`) — the 3-level nested select collapses to a `GenericStringError[]` type that doesn't "sufficiently overlap" with the real row type.
- **Fix:** `data as unknown as VisitWithDetails[] | null`.
- **Files modified:** `apps/mobile/app/(tabs)/reports.tsx`
- **Verification:** `pnpm --filter @light/mobile exec tsc --noEmit` exits 0.
- **Committed in:** `f571cb3` (Task 3 commit)

### Flagged, Not Auto-fixed (Rule 4 — proposed migration, blocker logged)

**2. [Rule 4 - Architectural/infra] Patient sessions cannot read `staff` or `medicines` via RLS**
- **Found during:** Task 1 + Task 3, live REST validation against the real project with the seeded dev patient token.
- **Issue:** `staff_staff_select` (`20260710_fix_rls_helper_recursion.sql`) only grants SELECT when `current_staff_role() is not null` — never true for a patient session — so every `doctor:staff(name)` embed used by Home (04-02), Booking (04-02), and Appointments (04-03) silently returns `null`. Same shape confirmed for `medicines` (`GET /rest/v1/medicines` -> `200 []` for the patient token, vs. real rows for `departments`), affecting the Reports tab's prescription medicine names (MOB-04).
- **Why not auto-fixed:** Requires a live RLS policy change on the cloud project (service-role/dashboard access not available in this sandbox, and searching for that credential is explicitly out of bounds) and touches an auth/authorization boundary in healthcare code — a Standing Order Section 3 critical point that gets escalated, not silently patched.
- **Proposed fix:** `supabase/migrations/20260713_patient_staff_doctor_select.sql` (committed, **not applied**) — `staff` SELECT scoped to `role = 'doctor'` for patient sessions (least privilege — reception/lab_tech/pharmacist/admin names stay hidden), and `medicines` SELECT for any signed-in patient (drug names carry no more sensitivity than the already-public `departments`).
- **Files modified:** `supabase/migrations/20260713_patient_staff_doctor_select.sql` (new, proposed), `.planning/phases/04-mobile-patient-app/deferred-items.md`
- **Committed in:** `a4e68c8`, `5be5568`
- **Impact:** Both MOB-03 and MOB-04 are functionally complete per their `<must_haves>` — lists, ordering, status badges, the QR modal, date grouping, and the signed-URL result viewer all render and behave correctly. Only the doctor-name and medicine-name *labels* fall back to a generic string ("Doctor" / "Medicine") until this migration is reviewed and applied. No mobile code change is needed once the policy lands — the existing embeds will start resolving names automatically.

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking), 1 flagged-not-applied (Rule 4, infra/security — logged as blocker with a ready-to-review migration).
**Impact on plan:** No scope creep — the Rule 3 fix was a one-line cast required for the plan's own specified query to compile; the Rule 4 finding is a cross-cutting pre-existing gap (also affecting already-shipped 04-02 work) surfaced by this plan's live verification, documented and proposed rather than silently patched or silently ignored.

## Issues Encountered

- The interactive shell's `grep` wrapper (ugrep-based, `command grep` bypasses it) gave an inconsistent exit code for `grep -vq "react-native" lib/reportUrl.ts` during ad-hoc verification (a shell-environment artifact, not a real acceptance-criteria failure) — confirmed via `command grep` that the real grep passes cleanly. No code or file change was needed.

## User Setup Required

None for the mobile app itself. **Action needed from a human with Supabase project access:** review and apply `supabase/migrations/20260713_patient_staff_doctor_select.sql` to the cloud project (`rylceydkrydmpysmibba`) via the Supabase dashboard SQL editor or CLI, then re-verify a patient token sees non-null doctor/medicine names. See `.planning/phases/04-mobile-patient-app/deferred-items.md` items 2-3 for full root cause and verification evidence.

## Next Phase Readiness

- Plan 04-04 (Profile tab, MOB-05) can proceed independently — no dependency on this plan's files.
- Once the proposed migration is applied, no mobile code changes are needed for doctor/medicine names to start rendering correctly across Home, Booking, Appointments, and Reports.
- Booking/appointments/reports e2e on a real device remain human-verify items (no simulator in this environment), consistent with 04-01/04-02.

---
*Phase: 04-mobile-patient-app*
*Completed: 2026-07-13*

## Self-Check: PASSED

All 9 referenced files found on disk; all 6 referenced commit hashes found in `git log --oneline --all`.
