---
phase: 02-reception-doctor-flow
plan: 07
subsystem: ui
tags: [supabase, doctor, consultation, orders, prescriptions, zod, playwright]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: getStaff()/formatIST helpers, dev seed (medicines, in_consultation appointment c0..04 + visit d0..04)"
  - phase: 02-reception-doctor-flow
    provides: "02-06: /doctor/consult/[appointmentId] consult-client.tsx with visitId/status state, ConsultClientProps/Medicine exports, and the Plan-07 mount placeholder"
provides:
  - "OrdersSection: this-visit test orders (type + instructions), insert-with-real-visit_id, reopen-continuity load, removable via row delete (DOC-04)"
  - "PrescriptionsSection: client-side-filtered medicine combobox + dosage/duration/positive-int-quantity, insert-with-real-visit_id, removable list (DOC-04)"
  - "doctor-orders-prescriptions.spec.ts: e2e proving add/remove of an order and a prescription plus the quantity guard, against seeded in_consultation visit d0..04"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic remove with rollback + sonner toast (mirrors queue-row.tsx/consult-client.tsx): row removed from local list immediately, DB delete() fired in background, row restored + toast.error on failure"
    - "Client-side medicine combobox: Input value filters an already-fetched Medicine[] prop by substring (no server round-trip), so free-text user input never reaches a PostgREST filter string (T-02-20)"
    - "zod .min(1) instead of .uuid() for ids sourced from a trusted already-fetched list whose ids are not RFC4122-conformant (seed data uses e0..01-style ids, not real v4 UUIDs) -- .uuid() silently rejects them"

key-files:
  created:
    - "apps/web/src/app/doctor/consult/[appointmentId]/orders-section.tsx"
    - "apps/web/src/app/doctor/consult/[appointmentId]/prescriptions-section.tsx"
    - apps/web/e2e/doctor-orders-prescriptions.spec.ts
  modified:
    - "apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx"

key-decisions:
  - "Relaxed prescriptions zod schema's medicine_id from z.string().uuid() to z.string().min(1) -- discovered live that seed medicine ids (e0000000-0000-0000-0000-000000000001) fail zod's strict RFC4122 uuid() format check (no valid version/variant nibbles), which made every valid medicine selection fail validation with 'Pick a medicine'; a non-empty check is sufficient since the id always comes from the trusted, already-fetched medicines array, never user-typed"
  - "Hardened the e2e spec's remove assertions to wait for the actual DELETE REST response (not just the optimistic UI update) before the test ends -- discovered live that Playwright closing the page right after an instant UI-only assertion could cancel the in-flight background delete, leaving orphaned rows in the seeded visit across repeated runs (found via direct REST inspection: 2 leftover 'Chest X-ray PA view' orders + 1 leftover prescription after early iterations)"
  - "Scoped the quantity-guard e2e assertion to page.getByRole('alert') instead of a bare text match -- the generic getByText(/quantity/i) hit a strict-mode violation matching both the 'Quantity' field label and the inline zod error"
  - "Restarted the dev server mid-verification after a transient Next.js dev-server webpack/HMR module-resolution corruption (unrelated to this plan's code) caused every e2e spec including unrelated ones (login.spec.ts) to fail; a clean .next removal + restart resolved it and the full suite (minus the pre-existing reception-queue.spec.ts seed-drift) passed"

requirements-completed: [DOC-04]

# Metrics
duration: ~20min
completed: 2026-07-10
---

# Phase 2 Plan 7: Orders + Prescriptions Summary

**OrdersSection (type/instructions, insert-with-visit-id, removable) and PrescriptionsSection (client-filtered medicine combobox, dosage/duration/positive-int quantity) wired into the doctor consultation view, with a live-verified add/remove/reopen-continuity e2e.**

## Performance

