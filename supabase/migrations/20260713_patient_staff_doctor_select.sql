-- APPLIED to cloud project rylceydkrydmpysmibba on 2026-07-13 (via MCP,
-- orchestrator-reviewed). Verified: patient token sees ONLY doctor staff
-- rows and the medicine catalog; other staff roles remain hidden.
-- Written by the 04-03 executor (Rule-4 style deviation: RLS/security
-- change is out of this plan's apps/mobile-only file scope and requires
-- service-role/dashboard access the executor does not hold in-sandbox).
--
-- Finding (live-verified via REST as the seeded patient@test.com token,
-- 2026-07-13): every patient-facing doctor-name lookup
-- (`doctors!...(staff:staff!doctors_id_fkey(name))`) used by the Home tab
-- (04-02), Booking wizard (04-02), and Appointments tab (04-03) returns
-- `staff: null` for a patient session. Root cause: `staff_staff_select`
-- (20260710_fix_rls_helper_recursion.sql) only grants SELECT on `staff`
-- when `current_staff_role() is not null` — a patient session has no
-- staff row, so `current_staff_role()` is null and RLS denies the read
-- entirely. The app's `?? "Doctor"` fallback masks this as a generic
-- label instead of the real doctor name; no crash, no error surfaced.
--
-- Fix: grant patients least-privilege read access to staff rows that are
-- DOCTORS only (role = 'doctor') — patients need a doctor's name to book
-- and to review their own appointments/reports, but should not see
-- reception/lab_tech/pharmacist/admin staff names, which is UNRELATED but
-- would over-disclose if the read were broadened to all roles.
create policy staff_patient_doctor_select on public.staff
  for select
  using (
    role = 'doctor'
    and public.current_patient_id() is not null
  );

-- Second finding, same session, same root cause shape: `medicines` has NO
-- patient-select policy either (live-verified: GET /rest/v1/medicines as
-- the patient token returns 200 with an empty array, same silent-null
-- pattern as staff above), so the Reports tab's
-- `prescriptions(...,medicine:medicines(name))` embed (MOB-04, 04-03) will
-- never resolve a medicine name for a patient session — the app's
-- `?? "Medicine"` fallback again masks this instead of erroring. Medicine
-- names carry no more sensitivity than a department/doctor name (already
-- publicly selectable), so this grants any signed-in patient read access,
-- mirroring the departments_public_select precedent rather than restricting
-- further.
create policy medicines_patient_select on public.medicines
  for select
  using (public.current_patient_id() is not null);
