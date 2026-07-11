---
phase: 03-diagnostics-pharmacy-flow
reviewed: 2026-07-11T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - apps/web/e2e/diagnostics-flow.spec.ts
  - apps/web/e2e/pharmacy-dispense.spec.ts
  - apps/web/e2e/pharmacy-inventory.spec.ts
  - apps/web/playwright.config.ts
  - apps/web/src/app/diagnostics/completed/completed-filters.tsx
  - apps/web/src/app/diagnostics/completed/page.tsx
  - apps/web/src/app/diagnostics/in-progress/in-progress-client.tsx
  - apps/web/src/app/diagnostics/in-progress/in-progress-row.tsx
  - apps/web/src/app/diagnostics/in-progress/page.tsx
  - apps/web/src/app/diagnostics/page.tsx
  - apps/web/src/app/diagnostics/pending-client.tsx
  - apps/web/src/app/diagnostics/pending-row.tsx
  - apps/web/src/app/doctor/consult/[appointmentId]/consult-client.tsx
  - apps/web/src/app/doctor/patients/[id]/page.tsx
  - apps/web/src/app/pharmacy/dispensed/dispensed-filters.tsx
  - apps/web/src/app/pharmacy/dispensed/page.tsx
  - apps/web/src/app/pharmacy/inventory/add-medicine-form.tsx
  - apps/web/src/app/pharmacy/inventory/inventory-client.tsx
  - apps/web/src/app/pharmacy/inventory/page.tsx
  - apps/web/src/app/pharmacy/page.tsx
  - apps/web/src/app/pharmacy/pending-client.tsx
  - apps/web/src/app/pharmacy/pending-row.tsx
  - apps/web/src/components/result-link.tsx
  - apps/web/src/lib/results.test.ts
  - apps/web/src/lib/results.ts
  - apps/web/src/lib/status.ts
  - apps/web/src/lib/theme.ts
  - apps/web/src/lib/time.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Reviewed the diagnostics (DIAG-01..03) and pharmacy (PHARM-01..04) flow: accept → upload → complete, dispense-via-RPC, inline stock edit, and the two date-range filter pages, plus the D-35 `getResultUrl`/`ResultLink` signed-URL helper and its retrofit into the doctor portal.

The locked decisions (D-32..D-44) are implemented faithfully where checked: the dispense flow never writes `medicines`/`prescriptions` client-side (RPC-only, confirmed in `pharmacy/pending-row.tsx`), uploaded result files are stored as a Storage **path** (never a public URL) with the filename sanitized so `/` cannot escape the `orders/{id}/` prefix (no path-traversal vector found), the type filter on the completed-orders page is whitelist-validated before being interpolated into `.eq()`, and signed URLs are resolved on-demand per click and never cached into React state or logged.

Two Critical defects were found, both concrete and reproducible: (1) the shared IST date-range helper (`lib/time.ts`) throws on any date-input query param that doesn't parse into y/m/d, which crashes both server-rendered filter pages (`diagnostics/completed`, `pharmacy/dispensed`) on a malformed `?from=`/`?to=` — trivially triggerable by hand-editing the URL; (2) the add-medicine price validator (`add-medicine-form.tsx`) uses a floating-point `Math.round(n*100) === n*100` check that rejects legitimate two-decimal prices like `19.99` due to IEEE-754 rounding, verified against the project's own zod dependency.

Four Warnings cover a lost-update race in the inline stock-qty editor (absolute overwrite, no compare-and-swap against a concurrent dispense), a double-save bug in that same editor (Enter disables the input, which blurs it, re-firing the save handler with no re-entrancy guard), a popup-blocker risk in `ResultLink` (the `window.open` call happens after an `await`, which can lose user-activation and silently do nothing), and a self-reset gap in two e2e specs where a mid-test assertion failure after a mutating action but before the cleanup `finally` block permanently desyncs the shared seed row for all subsequent runs — the exact "seed drift" failure mode D-43 was written to avoid.

## Critical Issues

### CR-01: Malformed date-range query params crash the completed/dispensed server pages

**File:** `apps/web/src/lib/time.ts:19-23,34-43`
**Also affects:** `apps/web/src/app/diagnostics/completed/page.tsx:63`, `apps/web/src/app/pharmacy/dispensed/page.tsx:48`

