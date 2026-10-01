import { expect, test, type Browser } from "@playwright/test";
import { email, login, removeCreatedSince } from "./helpers";

// Pickup request → scheduled by the admin → collected by the assigned worker (PRD F3).
let since: string;
test.beforeAll(() => {
  since = new Date().toISOString();
});
test.afterAll(async () => {
  await removeCreatedSince(since);
});

async function as(browser: Browser, who: string) {
  const page = await (await browser.newContext()).newPage();
  await login(page, email(who));
  return page;
}

test("request → schedule → collect, and a requested pickup can be cancelled", async ({ browser }) => {
  const resident = await as(browser, "resident2");
  const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await resident.goto("/pickup/new");
  await resident.locator("select[name=wasteType]").selectOption("dry");
  await resident.locator("input[name=preferredDate]").fill(date);
  await resident.locator("select[name=slot]").selectOption("morning");
  await resident.locator("input[name=address]").fill("Flat 12, Station Road (test)");
  await resident.getByRole("button", { name: "Request pickup" }).click();
  await expect(resident).toHaveURL(/\/pickup\/[0-9a-f-]{36}$/);
  const pickupPath = new URL(resident.url()).pathname;
  await expect(resident.getByText("Requested").first()).toBeVisible();

  const admin = await as(browser, "admin");
  await admin.goto(pickupPath);
  await admin.locator("select[name=workerId]").selectOption({ label: "Sunita Devi" });
  await admin.getByRole("button", { name: "Confirm schedule" }).click();
  await expect(admin.getByText("Scheduled").first()).toBeVisible({ timeout: 15_000 });

  const worker = await as(browser, "worker2");
  await worker.goto(pickupPath);
  await worker.getByLabel("Yes").check();
  await worker.getByRole("button", { name: "Mark collected" }).click();
  await expect(worker.getByText("Collected").first()).toBeVisible({ timeout: 15_000 });

  await resident.goto("/pickup/new");
  await resident.locator("select[name=wasteType]").selectOption("wet");
  await resident.locator("input[name=preferredDate]").fill(date);
  await resident.locator("select[name=slot]").selectOption("afternoon");
  await resident.locator("input[name=address]").fill("Flat 12, cancel test");
  await resident.getByRole("button", { name: "Request pickup" }).click();
  await expect(resident).toHaveURL(/\/pickup\/[0-9a-f-]{36}$/);
  await resident.getByRole("button", { name: "Cancel" }).click();
  await expect(resident.getByText("Cancelled").first()).toBeVisible({ timeout: 15_000 });
});
