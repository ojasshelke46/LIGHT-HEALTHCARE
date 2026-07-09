---
phase: 02-reception-doctor-flow
plan: 06
subsystem: ui
tags: [supabase, doctor, consultation, visits, appointments, playwright]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: getStaff()/formatIST/ageFromDob/APPOINTMENT_STATUS_BADGE helpers, dev seed"
  - phase: 02-reception-doctor-flow
    provides: "02-05: /doctor today list + PatientCard linking to /doctor/consult/[appointmentId]"
provides:
  - "/doctor/consult/[appointmentId]: patient header + Past Visits/Orders/Prescriptions history tabs (DOC-02)"
  - "Start Consultation (checked_in -> in_consultation + visit create/reuse) and Complete Visit (diagnosis-guarded, visit persist + appointment -> completed) lifecycle, optimistic, race-safe (DOC-03, D-17/D-18/D-29)"
  - "ConsultClientProps / Medicine types exported from consult-client.tsx for Plan 07 (orders + prescriptions) to extend the same file"
affects: [02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "visitCreationRef: a useRef-memoized in-flight/settled insert Promise to dedupe concurrent async callers racing a single-insert-per-entity guard (state alone is not enough when two async handlers can both observe the pre-update value before either commits)"
    - "Server page casts a nested-relation .select() to an explicit exported client-component prop type (ConsultPatient/ExistingVisit/PastVisit/PastOrder/PastPrescription/Medicine), continuing the staff.ts/doctor-today.tsx PostgREST TS-inference workaround"
    - "IDOR defense-in-depth: explicit `doctor_id === staff.id` check after an RLS-scoped read, in addition to (not instead of) relying on RLS"

key-files:
  created:
    - "apps/web/src/app/doctor/consult/[appointmentId]/page.tsx"
    - "apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx"
    - apps/web/e2e/doctor-consult.spec.ts
  modified: []

key-decisions:
  - "Split Task 2 (server page) and Task 3 (client) into two commits as the plan specifies, even though page.tsx's typecheck depends on consult-client.tsx existing -- wrote both files' final content up front, then staged/committed page.tsx alone (Task 2) before consult-client.tsx (Task 3), since HEAD always builds even though an isolated historical checkout of the Task-2 commit would not"
  - "Found and fixed a real race condition via live testing (not just code review): Start's optimistic status flip makes the Complete button appear before Start's own visit-insert network call resolves, so a fast click-through (or the e2e spec) could hit ensureVisit() from both handlers while `visitId` state was still null in both closures, producing two visits rows for one appointment. Fixed with a ref-memoized in-flight-insert promise so concurrent callers await the same insert instead of each starting their own -- confirmed via a scratch (uncommitted) Playwright spec + direct REST query that a repeat of the exact race now yields exactly one visits row"
  - "Reception-queue.spec.ts's 2 pre-existing failures (seed rows c0..01/c0..02 already mutated away from `booked` by earlier non-idempotent runs) are logged to deferred-items.md rather than fixed -- out of this plan's file scope"

requirements-completed: [DOC-02, DOC-03]

# Metrics
duration: ~20min
completed: 2026-07-10
---

# Phase 2 Plan 6: Doctor Consultation View + Visit Lifecycle Summary

**`/doctor/consult/[appointmentId]` (patient header, 3 history tabs, complaint/diagnosis/notes form) plus a race-safe Start/Complete visit lifecycle (D-17/D-18/D-29) proven end-to-end against live seeded data, including a real concurrent-insert bug found and fixed during verification.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-10T01:25:52+05:30 (first task commit)
- **Completed:** 2026-07-10T01:37:31+05:30
- **Tasks:** 3 (Task 1 RED -> Task 2 -> Task 3 GREEN, plus one post-verification fix commit)
- **Files modified:** 3 (3 created, 0 modified — the fix commit further edits a file created in this same plan)

## Accomplishments
- `doctor-consult.spec.ts`: e2e locking in `patient-card-<id>` -> `/doctor/consult/<id>` navigation, `start-consultation-btn`/`complete-visit-btn`/`consult-diagnosis` testids, the full start -> diagnosis -> complete -> redirect flow against seeded checked_in appointment `c0..03` (Aarav Sharma), and a diagnosis-required negative case against seeded in_consultation appointment `c0..04` (Diya Patel); the positive test is idempotent-tolerant (degrades to asserting the completed state if a prior run already completed `c0..03`)
- `page.tsx`: server component loading appointment+patient (`patients` join), the existing visit for this appointment via `.eq("appointment_id", ...).maybeSingle()` (D-18 reuse), the patient's past visits/orders/prescriptions, and the medicines list (for Plan 07's combobox) — all in parallel via `Promise.all`, fully typed with no `any`; adds an explicit `doctor_id === staff.id` check as IDOR defense-in-depth beyond RLS (T-02-16)
- `consult-client.tsx`: patient header (name/age/phone/ABHA/slot/status badge), `Tabs`-based history (Past Visits / Past Orders with `result_url` "View result" links / Past Prescriptions), the complaint/diagnosis/notes form, Start Consultation (optimistic `checked_in` -> `in_consultation`, creates-or-reuses the visit row), Complete Visit (diagnosis-required guard, persists visit fields + `completed_at`, appointment -> `completed`, toast + redirect to `/doctor`), and a `{/* orders + prescriptions: Plan 07 */}` mount point with `ConsultClientProps`/`Medicine` exported for that plan
- **Race condition found and fixed during verification**: Start's optimistic status flip renders the Complete button before Start's own visit-insert resolves; a fast click-through raced two `ensureVisit()` calls (from `handleStart` and `handleComplete`) both reading a stale `visitId === null`, each inserting its own visits row for the same appointment — violating D-17/D-18. Reproduced live (two visits rows found for `c0..03` after the first green e2e run), fixed with a `useRef`-memoized in-flight-insert promise so concurrent callers await the same insert, and re-verified via a scratch Playwright spec + direct REST query that the exact race now produces exactly one visits row (target `c0..01`)
- `pnpm --filter @light/web typecheck` and `build` both pass; `doctor-consult.spec.ts` (both specs) passes consistently across repeated runs, including the idempotent-tolerant degrade path

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing complete-visit e2e (RED)** - `ceed547` (test)
2. **Task 2: Consult server page (DOC-02)** - `cf3803d` (feat)
3. **Task 3: Consult client — header, tabs, Start/Complete lifecycle (DOC-02/DOC-03) → e2e GREEN** - `a9a75e3` (feat)
4. **Post-verification fix: dedupe concurrent visit-creation calls (D-17/D-18)** - `7a40b42` (fix)

