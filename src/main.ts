import "dotenv/config";
import { config } from "./config";
import { createClient } from "./opencode/client";
import { createBot } from "./bot/app";

async function main(): Promise<void> {
  const client = createClient(config);
  const bot = createBot(config, client);

  const me = await bot.api.getMe();
  console.log(`Bot started: @${me.username}`);

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
