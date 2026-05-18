import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { resolve, basename } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createSession, sendMessage, deleteSessionHttp } from "./opencode.js";
import { startServer, stopServer } from "./opencodeServer.js";
import { SessionStore } from "./sessionStore.js";
import { transcribeVoice, warmupWhisperAssets } from "./voice.js";

async function queryOpencode(
  prompt: string,
  sessionId: string | undefined,
  chatId: string,
  projectDir: string,
  store: SessionStore
): Promise<string> {
  let sid = sessionId;
  console.log(`[bot] using session: ${sid || "new session"}`);
  if (!sid) {
    console.log(`[bot] creating new session for chat ${chatId}`);
    sid = await createSession("OpenPersonalAgent chat", projectDir);
    store.set(chatId, sid);
    console.log(`[bot] created session: ${sid}`);
  }
  console.log(`[bot] sending message to opencode (session ${sid}): ${prompt.slice(0, 100)}...`);
  const response = await sendMessage(sid, prompt);
  const replyPreview = response.text?.slice(0, 100) ?? "(no response)";
  console.log(`[bot] received response from opencode: ${replyPreview}...`);
  return response.text ?? "(no response)";
}

export async function startBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not set.");
    console.error("Create a bot with @BotFather and set the token in .env");
    process.exit(1);
  }

  const allowedChatId = process.env.ALLOWED_CHAT_ID;
  const projectDir = process.env.OPENCODE_PROJECT_DIR ?? process.cwd();
  const store = new SessionStore();

  await startServer(projectDir);

  const bot = new Telegraf(token, { handlerTimeout: 900_000 }); // 15 min to allow opencode long tasks

  // Warmup whisper assets in background so first voice message is faster
  warmupWhisperAssets().catch(() => {});

  // Auth middleware
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    if (allowedChatId && chatId !== allowedChatId) {
      await ctx.reply("Access denied. Your chat ID is not authorized.");
      console.warn(`Unauthorized access attempt from chat ID: ${chatId}`);
      return;
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Welcome to OpenPersonalAgent!\n\n" +
        "I am powered by OpenCode and use markdown-based memory.\n" +
        "Commands:\n" +
        "/start - Show this message\n" +
        "/newchat - Start a fresh session\n" +
        "/memory - Show what I remember about you\n\n" +
        "Just send me a message to start chatting."
    );
  });

  bot.command("newchat", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const existing = store.get(chatId);
    if (existing) {
      try {
        await deleteSessionHttp(existing.sessionId);
      } catch {
        // ignore cleanup errors
      }
      store.delete(chatId);
    }
    await ctx.reply("Session cleared. Starting a fresh conversation.");
  });

  bot.command("memory", async (ctx) => {
    const projectDir = process.env.OPENCODE_PROJECT_DIR ?? process.cwd();
    const memoryDir = resolve(projectDir, "memory");
    const systemPath = resolve(memoryDir, "SYSTEM.md");
    const identityPath = resolve(memoryDir, "IDENTITY.md");

    let reply = "*Memory Status*\n\n";
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
    const mySession = entries.find((e) => e.chatId === ctx.chat.id.toString());
    if (mySession) {
      reply += `\nActive session: \`${mySession.entry.sessionId}\`\n`;
    } else {
      reply += "\nNo active session.\n";
    }

    await ctx.reply(reply, { parse_mode: "Markdown" });
  });

  // Handle text messages
  bot.on(message("text"), async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const text = ctx.message.text;

    // Skip commands
    if (text.startsWith("/")) return;

    // Skip terminal artifacts (e.g. ^C, ^D sent accidentally)
    if (/^\^./.test(text)) return;

    console.log(`[bot] received message from chat ${chatId}: ${text.slice(0, 50)}...`);

    // Renew typing indicator every 4 seconds until response arrives
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {
        // ignore
      });
    }, 4000);

    const sessionId = store.get(chatId)?.sessionId;
    // Pass user message directly. OpenCode reads AGENTS.md automatically
    // from the working directory for context and instructions.
    const prompt = text;

    try {
      console.log(`[bot] starting text processing for chat ${chatId}`);
      const replyText = await queryOpencode(
        prompt,
        sessionId,
        chatId,
        projectDir,
        store
      );

      clearInterval(typingInterval);
      console.log(`[bot] sending reply to chat ${chatId}`);
      await sendReply(ctx, replyText, ctx.message.message_id);
      console.log(`[bot] reply sent to chat ${chatId}`);
    } catch (err) {
      clearInterval(typingInterval);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[bot] error processing text from chat ${chatId}: ${errorMessage}`);
      await ctx.reply(
        "Sorry, I encountered an error processing your request.",
        { reply_to_message_id: ctx.message.message_id } as any
      );
    }
  });

  // Handle documents
  bot.on(message("document"), async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const doc = ctx.message.document;
    if (!doc) return;

    const rawFileName = doc.file_name ?? "document";
    // SECURITY: sanitize filename to prevent path traversal
    const fileName = sanitizeFileName(rawFileName);
    const caption = ctx.message.caption ?? "";

    console.log(`[bot] received document from chat ${chatId}: ${fileName}`);

    await ctx.sendChatAction("typing");
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {
        // ignore
      });
    }, 4000);

    try {
      console.log(`[bot] downloading document: ${fileName}`);
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const uploadsDir = resolve(projectDir, "workspace", "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      const localPath = resolve(uploadsDir, fileName);

      const res = await fetch(fileLink.href);
      if (!res.ok) {
        throw new Error(`Failed to download file: ${res.status}`);
      }
      const body = res.body;
      if (!body) {
        throw new Error("No response body");
      }
      await pipeline(Readable.fromWeb(body as any), createWriteStream(localPath));
      console.log(`[bot] document downloaded: ${localPath}`);

      // Use forward slashes in path — models are trained on Unix-style paths
      const unixPath = localPath.replace(/\\/g, "/");
      let prompt: string;
      if (caption) {
        prompt = `User: ${caption}\n\nRead the file at ${unixPath} and act on the user's request.`;
      } else {
        prompt = `User sent a file: ${fileName}\n\nRead the file at ${unixPath} and do what seems appropriate.`;
      }

      console.log(`[bot] starting document processing for chat ${chatId}`);
      const sessionId = store.get(chatId)?.sessionId;
      const replyText = await queryOpencode(
        prompt,
        sessionId,
        chatId,
        projectDir,
        store
      );

      clearInterval(typingInterval);
      console.log(`[bot] sending document reply to chat ${chatId}`);
      await sendReply(ctx, replyText, ctx.message.message_id);
      console.log(`[bot] document reply sent to chat ${chatId}`);
    } catch (err) {
      clearInterval(typingInterval);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[bot] error processing document from chat ${chatId}: ${errorMessage}`);
      await ctx.reply("Sorry, I failed to process the document.", {
        reply_to_message_id: ctx.message.message_id,
      } as any);
    }
  });

  // Handle photos
  bot.on(message("photo"), async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const photos = ctx.message.photo;
    if (!photos || photos.length === 0) return;

    const largest = photos[photos.length - 1];
    const fileName = `photo_${ctx.message.message_id}.jpg`;
    const caption = ctx.message.caption ?? "";

    console.log(`[bot] received photo from chat ${chatId}: ${fileName}`);

    await ctx.sendChatAction("typing");
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {
        // ignore
      });
    }, 4000);

    try {
      console.log(`[bot] downloading photo: ${fileName}`);
      const fileLink = await ctx.telegram.getFileLink(largest.file_id);
      const uploadsDir = resolve(projectDir, "workspace", "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      const localPath = resolve(uploadsDir, fileName);

      const res = await fetch(fileLink.href);
      if (!res.ok) {
        throw new Error(`Failed to download photo: ${res.status}`);
      }
      const body = res.body;
      if (!body) {
        throw new Error("No response body");
      }
      await pipeline(Readable.fromWeb(body as any), createWriteStream(localPath));
      console.log(`[bot] photo downloaded: ${localPath}`);

      // Use forward slashes in path — models are trained on Unix-style paths
      const unixPath = localPath.replace(/\\/g, "/");
      let prompt: string;
      if (caption) {
        prompt = `User: ${caption}\n\nLook at the image at ${unixPath} and act on the user's request.`;
      } else {
        prompt = `User sent an image: ${fileName}\n\nLook at the image at ${unixPath} and describe what you see.`;
      }

      console.log(`[bot] starting photo processing for chat ${chatId}`);
      const sessionId = store.get(chatId)?.sessionId;
      const replyText = await queryOpencode(
        prompt,
        sessionId,
        chatId,
        projectDir,
        store
      );

      clearInterval(typingInterval);
      console.log(`[bot] sending photo reply to chat ${chatId}`);
      await sendReply(ctx, replyText, ctx.message.message_id);
      console.log(`[bot] photo reply sent to chat ${chatId}`);
    } catch (err) {
      clearInterval(typingInterval);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[bot] error processing photo from chat ${chatId}: ${errorMessage}`);
      await ctx.reply("Sorry, I failed to process the photo.", {
        reply_to_message_id: ctx.message.message_id,
      } as any);
    }
  });

  // Handle voice messages
  bot.on(message("voice"), async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const voice = ctx.message.voice;
    if (!voice) return;

    const fileName = `voice_${ctx.message.message_id}.oga`;
    const caption = ctx.message.caption ?? "";

    console.log(`[bot] received voice from chat ${chatId}: ${fileName}`);

    await ctx.sendChatAction("typing");
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {
        // ignore
      });
    }, 4000);

    try {
      console.log(`[bot] downloading voice: ${fileName}`);
      const fileLink = await ctx.telegram.getFileLink(voice.file_id);
      const uploadsDir = resolve(projectDir, "workspace", "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      const localPath = resolve(uploadsDir, fileName);

      const res = await fetch(fileLink.href);
      if (!res.ok) {
        throw new Error(`Failed to download voice: ${res.status}`);
      }
      const body = res.body;
      if (!body) {
        throw new Error("No response body");
      }
      await pipeline(Readable.fromWeb(body as any), createWriteStream(localPath));
      console.log(`[bot] voice downloaded: ${localPath}`);

      let transcript = "";
      try {
        console.log(`[bot] transcribing voice: ${fileName}`);
        transcript = await transcribeVoice(localPath);
        console.log(`[bot] voice transcription result: ${transcript.slice(0, 100)}...`);
      } catch (transcribeErr) {
        const errMsg = transcribeErr instanceof Error ? transcribeErr.message : String(transcribeErr);
        console.error(`[bot] voice transcription failed: ${errMsg}`);
      }

      let prompt: string;
      if (transcript) {
        const userText = caption
          ? `${caption} (voice message transcribed: "${transcript}")`
          : `Voice message transcribed: "${transcript}"`;
        prompt = `User: ${userText}`;
      } else {
        clearInterval(typingInterval);
        console.log(`[bot] voice transcription empty for chat ${chatId}, aborting`);
        await ctx.reply(
          "I received your voice message but could not transcribe it. " +
            "Please try again or send a text message.",
          { reply_to_message_id: ctx.message.message_id } as any
        );
        return;
      }

      console.log(`[bot] starting voice processing for chat ${chatId}`);
      const sessionId = store.get(chatId)?.sessionId;
      const replyText = await queryOpencode(
        prompt,
        sessionId,
        chatId,
        projectDir,
        store
      );

      clearInterval(typingInterval);
      console.log(`[bot] sending voice reply to chat ${chatId}`);
      await sendReply(ctx, replyText, ctx.message.message_id);
      console.log(`[bot] voice reply sent to chat ${chatId}`);
    } catch (err) {
      clearInterval(typingInterval);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[bot] error processing voice from chat ${chatId}: ${errorMessage}`);
      await ctx.reply("Sorry, I failed to process the voice message.", {
        reply_to_message_id: ctx.message.message_id,
      } as any);
    }
  });

  bot.launch();
  console.log("Telegram bot started. Press Ctrl+C to stop.");

  // Enable graceful stop
  process.once("SIGINT", async () => {
    await stopServer();
    bot.stop("SIGINT");
  });
  process.once("SIGTERM", async () => {
    await stopServer();
    bot.stop("SIGTERM");
  });
}

