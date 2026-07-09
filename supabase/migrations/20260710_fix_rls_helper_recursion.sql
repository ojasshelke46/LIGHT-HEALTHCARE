-- Applied to cloud project rylceydkrydmpysmibba on 2026-07-10 (via MCP).
-- Local record for reproducibility.

-- 1) RLS helper functions must be SECURITY DEFINER to break policy recursion:
--    policies on staff call current_staff_role(), which reads staff, which
--    would re-evaluate the same policy (Postgres 54001 stack depth exceeded).
--    SECURITY DEFINER runs as the function owner, skipping RLS inside the
--    helper. Safe: each function only returns the CALLER's own row fields.

create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from staff where auth_user_id = auth.uid()
$$;

create or replace function public.current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where auth_user_id = auth.uid()
$$;

create or replace function public.current_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from patients where auth_user_id = auth.uid()
$$;

-- 2) Any authenticated staff member may read staff rows (doctor/colleague
--    names across portals). Writes remain admin-only.
create policy staff_staff_select on public.staff
  for select
  using (current_staff_role() is not null);

-- 3) Realtime publication (applied earlier same session):
-- alter publication supabase_realtime add table public.appointments;
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.prescriptions;
-- alter publication supabase_realtime add table public.medicines;
