# RevFlare HTTP API — Complete Cheatsheet

Every RevFlare API call requires a valid Cloudflare Access JWT in the `Cf-Access-Jwt-Assertion` header (except public `/api/public/*` endpoints).

## Getting a JWT

```bash
# Option A: from the browser after logging in
# DevTools → Network → any /api/* request → Copy Cf-Access-Jwt-Assertion header

# Option B: mint on-demand via cloudflared (if Access-enabled)
JWT=$(cloudflared access token -app=https://revflare.arunpotta1024.workers.dev)

# Option C: store once per session
export REVFLARE_URL="https://revflare.arunpotta1024.workers.dev"
export REVFLARE_JWT="<paste-jwt-here>"
alias rc='curl -sk -H "Cf-Access-Jwt-Assertion: $REVFLARE_JWT"'
```

All examples below assume `REVFLARE_URL` and `REVFLARE_JWT` are set.

---

## Identity

```bash
# Who am I? Includes admin flag, active org, all orgs
rc "$REVFLARE_URL/api/me"
```

---

## Accounts

```bash
# Paginated list with sort + filter
rc "$REVFLARE_URL/api/accounts?page=1&limit=50&sort=total_it_spend&order=DESC"

# Search
rc "$REVFLARE_URL/api/accounts?search=shopify&limit=10"

# Filter by industry / country / status
rc "$REVFLARE_URL/api/accounts?industry=Telecommunications&country=CA&status=Active"

# Get one account (full detail)
rc "$REVFLARE_URL/api/accounts/5"

# Aggregate stats for dashboard
rc "$REVFLARE_URL/api/stats"

# Filter dropdown values
rc "$REVFLARE_URL/api/filters"

# Global platform stats (total emails, research, campaigns, users)
rc "$REVFLARE_URL/api/platform-stats"

# Clear all of MY accounts (irreversible)
rc -X POST "$REVFLARE_URL/api/accounts/clear"

# Upload batch from Excel parse (programmatic)
rc -X POST "$REVFLARE_URL/api/accounts/upload" \
  -H "Content-Type: application/json" \
  -d '{"accounts":[{"account_name":"Shopify Inc","website":"shopify.com",...}]}'
```

---

## Research

```bash
# Generate a research report (blocks until AI completes, 10-30s)
rc -X POST "$REVFLARE_URL/api/research/5" \
  -H "Content-Type: application/json" \
  -d '{"reportType":"executive_brief"}'

# Report types: "executive_brief" | "technical_deep_dive" |
#               "competitive_landscape" | "displacement_strategy"

# List all reports for an account
rc "$REVFLARE_URL/api/research/5"

# Run all 8 live probes (cached in KV for 6h)
rc -X POST "$REVFLARE_URL/api/live-probe/5"

# Force a fresh probe bypass cache
rc -X POST "$REVFLARE_URL/api/live-probe/5?fresh=1"

# Quick enrichment (faster, smaller model)
rc -X POST "$REVFLARE_URL/api/enrich/5"
```

---

## Messaging (Persona-Curated Email)

```bash
# List all personas and their message types
rc "$REVFLARE_URL/api/personas"

# Get AI-ranked persona/message-type suggestions for an account
rc "$REVFLARE_URL/api/messaging/suggest-persona/5"
# Returns: { industry, totalSentAcrossAll, top: [...], all: [...] }

# Generate an email (blocks on AI)
rc -X POST "$REVFLARE_URL/api/messaging/5" \
  -H "Content-Type: application/json" \
  -d '{
    "persona": "bdr",
    "messageType": "cold_email",
    "customContext": "Recent DDoS attack hit their sector. Mention Magic Transit."
  }'

# List messages for an account
rc "$REVFLARE_URL/api/messaging/5"

# Approve a generated email for sending
rc -X POST "$REVFLARE_URL/api/messages/42/approve"

# Reject a generated email
rc -X POST "$REVFLARE_URL/api/messages/42/reject"
```

---

