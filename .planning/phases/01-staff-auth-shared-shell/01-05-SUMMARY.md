---
phase: 01-staff-auth-shared-shell
plan: 05
subsystem: ui
tags: [playwright, e2e, checkpoint, auto-verify]

# Dependency graph
requires:
  - phase: 01-staff-auth-shared-shell/03
    provides: "DashboardLayout, Sidebar, Sheet drawer, getStaff() identity read"
  - phase: 01-staff-auth-shared-shell/04
    provides: "PortalLoading/PortalError/EmptyState, loading.tsx+error.tsx per portal"
provides:
  - "Phase 1 sign-off: all 5 ROADMAP success criteria confirmed against the live app via automated proxies (auto-mode checkpoint approval)"
  - "Documented finding: login email field lacks form noValidate, so native HTML5 constraint validation shadows the zod inline-alert path for malformed emails"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-mode human-verify checkpoints get exhaustive automated proxy coverage (grep + scratch Playwright specs) instead of a live human pass, with genuinely-visual items deferred explicitly"

key-files:
  created: []
  modified: []

key-decisions:
  - "No application files modified — this plan is verification-only per its frontmatter (files_modified: []); the scratch Playwright spec used to prove the checkpoint lives in the session scratchpad, not the repo"
  - "Auto-approved the checkpoint per the auto-mode policy: user_response treated as 'approved' after every automatable proxy passed; only genuinely-visual items (tablet drawer feel, throttled-network skeleton flash) deferred to human review"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, SHELL-01, SHELL-02]

# Metrics
duration: ~20min
completed: 2026-07-09
---

# Phase 1 Plan 5: Human-Verify Checkpoint (Tablet-First Shell) Summary

**All 7 checkpoint steps proven via automated Playwright proxies (committed e2e suite + a scratch supplemental spec) plus static code/grep evidence — checkpoint auto-approved per the `--auto` chain policy, with two genuinely-visual items (drawer feel, throttled-network skeleton flash) explicitly deferred to human review.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-09T07:05:00Z
- **Completed:** 2026-07-09T07:25:28Z
- **Tasks:** 1 checkpoint task, auto-approved
- **Files modified:** 0 (verification-only plan)

## Checkpoint: auto-approved

This plan's single task is `type="checkpoint:human-verify"`. Per the `--auto` chain policy
(`workflow.auto_advance: true`, `_auto_chain_active: true` in `.planning/config.json`), every
automated proxy available was run first; `user_response` is treated as **"approved"** since
all automatable checks passed and only display/feel items remain for a later human pass.

### Evidence per step (from the plan's `<how-to-verify>`)

**1. LOGIN + REDIRECT (AUTH-01, AUTH-02)**
- Committed e2e (`apps/web/e2e/login.spec.ts`, run via a scratch port-3100 Playwright config since
  port 3000 is held by an unrelated local process): "staff logs in and lands on their role home
  with their name in the header" — **PASS**.
- Supplemental proxy (`checkpoint-verify.spec.ts`, scratch, not committed): malformed email
  ("not-an-email") blocks form submission inline, button stays "Sign in" (no spinner), URL stays
  `/login` — **PASS**.
- **Finding (not fixed, per this task's "no code changes" mandate):** the login `<form>` has no
  `noValidate`, so `<input type="email">`'s native HTML5 constraint validation intercepts the
  submit event *before* React's `onSubmit` (and therefore the zod schema + the custom
  `<p role="alert">` message) ever runs, for any email string the browser itself considers
  malformed (e.g. missing `@`). The user still sees an inline, non-raw message and no spinner —
  acceptance criteria are technically met — but the visible copy is the browser's native tooltip,
  not the app's zod-derived text, and it will vary by browser/locale. Not a security or
  correctness issue; worth a note for gap-closure if consistent cross-browser copy matters later
  (add `noValidate` to the form so zod is the single source of truth for all email-format cases).

**2. ERROR TOAST (AUTH-01)**
- Committed e2e: "invalid credentials show a generic error toast and stay on /login" — **PASS**
  (toast reads "Invalid email or password", never the raw Supabase error).
- Grep confirmed only one `toast.error(...)` call site in `login/page.tsx`, hardcoded generic
  copy — no interpolation of the underlying Supabase error object anywhere in the file.

**3. SHELL (SHELL-01)**
- Supplemental proxy: logged in as doctor, confirmed the header renders the portal name
  ("Doctor"), `data-testid="staff-name"`, and `data-testid="sign-out"`; confirmed the desktop
  sidebar's accent bar carries `bg-purple-600` (doctor) and the active nav `<a>` has
  `aria-current="page"` plus `bg-purple-50 text-purple-700` — **PASS**.
