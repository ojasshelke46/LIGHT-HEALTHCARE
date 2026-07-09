---
phase: 01-staff-auth-shared-shell
plan: 01
subsystem: auth
tags: [typescript, supabase, tailwind, lucide-react, playwright, zod, zustand, date-fns, sonner]

# Dependency graph
requires: []
provides:
  - "StaffRole/AppointmentStatus types derived from generated Database enums (fixes in_consult drift)"
  - "apps/web runtime deps: zustand, date-fns, lucide-react, sonner, zod"
  - "ROLE_THEME accent map (src/lib/theme.ts) — label/accent classes/nav+icons per role"
  - "formatIST helper (src/lib/format.ts) — Asia/Kolkata timestamp formatting"
  - "Playwright e2e scaffold + failing login.spec.ts defining the walking-skeleton login contract"
affects: [01-02, 01-03, 01-05]

# Tech tracking
tech-stack:
  added: [zustand, date-fns, lucide-react, sonner, zod, "@playwright/test"]
  patterns:
    - "Domain enums derived via Database[\"public\"][\"Enums\"][...] indexed access — never hand-written unions"
    - "Role accent theme centralized in one Record<StaffRole, RoleTheme> map with literal Tailwind classes (dynamic bg-${x} would be purged)"
    - "All timestamps formatted through a single formatIST(input, style) helper using Intl.DateTimeFormat + Asia/Kolkata"
    - "E2E specs use data-testid selectors; login.spec.ts intentionally fails until Plans 02-03 add the testids/DashboardLayout"

key-files:
  created:
    - apps/web/src/lib/theme.ts
    - apps/web/src/lib/format.ts
    - apps/web/playwright.config.ts
    - apps/web/e2e/login.spec.ts
  modified:
    - packages/shared-types/src/index.ts
    - apps/web/package.json
    - .gitignore

key-decisions:
  - "Committed the pre-existing, never-versioned monorepo scaffold (apps/, packages/, root config) as a separate baseline commit before task work, so this plan's diffs are reviewable"
  - "Did not call requirements.mark-complete for AUTH-02/SHELL-01 despite them appearing in this plan's frontmatter — this plan is scaffold-only and its own e2e test documents them as NOT yet satisfied; deferred to 01-03/01-05 which also declare and actually implement/verify these IDs"
  - "Verified the e2e failure reason on a scratch-only alternate-port Playwright config (not committed) because port 3000 was held by an unrelated project's stray process — confirmed failure is due to missing data-testid attributes on the current login placeholder, not environmental noise"

patterns-established:
  - "Shared-types enums always derive from packages/shared-types/src/database.types.ts — no hand-written literal unions for DB-backed enums"
  - "Role theming lives in exactly one file (src/lib/theme.ts) consumed via Record<StaffRole, RoleTheme>"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-07-09
---

# Phase 1 Plan 1: Walking-Skeleton Foundation Summary

**Fixed shared-types enum drift (in_consult → in_consultation via generated Database enums), installed Phase-1 runtime deps, added the ROLE_THEME accent map + formatIST helper, and wrote a failing Playwright e2e (login.spec.ts) that defines the login happy path Plans 02-03 must satisfy.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-09T06:42:28Z
- **Completed:** 2026-07-09T06:52:21Z
- **Tasks:** 3 completed
- **Files modified:** 7 (3 created, 4 modified) plus a 39-file baseline commit for the previously-uncommitted scaffold

## Accomplishments
- `StaffRole` and `AppointmentStatus` in `@light/shared-types` are now indexed accesses into the generated `Database["public"]["Enums"]` — the stale `"in_consult"` literal is gone permanently (mirrors live DB: `in_consultation`)
- `apps/web` has all five Phase-1 runtime deps (`zustand`, `date-fns`, `lucide-react`, `sonner`, `zod`) installed and typechecking clean
- `ROLE_THEME` (src/lib/theme.ts) provides label, accent classes, and nav items+icons for all 5 staff roles with literal Tailwind classes (Tailwind content-scan safe)
- `formatIST` (src/lib/format.ts) provides consistent Asia/Kolkata date/time/datetime formatting for all later phases
- Playwright is scaffolded (`playwright.config.ts`, local `:3000` webServer) with three specs in `e2e/login.spec.ts` (happy path + staff-name/sign-out visibility, cross-role bounce, generic invalid-credentials toast) that parse via `--list` and fail at runtime for the correct reason — the login page has no `data-testid` attributes yet

