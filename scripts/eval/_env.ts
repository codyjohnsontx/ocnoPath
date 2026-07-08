/**
 * Loads local env for the standalone eval scripts (tsx doesn't auto-load .env
 * files the way `next dev` does). Mirrors Next.js precedence: .env first, then
 * .env.local overrides it. Import this before anything that reads process.env.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";

config({ path: ".env" });
if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
}
