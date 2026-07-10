import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@light/shared-types";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_LAB_EMAIL ?? "lab@test.com";
const PASSWORD = process.env.E2E_LAB_PASSWORD ?? "Test1234!";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Fixed id (idempotent across re-runs) — NOT a seed-dev.sql row. This spec
// creates it in beforeEach and deletes it in afterEach (self-reset, D-43).
const ORDER_ID = "f0000000-0000-0000-0000-0000000000e2";
// Reused from supabase/seed-dev.sql (Rohan Mehta's completed visit).
const VISIT_ID = "d0000000-0000-0000-0000-000000000005";
const PATIENT_ID = "a0000000-0000-0000-0000-000000000003";

// data-testid contract this spec locks in for Task 2/3 to wire exactly:
// - pending-row-<orderId> / in-progress-row-<orderId> : row wrappers
// - accept-btn / result-file / result-notes / complete-btn

async function labClient(): Promise<SupabaseClient<Database>> {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) throw error;
  return supabase;
}

/** Remove any lingering scan-results objects under this order's prefix. */
async function clearStorage(supabase: SupabaseClient<Database>) {
  const { data: files } = await supabase.storage
    .from("scan-results")
    .list(`orders/${ORDER_ID}`);
  if (files && files.length > 0) {
    await supabase.storage
      .from("scan-results")
      .remove(files.map((f) => `orders/${ORDER_ID}/${f.name}`));
  }
}

async function resetOrderRow(supabase: SupabaseClient<Database>) {
  await clearStorage(supabase);
  const { error } = await supabase.from("orders").upsert({
    id: ORDER_ID,
    visit_id: VISIT_ID,
    patient_id: PATIENT_ID,
    type: "lab",
    status: "ordered",
    instructions: "CBC E2E",
    result_url: null,
    result_notes: null,
    completed_at: null,
  });
  if (error) throw error;
}

async function deleteOrderRow(supabase: SupabaseClient<Database>) {
  await clearStorage(supabase);
  await supabase.from("orders").delete().eq("id", ORDER_ID);
}

async function loginAsLab(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/diagnostics$/);
}

test.describe("diagnostics accept -> upload -> complete (DIAG-01/02)", () => {
  test.beforeEach(async () => {
    const supabase = await labClient();
    await resetOrderRow(supabase);
    await supabase.auth.signOut();
  });

  test.afterEach(async () => {
    const supabase = await labClient();
    await deleteOrderRow(supabase);
    await supabase.auth.signOut();
  });

  test("lab tech accepts an ordered test, uploads a result, and completes it", async ({
    page,
  }) => {
    await loginAsLab(page);

    const pendingRow = page.getByTestId(`pending-row-${ORDER_ID}`);
    await expect(pendingRow).toBeVisible();
    await expect(pendingRow).toContainText("CBC E2E");

    const acceptResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/orders") &&
        resp.request().method() === "PATCH",
    );
    await pendingRow.getByTestId("accept-btn").click();
    await acceptResponse;
    await expect(pendingRow).toHaveCount(0);

    await page.goto("/diagnostics/in-progress");
    const inProgressRow = page.getByTestId(`in-progress-row-${ORDER_ID}`);
    await expect(inProgressRow).toBeVisible();
    await expect(inProgressRow).toContainText("CBC E2E");

    await inProgressRow
      .getByTestId("result-file")
      .setInputFiles("e2e/fixtures/scan.png");
    await inProgressRow.getByTestId("result-notes").fill("CBC within normal range");

    const completeResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/rest/v1/orders") &&
        resp.request().method() === "PATCH",
    );
    await inProgressRow.getByTestId("complete-btn").click();
    await completeResponse;
    await expect(inProgressRow).toHaveCount(0);

    const supabase = await labClient();
    const { data: order } = await supabase
      .from("orders")
      .select("status, completed_at, result_url")
      .eq("id", ORDER_ID)
      .single();

    expect(order?.status).toBe("completed");
    expect(order?.completed_at).not.toBeNull();
    // A Storage PATH, never a public/http URL (D-34/T-03-06).
    expect(order?.result_url).toMatch(/^orders\//);
    await supabase.auth.signOut();
  });
});
