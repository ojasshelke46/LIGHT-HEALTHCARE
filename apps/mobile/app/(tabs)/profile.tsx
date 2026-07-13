/**
 * Profile tab (MOB-05, D-54): view the patient's own details and edit the
 * demographic subset (name/email/address/abha_id). Phone is the Supabase
 * Auth identity — rendered read-only, excluded from the zod schema and the
 * update payload (T-04-12).
 *
 * Save validates with profileSchema then performs a self-scoped
 * `patients.update` filtered to the signed-in patient's own id; the
 * `patients_self_update` RLS policy (auth.uid() = auth_user_id) is the
 * server-side enforcement boundary, the `.eq("id", ...)` filter is a
 * defensive belt-and-suspenders (T-04-11), matching the pattern already
 * used for appointments/reports reads in 04-02/04-03.
 */

import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import type { Database } from "@light/shared-types";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { profileSchema } from "@/lib/profileSchema";
import { formatIST } from "@/lib/format";
import { Button, Field, Screen, Skeleton } from "@/components/ui";

type Patient = Database["public"]["Tables"]["patients"]["Row"];

type FormState = {
  name: string;
  email: string;
  address: string;
  abha_id: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function toFormState(patient: Patient | null): FormState {
  return {
    name: patient?.name ?? "",
    email: patient?.email ?? "",
    address: patient?.address ?? "",
    abha_id: patient?.abha_id ?? "",
  };
}

export default function ProfileScreen() {
  const { patient, refreshPatient } = useSession();

  const [form, setForm] = useState<FormState>(() => toFormState(patient));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Root gate (app/_layout.tsx) redirects to complete-profile whenever
  // `patient` is null, so this only guards the brief render before that
  // redirect resolves — never a reachable steady state inside (tabs).
  if (!patient) {
    return (
      <Screen>
        <View className="gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </View>
      </Screen>
    );
  }

  // Narrow once into a new const — nested closures below don't retain the
  // control-flow narrowing from the `if (!patient)` guard above.
  const activePatient = patient;

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function onSave() {
    if (saving) return; // re-entrancy guard against double-tap
    setErrors({});
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in form && !next[key as keyof FormState]) {
          next[key as keyof FormState] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("patients").update({
        name: parsed.data.name,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        abha_id: parsed.data.abha_id || null,
      })
      // Own id only — RLS (patients_self_update) also enforces ownership
      // server-side; never send id/auth_user_id/phone in the payload above.
      .eq("id", activePatient.id);
    setSaving(false);

    if (error) {
      const isRlsDenial =
        error.code === "42501" ||
        /row-level security/i.test(error.message);
      console.error("patients self-update failed:", error);
      Alert.alert(
        "Couldn't save",
        isRlsDenial
          ? "Profile updates aren't enabled yet. Please try again later."
          : "Please try again in a moment.",
      );
      return;
    }

    await refreshPatient();
    Alert.alert("Profile saved");
  }

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-3 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-2 text-2xl font-bold text-slate-900">
          Profile
        </Text>

        <Field
          label="Phone (verified)"
          value={patient.phone}
          editable={false}
          className="opacity-60"
        />

        {patient.dob ? (
          <Field
            label="Date of birth"
            value={formatIST(patient.dob, "date")}
            editable={false}
            className="opacity-60"
          />
        ) : null}

        <View>
          <Field
            label="Full name"
            value={form.name}
            onChangeText={(v) => setField("name", v)}
            autoComplete="name"
          />
          {errors.name ? (
            <Text accessibilityRole="alert" className="mt-1 text-sm text-red-600">
              {errors.name}
            </Text>
          ) : null}
        </View>

        <View>
          <Field
            label="Email"
            value={form.email}
            onChangeText={(v) => setField("email", v)}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? (
            <Text accessibilityRole="alert" className="mt-1 text-sm text-red-600">
              {errors.email}
            </Text>
          ) : null}
        </View>

        <View>
          <Field
            label="Address"
            value={form.address}
            onChangeText={(v) => setField("address", v)}
            multiline
          />
          {errors.address ? (
            <Text accessibilityRole="alert" className="mt-1 text-sm text-red-600">
              {errors.address}
            </Text>
          ) : null}
        </View>

        <View>
          <Field
            label="ABHA ID"
            value={form.abha_id}
            onChangeText={(v) => setField("abha_id", v)}
            autoCapitalize="none"
          />
          {errors.abha_id ? (
            <Text accessibilityRole="alert" className="mt-1 text-sm text-red-600">
              {errors.abha_id}
            </Text>
          ) : null}
        </View>

        <Button
          title="Save changes"
          onPress={onSave}
          loading={saving}
          disabled={saving}
        />
      </ScrollView>
    </Screen>
  );
}
