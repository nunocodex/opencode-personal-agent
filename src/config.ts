import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Load .env with override BEFORE zod parse (ESM-safe: no import hoisting issues)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf-8");
  console.log("[env-loader] file found, raw length:", raw.length);
  let count = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
    count++;
    if (key === "TELEGRAM_BOT_TOKEN") {
      console.log("[env-loader] token set:", val.slice(0, 6) + "..." + val.slice(-4));
    }
  }
  console.log("[env-loader] keys loaded:", count);
  console.log("[env-loader] TELEGRAM_BOT_TOKEN in process.env:", !!process.env.TELEGRAM_BOT_TOKEN);
  console.log("[env-loader] TELEGRAM_ALLOWED_USER_ID in process.env:", !!process.env.TELEGRAM_ALLOWED_USER_ID);
  console.log("[env-loader] OPENCODE_SERVER_PASSWORD in process.env:", !!process.env.OPENCODE_SERVER_PASSWORD);
} else {
  console.log("[env-loader] .env NOT FOUND at:", envPath);
}

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]+$/, "Invalid Telegram bot token format"),
  TELEGRAM_ALLOWED_USER_ID: z
    .string()
    .transform((v) => Number(v)),
  OPENCODE_SERVER_URL: z
    .string()
    .url()
    .default("http://localhost:4096"),
  OPENCODE_SERVER_USERNAME: z
    .string()
    .default("opencode"),
  OPENCODE_SERVER_PASSWORD: z
    .string()
    .min(1, "OpenCode server password is required"),
  MEDIA_MODEL: z
    .string()
    .default("opencode-go/qwen3.5-plus"),
  DASHBOARD_PORT: z
    .coerce
    .number()
    .default(3000),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
