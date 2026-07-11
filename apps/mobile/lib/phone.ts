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

  if (/^\+91\d{10}$/.test(stripped)) {
    return stripped;
  }

  if (/^\d{10}$/.test(stripped)) {
    return `+91${stripped}`;
  }

  return null;
}
