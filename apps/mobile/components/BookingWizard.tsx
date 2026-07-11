/**
 * Booking wizard (MOB-02, D-51): single-component staged state machine —
 * dept -> doctor -> slot -> confirm -> success — held in useState, no
 * navigation between stages.
 *
 * Lists are FlatLists so the flow scales to 15-20+ departments and many
 * doctors per department (super-specialty target), not just the small
 * seeded dev dataset.
 *
 * Reads are public/RLS-scoped selects; the confirm stage's booking goes
 * through the atomic book_appointment RPC (Task 3) — the client NEVER
 * writes is_booked or inserts appointments itself (T-04-05).
 */

import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { filterFreeFutureSlots, type BookingStage } from "@/lib/booking";
import { formatIST } from "@/lib/format";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { QRView } from "@/components/QRView";

type Dept = { id: string; name: string };
type Doctor = {
  id: string;
  specialization: string | null;
  staff: { name: string } | null;
};
type Slot = { id: string; slot_time: string; is_booked: boolean | null };

const STAGE_TITLE: Record<BookingStage, string> = {
  dept: "Choose a department",
  doctor: "Choose a doctor",
  slot: "Pick a time slot",
  confirm: "Confirm booking",
  success: "Booking confirmed",
};

export function BookingWizard() {
  const [stage, setStage] = useState<BookingStage>("dept");

  const [depts, setDepts] = useState<Dept[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [selectedDept, setSelectedDept] = useState<Dept | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [booking, setBooking] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("departments")
      .select("id, name")
      .order("name");
    if (fetchError) {
      setError("Couldn't load departments.");
    } else {
      setDepts(data ?? []);
    }
    setLoading(false);
  }, []);

  const fetchDoctors = useCallback(async (deptId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("doctors")
      .select("id, specialization, staff:staff!doctors_id_fkey(name)")
      .eq("department_id", deptId);
    if (fetchError) {
      setError("Couldn't load doctors.");
    } else {
      // Fetcher-cast pattern (see web pending-client.tsx): nested embed
      // select strings collapse PostgREST's TS inference.
      setDoctors((data as Doctor[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  const fetchSlots = useCallback(async (doctorId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("doctor_slots")
      .select("id, slot_time, is_booked")
      .eq("doctor_id", doctorId)
      .gte("slot_time", new Date().toISOString())
      .eq("is_booked", false)
      .order("slot_time");
    if (fetchError) {
      setError("Couldn't load free slots.");
    } else {
      setSlots(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDepts();
  }, [fetchDepts]);

  const selectDept = (dept: Dept) => {
    setSelectedDept(dept);
    setStage("doctor");
    void fetchDoctors(dept.id);
  };

  const selectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setStage("slot");
    void fetchSlots(doctor.id);
  };

  const selectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setStage("confirm");
  };

  const goBack = () => {
    setError(null);
    if (stage === "doctor") {
      setSelectedDept(null);
      setStage("dept");
    } else if (stage === "slot") {
      setSelectedDoctor(null);
      setStage("doctor");
    } else if (stage === "confirm") {
      setSelectedSlot(null);
      setStage("slot");
    }
  };

  const retry = () => {
    if (stage === "dept") {
      void fetchDepts();
    } else if (stage === "doctor" && selectedDept) {
      void fetchDoctors(selectedDept.id);
    } else if (stage === "slot" && selectedDoctor) {
      void fetchSlots(selectedDoctor.id);
    }
  };

  /**
   * Confirm the booking through the atomic book_appointment RPC (T-04-05).
   * The RPC row-locks the slot server-side and rejects an already-taken
   * slot; the client NEVER sets is_booked or inserts an appointment row —
   * the RPC is the sole authority.
   */
  const confirmBooking = async () => {
    if (!selectedSlot || booking) return;
    setBooking(true);
    const { data, error: rpcError } = await supabase.rpc("book_appointment", {
      p_slot_id: selectedSlot.id,
    });
    setBooking(false);

    if (rpcError) {
      if (rpcError.message.toLowerCase().includes("already booked")) {
        // Race: another patient took the slot between render and confirm —
        // surface it and send the user back to a refreshed slot list.
        Alert.alert(
          "Slot already booked",
          "That slot was just taken — pick another.",
        );
        setSelectedSlot(null);
        setStage("slot");
        if (selectedDoctor) void fetchSlots(selectedDoctor.id);
      } else {
        Alert.alert(
          "Booking failed",
          "Something went wrong while booking. Please try again.",
        );
      }
      return;
    }

    setAppointmentId(data);
    setStage("success");
  };

  /** Reset the wizard to a fresh dept stage after a successful booking. */
  const resetWizard = () => {
    setSelectedDept(null);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setAppointmentId(null);
    setError(null);
    setStage("dept");
    void fetchDepts();
  };

  // Belt-and-suspenders re-filter at render time (T-04-05: the server query
  // already filters, but the list can go stale between fetch and render).
  const freeSlots = filterFreeFutureSlots(slots, new Date());

  const doctorName = selectedDoctor?.staff?.name ?? "Doctor";

  const subtitle =
    stage === "doctor"
      ? selectedDept?.name
      : stage === "slot"
        ? `${doctorName}${selectedDoctor?.specialization ? ` — ${selectedDoctor.specialization}` : ""}`
        : undefined;

  return (
    <View className="flex-1">
      {/* Stage header: back control + title */}
      <View className="mb-3 flex-row items-center gap-2">
        {stage !== "dept" && stage !== "success" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to the previous step"
            onPress={goBack}
            className="rounded-full p-1 active:bg-slate-100"
          >
            <Ionicons name="chevron-back" size={22} color="#334155" />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900">
            {STAGE_TITLE[stage]}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-slate-500">{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : stage === "dept" ? (
        depts.length === 0 ? (
          <EmptyState
            title="No departments"
            hint="Please check back later."
          />
        ) : (
          <FlatList
            data={depts}
            keyExtractor={(d) => d.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Department ${item.name}`}
                onPress={() => selectDept(item)}
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 active:bg-slate-50"
              >
                <Text className="text-base font-medium text-slate-900">
                  {item.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            )}
          />
        )
      ) : stage === "doctor" ? (
        doctors.length === 0 ? (
          <EmptyState
            title="No doctors in this department"
            hint="Go back and pick another department."
          />
        ) : (
          <FlatList
            data={doctors}
            keyExtractor={(d) => d.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Doctor ${item.staff?.name ?? "Doctor"}${
                  item.specialization ? `, ${item.specialization}` : ""
                }`}
                onPress={() => selectDoctor(item)}
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 active:bg-slate-50"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-base font-medium text-slate-900">
                    {item.staff?.name ?? "Doctor"}
                  </Text>
                  {item.specialization ? (
                    <Text className="text-sm text-slate-500">
                      {item.specialization}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            )}
          />
        )
      ) : stage === "slot" ? (
        freeSlots.length === 0 ? (
          <EmptyState
            title="No free slots"
            hint="This doctor has no upcoming availability. Go back and pick another doctor."
          />
        ) : (
          <FlatList
            data={freeSlots}
            keyExtractor={(s) => s.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Slot ${formatIST(item.slot_time, "datetime")}`}
                onPress={() => selectSlot(item)}
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 active:bg-slate-50"
              >
                <Text className="text-base font-medium text-slate-900">
                  {formatIST(item.slot_time, "datetime")}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </Pressable>
            )}
          />
        )
      ) : stage === "confirm" ? (
        <View>
          <View className="rounded-xl border border-slate-200 bg-white p-4">
            <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Appointment summary
            </Text>
            <View className="mt-3 gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Department</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {selectedDept?.name ?? "—"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Doctor</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {doctorName}
                  {selectedDoctor?.specialization
                    ? ` (${selectedDoctor.specialization})`
                    : ""}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500">Time</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {selectedSlot
                    ? formatIST(selectedSlot.slot_time, "datetime")
                    : "—"}
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4">
            <Button
              title="Confirm booking"
              loading={booking}
              onPress={() => void confirmBooking()}
            />
          </View>
        </View>
      ) : stage === "success" && appointmentId ? (
        <View className="items-center">
          <View className="w-full items-center rounded-xl border border-teal-200 bg-teal-50 p-4">
            <Ionicons name="checkmark-circle" size={40} color="#0d9488" />
            <Text className="mt-2 text-base font-semibold text-teal-900">
              Appointment booked
            </Text>
            <Text className="mt-1 text-center text-sm text-teal-800">
              {doctorName}
              {selectedSlot
                ? ` · ${formatIST(selectedSlot.slot_time, "datetime")}`
                : ""}
            </Text>
            <QRView value={appointmentId} />
            <Text className="text-center text-xs text-slate-500">
              Show this QR code at the reception desk to check in.
            </Text>
          </View>
          <View className="mt-4 w-full">
            <Button title="Done" variant="secondary" onPress={resetWizard} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
