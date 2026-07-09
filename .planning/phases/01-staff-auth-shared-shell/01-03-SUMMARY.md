---
phase: 01-staff-auth-shared-shell
plan: 03
subsystem: ui
tags: [nextjs, typescript, supabase, tailwind, lucide-react, playwright, shadcn-style]

# Dependency graph
requires:
  - phase: 01-staff-auth-shared-shell/01
    provides: "ROLE_THEME accent map, StaffRole enum, Playwright e2e scaffold + failing login.spec.ts contract"
  - phase: 01-staff-auth-shared-shell/02
    provides: "Hand-rolled Button/Card/Input/Label primitives, cn() utility, real login page + Toaster"
provides:
  - "Shell primitives: Badge, Skeleton, controlled a11y Sheet (hand-rolled, no radix)"
  - "lib/staff.ts getStaff() — server-only identity read (getUser revalidation, redirect-on-absent)"
  - "DashboardLayout: sidebar + sticky header (portal name, staff name, logout) + main; documents the D-13 client-realtime loading/error/empty convention for all later phases"
  - "Sidebar: role-accented nav with usePathname active highlight, collapsed icon-rail mode, mobile drawer callback"
  - "Five per-role server layout.tsx wiring DashboardLayout into reception/doctor/diagnostics/pharmacy/admin"
  - "Walking-skeleton e2e fully green: login -> role home -> staff name -> logout -> cross-role bounce -> invalid-credentials toast"