- Static read of `apps/web/src/lib/theme.ts` confirms all five role accents match the brief
  exactly: reception `bg-blue-600`, doctor `bg-purple-600`, lab_tech (diagnostics) `bg-amber-500`,
  pharmacist (pharmacy) `bg-green-600`, admin `bg-gray-600`.

**4. TABLET / MOBILE (SHELL-01, tablet-first)**
- Supplemental proxy at a 390x844 mobile viewport: hamburger button (`aria-label="Open menu"`)
  opens a `role="dialog" aria-modal="true"` drawer; drawer closes on **Escape**, on **overlay
  click** (clicked outside the 288px drawer panel bounds), and on **nav-item tap** — all three
  close paths verified independently — **PASS**.
- Same test, desktop viewport (1280x900): collapse toggle (`aria-label="Collapse sidebar"`)
  flips the fixed sidebar from `md:w-56` to `md:w-16` and the button's label flips to
  `"Expand sidebar"` — **PASS**.
- Source read of `apps/web/src/components/ui/sheet.tsx` confirms the close-on-Escape listener
  and overlay `onClick`, and `dashboard-layout.tsx`/`sidebar.tsx` confirm the `onNavigate`
  callback closing the drawer on nav-tap — matches the automated behavior observed.

**5. LOGOUT (AUTH-03)**
- Supplemental proxy: clicking `sign-out` from `/doctor` returns to `/login` — **PASS**.

**6. CROSS-ROLE BLOCK (AUTH-02)**
- Committed e2e: "opening another role's portal bounces back to own home" (doctor visiting
  `/pharmacy` bounces back to `/doctor`) — **PASS**.

**7. ASYNC STATES (SHELL-02)**
- Static/structural verification: all five `apps/web/src/app/{reception,doctor,diagnostics,
  pharmacy,admin}/loading.tsx` files exist and render the shared `PortalLoading` (built from the
  `Skeleton` primitive); `next build` output confirms `/doctor`, `/reception`, `/diagnostics`,
  `/pharmacy`, `/admin` are all `ƒ` (server-rendered on demand), so the Next.js App Router
  automatically wraps each in the `loading.tsx` Suspense boundary. `error.tsx` files confirmed to
  never pass `error.message`/`.stack`/`.digest` into `PortalError` (grep clean).
- **Not automatable / deferred:** a dynamic Playwright assertion that the skeleton visibly
  *flashes* under DevTools-style network throttling was attempted (Chrome DevTools Protocol
  `Network.emulateNetworkConditions`) and dropped as unreliable — CDP throttling only slows
  browser<->server byte delivery, not the Next.js server's own outbound Supabase round-trip
  inside `getStaff()`/page data fetching, so the streamed fallback's timing isn't reproducible
  headlessly on this fast local Supabase project. The wiring is structurally proven; the actual
  visual flash is listed below for a human pass.

### Automated gates already green (re-confirmed this session)
- `pnpm --filter @light/web typecheck` — exit 0, clean.
- `pnpm --filter @light/web build` — succeeds, all 5 role routes present as dynamic (`ƒ`) routes.
- `apps/web/e2e/login.spec.ts` (3 specs, scratch port-3100 config) — all pass.
- Supplemental scratch spec `checkpoint-verify.spec.ts` (4 specs covering steps 1/3/4/5) — all pass.

## Deferred to human review

These items are structurally verified and behaviorally proven wherever automatable, but are
listed explicitly for a human pass because they are inherently visual/tactile:

1. **Tablet-width visual layout** — the plan's 390px/1280px viewport checks above prove the
   hamburger-drawer *mechanics* (open/close on tap/overlay/Escape, collapse-to-rail toggle), but
   not whether the layout *looks* correct at true tablet widths (e.g. iPad 768-1024px landscape)
   — spacing, touch-target sizing, and any visual overlap should get a human glance.
2. **Drawer open/close animation feel** — the `Sheet` component is a plain conditional mount/
   unmount (no CSS transition classes observed in `apps/web/src/components/ui/sheet.tsx`), so the
   drawer likely appears/disappears instantly rather than sliding. Not a functional defect (all
   close paths work), but if a slide-in feel was expected per "tablet-first, hard requirement,"
   a human should confirm whether that's acceptable for v1 or worth a follow-up polish item.
