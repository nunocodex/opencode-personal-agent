import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const {
  mockExistsSync,
  mockMkdirSync,
  mockCreateWriteStream,
  mockUnlinkSync,
  mockFromWeb,
  mockPipeline,
  mockResolve,
  mockFetch,
  mockSpawnAsync,
  mockWarmupWhisperAssets,
} = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockCreateWriteStream: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockFromWeb: vi.fn(),
  mockPipeline: vi.fn(),
  mockResolve: vi.fn((...args: string[]) => args.join("/")),
  mockFetch: vi.fn(),
  mockSpawnAsync: vi.fn(),
  mockWarmupWhisperAssets: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  createWriteStream: mockCreateWriteStream,
  unlinkSync: mockUnlinkSync,
}));

vi.mock("stream/promises", () => ({
  pipeline: mockPipeline,
}));

vi.mock("stream", () => ({
  Readable: {
    fromWeb: mockFromWeb,
  },
}));

vi.mock("path", () => ({
  resolve: mockResolve,
}));

vi.mock("./spawnAsync.js", () => ({
  spawnAsync: mockSpawnAsync,
}));

vi.mock("./assets.js", () => ({
  warmupWhisperAssets: mockWarmupWhisperAssets,
}));

vi.stubGlobal("fetch", mockFetch);

import { runFfmpeg, runWhisper, transcribeVoice } from "./transcribe.js";

describe("runFfmpeg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnAsync.mockReset();
  });

  it("resolves on exit code 0", async () => {
    mockSpawnAsync.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
    await runFfmpeg("in.ogg", "out.wav");
    expect(mockSpawnAsync).toHaveBeenCalledWith("ffmpeg", [
      "-y",
      "-i",
      "in.ogg",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      "out.wav",
    ]);
  });

  it("throws on non-zero exit code", async () => {
    mockSpawnAsync.mockResolvedValue({ stdout: "", stderr: "error msg", exitCode: 1 });
    await expect(runFfmpeg("in.ogg", "out.wav")).rejects.toThrow("ffmpeg failed: error msg");
  });
});

describe("runWhisper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawnAsync.mockReset();
  });

  it("returns trimmed stdout on success", async () => {
    mockSpawnAsync.mockResolvedValue({ stdout: "  hello world  \n", stderr: "", exitCode: 0 });
    const result = await runWhisper({ binaryPath: "/bin/whisper", modelPath: "/model.bin" }, "/audio.wav");
    expect(result).toBe("hello world");
    expect(mockSpawnAsync).toHaveBeenCalledWith("/bin/whisper", [
      "-m",
      "/model.bin",
      "-f",
      "/audio.wav",
      "-np",
      "-nt",
    ]);
  });

  it("throws on non-zero exit code", async () => {
    mockSpawnAsync.mockResolvedValue({ stdout: "", stderr: "whisper err", exitCode: 1 });
    await expect(
      runWhisper({ binaryPath: "/bin/whisper", modelPath: "/model.bin" }, "/audio.wav")
    ).rejects.toThrow("whisper failed: whisper err");
  });
});

describe("transcribeVoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReset();
    mockMkdirSync.mockReset();
    mockCreateWriteStream.mockReset();
    mockUnlinkSync.mockReset();
    mockFromWeb.mockReset();
    mockPipeline.mockReset();
    mockFetch.mockReset();
    mockSpawnAsync.mockReset();
    mockWarmupWhisperAssets.mockReset();
    mockResolve.mockImplementation((...args: string[]) => args.join("/"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("downloads, converts, transcribes, and cleans up", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    mockSpawnAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    mockWarmupWhisperAssets.mockResolvedValue({
      binaryPath: "/bin/whisper",
      modelPath: "/model.bin",
    });
    mockSpawnAsync.mockResolvedValueOnce({ stdout: "transcribed text", stderr: "", exitCode: 0 });

    const result = await transcribeVoice("https://example.com/voice.ogg");

    expect(result).toBe("transcribed text");
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/voice.ogg");
    expect(mockSpawnAsync).toHaveBeenCalledWith("ffmpeg", expect.any(Array));
    expect(mockSpawnAsync).toHaveBeenCalledWith("/bin/whisper", expect.any(Array));
    expect(mockUnlinkSync).toHaveBeenCalledTimes(2);
  });

  it("throws on download failure", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(transcribeVoice("https://example.com/voice.ogg")).rejects.toThrow(
      "Failed to download voice: 404"
    );
  });

  it("throws on empty body", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({ ok: true, body: null });

    await expect(transcribeVoice("https://example.com/voice.ogg")).rejects.toThrow(
      "No response body"
    );
  });

  it("cleans up even on transcription failure", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    mockSpawnAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    mockWarmupWhisperAssets.mockResolvedValue({
      binaryPath: "/bin/whisper",
      modelPath: "/model.bin",
    });
    mockSpawnAsync.mockRejectedValueOnce(new Error("whisper crashed"));

    await expect(transcribeVoice("https://example.com/voice.ogg")).rejects.toThrow("whisper crashed");
    expect(mockUnlinkSync).toHaveBeenCalledTimes(2);
  });

  it("creates temp dir if missing", async () => {
    mockExistsSync.mockReturnValue(false);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    mockSpawnAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    mockWarmupWhisperAssets.mockResolvedValue({
      binaryPath: "/bin/whisper",
      modelPath: "/model.bin",
    });
    mockSpawnAsync.mockResolvedValueOnce({ stdout: "text", stderr: "", exitCode: 0 });

    await transcribeVoice("https://example.com/voice.ogg");

    expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining("temp"), { recursive: true });
  });
});
