import { pipeline } from "@xenova/transformers";

type TranscriberFn = (audio: Float32Array) => Promise<{ text: string }>;

let transcriber: TranscriberFn | null = null;

export async function transcribeAudio(buffer: ArrayBuffer): Promise<string> {
  if (!transcriber) {
    const pipe = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small"
    );
    transcriber = (audio: Float32Array) =>
      pipe(audio, { language: "auto" }) as Promise<{ text: string }>;
  }

  const float32 = bufferToFloat32(buffer);
  const result = await transcriber(float32);
  return result.text;
}

function bufferToFloat32(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const samples = new Float32Array(view.byteLength / 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  return samples;
}
