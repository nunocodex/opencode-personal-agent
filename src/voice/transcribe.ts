import { existsSync, mkdirSync, createWriteStream, unlinkSync } from "fs";
import { resolve } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { spawnAsync } from "./spawnAsync.js";
import { warmupWhisperAssets, WhisperAssets } from "./assets.js";

export async function runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
  const result = await spawnAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr || result.stdout}`);
  }
}

export async function runWhisper(
  assets: WhisperAssets,
  wavPath: string,
  language?: string
): Promise<string> {
  const args = [
    "-m",
    assets.modelPath,
    "-f",
    wavPath,
    "-nt",
  ];
  if (language) {
    args.push("-l", language);
  }

  const result = await spawnAsync(assets.binaryPath, args);

  if (result.exitCode !== 0) {
    throw new Error(`whisper failed: ${result.stderr || result.stdout}`);
  }

  // Filter out empty lines and [BLANK_AUDIO] markers, normalize whitespace
  return result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== "[BLANK_AUDIO]")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function transcribeVoice(fileUrl: string, language?: string): Promise<string> {
  const tempDir = resolve(process.cwd(), "data", "temp");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const baseName = `voice_${Date.now()}`;
  const oggPath = resolve(tempDir, `${baseName}.ogg`);
  const wavPath = resolve(tempDir, `${baseName}.wav`);

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) {
      throw new Error(`Failed to download voice: ${res.status}`);
    }
    const body = res.body;
    if (!body) {
      throw new Error("No response body");
    }
    await pipeline(Readable.fromWeb(body as any), createWriteStream(oggPath));

    await runFfmpeg(oggPath, wavPath);

    const assets = await warmupWhisperAssets();
    const text = await runWhisper(assets, wavPath, language);

    return text;
  } finally {
    try {
      if (existsSync(oggPath)) unlinkSync(oggPath);
    } catch {
      // ignore cleanup errors
    }
    try {
      if (existsSync(wavPath)) unlinkSync(wavPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
