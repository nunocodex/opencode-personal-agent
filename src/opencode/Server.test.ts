import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Server", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("../config/bot.config.js");
  });

  async function importServer() {
    return import("./Server.js");
  }

  it("getAttachUrl returns correct URL from config", async () => {
    vi.doMock("../config/bot.config.js", () => ({
      botConfig: { opencodeServerUrl: "http://127.0.0.1:4096" },
    }));

    const { getAttachUrl } = await importServer();
    expect(getAttachUrl()).toBe("http://127.0.0.1:4096");
  });

  it("defaults to port 4096 when URL has no port", async () => {
    vi.doMock("../config/bot.config.js", () => ({
      botConfig: { opencodeServerUrl: "http://127.0.0.1" },
    }));

    const { OPENCODE_SERVER_PORT } = await importServer();
    expect(OPENCODE_SERVER_PORT).toBe(4096);
  });

  it("uses explicit port when present", async () => {
    vi.doMock("../config/bot.config.js", () => ({
      botConfig: { opencodeServerUrl: "http://127.0.0.1:8080" },
    }));

    const { OPENCODE_SERVER_PORT } = await importServer();
    expect(OPENCODE_SERVER_PORT).toBe(8080);
  });

  it("port 0 falls back to 4096 because || treats 0 as falsy", async () => {
    vi.doMock("../config/bot.config.js", () => ({
      botConfig: { opencodeServerUrl: "http://127.0.0.1:0" },
    }));

    const { OPENCODE_SERVER_PORT } = await importServer();
    expect(OPENCODE_SERVER_PORT).toBe(4096);
  });

  it("extracts hostname correctly", async () => {
    vi.doMock("../config/bot.config.js", () => ({
      botConfig: { opencodeServerUrl: "http://192.168.1.100:3000" },
    }));

    const { OPENCODE_SERVER_HOST } = await importServer();
    expect(OPENCODE_SERVER_HOST).toBe("192.168.1.100");
  });

  it("extracts hostname for localhost", async () => {
    vi.doMock("../config/bot.config.js", () => ({
      botConfig: { opencodeServerUrl: "http://localhost:4096" },
    }));

    const { OPENCODE_SERVER_HOST } = await importServer();
    expect(OPENCODE_SERVER_HOST).toBe("localhost");
  });
});
