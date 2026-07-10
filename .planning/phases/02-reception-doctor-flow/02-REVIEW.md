---
phase: 02-reception-doctor-flow
reviewed: 2026-07-10T05:19:47Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - apps/web/e2e/doctor-consult.spec.ts
  - apps/web/e2e/doctor-orders-prescriptions.spec.ts
  - apps/web/e2e/reception-queue.spec.ts
  - apps/web/package.json
  - apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx
  - apps/web/src/app/doctor/consult/[appointmentId]/orders-section.tsx
  - apps/web/src/app/doctor/consult/[appointmentId]/page.tsx
  - apps/web/src/app/doctor/consult/[appointmentId]/prescriptions-section.tsx
  - apps/web/src/app/doctor/doctor-today.tsx
  - apps/web/src/app/doctor/page.tsx
  - apps/web/src/app/doctor/patient-card.tsx
  - apps/web/src/app/doctor/patients/[id]/page.tsx
  - apps/web/src/app/doctor/patients/page.tsx
  - apps/web/src/app/doctor/patients/patients-client.tsx
  - apps/web/src/app/reception/billing/billing-client.tsx
  - apps/web/src/app/reception/billing/page.tsx
  - apps/web/src/app/reception/billing/payment-form.tsx
  - apps/web/src/app/reception/page.tsx
  - apps/web/src/app/reception/patients/[id]/page.tsx
  - apps/web/src/app/reception/patients/page.tsx
  - apps/web/src/app/reception/patients/patients-client.tsx
  - apps/web/src/app/reception/patients/register-form.tsx
  - apps/web/src/app/reception/queue-client.tsx
  - apps/web/src/app/reception/queue-row.tsx
  - apps/web/src/lib/hooks/use-realtime.test.ts
  - apps/web/src/lib/hooks/use-realtime.ts
  - apps/web/src/lib/patient.ts
  - apps/web/src/lib/search.ts
  - apps/web/src/lib/status.ts
  - apps/web/src/lib/theme.ts
  - apps/web/src/lib/time.ts
  - apps/web/vitest.config.ts
  - supabase/seed-dev.sql
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-10T05:19:47Z
**Depth:** standard
**Files Reviewed:** 33
**Status:** issues_found

## Summary

Reviewed the reception queue, doctor consult lifecycle, patient registries, and billing flows against the Phase-2 context (D-15..D-31), with focused attention on PII handling, PostgREST search sanitization, the shared realtime hook, optimistic-update rollback, race conditions, money handling, and type safety.

