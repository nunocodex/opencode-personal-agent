import express from "express";
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
  app.use(express.static(clientDist));

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

  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  return app;
}
