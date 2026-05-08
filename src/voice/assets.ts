import { createWriteStream } from "fs";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

export interface WhisperAssets {
  binaryPath: string;
  modelPath: string;
}

const WHISPER_BINARY_URL =
  "https://github.com/ggerganov/whisper.cpp/releases/download/v1.5.4/whisper-blas-bin-x64.zip";
const WHISPER_MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";

function assetsDir(): string {
  const dir = resolve(process.cwd(), "data", "whisper");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getWhisperBinaryPath(): string {
  return resolve(assetsDir(), "whisper-cli.exe");
}

export function getWhisperModelPath(): string {
  return resolve(assetsDir(), "ggml-base.en.bin");
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

let warmupPromise: Promise<WhisperAssets> | null = null;

export async function warmupWhisperAssets(): Promise<WhisperAssets> {
  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    const binaryPath = getWhisperBinaryPath();
    const modelPath = getWhisperModelPath();

    if (!existsSync(binaryPath)) {
      console.log(`[voice] downloading whisper binary to ${binaryPath}`);
      await downloadFile(WHISPER_BINARY_URL, binaryPath);
    }

    if (!existsSync(modelPath)) {
      console.log(`[voice] downloading whisper model to ${modelPath}`);
      await downloadFile(WHISPER_MODEL_URL, modelPath);
    }

    return { binaryPath, modelPath };
  })();

  return warmupPromise;
}

export function resetWarmup(): void {
  warmupPromise = null;
}
