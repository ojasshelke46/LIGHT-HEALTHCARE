"use client";

/**
 * Reception billing (RECEP-06, D-25).
 *
 * Today's completed visits LEFT JOIN payments: a visit with zero payment
 * rows is "needs billing"; a visit with a payment row shows its
 * pending/paid/failed/refunded badge + amount. Query re-runs on mount and
 * again after a payment is recorded (Sheet's onRecorded callback) — no
 * realtime subscription per D-25 (billing is a counter-side, on-demand
 * screen, unlike the live queue/doctor-today lists).
 */

import { useCallback, useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { todayISTRange } from "@/lib/time";
import { formatIST } from "@/lib/format";
import { PAYMENT_STATUS_BADGE } from "@/lib/status";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentForm } from "./payment-form";
import type { Database } from "@light/shared-types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type BillingRow = {
  id: string;
  diagnosis: string | null;
  completed_at: string | null;
  patient_id: string;
  patients: { name: string; phone: string } | null;
  orders: { id: string }[];
  payments: {
    id: string;
    amount: number;
    method: string | null;
    status: PaymentStatus | null;
  }[];
};

export function BillingClient() {
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<BillingRow | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { startISO, endISO } = todayISTRange();
    const { data, error: queryError } = await supabase
      .from("visits")
      .select(
        "id, diagnosis, completed_at, patient_id, patients(name, phone), orders(id), payments(id, amount, method, status)",
      )
      .not("completed_at", "is", null)
      .gte("completed_at", startISO)
      .lt("completed_at", endISO)
      .order("completed_at", { ascending: false });

    // Cast: PostgREST's TS overload resolution for multi-column, nested
    // .select() strings collapses to a generic-error shape here, mirroring
    // the workaround already used in lib/staff.ts / queue-client.tsx.
    const billingRows = data as BillingRow[] | null;
    if (queryError) {
      setError(queryError.message);
    } else {
      setRows(billingRows ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  function openPaymentSheet(row: BillingRow) {
    setActiveRow(row);
    setSheetOpen(true);
  }

  function handleRecorded() {
    setSheetOpen(false);
    setActiveRow(null);
    void fetchRows();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading billing">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
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
            onClick={() => void fetchRows()}
          >
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No completed visits to bill today"
          description="Completed visits will appear here once a doctor finishes a consultation."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Services rendered</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const payment = row.payments[0];
              const paymentStatus = payment?.status ?? "pending";
              const badge = PAYMENT_STATUS_BADGE[paymentStatus];
              return (
                <TableRow key={row.id} data-testid={`billing-row-${row.id}`}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-900">
                        {row.patients?.name ?? "—"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {row.patients?.phone ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.completed_at ? formatIST(row.completed_at, "time") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span>{row.diagnosis ?? "—"}</span>
                      <span className="text-xs text-slate-500">
                        {row.orders.length} {row.orders.length === 1 ? "test" : "tests"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment ? (
                      <div className="flex items-center gap-2">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        <span className="text-sm text-slate-700">
                          ₹{payment.amount}
                        </span>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-800"
                      >
                        Needs billing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!payment && (
                      <Button
                        type="button"
                        size="sm"
                        data-testid={`record-payment-${row.id}`}
                        onClick={() => openPaymentSheet(row)}
                      >
                        Record payment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} side="right" label="Record payment">
        {activeRow && (
          <PaymentForm
            visitId={activeRow.id}
            patientId={activeRow.patient_id}
            onRecorded={handleRecorded}
          />
        )}
      </Sheet>
    </div>
  );
}
