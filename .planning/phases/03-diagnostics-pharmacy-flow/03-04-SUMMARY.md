---
phase: 03-diagnostics-pharmacy-flow
plan: 04
subsystem: pharmacy-dispense
tags: [supabase-realtime, supabase-rpc, playwright-e2e, sonner]

# Dependency graph
requires:
  - phase: 03-diagnostics-pharmacy-flow
    provides: "03-01 foundation — stockLevel()/PRESCRIPTION_STATUS_BADGE (status.ts), useRealtimeList (multi-table watch), pharmacist nav (theme.ts); 03-02 — playwright.config.ts .env.local loader + self-resetting direct-supabase-js e2e pattern"
provides:
  - "/pharmacy (Pending): live status=pending prescriptions list, joined patient/medicine/doctor, stock indicator (PHARM-01)"
  - "Atomic dispense via the deployed dispense_medicine RPC only — no client-side stock/status write (PHARM-02)"
  - "Playwright e2e/pharmacy-dispense.spec.ts: self-resetting happy-path (120->110) + insufficient-stock guard proof"
affects: [03-05-pharmacy-dispensed]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dispense button's native `disabled` reflects only the in-flight request, not insufficient-stock — insufficient stock is shown via badge + muted style so the click still reaches the RPC (a truly disabled <button> never dispatches click in real browsers); server is the sole authority per threat model T-03-11"
    - "e2e toast assertions scoped to `[data-sonner-toast]` to avoid strict-mode collisions with row text that already contains the same substring (the insufficient-stock badge label and the RPC's error toast share the phrase 'insufficient stock')"

key-files:
  created:
    - apps/web/e2e/pharmacy-dispense.spec.ts
    - apps/web/src/app/pharmacy/pending-client.tsx
    - apps/web/src/app/pharmacy/pending-row.tsx
  modified:
    - apps/web/src/app/pharmacy/page.tsx

key-decisions:
  - "Dispense button disables only while a request is pending (native HTML disabled), not for insufficient-stock rows — a hard-disabled button never fires a click event in real browsers, which would make it impossible for the e2e (and any real pharmacist accidentally clicking) to ever reach the RPC's atomic guard. Insufficient stock is conveyed via the red badge + opacity-60 button styling instead. Matches the threat model's own language: 'button disable is UX-only, server is authoritative' (T-03-11)."
  - "e2e insufficient-stock toast assertion scoped to `[data-sonner-toast]` rather than a bare `page.getByText(...)`, since the row's own stock badge already renders the same 'Insufficient stock' substring before the click — an unscoped locator would hit Playwright's strict-mode two-element violation."

patterns-established:
  - "Pharmacy row testid convention `pending-row-<id>` + `dispense-btn` mirrors diagnostics' `pending-row-<id>` + `accept-btn` — 03-05 (dispensed history) can reuse the same row-wrapper shape for a read-only variant"

requirements-completed: [PHARM-01, PHARM-02]

# Metrics
duration: 12min
completed: 2026-07-10
---

# Phase 3 Plan 4: Pharmacy Dispense Summary

