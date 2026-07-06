# RevFlare ↔ MCP Integration Guide

RevFlare participates in the Model Context Protocol as both a **client** (consuming external MCP servers) and a **server** (exposing RevFlare tools to external AI agents).

## Part 1 — RevFlare as MCP Server

Expose RevFlare's account / lead / research / pipeline / alerts / email-stats data to any MCP-speaking AI agent (OpenCode, Claude Desktop, Cursor, custom agents).

### The Endpoint

```
POST https://revflare.<your-subdomain>.workers.dev/api/mcp
Content-Type: application/json
Cf-Access-Jwt-Assertion: <JWT>
```

JSON-RPC 2.0, protocol version `2025-03-26`.

### The 6 Tools

```json
{
  "tools": [
    {
      "name": "lookup_account",
      "description": "Look up a Cloudflare sales account by name or domain. Returns account details, IT spend, tech stack, and competitor products.",
      "inputSchema": { "type": "object", "properties": { "query": { "type": "string" } }, "required": ["query"] }
    },
    {
      "name": "get_lead_score",
      "description": "Get the AI-computed lead score (0-100) for an account with scoring factors.",
      "inputSchema": { "type": "object", "properties": { "account_name": { "type": "string" } }, "required": ["account_name"] }
    },
    {
      "name": "get_account_research",
      "description": "Get the latest AI research reports generated for an account.",
      "inputSchema": { "type": "object", "properties": { "account_name": { "type": "string" } }, "required": ["account_name"] }
    },
    {
      "name": "get_pipeline",
      "description": "Get pipeline opportunities with ACV, stage, and notes.",
      "inputSchema": { "type": "object", "properties": { "limit": { "type": "number" } } }
    },
    {
      "name": "get_alerts",
      "description": "Get recent infrastructure change and threat intelligence alerts.",
      "inputSchema": { "type": "object", "properties": { "limit": { "type": "number" } } }
    },
    {
      "name": "get_email_stats",
      "description": "Get email outreach performance metrics: sent, opened, replied counts and rates.",
      "inputSchema": { "type": "object", "properties": {} }
    }
  ]
}
```

### OpenCode Client Config

Edit `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "revflare": {
      "type": "remote",
      "url": "https://revflare.arunpotta1024.workers.dev/api/mcp",
      "enabled": true,
      "headers": {
        "Cf-Access-Jwt-Assertion": "<your-access-jwt>"
      }
    }
  }
}
```

Restart OpenCode. Tools appear as `revflare/lookup_account`, `revflare/get_lead_score`, etc.

### Claude Desktop Config

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "revflare": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://revflare.arunpotta1024.workers.dev/api/mcp", "--header", "Cf-Access-Jwt-Assertion: <jwt>"]
    }
  }
}
```

### Cursor Config

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "revflare": {
      "url": "https://revflare.arunpotta1024.workers.dev/api/mcp",
      "headers": {
        "Cf-Access-Jwt-Assertion": "<jwt>"
      }
    }
  }
}
```

### Raw JSON-RPC (for custom clients)

```bash
JWT="<your-jwt>"
URL="https://revflare.arunpotta1024.workers.dev/api/mcp"

# 1. Initialize
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Cf-Access-Jwt-Assertion: $JWT" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0.0"}}}'

# 2. List tools
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Cf-Access-Jwt-Assertion: $JWT" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. Call a tool
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "Cf-Access-Jwt-Assertion: $JWT" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_pipeline","arguments":{"limit":20}}}'
```

### Example Agent Prompts

With RevFlare connected, an AI agent can answer:

- _"What accounts in my pipeline have ACV > $500K?"_
  → Agent calls `get_pipeline({limit: 50})`, filters client-side

- _"Show me my top 5 lead scores."_
  → Agent calls `lookup_account` to pick candidates, then `get_lead_score` on each; OR uses the list from `get_pipeline` as a seed

- _"What's my email reply rate this quarter?"_
  → Agent calls `get_email_stats()`, returns the numbers in context

- _"What's the latest research on Shopify?"_
  → Agent calls `get_account_research({account_name: "Shopify"})` and summarizes

- _"Any threat alerts I should act on?"_
  → Agent calls `get_alerts({limit: 10})`, ranks by severity

### Security Notes for Server Mode

- Every MCP request passes through Cloudflare Access middleware — there's no bypass
- The caller's `user_email` is extracted from the Access JWT and scopes all queries
- Tool outputs are capped (3 accounts, 3 research reports, up to 50 pipeline rows, etc.)
- The endpoint doesn't mutate state — read-only tools only

---

## Part 2 — RevFlare as MCP Client

RevFlare can connect to any JSON-RPC 2.0 MCP server and use its tools to enrich research, emails, meeting prep, and contact lookups.

### Built-in Presets (Quick-Add)

