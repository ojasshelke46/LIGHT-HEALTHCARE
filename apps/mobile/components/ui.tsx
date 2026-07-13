import { useEffect, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Full-screen SafeAreaView + padded content wrapper used by every tab/route. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4 py-4">{children}</View>
    </SafeAreaView>
  );
}

/**
 * Pulsing placeholder block for loading states.
 * Pulse uses RN's core Animated API — NativeWind's `animate-pulse` maps to a
 * Reanimated animated style, which crashes plain function components on
 * SDK 54 / Reanimated 4 ("passing an animation style to a function
 * component `View`").
 */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className={`rounded-md bg-slate-200 ${className}`}
    />
  );
}

/** Empty-state block: a title + optional hint, centered. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-base font-medium text-slate-700">{title}</Text>
      {hint ? (
        <Text className="mt-1 text-center text-sm text-slate-500">{hint}</Text>
      ) : null}
    </View>
  );
}

/** Error-state block with an optional retry action. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="text-center text-sm text-red-600">{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          className="mt-3 rounded-md bg-slate-100 px-4 py-2"
        >
          <Text className="text-sm font-medium text-slate-700">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary";

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
}) {
  const isDisabled = disabled || loading;
  const base =
    variant === "primary"
      ? "bg-brand active:bg-brand-dark"
      : "border border-slate-300 bg-white active:bg-slate-50";
  const textClass = variant === "primary" ? "text-white" : "text-slate-700";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${base} ${
        isDisabled ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#0d9488"} />
      ) : (
        <Text className={`text-base font-semibold ${textClass}`}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  className,
  ...inputProps
}: { label: string } & TextInputProps) {
  return (
    <View className="w-full">
      <Text
        accessibilityRole="text"
        nativeID={`${label}-label`}
        className="mb-1 text-sm font-medium text-slate-700"
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={`${label}-label`}
        placeholderTextColor="#94a3b8"
        className={`rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 ${className ?? ""}`}
        {...inputProps}
      />
    </View>
  );
}
