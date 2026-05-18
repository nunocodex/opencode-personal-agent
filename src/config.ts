import { z } from "zod";

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