**Issue:** `istRangeFromDates(from, to)` passes `from`/`to` straight from `searchParams` into `istDayStart`, which does `dateStr.split("-").map(Number)` with no format/NaN validation, then calls `.toISOString()` on the resulting `Date`. Both consuming pages are async Server Components that call this unconditionally on every request. Any `from`/`to` value that isn't cleanly `YYYY-MM-DD` (e.g. `?from=x`, `?from=abc-def`, a pasted/typed value, or simply an incomplete edit while typing in the date input before it round-trips through the URL) produces `Date.UTC(NaN, NaN, NaN)` → an Invalid Date → `.toISOString()` throws `RangeError: Invalid time value`, which is uncaught and crashes the whole page render (Next.js 500). Verified directly:
```
$ node -e "new Date(Date.UTC(NaN,NaN,NaN) - 19800000).toISOString()"
Uncaught RangeError: Invalid time value
```
Because the date inputs write directly to the URL query string (`router.push(...?from=...)`), this is reachable by anyone who edits the address bar — no special tooling required — and takes down `/diagnostics/completed` and `/pharmacy/dispensed` entirely (not just the filter).

**Fix:** Validate the format before parsing and fail soft (ignore the bad filter) instead of throwing:
```ts
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function istDayStart(dateStr: string): Date | null {
  if (!DATE_RE.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!) - IST_OFFSET_MS);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function istRangeFromDates(from?: string | null, to?: string | null) {
  const start = from ? istDayStart(from) : null;
  const toStart = to ? istDayStart(to) : null;
  return {
    startISO: start?.toISOString() ?? null,
    endISO: toStart ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
  };
}
```

### CR-02: Add-medicine price validation rejects valid two-decimal prices

**File:** `apps/web/src/app/pharmacy/inventory/add-medicine-form.tsx:26-29`
**Issue:** The zod `.refine((n) => Math.round(n * 100) === n * 100, "Max two decimals")` check compares an unrounded floating-point product against its rounded value. Due to IEEE-754 binary representation, this fails for ordinary two-decimal prices — confirmed against the project's actual zod install:
```
$ node -e "...schema.safeParse({unit_price:'19.99'})..."
19.99 REJECTED: Max two decimals
9.99  OK
12.50 OK
```
`₹19.99` (and other values whose `n * 100` lands just under the nearest integer) can never be entered — this is D-40's own stated requirement ("price ≥0 max 2dp") failing on real-world values with no workaround, since the rejection is deterministic for that price.

**Fix:** Validate against the decimal string, not floating-point arithmetic:
```ts
unit_price: z.coerce
  .number()
  .min(0)
  .refine(
    (n) => /^\d+(\.\d{1,2})?$/.test(n.toFixed(2)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    "Max two decimals",
  ),
```
or simpler — validate the raw input string before coercion: `z.string().regex(/^\d+(\.\d{1,2})?$/, "Max two decimals").transform(Number).pipe(z.number().min(0))`.

## Warnings

### WR-01: Inline stock edit is a lost-update race against concurrent dispense/edits

**File:** `apps/web/src/app/pharmacy/inventory/inventory-client.tsx:88-111`
**Issue:** `saveEdit` issues an unconditional `.update({ stock_qty: n })` where `n` is whatever the pharmacist typed, based on the `stock_qty` value that was current when they clicked into the cell (`startEdit`). There is no compare-and-swap against the value the row had when editing began (e.g. `.eq("stock_qty", originalValue)`) and no re-read before writing. If a concurrent `dispense_medicine` RPC call (from this pharmacist in another tab, or another pharmacist) decrements `stock_qty` while the cell is open for editing, the subsequent save silently overwrites that decrement with the stale absolute value, discarding the dispense's effect on the recorded stock count.
**Fix:** Either compute the save as a delta from the value the input started with (`stock_qty: currentDbValue + (n - originalValue)` via an RPC/`increment`), or scope the update with an optimistic-lock predicate and treat a zero-row-affected result as a conflict requiring refetch+retry:
```ts
const { data, error } = await supabase
  .from("medicines")
  .update({ stock_qty: n })
  .eq("id", id)
  .eq("stock_qty", originalStockQty) // fails silently (0 rows) if stale
  .select("id");
if (!error && (data?.length ?? 0) === 0) {
  toast.error("Stock changed elsewhere — refresh and retry");
}
```

### WR-02: Enter-to-save re-triggers the save via blur (duplicate PATCH)

**File:** `apps/web/src/app/pharmacy/inventory/inventory-client.tsx:88-121,199-212`
**Issue:** Pressing Enter calls `saveEdit`, which immediately does `setSaving(true)`. That re-render sets the still-focused `<Input disabled={saving} .../>` to `disabled`. Per the HTML spec, disabling a focused form control forces it to lose focus, which fires the native `blur` event — and `onBlur` is wired to call `void saveEdit(m.id)` again. `saveEdit` has no re-entrancy guard (`if (saving) return;`), so the Enter path fires two concurrent `.update({ stock_qty: n })` calls with the same value: a redundant network round-trip and, since both resolve successfully, a duplicated `toast.success("Stock updated")`. Low real-world impact (same value written twice) but a genuine, deterministic double-invocation bug the e2e spec doesn't catch (it only waits for the *first* matching PATCH response).
**Fix:** Guard for re-entrancy at the top of `saveEdit`:
```ts
async function saveEdit(id: string) {
  if (saving) return;
  ...
}
```

