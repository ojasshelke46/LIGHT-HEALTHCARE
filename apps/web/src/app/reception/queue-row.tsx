"use client";

/**
 * Single queue row: patient/doctor/time + status badge (RECEP-01).
 * Check-in / no-show actions (RECEP-02, D-21) land in Task 3.
 */

import { Badge } from "@/components/ui/badge";
import { formatIST } from "@/lib/format";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";
import type { QueueAppointment } from "./queue-client";

export function QueueRow({
  row,
  onChanged,
}: {
  row: QueueAppointment;
  onChanged: () => void;
}) {
  void onChanged; // wired to check-in/no-show actions in Task 3
  const badge = APPOINTMENT_STATUS_BADGE[row.status ?? "booked"];

  return (
    <div
      data-testid={`queue-row-${row.id}`}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-slate-900">
          {row.patients?.name ?? "—"}
        </span>
        <span className="text-sm text-slate-500">
          {row.doctors?.staff?.name ?? "—"} · {formatIST(row.slot_time, "time")}
        </span>
      </div>
      <Badge className={badge.className}>{badge.label}</Badge>
    </div>
  );
}
