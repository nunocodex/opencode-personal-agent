import { getAttachUrl } from "./Server.js";

const serverPassword = process.env.OPENCODE_SERVER_PASSWORD;
const serverUsername = process.env.OPENCODE_SERVER_USERNAME ?? "opencode";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (serverPassword) {
    const creds = Buffer.from(`${serverUsername}:${serverPassword}`).toString("base64");
    headers["Authorization"] = `Basic ${creds}`;
  }
  return headers;
}

/**
 * System prompt injected at session creation to teach OpenCode how to use
 * the bot's built-in scheduler for reminders and recurring messages.
 */
export const SCHEDULER_SYSTEM_PROMPT = `You are a helpful Telegram bot assistant with built-in reminder and scheduling capabilities.

SCHEDULING INSTRUCTIONS:
When the user asks for a reminder, a scheduled message, or any time-based notification, you can respond naturally AND include a special [SCHEDULE] block at the end of your message. The block is invisible to the user but will be executed automatically by the bot.

SUPPORTED PATTERNS (examples of what users might say):
- "ricordami tra 5 minuti di andare a letto"
- "promemoria tra 2 ore per la riunione"
- "ogni mattina alle 9 mandami le news"
- "ogni lunedì alle 10 ricordami della call"
- "tra 1 giorno ricordami del compleanno di Marco"

HOW TO CREATE A SCHEDULE BLOCK:

1. ONE-SHOT REMINDER (e.g., "tra 5 minuti"):
[SCHEDULE]
{"type":"once","when":"+5m","message":"Vai a letto!"}
[/SCHEDULE]

2. RECURRING DAILY (e.g., "ogni giorno alle 9:00"):
[SCHEDULE]
{"type":"recurring","rule":"daily 09:00","message":"Buongiorno! Ecco le news della giornata."}
[/SCHEDULE]

3. RECURRING WEEKLY (e.g., "ogni lunedì alle 10:00"):
[SCHEDULE]
{"type":"recurring","rule":"weekly monday 10:00","message":"Ricordati della call di team!"}
[/SCHEDULE]

4. RECURRING INTERVAL (e.g., "ogni 30 minuti"):
[SCHEDULE]
{"type":"recurring","rule":"every 30m","message":"Fai una pausa dallo schermo."}
[/SCHEDULE]

5. RECURRING CRON (e.g., "ogni primo del mese alle 8:00"):
[SCHEDULE]
{"type":"recurring","rule":"0 8 1 * *","message":"Controlla le fatture del mese."}
[/SCHEDULE]

TIME FORMAT RULES:
- "when" field: use relative time like "+5m" (minutes), "+2h" (hours), "+1d" (days), "+30s" (seconds)
- "rule" field: use "daily HH:MM", "weekly <day> HH:MM", "every <N>m|h", or a 5-field cron expression
- Days: monday, tuesday, wednesday, thursday, friday, saturday, sunday

CANCELLING A SCHEDULE:
If the user asks to cancel a reminder, include the event ID if you know it:
[SCHEDULE_CANCEL]
{"id":"abc123"}
[/SCHEDULE_CANCEL]

IMPORTANT:
- Always respond naturally to the user first, then append the [SCHEDULE] block at the very end.
- The [SCHEDULE] block is invisible to the user — do not mention it unless asked.
- If the user does not ask for a reminder, do NOT include any [SCHEDULE] block.
- Be precise with times. Use the user's timezone implicitly (they are chatting with you in real-time).`;

export interface OpencodeResponse {
  sessionId?: string;
  text?: string;
}

export async function createSession(title: string, projectDir?: string): Promise<string> {
  const url = new URL("/session", getAttachUrl());
  if (projectDir) {
    url.searchParams.set("directory", projectDir);
  }

  console.log(`[opencode] createSession: POST ${url.toString()}`);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    });

    console.log(`[opencode] createSession: response status ${res.status}`);

    if (!res.ok) {
      throw new Error(`Failed to create session: HTTP ${res.status}`);
    }

    const data = (await res.json()) as { id?: string };
    if (!data.id) {
      throw new Error("Created session response missing id");
    }

    console.log(`[opencode] createSession: received sessionId ${data.id}`);
    return data.id;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[opencode] createSession failed: ${errorMessage}`);
    throw err;
  }
}

/**
 * Creates a new session and sends the scheduler system prompt to OpenCode
 * so it learns how to use [SCHEDULE] blocks for reminders and recurring messages.
 * The system prompt response is consumed silently (not shown to the user).
 */
export async function initializeSession(projectDir?: string): Promise<string> {
  const sessionId = await createSession("OpenCode Agents chat", projectDir);
  try {
    await sendMessage(sessionId, SCHEDULER_SYSTEM_PROMPT);
    console.log("[opencode] scheduler system prompt sent to session", sessionId);
  } catch (err) {
    console.error("[opencode] failed to send scheduler system prompt:", err);
  }
  return sessionId;
}

export async function deleteSessionHttp(sessionId: string): Promise<void> {
  const url = `${getAttachUrl()}/session/${sessionId}`;
  console.log(`[opencode] deleteSessionHttp: DELETE ${url} (session ${sessionId})`);

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(),
    });

    console.log(`[opencode] deleteSessionHttp: response status ${res.status}`);

    if (!res.ok) {
      throw new Error(`Failed to delete session: HTTP ${res.status}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[opencode] deleteSessionHttp failed for session ${sessionId}: ${errorMessage}`);
    throw err;
  }
}

export async function sendMessage(sessionId: string, text: string): Promise<OpencodeResponse> {
  const url = `${getAttachUrl()}/session/${sessionId}/message`;
  console.log(`[opencode] sendMessage: POST ${url} (session ${sessionId})`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        parts: [{ type: "text", text }],
      }),
    });

    console.log(`[opencode] sendMessage: response status ${res.status}`);

    if (!res.ok) {
      throw new Error(`Failed to send message: HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;

    // Extract text from parts array
    let responseText = "";
    const parts = data.parts as Array<Record<string, unknown>> | undefined;
    if (parts) {
      for (const part of parts) {
        if (part.type === "text" && typeof part.text === "string") {
          responseText += part.text;
        }
      }
    }

    const preview = responseText.slice(0, 100) || "(no response)";
    console.log(`[opencode] sendMessage: response text preview: ${preview}...`);

    return {
      sessionId,
      text: responseText || "(no response)",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[opencode] sendMessage failed for session ${sessionId}: ${errorMessage}`);
    throw err;
  }
}
