# Open Context Protocol - VS Code Extension

VS Code extension that provides OCP (Open Context Protocol) functionality for AI agents during chat conversations.

## Purpose

This extension is designed **for AI agents** (like GitHub Copilot, Cursor, etc.) to use during chat sessions - not for direct user interaction. It provides tools that agents can invoke to:

- Create OCP context from the current workspace
- Make OCP-enhanced API calls with workspace context
- Access workspace environment information

## Features

### Commands for Agents

#### `ocp.createContext`
Creates an OCP context from the current VS Code workspace.

**Returns:**
```json
{
  "contextId": "ctx_abc123...",
  "agentType": "vscode_copilot",
  "user": "username",
  "workspace": "project-name",
  "workspacePath": "/path/to/workspace",
  "gitBranch": "main",
  "currentGoal": "Working on branch: main",
  "session": { /* full context object */ }
}
```

## Development

### Setup
```bash
cd ocp-vscode
npm install
```

### Build
```bash
npm run compile
```

### Run in Development
Press `F5` in VS Code to open Extension Development Host

### Package
```bash
npm run package
```

### Install Locally
```bash
code --install-extension ocp-vscode-extension-0.1.0.vsix
```

## Version

0.1.0 - Initial development version

## License

MIT
