import { describe, expect, it } from "vitest";
import { filterFreeFutureSlots } from "./booking";

const NOW = new Date("2026-07-12T10:00:00.000Z");

function slot(
  id: string,
  slot_time: string,
  is_booked: boolean | null,
): { id: string; slot_time: string; is_booked: boolean | null } {
  return { id, slot_time, is_booked };
}

describe("filterFreeFutureSlots", () => {
  it("returns [] for an empty list", () => {
    expect(filterFreeFutureSlots([], NOW)).toEqual([]);
  });

  it("excludes a past free slot", () => {
    const slots = [slot("past", "2026-07-12T09:00:00.000Z", false)];
    expect(filterFreeFutureSlots(slots, NOW)).toEqual([]);
  });

  it("excludes a future booked slot", () => {
    const slots = [slot("taken", "2026-07-12T11:00:00.000Z", true)];
    expect(filterFreeFutureSlots(slots, NOW)).toEqual([]);
  });

  it("excludes a future slot with is_booked null (only explicitly free kept)", () => {
    const slots = [slot("unknown", "2026-07-12T11:00:00.000Z", null)];
    expect(filterFreeFutureSlots(slots, NOW)).toEqual([]);
  });

  it("keeps a slot exactly at now (>= boundary)", () => {
    const slots = [slot("boundary", "2026-07-12T10:00:00.000Z", false)];
    expect(filterFreeFutureSlots(slots, NOW).map((s) => s.id)).toEqual([
      "boundary",
    ]);
  });

  it("keeps only free future slots, sorted ascending by slot_time", () => {
    const slots = [
      slot("late", "2026-07-13T11:00:00.000Z", false),
      slot("past", "2026-07-11T10:00:00.000Z", false),
      slot("early", "2026-07-12T11:00:00.000Z", false),
      slot("taken", "2026-07-12T12:00:00.000Z", true),
      slot("mid", "2026-07-13T04:30:00.000Z", false),
    ];
    expect(filterFreeFutureSlots(slots, NOW).map((s) => s.id)).toEqual([
      "early",
      "mid",
      "late",
    ]);
  });

  it("does not mutate the input array", () => {
    const slots = [
      slot("b", "2026-07-13T11:00:00.000Z", false),
      slot("a", "2026-07-12T11:00:00.000Z", false),
    ];
    const copy = [...slots];
    filterFreeFutureSlots(slots, NOW);
    expect(slots).toEqual(copy);
  });
});
