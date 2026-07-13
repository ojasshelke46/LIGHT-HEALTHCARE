import { describe, expect, it } from "vitest";
import { profileSchema } from "./profileSchema";

describe("profileSchema", () => {
  it("fails when name is empty", () => {
    const result = profileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("passes with just a name", () => {
    const result = profileSchema.safeParse({ name: "Aarav" });
    expect(result.success).toBe(true);
  });

  it("fails when email is not a valid email", () => {
    const result = profileSchema.safeParse({ name: "A", email: "nope" });
    expect(result.success).toBe(false);
  });

  it("passes when email is an empty string (allowed)", () => {
    const result = profileSchema.safeParse({ name: "A", email: "" });
    expect(result.success).toBe(true);
  });

  it("passes with an abha_id", () => {
    const result = profileSchema.safeParse({ name: "A", abha_id: "12-3456" });
    expect(result.success).toBe(true);
  });

  it("does not include phone as a schema field", () => {
    // phone is read-only (auth identity) — excluded from the editable schema.
    expect(Object.keys(profileSchema.shape)).not.toContain("phone");
  });
});
