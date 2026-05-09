import { spawn, ChildProcess } from "child_process";

const activeProcesses = new Set<ChildProcess>();

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export function spawnAsync(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
    });

    activeProcesses.add(child);

    let stdout = "";
    let stderr = "";
    let timeoutId: NodeJS.Timeout | undefined;
    let settled = false;

    function settle() {
      if (!settled) {
        settled = true;
        activeProcesses.delete(child);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        settle();
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 5000);
        reject(new Error(`spawnAsync timeout after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
    }

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    child.on("error", (err) => {
      settle();
      reject(err);
    });

    child.on("close", (exitCode) => {
      settle();
      resolve({ stdout, stderr, exitCode });
    });
  });
}

export function killAllSpawnedProcesses(): void {
  for (const child of activeProcesses) {
    if (!child.killed) {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5000);
    }
  }
  activeProcesses.clear();
}

export function getActiveProcessCount(): number {
  return activeProcesses.size;
}
