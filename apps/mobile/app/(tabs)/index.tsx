import { Screen, EmptyState } from "@/components/ui";

export default function HomeScreen() {
  return (
    <Screen>
      <EmptyState
        title="Home"
        hint="Your next appointment and quick actions will appear here."
      />
    </Screen>
  );
}