- **Duration:** ~20 min (first commit 10:25:15 IST -> last commit 10:34:30 IST, plus verification/cleanup passes)
- **Started:** 2026-07-10T04:55:15Z
- **Completed:** 2026-07-10T05:05:19Z
- **Tasks:** 3 (Task 1 RED -> Task 2 -> Task 3 GREEN)
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `orders-section.tsx`: loads this-visit orders by `visit_id` on mount (D-18 reopen continuity), a type-select (lab/ct/mri/xray) + instructions textarea + Add button that inserts against the real `visitId` (D-17), and a removable this-visit list (optimistic row delete with rollback + toast on failure)
- `prescriptions-section.tsx`: a searchable medicine combobox (client-side `Array.filter` over the already-loaded `medicines` prop -- up to 8 matches, `role="listbox"`/`role="option"`/`aria-expanded` a11y, selected-medicine chip with a clear button), dosage/duration/quantity inputs with zod validation (quantity `int().positive()`, T-02-19), insert against the real `visitId`, and a removable this-visit list
- Both sections wired into `consult-client.tsx` at the Plan-07 mount point, rendered only while `status === "in_consultation"` and a `visitId` exists
- `doctor-orders-prescriptions.spec.ts`: 3 specs (order add/remove, prescription add/remove via the medicine search, quantity-must-be-positive-int guard) against seeded appointment `c0..04` (Diya Patel, existing visit `d0..04`) -- all pass, stable across repeated runs, and leave the DB in its original seeded state (idempotent)
- Live-verified D-18 reopen continuity with a scratch (uncommitted) Playwright spec: an added order survives a full navigation away and back to the consult page, then was cleaned up
- `pnpm --filter @light/web typecheck` and `build` both pass; full e2e suite green apart from the pre-existing, out-of-scope `reception-queue.spec.ts` seed-drift (logged in `deferred-items.md` by Plan 02-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing add/remove e2e for orders + prescriptions (RED)** - `2ffea3f` (test)
2. **Task 2: OrdersSection — add + removable this-visit list (DOC-04)** - `34da7d6` (feat)
3. **Task 3: PrescriptionsSection — medicine combobox + fields → e2e GREEN** - `fd447d5` (feat)

**Plan metadata:** pending (docs: complete plan — added after this summary)

## Files Created/Modified
- `apps/web/e2e/doctor-orders-prescriptions.spec.ts` - Order/prescription add+remove e2e + quantity guard, targeting seeded `c0..04`/`d0..04`
- `apps/web/src/app/doctor/consult/[appointmentId]/orders-section.tsx` - This-visit orders: load, add (type+instructions, real visit_id), removable list
- `apps/web/src/app/doctor/consult/[appointmentId]/prescriptions-section.tsx` - This-visit prescriptions: medicine combobox, dosage/duration/quantity (zod), removable list
- `apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx` - Imports and mounts both sections at the Plan-07 placeholder; removed the now-obsolete `void medicines;` unused-prop workaround

## Decisions Made
See `key-decisions` in frontmatter. Highlights: the `.uuid()` → `.min(1)` zod relaxation was required because seed medicine ids aren't RFC4122-conformant; the e2e remove-assertions now wait for the real DELETE response (not just the optimistic UI) to keep the seeded visit's DB state idempotent across runs; a mid-verification dev-server restart cleared an unrelated Next.js HMR module-cache corruption that was briefly failing every spec including `login.spec.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] zod `.uuid()` rejected valid seed medicine ids**
- **Found during:** Task 3 GREEN verification (first live e2e run)
- **Issue:** `prescriptions-section.tsx`'s schema used `z.string().uuid("Pick a medicine")` for `medicine_id`. Zod 4's `.uuid()` enforces RFC4122 version (1-8) and variant (8/9/a/b) nibbles; the seeded medicine ids (`e0000000-0000-0000-0000-000000000001`, etc.) don't have those nibbles, so `.uuid()` always failed even when a real medicine was correctly selected — every add attempt showed "Pick a medicine" regardless of selection.
- **Fix:** Changed to `z.string().min(1, "Pick a medicine")`. The id is never user-typed (it only ever comes from clicking a combobox option populated from the already-fetched, RLS-scoped `medicines` prop), so a non-empty check is sufficient and preserves the "must pick a medicine" UX guard without depending on UUID format.
- **Files modified:** `apps/web/src/app/doctor/consult/[appointmentId]/prescriptions-section.tsx`
- **Verification:** Confirmed via direct zod REPL test that `.uuid()` rejected the seed id and `.min(1)` accepts it; re-ran the e2e spec, prescription add/remove now passes.
- **Committed in:** `fd447d5` (part of Task 3's commit)

**2. [Rule 1 - Bug] Optimistic-remove e2e assertions raced the background DELETE, leaving orphaned rows**
- **Found during:** Task 3 GREEN verification, iteration 2 (direct REST inspection after a failing run)
- **Issue:** Both sections' remove handlers update the UI list immediately and fire the `delete()` network call in the background (per the plan's optimistic-remove spec). The e2e spec's original remove assertions only waited for the DOM to update (`toHaveCount(0)`), which resolves before the DELETE request completes; Playwright then closes the page for the next test, which can cancel the in-flight request. Confirmed live via direct REST query: after two failed iterations, visit `d0..04` had 2 leftover "Chest X-ray PA view" orders and 1 leftover Paracetamol prescription that were never actually deleted server-side.
- **Fix:** Added a `removeAndAwaitPersisted` helper in the e2e spec that sets up `page.waitForResponse(...)` for the matching `DELETE /rest/v1/{table}` request before clicking Remove, and awaits it before the row-count assertion.
- **Files modified:** `apps/web/e2e/doctor-orders-prescriptions.spec.ts`
- **Verification:** Manually deleted the 3 orphaned rows via a REST cleanup script, then re-ran the spec twice in a row — both runs passed and left `orders`/`prescriptions` for `d0..04` empty afterward (confirmed via direct REST query each time).
- **Committed in:** `fd447d5` (part of Task 3's commit)

**3. [Rule 1 - Bug] Strict-mode locator violation in the quantity-guard spec**
- **Found during:** Task 3 GREEN verification, iteration 2
- **Issue:** `page.getByText(/quantity/i)` matched both the "Quantity" field `<label>` and the inline `role="alert"` validation message, causing a Playwright strict-mode error rather than a real assertion failure.
- **Fix:** Scoped the assertion to `page.getByRole("alert").filter({ hasText: /quantity/i })`, matching the plan's own spec (`prescriptions-section.tsx` shows validation failures inline with `role="alert"`).
- **Files modified:** `apps/web/e2e/doctor-orders-prescriptions.spec.ts`
- **Committed in:** `fd447d5` (part of Task 3's commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs found via live e2e verification, not caught by typecheck/build)
**Impact on plan:** All three were required for the e2e to be a trustworthy, idempotent proof of DOC-04; none change the plan's specified UI/data behavior (insert-with-real-visit_id, optimistic remove, zod-guarded quantity) — only the medicine-id format assumption and the test's own network-completion handling.

## Issues Encountered
- Mid-verification, the Next.js dev server hit a transient webpack/HMR module-resolution corruption (`Could not find the module ".../segment-explorer-node.js"` / `__webpack_modules__[moduleId] is not a function`) that made every e2e spec fail at the login step, including specs unrelated to this plan (`login.spec.ts`). Confirmed via a direct `supabase-js` sign-in call (succeeded) that this was a dev-server/bundler issue, not an auth or app-code regression. Resolved by killing the dev server, removing `apps/web/.next`, and restarting — the full suite then passed as expected. Not a code change; not logged as a deviation since no source file was at fault.

## User Setup Required

None — no new external service configuration. (Supabase project `rylceydkrydmpysmibba` and seeded doctor credentials, already configured in prior plans, were used as-is.)

## Next Phase Readiness

- Phase 02 (reception-doctor-flow) is now fully executed: plans 01-08 all have summaries. `/doctor/consult/[appointmentId]` covers DOC-02/03/04 end-to-end (history tabs, Start/Complete lifecycle, orders, prescriptions), and `/doctor/patients/[id]` (Plan 02-08) already renders orders/prescriptions in cross-visit history using the same shapes these sections write.
- No new integration points opened for a future plan — orders/prescriptions inserted here immediately become visible to Phase 3's diagnostics/pharmacy portals (per DOC-04's purpose) once those portals are built.
- `apps/web/e2e/reception-queue.spec.ts`'s pre-existing seed-drift failures (from Plan 02-02/02-06, unrelated to this plan) remain open in `deferred-items.md` as a gap-closure candidate.

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 5 claimed files found on disk (orders-section.tsx, prescriptions-section.tsx, doctor-orders-prescriptions.spec.ts, consult-client.tsx, this SUMMARY); all 3 claimed commit hashes (2ffea3f, 34da7d6, fd447d5) found in git history.
