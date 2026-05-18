import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "../config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DashboardState {
  sessions: number;
  uptime: number;
  quotaUsed: number;
}

let state: DashboardState = {
  sessions: 0,
  uptime: 0,
  quotaUsed: 0,
};

export function updateDashboard(update: Partial<DashboardState>): void {
  Object.assign(state, update);
}

export function createDashboard(config: Config) {
  const app = express();

  app.use(express.json());

  const clientDist = path.resolve(__dirname, "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
  } else {
    console.log("[dashboard] dist not found, API-only mode (use Vite :5173 for UI)");
  }

  app.get("/api/status", (_req, res) => {
    res.json({
      status: "online",
      sessions: state.sessions,
      uptime: state.uptime,
    });
  });

  app.get("/api/quota", (_req, res) => {
    res.json({
      quotaUsed: state.quotaUsed,
    });
  });

  // SPA catch-all — must be after API routes
  if (fs.existsSync(clientDist)) {
    app.get("*", (_req, res) => {
      const indexPath = path.join(clientDist, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: "Dashboard not built. Use Vite dev server on :5173." });
      }
    });
  }

  return app;
}
