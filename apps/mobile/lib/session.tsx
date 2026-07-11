import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type { Database } from "@light/shared-types";
import { supabase } from "@/lib/supabase";

type Patient = Database["public"]["Tables"]["patients"]["Row"];

type SessionContextValue = {
  session: Session | null;
  patient: Patient | null;
  loading: boolean;
  refreshPatient: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

/**
 * Auth + patient-row provider (D-49). Loads the current Supabase session,
 * subscribes to auth-state changes, and resolves the `patients` row bound
 * to the signed-in user (auth_user_id). `patient === null` while
 * `session !== null` signals "needs complete-profile" to the root gate.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  // Guards against a stale async patient-fetch overwriting state after a
  // newer auth event (sign-out then sign-in in quick succession).
  const fetchTokenRef = useRef(0);

  const fetchPatient = useCallback(async (userId: string) => {
    const token = ++fetchTokenRef.current;
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (fetchTokenRef.current === token) {
      setPatient(data ?? null);
    }
  }, []);

  const refreshPatient = useCallback(async () => {
    if (session?.user.id) {
      await fetchPatient(session.user.id);
    }
  }, [session?.user.id, fetchPatient]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        await fetchPatient(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        if (nextSession?.user.id) {
          await fetchPatient(nextSession.user.id);
        } else {
          setPatient(null);
        }
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchPatient]);

  return (
    <SessionContext.Provider
      value={{ session, patient, loading, refreshPatient }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within an AuthProvider");
  }
  return ctx;
}
