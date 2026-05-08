import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const TEST_URL = "http://127.0.0.1:4096";

vi.mock("./Server.js", () => ({
  getAttachUrl: vi.fn(() => TEST_URL),
}));

describe("Client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("OPENCODE_SERVER_PASSWORD", "");
    vi.stubEnv("OPENCODE_SERVER_USERNAME", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function importClient() {
    return import("./Client.js");
  }

  it("createSession success returns sessionId", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "sess-123" }), { status: 200 })
    );

    const { createSession } = await importClient();
    const id = await createSession("Test Session");
    expect(id).toBe("sess-123");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/session"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("createSession throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    );

    const { createSession } = await importClient();
    await expect(createSession("Test")).rejects.toThrow(/Failed to create session/);
  });

  it("createSession throws on missing id", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    const { createSession } = await importClient();
    await expect(createSession("Test")).rejects.toThrow(/missing id/);
  });

  it("deleteSessionHttp success returns void", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 200 })
    );

    const { deleteSessionHttp } = await importClient();
    await expect(deleteSessionHttp("sess-123")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/session/sess-123"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("deleteSessionHttp throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Not Found", { status: 404 })
    );

    const { deleteSessionHttp } = await importClient();
    await expect(deleteSessionHttp("sess-123")).rejects.toThrow(/Failed to delete session/);
  });

  it("sendMessage success returns response text", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ parts: [{ type: "text", text: "Hello!" }] }),
        { status: 200 }
      )
    );

    const { sendMessage } = await importClient();
    const result = await sendMessage("sess-123", "Hi");
    expect(result.text).toBe("Hello!");
    expect(result.sessionId).toBe("sess-123");
  });

  it("sendMessage extracts text from multiple parts", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          parts: [
            { type: "text", text: "Part 1" },
            { type: "text", text: "Part 2" },
          ],
        }),
        { status: 200 }
      )
    );

    const { sendMessage } = await importClient();
    const result = await sendMessage("sess-123", "Hi");
    expect(result.text).toBe("Part 1Part 2");
  });

  it("sendMessage throws on HTTP error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Bad Request", { status: 400 })
    );

    const { sendMessage } = await importClient();
    await expect(sendMessage("sess-123", "Hi")).rejects.toThrow(/Failed to send message/);
  });

  it("sends auth headers when password is set", async () => {
    vi.stubEnv("OPENCODE_SERVER_PASSWORD", "secret");
    vi.stubEnv("OPENCODE_SERVER_USERNAME", "admin");

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "sess-123" }), { status: 200 })
    );

    const { createSession } = await importClient();
    await createSession("Test");

    const call = vi.mocked(fetch).mock.calls[0];
    const opts = call[1] as any;
    expect(opts.headers["Authorization"]).toMatch(/^Basic /);
  });

  it("omits auth headers when password is not set", async () => {
    vi.stubEnv("OPENCODE_SERVER_PASSWORD", "");
    vi.stubEnv("OPENCODE_SERVER_USERNAME", "");

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "sess-123" }), { status: 200 })
    );

    const { createSession } = await importClient();
    await createSession("Test");

    const call = vi.mocked(fetch).mock.calls[0];
    const opts = call[1] as any;
    expect(opts.headers["Authorization"]).toBeUndefined();
  });

  it("uses default username when only password is set", async () => {
    vi.stubEnv("OPENCODE_SERVER_PASSWORD", "secret");
    vi.stubEnv("OPENCODE_SERVER_USERNAME", "");

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "sess-123" }), { status: 200 })
    );

    const { createSession } = await importClient();
    await createSession("Test");

    const call = vi.mocked(fetch).mock.calls[0];
    const opts = call[1] as any;
    expect(opts.headers["Authorization"]).toMatch(/^Basic /);
  });
});
