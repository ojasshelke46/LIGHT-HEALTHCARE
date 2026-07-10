/**
 * Pharmacy — dispensed prescriptions history (PHARM-04, D-41).
 *
 * Async server component: prescriptions status=dispensed ordered
 * dispensed_at DESC, optionally narrowed by a from/to date range. The
 * from/to searchParams pass ONLY through istRangeFromDates (Date math,
 * NaN-safe) — never raw string interpolation into the PostgREST filter
 * (T-03-15); the read is RLS-scoped to the pharmacist session.
 */

import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { istRangeFromDates } from "@/lib/time";
import { formatIST } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DispensedFilters } from "./dispensed-filters";

type DispensedRow = {
  id: string;
  quantity: number;
  dispensed_at: string | null;
  medicines: { name: string } | null;
  patients: { name: string } | null;
};

export default async function DispensedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("prescriptions")
    .select("id, quantity, dispensed_at, medicines(name), patients(name)")
    .eq("status", "dispensed")
    .order("dispensed_at", { ascending: false });

  const { startISO, endISO } = istRangeFromDates(from, to);
  if (startISO) query = query.gte("dispensed_at", startISO);
  if (endISO) query = query.lt("dispensed_at", endISO);

  const { data, error } = await query;

  // Cast: PostgREST's TS overload resolution for multi-column, nested
  // .select() strings collapses to a generic-error shape here, mirroring
  // the workaround used in doctor/patients/[id]/page.tsx.
  const rows = (data as DispensedRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Dispensed</h1>

      <DispensedFilters from={from} to={to} />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p role="alert">{error.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No dispensed prescriptions"
          description="Prescriptions you dispense will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Dispensed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-testid={`dispensed-row-${row.id}`}>
                <TableCell className="font-medium text-slate-900">
                  {row.medicines?.name ?? "—"}
                </TableCell>
                <TableCell>{row.patients?.name ?? "—"}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>
                  {row.dispensed_at
                    ? formatIST(row.dispensed_at, "datetime")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
