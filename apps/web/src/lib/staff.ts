import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@light/shared-types";

export type StaffIdentity = { id: string; name: string; role: StaffRole };

/**
 * Server-only staff identity read (D-07). Revalidates the session via
 * `getUser()` (not `getSession()`), then reads the caller's own `staff`
 * row. Never returns null — redirects to /login if there is no signed-in
 * user or no matching staff row.
 */
export async function getStaff(): Promise<StaffIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("staff")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single();

  // Cast: PostgREST's TS overload resolution for multi-column .select()
  // strings collapses to a generic-error shape here, mirroring the same
  // workaround already used in src/middleware.ts for this table.
  const staffRow = data as StaffIdentity | null;
  if (!staffRow) redirect("/login");

  return { id: staffRow.id, name: staffRow.name, role: staffRow.role };
}
