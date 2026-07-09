---
phase: 01-staff-auth-shared-shell
plan: 02
subsystem: auth
tags: [typescript, tailwind, zod, sonner, supabase-auth, react-forwardRef]

# Dependency graph
requires:
  - phase: 01-staff-auth-shared-shell/01
    provides: "apps/web runtime deps (zustand, date-fns, lucide-react, sonner, zod), failing login.spec.ts contract"
provides:
  - "Hand-rolled shadcn-style primitives (cn, Button, Card family, Input, Label) under apps/web/src/components/ui/ and apps/web/src/lib/utils.ts"
  - "Real login page: zod-validated email/password, signInWithPassword, generic sonner error toast, button loading state, data-testid hooks"
  - "<Toaster/> mounted once in root layout, available to every future page"
affects: [01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cn() class-joiner: filter(Boolean).join(' ') — no clsx/tailwind-merge dependency"
    - "UI primitives use React.forwardRef + displayName, matching shadcn component APIs exactly so a later shadcn-CLI swap is mechanical"
    - "Form validation: zod schema.safeParse before any network call; first issue message shown inline via role=\"alert\"; network-layer auth errors always mapped to one fixed generic toast string, never error.message (T-01-04 mitigation)"

key-files:
  created:
    - apps/web/src/lib/utils.ts
    - apps/web/src/components/ui/button.tsx
    - apps/web/src/components/ui/card.tsx
    - apps/web/src/components/ui/input.tsx
    - apps/web/src/components/ui/label.tsx
  modified:
    - apps/web/src/app/login/page.tsx
    - apps/web/src/app/layout.tsx

key-decisions:
  - "Confirmed zod v4.4.3's z.string().email() still functions correctly (deprecated alias, not removed) — used as specified in the plan rather than the newer z.email() top-level helper, to match the plan's literal contract text"
  - "Verified the e2e 'invalid credentials' spec passes against a scratch-only alternate-port Playwright config (not committed) because port 3000 is held by an unrelated process on this machine, following the same workaround pattern as 01-01"
  - "Discovered the documented seeded staff credentials (doctor@test.com / reception@test.com, Test1234!) return HTTP 400 invalid_credentials from Supabase Auth in this environment; did not attempt to fix (no working service-role key available, and creating/resetting auth users is outside this plan's file scope) — logged as an Issue, not a deviation, since the login page's own behavior (generic toast, no leak) is verified correct via this exact failure"

requirements-completed: [AUTH-01]

# Metrics
duration: ~8min
completed: 2026-07-09
---

# Phase 1 Plan 2: Login UI & Primitives Summary

**Hand-rolled shadcn-style button/card/input/label primitives plus a real zod-validated login page that calls `signInWithPassword` and surfaces a generic, non-leaking sonner toast on failure — the e2e "invalid credentials" spec now passes.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-09T06:55:00Z
- **Completed:** 2026-07-09T07:03:00Z
- **Tasks:** 2 completed
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- `cn()`, `Button`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`, `Input`, `Label` all hand-rolled per D-01 — no shadcn CLI, no radix, no cva/clsx/tailwind-merge deps; every primitive forwards a ref, sets `displayName`, and merges `className` via `cn`
- Login page rebuilt: zod `safeParse` blocks malformed email/empty password before any network call (inline `role="alert"` error, no network side effect); valid submissions call `signInWithPassword`; auth failures always show the fixed string `"Invalid email or password"` via `toast.error` — raw Supabase `error.message` is never rendered (T-01-04 mitigated)
- Submit button disables and reads "Signing in…" while the request is in flight; testids `login-email`/`login-password`/`login-submit` present for the e2e contract from 01-01
- No signup, forgot-password, or reset control anywhere on the page (AUTH-01 constraint)
- `<Toaster richColors position="top-center" />` mounted once in `app/layout.tsx`, inside `<body>` after `{children}`, existing body classes and metadata untouched
- E2E verified: `login.spec.ts`'s "invalid credentials show a generic error toast and stay on /login" spec passes end-to-end against the real Supabase project (confirmed via a scratch alternate-port Playwright run — port 3000 is occupied by an unrelated process on this machine, same workaround as 01-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Hand-rolled shadcn-style primitives (cn, button, card, input, label)** - `b80c09f` (feat)
2. **Task 2: Rebuild login page (zod + signInWithPassword + sonner) and mount Toaster** - `bad457a` (feat)

**Plan metadata:** committed in this same operation (docs commit follows below)

## Files Created/Modified
- `apps/web/src/lib/utils.ts` - `cn()` class-joiner (filter+join, no external dep)
- `apps/web/src/components/ui/button.tsx` - `Button` (forwardRef, variant/size maps, focus-visible ring, disabled dimming)
- `apps/web/src/components/ui/card.tsx` - `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`
- `apps/web/src/components/ui/input.tsx` - `Input` (forwardRef, base focus ring, className merge)
- `apps/web/src/components/ui/label.tsx` - `Label` (forwardRef, explicit `htmlFor` + `children` passthrough)
- `apps/web/src/app/login/page.tsx` - rebuilt: zod validation, `signInWithPassword`, generic sonner error toast, loading state, testids, centered Card layout
- `apps/web/src/app/layout.tsx` - added `<Toaster richColors position="top-center" />` inside `<body>`

## Decisions Made
- Kept `z.string().email()` (zod v4.4.3 deprecated-but-functional API) to match the plan's literal schema text rather than switching to `z.email()`
- Explicitly destructured `htmlFor`/`children` in `Label` (rather than pure prop spread) so the component both type-checks cleanly and satisfies the plan's literal-text acceptance grep for `htmlFor`
- Logged the seeded-credential failure (see Issues Encountered) as an environment issue rather than a code deviation — the login page's generic-toast behavior is exactly what a real invalid-credentials response should trigger, and no file in this plan's scope touches user seeding or Supabase Auth admin operations

## Deviations from Plan

None — plan executed exactly as written. (The seeded-credentials issue below is an environment/data finding, not a deviation from the plan's code deliverables — no plan file required a fix, and none was made.)

## Issues Encountered

**Seeded staff credentials return `invalid_credentials` from Supabase Auth in this environment.**
- **Found during:** Post-Task-2 e2e verification (happy-path spec)
- **Details:** Direct REST calls to `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` with `doctor@test.com` / `Test1234!` and `reception@test.com` / `Test1234!` (the credentials documented in `README.md` and this session's `environment_notes`) both return `400 {"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}` against the live project (`rylceydkrydmpysmibba`). This reproduces identically through the actual login page (confirmed via a debug Playwright run capturing the network response).
- **Root cause not fixable from this plan:** `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` is still the placeholder value (`YOUR_SERVICE_ROLE_KEY...`, as PROJECT.md already documents — "needed only for future admin routes"), so there is no way to inspect or reset `auth.users` from this session. Whether the accounts were never actually seeded, were seeded with a different password, or need re-seeding is outside this plan's `files_modified` scope (UI primitives + login page + root layout only).
- **Impact on this plan:** None on the deliverables. The plan's own `<verification>` bar is "the e2e 'invalid credentials' spec passes" — confirmed passing. The happy-path spec (which needs a working seeded account) fails at the URL-redirect assertion, which is the *expected* Supabase response to bad credentials, not a bug in the login page — the page correctly shows the generic toast and stays on `/login` either way.
- **Recommendation:** Before Plan 03 (which needs a working session to build/verify `DashboardLayout` with a real staff name) or Plan 05 (full e2e re-verification), obtain a real `SUPABASE_SERVICE_ROLE_KEY` and confirm/re-seed the two staff auth accounts, or hand-verify credentials via the Supabase dashboard.
- **Committed in:** N/A (diagnostic only; no repo changes)

## User Setup Required

**Action needed before Plan 03/05 can fully verify the happy-path login flow:**
1. In the Supabase dashboard for project `rylceydkrydmpysmibba` → Authentication → Users, confirm `doctor@test.com` and `reception@test.com` exist and either know their real password or reset it to `Test1234!` (matching README/e2e expectations).
2. Optionally, replace the placeholder `SUPABASE_SERVICE_ROLE_KEY` in `apps/web/.env.local` with the real service-role key so future sessions can inspect/manage auth users programmatically (server-only; never expose to the browser).

This is not required to consider Plan 02 complete — its own verification (primitives exist, login page behavior, invalid-credentials e2e) is fully green.

## Next Phase Readiness
- `Button`/`Card`/`Input`/`Label` primitives are ready for Plan 03's `DashboardLayout` (sidebar, header) and later portal pages.
- Login page is feature-complete for AUTH-01: zod validation, real `signInWithPassword` call, generic toast, loading state, testids, no signup/reset paths.
- `<Toaster/>` is available globally — Plan 03 onward can call `toast.*` from any client component without remounting it.
- Blocker for full e2e happy-path verification: seeded staff credentials need confirming/resetting in Supabase (see User Setup Required). Does not block Plan 03's implementation work, only its own e2e verification step.

---
*Phase: 01-staff-auth-shared-shell*
*Completed: 2026-07-09*

## Self-Check: PASSED

All created/modified files confirmed present on disk:
- FOUND: apps/web/src/lib/utils.ts
- FOUND: apps/web/src/components/ui/button.tsx
- FOUND: apps/web/src/components/ui/card.tsx
- FOUND: apps/web/src/components/ui/input.tsx
- FOUND: apps/web/src/components/ui/label.tsx
- FOUND: apps/web/src/app/login/page.tsx
- FOUND: apps/web/src/app/layout.tsx

All commit hashes confirmed present in git history:
- FOUND: b80c09f (Task 1)
- FOUND: bad457a (Task 2)
