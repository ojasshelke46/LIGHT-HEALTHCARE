"use client";

/**
 * Doctor's live "today" list (DOC-01, D-26).
 *
 * Scoped strictly to the signed-in doctor's own id — passed down from the
 * server component in page.tsx (getStaff(), never client-controllable
 * input, per T-02-14) — filtered to today (IST) and status in
 * (checked_in, in_consultation), ordered by slot_time.
 *
 * Watches BOTH `appointments` and `visits` tables: a new visit row (created
 * when a doctor starts a consultation) carries the chief_complaint this list
 * displays, so it must trigger a refetch too, not just appointment changes.
 */

import { useCallback, useMemo } from "react";
import { Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime";
import { todayISTRange } from "@/lib/time";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PatientCard } from "./patient-card";
import type { AppointmentStatus } from "@light/shared-types";

export type TodayRow = {
  id: string;
  slot_time: string;
  status: AppointmentStatus | null;
  patient_id: string;
  patients: { name: string; dob: string | null; phone: string } | null;
  visits: { chief_complaint: string | null }[];
};

export function DoctorToday({ staffId }: { staffId: string }) {
  // Computed once — the list is scoped to "today" for the page's lifetime.
  const { startISO, endISO } = useMemo(() => todayISTRange(), []);

  const fetcher = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, slot_time, status, patient_id, patients(name, dob, phone), visits(chief_complaint)",
      )
      .eq("doctor_id", staffId)
      .gte("slot_time", startISO)
      .lt("slot_time", endISO)
      .in("status", ["checked_in", "in_consultation"])
      .order("slot_time", { ascending: true });

    // Cast: PostgREST's TS overload resolution for multi-column, nested
    // .select() strings collapses to a generic-error shape here, mirroring
    // the workaround already used in src/lib/staff.ts / queue-client.tsx.
    return { data: data as TodayRow[] | null, error };
  }, [staffId, startISO, endISO]);

  const { data, loading, error, refetch, connected } = useRealtimeList<TodayRow>(
    fetcher,
    ["appointments", "visits"],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          Today&apos;s Patients
        </h1>
        <span
          aria-live="polite"
          className="text-xs font-medium text-slate-500"
        >
          {connected ? "● Live" : "Reconnecting…"}
        </span>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading today's patients"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p role="alert">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={refetch}
          >
            Retry
          </Button>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No patients checked in yet"
          description="Checked-in and in-consultation patients for today will appear here live."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((row) => (
            <PatientCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
