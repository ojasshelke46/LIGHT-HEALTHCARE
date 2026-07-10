"use client";

/**
 * Dispensed-history date-range filter (PHARM-04, D-41).
 *
 * Pure URL-state client component: changing either date input pushes
 * /pharmacy/dispensed?from=&to= (empties omitted) and the server page
 * re-queries with IST day bounds via istRangeFromDates — same pattern as
 * the diagnostics completed-page filter spec (D-36). Defaults come from
 * the server-parsed searchParams so the inputs survive a reload.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DispensedFilters({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `/pharmacy/dispensed?${qs}` : "/pharmacy/dispensed");
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="disp-from">From</Label>
        <Input
          id="disp-from"
          data-testid="disp-from"
          type="date"
          defaultValue={from ?? ""}
          aria-label="Filter dispensed from date"
          className="w-44"
          onChange={(e) => onChange("from", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="disp-to">To</Label>
        <Input
          id="disp-to"
          data-testid="disp-to"
          type="date"
          defaultValue={to ?? ""}
          aria-label="Filter dispensed to date"
          className="w-44"
          onChange={(e) => onChange("to", e.target.value)}
        />
      </div>
    </div>
  );
}
