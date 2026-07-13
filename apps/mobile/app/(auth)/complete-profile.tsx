import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { Button, Field, Screen } from "@/components/ui";

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

/**
 * First-run patient-row creation (D-49). Fires only for a brand-new
 * sign-in with no matching `patients` row — the seeded dev-login patient
 * (patient@test.com) already has one, so this screen never shows for it.
 * The insert sets auth_user_id = session.user.id; patients_self_insert RLS
 * enforces auth.uid() ownership server-side (the client id is not trusted).
 */
export default function CompleteProfileScreen() {
  const { session, refreshPatient } = useSession();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const authPhone = session?.user.phone || session?.user.email || "";

  async function onSubmit() {
    // Re-entrancy guard: a rapid double-tap must not race two inserts past
    // the existing-row check (the DB's unique auth_user_id would reject the
    // second one, but we shouldn't surface that as an error to the user).
    if (saving) return;
    setNameError(null);
    const parsed = nameSchema.safeParse({ name });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    if (!session) return;

    setSaving(true);

    // Guard against a duplicate insert (e.g. a slow double-submit): if a
    // row now exists for this uid, just refresh instead of erroring.
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();

    if (existing) {
      await refreshPatient();
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("patients").insert({
      name: parsed.data.name,
      phone: authPhone,
      auth_user_id: session.user.id,
    });

    setSaving(false);

    if (error) {
      // 23505 = unique violation on auth_user_id: a concurrent submit
      // already created the row — treat as success and refresh.
      if (error.code === "23505") {
        await refreshPatient();
        return;
      }
      Alert.alert(
        "Could not save profile",
        "Please try again in a moment.",
      );
      return;
    }

    await refreshPatient();
    // Success: the root gate (app/_layout.tsx) sees `patient` populated and
    // routes to (tabs) — no manual navigation here.
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6">
        <View>
          <Text className="text-2xl font-bold text-slate-900">
            Complete your profile
          </Text>
          <Text className="mt-1 text-base text-slate-500">
            Just your name to get started
          </Text>
        </View>

        <View className="gap-3">
          <Field
            label="Full name"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setNameError(null);
            }}
          />
          {nameError ? (
            <Text accessibilityRole="alert" className="text-sm text-red-600">
              {nameError}
            </Text>
          ) : null}

          <Field
            label="Mobile number"
            value={authPhone}
            editable={false}
            className="opacity-60"
          />

          <Button
            title="Continue"
            onPress={onSubmit}
            loading={saving}
            disabled={!name}
          />
        </View>
      </View>
    </Screen>
  );
}
