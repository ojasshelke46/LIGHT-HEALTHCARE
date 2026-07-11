/**
 * Pure booking helpers (MOB-02, D-51). No react-native or supabase imports —
 * this file runs under vitest in a plain node environment (same pattern as
 * lib/phone.ts).
 */

/** Wizard stages for the single-screen staged booking flow (D-51). */
export type BookingStage = "dept" | "doctor" | "slot" | "confirm" | "success";

/**
 * Keep only slots that are explicitly free (`is_booked === false` — a null
 * flag is NOT treated as free) and not in the past (`slot_time >= now`),
 * sorted ascending by slot_time. Never mutates the input array.
 *
 * Belt-and-suspenders on top of the server-side query filters: the slot
 * list can go stale between fetch and render, and the atomic
 * book_appointment RPC remains the sole booking authority either way.
 */
export function filterFreeFutureSlots<
  T extends { id: string; slot_time: string; is_booked: boolean | null },
>(slots: T[], now: Date): T[] {
  return slots
    .filter(
      (s) =>
        s.is_booked === false &&
        new Date(s.slot_time).getTime() >= now.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime(),
    );
}
