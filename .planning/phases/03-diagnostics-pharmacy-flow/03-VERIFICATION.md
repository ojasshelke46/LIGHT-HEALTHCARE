---
phase: 03-diagnostics-pharmacy-flow
verified: 2026-07-11T09:45:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Cross-tab live update (no page refresh) — dispense and Accept flows"
    expected: "With /pharmacy open in tab A and /pharmacy/inventory (or a second /pharmacy) open in tab B, dispensing a prescription in tab A drops the row from tab B's pending list and updates its stock live, with no manual refresh. Same check for /diagnostics accepting an order while /diagnostics/in-progress is open in a second tab."
    why_human: "useRealtimeList's postgres_changes subscription is code-verified (correct table watch arrays: [\"prescriptions\",\"medicines\"] for pharmacy pending, [\"medicines\"] for inventory, orders for diagnostics) and is unchanged, previously-established Phase-1/2 infrastructure, but actual cross-tab propagation is a live two-session visual behavior Playwright's single-session e2e specs don't exercise (they assert same-tab optimistic-hide + a server-state re-read, not a second session observing the postgres_changes event). This is the project's stated Core Value (\"works end-to-end in real time... without a page refresh\") so it warrants a human spot-check rather than being assumed from code alone."
  - test: "Low-stock amber row highlighting on /pharmacy/inventory"
    expected: "Rows where stock_qty <= low_stock_threshold render with a visible amber (bg-amber-50) highlight and sort before non-low-stock rows."
    why_human: "Sort/highlight logic (isLow(), bg-amber-50 className) is confirmed correct by direct code read, but visual contrast/appearance was not asserted by any e2e test (UI hint: yes for this phase) and needs an eyeball check."
  - test: "ResultLink same-tab fallback when a popup is blocked"
    expected: "Clicking 'View result' when the browser blocks window.open() should navigate the current tab to the signed result URL instead of silently doing nothing."
    why_human: "The WR-03 fix (apps/web/src/components/result-link.tsx:30-31, `if (!win) window.location.assign(url)`) is present in code, but the e2e run in this verification confirmed only the non-blocked path (a real popup opened and its URL was asserted) — Playwright/Chromium in this environment did not block the popup, so the fallback branch itself was not exercised end-to-end."
---

# Phase 3: Diagnostics & Pharmacy Flow Verification Report

**Phase Goal:** Diagnostics fulfills doctor-ordered tests and pharmacy dispenses prescribed medicine safely against live stock
**Verified:** 2026-07-11T09:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Lab tech sees ordered tests live, accepts them into progress, uploads a result file to Storage with notes, and marks the order completed | ✓ VERIFIED | `pending-client.tsx`/`pending-row.tsx` (useRealtimeList on `orders` status=ordered, Accept → `in_progress`), `in-progress-row.tsx` (file upload to `scan-results` at `orders/{id}/{ts}-{safe}`, zod file-OR-notes gate, Mark Complete → status=completed/completed_at/result_url=path). Independently re-ran `diagnostics-flow.spec.ts` live against the real Supabase project — passed twice consecutively. |
| 2 | Lab tech can browse completed orders with date-range and type filters and open result files | ✓ VERIFIED | `diagnostics/completed/page.tsx`: server query filtered by whitelisted `type` + `istRangeFromDates(from,to)`, each row renders `<ResultLink pathOrUrl={row.result_url}/>`. e2e extends through this page and asserts a real popup opens with a `scan-results` URL — reproduced live in this verification. |
| 3 | Pharmacist sees pending prescriptions live with current stock and low-stock warnings | ✓ VERIFIED | `pharmacy/pending-client.tsx` watches `["prescriptions","medicines"]`; `pending-row.tsx` renders `stockLevel()` badge (red insufficient / amber low / green ok). e2e asserts stock text ("120") and the "insufficient stock" badge text on the throwaway low-stock row. |
| 4 | Pharmacist dispenses medicine via the atomic dispense_medicine RPC; insufficient stock surfaces as an error toast rather than a partial dispense | ✓ VERIFIED | `pending-row.tsx` calls `supabase.rpc("dispense_medicine", {...})` only — grep confirms no `.from("prescriptions").update(...)`/`.from("medicines").update(...)` anywhere in the dispense path. `pharmacy-dispense.spec.ts` (re-run live, twice) proves stock 120→110 on success and stock/status untouched + destructive toast on insufficient-stock (999 vs 15 in stock). |
| 5 | Pharmacist can manage inventory (inline stock edit, low-stock items surfaced first, add-medicine form) and browse dispensed history with a date-range filter | ✓ VERIFIED | `inventory-client.tsx`: low-stock-first sort + `bg-amber-50` highlight, inline edit with compare-and-swap (`eq("stock_qty", expectedStock)`) and re-entrancy guard; `add-medicine-form.tsx`: zod schema, RLS-scoped insert. `dispensed/page.tsx`: `status=dispensed` ordered `dispensed_at DESC` with `istRangeFromDates` gte/lt. `pharmacy-inventory.spec.ts` (re-run live, twice) proves inline edit 200→199→200 and add-medicine round-trip. |

