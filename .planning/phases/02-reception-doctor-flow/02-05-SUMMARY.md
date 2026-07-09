---
phase: 02-reception-doctor-flow
plan: 05
subsystem: ui
tags: [supabase, realtime, doctor, appointments, visits]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: useRealtimeList hook, APPOINTMENT_STATUS_BADGE/ageFromDob/todayISTRange helpers, dev seed"
provides:
  - "/doctor live today list: realtime, doctor-scoped (doctor_id = staffId), slot-ordered, checked_in/in_consultation only"
  - "PatientCard component pattern (card-as-Link, aria-label summary) for the doctor consult entry point (DOC-01 -> DOC-02 handoff)"
affects: [02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server page reads getStaff().id, passes as a prop to a 'use client' child (no client-side identity fetch) — the pattern DOC-01 establishes for every doctor-scoped list"
    - "useRealtimeList watching TWO tables (appointments + visits) when a list's displayed fields span both — refetch-on-change already handles the join, only the watch-list needed extending"
    - "Whole-card Link (data-testid + aria-label summary) as the click target, mirroring queue-row's per-row testid convention but card-shaped for a grid layout"

key-files:
  created:
    - apps/web/src/app/doctor/doctor-today.tsx
    - apps/web/src/app/doctor/patient-card.tsx
  modified:
    - apps/web/src/app/doctor/page.tsx

key-decisions:
  - "Verified DOC-01 end-to-end with a scratch (uncommitted) Playwright spec against live seeded data before marking the requirement complete — doctor login -> /doctor shows both seeded cards (c0..03 checked_in, c0..04 in_consultation with 'Fever and cough'), correct badges, and correct /doctor/consult/[id] hrefs; spec was deleted after verification, not part of this plan's file scope"

requirements-completed: [DOC-01]

# Metrics
duration: ~15min
completed: 2026-07-10
---

# Phase 2 Plan 5: Doctor Today Live List Summary

**Realtime `/doctor` today list — doctor-scoped (own staff id, never client input), today (IST), checked_in/in_consultation only, each card showing name/age/slot/status/chief-complaint and linking to `/doctor/consult/[appointmentId]`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-10 (session start)
- **Completed:** 2026-07-10
- **Tasks:** 1
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `page.tsx`: async server component reading `getStaff().id` (server-verified via `getUser()` revalidation, never client-controllable — T-02-14 mitigation) and passing it to the client list
- `doctor-today.tsx`: `useRealtimeList<TodayRow>` fetcher scoped to `doctor_id = staffId` + `todayISTRange()` bounds + `status in (checked_in, in_consultation)`, ordered by `slot_time`; watches **both** `appointments` and `visits` tables (D-26 note: a newly-created visit row's `chief_complaint` must appear live too, not just appointment status changes); loading skeleton grid, destructive-error retry, and `EmptyState` per the D-13 convention; `aria-live="polite"` Live/Reconnecting indicator wired to the hook's `connected` flag
- `patient-card.tsx`: whole-card `Link` to `/doctor/consult/[appointmentId]` (`data-testid="patient-card-<id>"`), showing patient name, age via `ageFromDob` ("N/A" when `dob` is null) with " yrs" suffix, IST slot time via `formatIST(..., "time")`, `APPOINTMENT_STATUS_BADGE` colored badge, and chief complaint (`visits[0]?.chief_complaint`) when a visit row exists; single summarizing `aria-label` for screen readers, keyboard-focusable via the native `<a>` semantics of Next `<Link>`
- Verified against live seeded data (scratch, uncommitted Playwright spec, deleted after use): logging in as `doctor@test.com` shows exactly the two seeded cards for that doctor — Aarav Sharma (`c0..03`, Checked In) and Diya Patel (`c0..04`, In Consultation, "Fever and cough") — with correct badges and correct `/doctor/consult/[id]` hrefs

## Task Commits

Each task was committed atomically:

1. **Task 1: Doctor today server wrapper + live client list (DOC-01)** - `b626fda` (feat)

**Plan metadata:** pending (docs: complete plan — added after this summary)

## Files Created/Modified
- `apps/web/src/app/doctor/page.tsx` - Was a static placeholder; now an async server component reading `getStaff()` and rendering `<DoctorToday staffId={staff.id} />`
- `apps/web/src/app/doctor/doctor-today.tsx` - `DoctorToday` client component: D-26 fetcher, `useRealtimeList` wiring (watches `appointments` + `visits`), loading/error/empty states, responsive card grid; exports the `TodayRow` type
- `apps/web/src/app/doctor/patient-card.tsx` - `PatientCard` component: name/age/slot/status badge/chief-complaint display + link to consult view

## Decisions Made
- See `key-decisions` in frontmatter: DOC-01 was verified end-to-end (login as doctor, live cards, correct hrefs/badges/complaint) via a scratch Playwright spec before marking the requirement complete, matching the 02-03/02-04 precedent of only checking off a requirement once its own behavior is proven against live seeded data — the verification spec itself was not committed (outside this plan's declared `files_modified`), only the app code it exercised.

## Deviations from Plan

None - plan executed exactly as written. `doctor-today.tsx` additionally watches the `visits` table (not just `appointments`) per the plan's own Task 1 instruction ("Note: also watch...pass both table names") — this was specified in the plan itself, not an auto-fix.

## Issues Encountered

The dev server on port 3000 at session start was stale (pre-dated this session and returned HTTP 500 on `/login`) — restarted it before running the scratch verification spec. Not a code regression; same category of stale-server issue noted in 02-02's summary.

## User Setup Required

None - no external service configuration required. (Note: `supabase/seed-dev.sql`, applied in an earlier session per 02-01/02-02, already provides the `c0..03`/`c0..04` seeded rows this plan's verification depends on.)

## Next Phase Readiness
- `/doctor` now renders the live today list; `/doctor/consult/[appointmentId]` (02-06) is the next stop — this plan's cards already link there correctly (href-only verified, since the consult page doesn't exist yet).
- `PatientCard`'s whole-card-Link + aria-label pattern is available for 02-08 (doctor all-patients) to reuse if a similar card layout is wanted there.

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 4 claimed files found on disk (page.tsx, doctor-today.tsx, patient-card.tsx, this SUMMARY); claimed commit hash (b626fda) found in git history.
