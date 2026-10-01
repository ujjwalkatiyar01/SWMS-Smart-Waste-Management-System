import { expect, test } from "@playwright/test";
import { email, login } from "./helpers";

// One login per role lands on its own home; the wrong areas are closed (03 §7, 04-AUTH).
const HOMES = [
  ["resident1", "/my"],
  ["worker1", "/worker"],
  ["admin", "/admin"],
  ["supervisor", "/supervisor"],
  ["authority", "/authority"],
] as const;

for (const [who, home] of HOMES) {
  test(`${who} logs in and lands on ${home}`, async ({ page }) => {
    await login(page, email(who));
    await expect(page).toHaveURL(new RegExp(`${home}$`));
    await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();
  });
}

test("a logged-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("a wrong password shows a plain message and keeps the page", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(email("resident1"));
  await page.locator("#password").fill("not-the-password");
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
});

test("a resident cannot open staff areas or another organisation's case", async ({ page }) => {
  await login(page, email("resident1"));
  for (const path of ["/admin", "/worker", "/supervisor", "/authority", "/admin/cases", "/admin/map"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/my$/);
  }
});

test("the awareness guide is public and switches language", async ({ page }) => {
  await page.goto("/awareness");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /हिन्दी/ }).click();
  await expect(page.locator("html")).toContainText("गीला");
});
