-- =============================================================================
-- DEV-ONLY SEED DATA — Light Healthcare (Phase 2: Reception & Doctor Flow)
-- =============================================================================
-- This script is applied manually by the orchestrator against the cloud
-- Supabase project (rylceydkrydmpysmibba). It is NOT run automatically by the
-- app, and it must NEVER be pointed at a production database.
--
-- All rows use FIXED uuid literals with `on conflict ... do update` so the
-- script is idempotent and safe to re-run any number of times.
--
-- Data covers every Phase-2 flow:
--   - Reception queue: check-in target (booked), no-show target (past booked),
--     mixed statuses for the status tabs
--   - Doctor today list: checked_in + in_consultation appointments
--   - Consultation: an in-progress visit (no completed_at) plus a completed
--     visit with an order + prescription for cross-visit history
--   - Billing: one completed visit needing billing (no payment) and one
--     completed visit already paid
--   - Prescriptions: 8 medicines for the combobox, one near its low-stock
--     threshold
--
-- Only synthetic names/phones/ABHA ids are used — never real patient PII.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Patients (>= 3)
-- -----------------------------------------------------------------------------
insert into public.patients (id, name, phone, dob, email, address, abha_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'Aarav Sharma', '9876500001', '1990-04-12', 'aarav@example.com', 'Pune', 'ABHA-0001'),
  ('a0000000-0000-0000-0000-000000000002', 'Diya Patel',   '9876500002', '1985-11-30', null,                null,   'ABHA-0002'),
  ('a0000000-0000-0000-0000-000000000003', 'Rohan Mehta',  '9876500003', '2015-06-01', null,                null,   null)
on conflict (id) do update set
  name    = excluded.name,
  phone   = excluded.phone,
  dob     = excluded.dob,
  email   = excluded.email,
  address = excluded.address,
  abha_id = excluded.abha_id;

-- -----------------------------------------------------------------------------
-- 2. Doctor slots today (>= 6) — doctor_id resolved from staff.email
-- -----------------------------------------------------------------------------
with doc as (
  select id from public.staff where email = 'doctor@test.com'
)
insert into public.doctor_slots (id, doctor_id, slot_time, is_booked)
select
  v.id,
  doc.id,
  ((now() at time zone 'Asia/Kolkata')::date + v.slot_at) at time zone 'Asia/Kolkata',
  v.is_booked
from doc, (values
  ('b0000000-0000-0000-0000-000000000001'::uuid, time '09:00', true),
  ('b0000000-0000-0000-0000-000000000002'::uuid, time '10:00', true),
  ('b0000000-0000-0000-0000-000000000003'::uuid, time '11:00', true),
  ('b0000000-0000-0000-0000-000000000004'::uuid, time '11:30', true),
  ('b0000000-0000-0000-0000-000000000005'::uuid, time '12:00', false),
  ('b0000000-0000-0000-0000-000000000006'::uuid, time '14:00', false)
) as v(id, slot_at, is_booked)
on conflict (id) do update set
  is_booked = excluded.is_booked,
  slot_time = excluded.slot_time;

-- -----------------------------------------------------------------------------
-- 3. Appointments today (>= 4, MIXED statuses)
-- -----------------------------------------------------------------------------
with doc as (
  select id from public.staff where email = 'doctor@test.com'
)
insert into public.appointments (id, doctor_id, patient_id, slot_time, status)
select v.id, doc.id, v.patient_id, v.slot_time, v.status
from doc, (values
  -- check-in target
  ('c0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
   ((now() at time zone 'Asia/Kolkata')::date + time '10:00') at time zone 'Asia/Kolkata', 'booked'::appointment_status),
  -- past-slot no-show target
  ('c0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid,
   now() - interval '2 hours', 'booked'::appointment_status),
  -- doctor consult/start target
  ('c0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
   ((now() at time zone 'Asia/Kolkata')::date + time '11:00') at time zone 'Asia/Kolkata', 'checked_in'::appointment_status),
  -- has a visit row (in progress)
  ('c0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid,
   ((now() at time zone 'Asia/Kolkata')::date + time '11:30') at time zone 'Asia/Kolkata', 'in_consultation'::appointment_status),
  -- completed, needs billing
  ('c0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid,
   ((now() at time zone 'Asia/Kolkata')::date + time '09:00') at time zone 'Asia/Kolkata', 'completed'::appointment_status),
  -- completed + paid (billing paid badge)
  ('c0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
   ((now() at time zone 'Asia/Kolkata')::date + time '08:30') at time zone 'Asia/Kolkata', 'completed'::appointment_status)
) as v(id, patient_id, slot_time, status)
on conflict (id) do update set
  status    = excluded.status,
  slot_time = excluded.slot_time;

