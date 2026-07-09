"use client";

/**
 * Doctor's all-patients browser (DOC-05, D-30).
 *
 * The patient set is server-scoped to this doctor's own visits (page.tsx);
 * search here is CLIENT-SIDE only on the already-fetched array — no
 * PostgREST filter, so there is no injection surface for the search term
 * (T-02-23).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { ageFromDob } from "@/lib/patient";
import { formatIST } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SeenPatient = {
  id: string;
  name: string;
  phone: string;
  dob: string | null;
  lastVisit: string;
};

export function DoctorPatientsClient({ patients }: { patients: SeenPatient[] }) {
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }, [patients, term]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">All Patients</h1>

      <div className="relative md:w-96">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          data-testid="doctor-patient-search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by name or phone…"
          aria-label="Search patients by name or phone"
          className="pl-9"
        />
      </div>

      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="You haven't seen any patients yet"
          description="Patients you've had a visit with will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients match"
          description="Try a different name or phone number."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Last visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const age = ageFromDob(p.dob);
              return (
                <TableRow key={p.id} data-testid={`doctor-patient-row-${p.id}`}>
                  <TableCell>
                    <Link
                      href={`/doctor/patients/${p.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{age ?? "—"}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>
                    {p.lastVisit ? formatIST(p.lastVisit, "date") : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
