---
phase: 04-mobile-patient-app
reviewed: 2026-07-13T22:34:44Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - apps/mobile/app/_layout.tsx
  - "apps/mobile/app/(auth)/_layout.tsx"
  - "apps/mobile/app/(auth)/login.tsx"
  - "apps/mobile/app/(auth)/complete-profile.tsx"
  - "apps/mobile/app/(tabs)/_layout.tsx"
  - "apps/mobile/app/(tabs)/index.tsx"
  - "apps/mobile/app/(tabs)/book.tsx"
  - "apps/mobile/app/(tabs)/appointments.tsx"
  - "apps/mobile/app/(tabs)/reports.tsx"
  - "apps/mobile/app/(tabs)/profile.tsx"
  - apps/mobile/lib/supabase.ts
  - apps/mobile/lib/session.tsx
  - apps/mobile/lib/booking.ts
  - apps/mobile/lib/booking.test.ts
  - apps/mobile/lib/phone.ts
  - apps/mobile/lib/phone.test.ts
  - apps/mobile/lib/format.ts
  - apps/mobile/lib/status.ts
  - apps/mobile/lib/profileSchema.ts
  - apps/mobile/lib/profileSchema.test.ts
  - apps/mobile/lib/reportUrl.ts
  - apps/mobile/lib/reportUrl.test.ts
  - apps/mobile/components/ui.tsx
  - apps/mobile/components/QRView.tsx
  - apps/mobile/components/AppointmentCard.tsx
  - apps/mobile/components/AppointmentDetailModal.tsx
  - apps/mobile/components/BookingWizard.tsx
  - apps/mobile/components/ReportVisitGroup.tsx
  - apps/mobile/metro.config.js
  - apps/mobile/babel.config.js
  - apps/mobile/tailwind.config.js
  - apps/mobile/app.json
  - apps/mobile/package.json
  - apps/mobile/tsconfig.json
  - apps/mobile/vitest.config.ts
  - apps/mobile/nativewind-env.d.ts
  - supabase/migrations/20260713_patient_staff_doctor_select.sql
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-07-13T22:34:44Z
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Reviewed the full Expo patient app (auth, tabs, lib, components, config) plus the one in-scope migration. The locked decisions from `04-CONTEXT.md` (`__DEV__`-gated dev login, AsyncStorage session persistence, RPC-only booking) were verified as correctly implemented rather than re-litigated: `__DEV__` is a Metro-bundler-time constant that dead-code-eliminates the dev-login block from release bundles, `onAuthStateChange` cleanup unsubscribes correctly and clears `patient` state on sign-out (no cross-account leakage on a shared device), booking writes go exclusively through `book_appointment` RPC with a correctly-matched "already booked" race handler, signed-URL result opening double-validates the `https?://` scheme before `Linking.openURL`, and no service-role key or hardcoded secret exists anywhere in the bundle (`.env` is gitignored; only `.env.example` is tracked).

One finding rises to Critical: `complete-profile.tsx`'s first-sign-in patient-row provisioning is a classic check-then-act race with no client-side re-entrancy guard, and — critically — the consequence is not just a duplicate row but a plausible full account lockout, because the `current_patient_id()` SQL helper (`select id from patients where auth_user_id = auth.uid()`, no `LIMIT 1`) that every patient-facing RLS policy depends on will raise a Postgres "more than one row returned by a subquery" error for any patient with two rows sharing one `auth_user_id`, breaking every screen for that user. Three Warnings and three Info items round out the report, mostly data-quality/validation gaps and unused dependencies.

## Critical Issues

### CR-01: Patient-row provisioning race can duplicate a patient identity and break every subsequent query for that user

