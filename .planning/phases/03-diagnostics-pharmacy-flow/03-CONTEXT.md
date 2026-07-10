# Phase 3: Diagnostics & Pharmacy Flow - Context

**Gathered:** 2026-07-10 (auto mode, single pass)
**Status:** Ready for planning

<domain>
## Phase Boundary

Lab techs accept ordered tests, upload result files to Storage, add notes, complete orders, and browse completed work. Pharmacists dispense pending prescriptions atomically via the dispense_medicine RPC, manage inventory, and browse dispensed history. Requirements DIAG-01..03, PHARM-01..04. No mobile (Phase 4), no AI (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Diagnostics portal (D-32..D-36)
- **D-32:** Nav (ROLE_THEME lab_tech): Pending(/diagnostics), In Progress(/diagnostics/in-progress), Completed(/diagnostics/completed). Icons: FlaskConical, Loader, CheckCircle2 (executor discretion).
- **D-33:** Pending page: `useRealtimeList` on `orders` filtered status=ordered, joins patients(name) + visits(doctors(staff(name))). Type icon map: lab=FlaskConical, ct=ScanLine, mri=Magnet, xray=ImageIcon. Accept button → status=in_progress (optimistic + rollback + toast).
- **D-34:** In-progress page: orders status=in_progress. Per-row: file input (accept image/*,application/pdf, max 20MB client-check), upload to Storage bucket `scan-results` at path `orders/{orderId}/{timestamp}-{sanitized-filename}`; store the STORAGE PATH (not public URL) in orders.result_url; result notes textarea → orders.result_notes; Mark Complete → status=completed + completed_at=now(). Complete allowed without file (some tests are notes-only) but confirm via toast warning styling? — no, keep simple: Complete requires notes OR file, zod-checked.
- **D-35:** Result viewing (all portals incl. doctor history tabs): helper `getResultUrl(pathOrUrl)` in `src/lib/results.ts` — if value starts with http(s) use as-is (legacy seed), else `supabase.storage.from("scan-results").createSignedUrl(path, 3600)`. Client-side on demand (View result button), NOT precomputed lists.
- **D-36:** Completed page: server component + client filters — date range (from/to date inputs, IST day bounds) and type select filter applied server-side via query params; View result via D-35 helper.

### Pharmacy portal (D-37..D-41)
- **D-37:** Nav (ROLE_THEME pharmacist): Pending(/pharmacy), Inventory(/pharmacy/inventory), Dispensed(/pharmacy/dispensed).
- **D-38:** Pending page: `useRealtimeList` on `prescriptions` status=pending + medicines(name, stock_qty) + patients(name) + visits(doctors(staff(name))). Also watch `medicines` table for stock changes. Stock indicator: red "Insufficient stock (have N)" when stock_qty < quantity; amber "Low stock" when stock_qty <= low_stock_threshold.
- **D-39:** Dispense button → `supabase.rpc("dispense_medicine", { p_prescription_id, p_quantity })` — NO client-side stock mutation; RPC is atomic (already deployed). Error "Insufficient stock" → destructive toast with exact message; success → toast + refetch. Button disabled while pending and when stock < quantity (server still guards).
- **D-40:** Inventory page: full medicines table (name, stock, unit, price, threshold); low-stock rows sorted first + amber highlight; inline stock edit (click stock cell → number input → save on blur/Enter via .update); Add-medicine Sheet (zod: name required, stock int ≥0, price ≥0 max 2dp, threshold int ≥0, unit default 'tablet').
- **D-41:** Dispensed page: prescriptions status=dispensed ordered dispensed_at DESC, date-range filter (same pattern as D-36), shows medicine, patient, qty, dispensed_at IST.

### Cross-cutting
- **D-42:** RPC types: dispense_medicine already in generated Database types (Functions). Use typed `.rpc()` — no casts.
- **D-43:** e2e: one diagnostics spec (accept → upload tiny fixture PNG → complete → completed page shows row + signed-url View works) + one pharmacy spec (dispense seeded pending rx f0..02 → status flips, stock decrements 120→110; spec then RESTORES state: sets rx back to pending + stock back via direct client updates as pharmacist... pharmacist can update medicines (medicines_pharmacist_all) and prescriptions (prescriptions_pharmacist_all) → self-resetting spec, per deferred-items lesson).
- **D-44:** Logins seeded and verified by orchestrator: lab@test.com / pharmacist@test.com (Test1234!). Storage bucket scan-results EXISTS (private) with lab-insert/authenticated-select policies. visits readable by lab_tech+pharmacist (new policy). Do NOT plan migrations for these.

### Claude's Discretion
Empty-state copy, exact fixture file, upload progress UI, filter UX details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1-2 foundation (REUSE)
- `apps/web/src/lib/hooks/use-realtime.ts` — useRealtimeList (multi-table watch supported? read the signature — if single-table, extend, don't fork)
- `apps/web/src/lib/theme.ts` — ROLE_THEME nav arrays (extend lab_tech + pharmacist entries)
- `apps/web/src/lib/{status,format,time,patient,search}.ts` — helpers (add ORDER_STATUS_BADGE etc. to status.ts)
- `apps/web/src/app/reception/queue-{client,row}.tsx` — realtime list page pattern
- `apps/web/src/app/reception/billing/*` — Sheet-form + needs-X list pattern
- `apps/web/src/components/ui/*`, `empty-state/portal-loading/portal-error`

### Types & backend
- `packages/shared-types/src/database.types.ts` — orders/prescriptions/medicines types + dispense_medicine Function
- `supabase/seed-dev.sql` — seeded order f0..01 (completed lab, legacy http result_url) + prescription f0..02 (pending, Paracetamol e0..01, qty 10, stock 120)
- `supabase/migrations/20260710_fix_rls_helper_recursion.sql` — RLS conventions

### Project docs
- `.planning/REQUIREMENTS.md` — DIAG-01..03, PHARM-01..04
- `.planning/phases/02-reception-doctor-flow/deferred-items.md` — seed-drift lesson → self-resetting specs (D-43)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Full Phase 1-2 component/helper stack; e2e scaffold with 10 green specs
- dispense_medicine RPC deployed with row lock + double-dispense guard
- Seeded: 8 medicines, 1 pending prescription (f0..02), 1 completed order (f0..01)

### Established Patterns
- page.tsx (server, getStaff) + feature-client.tsx (use client, useRealtimeList) + row/form components
- Optimistic update + rollback + sonner; zod on all forms; formatIST everywhere
- PostgREST nested-select cast pattern documented in doctor pages

### Integration Points
- Doctor consult history tab "Past Orders" links result_url directly today — D-35 helper must be adopted there too (small refactor, include in a plan)
- ROLE_THEME nav arrays for lab_tech/pharmacist currently placeholder — D-32/D-37 replace them

</code_context>

<specifics>
## Specific Ideas

Brief mandates: type icons per order type, atomic RPC dispense (never client-side decrement), low-stock highlight at top of inventory, date-range + type filters on completed/dispensed.

</specifics>

<deferred>
## Deferred Ideas

- Barcode scanning for dispensing — backlog
- Result file previews inline (DICOM viewer) — backlog; v1 opens signed URL in new tab

</deferred>

---

*Phase: 3-Diagnostics & Pharmacy Flow*
*Context gathered: 2026-07-10*