-- -----------------------------------------------------------------------------
-- 4. Visits
-- -----------------------------------------------------------------------------
with doc as (
  select id from public.staff where email = 'doctor@test.com'
)
insert into public.visits (id, appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, notes, completed_at)
select v.id, v.appointment_id, v.patient_id, doc.id, v.chief_complaint, v.diagnosis, v.notes, v.completed_at
from doc, (values
  -- in progress — no completed_at
  ('d0000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid,
   'Fever and cough', null::text, null::text, null::timestamptz),
  -- completed, needs billing
  ('d0000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000003'::uuid,
   'Headache', 'Viral fever', 'Rest + fluids', now()),
  -- completed + paid
  ('d0000000-0000-0000-0000-000000000006'::uuid, 'c0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid,
   'Follow-up', 'Stable', null::text, now() - interval '30 minutes')
) as v(id, appointment_id, patient_id, chief_complaint, diagnosis, notes, completed_at)
on conflict (id) do update set
  diagnosis    = excluded.diagnosis,
  notes        = excluded.notes,
  completed_at = excluded.completed_at;

-- -----------------------------------------------------------------------------
-- 5. Medicines (>= 8) — last one intentionally near its low-stock threshold
-- -----------------------------------------------------------------------------
insert into public.medicines (id, name, stock_qty, unit, unit_price, low_stock_threshold)
values
  ('e0000000-0000-0000-0000-000000000001', 'Paracetamol 500mg', 120, 'tablet', 2,  20),
  ('e0000000-0000-0000-0000-000000000002', 'Amoxicillin 250mg',  80, 'tablet', 10, 15),
  ('e0000000-0000-0000-0000-000000000003', 'Azithromycin 500mg', 40, 'tablet', 25, 10),
  ('e0000000-0000-0000-0000-000000000004', 'Ibuprofen 400mg',    60, 'tablet', 5,  15),
  ('e0000000-0000-0000-0000-000000000005', 'Cetirizine 10mg',   200, 'tablet', 3,  25),
  ('e0000000-0000-0000-0000-000000000006', 'Omeprazole 20mg',    30, 'tablet', 8,  10),
  ('e0000000-0000-0000-0000-000000000007', 'Metformin 500mg',   150, 'tablet', 4,  20),
  ('e0000000-0000-0000-0000-000000000008', 'Amlodipine 5mg',     15, 'tablet', 6,  20)
on conflict (id) do update set
  stock_qty           = excluded.stock_qty,
  unit                = excluded.unit,
  unit_price          = excluded.unit_price,
  low_stock_threshold = excluded.low_stock_threshold;

-- -----------------------------------------------------------------------------
-- 6. One order + one prescription on the completed visit d0..05
--    (gives the doctor cross-visit history content)
-- -----------------------------------------------------------------------------
insert into public.orders (id, visit_id, patient_id, type, status, instructions, result_url)
values (
  'f0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000003',
  'lab'::order_type, 'completed'::order_status, 'CBC', 'https://example.com/r.pdf'
)
on conflict (id) do update set
  status     = excluded.status,
  result_url = excluded.result_url;

insert into public.prescriptions (id, visit_id, patient_id, medicine_id, dosage, duration, quantity, status)
values (
  'f0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000001',
  '1-0-1', '5 days', 10, 'pending'::prescription_status
)
on conflict (id) do update set
  dosage   = excluded.dosage,
  duration = excluded.duration,
  quantity = excluded.quantity,
  status   = excluded.status;

-- -----------------------------------------------------------------------------
-- 7. One payment on completed visit d0..06 (paid badge). Visit d0..05
--    intentionally has NO payment so it shows as "needs billing".
-- -----------------------------------------------------------------------------
insert into public.payments (id, patient_id, visit_id, amount, method, status)
values (
  '90000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000006',
  500, 'cash', 'paid'::payment_status
)
on conflict (id) do update set
  amount = excluded.amount,
  method = excluded.method,
  status = excluded.status;
