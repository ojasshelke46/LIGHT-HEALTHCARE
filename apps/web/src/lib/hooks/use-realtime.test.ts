import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

/**
 * Behavior under test (Phase 2, D-15/D-16):
 *  - Fetch once on mount, expose { data, loading:false } after resolution.
 *  - postgres_changes events refetch after a 300ms debounce (collapsed).
 *  - CHANNEL_ERROR/TIMED_OUT/CLOSED -> connected=false + backoff resubscribe
 *    (1s -> 2s -> ... capped at 30s).
 *  - document visibilitychange back to 'visible' triggers a refetch.
 *  - A fetcher error sets `error` to the message string, keeps prior data.
 */

interface ChangeListener {
  table: string;
  cb: () => void;
}

interface MockChannel {
  on: (
    event: string,
    filter: { event: string; schema: string; table: string },
    callback: () => void,
  ) => MockChannel;
  subscribe: (callback: (status: string) => void) => MockChannel;
  triggerChange: (table: string) => void;
  triggerStatus: (status: string) => void;
}

const mockState = vi.hoisted(() => ({
  channels: [] as MockChannel[],
  channelNames: [] as string[],
  removeChannel: vi.fn(),
}));

function makeMockChannel(): MockChannel {
  const listeners: ChangeListener[] = [];
  let statusCb: ((status: string) => void) | undefined;
  const channel: MockChannel = {
    on: (_event, filter, cb) => {
      listeners.push({ table: filter.table, cb });
      return channel;
    },
    subscribe: (cb) => {
      statusCb = cb;
      return channel;
    },
    triggerChange: (table) => {
      listeners.filter((l) => l.table === table).forEach((l) => l.cb());
    },
    triggerStatus: (status) => statusCb?.(status),
  };
  return channel;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string) => {
      mockState.channelNames.push(name);
      const ch = makeMockChannel();
      mockState.channels.push(ch);
      return ch;
    },
    removeChannel: mockState.removeChannel,
  }),
}));

const { useRealtimeList } = await import("./use-realtime");

interface Row {
  id: string;
  name: string;
}

async function flush() {
  await vi.runAllTimersAsync();
}

beforeEach(() => {
  mockState.channels.length = 0;
  mockState.channelNames.length = 0;
  mockState.removeChannel.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRealtimeList", () => {
  it("fetches once on mount and exposes data with loading:false", async () => {
    const rows: Row[] = [{ id: "1", name: "a" }];
    const fetcher = vi.fn(async () => ({ data: rows, error: null }));

    const { result } = renderHook(() => useRealtimeList(fetcher, ["appointments"]));
    expect(result.current.loading).toBe(true);

    await act(flush);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(rows);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("debounces rapid postgres_changes events into a single refetch", async () => {
    const fetcher = vi.fn(async () => ({ data: [] as Row[], error: null }));
    renderHook(() => useRealtimeList(fetcher, ["appointments"]));
    await act(flush);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const channel = mockState.channels[0]!;
    act(() => {
      channel.triggerChange("appointments");
      channel.triggerChange("appointments");
      channel.triggerChange("appointments");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("sets connected=false on CHANNEL_ERROR and resubscribes with growing, capped backoff", async () => {
    const fetcher = vi.fn(async () => ({ data: [] as Row[], error: null }));
    const { result } = renderHook(() => useRealtimeList(fetcher, ["appointments"]));
    await act(flush);

    const firstChannel = mockState.channels[0]!;
    act(() => firstChannel.triggerStatus("SUBSCRIBED"));
    expect(result.current.connected).toBe(true);

    act(() => firstChannel.triggerStatus("CHANNEL_ERROR"));
    expect(result.current.connected).toBe(false);
    expect(mockState.removeChannel).toHaveBeenCalledWith(firstChannel);

    // first backoff ~1s: no reconnect before then
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(mockState.channels.length).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(mockState.channels.length).toBe(2);

    // second backoff should have doubled to ~2s
    const secondChannel = mockState.channels[1]!;
    act(() => secondChannel.triggerStatus("TIMED_OUT"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(mockState.channels.length).toBe(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(mockState.channels.length).toBe(3);
  });

  it("refetches when the tab becomes visible again", async () => {
    const fetcher = vi.fn(async () => ({ data: [] as Row[], error: null }));
    renderHook(() => useRealtimeList(fetcher, ["appointments"]));
    await act(flush);
    expect(fetcher).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await flush();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("sets error to the message string and keeps prior data on fetch failure", async () => {
    const rows: Row[] = [{ id: "1", name: "a" }];
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: rows, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } });

    const { result } = renderHook(() => useRealtimeList(fetcher, ["appointments"]));
    await act(flush);
    expect(result.current.data).toEqual(rows);

    act(() => {
      result.current.refetch();
    });
    await act(flush);

    expect(result.current.error).toBe("boom");
    expect(result.current.data).toEqual(rows);
  });
});
