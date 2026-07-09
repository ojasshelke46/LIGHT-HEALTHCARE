"use client";

/**
 * Reception live queue (RECEP-01/RECEP-03, D-19/D-20).
 *
 * Owns { data, loading, error, connected } via useRealtimeList (D-13
 * convention) and derives status tabs, name/phone search, and stats
 * client-side from the same fetched today-set (small n per D-20).
 */

import { useCallback, useMemo, useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeList } from "@/lib/hooks/use-realtime";
import { todayISTRange } from "@/lib/time";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { QueueRow } from "./queue-row";
import type { AppointmentStatus } from "@light/shared-types";

export type QueueAppointment = {
  id: string;
  slot_time: string;
  status: AppointmentStatus | null;
  patient_id: string;
  doctor_id: string;
  patients: { name: string; phone: string } | null;
  doctors: { id: string; staff: { name: string } | null } | null;
};

type StatusTab =
  | "all"
  | "booked"
  | "checked_in"
  | "in_consultation"
  | "completed";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "booked", label: "Booked" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_consultation", label: "In Consultation" },
  { value: "completed", label: "Completed" },
];

export function QueueClient() {
  // Computed once — the queue is scoped to "today" for the lifetime of the page.
  const { startISO, endISO } = useMemo(() => todayISTRange(), []);
  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");

  const fetcher = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, slot_time, status, patient_id, doctor_id, patients(name, phone), doctors(id, staff(name))",
      )
      .gte("slot_time", startISO)
      .lt("slot_time", endISO)
      .order("slot_time", { ascending: true });

    // Cast: PostgREST's TS overload resolution for multi-column, nested
    // .select() strings collapses to a generic-error shape here, mirroring
    // the workaround already used in src/lib/staff.ts for the same quirk.
    return { data: data as QueueAppointment[] | null, error };
  }, [startISO, endISO]);

  const { data, loading, error, refetch, connected } =
    useRealtimeList<QueueAppointment>(fetcher, ["appointments"]);

  const stats = useMemo(() => {
    const total = data.length;
    const checkedIn = data.filter((row) => row.status === "checked_in").length;
    // D-20: "waiting" reuses the checked-in count (no separate waiting state yet).
    const waiting = checkedIn;
    const completed = data.filter((row) => row.status === "completed").length;
    return { total, checkedIn, waiting, completed };
  }, [data]);

  const filteredRows = useMemo(() => {
    let rows = data;
    if (tab !== "all") {
      rows = rows.filter((row) => row.status === tab);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter((row) => {
        const name = row.patients?.name?.toLowerCase() ?? "";
        const phone = row.patients?.phone ?? "";
        return name.includes(query) || phone.includes(query);
      });
    }
    return rows;
  }, [data, tab, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">
          Today&apos;s Queue
        </h1>
        <span
          aria-live="polite"
          className="text-xs font-medium text-slate-500"
        >
          {connected ? "● Live" : "Reconnecting…"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Today
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">
            {stats.total}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Checked In
            </CardTitle>
          </CardHeader>
          <CardContent
            data-testid="stat-checked-in"
            className="text-2xl font-semibold text-slate-900"
          >
            {stats.checkedIn}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Waiting
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">
            {stats.waiting}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">
            {stats.completed}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)}>
          <TabsList>
            {STATUS_TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative md:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            aria-label="Search patients by name or phone"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading queue">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p role="alert">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={refetch}
          >
            Retry
          </Button>
        </div>
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No appointments today"
          description="Booked appointments for today will show up here as they come in."
        />
      ) : (
        <div className="space-y-2">
          {filteredRows.map((row) => (
            <QueueRow key={row.id} row={row} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
