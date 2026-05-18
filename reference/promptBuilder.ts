import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export function buildSystemPrompt(projectDir?: string): string {
  const dir = projectDir ?? process.cwd();
  const memoryDir = resolve(dir, "memory");

  const parts: string[] = [];

  const systemPath = resolve(memoryDir, "SYSTEM.md");
  if (existsSync(systemPath)) {
    parts.push(readFileSync(systemPath, "utf-8"));
  }

  const identityPath = resolve(memoryDir, "IDENTITY.md");
  if (existsSync(identityPath)) {
    parts.push(readFileSync(identityPath, "utf-8"));
  }

  if (parts.length === 0) {
    return "You are a helpful personal assistant.";
  }

  return parts.join("\n\n---\n\n");
}


