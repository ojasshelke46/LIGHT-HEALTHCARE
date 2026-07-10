---
phase: 03-diagnostics-pharmacy-flow
plan: 05
subsystem: pharmacy-inventory
tags: [supabase-realtime, zod, playwright-e2e, server-components, sonner]

# Dependency graph
requires:
  - phase: 03-diagnostics-pharmacy-flow
    provides: "03-01 foundation — istRangeFromDates (time.ts), pharmacist nav Inventory/Dispensed entries (theme.ts), useRealtimeList; 03-02 — playwright.config.ts .env.local loader + self-resetting direct-supabase-js e2e pattern; 03-04 — pharmacy row/testid conventions"
provides:
  - "/pharmacy/inventory: full medicines table, low-stock rows first with amber highlight, inline stock edit (click cell -> number input -> save on blur/Enter), live via useRealtimeList on medicines (PHARM-03)"
  - "Add-medicine Sheet: zod-validated (name required, int stock/threshold >= 0, price >= 0 max 2dp, unit default tablet), RLS-scoped insert (PHARM-03)"
  - "/pharmacy/dispensed: server-rendered dispensed-prescriptions history, newest-first, from/to IST date-range filter via URL searchParams (PHARM-04)"
  - "Playwright e2e/pharmacy-inventory.spec.ts: self-resetting inline-stock-edit (200->199->200) + add-medicine round-trip (unique name, deleted after)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline-edit table cell: display value as a <button>; clicking swaps in a controlled number Input (autoFocus) that saves on blur/Enter and cancels on Escape — single editingId state, invalid input silently ignored (no write)"
    - "Server-page URL-state filter: client component pushes /route?from=&to= via useRouter+useSearchParams (empties omitted); async server page awaits searchParams and applies istRangeFromDates bounds as gte/lt — no client-side row filtering"

key-files:
  created:
    - apps/web/src/app/pharmacy/inventory/page.tsx
    - apps/web/src/app/pharmacy/inventory/inventory-client.tsx
    - apps/web/src/app/pharmacy/inventory/add-medicine-form.tsx
    - apps/web/src/app/pharmacy/dispensed/page.tsx
    - apps/web/src/app/pharmacy/dispensed/dispensed-filters.tsx
    - apps/web/e2e/pharmacy-inventory.spec.ts
  modified: []

key-decisions:
  - "Inline stock edit saves on both blur and Enter through one saveEdit path; Enter preventDefaults so the implicit form-less button/input pair never double-fires, and Escape cancels without any write — invalid input (non-integer or negative) is silently ignored per plan, reverting the cell to display mode"
  - "e2e adds a second test (add-medicine Sheet round-trip with a Date.now()-unique name, deleted in finally) beyond the plan's required inline-edit test — the add-medicine flow is a must_have truth and the orchestrator's environment notes mandated unique names per run for added medicines"

patterns-established:
  - "Inventory row testid convention inventory-row-<id> / stock-cell-<id> / stock-input-<id>; dispensed rows dispensed-row-<id> (mirrors 03-04's pending-row-<id>)"

requirements-completed: [PHARM-03, PHARM-04]

# Metrics
duration: 25min
completed: 2026-07-10
---

# Phase 3 Plan 5: Pharmacy Inventory & Dispensed History Summary

**Pharmacist now manages the full medicines inventory — low-stock rows surfaced first with an amber highlight, stock inline-editable via a click-to-edit number cell, new medicines added through a zod-validated Sheet — and audits dispensing on a server-rendered dispensed-history page with an IST date-range URL filter, all proven by a self-resetting Playwright spec.**

## Performance

- **Duration:** ~25 min active execution (split across two sessions by a session limit: Task 1 in the first, Tasks 2–3 + verification in the second)
- **Completed:** 2026-07-10
- **Tasks:** 3 completed
- **Files modified:** 6 (6 created, 0 modified outside them)

## Accomplishments

- `/pharmacy/inventory` (PHARM-03): `useRealtimeList` watching `medicines` so dispense-driven stock changes from `/pharmacy` (or a concurrent pharmacist) reflect live; full table (name, stock, unit, price, threshold) sorted low-stock-first (`stock_qty <= low_stock_threshold`) with `bg-amber-50` row highlight, then alphabetical; loading skeletons / error+retry / EmptyState (Package)
- Inline stock edit: stock cell renders as a button (`stock-cell-<id>`); clicking swaps in a controlled `<Input type="number" min=0 step=1>` (`stock-input-<id>`) that saves on blur or Enter via a single `update({ stock_qty }).eq("id", …)` on the anon client under the deployed pharmacist-only RLS (T-03-13); invalid input (non-integer / negative) is silently ignored, Escape cancels without a write (T-03-14); error → destructive toast + no state change, success → toast + refetch
- Add-medicine Sheet: `AddMedicineForm` with the exact D-40 zod schema (name required, `stock_qty`/`low_stock_threshold` coerced ints ≥ 0, `unit_price` ≥ 0 with a max-two-decimals refine, unit defaulting to "tablet"), inline `role="alert"` first-issue error, disabled-while-submitting, RLS-scoped `insert`; `onAdded` closes the Sheet and refetches
- `/pharmacy/dispensed` (PHARM-04): async server component querying `prescriptions` `status=dispensed` ordered `dispensed_at DESC` with `medicines(name)`/`patients(name)` joins; `from`/`to` searchParams pass only through `istRangeFromDates` (Date math, NaN-safe — T-03-15) applied as `gte`/`lt`; table shows medicine, patient, quantity, `formatIST(…, "datetime")`; EmptyState (ClipboardList) + error branch; `DispensedFilters` client component pushes URL state via `useRouter` + `useSearchParams` (empties omitted, defaults from server-parsed values)
- `apps/web/e2e/pharmacy-inventory.spec.ts`: two self-resetting tests (D-43) — (1) inline-edits Cetirizine (`e0..05`) 200→199, waits on the PATCH `/rest/v1/medicines` response, asserts cell text AND a direct supabase-js pharmacist read of 199, restores 200 in `finally`; (2) adds a medicine with a `Date.now()`-unique name through the Sheet, waits on the POST, asserts UI + all four persisted fields, deletes the row in `finally`. Green on multiple consecutive runs (no drift)
- Dispensed page functionally verified beyond the plan's build-only gate with two uncommitted scratch Playwright specs: empty-state + URL-filter round-trip, then a data-backed pass (temporarily dispensed seeded rx `f0..02`, asserted the row's medicine/patient/qty, filtered it out with `from=2099-01-01`, re-included with `from=2020-01-01`, restored the rx to pending) — seed state confirmed restored by direct query afterwards