affects: [01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand-rolled Sheet: controlled { open, onOpenChange } drawer, closes on overlay click + Escape keydown listener, role=dialog aria-modal=true"
    - "Per-role server layout.tsx reads staff identity exactly once (getStaff()) and passes it into a client DashboardLayout — pages never re-fetch identity"
    - "Supabase multi-column .select() results are cast to the expected row shape after a null-guard (matches the existing middleware.ts workaround for the same staff table quirk)"
    - "D-13 async-state convention (skeleton/error/empty for client realtime views) documented verbatim in the DashboardLayout file header as the single source of truth"

key-files:
  created:
    - apps/web/src/components/ui/badge.tsx
    - apps/web/src/components/ui/skeleton.tsx
    - apps/web/src/components/ui/sheet.tsx
    - apps/web/src/lib/staff.ts
    - apps/web/src/components/dashboard-layout.tsx
    - apps/web/src/components/sidebar.tsx
    - apps/web/src/app/reception/layout.tsx
    - apps/web/src/app/doctor/layout.tsx
    - apps/web/src/app/diagnostics/layout.tsx
    - apps/web/src/app/pharmacy/layout.tsx
    - apps/web/src/app/admin/layout.tsx
  modified:
    - apps/web/src/components/sign-out-button.tsx
    - apps/web/src/app/reception/page.tsx
    - apps/web/src/app/doctor/page.tsx
    - apps/web/src/app/diagnostics/page.tsx
    - apps/web/src/app/pharmacy/page.tsx
    - apps/web/src/app/admin/page.tsx

key-decisions:
  - "Cast the staff select() result to StaffIdentity after the null-guard in lib/staff.ts, mirroring the pre-existing cast pattern in src/middleware.ts for the same table/query shape (PostgREST's TS overload resolution collapses multi-column .select() strings to a generic-error type in this project's supabase-js version)"
  - "Verified the e2e suite against a scratch, non-committed Playwright config on port 3100 (apps/web/playwright.config.ts itself untouched, still targets :3000) because port 3000 is held by an unrelated local process — same workaround pattern as Plans 01/02"

patterns-established:
  - "DashboardLayout file header is the canonical, single-source documentation point for the D-13 client-realtime { data, error, loading } convention"
  - "Role segment -> StaffRole mapping is duplicated intentionally in two places (middleware.ts ROLE_PREFIXES and the five layout.tsx files) as defense-in-depth (T-01-08); both must be kept in sync if a role segment is ever renamed"

requirements-completed: [SHELL-01, AUTH-02, AUTH-03]

# Metrics
duration: ~10min
completed: 2026-07-09
---

# Phase 1 Plan 3: Shared Dashboard Shell Summary

**Hand-rolled Badge/Skeleton/Sheet primitives, a server `getStaff()` identity read, and a role-accented `DashboardLayout` (collapsible sidebar + mobile drawer + header with live staff name and logout) wired into all five portal route groups — the walking-skeleton login e2e (happy path, cross-role bounce, invalid-credentials toast) now passes end to end.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-09T06:59:00Z
- **Completed:** 2026-07-09T07:09:30Z
- **Tasks:** 3 completed
- **Files modified:** 17 (11 created, 6 modified), 1 deleted (`portal-shell.tsx`)

## Accomplishments
- `Badge`, `Skeleton`, and a controlled `Sheet` (overlay + Escape-close, `role="dialog"` `aria-modal="true"`) added to `components/ui/`, all hand-rolled per D-01 (no radix)
- `lib/staff.ts` `getStaff()` revalidates the session via `supabase.auth.getUser()`, reads the caller's own `staff` row, and redirects to `/login` if unauthenticated or not staff — never returns null
- `DashboardLayout` renders a role-accented sidebar (fixed + collapsible on desktop, `Sheet`-based drawer on mobile via hamburger), a sticky header with portal name/badge, `data-testid="staff-name"` staff name, and the upgraded `SignOutButton`; its file header documents the D-13 client-realtime loading/error/empty convention verbatim for all future phases to follow
- `Sidebar` highlights the active nav item via `usePathname()` and shows icon-only rail when collapsed
- `sign-out-button.tsx` upgraded to the `Button` primitive with `data-testid="sign-out"` and optional `className`, keeping the existing `signOut()` → `/login` → `router.refresh()` logic
- Five server `layout.tsx` files (reception, doctor, diagnostics, pharmacy, admin) each call `getStaff()` once and wrap children in `DashboardLayout`, with the exact role mapping matching `middleware.ts` (`diagnostics` → `lab_tech`, `pharmacy` → `pharmacist`)
- All five role `page.tsx` simplified to their own content only; `PortalShell` deleted with zero remaining references
- `pnpm --filter @light/web build` succeeds; `pnpm --filter @light/web typecheck` is clean
- Full walking-skeleton e2e green: all 3 `login.spec.ts` specs pass (staff name + logout visible after login, cross-role portal bounce, generic invalid-credentials toast) — verified against the real Supabase project with the previously-blocking seeded credentials now working (see Deviations)

## Task Commits

Each task was committed atomically:

1. **Task 1: Shell primitives — badge, skeleton, sheet (hand-rolled)** - `90d029b` (feat)
2. **Task 2: getStaff helper + DashboardLayout + Sidebar + upgraded sign-out** - `95f57d0` (feat)
3. **Task 3: Wire per-role layouts, simplify role pages, remove PortalShell** - `932cd66` (feat)

**Plan metadata:** committed in this same operation (docs commit follows below)

## Files Created/Modified
- `apps/web/src/components/ui/badge.tsx` - variant-classed span (default/secondary/outline/destructive)
- `apps/web/src/components/ui/skeleton.tsx` - pulsing placeholder div
- `apps/web/src/components/ui/sheet.tsx` - controlled a11y overlay drawer, closes on overlay click / Escape
- `apps/web/src/lib/staff.ts` - server `getStaff()`: `getUser()` revalidation + `staff` row read by `auth_user_id`, redirect-on-absent
- `apps/web/src/components/dashboard-layout.tsx` - shared shell: desktop fixed/collapsible sidebar, mobile `Sheet` drawer, sticky header (portal name, badge, staff name, logout), D-13 convention documented in file header
- `apps/web/src/components/sidebar.tsx` - role-accented nav, `usePathname` active highlight, collapsed icon-rail mode
- `apps/web/src/components/sign-out-button.tsx` - upgraded to `Button` primitive, `data-testid="sign-out"`, optional `className`
- `apps/web/src/app/{reception,doctor,diagnostics,pharmacy,admin}/layout.tsx` - server layouts reading staff once, rendering `DashboardLayout`
- `apps/web/src/app/{reception,doctor,diagnostics,pharmacy,admin}/page.tsx` - simplified to own content, `PortalShell` wrapper removed
- `apps/web/src/components/portal-shell.tsx` - deleted (fully replaced by `DashboardLayout`)

## Decisions Made
- Cast the `staff` `.select()` result to the expected row type after the null-guard in `lib/staff.ts`, following the exact precedent already established in `src/middleware.ts` for the same query pattern (a PostgREST/supabase-js TS-inference quirk in this project's version collapses the type to `never` otherwise)
- Verified e2e against a scratch (non-committed) Playwright config on port 3100 — `apps/web/playwright.config.ts` itself is untouched and still targets `:3000` — because port 3000 remains occupied by an unrelated local process on this machine (same workaround as Plans 01/02)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `lib/staff.ts` failed typecheck due to a Supabase multi-column `.select()` type-inference quirk**
- **Found during:** Task 2 (`pnpm --filter @light/web typecheck` after writing `getStaff()`)
- **Issue:** `tsc --noEmit` reported `Property 'id'/'name'/'role' does not exist on type 'never'` on the `staff` row returned by `.select("id, name, role").eq(...).single()`, even after a `if (!data) redirect(...)` null-guard. This is the identical quirk already worked around in `src/middleware.ts`'s staff-role lookup (`(staff as { role?: StaffRole } | null)?.role`).
- **Fix:** Cast `data` to `StaffIdentity | null` before the null-guard, matching the established codebase pattern, with a comment explaining why.
- **Files modified:** `apps/web/src/lib/staff.ts`
- **Verification:** `pnpm --filter @light/web typecheck` exits 0; `pnpm --filter @light/web build` succeeds
- **Committed in:** `95f57d0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to get `getStaff()` to typecheck; follows an existing in-repo convention rather than introducing a new one. No scope creep.

## Issues Encountered

**Resolved — previously-blocking seeded credentials now authenticate.** Plan 02's summary documented `doctor@test.com` / `reception@test.com` (password `Test1234!`) returning `400 invalid_credentials` from Supabase Auth. Per this session's environment notes, that was fixed upstream in the Supabase project (missing `auth.identities` rows + NULL token columns) before this plan ran. Verified via direct REST `POST /auth/v1/token?grant_type=password` for both accounts, and again through the actual e2e run — all 3 `login.spec.ts` specs pass against the live project. No code change was needed in this plan; this is a state-tracking update only (see STATE.md Blockers/Concerns, now cleared).

## User Setup Required

None - no external service configuration required. The service-role key in `apps/web/.env.local` remains a placeholder but was not needed for this plan (no admin-route work).

## Next Phase Readiness
- The walking skeleton is complete end to end: login → role home → `DashboardLayout` with real staff name → logout → cross-role bounce, all e2e-verified.
- `Badge`, `Skeleton`, `Sheet`, `DashboardLayout`, and `Sidebar` are available for Plan 04/05 and all Phase 2+ portal feature work.
- The D-13 async-state convention is documented once (DashboardLayout file header) for every future client realtime view to follow; D-12 (`loading.tsx`/`error.tsx` per portal group) remains open for a later plan.
- No blockers. The only lingering local-environment quirk is port 3000 being held by an unrelated process on this machine, worked around via a scratch Playwright config on port 3100, exactly as in Plans 01/02 — does not affect CI (`reuseExistingServer: !process.env.CI`).

---
*Phase: 01-staff-auth-shared-shell*
*Completed: 2026-07-09*

## Self-Check: PASSED

All created/modified files confirmed present on disk:
- FOUND: apps/web/src/components/ui/badge.tsx
- FOUND: apps/web/src/components/ui/skeleton.tsx
- FOUND: apps/web/src/components/ui/sheet.tsx
- FOUND: apps/web/src/lib/staff.ts
- FOUND: apps/web/src/components/dashboard-layout.tsx
- FOUND: apps/web/src/components/sidebar.tsx
- FOUND: apps/web/src/components/sign-out-button.tsx
- FOUND: apps/web/src/app/reception/layout.tsx
- FOUND: apps/web/src/app/doctor/layout.tsx
- FOUND: apps/web/src/app/diagnostics/layout.tsx
- FOUND: apps/web/src/app/pharmacy/layout.tsx
- FOUND: apps/web/src/app/admin/layout.tsx
- FOUND: apps/web/src/app/reception/page.tsx
- FOUND: apps/web/src/app/doctor/page.tsx
- FOUND: apps/web/src/app/diagnostics/page.tsx
- FOUND: apps/web/src/app/pharmacy/page.tsx
- FOUND: apps/web/src/app/admin/page.tsx
- CONFIRMED DELETED: apps/web/src/components/portal-shell.tsx

All commit hashes confirmed present in git history:
- FOUND: 90d029b (Task 1)
- FOUND: 95f57d0 (Task 2)
- FOUND: 932cd66 (Task 3)