**Score:** 5/5 truths verified

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| DIAG-01 | 03-02 | Lab tech sees ordered tests live, can accept (→in_progress) | ✓ SATISFIED | `diagnostics/pending-client.tsx` + `pending-row.tsx`, e2e green |
| DIAG-02 | 03-02 | Upload result file + notes, mark completed | ✓ SATISFIED | `in-progress-row.tsx`, storage path stored (`result_url` matches `^orders\/`), e2e green |
| DIAG-03 | 03-03 | Browse completed with date/type filters, open result files | ✓ SATISFIED | `diagnostics/completed/page.tsx` + `completed-filters.tsx`, e2e green (signed-URL popup assertion) |
| PHARM-01 | 03-04 | Pending prescriptions live w/ stock + low-stock warning | ✓ SATISFIED | `pharmacy/pending-client.tsx`/`pending-row.tsx`, e2e green |
| PHARM-02 | 03-04 | Atomic dispense RPC, insufficient stock → error toast | ✓ SATISFIED | RPC-only write path confirmed by grep; e2e green (both happy path and rejection path) |
| PHARM-03 | 03-05 | Inventory management: list, inline edit, low-stock-first, add form | ✓ SATISFIED | `inventory-client.tsx` + `add-medicine-form.tsx`, e2e green |
| PHARM-04 | 03-05 | Dispensed history with date-range filter | ✓ SATISFIED | `pharmacy/dispensed/page.tsx`, code-verified (build passes, route present); not separately e2e-covered by a committed spec but logic mirrors the identically-patterned and tested `diagnostics/completed` filter |

