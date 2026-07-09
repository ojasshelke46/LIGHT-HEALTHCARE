# Deferred Items — Phase 01 staff-auth-shared-shell

Out-of-scope discoveries logged during plan execution (not fixed, per scope boundary rule).

## From Plan 01-02

- **Edge Runtime warning in `next build`**: `@supabase/supabase-js` (via `@supabase/ssr`'s
  `createBrowserClient`) uses a Node.js API (`process.version`) not supported in the Edge
  Runtime. Build trace points to `apps/web/src/lib/supabase/middleware.ts`, which imports the
  browser client chain. This file is pre-existing (KEPT per D-09, not modified by 01-01 or
  01-02) and the warning does not fail the build or affect current functionality — middleware
  still runs correctly. Out of scope for 01-02 (files_modified for this plan: `lib/utils.ts`,
  `components/ui/*`, `app/login/page.tsx`, `app/layout.tsx` — none touch
  `lib/supabase/middleware.ts`). Flagging for awareness if a future Supabase/Next.js upgrade
  needs to address it.
