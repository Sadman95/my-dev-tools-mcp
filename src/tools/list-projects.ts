import fs from "fs";
import { PROJECTS_DIR } from "../config.js";

/** List every directory (project) inside PROJECTS_DIR. */
export async function listProjectsTool(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  try {
    const entries = await fs.promises.readdir(PROJECTS_DIR, {
      withFileTypes: true,
    });

    const projects = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    const text =
      projects.length > 0
        ? `Projects in ${PROJECTS_DIR} (${projects.length} total):\n\n${projects.map((p, i) => `  ${String(i + 1).padStart(2)}. ${p}`).join("\n")}`
        : `No project directories found in ${PROJECTS_DIR}`;

    return { content: [{ type: "text", text }] };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error reading projects directory: ${(err as Error).message}`,
        },
      ],
    };
  }
}
