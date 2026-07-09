# Walking Skeleton — Light Healthcare HMS (Web Staff Portal)

**Phase:** 1
**Generated:** 2026-07-09

## Capability Proven End-to-End

A seeded staff member signs in with email/password at `/login`, is redirected by
the existing role-routing middleware to their role home (e.g. `/doctor`), and sees
their own name (read live from the `staff` table) in the header of a shared
`DashboardLayout`, from which they can log out. Opening another role's URL bounces
them back to their own home.

This single flow exercises the entire stack: Next.js App Router routing →
role-routing middleware → Supabase Auth (`signInWithPassword`) → server-side
`staff` row read (identity) → shared layout render → sign-out.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 App Router + TS strict (existing) | Fixed by brief; scaffold already present in `apps/web` |
| Data layer | Supabase (Postgres + Auth) via `@supabase/ssr` typed clients (existing) | Single backend `rylceydkrydmpysmibba`; clients already typed with generated `Database` |
| Auth | Staff = email/password via Supabase Auth; role resolved server-side from `staff.role`; no self-signup | Brief mandate (AUTH-01/02); accounts are admin-seeded |
| Session handling | httpOnly Supabase cookies refreshed in `middleware.ts` via `updateSession` (`getUser()` revalidation) — KEPT, not rewritten | Existing helper is correct (D-09) |
| Role routing | Existing `src/middleware.ts` — cross-role blocking + role-home redirect — KEPT | Correct per D-09; only the shared-types enum is fixed |
| UI primitives | Hand-rolled shadcn-style primitives in `apps/web/src/components/ui/` (no shadcn CLI, no radix) | D-01/D-02; keeps dep surface small, later swap is mechanical |
| Styling | Tailwind + single `ROLE_THEME` accent map (reception blue, doctor purple, diagnostics amber, pharmacy green, admin gray) | D-05; brief-mandated accents |
| Identity fetch | Per-role `layout.tsx` (server component) fetches the `staff` row once and passes it to `DashboardLayout`; pages never re-fetch identity | D-07 |
| Timezone | All displayed dates via `formatIST` (`Intl.DateTimeFormat`, `Asia/Kolkata`) in `src/lib/format.ts` | D-14; Indian hospital |
| E2E proof | Playwright smoke test (`apps/web/e2e/login.spec.ts`) drives the real login flow against seeded staff | Walking-skeleton stack proof; the only automated full-stack gate |
| Directory layout | `apps/web/src/{app,components,components/ui,lib}` with `@/` → `src` alias; e2e specs under `apps/web/e2e` | Established pattern; keeps test code out of the build tree |

## Stack Touched in Phase 1

- [x] Project scaffold — Next.js/Tailwind/TS already present; Phase 1 adds runtime deps (`zustand`, `date-fns`, `lucide-react`, `sonner`, `zod`) + Playwright dev dep
- [x] Routing — real routes `/login` + `/reception|/doctor|/diagnostics|/pharmacy|/admin`, guarded by existing middleware
- [x] Database — real READ: server-side `staff` row lookup by `auth_user_id` in each role `layout.tsx`. WRITE: Supabase Auth session establishment on `signInWithPassword` (app-table writes begin Phase 2 — this phase is admin-seeded, no signup per AUTH-01)
- [x] UI — interactive login form (zod + `signInWithPassword` + sonner toast) and interactive shell (collapsible sidebar, hamburger drawer, logout button) wired to Supabase Auth
- [x] Deployment — documented local full-stack run: `pnpm --filter @light/web dev` (uses existing `.env.local`); e2e via `pnpm --filter @light/web test:e2e`

## Out of Scope (Deferred to Later Slices)

- Any portal feature (queue, consultation, orders, prescriptions, billing, inventory) — Phases 2-3
- Patient phone-OTP auth and the mobile app — Phase 4
- AI services — Phase 5
- Password reset / forgot-password / self-signup — permanently out for staff (admin-seeded accounts, AUTH-01)
- Persisting sidebar collapse state across sessions — Phase 1 uses local `useState` (D-04); zustand is installed per D-03 for later realtime views but not wired here
- Real page content behind the role homes — Phase 1 role pages are minimal placeholders inside the shell; Phase 2 fills them
- Form primitives `tabs/textarea/select/table` are built (D-01 contract) but have no Phase-1 consumer — they exist for Phase 2

## Subsequent Slice Plan

Each later phase adds vertical slices on top of this skeleton without renegotiating
its architectural decisions (clients, middleware, layout shell, theme, IST helper):

- Phase 2: Reception live queue/registry/billing + doctor consultation/orders/prescriptions
- Phase 3: Diagnostics result upload + pharmacy atomic dispense against live stock
- Phase 4: Expo patient app (phone-OTP auth, booking, reports) — independent track
- Phase 5: FastAPI mock AI endpoints (triage, drug-check, scribe) — independent track
