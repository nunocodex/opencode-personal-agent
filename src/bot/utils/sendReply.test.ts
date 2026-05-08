import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendReply } from "./sendReply.js";
import { existsSync } from "fs";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

describe("sendReply", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      reply: vi.fn().mockResolvedValue(undefined),
      replyWithDocument: vi.fn().mockResolvedValue(undefined),
    };
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("single text reply within 4096 chars calls ctx.reply once", async () => {
    const text = "Hello world";
    await sendReply(ctx, text);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith("Hello world", { parse_mode: "Markdown" });
  });

  it("text over 4096 chars calls ctx.reply multiple times with correct chunking", async () => {
    const text = "A".repeat(5000);
    await sendReply(ctx, text);
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    expect(ctx.reply.mock.calls[0][0]).toHaveLength(4096);
    expect(ctx.reply.mock.calls[1][0]).toHaveLength(5000 - 4096);
  });

  it("text with [SEND_FILE:path] calls replyWithDocument for each file, then sends remaining text", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const text = "Here is a file [SEND_FILE:/tmp/test.txt] and some text";
    await sendReply(ctx, text);

    expect(ctx.replyWithDocument).toHaveBeenCalledTimes(1);
    expect(ctx.replyWithDocument).toHaveBeenCalledWith(
      { source: "/tmp/test.txt" },
      {}
    );
    expect(ctx.reply).toHaveBeenCalledWith("Here is a file  and some text", { parse_mode: "Markdown" });
  });

  it("file not found falls back to warning message", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const text = "[SEND_FILE:/tmp/missing.txt]";
    await sendReply(ctx, text);

    expect(ctx.replyWithDocument).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(
      "[File not found: /tmp/missing.txt]",
      {}
    );
  });

  it("passes Markdown parse mode", async () => {
    await sendReply(ctx, "Hello");
    expect(ctx.reply).toHaveBeenCalledWith("Hello", { parse_mode: "Markdown" });
  });

  it("handles error in ctx.reply by retrying without parse_mode", async () => {
    ctx.reply = vi.fn()
      .mockRejectedValueOnce(new Error("Parse error"))
      .mockResolvedValueOnce(undefined);

    await sendReply(ctx, "Hello");
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    expect(ctx.reply).toHaveBeenNthCalledWith(1, "Hello", { parse_mode: "Markdown" });
    expect(ctx.reply).toHaveBeenNthCalledWith(2, "Hello", {});
  });

  it("passes reply_to_message_id when provided", async () => {
    await sendReply(ctx, "Hello", 42);
    expect(ctx.reply).toHaveBeenCalledWith("Hello", {
      parse_mode: "Markdown",
      reply_to_message_id: 42,
    });
  });

  it("handles multiple files and mixed text", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const text = "Start [SEND_FILE:/tmp/a.txt] middle [SEND_FILE:/tmp/b.txt] end";
    await sendReply(ctx, text);

    expect(ctx.replyWithDocument).toHaveBeenCalledTimes(2);
    expect(ctx.reply).toHaveBeenCalledWith("Start  middle  end", { parse_mode: "Markdown" });
  });

  it("catches and logs errors in replyWithDocument", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    ctx.replyWithDocument = vi.fn().mockRejectedValue(new Error("Send failed"));

    const text = "[SEND_FILE:/tmp/err.txt]";
    await sendReply(ctx, text);

    expect(ctx.replyWithDocument).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith("[Failed to send file: /tmp/err.txt]", {});
  });
});
