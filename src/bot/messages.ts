export const messages = {
  start:
    "<b>Welcome!</b> I'm your personal AI assistant.\n\n" +
    "Send me a message and I'll respond.\n" +
    "I use memory and web search when needed.\n\n" +
    "<b>/help</b> - Command list\n" +
    "<b>/new</b> - New conversation\n" +
    "<b>/status</b> - Session info",

  help:
    "<b>/start</b> - Welcome message\n" +
    "<b>/help</b> - This message\n" +
    "<b>/new</b> - Clear conversation and start a new session\n" +
    "<b>/status</b> - Current session info\n\n" +
    "You can send me:\n" +
    "- <b>Text</b>: I respond with AI\n" +
    "- <b>Photos</b>: I analyze with vision model\n" +
    "- <b>PDFs</b>: I analyze the content\n" +
    "- <b>Voice</b>: I transcribe and respond",

  newSession: "Conversation cleared. The next message will create a new session.",
  sessionActive: (count: number): string =>
    `<b>Active session.</b> Total sessions: ${count}`,
  noSession: "No active session.",
  accessDenied: "Access denied.",
  unsupportedFormat:
    "Unsupported format. Supported: PDF, images, text.",
  opencodeError: "Error communicating with the assistant.",
  mediaError: "Error analyzing the file.",
  voiceNotImplemented: "Voice transcription not yet implemented.",
} as const;

export const PARSE_MODE = "HTML" as const;