### WR-03: `ResultLink`'s `window.open` runs after an `await`, risking silent popup-block

**File:** `apps/web/src/components/result-link.tsx:19-29`
**Issue:** `handleClick` awaits `getResultUrl` (a Storage `createSignedUrl` network call) before calling `window.open(url, "_blank", ...)`. Browsers grant "transient user activation" from a click, but it can expire or be consumed by the time an async network round-trip resolves — several browsers (notably Safari, and Chrome under load/slow network) will then silently block the resulting `window.open` as an unrequested popup, with no error and no return-value check here to detect it. The user sees the button flip from "Opening…" back to "View result" with nothing having happened, and no toast explains why.
**Fix:** Check the return value and surface a fallback:
```ts
const popup = window.open(url, "_blank", "noopener,noreferrer");
if (!popup) {
  toast.error("Popup blocked — allow popups for this site, or click again");
}
```
(A more robust fix opens a placeholder tab synchronously on click and navigates it once the URL resolves, but the toast fallback is a minimal, low-risk improvement.)

### WR-04: Self-reset cleanup doesn't cover the whole test body — a mid-test failure permanently desyncs seed state

**File:** `apps/web/e2e/pharmacy-dispense.spec.ts:53-97`, `apps/web/e2e/pharmacy-inventory.spec.ts:34-74`
**Issue:** In both specs' first test, the mutating action (dispense RPC click / stock-cell PATCH) and its immediate UI assertion (`expect(row).toHaveCount(0)` / `expect(row).toContainText("199")`) happen **before** the `try { ... } finally { /* self-reset */ }` block. If either of those pre-`try` assertions times out or throws — a realistic flake given they depend on realtime refetch propagation — the test fails immediately and the `finally` reset (`prescriptions.status→pending` + `medicines.stock_qty→120`, or `medicines.stock_qty→200`) never runs. The seeded row (`RX_ID`/`MEDICINE_ID` from `seed-dev.sql`) is left permanently mutated, breaking every subsequent run of this spec (and any other spec/assertion that depends on that seed value) until someone manually restores it via SQL — precisely the "seed drift" failure mode `deferred-items.md` and D-43 were written to prevent. Contrast with `diagnostics-flow.spec.ts`, which correctly uses Playwright's `test.afterEach` (guaranteed to run regardless of test outcome) instead of an inline `try/finally` that only wraps part of the test.
**Fix:** Wrap the entire test body (from the first mutating click onward) in `try { ... } finally { ...reset... }`, or move the reset into `test.afterEach` the way `diagnostics-flow.spec.ts` does:
```ts
test("...", async ({ page }) => {
  await loginAsPharmacist(page);
  try {
    const row = page.getByTestId(`pending-row-${RX_ID}`);
    ... // all actions + assertions
  } finally {
    const supabase = await pharmacistClient();
    await supabase.from("prescriptions").update({ status: "pending", dispensed_at: null }).eq("id", RX_ID);
    await supabase.from("medicines").update({ stock_qty: 120 }).eq("id", MEDICINE_ID);
    await supabase.auth.signOut();
  }
});
```

## Info

### IN-01: Empty numeric fields in Add Medicine silently coerce to 0

**File:** `apps/web/src/app/pharmacy/inventory/add-medicine-form.tsx:22-31`
**Issue:** `z.coerce.number()` on an empty string coerces via `Number("") === 0`, which is a valid non-negative integer/price. Leaving Stock, Price, or Threshold blank therefore submits successfully with `0` rather than surfacing a "required" validation error — likely not the intended UX for a required numeric field.
**Fix:** Require non-empty input explicitly before coercion, e.g. `z.string().min(1, "Required").pipe(z.coerce.number()...)`, or validate the raw string state (`stockQty === ""`) before calling `schema.safeParse`.

### IN-02: File-type restriction is `accept`-attribute only (client hint, not enforcement)

**File:** `apps/web/src/app/diagnostics/in-progress/in-progress-row.tsx:63-72,155-163`
**Issue:** The result-file input only restricts selection via `accept="image/*,application/pdf"` (a UI hint many OS file pickers don't strictly enforce) and checks `selected.size`; `selected.type` is never checked before `supabase.storage.from("scan-results").upload(path, file)`. Per the code's own comment and D-44/context, authoritative enforcement is delegated to the already-deployed Storage insert policy, so this is not a gap in the security boundary — but it means an obviously-wrong file type only gets rejected server-side (extra round trip, less immediate feedback) rather than failing fast client-side.
**Fix (optional, defense-in-depth/UX only):** Re-check `selected.type` against an allow-list in `handleFileChange` and toast immediately, mirroring the existing size check.

---

_Reviewed: 2026-07-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
