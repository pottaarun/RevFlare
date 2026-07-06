# RevFlare Customization Recipes

Step-by-step guides for extending RevFlare. Each recipe lists every file to edit.

---

## Recipe 1 — Add a New Persona

Example: add "Partner Manager" (PM) persona.

### 1. Backend: `src/index.ts`

Find `const PERSONA_CONFIGS: Record<string, ...> = {` and add:

```typescript
pm: {
  name: 'Partner',
  title: 'Partner Manager',
  description: 'Focused on co-sell motions and partner enablement.',
  tone: 'Collaborative, mutually-valuable, partnership-focused.',
  focus: 'Joint go-to-market, partner commission structures, ecosystem plays.',
  messageTypes: [
    { id: 'partner_intro', label: 'Partner Introduction' },
    { id: 'co_sell_alignment', label: 'Co-Sell Alignment' },
    { id: 'partner_enablement', label: 'Partner Enablement' },
    { id: 'commission_structure', label: 'Commission Discussion' },
    { id: 'joint_gtm', label: 'Joint Go-To-Market Pitch' },
  ],
},
```

### 2. Frontend: `public/app.js`

Find `const PERSONA_META = {` and add:

```javascript
pm: { icon: '\u{1F91D}', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
```

(Unicode escape `\u{1F91D}` is 🤝; pick your own emoji.)

### 3. Verify

```bash
npx tsc --noEmit
curl "$REVFLARE_URL/api/personas"   # should now include "pm"
```

### 4. Deploy

```bash
npx wrangler deploy
```

No migration needed. Personas are config-only.

---

## Recipe 2 — Add a New Message Type to an Existing Persona

Example: add "Cold Video Message" to BDR.

### 1. Backend: `src/index.ts`

In `PERSONA_CONFIGS.bdr.messageTypes`, add:

```typescript
{ id: 'cold_video', label: 'Cold Video Message' },
```

### 2. (Optional) Tailor the prompt

Inside `/api/messaging/:accountId` handler, you can detect `messageType === 'cold_video'` and adjust the system prompt accordingly (e.g. "output the script in 30 seconds of talk-time, 75 words max").

### 3. Deploy

```bash
npx wrangler deploy
```

---

## Recipe 3 — Add a New Campaign Theme

Example: "AI Adoption Readiness".

### 1. Backend: `src/index.ts`

Find `const CAMPAIGN_THEMES = ...` (or `CAMPAIGN_THEMES: Record<string, ...>`) and add:

```typescript
ai_adoption_readiness: {
  name: 'AI Adoption Readiness',
  description: 'For accounts exploring GenAI infrastructure. Pitch Workers AI, AI Gateway, Vectorize.',
  hook: 'Most AI POCs stall on inference cost and data residency. Cloudflare ships both.',
  proof: 'Workers AI runs in 300+ cities, no cold starts, pay per token.',
  cta: 'A 30-min architecture review to benchmark your AI inference path.',
},
```

### 2. Frontend

The UI auto-reads themes from `/api/campaign-themes`. No frontend change needed unless you want custom iconography per theme.

### 3. Deploy

```bash
npx wrangler deploy
```

---

## Recipe 4 — Add a New Live Research Probe

Example: LinkedIn profile scraper for hiring signals.

### 1. Backend: `src/index.ts`

Define the probe function (near the other probe functions like `scrapeWebsite`):

