// ── MCP Client for Cloudflare Workers ──────────────────────────────
// Implements the Model Context Protocol (MCP) client over HTTP transport.
// Designed to run inside a Cloudflare Worker (no stdio, no persistent connections).

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface MCPToolCallResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

interface MCPServerConfig {
  url: string;
  authToken?: string;
  name: string;
}

// JSON-RPC 2.0 message
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

let _requestId = 0;

function makeRequest(method: string, params?: any): JsonRpcRequest {
  return { jsonrpc: '2.0', id: ++_requestId, method, params };
}

// Send a JSON-RPC request to an MCP server over HTTP
async function sendMCPRequest(server: MCPServerConfig, method: string, params?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (server.authToken) {
    headers['Authorization'] = `Bearer ${server.authToken}`;
  }

  const body = JSON.stringify(makeRequest(method, params));

  const res = await fetch(server.url, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    throw new Error(`MCP server ${server.name} returned HTTP ${res.status}: ${await res.text()}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Handle JSON response
  if (contentType.includes('application/json')) {
    const response = await res.json() as JsonRpcResponse;
    if (response.error) {
      throw new Error(`MCP error from ${server.name}: ${response.error.message} (code ${response.error.code})`);
    }
    return response.result;
  }

  // Handle SSE stream (collect last result)
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    const lines = text.split('\n');
    let lastData = '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        lastData = line.slice(6);
      }
    }
    if (lastData) {
      const parsed = JSON.parse(lastData) as JsonRpcResponse;
      if (parsed.error) throw new Error(`MCP error from ${server.name}: ${parsed.error.message}`);
      return parsed.result;
    }
    throw new Error(`No data received from MCP server ${server.name}`);
  }

  // Fallback: try to parse as JSON
  const response = await res.json() as JsonRpcResponse;
  if (response.error) throw new Error(`MCP error: ${response.error.message}`);
  return response.result;
}

// ── Public API ─────────────────────────────────────────────────────

// Initialize connection with an MCP server
export async function mcpInitialize(server: MCPServerConfig): Promise<{ serverInfo: any; capabilities: any }> {
  const result = await sendMCPRequest(server, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'RevFlare', version: '1.0.0' },
  });
  // Send initialized notification (fire and forget)
  try {
    await fetch(server.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(server.authToken ? { 'Authorization': `Bearer ${server.authToken}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
  } catch (_) { /* notification, ok to fail */ }
  return result;
}

// List available tools on an MCP server
export async function mcpListTools(server: MCPServerConfig): Promise<MCPTool[]> {
  const result = await sendMCPRequest(server, 'tools/list', {});
  return result?.tools || [];
}

// Call a specific tool on an MCP server
export async function mcpCallTool(server: MCPServerConfig, toolName: string, args: Record<string, any> = {}): Promise<MCPToolCallResult> {
  const result = await sendMCPRequest(server, 'tools/call', { name: toolName, arguments: args });
  return result || { content: [] };
}

// Extract plain text from an MCP tool call result
export function mcpResultToText(result: MCPToolCallResult): string {
  if (!result?.content) return '';
  return result.content
    .filter(c => c.type === 'text' && c.text)
    .map(c => c.text!)
    .join('\n');
}

// ── Convenience: Call a tool and return text, with timeout + error handling ──
export async function mcpCallToolSafe(
  server: MCPServerConfig,
  toolName: string,
  args: Record<string, any> = {},
  timeoutMs = 15000
): Promise<{ text: string; error?: string; durationMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const result = await mcpCallTool(server, toolName, args);
    clearTimeout(timeout);

    return { text: mcpResultToText(result), durationMs: Date.now() - start };
  } catch (e: any) {
    return { text: '', error: e.message || 'MCP call failed', durationMs: Date.now() - start };
  }
}

// ── Pre-configured tool mappings for known MCPs ───────────────────

// Maps MCP server names to the tools RevFlare should call for specific contexts
export const MCP_INTEGRATION_MAP: Record<string, {
  forResearch?: { tool: string; buildArgs: (account: any) => any }[];
  forEmail?: { tool: string; buildArgs: (account: any, products?: string[]) => any }[];
  forMeetingPrep?: { tool: string; buildArgs: (account: any) => any }[];
  forContacts?: { tool: string; buildArgs: (account: any) => any }[];
}> = {
  'netstrat': {
    forResearch: [
      { tool: 'query_network_metrics', buildArgs: (a) => ({ account_name: a.account_name, domain: a.website_domain || a.website }) },
      { tool: 'get_account_strategy', buildArgs: (a) => ({ account_name: a.account_name }) },
    ],
    forEmail: [
      { tool: 'query_network_metrics', buildArgs: (a) => ({ account_name: a.account_name, domain: a.website_domain || a.website }) },
    ],
  },
  'google-workspace': {
    forMeetingPrep: [
      { tool: 'calendar_search', buildArgs: (a) => ({ query: a.account_name, timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + 7 * 86400000).toISOString() }) },
    ],
    forContacts: [
      { tool: 'contacts_search', buildArgs: (a) => ({ query: a.account_name }) },
    ],
  },
  'wiki': {
    forResearch: [
      { tool: 'search', buildArgs: (a) => ({ query: a.account_name + ' ' + (a.industry || '') }) },
    ],
    forEmail: [
      { tool: 'search', buildArgs: (a, prods) => ({ query: (prods || []).join(' ') + ' competitive positioning' }) },
    ],
  },
  'cloudflare-docs': {
    forEmail: [
      { tool: 'search_docs', buildArgs: (_a, prods) => ({ query: (prods || []).slice(0, 3).join(', ') }) },
    ],
  },
  'jira': {
    forResearch: [
      { tool: 'search_issues', buildArgs: (a) => ({ jql: `text ~ "${a.account_name}" ORDER BY updated DESC`, maxResults: 5 }) },
    ],
    forMeetingPrep: [
      { tool: 'search_issues', buildArgs: (a) => ({ jql: `text ~ "${a.account_name}" AND status != Done ORDER BY priority DESC`, maxResults: 5 }) },
    ],
  },
};

// Gather enrichment data from all connected MCPs for a given context
export async function gatherMCPContext(
  servers: Array<MCPServerConfig & { name: string }>,
  context: 'forResearch' | 'forEmail' | 'forMeetingPrep' | 'forContacts',
  account: any,
  products?: string[],
): Promise<string> {
  const results: string[] = [];

  for (const server of servers) {
    const mapping = MCP_INTEGRATION_MAP[server.name];
    if (!mapping) continue;

    const tools = mapping[context];
    if (!tools) continue;

    for (const { tool, buildArgs } of tools) {
      try {
        const args = context === 'forEmail'
          ? (buildArgs as any)(account, products)
          : buildArgs(account);
        const { text, error } = await mcpCallToolSafe(server, tool, args);
        if (text) {
          results.push(`[${server.name}/${tool}]: ${text.slice(0, 3000)}`);
        }
        if (error) {
          console.error(`MCP ${server.name}/${tool} failed:`, error);
        }
      } catch (e) {
        console.error(`MCP ${server.name}/${tool} error:`, e);
      }
    }
  }

  return results.length > 0
    ? '\nMCP ENRICHMENT DATA:\n' + results.join('\n\n')
    : '';
}
