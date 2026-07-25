import { Redirect } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/lib/session";
import { Skeleton } from "@/components/ui";

/** Entry route: waits for the session, then hands off to the right group. */
export default function Index() {
  const { session, patient, loading } = useSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-48" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  if (!patient) return <Redirect href="/(auth)/complete-profile" />;
  return <Redirect href="/(tabs)" />;
}
