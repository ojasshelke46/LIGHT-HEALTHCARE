"use client";

/**
 * Single pending-prescription row: patient, medicine, dosage, duration,
 * quantity, doctor, stock indicator, and Dispense via the atomic
 * dispense_medicine RPC (PHARM-01/02, D-38/D-39).
 *
 * Dispense performs NO client-side stock/status write (T-03-10) — it only
 * calls the deployed, security-definer RPC and reacts to its result.
 *
 * The button's `disabled` attribute reflects only the in-flight request
 * (prevents double-submit). Insufficient stock is surfaced via the stock
 * badge and a muted button style, not a native disable: a truly disabled
 * <button> never dispatches a click event in real browsers, which would
 * mean an insufficient-stock row could never reach the RPC at all — the
 * server's atomic guard (T-03-11) is what's authoritative, per the threat
 * model ("button disable is UX-only, server is authoritative"), and the
 * click must still be able to reach it.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { stockLevel } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { PendingRx } from "./pending-client";

export function PendingRow({
  row,
  onChanged,
}: {
  row: PendingRx;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);

  const stock = row.medicines?.stock_qty ?? 0;
  const threshold = row.medicines?.low_stock_threshold ?? 0;
  const s = stockLevel(stock, row.quantity, threshold);
  const doctorName = row.visits?.doctors?.staff?.name ?? "—";

  async function handleDispense() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("dispense_medicine", {
      p_prescription_id: row.id,
      p_quantity: row.quantity,
    });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dispensed");
    onChanged();
  }

  return (
    <div
      data-testid={`pending-row-${row.id}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-slate-900">
          {row.patients?.name ?? "—"} · {row.medicines?.name ?? "—"}
        </span>
        <span className="text-sm text-slate-500">
          Dosage {row.dosage ?? "—"} · Duration {row.duration ?? "—"} · Qty{" "}
          {row.quantity}
        </span>
        <span className="text-sm text-slate-500">Dr. {doctorName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={s.className}>{s.label}</Badge>
        <Button
          type="button"
          size="sm"
          data-testid="dispense-btn"
          aria-label={`Dispense for ${row.patients?.name ?? "patient"}`}
          disabled={pending}
          className={cn(s.level === "insufficient" && "opacity-60")}
          onClick={() => void handleDispense()}
        >
          Dispense
        </Button>
      </div>
    </div>
  );
}