```typescript
async function probeLinkedInHiring(companyName: string): Promise<{ openRoles: string[]; techTrends: string[] } | null> {
  if (!companyName) return null;
  try {
    // Use Workers Browser Rendering or a LinkedIn scraping API
    // Placeholder — implement per your LinkedIn access:
    const url = `https://www.linkedin.com/company/${encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, '-'))}/jobs/`;
    // Apply SSRF + rate-limit guards
    if (!isValidExternalDomain('linkedin.com')) return null;
    // ...scrape...
    return { openRoles: [], techTrends: [] };
  } catch (e) {
    console.error('LinkedIn probe failed:', e);
    return null;
  }
}
```

### 2. Add to the probe list

Inside `/api/live-probe/:accountId`:

```typescript
const probes = [
  { key: 'website', label: 'Website Scraper', fn: () => scrapeWebsite(domain, c.env.BROWSER) },
  // ... existing probes ...
  { key: 'linkedin_hiring', label: 'LinkedIn Hiring', fn: () => probeLinkedInHiring(name) },
];
```

### 3. Show detail in summary

In the summary builder:

```typescript
else if (p.key === 'linkedin_hiring') {
  const d = results.linkedin_hiring.data as any;
  detail = d?.openRoles?.length ? `${d.openRoles.length} open roles, ${d.techTrends.join(', ')}` : '';
}
```

### 4. Feed into AI context

In `buildAccountContext()`:

```typescript
LINKEDIN HIRING:
${liveData.linkedin_hiring?.openRoles?.join(', ') || 'N/A'}
Tech trends: ${liveData.linkedin_hiring?.techTrends?.join(', ') || 'N/A'}
```

### 5. Deploy

```bash
npx tsc --noEmit
npx wrangler deploy
```

---

## Recipe 5 — Add a New Competitive Category

Example: "Observability" (Datadog, New Relic, Grafana).

### 1. Backend: `src/index.ts`

Find `const PRODUCT_CATALOG = ...` and add:

```typescript
observability: {
  displayName: 'Observability',
  cloudflareProducts: [
    { name: 'Analytics Engine', category: 'observability' },
    { name: 'Logpush', category: 'observability' },
    { name: 'Workers Analytics', category: 'observability' },
  ],
  competitors: [
    { name: 'Datadog', strengths: 'Full-stack APM, massive integration library', weaknesses: 'Cost scaling, data ingress fees', cfCounter: 'Analytics Engine pricing is per-event, not per-host. No data ingress fees.' },
    { name: 'New Relic', strengths: 'Mature APM', weaknesses: 'User-based pricing is punitive', cfCounter: 'CF bundles observability with compute — no separate per-user billing.' },
    { name: 'Grafana Cloud', strengths: 'Open source foundation, powerful dashboards', weaknesses: 'Need to self-host collectors', cfCounter: 'CF collectors are built into Workers — no agent deployment.' },
  ],
},
```

### 2. Frontend

Auto-rendered from `/api/catalog`. No JS change needed.

### 3. Deploy

```bash
npx wrangler deploy
```

---

## Recipe 6 — Add a New Threat Intel RSS Feed

### 1. Backend: `src/threat-intel.ts`

Find `const RSS_FEEDS = [` and add:

```typescript
'https://newfeed.example.com/rss.xml',
```

### 2. (Optional) Boost scoring for this source

Find the relevance scorer and add the feed's host to a boost list if it's high-signal.

### 3. Deploy

```bash
npx wrangler deploy
```

The next cron (daily at 0600 UTC) will pull from the new feed.

---

## Recipe 7 — Add a New Alert Severity Level

Example: add `"urgent"` between `"high"` and `"critical"`.

### 1. Backend: `src/index.ts`

Find every comparison like `severity === 'critical'` or `['high', 'critical'].includes(severity)` and extend.

Find severity scoring logic (in threat-intel + change detection) and assign a numeric weight for urgent.

### 2. Frontend: `public/app.js`

Find `renderAlerts()` and add the color mapping:

```javascript
var severityColors = {
  critical: 'var(--red)',
  urgent: '#fb7185',        // new
  high: 'var(--orange)',
  medium: 'var(--amber)',
  low: 'var(--text-muted)',
  info: 'var(--blue)',
};
```

### 3. (Optional) Unread badge priority

In `/api/alerts`, sort by `CASE severity WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ...`.

### 4. Deploy

```bash
npx wrangler deploy
```

---

## Recipe 8 — Add a New MCP Tool (RevFlare as Server)

Example: add `get_account_contacts`.

### 1. Backend: `src/index.ts`

Find `const REVFLARE_MCP_TOOLS = [` and add:

```typescript
{
  name: 'get_account_contacts',
  description: 'Get all contacts linked to an account.',
  inputSchema: {
    type: 'object',
    properties: { account_name: { type: 'string' } },
    required: ['account_name'],
  },
},
```

Then in the `tools/call` switch:

```typescript
case 'get_account_contacts': {
  const acc = await c.env.DB.prepare(
    "SELECT id FROM accounts WHERE user_email = ? AND LOWER(account_name) LIKE ? LIMIT 1"
  ).bind(email, `%${(args?.account_name || '').toLowerCase()}%`).first() as any;
  if (!acc) { content = [{ type: 'text', text: 'Account not found' }]; break; }
  const contacts = await c.env.DB.prepare(
    "SELECT first_name, last_name, email, title, phone FROM contacts WHERE account_id = ? AND user_email = ? ORDER BY is_primary DESC"
  ).bind(acc.id, email).all();
  content = [{ type: 'text', text: JSON.stringify(contacts.results, null, 2) }];
  break;
}
```

### 2. Deploy

```bash
npx wrangler deploy
```

Verify via MCP:
```bash
rc -X POST "$REVFLARE_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'
```

---

## Recipe 9 — Add a New MCP Preset (RevFlare as Client)

See `mcp-integration.md` Part 2 "Adding a New Preset".

---

## Recipe 10 — Add a New Lead-Scoring Factor

Example: "Recent Funding Round" (worth 10 points if funded in last 12 months).

### 1. Backend: `src/advanced-features.ts`

Inside `calculateLeadScore(a)`:

```typescript
if (a.last_funding_date) {
  const daysSinceFunding = (Date.now() - new Date(a.last_funding_date).getTime()) / 86400000;
  if (daysSinceFunding < 365) {
    score += 10;
    factors.push({ name: 'Recent Funding', points: 10, detail: `Funded ${Math.round(daysSinceFunding)}d ago` });
  }
}
```

### 2. Data source

You'll need `last_funding_date` on the `accounts` table. Either:
- Migration: `ALTER TABLE accounts ADD COLUMN last_funding_date TEXT;`
- OR populate from the funding probe and cache

### 3. Deploy + backfill

```bash
npx wrangler deploy
# Recompute all scores
curl -X POST "$REVFLARE_URL/api/bulk/score" \
  -H "Content-Type: application/json" \
  -H "Cf-Access-Jwt-Assertion: $REVFLARE_JWT" \
  -d '{"accountIds":[1,2,3,...]}'
```

---

## Recipe 11 — Add a New Admin

### `src/index.ts`

```typescript
const ADMIN_EMAILS = new Set([
  'apotta@cloudflare.com',
  'new-admin@cloudflare.com',
]);
```

Deploy. Admin routes (`/api/analytics`, `/api/team-stats`) now authorize the new email.

---

## Recipe 12 — Change the AI Model

### `src/index.ts`

```typescript
const RESEARCH_MODEL = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';  // change this
const EMAIL_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FAST_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
```

Any Workers AI model is valid. Adjust `EMBEDDING_DIM` if you switch embedding models (e.g. `bge-large-en-v1.5` is 1024, `bge-small-en-v1.5` is 384).

If you change `EMBEDDING_MODEL` or `EMBEDDING_DIM`, re-run `POST /api/search/index` to rebuild vectors.

---

## Recipe 13 — Add a New Page Route

Example: `#/reports` analytics page.

### 1. Frontend: `public/index.html`

Add nav link in `.nav-links`:

```html
<a href="#/reports" class="nav-link" data-route="reports">Reports</a>
```

### 2. Frontend: `public/app.js`

Add router entry in `navigate()`:

```javascript
else if (h === '#/reports') renderReports(m);
```

Add the renderer:

```javascript
async function renderReports(c) {
  c.innerHTML = '<div class="spinner"></div>';
  const data = await api.get('/my-reports-endpoint');
  c.innerHTML = '<h1>Reports</h1>' + /* ... */;
}
```

### 3. (Optional) Backend

If the page needs a new endpoint, add `app.get('/api/my-reports-endpoint', ...)` in `src/index.ts`.

### 4. Deploy

```bash
npx wrangler deploy
```

---

## Recipe 14 — Add a Command Palette Action

### `public/app.js`

Find the candidates list inside `paletteOpen()` / `update()`:

```javascript
candidates.push({
  label: 'Export pipeline to CSV',
  kind: 'action',
  action: 'export-pipeline',
  hint: 'Download all opportunities'
});
```

Handle the action in `paletteRun()`:

```javascript
else if (it.action === 'export-pipeline') {
  window.open('/api/opportunities?format=csv', '_blank');
}
```

No deploy needed — just save. Next page load sees it.

---

## Recipe 15 — Change Daily Email Limit

### `src/index.ts`

```typescript
const DAILY_EMAIL_LIMIT = 100;  // bump to 200, 500, etc.
```

Consider SPF / DKIM / DMARC + your Gmail sending reputation before raising significantly.

---

## Recipe 16 — Change Probe Cache TTL

### `src/index.ts`

```typescript
const PROBE_CACHE_TTL = 6 * 3600;  // 6 hours. Bump to 24h for longer cache.
```

---

## Recipe 17 — Write a New Migration

```bash
cat > migration-my-feature.sql <<'EOF'
-- Migration: description
-- Run: wrangler d1 execute revflare-db --remote --file=migration-my-feature.sql

CREATE TABLE IF NOT EXISTS my_new_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- ...
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_my_new_table_user ON my_new_table(user_email);
EOF

# Test locally first
npx wrangler d1 execute revflare-db --local --file=migration-my-feature.sql

# Apply to production
npx wrangler d1 execute revflare-db --remote --file=migration-my-feature.sql

# Update README.md deployment section
```

---

## Recipe 18 — Multi-Tenant per-Org Data Scoping

RevFlare scopes by `user_email` today. To scope by `org_id` (all org members see each other's accounts):

### 1. Migration

```sql
ALTER TABLE accounts ADD COLUMN org_id INTEGER;
ALTER TABLE research_reports ADD COLUMN org_id INTEGER;
ALTER TABLE persona_messages ADD COLUMN org_id INTEGER;
-- etc. for every tenant-scoped table
CREATE INDEX idx_accounts_org ON accounts(org_id);
```

### 2. Backend

Change every `WHERE user_email = ?` to:

```sql
WHERE (user_email = ? OR org_id = ?)
```

Pass `c.get('orgId')` to every query alongside `email`.

Add a UI toggle for "share with org" per resource (like playbooks already have).

### 3. Be careful

Existing rows have `org_id = NULL`. Don't break existing private-scope behavior. Only return org-scoped rows when `org_id IS NOT NULL AND org_id = ?`.

---

## Recipe 19 — Custom Cron Job

### `src/index.ts`

Find `export default { fetch: ..., scheduled: async (event, env, ctx) => { ... } }` and add to the scheduled handler:

```typescript
scheduled: async (event, env, ctx) => {
  // existing jobs...

  // NEW: weekly cleanup of old page_views
  if (new Date().getUTCDay() === 0) {  // Sunday
    await env.DB.prepare(
      "DELETE FROM page_views WHERE created_at < date('now', '-90 days')"
    ).run();
  }
}
```

### `wrangler.toml`

Adjust cron schedule if needed:

```toml
[triggers]
crons = ["0 6 * * *", "0 0 * * 0"]  # daily 0600 UTC + weekly Sunday 0000 UTC
```

---

## Recipe 20 — Backup D1 Regularly

D1 has no built-in automated backup (as of 2026). A rolling export:

```bash
#!/usr/bin/env bash
DATE=$(date +%Y%m%d)
npx wrangler d1 export revflare-db --output="backup-$DATE.sql"
aws s3 cp "backup-$DATE.sql" "s3://my-backups/revflare/backup-$DATE.sql"
# Or: rclone copy "backup-$DATE.sql" r2:revflare-backups/
```

Put this in a GitHub Actions workflow on a cron.

---

## General Deployment Workflow

```bash
# 1. Type-check
npx tsc --noEmit

# 2. Test
npm test

# 3. Deploy
NODE_TLS_REJECT_UNAUTHORIZED=0 npx wrangler deploy

# 4. Smoke-test new endpoint
curl -sk -o /dev/null -w "%{http_code}\n" "$REVFLARE_URL/api/my-new-endpoint"  # expect 302

# 5. Git commit
git add -A
git commit -m "Add <feature name>"
git push origin main
```
