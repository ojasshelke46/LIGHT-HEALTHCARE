---
phase: 02-reception-doctor-flow
plan: 01
subsystem: infra
tags: [supabase, realtime, react-hooks, vitest, tailwind, seed-data]

# Dependency graph
requires:
  - phase: 01-staff-auth-shared-shell
    provides: DashboardLayout shell, ROLE_THEME scaffolding, Supabase client factories, StaffRole/AppointmentStatus types
provides:
  - "supabase/seed-dev.sql — idempotent dev seed covering every Phase-2 flow (queue, doctor today, consult, billing, prescriptions)"
  - "useRealtimeList — the single realtime-list hook every reception/doctor list will consume (D-15/D-16)"
  - "Reception nav (Queue/Patients/Billing) and doctor nav (Today's Patients/All Patients) per D-31"
  - "APPOINTMENT_STATUS_BADGE, ageFromDob, todayISTRange shared display helpers"
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: [vitest, "@testing-library/react", jsdom]
  patterns:
    - "useRealtimeList(fetcher, tables) as the ONLY realtime primitive — refetch-on-change, not patch-in-place, because rows need joined data"
    - "fetcherRef pattern to keep the realtime subscription effect stable across inline-fetcher re-renders"
    - "Literal (non-interpolated) Tailwind class maps for role/status colors, matching the existing theme.ts convention"
    - "Fixed-uuid + `on conflict do update` idempotent seed pattern for all dev seed data"

key-files:
  created:
    - supabase/seed-dev.sql
    - apps/web/src/lib/hooks/use-realtime.ts
    - apps/web/src/lib/hooks/use-realtime.test.ts
    - apps/web/vitest.config.ts
    - apps/web/src/lib/status.ts
    - apps/web/src/lib/patient.ts
    - apps/web/src/lib/time.ts
  modified:
    - apps/web/src/lib/theme.ts
    - apps/web/package.json

key-decisions:
  - "Installed vitest + @testing-library/react + jsdom as the unit-test stack (first unit tests in the repo) to honor the task's tdd=\"true\" RED/GREEN flow — Playwright e2e config untouched"
  - "Verified seed-dev.sql against a local scratch Postgres schema (create + idempotent re-run) since this executor cannot apply SQL to the cloud project"

requirements-completed: []  # RECEP-01/DOC-01 are listed in this plan's frontmatter but deliberately NOT checked off here — see Decisions Made

# Metrics
duration: 15min
completed: 2026-07-09
---

# Phase 2 Plan 1: Realtime Foundation, Dev Seed & Nav Summary

**Idempotent Phase-2 dev seed plus a single reconnection-resilient `useRealtimeList` hook (debounced refetch, exponential backoff, visibility refetch) backing the updated reception/doctor navigation and shared status/age/IST helpers.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-09T23:40:00+05:30 (approx.)
- **Completed:** 2026-07-09T23:55:17+05:30
- **Tasks:** 3 (Task 2 executed as RED -> GREEN TDD)
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments
- `supabase/seed-dev.sql`: 3 patients, 6 doctor slots today, 6 appointments in mixed statuses (booked/checked_in/in_consultation/completed), 3 visits (one in-progress, two completed), 8 medicines, 1 order + 1 prescription, 1 payment — smoke-tested for syntax/FK correctness and idempotency against a local scratch Postgres schema
- `useRealtimeList` hook: fetch-once-on-mount, 300ms-debounced refetch on any watched-table postgres_changes event, exponential-backoff reconnect (1s -> 2s -> ... capped 30s) on CHANNEL_ERROR/TIMED_OUT/CLOSED, refetch on tab visibility, driven by 5 passing unit tests
- Reception/doctor `ROLE_THEME` nav updated to match D-31 exactly
- `APPOINTMENT_STATUS_BADGE`, `ageFromDob`, `todayISTRange` helpers ready for every downstream Phase-2 list/detail page

## Task Commits

Each task was committed atomically:

1. **Task 1: Idempotent dev seed for every Phase-2 flow** - `557e8cf` (feat)
2. **Task 2: useRealtimeList hook with reconnection (D-15, D-16)** - `3e45555` (test — RED), `7b95a49` (feat — GREEN)
3. **Task 3: Role nav (D-31) + status badge / age / IST helpers** - `ab0060a` (feat)

