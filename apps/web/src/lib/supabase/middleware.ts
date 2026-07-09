import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import type { Database } from "@light/shared-types";

/**
 * Refreshes the Supabase auth session on every request and returns both the
 * response (with updated cookies) and the resolved user.
 *
 * The REAL role-routing middleware is pasted in separately by the team —
 * it should call this to hydrate the session, then read the `staff.role`
 * and redirect. This helper only handles session refresh + cookie plumbing.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession) revalidates the token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}
