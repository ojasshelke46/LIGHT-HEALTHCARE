/**
 * Doctor cross-visit patient history (DOC-05, D-30) — read-only server
 * component.
 *
 * Loads the patient plus the FULL visit history in one nested query so
 * orders + prescriptions arrive already grouped by visit — no client-side
 * joining needed. If the query returns an RLS/permission error, this
 * renders an error state and stops rather than silently working around it
 * (phase rule, T-02-23).
 */

import { ClipboardList, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/staff";
import { formatIST } from "@/lib/format";
import { ageFromDob } from "@/lib/patient";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@light/shared-types";

type OrderType = Database["public"]["Enums"]["order_type"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type PrescriptionStatus = Database["public"]["Enums"]["prescription_status"];

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  dob: string | null;
  abha_id: string | null;
};

type OrderRow = {
  id: string;
  type: OrderType;
  status: OrderStatus | null;
  instructions: string | null;
  result_url: string | null;
};

type PrescriptionRow = {
  id: string;
  dosage: string | null;
  duration: string | null;
  quantity: number;
  status: PrescriptionStatus | null;
  medicines: { name: string } | null;
};

type VisitHistory = {
  id: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string | null;
  orders: OrderRow[];
  prescriptions: PrescriptionRow[];
};

export default async function DoctorPatientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const staff = await getStaff();

  // IDOR guard (T-02-23): a doctor may only open patients they have actually
  // treated — require at least one of THIS doctor's visits for the patient
  // before any PII is fetched.
  const ownershipResult = await supabase
    .from("visits")
    .select("id")
    .eq("patient_id", id)
    .eq("doctor_id", staff.id)
    .limit(1);

  if (ownershipResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p role="alert">{ownershipResult.error.message}</p>
      </div>
    );
  }

  if ((ownershipResult.data ?? []).length === 0) {
    return (
      <EmptyState
        icon={UserRound}
        title="Patient not found"
        description="This patient record doesn't exist or was removed."
      />
    );
  }

  const patientResult = await supabase
    .from("patients")
    .select("id, name, phone, dob, abha_id")
    .eq("id", id)
    .maybeSingle();

  if (patientResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p role="alert">{patientResult.error.message}</p>
      </div>
    );
  }

  const patient = patientResult.data as PatientRow | null;

  if (!patient) {
    return (
      <EmptyState
        icon={UserRound}
        title="Patient not found"
        description="This patient record doesn't exist or was removed."
      />
    );
  }

  const visitsResult = await supabase
    .from("visits")
    .select(
      "id, chief_complaint, diagnosis, notes, completed_at, created_at, orders(id, type, status, instructions, result_url), prescriptions(id, dosage, duration, quantity, status, medicines(name))",
    )
    .eq("patient_id", id)
    .eq("doctor_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (visitsResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p role="alert">{visitsResult.error.message}</p>
      </div>
    );
  }

  // Cast: PostgREST's TS overload resolution for multi-column, nested
  // .select() strings collapses to a generic-error shape here, mirroring
  // the workaround already used in src/lib/staff.ts / doctor-today.tsx.
  const visits = (visitsResult.data as VisitHistory[] | null) ?? [];
  const age = ageFromDob(patient.dob);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{patient.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-slate-500">Age</p>
            <p className="font-medium text-slate-900">{age ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Phone</p>
            <p className="font-medium text-slate-900">{patient.phone}</p>
          </div>
          <div>
            <p className="text-slate-500">ABHA ID</p>
            <p className="font-medium text-slate-900">{patient.abha_id ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {visits.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No visits recorded for this patient"
          description="Once a visit is completed with this patient, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => {
            const isCompleted = Boolean(visit.completed_at);
            return (
              <Card key={visit.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">
                    {formatIST(visit.completed_at ?? visit.created_at ?? "", "date")}
                  </CardTitle>
                  <Badge
                    className={
                      isCompleted
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {isCompleted ? "Completed" : "In progress"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-slate-500">Complaint</p>
                      <p className="font-medium text-slate-900">
                        {visit.chief_complaint ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Diagnosis</p>
                      <p className="font-medium text-slate-900">
                        {visit.diagnosis ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Notes</p>
                      <p className="font-medium text-slate-900">
                        {visit.notes ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 font-medium text-slate-700">Orders</p>
                    {visit.orders.length === 0 ? (
                      <p className="text-slate-500">No tests ordered</p>
                    ) : (
                      <ul className="space-y-1">
                        {visit.orders.map((order) => (
                          <li
                            key={order.id}
                            className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2"
                          >
                            <span className="font-medium uppercase text-slate-900">
                              {order.type}
                            </span>
                            <span className="text-slate-500">
                              {order.status ?? "—"}
                            </span>
                            {order.instructions ? (
                              <span className="text-slate-600">
                                {order.instructions}
                              </span>
                            ) : null}
                            {order.result_url ? (
                              <a
                                href={order.result_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View result
                              </a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 font-medium text-slate-700">Prescriptions</p>
                    {visit.prescriptions.length === 0 ? (
                      <p className="text-slate-500">No prescriptions</p>
                    ) : (
                      <ul className="space-y-1">
                        {visit.prescriptions.map((rx) => (
                          <li
                            key={rx.id}
                            className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2"
                          >
                            <span className="font-medium text-slate-900">
                              {rx.medicines?.name ?? "—"}
                            </span>
                            <span className="text-slate-600">
                              {rx.dosage ?? "—"}
                            </span>
                            <span className="text-slate-600">
                              {rx.duration ?? "—"}
                            </span>
                            <span className="text-slate-500">Qty {rx.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
