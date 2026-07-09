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
