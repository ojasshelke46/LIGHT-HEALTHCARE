---
phase: 03-diagnostics-pharmacy-flow
plan: 01
subsystem: diagnostics-pharmacy-foundation
tags: [supabase-storage, signed-url, nav, tailwind, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: ROLE_THEME nav pattern, status.ts badge-map convention, time.ts IST_OFFSET_MS convention, doctor consult/history pages
provides:
  - "getResultUrl(pathOrUrl) — http(s) passthrough vs signed Storage URL (3600s TTL), never precomputed"
  - "ResultLink client component — View-result button wired to getResultUrl, toast on failure"
  - "ORDER_STATUS_BADGE, PRESCRIPTION_STATUS_BADGE, ORDER_TYPE_ICON, stockLevel() in status.ts"
  - "istRangeFromDates(from,to) IST day-bound helper in time.ts"
  - "lab_tech + pharmacist ROLE_THEME nav arrays (D-32/D-37)"
  - "Doctor history/consult result links now open via the signed-URL helper (D-35 retrofit)"
affects: [03-02-diagnostics-pending-inprogress, 03-03-diagnostics-completed, 03-04-pharmacy-pending-inventory, 03-05-pharmacy-dispensed]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getResultUrl client-side signed-URL-on-click, never precomputed into a list (D-35)"
    - "status.ts badge/icon/stock maps use LITERAL Tailwind class strings (content-scan safe), matching APPOINTMENT_STATUS_BADGE convention"
    - "time.ts date-range helpers reuse the fixed IST_OFFSET_MS (no DST) constant from todayISTRange"

key-files:
  created:
    - apps/web/src/lib/results.ts
    - apps/web/src/lib/results.test.ts
    - apps/web/src/components/result-link.tsx
  modified:
    - apps/web/src/lib/status.ts
    - apps/web/src/lib/time.ts
    - apps/web/src/lib/theme.ts
    - apps/web/src/app/doctor/patients/[id]/page.tsx
    - apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx

key-decisions:
  - "Used a plain <button className=\"text-blue-600 hover:underline\"> in ResultLink (not the shared Button primitive) to keep the exact visual replacement for the raw <a> anchors it retrofits, per plan spec"
  - "Kept doctor/patients/[id]/page.tsx and consult-client.tsx's pre-existing local OrderType/OrderStatus/PrescriptionStatus type aliases as-is (out of this task's scope) rather than migrating them to the new status.ts-exported equivalents"
  - "Reverted requirements.mark-complete's premature check-off of DIAG-02/DIAG-03 in REQUIREMENTS.md -- this plan is foundation-only (nav/helpers/doctor-refactor); no upload/complete flow or completed-orders browse page exists yet, matching the Phase-1 AUTH-02/SHELL-01 and Phase-2 RECEP-01/DOC-01 precedent"

patterns-established:
  - "ResultLink is the single retrofit point for any future result_url render site — Wave 2/3 diagnostics pages must use it instead of raw anchors"

requirements-completed: []  # DIAG-02/DIAG-03 listed in PLAN.md frontmatter but NOT actually satisfied by this foundation-only plan -- deferred to 03-02 (upload/complete) and 03-03 (completed browse); see key-decisions

# Metrics
duration: 10min
completed: 2026-07-10
---

# Phase 3 Plan 1: Diagnostics & Pharmacy Foundation Summary

**Signed-URL result helper (D-35, 3600s TTL via Supabase Storage `scan-results`) with a reusable ResultLink button, status/icon/stock display helpers, an IST date-range helper, and the D-32/D-37 lab-tech + pharmacist nav arrays — plus a retrofit of both doctor history render sites onto the new signed-URL helper.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-10T11:15:00Z (approx)
- **Completed:** 2026-07-10T11:24:20Z
- **Tasks:** 3 completed
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- `getResultUrl(pathOrUrl)` in `apps/web/src/lib/results.ts`: http(s) passthrough for legacy seeded rows (order f0..01), Storage-path signing via `scan-results` bucket with a fixed 3600s TTL, null on missing input or signing error — built TDD (RED test commit, then GREEN implementation commit)
- `ResultLink` client component resolves + opens signed URLs on click (`noopener,noreferrer`), shows "Opening…" while pending, toasts `Could not open result` on failure
- `status.ts` gained `ORDER_STATUS_BADGE`, `PRESCRIPTION_STATUS_BADGE`, `ORDER_TYPE_ICON` (FlaskConical/ScanLine/Magnet/ImageIcon), and `stockLevel()` (insufficient/low/ok) — all literal Tailwind class strings matching the existing `APPOINTMENT_STATUS_BADGE` convention
- `time.ts` gained `istRangeFromDates(from, to)` for completed/dispensed date-range filters, reusing the `IST_OFFSET_MS` constant from `todayISTRange`
- `theme.ts` `ROLE_THEME.lab_tech.nav` and `.pharmacist.nav` replaced with the full D-32/D-37 three-entry navs
- Both doctor result_url render sites (`doctor/patients/[id]/page.tsx`, `doctor/consult/[appointmentId]/consult-client.tsx`) now render `<ResultLink pathOrUrl={...} />` instead of a raw `<a href={result_url}>` — closes the D-35 quality-gate item

## Task Commits

Each task was committed atomically:

1. **Task 1a: getResultUrl RED test** - `1630818` (test)
2. **Task 1b: getResultUrl GREEN implementation** - `e6b9e80` (feat)
3. **Task 2: ResultLink + status/icon/stock + date-range helpers** - `52f453a` (feat)
4. **Task 3: Portal nav (D-32/D-37) + doctor ResultLink adoption (D-35)** - `4ae1650` (feat)

**Plan metadata:** (this commit, following SUMMARY creation)

_Note: Task 1 is TDD (`tdd="true"`) — RED then GREEN, no REFACTOR commit needed (implementation was already minimal)._

## Files Created/Modified

- `apps/web/src/lib/results.ts` - `getResultUrl(pathOrUrl)`: http(s) passthrough vs `createSignedUrl("scan-results", pathOrUrl, 3600)`
- `apps/web/src/lib/results.test.ts` - vitest coverage: https/http passthrough, null/empty, signed-path success, signing error
- `apps/web/src/components/result-link.tsx` - `ResultLink` client button, resolves on click, opens in new tab, toasts on failure
- `apps/web/src/lib/status.ts` - added `ORDER_STATUS_BADGE`, `PRESCRIPTION_STATUS_BADGE`, `ORDER_TYPE_ICON`, `stockLevel()`
- `apps/web/src/lib/time.ts` - added `istRangeFromDates(from, to)`
- `apps/web/src/lib/theme.ts` - `lab_tech.nav` (Pending/In Progress/Completed) and `pharmacist.nav` (Pending/Inventory/Dispensed)
- `apps/web/src/app/doctor/patients/[id]/page.tsx` - result_url render site now uses `<ResultLink>`
- `apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx` - Past Orders tab result_url render site now uses `<ResultLink>`

## Decisions Made

- Rendered `ResultLink` as a bare `<button>` (not the shared `Button` primitive) to preserve the exact `text-blue-600 hover:underline` visual it replaces — matches plan spec literally.
- Left the two doctor pages' pre-existing local `OrderType`/`OrderStatus`/`PrescriptionStatus` type aliases untouched; only the render site changed. Migrating them to the new `status.ts` exports is out of this task's file scope and not required by any acceptance criterion.
- Deferred marking DIAG-02/DIAG-03 complete in REQUIREMENTS.md even though they're listed in this plan's frontmatter `requirements` field: this plan only builds the shared foundation (nav, `getResultUrl`, `ResultLink`, helpers) — it does not build the lab-tech upload/notes/complete flow (DIAG-02) or the completed-orders browse-with-filters page (DIAG-03). Those land in 03-02/03-03. Ran `requirements.mark-complete DIAG-02 DIAG-03`, confirmed it would have prematurely checked both boxes, then manually reverted the checkboxes in REQUIREMENTS.md before this commit — matching the established Phase-1 (AUTH-02/SHELL-01) and Phase-2 (RECEP-01/DOC-01) precedent of not marking a requirement complete until the plan that actually delivers the user-facing behavior lands.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

Task 1 (`tdd="true"`) gate sequence verified in git log:
- RED: `1630818 test(03-01): add failing test for getResultUrl (D-35)` — confirmed failing (import error, file did not exist) before the commit
- GREEN: `e6b9e80 feat(03-01): implement getResultUrl (D-35)` — confirmed passing (11/11 tests) after the commit

Both gates present. No REFACTOR commit — implementation matched the minimal spec on first pass, no cleanup needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Storage bucket `scan-results` and its policies already exist per D-44 (verified by environment notes, not re-verified here since this plan made no Storage-policy changes).

## Next Phase Readiness

- All Wave-2/3 contracts are in place: `getResultUrl`, `ResultLink`, `ORDER_STATUS_BADGE`, `PRESCRIPTION_STATUS_BADGE`, `ORDER_TYPE_ICON`, `stockLevel`, `istRangeFromDates`, and both portal navs.
- Nav entries for `/diagnostics/in-progress`, `/diagnostics/completed`, `/pharmacy/inventory`, `/pharmacy/dispensed` point to routes that do not exist yet — this is expected; those routes are Wave-2/3's responsibility (03-02..03-05) per the plan's stated purpose. Not a stub in this plan's own scope (no data is rendered against these hrefs here).
- `pnpm --filter @light/web typecheck`, `build`, and `test -- results.test` all pass; no raw `<a href={...result_url}>` anchors remain in doctor pages.
- No blockers for 03-02 (diagnostics pending/in-progress pages).

---
*Phase: 03-diagnostics-pharmacy-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All created files verified present on disk (`results.ts`, `results.test.ts`, `result-link.tsx`, plus modified `status.ts`/`time.ts`/`theme.ts`/both doctor render sites). All 4 task commits (`1630818`, `e6b9e80`, `52f453a`, `4ae1650`) verified present in `git log`.
