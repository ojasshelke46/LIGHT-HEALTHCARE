import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@light/shared-types";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_PHARMACIST_EMAIL ?? "pharmacist@test.com";
const PASSWORD = process.env.E2E_PHARMACIST_PASSWORD ?? "Test1234!";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Seeded medicine (supabase/seed-dev.sql) — Cetirizine 10mg, stock 200.
const MEDICINE_ID = "e0000000-0000-0000-0000-000000000005";

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

test.describe("pharmacy inventory (PHARM-03)", () => {
  test("pharmacist inline-edits a medicine's stock", async ({ page }) => {
    await loginAsPharmacist(page);
    await page.goto("/pharmacy/inventory");

    const row = page.getByTestId(`inventory-row-${MEDICINE_ID}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Cetirizine/i);
    await expect(row).toContainText("200");

    await row.getByTestId(`stock-cell-${MEDICINE_ID}`).click();
    const input = row.getByTestId(`stock-input-${MEDICINE_ID}`);
    await expect(input).toBeVisible();
    await input.fill("199");

    const updateResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/medicines") &&
        resp.request().method() === "PATCH",
    );
    await input.press("Enter");
    await updateResponse;

    await expect(row).toContainText("199");

    const supabase = await pharmacistClient();
    try {
      const { data } = await supabase
        .from("medicines")
        .select("stock_qty")
        .eq("id", MEDICINE_ID)
        .single();
      expect(data?.stock_qty).toBe(199);
    } finally {
      // Self-reset (D-43): restore the seeded stock value.
      await supabase
        .from("medicines")
        .update({ stock_qty: 200 })
        .eq("id", MEDICINE_ID);
      await supabase.auth.signOut();
    }
  });

  test("pharmacist adds a medicine via the zod-validated Sheet", async ({
    page,
  }) => {
    // Unique per run (D-43) — never collides with a previous/concurrent run.
    const uniqueName = `E2E Test Medicine ${Date.now()}`;

    await loginAsPharmacist(page);
    await page.goto("/pharmacy/inventory");

    await page.getByTestId("add-medicine-btn").click();
    await page.getByTestId("add-name").fill(uniqueName);
    await page.getByTestId("add-stock").fill("50");
    await page.getByTestId("add-unit").fill("bottle");
    await page.getByTestId("add-price").fill("12.50");
    await page.getByTestId("add-threshold").fill("5");

    const insertResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/medicines") &&
        resp.request().method() === "POST",
    );
    await page.getByTestId("add-submit").click();
    await insertResponse;

    await expect(page.getByText(uniqueName)).toBeVisible();

    const supabase = await pharmacistClient();
    try {
      const { data } = await supabase
        .from("medicines")
        .select("stock_qty, unit, unit_price, low_stock_threshold")
        .eq("name", uniqueName)
        .single();
      expect(data?.stock_qty).toBe(50);
      expect(data?.unit).toBe("bottle");
      expect(data?.unit_price).toBe(12.5);
      expect(data?.low_stock_threshold).toBe(5);
    } finally {
      // Self-reset (D-43): delete the medicine this test created.
      await supabase.from("medicines").delete().eq("name", uniqueName);
      await supabase.auth.signOut();
    }
  });
});
