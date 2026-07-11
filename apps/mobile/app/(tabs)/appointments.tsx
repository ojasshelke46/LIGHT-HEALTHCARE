import { Screen, EmptyState } from "@/components/ui";

export default function AppointmentsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Appointments"
        hint="Your upcoming and past appointments will appear here."
      />
    </Screen>
  );
}
