"use client";

/**
 * Diagnostics — live pending (status=ordered) tests (DIAG-01, D-33).
 *
 * Mirrors reception/queue-client.tsx's useRealtimeList + fetcher-cast
 * pattern: PostgREST's TS overload resolution for a multi-column nested
 * .select() string collapses to a generic-error shape, so the fetched rows
 * are cast to the local PendingOrder type (same workaround as staff.ts).
 */

import { useCallback } from "react";
import { FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PendingRow } from "./pending-row";
import type { OrderType } from "@/lib/status";

export type PendingOrder = {
  id: string;
  type: OrderType;
  instructions: string | null;
  ordered_at: string | null;
  patient_id: string;
  visit_id: string;
  patients: { name: string } | null;
  visits: { doctors: { staff: { name: string } | null } | null } | null;
};

export function PendingClient() {
  const fetcher = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, type, instructions, ordered_at, patient_id, visit_id, patients(name), visits(doctors(staff(name)))",
      )
      .eq("status", "ordered")
      .order("ordered_at", { ascending: true });

    return { data: data as PendingOrder[] | null, error };
  }, []);

  const { data, loading, error, refetch, connected } =
    useRealtimeList<PendingOrder>(fetcher, ["orders"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Pending Tests</h1>
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
          aria-label="Loading pending tests"
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
          icon={FlaskConical}
          title="No pending tests"
          description="Doctor-ordered tests will show up here as they come in."
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
