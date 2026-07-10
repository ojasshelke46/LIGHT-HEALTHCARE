"use client";

/**
 * Diagnostics — live in-progress (status=in_progress) tests (DIAG-02, D-34).
 *
 * Same useRealtimeList + fetcher-cast shape as ../pending-client.tsx, just
 * filtered to status=in_progress and rendering InProgressRow (upload +
 * notes + Mark Complete) instead of Accept.
 */

import { useCallback } from "react";
import { Loader } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InProgressRow } from "./in-progress-row";
import type { OrderType } from "@/lib/status";

export type InProgressOrder = {
  id: string;
  type: OrderType;
  instructions: string | null;
  ordered_at: string | null;
  patient_id: string;
  visit_id: string;
  patients: { name: string } | null;
  visits: { doctors: { staff: { name: string } | null } | null } | null;
};

export function InProgressClient() {
  const fetcher = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, type, instructions, ordered_at, patient_id, visit_id, patients(name), visits(doctors(staff(name)))",
      )
      .eq("status", "in_progress")
      .order("ordered_at", { ascending: true });

    return { data: data as InProgressOrder[] | null, error };
  }, []);

  const { data, loading, error, refetch, connected } =
    useRealtimeList<InProgressOrder>(fetcher, ["orders"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">In Progress</h1>
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
          aria-label="Loading in-progress tests"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
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
          icon={Loader}
          title="No tests in progress"
          description="Accepted tests will show up here until their result is uploaded."
        />
      ) : (
        <div className="space-y-2">
          {data.map((row) => (
            <InProgressRow key={row.id} row={row} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