**File:** `apps/mobile/app/(auth)/complete-profile.tsx:25-54`
**Issue:** `onSubmit` has no re-entrancy guard (`if (saving) return;`) at its top, and the duplicate-prevention logic is a classic TOCTOU: it awaits a `select ... .maybeSingle()` (a real network round trip) before deciding to insert. The "Continue" button's `disabled`/`loading` props only take effect after a React re-render, so two taps fired before that re-render (a fast double-tap, or a stuck UI + impatient retry — both realistic on the very screen a brand-new user lands on right after OTP verification) can both pass the `existing` check as `null` and both proceed to `supabase.from("patients").insert(...)`.

If no DB-level unique constraint exists on `patients.auth_user_id` (none is visible anywhere in the reviewed migrations or in `packages/shared-types/src/database.types.ts`, which shows `auth_user_id` as a plain nullable `string`), both inserts succeed, creating two `patients` rows for one `auth.uid()`. That is not merely a duplicate-record nuisance: `supabase/migrations/20260710_fix_rls_helper_recursion.sql` defines
```sql
create or replace function public.current_patient_id()
returns uuid
...
as $$
  select id from patients where auth_user_id = auth.uid()
$$;
```
with no `LIMIT 1`. Every patient-scoped RLS policy in the app (appointments, visits/orders/prescriptions, `patients_self_update`, the new `staff`/`medicines` policies in `20260713_patient_staff_doctor_select.sql`) calls this helper. Once a duplicate row exists, this subquery returns 2 rows and Postgres raises "more than one row returned by a subquery used as an expression" — every RLS check for that user now errors, so Home/Book/Appointments/Reports/Profile all fail for that patient until someone manually deletes the duplicate row in the database. Even if a unique constraint *does* exist server-side (unconfirmed from the files in scope), the losing insert would surface as a generic "Could not save profile — please try again" alert (line 58-63) that doesn't tell the user a row already exists, forcing a second attempt to succeed via the same racy select-then-insert path.

**Fix:**
```tsx
async function onSubmit() {
  if (saving) return; // re-entrancy guard — closes the double-tap window
  setNameError(null);
  const parsed = nameSchema.safeParse({ name });
  if (!parsed.success) {
    setNameError(parsed.error.issues[0]?.message ?? "Invalid name");
    return;
  }
  if (!session) return;

  setSaving(true);
  ...
  const { error } = await supabase.from("patients").insert({...});
  if (error) {
    // A unique-violation (23505) here means another in-flight submit won —
    // refresh instead of showing a dead-end retry alert.
    if (error.code === "23505") {
      await refreshPatient();
      setSaving(false);
      return;
    }
    ...
  }
}
```
Flag for the backend owner (out of `apps/mobile` scope but should be tracked): add a unique constraint/partial unique index on `patients.auth_user_id where auth_user_id is not null`, and add `limit 1` to `current_patient_id()` as defense-in-depth so a future duplicate degrades to "wrong row" instead of "every query errors."

## Warnings

### WR-01: `nameSchema` doesn't trim, allowing a whitespace-only name to be persisted

**File:** `apps/mobile/app/(auth)/complete-profile.tsx:8`
**Issue:** `const nameSchema = z.object({ name: z.string().min(1, "Name is required") });` — `.min(1)` counts whitespace characters, so entering only spaces (e.g. `"   "`) passes validation. The "Continue" button's `disabled={!name}` (line 111) is also a raw truthiness check on the untrimmed state, so it enables for whitespace-only input too. The result: a patient row can be created with a blank/whitespace `name` in a healthcare record. This is inconsistent with `apps/mobile/lib/profileSchema.ts`, which correctly does `z.string().trim().min(1, ...)` for the same field on the edit-profile screen.
**Fix:**
```ts
const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});
```
and insert `parsed.data.name` (already done) — trimming in the schema is sufficient once added. Also switch the button's `disabled={!name}` to `disabled={!name.trim()}` so the control reflects the same rule.

### WR-02: No re-entrancy guard on other async submit handlers (duplicate network calls on rapid double-tap)

