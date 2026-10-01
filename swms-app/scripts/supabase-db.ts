// Runs the Supabase CLI against the hosted database without printing or shell-expanding
// SUPABASE_DB_URL (it contains the database password).
//   npm run db:push -- --dry-run   list pending migrations
//   npm run db:push                apply migrations + seed.sql
//   npm run db:types               write types/database.ts

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [command, ...extra] = process.argv.slice(2);
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) throw new Error("Missing SUPABASE_DB_URL in .env.local");

const args =
  command === "push"
    ? ["db", "push", "--include-seed", "--db-url", dbUrl, ...extra]
    : ["gen", "types", "typescript", "--schema", "public", "--db-url", dbUrl];

const result = spawnSync("npx", ["supabase", ...args], {
  stdio: command === "push" ? "inherit" : ["inherit", "pipe", "inherit"],
  encoding: "utf8",
});
if (result.status !== 0) process.exit(result.status ?? 1);
if (command === "types") writeFileSync("types/database.ts", result.stdout);
