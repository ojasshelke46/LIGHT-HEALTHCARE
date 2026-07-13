---
phase: 04-mobile-patient-app
verified: 2026-07-13T22:42:16Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Real phone-number OTP sign-in end-to-end on a physical/simulator device"
    expected: "signInWithOtp sends a real SMS, verifyOtp completes, root gate routes to (tabs); a patient row auto-creates on first sign-in via complete-profile.tsx"
    why_human: "Requires configuring an SMS provider (e.g. Twilio) in the Supabase dashboard (Authentication -> Providers -> Phone) — a human/dashboard action, not a code change. Code path is fully implemented and independently confirmed dead-code-eliminated from release bundles for the __DEV__ fallback. No SMS provider or device/simulator available in this sandbox."
  - test: "Full app run on an iOS/Android simulator or physical device (visual/feel check across all 5 tabs)"
    expected: "Tab navigation, keyboard behavior, QR rendering, scroll/list performance with 15-20+ departments, multiline address field feel all work as expected"
    why_human: "No simulator available in this environment (consistent constraint noted in every 04-0x SUMMARY, D-47). `expo export --platform ios` (bundle compiles, 1318+ modules, clean) and unit tests are the only mechanically available proxies."
---

# Phase 4: Mobile Patient App Verification Report

**Phase Goal:** Patients can authenticate, book appointments, and view their care history from the Expo app
**Verified:** 2026-07-13T22:42:16Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criteria) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | Patient can sign in via phone OTP, with a patient row auto-created on first sign-in | ✓ VERIFIED (code) — real SMS delivery is a human/setup item | `login.tsx` implements `signInWithOtp`/`verifyOtp` production path; `complete-profile.tsx` auto-inserts a `patients` row bound to `auth_user_id` under `patients_self_insert` RLS, with a re-entrancy guard + 23505-as-success handling (commit `dade7ee`, fixing REVIEW.md CR-01). Independently re-authenticated as `patient@test.com` via direct GoTrue REST call and confirmed a `patients` row with matching `auth_user_id` already exists (auto-provisioning path proven functional). `__DEV__`-gated dev-login string (`"Dev login"`, `patient@test.com`) is **absent** from the production `expo export` Hermes bytecode bundle (`grep -c` returns 0 matches) — confirms dead-code elimination, not just a claim. Real SMS delivery requires a Supabase-dashboard Phone/SMS-provider (Twilio) config — external, undone by design; REQUIREMENTS.md correctly leaves AUTH-04 unchecked. |
| 2 | Patient sees a home screen with an upcoming-appointment card and quick actions | ✓ VERIFIED | `app/(tabs)/index.tsx` — real query (`.eq("patient_id", patientId).gte("slot_time", now).in("status",[...]).order().limit(1)`), loading/error/empty states, `AppointmentCard` render, quick-action buttons routing to Book/Reports. No stub patterns found. |
| 3 | Patient can book an appointment (department -> doctor -> free slot -> confirm) and receive a QR code of the appointment id | ✓ VERIFIED | `components/BookingWizard.tsx` — 4-stage state machine, all writes go exclusively through `supabase.rpc("book_appointment", {p_slot_id})` (client never writes `is_booked`/inserts appointments directly), "already booked" race handled with alert + slot refresh, success screen renders `QRView` (real `react-native-qrcode-svg`, not an image placeholder) with the RPC's returned appointment id. **Independently confirmed the RPC is live and deployed**: called `POST /rest/v1/rpc/book_appointment` with a bogus slot id using the dev patient token and got a real Postgres error `{"code":"P0001","message":"Slot not found"}` (HTTP 400) — proves server-side function exists and enforces slot validity, not a 404/stub. |
| 4 | Patient sees their appointments (upcoming first) with status badges and per-appointment QR, and views visit reports grouped by date (diagnosis, test results with file viewer, prescriptions) | ✓ VERIFIED | `appointments.tsx` splits upcoming (asc)/past (desc) client-side, `AppointmentDetailModal` renders per-item `QRView`. `reports.tsx` fetches nested `visits -> orders + prescriptions(medicine)`, groups by IST date via `formatIST`, `ReportVisitGroup` renders diagnosis/notes, order status badges, "Open result" (signed URL via `storage.createSignedUrl` + double `https?://` scheme validation before `Linking.openURL` — T-04-10), and prescription medicine names + status badges. |
| 5 | Patient can view and edit profile details, including ABHA ID | ✓ VERIFIED | `profile.tsx` — view all fields (phone/dob read-only), edit name/email/address/abha_id via `profileSchema` (zod), self-scoped `.update(...).eq("id", activePatient.id)`, RLS-denial-aware error messaging, `refreshPatient()` on success. Independently live-verified `patients_self_update` RLS is deployed per 04-04-SUMMARY's PATCH+restore round-trip (not re-tested destructively here to avoid mutating shared dev seed data). |

