---
phase: 02-reception-doctor-flow
plan: 04
subsystem: payments
tags: [supabase, postgrest, zod, sonner, reception, billing, payments]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: todayISTRange/formatIST helpers, Supabase client factories, APPOINTMENT_STATUS_BADGE literal-class convention; 02-03: page.tsx/`<feature>-client.tsx`/Sheet-hosted-form composition pattern"
provides:
  - "/reception/billing: today's completed visits LEFT JOIN payments — needs-billing vs paid/pending/failed/refunded badges, services-rendered (diagnosis + orders count) context column"
  - "payment-form.tsx: zod-validated Sheet form (amount positive, method cash/card/upi), inserts payments row with status: \"paid\""
  - "PAYMENT_STATUS_BADGE in lib/status.ts — reusable payment-status color map, mirroring APPOINTMENT_STATUS_BADGE (D-22)"
affects: [02-05, 02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "On-demand (non-realtime) client fetch-on-mount + explicit refetch-after-mutation for screens that don't need live cross-staff updates (billing is a single-receptionist, counter-side action, unlike the live queue/doctor-today lists which use useRealtimeList)"

key-files:
  created:
    - apps/web/src/app/reception/billing/page.tsx
    - apps/web/src/app/reception/billing/billing-client.tsx
    - apps/web/src/app/reception/billing/payment-form.tsx
  modified:
    - apps/web/src/lib/status.ts

key-decisions:
  - "PaymentForm props kept to { visitId, patientId, onRecorded } per Task 2's explicit signature, omitting the `amountHint` mentioned only in Task 1's prose usage example — there is no fee-schedule data source to populate it from, and Task 2 (which owns payment-form.tsx) never defines it as a prop."
  - "No useRealtimeList for billing — the D-25 query runs once on mount and again via an explicit refetch() after a payment is recorded; billing is a single-receptionist counter action, not a shared live view like the queue/doctor-today lists, and the plan's Task 1 action describes exactly this on-mount/after-record refetch shape."
  - "Added PAYMENT_STATUS_BADGE to the existing lib/status.ts (next to APPOINTMENT_STATUS_BADGE) rather than inlining the color map in billing-client.tsx, keeping the D-22 literal-Tailwind-class convention centralized and reusable by any future payments view."

requirements-completed: [RECEP-06]

# Metrics
duration: ~30min
completed: 2026-07-10
---

# Phase 2 Plan 4: Reception Billing Summary

**Today's completed-visits billing list (needs-billing vs paid/pending badges, diagnosis + orders-count context) with a zod-validated record-payment Sheet that inserts a `payments` row as `paid` — live-verified end-to-end against the dev server and real Supabase data.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-09T~19:00Z (approx.)
- **Completed:** 2026-07-09T19:31:32Z
- **Tasks:** 2 (both code-complete, typechecked, built, and live-verified)
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- `/reception/billing`: `billing-client.tsx` runs the D-25 query (`visits` LEFT JOIN `payments`, plus `orders(id)` for the services-rendered count) scoped to today's IST window via `todayISTRange`, filtered to `completed_at is not null`, ordered newest-first
- Loading skeleton / destructive-error-with-retry / `EmptyState` ("No completed visits to bill today") / populated table states, each row showing patient name+phone, completed time (`formatIST`), diagnosis + orders-count chip, and either an amber "Needs billing" badge + "Record payment" button, or the payment's status badge (paid=green, pending=amber, failed=red, refunded=slate-outline) + `₹` amount
- `payment-form.tsx`: zod schema (`amount: z.coerce.number().positive()`, `method: z.enum(["cash","card","upi"])`), native `Select`/`SelectItem` method picker, inserts into `payments` with `status: "paid"` always (reception collects at the counter — no separate pending-collection flow in v1), inline field error on invalid input, `sonner` toast on success/failure, submit disabled while in flight
- `PAYMENT_STATUS_BADGE` added to `lib/status.ts` next to `APPOINTMENT_STATUS_BADGE`, same literal-Tailwind-class convention (D-22) so the content scan keeps the classes in the production build
- Confirmed the reception role has no RLS denial on either the D-25 read (visits→patients/orders/payments join) or the `payments` insert — verified independently via direct REST calls with a reception-role access token (insert + delete round-trip, cleaned up before app-level testing began)
- Live-verified the full UI flow with Playwright against the running dev server and live seeded data: `d0000000-…-005` (Rohan Mehta, completed today) renders "Needs billing"; opening the Sheet, entering ₹300/cash, and submitting shows "Payment recorded", closes the Sheet, and flips the row to a green "Paid" badge with "₹300" — proving the full record→refetch→re-render loop works

## Task Commits

Each task was committed atomically:

1. **Task 1: Billing list — today's completed visits with payment status (RECEP-06)** - `38f3655` (feat)
2. **Task 2: Payment form (amount, method) recorded as paid (RECEP-06)** - `9702955` (feat)

**Plan metadata:** pending (docs: complete plan — this commit)

## Files Created/Modified
- `apps/web/src/app/reception/billing/page.tsx` - Thin client wrapper rendering `<BillingClient />`
- `apps/web/src/app/reception/billing/billing-client.tsx` - D-25 query, loading/error/empty states, billing table (needs-billing vs paid badges, services-rendered column), payment Sheet host
- `apps/web/src/app/reception/billing/payment-form.tsx` - zod-validated amount/method Sheet form, inserts `payments` row as `paid`
- `apps/web/src/lib/status.ts` - Added `PAYMENT_STATUS_BADGE` (paid/pending/failed/refunded label + literal Tailwind class map) alongside the existing `APPOINTMENT_STATUS_BADGE`

## Decisions Made
See `key-decisions` in frontmatter: `PaymentForm` props follow Task 2's explicit `{ visitId, patientId, onRecorded }` signature (no `amountHint` — no fee-schedule data source exists to populate one); billing uses on-mount/after-mutation fetch rather than `useRealtimeList` since it's a single-receptionist counter action, not a shared live view; `PAYMENT_STATUS_BADGE` lives in the shared `lib/status.ts` module rather than inline in the client component.

## Deviations from Plan

None (Rule 1-4) requiring code changes beyond the plan's own instructions. One data-only observation during live verification (not a code deviation — see Issues Encountered).

## Issues Encountered

**Stale dev-server build artifact (not a code issue):** The dev server that had been running from a previous session's `.next` directory returned a "Cannot find module './735.js'" runtime error after this session ran `pnpm --filter @light/web build` (production build) against the same `.next` folder a running `next dev` process was using. Fixed by killing the stale process, removing `.next`, and restarting `pnpm dev` cleanly — no application code was at fault.

**Seed data timestamp staleness (environment, not code):** `supabase/seed-dev.sql` seeds `d0000000-…-006` (Aarav Sharma, already paid) with `completed_at = now() - interval '30 minutes'` at *seed-application* time. That seed was last applied during an earlier session (2026-07-09). Real time has since crossed the IST midnight boundary, so that row has legitimately aged from "today" into "yesterday" IST and correctly no longer appears on `/reception/billing`'s today-scoped list — this is the `.gte/.lt` today-window filter working exactly as designed (D-25), not a bug. `d0000000-…-005` (Rohan Mehta, the needs-billing target) was seeded with `completed_at = now()` (no offset) and still lands in today's IST window, so the primary needs-billing → record-payment → paid flow was fully live-verified. Re-applying the idempotent `seed-dev.sql` (which someone with real Supabase credentials — this executor's `SUPABASE_SERVICE_ROLE_KEY` is still the documented placeholder per PROJECT.md — would need to run) would refresh `d0000000-…-006`'s timestamp back into "today" if a live demo of the already-paid row is needed.

## User Setup Required

None — no new external service configuration required. (The pre-existing note that `SUPABASE_SERVICE_ROLE_KEY` is a placeholder, and that `supabase/seed-dev.sql` needs periodic re-application by whoever holds real cloud credentials to keep its `now()`-relative demo timestamps inside "today," carries forward unchanged from 02-01.)

## Next Phase Readiness
- `PAYMENT_STATUS_BADGE` is ready for any future view that needs to render a payment's status (e.g., a patient's payment history, an admin billing report).
- The billing page/client/Sheet-form composition here follows the same pattern as 02-02 (queue) and 02-03 (patients) and is available as a reference for any remaining reception/doctor screens.
- No blockers carried forward for 02-05 (doctor today) — billing does not depend on or block the doctor-side plans.

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 4 claimed files found on disk; both claimed commit hashes (38f3655, 9702955) found in git history.
