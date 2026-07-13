/**
 * One visit's diagnosis/notes + test orders (with an openable result file)
 * + prescriptions (with medicine names) — rendered inside the reports tab's
 * per-IST-date grouping (D-53, MOB-04).
 *
 * Threat model: T-04-09 (signed URLs are TTL 3600s, generated per-tap, never
 * cached — the path comes only from an RLS-scoped `orders.result_url` the
 * patient already owns) and T-04-10 (Linking.openURL only ever receives an
 * http(s) URL — the resolver output is guarded before opening).
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import type { Database } from "@light/shared-types";
import { supabase } from "@/lib/supabase";
import { resolveResultUrl } from "@/lib/reportUrl";

type OrderType = Database["public"]["Enums"]["order_type"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type PrescriptionStatus = Database["public"]["Enums"]["prescription_status"];

export type OrderRow = {
  id: string;
  type: OrderType;
  status: OrderStatus | null;
  instructions: string | null;
  result_url: string | null;
  result_notes: string | null;
};

export type PrescriptionRow = {
  id: string;
  dosage: string | null;
  duration: string | null;
  quantity: number;
  status: PrescriptionStatus | null;
  medicine: { name: string } | null;
};

export type VisitWithDetails = {
  id: string;
  created_at: string | null;
  completed_at: string | null;
  diagnosis: string | null;
  notes: string | null;
  chief_complaint: string | null;
  orders: OrderRow[];
  prescriptions: PrescriptionRow[];
};

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  lab: "Lab",
  ct: "CT Scan",
  mri: "MRI",
  xray: "X-Ray",
};

const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  ordered: { label: "Ordered", className: "bg-slate-100 text-slate-700" },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800",
  },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
};

const PRESCRIPTION_STATUS_BADGE: Record<
  PrescriptionStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  dispensed: { label: "Dispensed", className: "bg-green-100 text-green-800" },
};

/**
 * Signer passed into resolveResultUrl for a Storage-path result: signs the
 * private "scan-results" bucket path for 3600s (T-04-09). Never cached —
 * called fresh on every "Open result" tap.
 */
async function signResultPath(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("scan-results")
    .createSignedUrl(path, 3600);
  return error ? null : (data?.signedUrl ?? null);
}

export function ReportVisitGroup({ visit }: { visit: VisitWithDetails }) {
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleOpenResult(order: OrderRow) {
    if (!order.result_url || openingId) return;
    setOpeningId(order.id);
    const url = await resolveResultUrl(order.result_url, signResultPath);
    setOpeningId(null);

    if (!url) {
      Alert.alert("Could not open file", "Please try again in a moment.");
      return;
    }
    // T-04-10: only ever open an http(s) URL, even though the resolver only
    // ever returns the stored http(s) value or a Supabase signed URL.
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert("Could not open file", "The result link looks invalid.");
      return;
    }
    await Linking.openURL(url);
  }

  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4">
      {visit.chief_complaint ? (
        <Text className="text-sm text-slate-500">
          {visit.chief_complaint}
        </Text>
      ) : null}
      <Text className="mt-1 text-base font-semibold text-slate-900">
        {visit.diagnosis ?? "No diagnosis recorded"}
      </Text>
      {visit.notes ? (
        <Text className="mt-1 text-sm text-slate-700">{visit.notes}</Text>
      ) : null}

      {visit.orders.length > 0 ? (
        <View className="mt-3 gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test orders
          </Text>
          {visit.orders.map((order) => {
            const badge = ORDER_STATUS_BADGE[order.status ?? "ordered"];
            const opening = openingId === order.id;
            return (
              <View
                key={order.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-slate-900">
                    {ORDER_TYPE_LABEL[order.type]}
                  </Text>
                  <View
                    className={`rounded-full px-2 py-0.5 ${badge.className}`}
                  >
                    <Text className="text-xs font-medium">{badge.label}</Text>
                  </View>
                </View>
                {order.instructions ? (
                  <Text className="mt-1 text-sm text-slate-600">
                    {order.instructions}
                  </Text>
                ) : null}
                {order.result_url ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open result for ${ORDER_TYPE_LABEL[order.type]} order`}
                    accessibilityState={{ disabled: opening, busy: opening }}
                    disabled={opening}
                    onPress={() => void handleOpenResult(order)}
                    className="mt-2 flex-row items-center gap-2 self-start"
                  >
                    {opening ? (
                      <ActivityIndicator size="small" color="#0d9488" />
                    ) : null}
                    <Text className="text-sm font-medium text-teal-700">
                      {opening ? "Opening…" : "Open result"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {visit.prescriptions.length > 0 ? (
        <View className="mt-3 gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prescriptions
          </Text>
          {visit.prescriptions.map((rx) => {
            const badge = PRESCRIPTION_STATUS_BADGE[rx.status ?? "pending"];
            return (
              <View
                key={rx.id}
                className="flex-row items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-slate-900">
                    {rx.medicine?.name ?? "Medicine"}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {[rx.dosage, rx.duration].filter(Boolean).join(" · ") ||
                      "—"}
                    {` · Qty ${rx.quantity}`}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2 py-0.5 ${badge.className}`}
                >
                  <Text className="text-xs font-medium">{badge.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
