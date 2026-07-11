import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@light/shared-types";

// Dev-only seed credentials — overridable via env, never production secrets.
const EMAIL = process.env.E2E_RECEPTION_EMAIL ?? "reception@test.com";
const PASSWORD = process.env.E2E_RECEPTION_PASSWORD ?? "Test1234!";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Seeded appointment ids (supabase/seed-dev.sql, section 3 "Appointments today"):
const CHECK_IN_TARGET = "c0000000-0000-0000-0000-000000000001"; // Aarav Sharma, booked, today 23:55 IST
const PAST_NO_SHOW_TARGET = "c0000000-0000-0000-0000-000000000002"; // Diya Patel, booked, slot in the past

// data-testid contract this spec locks in for Task 2/3 to wire exactly:
// - queue-row-<appointmentId>  : wraps each row in the live queue
// - check-in-btn               : visible on booked rows, flips status -> checked_in
// - no-show-btn                : visible only on booked rows whose slot_time is in the past
// - stat-checked-in            : wraps the numeric "checked in" value on the stats card

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** ISO instant for `HH:MM` today in IST — slots must live inside the queue's
 *  IST "today" window regardless of when the suite runs (date rollover broke
 *  fixed seed times repeatedly). */
function todayISTAt(hours: number, minutes: number): string {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const startOfDayUTC =
    Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate(),
    ) - IST_OFFSET_MS;
  return new Date(
    startOfDayUTC + hours * 3_600_000 + minutes * 60_000,
  ).toISOString();
}

/** Self-reset (D-43): restore BOTH seed targets — status AND slot_time — so
 *  re-runs, date rollovers, and drift from other suites can't break this
 *  spec. Reception role has ALL on appointments. */
async function resetSeedTargets() {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (authError) throw new Error(`reset auth failed: ${authError.message}`);

  // Check-in target: booked, slot 23:55 IST today (always future in-window).
  const r1 = await supabase
    .from("appointments")
    .update({ status: "booked", slot_time: todayISTAt(23, 55) })
    .eq("id", CHECK_IN_TARGET);
  if (r1.error) throw new Error(`reset check-in target failed: ${r1.error.message}`);

  // No-show target: booked, slot in the past but inside today IST —
  // max(00:05 IST today, now - 2h).
  const pastSlot = new Date(
    Math.max(
      Date.now() - 2 * 3_600_000,
      new Date(todayISTAt(0, 5)).getTime(),
    ),
  ).toISOString();
  const r2 = await supabase
    .from("appointments")
    .update({ status: "booked", slot_time: pastSlot })
    .eq("id", PAST_NO_SHOW_TARGET);
  if (r2.error) throw new Error(`reset no-show target failed: ${r2.error.message}`);

  await supabase.auth.signOut();
}

test.beforeAll(resetSeedTargets);
test.afterAll(resetSeedTargets);

async function loginAsReception(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/reception$/);
}

test("reception sees the live queue and can check a booked patient in", async ({
  page,
}) => {
  await loginAsReception(page);

  const row = page.getByTestId(`queue-row-${CHECK_IN_TARGET}`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Aarav Sharma");
  await expect(row.getByText(/Booked/i)).toBeVisible();

  await row.getByTestId("check-in-btn").click();

  // Optimistic update: badge flips immediately, no page refresh.
  await expect(row.getByText(/Checked In/i)).toBeVisible();

  const stat = page.getByTestId("stat-checked-in");
  await expect(stat).toBeVisible();
  // The stat card reflects the SERVER count, which arrives via the debounced
  // realtime refetch — poll instead of reading once (race otherwise).
  await expect
    .poll(
      async () => {
        const statText = (await stat.textContent()) ?? "";
        return Number.parseInt(statText.replace(/\D/g, ""), 10);
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(1);
});

test("no-show button only appears on past-slot booked rows", async ({
  page,
}) => {
  await loginAsReception(page);

  const pastRow = page.getByTestId(`queue-row-${PAST_NO_SHOW_TARGET}`);
  await expect(pastRow).toBeVisible();
  await expect(pastRow).toContainText("Diya Patel");
  await expect(pastRow.getByTestId("no-show-btn")).toBeVisible();

  const futureRow = page.getByTestId(`queue-row-${CHECK_IN_TARGET}`);
  await expect(futureRow.getByTestId("no-show-btn")).toHaveCount(0);
});
