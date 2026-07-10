"use client";

/**
 * Single pending-order row: type icon, patient, doctor, instructions,
 * status badge, and an optimistic Accept action (DIAG-01, D-33).
 *
 * Accept hides the row immediately (optimistic — the row would otherwise
 * disappear anyway once status flips away from "ordered" and the pending
 * fetcher's eq("status","ordered") filter excludes it); a failed write
 * un-hides the row and shows a sonner toast, mirroring reception/queue-row.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatIST } from "@/lib/format";
import { ORDER_STATUS_BADGE, ORDER_TYPE_ICON } from "@/lib/status";
import type { PendingOrder } from "./pending-client";

export function PendingRow({
  row,
  onChanged,
}: {
  row: PendingOrder;
  onChanged: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);

  if (hidden) return null;

  const Icon = ORDER_TYPE_ICON[row.type];
  const badge = ORDER_STATUS_BADGE.ordered;
  const doctorName = row.visits?.doctors?.staff?.name ?? "—";

  async function handleAccept() {
    setHidden(true);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: "in_progress" })
      .eq("id", row.id);
    setPending(false);

    if (error) {
      setHidden(false);
      toast.error("Could not accept — try again");
      return;
    }
    toast.success("Accepted");
    onChanged();
  }

  return (
    <div
      data-testid={`pending-row-${row.id}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-slate-500" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-900">
            {row.patients?.name ?? "—"}
          </span>
          <span className="text-sm text-slate-500">
            Dr. {doctorName}
            {row.ordered_at ? ` · ${formatIST(row.ordered_at, "datetime")}` : ""}
          </span>
          {row.instructions ? (
            <span className="text-sm text-slate-600">{row.instructions}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={badge.className}>{badge.label}</Badge>
        <Button
          type="button"
          size="sm"
          data-testid="accept-btn"
          aria-label={`Accept ${row.patients?.name ?? "order"}`}
          disabled={pending}
          onClick={() => void handleAccept()}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