**Plan metadata:** pending (docs: complete plan — added after this summary)

_Note: Task 2 followed strict TDD (RED then GREEN); no REFACTOR commit was needed — the first GREEN implementation passed all 5 tests and typecheck cleanly._

## Files Created/Modified
- `supabase/seed-dev.sql` - Idempotent dev seed for every Phase-2 flow (orchestrator applies to cloud project)
- `apps/web/src/lib/hooks/use-realtime.ts` - `useRealtimeList` hook (D-15/D-16)
- `apps/web/src/lib/hooks/use-realtime.test.ts` - 5 behavior tests (mount fetch, debounce, backoff reconnect, visibility refetch, error handling)
- `apps/web/vitest.config.ts` - jsdom unit-test config, scoped to `src/**/*.test.{ts,tsx}`
- `apps/web/src/lib/status.ts` - `APPOINTMENT_STATUS_BADGE` (D-22 literal Tailwind colors)
- `apps/web/src/lib/patient.ts` - `ageFromDob` helper
- `apps/web/src/lib/time.ts` - `todayISTRange` IST day-bound helper
- `apps/web/src/lib/theme.ts` - Reception/doctor `nav` arrays updated to D-31; dropped now-unused `Stethoscope` import
- `apps/web/package.json` - Added `vitest`/`@testing-library/react`/`jsdom` devDependencies and a `test` script

## Decisions Made
- Installed a minimal unit-test stack (vitest + @testing-library/react + jsdom) specifically to fulfill Task 2's `tdd="true"` RED/GREEN requirement — this is new infrastructure (first unit tests in the repo) but scoped narrowly: one config file, one script, no change to the existing Playwright e2e setup.
- Refactored the doctor-slot / appointment slot-time SQL into a `VALUES` table joined against a single `doc` CTE per statement, rather than repeating the `with doc as (...)` clause per row — functionally identical to the plan's formula, just DRYer.
- Verified `seed-dev.sql` (both first-run and idempotent re-run) against a disposable local Postgres schema mirroring the generated `Database` types, since this executor has no access to apply SQL to the cloud project.
- Deferred marking RECEP-01/DOC-01 complete in REQUIREMENTS.md, matching the Phase-1 precedent (01-01 deferred AUTH-02/SHELL-01 the same way): this plan is foundation-only (seed, hook, nav, helpers) — no `/reception` queue page or `/doctor` today-list page exists yet, so the user-facing behavior those requirements describe is not yet true. `gsd-sdk query requirements.mark-complete` initially checked both boxes off (it applies literally to whatever IDs are in a plan's frontmatter, regardless of whether the plan's own deliverables satisfy the requirement text); reverted both to `[ ]` in `.planning/REQUIREMENTS.md` immediately after. They will be marked complete when 02-02 (RECEP-01) and 02-05 (DOC-01) land and their own verification proves the live queue/today-list pages work.

## Deviations from Plan

None - plan executed exactly as written. The vitest/testing-library install is the mechanism the plan's own `tdd="true"` attribute and `<tdd_execution>` workflow call for (installing a test framework "if needed" for the first TDD task), not a scope addition beyond the plan.

## Issues Encountered
None.

## User Setup Required

**`supabase/seed-dev.sql` must be applied to the cloud project by the orchestrator** — this executor cannot run SQL against `rylceydkrydmpysmibba`. Recommended: `psql "$DATABASE_URL" -f supabase/seed-dev.sql` or paste into the Supabase SQL editor. It is idempotent and safe to re-run. Any Wave-2+ acceptance criteria or e2e specs that depend on live seeded rows (e.g., an actual booked/checked_in appointment visible in `/reception`) will not pass until this script has been applied.

## Next Phase Readiness
- `useRealtimeList`, `APPOINTMENT_STATUS_BADGE`, `ageFromDob`, `todayISTRange`, and the updated nav are ready for every downstream 02-0x plan (queue, patients, billing, doctor today, consultation, doctor all-patients) to consume directly.
- Blocker for full end-to-end verification of later plans: `supabase/seed-dev.sql` has not yet been applied to the cloud project (see User Setup Required above).

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-09*

## Self-Check: PASSED

All 8 claimed files found on disk; all 4 claimed commit hashes (557e8cf, 3e45555, 7b95a49, ab0060a) found in git history.
