import { createWriteStream } from "fs";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "fs";
import { resolve, join, dirname } from "path";
import { spawnSync } from "child_process";

export interface WhisperAssets {
  binaryPath: string;
  modelPath: string;
}

const WHISPER_ROOT = resolve(process.cwd(), "data", "whisper");
const BIN_DIR = join(WHISPER_ROOT, "bin");
const MODEL_DIR = join(WHISPER_ROOT, "models");

const WHISPER_BINARY_URL =
  "https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip";
const WHISPER_MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function getWhisperBinaryPath(): string {
  ensureDir(BIN_DIR);
  return join(BIN_DIR, process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli");
}

export function getWhisperModelPath(): string {
  ensureDir(MODEL_DIR);
  return join(MODEL_DIR, "ggml-base.bin");
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }
  const body = res.body;
  if (!body) {
    throw new Error(`No response body for ${url}`);
  }

  const parent = dirname(dest);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  const fileStream = createWriteStream(dest);
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
    }
    fileStream.end();
  } catch (err) {
    fileStream.destroy();
    throw err;
  }

  return new Promise((resolve, reject) => {
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

function findExecutable(dir: string, name: string): string | null {
  const entries = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
    : [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return full;
    if (entry.isDirectory()) {
      const found = findExecutable(full, name);
      if (found) return found;
    }
  }
  return null;
}

async function ensureWhisperBinary(): Promise<void> {
  const binaryPath = getWhisperBinaryPath();
  if (existsSync(binaryPath)) return;

  ensureDir(BIN_DIR);
  const platform = `${process.platform}-${process.arch}`;

  if (platform === "win32-x64") {
    const zipPath = join(WHISPER_ROOT, "whisper.zip");
    console.log("[voice] downloading whisper binary for win32-x64...");
    await downloadFile(WHISPER_BINARY_URL, zipPath);

    console.log("[voice] extracting whisper binary...");
    const result = spawnSync(
      "powershell",
      ["-Command", `Expand-Archive -Path "${zipPath}" -DestinationPath "${BIN_DIR}" -Force`],
      { encoding: "utf8" }
    );
    if (result.status !== 0) {
      throw new Error(`Failed to extract whisper binary: ${result.stderr}`);
    }

    rmSync(zipPath, { force: true });

    // On Windows the archive extracts into a Release/ subfolder; DLLs must be
    // next to the executable. Flatten everything into BIN_DIR.
    const releaseDir = join(BIN_DIR, "Release");
    if (existsSync(releaseDir)) {
      for (const entry of readdirSync(releaseDir, { withFileTypes: true })) {
        const src = join(releaseDir, entry.name);
        const dst = join(BIN_DIR, entry.name);
        if (existsSync(dst)) {
          rmSync(dst, { force: true });
        }
        renameSync(src, dst);
      }
      rmSync(releaseDir, { recursive: true, force: true });
    }

    const found = findExecutable(BIN_DIR, "whisper-cli.exe");
    if (!found) {
      throw new Error("whisper-cli.exe not found in extracted archive");
    }
    if (found !== binaryPath) {
      renameSync(found, binaryPath);
    }
    console.log("[voice] whisper binary ready");
  } else {
    throw new Error(
      `Automatic whisper binary download not supported for ${platform}. ` +
        `Please install whisper.cpp manually and place whisper-cli in ${BIN_DIR}`
    );
  }
}

async function ensureWhisperModel(): Promise<void> {
  const modelPath = getWhisperModelPath();
  if (existsSync(modelPath)) return;

  ensureDir(MODEL_DIR);
  console.log("[voice] downloading whisper model (ggml-base.bin ~148MB)...");
  await downloadFile(WHISPER_MODEL_URL, modelPath);
  console.log("[voice] whisper model ready");
}

let warmupPromise: Promise<WhisperAssets> | null = null;

export async function warmupWhisperAssets(): Promise<WhisperAssets> {
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    await ensureWhisperBinary();
    await ensureWhisperModel();
    return { binaryPath: getWhisperBinaryPath(), modelPath: getWhisperModelPath() };
  })().catch((err) => {
    warmupPromise = null;
    throw err;
  });

  return warmupPromise;
}

export function resetWarmup(): void {
  warmupPromise = null;
}
