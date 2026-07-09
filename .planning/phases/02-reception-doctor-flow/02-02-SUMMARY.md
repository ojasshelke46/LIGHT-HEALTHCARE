---
phase: 02-reception-doctor-flow
plan: 02
subsystem: ui
tags: [supabase, realtime, reception, appointments, rls-blocker]

# Dependency graph
requires:
  - phase: 02-reception-doctor-flow
    provides: "02-01: useRealtimeList hook, APPOINTMENT_STATUS_BADGE/todayISTRange helpers, dev seed"
provides:
  - "/reception live queue page: realtime, slot-ordered, status tabs, name/phone search, stats cards"
  - "Optimistic check-in / no-show pattern (local status override + rollback + sonner) for other role portals to mirror"
  - "apps/web/e2e/reception-queue.spec.ts — locks the queue-row/check-in-btn/no-show-btn/stat-checked-in testid contract"
  - "@supabase/ssr bumped to ^0.10.3 — required for any typed .insert()/.update()/.upsert() call in the repo, not just this plan"
affects: [02-03, 02-04, 02-05, 02-06, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic write: local `optimisticStatus` state seeded from the row, flipped on click, rolled back + toast.error on failure, onChanged() (realtime refetch) reconciles on success"
    - "Client realtime list page composition: page.tsx (thin wrapper) + <Feature>Client.tsx (useRealtimeList + tabs/search/stats) + <Feature>Row.tsx (per-row render + actions)"

key-files:
  created:
    - apps/web/e2e/reception-queue.spec.ts
    - apps/web/src/app/reception/queue-client.tsx
    - apps/web/src/app/reception/queue-row.tsx
  modified:
    - apps/web/src/app/reception/page.tsx
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Bumped @supabase/ssr 0.6.1 -> ^0.10.3 (Rule 3): the resolved @supabase/supabase-js (2.110.1) has a newer 5-generic SupabaseClient signature that 0.6.1's createBrowserClient/createServerClient (3-generic) doesn't match, collapsing every table's Update row type to `never` and breaking .update() typechecking repo-wide, not just in this plan"
  - "queue-row.tsx was created in two passes across Task 2 and Task 3 (minimal render-only stub so queue-client.tsx would typecheck in Task 2's own commit, then fully wired with actions in Task 3) rather than deferring its existence entirely to Task 3, since Task 2's own code renders <QueueRow>"
  - "STOPPED short of claiming e2e verification passes: reception-queue.spec.ts fails against live seeded data due to a confirmed pre-existing Supabase RLS policy defect (Postgres 54001 'stack depth limit exceeded') scoped to the reception role, reproduced independently of any code in this plan via direct REST calls — see Verification Blocker below"

requirements-completed: []  # RECEP-01/02/03 deliberately NOT checked off — see Verification Blocker; code is correct but unverifiable end-to-end until the backend RLS defect is fixed

# Metrics
duration: ~55min
completed: 2026-07-10
---

# Phase 2 Plan 2: Reception Live Queue Summary

**Realtime, slot-ordered `/reception` queue (status tabs, name/phone search, stats cards, optimistic check-in/no-show) — code complete and typechecked, but end-to-end verification is blocked by a pre-existing Supabase RLS recursion bug scoped to the `reception` role.**

## Performance

- **Duration:** ~55 min (including diagnosis of two separate blockers)
- **Started:** 2026-07-10 (session start)
- **Completed:** 2026-07-10
- **Tasks:** 3 (all code complete and committed)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- `apps/web/e2e/reception-queue.spec.ts`: RED e2e locking in the `queue-row-<id>` / `check-in-btn` / `no-show-btn` / `stat-checked-in` testid contract against the real seeded appointments
- `queue-client.tsx`: `useRealtimeList` on `appointments` scoped to today (D-19 fetcher: `patients(name,phone)` + `doctors(id, staff(name))` joins, `todayISTRange` gte/lt, `slot_time asc`), status tabs (All/Booked/Checked In/In Consultation/Completed) + name/phone search filtering the same fetched array client-side (D-20), stats cards (total/checked-in/waiting/completed) computed from that array, loading skeleton / destructive retry / `EmptyState` per the D-13 convention, and a `Live`/`Reconnecting…` `aria-live="polite"` label wired to the hook's `connected` flag
- `queue-row.tsx`: patient name / doctor name / IST slot time / colour-coded `APPOINTMENT_STATUS_BADGE`, plus optimistic check-in (`booked -> checked_in`) and no-show (`booked` + past `slot_time` -> `no_show`) actions with local-state badge flip, rollback, and `sonner` toasts on failure (D-21)
- Fixed a repo-wide typecheck blocker: `@supabase/ssr` was pinned two minor lines behind what the resolved `@supabase/supabase-js` needs, silently breaking every typed `.update()`/`.insert()`/`.upsert()` call across the app (see Deviations)
- Confirmed, via direct REST reproduction (no app code involved), a pre-existing Supabase RLS policy defect scoped to the `reception` staff role that blocks this plan's — and every future reception-role plan's — end-to-end verification (see Verification Blocker)

## Task Commits

Each task was committed atomically:

1. **Task 1: Failing reception-queue e2e (check-in flow, seeded data)** - `f91a799` (test — RED, confirmed against the placeholder page)
2. **Task 2: Live queue page — realtime list, tabs, search, stats** - `21c0a13` (feat)
3. **Task 3: Queue row + optimistic check-in / no-show** - `af32f17` (feat, includes the `@supabase/ssr` bump)

**Plan metadata:** pending (docs: complete plan — this commit)

## Files Created/Modified
- `apps/web/e2e/reception-queue.spec.ts` - Two specs: check-in flow (row visible → click check-in-btn → badge flips → stat-checked-in ≥ 1) and no-show visibility (past-slot booked row shows no-show-btn, future/now booked row doesn't)
- `apps/web/src/app/reception/queue-client.tsx` - `QueueClient` component: fetcher, realtime hook wiring, tabs, search, stats cards, loading/error/empty states; exports the `QueueAppointment` row type
- `apps/web/src/app/reception/queue-row.tsx` - `QueueRow` component: display + optimistic check-in/no-show actions
- `apps/web/src/app/reception/page.tsx` - Thin client wrapper rendering `<QueueClient />` (was a static placeholder)
- `apps/web/package.json` - `@supabase/ssr` `^0.6.1` → `^0.10.3`
- `pnpm-lock.yaml` - Lockfile update for the above

## Decisions Made
- See `key-decisions` in frontmatter. In short: the `@supabase/ssr` bump was a necessary Rule-3 fix (not scope creep — it unblocks typed writes for every future plan too), and `queue-row.tsx`'s two-pass creation keeps every individual task's own commit typechecking in isolation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bumped `@supabase/ssr` 0.6.1 → ^0.10.3**
- **Found during:** Task 3 (writing `queue-row.tsx`'s check-in/no-show `.update()` calls)
- **Issue:** `pnpm --filter @light/web typecheck` failed with `Argument of type '{ status: string; }' is not assignable to parameter of type 'never'` on both `.update()` calls. Root cause: `@supabase/ssr@0.6.1`'s `createBrowserClient`/`createServerClient` return type is `SupabaseClient<Database, SchemaName, Schema>` (3 generics), but the resolved `@supabase/supabase-js` is `2.110.1`, whose `SupabaseClient` class now takes 5 generics (`Database, SchemaNameOrClientOptions, SchemaName, Schema, ClientOptions`). The positional mismatch caused `Schema` to receive the wrong generic argument, collapsing `Relation['Update']` (and therefore every table's update-row type) to `never` for **any** `.update()` call anywhere in the app — this was a repo-wide latent defect this plan's Task 3 happened to be the first to trip (no prior code called `.update()`).
- **Fix:** Bumped `@supabase/ssr` to `^0.10.3` (first release whose `peerDependencies` declares `@supabase/supabase-js: ^2.105.3`, matching the resolved 2.110.1). No application code changes needed — `server.ts`/`middleware.ts` already use the modern `getAll`/`setAll` cookie API, not the deprecated `get`/`set`/`remove` methods that changed between these versions.
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @light/web typecheck` exits 0; `pnpm --filter @light/web build` compiles successfully (only a pre-existing, unrelated Edge-runtime warning about `supabase-js` using `process.version`, not a new regression)
- **Committed in:** `af32f17` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correctness (typed queries are a hard project constraint — PROJECT.md: "every Supabase query through generated Database types; no `any`"). No scope creep — the fix is a single dependency-version bump with zero code changes.

## Issues Encountered

### Verification Blocker: Supabase RLS recursion bug scoped to the `reception` role (NOT fixed — outside this plan's file scope)

`reception-queue.spec.ts` (both specs) fails against the live seeded data. The queue page renders the destructive-error state with the raw Postgres error `stack depth limit exceeded` instead of any rows, and total/checked-in/waiting/completed all read `0`.

**Reproduced independently of any code in this plan** via direct REST calls (bypassing the Next.js app, the `useRealtimeList` hook, and `queue-client.tsx`'s fetcher entirely):

```bash
# Reception token, plain read, no joins, no filters beyond limit:
curl "$SUPA_URL/rest/v1/patients?select=id,name&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $RECEPTION_TOKEN"
# => {"code":"54001","message":"stack depth limit exceeded",
#     "hint":"Increase the configuration parameter \"max_stack_depth\" (currently 2048kB)..."}

curl "$SUPA_URL/rest/v1/appointments?select=id,status&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $RECEPTION_TOKEN"
# => same 54001

curl "$SUPA_URL/rest/v1/staff?select=id,name&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $RECEPTION_TOKEN"
# => same 54001 (note: an EQUALITY-filtered single-row lookup on staff,
#    e.g. `?auth_user_id=eq.<uid>` — exactly what getStaff()/DashboardLayout
#    already use for login — succeeds fine; this is why login.spec.ts and
#    the "reception" nav shell both render correctly)
```

The identical query shapes **succeed** when run with a `doctor@test.com` token:

```bash
curl "$SUPA_URL/rest/v1/patients?select=id,name&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $DOCTOR_TOKEN"
# => [{"id":"a0...01","name":"Aarav Sharma"}, ...]   (200 OK)
curl "$SUPA_URL/rest/v1/appointments?select=id,status&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $DOCTOR_TOKEN"
# => [{"id":"c0...01","status":"booked"}, ...]        (200 OK)
```

This isolates the defect to the RLS policy (or a helper function it calls, e.g. `current_staff_role()`) evaluated specifically for the **reception** role on multi-row / non-equality-filtered reads of `staff`, `patients`, and `appointments` — a Postgres-level infinite/excessive recursion (error `54001`), not a permission denial and not anything reachable from application code. Per this session's environment notes ("If you hit an RLS denial: STOP, return checkpoint with the exact error — do not work around") and this plan's own threat model (T-02-04: "if the update returns an RLS/permission error, STOP... do NOT switch to service-role or work around"), this was not worked around. No attempt was made to use the service-role key (it is still the unfilled placeholder in `.env.local` per PROJECT.md) or any other bypass.

**This blocks verification of RECEP-01/02/03 for this plan, and will block 02-03 (patients registry) and 02-04 (billing) identically**, since both are reception-role reads against `patients`/`appointments`/`payments`. It likely does not block 02-05/02-06/02-07/02-08 (doctor-role plans), since the `doctor` role was confirmed unaffected by the same query shapes.

**Root-cause hypothesis for whoever fixes this** (not verified — no DB/SQL access available from this executor; no `DATABASE_URL`, no working service-role key, no `psql`/Supabase MCP credentials in this environment): the `reception` role's `SELECT` policy on `staff`/`patients`/`appointments` most likely branches through a helper function (e.g. `current_staff_role()`) that itself queries the RLS-protected `staff` table without `SECURITY DEFINER` (or an equivalent bypass), so evaluating the policy for any row that doesn't match a fast equality/index shortcut re-triggers the same policy check recursively until Postgres's stack limit trips. The `doctor` role likely has a narrower, index-friendly policy (e.g. `doctor_id = current_staff_id()`) that doesn't hit this path. Recommended: inspect `pg_policies` for `staff`/`patients`/`appointments` and the definition of `current_staff_role()`/`current_staff_id()` in project `rylceydkrydmpysmibba`, and ensure the helper function(s) are `SECURITY DEFINER` (or otherwise short-circuited) so they don't re-enter RLS evaluation on the same table.

## User Setup Required

**A human/agent with SQL access to Supabase project `rylceydkrydmpysmibba` must fix the RLS recursion bug described above before `reception-queue.spec.ts` (this plan) or any 02-03/02-04 e2e can pass.** Recommended verification once fixed:
```bash
curl "$SUPA_URL/rest/v1/patients?select=id,name&limit=3" -H "apikey: <anon-key>" -H "Authorization: Bearer <reception-access-token>"
# should return 200 with patient rows, not {"code":"54001",...}
```
Then re-run: `pnpm --filter @light/web test:e2e -- reception-queue.spec.ts` (should pass both specs unmodified — no code changes anticipated).

Also note (informational, not a new blocker): the dev server process running on port 3000 at session start was stale (pre-dated this session, causing `login.spec.ts` itself to fail with the same "stuck on /login" symptom until restarted) — restarting `pnpm dev` resolved it. If e2e specs mysteriously fail at the login step in a future session, restart the dev server before assuming a code regression.

## Next Phase Readiness
- The queue page, row component, and optimistic-write pattern are ready for 02-03 (patients registry) and 02-04 (billing) to mirror directly.
- **Blocker carried forward:** the RLS recursion bug above must be fixed before 02-03/02-04's own e2e specs (also reception-role reads) can be expected to pass — this is a backend/infra blocker, not a code gap in either upcoming plan.
- `requirements.mark-complete` was deliberately NOT run for RECEP-01/02/03 in this plan, matching the 01-01/02-01 precedent of only checking off requirements once their own e2e proves the user-facing behavior actually works end-to-end.

---
*Phase: 02-reception-doctor-flow*
*Completed: 2026-07-10*

## Self-Check: PASSED

All 7 claimed files found on disk; all 3 claimed commit hashes (f91a799, 21c0a13, af32f17) found in git history.
