import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_HOME, type StaffRole } from "@light/shared-types";

/**
 * PLACEHOLDER role-routing middleware — replace with the team's version.
 *
 * Flow:
 *  1. Refresh Supabase session (cookie plumbing).
 *  2. Unauthenticated → /login (except public paths).
 *  3. Look up staff.role, block cross-role access, land role on its home.
 */

const PUBLIC_PATHS = ["/login", "/auth"];
const ROLE_PREFIXES: Record<string, StaffRole> = {
  "/reception": "reception",
  "/doctor": "doctor",
  "/diagnostics": "lab_tech",
  "/pharmacy": "pharmacist",
  "/admin": "admin",
};

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Resolve role from the staff table (RLS: staff read own row).
  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  const role = (staff as { role?: StaffRole } | null)?.role;
  if (!role) {
    // Authenticated but not staff (e.g. a patient) — send to login for now.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const home = ROLE_HOME[role];

  // Root or login → role home.
  if (path === "/" || isPublic) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Cross-role access → bounce to own home.
  const required = Object.entries(ROLE_PREFIXES).find(([prefix]) =>
    path.startsWith(prefix),
  )?.[1];
  if (required && required !== role) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}

export const config = {
  // Skip static assets and image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
