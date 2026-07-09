import { getStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { DoctorPatientsClient, type SeenPatient } from "./patients-client";

/**
 * Doctor's all-patients browser (DOC-05, D-30). Server component — reads
 * the signed-in doctor's own staff id via getStaff() (server-verified,
 * never client input) and loads every distinct patient from THIS doctor's
 * own visits (own patients only, per T-02-22).
 *
 * Dedupe strategy: the query is ordered newest-visit-first, so keeping the
 * FIRST occurrence of each patient_id in JS yields that patient's latest
 * visit date "for free" without a second query.
 */

type VisitPatientRow = {
  patient_id: string;
  created_at: string | null;
  patients: {
    id: string;
    name: string;
    phone: string;
    dob: string | null;
  } | null;
};

export default async function DoctorPatientsPage() {
  const staff = await getStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("visits")
    .select("patient_id, created_at, patients(id, name, phone, dob)")
    .eq("doctor_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(500);

  // Cast: PostgREST's TS overload resolution for multi-column, nested
  // .select() strings collapses to a generic-error shape here, mirroring
  // the workaround already used in src/lib/staff.ts / doctor-today.tsx.
  const rows = (data as VisitPatientRow[] | null) ?? [];

  const seen = new Set<string>();
  const seenPatients: SeenPatient[] = [];
  for (const row of rows) {
    if (!row.patients || seen.has(row.patient_id)) continue;
    seen.add(row.patient_id);
    seenPatients.push({
      id: row.patients.id,
      name: row.patients.name,
      phone: row.patients.phone,
      dob: row.patients.dob,
      lastVisit: row.created_at ?? "",
    });
  }

  return <DoctorPatientsClient patients={seenPatients} />;
}
