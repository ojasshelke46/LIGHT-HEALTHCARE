import { Pressable, Text, View } from "react-native";
import type { AppointmentStatus } from "@light/shared-types";
import { formatIST } from "@/lib/format";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";

/** Shared appointment summary card — home (next up) + appointments list. */
export function AppointmentCard({
  doctorName,
  deptName,
  slotTimeISO,
  status,
  onPress,
}: {
  doctorName: string;
  deptName: string;
  slotTimeISO: string;
  status: AppointmentStatus;
  onPress?: () => void;
}) {
  const badge = APPOINTMENT_STATUS_BADGE[status];

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`Appointment with ${doctorName}, ${deptName}, ${formatIST(
        slotTimeISO,
        "datetime",
      )}`}
      onPress={onPress}
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold text-slate-900">
            {doctorName}
          </Text>
          <Text className="text-sm text-slate-500">{deptName}</Text>
          <Text className="mt-1 text-sm text-slate-700">
            {formatIST(slotTimeISO, "datetime")}
          </Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${badge.className}`}>
          <Text className="text-xs font-medium">{badge.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}
