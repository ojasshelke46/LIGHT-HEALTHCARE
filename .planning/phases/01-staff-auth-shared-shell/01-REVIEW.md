---
phase: 01-staff-auth-shared-shell
reviewed: 2026-07-09T11:38:53Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - apps/web/e2e/login.spec.ts
  - apps/web/package.json
  - apps/web/playwright.config.ts
  - apps/web/src/app/admin/error.tsx
  - apps/web/src/app/admin/layout.tsx
  - apps/web/src/app/admin/loading.tsx
  - apps/web/src/app/admin/page.tsx
  - apps/web/src/app/diagnostics/error.tsx
  - apps/web/src/app/diagnostics/layout.tsx
  - apps/web/src/app/diagnostics/loading.tsx
  - apps/web/src/app/diagnostics/page.tsx
  - apps/web/src/app/doctor/error.tsx
  - apps/web/src/app/doctor/layout.tsx
  - apps/web/src/app/doctor/loading.tsx
  - apps/web/src/app/doctor/page.tsx
  - apps/web/src/app/layout.tsx
  - apps/web/src/app/login/page.tsx
  - apps/web/src/app/pharmacy/error.tsx
  - apps/web/src/app/pharmacy/layout.tsx
  - apps/web/src/app/pharmacy/loading.tsx
  - apps/web/src/app/pharmacy/page.tsx
  - apps/web/src/app/reception/error.tsx
  - apps/web/src/app/reception/layout.tsx
  - apps/web/src/app/reception/loading.tsx
  - apps/web/src/app/reception/page.tsx
  - apps/web/src/components/dashboard-layout.tsx
  - apps/web/src/components/empty-state.tsx
  - apps/web/src/components/portal-error.tsx
  - apps/web/src/components/portal-loading.tsx
  - apps/web/src/components/sidebar.tsx
  - apps/web/src/components/sign-out-button.tsx
  - apps/web/src/components/ui/badge.tsx
  - apps/web/src/components/ui/button.tsx
  - apps/web/src/components/ui/card.tsx
  - apps/web/src/components/ui/input.tsx
  - apps/web/src/components/ui/label.tsx
  - apps/web/src/components/ui/select.tsx
  - apps/web/src/components/ui/sheet.tsx
  - apps/web/src/components/ui/skeleton.tsx
  - apps/web/src/components/ui/table.tsx
  - apps/web/src/components/ui/tabs.tsx
  - apps/web/src/components/ui/textarea.tsx
  - apps/web/src/lib/format.ts
  - apps/web/src/lib/staff.ts
  - apps/web/src/lib/theme.ts
  - apps/web/src/lib/utils.ts
  - packages/shared-types/src/index.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-07-09T11:38:53Z
**Depth:** standard
**Files Reviewed:** 47
**Status:** issues_found

## Summary

Reviewed the staff auth flow (login page, `getStaff()`, sign-out) and the shared dashboard shell
(role-themed `DashboardLayout`, `Sidebar`, hand-rolled `ui/*` primitives, async-state conventions)
against the locked Phase 1 decisions in `01-CONTEXT.md`. The hand-rolled primitives strategy
(D-01, no radix/shadcn) is accepted as intentional and not flagged. `middleware.ts` and the
Supabase client helpers were read for context only (per D-09, kept-as-is) and are not the subject
of findings here, though `getStaff()`'s reliance on them is noted.

The most serious issue is a **hardcoded staff credentials hint permanently rendered on the public
`/login` page** — unconditional, not gated by environment, and pointing at real seeded accounts on
a live Supabase project per the Plan 02 SUMMARY. This should not ship as-is.

The rest of the findings are accessibility regressions in the hand-rolled `Sheet`/`Sidebar`
primitives (missing focus management, no accessible name for collapsed nav links), a documented
but unfixed native-vs-zod validation shadowing bug on the login form, a crash-prone edge case in
the shared `formatIST` utility that every future phase will depend on, and a few lower-severity
robustness/consistency nits.

## Critical Issues

### CR-01: Hardcoded staff login credentials rendered on the public login page