**File:** `apps/mobile/app/(auth)/login.tsx:47` (`onSendCode`), `apps/mobile/app/(auth)/login.tsx:66` (`onVerifyCode`), `apps/mobile/app/(tabs)/profile.tsx:75` (`onSave`)
**Issue:** Same pattern as CR-01 but with less severe consequences: none of these handlers check `if (sendingCode/verifying/saving) return;` before proceeding, relying entirely on the `Button`'s `disabled`/`loading` props to prevent a second dispatch — which only take effect after the state update triggers a re-render. `onVerifyCode` double-fire is the most user-visible: a second `verifyOtp` call with an already-consumed OTP will surface a spurious "Incorrect code" alert even though the first call already signed the user in.
**Fix:** Add an explicit guard at the top of each handler, e.g. `if (verifying) return;` / `if (sendingCode) return;` / `if (saving) return;`, rather than relying solely on prop-driven disabling.

### WR-03: `normalizePhone` accepts Indian numbers with invalid mobile prefixes

**File:** `apps/mobile/lib/phone.ts:16-18`
**Issue:** `if (/^\d{10}$/.test(stripped)) return \`+91${stripped}\`;` accepts any 10-digit string, including ones starting with 0-5. Real Indian mobile numbers always start with 6-9. A number like `"0123456789"` normalizes successfully and is passed to `signInWithOtp`, which will either silently fail server-side or attempt (and fail) an SMS send — either way the UI advances to the "Enter the 6-digit code" stage (line 62-63 in `login.tsx`, unconditional on `!error`) with no code ever arriving, and the user's only recourse is "Use a different number" with no explanation of why.
**Fix:**
```ts
if (/^[6-9]\d{9}$/.test(stripped)) {
  return `+91${stripped}`;
}
if (/^\+91[6-9]\d{9}$/.test(stripped)) {
  return stripped;
}
```
(apply the same tightened prefix check to the `+91`-prefixed branch above it).

## Info

### IN-01: Unused dependencies declared in package.json

**File:** `apps/mobile/package.json:19,21,22` (`date-fns`, `expo-constants`, `expo-linking`)
**Issue:** None of these three packages are imported anywhere under `apps/mobile` (`grep -rn "date-fns\|expo-linking\|expo-constants"` across `app/`, `components/`, `lib/` returns nothing besides `package.json` itself). `Linking` is used via the `react-native` re-export in `ReportVisitGroup.tsx`, not `expo-linking`. `date-fns` was likely scaffolded per D-45's stack list but superseded by the `Intl`-based `formatIST` in `lib/format.ts`.
**Fix:** Remove the three unused entries from `dependencies`, or wire them in if a future task needs them.

### IN-02: Non-null env var assertions produce a cryptic failure instead of a clear one

**File:** `apps/mobile/lib/supabase.ts:6-7`
**Issue:** `process.env.EXPO_PUBLIC_SUPABASE_URL!` / `...ANON_KEY!` use TypeScript's non-null assertion, which has no runtime effect. If either `EXPO_PUBLIC_*` var is missing at build/run time (e.g., a CI export step without `.env` populated), `createClient(undefined, undefined, ...)` runs and fails with an opaque `supabase-js` internal error rather than an actionable message.
**Fix:**
```ts
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL/ANON_KEY — check .env");
}
```

### IN-03: Dev-login fallback can write an email address into the `phone` column

**File:** `apps/mobile/app/(auth)/complete-profile.tsx:23`
**Issue:** `const authPhone = session?.user.phone || session?.user.email || "";` — for any `__DEV__`-only email/password sign-in against an account that isn't the pre-seeded `patient@test.com` (which already has a `patients` row), this screen would insert the dev email string into the `patients.phone` column labeled "Mobile number" everywhere else in the app. Scoped entirely to `__DEV__` builds (excluded from production per D-48), so impact is limited to local testing confusion, not a shippable defect.
**Fix:** Non-blocking; if it's worth closing, gate the fallback behind `__DEV__` explicitly (`session?.user.phone || (__DEV__ ? session?.user.email : "") || ""`) so the intent is self-documenting.

---

_Reviewed: 2026-07-13T22:34:44Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
