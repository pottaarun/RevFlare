---
name: revflare
category: sales-intelligence
description: Deploy, query, and extend RevFlare — a single-Worker Cloudflare-native sales intelligence platform. 117 API endpoints, 33 D1 tables, MCP client + server, BGE semantic search, AI persona recommender, Gmail + Salesforce OAuth, bulk actions, teams/orgs, email open tracking + CAN-SPAM compliance, AI chat email refinement, live 8-probe research, threat intel from 26 RSS feeds, and a daisy-chained DeepSeek R1 + Llama 3.3 opportunity agent.
author: Arun Potta
source: https://github.com/pottaarun/RevFlare
---

# RevFlare Skill

**RevFlare** is a Cloudflare-native sales intelligence platform built as a **single Cloudflare Worker**. It helps Cloudflare sales teams (BDR, AE, CSM, SE, VP Sales) research accounts with live data, generate persona-curated outreach with reply-rate-aware recommendations, run mass email campaigns, match threat intelligence to accounts, auto-generate pipeline via AI agents, track email performance end-to-end, collaborate in organizations, and integrate with external tools via the Model Context Protocol.

- **Live URL**: https://revflare.arunpotta1024.workers.dev
- **GitHub**: https://github.com/pottaarun/RevFlare
- **Stack**: Cloudflare Workers + D1 + Workers AI + Browser Rendering + KV + Access + Cron
- **Scale**: ~13,600 LOC across 11 source files, 117 endpoints, 33 tables, 9 migrations
- **Zero-infra**: no servers, no SaaS fees, everything runs on Cloudflare's edge

## When to Load This Skill

Load this skill when the user mentions any of:

- **RevFlare by name**: "revflare", "revFlare", "rev flare"
- **Deploy / fork intent**: "deploy revflare", "clone revflare", "set up sales intel", "fork this for my team", "new revflare instance", "my own revflare"
- **Query intent**: "lookup account in revflare", "get lead score for <account>", "what's in my pipeline?", "revflare research", "show revflare alerts"
- **Integration intent**: "connect opencode to revflare", "revflare mcp server", "add revflare as mcp", "use revflare tools"
- **Customize intent**: "add a persona to revflare", "new campaign theme", "extend revflare", "add a feature to revflare"
- **Troubleshoot intent**: "revflare not working", "revflare search broken", "revflare email not sending", "revflare 401", "d1 migration revflare"
- **Feature names**: "cloudflare sales platform", "AI research for accounts", "persona-curated emails", "sales threat intel", "opportunity agent", "displacement emails", "cloudflare battlecards", "sales MCP server"

Do **not** load this skill for generic Cloudflare Workers questions unrelated to RevFlare. There's no Cloudflare-internal dependency — anyone with a Cloudflare account can deploy this.

## The Three Modes of Use

A user can interact with RevFlare in three distinct modes. Identify which mode they want before diving in.

