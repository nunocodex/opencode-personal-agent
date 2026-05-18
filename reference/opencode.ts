import spawn from "cross-spawn";
import { resolve } from "path";
import { getAttachUrl } from "./opencodeServer.js";

export interface OpencodeMessage {
  role?: string;
  content?: string;
  text?: string;
  message?: string;
  type?: string;
}

export interface OpencodeResponse {
  sessionId?: string;
  messages?: OpencodeMessage[];
  content?: string;
  text?: string;
  message?: string;
}

function parseOpencodeJsonStream(text: string): {
  sessionId?: string;
  responseText?: string;
} {
  const lines = text.split("\n").filter((l) => l.trim());
  let sessionId: string | undefined;
  let responseText: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;

      // Extract sessionId from any event that has it
      if (obj.sessionID && typeof obj.sessionID === "string" && !sessionId) {
        sessionId = obj.sessionID;
      }

      // Extract response text from text events
      if (obj.type === "text") {
        // The text is nested inside obj.part.text in OpenCode's JSON stream
        const part = obj.part as Record<string, unknown> | undefined;
        const textContent =
          (typeof part?.text === "string" ? part.text : undefined) ??
          (typeof part?.content === "string" ? part.content : undefined) ??
          (typeof obj.text === "string" ? obj.text : undefined) ??
          (typeof obj.content === "string" ? obj.content : undefined) ??
          (typeof obj.message === "string" ? obj.message : undefined);
        if (textContent) {
          responseText = textContent;
        }
      }
    } catch {
      // ignore invalid JSON lines
    }
  }

  return { sessionId, responseText };
}

export async function runOpencode(
  message: string,
  options: {
    sessionId?: string;
    projectDir?: string;
    title?: string;
  } = {}
): Promise<OpencodeResponse> {
  const projectDir = options.projectDir ?? process.cwd();
  const args: string[] = ["run", "--format", "json", "--attach", getAttachUrl()];

  if (options.sessionId) {
    args.push("--session", options.sessionId);
  } else {
    args.push("--title", options.title ?? "OpenPersonalAgent chat");
  }

  args.push("--dir", resolve(projectDir));
  // Sanitize newlines: Windows CLI args with newlines may be truncated by the shell,
  // causing only the first line to reach opencode. Replace newlines with spaces to keep
  // the full prompt intact.
  const sanitizedMessage = message.replace(/\n/g, " ");
  args.push(sanitizedMessage);

  console.log("[opencode] spawning:", "opencode", args.join(" "));

  return new Promise((resolvePromise, reject) => {
    const proc = spawn("opencode", args, {
      cwd: projectDir,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Close stdin immediately so opencode knows there is no interactive input
    proc.stdin?.end();

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    // Safety timeout: kill opencode if it runs for too long
    const timeoutMs = 300_000; // 5 minutes max for complex tasks (matches telegraf handlerTimeout)
    const timer = setTimeout(() => {
      timedOut = true;
      console.error("[opencode] timeout after", timeoutMs, "ms — killing process");
      proc.kill("SIGTERM");
      // Force kill after grace period
      setTimeout(() => proc.kill("SIGKILL"), 5_000);
    }, timeoutMs);

    proc.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log("[opencode] stdout chunk:", chunk.slice(0, 200));
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error("[opencode] stderr:", chunk.slice(0, 200));
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      console.log("[opencode] process exited with code", code, "timedOut:", timedOut);

      if (code !== 0 && !timedOut) {
        console.error("[opencode] stderr:", stderr);
      }

      const parsed = parseOpencodeJsonStream(stdout);
      const response: OpencodeResponse = {};

      if (parsed.sessionId) {
        response.sessionId = parsed.sessionId;
      }
      if (parsed.responseText) {
        response.text = parsed.responseText;
      }

      // Fallback if nothing parsed
      if (!response.text) {
        if (stdout.trim()) {
          console.error("[opencode] no response text parsed; full stdout:", stdout.slice(0, 2000));
          response.text = stdout.trim();
        } else if (stderr.trim()) {
          console.error("[opencode] no response text parsed; stderr:", stderr.trim());
          response.text = stderr.trim();
        } else {
          console.error("[opencode] no response text parsed; stdout and stderr are empty");
          response.text = "(no response)";
        }
      }

      resolvePromise(response);
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      console.error("[opencode] spawn error:", err.message);
      reject(new Error(`Failed to spawn opencode: ${err.message}`));
    });
  });
}

export async function listSessions(): Promise<
  { id: string; title: string; updated: string }[]
> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn("opencode", ["session", "list"], {
      env: process.env,
    });

    let stdout = "";
    proc.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on("close", () => {
      // Parse the text table output from `opencode session list`
      const lines = stdout.split("\n").filter((l) => l.trim());
      const sessions: { id: string; title: string; updated: string }[] = [];
      // Skip header lines (contains "Session ID", "Title", "Updated")
      let headerFound = false;
      for (const line of lines) {
        if (line.includes("Session ID") && line.includes("Title")) {
          headerFound = true;
          continue;
        }
        if (!headerFound) continue;
        if (line.startsWith("─")) continue;
        // Format: ses_xxx  Title text    YYYY-MM-DD HH:MM
        // We split by at least 2 spaces
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 3) {
          sessions.push({
            id: parts[0].trim(),
            title: parts[1].trim(),
            updated: parts[2].trim(),
          });
        } else if (parts.length === 2) {
          sessions.push({
            id: parts[0].trim(),
            title: parts[1].trim(),
            updated: "",
          });
        }
      }
      resolvePromise(sessions);
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to list sessions: ${err.message}`));
    });
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn("opencode", ["session", "delete", sessionId], {
      env: process.env,
    });

    proc.on("close", () => {
      resolvePromise();
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to delete session: ${err.message}`));
    });
  });
}

// ── HTTP API helpers for opencode server ──────────────────────────────

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

export async function createSession(title: string, projectDir?: string): Promise<string> {
  const url = new URL("/session", getAttachUrl());
  if (projectDir) {
    url.searchParams.set("directory", resolve(projectDir));
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

export async function sendMessage(
  sessionId: string,
  text: string
): Promise<OpencodeResponse> {
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
