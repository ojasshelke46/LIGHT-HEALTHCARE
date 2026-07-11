---
phase: 04-mobile-patient-app
plan: 01
subsystem: auth
tags: [expo, expo-router, nativewind, supabase-js, react-native, pnpm-monorepo, zod, phone-otp]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Supabase project + generated Database types (@light/shared-types), patients table shape"
  - phase: 02-reception-doctor-flow
    provides: "web Supabase client + format/status helper patterns mirrored into the mobile lib"
provides:
  - "Bootable @light/mobile Expo SDK 52 app inside the pnpm monorepo (expo-router + NativeWind v4)"
  - "Typed RN Supabase client with AsyncStorage session persistence (lib/supabase.ts)"
  - "AuthProvider/useSession session+patient-row context with onAuthStateChange (lib/session.tsx)"
  - "Root route gate: unauthenticated -> login, authenticated-without-row -> complete-profile, else tabs"
  - "Phone-OTP login (production path) + __DEV__-only email/password dev-login, dead-code-eliminated from release bundles"
  - "First-run patients-row auto-provisioning bound to auth_user_id (patients_self_insert RLS)"
  - "Shared NativeWind UI kit (Screen/Skeleton/EmptyState/ErrorState/Button/Field) + AppointmentCard + QRView"
  - "lib/phone.ts normalizePhone, lib/format.ts formatIST, lib/status.ts APPOINTMENT_STATUS_BADGE"
  - "5-tab placeholder shell (Home/Book/Appointments/Reports/Profile) for Plans 02-04 to fill in"
affects: [04-02-PLAN, 04-03-PLAN, 04-04-PLAN]

