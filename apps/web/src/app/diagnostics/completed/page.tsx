/**
 * Diagnostics — completed orders browse (DIAG-03, D-36).
 *
 * Async server component: orders status=completed ordered completed_at
 * DESC, narrowed by an optional order type (fixed enum whitelist, T-03-08)
 * and an IST from/to date range (istRangeFromDates — Date math, NaN-safe,
 * T-03-08). Both filters are applied server-side via searchParams; the
 * type value is never interpolated into the PostgREST filter unvalidated.
 * Each row opens its result via the signed-URL ResultLink (D-35).
 */

import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { istRangeFromDates } from "@/lib/time";
import { formatIST } from "@/lib/format";
import { ORDER_TYPE_ICON, type OrderType } from "@/lib/status";
import { EmptyState } from "@/components/empty-state";
import { ResultLink } from "@/components/result-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompletedFilters } from "./completed-filters";

type CompletedOrder = {
  id: string;
  type: OrderType;
  instructions: string | null;
  result_url: string | null;
  result_notes: string | null;
  completed_at: string | null;
  patients: { name: string } | null;
  visits: { doctors: { staff: { name: string } | null } | null } | null;
};

const VALID_TYPES = ["lab", "ct", "mri", "xray"] as const;

export default async function CompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string }>;
}) {
  const { from, to, type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, type, instructions, result_url, result_notes, completed_at, patients(name), visits(doctors(staff(name)))",
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  // T-03-08: whitelist-only — never pass an unvalidated type through to .eq.
  if (type && (VALID_TYPES as readonly string[]).includes(type)) {
    query = query.eq("type", type as OrderType);
  }

  const { startISO, endISO } = istRangeFromDates(from, to);
  if (startISO) query = query.gte("completed_at", startISO);
  if (endISO) query = query.lt("completed_at", endISO);

  const { data, error } = await query;

  // Cast: PostgREST's TS overload resolution for multi-column, nested
  // .select() strings collapses to a generic-error shape here, mirroring
  // the workaround used in doctor/patients/[id]/page.tsx and
  // pharmacy/dispensed/page.tsx.
  const rows = (data as CompletedOrder[] | null) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Completed</h1>

      <CompletedFilters from={from} to={to} type={type} />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p role="alert">{error.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No completed orders"
          description="Completed tests will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const Icon = ORDER_TYPE_ICON[row.type];
              return (
                <TableRow key={row.id} data-testid={`completed-row-${row.id}`}>
                  <TableCell>
                    <span className="flex items-center gap-1.5 uppercase text-slate-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {row.patients?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.visits?.doctors?.staff?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.completed_at
                      ? formatIST(row.completed_at, "datetime")
                      : "—"}
                  </TableCell>
                  <TableCell>{row.result_notes ?? "—"}</TableCell>
                  <TableCell>
                    <ResultLink pathOrUrl={row.result_url} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
