# Phase 4: Mobile Patient App - Context

**Gathered:** 2026-07-11 (auto mode, single pass)
**Status:** Ready for planning

<domain>
## Phase Boundary

Expo patient app: phone-OTP sign-in with auto patient-row creation, tabbed home/book/appointments/reports/profile. Booking flow department → doctor → free slot → confirm (atomic RPC) → QR. Requirements AUTH-04, MOB-01..05. No staff features, no push notifications.

</domain>

<decisions>
## Implementation Decisions

### Stack & scaffold (D-45)
- **D-45:** Expo SDK 52 + expo-router v4 (tabs layout) + NativeWind v4 + @supabase/supabase-js + react-native-qrcode-svg + date-fns + zustand (auth/session store only if needed — prefer supabase.auth.onAuthStateChange + context). TypeScript strict. App lives in existing `apps/mobile` workspace member (`@light/mobile`), imports `Database` from `@light/shared-types`.
- **D-46:** pnpm monorepo: metro.config.js with `watchFolders` = repo root + nodeModulesPaths for hoisted deps (standard Expo-monorepo recipe). `.npmrc` untouched. supabase-js needs `react-native-url-polyfill/auto` import + AsyncStorage auth storage adapter (`@react-native-async-storage/async-storage`).
- **D-47:** Executor CANNOT run simulators. Verification gates: `pnpm --filter @light/mobile exec tsc --noEmit` + `npx expo export --platform ios` (bundle compiles) + unit tests where logic warrants (booking store, phone normalization). Manual device run deferred to user.

### Auth (D-48) — SMS provider NOT configured (project-level dashboard setting)
- **D-48:** Auth screen = phone input (+91 default country code, 10-digit zod) → `signInWithOtp({ phone })` → 6-digit OTP input → `verifyOtp`. This is the PRODUCTION path, fully coded. Because the Supabase project has phone provider disabled (needs Twilio config in dashboard — user action, documented in SUMMARY), a `__DEV__`-only "Dev login" collapsible offers email+password sign-in (seeded patient@test.com / Test1234! ↔ patient row a0..01 Aarav Sharma). Dev block excluded from production bundles via `__DEV__` check.
- **D-49:** On SIGNED_IN: `select patients where auth_user_id = uid`; if none, insert row (patients_self_insert policy DEPLOYED) with name from a one-time "complete your profile" prompt (name required, phone prefilled from auth.user.phone). Session persisted via AsyncStorage adapter; root layout gates tabs on session + patient row.

### Tabs (D-50..D-54)
- **D-50:** `(tabs)/index` Home: greeting, next upcoming appointment card (soonest slot_time >= now, status booked/checked_in), quick actions → Book / Reports.
- **D-51:** `(tabs)/book` Booking wizard (single screen, staged state): departments list → doctors of dept (specialization from doctors join staff name) → free future slots (`is_booked=false, slot_time >= now`, ordered) → confirm sheet → `supabase.rpc("book_appointment", { p_slot_id })` (atomic, DEPLOYED — returns appointment id; 'Slot already booked' error → toast + refresh slots) → success screen with QR (react-native-qrcode-svg, value = appointment id).
- **D-52:** `(tabs)/appointments`: own appointments (RLS-scoped), upcoming first (slot_time >= now ASC, then past DESC), status badges (same color semantics as web), tap → detail modal with QR + doctor/dept/time.
- **D-53:** `(tabs)/reports`: visits grouped by date (diagnosis, notes) + orders with ResultLink-equivalent (signed URL via storage.createSignedUrl for paths, passthrough http; opens via `Linking.openURL`) + prescriptions with medicine names. Patient RLS policies for visits/orders/prescriptions SELECT already exist (patient_select policies verified).
- **D-54:** `(tabs)/profile`: patient info, edit name/email/address/abha (phone read-only — auth identity), zod + save via patients_self_update.

### Styling (D-55)
- **D-55:** NativeWind classes, teal accent (patient brand distinct from staff roles), IST display via shared formatIST logic REIMPLEMENTED in mobile lib (Intl available in Hermes; no @light/ui dependency — RN components differ). Loading skeletons (simple pulse views), error states with retry, empty states per tab.

### Claude's Discretion
Exact screen copy, icon choices (lucide-react-native or @expo/vector-icons), QR size/styling, tab icons.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend contracts
- `packages/shared-types/src/database.types.ts` — Database types incl. book_appointment + dispense_medicine Functions (REGENERATE types if book_appointment missing: it was deployed after last gen — check first)
- `supabase/seed-dev.sql` + this file's D-48 — seeded patient@test.com ↔ patients a0..01; free slots b0..05/b0..06 tomorrow 10:00/11:00 IST
- `apps/web/src/lib/results.ts` — getResultUrl pattern to mirror
- `apps/web/src/lib/format.ts`, `time.ts` — IST helpers to mirror

### Existing mobile dir
- `apps/mobile/README.md` — placeholder only; scaffold from scratch

### Project docs
- `.planning/REQUIREMENTS.md` — AUTH-04, MOB-01..05
- `.planning/PROJECT.md` — constraints (typed queries, zod, IST, loading/error/empty states)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Deployed + verified by orchestrator: patients_self_insert policy, departments_public_select policy, book_appointment RPC (locks slot, rejects taken, creates appointment, sets qr_code), patient login patient@test.com / Test1234! (email identity; phone identity present but provider disabled)
- doctors/doctor_slots/departments publicly selectable; appointments patient insert/select policies exist

### Established Patterns
- Typed supabase client factories; zod validation; optimistic-with-rollback (web) — mobile uses simpler pessimistic writes + loading states (RN)

### Integration Points
- Same Supabase project; realtime optional for v1 mobile (not required by MOB reqs — skip subscriptions, use focus-refetch)

</code_context>

<specifics>
## Specific Ideas

Brief mandates: QR code with appointment id after booking + per-appointment QR in list; file viewer for uploaded scans (signed URL + Linking); upcoming-first ordering.

</specifics>

<deferred>
## Deferred Ideas

- Push notifications for status changes — backlog
- Realtime mobile queue position — backlog
- Razorpay in-app payment — V2-01

</deferred>

---

*Phase: 4-Mobile Patient App*
*Context gathered: 2026-07-11*
