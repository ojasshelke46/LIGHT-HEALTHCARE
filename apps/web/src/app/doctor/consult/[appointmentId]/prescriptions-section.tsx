"use client";

/**
 * This-visit prescriptions (DOC-04, D-17/D-18/D-28) — a searchable medicine
 * combobox (client-side filter of the already-loaded `medicines` prop, so
 * the search text never reaches a PostgREST filter string — T-02-20) plus
 * dosage/duration/positive-integer-quantity, with immediate insert against
 * the real `visitId` and a removable this-visit list.
 *
 * Mirrors orders-section.tsx's load/add/remove pattern (optimistic remove
 * with rollback + sonner toast on failure; T-02-18 on RLS/permission
 * errors). Quantity is zod `int().positive()` (T-02-19) — protects the
 * Phase-3 dispense math from 0/negative/fractional inputs.
 */

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Medicine } from "./consult-client";

type VisitPrescription = {
  id: string;
  dosage: string | null;
  duration: string | null;
  quantity: number;
  status: string | null;
  medicines: { name: string } | null;
};

const schema = z.object({
  // Not `.uuid()`: the seed data's medicine ids are not RFC4122-conformant
  // (no version/variant nibbles), which zod's strict uuid() format rejects.
  // A non-empty check is sufficient here — the id always comes from the
  // already-fetched, trusted `medicines` array (never user-typed), so there
  // is no injection surface to additionally validate against (T-02-20/21).
  medicine_id: z.string().min(1, "Pick a medicine"),
  dosage: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be positive"),
});

export function PrescriptionsSection({
  visitId,
  patientId,
  medicines,
}: {
  visitId: string;
  patientId: string;
  medicines: Medicine[];
}) {
  const [prescriptions, setPrescriptions] = useState<VisitPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null,
  );
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    void supabase
      .from("prescriptions")
      .select("id, dosage, duration, quantity, status, medicines(name)")
      .eq("visit_id", visitId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("Could not load this visit's prescriptions");
          setLoading(false);
          return;
        }
        // Cast: PostgREST's TS overload resolution for multi-column, nested
        // .select() strings collapses to a generic-error shape here,
        // mirroring the workaround already used in src/lib/staff.ts.
        setPrescriptions((data as VisitPrescription[] | null) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visitId]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || selectedMedicine) return [];
    return medicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, medicines, selectedMedicine]);

  function selectMedicine(medicine: Medicine) {
    setSelectedMedicine(medicine);
    setSearch(medicine.name);
  }

  function clearMedicine() {
    setSelectedMedicine(null);
    setSearch("");
  }

  async function handleAdd() {
    setFieldError(null);
    const parsed = schema.safeParse({
      medicine_id: selectedMedicine?.id ?? "",
      dosage: dosage.trim() || undefined,
      duration: duration.trim() || undefined,
      quantity,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid prescription");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .insert({ visit_id: visitId, patient_id: patientId, medicine_id: parsed.data.medicine_id, dosage: parsed.data.dosage || null, duration: parsed.data.duration || null, quantity: parsed.data.quantity })
      .select("id, dosage, duration, quantity, status, medicines(name)")
      .single();
    setSubmitting(false);

    if (error || !data) {
      toast.error("Could not add prescription");
      return;
    }

    setPrescriptions((prev) => [...prev, data as VisitPrescription]);
    clearMedicine();
    setDosage("");
    setDuration("");
    setQuantity("");
  }

  async function handleRemove(prescription: VisitPrescription) {
    setPrescriptions((prev) => prev.filter((p) => p.id !== prescription.id));
    const supabase = createClient();
    const { error } = await supabase
      .from("prescriptions")
      .delete()
      .eq("id", prescription.id);

    if (error) {
      setPrescriptions((prev) =>
        [...prev, prescription].sort((a, b) => (a.id < b.id ? -1 : 1)),
      );
      toast.error("Could not remove prescription");
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Prescriptions</h3>

      <div className="space-y-3 rounded-md border border-slate-200 p-3">
        <div className="relative space-y-1.5" aria-expanded={matches.length > 0}>
          <Label htmlFor="medicine-search">Medicine</Label>
          <Input
            id="medicine-search"
            data-testid="medicine-search"
            placeholder="Search medicines…"
            autoComplete="off"
            value={search}
            onChange={(e) => {
              setSelectedMedicine(null);
              setSearch(e.target.value);
            }}
          />
          {matches.length > 0 ? (
            <ul
              role="listbox"
              aria-label="Medicine matches"
              className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border border-slate-200 bg-white shadow-sm"
            >
              {matches.map((m) => (
                <li key={m.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    data-testid={`medicine-option-${m.id}`}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100"
                    onClick={() => selectMedicine(m)}
                  >
                    <span className="text-slate-900">{m.name}</span>
                    <span className="text-xs text-slate-500">
                      {m.stock_qty ?? 0} {m.unit ?? ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedMedicine ? (
            <div className="flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {selectedMedicine.name}
              <button
                type="button"
                aria-label="Clear selected medicine"
                className="text-slate-500 hover:text-slate-900"
                onClick={clearMedicine}
              >
                ×
              </button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="prescription-dosage">Dosage</Label>
            <Input
              id="prescription-dosage"
              data-testid="prescription-dosage"
              placeholder="1-0-1"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prescription-duration">Duration</Label>
            <Input
              id="prescription-duration"
              data-testid="prescription-duration"
              placeholder="5 days"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prescription-quantity">Quantity</Label>
            <Input
              id="prescription-quantity"
              data-testid="prescription-quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        {fieldError ? (
          <p className="text-sm text-red-600" role="alert">
            {fieldError}
          </p>
        ) : null}

        <Button
          type="button"
          data-testid="add-prescription-btn"
          disabled={submitting}
          onClick={() => void handleAdd()}
        >
          Add prescription
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading prescriptions…</p>
      ) : prescriptions.length === 0 ? (
        <p className="text-sm text-slate-500">No prescriptions this visit</p>
      ) : (
        <ul className="space-y-2">
          {prescriptions.map((rx) => (
            <li
              key={rx.id}
              data-testid="this-visit-prescription"
              className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3 text-sm"
            >
              <span className="font-medium text-slate-900">
                {rx.medicines?.name ?? "—"}
              </span>
              <span className="text-slate-600">{rx.dosage ?? "—"}</span>
              <span className="text-slate-600">{rx.duration ?? "—"}</span>
              <span className="text-slate-500">Qty {rx.quantity}</span>
              <span className="text-slate-500">{rx.status ?? "—"}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                data-testid="remove-prescription-btn"
                aria-label="Remove prescription"
                onClick={() => void handleRemove(rx)}
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
