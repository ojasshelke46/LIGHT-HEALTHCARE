import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@light/shared-types";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_PHARMACIST_EMAIL ?? "pharmacist@test.com";
const PASSWORD = process.env.E2E_PHARMACIST_PASSWORD ?? "Test1234!";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Seeded pending prescription (supabase/seed-dev.sql) — Rohan Mehta,
// Paracetamol 500mg, qty 10, stock 120, threshold 20.
const RX_ID = "f0000000-0000-0000-0000-000000000002";
const MEDICINE_ID = "e0000000-0000-0000-0000-000000000001";

// Fixed-id throwaway prescription for the insufficient-stock guard — NOT a
// supabase/seed-dev.sql row. Created in this spec, deleted after (D-43).
// Amlodipine 5mg has only 15 in stock; quantity 999 guarantees the RPC's
// atomic guard rejects the dispense.
const TEMP_RX_ID = "f0000000-0000-0000-0000-0000000000d4";
const TEMP_MEDICINE_ID = "e0000000-0000-0000-0000-000000000008";
const VISIT_ID = "d0000000-0000-0000-0000-000000000005";
const PATIENT_ID = "a0000000-0000-0000-0000-000000000003";

async function pharmacistClient(): Promise<SupabaseClient<Database>> {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) throw error;
  return supabase;
}

async function loginAsPharmacist(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/pharmacy$/);
}

function waitForDispenseRpc(page: Page) {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes("/rest/v1/rpc/dispense_medicine") &&
      resp.request().method() === "POST",
  );
}

test.describe("pharmacy dispense (PHARM-01/02)", () => {
  test("pharmacist dispenses a pending prescription atomically (stock 120 -> 110)", async ({
    page,
  }) => {
    await loginAsPharmacist(page);

    const row = page.getByTestId(`pending-row-${RX_ID}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Paracetamol/i);
    await expect(row).toContainText(/Rohan Mehta/i);
    await expect(row).toContainText("120");

    const dispenseResponse = waitForDispenseRpc(page);
    await row.getByTestId("dispense-btn").click();
    await dispenseResponse;
    await expect(row).toHaveCount(0);

    const supabase = await pharmacistClient();
    try {
      const { data: rx } = await supabase
        .from("prescriptions")
        .select("status, dispensed_at")
        .eq("id", RX_ID)
        .single();
      expect(rx?.status).toBe("dispensed");
      expect(rx?.dispensed_at).not.toBeNull();

      const { data: medicine } = await supabase
        .from("medicines")
        .select("stock_qty")
        .eq("id", MEDICINE_ID)
        .single();
      expect(medicine?.stock_qty).toBe(110);
    } finally {
      // Self-reset (D-43): leave seed exactly as before.
      await supabase
        .from("prescriptions")
        .update({ status: "pending", dispensed_at: null })
        .eq("id", RX_ID);
      await supabase
        .from("medicines")
        .update({ stock_qty: 120 })
        .eq("id", MEDICINE_ID);
      await supabase.auth.signOut();
    }
  });

  test("insufficient stock is rejected atomically with a destructive toast", async ({
    page,
  }) => {
    const setupClient = await pharmacistClient();
    const { error: upsertError } = await setupClient
      .from("prescriptions")
      .upsert({
        id: TEMP_RX_ID,
        visit_id: VISIT_ID,
        patient_id: PATIENT_ID,
        medicine_id: TEMP_MEDICINE_ID,
        dosage: "1-0-1",
        duration: "5 days",
        quantity: 999,
        status: "pending",
      });
    if (upsertError) throw upsertError;
    await setupClient.auth.signOut();

    try {
      await loginAsPharmacist(page);
      const row = page.getByTestId(`pending-row-${TEMP_RX_ID}`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(/insufficient stock/i);

      const dispenseResponse = waitForDispenseRpc(page);
      await row.getByTestId("dispense-btn").click();
      await dispenseResponse;

      // Scoped to the sonner toast element (not the row's own stock badge,
      // which already contains the same "insufficient stock" substring).
      await expect(
        page.locator("[data-sonner-toast]").filter({ hasText: /insufficient stock/i }),
      ).toBeVisible();

      const checkClient = await pharmacistClient();
      const { data: medicine } = await checkClient
        .from("medicines")
        .select("stock_qty")
        .eq("id", TEMP_MEDICINE_ID)
        .single();
      expect(medicine?.stock_qty).toBe(15);

      const { data: rx } = await checkClient
        .from("prescriptions")
        .select("status")
        .eq("id", TEMP_RX_ID)
        .single();
      expect(rx?.status).toBe("pending");
      await checkClient.auth.signOut();
    } finally {
      // Self-reset (D-43): Amlodipine stock is never touched by this test
      // (the dispense is rejected before any write), so only the throwaway
      // prescription needs cleanup.
      const cleanupClient = await pharmacistClient();
      await cleanupClient.from("prescriptions").delete().eq("id", TEMP_RX_ID);
      await cleanupClient.auth.signOut();
    }
  });
});
