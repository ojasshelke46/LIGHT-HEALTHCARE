---
phase: 02-reception-doctor-flow
plan: 08
subsystem: ui
tags: [supabase, postgrest, doctor, patients, cross-visit-history]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: getStaff/ageFromDob/formatIST helpers, Supabase client factories, doctor nav (All Patients link)"
provides:
  - "/doctor/patients: distinct patients from this doctor's own visits, searchable client-side by name/phone"
  - "/doctor/patients/[id]: full cross-visit history grouped by visit (complaint/diagnosis/notes + nested orders with result links + nested prescriptions)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single nested PostgREST select (visits -> orders(...), prescriptions(..., medicines(name))) delivers grouped-by-visit history without any client-side joining"
    - "Dedupe-by-first-occurrence over a newest-first ordered query to derive 'distinct patients + latest visit date' in one round trip"

key-files:
  created:
    - apps/web/src/app/doctor/patients/page.tsx
    - apps/web/src/app/doctor/patients/patients-client.tsx
    - "apps/web/src/app/doctor/patients/[id]/page.tsx"
  modified: []

key-decisions:
  - "Client-side search only (no PostgREST filter) since the patient set is already scoped server-side to this doctor's own visits and is small — matches D-30 exactly and removes any injection surface for the search term"
  - "Live-verified both query shapes (all-patients list + nested cross-visit history) against the real Supabase project via a doctor-role REST token rather than trusting typecheck/build alone, following the 02-03/02-04/02-05 precedent"

requirements-completed: [DOC-05]

# Metrics
duration: ~15min
completed: 2026-07-10
---

# Phase 2 Plan 8: Doctor All-Patients Browser Summary

**Doctor-scoped searchable patient list plus a per-patient cross-visit history page built from a single nested PostgREST query (visits -> orders -> prescriptions/medicines), live-verified against seeded data (Rohan Mehta: Viral fever, CBC lab order with result link, Paracetamol prescription).**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-10 (session start)
- **Completed:** 2026-07-10
- **Tasks:** 2 (both typechecked, built, and live-verified)
- **Files modified:** 3 (3 created)

## Accomplishments
- `/doctor/patients`: server component queries `visits` filtered to `doctor_id = staff.id`, deduped by `patient_id` (keeping the first/newest occurrence from a newest-first ordered query) to get each distinct patient plus their latest visit date in one round trip; client component filters that array case-insensitively on name/phone with no server round trip
- `/doctor/patients/[id]`: server component loads the patient (404-safe via `maybeSingle`) plus one nested `visits` query returning `orders(...)` and `prescriptions(..., medicines(name))` already grouped by visit; renders one Card per visit (newest first) with Completed/In-progress badge, complaint/diagnosis/notes, an orders sub-list with safe `target="_blank" rel="noopener noreferrer"` result links, and a prescriptions sub-list
- Live-verified both query shapes against the real Supabase project using a doctor-role access token (direct REST, bypassing the app): the all-patients query returns exactly the 3 seeded patients scoped to this doctor; the nested history query for Rohan Mehta returns visit `d0..05` with diagnosis "Viral fever", one lab order (`CBC`, `result_url` set) and one Paracetamol prescription (`1-0-1`, 5 days, qty 10) — matching the environment notes precisely; a random/foreign patient id correctly returns an empty result (IDOR-safe, T-02-23)

## Task Commits

Each task was committed atomically:

1. **Task 1: All-patients list — distinct patients + client search (DOC-05)** - `8d562e6` (feat)
2. **Task 2: Cross-visit history page — visits with nested orders + prescriptions (DOC-05)** - `6bb269c` (feat)

**Plan metadata:** pending (docs: complete plan — this commit)

## Files Created/Modified
- `apps/web/src/app/doctor/patients/page.tsx` - Server component: loads + dedupes distinct patients from this doctor's own visits
- `apps/web/src/app/doctor/patients/patients-client.tsx` - Client-side searchable table (name/age/phone/last visit), empty states, links to detail page
- `apps/web/src/app/doctor/patients/[id]/page.tsx` - Server component: patient header + one Card per visit with nested orders (result links) and prescriptions, not-found/empty/error states

## Decisions Made
See `key-decisions` in frontmatter: client-side-only search (no PostgREST filter, no injection surface) since the list is already server-scoped to the doctor's own patients; both query shapes were independently live-verified via direct doctor-role REST calls against the real project rather than only trusting typecheck/build, continuing this phase's established verification precedent.

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 triggers encountered; no RLS denial surfaced (doctor role reads its own visits/orders/prescriptions/patients cleanly, confirmed live).

## Issues Encountered

None. `pnpm --filter @light/web typecheck` and `pnpm --filter @light/web build` both pass cleanly; all acceptance-criteria greps for both tasks pass; no `: any` in either new file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DOC-05 fully satisfied: doctor can browse every patient they've seen (searchable) and open a complete cross-visit history grouped by visit, including orders with result links and prescriptions.
- No blockers carried forward.

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 3 claimed files found on disk; both claimed commit hashes (8d562e6, 6bb269c) found in git history.
