"use client";

/**
 * Register-patient Sheet body (RECEP-05, D-23).
 *
 * zod-validated: name + phone required (10-digit Indian phone), dob/email/
 * address/abha_id optional. A unique-violation on phone (23505) surfaces as
 * a friendly toast rather than the raw DB error (T-02-09 — insert stays on
 * the RLS-scoped anon client; any RLS error is a distinct, non-friendly
 * toast so a real permission problem isn't mistaken for a duplicate phone).
 */

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number"),
  dob: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  abha_id: z.string().optional(),
});

type FormState = {
  name: string;
  phone: string;
  dob: string;
  email: string;
  address: string;
  abha_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  dob: "",
  email: "",
  address: "",
  abha_id: "",
};

export function RegisterForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("patients")
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        dob: parsed.data.dob || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        abha_id: parsed.data.abha_id || null,
      })
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        toast.error("A patient with this phone already exists");
      } else {
        toast.error("Could not register patient");
      }
      return;
    }

    toast.success("Patient registered");
    setForm(EMPTY_FORM);
    onCreated(data.id);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex h-full flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Register patient</h2>

      <div className="space-y-1.5">
        <Label htmlFor="register-name">Name</Label>
        <Input
          id="register-name"
          data-testid="register-name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-phone">Phone</Label>
        <Input
          id="register-phone"
          data-testid="register-phone"
          inputMode="numeric"
          placeholder="10-digit number"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-dob">Date of birth</Label>
        <Input
          id="register-dob"
          type="date"
          value={form.dob}
          onChange={(e) => update("dob", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-address">Address</Label>
        <Input
          id="register-address"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-abha">ABHA ID</Label>
        <Input
          id="register-abha"
          value={form.abha_id}
          onChange={(e) => update("abha_id", e.target.value)}
        />
      </div>

      {fieldError && (
        <p className="text-sm text-red-600" role="alert">
          {fieldError}
        </p>
      )}

      <Button
        type="submit"
        data-testid="register-submit"
        disabled={loading}
        className="mt-auto w-full"
      >
        {loading ? "Registering…" : "Register patient"}
      </Button>
    </form>
  );
}
