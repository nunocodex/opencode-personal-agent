import { readFile, writeFile, access, mkdir, rm, readdir } from "fs/promises";
import { existsSync, mkdirSync, createWriteStream, renameSync, readdirSync, rmSync } from "fs";
import { resolve, join, basename, extname } from "path";
import { spawnSync } from "child_process";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { OggOpusDecoder } from "ogg-opus-decoder";

const WHISPER_ROOT = resolve(process.cwd(), ".whisper");
const BIN_DIR = join(WHISPER_ROOT, "bin");
const MODEL_DIR = join(WHISPER_ROOT, "models");
const TMP_DIR = join(WHISPER_ROOT, "tmp");

function getWhisperBinaryPath(): string {
  return join(BIN_DIR, process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli");
}

function getModelPath(): string {
  return join(MODEL_DIR, "ggml-base.bin");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const body = res.body;
  if (!body) throw new Error("No response body");
  await pipeline(Readable.fromWeb(body as any), createWriteStream(dest));
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
  if (await fileExists(binaryPath)) return;

  mkdirSync(BIN_DIR, { recursive: true });
  const platform = `${process.platform}-${process.arch}`;

  if (platform === "win32-x64") {
    const zipPath = join(WHISPER_ROOT, "whisper.zip");
    console.log("voice: downloading whisper binary for win32-x64...");
    await downloadFile(
      "https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip",
      zipPath
    );
    console.log("voice: extracting whisper binary...");
    const result = spawnSync(
      "powershell",
      ["-Command", `Expand-Archive -Path "${zipPath}" -DestinationPath "${BIN_DIR}" -Force`],
      { encoding: "utf8" }
    );
    if (result.status !== 0) {
      throw new Error(`Failed to extract whisper binary: ${result.stderr}`);
    }
    await rm(zipPath, { force: true });

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
    console.log("voice: whisper binary ready");
  } else {
    throw new Error(
      `Automatic whisper binary download not supported for ${platform}. ` +
        `Please install whisper.cpp manually and place whisper-cli in ${BIN_DIR}`
    );
  }
}

async function ensureWhisperModel(): Promise<void> {
  const modelPath = getModelPath();
  if (await fileExists(modelPath)) return;

  mkdirSync(MODEL_DIR, { recursive: true });
  console.log("voice: downloading whisper model (ggml-base.bin ~148MB)...");
  await downloadFile(
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    modelPath
  );
  console.log("voice: whisper model ready");
}

let warmupPromise: Promise<void> | null = null;

export function warmupWhisperAssets(): Promise<void> {
  if (!warmupPromise) {
    warmupPromise = (async () => {
      await ensureWhisperBinary();
      await ensureWhisperModel();
    })().catch((err) => {
      warmupPromise = null;
      throw err;
    });
  }
  return warmupPromise;
}

// OGG -> WAV conversion (Telegram voice messages are Ogg Opus)
function downmixToMono(channelData: Float32Array[]): Float32Array {
  if (channelData.length === 0) return new Float32Array();
  if (channelData.length === 1) return channelData[0];
  const samples = channelData[0].length;
  const out = new Float32Array(samples);
  const scale = 1 / channelData.length;
  for (let i = 0; i < samples; i++) {
    let mixed = 0;
    for (const channel of channelData) mixed += channel[i] ?? 0;
    out[i] = mixed * scale;
  }
  return out;
}

function resampleLinear(input: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) return input;
  if (input.length === 0) return new Float32Array();
  const targetLength = Math.max(1, Math.round((input.length * targetRate) / sourceRate));
  const output = new Float32Array(targetLength);
  const ratio = sourceRate / targetRate;
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const left = Math.floor(srcIndex);
    const right = Math.min(left + 1, input.length - 1);
    const frac = srcIndex - left;
    output[i] = input[left] * (1 - frac) + input[right] * frac;
  }
  return output;
}

function encodeMonoPcm16Wav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const channels = 1;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const pcm = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(offset, pcm, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

async function decodeOggToWav(inputPath: string, outputPath: string): Promise<void> {
  const decoder = new OggOpusDecoder({ forceStereo: false });
  try {
    await decoder.ready;
    const inputBytes = new Uint8Array(await readFile(inputPath));
    const decoded = await decoder.decodeFile(inputBytes);
    if (!decoded.channelData.length) {
      throw new Error("decoded audio is empty");
    }
    const mono = downmixToMono(decoded.channelData);
    const mono16k = resampleLinear(mono, decoded.sampleRate, 16000);
    const wavBytes = encodeMonoPcm16Wav(mono16k, 16000);
    await writeFile(outputPath, wavBytes);
  } finally {
    decoder.free();
  }
}

export async function transcribeVoice(inputPath: string): Promise<string> {
  mkdirSync(TMP_DIR, { recursive: true });

  const ext = extname(inputPath).toLowerCase();
  const baseName = basename(inputPath, ext);
  const wavPath = join(TMP_DIR, `${baseName}-${Date.now()}.wav`);

  try {
    await decodeOggToWav(inputPath, wavPath);

    await warmupWhisperAssets();

    const binaryPath = getWhisperBinaryPath();
    const modelPath = getModelPath();

    console.log(`voice: transcribing ${wavPath}...`);
    const result = spawnSync(
      binaryPath,
      ["-m", modelPath, "-f", wavPath, "--no-timestamps", "-l", "it"],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );

    if (result.status !== 0) {
      throw new Error(`whisper transcription failed: ${result.stderr}`);
    }

    const transcript = result.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== "[BLANK_AUDIO]")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    console.log(`voice: transcription result: "${transcript}"`);
    return transcript;
  } finally {
    await rm(wavPath, { force: true }).catch(() => {});
  }
}