## AI Chat Email Refinement

```bash
# Refine an email conversationally
rc -X POST "$REVFLARE_URL/api/chat/message/42" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Make it 30% shorter, lead with the DDoS angle, end with a Tuesday meeting ask",
    "messageType": "persona_message"
  }'

# Get full chat history for a message
rc "$REVFLARE_URL/api/chat/history/42?type=persona_message"
```

---

## Campaigns

```bash
# List campaign themes
rc "$REVFLARE_URL/api/campaign-themes"

# Create a campaign
rc -X POST "$REVFLARE_URL/api/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q2 Zero Trust Push - CA Enterprise",
    "theme": "zero_trust_modernization",
    "persona": "ae",
    "messageType": "executive_email",
    "filters": { "country": "CA", "segment": "Enterprise" }
  }'

# Generate emails in batch (2 per call — poll until done)
rc -X POST "$REVFLARE_URL/api/campaigns/7/generate"

# List campaign emails
rc "$REVFLARE_URL/api/campaigns/7/emails"

# Download CSV export
rc "$REVFLARE_URL/api/campaigns/7/export" -o campaign-7.csv

# Approve a campaign email
rc -X POST "$REVFLARE_URL/api/campaign-emails/101/approve"

# Reject a single campaign email
rc -X POST "$REVFLARE_URL/api/campaign-emails/101/reject"

# Bulk approve all pending emails in a campaign
rc -X POST "$REVFLARE_URL/api/campaigns/7/approve-all"

# Bulk reject all pending emails in a campaign
rc -X POST "$REVFLARE_URL/api/campaigns/7/reject-all"

# Regenerate a single campaign email
rc -X POST "$REVFLARE_URL/api/campaigns/7/regenerate/5"

# Send all approved campaign emails via Gmail (capped by daily limit)
rc -X POST "$REVFLARE_URL/api/gmail/send-campaign/7"
```

---

## Pipeline & Opportunities

```bash
# List all opportunities
rc "$REVFLARE_URL/api/opportunities"

# Create an opportunity
rc -X POST "$REVFLARE_URL/api/opportunities" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 5, "account_name": "Shopify Inc",
    "industry": "Computer Software", "country": "CA",
    "acv": 1320000, "stage": "qualification",
    "notes": "High IT spend, multi-vendor displacement"
  }'

# Update an existing opportunity (include `id`)
rc -X POST "$REVFLARE_URL/api/opportunities" \
  -H "Content-Type: application/json" \
  -d '{"id": 12, "acv": 1500000, "stage": "proposal"}'

# Delete
rc -X DELETE "$REVFLARE_URL/api/opportunities/12"

# AI Opportunity Agent — auto-generate up to N opps
rc -X POST "$REVFLARE_URL/api/opportunities/auto-generate" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# ACV breakdown by stage / country
rc "$REVFLARE_URL/api/acv"

# Win/loss analysis on a closed opportunity
rc -X POST "$REVFLARE_URL/api/win-loss/12"
```

---

## Lead Scoring

```bash
# Leaderboard (top 50)
rc "$REVFLARE_URL/api/lead-scores"

# Single account score
rc "$REVFLARE_URL/api/lead-scores/5"
```

---

## Advanced Features

```bash
# ROI calculator
rc "$REVFLARE_URL/api/roi/5"

# Find lookalike accounts
rc "$REVFLARE_URL/api/lookalikes/5"

# Generate meeting prep brief
rc -X POST "$REVFLARE_URL/api/meeting-prep/5"

# List sequence templates
rc "$REVFLARE_URL/api/sequence-templates"

# Generate a multi-touch sequence for an account
rc -X POST "$REVFLARE_URL/api/sequences" \
  -H "Content-Type: application/json" \
  -d '{"accountId": 5, "persona": "bdr", "theme": "competitive_displacement"}'

# List sequences
rc "$REVFLARE_URL/api/sequences"

# Activate / pause sequence execution (runs via cron)
rc -X POST "$REVFLARE_URL/api/sequences/3/activate"
rc -X POST "$REVFLARE_URL/api/sequences/3/pause"

# CDN / DNS change detection — creates alerts on diff
rc -X POST "$REVFLARE_URL/api/detect-changes/5"

# Generate A/B email variants
rc -X POST "$REVFLARE_URL/api/ab-test/5" \
  -H "Content-Type: application/json" \
  -d '{"persona":"ae","messageType":"executive_email"}'

# Voice notes → follow-up email
rc -X POST "$REVFLARE_URL/api/voice-note" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 5,
    "transcript": "Great call. They loved the battlecard. Next step: send ROI by Friday."
  }'
```

