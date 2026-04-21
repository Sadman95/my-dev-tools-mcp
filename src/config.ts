import path from "path";

// ─── Resolve the projects root directory ─────────────────────────────────────
// Override via environment variables when registering this server in VS Code
// or Claude Desktop if your layout differs.
export const PROJECTS_DIR: string =
  process.env["PROJECTS_DIR"] ?? "D:/projects";

export const BOILERPLATE_NAME: string =
  process.env["BOILERPLATE_NAME"] ?? "nodejs-boilerplate";

export const BOILERPLATE_DIR: string =
  process.env["BOILERPLATE_DIR"] ?? path.join(PROJECTS_DIR, BOILERPLATE_NAME);

// ─── GitHub fallback ──────────────────────────────────────────────────────────
// If the boilerplate is not found locally, the MCP will clone it from this URL.
// Set this to your own fork/repo if you rename it.
export const BOILERPLATE_REPO: string =
  process.env["BOILERPLATE_REPO"] ??
  "https://github.com/Sadman95/nodejsjs-boilerplate.git";
