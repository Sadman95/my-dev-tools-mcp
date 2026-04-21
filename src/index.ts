/**
 * my-dev-tools-mcp — Personal MCP server for daily development automation
 *
 * Registered tools:
 *   list_projects        – list all directories in your projects folder
 *   import_boilerplate   – scaffold a new project from the nodejs-boilerplate
 *   update_project_deps  – bump all npm deps in a project to latest
 *   project_structure    – print the directory tree of any project
 *
 * Adding a new tool is straightforward:
 *   1. Create src/tools/my-new-tool.ts  (export an async handler function)
 *   2. Register it below with server.tool(...)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

import { BOILERPLATE_DIR, PROJECTS_DIR } from "./config.js";
import { importBoilerplateTool } from "./tools/import-boilerplate.js";
import { listProjectsTool } from "./tools/list-projects.js";
import { projectStructureTool } from "./tools/project-structure.js";
import { updateDepsTool } from "./tools/update-deps.js";

// ─── Server instance ──────────────────────────────────────────────────────────
const server = new McpServer({
  name: "my-dev-tools",
  version: "1.0.0",
});

// ─── Tool: list_projects ──────────────────────────────────────────────────────
server.registerTool(
  "list_projects",
  {
    description: `List all project directories in ${PROJECTS_DIR}.`,
  },
  async () => listProjectsTool(),
);

// ─── Tool: import_boilerplate ─────────────────────────────────────────────────
server.registerTool(
  "import_boilerplate",
  {
    description: `Copy the Node.js boilerplate from ${BOILERPLATE_DIR} into a new project directory. ` +
      `Optionally updates all npm dependencies to their latest published versions.`,
    inputSchema: z.object({
    project_name: z
      .string()
      .min(1)
      .describe(
        "Name for the new project. Used as the directory name and the package.json `name` field.",
      ),
    target_path: z
      .string()
      .optional()
      .describe(
        `Absolute path where the project should be created. Defaults to ${PROJECTS_DIR}/{project_name}`,
      ),
    overwrite: z
      .boolean()
      .optional()
      .describe(
        "If true, overwrite files that already exist in the target directory. Default: false",
      ),
    update_deps: z
      .boolean()
      .optional()
      .describe(
        "If true (default), fetch the latest version of every npm dependency from the registry " +
          "and update package.json before writing it.",
      ),
  }),
  },
  async (params) => importBoilerplateTool(params),
);

// ─── Tool: update_project_deps ────────────────────────────────────────────────
server.registerTool(
  "update_project_deps",
  {
    description: `Fetch the latest published version of every npm dependency in a project and rewrite its package.json.`,
    inputSchema: z.object({
      project_path: z
        .string()
        .min(1)
        .describe(
          `Project name (relative to ${PROJECTS_DIR}) or absolute path to the project root.`,
        ),
    }),
  },
  async (params) => updateDepsTool(params),
);

// ─── Tool: project_structure ──────────────────────────────────────────────────
server.registerTool(
  "project_structure",
  {
    description: `Print the directory tree of a project (node_modules / dist excluded).`,
    inputSchema: z.object({
      project_name_or_path: z
        .string()
      .min(1)
      .describe(
        `Project name (relative to ${PROJECTS_DIR}) or absolute path to any directory.`,
      ),
    max_depth: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("How many levels deep to traverse. Default: 4"),
  })},
  async (params) => projectStructureTool(params),
);

// ─── Start ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Use stderr so it doesn't corrupt the MCP stdio protocol
  console.error("[my-dev-tools-mcp] Server started and ready.");
}

main().catch((err: unknown) => {
  console.error("[my-dev-tools-mcp] Fatal error:", err);
  process.exit(1);
});