## Task Commits

Each task was committed atomically:

1. **Task 1: Inventory list — full table, low-stock-first, inline stock edit (PHARM-03)** — `5c22bc1` (feat)
2. **Task 2: Add-medicine Sheet (zod) + self-resetting inline-edit e2e (PHARM-03)** — `b389a89` (feat)
3. **Task 3: Dispensed history — server page + date-range filter (PHARM-04)** — `1a2e612` (feat)

**Plan metadata:** (this commit, following SUMMARY creation)

## Files Created/Modified

- `apps/web/src/app/pharmacy/inventory/page.tsx` — client wrapper rendering `InventoryClient`
- `apps/web/src/app/pharmacy/inventory/inventory-client.tsx` — live inventory table, low-stock-first sort + amber highlight, inline stock edit, Add-medicine Sheet trigger
- `apps/web/src/app/pharmacy/inventory/add-medicine-form.tsx` — zod-validated add-medicine Sheet body with testids `add-name/stock/unit/price/threshold/submit`
- `apps/web/src/app/pharmacy/dispensed/page.tsx` — async server component: dispensed prescriptions newest-first with IST date-range bounds
- `apps/web/src/app/pharmacy/dispensed/dispensed-filters.tsx` — URL-state from/to date inputs (`disp-from`/`disp-to`)
- `apps/web/e2e/pharmacy-inventory.spec.ts` — self-resetting inline-edit + add-medicine e2e (D-43)

## Decisions Made

- Inline edit's Enter/blur both route through one `saveEdit`; Enter `preventDefault`s and Escape cancels with zero writes. Invalid input (parseInt fails or negative) is silently ignored per the plan's "ignore invalid" wording, reverting to display mode rather than showing a validation error — the inventory cell is a fast counter-side control, not a form.
- The e2e includes a second, plan-unrequired test covering the add-medicine Sheet round-trip: the flow is one of the plan's must_have truths, and the orchestrator's environment notes explicitly required unique names + deletion for any medicines added by specs, so proving it self-resettingly here was lower-risk than leaving the form's insert unexercised.

## Deviations from Plan

None - plan executed exactly as written. (The extra add-medicine e2e test is an addition within the task's scope, not a change to any planned behavior.)

## Known Stubs

None. Both pages and the form are wired to live Supabase data (`medicines`/`prescriptions` tables) under the deployed pharmacist RLS — no hardcoded, mock, or placeholder values.

## Threat Flags

None. All new trust-boundary surface (client → medicines write via inline edit + insert; URL from/to → PostgREST filter) was already anticipated and dispositioned in this plan's own `<threat_model>` (T-03-13..T-03-15), and each mitigation is implemented: writes on the anon client under `medicines_pharmacist_all` only, int-≥0 parse guard + zod schema before any write, dates passed exclusively through `istRangeFromDates`.

## Issues Encountered

- Execution was split across two sessions by a session limit after Task 1's commit; the continuation verified disk/commit state (Task 1 at `5c22bc1`, Task 2 files complete but uncommitted) and resumed without redoing work. No content was lost.
- A git remote `origin` now exists on the repo; per the coordinator's instruction, nothing was pushed — all commits are local only.

## User Setup Required

None. The pharmacist RLS policy (`medicines_pharmacist_all`) and seeded medicines already exist (D-44); verified live by the e2e's direct-client reads/writes succeeding with no RLS denial.

## Next Phase Readiness

- `pnpm --filter @light/web typecheck` and `build` pass; `/pharmacy/dispensed` builds as a dynamic route.
- `pnpm --filter @light/web exec playwright test e2e/pharmacy-inventory.spec.ts` green on consecutive runs (self-reset confirmed, D-43); seed state (Cetirizine 200, rx `f0..02` pending) verified restored by direct query.
- Phase 3 has one remaining plan: 03-03 (diagnostics completed page) — this plan (wave 2, depends only on 03-01) was executed before it, matching the 02-08/03-04 out-of-sequence precedent. PHARM-01..04 are now all complete.

---
*Phase: 03-diagnostics-pharmacy-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 6 created source/e2e files plus this SUMMARY.md verified present on disk. All 3 task commits (`5c22bc1`, `b389a89`, `1a2e612`) verified present in `git log`.
