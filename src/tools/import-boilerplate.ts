import fs from "fs";
import os from "os";
import path from "path";
import {
  BOILERPLATE_DIR,
  BOILERPLATE_NAME,
  BOILERPLATE_REPO,
  PROJECTS_DIR,
} from "../config.js";
import { copyDir, pathExists } from "../utils/fs.js";
import { cloneRepo, isGitAvailable } from "../utils/git.js";
import { updateDepsToLatest } from "../utils/npm.js";

export interface ImportBoilerplateParams {
  project_name: string;
  target_path?: string;
  overwrite?: boolean;
  update_deps?: boolean;
}

type TextContent = { type: "text"; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

export async function importBoilerplateTool(
  params: ImportBoilerplateParams,
): Promise<ToolResult> {
  const {
    project_name,
    target_path,
    overwrite = false,
    update_deps = true,
  } = params;

  // ── Resolve the target directory ──────────────────────────────────────────
  const targetDir = target_path ?? path.join(PROJECTS_DIR, project_name);

  // Prevent path traversal outside PROJECTS_DIR when using a relative name
  if (!target_path) {
    const resolved = path.resolve(targetDir);
    const projectsRoot = path.resolve(PROJECTS_DIR);
    if (
      !resolved.startsWith(projectsRoot + path.sep) &&
      resolved !== projectsRoot
    ) {
      return error(
        `Invalid project_name — resolved path is outside ${PROJECTS_DIR}`,
      );
    }
  }

  // ── Resolve boilerplate source (local first, then GitHub clone) ──────────
  let boilerplateSource = BOILERPLATE_DIR;
  let tempCloneDir: string | null = null;
  let clonedFromGitHub = false;

  if (!(await pathExists(BOILERPLATE_DIR))) {
    if (!BOILERPLATE_REPO) {
      return error(
        `Boilerplate not found locally at: ${BOILERPLATE_DIR}\n` +
          `Set the BOILERPLATE_REPO env var to a GitHub URL to enable auto-clone.`,
      );
    }

    if (!(await isGitAvailable())) {
      return error(
        `Boilerplate not found locally at: ${BOILERPLATE_DIR}\n` +
          `Git is not installed or not on PATH — cannot clone from GitHub.\n` +
          `Install git from https://git-scm.com/ and try again.`,
      );
    }

    // Clone into a temp directory so we can copy from it
    tempCloneDir = path.join(os.tmpdir(), `boilerplate-clone-${Date.now()}`);
    try {
      await cloneRepo(BOILERPLATE_REPO, tempCloneDir);
      boilerplateSource = tempCloneDir;
      clonedFromGitHub = true;
    } catch (err) {
      return error(
        `Failed to clone boilerplate from ${BOILERPLATE_REPO}:\n${(err as Error).message}`,
      );
    }
  }

  // ── Guard: don't overwrite the boilerplate itself ─────────────────────────
  if (path.resolve(targetDir) === path.resolve(BOILERPLATE_DIR)) {
    return error(`Target path cannot be the boilerplate directory itself.`);
  }

  // ── Copy files ────────────────────────────────────────────────────────────
  let copied: string[] = [];
  let skipped: string[] = [];
  try {
    ({ copied, skipped } = await copyDir(
      boilerplateSource,
      targetDir,
      overwrite,
    ));
  } catch (err) {
    return error(`Failed to copy files: ${(err as Error).message}`);
  } finally {
    // Always clean up the temp clone dir
    if (tempCloneDir) {
      await fs.promises
        .rm(tempCloneDir, { recursive: true, force: true })
        .catch(() => {});
    }
  }

  // ── Patch package.json ────────────────────────────────────────────────────
  const pkgPath = path.join(targetDir, "package.json");
  const failedDeps: string[] = [];

  try {
    const raw = await fs.promises.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    pkg["name"] = project_name;
    pkg["version"] = "0.1.0";
    // Remove the private flag so the new project can be published if desired
    delete pkg["private"];

    if (update_deps) {
      const deps = pkg["dependencies"] as Record<string, string> | undefined;
      const devDeps = pkg["devDependencies"] as
        | Record<string, string>
        | undefined;

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

      failedDeps.push(...depsResult.failed, ...devDepsResult.failed);
    }

    await fs.promises.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch (err) {
    // Non-fatal — report but continue
    failedDeps.push(`(package.json error: ${(err as Error).message})`);
  }

  // ── Build summary ─────────────────────────────────────────────────────────
  const text = [
    `✅  Boilerplate "${BOILERPLATE_NAME}" imported into:`,
    `    ${targetDir}`,
    ``,
    clonedFromGitHub
      ? `🌐  Source: cloned from ${BOILERPLATE_REPO}`
      : `💾  Source: local copy at ${BOILERPLATE_DIR}`,
    `📂  ${copied.length} file(s) copied`,
    skipped.length > 0
      ? `⏭️   ${skipped.length} file(s) skipped (already exist — use overwrite:true to replace)`
      : null,
    `📦  package.json → name set to "${project_name}", version reset to 0.1.0`,
    update_deps
      ? `🔄  All npm dependencies updated to latest versions from registry`
      : null,
    failedDeps.length > 0
      ? `⚠️   Could not resolve latest version for: ${failedDeps.join(", ")}`
      : null,
    ``,
    `─── Next steps ────────────────────────────────────────`,
    `  cd ${targetDir}`,
    `  npm install`,
    `  copy .env.example to .env  (then fill in your secrets)`,
    `  npm run dev`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return { content: [{ type: "text", text }] };
}

function error(message: string): ToolResult {
  return { content: [{ type: "text", text: `❌  ${message}` }], isError: true };
}
