import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Clone a git repository into `destDir`.
 * Uses `--depth 1` (shallow clone) for speed — we only need the latest files.
 * Throws if git is not installed or the clone fails.
 */
export async function cloneRepo(
  repoUrl: string,
  destDir: string,
): Promise<void> {
  // Validate the URL is a git/https URL to avoid command injection
  if (!/^https:\/\/[a-zA-Z0-9._\-/:%@]+\.git$/.test(repoUrl)) {
    throw new Error(`Invalid repository URL: ${repoUrl}`);
  }

  await execAsync(`git clone --depth 1 -- "${repoUrl}" "${destDir}"`);
}

/** Returns true if git is available on PATH. */
export async function isGitAvailable(): Promise<boolean> {
  try {
    await execAsync("git --version");
    return true;
  } catch {
    return false;
  }
}
