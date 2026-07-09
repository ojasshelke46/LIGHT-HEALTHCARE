---
phase: 01-staff-auth-shared-shell
plan: 04
subsystem: ui
tags: [nextjs, typescript, tailwind, lucide-react, shadcn-style]

# Dependency graph
requires:
  - phase: 01-staff-auth-shared-shell/03
    provides: "Skeleton primitive, Button primitive, DashboardLayout with D-13 async-state convention documented in file header, five per-role layout.tsx"
provides:
  - "PortalLoading (page-shaped skeleton), PortalError (destructive retry, no raw error internals), EmptyState (icon+title+description) — the D-12/D-13 async-state building blocks"
  - "loading.tsx + error.tsx wired into all five role route groups (reception/doctor/diagnostics/pharmacy/admin), nested inside DashboardLayout"
  - "Full 11-primitive D-01 hand-rolled component library: button, card, input, label, badge, tabs, textarea, select, table, skeleton, sheet"
affects: [01-05, phase-02, phase-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Segment-level loading.tsx/error.tsx are thin re-exports of shared components (PortalLoading/PortalError) — Phase 2+ specializes per-page skeleton shapes without touching the segment files' contract"
    - "PortalError never renders error.message/error.stack/digest — fixed generic copy only (T-01-13); reset() is the only interactive element, no auto-retry"
    - "Tabs uses React context for controlled/uncontrolled active-value state, matching the shadcn API surface (Tabs/TabsList/TabsTrigger/TabsContent) for a mechanical future swap to radix"
    - "Select stays native <select> (a11y/keyboard free) with a SelectItem = \"option\" as const convenience alias, documented in-file as a deliberate v1 choice, not a scope cut"

key-files:
  created:
    - apps/web/src/components/portal-loading.tsx
    - apps/web/src/components/portal-error.tsx
    - apps/web/src/components/empty-state.tsx
    - apps/web/src/app/reception/loading.tsx
    - apps/web/src/app/reception/error.tsx
    - apps/web/src/app/doctor/loading.tsx
    - apps/web/src/app/doctor/error.tsx
    - apps/web/src/app/diagnostics/loading.tsx
    - apps/web/src/app/diagnostics/error.tsx
    - apps/web/src/app/pharmacy/loading.tsx
    - apps/web/src/app/pharmacy/error.tsx
    - apps/web/src/app/admin/loading.tsx
    - apps/web/src/app/admin/error.tsx
    - apps/web/src/components/ui/tabs.tsx
    - apps/web/src/components/ui/textarea.tsx
    - apps/web/src/components/ui/select.tsx
    - apps/web/src/components/ui/table.tsx
  modified: []

key-decisions:
  - "SelectItem implemented literally as `export const SelectItem = \"option\" as const` per the plan's \"option\"-style convenience wording — a typed string-literal alias so <SelectItem value=\"x\"> renders a plain <option>, no wrapper component needed"
  - "Table sub-components (TableHeader/Body/Row/Head/Cell) all use forwardRef for API parity with Textarea/Select, even though the plan's acceptance criteria only required forwardRef on Textarea/Select"

patterns-established:
  - "Async-state trio (PortalLoading/PortalError/EmptyState) is the canonical Phase-1 building block set; Phase 2+ realtime views compose EmptyState + their own skeleton/error markup per the D-13 convention already documented in dashboard-layout.tsx"
  - "All 10 per-portal loading.tsx/error.tsx files are intentionally identical thin wrappers — mechanical, no per-segment logic, so Phase 2 can specialize without touching the segment file contract"

requirements-completed: [SHELL-02]

# Metrics
duration: ~6min
completed: 2026-07-09
---

# Phase 1 Plan 4: Async-State Conventions & Primitive Library Completion Summary

**Shared PortalLoading/PortalError/EmptyState components wired as loading.tsx/error.tsx into all five role portals, plus the final four hand-rolled primitives (tabs, textarea, select, table) completing the 11-component D-01 shadcn-style library.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-09T12:43:00+05:30
- **Completed:** 2026-07-09T12:46:30+05:30
- **Tasks:** 3 completed
- **Files modified:** 17 (all created)

## Accomplishments
- `PortalLoading` composes the `Skeleton` primitive into a generic page shape (title bar + 5 row placeholders) for server-rendered portal routes
- `PortalError` (`"use client"`) renders a destructive-toned block with a "Try again" button wired to `reset()`; never surfaces `error.message`/`error.stack`/`digest` (T-01-13 mitigated)
- `EmptyState` renders a centered lucide icon + title + optional description, typed with `LucideIcon`, ready for Phase 2+ realtime "no rows" views
- All 5 role segments (reception, doctor, diagnostics, pharmacy, admin) now have `loading.tsx` (renders `PortalLoading`) and `error.tsx` (client boundary rendering `PortalError` with `reset`), nested inside each role's `DashboardLayout`
- Completed the D-01 primitive set: `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (context-based, `aria-selected`, keyboard-focusable), `Textarea` (forwardRef, cn-merged), `Select` (native-backed forwardRef + `SelectItem` convenience), `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` (all forwardRef, shadcn-compatible export names) — 11/11 primitives now present in `components/ui/`
- No new dependencies introduced; verified no `@radix-ui`/`class-variance-authority`/`clsx`/`tailwind-merge` in `apps/web/package.json`
- `pnpm --filter @light/web typecheck` and `pnpm --filter @light/web build` both pass cleanly after every task

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared async-state components (loading skeleton, error boundary, empty state)** - `22dd015` (feat)
2. **Task 2: Wire per-portal loading.tsx + error.tsx for all 5 role segments** - `02eca71` (feat)
3. **Task 3: Complete the primitive library — tabs, textarea, select, table (D-01)** - `b5ae283` (feat)

**Plan metadata:** committed in this same operation (docs commit follows below)

## Files Created/Modified
- `apps/web/src/components/portal-loading.tsx` - shared page-shaped skeleton built from `Skeleton`
- `apps/web/src/components/portal-error.tsx` - client error boundary, destructive-toned retry, no raw error internals
- `apps/web/src/components/empty-state.tsx` - reusable icon + title + description empty view
- `apps/web/src/app/{reception,doctor,diagnostics,pharmacy,admin}/loading.tsx` - thin re-exports rendering `PortalLoading`
- `apps/web/src/app/{reception,doctor,diagnostics,pharmacy,admin}/error.tsx` - thin client boundaries rendering `PortalError`
- `apps/web/src/components/ui/tabs.tsx` - context-based `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`
- `apps/web/src/components/ui/textarea.tsx` - forwardRef textarea matching Input's focus-ring pattern
- `apps/web/src/components/ui/select.tsx` - native-backed forwardRef select + `SelectItem` alias
- `apps/web/src/components/ui/table.tsx` - `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`

## Decisions Made
- `SelectItem` implemented literally as `export const SelectItem = "option" as const`, matching the plan's "option"-style convenience wording exactly — a typed literal alias rather than a wrapper component, kept trivial per the plan's own framing
- Table sub-components given `forwardRef` uniformly (not just Textarea/Select) for consistency with the rest of the primitive library and to ease a future radix swap, even though only Textarea/Select were explicitly required to forward refs by the acceptance criteria

## Deviations from Plan

None - plan executed exactly as written. All three tasks matched their `<action>` specs; all automated `<verify>` commands and `<acceptance_criteria>` grep/typecheck/build checks passed on the first attempt with no fixes needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SHELL-02 satisfied: every portal segment has a page-shaped loading skeleton and a destructive-toned error boundary with working retry, both rendered inside `DashboardLayout`.
- The full D-01 primitive library (11 hand-rolled components: button, card, input, label, badge, tabs, textarea, select, table, skeleton, sheet) is now complete and available for Phase 2 portal feature work (reception queue, doctor consult panel, diagnostics orders, pharmacy dispense, etc.) — no primitive blockers remain.
- `EmptyState` is ready for Phase 2+ client realtime views per the D-13 convention already documented in `dashboard-layout.tsx`'s file header.
- No blockers. Port 3000 remains held by an unrelated local process (does not affect this plan — no e2e run was required since no user-facing route behavior changed beyond loading/error shells verified via build).

---
*Phase: 01-staff-auth-shared-shell*
*Completed: 2026-07-09*

## Self-Check: PASSED

All created files confirmed present on disk:
- FOUND: apps/web/src/components/empty-state.tsx
- FOUND: apps/web/src/components/portal-loading.tsx
- FOUND: apps/web/src/components/portal-error.tsx
- FOUND: apps/web/src/app/reception/loading.tsx
- FOUND: apps/web/src/app/reception/error.tsx
- FOUND: apps/web/src/app/doctor/loading.tsx
- FOUND: apps/web/src/app/doctor/error.tsx
- FOUND: apps/web/src/app/diagnostics/loading.tsx
- FOUND: apps/web/src/app/diagnostics/error.tsx
- FOUND: apps/web/src/app/pharmacy/loading.tsx
- FOUND: apps/web/src/app/pharmacy/error.tsx
- FOUND: apps/web/src/app/admin/loading.tsx
- FOUND: apps/web/src/app/admin/error.tsx
- FOUND: apps/web/src/components/ui/tabs.tsx
- FOUND: apps/web/src/components/ui/textarea.tsx
- FOUND: apps/web/src/components/ui/select.tsx
- FOUND: apps/web/src/components/ui/table.tsx

All commit hashes confirmed present in git history:
- FOUND: 22dd015 (Task 1)
- FOUND: 02eca71 (Task 2)
- FOUND: b5ae283 (Task 3)
- FOUND: 92e87cf (docs: SUMMARY.md)
