"use client";

/**
 * Pharmacy — full medicines inventory with inline stock edit (PHARM-03, D-40).
 *
 * Watches "medicines" via useRealtimeList so a dispense-driven stock change
 * (the /pharmacy Dispense RPC) or another pharmacist's own inventory edit
 * reflects here live, not just this pharmacist's own actions — mirrors
 * pending-client.tsx's multi-table-watch rationale. Low-stock rows
 * (stock_qty <= low_stock_threshold) sort first and get an amber row
 * highlight. Inline stock edit: click the stock cell to swap it for a
 * number input; save fires a single `.update({ stock_qty })` scoped to the
 * deployed pharmacist-only RLS (medicines_pharmacist_all) — no other write
 * path to this table exists in the client (T-03-13).
 */

import { useCallback, useState, type KeyboardEvent } from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { AddMedicineForm } from "./add-medicine-form";

export type Medicine = {
  id: string;
  name: string;
  stock_qty: number | null;
  unit: string | null;
  unit_price: number | null;
  low_stock_threshold: number | null;
};

function isLow(m: Medicine): boolean {
  return (m.stock_qty ?? 0) <= (m.low_stock_threshold ?? 0);
}

export function InventoryClient() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetcher = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("medicines")
      .select("id, name, stock_qty, unit, unit_price, low_stock_threshold");

    // Cast: PostgREST's TS overload resolution for a multi-column
    // .select() string collapses to a generic-error shape here, mirroring
    // the workaround already used in reception/queue-client.tsx.
    return { data: data as Medicine[] | null, error };
  }, []);

  const { data, loading, error, refetch, connected } =
    useRealtimeList<Medicine>(fetcher, ["medicines"]);

  // Low-stock rows first, then alphabetical within each group (D-40).
  const rows = [...data].sort(
    (a, b) =>
      Number(isLow(b)) - Number(isLow(a)) || a.name.localeCompare(b.name),
  );

  function startEdit(m: Medicine) {
    setEditingId(m.id);
    setEditValue(String(m.stock_qty ?? 0));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(id: string, expectedStock: number) {
    // Re-entrancy guard: Enter triggers saveEdit, which disables the input,
    // which fires blur → a second saveEdit for the same edit.
    if (saving) return;
    const n = Number.parseInt(editValue, 10);
    // Invalid input is silently ignored (no write) — revert to display mode.
    if (!Number.isInteger(n) || n < 0) {
      cancelEdit();
      return;
    }
    setSaving(true);
    const supabase = createClient();
    // Compare-and-swap on the stock value seen when editing began, so a
    // concurrent dispense_medicine decrement is never silently clobbered.
    const { data: updated, error: updateError } = await supabase
      .from("medicines")
      .update({ stock_qty: n })
      .eq("id", id)
      .eq("stock_qty", expectedStock)
      .select("id");
    setSaving(false);
    setEditingId(null);
    setEditValue("");

    if (updateError) {
      toast.error("Could not update stock");
      return;
    }
    if ((updated ?? []).length === 0) {
      toast.error("Stock changed while you were editing — refreshed, try again");
      refetch();
      return;
    }
    toast.success("Stock updated");
    refetch();
  }

  function onStockKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    id: string,
    expectedStock: number,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveEdit(id, expectedStock);
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <div className="flex items-center gap-3">
          <span
            aria-live="polite"
            className="text-xs font-medium text-slate-500"
          >
            {connected ? "● Live" : "Reconnecting…"}
          </span>
          <Button
            type="button"
            size="sm"
            data-testid="add-medicine-btn"
            onClick={() => setSheetOpen(true)}
          >
            Add medicine
          </Button>
        </div>
      </div>

      {loading ? (
        <div
          className="space-y-2"
          aria-busy="true"
          aria-label="Loading inventory"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
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
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No medicines in inventory"
          description="Medicines you add will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Threshold</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => {
              const low = isLow(m);
              return (
                <TableRow
                  key={m.id}
                  data-testid={`inventory-row-${m.id}`}
                  className={cn(low && "bg-amber-50")}
                >
                  <TableCell className="font-medium text-slate-900">
                    {m.name}
                  </TableCell>
                  <TableCell>
                    {editingId === m.id ? (
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        autoFocus
                        aria-label={`Stock for ${m.name}`}
                        data-testid={`stock-input-${m.id}`}
                        value={editValue}
                        disabled={saving}
                        className="h-8 w-24"
                        onChange={(event) => setEditValue(event.target.value)}
                        onBlur={() => void saveEdit(m.id, m.stock_qty ?? 0)}
                        onKeyDown={(event) =>
                          onStockKeyDown(event, m.id, m.stock_qty ?? 0)
                        }
                      />
                    ) : (
                      <button
                        type="button"
                        data-testid={`stock-cell-${m.id}`}
                        aria-label={`Edit stock for ${m.name}`}
                        className="rounded px-2 py-1 text-left hover:bg-slate-100"
                        onClick={() => startEdit(m)}
                      >
                        {m.stock_qty ?? 0}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>{m.unit ?? "—"}</TableCell>
                  <TableCell>₹{m.unit_price ?? 0}</TableCell>
                  <TableCell>{m.low_stock_threshold ?? 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        side="right"
        label="Add medicine"
      >
        <AddMedicineForm
          onAdded={() => {
            setSheetOpen(false);
            refetch();
          }}
        />
      </Sheet>
    </div>
  );
}