**Pharmacist now sees pending prescriptions live with a red/amber/green stock indicator and dispenses each atomically through the deployed `dispense_medicine` RPC — stock decrement and status flip happen in one server transaction, never a client-side write, proven end-to-end by a self-resetting Playwright spec covering both the happy path (120→110) and the insufficient-stock guard.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-10T11:42:30Z (approx, per STATE.md prior session timestamp)
- **Completed:** 2026-07-10T11:52:00Z (approx)
- **Tasks:** 2 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `/pharmacy` (Pending): `useRealtimeList` watching **both** `prescriptions` and `medicines` (D-38) so a stock edit made on the Inventory page or a concurrent pharmacist's dispense refreshes every row's stock indicator live, not just the acting pharmacist's own actions; each row joins patient name, medicine name/stock/threshold, and doctor name (`visits.doctors.staff.name`)
- Stock indicator via the 03-01 `stockLevel()` helper: red "Insufficient stock (have N)" when `stock < quantity`, amber "Low stock" at/below `low_stock_threshold`, green "In stock (N)" otherwise
- Dispense calls `supabase.rpc("dispense_medicine", { p_prescription_id, p_quantity })` **only** — no client-side `.update({ stock_qty })` or status write anywhere in the pharmacy pending flow (T-03-10, verified by acceptance grep and manual review); on error, `toast.error(error.message)` surfaces the RPC's exact "Insufficient stock" message as a destructive (red) sonner toast; on success, `toast.success("Dispensed")` + `onChanged()` triggers the live refetch, which naturally drops the row once its status leaves `pending`
- `apps/web/e2e/pharmacy-dispense.spec.ts`: two self-resetting tests —
  1. Dispenses the seeded pending prescription (`f0..02`, Rohan Mehta, Paracetamol), waits on the `rpc/dispense_medicine` POST, confirms the row leaves the pending list, verifies server-side `status=dispensed` + `dispensed_at` set + `medicines.stock_qty` 120→110, then restores both rows to their original seed values in a `finally` block
  2. Creates a throwaway pending prescription (fixed id, quantity 999 against Amlodipine's 15 in stock), dispenses it, asserts a destructive toast containing "Insufficient stock", confirms the medicine's stock and the prescription's status are both untouched (no partial dispense), then deletes the throwaway row in a `finally` block
- Both tests verified green on two consecutive runs (self-reset confirmed) and alongside the full existing e2e suite (12/13 passing — the one pre-existing failure, `reception-queue.spec.ts`, is an already-documented Phase-02 seed-drift issue unrelated to this plan's files, see Issues Encountered)

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing pharmacy-dispense e2e (RED)** — `bf1951b` (test)
2. **Task 2: Pharmacy Pending — live list + stock indicator + Dispense RPC (GREEN)** — `fa5c020` (feat)

**Plan metadata:** (this commit, following SUMMARY creation)

## Files Created/Modified

- `apps/web/e2e/pharmacy-dispense.spec.ts` — self-resetting happy-path (120→110) + insufficient-stock guard e2e, fixed throwaway rx id `f0000000-0000-0000-0000-0000000000d4`
- `apps/web/src/app/pharmacy/pending-client.tsx` — live `status=pending` prescriptions list, `["prescriptions", "medicines"]` multi-table watch, exports `PendingRx`
- `apps/web/src/app/pharmacy/pending-row.tsx` — row UI + stock badge + Dispense button wired to `dispense_medicine` RPC only
- `apps/web/src/app/pharmacy/page.tsx` — replaced the Phase-3 placeholder with a `PendingRxClient` client wrapper

## Decisions Made

- Dispense button's native `disabled` attribute reflects only the in-flight request (`pending` state), not the insufficient-stock condition. A hard `disabled` on an insufficient-stock row would mean the button never dispatches a `click` event in any real browser (this is standard, non-bypassable HTML behavior — `force: true` in Playwright does not help either, since the browser itself suppresses the event), so the click could never reach the server's atomic guard. Insufficient stock is instead conveyed via the red `stockLevel()` badge plus a muted (`opacity-60`) button style. This is a direct, literal reading of the plan's own threat model line: "button disable is UX-only, server is authoritative" (T-03-11) — the RPC's rejection is what actually stops the dispense, not the client.
- Scoped the e2e's insufficient-stock toast assertion to `page.locator("[data-sonner-toast]").filter({ hasText: /insufficient stock/i })` rather than a bare `page.getByText(...)`, because the row's own stock badge already renders the identical "Insufficient stock" substring before the click — an unscoped text locator would resolve to two elements and fail Playwright's strict-mode check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reconciled the Dispense button's disable condition with the plan's own e2e requirement**
- **Found during:** Task 2 implementation (writing `pending-row.tsx` against Task 1's already-committed e2e)
- **Issue:** The plan's `<action>` text for Task 2 specifies the Dispense button is "disabled when `pending || s.level === 'insufficient'`", but Task 1's e2e (also written by this plan, Test B) requires clicking Dispense on an insufficient-stock row to actually fire the `dispense_medicine` RPC and receive a rejection. These two are mutually exclusive for a native HTML `disabled` button — disabled buttons never dispatch `click` events, so a literal implementation of the stated disable condition would make Test B permanently unable to pass (the RPC would simply never be called, and `page.waitForResponse` would time out).
- **Fix:** Implemented `disabled={pending}` only; insufficient stock is shown via badge + muted styling but remains clickable, letting the RPC's own atomic guard (already deployed, not reimplemented) be the actual gate. This is explicitly consistent with the plan's own threat model disposition for T-03-11: "button disable is UX-only, server is authoritative."
- **Files modified:** `apps/web/src/app/pharmacy/pending-row.tsx`
- **Verification:** Both e2e tests pass, including Test B's assertion that the RPC is called and rejects with "Insufficient stock", and that no partial dispense occurs.
- **Committed in:** `fa5c020`

## Known Stubs

None. The pending list, stock indicators, and dispense action are all wired to live Supabase data (prescriptions/medicines tables) and the real deployed RPC — no hardcoded or mock values.

## Threat Flags

None. The only new surface (client → `dispense_medicine` RPC, concurrent-pharmacist stock race) was already anticipated and dispositioned in this plan's own `<threat_model>` (T-03-10..T-03-12); no additional trust-boundary-crossing surface was introduced.

## TDD Gate Compliance

N/A — both tasks are `type="auto"`, not `tdd="true"`. Task 1 is a RED e2e spec by plan design (turned GREEN by Task 2), a different mechanism from the per-task TDD gate; verified directly: the spec failed on the `pending-row-<id>` visibility assertion (no `/pharmacy` pending UI existed) before Task 2, and both tests pass now, confirmed on two consecutive runs.

## Issues Encountered

- `apps/web/e2e/reception-queue.spec.ts` fails on `reception sees the live queue and can check a booked patient in` (expects seeded appointment `c0..01` at status `booked`, finds it already `checked_in`). This is a pre-existing, already-documented issue (`.planning/phases/02-reception-doctor-flow/deferred-items.md`, "02-06: reception-queue.spec.ts pre-existing failures") caused by that spec's own non-idempotent mutation of seed rows across repeated runs — unrelated to any file this plan touches (this plan modifies only `apps/web/src/app/pharmacy/*` and adds `apps/web/e2e/pharmacy-dispense.spec.ts`, neither of which reads or writes `appointments`). Not fixed here, per scope-boundary rule; not re-logged since already tracked.

## User Setup Required

None. `dispense_medicine` RPC and pharmacist RLS grants on `prescriptions`/`medicines` already exist per the plan's interface notes and D-44 (verified indirectly: both e2e tests' RPC calls and direct-client reads/writes succeeded against the live Supabase project with no RLS denial).

## Next Phase Readiness

- `pnpm --filter @light/web typecheck` and `build` pass.
- `pnpm --filter @light/web exec playwright test e2e/pharmacy-dispense.spec.ts` passes both tests and re-runs cleanly twice back-to-back (confirmed self-resetting, D-43) — leaves no prescription or stock drift behind.
- Full e2e suite: 12/13 passing; the 1 failure is pre-existing and out of scope (see Issues Encountered).
- 03-05 (pharmacy dispensed history) can reuse this plan's row-wrapper testid convention (`pending-row-<id>` → `dispensed-row-<id>`) and the same `patients(name)`/`visits(doctors(staff(name)))` join shape, filtered to `status=dispensed` and ordered by `dispensed_at DESC`. No blockers.

---
*Phase: 03-diagnostics-pharmacy-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 4 created/modified source files plus this SUMMARY.md verified present on disk. Both task commits (`bf1951b`, `fa5c020`) verified present in `git log`.
