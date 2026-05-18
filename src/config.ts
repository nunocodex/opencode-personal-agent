import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Load .env with override BEFORE zod parse (ESM-safe: no import hoisting issues)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
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