| Mode | When | Section |
|------|------|---------|
| **A. Query** — consume data from an existing RevFlare instance via its MCP server or HTTP API | User has RevFlare deployed and wants to read from it | [Mode A](#mode-a-query-an-existing-revflare) |
| **B. Deploy** — stand up a brand-new RevFlare instance end-to-end | User wants their own RevFlare, fresh deployment | [Mode B](#mode-b-deploy-a-fresh-revflare-instance) |
| **C. Extend** — modify the RevFlare codebase to add features or fix bugs | User has cloned the repo and wants to customize | [Mode C](#mode-c-extend-or-customize-revflare) |

If the intent is unclear, ask: _"Do you want to connect to an existing RevFlare, deploy a new one, or modify the code?"_

---

## Mode A: Query an Existing RevFlare

There are two ways to query an existing RevFlare deployment: as an **MCP server** (recommended for AI agents) or via the **HTTP API** (recommended for scripts / integrations).

### A.1 — Connect OpenCode to RevFlare's MCP Server

RevFlare itself exposes an MCP server at `POST /api/mcp` that speaks JSON-RPC 2.0 with protocol version `2025-03-26`. Add it to the user's OpenCode config:

**Edit `~/.config/opencode/opencode.jsonc`** and add to the `mcp` section:

```jsonc
{
  "mcp": {
    "revflare": {
      "type": "remote",
      "url": "https://revflare.arunpotta1024.workers.dev/api/mcp",
      "enabled": true,
      "headers": {
        "Cf-Access-Jwt-Assertion": "<paste your Access JWT here>"
      }
    }
  }
}
```

**Obtain the Access JWT**:
1. Visit https://revflare.arunpotta1024.workers.dev in a browser, authenticate via Cloudflare Access
2. Open DevTools → Network → any `/api/*` request → Request Headers → copy the `Cf-Access-Jwt-Assertion` value
3. Paste into `headers` above
4. Access JWTs typically last ~24h; the user will need to refresh

**Alternative**: if the user is on the Cloudflare team network, use `cloudflared access curl` to mint a JWT on demand and inject it via a wrapper.

After editing, run `opencode mcp auth revflare` if OpenCode prompts for auth, otherwise restart OpenCode.

### A.2 — The 6 RevFlare MCP Tools

Once connected, these tools are available to any AI agent:

| Tool | Arguments | Returns |
|------|-----------|---------|
| `lookup_account` | `query: string` (name or domain) | Up to 3 matching accounts with name, industry, status, website, IT spend, CDN, security, employees |
| `get_lead_score` | `account_name: string` | 0–100 score + scoring factors (IT spend, wallet penetration, competitors, activity, size, etc.) |
| `get_account_research` | `account_name: string` | Last 3 AI research reports (summary + full content, up to 2000 chars each) |
| `get_pipeline` | `limit?: number` (default 20, max 50) | Opportunities with ACV, stage, notes, ordered by ACV DESC |
| `get_alerts` | `limit?: number` (default 10, max 30) | Unread infrastructure + threat alerts, ordered by created_at DESC |
| `get_email_stats` | (no args) | Sent / opened / replied counts + open rate % + reply rate % |

**Example prompt**: _"Look up Shopify in RevFlare, check its lead score, and tell me what's in my pipeline."_ — The agent should make 3 sequential MCP calls: `lookup_account({query: "Shopify"})`, `get_lead_score({account_name: "Shopify Inc"})`, `get_pipeline({limit: 20})`.

### A.3 — Direct HTTP API (117 endpoints)

For scripts, cron jobs, or language SDKs without MCP clients, use the REST API directly. Every request must carry a valid Cloudflare Access JWT in the `Cf-Access-Jwt-Assertion` header.

See `scripts/api-examples.md` bundled with this skill for copy-paste curl commands covering every major workflow.

**Full endpoint reference** (117 endpoints, grouped):

| Category | Count | Base path |
|----------|-------|-----------|
| Accounts & uploads | 7 | `/api/accounts/*`, `/api/filters`, `/api/stats`, `/api/platform-stats` |
| Identity & tracking | 3 | `/api/me`, `/api/track`, `/api/analytics` |
| Research | 3 | `/api/research/:id`, `/api/live-probe/:id`, `/api/enrich/:id` |
| Messaging & personas | 4 | `/api/personas`, `/api/messaging/*`, `/api/messaging/suggest-persona/:id`, `/api/messages/*` |
| AI chat refinement | 2 | `/api/chat/message/:id`, `/api/chat/history/:id` |
| Campaigns | 8 | `/api/campaigns/*`, `/api/campaign-themes`, `/api/campaign-emails/*` |
| Competitive intel | 2 | `/api/catalog`, `/api/competitive/:id` |
| Threat intel | 3 | `/api/threats`, `/api/threats/:id`, `/api/threats/:id/email` |
| Alerts | 4 | `/api/alerts`, `/api/alerts/:id/read`, `/api/alerts/:id/suggest-products`, `/api/alerts/:id/email` |
| Lead scoring & advanced features | 10 | `/api/lead-scores`, `/api/roi/:id`, `/api/lookalikes/:id`, `/api/meeting-prep/:id`, `/api/sequences/*`, `/api/detect-changes/:id`, `/api/win-loss/:id`, `/api/playbooks/*`, `/api/ab-test/:id`, `/api/voice-note` |
| Pipeline & opportunities | 5 | `/api/opportunities/*`, `/api/acv` |
| Team & analytics | 2 | `/api/team-stats`, `/api/analytics` |
| Semantic search | 2 | `/api/search/index`, `/api/search?q=` |
| Contacts | 5 | `/api/contacts/*` |
| Scheduled sends | 3 | `/api/scheduled-sends/*` |
| Gmail | 8 | `/api/gmail/*` (connect, callback, status, daily-limit, send, send-campaign, check-replies, disconnect) |
| Email performance | 3 | `/api/email-stats`, `/api/email-suppression/*` |
| Email tracking (public) | 3 | `/api/public/track/:id/pixel.gif`, `/api/public/unsubscribe/:id` (GET + POST) |
| Salesforce | 6 | `/api/salesforce/*` |
| MCP (client) | 7 | `/api/mcp`, `/api/mcp/servers/*`, `/api/mcp/call` |
| Sharing | 5 | `/api/share/*`, `/api/public/:token` (+ `/research`) |
| Settings | 2 | `/api/settings`, `/api/settings/status` |
| Organizations & teams | 6 | `/api/orgs/*`, `/api/orgs/:id/members/*`, `/api/orgs/switch/:id` |
| Bulk actions | 2 | `/api/bulk/score`, `/api/bulk/research` |

Full curl examples in `scripts/api-examples.md`.

---

## Mode B: Deploy a Fresh RevFlare Instance

Full end-to-end deployment. Complete this checklist in order.

### B.1 — Prerequisites

| Requirement | Check | Install |
|------------|-------|---------|
| Node.js ≥ 18 | `node --version` | https://nodejs.org |
| npm | `npm --version` | bundled with Node |
| wrangler | `npx wrangler --version` | `npm install -g wrangler` or use `npx` |
| Cloudflare account | https://dash.cloudflare.com | free tier is enough for dev |
| Authenticated wrangler | `npx wrangler whoami` | `npx wrangler login` |
| GitHub account (optional) | for forking | https://github.com |

**Cloudflare plan requirements**:
- Workers (free tier OK for dev, paid tier recommended for production)
- D1 (free tier OK)
- Workers AI (free tier OK, rate-limited)
- Browser Rendering (paid tier — **$5/mo Workers Paid plan required**)
- KV (free tier OK)
- Cloudflare Access (free tier OK, required for auth)

### B.2 — Clone the Repo

```bash
git clone https://github.com/pottaarun/RevFlare.git
cd RevFlare
npm install
```

**Or** copy the reference files bundled with this skill if the user wants a self-contained starting point:

```bash
cp -r ~/.config/opencode/skills/revflare/reference/* ./
# Then scaffold the remaining source files from the GitHub repo
```

The critical source files to fetch are:
- `src/index.ts` (~6,100 lines) — the main Worker
- `src/advanced-features.ts` (~265 lines) — lead scoring, ROI, etc.
- `src/advanced-features.test.ts` — unit tests (vitest)
- `src/mcp-client.ts` (~281 lines) — MCP client
- `src/threat-intel.ts` (~482 lines) — threat intel module
- `public/index.html` (~160 lines)
- `public/app.js` (~4,560 lines) — SPA
- `public/styles.css` (~1,650 lines)
- `package.json`, `tsconfig.json`
- `seed.mjs` — Excel → D1 seed script

### B.3 — Create the D1 Database

```bash
npx wrangler d1 create revflare-db
```

Copy the `database_id` from the output. Update `wrangler.toml`:

```toml
name = "revflare"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./public"

[[d1_databases]]
binding = "DB"
database_name = "revflare-db"
database_id = "<paste-your-database-id-here>"

[ai]
binding = "AI"

[browser]
binding = "BROWSER"

[[kv_namespaces]]
binding = "THREAT_CACHE"
id = "<create-with-wrangler-kv-namespace-create>"

[triggers]
crons = ["0 6 * * *"]
```

Create the KV namespace:

```bash
npx wrangler kv namespace create THREAT_CACHE
# Copy the id into wrangler.toml above
```

### B.4 — Run ALL Migrations (in order)

Migration order is critical. Run **all 9** against the remote D1:

```bash
# Base schema (must run first)
npx wrangler d1 execute revflare-db --remote --file=schema-full.sql

# Migrations in chronological order
npx wrangler d1 execute revflare-db --remote --file=migration-auth.sql
npx wrangler d1 execute revflare-db --remote --file=migration-approval.sql
npx wrangler d1 execute revflare-db --remote --file=migration-email-daily-limit.sql
npx wrangler d1 execute revflare-db --remote --file=migration-improvements.sql
npx wrangler d1 execute revflare-db --remote --file=migration-email-tracking.sql
npx wrangler d1 execute revflare-db --remote --file=migration-mcp.sql
npx wrangler d1 execute revflare-db --remote --file=migration-semantic-search.sql
npx wrangler d1 execute revflare-db --remote --file=migration-orgs.sql
```

**After all migrations, `num_tables` should be 33.** Verify:

```bash
npx wrangler d1 execute revflare-db --remote \
  --command="SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\_cf\_%' ESCAPE '\\';"
```

**If wrangler fails with `SELF_SIGNED_CERT_IN_CHAIN`** (common on corporate VPN), prefix with `NODE_TLS_REJECT_UNAUTHORIZED=0`:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler d1 execute revflare-db --remote --file=schema-full.sql
```

All migration files are bundled with this skill at `~/.config/opencode/skills/revflare/reference/`.

### B.5 — Set Required Worker Secrets

```bash
# MANDATORY
npx wrangler secret put ENC_SECRET              # any random 32+ char string, e.g. `openssl rand -hex 32`
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN   # e.g. 'yourteam.cloudflareaccess.com'
npx wrangler secret put CF_ACCESS_AUD           # the Application Audience (AUD) tag from Cloudflare Access app

# OPTIONAL (set later via in-app wizard or here for convenience)
npx wrangler secret put GOOGLE_CLIENT_ID        # Gmail OAuth
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put CF_API_TOKEN            # for Cloudflare Radar enrichment
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put INTRICATELY_API_KEY     # HG Cloud Dynamics enrichment
```

**`ENC_SECRET` is mandatory in production**. The worker will return 500 on every request if `CF_ACCESS_TEAM_DOMAIN` is set but `ENC_SECRET` is missing. Without it, encryption key derivation is deterministic from source alone — a security gap.

### B.6 — Configure Cloudflare Access

RevFlare uses Cloudflare Access for auth. Without it, requests are rejected with 401.

1. Zero Trust Dashboard → Access → Applications → **Add an application**
2. Type: **Self-hosted**
3. Application name: `RevFlare`
4. Session duration: 24 hours (or your preference)
5. Domain: `revflare.<your-subdomain>.workers.dev`
6. Identity providers: configure at least one (Google, GitHub, Okta, One-time PIN, etc.)
7. Add policies: "Allow" with email-ends-with your-domain.com, or specific emails
8. Save

The AUD tag appears in the app's **Overview** page — use it as `CF_ACCESS_AUD`.

### B.7 — Deploy

```bash
npx wrangler deploy
```

Or if corporate VPN blocks TLS:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler deploy
```

You should see:

```
Uploaded revflare (6-10 sec)
Deployed revflare triggers
  https://revflare.<subdomain>.workers.dev
  schedule: 0 6 * * *
```

Visit the URL, authenticate via Access, and confirm the dashboard loads.

### B.8 — Upload Account Data

Two paths:

**Option 1 — UI upload (easiest)**: Navigate to `#/upload` in the web app, drag and drop a Salesforce `.xlsx` export. See `seed.mjs.example` for the expected column format.

**Option 2 — Programmatic seed (for dev)**:
```bash
# Place your Excel at ./Sharable - Nam - Account Report.xlsx, then:
npm run seed    # or: node seed.mjs
```

The seed script parses the Excel, maps ~50 columns to the `accounts` table, and loads everything into the local D1.

### B.9 — Optional Integrations

Each is configured via an **in-app wizard** (no CLI needed) — credentials are AES-256-GCM encrypted into D1:

| Integration | Wizard location | What to enter |
|-------------|-----------------|---------------|
| **Gmail OAuth** | Top-right "Connect Gmail" button | Google Cloud Console → OAuth Client ID + Secret. Redirect URI: `https://your-url/api/gmail/callback`. Scopes: `gmail.send`, `gmail.readonly`, `gmail.settings.basic`. |
| **Salesforce OAuth** | Settings → Salesforce | SF Connected App → Client ID + Secret. Redirect URI: `https://your-url/api/salesforce/callback`. |
| **Intricately API** | Settings → Integrations | API key from HG Cloud Dynamics / Intricately |
| **News APIs** | Settings → Integrations | Keys for NewsAPI, GNews, MediaStack (optional — free RSS + GDELT work without them) |
| **Cloudflare Radar** | Worker secret `CF_API_TOKEN` | Cloudflare dashboard → API Tokens → Radar API |

### B.10 — Run the Initial Search Index

Once you have accounts + a few research reports + messages, seed the semantic search index:

```bash
# From the UI: press ⌘K, then select "Re-index search"
# Or via API:
curl -X POST https://your-url/api/search/index \
  -H "Cf-Access-Jwt-Assertion: <jwt>"
```

### B.11 — Confirm Everything Works

| Check | Command / URL |
|-------|---------------|
| Dashboard loads | Visit `https://your-url/` → see accounts table |
| API reachable | `curl -sk -o /dev/null -w "%{http_code}\n" https://your-url/api/me` → 302 (Access redirect) |
| D1 migrated | `wrangler d1 execute revflare-db --remote --command="PRAGMA table_info(organizations);"` → 7 columns |
| MCP server up | `curl -X POST https://your-url/api/mcp -H "Content-Type: application/json" -H "Cf-Access-Jwt-Assertion: <jwt>" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` → 6 tools |
| Cron configured | Visit Workers dashboard → Triggers → see `0 6 * * *` |

### B.12 — One-Shot Deploy Script

A ready-to-run deploy script is bundled at `~/.config/opencode/skills/revflare/scripts/deploy.sh`. It runs B.3 through B.7 sequentially.

---

## Mode C: Extend or Customize RevFlare

### C.1 — Project Structure

```
revFlare/
├── src/
│   ├── index.ts                    # Main Worker (~6,100 lines, 117 routes)
│   ├── advanced-features.ts        # Lead scoring, ROI, lookalikes, sequences
│   ├── advanced-features.test.ts   # Unit tests (vitest)
│   ├── mcp-client.ts               # MCP client + SSRF guard
│   └── threat-intel.ts             # Threat intelligence module
├── public/
│   ├── index.html                  # HTML shell + nav + Gmail wizard
│   ├── app.js                      # Vanilla JS SPA (~4,560 lines)
│   └── styles.css                  # Design system (~1,650 lines)
├── schema-full.sql                 # Base DB schema (21 tables)
├── migration-*.sql                 # 8 migrations
├── seed.mjs                        # Excel → D1 seed
├── wrangler.toml                   # Worker config
├── package.json
├── tsconfig.json
└── README.md                       # Full docs (60KB, 1,000+ lines)
```

### C.2 — Local Development

```bash
npm install
npx wrangler d1 execute revflare-db --local --file=schema-full.sql
# ... run all migrations with --local ...
npm run dev                         # wrangler dev on localhost:8787
```

Set `DEV_MODE=true` in `.dev.vars` to allow `?_user=<email>` query-param auth for testing without Access.

### C.3 — Common Customization Recipes

See `scripts/customize.md` bundled with this skill for complete recipes. Quick index:

| Task | Files to edit |
|------|---------------|
| Add a new persona | `src/index.ts` `PERSONA_CONFIGS` constant + update the 5-persona UI grid in `public/app.js` `tabMessaging()` |
| Add a new message type to a persona | `src/index.ts` — add to that persona's `messageTypes` array |
| Add a new campaign theme | `src/index.ts` `CAMPAIGN_THEMES` constant (follow the existing 8-theme pattern) |
| Add a new live-research probe | `src/index.ts` — add a new function in the probe section, add to the `probes[]` array in `/api/live-probe/:accountId` |
| Add a new competitive category | `src/index.ts` `PRODUCT_CATALOG` constant |
| Add a new RSS threat feed | `src/threat-intel.ts` `RSS_FEEDS` array |
| Add a new alert severity level | `src/index.ts` — everywhere `severity` is checked; also update UI in `public/app.js` `renderAlerts` |
| Add a new MCP tool (RevFlare as server) | `src/index.ts` `REVFLARE_MCP_TOOLS` array + handler in the `tools/call` switch |
| Add a new MCP preset (client-side quick-add) | `src/mcp-client.ts` `MCP_INTEGRATION_MAP` + `public/app.js` `MCP_PRESETS` |
| Add a new lead-scoring factor | `src/advanced-features.ts` `calculateLeadScore()` |
| Add a new ROI category | `src/advanced-features.ts` `calculateROI()` |
| Add a new admin | `src/index.ts` `ADMIN_EMAILS` Set |
| Change AI model | `src/index.ts` `RESEARCH_MODEL`, `EMAIL_MODEL`, `FAST_MODEL`, or `EMBEDDING_MODEL` constants |
| Change daily email limit | `src/index.ts` `DAILY_EMAIL_LIMIT` constant |
| Change probe cache TTL | `src/index.ts` `PROBE_CACHE_TTL` constant |
| Add a new page route | `public/index.html` nav + `public/app.js` `navigate()` router + new `render<Name>()` function |
| Add a command-palette action | `public/app.js` `PALETTE_ROUTES` or the candidate list in `paletteOpen()` |

### C.4 — Writing a New Migration

Every new DB change **must** be a new migration file, never an edit to `schema-full.sql`:

```bash
cat > migration-my-feature.sql <<'EOF'
-- Migration: <what it does>
-- Run: wrangler d1 execute revflare-db --remote --file=migration-my-feature.sql

CREATE TABLE IF NOT EXISTS my_new_table (...);
ALTER TABLE existing_table ADD COLUMN new_column TEXT;
CREATE INDEX IF NOT EXISTS idx_foo ON my_new_table(user_email);
EOF
```

**Migration discipline rules**:
- Use `IF NOT EXISTS` everywhere — migrations must be idempotent for `CREATE TABLE` and `CREATE INDEX`
- `ALTER TABLE ADD COLUMN` is NOT idempotent in D1 — it will fail on re-run. Either accept this or gate with try/catch in code.
- Every new table must have `user_email TEXT NOT NULL` for tenant scoping unless explicitly global
- Every new table should have a `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
- Run locally first: `wrangler d1 execute revflare-db --local --file=migration-*.sql`
- Update `README.md` deployment section to include the new migration in order

### C.5 — Adding a New Endpoint

Pattern used throughout `src/index.ts`:

```typescript
app.post('/api/my-endpoint/:id', async (c) => {
  const email = c.get('userEmail');
  const orgId = c.get('orgId');        // if org-scoped
  const id = c.req.param('id');
  const { someField } = await c.req.json<{ someField: string }>();

  // 1. Validate input
  if (!someField) return c.json({ error: 'someField required' }, 400);

  // 2. Verify ownership
  const row = await c.env.DB.prepare(
    'SELECT * FROM some_table WHERE id = ? AND user_email = ?'
  ).bind(id, email).first();
  if (!row) return c.json({ error: 'Not found' }, 404);

  // 3. Do the work
  const result = await doSomething(row, someField);

  // 4. Return structured JSON
  return c.json({ success: true, result });
});
```

**Rules**:
- Always scope by `user_email` (or `org_id` where shared)
- Return standard `{ error: '...' }` shape on failure; the global `app.onError` handler will catch anything uncaught
- Use `c.executionCtx.waitUntil()` for non-blocking side effects (log writes, cache puts, analytics)
- Cap batch sizes and array lengths — any input coming from the user should have `.slice(0, maxN)` applied
- Escape ALL user-supplied strings before storing or rendering — see `esc()` in `public/app.js`
- For external URLs: call `isValidExternalDomain()` or `isValidMCPServerUrl()` to prevent SSRF

### C.6 — Testing

```bash
npm install -D vitest
npm test                             # runs src/*.test.ts
```

Currently only `src/advanced-features.test.ts` has coverage. Expand tests for:
- Auth middleware (JWT verify, DEV_MODE path, `_user` param gate)
- SSRF guards (`isValidExternalDomain`, `isValidMCPServerUrl`)
- Email approval gating (cannot send `pending_approval` / `rejected`)
- Suppression enforcement
- Daily-limit atomic check-and-insert
- Any new feature

### C.7 — TypeScript Strictness

`tsconfig.json` is set to strict mode. Type-check with:

```bash
npx tsc --noEmit
```

Zero errors must be maintained. `src/index.ts` uses a generic Hono app with typed Variables:

```typescript
const app = new Hono<{
  Bindings: Bindings;
  Variables: { userEmail: string; orgId: number | null };
}>();
```

So `c.get('userEmail')` and `c.get('orgId')` are typed.

---

## Complete Capability Inventory

Every feature in RevFlare, organized by category. **Nothing is omitted.**

### Data Layer (33 D1 Tables)

| Table | Purpose |
|-------|---------|
| `accounts` | Salesforce data, ~50 columns including IT spend breakdown by category |
| `research_reports` | AI research output: 4 report types per account |
| `persona_messages` | Generated emails with approval_status, tracking_id, open_count, replied flag |
| `campaigns` | Mass email campaigns with theme, persona, filters, generated count |
| `campaign_emails` | Individual emails within a campaign with same status + tracking as persona_messages |
| `email_chat_history` | AI chat turns per email (role: user/assistant) |
| `email_opens` | Pixel-open events with tracking_id, source_type, source_id |
| `email_suppression` | Suppressed addresses (bounce / complaint / unsubscribe / invalid) |
| `unsubscribes` | Per-recipient unsubscribe log |
| `email_send_log` | Daily send limit tracking (100/day per user) |
| `email_variants` | A/B test variants |
| `contacts` | People linked to accounts, imported from Salesforce or created manually |
| `scheduled_sends` | Future email delivery queue |
| `share_tokens` | Tokenized public-share links (32-char UUID, 30-day TTL) |
| `gmail_tokens` | OAuth tokens (encrypted, AES-256-GCM) |
| `salesforce_tokens` | SF OAuth tokens (encrypted) |
| `app_settings` | Encrypted per-key config (API keys, OAuth client secrets) |
| `opportunities` | Pipeline tracking with ACV, stage, notes |
| `lead_scores` | Cached per-account scores + factors (JSON) |
| `sequences` | Multi-touch sequences with execution state |
| `meeting_preps` | AI meeting briefs |
| `alerts` | Infrastructure change + threat intel alerts |
| `probe_history` | CDN/DNS snapshots for change detection |
| `playbooks` | Reusable sales templates, org-shareable via `org_id` |
| `voice_notes` | Call transcripts → follow-up email outputs |
| `vectorize_cache` | Semantic search index with `embedding BLOB` (768-dim BGE) |
| `page_views` | Usage analytics (page + tab + account_id + user_email) |
| `mcp_servers` | Connected external MCP servers per user |
| `mcp_tool_calls` | MCP tool call audit log |
| `organizations` | Top-level orgs for team collaboration |
| `org_members` | Membership with roles (owner/admin/member) |
| `user_prefs` | Per-user preferences including `active_org_id` |
| `persona_performance` | Reserved: industry × persona × message_type reply-rate aggregates |

### Research Engine (8 Live Probes)

Every account can be probed on-demand. Probes run **in parallel**. Results cached in KV for 6h (day-bucketed).

| Probe | Source | Returns |
|-------|--------|---------|
| 1. Website Scraper | Cloudflare Browser Rendering (Puppeteer) | Title, meta, about, careers, investor relations, press, tech signals |
| 2. HTTP Headers | HEAD request | CDN detection, server, security header audit (5 headers) |
| 3. DNS Records | Cloudflare DoH (1.1.1.1) | A, CNAME, MX, NS + provider detection |
| 4. SEC EDGAR | EFTS + company_tickers + submissions API | Filings, CIK, ticker, SIC code |
| 5. News Search | Google, Bing, DuckDuckGo | Recent headlines (deduped) |
| 6. Funding | Crunchbase + Google News | Total funding, last round, investors |
| 7. Intricately | HG Cloud Dynamics API (optional) | IT spend, product deployments, traffic |
| 8. Cloudflare Radar | CF Radar API (optional) | Domain rank, categories, HTTP protocol mix |

### Persona System (25 Message Variants)

5 personas × 5 message types each:

| Persona | Message Types |
|---------|---------------|
| **BDR** (Business Development Rep) | Cold Email, LinkedIn Message, Cold Call Script, Follow-Up Sequence, Displacement Outreach |
| **AE** (Account Executive) | Executive Email, Proposal Summary, ROI / Business Case, Champion Enablement, Displacement Proposal |
| **CSM** (Customer Success Manager) | QBR Talking Points, Expansion Pitch, Account Health Check, Renewal Prep, Vendor Consolidation Pitch |
| **SE** (Solutions Engineer) | Technical Brief, Migration Plan, Architecture Review, POC Proposal, Technical Displacement Brief |
| **VP Sales** | Executive Brief, CxO Outreach, Strategic Proposal, Board Talking Points, Platform Consolidation Case |

### Campaign Themes (8)

- Security Posture Review
- Cost Optimization
- Vendor Consolidation
- Digital Transformation
- Performance & Speed
- Zero Trust Modernization
- Competitive Displacement
- AI at the Edge

### Competitive Intelligence (12 Categories, 40+ Competitors)

| Category | Cloudflare Products | Competitors |
|----------|---------------------|-------------|
| CDN | CDN, Argo, Cache Reserve, Tiered Caching, China Network | Akamai, CloudFront, Fastly, Google CDN, Azure CDN |
| WAF | WAF, API Shield, Page Shield, Turnstile | Imperva, AWS WAF, Akamai AAP, F5, Barracuda |
| DDoS | DDoS Protection, Magic Transit, Spectrum | Akamai Prolexic, AWS Shield, Imperva, Radware |
| Bot Management | Bot Management, Turnstile | Akamai, DataDome, HUMAN |
| Zero Trust / SASE | Access, Gateway, WARP, Browser Isolation, CASB, DLP | Zscaler, Palo Alto, Netskope, Cisco |
| Email Security | Email Security, Email Routing | Proofpoint, Mimecast, Abnormal, Microsoft |
| DNS | DNS, DNS Firewall, Secondary DNS, 1.1.1.1 | Route 53, Akamai DNS, NS1, Google DNS |
| Edge Compute | Workers, Pages, R2, D1, KV, Durable Objects, Queues, AI, Vectorize | Lambda@Edge, Vercel, Netlify, Deno, S3 |
| Network | Magic Transit, Magic WAN, Network Interconnect | MPLS, VeloCloud, Aruba |
| Performance | Speed Brain, Zaraz, Observatory, Analytics, Waiting Room | GTM, Segment, Datadog RUM, New Relic |
| Media | Stream, Images, Image Resizing | Mux, Cloudinary, imgix |
| Registrar | Cloudflare Registrar | GoDaddy, Namecheap, Squarespace |

### Threat Intelligence Pipeline

**Sources**: 26 RSS feeds + GDELT + Google News + Bing News + NewsAPI + GNews + MediaStack (7 source categories).

**Pipeline**:
1. Parallel fetch all sources
2. Dedup (in-request + KV 5000-URL hash set, 30-day TTL)
3. Date filter (age-decay severity scoring)
4. Entity-compromise filter (only create alerts when account name or domain explicitly mentioned)
5. Relevance scoring (SECURITY_DOMAINS boost)
6. Country detection (20 countries + sub-national)
7. Cloudflare product mapping (which Cloudflare products address this threat)
8. Severity scoring (age decay + country boost)
9. Result cache (10-min KV TTL to prevent feed hammering)

**Cron**: runs daily at 0 6 * * * UTC for nightly incident scan + email reply polling + scheduled send processing + sequence execution.

### Semantic Search (BGE + D1)

- Model: **@cf/baai/bge-base-en-v1.5** (768 dimensions)
- Storage: Float32 BLOB in `vectorize_cache.embedding`
- Indexing: `POST /api/search/index` embeds all research + messages in batches of 10
- Querying: `GET /api/search?q=` embeds the query, cosine-similarity-ranks, returns top 20
- **Hybrid ranking**: `0.7 × cosine_similarity + 0.3 × keyword_match`
- **Graceful fallback**: reports `method: "keyword-only"` if embeddings missing

### Reply-Rate Persona Recommender

Endpoint: `GET /api/messaging/suggest-persona/:accountId`

**Scoring formula per (persona, message_type) pair**:
- Weight same-industry outcomes 3× vs global (industry behavior is a stronger signal)
- Laplace-smoothed reply rate with priors `α=1, β=10` (≈9% baseline)
- UCB exploration bonus: `sqrt(2 × log(totalSent) / (pairSent + 1)) × 0.05`
- Final score = posterior reply rate + exploration bonus

UI: inline banner above the persona picker in the Email Composer tab; clicking applies both persona and message type.

### Opportunity Agent (Daisy-Chained AI)

Endpoint: `POST /api/opportunities/auto-generate`

**Two-stage pipeline**:
1. **Stage 1 — DeepSeek R1 32B**: deep reasoning over top-10 lead-scored accounts (addressable spend, displacement potential, deal stage, realistic ACV, #1 sales play)
2. **Stage 2 — Llama 3.3 70B**: converts reasoning into structured JSON (index, stage, acv, notes)

**Filters**: skips accounts that already have opportunities; requires lead score ≥ 30; cap 10 per run.

### Lead Scoring (8 Factors, 0–100)

| Factor | Max Points | Signal |
|--------|-----------|--------|
| IT Spend | 20 | Monthly IT spend magnitude |
| Wallet Penetration | 15 | Low CF MRR vs IT spend = expansion opportunity |
| Displaceable Competitors | 15 | Akamai, CloudFront, Fastly, Imperva, Zscaler, etc. detected |
| Activity Recency | 10 | Days since last engagement |
| Open Pipeline | 10 | Existing opportunities |
| Company Size | 10 | Employee count (Enterprise > Mid-Market > Growth) |
| Security Gaps | 8 | Using non-CF security products |
| SAM | 10 | Serviceable addressable market |
| (remainder) | 2 | Reserved for future signals |

Cached per-account in `lead_scores` table.

### Email Approval + Execution Workflow

1. **Generate** email via `/api/messaging/:id` → stored with `approval_status='pending_approval'`
2. **Review** recipient info (account name, website, industry, location, IT spend, tech stack) in the UI
3. **Approve** via `/api/messages/:id/approve` (or bulk approve campaigns)
4. **Send** via `/api/gmail/send` or `/api/gmail/send-campaign/:id`
   - Backend enforces `approval_status === 'approved'` check before send
   - Backend enforces daily limit (100/day/user) with atomic check-and-insert
   - Backend blocks sends to addresses on the suppression list
   - Backend appends the user's Gmail signature (fetched from Gmail Settings API)
   - Backend injects tracking pixel + List-Unsubscribe header
5. **Track opens** via `GET /api/public/track/:trackingId/pixel.gif` (public, no auth)
6. **Track replies** via `POST /api/gmail/check-replies` (manual or cron)
7. **Handle unsubscribes** via `GET/POST /api/public/unsubscribe/:trackingId` → inserts into suppression list

### AI Chat Email Refinement

Endpoint: `POST /api/chat/message/:messageId` with `{ instruction, messageType }`.

- Llama 3.3 70B with multi-turn context (up to 20 prior turns)
- Extracts new subject from response, updates `content` + `subject`
- Resets `approval_status` to `pending_approval` for re-review
- All turns persisted to `email_chat_history`

### Email Performance Dashboard

Route: `#/email-stats`

- Top-line: total sent, opened, replied, open rate %, reply rate %
- Daily usage: today's count vs 100/day cap with color-coded progress
- Daily send trend: last 14 days as bar chart
- Per-campaign funnel: last 20 campaigns with sent/opened/replied
- Suppression list: searchable table with one-click remove

### Advanced Features (Per-Account Tools)

| Feature | API | What it does |
|---------|-----|--------------|
| **ROI Calculator** | `GET /api/roi/:id` | Savings estimate across 6 spend categories (CDN, Security, DNS, Cloud, Data Center, Traffic Mgmt) with vendor consolidation value |
| **Lookalike Accounts** | `GET /api/lookalikes/:id` | Similar accounts by industry, employee count, IT spend, geography, tech stack |
| **Meeting Prep** | `POST /api/meeting-prep/:id` | AI-generated call brief with talk tracks, objection handling, key questions |
| **Multi-Touch Sequences** | `POST /api/sequences` | Coordinated outreach across email/phone/LinkedIn with 4 templates (5–14 day spans) |
| **Sequence Execution** | `POST /api/sequences/:id/activate` + `/pause` | Cron sends each touch on schedule, advances through steps, pauses on reply |
| **Change Detection** | `POST /api/detect-changes/:id` | Scans CDN, DNS, server headers; compares to last probe; auto-creates alerts |
| **A/B Email Testing** | `POST /api/ab-test/:id` | Two email variants in parallel: business outcome hook vs technical insight hook |
| **Voice Notes** | `POST /api/voice-note` | Paste call notes → AI generates professional follow-up email |
| **Win/Loss Analysis** | `POST /api/win-loss/:id` | AI analysis of closed opportunity with lessons learned |

### Organizations & Teams

| Feature | Endpoint |
|---------|----------|
| Create org | `POST /api/orgs` (caller becomes `owner`, org becomes active) |
| List orgs | `GET /api/orgs` |
| Switch active org | `POST /api/orgs/switch/:id` |
| List members | `GET /api/orgs/:id/members` |
| Invite member | `POST /api/orgs/:id/members` (owner/admin only) |
| Remove member | `DELETE /api/orgs/:id/members/:email` (last-owner guard) |

**Shared playbooks**: `POST /api/playbooks` accepts `shareWithOrg`. `GET /api/playbooks` unions user-owned + active-org-shared. `/use` verifies membership.

**UI**: `#/org` Teams page, nav dropdown org switcher, `Create organization...` action in command palette.

### Bulk Actions

| Endpoint | Cap | AI |
|----------|-----|-----|
| `POST /api/bulk/score` | 100 accounts | No — derived math only |
| `POST /api/bulk/research` | 10 accounts | Yes — DeepSeek R1 in parallel |

UI: checkboxes on dashboard + floating toolbar. Selections persist across pagination.

### Command Palette (⌘K / Ctrl+K)

Global keyboard shortcut opens a fuzzy-searchable overlay:
- Every nav route
- Up to 200 accounts (fetched lazily on first open)
- Global actions: `Create organization...`, `Re-index search`

Fuzzy scorer: exact match (1000) > prefix (500) > substring (200) > char-in-order (variable).

### MCP Integration (Client + Server)

**As client** — connect any JSON-RPC 2.0 MCP server. Built-in presets (quick-add in `#/mcp`):

| Preset | Use in RevFlare |
|--------|-----------------|
| `netstrat` | Network metrics + account strategy during research + email |
| `google-workspace` | Calendar for meeting prep, contacts for account lookup |
| `wiki` | Internal knowledge search during research, competitive positioning during email |
| `cloudflare-docs` | Product docs lookup during email |
| `jira` | Issue search during research + meeting prep |

**As server** — endpoint `POST /api/mcp` exposes 6 tools (see [Mode A](#a2--the-6-revflare-mcp-tools)).

**Security**: MCP server URLs validated via `isValidMCPServerUrl()`:
- HTTPS only
- No IPs (v4, v6, decimal, octal)
- No localhost / private / reserved ranges
- No `.local`, `.internal`, `.corp`, `.lan`, `.home`, `.arpa` TLDs
- Must have a dotted hostname
- Auth tokens AES-256-GCM encrypted
- 15s abort timeout on every tool call
- Every call logged to `mcp_tool_calls`

### Gmail Integration

- **OAuth**: in-app wizard, scopes `gmail.send` + `gmail.readonly` + `gmail.settings.basic`
- **Auto token refresh**: handled in every outbound path
- **Signature**: fetched from Gmail Settings API on first connect, appended to every outbound
- **Daily limit**: 100/day/user, atomic check-and-insert in `email_send_log`
- **Reply tracking**: `/api/gmail/check-replies` (manual + cron) polls Gmail threads for replies
- **Scheduled sends**: future delivery via `/api/scheduled-sends/*`, cron processes the queue
- **Tracking pixel**: public endpoint bypasses Access for deliverability
- **Unsubscribe**: public endpoint with List-Unsubscribe / List-Unsubscribe-Post headers for Gmail / Yahoo one-click

### Salesforce Integration

- **OAuth**: in-app wizard
- **Push activities**: research reports + emails as SF Tasks
- **Pull opportunities**: by account name
- **Import contacts**: per account
- **Automatic nightly sync**: cron pushes last-24h sent emails as SF Tasks

### Usage Analytics (Admin)

Route: `#/analytics` (visible only to `apotta@cloudflare.com` by default; see `ADMIN_EMAILS` to change)

Every page/tab navigation fires `POST /api/track` (fire-and-forget via `waitUntil`). Dashboard shows:
- Total views, most visited page, most popular tab
- Page views table with percentage bars
- Tab views table (color-coded per tab)
- Daily trend bar chart (last 30 days)
- User activity leaderboard
- Recent activity (last 50 views)

### Sharing System

- 32-char UUID tokens (128-bit entropy)
- Mandatory 30-day expiry
- Public endpoints (`/api/public/:token`, `/api/public/:token/research`) bypass Access
- Shows account data + research + messages
- Tokens deletable by creator

### Encrypted Settings (AES-256-GCM)

- Key derivation: `SHA-256("revflare-settings-v1:" + ENC_SECRET + ":" + keyName)`
- Random 12-byte IV per encryption
- Stored in `app_settings` (API keys, OAuth client secrets), `gmail_tokens`, `salesforce_tokens`
- Legacy plaintext tokens: decryption falls back to raw; re-encrypted on next refresh

### Security Posture (47 fixes across 3 audits)

| Protection | Implementation |
|-----------|----------------|
| JWT signature verification | JWKS from Cloudflare Access, RS256 verified with `crypto.subtle`, 1-hour key cache |
| Auth bypass prevention | `_user` query param requires explicit `DEV_MODE` env var |
| Encryption with secret | Key derivation uses `ENC_SECRET` + salt + key name |
| OAuth token encryption | Gmail + Salesforce tokens AES-GCM encrypted before D1 storage |
| XSS protection | Global `esc()` applied to all user-supplied + external data |
| SSRF prevention | `isValidExternalDomain()` blocks IPs, localhost, private ranges, link-local, internal TLDs |
| SOQL injection | Full character escaping on all Salesforce SOQL queries |
| CORS whitelist | Only own origin + localhost; no wildcard |
| Email abuse protection | 100/day limit with atomic check-and-insert |
| Share token hardening | Full UUID + mandatory 30-day expiry |
| Input validation | `limit` capped at 200, `page ≥ 1`, `days ≤ 90`, campaign batches ≤ 20 |
| Atomic operations | Multi-table deletes use `DB.batch()` |
| Error observability | All catch blocks log; global `app.onError` standardizes responses |

### AI Models Used

| Model | Binding | Usage | Fallback |
|-------|---------|-------|----------|
| DeepSeek R1 32B | `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | Research reports, battlecards, opportunity agent stage 1 | Llama 3.3 |
| Llama 3.3 70B | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Emails, campaigns, threat emails, opp agent stage 2, A/B variants, sequences, meeting prep, chat refinement | — |
| Llama 3.1 8B | `@cf/meta/llama-3.1-8b-instruct` | Quick enrichment, search re-ranking (legacy) | — |
| BGE Base EN v1.5 | `@cf/baai/bge-base-en-v1.5` | Semantic search embeddings (768-dim) | Keyword-only fallback |

Auto-fallback in `runAI()`: if primary model fails, retries with Llama 3.3. Context auto-trimmed (12K for DeepSeek, 20K for Llama).

### External Data Sources (Fetched at Runtime)

- 26 cybersecurity RSS feeds
- GDELT
- Google News
- Bing News
- NewsAPI (optional key)
- GNews (optional key)
- MediaStack (optional key)
- SEC EDGAR (EFTS + company_tickers.json + submissions API)
- Cloudflare DoH (1.1.1.1)
- Crunchbase public pages
- Intricately / HG Cloud Dynamics API (optional key)
- Cloudflare Radar API (optional token)
- Google OAuth2 / Gmail API
- Salesforce OAuth2 / REST API
- External MCP servers (any JSON-RPC 2.0 endpoint)

### Cloudflare Services Used

| Service | Binding | Purpose |
|---------|---------|---------|
| Workers | runtime | Application server |
| D1 | `DB` | SQLite database (33 tables) |
| Workers AI | `AI` | LLM + embedding inference |
| Browser Rendering | `BROWSER` | Puppeteer website scraping |
| Workers KV | `THREAT_CACHE` | Threat intel cache, URL dedup, probe cache |
| Cloudflare Access | infrastructure | JWT-based auth |
| Cron Triggers | `[triggers] crons` | Nightly threat scan, reply polling, scheduled sends, sequence execution |
| Static Assets | `[assets]` | Serves `public/` directory |

---

## Common Task Recipes (Cookbook)

These are the most common things users ask to do with RevFlare. Each has a 1-3 line answer.

### "Generate research on Shopify"

```
POST /api/research/<accountId>
body: { "reportType": "executive_brief" }
```

Or UI: Dashboard → click Shopify row → Deep Research tab → pick report type → Generate.

### "What persona should I use to email <account>?"

```
GET /api/messaging/suggest-persona/<accountId>
→ returns top 3 (persona, message_type) pairs with reply rates
```

Or UI: Dashboard → click account → Email Composer → recommendation banner auto-loads.

### "Send an email to a prospect"

1. Generate: `POST /api/messaging/:id` with `{persona, messageType, customContext}`
2. Approve: `POST /api/messages/:msgId/approve`
3. Send: `POST /api/gmail/send` with `{messageId: msgId, toAddress: "prospect@example.com"}`

### "Run a mass campaign"

1. Create: `POST /api/campaigns` with `{name, theme, persona, messageType, filters}`
2. Generate emails in batches: `POST /api/campaigns/:id/generate` (batch of 2 per call, poll until done)
3. Review emails in `#/campaign/:id`
4. Approve all: `POST /api/campaigns/:id/approve-all`
5. Send all: `POST /api/gmail/send-campaign/:id`

### "Auto-generate my pipeline"

```
POST /api/opportunities/auto-generate
body: { "limit": 10 }
→ creates up to 10 pipeline opportunities using daisy-chained AI
```

Or UI: `#/pipeline` → "Auto-generate with AI" button.

### "Search across all my research"

```bash
# First time: re-index
POST /api/search/index
# Then query:
GET /api/search?q=akamai+migration
```

Or: ⌘K → `Re-index search`, then type in the nav search box.

### "Bulk research 5 accounts at once"

UI: Dashboard → check 5 rows → bottom toolbar → "Run Research". Capped at 10 per call.

### "Create a team and share playbooks"

1. UI: ⌘K → `Create organization...`
2. Enter name, description → creates org, makes you owner
3. Teams page → Members → Invite by email
4. When creating a playbook, check "Share with organization"

### "Connect to external MCP server (e.g. Netstrat)"

UI: `#/mcp` → Quick-Add → `Netstrat` → paste URL + auth token → Discover Tools.
Tools will be called automatically during research, email generation, and meeting prep.

### "Check my email performance"

UI: `#/email-stats`. Shows sent/opened/replied rates, daily trend, per-campaign funnel, suppression list.

### "Import contacts from Salesforce"

UI: Account detail page → Contacts tab → "Import from Salesforce".
Or: `POST /api/salesforce/import-contacts/<accountId>`.

### "Remove someone from the suppression list (false-positive bounce)"

UI: `#/email-stats` → Suppression list → Remove button.
Or: `DELETE /api/email-suppression/:id`.

### "Share account intel with a non-RevFlare user"

1. Account detail page → Share button → generates 32-char UUID link with 30-day expiry
2. Send the link; it bypasses Cloudflare Access

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 Authentication required` | Access not configured or JWT missing | Configure Cloudflare Access; set `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` secrets |
| `500 Server misconfigured: ENC_SECRET is required` | Production without ENC_SECRET | `wrangler secret put ENC_SECRET` with any random 32+ char value |
| `SELF_SIGNED_CERT_IN_CHAIN` on wrangler commands | Corporate VPN TLS inspection | Prefix with `NODE_TLS_REJECT_UNAUTHORIZED=0` OR install corporate CA cert |
| `search` returns empty on queries that should match | Haven't indexed yet | `POST /api/search/index` (or ⌘K → Re-index search) |
| `search` shows `method: "keyword-only"` | Embeddings not computed / BGE unavailable | Embeddings will retry on next `/api/search/index` run; keyword fallback is fine |
| `POST /api/live-probe` takes 30+ seconds | First probe, no cache hit | Subsequent probes within 6h return from cache immediately (`cached: true`) |
| `suggest-persona` returns "Low-volume pair" for all | Not enough sent emails yet | Normal — Laplace priors surface exploration candidates until you have 3+ sends per pair |
| MCP client call fails with "SSRF protection" | URL failed `isValidMCPServerUrl()` | URL must be HTTPS, have a real domain (not IP), not be localhost/private/`.local`/etc. |
| Gmail send returns "Daily limit reached" | 100 emails/day/user cap | Wait until UTC midnight, or ask admin to increase `DAILY_EMAIL_LIMIT` constant |
| Email generation fails with "AI returned empty response" | Workers AI rate limit or model cold-start | Retry; `runAI()` auto-fallbacks to Llama 3.3 after 1 failure |
| Opportunity auto-generate returns "No new opportunities" | All accounts with score ≥ 30 already have opps | Lower threshold in code, or manually create for lower-scored accounts |
| `#/org` shows "Failed to load" | `migration-orgs.sql` not applied | Run migration on remote: `wrangler d1 execute revflare-db --remote --file=migration-orgs.sql` |
| Migrations fail with "duplicate column" | `ALTER TABLE ADD COLUMN` re-run | D1 has no `IF NOT EXISTS` for columns; expected on re-run, safe to ignore |
| Tracking pixel doesn't record opens | Email client blocks images | Known limitation; most enterprise clients (Outlook, Gmail) load tracked images |
| `/api/mcp` returns 401 from Claude/Cursor | Access JWT missing from MCP client | Add `Cf-Access-Jwt-Assertion` header in the client's MCP config |
| Frontend shows old UI after deploy | Browser cache | Hard-refresh (Cmd+Shift+R / Ctrl+Shift+R); or clear `public/` asset cache via dashboard |
| Cron not firing | Trigger not deployed | Verify `[triggers] crons` in `wrangler.toml` + redeploy |
| D1 query hits 5MB response limit | Too many rows returned | Cap `LIMIT` in queries; use pagination |

---

## Reference Files (Bundled with This Skill)

All bundled in `~/.config/opencode/skills/revflare/`:

### `reference/`
| File | Contents |
|------|----------|
| `schema-full.sql` | Base DB schema with 21 core tables + indexes |
| `migration-auth.sql` | Legacy user_email migration |
| `migration-approval.sql` | Email approval workflow |
| `migration-email-daily-limit.sql` | Daily send tracking table |
| `migration-improvements.sql` | Contacts, scheduled sends, reply tracking |
| `migration-email-tracking.sql` | Opens, unsubscribes, suppression, AI chat history |
| `migration-mcp.sql` | MCP servers + tool call audit log |
| `migration-semantic-search.sql` | BGE embedding BLOB column |
| `migration-orgs.sql` | Organizations + members + user prefs + persona_performance |
| `wrangler.toml.example` | Template wrangler config |
| `seed.mjs.example` | Excel → D1 seed script |
| `FULL_DOCS.md` | Complete README (60KB, 1,000+ lines) — read for any deep dive |

### `scripts/`
| File | Purpose |
|------|---------|
| `deploy.sh` | One-shot deployment script |
| `api-examples.md` | Complete curl examples for every major endpoint |
| `mcp-integration.md` | How to connect OpenCode, Claude, Cursor to RevFlare's MCP server |
| `customize.md` | Step-by-step recipes for adding personas, themes, probes, etc. |

---

## Live URL & GitHub

- **Live**: https://revflare.arunpotta1024.workers.dev
- **Repo**: https://github.com/pottaarun/RevFlare
- **MCP endpoint**: https://revflare.arunpotta1024.workers.dev/api/mcp

If the user is deploying their own instance, these URLs will differ. Always confirm the target URL before making any API calls.

## Final Notes

- **Nothing in this skill is Cloudflare-internal.** Any Cloudflare customer can deploy this with a free account (paid Workers plan required for Browser Rendering).
- **Migrations are append-only.** Never edit `schema-full.sql` or a past migration — always add a new `migration-*.sql` file.
- **User-scoping is mandatory.** Every query must include `WHERE user_email = ?` (or `WHERE org_id = ?` for org-shared resources).
- **Approval gating is non-bypassable.** Emails must be `approved` before Gmail send endpoints will accept them.
- **Daily limits protect domain reputation.** Don't remove them without understanding SPF/DKIM/DMARC implications.
- **AES-256-GCM is not optional in production.** The `ENC_SECRET` secret is checked on every request.

For anything not covered above, consult `reference/FULL_DOCS.md` — the complete README.
