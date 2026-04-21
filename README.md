# my-dev-tools-mcp

A personal MCP (Model Context Protocol) server for automating daily development tasks.  
Works with **VS Code Copilot**, **Claude Desktop**, or any MCP-compatible client.

## Available Tools

| Tool                  | Description                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `list_projects`       | List all project directories in your projects folder                                     |
| `import_boilerplate`  | Scaffold a new project from `nodejs-boilerplate` (copies files + updates deps to latest) |
| `update_project_deps` | Bump every npm dependency in a project to its latest published version                   |
| `project_structure`   | Print the directory tree of any project                                                  |

## Setup

### 1. Install dependencies

```bash
cd D:/projects/my-dev-tools-mcp
npm install
```

### 2. Build

```bash
npm run build
# output → dist/index.js
```

### 3. Register with VS Code Copilot

Open your VS Code **User Settings** (`Ctrl+Shift+P` → _Preferences: Open User Settings (JSON)_) and add:

```jsonc
{
  "mcp": {
    "servers": {
      "my-dev-tools": {
        "type": "stdio",
        "command": "node",
        "args": ["D:/projects/my-dev-tools-mcp/dist/index.js"],
        "env": {
          "PROJECTS_DIR": "D:/projects",
          "BOILERPLATE_NAME": "nodejs-boilerplate",
        },
      },
    },
  },
}
```

After saving, click **Start** next to the server in the MCP panel (or restart VS Code).

> **Tip — run without building (dev mode)**  
> Replace `"command"` and `"args"` with:
>
> ```json
> "command": "node",
> "args": [
>   "D:/projects/my-dev-tools-mcp/node_modules/.bin/tsx",
>   "D:/projects/my-dev-tools-mcp/src/index.ts"
> ]
> ```

### 4. Register with Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-dev-tools": {
      "command": "node",
      "args": ["D:/projects/my-dev-tools-mcp/dist/index.js"],
      "env": {
        "PROJECTS_DIR": "D:/projects",
        "BOILERPLATE_NAME": "nodejs-boilerplate"
      }
    }
  }
}
```

## Usage Examples

Ask Copilot / Claude in natural language:

```
List all my projects.

Import the boilerplate into a new project called "invoice-service".

Import the boilerplate into D:/work/client-api and update all deps to latest.

Update all dependencies in the "invoice-service" project.

Show me the directory structure of "invoice-service".
```

## Environment Variables

| Variable           | Default                             | Description                                          |
| ------------------ | ----------------------------------- | ---------------------------------------------------- |
| `PROJECTS_DIR`     | `D:/projects`                       | Root directory that contains all your projects       |
| `BOILERPLATE_NAME` | `nodejs-boilerplate`                | Folder name of the boilerplate inside `PROJECTS_DIR` |
| `BOILERPLATE_DIR`  | `{PROJECTS_DIR}/{BOILERPLATE_NAME}` | Override the full boilerplate path directly          |

## Adding New Tools

1. Create `src/tools/my-new-tool.ts` — export an async function that returns `{ content: [{ type: "text", text: "..." }] }`.
2. Register it in `src/index.ts` using `server.tool(name, description, zodSchema, handler)`.
3. Rebuild: `npm run build`.

## Development

```bash
npm run dev          # run with tsx (no build needed)
npm run inspect      # open MCP Inspector UI for interactive testing
npm run build        # compile TypeScript → dist/
```
# my-dev-tools-mcp