## Task Commits

Each task was committed atomically:

0. **Baseline: commit existing monorepo scaffold** - `2322691` (chore) — pre-existing, never-versioned apps/packages/root config; not a plan task, but required so subsequent diffs are reviewable
1. **Task 1: Derive shared-types enums from Database (fix in_consult drift)** - `6c4dcb1` (fix)
2. **Task 2: Install Phase-1 deps, add ROLE_THEME accent map + formatIST** - `6a2fddc` (feat)
3. **Task 3: Scaffold Playwright and write the FAILING login e2e** - `2a5ffbb` (test)

**Plan metadata:** committed in this same operation (docs commit follows below)

## Files Created/Modified
- `packages/shared-types/src/index.ts` - StaffRole/AppointmentStatus derived from `Database["public"]["Enums"]`; ROLE_HOME kept unchanged
- `apps/web/package.json` - added zustand, date-fns, lucide-react, sonner, zod, @playwright/test; added `test:e2e` script
- `apps/web/src/lib/theme.ts` - new `ROLE_THEME` map (label, accentBar, accentText, navActive, badge, nav[] per role)
- `apps/web/src/lib/format.ts` - new `formatIST(input, style)` helper (Asia/Kolkata)
- `apps/web/playwright.config.ts` - new Playwright config, local webServer on `:3000`
- `apps/web/e2e/login.spec.ts` - new failing e2e: login happy path, cross-role bounce, invalid-credentials toast
- `.gitignore` - added `*.tsbuildinfo` and Playwright output dirs (`test-results/`, `playwright-report/`, `blob-report/`)
- `pnpm-lock.yaml` - updated for new deps

