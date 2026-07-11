/**
 * Home tab (MOB-01, D-50): greeting + next-upcoming-appointment card +
 * quick actions to Book / Reports.
 *
 * Refetches on screen focus (D-53 focus-refetch, no realtime). The
 * appointments read is RLS-scoped to the signed-in patient; the explicit
 * patient_id filter is a defensive belt-and-suspenders on top of RLS
 * (T-04-06), never the enforcement boundary.
 *
 * Local row type + cast mirrors the web's established fetcher-cast pattern
 * (PostgREST's TS overload resolution for multi-column nested .select()
 * strings collapses to a generic-error shape).
 */

import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { AppointmentStatus } from "@light/shared-types";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { AppointmentCard } from "@/components/AppointmentCard";
import { EmptyState, ErrorState, Screen, Skeleton } from "@/components/ui";

type NextAppointment = {
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

export default function HomeScreen() {
  const { patient } = useSession();
  const patientId = patient?.id ?? null;

  const [next, setNext] = useState<NextAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNext = useCallback(async () => {
    if (!patientId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("appointments")
      .select(
        "id, slot_time, status, qr_code, doctor:doctors!appointments_doctor_id_fkey(specialization, staff:staff!doctors_id_fkey(name), department:departments!doctors_department_id_fkey(name))",
      )
      .eq("patient_id", patientId)
      .gte("slot_time", new Date().toISOString())
      .in("status", ["booked", "checked_in"])
      .order("slot_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError("Couldn't load your next appointment.");
    } else {
      setNext((data as NextAppointment | null) ?? null);
    }
    setLoading(false);
  }, [patientId]);

  // Fires on mount AND every time the tab regains focus (silent refetch —
  // no skeleton flash on refocus, only on first load / manual retry).
  useFocusEffect(
    useCallback(() => {
      void fetchNext();
    }, [fetchNext]),
  );

  const retry = useCallback(() => {
    setLoading(true);
    void fetchNext();
  }, [fetchNext]);

  const firstName = patient?.name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-slate-900">
          Hi, {firstName}
        </Text>
        <Text className="mt-0.5 text-sm text-slate-500">
          Welcome to Light Healthcare
        </Text>

        <Text className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Next appointment
        </Text>

        {loading ? (
          <View className="gap-2">
            <Skeleton className="h-24 w-full" />
          </View>
        ) : error ? (
          <View className="rounded-xl border border-slate-200 py-2">
            <ErrorState message={error} onRetry={retry} />
          </View>
        ) : !next ? (
          <View className="rounded-xl border border-dashed border-slate-300 py-2">
            <EmptyState
              title="No upcoming appointments"
              hint="Book one from the quick actions below."
            />
          </View>
        ) : (
          <AppointmentCard
            doctorName={next.doctor?.staff?.name ?? "Doctor"}
            deptName={next.doctor?.department?.name ?? "—"}
            slotTimeISO={next.slot_time}
            status={next.status ?? "booked"}
          />
        )}

        <Text className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quick actions
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Book an appointment"
            onPress={() => router.push("/(tabs)/book")}
            className="flex-1 items-center rounded-xl border border-slate-200 bg-teal-50 px-4 py-5 active:bg-teal-100"
          >
            <Ionicons name="add-circle-outline" size={28} color="#0d9488" />
            <Text className="mt-2 text-sm font-semibold text-teal-800">
              Book appointment
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View reports"
            onPress={() => router.push("/(tabs)/reports")}
            className="flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 active:bg-slate-100"
          >
            <Ionicons name="document-text-outline" size={28} color="#334155" />
            <Text className="mt-2 text-sm font-semibold text-slate-700">
              View reports
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
