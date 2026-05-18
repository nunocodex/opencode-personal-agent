import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Config } from "../config";

export function createClient(config: Config): OpencodeClient {
  const auth =
    "Basic " +
    Buffer.from(
      `${config.OPENCODE_SERVER_USERNAME}:${config.OPENCODE_SERVER_PASSWORD}`
    ).toString("base64");

  return createOpencodeClient({
    baseUrl: config.OPENCODE_SERVER_URL,
    auth,
  });
}

export interface SessionHandle {
  id: string;
}

export async function createSession(
  client: OpencodeClient,
  title?: string
): Promise<SessionHandle> {
  const { data } = await client.session.create({
    title: title ?? "Telegram",
  });
  if (!data) throw new Error("Failed to create session");
  return { id: data.id };
}

export async function sendMessage(
  client: OpencodeClient,
  sessionId: string,
  text: string
): Promise<string> {
  const { data, error } = await client.session.prompt({
    sessionID: sessionId,
    parts: [{ type: "text", text }],
  });

  if (error) {
    throw new Error(`OpenCode error: ${JSON.stringify(error)}`);
  }
  if (!data) throw new Error("No response from OpenCode");

  return stringifyResponse(data.parts);
}

export async function sendMediaMessage(
  client: OpencodeClient,
  sessionId: string,
  text: string,
  dataUri: string,
  mime: string,
  model: string
): Promise<string> {
  const [providerID, modelID] = model.split("/");

  const { data, error } = await client.session.prompt({
    sessionID: sessionId,
    model: { providerID, modelID },
    parts: [
      { type: "text", text },
      { type: "file", mime, filename: "media", url: dataUri },
    ],
  });

  if (error) {
    throw new Error(`OpenCode error: ${JSON.stringify(error)}`);
  }
  if (!data) throw new Error("No response from OpenCode");

  return stringifyResponse(data.parts);
}

export async function deleteSessionById(
  client: OpencodeClient,
  sessionId: string
): Promise<void> {
  await client.session.delete({ sessionID: sessionId });
}

interface ResponsePart {
  type?: string;
  text?: string;
}

function stringifyResponse(parts: unknown): string {
  if (!Array.isArray(parts)) return String(parts);

  return (parts as ResponsePart[])
    .map((p) => {
      if (p.type === "text" && p.text) return p.text;
      if (p.type === "step-start" || p.type === "step-finish") return "";
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