---

## Competitive Intelligence

```bash
# Full product catalog (12 categories, 40+ competitors)
rc "$REVFLARE_URL/api/catalog"

# Generate a battlecard for an account
rc -X POST "$REVFLARE_URL/api/competitive/5" \
  -H "Content-Type: application/json" \
  -d '{"category":"CDN","competitor":"Akamai"}'
```

---

## Threat Intelligence

```bash
# Global threat feed (7 sources, cached 10min in KV)
rc "$REVFLARE_URL/api/threats"

# Filtered by country / days
rc "$REVFLARE_URL/api/threats?country=CA&days=7"

# Account-matched threats
rc "$REVFLARE_URL/api/threats/5"

# Generate an incident-triggered email
rc -X POST "$REVFLARE_URL/api/threats/5/email" \
  -H "Content-Type: application/json" \
  -d '{"threatId": "abc-123", "persona": "ae"}'
```

---

## Alerts

```bash
# All alerts
rc "$REVFLARE_URL/api/alerts"

# Mark as read
rc -X POST "$REVFLARE_URL/api/alerts/3/read"

# AI suggests Cloudflare products relevant to an alert
rc -X POST "$REVFLARE_URL/api/alerts/3/suggest-products"

# Generate an email from an alert with product positioning
rc -X POST "$REVFLARE_URL/api/alerts/3/email" \
  -H "Content-Type: application/json" \
  -d '{"persona":"ae","products":["Magic Transit","DDoS Protection"]}'
```

---

## Semantic Search

```bash
# Re-index all content for my user (run after bulk data changes)
rc -X POST "$REVFLARE_URL/api/search/index"

# Query with hybrid semantic + keyword ranking
rc "$REVFLARE_URL/api/search?q=akamai+displacement+healthcare"

# Response shape:
# {
#   "results": [...20 scored results],
#   "query": "...",
#   "totalIndexed": 500,
#   "method": "semantic+keyword" | "keyword-only"
# }
```

---

## Contacts

```bash
# List for an account
rc "$REVFLARE_URL/api/contacts/5"

# Create
rc -X POST "$REVFLARE_URL/api/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 5,
    "first_name": "Jane", "last_name": "Doe",
    "email": "jane@shopify.com", "title": "VP Infrastructure",
    "is_primary": 1
  }'

# Update
rc -X PUT "$REVFLARE_URL/api/contacts/42" \
  -H "Content-Type: application/json" \
  -d '{"title":"CTO"}'

# Delete
rc -X DELETE "$REVFLARE_URL/api/contacts/42"

# Bulk import (max 100 per call)
rc -X POST "$REVFLARE_URL/api/contacts/import/5" \
  -H "Content-Type: application/json" \
  -d '{"contacts":[{...},{...}]}'
```

---

## Gmail

```bash
# Connection status
rc "$REVFLARE_URL/api/gmail/status"

# Daily limit state
rc "$REVFLARE_URL/api/gmail/daily-limit"

# Start OAuth flow (returns redirect URL)
rc "$REVFLARE_URL/api/gmail/connect"

# Send an approved email
rc -X POST "$REVFLARE_URL/api/gmail/send" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": 42,
    "toAddress": "prospect@shopify.com"
  }'

# Send all approved emails in a campaign (capped by daily limit)
rc -X POST "$REVFLARE_URL/api/gmail/send-campaign/7"

# Poll for replies (also runs via cron)
rc -X POST "$REVFLARE_URL/api/gmail/check-replies"

# Disconnect
rc -X DELETE "$REVFLARE_URL/api/gmail/disconnect"
```

