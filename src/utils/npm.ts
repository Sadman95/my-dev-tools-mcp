// ─── npm.ts ───────────────────────────────────────────────────────────────────
// Helpers for interacting with the npm registry (no runtime deps needed —
// Node >=18 ships with native fetch).

const REGISTRY_BASE = "https://registry.npmjs.org";
const FETCH_TIMEOUT_MS = 6000;

/**
 * Fetch the latest published version of an npm package.
 * Returns `null` on any network / registry failure so callers can fall back
 * gracefully.
 */
export async function fetchLatestVersion(
  packageName: string,
): Promise<string | null> {
  try {
    const url = `${REGISTRY_BASE}/${encodeURIComponent(packageName)}/latest`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

export interface UpdateDepsResult {
  updated: Record<string, string>;
  /** Packages whose latest version could not be fetched (original range kept). */
  failed: string[];
}

/**
 * Given a `dependencies` / `devDependencies` map from package.json, fetch the
 * latest version for every package and return an updated map using `^x.y.z`
 * ranges.  Packages that cannot be resolved keep their original specifier.
 */
export async function updateDepsToLatest(
  deps: Record<string, string>,
): Promise<UpdateDepsResult> {
  const updated: Record<string, string> = {};
  const failed: string[] = [];

  await Promise.all(
    Object.entries(deps).map(async ([pkg, original]) => {
      const version = await fetchLatestVersion(pkg);
      if (version) {
        updated[pkg] = `^${version}`;
      } else {
        updated[pkg] = original;
        failed.push(pkg);
      }
    }),
  );

  return { updated, failed };
}
