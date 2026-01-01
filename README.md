# Open Context Protocol

VS Code extension that provides OCP (Open Context Protocol) tools for AI agents during chat conversations with GitHub Copilot.

## Purpose

This extension is designed **for AI agents** (like GitHub Copilot) to use during chat sessions. It provides language model tools that agents can invoke to:

- Access workspace context and session state
- Register APIs from the community registry or OpenAPI specs
- Discover available tools from registered APIs
- Search for tools by functionality
- Execute API tools with parameters

The extension enables AI agents to make intelligent, context-aware API calls on your behalf during conversations.

## Installation

### From VS Code Marketplace (Coming Soon)
```
Search for "Open Context Protocol" in the Extensions view
```

### Manual Installation
```bash
# Download the .vsix file from releases
code --install-extension ocp-vscode-extension-0.1.0.vsix
```

## Configuration

### Settings

Configure the extension in VS Code settings:

```json
{
  // User identifier for OCP context (defaults to system username)
  "ocp.user": "your-username",
  
  // OCP registry URL for API discovery
  "ocp.registryUrl": "https://opencontextprotocol.io/api/v1",
  
  // API authentication headers by API name
  "ocp.apiAuth": {
    "github": {
      "Authorization": "token ghp_your_token_here"
    },
    "stripe": {
      "Authorization": "Bearer sk_test_your_key"
    }
  }
}
```

### Authentication Setup

Configure API authentication in `.vscode/settings.json`:

```json
{
  "ocp.apiAuth": {
    "github": {
      "Authorization": "token ghp_xxxxxxxxxxxx"
    },
    "slack": {
      "Authorization": "Bearer xoxb-xxxxxxxxxxxx"
    },
    "custom-api": {
      "X-API-Key": "your-api-key",
      "X-Custom-Header": "value"
    }
  }
}
```

Headers are automatically included when tools are called from the corresponding API.

## Available Tools

### `ocp_getContext`
Get current workspace context information including user, workspace name, session state, and registered APIs.

**Use cases:**
- "Show me the current context"
- "What's my workspace setup?"
- "What APIs are registered?"

**Returns:**
```json
{
  "context_id": "ctx_abc123",
  "agent_type": "vscode-extension",
  "user": "username",
  "workspace": "project-name",
  "current_goal": "Assist with development tasks",
  "conversation": [...],
  "apis": [...]
}
```

### `ocp_registerApi`
Register an API to discover its available tools.

**Parameters:**
- `name` (required): API name (e.g., "github", "slack")
- `specUrl` (optional): OpenAPI specification URL
- `baseUrl` (optional): Override base URL (e.g., for enterprise instances)

**Use cases:**
- "Register the GitHub API"
- "Add Slack API support"
- "Connect to my custom API at https://api.example.com/openapi.json"

**Examples:**
```typescript
// Registry lookup (fast)
{ "name": "github" }

// Direct OpenAPI spec
{ 
  "name": "my-api",
  "specUrl": "https://api.example.com/openapi.json"
}

// GitHub Enterprise with base URL override
{
  "name": "github",
  "baseUrl": "https://github.company.com/api/v3"
}
```

### `ocp_listTools`
List all available tools from registered APIs.

**Parameters:**
- `apiName` (optional): Filter by specific API

**Use cases:**
- "What tools are available?"
- "Show me GitHub tools"
- "What can I do with Stripe?"

**Returns:**
```json
{
  "tools": [
    {
      "name": "usersGetAuthenticated",
      "description": "Get the authenticated user",
      "method": "GET",
      "path": "/user",
      "parameters": {...}
    }
  ],
  "count": 547,
  "apiName": "github"
}
```

### `ocp_callTool`
Execute a tool from a registered API.

**Parameters:**
- `toolName` (required): Tool name from listTools
- `parameters` (required): Tool parameters (can be empty object `{}`)
- `apiName` (required): API the tool belongs to

**Use cases:**
- "Get my GitHub user info"
- "Create a Stripe customer"
- "Search repositories for 'machine learning'"

**Example:**
```typescript
{
  "toolName": "usersGetAuthenticated",
  "parameters": {},
  "apiName": "github"
}
```

### `ocp_searchTools`
Search for tools by name or description.

**Parameters:**
- `query` (required): Search terms
- `apiName` (optional): Limit search to specific API

**Use cases:**
- "Find tools for creating repositories"
- "Search for user management tools"
- "What GitHub tools work with pull requests?"

**Returns:**
```json
{
  "tools": [...],
  "count": 12,
  "query": "create repository",
  "apiName": "github"
}
```

## Usage Flow

1. **Agent gets context** → `ocp_getContext`
2. **Agent registers APIs** → `ocp_registerApi`
3. **Agent discovers tools** → `ocp_listTools` or `ocp_searchTools`
4. **Agent executes actions** → `ocp_callTool`

## Development

### Setup
```bash
git clone https://github.com/opencontextprotocol/ocp-vscode.git
cd ocp-vscode
npm install
```

### Build
```bash
npm run compile
```

### Run in Development Mode
Press `F5` in VS Code to launch the Extension Development Host

### Package
```bash
npm run package
```

This creates `ocp-vscode-extension-0.1.0.vsix`

### Test Locally
```bash
code --install-extension ocp-vscode-extension-0.1.0.vsix
```

## Architecture

The extension:
- Creates a singleton `OCPAgent` instance on activation
- Configures it with VS Code settings (user, workspace, registry URL)
- Registers 5 language model tools that wrap OCPAgent methods
- Reads auth headers from `ocp.apiAuth` settings
- Automatically includes auth headers in tool calls

## Requirements

- VS Code 1.85.0 or higher
- GitHub Copilot extension (for AI agent interaction)

## Version

0.1.0 - Initial release

## License

MIT