**File:** `apps/web/src/app/login/page.tsx:104-106`
**Issue:** The login page unconditionally renders:
```tsx
<p className="text-xs text-slate-500">
  Test: doctor@test.com / reception@test.com — Test1234!
</p>
```
This is not gated behind `process.env.NODE_ENV !== "production"` or any build-time flag — it ships
to every visitor of `/login` in every environment, including a production deploy. Per
`.planning/phases/01-staff-auth-shared-shell/01-02-SUMMARY.md`, these are real seeded credentials
against a live Supabase project (`rylceydkrydmpysmibba`), not placeholder text. Anyone who loads the
public, unauthenticated `/login` route gets a valid staff email/password pair for a hospital
management system that will hold patient data, which is a direct authentication-bypass /
credential-disclosure risk if this build reaches anything but a throwaway dev environment.
**Fix:** Remove the credential hint from the rendered page entirely (keep it in README/dev docs
only), or gate it so it can never render in production:
```tsx
{process.env.NODE_ENV !== "production" && (
  <p className="text-xs text-slate-500">
    Test: doctor@test.com / reception@test.com — Test1234!
  </p>
)}
```
Prefer full removal — even a dev-only gate leaves real credentials in the client bundle/history.

## Warnings

### WR-01: Login form missing `noValidate` — native email validation shadows the zod error message

**File:** `apps/web/src/app/login/page.tsx:66,71`
**Issue:** `<form onSubmit={onSubmit}>` (line 66) has no `noValidate`, and the email `<input
type="email">` (line 71) triggers the browser's native HTML5 constraint validation. For any
non-empty string the browser itself considers a malformed email (e.g. missing `@`), the native
`submit` event never dispatches — React's `onSubmit` (and therefore `schema.safeParse` and the
custom `<p role="alert">` message, "Enter a valid email") never runs. The user instead sees the
browser's own validation bubble, whose copy varies by browser/locale and bypasses the app's
intended single source of truth for validation messaging. This is a previously documented, not-yet-
fixed finding (`01-05-SUMMARY.md`, "Findings Documented").
**Fix:**
```tsx
<form onSubmit={onSubmit} noValidate className="space-y-4">
```
With `noValidate`, all format/required checks funnel through the zod schema and the existing
`role="alert"` message element, giving consistent, app-controlled copy across all browsers.

### WR-02: Collapsed sidebar nav links have no accessible name

**File:** `apps/web/src/components/sidebar.tsx:39-53`
**Issue:** When `collapsed` is true, `Sidebar` renders each nav `<Link>` with only an
`aria-hidden="true"` icon as content:
```tsx
<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
{!collapsed && <span>{item.label}</span>}
```
Since the icon is hidden from assistive tech and the label `<span>` is omitted entirely when
collapsed, the link has no accessible name in the icon-rail state — a screen reader announces an
unlabeled "link" for every nav item. This directly regresses the D-01 mandate that "accessibility
(aria, focus rings, keyboard) [is] built in by hand" for these primitives.
**Fix:** Always provide an accessible name, e.g. via `aria-label` on the `Link` (or a visually-
hidden label span) regardless of collapsed state:
```tsx
<Link
  key={item.href}
  href={item.href}
  aria-label={item.label}
  ...
>
  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
  {!collapsed && <span>{item.label}</span>}
</Link>
```

### WR-03: Hand-rolled `Sheet` (mobile drawer) has no focus management

**File:** `apps/web/src/components/ui/sheet.tsx:17-49` (used from `apps/web/src/components/dashboard-layout.tsx:48-50`)
**Issue:** `Sheet` closes on Escape and overlay click (good), but:
1. On open, focus is never moved into the dialog (no initial-focus/`autoFocus` on a focusable
   element or the dialog container itself) — keyboard users who trigger it via the hamburger button
   have focus left on a now off-screen-context button while a `role="dialog"` panel is visually
   the primary surface.
2. There is no focus trap: the desktop sidebar/main content behind the overlay is not marked
   `inert`/`aria-hidden` and remains in the normal tab order, so `Tab`/`Shift+Tab` can move focus
   out of the open drawer into background content that's supposed to be inaccessible while the
   modal is open.
3. On close (Escape, overlay click, or nav-item click via `onNavigate`), focus is never returned to
   the triggering "Open menu" button, disorienting keyboard/screen-reader users.
