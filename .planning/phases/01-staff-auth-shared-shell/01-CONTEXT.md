# Phase 1: Staff Auth & Shared Shell - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can log in with email/password, land on their role home, and every portal page renders inside a shared DashboardLayout (role-accented sidebar, header with live staff name, logout) with skeleton/error/empty conventions established for all later phases. No portal features (queue, consult, etc.) — those are Phases 2-3.

</domain>

<decisions>
## Implementation Decisions

### UI primitives strategy
- **D-01:** Hand-rolled shadcn-style primitives in `apps/web/src/components/ui/` (button, card, input, label, badge, tabs, textarea, select, table, skeleton, sheet/dialog). No shadcn CLI, no radix — plain React + Tailwind with matching component APIs so a later swap to real shadcn is mechanical. Accessibility (aria, focus rings, keyboard) built in by hand.
- **D-02:** `packages/ui` stays as-is (thin); web-app primitives live in the app, not the shared package, until mobile needs shared pieces.
- **D-03:** New deps for apps/web: `zustand`, `date-fns`, `lucide-react`, `sonner`, `zod`. Tailwind theme extends role accent colors.

### Sidebar / navigation
- **D-04:** Desktop: fixed left sidebar, collapsible to icon rail. Below `md`: hidden, opens as overlay drawer via hamburger in header. State local (useState) — no store needed.
- **D-05:** Role accents via a single `ROLE_THEME` config map (reception blue, doctor purple, diagnostics/lab_tech amber, pharmacy green, admin gray) driving Tailwind classes; nav items + lucide icons defined per role in the same map.
- **D-06:** Active nav item highlighted from `usePathname()`.

### Staff identity + logout
- **D-07:** Each role route group gets a `layout.tsx` (server component) that fetches the staff row once (`staff` by `auth_user_id`) and renders `<DashboardLayout staff={...} role=...>`. Pages don't re-fetch identity.
- **D-08:** Logout: client button → `supabase.auth.signOut()` → `router.replace("/login")` + `router.refresh()`. Existing `sign-out-button.tsx` upgraded, kept in header.
- **D-09:** Existing middleware (`src/middleware.ts`) and supabase client helpers are KEPT — already correct (getUser revalidation, role routing, cross-role blocking). Only enum fix: middleware imports `StaffRole` from shared-types, which now mirrors DB.

### Login UX
- **D-10:** Centered Card with zod-validated email/password (client-side), `signInWithPassword`, error toast via sonner, button loading state. No signup link, no password reset in v1.
- **D-11:** `<Toaster />` mounted once in root layout.

### Async-state conventions (sets pattern for all phases)
- **D-12:** Server-rendered routes: `loading.tsx` with page-shaped Skeletons + `error.tsx` boundary per portal group.
- **D-13:** Client realtime views (later phases): in-component `{ data, error, loading }` states — skeleton rows while loading, destructive-toned retry block on error, friendly empty state with icon. Convention documented in DashboardLayout file header.
- **D-14:** All timestamps displayed through a shared `formatIST` helper (`Intl.DateTimeFormat` with `Asia/Kolkata`); helper lives in `src/lib/format.ts`.

### Claude's Discretion
- Exact skeleton shapes, icon choices, spacing scale, copy tone. Sidebar collapse animation. Whether admin stub page shows placeholder stats.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & routing (existing, keep)
- `apps/web/src/middleware.ts` — role routing, cross-role blocking, public paths
- `apps/web/src/lib/supabase/middleware.ts` — session refresh helper (updateSession)
- `apps/web/src/lib/supabase/server.ts` / `client.ts` — typed client factories

### Types & schema
- `packages/shared-types/src/database.types.ts` — generated Database types (live schema)
- `packages/shared-types/src/index.ts` — StaffRole, ROLE_HOME, AppointmentStatus (fix `in_consult` → `in_consultation` here)

### Project docs
- `.planning/PROJECT.md` — constraints (typed queries, IST, a11y, sonner, skeletons)
- `.planning/REQUIREMENTS.md` — AUTH-01..03, SHELL-01..02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `updateSession` middleware helper: correct cookie plumbing + getUser revalidation — do not rewrite
- `createClient` (server/browser): already typed with `Database` — reuse everywhere
- `sign-out-button.tsx`: upgrade in place
- `.env.local`: URL + anon key present and working

### Established Patterns
- `@/` path alias → `apps/web/src`
- Workspace imports via `@light/shared-types`
- Tailwind slate baseline in `globals.css`; teal used ad-hoc in placeholders (replaced by role accents)

### Integration Points
- Role layouts wrap existing route dirs: `app/{reception,doctor,diagnostics,pharmacy,admin}/`
- `PortalShell` placeholder replaced by `DashboardLayout`
- Root `layout.tsx` gains `<Toaster />`

</code_context>

<specifics>
## Specific Ideas

Brief mandates: shadcn-style visual default, lucide-react icons, sonner for every toast, role accent colors exactly as listed (reception blue, doctor purple, diagnostics amber, pharmacy green, admin gray), tablet-first responsiveness.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Staff Auth & Shared Shell*
*Context gathered: 2026-07-09*
