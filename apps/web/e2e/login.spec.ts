import { test, expect } from "@playwright/test";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_STAFF_EMAIL ?? "doctor@test.com";
const PASSWORD = process.env.E2E_STAFF_PASSWORD ?? "Test1234!";
const ROLE_HOME = /\/(reception|doctor|diagnostics|pharmacy|admin)$/;

test("staff logs in and lands on their role home with their name in the header", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(ROLE_HOME);
  await expect(page.getByTestId("staff-name")).toBeVisible(); // set by DashboardLayout (Plan 03)
  await expect(page.getByTestId("sign-out")).toBeVisible(); // logout in header (Plan 03)
});

test("opening another role's portal bounces back to own home", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(ROLE_HOME);
  const home = new URL(page.url()).pathname;
  const other = home === "/pharmacy" ? "/reception" : "/pharmacy";
  await page.goto(other);
  await expect(page).toHaveURL(new RegExp(`${home}$`)); // middleware cross-role bounce (existing)
});

test("invalid credentials show a generic error toast and stay on /login", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("nobody@test.com");
  await page.getByTestId("login-password").fill("wrongpass");
  await page.getByTestId("login-submit").click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible(); // sonner toast (Plan 02)
  await expect(page).toHaveURL(/\/login$/);
});
