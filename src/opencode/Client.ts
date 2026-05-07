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
