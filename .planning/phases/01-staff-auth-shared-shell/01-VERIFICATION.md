---
phase: 01-staff-auth-shared-shell
verified: 2026-07-09T11:47:44Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 1: Staff Auth & Shared Shell Verification Report

**Phase Goal:** Staff can securely log into their role-scoped portal and every page renders inside a consistent, resilient layout
**Verified:** 2026-07-09T11:47:44Z
**Status:** passed
**Re-verification:** No — initial verification

**Process note (non-blocking):** ROADMAP.md tags this phase `mode: mvp`, but the phase goal is written as a plain outcome statement, not the `As a [role], I want to [capability], so that [outcome].` user-story format (confirmed via `gsd-sdk query user-story.validate` → `valid: false`). Per MVP-mode rules this would normally halt verification and ask for `/gsd mvp-phase` reformatting. Proceeding anyway because ROADMAP.md already carries 5 concrete, testable Success Criteria for this phase (the standard goal-backward contract) and the calling workflow explicitly requested standard success-criteria verification. Flagging so the goal can be reformatted or the mode corrected before Phase 2 if the project wants strict MVP framing going forward.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Staff can log in with email/password and land on their role home; opening another role's URL is blocked | VERIFIED | `apps/web/src/app/login/page.tsx` (zod-validated `signInWithPassword`); `apps/web/src/middleware.ts` resolves `staff.role`, redirects `/`→role home, bounces cross-role paths back to own home. Independently re-ran `login.spec.ts` against the live Supabase project (port-3100 scratch config, not committed): all 3 specs pass, including "opening another role's portal bounces back to own home". |
| 2 | Login errors surface as toasts, not silent failures or raw error text | VERIFIED | `login/page.tsx:47-51` shows fixed string `toast.error("Invalid email or password")` on any Supabase auth error — never `error.message`. Grep confirms only 2 `toast.error(...)` call sites in the whole app (login + sign-out), both fixed generic copy, zero `error.message`/`.stack`/`.digest` interpolation anywhere in `app/`/`components/`. Re-ran e2e spec 3 ("invalid credentials show a generic error toast and stay on /login") live — passes. |
| 3 | Every portal page renders inside the shared DashboardLayout: collapsible sidebar (hamburger on mobile), role accent color, header with staff name and logout | VERIFIED | `apps/web/src/components/dashboard-layout.tsx` renders fixed/collapsible desktop `<aside>` + `Sheet`-based mobile drawer (hamburger `aria-label="Open menu"`), sticky header with `theme.label`, `data-testid="staff-name"`, `<SignOutButton/>`. `apps/web/src/lib/theme.ts` `ROLE_THEME` accents match the brief exactly (reception `bg-blue-600`, doctor `bg-purple-600`, lab_tech `bg-amber-500`, pharmacist `bg-green-600`, admin `bg-gray-600`). All 5 role `layout.tsx` files (`reception/doctor/diagnostics/pharmacy/admin`) call `getStaff()` once and wrap children in `<DashboardLayout staff={...} role="...">` — confirmed by direct file read, no page bypasses the shell. |
| 4 | Staff can log out from the header on any page and return to login | VERIFIED | `sign-out-button.tsx` calls `supabase.auth.signOut()`, surfaces a toast on failure (post-review fix WR-05), then `router.replace("/login")` + `router.refresh()`. The committed e2e suite only asserts the sign-out control is *visible*, not that clicking it works, so this was independently spot-checked: wrote and ran a supplemental Playwright spec (scratch, not committed) that logs in, clicks `data-testid="sign-out"`, confirms landing on `/login`, then confirms a subsequent visit to `/doctor` bounces back to `/login` (session actually cleared) — **passed** against the live Supabase project. |
| 5 | Every page shows a skeleton while loading, an error state on failure, and an empty state when there are no rows | VERIFIED | All 5 role segments have `loading.tsx` (renders shared `PortalLoading`, built from the `Skeleton` primitive) and `error.tsx` (renders shared `PortalError`, never surfaces `error.message`/`.stack`/`.digest`, `reset()`-driven retry only) — confirmed present on disk for reception/doctor/diagnostics/pharmacy/admin. `next build` output confirms `/reception`,`/doctor`,`/diagnostics`,`/pharmacy`,`/admin` are dynamic (`ƒ`) routes, so Next's App Router wraps each in the `loading.tsx` Suspense boundary automatically. `EmptyState` component exists (`components/empty-state.tsx`) as the shared icon+title+description primitive Phase 2+ realtime views will use — Phase 1 has no data-fetching list views itself (explicitly out of scope per `01-CONTEXT.md`: "No portal features (queue, consult, etc.) — those are Phases 2-3"), so this criterion is satisfied as "the convention is established and the building blocks exist," which matches the phase's own scope boundary. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/app/login/page.tsx` | Centered-card zod-validated login form | VERIFIED | `min-h-screen items-center justify-center` centered `<Card>`; zod `schema.safeParse`; `signInWithPassword`; `noValidate` on form (post-review fix WR-01); dev-only credential hint gated behind `NODE_ENV==="development"` (post-review fix CR-01) |
| `apps/web/src/middleware.ts` | Role routing + cross-role block (kept per D-09) | VERIFIED | Redirects unauth → `/login`; resolves `staff.role`; redirects `/`/login → role home; bounces cross-role paths |
| `apps/web/src/lib/staff.ts` | Server-only `getStaff()` identity read | VERIFIED | `getUser()` revalidation, redirect-on-absent, never returns null |
| `apps/web/src/components/dashboard-layout.tsx` | Shared shell: sidebar, header, staff name, logout | VERIFIED | Desktop collapsible aside + mobile `Sheet` drawer + sticky header, wired |
| `apps/web/src/components/sidebar.tsx` | Role-accented nav, active highlight, collapsed rail | VERIFIED | `usePathname()` active state; `aria-label`+`title` on collapsed links (post-review fix WR-02) |
| `apps/web/src/components/ui/sheet.tsx` | A11y mobile drawer | VERIFIED | Focus trap, initial focus, focus restore on close, `aria-label` (post-review fixes WR-03/IN-03) |
| `apps/web/src/components/sign-out-button.tsx` | Logout control | VERIFIED | Surfaces `signOut()` errors via toast instead of silently redirecting (post-review fix WR-05) |
| `apps/web/src/lib/format.ts` | `formatIST` shared timestamp helper | VERIFIED | Fails soft (`"—"`) on invalid/empty dates instead of throwing (post-review fix WR-04) |
| `apps/web/src/app/{role}/layout.tsx` (×5) | Per-role shell wiring | VERIFIED | All 5 present, each calls `getStaff()` once, wraps in `DashboardLayout` with correct role |
| `apps/web/src/app/{role}/loading.tsx` + `error.tsx` (×5 each) | Async-state convention | VERIFIED | All 10 files present, thin wrappers around shared `PortalLoading`/`PortalError` |
| `apps/web/src/components/empty-state.tsx` | Reusable "no rows" state | VERIFIED (not yet consumed) | Exists, typed, ready for Phase 2+ realtime views; no Phase 1 page has a data list to demonstrate it against (in scope boundary) |
| `apps/web/e2e/login.spec.ts` | Walking-skeleton e2e contract | VERIFIED | 3 specs (happy path+name+logout visible, cross-role bounce, invalid-creds toast) — re-ran independently against live Supabase, 3/3 pass |
| `packages/shared-types/src/index.ts` | `StaffRole`/`AppointmentStatus` derived from generated DB enums | VERIFIED | Indexed access into `Database["public"]["Enums"]`, no hand-written literal unions; `in_consult` drift fixed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `login/page.tsx` | Supabase Auth | `signInWithPassword` | WIRED | Confirmed by live e2e run (happy path + invalid-credentials specs both pass against real project `rylceydkrydmpysmibba`) |
| `middleware.ts` | `staff` table (RLS) | `.select("role").eq("auth_user_id", user.id)` | WIRED | Confirmed via live cross-role-bounce e2e spec |
| `{role}/layout.tsx` | `DashboardLayout` | `getStaff()` → props | WIRED | All 5 layouts read staff once and pass into `DashboardLayout`; `staff-name` testid renders it in the header, confirmed live |
| `sign-out-button.tsx` | `/login` | `signOut()` → `router.replace` | WIRED | Confirmed via independent supplemental Playwright spec: click sign-out → lands on `/login` → protected route re-visit bounces back to `/login` (session actually cleared, not just UI navigation) |
| `{role}/loading.tsx`/`error.tsx` | Next.js App Router Suspense/error boundary | file-convention nesting inside `DashboardLayout`-wrapped segment | WIRED | `next build` confirms all 5 role routes are dynamic (`ƒ`), so the Suspense/error boundary convention applies automatically; files present for all 5 segments |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `pnpm --filter @light/web typecheck` | `tsc --noEmit` | exit 0, no output | PASS |
| `pnpm --filter @light/web build` | `next build` | succeeds; all 5 role routes present as dynamic (`ƒ`) routes; only pre-existing/deferred Edge Runtime warning (unrelated to Phase 1 files, logged in `deferred-items.md`) | PASS |
| Login → role home → staff name → logout → cross-role bounce → invalid-creds toast | Re-ran `apps/web/e2e/login.spec.ts` against live Supabase (scratch port-3100 Playwright config, deleted after use) | 3/3 passed | PASS |
| Click sign-out actually clears session and returns to /login | Supplemental scratch Playwright spec (not committed) | 1/1 passed | PASS |
| Code-review fixes (CR-01, WR-01..05, IN-03) actually present in working tree | `git show c72e15a` diff read + direct file reads of `login/page.tsx`, `sidebar.tsx`, `sheet.tsx`, `format.ts`, `sign-out-button.tsx` | All 6 fixes confirmed present in current code, not just claimed in commit message | PASS |
| No raw error text or hardcoded empty/placeholder UI in auth/shell files | `grep -rn "TODO\|FIXME\|PLACEHOLDER\|error.message\|error.stack" apps/web/src/{app,components}` | Only one hit: a stale doc-comment in `middleware.ts` ("PLACEHOLDER role-routing middleware — replace with the team's version") left over from before Phase 1; functionality is correct and e2e-verified, comment is just misleading text | PASS (info-level note below) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-02 | Email/password login, centered card, toast errors, no signup path | SATISFIED | `login/page.tsx` — centered `Card`, zod+`signInWithPassword`, generic toast, no signup/reset controls (grep clean) |
| AUTH-02 | 01-03 | Role home landing + cross-role block | SATISFIED | `middleware.ts` + live e2e cross-role-bounce spec |
| AUTH-03 | 01-03 | Logout from header on any page | SATISFIED | `sign-out-button.tsx` in `DashboardLayout` header + independent logout e2e spot-check |
| SHELL-01 | 01-03 | DashboardLayout: sidebar, role accents, header w/ staff name + logout | SATISFIED | `dashboard-layout.tsx`, `sidebar.tsx`, `theme.ts` — all 5 role layouts wired |
| SHELL-02 | 01-04 | Skeleton/error/empty conventions | SATISFIED | `loading.tsx`/`error.tsx` per segment (×5 each), `PortalLoading`/`PortalError`/`EmptyState` shared components |

REQUIREMENTS.md marks all 5 IDs `[x]` — matches actual code state, no orphaned or falsely-marked requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/middleware.ts` | 6 | Stale doc-comment: "PLACEHOLDER role-routing middleware — replace with the team's version" | Info | No functional impact — middleware is fully correct and e2e-verified (D-09 explicitly kept it as-is). Comment predates Phase 1 and is misleading; worth a one-line cleanup in a future pass but does not block the phase goal. |
| `apps/web/src/app/{reception,doctor,diagnostics,pharmacy,admin}/page.tsx` | — | Placeholder body text ("...arrive in Phase 2/3") | Info | Intentional and honest — these route bodies are explicitly out of scope for Phase 1 per `01-CONTEXT.md` ("No portal features... those are Phases 2-3"); not a stub masquerading as a finished feature. |

