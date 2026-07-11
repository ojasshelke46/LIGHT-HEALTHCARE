import { Screen, EmptyState } from "@/components/ui";

export default function BookScreen() {
  return (
    <Screen>
      <EmptyState
        title="Book an appointment"
        hint="Choose a department, doctor, and slot here."
      />
    </Screen>
  );
}
