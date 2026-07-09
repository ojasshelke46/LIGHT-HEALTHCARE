---
phase: 02-reception-doctor-flow
plan: 03
subsystem: ui
tags: [supabase, postgrest, zod, sonner, reception, patients]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: ageFromDob/formatIST/APPOINTMENT_STATUS_BADGE helpers, Supabase client factories; 02-02: RLS recursion fix confirmed live, client-realtime-list page composition pattern"
provides:
  - "/reception/patients: injection-safe (sanitizeSearchTerm) server-side name/phone/ABHA search, debounced 300ms, capped 50"
  - "register-form.tsx: zod-validated register Sheet (10-digit phone, optional dob/email/address/abha_id), friendly duplicate-phone toast"
  - "/reception/patients/[id]: read-only server component — info card + appointment history (status badges) + visit history"
  - "apps/web/src/lib/search.ts — sanitizeSearchTerm, reusable by any future PostgREST .or() search (billing, doctor/patients)"
affects: [02-04, 02-05, 02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sanitizeSearchTerm(raw) strips PostgREST filter metacharacters (, ( ) * % \\) and caps length before interpolation into any .or() ilike filter — reuse for every future free-text search against PostgREST"
    - "Client search-page composition: page.tsx (thin wrapper) + <feature>-client.tsx (debounced state + query) + a Sheet-hosted form component with an onCreated(id) callback, mirroring 02-02's page/client/row split"

key-files:
  created:
    - apps/web/src/lib/search.ts
    - apps/web/src/app/reception/patients/page.tsx
    - apps/web/src/app/reception/patients/patients-client.tsx
    - apps/web/src/app/reception/patients/register-form.tsx
    - "apps/web/src/app/reception/patients/[id]/page.tsx"
  modified: []

key-decisions:
  - "On successful registration, close the Sheet and router.push to the new patient's detail page (chosen over re-running the current search — the plan offered both as acceptable) since a receptionist who just registered a patient almost always wants to see/confirm the new record immediately."
  - "Verified the full flow (search, appointment/visit joins, duplicate-phone 23505, insert) directly against live seeded data via REST using a reception-role token, since RLS is now confirmed fixed per this session's environment notes — no new RLS denials encountered."

requirements-completed: [RECEP-04, RECEP-05]

# Metrics
duration: ~25min
completed: 2026-07-10
---

# Phase 2 Plan 3: Reception Patient Registry Summary

**Injection-safe server-side patient search (name/phone/ABHA, debounced, capped 50), a zod-validated register Sheet with a friendly duplicate-phone toast, and a read-only patient detail page with appointment + visit history — verified end-to-end against live seeded data via reception-role REST calls.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-10 (session start)
- **Completed:** 2026-07-10
- **Tasks:** 2 (both code-complete, typechecked, built, and live-verified)
- **Files modified:** 5 (5 created)

## Accomplishments
- `apps/web/src/lib/search.ts`: `sanitizeSearchTerm` strips PostgREST filter metacharacters (`, ( ) * % \`) and caps input to 40 chars before it's interpolated into an `.or()` ilike filter (T-02-07 mitigation)
- `/reception/patients`: `patients-client.tsx` — controlled search input debounced 300ms, server-side `.or("name.ilike...,phone.ilike...,abha_id.ilike...")` query capped at 50 rows, loading skeleton / destructive error / pre-search prompt / no-results empty states, results table linking to each patient's detail page, and a "Register patient" button opening a right-side `Sheet`
- `register-form.tsx`: zod schema (name required, phone `^[0-9]{10}$`, dob/email/address/abha_id optional-or-empty-string), inline `role="alert"` field error, insert into `patients` mapping empty optionals to `null`, unique-violation (`23505`/"duplicate") → friendly toast distinct from the generic failure toast, success → `sonner` toast + `onCreated(id)` closing the Sheet and navigating to the new patient's detail page
- `/reception/patients/[id]/page.tsx`: async server component loading patient + appointment history (`doctors(staff(name))` join, IST datetime, status badge) + visit history (date, chief complaint, diagnosis) in parallel via `Promise.all`; "Patient not found" `EmptyState` on a null patient, per-section empty states for zero appointments/visits
- Live-verified every acceptance path against the real Supabase project using a reception-role access token (direct REST, bypassing the app): free-text search by name and by partial phone both return the correct seeded rows; the patient/appointment/visit joins used by the detail page return correctly shaped data (doctor name via nested join, IST-formattable timestamps); a duplicate-phone insert returns `409`/`23505` exactly as the register form's error-branch expects; a valid insert with a fresh unique phone succeeds (`201`) and was cleaned up afterward so it doesn't pollute the dev seed

## Task Commits

Each task was committed atomically:

1. **Task 1: sanitizeSearchTerm + patients search page + register Sheet (RECEP-04 search, RECEP-05)** - `a8b7b9a` (feat)
2. **Task 2: Patient detail page — info + appointment + visit history (RECEP-04)** - `f769d8d` (feat)

**Plan metadata:** pending (docs: complete plan — this commit)

## Files Created/Modified
- `apps/web/src/lib/search.ts` - `sanitizeSearchTerm` — strips PostgREST `.or()` metacharacters, caps to 40 chars
- `apps/web/src/app/reception/patients/page.tsx` - Thin client wrapper rendering `<PatientsClient />`
- `apps/web/src/app/reception/patients/patients-client.tsx` - Debounced server-side search (name/phone/ABHA), results table, register-Sheet trigger + wiring
- `apps/web/src/app/reception/patients/register-form.tsx` - zod-validated register form: 10-digit phone, optional fields, friendly duplicate-phone toast
- `apps/web/src/app/reception/patients/[id]/page.tsx` - Server component: patient info card + appointment history (status badges) + visit history, not-found/empty states

## Decisions Made
- See `key-decisions` in frontmatter: register success routes to the new patient's detail page (not a search re-run) for a tighter registration→confirmation loop; full flow was independently verified against live data via reception-role REST calls (search, joins, duplicate 23505, insert) rather than only trusting typecheck/build, since 02-02 flagged the reception role as the one previously affected by the (now-fixed) RLS recursion bug.

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 triggers encountered; the RLS recursion bug that blocked 02-02 was already fixed upstream before this plan started (per this session's environment notes) and was independently reconfirmed fixed via direct REST verification rather than re-diagnosed.

## Issues Encountered

None. `pnpm --filter @light/web typecheck` and `pnpm --filter @light/web build` both pass cleanly (the only build warning is the pre-existing, unrelated Edge-runtime `process.version` notice already documented in 02-02-SUMMARY.md, not a new regression).

## User Setup Required

None - no external service configuration required. (The RLS fix this plan depended on was already applied by the orchestrator before this session started, per the environment notes.)

## Next Phase Readiness
- `sanitizeSearchTerm` is ready for any future PostgREST free-text search (doctor's all-patients search in 02-08, billing lookups in 02-04 if needed).
- The page.tsx / `<feature>-client.tsx` / Sheet-hosted-form composition pattern here mirrors 02-02's queue-client/queue-row split and is ready to be reused by 02-04 (billing) and 02-08 (doctor all-patients).
- No blockers carried forward. RECEP-04/RECEP-05 requirements marked complete (see REQUIREMENTS.md).

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 5 claimed files found on disk; both claimed commit hashes (a8b7b9a, f769d8d) found in git history.
