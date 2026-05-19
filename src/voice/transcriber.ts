import { pipeline } from "@xenova/transformers";
import { execSync } from "node:child_process";

type TranscriberFn = (audio: Float32Array) => Promise<{ text: string }>;

let transcriber: TranscriberFn | null = null;
let ffmpegChecked = false;

function ensureFfmpeg(): void {
  if (ffmpegChecked) return;
  ffmpegChecked = true;
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
  } catch {
    throw new Error(
      "ffmpeg is required for voice transcription. Install it via:\n" +
      "  winget install FFmpeg (Windows)\n" +
      "  brew install ffmpeg (Mac)\n" +
      "  apt install ffmpeg (Linux)"
    );
  }
}

export async function transcribeOgg(buffer: Uint8Array): Promise<string> {
  if (!transcriber) {
    const pipe = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small"
    );
    transcriber = (audio: Float32Array) =>
      pipe(audio, { language: "auto" }) as Promise<{ text: string }>;
  }

  ensureFfmpeg();

  const float32 = decodeOggToPcm(buffer);
  const result = await transcriber(float32);
  return result.text;
}

function decodeOggToPcm(oggData: Uint8Array): Float32Array {
  const stdout = execSync(
    "ffmpeg -i pipe:0 -f f32le -acodec pcm_f32le -ar 16000 -ac 1 pipe:1",
    {
      input: Buffer.from(oggData),
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024,
    }
  );
  return new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4);
}

export async function transcribeAudio(buffer: ArrayBuffer): Promise<string> {
  return transcribeOgg(new Uint8Array(buffer));
}