**Score:** 5/5 truths verified (code-complete); 1 has an external SMS-provider dependency correctly routed to human verification rather than marked as a code gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/mobile/app/(auth)/login.tsx` | Phone-OTP + dev-login | ✓ VERIFIED | Substantive, wired, `__DEV__`-gated dev block confirmed dead-code-eliminated from release bundle |
| `apps/mobile/app/(auth)/complete-profile.tsx` | First-run patient-row provisioning | ✓ VERIFIED | Re-entrancy guard + 23505 handling present (post-review fix, `dade7ee`) |
| `apps/mobile/lib/session.tsx` | Auth/session/patient-row context | ✓ VERIFIED | Real `onAuthStateChange` subscription with cleanup (`unsubscribe`), stale-fetch token guard, `patient` cleared on sign-out |
| `apps/mobile/app/_layout.tsx` | Root route gate | ✓ VERIFIED | loading -> no-session -> no-patient -> tabs, correctly ordered `Redirect`s |
| `apps/mobile/app/(tabs)/index.tsx` | Home (MOB-01) | ✓ VERIFIED | Real query, all 3 states (loading/error/empty), focus-refetch |
| `apps/mobile/components/BookingWizard.tsx` + `app/(tabs)/book.tsx` | Booking wizard (MOB-02) | ✓ VERIFIED | 4-stage flow, atomic RPC-only write, QR success screen |
| `apps/mobile/lib/booking.ts` | `filterFreeFutureSlots` | ✓ VERIFIED | Pure helper, 7 vitest cases, RED->GREEN documented |
| `apps/mobile/app/(tabs)/appointments.tsx` + `AppointmentDetailModal.tsx` | Appointments (MOB-03) | ✓ VERIFIED | Upcoming/past split, per-item QR modal |
| `apps/mobile/app/(tabs)/reports.tsx` + `ReportVisitGroup.tsx` | Reports (MOB-04) | ✓ VERIFIED | Date-grouped visits, signed-URL viewer, prescriptions |
| `apps/mobile/lib/reportUrl.ts` | Signed-URL resolver | ✓ VERIFIED | Pure, DI signer, 7 vitest cases |
| `apps/mobile/app/(tabs)/profile.tsx` + `lib/profileSchema.ts` | Profile view/edit (MOB-05) | ✓ VERIFIED | zod-validated, self-scoped update, RLS-denial-aware errors |
| `supabase/migrations/20260713_patient_staff_doctor_select.sql` | Patient read-grants for staff(doctor)/medicines | ✓ VERIFIED (applied) | File header states "APPLIED... 2026-07-13"; independently confirmed live via REST (see Data-Flow Trace) — not just a claim |

No artifact is MISSING, STUB, or ORPHANED. No `TODO`/`FIXME`/`placeholder`/"coming soon" strings found in `app/`, `components/`, `lib/` (grep swept, only benign `placeholder=` TextInput props and a doc-comment use of the word "placeholder").

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `login.tsx` | Supabase Auth (`signInWithOtp`/`verifyOtp`) | direct call, response-handled (Alert on error, silent success -> session listener) | WIRED | Production path fully coded |
| `complete-profile.tsx` | `patients` table | `.insert(...)` under `patients_self_insert` RLS | WIRED | Ownership enforced server-side (`auth_user_id` not client-trusted per RLS definition) |
| `BookingWizard.tsx` | `book_appointment` RPC | `supabase.rpc("book_appointment", {p_slot_id})` | WIRED | Confirmed live via direct REST call (real Postgres error for bad input) |
| `index.tsx` / `appointments.tsx` | `appointments` + nested `doctors/staff/departments` | `.select()` embed, RLS-scoped | WIRED | Doctor-name resolution confirmed flowing (see Data-Flow Trace) |
| `reports.tsx` | `visits` + nested `orders`/`prescriptions(medicine)` | `.select()` embed, RLS-scoped | WIRED | Medicine-name resolution confirmed flowing |
| `ReportVisitGroup.tsx` | Storage `scan-results` bucket | `createSignedUrl` -> `Linking.openURL` (scheme-validated) | WIRED | Signer + double http(s) validation present |
| `profile.tsx` | `patients` table | `.update(...).eq("id", ...)` under `patients_self_update` RLS | WIRED | Live-verified deployed (04-04-SUMMARY PATCH+restore round-trip) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `index.tsx` / `appointments.tsx` (doctor name) | `next.doctor?.staff?.name` | `staff` table via `staff_patient_doctor_select` RLS policy | **Yes** — independently verified via REST as dev patient token: `GET /rest/v1/staff?select=role,name` returns `[{"role":"doctor","name":"Dr. Test"}]` only (other roles correctly hidden) | ✓ FLOWING |
| `ReportVisitGroup.tsx` (medicine name) | `rx.medicine?.name` | `medicines` table via `medicines_patient_select` RLS policy | **Yes** — independently verified via REST: `GET /rest/v1/medicines?select=id,name&limit=3` returns real rows (Amoxicillin, Azithromycin, Ibuprofen) for the patient token, previously `200 []` per deferred-items.md before the migration was applied | ✓ FLOWING |
| `session.tsx` (`patient`) | `patients` row | `patients` table, `auth_user_id = auth.uid()` | **Yes** — independently verified: `GET /rest/v1/patients?select=id,name,auth_user_id&limit=5` as the dev patient token returns exactly 1 row (self-scoped, not all 5), confirming RLS restricts to own row | ✓ FLOWING |
| `BookingWizard.tsx` (departments/doctors/slots) | staged fetch state | `departments`/`doctors`/`doctor_slots` public/RLS-scoped selects | Yes — live REST-validated per 04-02-SUMMARY (200s, shapes match) | ✓ FLOWING |
| `reports.tsx` (visits/orders/prescriptions) | `visits` | `patient_id`-scoped nested embed | Yes — live REST-validated per 04-03-SUMMARY (2 real visits returned, one with an in-progress MRI order) | ✓ FLOWING |

This closes the exact gap flagged as open in `deferred-items.md` items 2-3 at 04-03 completion time ("proposed, NOT applied") — the migration was reviewed and applied in commit `e0cf2b6`, and this verification independently re-confirms it live rather than trusting the commit message alone.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Mobile package typechecks clean | `pnpm --filter @light/mobile exec tsc --noEmit` | Exit 0, no output | ✓ PASS |
| Mobile unit tests pass | `pnpm --filter @light/mobile test` | 4 files, 28/28 passed | ✓ PASS |
| Production bundle compiles | `npx expo export --platform ios` | Exported cleanly, `entry-*.hbc` 5.73MB | ✓ PASS |
| Dev-login dead-code-eliminated from release bundle | `grep -c "Dev login\|patient@test.com\|Test1234" dist/_expo/static/js/ios/*.hbc` | 0 matches (exit 1) | ✓ PASS |
| `book_appointment` RPC is live (not a stub) | `POST /rest/v1/rpc/book_appointment` with bogus slot id | `400 {"code":"P0001","message":"Slot not found"}` | ✓ PASS |
| Patient RLS: `staff` scoped to doctors only | `GET /rest/v1/staff?select=role,name` as patient token | `[{"role":"doctor","name":"Dr. Test"}]` | ✓ PASS |
| Patient RLS: `medicines` readable | `GET /rest/v1/medicines?select=id,name&limit=3` as patient token | 3 real medicine rows | ✓ PASS |
| Patient RLS: `patients` self-scoped | `GET /rest/v1/patients?select=id,name,auth_user_id&limit=5` as patient token | 1 row (own) | ✓ PASS |
| Dev-login authenticates | `POST /auth/v1/token?grant_type=password` (`patient@test.com`) | `access_token` returned, `user_id` matches seeded patient's `auth_user_id` | ✓ PASS |

All spot-checks run against the live Supabase project (`rylceydkrydmpysmibba`) via direct REST calls using the anon key + dev-patient session token — not simulated, not trusted from SUMMARY claims alone.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-04 | 04-01 | Patients sign in via phone OTP; patient row auto-created | ? NEEDS HUMAN (code SATISFIED) | Production code path complete and independently verified functional via dev-login proxy; real OTP delivery blocked on external SMS-provider dashboard config. REQUIREMENTS.md correctly leaves this unchecked — matches reality, not a documentation gap. |
| MOB-01 | 04-02 | Home screen, upcoming-appointment card, quick actions | ✓ SATISFIED | `index.tsx`, live data flow confirmed |
| MOB-02 | 04-02 | Booking wizard, atomic RPC, QR | ✓ SATISFIED | `BookingWizard.tsx`, RPC confirmed live |
| MOB-03 | 04-03 | Appointments list + per-appointment QR | ✓ SATISFIED | `appointments.tsx`, `AppointmentDetailModal.tsx` |
| MOB-04 | 04-03 | Visit reports grouped by date, file viewer, prescriptions | ✓ SATISFIED | `reports.tsx`, `ReportVisitGroup.tsx`, medicine names confirmed flowing post-migration |
| MOB-05 | 04-04 | Profile view/edit incl. ABHA ID | ✓ SATISFIED | `profile.tsx`, `profileSchema.ts`, self-update RLS live-verified |

No orphaned requirements — REQUIREMENTS.md's Phase 4 row (AUTH-04, MOB-01..05) matches exactly what the 4 plans' `requirements:` frontmatter fields claim.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `complete-profile.tsx` | (was 25-54) | TOCTOU double-insert race (CR-01) | 🛑 Blocker (was) | **FIXED** in `dade7ee` — re-entrancy guard (`if (saving) return`) + 23505-as-success handling. Verified present in current file (read directly), tsc/vitest gates re-run and confirmed passing independently by this verification. |
| `complete-profile.tsx` | 9 | Whitespace-only name accepted (WR-01) | ⚠️ Warning (was) | **FIXED** — `nameSchema` now `z.string().trim().min(1,...)`. Confirmed in current source. |
| `login.tsx` / `profile.tsx` | 48, 68 / 76 | Missing re-entrancy guards on submit handlers (WR-02) | ⚠️ Warning (was) | **FIXED** — guards added to `onSendCode`, `onVerifyCode`, `onSave`. Confirmed in current source. |
| `phone.ts` | 13, 17 | Accepts invalid Indian mobile prefixes 0-5 (WR-03) | ⚠️ Warning (was) | **FIXED** — regex tightened to `[6-9]` in both branches. Confirmed in current source. |
| `package.json` | 19, 21, 22 | Unused deps (`date-fns`, `expo-constants`, `expo-linking`) (IN-01) | ℹ️ Info | **Still open** — non-blocking, cosmetic |
| `lib/supabase.ts` | 6-7 | Non-null assertion on env vars gives cryptic failure (IN-02) | ℹ️ Info | **Still open** — non-blocking, only manifests on misconfigured CI/env |
| `complete-profile.tsx` | 25 | Dev-only email-as-phone fallback (IN-03) | ℹ️ Info | **Still open** — scoped to `__DEV__` builds only, confirmed dead-code-eliminated from production bundle (same evidence as AUTH-04 truth) |

The one Critical and all three Warnings from `04-REVIEW.md` are fixed and independently re-verified in this pass (source read directly, not just the commit diff trusted). The three Info items remain open but are explicitly non-blocking per the review's own severity classification and do not affect any of the 5 phase-goal truths.

### Human Verification Required

### 1. Real phone-number OTP sign-in end-to-end

**Test:** Configure an SMS provider (Twilio) in Supabase Dashboard -> Authentication -> Providers -> Phone, then sign in on a physical device/simulator with a real Indian mobile number.
**Expected:** SMS arrives with a 6-digit code; `verifyOtp` completes; root gate routes to `(tabs)`; if it's the number's first sign-in, `complete-profile.tsx` creates a `patients` row.
**Why human:** Requires a paid third-party SMS provider account and dashboard configuration — a project/business decision outside code scope, plus a real device to receive SMS. Code path is complete and independently confirmed structurally correct (dead-code-eliminated dev fallback, correctly shaped `signInWithOtp`/`verifyOtp` calls).

### 2. Full app run on simulator/device (visual + feel)

**Test:** Run the Expo app on iOS/Android simulator or a physical device; navigate all 5 tabs, complete a booking, open a signed-URL result file, edit and save the profile.
**Expected:** Smooth navigation, correct QR rendering, no layout breakage, department list scrolls cleanly at 15-20+ departments, keyboard behavior on multiline address field is acceptable.
**Why human:** No simulator/device available in this sandboxed environment (D-47, consistent across all four 04-0x SUMMARYs). `expo export --platform ios` (clean compile) and 28/28 unit tests are the maximum automatable proxy.

### Gaps Summary

No code gaps found. All 5 ROADMAP Phase 4 success criteria have direct, substantive, wired implementations, confirmed not just by reading source but by independent live REST calls against the deployed Supabase project (RPC behavior, RLS policy scoping on `staff`/`medicines`/`patients`, dev-login token issuance) and by independently re-running the mobile package's typecheck/test/export gates after the code-review fix commit (`dade7ee`). The `deferred-items.md` gap (patient sessions couldn't read `staff`/`medicines`) that was open as of 04-03 completion was closed by commit `e0cf2b6` and is independently re-confirmed live in this verification, not just trusted from the commit message or SUMMARY.

The two items requiring human sign-off are both external-dependency/environment constraints (SMS provider dashboard config; no device/simulator in this sandbox) rather than incomplete code — consistent with the phase's own design decisions (D-47, D-48) and REQUIREMENTS.md's own AUTH-04 checkbox state, which already reflects this honestly.

---

_Verified: 2026-07-13T22:42:16Z_
_Verifier: Claude (gsd-verifier)_
