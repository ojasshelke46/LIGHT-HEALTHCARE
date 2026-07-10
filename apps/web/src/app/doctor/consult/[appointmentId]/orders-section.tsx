"use client";

/**
 * This-visit test orders (DOC-04, D-17/D-18/D-28) — add (type + instructions)
 * with immediate insert against the real `visitId`, plus a removable list.
 *
 * On mount, loads any orders already inserted against this visit (D-18
 * continuity: reopening a consultation shows what was already added).
 * "Removable before save" (D-17) means the remove button deletes the row —
 * there is no separate draft/save step. Both add and remove apply
 * optimistically with rollback + a sonner toast on failure, mirroring the
 * queue-row.tsx / consult-client.tsx conventions elsewhere in this phase.
 *
 * T-02-18: on an RLS/permission error the write is surfaced as a toast, not
 * silently retried with different credentials.
 */

import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type OrderTypeValue = "lab" | "ct" | "mri" | "xray";

type VisitOrder = {
  id: string;
  type: OrderTypeValue;
  instructions: string | null;
  status: string | null;
};

const schema = z.object({
  type: z.enum(["lab", "ct", "mri", "xray"]),
  instructions: z.string().optional(),
});

export function OrdersSection({
  visitId,
  patientId,
}: {
  visitId: string;
  patientId: string;
}) {
  const [orders, setOrders] = useState<VisitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<OrderTypeValue>("lab");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    void supabase
      .from("orders")
      .select("id, type, instructions, status")
      .eq("visit_id", visitId)
      .order("ordered_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Could not load this visit's orders");
          setLoading(false);
          return;
        }
        // Cast: PostgREST's TS overload resolution for multi-column
        // .select() strings collapses to a generic-error shape here,
        // mirroring the workaround already used in src/lib/staff.ts.
        setOrders((data as VisitOrder[] | null) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visitId]);

  async function handleAdd() {
    const parsed = schema.safeParse({
      type,
      instructions: instructions.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid order");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .insert({ visit_id: visitId, patient_id: patientId, type: parsed.data.type, instructions: parsed.data.instructions || null })
      .select("id, type, instructions, status")
      .single();
    setSubmitting(false);

    if (error || !data) {
      toast.error("Could not add order");
      return;
    }

    setOrders((prev) => [...prev, data as VisitOrder]);
    setInstructions("");
    setType("lab");
  }

  async function handleRemove(order: VisitOrder) {
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    const supabase = createClient();
    const { error } = await supabase.from("orders").delete().eq("id", order.id);

    if (error) {
      setOrders((prev) => [...prev, order].sort((a, b) => (a.id < b.id ? -1 : 1)));
      toast.error("Could not remove order");
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Test Orders</h3>

      <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="order-type">Type</Label>
          <Select
            id="order-type"
            data-testid="order-type-select"
            value={type}
            onChange={(e) => setType(e.target.value as OrderTypeValue)}
          >
            <SelectItem value="lab">Lab</SelectItem>
            <SelectItem value="ct">CT</SelectItem>
            <SelectItem value="mri">MRI</SelectItem>
            <SelectItem value="xray">X-Ray</SelectItem>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-instructions">Instructions</Label>
          <Textarea
            id="order-instructions"
            data-testid="order-instructions"
            placeholder="Optional instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <Button
          type="button"
          data-testid="add-order-btn"
          disabled={submitting}
          onClick={() => void handleAdd()}
        >
          Add order
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-slate-500">No tests ordered this visit</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li
              key={order.id}
              data-testid="this-visit-order"
              className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3 text-sm"
            >
              <span className="font-medium uppercase text-slate-900">
                {order.type}
              </span>
              {order.instructions ? (
                <span className="text-slate-600">{order.instructions}</span>
              ) : null}
              <span className="text-slate-500">{order.status ?? "—"}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                data-testid="remove-order-btn"
                aria-label="Remove order"
                onClick={() => void handleRemove(order)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
