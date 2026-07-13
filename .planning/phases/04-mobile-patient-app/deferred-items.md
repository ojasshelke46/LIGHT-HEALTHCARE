# Deferred Items — Phase 04

Out-of-scope discoveries logged during execution (not fixed — see scope boundary rule).

## 1. `pnpm --filter @light/web typecheck` fails (pre-existing, predates Phase 4)

- **Found during:** 04-01 Task 3 gate re-verification.
- **Error:** `TS2786: 'Button' cannot be used as a JSX component` in `apps/web/src/app/reception/queue-row.tsx`,
  `apps/web/src/components/dashboard-layout.tsx`, `apps/web/src/components/portal-error.tsx`,
  `apps/web/src/components/sign-out-button.tsx` — `packages/ui`'s `forwardRef`-based `Button` is
  incompatible with `@types/react@19.2.17`'s stricter `ReactNode` type.
- **Root cause investigation:** `@types/react@19.2.17` has been present in `pnpm-lock.yaml` since the
  very first commit in the repo (`2322691 chore: commit existing monorepo scaffold baseline`),
  confirmed by walking `git log --oneline -- pnpm-lock.yaml` and grepping every commit's lockfile —
  the version never changed. This predates the `04-mobile-patient-app` phase plan (`fb9cd57`) and
  every mobile task. It is unrelated to any file touched by 04-01 (`apps/mobile/**` only).
- **Why not fixed:** CLAUDE.md / execution instructions for this session explicitly say "Do not
  modify apps/web source," and the fix belongs in `packages/ui` (shared web UI kit), which is out of
  scope for a mobile-app plan. Scope-boundary rule: only auto-fix issues directly caused by the
  current task's changes.
- **Suggested fix (future plan):** Either pin `@types/react`/`@types/react-dom` to a version where
  `forwardRef` + `ReactNode` compose cleanly, or update `packages/ui`'s `Button` to the React 19
  `ref`-as-prop pattern (drop `forwardRef`). Needs its own plan/task against `packages/ui` +
  `apps/web`.
- **Impact on 04-01:** None — the plan's own `<verification>` block only requires
  `pnpm --filter @light/mobile exec tsc --noEmit`, `pnpm --filter @light/mobile run export`, and
  `pnpm --filter @light/mobile test`, all of which pass. `apps/web` typecheck is unaffected by (and
  unrelated to) this plan's changes.

## 2. Patient sessions cannot read `staff` — doctor names render as fallback across all patient screens

- **Found during:** 04-03 Task 1, live REST validation of the appointments doctor-embed against the
  real project with the seeded dev patient token.
- **Symptom:** `doctors!...(staff:staff!doctors_id_fkey(name))` returns `"staff": null` for every row,
  for every patient-facing screen that embeds it — Home tab's next-appointment card (MOB-01, 04-02),
  the Booking wizard's doctor list (MOB-02, 04-02), and the Appointments tab's list + detail modal
  (MOB-03, 04-03). All three already have a `?? "Doctor"` fallback, so nothing crashes or errors —
  the UI just never shows the real doctor name to a patient.
- **Root cause:** `staff_staff_select` (`supabase/migrations/20260710_fix_rls_helper_recursion.sql`)
  only grants `staff` SELECT when `current_staff_role() is not null`. A patient session has no row in
  `staff`, so `current_staff_role()` evaluates to null and RLS silently returns zero rows for the
  embed (no error — PostgREST just nulls the relationship) for every patient request, with no
  exception.
- **Why not fixed in this plan:** The fix is a new RLS policy (an auth/authorization-boundary change
  in healthcare code — a Standing-Order Section 3 critical point) applied to the live Supabase
  project, which needs service-role/dashboard access this sandboxed executor does not hold and is not
  permitted to search for. It also touches no file in this plan's `files_modified` list
  (`apps/mobile/**` only) or in 04-02's. Per Rule 4 (architectural/infra change), this is proposed,
  not self-applied.
- **Proposed fix:** `supabase/migrations/20260713_patient_staff_doctor_select.sql` (committed,
  **not yet applied** to the cloud project) — grants patients least-privilege SELECT on `staff` rows
  scoped to `role = 'doctor'` only (reception/lab_tech/pharmacist/admin staff names stay hidden from
  the patient app).
- **Impact on 04-03:** MOB-03 (Appointments) is functionally complete per its `<must_haves>`
  (upcoming-first list, status badges, tap -> QR detail modal all render correctly); only the
  doctor-name label falls back to "Doctor" until the migration above is reviewed and applied.
  Flagged as a STATE.md blocker.

## 3. Same root cause, second table: patient sessions cannot read `medicines`

- **Found during:** 04-03 Task 3, live REST validation (`GET /rest/v1/medicines` as the patient token
  returns `200 []` — same silent-empty-result shape as the `staff` finding above, contrasted against
  `departments`, which returns real rows for the same token).
- **Symptom:** the Reports tab's `prescriptions(...,medicine:medicines(name))` embed (MOB-04) will
  never resolve a medicine name for a patient — `ReportVisitGroup`'s `rx.medicine?.name ?? "Medicine"`
  fallback again masks this instead of erroring. Untestable end-to-end with the seeded dev patient
  (Aarav Sharma, `a0..01`) because none of their visits have prescription rows in the current seed
  data — orders/visits nesting itself was confirmed live (2 visits returned, one with a real MRI
  order), only the medicines lookup is confirmed empty independently.
- **Proposed fix:** added to the same `supabase/migrations/20260713_patient_staff_doctor_select.sql`
  (committed, **not yet applied**) — grants any signed-in patient SELECT on `medicines` (drug names
  carry no more sensitivity than department/doctor names, already publicly selectable, so this mirrors
  `departments_public_select` rather than restricting further).
- **Impact on 04-03:** MOB-04 is functionally complete per its `<must_haves>` for diagnosis/notes and
  the result-file viewer (both live-verified); only the medicine-name label on a prescription (if the
  patient has one) falls back to "Medicine" until the migration is applied. Flagged as a STATE.md
  blocker alongside item 2.
