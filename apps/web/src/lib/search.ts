/**
 * Search-term sanitization for PostgREST `.or()` ilike filters (D-23, T-02-07).
 */

/** Strip characters that have meaning in PostgREST filter syntax so user
 *  input cannot break out of an ilike pattern or inject extra OR conditions. */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()*%\\]/g, "").trim().slice(0, 40);
}
