"use client";

/**
 * Doctor consultation view (DOC-02, DOC-03) — header, history tabs, notes
 * form, and the Start/Complete visit lifecycle.
 *
 * D-17/D-18 lifecycle: Start Consultation flips the appointment to
 * in_consultation AND ensures a visits row exists — reusing one already
 * created for this appointment (via `existingVisit`, D-18) rather than
 * inserting a duplicate. Complete Visit requires a non-empty diagnosis
 * (D-29), persists the visit fields + completed_at, flips the appointment
 * to completed, then toasts and redirects to /doctor.
 *
 * Both actions apply optimistically: Start flips the local `status`
 * immediately (rolled back on write failure) so the Complete button appears
 * without waiting on the network round-trip.
 *
 * `ConsultClientProps` / `Medicine` are exported for Plan 07 (orders +
 * prescriptions), which extends this same file — see the marked mount point
 * below.
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, FlaskConical, Pill } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatIST } from "@/lib/format";
import { ageFromDob } from "@/lib/patient";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppointmentStatus, Database } from "@light/shared-types";

type OrderType = Database["public"]["Enums"]["order_type"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type PrescriptionStatus = Database["public"]["Enums"]["prescription_status"];

export type ConsultPatient = {
  id: string;
  name: string;
  phone: string;
  dob: string | null;
  abha_id: string | null;
};

export type ExistingVisit = {
  id: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  completed_at: string | null;
};

export type PastVisit = {
  id: string;
  diagnosis: string | null;
  chief_complaint: string | null;
  completed_at: string | null;
  created_at: string | null;
  appointment_id: string | null;
};

export type PastOrder = {
  id: string;
  type: OrderType;
  status: OrderStatus | null;
  instructions: string | null;
  result_url: string | null;
  ordered_at: string | null;
};

export type PastPrescription = {
  id: string;
  dosage: string | null;
  duration: string | null;
  quantity: number;
  status: PrescriptionStatus | null;
  created_at: string | null;
  medicines: { name: string } | null;
};

/** Exported for Plan 07's medicine combobox. */
export type Medicine = {
  id: string;
  name: string;
  stock_qty: number | null;
  unit: string | null;
};

export type ConsultClientProps = {
  appointmentId: string;
  patient: ConsultPatient | null;
  slotTime: string;
  initialStatus: AppointmentStatus;
  existingVisit: ExistingVisit | null;
  pastVisits: PastVisit[];
  pastOrders: PastOrder[];
  pastPrescriptions: PastPrescription[];
  medicines: Medicine[];
  doctorId: string;
};