---

## Scheduled Sends

```bash
# Schedule an email for future delivery
rc -X POST "$REVFLARE_URL/api/scheduled-sends" \
  -H "Content-Type: application/json" \
  -d '{
    "toAddress": "prospect@shopify.com",
    "subject": "Following up on the DDoS discussion",
    "body": "...",
    "scheduled_for": "2026-04-28T14:00:00Z"
  }'

# List pending
rc "$REVFLARE_URL/api/scheduled-sends"

# Cancel
rc -X DELETE "$REVFLARE_URL/api/scheduled-sends/5"
```

---

## Email Performance & Compliance

```bash
# Full stats dashboard data
rc "$REVFLARE_URL/api/email-stats"

# List suppressed addresses
rc "$REVFLARE_URL/api/email-suppression"

# Remove an address (false-positive bounce recovery)
rc -X DELETE "$REVFLARE_URL/api/email-suppression/42"

# PUBLIC endpoints (NO auth needed — used by recipients' email clients)
curl "$REVFLARE_URL/api/public/track/abc123/pixel.gif"  # tracking pixel
curl "$REVFLARE_URL/api/public/unsubscribe/abc123"      # unsubscribe landing page
curl -X POST "$REVFLARE_URL/api/public/unsubscribe/abc123"  # Gmail/Yahoo one-click POST
```

---

## Salesforce

```bash
# Status
rc "$REVFLARE_URL/api/salesforce/status"

# Start OAuth
rc "$REVFLARE_URL/api/salesforce/connect"

# Push research/email as a SF Task
rc -X POST "$REVFLARE_URL/api/salesforce/push-activity" \
  -H "Content-Type: application/json" \
  -d '{"accountName":"Shopify Inc","subject":"...","body":"..."}'

# Pull SF opportunities for an account by name
rc "$REVFLARE_URL/api/salesforce/opportunities/Shopify%20Inc"

# Import contacts from SF
rc -X POST "$REVFLARE_URL/api/salesforce/import-contacts/5"
```

---

## MCP

```bash
# RevFlare as MCP server — JSON-RPC 2.0
rc -X POST "$REVFLARE_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

rc -X POST "$REVFLARE_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

rc -X POST "$REVFLARE_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"lookup_account","arguments":{"query":"shopify"}}}'

# MCP CLIENT — manage connected external MCP servers
rc "$REVFLARE_URL/api/mcp/servers"                                   # list
rc -X POST "$REVFLARE_URL/api/mcp/servers" \
  -H "Content-Type: application/json" \
  -d '{"name":"netstrat","displayName":"Netstrat","serverUrl":"https://netstrat.example.com/mcp","authToken":"..."}'

rc -X POST "$REVFLARE_URL/api/mcp/servers/3/toggle"                  # enable/disable
rc -X POST "$REVFLARE_URL/api/mcp/servers/3/discover"                # run tools/list
rc -X DELETE "$REVFLARE_URL/api/mcp/servers/3"                       # remove

# Proxy a tool call to a connected MCP server
rc -X POST "$REVFLARE_URL/api/mcp/call" \
  -H "Content-Type: application/json" \
  -d '{"serverId":3,"toolName":"query_network_metrics","args":{"domain":"shopify.com"}}'
```

---

## Organizations & Teams

