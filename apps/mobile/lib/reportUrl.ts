/**
 * Result-file URL resolver (D-53) — PURE, dependency-injected so it runs
 * under vitest in plain node (no react-native/supabase import; same pattern
 * as lib/booking.ts and lib/phone.ts).
 *
 * Mirrors apps/web/src/lib/results.ts's getResultUrl rule: `result_url` is
 * EITHER a legacy http(s) URL (used as-is) OR a Storage path in the private
 * "scan-results" bucket (resolved via an injected signer, which the Task-3
 * caller implements as `storage.from("scan-results").createSignedUrl(path,
 * 3600)`). Keeping the actual Storage call outside this module is what
 * keeps it pure and node-testable.
 */

const HTTP_URL_RE = /^https?:\/\//i;

/** True for a legacy http(s) URL; false for a Storage path. */
export function isHttpUrl(s: string): boolean {
  return HTTP_URL_RE.test(s);
}

/**
 * Resolve a stored `result_url` (http(s) URL or Storage path) into an
 * openable URL via an injected signer. Returns null for missing input, a
 * signer that resolves to null, or a signer that throws — the caller shows
 * a toast/alert in that case.
 */
export async function resolveResultUrl(
  pathOrUrl: string | null,
  signer: (path: string) => Promise<string | null>,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  try {
    return await signer(pathOrUrl);
  } catch {
    return null;
  }
}