**Plan metadata:** pending (docs: complete plan — added after this summary)

## Files Created/Modified
- `apps/web/e2e/doctor-consult.spec.ts` - Start/complete e2e (positive, idempotent-tolerant) + diagnosis-required negative case
- `apps/web/src/app/doctor/consult/[appointmentId]/page.tsx` - Server load: appointment+patient, existing-visit reuse query, full patient history, medicines list; IDOR defense-in-depth
- `apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx` - Header, history tabs, form, Start/Complete lifecycle with race-safe visit creation; exports `ConsultClientProps`/`Medicine` for Plan 07
- `.planning/phases/02-reception-doctor-flow/deferred-items.md` - Logs the pre-existing, out-of-scope `reception-queue.spec.ts` seed-drift failures found during this plan's e2e run

## Decisions Made
See `key-decisions` in frontmatter. Highlights: the page.tsx/consult-client.tsx commit split follows the plan's task boundaries even though only the final HEAD state (not each isolated historical commit) typechecks; the concurrent-insert race was found through live testing rather than code review alone, and the fix was independently re-verified live (not just typechecked) before being trusted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Race-condition bug in `doctor-consult.spec.ts`'s own idempotent-tolerant check**
- **Found during:** Task 3 verification (first e2e run against real page.tsx/consult-client.tsx)
- **Issue:** The spec's degrade-path used an instant (non-waiting) `card.isVisible()` check immediately after `page.goto("/doctor")`, before the today list's async realtime fetch had resolved — so it always read "not visible" and took the wrong branch, then failed asserting `start-consultation-btn` had count 0 on an appointment that was actually still `checked_in`.
- **Fix:** Replaced the instant check with a waiting `await expect(card).toBeVisible({ timeout: 10_000 })` wrapped in try/catch, giving the realtime fetch time to resolve before deciding which branch to take.
- **Files modified:** `apps/web/e2e/doctor-consult.spec.ts`
- **Committed in:** `a9a75e3` (part of Task 3's commit)

**2. [Rule 1 - Bug] Concurrent visit-creation race produced duplicate `visits` rows (D-17/D-18 violation)**
- **Found during:** Post-Task-3 live verification (direct REST query against the real Supabase project after the first green e2e run)
- **Issue:** `ensureVisit()`'s `if (visitId) return visitId` check reads React state, which is stale in any closure created before `setVisitId` from a prior call has committed. Since Start optimistically flips `status` (rendering the Complete button) before its own visit-insert resolves, `handleComplete` can be invoked — and call `ensureVisit()` itself — while `handleStart`'s insert is still in flight, both closures seeing `visitId === null`. Confirmed live: appointment `c0..03` ended up with two `visits` rows (one orphaned with all-null fields, one with the real diagnosis/`completed_at`) after a single successful e2e run.
- **Fix:** Added `visitCreationRef` (a `useRef<Promise<string> | null>`) that memoizes the in-flight/settled insert promise; every caller within the same component mount that needs a visit id now awaits the *same* promise instead of each starting its own insert. Reset to `null` on error so a genuine retry is still possible.
- **Files modified:** `apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx`
- **Verification:** Live-reproduced the exact race with a scratch (uncommitted) Playwright spec against a fresh checked_in seed target (`c0..01`) — clicked Start then immediately Complete without waiting for any network round trip — and confirmed via a direct REST query that exactly one `visits` row exists for that appointment afterward. Scratch spec deleted after verification, matching the 02-05/02-08 precedent.
- **Committed in:** `7a40b42` (separate fix commit, after Task 3)

### Notes (not deviations, informational)

- Direct `DELETE`/`PATCH` REST calls to reset the two seed rows mutated during testing (`c0..01`, `c0..03` — both now `completed` with real visit history instead of their original seed statuses) were blocked by the sandbox's shared-resource-mutation guard, as expected for a code-execution task. This is a known, accepted side effect of live-verifying against the real project rather than a mock; `c0..03`'s completed state is exactly what `doctor-consult.spec.ts`'s idempotent-tolerant branch is designed to handle on future re-runs, and `c0..01` being checked/completed does not block any other committed spec (`reception-queue.spec.ts` was already failing on it beforehand — see Known Issues below).

## Known Issues / Deferred Items

- `apps/web/e2e/reception-queue.spec.ts` (from Plan 02-02, not touched by this plan) has 2 pre-existing failures because seeded appointments `c0..01`/`c0..02` were mutated away from `booked` by earlier non-idempotent test runs. Logged to `.planning/phases/02-reception-doctor-flow/deferred-items.md` with a suggested fix (idempotent-tolerant re-run pattern, same as `doctor-consult.spec.ts` now uses) for a future gap-closure pass. Not fixed here — out of this plan's declared file scope.
- Live seed data now differs from `supabase/seed-dev.sql`'s original values for `c0..01` and `c0..03` (both `completed` with real visit rows instead of `checked_in`/`booked`). Plan 07 (orders/prescriptions) should be aware that `c0..03` is no longer a valid "Start Consultation" target — `c0..04` (`in_consultation`, existing visit) remains available and unmutated for Plan 07's "add order/prescription to an in-progress visit" testing.

## User Setup Required

None — no new external service configuration. (Supabase project `rylceydkrydmpysmibba` and seeded doctor credentials, already configured in prior plans, were used as-is.)

## Next Phase Readiness

- Plan 07 (orders + prescriptions) extends `consult-client.tsx` directly at the `{/* orders + prescriptions: Plan 07 */}` mount point (rendered only while `status === "in_consultation"`), and can import `ConsultClientProps`/`Medicine` from this file.
- The `medicines` prop is already loaded and threaded through from `page.tsx` to `consult-client.tsx` (currently unused, `void`-referenced) — Plan 07's combobox can consume it directly without touching `page.tsx`.
- The now-safe `ensureVisit()` pattern (ref-memoized in-flight insert) is available as a precedent if Plan 07 needs similar dedupe guarantees for its own order/prescription inserts under the same visit.

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 5 claimed files found on disk (doctor-consult.spec.ts, page.tsx, consult-client.tsx, deferred-items.md, this SUMMARY); all 4 claimed commit hashes (ceed547, cf3803d, a9a75e3, 7a40b42) found in git history.
