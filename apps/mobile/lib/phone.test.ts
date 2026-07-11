import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("normalizes a bare 10-digit number to +91 prefixed", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });

  it("strips spaces and normalizes", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
  });

  it("strips dashes and normalizes", () => {
    expect(normalizePhone("98765-43210")).toBe("+919876543210");
  });

  it("leaves an already-prefixed +91 number unchanged", () => {
    expect(normalizePhone("+919876543210")).toBe("+919876543210");
  });

  it("rejects a 9-digit local number", () => {
    expect(normalizePhone("987654321")).toBeNull();
  });

  it("rejects an 11-digit local number", () => {
    expect(normalizePhone("98765432101")).toBeNull();
  });

  it("rejects letters", () => {
    expect(normalizePhone("98765abcde")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normalizePhone("")).toBeNull();
  });
});
