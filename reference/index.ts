import { config } from "dotenv";
import { resolve } from "path";
import { runCli } from "./cli.js";

// Load environment variables from .env
// override: true ensures local .env takes precedence over system env vars
config({ path: resolve(process.cwd(), ".env"), override: true });

runCli(process.argv);