```bash
# List my orgs
rc "$REVFLARE_URL/api/orgs"

# Create org (I become owner; new org becomes active)
rc -X POST "$REVFLARE_URL/api/orgs" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cloudflare EMEA Sales","description":"Shared playbooks for EMEA Enterprise team"}'

# Switch active org
rc -X POST "$REVFLARE_URL/api/orgs/switch/3"

# List members
rc "$REVFLARE_URL/api/orgs/3/members"

# Invite (owner/admin only)
rc -X POST "$REVFLARE_URL/api/orgs/3/members" \
  -H "Content-Type: application/json" \
  -d '{"email":"teammate@cloudflare.com","role":"member"}'

# Remove (self or owner/admin; last-owner guard)
rc -X DELETE "$REVFLARE_URL/api/orgs/3/members/teammate%40cloudflare.com"
```

---

## Bulk Actions

```bash
# Recompute lead scores for up to 100 accounts
rc -X POST "$REVFLARE_URL/api/bulk/score" \
  -H "Content-Type: application/json" \
  -d '{"accountIds":[1,2,3,4,5]}'

# Generate research for up to 10 accounts in parallel
rc -X POST "$REVFLARE_URL/api/bulk/research" \
  -H "Content-Type: application/json" \
  -d '{"accountIds":[1,2,3,4,5], "reportType":"executive_brief"}'
```

---

## Playbooks

```bash
# List (includes org-shared if I'm in an org)
rc "$REVFLARE_URL/api/playbooks"

# Create (private to me by default)
rc -X POST "$REVFLARE_URL/api/playbooks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Akamai Displacement - Retail",
    "persona": "ae",
    "industry": "Retail",
    "template": "## Akamai Displacement..."
  }'

# Create and share with my active org
rc -X POST "$REVFLARE_URL/api/playbooks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "...",
    "persona": "ae",
    "template": "...",
    "shareWithOrg": true
  }'

# Use a playbook (increments usage_count)
rc -X POST "$REVFLARE_URL/api/playbooks/3/use"
```

---

## Sharing

```bash
# Create a share token (30-day expiry)
rc -X POST "$REVFLARE_URL/api/share/5" \
  -H "Content-Type: application/json" \
  -d '{"label":"For Shopify CISO"}'

# List share tokens for an account
rc "$REVFLARE_URL/api/share/5"

# Delete a share token
rc -X DELETE "$REVFLARE_URL/api/share/token/<token>"

# PUBLIC — view shared account data (NO auth)
curl "$REVFLARE_URL/api/public/<token>"

# PUBLIC — generate research on a shared account (NO auth, rate-limited)
curl -X POST "$REVFLARE_URL/api/public/<token>/research"
```

---

## Settings (Encrypted)

```bash
# Save a key (AES-256-GCM encrypted)
rc -X POST "$REVFLARE_URL/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"key":"intricately_api_key","value":"..."}'

# Check which keys are set (values never returned)
rc "$REVFLARE_URL/api/settings/status"
```

---

## Analytics (Admin)

```bash
# Log a page view (fire-and-forget)
rc -X POST "$REVFLARE_URL/api/track" \
  -H "Content-Type: application/json" \
  -d '{"page":"dashboard","tab":null,"accountId":null}'

# Admin-only analytics dashboard data
rc "$REVFLARE_URL/api/analytics"

# Admin-only team stats
rc "$REVFLARE_URL/api/team-stats"
```

---

## Expected Response Shape

All error responses:
```json
{ "error": "message", "code": "INTERNAL_ERROR" }
```

All success responses: endpoint-specific. Most mutations return `{ "success": true, ... }` with the created/updated object.

## Debugging Tips

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `302 Found` redirect | JWT missing or expired | Refresh from browser or `cloudflared access token` |
| `401 Authentication required` | JWT invalid or Access not configured | Check `CF_ACCESS_TEAM_DOMAIN` secret on worker |
| `500 ENC_SECRET required` | Worker secret missing | `wrangler secret put ENC_SECRET` |
| `403 Not a member` on `/api/orgs/:id/*` | Not in that org | Get invited or switch to an org you belong to |
| `429` | Cloudflare Access rate limit | Back off |
| Empty search results | Not indexed yet | `POST /api/search/index` first |
| Probe returns `cached: true` always | KV cache hit within 6h | Add `?fresh=1` to bypass |
