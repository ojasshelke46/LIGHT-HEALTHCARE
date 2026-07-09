"use client";

/**
 * Record-payment Sheet body (RECEP-06, D-25).
 *
 * zod-validated: amount must be a positive number (T-02-10), method is one
 * of cash/card/upi. Always inserted with status "paid" — reception collects
 * payment at the counter, so there is no separate pending-collection flow
 * in v1. Insert runs on the RLS-scoped anon client (T-02-11): any error
 * (including an RLS denial) surfaces as a generic toast rather than being
 * silently retried with elevated privileges.
 */

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

const schema = z.object({
  amount: z.coerce.number().positive("Enter a positive amount"),
  method: z.enum(["cash", "card", "upi"]),
});

type Method = "cash" | "card" | "upi";

export function PaymentForm({
  visitId,
  patientId,
  onRecorded,
}: {
  visitId: string;
  patientId: string;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("cash");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const parsed = schema.safeParse({ amount, method });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("payments").insert({
      visit_id: visitId,
      patient_id: patientId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      status: "paid",
    });
    setLoading(false);

    if (error) {
      toast.error("Could not record payment");
      return;
    }

    toast.success("Payment recorded");
    onRecorded();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex h-full flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Record payment</h2>

      <div className="space-y-1.5">
        <Label htmlFor="payment-amount">Amount</Label>
        <Input
          id="payment-amount"
          data-testid="payment-amount"
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payment-method">Method</Label>
        <Select
          id="payment-method"
          data-testid="payment-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
        >
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="card">Card</SelectItem>
          <SelectItem value="upi">UPI</SelectItem>
        </Select>
      </div>

      {fieldError && (
        <p className="text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}

      <Button
        type="submit"
        data-testid="payment-submit"
        disabled={loading}
        className="mt-auto w-full"
      >
        {loading ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}
