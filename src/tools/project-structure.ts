import path from "path";
import { PROJECTS_DIR } from "../config.js";
import { buildTree, pathExists } from "../utils/fs.js";

export interface ProjectStructureParams {
  project_name_or_path: string;
  max_depth?: number;
}

type TextContent = { type: "text"; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

/**
 * Show the directory tree of a project.
 *
 * `project_name_or_path` can be:
 *  - an absolute path  → used as-is
 *  - a project name    → resolved relative to PROJECTS_DIR
 */
export async function projectStructureTool(
  params: ProjectStructureParams,
): Promise<ToolResult> {
  const { project_name_or_path, max_depth = 4 } = params;

  const targetDir = path.isAbsolute(project_name_or_path)
    ? project_name_or_path
    : path.join(PROJECTS_DIR, project_name_or_path);

  if (!(await pathExists(targetDir))) {
    return {
      content: [
        { type: "text", text: `❌  Directory not found: ${targetDir}` },
      ],
      isError: true,
    };
  }

  const tree = await buildTree(targetDir, "", max_depth);
  const text = `${path.basename(targetDir)}/\n${tree || "(empty)"}`;

  return { content: [{ type: "text", text }] };
}
