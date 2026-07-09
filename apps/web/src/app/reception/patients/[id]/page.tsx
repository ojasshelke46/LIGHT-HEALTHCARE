/**
 * Patient detail (RECEP-04, D-24) — read-only server component.
 *
 * Loads the patient plus appointment + visit history in parallel; renders
 * a "Patient not found" empty state when the id doesn't resolve.
 */

import { Calendar, ClipboardList, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatIST } from "@/lib/format";
import { ageFromDob } from "@/lib/patient";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppointmentStatus } from "@light/shared-types";

type PatientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  abha_id: string | null;
  dob: string | null;
};

type AppointmentRow = {
  id: string;
  slot_time: string;
  status: AppointmentStatus | null;
  doctors: { staff: { name: string } | null } | null;
};

type VisitRow = {
  id: string;
  diagnosis: string | null;
  chief_complaint: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [patientResult, appointmentsResult, visitsResult] = await Promise.all([
    supabase
      .from("patients")
      .select("id, name, phone, email, address, abha_id, dob")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id, slot_time, status, doctors(staff(name))")
      .eq("patient_id", id)
      .order("slot_time", { ascending: false })
      .limit(50),
    supabase
      .from("visits")
      .select("id, diagnosis, chief_complaint, completed_at, created_at")
      .eq("patient_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const patient = patientResult.data as PatientRow | null;
  const appointments = (appointmentsResult.data as AppointmentRow[] | null) ?? [];
  const visits = (visitsResult.data as VisitRow[] | null) ?? [];

  if (!patient) {
    return (
      <EmptyState
        icon={UserRound}
        title="Patient not found"
        description="This patient record doesn't exist or was removed."
      />
    );
  }

  const age = ageFromDob(patient.dob);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{patient.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-slate-500">Phone</p>
            <p className="font-medium text-slate-900">{patient.phone}</p>
          </div>
          <div>
            <p className="text-slate-500">Email</p>
            <p className="font-medium text-slate-900">{patient.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Address</p>
            <p className="font-medium text-slate-900">{patient.address ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">ABHA ID</p>
            <p className="font-medium text-slate-900">{patient.abha_id ?? "—"}</p>
          </div>
          <div>
            <p className="text-slate-500">Date of birth</p>
            <p className="font-medium text-slate-900">
              {patient.dob ? formatIST(patient.dob, "date") : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Age</p>
            <p className="font-medium text-slate-900">{age ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment history</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments yet"
              description="This patient has no appointment history."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const badge = appt.status
                    ? APPOINTMENT_STATUS_BADGE[appt.status]
                    : null;
                  return (
                    <TableRow key={appt.id}>
                      <TableCell>{formatIST(appt.slot_time, "datetime")}</TableCell>
                      <TableCell>{appt.doctors?.staff?.name ?? "—"}</TableCell>
                      <TableCell>
                        {badge ? (
                          <Badge className={badge.className}>{badge.label}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit history</CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No visits yet"
              description="This patient has no completed visit history."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Chief complaint</TableHead>
                  <TableHead>Diagnosis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell>
                      {formatIST(visit.completed_at ?? visit.created_at ?? "", "date")}
                    </TableCell>
                    <TableCell>{visit.chief_complaint ?? "—"}</TableCell>
                    <TableCell>{visit.diagnosis ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