Positives confirmed: `sanitizeSearchTerm` correctly blocks the primary `.or()`/ILIKE injection vectors (`,`, `(`, `)`, `%`, `\`); `useRealtimeList`'s reconnect/backoff/visibilitychange logic and channel cleanup are correct and match the accompanying unit tests; the `ensureVisit` in-flight-promise dedupe in `consult-client.tsx` correctly prevents the double-visit-insert race between "Start Consultation" and an eager "Complete Visit" click (this was explicitly called out as previously fixed, and it holds up under review); no `any` escapes, no hardcoded secrets, no console/debugger artifacts, no empty catch blocks were found anywhere in scope.

One Critical issue was found: `/doctor/patients/[id]/page.tsx` has no doctor-ownership check, unlike its sibling list page and the consult page's established defense-in-depth pattern, and can disclose any patient's PII to a doctor who never treated them. Five Warnings cover a stale-state bug in the live queue's status badge, incomplete search-term sanitization, unvalidated money precision, missing double-submit/duplicate-billing guards, and a missing future-date guard on patient DOB. Three Info items are minor quality nits.

## Critical Issues

### CR-01: Doctor patient-history page discloses PII for patients the doctor never treated (IDOR / broken access control)

**File:** `apps/web/src/app/doctor/patients/[id]/page.tsx:61-102`

**Issue:** This page renders full patient PII (name, phone, DOB, ABHA ID) plus complete visit/order/prescription history for whatever `id` is in the URL. Unlike every other doctor-scoped read in this phase, it never calls `getStaff()` and never filters by `doctor_id`:

```ts
const patientResult = await supabase
  .from("patients")
  .select("id, name, phone, dob, abha_id")
  .eq("id", id)
  .maybeSingle();
...
const visitsResult = await supabase
  .from("visits")
  .select(
    "id, chief_complaint, diagnosis, notes, completed_at, created_at, orders(...), prescriptions(...)",
  )
  .eq("patient_id", id)   // <-- no .eq("doctor_id", staff.id) anywhere
  .order("created_at", { ascending: false })
  .limit(50);
```

Compare this to the two patterns this same phase already established:
- `apps/web/src/app/doctor/patients/page.tsx:34` — the list this detail page is linked from — correctly scopes with `.eq("doctor_id", staff.id)`.
- `apps/web/src/app/doctor/consult/[appointmentId]/page.tsx:72` — adds an explicit `appointment.doctor_id !== staff.id` check as documented "IDOR defense-in-depth" beyond RLS (T-02-16).

`middleware.ts` only enforces role-level routing (`doctor` may access `/doctor/*`), not resource-level ownership, so there is no other application-layer gate. The `patients` table is read by an unrestricted `.eq("id", id)`, the same shape reception legitimately uses (reception is supposed to see every patient — `reception/patients/[id]/page.tsx`). If — as is very plausible given the `staff_staff_select`-style broad "any staff may read" RLS pattern already seen in this codebase's own migration (`supabase/migrations/20260710_fix_rls_helper_recursion.sql`) — the `patients` table RLS policy is similarly broad for staff, this page will successfully resolve the `patient` object (and render name/phone/DOB/ABHA) for **any** patient in the system regardless of whether this doctor ever had a visit with them; only the visit/order/prescription list would come back empty. This directly contradicts the phase's own stated mitigation for this exact page (T-02-23: "a foreign/random id yields not-found rather than data") and its verification note, which only demonstrates a nonexistent random UUID returning empty — not an existing-but-foreign patient id.

**Fix:** Verify ownership before rendering, mirroring the consult page's pattern — require at least one visit between this doctor and the patient before returning data:

```ts
const staff = await getStaff();
...
const ownVisitCheck = await supabase
  .from("visits")
  .select("id")
  .eq("doctor_id", staff.id)
  .eq("patient_id", id)
  .limit(1)
  .maybeSingle();

if (!ownVisitCheck.data) {
  return (
    <EmptyState
      icon={UserRound}
      title="Patient not found"
      description="This patient record doesn't exist or was removed."
    />
  );
}
```
and additionally scope the `visits` query itself with `.eq("doctor_id", staff.id)` so the history returned is provably this doctor's own, not just gated at the entry check.

## Warnings

### WR-01: Reception queue badge/actions go stale after an external status change (no realtime resync of local state)

**File:** `apps/web/src/app/reception/queue-row.tsx:30-32`

**Issue:** `optimisticStatus` is seeded once from `row.status` via `useState` initializer:

```ts
const [optimisticStatus, setOptimisticStatus] = useState<AppointmentStatus>(
  row.status ?? "booked",
);
```

`QueueRow` is keyed by `row.id` (stable across `useRealtimeList` refetches), so this instance is never remounted when the row's real status changes for a reason other than this row's own button click — e.g., a doctor starts/completes the consultation, or another reception session checks the patient in. The parent's `data` array does update live (realtime refetch works correctly), and a new `row` prop with the fresh `status` is passed down, but `optimisticStatus` never re-syncs to it, so:
- The status badge silently freezes on the last value this specific browser tab wrote, defeating the "live queue, no refresh" core value for any change this tab didn't originate.
- `canCheckIn`/`canNoShow` are derived from the stale `optimisticStatus`, so if the real status regresses past `booked` behind the scenes (e.g. cancelled), the stale-`booked` local state could still offer a Check-In/No-Show action against a row that server-side is no longer `booked`.

**Fix:** Sync local state to the prop when it changes, e.g. drop the local optimistic copy in favor of deriving directly from `row.status` and only using local state for the in-flight/error window:

```ts
const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | null>(null);
const displayedStatus = pendingStatus ?? row.status ?? "booked";
// on success: setPendingStatus(null) and let the refetch's fresh `row` drive display
// on error: setPendingStatus(null) (rollback) — no need to remember the old value at all
```
or add a `useEffect(() => setOptimisticStatus(row.status ?? "booked"), [row.status])` to resync whenever the prop changes and there is no pending local write.

### WR-02: `sanitizeSearchTerm` does not neutralize the ILIKE single-character wildcard

**File:** `apps/web/src/lib/search.ts:7-9`

**Issue:** The sanitizer strips `,()*%\` but not `_`, which is ILIKE's single-character wildcard (`%` is the multi-char wildcard, already stripped). A search term containing `_` (e.g. part of a name, or an ABHA id with an underscore-shaped typo) is not escaped, so it silently behaves as "any single character" rather than a literal underscore, producing broader-than-intended matches on `name`/`phone`/`abha_id`. This isn't an injection vector (can't break out of the filter grouping) but is an incomplete implementation of the function's own stated goal ("input cannot break out of an ilike pattern").

**Fix:** Escape rather than only strip, so the value stays a literal match once used inside `%...%`:
```ts
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()*%\\]/g, "")
    .replace(/_/g, "")   // or escape as \_ if the ilike value is later unescaped server-side
    .trim()
    .slice(0, 40);
}
```

### WR-03: Payment amount is not constrained to currency precision or an upper bound

**File:** `apps/web/src/app/reception/billing/payment-form.tsx:23-26, 79-89`

**Issue:** `amount: z.coerce.number().positive(...)` accepts any positive float — e.g. `199.999` or `1e9` — with no `.multipleOf(0.01)`/decimal-place cap and no sane maximum. The `<Input type="number" step={0.01}>` is only a UI hint and does not block pasted or scripted values. A value with more than 2 decimal places will be silently rounded/truncated by whatever numeric precision the `payments.amount` column has, so what the receptionist typed and what gets billed/displayed can silently diverge, and there is no guard against a fat-fingered absurd amount (e.g. an extra zero).

**Fix:**
```ts
const schema = z.object({
  amount: z.coerce
    .number()
    .positive("Enter a positive amount")
    .max(1_000_000, "Amount looks too large — double-check")
    .refine((n) => Math.round(n * 100) === n * 100, "Amount can have at most 2 decimal places"),
  method: z.enum(["cash", "card", "upi"]),
});
```

### WR-04: No guard against duplicate payment / duplicate insert on rapid double-submit

**File:** `apps/web/src/app/reception/billing/payment-form.tsx:44-72`, `apps/web/src/app/reception/billing/billing-client.tsx:60-100`

**Issue:** `onSubmit` sets `loading`/disables the button only after its own synchronous body runs, and React batches that state update to the next render — a fast double-click (or two reception sessions opening the same "needs billing" row) can both call `supabase.from("payments").insert(...)` before either the UI disables or the row transitions to "has payment", since `billing-client.tsx` has no realtime subscription (by design, D-25) and doesn't re-check for a preexisting payment immediately before insert. Absent a DB-level unique constraint on `payments.visit_id` (not visible in files under review), this can silently double-bill a visit. This same unguarded pattern (disable-after-the-fact, no pre-insert existence check) recurs in `register-form.tsx` and the order/prescription `handleAdd` functions, though the impact there is lower (duplicate phone is caught by a unique-violation toast; duplicate orders/prescriptions are merely an extra removable row).

**Fix:** For the money path specifically, re-check for an existing payment immediately before insert (or rely on/add a DB unique constraint on `payments.visit_id` and surface `23505` as a friendly "already billed" toast, matching the pattern already used in `register-form.tsx` for the phone unique-violation):
```ts
const { data: existing } = await supabase
  .from("payments")
  .select("id")
  .eq("visit_id", visitId)
  .maybeSingle();
if (existing) {
  toast.error("This visit already has a payment recorded");
  return;
}
```

### WR-05: Patient date-of-birth accepts future dates, producing negative ages throughout the app

**File:** `apps/web/src/app/reception/patients/register-form.tsx:24`, `apps/web/src/lib/patient.ts:6-15`

**Issue:** `dob: z.string().optional().or(z.literal(""))` places no upper bound on the date. `ageFromDob` (`lib/patient.ts`) only rejects unparseable strings via `Number.isNaN(b.getTime())`; a future `dob` parses fine and produces a negative `age`. A fat-fingered date of birth (e.g. `2030-01-01` instead of `2003-...`) is accepted at registration and will silently render as e.g. `"-4 yrs"` everywhere `ageFromDob` is used (patient search results, doctor today cards, consult header, patient detail pages) instead of surfacing a validation error at entry time.

**Fix:** Reject future dates at the form boundary:
```ts
dob: z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || new Date(v).getTime() <= Date.now(), "Date of birth cannot be in the future"),
```
and/or make `ageFromDob` defensively return `null` for a `b > now` result so a stale/legacy bad row never renders a negative age.

## Info

### IN-01: Optimistic-remove rollback re-sorts by string id, not original order

**File:** `apps/web/src/app/doctor/consult/[appointmentId]/orders-section.tsx:118`, `apps/web/src/app/doctor/consult/[appointmentId]/prescriptions-section.tsx:160-162`

**Issue:** On a failed delete, the removed item is spliced back in and the array is re-sorted with `(a, b) => (a.id < b.id ? -1 : 1)` — a lexicographic sort on UUIDs, which does not match the original `ordered_at`/`created_at` order the list was loaded in. A failed remove can visibly reshuffle unrelated rows.

**Fix:** Re-insert at the item's original index instead of re-sorting by id, e.g. capture the index in `handleRemove` before filtering and splice back at that position on rollback.

### IN-02: `initialStatus` fallback masks an unexpected null status with an arbitrary value

**File:** `apps/web/src/app/doctor/consult/[appointmentId]/page.tsx:142`

**Issue:** `initialStatus={appointment.status ?? "checked_in"}` — if `appointments.status` were ever unexpectedly null (schema says NOT NULL, so this should be unreachable), defaulting to `"checked_in"` rather than the schema's actual default (`"booked"`) would incorrectly show the "Start Consultation" action for a patient who was never checked in.

**Fix:** Default to `"booked"` (the true schema default) if this branch is kept as defensive coding, or drop the fallback and let a genuinely null status surface as a rendering error so the underlying data issue isn't hidden.

### IN-03: `useRealtimeList` fetches twice on every mount/resubscribe

**File:** `apps/web/src/lib/hooks/use-realtime.ts:100-105, 120-121`

**Issue:** `runFetch()` is invoked both unconditionally right after the channel is created (line 121, "Initial fetch on mount / resubscribe") and again inside the `subscribe` callback once the status reaches `SUBSCRIBED` (line 105). Every mount and every reconnect therefore issues two network requests instead of one; if the two responses race and disagree (e.g. a row changed between them), the UI can flicker between two slightly different data sets before settling.

**Fix:** Drop the unconditional call at line 121 and rely solely on the `SUBSCRIBED` callback to trigger the first fetch (it already fires promptly on a healthy connection), or gate the unconditional call behind a "only if not already subscribed within N ms" check if an immediate paint before the channel handshake completes is the intended UX.

---

_Reviewed: 2026-07-10T05:19:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
