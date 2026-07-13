/**
 * Indian mobile phone normalization (D-48). Pure — no RN import so this
 * runs under vitest in a plain node environment.
 *
 * Accepts a bare 10-digit local number or an already `+91`-prefixed number
 * (spaces/dashes stripped first). Anything else (wrong length, non-digits)
 * returns null so the caller can show an inline validation error.
 */
export function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s-]/g, "");

  // Indian mobile numbers start with 6-9.
  if (/^\+91[6-9]\d{9}$/.test(stripped)) {
    return stripped;
  }

  if (/^[6-9]\d{9}$/.test(stripped)) {
    return `+91${stripped}`;
  }

  return null;
}
