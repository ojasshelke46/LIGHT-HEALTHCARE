"use client";

/**
 * Single patient card on the doctor's today list (DOC-01). Links into the
 * consultation view; the whole card is the (keyboard-focusable) Next.js
 * Link, per DashboardLayout's a11y convention.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ageFromDob } from "@/lib/patient";
import { formatIST } from "@/lib/format";
import { APPOINTMENT_STATUS_BADGE } from "@/lib/status";
import type { TodayRow } from "./doctor-today";

export function PatientCard({ row }: { row: TodayRow }) {
  const name = row.patients?.name ?? "—";
  const age = ageFromDob(row.patients?.dob ?? null);
  const ageLabel = age === null ? "N/A" : `${age} yrs`;
  const slotTime = formatIST(row.slot_time, "time");
  const badge = row.status ? APPOINTMENT_STATUS_BADGE[row.status] : null;
  const complaint = row.visits?.[0]?.chief_complaint;

  const summary = [
    name,
    ageLabel,
    slotTime,
    badge?.label,
    complaint ?? undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/doctor/consult/${row.id}`}
      data-testid={`patient-card-${row.id}`}
      aria-label={summary}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      <Card className="h-full p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-slate-900">{name}</p>
            <p className="text-sm text-slate-500">{ageLabel}</p>
          </div>
          {badge ? <Badge className={badge.className}>{badge.label}</Badge> : null}
        </div>
        <p className="mt-3 text-sm text-slate-600">{slotTime}</p>
        {complaint ? (
          <p className="mt-2 line-clamp-2 text-sm text-slate-700">
            {complaint}
          </p>
        ) : null}
      </Card>
    </Link>
  );
}
