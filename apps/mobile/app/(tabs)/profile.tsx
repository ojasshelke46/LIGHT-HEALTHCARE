import { Screen, EmptyState } from "@/components/ui";

export default function ProfileScreen() {
  return (
    <Screen>
      <EmptyState title="Profile" hint="Edit your patient details here." />
    </Screen>
  );
}
