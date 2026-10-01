import { expect, test, type Browser, type Page } from "@playwright/test";
import { email, login, removeCreatedSince, testPhoto } from "./helpers";

// The non-happy paths of a case: reject, return, dispute → close with a reason, reopen (PRD F4, F5).
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

async function report(page: Page, place: number) {
  await page.goto("/report/new");
  await page.getByRole("radio", { name: "Overflowing bin" }).check();
  await page.locator("#photo").setInputFiles(await testPhoto("before.jpg", [110, 90, 60]));
  await page.getByRole("radio", { name: "Dry", exact: true }).check();
  await page.locator("#locationId").selectOption({ index: place });
  await page.getByRole("button", { name: /Send report/ }).click();
  const link = page.getByRole("dialog").getByRole("link", { name: "Track this case" });
  await expect(link).toBeVisible({ timeout: 30_000 });
  return (await link.getAttribute("href"))!;
}

test("admin rejects a submitted report and the reporter sees the reason", async ({ browser }) => {
  const resident = await as(browser, "resident3");
  const caseUrl = await report(resident, 1);
  const admin = await as(browser, "admin");
  await admin.goto(caseUrl);
  await admin.getByLabel(/Reason \(invalid, duplicate/).fill("Duplicate of another report");
  await admin.getByRole("button", { name: "Reject report" }).click();
  await expect(admin.getByText("Report rejected.")).toBeVisible();
  await resident.goto(caseUrl);
  await expect(resident.getByText("Duplicate of another report")).toBeVisible();
});

test("return → reassign → complete → dispute → close with a reason → reopen", async ({ browser }) => {
  const resident = await as(browser, "resident3");
  const caseUrl = await report(resident, 2);
  const admin = await as(browser, "admin");
  const worker = await as(browser, "worker1");

  await admin.goto(caseUrl);
  await admin.locator("select[name=workerId]").selectOption({ label: "Ravi Kumar" });
  await admin.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(admin.getByText("Worker assigned.")).toBeVisible();

  await worker.goto(caseUrl);
  await worker.getByLabel(/^Reason \(site blocked/).fill("Gate is locked");
  await worker.getByRole("button", { name: "Return task" }).click();
  await expect(worker.getByText("Task returned to the admin.")).toBeVisible();

  await admin.goto(caseUrl);
  await expect(admin.getByText("Returned by worker")).toBeVisible();
  await admin.locator("select[name=workerId]").selectOption({ label: "Ravi Kumar" });
  await admin.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(admin.getByText("Worker assigned.")).toBeVisible();

  await worker.goto(caseUrl);
  await worker.locator("input[type=file][capture]").setInputFiles(await testPhoto("after.jpg", [60, 140, 70]));
  await worker.getByRole("button", { name: "Mark done" }).click();
  await expect(worker.getByText(/Marked done/)).toBeVisible({ timeout: 30_000 });

  await resident.goto(caseUrl);
  await resident.getByRole("radio", { name: "Not resolved" }).check();
  await resident.getByRole("button", { name: "Send answer" }).click();
  await expect(resident.getByRole("dialog")).toContainText("we'll look again");

  await admin.goto(caseUrl);
  await admin.getByLabel("Reason for closing").fill("Checked on site, it is clean now");
  await admin.getByRole("button", { name: "Close case" }).click();
  await expect(admin.getByText("Case closed.")).toBeVisible();

  await resident.goto(caseUrl);
  await resident.getByLabel("What is still wrong?").fill("The garbage is back");
  await resident.getByRole("button", { name: "Reopen case" }).click();
  await expect(resident.getByText(/Case reopened/)).toBeVisible();
});
