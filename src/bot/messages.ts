export const messages = {
  start:
    "Welcome! I'm your personal AI assistant.\n\n" +
    "Send me a message and I'll respond.\n" +
    "I use memory and web search when needed.\n\n" +
    "*/help* - Command list\n" +
    "*/new* - New conversation\n" +
    "*/status* - Session info",

  help:
    "*/start* - Welcome message\n" +
    "*/help* - This message\n" +
    "*/new* - Clear conversation and start a new session\n" +
    "*/status* - Current session info\n\n" +
    "You can send me:\n" +
    "- Text: I respond with AI\n" +
    "- Photos: I analyze with vision model\n" +
    "- PDFs: I analyze the content\n" +
    "- Voice: I transcribe and respond",

  newSession: "Conversation cleared. The next message will create a new session.",
  sessionActive: (count: number): string =>
    `Active session. Total sessions: ${count}`,
  noSession: "No active session.",
  accessDenied: "Access denied.",
  unsupportedFormat:
    "Unsupported format. Supported: PDF, images, text.",
  opencodeError: "Error communicating with the assistant.",
  mediaError: "Error analyzing the file.",
  voiceNotImplemented: "Voice transcription not yet implemented.",

  maxMessageLength: 4096,
} as const;
