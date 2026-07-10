"use client";

/**
 * Single in-progress-order row: upload a result file and/or notes, then
 * Mark Complete (DIAG-02, D-34).
 *
 * File goes to the private `scan-results` Storage bucket at
 * `orders/{orderId}/{timestamp}-{sanitized-filename}` (T-03-05: filename
 * sanitized + namespaced so a crafted name can't escape the order's
 * prefix). Only the Storage PATH is written to orders.result_url — never
 * a public URL (T-03-06); reads resolve it via getResultUrl (D-35).
 *
 * Complete requires a file OR notes (zod-checked, inline role="alert").
 * The 20MB client-side size cap is a UX guard only — the authoritative
 * boundary is the deployed scan-results insert policy (T-03-04).
 *
 * Mark Complete optimistically hides the row (mirrors ../pending-row.tsx)
 * before awaiting the upload/update round-trip; a failed step un-hides it
 * and shows a toast.
 */

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatIST } from "@/lib/format";
import { ORDER_STATUS_BADGE, ORDER_TYPE_ICON } from "@/lib/status";
import type { InProgressOrder } from "./in-progress-client";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const schema = z
  .object({
    hasFile: z.boolean(),
    notes: z.string().optional(),
  })
  .refine((d) => d.hasFile || (d.notes?.trim().length ?? 0) > 0, {
    message: "Add a result file or result notes",
  });

export function InProgressRow({
  row,
  onChanged,
}: {
  row: InProgressOrder;
  onChanged: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (hidden) return null;

  const Icon = ORDER_TYPE_ICON[row.type];
  const badge = ORDER_STATUS_BADGE.in_progress;
  const doctorName = row.visits?.doctors?.staff?.name ?? "—";

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_BYTES) {
      toast.error("File must be 20MB or smaller");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function handleComplete() {
    setFieldError(null);
    const parsed = schema.safeParse({ hasFile: !!file, notes });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    setHidden(true);
    const supabase = createClient();

    let path: string | null = null;
    if (file) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      path = `orders/${row.id}/${Date.now()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from("scan-results").upload(path, file);
      if (uploadError) {
        setSubmitting(false);
        setHidden(false);
        toast.error("Upload failed");
        return;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({
        result_url: path ?? null,
        result_notes: notes.trim() || null,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    setSubmitting(false);

    if (error) {
      setHidden(false);
      toast.error("Could not mark complete — try again");
      return;
    }
    toast.success("Marked complete");
    onChanged();
  }

  return (
    <div
      data-testid={`in-progress-row-${row.id}`}
      className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 text-slate-500" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900">
              {row.patients?.name ?? "—"}
            </span>
            <span className="text-sm text-slate-500">
              Dr. {doctorName}
              {row.ordered_at
                ? ` · ${formatIST(row.ordered_at, "datetime")}`
                : ""}
            </span>
            {row.instructions ? (
              <span className="text-sm text-slate-600">
                {row.instructions}
              </span>
            ) : null}
          </div>
        </div>
        <Badge className={badge.className}>{badge.label}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor={`result-file-${row.id}`}
            className="text-sm font-medium text-slate-700"
          >
            Result file
          </label>
          <input
            id={`result-file-${row.id}`}
            data-testid="result-file"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={submitting}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800 disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`result-notes-${row.id}`}
            className="text-sm font-medium text-slate-700"
          >
            Result notes
          </label>
          <Textarea
            id={`result-notes-${row.id}`}
            data-testid="result-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            placeholder="Findings, reference range, remarks…"
            className="min-h-[40px]"
          />
        </div>
      </div>

      {fieldError && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          data-testid="complete-btn"
          disabled={submitting}
          onClick={() => void handleComplete()}
        >
          {submitting ? "Completing…" : "Mark Complete"}
        </Button>
      </div>
    </div>
  );
}
