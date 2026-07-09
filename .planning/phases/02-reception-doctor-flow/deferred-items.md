# Deferred Items — Phase 02 (reception-doctor-flow)

Out-of-scope discoveries logged during plan execution (not auto-fixed, per the
executor's scope-boundary rule: only fix issues directly caused by the current
task's changes).

## 02-06: reception-queue.spec.ts pre-existing failures

**Found during:** 02-06 Task 3 verification (`pnpm --filter @light/web test:e2e`).

**Issue:** `apps/web/e2e/reception-queue.spec.ts` asserts the seeded
appointments `c0000000-0000-0000-0000-000000000001` (Aarav Sharma) and
`c0000000-0000-0000-0000-000000000002` (Diya Patel) are `booked`. Both specs
mutate their appointment's status as their own test action (check-in /
no-show) and are not idempotent-tolerant — once run once against the live
Supabase project, the seed rows permanently move to `checked_in`/`no_show`
and every subsequent run fails on the `Booked` assertion. This is unrelated
to any file this plan touches (`apps/web/src/app/doctor/consult/...`,
`apps/web/e2e/doctor-consult.spec.ts`).

**Not fixed here** — out of scope for 02-06. Candidate fix (future plan or
gap-closure): either reset those two rows via a scoped re-seed before the
spec runs, or make `reception-queue.spec.ts` idempotent-tolerant the same way
`doctor-consult.spec.ts` now is (degrade gracefully / pick a fresh target
when the expected starting status is already mutated).
