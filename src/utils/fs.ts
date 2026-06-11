import fs from "fs";
import path from "path";

// ─── Names/patterns to skip during directory copy ────────────────────────────
const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".nyc_output",
]);

// Individual files to never copy (sensitive)
const IGNORED_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.staging",
]);

// File extensions to skip
const IGNORED_EXTENSIONS = new Set([".log"]);

// ─── copyDir ──────────────────────────────────────────────────────────────────
/**
 * Recursively copy `src` into `dest`, honouring the ignore lists above.
 * Returns lists of relative paths that were copied vs. skipped.
 */
export async function copyDir(
  src: string,
  dest: string,
  overwrite = false,
  _relRoot = src,
): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];

  await fs.promises.mkdir(dest, { recursive: true });

  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIR_NAMES.has(entry.name)) continue;
    if (IGNORED_FILE_NAMES.has(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relPath = path.relative(_relRoot, srcPath);

    if (entry.isDirectory()) {
      const result = await copyDir(srcPath, destPath, overwrite, _relRoot);
      copied.push(...result.copied);
      skipped.push(...result.skipped);
    } else if (entry.isFile()) {
      if (IGNORED_EXTENSIONS.has(path.extname(entry.name))) continue;

      const exists = await fs.promises
        .access(destPath)
        .then(() => true)
        .catch(() => false);

      if (exists && !overwrite) {
        skipped.push(relPath);
        continue;
      }

      await fs.promises.copyFile(srcPath, destPath);
      copied.push(relPath);
    }
  }

  return { copied, skipped };
}

// ─── buildTree ────────────────────────────────────────────────────────────────
/**
 * Build a readable directory tree string (similar to the Unix `tree` command).
 */
export async function buildTree(
  dir: string,
  prefix = "",
  maxDepth = 4,
  currentDepth = 0,
): Promise<string> {
  if (currentDepth >= maxDepth) return `${prefix}...\n`;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return "";
  }

  const filtered = entries.filter((e) => !IGNORED_DIR_NAMES.has(e.name));

  let result = "";
  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i]!;
    const isLast = i === filtered.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    result += `${prefix}${connector}${entry.name}${entry.isDirectory() ? "/" : ""}\n`;

    if (entry.isDirectory()) {
      result += await buildTree(
        path.join(dir, entry.name),
        prefix + childPrefix,
        maxDepth,
        currentDepth + 1,
      );
    }
  }

  return result;
}

// ─── pathExists ───────────────────────────────────────────────────────────────
export async function pathExists(p: string): Promise<boolean> {
  return fs.promises
    .access(p)
    .then(() => true)
    .catch(() => false);
}
