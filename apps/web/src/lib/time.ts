/**
 * IST (Asia/Kolkata) day-bound helpers for slot_time gte/lt filters (D-19).
 * IST is a fixed UTC+5:30 offset with no DST, so a constant offset is safe.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Start (inclusive) / end (exclusive) ISO instants for "today" in IST. */
export function todayISTRange(): { startISO: string; endISO: string } {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const startUTC = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) -
      IST_OFFSET_MS,
  );
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
  return { startISO: startUTC.toISOString(), endISO: endUTC.toISOString() };
}

/** Start-of-IST-day UTC instant for a YYYY-MM-DD date-input value. */
function istDayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) - IST_OFFSET_MS);
}

/**
 * IST day-bound range for `from`/`to` date-input values (D-36/D-41). Used by
 * completed-orders / dispensed-prescriptions date-range filters.
 *
 * - `startISO`: start (inclusive) of the `from` IST day, or null if absent.
 * - `endISO`: start (exclusive) of the IST day AFTER `to`, or null if absent.
 *
 * Callers apply only the bounds that are non-null.
 */
export function istRangeFromDates(
  from?: string | null,
  to?: string | null,
): { startISO: string | null; endISO: string | null } {
  const startISO = from ? istDayStart(from).toISOString() : null;
  const endISO = to
    ? new Date(istDayStart(to).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;
  return { startISO, endISO };
}