## Decisions Made
- Committed the pre-existing uncommitted scaffold as a standalone baseline commit before starting task work (see Deviations)
- Skipped marking AUTH-02/SHELL-01 complete in REQUIREMENTS.md even though listed in this plan's frontmatter — see Deviations; will be marked when 01-03/01-05 (which also declare these IDs) make the e2e pass
- Used `Intl.DateTimeFormat` directly for IST formatting rather than date-fns-tz, per pre-existing project decision (PROJECT.md Key Decisions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repo had no git history for the existing monorepo scaffold**
- **Found during:** Pre-Task 1 (before touching any plan files)
- **Issue:** `git status` showed the entire `apps/`, `packages/`, and root workspace config as untracked — the pre-existing scaffold (marked "existing"/"Validated" in PROJECT.md) had never been committed. Staging only this plan's task files on top of an untracked tree would make diffs unreviewable and leave most of the codebase permanently untracked.
- **Fix:** Committed the pre-existing scaffold as a single baseline commit (`2322691`, `chore: commit existing monorepo scaffold baseline`) before starting Task 1, after removing the stray `apps/web/tsconfig.tsbuildinfo` build artifact and adding `*.tsbuildinfo` to `.gitignore`.
- **Files modified:** 39 pre-existing files (apps/, packages/, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, tsconfig.base.json, turbo.json, README.md, .gitignore)
- **Verification:** `git status --short` clean of untracked scaffold files after commit
- **Committed in:** `2322691`

**2. [Rule 2 - Missing config] Playwright output directories not ignored**
- **Found during:** Task 3
- **Issue:** `.gitignore` had no entries for Playwright's `test-results/`/`playwright-report/`/`blob-report/` runtime output, which would otherwise get accidentally staged after any local `test:e2e` run
- **Fix:** Added the three paths to `.gitignore`
- **Files modified:** `.gitignore`
- **Verification:** Confirmed no test-results/playwright-report artifacts appear in `git status --short` after running Playwright locally
- **Committed in:** `2a5ffbb` (Task 3 commit)

**3. [Rule 3 - Blocking] Port 3000 occupied by an unrelated process during runtime verification**
- **Found during:** Task 3 verification (confirming `test:e2e` fails as documented)
- **Issue:** `pnpm --filter @light/web test:e2e` failed with `EADDRINUSE :::3000` because an unrelated Next.js dev server for a different project (`/Users/ojasshelke/Documents/pr web`, unrelated PID) was already bound to port 3000. That process is out of scope for this task and was not stopped.
- **Fix:** Ran the same specs once against a scratch-only Playwright config (not committed, lived only in the session scratchpad) pointed at port 3100, confirming the real, intended failure reason: `getByTestId('login-email')` times out because the current login placeholder has no `data-testid` attributes. `apps/web/playwright.config.ts` itself was not modified — it stays on `:3000` per the plan (D-09-adjacent convention: consistent local dev port across the app).
- **Files modified:** none in the repo (temporary config lived in the session scratchpad and was deleted after use)
- **Verification:** Scratch run showed 3/3 specs failing on `locator.fill: ... waiting for getByTestId('login-email')` — confirms the walking-skeleton gap Plans 02-03 must close, not an environment artifact
- **Committed in:** N/A (verification-only, no repo changes)

**4. [Decision] Did not mark AUTH-02/SHELL-01 requirements complete**
- **Found during:** State-update step (after Task 3)
- **Issue:** This plan's frontmatter lists `requirements: [AUTH-02, SHELL-01]`, and the standard protocol step marks all listed requirement IDs complete in REQUIREMENTS.md. However, this plan is explicitly scaffold-only ("Nothing user-facing ships here") and its own e2e test is designed to FAIL, proving AUTH-02 (role-home redirect + staff name + logout) and SHELL-01 (DashboardLayout) are not yet functionally satisfied.
- **Fix:** Skipped calling `requirements mark-complete` for `AUTH-02`/`SHELL-01` in this plan's state update. Both IDs also appear in `01-03-PLAN.md` (which implements DashboardLayout) and `01-05-PLAN.md` (which re-verifies across all Phase-1 requirements) — completion will be recorded there once the e2e actually passes.
- **Files modified:** none (REQUIREMENTS.md left untouched for these two IDs)
- **Verification:** `.planning/REQUIREMENTS.md` still shows AUTH-02/SHELL-01 as `[ ]` pending, matching actual system state
- **Committed in:** N/A (deliberate omission, not a code change)

---

**Total deviations:** 4 (2 blocking auto-fixes, 1 missing-config auto-fix, 1 documentation-integrity decision)
**Impact on plan:** All auto-fixes were necessary to keep the repo's git history coherent and to get a trustworthy runtime verification signal; none altered the plan's scope or deliverables. The requirements-completion decision protects REQUIREMENTS.md from a false "done" signal — no functional code was skipped.

## Issues Encountered
- Port 3000 conflict with an unrelated background process (see Deviation 3) — worked around without touching the foreign process or the committed Playwright config.

## User Setup Required

None - no external service configuration required. (Supabase URL/anon key already present in `apps/web/.env.local` per environment notes.)

## Next Phase Readiness
- Type layer, runtime deps, role theme, IST helper, and the failing e2e contract are all in place for Plan 02 (login UI + toasts + testids) and Plan 03 (DashboardLayout with staff name + logout) to build against.
- No blockers. The only open item is the pre-existing unrelated dev server on port 3000 in the local environment, which does not affect CI (`reuseExistingServer: !process.env.CI`) and only matters for ad-hoc local `pnpm dev`/`test:e2e` runs on this machine.

---
*Phase: 01-staff-auth-shared-shell*
*Completed: 2026-07-09*

## Self-Check: PASSED

All created/modified files confirmed present on disk:
- FOUND: apps/web/src/lib/theme.ts
- FOUND: apps/web/src/lib/format.ts
- FOUND: apps/web/playwright.config.ts
- FOUND: apps/web/e2e/login.spec.ts
- FOUND: packages/shared-types/src/index.ts
- FOUND: apps/web/package.json
- FOUND: .gitignore

All commit hashes confirmed present in git history:
- FOUND: 2322691 (baseline scaffold)
- FOUND: 6c4dcb1 (Task 1)
- FOUND: 6a2fddc (Task 2)
- FOUND: 2a5ffbb (Task 3)
