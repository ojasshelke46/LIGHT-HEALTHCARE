"use client";

/**
 * Single shared realtime-list primitive for the phase (D-15/D-16).
 *
 * Given a typed fetcher (a joined Supabase select) and the table(s) to
 * watch, this hook fetches once on mount, then refetches (never patches
 * in place — rows carry joined data events don't include) whenever ANY
 * insert/update/delete fires on the watched tables. It is resilient to
 * Realtime dropouts: on CHANNEL_ERROR/TIMED_OUT/CLOSED it tears the
 * channel down and resubscribes with exponential backoff (capped at
 * 30s), and it refetches whenever the tab regains visibility.
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 300;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export interface RealtimeListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  connected: boolean;
}

export type ListFetcher<T> = () => Promise<{
  data: T[] | null;
  error: { message: string } | null;
}>;

export function useRealtimeList<T>(
  fetcher: ListFetcher<T>,
  tables: string[],
): RealtimeListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Always call the *latest* fetcher without re-subscribing the realtime
  // channel when the caller passes a new inline function each render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  // Bump this to force the subscription effect to tear down + resubscribe.
  const [reconnectTick, setReconnectTick] = useState(0);

  const tableKey = tables.join(",");

  useEffect(() => {
    let cancelled = false;

    async function runFetch() {
      const { data: rows, error: fetchError } = await fetcherRef.current();
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setData(rows ?? []);
        setError(null);
      }
      setLoading(false);
    }

    function debouncedRefetch() {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        void runFetch();
      }, DEBOUNCE_MS);
    }

    const supabase = supabaseRef.current!;
    const channel = supabase.channel(`realtime-${tableKey}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        debouncedRefetch,
      );
    }

    function reconnect() {
      if (cancelled) return;
      setReconnectTick((n) => n + 1);
    }

    channel.subscribe((status: string) => {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        setConnected(true);
        backoffRef.current = INITIAL_BACKOFF_MS;
        void runFetch();
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setConnected(false);
        supabase.removeChannel(channel);
        const delay = backoffRef.current;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(reconnect, delay);
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      }
    });

    // Initial fetch on mount / resubscribe.
    void runFetch();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void runFetch();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, reconnectTick]);

  function refetch() {
    void (async () => {
      const { data: rows, error: fetchError } = await fetcherRef.current();
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setData(rows ?? []);
        setError(null);
      }
      setLoading(false);
    })();
  }

  return { data, loading, error, refetch, connected };
}
