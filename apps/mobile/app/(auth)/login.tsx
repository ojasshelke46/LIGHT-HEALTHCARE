import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";
import { Button, Field, Screen } from "@/components/ui";

const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

type Stage = "phone" | "code";

/**
 * Phone-OTP sign-in (D-48, AUTH-04) — the production path. In development a
 * __DEV__-only "Dev login" offers email/password against the seeded patient
 * while the project's phone/SMS provider is unconfigured (see user_setup).
 * Routing after a successful sign-in is centralized in app/_layout.tsx's
 * root gate — this screen never navigates manually.
 */
export default function LoginScreen() {
  const [stage, setStage] = useState<Stage>("phone");
  const [rawPhone, setRawPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devEmail, setDevEmail] = useState("patient@test.com");
  const [devPassword, setDevPassword] = useState("Test1234!");
  const [devLoading, setDevLoading] = useState(false);

  function onChangePhone(value: string) {
    setRawPhone(value);
  }

  // Live-derived validity (zod-style: normalizePhone is the format
  // validator) — the "Send code" button only enables once the phone
  // normalizes, and an inline error shows for non-empty invalid input.
  const trimmedPhone = rawPhone.trim();
  const normalizedPreview = trimmedPhone ? normalizePhone(trimmedPhone) : null;
  const phoneError =
    trimmedPhone.length > 0 && !normalizedPreview
      ? "Enter a valid 10-digit mobile number"
      : null;

  async function onSendCode() {
    if (sendingCode) return; // re-entrancy guard against double-tap
    if (!normalizedPreview) return; // defense-in-depth; button is disabled

    setSendingCode(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPreview,
    });
    setSendingCode(false);

    if (error) {
      // Generic message only — never surface the raw Supabase error text.
      Alert.alert("Could not send code", "Please try again in a moment.");
      return;
    }

    setNormalizedPhone(normalizedPreview);
    setStage("code");
  }

  async function onVerifyCode() {
    if (verifying) return; // re-entrancy guard against double-tap
    setCodeError(null);
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }
    if (!normalizedPhone) {
      setStage("phone");
      return;
    }

    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: parsed.data,
      type: "sms",
    });
    setVerifying(false);

    if (error) {
      Alert.alert("Incorrect code", "Please check the code and try again.");
      return;
    }

    // Success: AuthProvider's onAuthStateChange listener updates session
    // state; the root gate (app/_layout.tsx) routes automatically.
  }

  async function onDevLogin() {
    setDevLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });
    setDevLoading(false);

    if (error) {
      Alert.alert("Dev login failed", "Check the seeded credentials.");
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-6">
        <View>
          <Text className="text-2xl font-bold text-slate-900">
            Light Patient
          </Text>
          <Text className="mt-1 text-base text-slate-500">
            Sign in with your mobile number
          </Text>
        </View>

        {stage === "phone" ? (
          <View className="gap-3">
            <Field
              label="Mobile number"
              placeholder="98765 43210"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={rawPhone}
              onChangeText={onChangePhone}
            />
            {phoneError ? (
              <Text accessibilityRole="alert" className="text-sm text-red-600">
                {phoneError}
              </Text>
            ) : null}
            <Button
              title="Send code"
              onPress={onSendCode}
              loading={sendingCode}
              disabled={!normalizedPreview}
            />
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-sm text-slate-600">
              Enter the 6-digit code sent to {normalizedPhone}
            </Text>
            <Field
              label="Verification code"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(value) => {
                setCode(value);
                setCodeError(null);
              }}
            />
            {codeError ? (
              <Text accessibilityRole="alert" className="text-sm text-red-600">
                {codeError}
              </Text>
            ) : null}
            <Button
              title="Verify code"
              onPress={onVerifyCode}
              loading={verifying}
              disabled={code.length !== 6}
            />
            <Button
              title="Use a different number"
              variant="secondary"
              onPress={() => {
                setStage("phone");
                setCode("");
                setCodeError(null);
              }}
            />
          </View>
        )}

        {__DEV__ ? (
          <View className="mt-6 gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
            <Button
              title={showDevLogin ? "Hide dev login" : "Dev login"}
              variant="secondary"
              onPress={() => setShowDevLogin((v) => !v)}
            />
            {showDevLogin ? (
              <View className="gap-3">
                <Field
                  label="Dev email"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={devEmail}
                  onChangeText={setDevEmail}
                />
                <Field
                  label="Dev password"
                  secureTextEntry
                  value={devPassword}
                  onChangeText={setDevPassword}
                />
                <Button
                  title="Sign in (dev)"
                  onPress={onDevLogin}
                  loading={devLoading}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