No blocker or warning-level anti-patterns found in the auth/shell code paths.

### Human Verification Required

None required to pass this phase. Three items remain flagged from `01-05-SUMMARY.md`/`01-REVIEW.md` as genuinely visual/tactile and are non-blocking for goal achievement (structurally verified, mechanics proven, only the "feel" is unverified by automation):

1. **Tablet-width (768-1024px) visual layout** — hamburger-drawer mechanics proven at 390px/1280px; true tablet-width spacing/overlap not eyeballed.
2. **Drawer open/close animation feel** — `Sheet` is a conditional mount/unmount with no transition classes; likely instant, not sliding. Functionally correct either way.
3. **Throttled-network loading-skeleton flash** — `loading.tsx` wiring is structurally correct and Next.js's Suspense convention guarantees it fires; the actual visible flash under a real slow connection wasn't reproducible in headless CDP throttling.

These are recorded for an optional human glance before/alongside Phase 2 but do not block Phase 1 sign-off — none of the 5 ROADMAP success criteria depend on them.

### Gaps Summary

None. All 5 ROADMAP success criteria are independently verified against the live codebase and a live Supabase project (not just SUMMARY.md claims): typecheck clean, build clean, all 3 committed e2e specs re-run and passing, plus one supplemental logout e2e spec written and run independently to close a gap in the committed suite's coverage (visibility-only, not click-through). All 6 code-review findings (CR-01, WR-01..05, IN-03) were verified fixed by reading the actual diff and current file contents, not by trusting the commit message. The two IN-01/IN-02 review findings remain (duplicate role label, layout trusts route position over `staff.role`) — both are informational, non-blocking, and already explicitly accepted as such in `01-REVIEW.md`.

---

*Verified: 2026-07-09T11:47:44Z*
*Verifier: Claude (gsd-verifier)*
