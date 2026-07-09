/**
 * Doctor consultation view — server load (DOC-02).
 *
 * Loads the appointment + patient, any existing visit row for this
 * appointment (D-18 reuse: queried by appointment_id before the client ever
 * inserts one), the patient's full history (visits/orders/prescriptions),
 * and the medicines list (for Plan 07's prescription combobox), then hands
 * everything to the client consult view.
 *
 * IDOR defense-in-depth (T-02-16): RLS already scopes appointment reads to
 * the signed-in doctor's own rows, but this also explicitly checks
 * `doctor_id === staff.id` after load and renders not-found on mismatch,
 * rather than relying solely on RLS.
 */

import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { EmptyState } from "@/components/empty-state";
import { ConsultClient } from "./consult-client";
import type {
  ConsultPatient,
  ExistingVisit,
  PastOrder,
  PastPrescription,
  PastVisit,
  Medicine,
} from "./consult-client";
import type { Database } from "@light/shared-types";

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

type AppointmentRow = {
  id: string;
  slot_time: string;
  status: AppointmentStatus | null;
  patient_id: string;
  doctor_id: string;
  patients: ConsultPatient | null;
};

export default async function ConsultPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const supabase = await createClient();
  const staff = await getStaff();

  const appointmentResult = await supabase
    .from("appointments")
    .select(
      "id, slot_time, status, patient_id, doctor_id, patients(id, name, phone, dob, abha_id)",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p role="alert">{appointmentResult.error.message}</p>
      </div>
    );
  }

  // Cast: PostgREST's TS overload resolution for multi-column, nested
  // .select() strings collapses to a generic-error shape here, mirroring
  // the workaround already used in src/lib/staff.ts / doctor-today.tsx.
  const appointment = appointmentResult.data as AppointmentRow | null;

  if (!appointment || appointment.doctor_id !== staff.id) {
    return (
      <EmptyState
        icon={UserRound}
        title="Appointment not found"
        description="This appointment doesn't exist or you don't have access to it."
      />
    );
  }

  const patientId = appointment.patient_id;

  const [
    existingVisitResult,
    pastVisitsResult,
    pastOrdersResult,
    pastPrescriptionsResult,
    medicinesResult,
  ] = await Promise.all([
    supabase
      .from("visits")
      .select("id, chief_complaint, diagnosis, notes, completed_at")
      .eq("appointment_id", appointmentId)
      .maybeSingle(),
    supabase
      .from("visits")
      .select(
        "id, diagnosis, chief_complaint, completed_at, created_at, appointment_id",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("orders")
      .select("id, type, status, instructions, result_url, ordered_at")
      .eq("patient_id", patientId)
      .order("ordered_at", { ascending: false })
      .limit(20),
    supabase
      .from("prescriptions")
      .select(
        "id, dosage, duration, quantity, status, created_at, medicines(name)",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("medicines")
      .select("id, name, stock_qty, unit")
      .order("name")
      .limit(500),
  ]);

  const existingVisit = existingVisitResult.data as ExistingVisit | null;
  const pastVisitsAll = (pastVisitsResult.data as PastVisit[] | null) ?? [];
  const pastOrders = (pastOrdersResult.data as PastOrder[] | null) ?? [];
  const pastPrescriptions =
    (pastPrescriptionsResult.data as PastPrescription[] | null) ?? [];
  const medicines = (medicinesResult.data as Medicine[] | null) ?? [];

  // Exclude this appointment's own (current) visit from "past visits".
  const pastVisits = pastVisitsAll.filter(
    (v) => v.appointment_id !== appointmentId,
  );

  return (
    <ConsultClient
      appointmentId={appointment.id}
      patient={appointment.patients}
      slotTime={appointment.slot_time}
      initialStatus={appointment.status ?? "checked_in"}
      existingVisit={existingVisit}
      pastVisits={pastVisits}
      pastOrders={pastOrders}
      pastPrescriptions={pastPrescriptions}
      medicines={medicines}
      doctorId={staff.id}
    />
  );
}
