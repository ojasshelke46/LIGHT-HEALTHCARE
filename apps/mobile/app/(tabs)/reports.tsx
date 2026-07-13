/**
 * Reports tab (MOB-04, D-53): the patient's visit history grouped by IST
 * calendar date, each visit showing diagnosis/notes, test orders with an
 * openable (signed-URL) result file, and prescriptions with medicine names.
 *
 * Nested PostgREST embed (visits -> orders + prescriptions(medicine)) is
 * RLS-scoped to the signed-in patient (T-04-08) — the explicit
 * `.eq("patient_id", ...)` filter is defensive, not the enforcement
 * boundary. Refetches on mount + screen focus (D-53 focus-refetch, no
 * realtime).
 */

import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { formatIST } from "@/lib/format";
import { EmptyState, ErrorState, Screen, Skeleton } from "@/components/ui";
import {
  ReportVisitGroup,
  type VisitWithDetails,
} from "@/components/ReportVisitGroup";

export default function ReportsScreen() {
  const { patient } = useSession();
  const patientId = patient?.id ?? null;

  const [visits, setVisits] = useState<VisitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    if (!patientId) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("visits")
      .select(
        "id, created_at, completed_at, diagnosis, notes, chief_complaint, " +
          "orders(id, type, status, instructions, result_url, result_notes), " +
          "prescriptions(id, dosage, duration, quantity, status, medicine:medicines(name))",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Couldn't load your reports.");
    } else {
      // Fetcher-cast pattern (see appointments.tsx / index.tsx): nested
      // embed select strings collapse PostgREST's TS inference. This
      // query nests three levels deep (visits -> orders/prescriptions ->
      // medicine), which collapses further to a literal GenericStringError
      // shape that TS refuses to cast directly — route through `unknown`
      // first, same escape hatch already used repo-wide for this quirk.
      setVisits((data as unknown as VisitWithDetails[] | null) ?? []);
    }
    setLoading(false);
  }, [patientId]);

  // Fires on mount AND every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      void fetchVisits();
    }, [fetchVisits]),
  );

  const retry = useCallback(() => {
    setLoading(true);
    void fetchVisits();
  }, [fetchVisits]);

  // Group visits by IST calendar date (D-53) — one section per date,
  // preserving the already-descending created_at order within and across
  // groups.
  const groups = useMemo(() => {
    const byDate = new Map<string, VisitWithDetails[]>();
    for (const visit of visits) {
      const key = visit.created_at
        ? formatIST(visit.created_at, "date")
        : "Unknown date";
      const bucket = byDate.get(key);
      if (bucket) bucket.push(visit);
      else byDate.set(key, [visit]);
    }
    return Array.from(byDate.entries());
  }, [visits]);

  return (
    <Screen>
      <Text className="mb-4 text-2xl font-bold text-slate-900">Reports</Text>

      {loading ? (
        <View className="gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No visit reports yet"
          hint="Your visit history will appear here after your first consultation."
        />
      ) : (
        <ScrollView
          contentContainerClassName="gap-4 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {groups.map(([date, dateVisits]) => (
            <View key={date} className="gap-2">
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {date}
              </Text>
              <View className="gap-3">
                {dateVisits.map((visit) => (
                  <ReportVisitGroup key={visit.id} visit={visit} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
