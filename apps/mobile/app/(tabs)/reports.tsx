import { Screen, EmptyState } from "@/components/ui";

export default function ReportsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Reports"
        hint="Your visit history, test results, and prescriptions will appear here."
      />
    </Screen>
  );
}