function sanitizeFileName(name: string): string {
  // Remove path traversal and directory separators
  let safe = name.replace(/[\/\\]/g, "_").replace(/\.{2,}/g, "_");
  // Remove control characters and other unsafe chars
  safe = safe.replace(/[\x00-\x1f\x7f]/g, "");
  // Ensure we have something left
  if (!safe.trim() || safe === "_") {
    safe = `file_${Date.now()}`;
  }
  return safe;
}

async function sendReply(
  ctx: Context,
  text: string,
  replyToMessageId?: number
): Promise<void> {
  const MAX_LENGTH = 4096;
  // Extract [SEND_FILE:path] markers
  const fileRegex = /\[SEND_FILE:([^\]]+)\]/g;
  const files: string[] = [];
  let cleanText = text.replace(fileRegex, (match, path) => {
    files.push(path.trim());
    return "";
  });

  cleanText = cleanText.trim();

  const baseOpts: any = { parse_mode: "Markdown" };
  if (replyToMessageId !== undefined) {
    baseOpts.reply_to_message_id = replyToMessageId;
  }

  // Send text in chunks if needed
  if (cleanText) {
    for (let i = 0; i < cleanText.length; i += MAX_LENGTH) {
      const chunk = cleanText.slice(i, i + MAX_LENGTH);
      try {
        await ctx.reply(chunk, baseOpts);
      } catch {
        // Fallback to plain text if Markdown parsing fails
        const fallbackOpts: any = {};
        if (replyToMessageId !== undefined) {
          fallbackOpts.reply_to_message_id = replyToMessageId;
        }
        await ctx.reply(chunk, fallbackOpts);
      }
    }
  }

  // Send files
  for (const filePath of files) {
    try {
      const fileOpts: any = {};
      if (replyToMessageId !== undefined) {
        fileOpts.reply_to_message_id = replyToMessageId;
      }
      if (existsSync(filePath)) {
        await ctx.replyWithDocument({ source: filePath }, fileOpts);
      } else {
        await ctx.reply(`[File not found: ${filePath}]`, fileOpts);
      }
    } catch {
      const errOpts: any = {};
      if (replyToMessageId !== undefined) {
        errOpts.reply_to_message_id = replyToMessageId;
      }
      await ctx.reply(`[Failed to send file: ${filePath}]`, errOpts);
    }
  }
}
