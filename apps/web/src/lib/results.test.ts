import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavior under test (Phase 3, D-35):
 *  - http(s) URLs pass through unchanged (legacy seeded rows) — no Storage call.
 *  - null/empty input resolves to null.
 *  - Storage paths call createSignedUrl(path, 3600) and resolve to signedUrl.
 *  - createSignedUrl error resolves to null (caller shows a toast).
 */

const mockState = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, ttl: number) =>
          mockState.createSignedUrl(bucket, path, ttl),
      }),
    },
  }),
}));

const { getResultUrl } = await import("./results");

beforeEach(() => {
  mockState.createSignedUrl.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getResultUrl", () => {
  it("passes https URLs through unchanged without calling Storage", async () => {
    const url = await getResultUrl("https://example.com/r.pdf");
    expect(url).toBe("https://example.com/r.pdf");
    expect(mockState.createSignedUrl).not.toHaveBeenCalled();
  });

  it("passes http URLs through unchanged without calling Storage", async () => {
    const url = await getResultUrl("http://x/y");
    expect(url).toBe("http://x/y");
    expect(mockState.createSignedUrl).not.toHaveBeenCalled();
  });

  it("resolves null for a null input", async () => {
    const url = await getResultUrl(null);
    expect(url).toBeNull();
    expect(mockState.createSignedUrl).not.toHaveBeenCalled();
  });

  it("resolves null for an empty string input", async () => {
    const url = await getResultUrl("");
    expect(url).toBeNull();
    expect(mockState.createSignedUrl).not.toHaveBeenCalled();
  });

  it("signs a Storage path against the scan-results bucket with a 3600s TTL", async () => {
    mockState.createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: "https://signed.example.com/orders/abc/123-scan.png?token=xyz" },
      error: null,
    });

    const url = await getResultUrl("orders/abc/123-scan.png");

    expect(mockState.createSignedUrl).toHaveBeenCalledWith(
      "scan-results",
      "orders/abc/123-scan.png",
      3600,
    );
    expect(url).toBe("https://signed.example.com/orders/abc/123-scan.png?token=xyz");
  });

  it("resolves null when createSignedUrl returns an error", async () => {
    mockState.createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    });

    const url = await getResultUrl("orders/abc/missing.png");
    expect(url).toBeNull();
  });
});
