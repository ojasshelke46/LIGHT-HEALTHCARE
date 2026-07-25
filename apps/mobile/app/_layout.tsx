import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/session";

/**
 * Root layout. The Stack navigator must ALWAYS mount — returning a
 * <Redirect> in its place leaves expo-router with no navigator to act on,
 * which blanks/flickers the app. Auth gating happens per group:
 * app/index.tsx routes on session state; (auth)/_layout.tsx and
 * (tabs)/_layout.tsx guard their own groups (D-49).
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
