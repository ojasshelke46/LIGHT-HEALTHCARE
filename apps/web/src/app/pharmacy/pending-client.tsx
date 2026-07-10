"use client";

/**
 * Pharmacy — live pending (status=pending) prescriptions with stock
 * indicators (PHARM-01, D-38).
 *
 * Watches BOTH "prescriptions" and "medicines" (D-38) so a stock change
 * made elsewhere — an inventory edit, or another pharmacist's dispense —
 * refreshes every row's stock indicator live, not just this pharmacist's
 * own actions. Mirrors reception/queue-client.tsx's useRealtimeList +
 * fetcher-cast pattern (PostgREST's TS overload resolution for a
 * multi-column nested .select() string collapses to a generic-error shape).
 */

import { useCallback } from "react";
import { Pill } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PendingRow } from "./pending-row";

export type PendingRx = {
  id: string;
  dosage: string | null;
  duration: string | null;
  quantity: number;
  patient_id: string;
  medicine_id: string;
  patients: { name: string } | null;
  medicines: {
    name: string;
    stock_qty: number | null;
    low_stock_threshold: number | null;
  } | null;
  visits: { doctors: { staff: { name: string } | null } | null } | null;
};

export function PendingRxClient() {
  const fetcher = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .select(
        "id, dosage, duration, quantity, patient_id, medicine_id, medicines(name, stock_qty, low_stock_threshold), patients(name), visits(doctors(staff(name)))",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    return { data: data as PendingRx[] | null, error };
  }, []);

  const { data, loading, error, refetch, connected } =
    useRealtimeList<PendingRx>(fetcher, ["prescriptions", "medicines"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          Pending Prescriptions
        </h1>
        <span
          aria-live="polite"
          className="text-xs font-medium text-slate-500"
        >
          {connected ? "● Live" : "Reconnecting…"}
        </span>
      </div>

      {loading ? (
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label="Loading pending prescriptions"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p role="alert">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={refetch}
          >
            Retry
          </Button>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No pending prescriptions"
          description="Doctor-prescribed medicines will show up here as they come in."
        />
      ) : (
        <div className="space-y-2">
          {data.map((row) => (
            <PendingRow key={row.id} row={row} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
