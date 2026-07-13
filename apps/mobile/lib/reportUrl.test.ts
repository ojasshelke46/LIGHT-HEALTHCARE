import { describe, expect, it, vi } from "vitest";
import { isHttpUrl, resolveResultUrl } from "./reportUrl";

describe("isHttpUrl", () => {
  it("returns true for an http(s) URL", () => {
    expect(isHttpUrl("https://x/y")).toBe(true);
    expect(isHttpUrl("http://x/y")).toBe(true);
  });

  it("returns false for a storage path", () => {
    expect(isHttpUrl("scans/a.pdf")).toBe(false);
  });
});

describe("resolveResultUrl", () => {
  it("returns an http(s) URL unchanged without calling the signer", async () => {
    const signer = vi.fn(async () => "should-not-be-used");
    const url = await resolveResultUrl("https://x/y.pdf", signer);
    expect(url).toBe("https://x/y.pdf");
    expect(signer).not.toHaveBeenCalled();
  });

  it("calls the signer for a storage path and returns its result", async () => {
    const signer = vi.fn(async (path: string) => `signed:${path}`);
    const url = await resolveResultUrl("scans/a.pdf", signer);
    expect(signer).toHaveBeenCalledWith("scans/a.pdf");
    expect(url).toBe("signed:scans/a.pdf");
  });

  it("returns null for null input", async () => {
    const signer = vi.fn(async () => "should-not-be-used");
    const url = await resolveResultUrl(null, signer);
    expect(url).toBeNull();
    expect(signer).not.toHaveBeenCalled();
  });

  it("returns null when the signer returns null", async () => {
    const signer = vi.fn(async () => null);
    const url = await resolveResultUrl("scans/a.pdf", signer);
    expect(url).toBeNull();
  });

  it("returns null when the signer throws", async () => {
    const signer = vi.fn(async () => {
      throw new Error("network error");
    });
    const url = await resolveResultUrl("scans/a.pdf", signer);
    expect(url).toBeNull();
  });
});
