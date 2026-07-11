"use client";

/**
 * Add-medicine Sheet body (PHARM-03, D-40).
 *
 * zod-validated: name required, stock/threshold non-negative integers, unit
 * defaults to "tablet", price non-negative with at most two decimal places.
 * Insert runs on the RLS-scoped anon client (T-03-13/T-03-14): the deployed
 * pharmacist-only policy (medicines_pharmacist_all) is the sole write path —
 * any error (including an RLS denial) surfaces as a generic toast rather
 * than being silently retried with elevated privileges.
 */

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  stock_qty: z.coerce.number().int("Whole number").min(0),
  unit: z.string().min(1).default("tablet"),
  // String-based decimal check — float math (n*100) misrejects values like
  // 19.99 whose binary representation isn't exact.
  unit_price: z.coerce
    .number()
    .min(0)
    .refine((n) => /^\d+(\.\d{1,2})?$/.test(String(n)), "Max two decimals"),
  low_stock_threshold: z.coerce.number().int().min(0),
});

export function AddMedicineForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [unit, setUnit] = useState("tablet");
  const [unitPrice, setUnitPrice] = useState("");
  const [threshold, setThreshold] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const parsed = schema.safeParse({
      name,
      stock_qty: stockQty,
      unit,
      unit_price: unitPrice,
      low_stock_threshold: threshold,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("medicines").insert(parsed.data);
    setLoading(false);

    if (error) {
      toast.error("Could not add medicine");
      return;
    }
    toast.success("Medicine added");
    onAdded();
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex h-full flex-col gap-4 p-6"
    >
      <h2 className="text-lg font-semibold text-slate-900">Add medicine</h2>

      <div className="space-y-1.5">
        <Label htmlFor="add-name">Name</Label>
        <Input
          id="add-name"
          data-testid="add-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-stock">Stock</Label>
        <Input
          id="add-stock"
          data-testid="add-stock"
          type="number"
          min={0}
          step={1}
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-unit">Unit</Label>
        <Input
          id="add-unit"
          data-testid="add-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-price">Price</Label>
        <Input
          id="add-price"
          data-testid="add-price"
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-threshold">Low-stock threshold</Label>
        <Input
          id="add-threshold"
          data-testid="add-threshold"
          type="number"
          min={0}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </div>

      {fieldError && (
        <p className="text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}

      <Button
        type="submit"
        data-testid="add-submit"
        disabled={loading}
        className="mt-auto w-full"
      >
        {loading ? "Adding…" : "Add medicine"}
      </Button>
    </form>
  );
}
