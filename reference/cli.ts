import { Command } from "commander";
import { createInterface } from "readline";
import { resolve } from "path";
import { existsSync } from "fs";
import { createSession, sendMessage, deleteSessionHttp } from "./opencode.js";
import { startServer, stopServer } from "./opencodeServer.js";
import { SessionStore } from "./sessionStore.js";
import { startBot } from "./bot.js";

const program = new Command();

program
  .name("opa")
  .description("OpenPersonalAgent - Your personal AI agent powered by OpenCode")
  .version("0.1.0");

program
  .command("bot")
  .description("Start the Telegram bot")
  .action(async () => {
    await startBot();
  });

program
  .command("chat")
  .description("Start an interactive CLI chat session")
  .action(async () => {
    const projectDir = process.env.OPENCODE_PROJECT_DIR ?? process.cwd();
    await startServer(projectDir);

    const store = new SessionStore();
    const chatId = "cli-user";

    let sessionId = store.get(chatId)?.sessionId;

    console.log("OpenPersonalAgent CLI");
    console.log("Commands: /newchat, /memory, /quit");
    console.log("Type your message and press Enter.\n");

    if (sessionId) {
      console.log(`Continuing session: ${sessionId}`);
    } else {
      console.log("Starting a new session...");
    }

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "You > ",
    });

    rl.prompt();

    rl.on("line", async (line) => {
      const text = line.trim();
      if (!text) {
        rl.prompt();
        return;
      }

      if (text === "/quit" || text === "/exit") {
        rl.close();
        return;
      }

      if (text === "/newchat") {
        if (sessionId) {
          try {
            await deleteSessionHttp(sessionId);
          } catch {
            // ignore
          }
          store.delete(chatId);
        }
        sessionId = undefined;
        console.log("Session cleared. Starting fresh.\n");
        rl.prompt();
        return;
      }

      if (text === "/memory") {
        const memoryDir = resolve(projectDir, "memory");
        const systemPath = resolve(memoryDir, "SYSTEM.md");
        const identityPath = resolve(memoryDir, "IDENTITY.md");

        let reply = "Memory Status\n\n";
        if (existsSync(systemPath)) {
          reply += "- SYSTEM.md: present\n";
        } else {
          reply += "- SYSTEM.md: missing\n";
        }
        if (existsSync(identityPath)) {
          reply += "- IDENTITY.md: present\n";
        } else {
          reply += "- IDENTITY.md: missing\n";
        }

        const entries = store.list();
        const mySession = entries.find((e) => e.chatId === chatId);
        if (mySession) {
          reply += `\nActive session: ${mySession.entry.sessionId}\n`;
        } else {
          reply += "\nNo active session.\n";
        }

        console.log(reply);
        rl.prompt();
        return;
      }

      try {
        if (!sessionId) {
          sessionId = await createSession("OpenPersonalAgent CLI", projectDir);
          store.set(chatId, sessionId);
        }
        const response = await sendMessage(sessionId, text);
        const replyText = response.text ?? "(no response)";

        // Print assistant response
        console.log(`Agent > ${replyText}\n`);
      } catch (err) {
        console.error("Error:", err);
      }

      rl.prompt();
    });

    rl.on("close", async () => {
      await stopServer();
      console.log("\nGoodbye!");
      process.exit(0);
    });
  });

export function runCli(args: string[]): void {
  program.parse(args);
}
