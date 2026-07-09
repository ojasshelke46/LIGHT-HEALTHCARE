/**
 * Patient display helpers shared across reception + doctor portals.
 */

/** Age in whole years from a `dob` (date string). Null on missing/invalid input. */
export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
