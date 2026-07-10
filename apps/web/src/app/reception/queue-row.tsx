"use client";

/**
 * Single queue row: patient/doctor/time + status badge (RECEP-01), plus
 * optimistic check-in / no-show actions (RECEP-02, D-21).
 *
 * The badge always reads from local `optimisticStatus` (seeded from
 * row.status) so the UI flips immediately on click; the authoritative
 * status comes back through the realtime refetch triggered by onChanged().
 * A failed write rolls the local value back and shows a sonner toast.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatIST } from "@/lib/format";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";
import type { AppointmentStatus } from "@light/shared-types";
import type { QueueAppointment } from "./queue-client";

export function QueueRow({
  row,
  onChanged,
}: {
  row: QueueAppointment;
  onChanged: () => void;
}) {
  // Local override only holds the optimistic value between click and the
  // realtime refetch; once the server row changes (row.status), it wins —
  // otherwise badges freeze on external changes from other tabs/roles.
  const [override, setOverride] = useState<{
    from: AppointmentStatus | null;
    to: AppointmentStatus;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const optimisticStatus: AppointmentStatus =
    override && override.from === row.status
      ? override.to
      : (row.status ?? "booked");
  const setOptimisticStatus = (to: AppointmentStatus) =>
    setOverride({ from: row.status, to });
  const rollbackStatus = () => setOverride(null);

  const badge = APPOINTMENT_STATUS_BADGE[optimisticStatus];
  const isPastSlot = new Date(row.slot_time).getTime() < Date.now();
  const canCheckIn = optimisticStatus === "booked";
  const canNoShow = optimisticStatus === "booked" && isPastSlot;

  async function handleCheckIn() {
    setOptimisticStatus("checked_in");
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "checked_in" })
      .eq("id", row.id);
    setPending(false);

    if (error) {
      rollbackStatus();
      toast.error("Could not check in — try again");
      return;
    }
    toast.success("Checked in");
    onChanged();
  }

  async function handleNoShow() {
    setOptimisticStatus("no_show");
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "no_show" })
      .eq("id", row.id);
    setPending(false);

    if (error) {
      rollbackStatus();
      toast.error("Could not mark no-show — try again");
      return;
    }
    toast.success("Marked as no-show");
    onChanged();
  }

  return (
    <div
      data-testid={`queue-row-${row.id}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-slate-900">
          {row.patients?.name ?? "—"}
        </span>
        <span className="text-sm text-slate-500">
          {row.doctors?.staff?.name ?? "—"} · {formatIST(row.slot_time, "time")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={badge.className}>{badge.label}</Badge>
        {canCheckIn && (
          <Button
            type="button"
            size="sm"
            data-testid="check-in-btn"
            aria-label={`Check in ${row.patients?.name ?? "patient"}`}
            disabled={pending}
            onClick={() => void handleCheckIn()}
          >
            Check In
          </Button>
        )}
        {canNoShow && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="no-show-btn"
            aria-label={`Mark ${row.patients?.name ?? "patient"} as no-show`}
            disabled={pending}
            onClick={() => void handleNoShow()}
          >
            No-Show
          </Button>
        )}
      </div>
    </div>
  );
}
