
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config";
import { createClient } from "./opencode/client";
import { createBot } from "./bot/app";
import { createDashboard, updateDashboard } from "./dashboard/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function debugEnv(): void {
  const envPath = path.resolve(__dirname, "..", ".env");
  const exists = fs.existsSync(envPath);
  console.log("[debug] .env file:", envPath);
  console.log("[debug] .env exists:", exists);
  if (exists) {
    const raw = fs.readFileSync(envPath, "utf-8");
    console.log("[debug] .env lines:", raw.split("\n").length);
    const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
    console.log(
      "[debug] TELEGRAM_BOT_TOKEN:",
      token
        ? `${token.slice(0, 6)}...${token.slice(-4)} (len: ${token.length})`
        : "NOT SET"
    );
    console.log(
      "[debug] TELEGRAM_ALLOWED_USER_ID:",
      process.env.TELEGRAM_ALLOWED_USER_ID ?? "NOT SET"
    );
    console.log(
      "[debug] OPENCODE_SERVER_URL:",
      process.env.OPENCODE_SERVER_URL ?? "NOT SET"
    );
    console.log(
      "[debug] MEDIA_MODEL:",
      process.env.MEDIA_MODEL ?? "NOT SET"
    );
  }

  // Also check what dotenv actually loaded
  const cwd = process.cwd();
  console.log("[debug] cwd:", cwd);
  console.log("[debug] cwd .env:", fs.existsSync(path.join(cwd, ".env")));
}

async function main(): Promise<void> {
  debugEnv();

  console.log("[debug] Parsed config:", {
    allowedUser: config.TELEGRAM_ALLOWED_USER_ID,
    serverUrl: config.OPENCODE_SERVER_URL,
    mediaModel: config.MEDIA_MODEL,
    dashboardPort: config.DASHBOARD_PORT,
  });

  const client = createClient(config);
  const bot = createBot(config, client);

  const dashboard = createDashboard(config);
  dashboard.listen(config.DASHBOARD_PORT, () => {
    console.log(`Dashboard: http://localhost:${config.DASHBOARD_PORT}`);
  });

  const me = await bot.api.getMe();
  console.log(`Bot started: @${me.username}`);

  updateDashboard({ uptime: 0, sessions: 0 });

  bot.start({
    onStart: () => {
      console.log("Bot is running...");
    },
  });
}

main().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
