"use client";

/**
 * Reception patient registry (RECEP-04 search, RECEP-05 register).
 *
 * Server-side search only (D-23, T-02-07): the raw query is sanitized via
 * sanitizeSearchTerm before interpolation into a PostgREST `.or()` ilike
 * filter, debounced 300ms, capped at 50 rows.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeSearchTerm } from "@/lib/search";
import { ageFromDob } from "@/lib/patient";
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
import { RegisterForm } from "./register-form";

export type PatientHit = {
  id: string;
  name: string;
  phone: string;
  abha_id: string | null;
  dob: string | null;
};

export function PatientsClient() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Debounce raw input -> the term that actually drives the query (300ms).
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const safe = sanitizeSearchTerm(debouncedTerm);
    if (!safe) {
      setResults([]);
      setError(null);
      setSearched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("patients")
        .select("id, name, phone, abha_id, dob")
        .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,abha_id.ilike.%${safe}%`)
        .limit(50);

      if (cancelled) return;
      const hits = data as PatientHit[] | null;
      if (queryError) {
        setError(queryError.message);
      } else {
        setResults(hits ?? []);
      }
      setSearched(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedTerm]);

  function handleCreated(id: string) {
    setSheetOpen(false);
    router.push(`/reception/patients/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
        <Button
          type="button"
          data-testid="register-open"
          onClick={() => setSheetOpen(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Register patient
        </Button>
      </div>

      <div className="relative md:w-96">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          data-testid="patient-search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name, phone, or ABHA…"
          aria-label="Search patients by name, phone, or ABHA"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Searching patients">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p role="alert">{error}</p>
        </div>
      ) : !searched ? (
        <EmptyState
          icon={Users}
          title="Search for a patient"
          description="Search by name, phone, or ABHA to find an existing patient."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients match"
          description="Try a different name, phone number, or ABHA ID."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>ABHA</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((p) => (
              <TableRow key={p.id} data-testid={`patient-row-${p.id}`}>
                <TableCell>
                  <Link
                    href={`/reception/patients/${p.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.abha_id ?? "—"}</TableCell>
                <TableCell>{ageFromDob(p.dob) ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} side="right" label="Register patient">
        <RegisterForm onCreated={handleCreated} />
      </Sheet>
    </div>
  );
}
