// Shared helpers for the end-to-end tests: sample logins, a test photo, and cleanup of what a test created.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const ORG_A = "eb1cf32b-47a8-5ec9-aee6-c241bb18eef8"; // City Ward A (seed.sql)
export const ORG_B = "e3ae7902-1b73-525e-ac82-7a96dfa1e19d"; // Green Residency Society

export function email(key: string, org: "a" | "b" = "a") {
  return `${key}@${org === "a" ? "citywarda" : "greenresidency"}.demo`;
}

export async function login(page: Page, address: string) {
  await page.goto("/login");
  await page.locator("#email").fill(address);
  await page.locator("#password").fill(process.env.SEED_USER_PASSWORD!);
  await page.getByRole("button", { name: /^Log in/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** A small JPEG file (not a real photo) for upload fields. */
export async function testPhoto(name: string, rgb: [number, number, number]) {
  const path = join(mkdtempSync(join(tmpdir(), "swms-e2e-")), name);
  await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).jpeg().toFile(path);
  return path;
}

export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Removes only what a test created: rows and photos made after `since` in the two sample organisations. */
export async function removeCreatedSince(since: string) {
  const db = serviceClient();
  const orgs = [ORG_A, ORG_B];
  const reports = (await db.from("reports").select("id, org_id").in("org_id", orgs).gt("created_at", since)).data ?? [];
  const pickups = (await db.from("pickup_requests").select("id, org_id").in("org_id", orgs).gt("created_at", since)).data ?? [];
  const reportIds = reports.map((r) => r.id);
  const pickupIds = pickups.map((p) => p.id);
  const remove = async (table: string, column: string, ids: string[]) => {
    if (ids.length) await db.from(table).delete().in(column, ids);
  };
  await remove("reward_events", "report_id", reportIds);
  await remove("report_followers", "report_id", reportIds);
  await remove("report_events", "report_id", reportIds);
  await remove("notifications", "record_id", [...reportIds, ...pickupIds]);
  await remove("reports", "id", reportIds);
  await remove("pickup_events", "pickup_id", pickupIds);
  await remove("pickup_requests", "id", pickupIds);
  for (const [kind, rows] of [["reports", reports], ["pickups", pickups]] as const) {
    for (const row of rows) {
      const folder = `${row.org_id}/${kind}/${row.id}`;
      const { data: files } = await db.storage.from("photos").list(folder);
      if (files?.length) await db.storage.from("photos").remove(files.map((f) => `${folder}/${f.name}`));
    }
  }
}
