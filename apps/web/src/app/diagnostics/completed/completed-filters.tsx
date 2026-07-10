"use client";

/**
 * Completed-orders date + type filter (DIAG-03, D-36).
 *
 * Pure URL-state client component: changing any control pushes
 * /diagnostics/completed?from=&to=&type= (empties omitted) and the server
 * page re-queries with istRangeFromDates + the type whitelist — same
 * pattern as pharmacy/dispensed/dispensed-filters.tsx (D-41). Defaults come
 * from the server-parsed searchParams so the controls stay in sync with the
 * URL across reloads.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "lab", label: "Lab" },
  { value: "ct", label: "CT" },
  { value: "mri", label: "MRI" },
  { value: "xray", label: "X-Ray" },
];

export function CompletedFilters({
  from,
  to,
  type,
}: {
  from?: string;
  to?: string;
  type?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(key: "from" | "to" | "type", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(qs ? `/diagnostics/completed?${qs}` : "/diagnostics/completed");
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="filter-from">From</Label>
        <Input
          id="filter-from"
          data-testid="filter-from"
          type="date"
          defaultValue={from ?? ""}
          aria-label="Filter completed from date"
          className="w-44"
          onChange={(e) => onChange("from", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-to">To</Label>
        <Input
          id="filter-to"
          data-testid="filter-to"
          type="date"
          defaultValue={to ?? ""}
          aria-label="Filter completed to date"
          className="w-44"
          onChange={(e) => onChange("to", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-type">Type</Label>
        <Select
          id="filter-type"
          data-testid="filter-type"
          defaultValue={type ?? ""}
          aria-label="Filter by order type"
          className="w-36"
          onChange={(e) => onChange("type", e.target.value)}
        >
          {TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