export function ConsultClient({
  appointmentId,
  patient,
  slotTime,
  initialStatus,
  existingVisit,
  pastVisits,
  pastOrders,
  pastPrescriptions,
  medicines,
  doctorId,
}: ConsultClientProps) {
  // `medicines` is loaded server-side here for Plan 07's prescription
  // combobox — not yet rendered by this plan; referenced to avoid an
  // unused-prop lint warning until Plan 07 wires it in.
  void medicines;

  const router = useRouter();
  const [status, setStatus] = useState<AppointmentStatus>(initialStatus);
  const [visitId, setVisitId] = useState<string | null>(
    existingVisit?.id ?? null,
  );
  const [complaint, setComplaint] = useState(
    existingVisit?.chief_complaint ?? "",
  );
  const [diagnosis, setDiagnosis] = useState(existingVisit?.diagnosis ?? "");
  const [notes, setNotes] = useState(existingVisit?.notes ?? "");
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const age = ageFromDob(patient?.dob ?? null);
  const ageLabel = age === null ? "N/A" : `${age} yrs`;
  const badge = APPOINTMENT_STATUS_BADGE[status];

  // Start Consultation flips `status` optimistically before its own visit
  // insert resolves, which makes the Complete button appear immediately —
  // so Complete can be clicked (by an eager user, or the e2e spec) *before*
  // Start's insert has committed `visitId` into state. Without
  // deduplication both callers would race past the `if (visitId)` check
  // below and insert two visit rows for the same appointment (violates
  // D-17/D-18 reuse). This ref memoizes the in-flight/settled insert
  // promise so every concurrent caller within the same mount awaits the
  // SAME insert instead of starting its own.
  const visitCreationRef = useRef<Promise<string> | null>(null);

  /** Insert a new visit row for this appointment, or reuse one already set (D-17/D-18). */
  function ensureVisit(supabase: ReturnType<typeof createClient>): Promise<string> {
    if (visitId) return Promise.resolve(visitId);
    if (visitCreationRef.current) return visitCreationRef.current;

    const creation = (async () => {
      const { data, error } = await supabase
        .from("visits")
        .insert({ appointment_id: appointmentId, patient_id: patient?.id ?? "", doctor_id: doctorId })
        .select("id")
        .single();

      if (error || !data) {
        visitCreationRef.current = null; // allow a retry on the next attempt
        throw error ?? new Error("Visit insert failed");
      }
      setVisitId(data.id);
      return data.id;
    })();

    visitCreationRef.current = creation;
    return creation;
  }

  async function handleStart() {
    const previousStatus = status;
    setStatus("in_consultation"); // optimistic (D-17)
    setStarting(true);
    const supabase = createClient();

    try {
      await ensureVisit(supabase);

      const { error: apptError } = await supabase
        .from("appointments")
        .update({ status: "in_consultation" })
        .eq("id", appointmentId);
      if (apptError) throw apptError;

      toast.success("Consultation started");
    } catch {
      setStatus(previousStatus);
      toast.error("Could not start consultation");
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete() {
    const trimmedDiagnosis = diagnosis.trim();
    if (!trimmedDiagnosis) {
      toast.error("Diagnosis is required to complete the visit");
      return;
    }

    setCompleting(true);
    const supabase = createClient();

    try {
      const currentVisitId = await ensureVisit(supabase);

      const { error: visitError } = await supabase
        .from("visits")
        .update({
          chief_complaint: complaint.trim() || null,
          diagnosis: trimmedDiagnosis,
          notes: notes.trim() || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentVisitId);
      if (visitError) throw visitError;

      const { error: apptError } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointmentId);
      if (apptError) throw apptError;

      toast.success("Visit completed");
      router.replace("/doctor");
      router.refresh();
    } catch {
      toast.error("Could not complete the visit");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{patient?.name ?? "—"}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {ageLabel} · {patient?.phone ?? "—"} · ABHA{" "}
              {patient?.abha_id ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Slot</p>
            <p className="font-medium text-slate-900">
              {formatIST(slotTime, "time")}
            </p>
            <Badge className={`mt-1 ${badge.className}`}>{badge.label}</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">Past Visits</TabsTrigger>
          <TabsTrigger value="orders">Past Orders</TabsTrigger>
          <TabsTrigger value="prescriptions">Past Prescriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="visits">
          {pastVisits.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No past visits"
              description="This patient has no prior completed visits."
            />
          ) : (
            <ul className="space-y-2">
              {pastVisits.map((v) => (
                <li
                  key={v.id}
                  className="rounded-md border border-slate-200 p-3 text-sm"
                >
                  <p className="font-medium text-slate-900">
                    {formatIST(v.completed_at ?? v.created_at ?? "", "date")}
                  </p>
                  <p className="text-slate-600">
                    Complaint: {v.chief_complaint ?? "—"}
                  </p>
                  <p className="text-slate-600">
                    Diagnosis: {v.diagnosis ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {pastOrders.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No past orders"
              description="Test orders for this patient will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {pastOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3 text-sm"
                >
                  <span className="font-medium uppercase text-slate-900">
                    {o.type}
                  </span>
                  <span className="text-slate-500">{o.status ?? "—"}</span>
                  {o.instructions ? (
                    <span className="text-slate-600">{o.instructions}</span>
                  ) : null}
                  {o.result_url ? (
                    <a
                      href={o.result_url}
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
        </TabsContent>

        <TabsContent value="prescriptions">
          {pastPrescriptions.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No past prescriptions"
              description="Medicines prescribed to this patient will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {pastPrescriptions.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3 text-sm"
                >
                  <span className="font-medium text-slate-900">
                    {p.medicines?.name ?? "—"}
                  </span>
                  <span className="text-slate-600">{p.dosage ?? "—"}</span>
                  <span className="text-slate-600">{p.duration ?? "—"}</span>
                  <span className="text-slate-500">Qty {p.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="complaint">Chief Complaint</Label>
            <Input
              id="complaint"
              data-testid="consult-complaint"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              data-testid="consult-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              data-testid="consult-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {status === "in_consultation" ? (
            <div className="space-y-4">{/* orders + prescriptions: Plan 07 */}</div>
          ) : null}

          <div className="flex justify-end gap-3">
            {status === "checked_in" ? (
              <Button
                type="button"
                data-testid="start-consultation-btn"
                disabled={starting}
                onClick={() => void handleStart()}
              >
                {starting ? "Starting…" : "Start Consultation"}
              </Button>
            ) : null}
            {status === "in_consultation" ? (
              <Button
                type="button"
                data-testid="complete-visit-btn"
                disabled={completing}
                onClick={() => void handleComplete()}
              >
                {completing ? "Completing…" : "Complete Visit"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
