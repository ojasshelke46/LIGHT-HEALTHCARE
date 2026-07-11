import "@/global.css";
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider, useSession } from "@/lib/session";
import { Skeleton } from "@/components/ui";

/** Root route gate (D-49): session + patient row decide where the user lands. */
function RootGate() {
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

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!patient) {
    return <Redirect href="/(auth)/complete-profile" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootGate />
    </AuthProvider>
  );
}
