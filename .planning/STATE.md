---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: 05-01 done; AI services FastAPI mocks + Dockerfile shipped, AI-01..04 complete
last_updated: "2026-07-13T22:54:21.819Z"
last_activity: 2026-07-13
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 23
  completed_plans: 23
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-09)

**Core value:** The live patient flow — book → check-in → consult → order tests → dispense → bill — works end-to-end in real time across every role portal without a page refresh.
**Current focus:** Phase 05 — ai-services

## Current Position

Phase: 05 (ai-services) — EXECUTING
Plan: 1 of 1
Status: Phase complete — ready for verification
Last activity: 2026-07-13

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 12min | 3 tasks | 7 files |
| Phase 01 P02 | 8min | 2 tasks | 7 files |
| Phase 01 P03 | 10min | 3 tasks | 17 files |
| Phase 01 P04 | 6min | 3 tasks | 17 files |
| Phase 01 P05 | 20min | 1 tasks | 0 files |
| Phase 02 P01 | 15min | 3 tasks | 9 files |
| Phase 02 P02 | 55min | 3 tasks | 6 files |
| Phase 02 P03 | 25min | 2 tasks | 5 files |
| Phase 02 P04 | 30min | 2 tasks | 4 files |
| Phase 02 P05 | 15min | 1 tasks | 3 files |
| Phase 02 P08 | 15min | 2 tasks | 3 files |
| Phase 02 P06 | 20min | 3 tasks | 3 files |
| Phase 02 P07 | 20min | 3 tasks | 4 files |
| Phase 03 P01 | 10min | 3 tasks | 8 files |
| Phase 03 P02 | 10min | 3 tasks | 9 files |
| Phase 03 P04 | 12min | 2 tasks | 4 files |
| Phase 03 P05 | 25min | 3 tasks | 6 files |
| Phase 04 P01 | 35min | 3 tasks | 24 files |
| Phase 04 P03 | 16min | 3 tasks | 6 files |
| Phase 04 P04 | 15min | 2 tasks | 3 files |
| Phase 05 P01 | 15min | 2 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Auto-mode GSD init, research skipped — brief prescribes stack/features/architecture fully
- Init: Hand-rolled shadcn-style primitives in apps/web (no shadcn CLI run)
- Init: `in_consultation` (DB enum) is canonical; shared-types `in_consult` fixed
- Roadmap: Mobile (Phase 4) and AI services (Phase 5) run independent of the web staff-portal phases (2-3); both only depend on the already-validated Supabase foundation
- [Phase 01]: 01-01: Committed pre-existing uncommitted monorepo scaffold as a baseline commit before task work, so plan diffs are reviewable
- [Phase 01]: 01-01: Deferred marking AUTH-02/SHELL-01 complete in REQUIREMENTS.md -- plan is scaffold-only and its own e2e test proves them not-yet-satisfied; will mark complete when 01-03/01-05 make the e2e pass
- [Phase 01]: 01-02: Confirmed zod v4.4.3's z.string().email() still functions correctly (deprecated alias, not removed) -- used as specified in the plan rather than the newer z.email() helper
- [Phase 01]: 01-02: Documented seeded staff credentials (doctor@test.com / reception@test.com, Test1234!) return invalid_credentials from Supabase Auth in this environment -- not fixable from this plan's file scope (no working service-role key); logged as Issue, requires Supabase-side verification before Plan 03/05 e2e re-checks
- [Phase 01]: 01-03: Cast the staff .select() result to StaffIdentity after the null-guard in lib/staff.ts, mirroring the existing middleware.ts workaround for the same PostgREST TS-inference quirk
- [Phase 01]: 01-03: Confirmed the previously-blocking seeded credentials (doctor@test.com / reception@test.com, Test1234!) now authenticate -- fixed upstream in the Supabase project; walking-skeleton e2e (login.spec.ts) passes all 3 specs
- [Phase 01]: 01-04: Implemented SelectItem literally as `export const SelectItem = "option" as const` per the plan's "option"-style convenience wording -- a typed string-literal alias, no wrapper component
- [Phase 01]: 01-04: Table sub-components use forwardRef uniformly (not just Textarea/Select) for API consistency across the primitive library and to ease a future radix swap
- [Phase 01]: 01-05: Auto-approved the human-verify checkpoint (--auto chain) after exhaustive automated proxies (grep + committed e2e + supplemental scratch Playwright spec) confirmed all 5 Phase-1 success criteria; deferred 3 genuinely-visual items (tablet layout feel, drawer animation, throttled-network skeleton flash) to human review
- [Phase 01]: 01-05: Documented (not fixed, per checkpoint task's no-code-change mandate) that the login form lacks noValidate, so native HTML5 email validation shadows the zod inline-alert message for malformed emails; candidate for gap-closure
- [Phase 02]: 02-01: Installed vitest + @testing-library/react + jsdom (first unit-test stack in the repo) to fulfill Task 2's tdd="true" RED/GREEN requirement for useRealtimeList; Playwright e2e config untouched
- [Phase 02]: 02-01: Verified supabase/seed-dev.sql (create + idempotent re-run) against a disposable local Postgres schema mirroring the generated Database types, since this executor cannot apply SQL to the cloud project rylceydkrydmpysmibba -- orchestrator must apply it before Wave-2 e2e specs
- [Phase 02]: 02-01: Reverted requirements.mark-complete's premature check-off of RECEP-01/DOC-01 -- this plan is foundation-only (seed/hook/nav/helpers), no queue or doctor-today page exists yet; deferred to 02-02/02-05 respectively, matching the Phase-1 AUTH-02/SHELL-01 precedent
- [Phase 02]: 02-02: Bumped @supabase/ssr 0.6.1 -> ^0.10.3 (Rule 3) -- 0.6.1's createBrowserClient/createServerClient don't match the resolved supabase-js 2.110.1's newer 5-generic SupabaseClient signature, which silently collapsed every table's Update row type to 'never' and broke .update() typechecking repo-wide
- [Phase 02]: 02-02: Deferred marking RECEP-01/02/03 complete -- queue/row code is correct and typechecked, but reception-queue.spec.ts is blocked by a confirmed pre-existing Supabase RLS recursion bug (Postgres 54001) scoped to the reception role on staff/patients/appointments reads, reproduced via direct REST calls independent of any app code; doctor role unaffected by identical query shapes
- [Phase 02]: 02-03: On successful patient registration, route to the new patient's detail page (router.push) rather than re-running the current search -- tighter registration-to-confirmation loop for reception desk staff
- [Phase 02]: 02-03: Independently reconfirmed the RLS recursion fix (from 02-02) via direct reception-role REST calls -- search, appointment/visit joins, duplicate-phone 23505, and insert all verified against live seeded data before marking RECEP-04/05 complete
- [Phase 02]: 02-04: PaymentForm props kept to { visitId, patientId, onRecorded } per Task 2's explicit signature -- no amountHint prop exists since there's no fee-schedule data source to populate it
- [Phase 02]: 02-04: Billing list uses on-mount + after-mutation fetch (no useRealtimeList) -- billing is a single-receptionist counter action, not a shared live view like the queue/doctor-today lists
- [Phase 02]: 02-04: Live-verified reception-role RLS on payments (read via D-25 join, insert+delete round-trip) via direct REST before app-level testing -- no RLS denial; also confirmed full record-payment UI flow against live seeded data (d0..05 needs-billing -> paid) via Playwright
- [Phase 02]: 02-05: Verified DOC-01 end-to-end (login as doctor, live checked-in/in-consultation cards, correct badges/complaint/hrefs) with a scratch uncommitted Playwright spec before marking the requirement complete, matching the 02-03/02-04 precedent
- [Phase 02]: 02-08: Doctor all-patients search stays client-side only (no PostgREST filter) since the list is already server-scoped to the doctor's own visits via getStaff() -- removes any search-term injection surface (T-02-23)
- [Phase 02]: 02-08: Live-verified both the all-patients list query and the nested cross-visit history query (visits->orders->prescriptions/medicines) against the real Supabase project via a doctor-role REST token -- confirmed Rohan Mehta's seeded visit (Viral fever, CBC lab order with result link, Paracetamol prescription) renders exactly as expected, no RLS denial
- [Phase 02]: 02-08 was executed out of sequence (plans 06/07 -- consultation flow -- have no SUMMARY yet); 02-08 only depends on 02-01 (wave 2, independent of 06/07) so this is safe, but the STATE.md 'Plan: N of 8' counter reflects a simple increment, not true completion order -- 06 and 07 still need to be executed before the phase is fully done
- [Phase 02]: 02-06: Split page.tsx and consult-client.tsx across two task commits per the plan, even though only HEAD (not each isolated commit) typechecks -- wrote both files' final content first, then staged/committed separately
- [Phase 02]: 02-06: Found and fixed a live race condition (Start's optimistic status flip lets Complete fire before Start's own visit-insert resolves, racing two ensureVisit() calls into duplicate visits rows) via a visitCreationRef in-flight-insert-promise memo, confirmed by a scratch Playwright spec + direct REST query
- [Phase 02]: 02-06: Logged reception-queue.spec.ts's 2 pre-existing failures (seed rows mutated non-idempotently by earlier runs) to deferred-items.md rather than fixing them -- out of this plan's file scope
- [Phase 02]: 02-07: Relaxed prescriptions zod schema's medicine_id from z.string().uuid() to z.string().min(1) -- seed medicine ids are not RFC4122-conformant, which zod's strict uuid() format rejected even for valid selections; id always comes from the trusted, already-fetched medicines array
- [Phase 02]: 02-07: Hardened the e2e spec's remove assertions to wait for the actual DELETE REST response (not just optimistic UI) -- Playwright closing the page right after an instant UI-only assertion could cancel the in-flight background delete, leaving orphaned this-visit rows
- [Phase 02]: 02-07: Phase 02 (reception-doctor-flow) fully executed -- all 8 plans (01-08) now have summaries
- [Phase 03]: 03-01: Rendered ResultLink as a bare <button> (not the shared Button primitive) to preserve the exact text-blue-600 hover:underline visual it replaces, matching plan spec literally
- [Phase 03]: 03-01: Left doctor pages' pre-existing local OrderType/OrderStatus/PrescriptionStatus type aliases untouched -- only the result_url render sites changed; migrating to the new status.ts exports is out of this task's file scope
- [Phase 03]: 03-01: Reverted requirements.mark-complete's premature check-off of DIAG-02/DIAG-03 -- this plan is foundation-only (nav/getResultUrl/ResultLink/helpers/doctor-refactor), no upload/complete flow or completed-orders browse page exists yet; deferred to 03-02/03-03 respectively, matching the Phase-1/Phase-2 precedent
- [Phase 03]: 03-02: Added a dependency-free .env.local loader to playwright.config.ts (Rule 3) so specs using supabase-js directly from the Node test process see NEXT_PUBLIC_SUPABASE_URL/ANON_KEY
- [Phase 03]: 03-02: Diagnostics rows hide optimistically before the async upload/update chain resolves (not after), so the row leaves the list independent of when the realtime refetch lands
- [Phase 03]: 03-02: 20MB file-size guard runs at file-selection time (onChange), not at submit time, per the plan's 'if a file is chosen ... abort' wording
- [Phase 03]: 03-04: Dispense button's native disabled reflects only the in-flight request, not insufficient-stock -- a hard-disabled button never dispatches a click event in real browsers, which would make the RPC's atomic guard unreachable; insufficient stock is shown via badge + muted styling only, matching threat model T-03-11 ('button disable is UX-only, server is authoritative')
- [Phase 03]: 03-04 was executed out of sequence relative to 03-03 (diagnostics completed) -- 03-04 only depends on 03-01 per its frontmatter depends_on, so this is safe; 03-03 still needs to run before Phase 3 is fully done, matching the 02-08 precedent
- [Phase 03]: 03-05: e2e includes an extra add-medicine Sheet round-trip test (Date.now()-unique name, deleted in finally) beyond the plan's required inline-edit test -- add-medicine is a must_have truth and environment notes mandated unique names + deletion for spec-added medicines
- [Phase 03]: 03-05: inline stock edit silently ignores invalid input (non-integer/negative) per plan wording, reverting the cell to display mode with no write -- the inventory cell is a fast counter-side control, not a form
- [Phase 03]: 03-05: executed before 03-03 (wave 2, depends only on 03-01) matching the 02-08/03-04 out-of-sequence precedent -- 03-03 is the only Phase-3 plan remaining
- [Phase 04]: 04-01: metro.config.js disableHierarchicalLookup corrected to false (not the D-46 recipe's literal true) -- this repo's pnpm store is isolated/non-hoisted, so a package's own transitive deps (@expo/metro-runtime, react-native-css-interop, @babel/runtime) need hierarchical lookup to resolve; disabling it broke expo export
- [Phase 04]: 04-01: AUTH-04 left UNCHECKED in REQUIREMENTS.md -- phone-OTP is fully coded but untestable until an SMS provider is attached to the Supabase Phone provider; __DEV__ dev-login verified working against the seeded patient in the interim
- [Phase 04]: 04-01: pnpm --filter @light/web typecheck failure (packages/ui Button forwardRef vs @types/react@19.2.17) confirmed pre-existing since the repo's first commit (2322691), unrelated to any apps/mobile file -- logged to deferred-items.md, not fixed (apps/web source is out of scope for this plan)
- [Phase 04]: 04-03: Cast the 3-level-deep nested visits->orders/prescriptions->medicine PostgREST embed through 'as unknown as VisitWithDetails[]' -- deeper nesting collapses TS inference to a literal GenericStringError shape that rejects a direct cast
- [Phase 04]: 04-03: Live REST verification found patient sessions cannot read staff or medicines via RLS (both silently return null/empty, no error) -- doctor/medicine names fall back to generic labels app-wide (Home/Booking/Appointments/Reports); wrote but did NOT apply supabase/migrations/20260713_patient_staff_doctor_select.sql (least-privilege patient reads), logged as a blocker rather than self-applying an auth/RLS boundary change without service-role access
- [Phase 04]: 04-04: Narrowed patient into activePatient const after the early-return null guard -- nested closures (onSave/setField) don't retain TS control-flow narrowing from the outer if(!patient) return
- [Phase 04]: 04-04: Live-verified patients_self_update RLS is deployed (PATCH + restore via dev patient REST token against the seeded row) -- the plan's flagged backend-precondition uncertainty resolved positive, no migration needed unlike 04-03's staff/medicines gap
- [Phase 05]: 05-01: Kept mock logic deterministic and keyword/table-driven (not one static blob) per D-57 -- triage uses an ordered keyword->department/urgency map with a pediatric-age boost; drug-check uses a frozenset-keyed known-pairs table; scribe echoes the audio filename into every field.
- [Phase 05]: 05-01: requirements-dev.txt (pytest) added even though not listed in the plan's files_modified frontmatter -- explicitly required by Task 2's action text, treated as in-scope rather than a deviation.
- [Phase 05]: 05-01: Docker build skipped -- no Docker daemon available in this environment; Dockerfile authored to spec (python:3.12-slim, non-root user, no --reload) and hand-reviewed but not build-verified.

### Pending Todos

None yet.

### Blockers/Concerns

None currently open. (Resolved: patient sessions couldn't read staff/medicines via RLS -- fixed by applying supabase/migrations/20260713_patient_staff_doctor_select.sql on 2026-07-13, commit e0cf2b6, verified via patient-token REST. See deferred-items.md items 2-3 for original root cause.)

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-13T22:54:21.812Z
Stopped at: 05-01 done; AI services FastAPI mocks + Dockerfile shipped, AI-01..04 complete
Resume file: None