All 7 requirement IDs traced in `.planning/REQUIREMENTS.md` are checked `[x]` and match implementation evidence. No orphaned requirements found for Phase 3 in the traceability table.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `apps/web/src/lib/results.ts` | `getResultUrl` http-passthrough / signed-URL helper | ✓ VERIFIED | Present, exported, 11/11 vitest passing (`results.test.ts`) |
| `apps/web/src/components/result-link.tsx` | View-result button | ✓ VERIFIED | Wired to `getResultUrl`; WR-03 popup-block fallback present (`window.location.assign`) |
| `apps/web/src/lib/status.ts` | `ORDER_STATUS_BADGE`/`PRESCRIPTION_STATUS_BADGE`/`ORDER_TYPE_ICON`/`stockLevel` | ✓ VERIFIED | Used across diagnostics/pharmacy rows |
| `apps/web/src/lib/time.ts` | `istRangeFromDates` | ✓ VERIFIED | CR-01 fix present: regex-validated `istDayStart`, returns `null` (not throw) on malformed input |
| `apps/web/src/lib/theme.ts` | lab_tech/pharmacist nav arrays (D-32/D-37) | ✓ VERIFIED | Pending/In Progress/Completed and Pending/Inventory/Dispensed, correct hrefs/icons |
| `apps/web/src/app/diagnostics/pending-client.tsx`, `pending-row.tsx` | Live ordered list + Accept | ✓ VERIFIED | `useRealtimeList` on `orders`, optimistic Accept → `in_progress` |
| `apps/web/src/app/diagnostics/in-progress/*` | Upload + notes + Complete | ✓ VERIFIED | Storage upload, path-only `result_url`, zod file-or-notes gate |
| `apps/web/src/app/diagnostics/completed/*` | Filtered completed browse | ✓ VERIFIED | Whitelisted type filter, IST range filter, `ResultLink` per row |
| `apps/web/src/app/pharmacy/pending-client.tsx`, `pending-row.tsx` | Live pending + stock + RPC dispense | ✓ VERIFIED | Multi-table watch, RPC-only dispense, no client stock write |
| `apps/web/src/app/pharmacy/inventory/*` | Inventory table + inline edit + add form | ✓ VERIFIED | Low-stock-first sort, CAS + re-entrancy guard (WR-01/WR-02 fixed), zod add form (CR-02 fixed) |
| `apps/web/src/app/pharmacy/dispensed/*` | Filtered dispensed history | ✓ VERIFIED | Same IST-range pattern, route present in build output |
| `apps/web/e2e/diagnostics-flow.spec.ts` | accept→upload→complete→browse e2e | ✓ VERIFIED | Re-ran live: passes, twice consecutively, self-resetting (afterEach) |
| `apps/web/e2e/pharmacy-dispense.spec.ts` | dispense happy path + insufficient-stock e2e | ✓ VERIFIED | Re-ran live: passes both tests, twice consecutively, self-resetting (afterEach safety net) |
| `apps/web/e2e/pharmacy-inventory.spec.ts` | inline-edit + add-medicine e2e | ✓ VERIFIED | Re-ran live: passes both tests, twice consecutively, self-resetting (afterEach safety net) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `result-link.tsx` | `results.ts` | `getResultUrl(pathOrUrl)` on click | ✓ WIRED | grep confirms call site; e2e confirms real signed URL returned |
| `doctor/patients/[id]/page.tsx`, `doctor/consult/.../consult-client.tsx` | `result-link.tsx` | `<ResultLink pathOrUrl=.../>` | ✓ WIRED | No raw `<a href={result_url}>` anchors remain (grep clean) |
| `diagnostics/pending-client.tsx` | `orders` (status=ordered) | `useRealtimeList` fetcher `eq("status","ordered")` | ✓ WIRED | Confirmed in file; e2e proves live behavior |
| `diagnostics/in-progress/in-progress-row.tsx` | `scan-results` bucket | `storage.from("scan-results").upload(...)` | ✓ WIRED | Confirmed; e2e uploads real fixture PNG, verifies signed read-back |
| `diagnostics/in-progress/in-progress-row.tsx` | `orders` row | `.update({status:"completed",...})` | ✓ WIRED | Confirmed; e2e verifies server-side `status`/`completed_at`/`result_url` |
| `diagnostics/completed/page.tsx` | `orders` (status=completed) | server query + `istRangeFromDates` + type whitelist | ✓ WIRED | Confirmed; CR-01 fix makes bad `?from=`/`?to=` fail soft instead of 500ing |
| `pharmacy/pending-client.tsx` | `prescriptions`+`medicines` | `useRealtimeList(["prescriptions","medicines"])` | ✓ WIRED | Confirmed exact array in file |
| `pharmacy/pending-row.tsx` | `dispense_medicine` RPC | `supabase.rpc("dispense_medicine", {p_prescription_id,p_quantity})` | ✓ WIRED | Confirmed; grep shows this is the ONLY prescriptions/medicines write in the pharmacy dispense path |
| `pharmacy/inventory/inventory-client.tsx` | `medicines` row | `.update({stock_qty:n}).eq("id",id).eq("stock_qty",expectedStock)` | ✓ WIRED | CAS confirmed present (WR-01 fix); re-entrancy guard confirmed (WR-02 fix) |
| `pharmacy/dispensed/page.tsx` | `prescriptions` (status=dispensed) | server query + `istRangeFromDates` | ✓ WIRED | Confirmed in file |

