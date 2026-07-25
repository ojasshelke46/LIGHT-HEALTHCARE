import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/session";

/** Auth group guard: fully signed-in users (session + patient row) never
 *  see login/complete-profile — bounce them to the tabs. */
export default function AuthLayout() {
  const { session, patient, loading } = useSession();

  if (!loading && session && patient) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
