# Deferred Items — Phase 04

Out-of-scope discoveries logged during execution (not fixed — see scope boundary rule).

## 1. `pnpm --filter @light/web typecheck` fails (pre-existing, predates Phase 4)

- **Found during:** 04-01 Task 3 gate re-verification.
- **Error:** `TS2786: 'Button' cannot be used as a JSX component` in `apps/web/src/app/reception/queue-row.tsx`,
  `apps/web/src/components/dashboard-layout.tsx`, `apps/web/src/components/portal-error.tsx`,
  `apps/web/src/components/sign-out-button.tsx` — `packages/ui`'s `forwardRef`-based `Button` is
  incompatible with `@types/react@19.2.17`'s stricter `ReactNode` type.
- **Root cause investigation:** `@types/react@19.2.17` has been present in `pnpm-lock.yaml` since the
  very first commit in the repo (`2322691 chore: commit existing monorepo scaffold baseline`),
  confirmed by walking `git log --oneline -- pnpm-lock.yaml` and grepping every commit's lockfile —
  the version never changed. This predates the `04-mobile-patient-app` phase plan (`fb9cd57`) and
  every mobile task. It is unrelated to any file touched by 04-01 (`apps/mobile/**` only).
- **Why not fixed:** CLAUDE.md / execution instructions for this session explicitly say "Do not
  modify apps/web source," and the fix belongs in `packages/ui` (shared web UI kit), which is out of
  scope for a mobile-app plan. Scope-boundary rule: only auto-fix issues directly caused by the
  current task's changes.
- **Suggested fix (future plan):** Either pin `@types/react`/`@types/react-dom` to a version where
  `forwardRef` + `ReactNode` compose cleanly, or update `packages/ui`'s `Button` to the React 19
  `ref`-as-prop pattern (drop `forwardRef`). Needs its own plan/task against `packages/ui` +
  `apps/web`.
- **Impact on 04-01:** None — the plan's own `<verification>` block only requires
  `pnpm --filter @light/mobile exec tsc --noEmit`, `pnpm --filter @light/mobile run export`, and
  `pnpm --filter @light/mobile test`, all of which pass. `apps/web` typecheck is unaffected by (and
  unrelated to) this plan's changes.
