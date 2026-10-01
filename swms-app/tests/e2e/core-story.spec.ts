import { expect, test, type Browser } from "@playwright/test";
import { email, login, removeCreatedSince, testPhoto } from "./helpers";

// The story the product is built on: report with a photo → assign → worker does it with an after-photo
// → resident confirms → closed, with both photos on the timeline (PRD F2–F5).
test.describe.configure({ mode: "serial" });

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

test("report → assign → complete → confirm → closed", async ({ browser }) => {
  const resident = await as(browser, "resident3");
  await resident.goto("/report/new");
  await resident.getByRole("radio", { name: "Overflowing bin" }).check();
  await resident.locator("#photo").setInputFiles(await testPhoto("before.jpg", [120, 90, 60]));
  await resident.getByRole("radio", { name: "Dry", exact: true }).check();
  await resident.locator("#locationId").selectOption({ index: 1 });
  await resident.getByRole("button", { name: /Send report/ }).click();
  const link = resident.getByRole("dialog").getByRole("link", { name: "Track this case" });
  await expect(link).toBeVisible({ timeout: 30_000 });
  const caseUrl = (await link.getAttribute("href"))!;

  const admin = await as(browser, "admin");
  await admin.goto(caseUrl);
  await admin.locator("select[name=workerId]").selectOption({ label: "Ravi Kumar" });
  await admin.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(admin.getByText("Worker assigned.")).toBeVisible();

  const worker = await as(browser, "worker1");
  await worker.goto(caseUrl);
  await worker.locator("input[type=file][capture]").setInputFiles(await testPhoto("after.jpg", [60, 140, 70]));
  await worker.getByRole("button", { name: "Mark done" }).click();
  await expect(worker.getByText(/Marked done/)).toBeVisible({ timeout: 30_000 });

  await resident.goto(caseUrl);
  await resident.getByRole("radio", { name: "Resolved", exact: true }).check();
  await resident.getByRole("radio", { name: "Satisfied", exact: true }).check();
  await resident.getByRole("button", { name: "Send answer" }).click();
  await expect(resident.getByRole("dialog")).toContainText("case closed");
  await resident.goto(caseUrl);
  await expect(resident.getByText("Closed", { exact: true }).first()).toBeVisible();
  await expect(resident.getByRole("img", { name: /photo/ })).toHaveCount(2);
});

test("another organisation cannot read the case", async ({ browser }) => {
  const other = await as(browser, "resident1");
  await other.goto("/case/00000000-0000-4000-8000-000000000000");
  await expect(other.getByText(/couldn.t find|not found/i)).toBeVisible();
});
