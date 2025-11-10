import * as vscode from 'vscode';
import { OCPAgent, OCPContextDict } from '@opencontextprotocol/agent';

// Singleton OCPAgent instance for the workspace
let ocpAgent: OCPAgent | null = null;

// Tool parameter interfaces
interface IOCPGetContextParams {}

interface IOCPRegisterApiParams {
    name: string;
    specUrl?: string;
    baseUrl?: string;
}

interface IOCPListToolsParams {
    apiName?: string;
}

interface IOCPCallToolParams {
    toolName: string;
    parameters: Record<string, any>;
    apiName?: string;
}

interface IOCPSearchToolsParams {
    query: string;
    apiName?: string;
}

// Tool implementation classes
class GetContextTool implements vscode.LanguageModelTool<IOCPGetContextParams> {
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IOCPGetContextParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: 'Getting OCP workspace context...',
            confirmationMessages: {
                title: 'Get OCP Context',
                message: new vscode.MarkdownString('Retrieve current workspace context information?')
            }
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IOCPGetContextParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            if (!ocpAgent) {
                throw new Error("OCP Agent not initialized. Please check extension activation.");
            }

            const contextDict: OCPContextDict = ocpAgent.context.toDict();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(contextDict, null, 2))
            ]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get OCP context: ${errorMessage}`);
        }
    }
}

class RegisterApiTool implements vscode.LanguageModelTool<IOCPRegisterApiParams> {
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IOCPRegisterApiParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const params = options.input;
        return {
            invocationMessage: `Registering API: ${params.name}...`,
            confirmationMessages: {
                title: 'Register API',
                message: new vscode.MarkdownString(
                    `Register API **${params.name}**?` +
                    (params.specUrl ? `\n\nSpec URL: \`${params.specUrl}\`` : '') +
                    (params.baseUrl ? `\n\nBase URL: \`${params.baseUrl}\`` : '')
                )
            }
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IOCPRegisterApiParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            if (!ocpAgent) {
                throw new Error("OCP Agent not initialized. Please check extension activation.");
            }

            const params = options.input;

            // Check if auth is configured for this API
            const config = vscode.workspace.getConfiguration('ocp');
            const apiAuth = config.get<Record<string, Record<string, string>>>('apiAuth') || {};
            const hasAuth = !!(apiAuth[params.name] && Object.keys(apiAuth[params.name]).length > 0);

            await ocpAgent.registerApi(params.name, params.specUrl, params.baseUrl);
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    success: true,
                    message: `Successfully registered API: ${params.name}`,
                    hasAuth: hasAuth
                }, null, 2))
            ]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to register API ${options.input.name}: ${errorMessage}. Please check the API name and specification URL.`);
        }
    }
}

class ListToolsTool implements vscode.LanguageModelTool<IOCPListToolsParams> {
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IOCPListToolsParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const params = options.input;
        return {
            invocationMessage: 'Listing available tools...',
            confirmationMessages: {
                title: 'List Tools',
                message: new vscode.MarkdownString(
                    `List available tools${params.apiName ? ` from **${params.apiName}**` : ' from all registered APIs'}?`
                )
            }
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IOCPListToolsParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            if (!ocpAgent) {
                throw new Error("OCP Agent not initialized. Please check extension activation.");
            }

            const params = options.input;
            const tools = ocpAgent.listTools(params.apiName);
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    tools,
                    count: tools.length,
                    apiName: params.apiName || "all"
                }, null, 2))
            ]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to list tools: ${errorMessage}. Make sure APIs are registered first using ocp_registerApi.`);
        }
    }
}

class CallToolTool implements vscode.LanguageModelTool<IOCPCallToolParams> {
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IOCPCallToolParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const params = options.input;
        return {
            invocationMessage: `Calling tool: ${params.toolName}...`,
            confirmationMessages: {
                title: 'Call Tool',
                message: new vscode.MarkdownString(
                    `Call tool **${params.toolName}**?` +
                    (params.apiName ? `\n\nFrom API: **${params.apiName}**` : '') +
                    `\n\nParameters:\n\`\`\`json\n${JSON.stringify(params.parameters, null, 2)}\n\`\`\``
                )
            }
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IOCPCallToolParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            if (!ocpAgent) {
                throw new Error("OCP Agent not initialized. Please check extension activation.");
            }

            const params = options.input;
            
            // Get auth parameters for this API if configured
            const config = vscode.workspace.getConfiguration('ocp');
            const apiAuth = config.get<Record<string, Record<string, string>>>('apiAuth') || {};
            const authParams = params.apiName ? apiAuth[params.apiName] || {} : {};

            // Merge agent-provided parameters with auth parameters
            const finalParams = { ...params.parameters, ...authParams };
            
            const result = await ocpAgent.callTool(
                params.toolName,
                finalParams,
                params.apiName
            );
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
            ]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to call tool ${options.input.toolName}: ${errorMessage}. Make sure the tool exists and parameters are correct. Use ocp_listTools to see available tools.`);
        }
    }
}

class SearchToolsTool implements vscode.LanguageModelTool<IOCPSearchToolsParams> {
    async prepareInvocation(
        options: vscode.LanguageModelToolInvocationPrepareOptions<IOCPSearchToolsParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.PreparedToolInvocation> {
        const params = options.input;
        return {
            invocationMessage: `Searching tools for: ${params.query}...`,
            confirmationMessages: {
                title: 'Search Tools',
                message: new vscode.MarkdownString(
                    `Search for tools matching **"${params.query}"**${params.apiName ? ` in **${params.apiName}**` : ' across all APIs'}?`
                )
            }
        };
    }

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<IOCPSearchToolsParams>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        try {
            if (!ocpAgent) {
                throw new Error("OCP Agent not initialized. Please check extension activation.");
            }

            const params = options.input;
            const tools = ocpAgent.searchTools(params.query, params.apiName);
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    tools,
                    count: tools.length,
                    query: params.query,
                    apiName: params.apiName || "all"
                }, null, 2))
            ]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to search tools: ${errorMessage}. Make sure APIs are registered first using ocp_registerApi.`);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('OCP extension is now active');

    // Initialize OCPAgent with VS Code settings
    const config = vscode.workspace.getConfiguration('ocp');
    const user = config.get<string>('user') || process.env.USER || 'unknown';
    const registryUrl = config.get<string>('registryUrl') || 'https://registry.opencontextprotocol.org';
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspace = workspaceFolder?.name || 'unknown';

    // Create the singleton OCPAgent instance
    ocpAgent = new OCPAgent(
        'vscode-extension',
        user,
        workspace,
        'Assist with development tasks',
        registryUrl
    );

    console.log(`OCP Agent initialized for user "${user}" in workspace "${workspace}"`);

    // Register all OCP tools
    context.subscriptions.push(
        vscode.lm.registerTool('ocp_getContext', new GetContextTool()),
        vscode.lm.registerTool('ocp_registerApi', new RegisterApiTool()),
        vscode.lm.registerTool('ocp_listTools', new ListToolsTool()),
        vscode.lm.registerTool('ocp_callTool', new CallToolTool()),
        vscode.lm.registerTool('ocp_searchTools', new SearchToolsTool())
    );

    console.log('OCP tools registered successfully');
}

export function deactivate() {
    ocpAgent = null;
}