3. **Throttled-network loading skeleton flash** — see step 7 note above; wiring is structurally
   correct (loading.tsx exists per portal, renders the Skeleton-based PortalLoading, nested
   inside DashboardLayout via the Next.js App Router Suspense convention), but the actual visible
   flash under a real "Slow 3G" DevTools throttle was not reproducible in headless automation and
   should get one manual confirmation.

## Task Commits

This plan is verification-only (`files_modified: []` in frontmatter, `<files>none</files>` in the
task). No task-level commit was made — the only commit for this plan is the metadata/docs commit
carrying this SUMMARY.md, STATE.md, and ROADMAP.md updates (see below).

## Files Created/Modified

None. All verification artifacts (scratch Playwright configs and the supplemental spec) live
under the session scratchpad directory, not the repository, per the plan's "no files change"
mandate.

## Decisions Made

- Auto-approved the checkpoint per the `--auto` chain policy after exhausting every automatable
  proxy for the 7 manual steps; two genuinely-visual items (tablet layout feel, throttled-network
  skeleton flash) are explicitly deferred rather than silently marked verified.
- Did not modify `apps/web/src/app/login/page.tsx` to add `noValidate` despite discovering the
  native-vs-zod validation shadowing, because this task's own `<action>` explicitly prohibits code
  changes ("Do not modify code in this task — this is a blocking human gate... do not attempt
  fixes here"). Documented as a finding for gap-closure instead of auto-fixing under Rule 1/2,
  since the plan's task-level instruction takes precedence for this specific checkpoint task.

## Deviations from Plan

### Auto-fixed Issues

None — this plan modifies no application code by design.

### Findings Documented (not auto-fixed, per task instruction)

**1. Login form missing `noValidate`; native email validation shadows zod's custom message**
- **Found during:** automated proxy for checkpoint step 1
- **Issue:** `apps/web/src/app/login/page.tsx`'s `<form onSubmit={onSubmit}>` has no
  `noValidate` attribute, so `<input type="email">`'s native browser constraint validation
  intercepts malformed emails (e.g. missing `@`) before the zod schema / custom
  `<p role="alert">` path ever executes.
- **Impact:** Low. Acceptance criteria ("inline validation message, no spinner, stays on
  /login") are still met via the browser's own tooltip; only the message *source* differs from
  what the code implies, and cross-browser/locale copy consistency is not guaranteed.
- **Action taken:** Documented only, per this task's explicit "no code changes" instruction.
  Not fixed here.
- **Files:** none modified.

---

**Total deviations:** 0 auto-fixed, 1 documented finding (non-blocking).
**Impact on plan:** None on scope. The finding is a candidate for the gap-closure loop or a
future Phase 2 polish pass, not a phase blocker — core acceptance criteria for step 1 are met.

## Issues Encountered

- Port 3000 was held by an unrelated local process (confirmed via `lsof`), same as Plans 01-03/04
  environment notes. Worked around with a scratch, non-committed Playwright config targeting
  port 3100, `apps/web/playwright.config.ts` itself untouched.
- CDP-based network-throttling assertion for the loading-skeleton flash (step 7) was attempted
  and intentionally dropped as unreliable in headless automation (see "Deferred to human review"
  above) rather than left flaky in the evidence trail.

## User Setup Required

None — no external service configuration required for this verification-only plan.

## Next Phase Readiness

- Phase 1 success criteria (AUTH-01, AUTH-02, AUTH-03, SHELL-01, SHELL-02) are all confirmed by
  automated proxy evidence against the live app and live Supabase project. Phase 1 is complete;
  Phase 2 (Reception & Doctor Flow) can build on `DashboardLayout`, `Sidebar`, `Sheet`,
  `PortalLoading`/`PortalError`/`EmptyState`, and the full D-01 primitive library with confidence
  the walking skeleton is sound.
- Three items are flagged for a human glance before/alongside Phase 2 (see "Deferred to human
  review"), none of which block Phase 2 start.
- One low-priority finding (login form `noValidate`) is documented for optional gap-closure.

---
*Phase: 01-staff-auth-shared-shell*
*Completed: 2026-07-09*

## Self-Check: PASSED

This plan created/modified no repository files, so there is nothing to verify on disk beyond
this SUMMARY.md itself:
- FOUND: .planning/phases/01-staff-auth-shared-shell/01-05-SUMMARY.md

No task-level commit hashes exist for this plan (verification-only, no `<files>` to stage); the
only commit is the metadata/docs commit made immediately after this file, confirmed via
`git log` after committing below.
