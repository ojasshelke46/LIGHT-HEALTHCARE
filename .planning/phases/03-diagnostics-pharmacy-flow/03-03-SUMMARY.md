---
phase: 03-diagnostics-pharmacy-flow
plan: 03
subsystem: diagnostics-completed-browse
tags: [nextjs-server-component, postgrest-filters, playwright-e2e, supabase-storage-signed-url]

# Dependency graph
requires:
  - phase: 03-diagnostics-pharmacy-flow
    provides: "03-01 (getResultUrl/ResultLink, ORDER_TYPE_ICON, istRangeFromDates) + 03-02 (diagnostics-flow.spec.ts accept->upload->complete flow, order f0..e2)"
provides:
  - "/diagnostics/completed: server-rendered status=completed orders list, newest-first, whitelisted type filter + IST date-range filter applied server-side via searchParams (DIAG-03)"
  - "completed-filters.tsx: client URL-state date+type controls, same pattern as pharmacy/dispensed/dispensed-filters.tsx (D-41)"
  - "diagnostics-flow.spec.ts extended end-to-end through the Completed page + signed-URL View popup assertion"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Type-filter whitelist cast: (VALID_TYPES as readonly string[]).includes(type) before .eq(\"type\", type as OrderType) — avoids widening a literal-union readonly tuple's .includes() signature against an unvalidated searchParams string (T-03-08)"
    - "Completed/Dispensed pages share one filter shape: server component + searchParams -> istRangeFromDates -> gte/lt, sibling client *-filters.tsx pushing router.push with URLSearchParams (D-36 mirrors D-41 exactly)"

key-files:
  created:
    - apps/web/src/app/diagnostics/completed/page.tsx
    - apps/web/src/app/diagnostics/completed/completed-filters.tsx
  modified:
    - apps/web/e2e/diagnostics-flow.spec.ts

key-decisions:
  - "Completed table renders type/patient/doctor/completed-time/notes/ResultLink per the plan's literal column spec — order.instructions is fetched (needed for the CompletedOrder cast shape parity with in-progress) but intentionally NOT rendered, matching D-36's column list; the e2e identifies the row via data-testid=completed-row-{orderId} rather than instructions text, consistent with the dispensed-row-{id} testid convention already in the app"
  - "Cast the whitelist check as (VALID_TYPES as readonly string[]).includes(type) rather than VALID_TYPES.includes(type) directly — the literal-union tuple's includes() signature does not accept a plain string argument under this repo's TS config; verified via full `next build` typecheck pass"

patterns-established:
  - "completed-row-{orderId} / dispensed-row-{id} data-testid convention for server-rendered filtered list rows, scoped in e2e specs via getByTestId(...).getByTestId(childTestId) chaining"

requirements-completed: [DIAG-03]

# Metrics
duration: 8min
completed: 2026-07-10
---

# Phase 3 Plan 3: Diagnostics Completed Browse Summary

**Server-rendered `/diagnostics/completed` page with whitelisted type + IST date-range filters applied via PostgREST query params, each row opening its result through the existing signed-URL ResultLink — proven end-to-end by extending the diagnostics e2e through a popup assertion on the `scan-results` Storage URL.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-10T23:21:00+05:30 (approx)
- **Completed:** 2026-07-10T23:24:47+05:30
- **Tasks:** 2 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `/diagnostics/completed`: async server component querying `orders` where `status="completed"`, ordered `completed_at DESC`, joined to `patients(name)` and `visits(doctors(staff(name)))`; the `type` searchParam is validated against a fixed `VALID_TYPES` whitelist before ever reaching `.eq()` (T-03-08), and `from`/`to` pass only through `istRangeFromDates` (no raw string interpolation into the filter)
- `completed-filters.tsx`: client URL-state controls (`filter-from`, `filter-to`, `filter-type` date/date/select inputs) that push `router.push(/diagnostics/completed?...)` on change, defaulting from the server-parsed searchParams so the controls stay in sync across reloads — same shape as the existing `pharmacy/dispensed/dispensed-filters.tsx` (D-41)
- Each completed row opens its result via `<ResultLink pathOrUrl={row.result_url} />` (D-35), reused unchanged from 03-01
- `diagnostics-flow.spec.ts` extended: after the existing accept -> upload -> complete flow, the spec now navigates to `/diagnostics/completed`, asserts the `completed-row-{orderId}` row is visible, clicks `view-result` while awaiting a `page.waitForEvent("popup")`, and asserts the popup's URL contains `scan-results` — proving the ResultLink resolved a real signed Storage URL, not a stale/legacy path
- Verified the extended spec passes and re-runs cleanly twice back-to-back (self-resetting, D-43) — no leftover order row or storage object

## Task Commits

Each task was committed atomically:

1. **Task 1: Completed page (server, filtered) + filter controls (DIAG-03)** - `b0a733c` (feat)
2. **Task 2: Extend diagnostics-flow e2e through Completed + signed-URL View** - `973529a` (test)

**Plan metadata:** (this commit, following SUMMARY creation)

## Files Created/Modified

- `apps/web/src/app/diagnostics/completed/page.tsx` - server component: filtered `status=completed` query (whitelist type + IST date range), renders the completed table with per-row `ResultLink`
- `apps/web/src/app/diagnostics/completed/completed-filters.tsx` - client date-range + type `<Select>` controls pushing URL searchParams
- `apps/web/e2e/diagnostics-flow.spec.ts` - extended through Completed-page row visibility + signed-URL popup assertion

## Decisions Made

- Rendered the completed table with exactly the columns D-36/the plan spec named (type icon, patient, doctor, completed time, notes, ResultLink) — `instructions` is present in the fetched row shape (kept for type-shape consistency with the in-progress query) but deliberately not rendered, since it isn't in the plan's column list and the e2e identifies rows by `data-testid` rather than text content.
- Cast the type whitelist check as `(VALID_TYPES as readonly string[]).includes(type)` instead of `VALID_TYPES.includes(type)` directly — TypeScript's `includes()` signature on a literal-union readonly tuple does not accept a plain `string` searchParam value without widening the array type first; confirmed via a full `next build` typecheck pass (0 errors).

## Deviations from Plan

None — plan executed exactly as written. The `VALID_TYPES` cast above is an implementation detail required to satisfy the TypeScript compiler for the exact whitelist logic the plan specified, not a deviation from its intent (T-03-08's whitelist-only guarantee is preserved unchanged).

## Known Stubs

None. The completed list, filters, and result links are all wired to live Supabase data — no hardcoded/mock/placeholder values.

## Threat Flags

None. The `type`/`from`/`to` searchParam surface and the ResultLink signed-URL surface were both already anticipated and dispositioned in the plan's own `<threat_model>` (T-03-08, T-03-09); no new trust-boundary-crossing surface was introduced.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `scan-results` Storage bucket and its policies already exist per D-44.

## Next Phase Readiness

- `pnpm --filter @light/web build` passes (0 errors, `/diagnostics/completed` in the route manifest).
- `pnpm --filter @light/web exec playwright test e2e/diagnostics-flow.spec.ts` passes and re-runs cleanly twice in a row.
- This is the last remaining Phase 3 plan (03-01, 03-02, 03-04, 03-05 all previously completed, some out of sequence per the 02-08 precedent) — Phase 3 (diagnostics-pharmacy-flow) is now fully executed with all 5 plans (01-05) having summaries.
- No blockers for Phase 4 (mobile) or Phase 5 (AI services).

---
*Phase: 03-diagnostics-pharmacy-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All created/modified files verified present on disk (`page.tsx`, `completed-filters.tsx`, `diagnostics-flow.spec.ts`, plus this SUMMARY.md). Both task commits (`b0a733c`, `973529a`) verified present in `git log`.
