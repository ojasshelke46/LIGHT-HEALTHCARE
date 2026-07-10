import { test, expect, type Page } from "@playwright/test";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_DOCTOR_EMAIL ?? "doctor@test.com";
const PASSWORD = process.env.E2E_DOCTOR_PASSWORD ?? "Test1234!";

// Seeded in_consultation appointment with an existing visit (d0..04) — no
// Start Consultation click needed (supabase/seed-dev.sql, section 3).
const TARGET = "c0000000-0000-0000-0000-000000000004"; // Diya Patel

// data-testid contract this spec locks in for Task 2/3 to wire exactly:
// - order-type-select / order-instructions / add-order-btn / this-visit-order / remove-order-btn
// - medicine-search / medicine-option-<id> / prescription-dosage / prescription-duration /
//   prescription-quantity / add-prescription-btn / this-visit-prescription / remove-prescription-btn

async function loginAsDoctor(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/doctor$/);
}

async function gotoConsult(page: Page) {
  await page.goto(`/doctor/consult/${TARGET}`);
  await expect(page).toHaveURL(new RegExp(`/doctor/consult/${TARGET}$`));
  await expect(page.getByText(/Diya Patel/i)).toBeVisible();
}

test("doctor adds and removes a test order", async ({ page }) => {
  await loginAsDoctor(page);
  await gotoConsult(page);

  await page.getByTestId("order-type-select").selectOption("xray");
  await page.getByTestId("order-instructions").fill("Chest X-ray PA view");
  await page.getByTestId("add-order-btn").click();

  const newRow = page
    .getByTestId("this-visit-order")
    .filter({ hasText: "Chest X-ray PA view" });
  await expect(newRow).toBeVisible();
  await expect(newRow).toContainText(/xray/i);

  await newRow.getByTestId("remove-order-btn").click();
  await expect(newRow).toHaveCount(0);
});

test("doctor adds and removes a prescription via the medicine search", async ({
  page,
}) => {
  await loginAsDoctor(page);
  await gotoConsult(page);

  await page.getByTestId("medicine-search").fill("paracetamol");
  const option = page
    .locator('[data-testid^="medicine-option-"]')
    .filter({ hasText: /Paracetamol 500mg/i });
  await expect(option.first()).toBeVisible();
  await option.first().click();

  await page.getByTestId("prescription-dosage").fill("1-0-1");
  await page.getByTestId("prescription-duration").fill("3 days");
  await page.getByTestId("prescription-quantity").fill("6");
  await page.getByTestId("add-prescription-btn").click();

  const newRow = page
    .getByTestId("this-visit-prescription")
    .filter({ hasText: /Paracetamol 500mg/i });
  await expect(newRow).toBeVisible();
  await expect(newRow).toContainText("6");

  await newRow.getByTestId("remove-prescription-btn").click();
  await expect(newRow).toHaveCount(0);
});

test("quantity must be a positive integer", async ({ page }) => {
  await loginAsDoctor(page);
  await gotoConsult(page);

  const preCount = await page.getByTestId("this-visit-prescription").count();

  await page.getByTestId("medicine-search").fill("paracetamol");
  const option = page
    .locator('[data-testid^="medicine-option-"]')
    .filter({ hasText: /Paracetamol 500mg/i });
  await expect(option.first()).toBeVisible();
  await option.first().click();

  await page.getByTestId("prescription-quantity").fill("0");
  await page.getByTestId("add-prescription-btn").click();

  await expect(page.getByText(/quantity/i)).toBeVisible();
  await expect(page.getByTestId("this-visit-prescription")).toHaveCount(
    preCount,
  );
});
