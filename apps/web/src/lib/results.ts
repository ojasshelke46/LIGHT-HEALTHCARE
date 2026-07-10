/**
 * Result-file URL resolution (D-35).
 *
 * Order/prescription-adjacent result files live in the private `scan-results`
 * Storage bucket. `orders.result_url` stores either:
 *   - a legacy http(s) URL (seeded pre-Phase-3 rows) — used as-is, or
 *   - a Storage PATH (Phase-3 uploads) — resolved to a short-lived signed URL
 *     on demand, client-side, per click. Never precomputed or cached; TTL is
 *     fixed at 3600s (1 hour) per click.
 */

import { createClient } from "@/lib/supabase/client";

const HTTP_URL_RE = /^https?:\/\//i;

/**
 * Resolve a stored `result_url` (http(s) URL or Storage path) into an
 * openable URL. Returns null for missing input or a signing failure — the
 * caller shows a toast in that case.
 */
export async function getResultUrl(
  pathOrUrl: string | null,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (HTTP_URL_RE.test(pathOrUrl)) return pathOrUrl;

  const { data, error } = await createClient()
    .storage.from("scan-results")
    .createSignedUrl(pathOrUrl, 3600);

  return error ? null : (data?.signedUrl ?? null);
}
