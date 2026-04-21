import fs from "fs";
import path from "path";
import { PROJECTS_DIR } from "../config.js";
import { pathExists } from "../utils/fs.js";
import { updateDepsToLatest } from "../utils/npm.js";

export interface UpdateDepsParams {
  project_path: string;
}

type TextContent = { type: "text"; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

/**
 * Update every entry in `dependencies` and `devDependencies` inside a
 * project's package.json to the latest version from the npm registry.
 *
 * `project_path` can be:
 *  - an absolute path  → used as-is
 *  - a project name    → resolved relative to PROJECTS_DIR
 */
export async function updateDepsTool(
  params: UpdateDepsParams,
): Promise<ToolResult> {
  const { project_path } = params;

  const projectDir = path.isAbsolute(project_path)
    ? project_path
    : path.join(PROJECTS_DIR, project_path);

  const pkgPath = path.join(projectDir, "package.json");

  if (!(await pathExists(pkgPath))) {
    return error(`package.json not found at: ${pkgPath}`);
  }

  let pkg: Record<string, unknown>;
  try {
    const raw = await fs.promises.readFile(pkgPath, "utf-8");
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    return error(`Could not parse package.json: ${(err as Error).message}`);
  }

  const deps = pkg["dependencies"] as Record<string, string> | undefined;
  const devDeps = pkg["devDependencies"] as Record<string, string> | undefined;

  if (!deps && !devDeps) {
    return {
      content: [
        { type: "text", text: "No dependencies found in package.json." },
      ],
    };
  }

  const [depsResult, devDepsResult] = await Promise.all([
    deps
      ? updateDepsToLatest(deps)
      : Promise.resolve({ updated: {}, failed: [] }),
    devDeps
      ? updateDepsToLatest(devDeps)
      : Promise.resolve({ updated: {}, failed: [] }),
  ]);

  if (deps) pkg["dependencies"] = depsResult.updated;
  if (devDeps) pkg["devDependencies"] = devDepsResult.updated;

  try {
    await fs.promises.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch (err) {
    return error(`Could not write package.json: ${(err as Error).message}`);
  }

  const totalUpdated =
    Object.keys(depsResult.updated).length +
    Object.keys(devDepsResult.updated).length;

  const allFailed = [...depsResult.failed, ...devDepsResult.failed];

  const lines = [
    `✅  package.json updated at:`,
    `    ${pkgPath}`,
    ``,
    deps
      ? `📦  dependencies      → ${Object.keys(depsResult.updated).length} package(s) updated`
      : null,
    devDeps
      ? `🛠️   devDependencies   → ${Object.keys(devDepsResult.updated).length} package(s) updated`
      : null,
    `    Total: ${totalUpdated} package(s)`,
    allFailed.length > 0
      ? `\n⚠️   Could not resolve latest version for:\n    ${allFailed.join(", ")}\n    (original version ranges kept)`
      : null,
    ``,
    `Run  npm install  inside the project to apply the changes.`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return { content: [{ type: "text", text: lines }] };
}

function error(message: string): ToolResult {
  return { content: [{ type: "text", text: `❌  ${message}` }], isError: true };
}
