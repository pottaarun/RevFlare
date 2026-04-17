-- Migration: MCP server configuration
-- Run: wrangler d1 execute revflare-db --remote --file=migration-mcp.sql

-- MCP server connections (per user)
CREATE TABLE IF NOT EXISTS mcp_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,              -- e.g. 'netstrat', 'google-workspace', 'jira'
  display_name TEXT NOT NULL,      -- e.g. 'Netstrat Intelligence'
  server_url TEXT NOT NULL,        -- MCP server endpoint URL
  auth_token TEXT,                 -- Encrypted OAuth/Bearer token
  server_type TEXT DEFAULT 'http', -- 'http' or 'sse'
  enabled INTEGER DEFAULT 1,
  tools_cache TEXT,                -- JSON cache of available tools from tools/list
  tools_cached_at DATETIME,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_user ON mcp_servers(user_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_servers_name_user ON mcp_servers(name, user_email);

-- MCP tool call log (for debugging and observability)
CREATE TABLE IF NOT EXISTS mcp_tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mcp_server_id INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  input_params TEXT,
  output_result TEXT,
  duration_ms INTEGER,
  success INTEGER DEFAULT 1,
  error TEXT,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mcp_server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcp_calls_server ON mcp_tool_calls(mcp_server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_calls_user ON mcp_tool_calls(user_email);
