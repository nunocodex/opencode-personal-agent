import { botConfig } from "../config/bot.config.js";

const OPENCODE_SERVER_URL = botConfig.opencodeServerUrl;

const parsedUrl = new URL(OPENCODE_SERVER_URL);
const OPENCODE_SERVER_HOST = parsedUrl.hostname;
const OPENCODE_SERVER_PORT = parseInt(parsedUrl.port, 10) || 4096;

export { OPENCODE_SERVER_URL, OPENCODE_SERVER_HOST, OPENCODE_SERVER_PORT };

export function getAttachUrl(): string {
  return OPENCODE_SERVER_URL;
}