# Tech tracking
tech-stack:
  added: [expo@52, expo-router@4, nativewind@4.1.23, "@supabase/supabase-js@2.47.10", "@react-native-async-storage/async-storage", react-native-qrcode-svg, "@expo/vector-icons", zod@4, vitest@2 (node-env unit tests for pure lib/*.ts)]
  patterns:
    - "Pure-logic .ts files (phone/format/status) with zero react-native imports so vitest runs them under node env, no RN test harness needed"
    - "Root-gate routing pattern: all navigation decisions centralized in app/_layout.tsx reading useSession(); screens never call router.push/replace after auth actions"
    - "__DEV__-guarded dev-login block for pre-SMS-provider local testing, verified dead-code-eliminated from production bundles (T-04-03)"
    - "Client never trusts its own auth_user_id claim on insert -- patients_self_insert RLS is the enforcement boundary (T-04-04)"

key-files:
  created:
    - apps/mobile/lib/supabase.ts
    - apps/mobile/lib/session.tsx
    - apps/mobile/lib/phone.ts
    - apps/mobile/lib/phone.test.ts
    - apps/mobile/lib/format.ts
    - apps/mobile/lib/status.ts
    - apps/mobile/components/ui.tsx
    - apps/mobile/components/AppointmentCard.tsx
    - apps/mobile/components/QRView.tsx
    - apps/mobile/app/_layout.tsx
    - "apps/mobile/app/(auth)/_layout.tsx"
    - "apps/mobile/app/(auth)/login.tsx"
    - "apps/mobile/app/(auth)/complete-profile.tsx"
    - "apps/mobile/app/(tabs)/_layout.tsx"
    - "apps/mobile/app/(tabs)/index.tsx, book.tsx, appointments.tsx, reports.tsx, profile.tsx (placeholders)"
  modified:
    - apps/mobile/metro.config.js
    - apps/mobile/package.json
    - pnpm-lock.yaml

key-decisions:
  - "metro.config.js: disableHierarchicalLookup flipped false->true->false again -- the D-46 recipe's `true` assumes a hoisted node_modules layout; this repo's pnpm store is isolated, so hierarchical lookup must stay ON for a package's own transitive deps (@expo/metro-runtime, react-native-css-interop, @babel/runtime) to resolve; nodeModulesPaths remains as the explicit fallback for hoisted workspace deps"
  - "Field gained an optional className prop (additive, non-breaking) to support the read-only dimmed phone display in complete-profile.tsx"
  - "expo install --fix reconciled react-native 0.76.5 -> 0.76.9 and added @expo/metro-runtime, @babel/runtime, react-native-css-interop, @expo/vector-icons as explicit deps required by the corrected Metro resolver config"

patterns-established:
  - "Session/patient-row gate pattern for all future mobile screens (Plans 02-04 render inside the gated tab shell, no auth logic needed in leaf screens)"
  - "Grep-gated threat mitigations (T-04-03 __DEV__ guard, T-04-04 RLS-enforced insert) as acceptance criteria, verified pre-commit"

requirements-completed: []  # AUTH-04 intentionally left UNCHECKED in REQUIREMENTS.md: dev-login only, real phone-OTP delivery needs the SMS provider (see User Setup Required)

# Metrics
duration: ~35min (this session's Task-3 completion + re-verification; full plan spans multiple sessions from scaffold to auth screen)
completed: 2026-07-11
---

# Phase 4 Plan 1: Mobile Scaffold + Auth Foundation Summary

**Expo SDK 52 + expo-router + NativeWind app in the pnpm monorepo, with a typed RN Supabase client, session/patient-row gate, phone-OTP login (+ `__DEV__` dev-login), and first-run patient-row auto-provisioning under `patients_self_insert` RLS**

## Performance

- **Duration:** Full plan spans 3 sessions (Task 1 scaffold, Task 2 RED/GREEN, Task 3 auth screens + re-verification). This session's work (verifying and committing Task 3): ~35 min.
- **Completed:** 2026-07-11
- **Tasks:** 3/3 complete (Task 2 was `tdd="true"`: RED + GREEN commits)
- **Files modified:** 21 created, 3 modified (metro.config.js, package.json, pnpm-lock.yaml) across the whole plan

## Accomplishments
- `expo export --platform ios` bundles the entire route tree end-to-end with zero errors (1318 modules, 4.8MB hbc bundle)
- Root gate (`app/_layout.tsx`) correctly routes: no session -> `/(auth)/login`; session-without-patient-row -> `/(auth)/complete-profile`; session-with-row -> `/(tabs)`
- Phone-OTP path fully coded (`signInWithOtp` / `verifyOtp`) for production use once the Supabase Phone provider + SMS provider are configured
- `__DEV__`-only dev-login (email/password against the seeded `patient@test.com`) works today for local development, and is grep-verified + structurally dead-code-eliminated from release bundles (T-04-03)
- First-run `complete-profile.tsx` inserts a `patients` row with `auth_user_id = session.user.id`; ownership is enforced server-side by the deployed `patients_self_insert` RLS policy, not trusted from the client (T-04-04); duplicate-insert races are guarded by a pre-check
- Shared foundation (phone/format/status pure libs, UI kit, AppointmentCard, QRView, 5-tab placeholder shell) is in place for Plans 02-04 to build on without touching auth/session code

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Expo SDK 52 app + monorepo config, install** - `90aba5f` (feat)
2. **Task 2 (TDD): normalizePhone** - `f679c69` (test, RED) -> `7cb1ef9` (feat, GREEN — also delivered Supabase client, IST/status helpers, UI kit, session gate, tab shell in the same commit per the plan's task grouping)
3. **Task 3: Auth screen (phone-OTP + `__DEV__` dev-login) + first-run patient row** - `8ac07ef` (feat)

**Plan metadata:** (this commit, `docs(04-01): complete mobile scaffold + auth plan`)

_Note: Task 2 is `tdd="true"` — RED (`f679c69`, failing `phone.test.ts`) then GREEN (`7cb1ef9`, `normalizePhone` implementation + the rest of Task 2's foundation files) — matching the plan's grouping of Task 2's `<files>` under one behavior spec._

## Files Created/Modified
- `apps/mobile/lib/supabase.ts` - Typed RN Supabase client (`createClient<Database>`), AsyncStorage session adapter, `react-native-url-polyfill/auto`
- `apps/mobile/lib/session.tsx` - `AuthProvider`/`useSession()`: session + patient row + `onAuthStateChange` listener + `refreshPatient()`
- `apps/mobile/lib/phone.ts` / `phone.test.ts` - `normalizePhone` (+91 default, 10-digit validation), 8 passing vitest cases
- `apps/mobile/lib/format.ts` - `formatIST` mirroring the web helper (Asia/Kolkata, invalid -> "—")
- `apps/mobile/lib/status.ts` - `APPOINTMENT_STATUS_BADGE` map (RN/NativeWind class strings) for all 6 enum values
- `apps/mobile/components/ui.tsx` - `Screen`, `Skeleton`, `EmptyState`, `ErrorState`, `Button`, `Field` (a11y labels + roles throughout); `Field` gained an optional `className` override in Task 3
- `apps/mobile/components/AppointmentCard.tsx` / `QRView.tsx` - presentational, shared by future Home/Appointments/Booking screens
- `apps/mobile/app/_layout.tsx` - root gate: `<AuthProvider>` + `Redirect` logic (loading/no-session/no-patient/ready)
- `apps/mobile/app/(auth)/login.tsx` - phone step (normalizePhone-gated) -> `signInWithOtp`; code step -> `verifyOtp`; `__DEV__`-guarded dev-login -> `signInWithPassword`
- `apps/mobile/app/(auth)/complete-profile.tsx` - zod-validated name, read-only auth phone, `patients` insert with `auth_user_id`, duplicate guard, `refreshPatient()`
- `apps/mobile/app/(tabs)/*` - 5-tab placeholder shell (Home/Book/Appointments/Reports/Profile), each an `EmptyState`
- `apps/mobile/metro.config.js` - pnpm-monorepo Metro config; `disableHierarchicalLookup` corrected to `false` (see Deviations)
- `apps/mobile/package.json` - `expo install --fix`-reconciled versions + Task-3-required deps (`@babel/runtime`, `@expo/metro-runtime`, `react-native-css-interop`, `@expo/vector-icons`)

## Decisions Made
- `disableHierarchicalLookup` stays `false` (not the D-46 recipe's literal `true`) because this repo's pnpm store uses isolated (non-hoisted) `node_modules` — see Deviations below.
- `Field` accepts an optional `className` prop, purely additive, to support the dimmed read-only phone field in `complete-profile.tsx` without a one-off component.
- Dev-login defaults pre-filled to the seeded `patient@test.com` / `Test1234!` credentials for fast local iteration; entirely inside the `__DEV__` guard.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `metro.config.js` `disableHierarchicalLookup: true` broke `expo export`**
- **Found during:** Task 3 verification (`expo export --platform ios`)
- **Issue:** The plan's D-46 recipe sets `disableHierarchicalLookup = true`, which is correct for a hoisted npm/yarn-workspace `node_modules` layout. This repo's pnpm store uses pnpm's default isolated layout, where a package's own transitive dependencies (`@expo/metro-runtime`, `react-native-css-interop`, `@babel/runtime`) only resolve by walking up from the requiring file via standard hierarchical lookup. Disabling it produced module-not-found errors for exactly those three packages during bundling.
- **Fix:** Set `disableHierarchicalLookup = false`, keeping `resolver.nodeModulesPaths` as the explicit fallback for the hoisted workspace deps (`@light/shared-types`). Added the three now-explicitly-required deps to `package.json` (`@babel/runtime`, `@expo/metro-runtime`, `react-native-css-interop` pinned to nativewind 4.1.23's expected peer) plus `@expo/vector-icons` for the tab bar icons introduced in Task 2.
- **Files modified:** `apps/mobile/metro.config.js`, `apps/mobile/package.json`, `pnpm-lock.yaml`
- **Verification:** `expo export --platform ios` now exits 0 (1318 modules bundled, 4.8MB `.hbc`); `tsc --noEmit` exits 0.
- **Committed in:** `8ac07ef` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule-1 bug fix, monorepo-layout-specific Metro config correction)
**Impact on plan:** Necessary correctness fix for the app to bundle at all in this repo's actual (pnpm-isolated) node_modules layout; no scope creep — confined to `apps/mobile/metro.config.js` and its now-required deps.

## Issues Encountered

**Pre-existing, out-of-scope: `pnpm --filter @light/web typecheck` fails.** Investigated during re-verification (this session's environment notes flagged it as a gate). Root-caused via `git log -- pnpm-lock.yaml`: `@types/react@19.2.17` has been in the lockfile since the very first commit in the repo (`2322691`), predating the entire `04-mobile-patient-app` phase and every mobile task. The failure (`packages/ui`'s `forwardRef`-based `Button` incompatible with `@types/react@19.2.17`'s stricter `ReactNode`) is confined to `apps/web`/`packages/ui`, which this plan's files never touch, and this session's instructions explicitly prohibit modifying `apps/web` source. Logged to `.planning/phases/04-mobile-patient-app/deferred-items.md` — not fixed, out of scope per the scope-boundary rule. Does not affect this plan's own verification gates (`@light/mobile` tsc/export/vitest all pass).

## User Setup Required

**External service requires manual configuration for real phone-OTP delivery.**

- **Service:** Supabase Auth Phone provider (Dashboard -> Authentication -> Providers -> Phone)
- **Why:** `signInWithOtp({ phone })` / `verifyOtp` are fully implemented (production path, D-48) but the project has no SMS provider (e.g. Twilio) attached, so no code is actually delivered yet.
- **Until configured:** Use the `__DEV__` Dev-login (`patient@test.com` / `Test1234!`) — verified working against the seeded patient (`patients` row `a0..01`, Aarav Sharma).
- **Verification once configured:** Sign in with a real phone number on a physical/simulator device; confirm an SMS arrives and `verifyOtp` completes, routing to `(tabs)`.

**AUTH-04 stays coded-complete but the requirement checkbox reflects "dev-login only, real OTP pending SMS provider"** — see below.

## Next Phase Readiness

- The session/patient-row gate, UI kit, and 5-tab shell are ready for Plans 02-04 to build Home/Booking (02), Appointments/Reports (03), and Profile (04) without touching auth code.
- `book_appointment` RPC is already present in generated `Database` types (from `2971d1d`), unblocking Plan 02's booking wizard.
- **Scale note for downstream plans:** project scope is now dual-target (super-specialty hospital + small clinic, per CLAUDE.md Scale Targets, commit `1bd744a`). Plan 02's department picker (and any other dept-driven UI) must handle 15-20+ departments gracefully (scrollable/searchable list), not just the ~5-6 seeded for the small-clinic dev dataset.
- No blockers for Plan 02.

---
*Phase: 04-mobile-patient-app*
*Completed: 2026-07-11*

## Self-Check: PASSED

- All 21 key files (lib/, components/, app/(auth)/, app/(tabs)/, metro.config.js, package.json) confirmed present on disk.
- All 4 task commits (`90aba5f`, `f679c69`, `7cb1ef9`, `8ac07ef`) confirmed present in `git log`.
- `deferred-items.md` confirmed present on disk.
- No missing items.
