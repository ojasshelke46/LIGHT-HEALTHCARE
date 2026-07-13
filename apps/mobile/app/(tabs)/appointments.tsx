/**
 * Appointments tab (MOB-03, D-52): the patient's own appointments,
 * upcoming-first, with status badges. Tapping a card opens a detail modal
 * with a per-appointment QR (T-04-05 belt-and-suspenders read only — RLS is
 * the enforcement boundary, the `.eq("patient_id", ...)` filter is
 * defensive).
 *
 * Ordering (D-52): split into upcoming (slot_time >= now) sorted ascending
 * and past (slot_time < now) sorted descending, then concatenate — a single
 * ordered PostgREST query cannot express "upcoming asc then past desc", so
 * the split happens client-side after one fetch ordered by slot_time.
 *
 * Refetches on mount + screen focus (D-53 focus-refetch, no realtime).
 */

import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { AppointmentStatus } from "@light/shared-types";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AppointmentCard } from "@/components/AppointmentCard";
import {
  AppointmentDetailModal,
  type AppointmentDetail,
} from "@/components/AppointmentDetailModal";
import { EmptyState, ErrorState, Screen, Skeleton } from "@/components/ui";

type AppointmentRow = {
  id: string;
  slot_time: string;
  status: AppointmentStatus | null;
  qr_code: string | null;
  doctor: {
    specialization: string | null;
    staff: { name: string } | null;
    department: { name: string } | null;
  } | null;
};

export default function AppointmentsScreen() {
  const { patient } = useSession();
  const patientId = patient?.id ?? null;

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!patientId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("appointments")
      .select(
        "id, slot_time, status, qr_code, doctor:doctors!appointments_doctor_id_fkey(specialization, staff:staff!doctors_id_fkey(name), department:departments!doctors_department_id_fkey(name))",
      )
      .eq("patient_id", patientId)
      .order("slot_time", { ascending: true });

    if (fetchError) {
      setError("Couldn't load your appointments.");
    } else {
      // Fetcher-cast pattern (see web pending-client.tsx / mobile index.tsx):
      // nested embed select strings collapse PostgREST's TS inference.
      setRows((data as AppointmentRow[] | null) ?? []);
    }
    setLoading(false);
  }, [patientId]);

  // Fires on mount AND every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      void fetchAppointments();
    }, [fetchAppointments]),
  );

  const retry = useCallback(() => {
    setLoading(true);
    void fetchAppointments();
  }, [fetchAppointments]);

  const ordered = useMemo(() => {
    const now = new Date().getTime();
    const upcoming = rows.filter(
      (r) => new Date(r.slot_time).getTime() >= now,
    );
    const past = rows
      .filter((r) => new Date(r.slot_time).getTime() < now)
      .sort(
        (a, b) => new Date(b.slot_time).getTime() - new Date(a.slot_time).getTime(),
      );
    return [...upcoming, ...past];
  }, [rows]);

  const detail: AppointmentDetail | null = selected
    ? {
        id: selected.id,
        slot_time: selected.slot_time,
        status: selected.status,
        doctorName: selected.doctor?.staff?.name ?? "Doctor",
        deptName: selected.doctor?.department?.name ?? "—",
      }
    : null;

  return (
    <Screen>
      <Text className="mb-4 text-2xl font-bold text-slate-900">
        Appointments
      </Text>

      {loading ? (
        <View className="gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : ordered.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          hint="Book one from the Book tab."
        />
      ) : (
        <ScrollView
          contentContainerClassName="gap-2 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {ordered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              doctorName={appt.doctor?.staff?.name ?? "Doctor"}
              deptName={appt.doctor?.department?.name ?? "—"}
              slotTimeISO={appt.slot_time}
              status={appt.status ?? "booked"}
              onPress={() => setSelected(appt)}
            />
          ))}
        </ScrollView>
      )}

      <AppointmentDetailModal
        appointment={detail}
        visible={!!detail}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}