### Behavioral Spot-Checks (independently re-run, not trusted from SUMMARY)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase-3 e2e specs (5 tests: diagnostics-flow, pharmacy-dispense×2, pharmacy-inventory×2) | `pnpm exec playwright test e2e/diagnostics-flow.spec.ts e2e/pharmacy-dispense.spec.ts e2e/pharmacy-inventory.spec.ts` | 5/5 passed, run #1 (17.0s) | ✓ PASS |
| Same specs, second consecutive run (self-reset proof, D-43) | same command | 5/5 passed, run #2 (14.5s) | ✓ PASS |
| Full e2e suite (all phases 1-3) | `pnpm exec playwright test` | 15/15 passed (41.7s) | ✓ PASS |
| Unit tests | `pnpm exec vitest run` | 11/11 passed | ✓ PASS |
| Typecheck | `pnpm typecheck` | 0 errors | ✓ PASS |
| Production build | `pnpm build` | Success — `/diagnostics`, `/diagnostics/completed`, `/diagnostics/in-progress`, `/pharmacy`, `/pharmacy/inventory`, `/pharmacy/dispensed` all present as dynamic routes | ✓ PASS |

### Code Review Findings — Fix Verification (not trusted from commit message, read post-fix source)

| Finding | File | Claimed Fix | Independently Verified |
|---|---|---|---|
| CR-01 (Critical): malformed date param 500s completed/dispensed pages | `lib/time.ts` | Regex-validate before parsing, return `null` instead of throwing | ✓ CONFIRMED — `istDayStart` now starts with `if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;` |
| CR-02 (Critical): price validator rejects valid 19.99 | `add-medicine-form.tsx` | String-based regex check instead of float `n*100` comparison | ✓ CONFIRMED — `.refine((n) => /^\d+(\.\d{1,2})?$/.test(String(n)), ...)` |
| WR-01: lost-update race on inline stock edit | `inventory-client.tsx` | Compare-and-swap on `expectedStock` | ✓ CONFIRMED — `.eq("stock_qty", expectedStock)`, zero-rows-affected → toast + refetch |
| WR-02: Enter→blur double-save | `inventory-client.tsx` | Re-entrancy guard | ✓ CONFIRMED — `if (saving) return;` at top of `saveEdit` |
| WR-03: popup-blocked ResultLink fails silently | `result-link.tsx` | Same-tab fallback | ✓ CONFIRMED — `if (!win) window.location.assign(url);` (not independently exercised through an actually-blocked popup in this verification's Chromium run — see human verification item 3) |
| WR-04: partial self-reset leaves seed drift on mid-test failure | `pharmacy-dispense.spec.ts`, `pharmacy-inventory.spec.ts` | describe-level `afterEach` safety net | ✓ CONFIRMED — both specs now have `test.afterEach` restoring seed rows, in addition to the existing per-test `finally` blocks |
| IN-01/IN-02 (Info, not required to fix) | — | — | Not re-checked; informational only, no blocker |

### Anti-Patterns Found

None. Grepped all diagnostics/pharmacy source files plus `results.ts`/`time.ts`/`status.ts`/`result-link.tsx` for `TODO|FIXME|XXX|HACK|PLACEHOLDER|not yet implemented|coming soon` — zero matches.

### Human Verification Required

See frontmatter `human_verification` — 3 items: cross-tab live-update visual check (core-value realtime behavior), low-stock amber highlight visual check, and ResultLink's actually-blocked-popup fallback path (code present, not exercised by this session's non-blocking Chromium run).

### Gaps Summary

No gaps. All 5 roadmap success criteria are VERIFIED with direct code evidence and live, independently re-run automated tests (not merely SUMMARY claims). All 7 requirement IDs (DIAG-01..03, PHARM-01..04) are satisfied and wired to real Supabase data — no stubs, no client-side stock mutation outside the atomic RPC, no orphaned artifacts. All 6 code-review findings (2 Critical, 4 Warning) from `03-REVIEW.md` were independently confirmed fixed by reading the current source, not the commit message. The only open items are three human-verification checks (real-time cross-tab propagation, visual amber highlight, and the popup-blocked fallback branch) that cannot be settled by static analysis or a single-session headless e2e run — these do not indicate a defect, only an unexercised/unobserved path, hence `status: human_needed` rather than `gaps_found`.

---

_Verified: 2026-07-11T09:45:00Z_
_Verifier: Claude (gsd-verifier)_
