import { spawn } from "cross-spawn";
import { resolve } from "path";

export const OPENCODE_SERVER_URL = process.env.OPENCODE_SERVER_URL ?? "http://127.0.0.1:4096";

const parsedUrl = new URL(OPENCODE_SERVER_URL);
const OPENCODE_SERVER_HOST = parsedUrl.hostname;
const OPENCODE_SERVER_PORT = parseInt(parsedUrl.port, 10) || 4096;

let serverProcess: ReturnType<typeof spawn> | null = null;

export async function isHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENCODE_SERVER_URL}/global/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function waitForHealthy(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function killZombie(): Promise<void> {
  if (serverProcess && !serverProcess.killed) {
    console.log("[opencode-server] killing existing process...");
    serverProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 5000));
    if (!serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
    serverProcess = null;
  }
}

export async function startServer(projectDir: string): Promise<void> {
  if (await isHealthy()) {
    console.log("[opencode-server] already healthy, reusing existing server");
    return;
  }

  await killZombie();

  console.log("[opencode-server] starting...");

  serverProcess = spawn(
    "opencode",
    ["serve", "--port", String(OPENCODE_SERVER_PORT), "--hostname", OPENCODE_SERVER_HOST],
    {
      cwd: projectDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    }
  );

  serverProcess.stdout?.on("data", (d: Buffer) => {
    const line = d.toString().trim();
    if (line) console.log("[opencode-serve]", line);
  });

  serverProcess.stderr?.on("data", (d: Buffer) => {
    const line = d.toString().trim();
    if (line) console.error("[opencode-serve]", line);
  });

  serverProcess.on("close", (code) => {
    console.log(`[opencode-server] process exited with code ${code}`);
    serverProcess = null;
  });

  serverProcess.on("error", (err) => {
    console.error("[opencode-server] spawn error:", err.message);
    serverProcess = null;
  });

  const ready = await waitForHealthy(30000);
  if (!ready) {
    throw new Error("opencode serve failed to become healthy within 30s");
  }

  console.log("[opencode-server] ready at", OPENCODE_SERVER_URL);
}

export async function stopServer(): Promise<void> {
  if (serverProcess && !serverProcess.killed) {
    console.log("[opencode-server] stopping...");
    serverProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 5000));
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
    serverProcess = null;
  }
}

export function getAttachUrl(): string {
  return OPENCODE_SERVER_URL;
}
