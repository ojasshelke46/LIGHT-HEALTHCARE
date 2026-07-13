import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppointmentStatus } from "@light/shared-types";
import { formatIST } from "@/lib/format";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";
import { QRView } from "@/components/QRView";

/** Minimal shape the modal needs — callers project their row into this. */
export type AppointmentDetail = {
  id: string;
  slot_time: string;
  status: AppointmentStatus | null;
  doctorName: string;
  deptName: string;
};

/**
 * Per-appointment detail modal (D-52, MOB-03): doctor/department/time,
 * status badge, and a QR of the appointment id for check-in.
 */
export function AppointmentDetailModal({
  appointment,
  visible,
  onClose,
}: {
  appointment: AppointmentDetail | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!appointment) return null;
  const badge = APPOINTMENT_STATUS_BADGE[appointment.status ?? "booked"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-2xl bg-white p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900">
              Appointment details
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close appointment details"
              onPress={onClose}
              className="rounded-full p-1 active:bg-slate-100"
            >
              <Ionicons name="close" size={22} color="#334155" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerClassName="items-center gap-2 pb-4 pt-2"
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full gap-1">
              <Text className="text-base font-semibold text-slate-900">
                {appointment.doctorName}
              </Text>
              <Text className="text-sm text-slate-500">
                {appointment.deptName}
              </Text>
              <Text className="text-sm text-slate-700">
                {formatIST(appointment.slot_time, "datetime")}
              </Text>
              <View
                className={`mt-1 self-start rounded-full px-2.5 py-1 ${badge.className}`}
              >
                <Text className="text-xs font-medium">{badge.label}</Text>
              </View>
            </View>

            <QRView value={appointment.id} />
            <Text className="text-center text-xs text-slate-500">
              Show this QR code at the reception desk to check in.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