This is the kind of gap the D-01 "accessibility built in by hand" mandate is meant to cover for a
hand-rolled dialog/sheet primitive.
**Fix:** On `open`, move focus to the dialog container (`ref` + `.focus()` on a `tabIndex={-1}`
wrapper, or the first focusable child) and add a `Tab` keydown handler that cycles focus within the
dialog's focusable elements (or mark siblings `inert` while open). On close, restore focus to the
element that had focus before open (capture via `document.activeElement` in the effect that reacts
to `open` becoming `true`).

### WR-04: `formatIST` throws on invalid/empty date input instead of failing soft

**File:** `apps/web/src/lib/format.ts:12,26`
**Issue:** `formatIST` does `new Date(input)` (line 12) with no validity check, then
`new Intl.DateTimeFormat(...).format(d)` (line 26). `Intl.DateTimeFormat.prototype.format` throws
`RangeError: Invalid time value` when given an `Invalid Date` (e.g. from an empty string or a
malformed timestamp). Per D-14/PROJECT.md, this helper is meant to be the single mandated path for
*every* displayed timestamp across every future phase's server- and client-rendered views — a single
unexpected/malformed value from a query (or a caller accidentally forwarding an empty string) will
throw during render instead of degrading gracefully. Not reachable yet in Phase 1 (no call sites
exist outside this file), but worth hardening before Phase 2+ wires it in broadly.
**Fix:**
```ts
const d = typeof input === "string" ? new Date(input) : input;
if (Number.isNaN(d.getTime())) return "—";
```

### WR-05: `SignOutButton` ignores the `signOut()` error result

**File:** `apps/web/src/components/sign-out-button.tsx:10-14`
**Issue:**
```tsx
async function onClick() {
  await createClient().auth.signOut();
  router.replace("/login");
  router.refresh();
}
```
The `{ error }` returned by `supabase.auth.signOut()` is discarded. If sign-out fails (e.g. network
error, already-invalid session), the UI still unconditionally navigates to `/login` and refreshes as
if the sign-out succeeded, with no toast/feedback to the user and no distinction from the happy
path. Every other network-touching action in this phase (`login/page.tsx`) explicitly handles and
surfaces its error; this is the one place that doesn't.
**Fix:**
```tsx
async function onClick() {
  const { error } = await createClient().auth.signOut();
  if (error) {
    toast.error("Could not sign out. Please try again.");
    return;
  }
  router.replace("/login");
  router.refresh();
}
```

## Info

### IN-01: Role label rendered twice adjacently in the header

**File:** `apps/web/src/components/dashboard-layout.tsx:79-80`
**Issue:** `<span className="font-semibold">{theme.label}</span>` and
`<Badge className={theme.badge}>{theme.label}</Badge>` render the same string ("Doctor", "Reception",
etc.) side by side with no differentiation — redundant for sighted and screen-reader users alike.
**Fix:** Drop one of the two, or give the `Badge` distinct content (e.g. a fixed "Staff" label) so
the pairing conveys more than a repeated string.

### IN-02: Role layouts trust route position over the fetched `staff.role`

**File:** `apps/web/src/app/admin/layout.tsx:7` (and the doctor/diagnostics/pharmacy/reception equivalents)
**Issue:** Each role layout hardcodes the `role` prop passed to `DashboardLayout` (e.g.
`role="admin"` in `admin/layout.tsx`) rather than deriving it from `staff.role` returned by
`getStaff()`. Correctness today depends entirely on `middleware.ts`'s cross-role blocking having
already run for every request that reaches this layout. This is defense-in-depth, not a live
vulnerability (actual data access is still gated by RLS, and D-09 documents the middleware as
already correct/kept), but a layout-level assertion would catch any future regression (e.g. a new
route added outside the middleware matcher) instead of silently rendering the wrong role's
theme/nav for a staff member.
**Fix:** Optionally assert `staff.role === role` inside the layout (or derive `role` from
`staff.role` directly instead of a literal) and redirect/error on mismatch, for defense in depth.

### IN-03: `Sheet` dialog has no accessible name

**File:** `apps/web/src/components/ui/sheet.tsx:36-46`
**Issue:** The drawer panel is `role="dialog" aria-modal="true"` with no `aria-label` or
`aria-labelledby`, so assistive tech announces an unnamed dialog when the mobile nav drawer opens.
**Fix:** Add `aria-label="Navigation"` (or `aria-labelledby` pointing at the role label rendered
inside `Sidebar`) to the dialog `<div>`.

---

_Reviewed: 2026-07-09T11:38:53Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
