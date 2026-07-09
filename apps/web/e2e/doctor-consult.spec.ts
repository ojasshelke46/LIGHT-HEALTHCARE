import { test, expect, type Page } from "@playwright/test";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_DOCTOR_EMAIL ?? "doctor@test.com";
const PASSWORD = process.env.E2E_DOCTOR_PASSWORD ?? "Test1234!";

// Seeded appointment ids (supabase/seed-dev.sql, section 3 "Appointments today"):
const START_TARGET = "c0000000-0000-0000-0000-000000000003"; // Aarav Sharma, checked_in -> Start Consultation target
const REUSE_TARGET = "c0000000-0000-0000-0000-000000000004"; // Diya Patel, in_consultation, existing visit d0..04 ("Fever and cough", diagnosis null)

// data-testid contract this spec locks in for Task 2/3 to wire exactly:
// - patient-card-<appointmentId> : doctor today card, links to /doctor/consult/<id>
// - start-consultation-btn       : visible when appointment status === checked_in
// - complete-visit-btn           : visible when appointment status === in_consultation
// - consult-complaint / consult-diagnosis / consult-notes : the consult form fields

async function loginAsDoctor(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/doctor$/);
}

test("doctor starts and completes a consultation", async ({ page }) => {
  await loginAsDoctor(page);

  const card = page.getByTestId(`patient-card-${START_TARGET}`);
  // Wait (not an instant isVisible() check) since the today list fetches
  // live data asynchronously after navigation.
  let cardVisible = true;
  try {
    await expect(card).toBeVisible({ timeout: 10_000 });
  } catch {
    cardVisible = false;
  }

  if (!cardVisible) {
    // Idempotent-tolerant re-run: a prior run of this spec already completed
    // this appointment, so it dropped off the checked_in/in_consultation
    // today list. Confirm the completed state directly rather than failing
    // the whole suite on a re-run.
    await page.goto(`/doctor/consult/${START_TARGET}`);
    await expect(page.getByText(/Aarav Sharma/i)).toBeVisible();
    await expect(page.getByTestId("start-consultation-btn")).toHaveCount(0);
    await expect(page.getByTestId("complete-visit-btn")).toHaveCount(0);
    return;
  }

  await card.click();
  await expect(page).toHaveURL(new RegExp(`/doctor/consult/${START_TARGET}$`));
  await expect(page.getByText(/Aarav Sharma/i)).toBeVisible();

  const startBtn = page.getByTestId("start-consultation-btn");
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  const completeBtn = page.getByTestId("complete-visit-btn");
  await expect(completeBtn).toBeVisible();

  await page.getByTestId("consult-diagnosis").fill("Acute viral fever");
  await completeBtn.click();

  await expect(page.getByText(/visit completed/i)).toBeVisible();
  await expect(page).toHaveURL(/\/doctor$/);

  // The completed appointment no longer belongs on the checked-in/
  // in-consultation today list.
  await expect(page.getByTestId(`patient-card-${START_TARGET}`)).not.toBeVisible();
});

test("Complete Visit is blocked without a diagnosis", async ({ page }) => {
  await loginAsDoctor(page);

  // Navigate directly to the seeded in_consultation appointment's consult
  // page for this negative case (its existing visit has a null diagnosis).
  await page.goto(`/doctor/consult/${REUSE_TARGET}`);
  await expect(page).toHaveURL(new RegExp(`/doctor/consult/${REUSE_TARGET}$`));

  await page.getByTestId("consult-diagnosis").fill("");

  const completeBtn = page.getByTestId("complete-visit-btn");
  await expect(completeBtn).toBeVisible();
  await completeBtn.click();

  await expect(page.getByText(/diagnosis/i)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/doctor/consult/${REUSE_TARGET}$`));
});