Navigate to `#/mcp` in the RevFlare UI. Click any preset to open a pre-filled form:

| Preset | Slug | Auto-used for |
|--------|------|---------------|
| Netstrat Intelligence | `netstrat` | Research (network metrics + account strategy), Email generation (network metrics) |
| Google Workspace | `google-workspace` | Meeting Prep (calendar search), Contact Lookup |
| Wiki | `wiki` | Research, Email (competitive positioning lookup) |
| Cloudflare Docs | `cloudflare-docs` | Email (product documentation) |
| Jira | `jira` | Research, Meeting Prep (issue search) |

### Adding a Custom MCP Server

1. `#/mcp` → "+ Add MCP Server"
2. Fill in:
   - **Name**: short slug (e.g. `backstage`)
   - **Display Name**: human-friendly (e.g. `Backstage`)
   - **Server URL**: HTTPS JSON-RPC 2.0 endpoint (e.g. `https://backstage.example.com/mcp`)
   - **Auth Token**: optional Bearer token (encrypted with AES-256-GCM before D1 storage)
3. Save → RevFlare calls `initialize` and `tools/list`, caches the tool catalog in `mcp_servers.tools_cache`

### URL Validation (SSRF Protection)

`isValidMCPServerUrl()` in `src/mcp-client.ts` rejects:
- HTTP (HTTPS only)
- IPv4/IPv6 literals (including decimal and octal IP notation)
- `localhost`, `127.*`, `0.*`, `10.*`, `172.(16-31).*`, `192.168.*`, `169.254.*`
- TLDs: `.local`, `.internal`, `.svc`, `.cluster`, `.corp`, `.lan`, `.home`, `.arpa`
- Hostnames without a dot (non-FQDN)

This runs on every tool call, not just registration — compromising the `mcp_servers` table doesn't bypass it.

### How Tool Calls Are Made

`gatherMCPContext()` in `src/mcp-client.ts` is called from research / email / meeting-prep / contacts endpoints. For each enabled MCP server, it:

1. Looks up the server's entry in `MCP_INTEGRATION_MAP`
2. For the active context (`forResearch`, `forEmail`, `forMeetingPrep`, `forContacts`), runs each mapped tool with args built from the account
3. Collects text results, caps each at 3000 chars
4. Injects the combined text into the LLM prompt as `MCP ENRICHMENT DATA:\n...`
5. Logs duration + success/error to `mcp_tool_calls`

Timeouts: 15s per tool call, enforced via `AbortController`.

### Adding a New Preset

Edit two files:

**src/mcp-client.ts** — add to `MCP_INTEGRATION_MAP`:

```typescript
'backstage': {
  forResearch: [
    { tool: 'search_components', buildArgs: (a) => ({ q: a.account_name }) },
  ],
  forMeetingPrep: [
    { tool: 'get_on_call', buildArgs: (a) => ({ team: a.account_name }) },
  ],
},
```

**public/app.js** — add to `MCP_PRESETS`:

```javascript
{ name: 'backstage', displayName: 'Backstage', desc: 'Internal service catalog' },
```

### Manual Tool Calls

If you want to call a specific tool on demand (bypassing context-based auto-enrichment):

```bash
rc -X POST "$REVFLARE_URL/api/mcp/call" \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": 3,
    "toolName": "query_network_metrics",
    "args": { "domain": "shopify.com" }
  }'
```

Returns:
```json
{
  "text": "...",
  "durationMs": 1234,
  "error": null
}
```

### Observability

Every call is logged to `mcp_tool_calls`:

```sql
SELECT mcp_server_id, tool_name, duration_ms, success, error, created_at
FROM mcp_tool_calls
WHERE user_email = ?
ORDER BY created_at DESC
LIMIT 50;
```

Use this to debug slow / failing integrations.

---

## Part 3 — End-to-End Flow Example

**Scenario**: User says _"Draft an outreach email to Shopify using the latest Netstrat data."_

1. User types in OpenCode; OpenCode has `revflare` MCP configured (Part 1)
2. OpenCode calls `revflare/lookup_account({query: "Shopify"})` → gets `account_id: 5`
3. OpenCode calls `revflare/get_account_research({account_name: "Shopify Inc"})` → gets context
4. OpenCode sends a regular HTTPS POST to `https://revflare.../api/messaging/5` with `{persona, messageType}`
5. Inside RevFlare, `gatherMCPContext()` runs — RevFlare itself is an MCP client (Part 2)
6. RevFlare calls Netstrat's `query_network_metrics` via its MCP client; gets live network data
7. Netstrat data is injected into the Llama 3.3 70B prompt
8. Generated email flows back to OpenCode
9. OpenCode surfaces the email to the user

The full flow uses MCP in both directions — RevFlare is a consumer (of Netstrat) and a provider (to OpenCode) simultaneously.
