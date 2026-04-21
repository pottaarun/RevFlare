# RevFlare — Cloudflare Sales Intelligence Platform

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Cloudflare Services Used](#3-cloudflare-services-used)
4. [Environment Variables & Secrets](#4-environment-variables--secrets)
5. [Database Schema](#5-database-schema)
6. [Authentication & Security](#6-authentication--security)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Frontend Pages & Views](#8-frontend-pages--views)
9. [AI Models & Usage](#9-ai-models--usage)
10. [Live Research Engine](#10-live-research-engine)
11. [Persona System](#11-persona-system)
12. [Campaign Themes](#12-campaign-themes)
13. [Competitive Intelligence Engine](#13-competitive-intelligence-engine)
14. [Threat Intelligence Pipeline](#14-threat-intelligence-pipeline)
15. [Advanced Features](#15-advanced-features)
16. [Opportunity Agent](#16-opportunity-agent)
17. [Usage Analytics](#17-usage-analytics)
18. [Gmail Integration](#18-gmail-integration)
19. [Salesforce Integration](#19-salesforce-integration)
20. [Sharing System](#20-sharing-system)
21. [Encrypted Settings](#21-encrypted-settings)
22. [MCP Integration](#22-mcp-integration)
23. [Email Tracking & Compliance](#23-email-tracking--compliance)
24. [AI Chat Email Refinement](#24-ai-chat-email-refinement)
25. [Email Performance Dashboard](#25-email-performance-dashboard)
26. [Semantic Search](#26-semantic-search)
27. [AI Quality Optimizations](#27-ai-quality-optimizations)
28. [Command Palette & Bulk Actions](#28-command-palette--bulk-actions)
29. [Organizations & Teams](#29-organizations--teams)
30. [Deployment Instructions](#30-deployment-instructions)
31. [File Structure](#31-file-structure)

---

## 1. Executive Summary

**RevFlare** is a Cloudflare-native AI-powered sales intelligence platform built as a single Cloudflare Worker. It enables Cloudflare sales teams (BDRs, AEs, CSMs, SEs, VP Sales) to:

- **Upload Salesforce account exports** (`.xlsx`) and store them in D1
- **Run deep AI research** on any account using 8 live data probes (website scraping via Browser Rendering, DNS, HTTP headers, SEC EDGAR, news, funding, Intricately, Cloudflare Radar)
- **Generate hyper-personalized outreach emails** across 5 sales personas with 25 message type variants per account
- **Generate competitive battlecards** for 12 product categories against 40+ competitors, using live-scraped competitor pages + DeepSeek R1 analysis
- **Monitor real-time threat intelligence** from 26 RSS feeds + GDELT + Google/Bing News + 3 optional paid sources, matching incidents to accounts by industry/country
- **Run mass email campaigns** across hundreds of accounts with 8 campaign themes, each email individually researched with live public intelligence
- **Auto-generate pipeline opportunities** via a daisy-chained AI agent (DeepSeek R1 + Llama 3.3 70B) that analyzes accounts and creates deals with estimated ACV
- **Calculate ROI**, find lookalike accounts, generate meeting prep, build multi-touch sequences, detect infrastructure changes, run A/B email tests, and convert voice notes to follow-up emails
- **Track lead scores**, alerts, team activity, playbooks, and semantic search across all generated intel
- **Monitor usage analytics** with page/tab visit tracking, daily trends, per-user activity, and tab popularity rankings
- **Review and approve emails before sending** with a full approval workflow — each generated email shows recipient details (account name, website, industry, location, IT spend) and must be explicitly approved before it can be sent via Gmail
- **Refine emails conversationally** via AI chat — paste an instruction like "make it shorter, lead with ROI, end with a Tuesday meeting ask" and a 70B model rewrites the email in place, preserving a full turn-by-turn history
- **Send emails directly via Gmail** through OAuth integration, with a **100 email/day limit per user** to protect domain reputation, and automatic appending of the user's Gmail signature to every outbound message
- **Track email opens** via transparent 1x1 tracking pixels routed through a public, auth-bypassing endpoint, with open counts aggregated per message and campaign
- **Stay CAN-SPAM compliant** with one-click unsubscribe links, a managed suppression list (bounces / complaints / unsubscribes), and automatic blocking of sends to suppressed addresses
- **Track email replies** via Gmail API thread polling, with automated nightly checks
- **Schedule emails** for future delivery, processed automatically by cron
- **Execute multi-touch sequences** automatically — activate a sequence, and the cron worker sends each touch on schedule, advancing through the steps and pausing on reply
- **Manage contacts** linked to accounts, with bulk import from Salesforce
- **Sync with Salesforce** via OAuth to push activities and pull opportunities, with **automatic nightly sync** of sent emails
- **Integrate with MCP (Model Context Protocol)** — connect external MCP servers (Netstrat, Google Workspace, Jira, Wiki, Cloudflare Docs, etc.) to enrich AI research, emails, meeting prep, and contacts with live data from your internal tools. RevFlare itself is **also exposed as an MCP server**, so external AI agents (Claude, Cursor, OpenCode) can query your accounts, lead scores, research, pipeline, and email metrics.
- **Review email outreach performance** with a dedicated dashboard showing sent / opened / replied rates, daily send trends, per-campaign funnel, and suppression-list management
- **Share account intelligence** via tokenized public links that bypass Cloudflare Access

The entire application is a **single Cloudflare Worker** (~5,600 lines of TypeScript) with a **vanilla JavaScript SPA** frontend (~4,100 lines). No React, no build step for the frontend, no external backend.

**Live URL**: https://revflare.arunpotta1024.workers.dev
**GitHub**: https://github.com/pottaarun/RevFlare

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Cloudflare   │  │ Workers  │  │ Browser  │  │ Workers KV │ │
│  │ Access (JWT) │  │ AI       │  │ Rendering│  │ (THREAT_   │ │
│  │              │  │ (3 models│  │ (Puppeteer│  │  CACHE)    │ │
│  │              │  │          │  │          │  │            │ │
│  └──────┬───────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│         │               │             │               │        │
│  ┌──────▼───────────────▼─────────────▼───────────────▼──────┐ │
│  │              Hono Worker (src/index.ts)                    │ │
│  │  - 117 API endpoints                                       │ │
│  │  - Live research engine (8 probes, 6h KV cache)            │ │
│  │  - Threat intelligence (7 source categories)               │ │
│  │  - AI orchestration (DeepSeek R1 + Llama 3.3 + 3.1)        │ │
│  │  - BGE semantic search (768-dim D1 BLOBs)                  │ │
│  │  - Reply-rate-aware persona/msg recommender                │ │
│  │  - Daisy-chained opportunity agent                         │ │
│  │  - 5 persona × 5 message type messaging engine             │ │
│  │  - 12-category competitive intelligence                    │ │
│  │  - 8-theme mass campaign engine                            │ │
│  │  - MCP client + RevFlare-as-MCP-server                     │ │
│  │  - Email open tracking, unsubscribes, suppression list     │ │
│  │  - AI chat email refinement (turn-by-turn history)         │ │
│  │  - Sequence execution engine (nightly cron)                │ │
│  │  - Org / team context + shared playbooks                   │ │
│  │  - Bulk actions (score + research) with per-call caps      │ │
│  │  - Gmail OAuth + Salesforce OAuth                          │ │
│  │  - Lead scoring, ROI calc, sequences, A/B testing          │ │
│  │  - Encrypted settings (AES-256-GCM)                        │ │
│  └──────────────────────┬─────────────────────────────────────┘ │
│                         │                                       │
│  ┌──────────────────────▼─────────────────────────────────────┐ │
│  │                    D1 Database (33 tables)                 │ │
│  │  accounts, research_reports, persona_messages,             │ │
│  │  campaigns, campaign_emails, share_tokens, gmail_tokens,   │ │
│  │  app_settings, opportunities, lead_scores, sequences,      │ │
│  │  meeting_preps, alerts, probe_history, playbooks,          │ │
│  │  voice_notes, vectorize_cache (+ embedding BLOB),          │ │
│  │  salesforce_tokens, page_views, email_send_log,            │ │
│  │  email_variants, contacts, scheduled_sends,                │ │
│  │  email_opens, email_suppression, unsubscribes,             │ │
│  │  email_chat_history, mcp_servers, mcp_tool_calls,          │ │
│  │  organizations, org_members, user_prefs,                   │ │
│  │  persona_performance                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**External Data Sources** (fetched at runtime):
- 26 cybersecurity RSS feeds + GDELT + Google/Bing News + NewsAPI + GNews + MediaStack
- SEC EDGAR (EFTS + company_tickers.json + submissions API)
- Cloudflare DoH (1.1.1.1 DNS-over-HTTPS)
- Crunchbase public pages
- Intricately / HG Cloud Dynamics API
- Cloudflare Radar API
- Google OAuth2 / Gmail API
- Salesforce OAuth2 / REST API
- External MCP servers (Netstrat, Google Workspace, Jira, Wiki, Cloudflare Docs, any JSON-RPC 2.0 compatible endpoint)

---

## 3. Cloudflare Services Used

| Service | Binding | Purpose |
|---------|---------|---------|
| **Workers** | (runtime) | Application server |
| **D1** | `DB` | SQLite database (33 tables) |
| **Workers AI** | `AI` | LLM inference (3 models) |
| **Browser Rendering** | `BROWSER` | Headless Chromium via @cloudflare/puppeteer |
| **Workers KV** | `THREAT_CACHE` | Threat intel cache + URL dedup |
| **Cloudflare Access** | (infrastructure) | JWT-based auth |
| **Cron Triggers** | (scheduled) | Nightly threat scan, reply polling, scheduled sends, sequence execution |
| **Static Assets** | `[assets]` | Serves public/ directory |

---

## 4. Environment Variables & Secrets

### Worker Secrets (via `wrangler secret put`)
| Variable | Required | Purpose |
|----------|----------|---------|
| `ENC_SECRET` | **Yes** | Secret key for AES-GCM encryption derivation. Without this, encryption is deterministic from source alone. |
| `CF_ACCESS_TEAM_DOMAIN` | **Yes** | e.g. `myteam.cloudflareaccess.com` — used to fetch JWKS for JWT signature verification |
| `CF_ACCESS_AUD` | Recommended | Application Audience (AUD) tag from Cloudflare Access — validates JWT audience claim |
| `DEV_MODE` | No | Set to `true` only for local dev to enable `_user` query param fallback |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth for Gmail |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth for Gmail |
| `CF_API_TOKEN` | Optional | Cloudflare Radar API |
| `CF_ACCOUNT_ID` | Optional | Cloudflare account ID |
| `INTRICATELY_API_KEY` | Optional | HG Cloud Dynamics API |

### D1 Encrypted Settings (AES-256-GCM)
Stored via in-app wizard, no CLI needed:
- `google_client_id`, `google_client_secret`
- `sf_client_id`, `sf_client_secret`
- `intricately_api_key`
- `news_api_key`, `gnews_api_key`, `mediastack_api_key`

Worker secrets always take priority over D1 settings.

---

## 5. Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `accounts` | Salesforce data (40+ columns) | account_name, website, industry, IT spend breakdown by category, competitor products, user_email |
| `research_reports` | AI research output | account_id, report_type, content, user_email |
| `persona_messages` | Generated emails | account_id, persona, message_type, subject, content, approval_status, tracking_id, open_count, gmail_thread_id, replied, user_email |
| `campaigns` | Mass email campaigns | name, theme, persona, accountIds (JSON), status, generated count |
| `campaign_emails` | Individual campaign emails | campaign_id, account_id, subject, content, status, approval_status, tracking_id, open_count, gmail_thread_id, replied |
| `email_chat_history` | **AI chat turns per email** | message_id, message_type, role (user/assistant), content, user_email |
| `email_opens` | **Open tracking events** | tracking_id, source_type, source_id, user_email, opened_at |
| `email_suppression` | **Bounces / complaints / unsubscribes** | email_address, reason, detail, user_email |
| `unsubscribes` | **Per-recipient unsubscribes** | email_address, user_email, reason |
| `email_send_log` | Daily send limit tracking | user_email, recipient, subject, source, sent_at |
| `email_variants` | A/B test variants | message_id, variant, content, sent, replied |
| `contacts` | People linked to accounts | account_id, first_name, last_name, email, title, phone, role, is_primary, salesforce_id, user_email |
| `scheduled_sends` | Future email delivery | user_email, to_address, subject, body, scheduled_for, status |
| `share_tokens` | Public share links | token (32-char UUID), account_id, created_by, expires_at (30-day default) |
| `gmail_tokens` | OAuth tokens (encrypted) | user_email (PK), access_token, refresh_token, gmail_address |
| `salesforce_tokens` | SF OAuth tokens (encrypted) | user_email (PK), instance_url, access_token, refresh_token |
| `app_settings` | Encrypted config | key (PK), value (AES-256-GCM encrypted) |
| `opportunities` | Pipeline tracking | account_id, account_name, industry, country, acv, stage, notes, user_email |
| `lead_scores` | Cached lead scores | account_id (PK), score, factors (JSON) |
| `sequences` | Multi-touch sequences with execution state | account_id, persona, theme, touches (JSON), status, current_touch, next_send_at, to_address |
| `meeting_preps` | AI meeting briefs | account_id, content, user_email |
| `alerts` | Infrastructure/threat alerts | account_id, alert_type, title, detail, severity, read |
| `probe_history` | CDN/DNS snapshots | account_id, cdn_detected, dns_provider, security_headers, probe_hash |
| `playbooks` | Reusable sales templates | name, persona, industry, template, usage_count |
| `voice_notes` | Call note transcripts | account_id, transcript, generated_email, user_email |
| `vectorize_cache` | Search index | content_type, content_id, content_text, account_id |
| `page_views` | Usage analytics | page, tab, account_id, user_email, created_at |
| `mcp_servers` | Connected MCP servers per user | name, display_name, server_url, auth_token (encrypted), server_type, enabled, tools_cache, user_email |
| `mcp_tool_calls` | MCP tool call audit log | mcp_server_id, tool_name, input_params, output_result, duration_ms, success, error, user_email |
| `organizations` | **Top-level orgs for team collaboration** | name, slug (unique), description, settings (JSON), created_by |
| `org_members` | **Org membership with roles** | org_id, user_email, role (owner/admin/member), invited_by, joined_at |
| `user_prefs` | **Per-user preferences (active org, etc.)** | user_email (PK), active_org_id |
| `persona_performance` | **Aggregated reply-rate stats for the recommender** | industry, persona, message_type, sent, opened, replied |

Also added: `vectorize_cache.embedding BLOB` column stores 768-dim BGE vectors for true semantic search.
Also added: `playbooks.org_id` column enables org-shared templates.

All data is **user-scoped** via `user_email` column (with org-scoping available where shared). **33 tables** total.

---

## 6. Authentication & Security

### Authentication
1. **Cloudflare Access** injects JWT headers on every request
2. Worker middleware **verifies JWT signatures** against Access JWKS (RS256), validates expiry and audience claims
3. Falls back to `Cf-Access-Authenticated-User-Email` header if JWT not present
4. `_user` query parameter fallback requires explicit `DEV_MODE=true` env var (not header sniffing)
5. Unauthenticated production requests return 401
6. All queries include `WHERE user_email = ?`
7. Public share endpoints (`/api/public/*`) bypass auth

### Security Measures

| Protection | Implementation |
|-----------|----------------|
| **JWT signature verification** | JWKS fetched from Access, RS256 signatures verified with `crypto.subtle`. Keys cached 1 hour. |
| **Auth bypass prevention** | `_user` param requires explicit `DEV_MODE` env var — no header sniffing |
| **Encryption with secret** | Key derivation uses `ENC_SECRET` Worker secret + salt + key name — not deterministic from source |
| **OAuth token encryption** | Gmail and Salesforce tokens encrypted with AES-GCM before D1 storage, decrypted on read |
| **XSS protection** | Global `esc()` applied to all user-supplied and external data (account names, threat titles, RSS content) |
| **SSRF prevention** | `isValidExternalDomain()` blocks IPs, localhost, private ranges, link-local, internal TLDs |
| **SOQL injection** | Full character escaping (`\`, `'`, `%`, `_`) on all Salesforce SOQL queries |
| **CORS whitelist** | Only `.workers.dev` + `localhost` origins allowed; all others denied (no wildcard fallback) |
| **Email abuse protection** | 100 emails/day per user limit with atomic check-and-insert to prevent race conditions |
| **Share token hardening** | Full UUID (128-bit entropy) with mandatory 30-day expiry |
| **Input validation** | `limit` capped at 200, `page` floored at 1, `days` capped at 90, campaign batches capped at 20 |
| **Atomic operations** | Multi-table deletes use `DB.batch()` for transactional safety |
| **Error observability** | All catch blocks log via `console.error`; global `app.onError` handler standardizes error responses |

---

## 7. API Endpoints Reference (117 endpoints)

### Account Management
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/accounts/clear` | Clear user's data |
| `POST` | `/api/accounts/upload` | Batch upload from Excel |
| `GET` | `/api/accounts` | Paginated list with search/filter/sort |
| `GET` | `/api/accounts/:id` | Full account detail |
| `GET` | `/api/filters` | Filter dropdown values |
| `GET` | `/api/stats` | Dashboard aggregates |
| `GET` | `/api/platform-stats` | Global platform metrics |

### Research
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/research/:id` | Generate AI research (4 types) |
| `GET` | `/api/research/:id` | List reports |
| `POST` | `/api/live-probe/:id` | Pre-fetch 8 probes |

### Messaging
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/personas` | All 5 persona configs |
| `POST` | `/api/messaging/:id` | Generate persona email |
| `GET` | `/api/messaging/:id` | List messages |
| `POST` | `/api/messages/:id/approve` | Approve email for sending |
| `POST` | `/api/messages/:id/reject` | Reject email |

### AI Chat Email Refinement
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat/message/:messageId` | Send refinement instruction; AI rewrites the email in place and re-flags it pending approval |
| `GET` | `/api/chat/history/:messageId` | Full turn-by-turn chat history for a message |

### Competitive Intel
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/catalog` | Full 12-category product catalog |
| `POST` | `/api/competitive/:id` | Generate battlecard |

### Threat Intel
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/threats` | Global threat feed (7 sources) |
| `GET` | `/api/threats/:id` | Account-matched threats |
| `POST` | `/api/threats/:id/email` | Incident-triggered email |

### Alerts
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/alerts` | All alerts & notifications |
| `POST` | `/api/alerts/:id/read` | Mark alert as read |
| `POST` | `/api/alerts/:id/suggest-products` | AI suggests best Cloudflare products for an alert |
| `POST` | `/api/alerts/:id/email` | Generate alert-triggered email with product positioning |

### Campaigns
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/campaign-themes` | 8 campaign themes |
| `POST` | `/api/campaigns` | Create with account selection |
| `POST` | `/api/campaigns/:id/generate` | Generate batch (2 emails) |
| `GET` | `/api/campaigns/:id/export` | Download CSV |
| `POST` | `/api/campaign-emails/:id/approve` | Approve campaign email |
| `POST` | `/api/campaign-emails/:id/reject` | Reject campaign email |
| `POST` | `/api/campaigns/:id/approve-all` | Bulk approve all pending |
| `POST` | `/api/campaigns/:id/reject-all` | Bulk reject all pending |

### Advanced Features
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/lead-scores` | Lead scoring leaderboard (top 50) |
| `GET` | `/api/lead-scores/:id` | Single account score |
| `GET` | `/api/roi/:id` | ROI calculator |
| `GET` | `/api/lookalikes/:id` | Find similar accounts |
| `POST` | `/api/meeting-prep/:id` | AI meeting prep brief |
| `GET` | `/api/sequence-templates` | Multi-touch sequence templates |
| `POST` | `/api/sequences` | Generate sequence for account |
| `GET` | `/api/sequences` | List all sequences |
| `POST` | `/api/sequences/:id/activate` | Activate a sequence for auto-execution by cron |
| `POST` | `/api/sequences/:id/pause` | Pause an active sequence |
| `POST` | `/api/detect-changes/:id` | CDN/DNS change detection |
| `POST` | `/api/win-loss/:id` | Win/loss analysis for opportunity |
| `GET` | `/api/playbooks` | List playbooks |
| `POST` | `/api/playbooks` | Create playbook |
| `POST` | `/api/playbooks/:id/use` | Use playbook (increment count) |
| `POST` | `/api/ab-test/:id` | Generate A/B email variants |
| `POST` | `/api/voice-note` | Voice notes to follow-up email |
| `GET` | `/api/team-stats` | Team activity dashboard |

### Pipeline & Opportunity Agent
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/opportunities` | List opportunities |
| `POST` | `/api/opportunities` | Create/update opportunity |
| `DELETE` | `/api/opportunities/:id` | Delete opportunity |
| `POST` | `/api/opportunities/auto-generate` | AI agent: auto-create opportunities |
| `GET` | `/api/acv` | ACV breakdown by stage/country |

### Usage Analytics
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/track` | Log page/tab visit (fire-and-forget) |
| `GET` | `/api/analytics` | Aggregated analytics: by page, tab, user, day |

### Semantic Search
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/search/index` | Re-index all content for user |
| `GET` | `/api/search?q=` | Keyword + AI-ranked search |

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/contacts/:accountId` | List contacts for account |
| `POST` | `/api/contacts` | Create contact |
| `PUT` | `/api/contacts/:id` | Update contact |
| `DELETE` | `/api/contacts/:id` | Delete contact |
| `POST` | `/api/contacts/import/:accountId` | Bulk import contacts (max 100) |

### Scheduled Sends
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scheduled-sends` | Schedule email for future delivery |
| `GET` | `/api/scheduled-sends` | List pending scheduled sends |
| `DELETE` | `/api/scheduled-sends/:id` | Cancel a scheduled send |

### Gmail
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/gmail/connect` | Start OAuth flow |
| `GET` | `/api/gmail/daily-limit` | Check daily send limit status |
| `POST` | `/api/gmail/send` | Send email (requires approval, enforces 100/day limit) |
| `POST` | `/api/gmail/send-campaign/:id` | Bulk send approved emails (capped by daily limit) |
| `POST` | `/api/gmail/check-replies` | Poll Gmail threads for replies |

### Salesforce
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/salesforce/connect` | Start SF OAuth flow |
| `GET` | `/api/salesforce/status` | Check connection status |
| `POST` | `/api/salesforce/push-activity` | Push research/email as SF Task |
| `GET` | `/api/salesforce/opportunities/:name` | Pull SF opportunities |
| `POST` | `/api/salesforce/import-contacts/:accountId` | Import contacts from Salesforce into RevFlare |

### Email Performance & Compliance
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/email-stats` | Aggregate stats: sent/opened/replied rates, daily trend, per-campaign funnel, suppression count |
| `GET` | `/api/email-suppression` | List suppressed addresses (bounces, complaints, unsubscribes) |
| `DELETE` | `/api/email-suppression/:id` | Remove an address from the suppression list |
| `GET` | `/api/public/track/:trackingId/pixel.gif` | **Public** — 1x1 tracking pixel; logs opens, no auth |
| `GET` | `/api/public/unsubscribe/:trackingId` | **Public** — one-click unsubscribe landing page, no auth |
| `POST` | `/api/public/unsubscribe/:trackingId` | **Public** — CAN-SPAM compliant one-click POST unsubscribe |

### MCP (Model Context Protocol)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/mcp/servers` | List user's connected MCP servers with cached tools |
| `POST` | `/api/mcp/servers` | Add a new MCP server (with SSRF validation on URL) |
| `DELETE` | `/api/mcp/servers/:id` | Remove an MCP server |
| `POST` | `/api/mcp/servers/:id/toggle` | Enable/disable an MCP server |
| `POST` | `/api/mcp/servers/:id/discover` | Run `tools/list` against the server and cache results |
| `POST` | `/api/mcp/call` | Proxy a tool call to a connected MCP server |
| `POST` | `/api/mcp` | **RevFlare as MCP server** — JSON-RPC 2.0 endpoint exposing 6 RevFlare tools to external AI agents |

### Organizations & Teams
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orgs` | List user's organizations with their role in each |
| `POST` | `/api/orgs` | Create a new organization (caller becomes owner, org becomes active) |
| `POST` | `/api/orgs/switch/:id` | Switch the user's active org (membership required) |
| `GET` | `/api/orgs/:id/members` | List members of an org |
| `POST` | `/api/orgs/:id/members` | Invite a user by email (owner/admin only) |
| `DELETE` | `/api/orgs/:id/members/:email` | Remove a member (self, or owner/admin) |

### Bulk Actions
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/bulk/score` | Recompute lead scores for up to 100 account IDs in one call (no AI) |
| `POST` | `/api/bulk/research` | Generate `executive_brief` research for up to 10 accounts in parallel (DeepSeek R1) |

### Persona Recommender
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/messaging/suggest-persona/:accountId` | Reply-rate-aware ranking of all persona/message-type combinations, returning top 5 with scoring factors |

### Sharing
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/share/:id` | Create share link |
| `GET` | `/api/public/:token` | Public account view |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/settings` | Save encrypted setting |
| `GET` | `/api/settings/status` | Check which keys are set |

---

## 8. Frontend Pages

### Navigation
```
Dashboard  Threats  Campaigns  |  Pipeline  Leads  Alerts  |  Team  Playbooks  Email Stats  MCP  Teams  Upload  |  Analytics    [Search · ⌘K]
```
A command palette (`⌘K` / `Ctrl+K`) opens anywhere for fuzzy-searchable fast navigation across routes, accounts, and actions. An **org switcher dropdown** is injected next to the search box when the user belongs to one or more organizations.

### Routes

| Route | View |
|-------|------|
| `#/` | Dashboard — stats cards + searchable/filterable account table |
| `#/threats` | Global threat intelligence dashboard with country/days filters |
| `#/campaigns` | Campaign builder + existing campaign list |
| `#/campaign/:id` | Campaign detail with batch generation + email preview |
| `#/pipeline` | Opportunities table + ACV stats + AI auto-generate agent |
| `#/lead-scores` | Lead scoring leaderboard with score bars and factors |
| `#/alerts` | Alert/notification feed with severity, mark-as-read, product suggestion, and email drafting |
| `#/team` | Team activity dashboard with leaderboard |
| `#/playbooks` | Playbook CRUD with usage tracking |
| `#/email-stats` | **Email performance dashboard** — sent/opened/replied metrics, daily trend, per-campaign funnel, suppression list management |
| `#/mcp` | **MCP settings** — connected servers, tool discovery, quick-add presets, RevFlare-as-MCP-server endpoint |
| `#/org` | **Teams** — create orgs, invite members, switch active org, manage shared playbooks |
| `#/upload` | Excel upload with drag-and-drop |
| `#/search/:query` | Semantic search results across all intel |
| `#/analytics` | Usage analytics: page views, tab popularity, daily trends, per-user activity (admin only) |
| `#/account/:id` | Account detail with 7 tabs (see below) |
| `#/share/:token` | Public share view (no auth required) |

### Account Detail Tabs

| Tab | Features |
|-----|----------|
| **Overview** | KPIs, tech stack, competitor map, quick actions |
| **Deep Research** | 4 research types with live 8-probe data |
| **Threat Intel** | Account-matched incidents with email generation |
| **Competitive Intel** | Full product catalog with live battlecard generation |
| **Email Composer** | 5 personas × 5 message types with probe pre-fetch (6h KV cache), recipient info display, approval workflow, an **AI chat refinement panel** for conversational rewrites, and a **reply-rate-aware recommender banner** that surfaces the top 3 persona/message-type combos for this account |
| **Advanced** | ROI Calculator, Lookalike Accounts, Meeting Prep, Multi-Touch Sequences, Change Detection, A/B Email Testing, Voice Notes |
| **History** | All generated research and messages |

---

## 9. AI Models

| Model | Usage | Fallback |
|-------|-------|----------|
| **DeepSeek R1 32B** (`@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`) | Research reports, battlecards, opportunity agent (Stage 1: reasoning) | Llama 3.3 |
| **Llama 3.3 70B** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) | Emails, campaigns, threat emails, opportunity agent (Stage 2: structured JSON), A/B variants, sequences, meeting prep | — |
| **Llama 3.1 8B** (`@cf/meta/llama-3.1-8b-instruct`) | Quick enrichment, search re-ranking | — |

Auto-fallback: if primary model fails, retries with Llama 3.3. Context auto-trimmed per model (12K for DeepSeek, 20K for Llama).

### Daisy-Chained Agent Pipeline (Opportunity Generation)
```
Accounts → Lead Scoring → Filter → DeepSeek R1 (deep reasoning) → Llama 3.3 70B (structured JSON) → DB Insert
```

---

## 10. Live Research Engine (8 Probes)

| # | Probe | Source | Data |
|---|-------|--------|------|
| 1 | Website Scraper | Puppeteer + direct fetch | Title, meta, about, careers, investor relations, press, tech signals |
| 2 | HTTP Headers | HEAD request | CDN detection, server, security header audit (5 headers) |
| 3 | DNS Records | Cloudflare DoH | A, CNAME, MX, NS records + provider detection |
| 4 | SEC EDGAR | EFTS + company_tickers + submissions | Filings, CIK, ticker, SIC code |
| 5 | News Search | Google/Bing/DuckDuckGo | Recent headlines |
| 6 | Funding | Crunchbase + Google News | Total funding, last round, investors |
| 7 | Intricately | HG Cloud Dynamics API | IT spend, product deployments, traffic |
| 8 | Cloudflare Radar | CF API | Domain rank, categories, HTTP protocol mix |

---

## 11. Persona System (5 Personas x 5 Message Types = 25 Variants)

| Persona | Icon | Message Types |
|---------|------|---------------|
| **BDR** | Target | Cold Email, LinkedIn Message, Cold Call Script, Follow-Up, Displacement Outreach |
| **AE** | Briefcase | Executive Email, Proposal Summary, ROI/Business Case, Champion Enablement, Displacement Proposal |
| **CSM** | Handshake | QBR Talking Points, Expansion Pitch, Health Check, Renewal Prep, Vendor Consolidation Pitch |
| **SE** | Wrench | Technical Brief, Migration Plan, Architecture Review, POC Proposal, Technical Displacement Brief |
| **VP Sales** | Crown | Executive Brief, CxO Outreach, Strategic Proposal, Board Talking Points, Platform Consolidation Case |

---

## 12. Campaign Themes (8)

| Theme | Focus |
|-------|-------|
| Security Posture Review | Missing headers, breach costs, DDoS risk |
| Cost Optimization | Vendor consolidation savings, flat-rate pricing |
| Vendor Consolidation | Count vendors, pitch single platform |
| Digital Transformation | Edge compute, AI readiness |
| Performance & Speed | Latency costs, CDN benchmarks |
| Zero Trust Modernization | VPN replacement, Forrester SSE Leader |
| Competitive Displacement | Vendor-by-vendor displacement map |
| AI at the Edge | Workers AI, Vectorize, AI Gateway |

---

## 13. Competitive Intelligence (12 Categories, 40+ Competitors)

| Category | CF Products | Competitors |
|----------|-------------|-------------|
| CDN | CDN, Argo, Cache Reserve, Tiered Caching, China Network | Akamai, CloudFront, Fastly, Google CDN, Azure CDN |
| WAF | WAF, API Shield, Page Shield, Turnstile | Imperva, AWS WAF, Akamai AAP, F5, Barracuda |
| DDoS | DDoS Protection, Magic Transit, Spectrum | Akamai Prolexic, AWS Shield, Imperva, Radware |
| Bot Management | Bot Management, Turnstile | Akamai, DataDome, HUMAN |
| Zero Trust/SASE | Access, Gateway, WARP, Browser Isolation, CASB, DLP | Zscaler, Palo Alto, Netskope, Cisco |
| Email Security | Email Security, Email Routing | Proofpoint, Mimecast, Abnormal, Microsoft |
| DNS | DNS, DNS Firewall, Secondary DNS, 1.1.1.1 | Route 53, Akamai DNS, NS1, Google DNS |
| Edge Compute | Workers, Pages, R2, D1, KV, DO, Queues, AI, Vectorize | Lambda@Edge, Vercel, Netlify, Deno, S3 |
| Network | Magic Transit, Magic WAN, NI | MPLS, VeloCloud, Aruba |
| Performance | Speed Brain, Zaraz, Observatory, Analytics, Waiting Room | GTM, Segment, Datadog RUM, New Relic |
| Media | Stream, Images, Image Resizing | Mux, Cloudinary, imgix |
| Registrar | Cloudflare Registrar | GoDaddy, Namecheap, Squarespace |

---

## 14. Threat Intelligence Pipeline

**Sources**: 26 RSS feeds + GDELT + Google News + Bing News + NewsAPI + GNews + MediaStack (7 categories)

**Pipeline**: Parallel fetch -> dedup (in-request + KV) -> date filter -> entity-compromise filter -> relevance scoring (SECURITY_DOMAINS boost) -> country detection (20 countries + sub-national) -> CF product mapping -> severity scoring (age decay + country boost) -> cache (10-min KV TTL)

**KV Dedup**: 5,000 URL hash set with 30-day TTL. 10-minute result cache prevents feed hammering.

---

## 15. Advanced Features

### Per-Account (via Advanced tab)

| Feature | API | Description |
|---------|-----|-------------|
| **ROI Calculator** | `GET /api/roi/:id` | Estimates savings across 6 spend categories (CDN, Security, DNS, Cloud, Data Center, Traffic Mgmt) with vendor consolidation value |
| **Lookalike Accounts** | `GET /api/lookalikes/:id` | Finds similar accounts by industry, employee count, IT spend, geography, and tech stack similarity |
| **Meeting Prep** | `POST /api/meeting-prep/:id` | AI-generated call prep brief with talk tracks, objection handling, and key questions |
| **Multi-Touch Sequences** | `POST /api/sequences` | Generates coordinated outreach across email, phone, and LinkedIn with 4 templates (5-14 day spans) |
| **Change Detection** | `POST /api/detect-changes/:id` | Scans CDN, DNS, and server headers; compares to last probe; auto-creates alerts on changes |
| **A/B Email Testing** | `POST /api/ab-test/:id` | Generates two email variants in parallel: business outcome hook vs technical insight hook |
| **Voice Notes** | `POST /api/voice-note` | Paste call notes/transcript, AI generates professional follow-up email |

### Global Pages

| Feature | Route | Description |
|---------|-------|-------------|
| **Lead Scoring** | `#/lead-scores` | AI-scored leaderboard based on IT spend, wallet penetration, competitors, activity, company size, SAM |
| **Alerts** | `#/alerts` | Infrastructure change alerts, threat matches, with severity and read/unread tracking |
| **Team Dashboard** | `#/team` | Activity leaderboard across all users: emails, research, campaigns, pipeline ACV |
| **Playbooks** | `#/playbooks` | Create/browse reusable sales templates with usage tracking |
| **Semantic Search** | `#/search/:q` | Keyword + AI-ranked search across all research reports and generated emails |
| **Win/Loss Analysis** | `POST /api/win-loss/:id` | AI analysis of closed opportunities with lessons learned |

---

## 16. Opportunity Agent

AI-powered pipeline generation using a daisy-chained two-model architecture:

### How it works
1. **Loads all accounts** and computes lead scores using 8 weighted factors
2. **Filters candidates**: excludes accounts with existing opportunities, requires score >= 30
3. **Selects top 10** by lead score
4. **Stage 1 — DeepSeek R1 32B**: Deep reasoning about each account's addressable spend, displacement potential, deal stage, realistic ACV (2-8% of addressable IT spend), and recommended sales play
5. **Stage 2 — Llama 3.3 70B**: Converts DeepSeek's analysis into structured JSON with stage, ACV, and actionable notes
6. **Creates opportunities** in the database with all fields populated

### Lead Scoring Factors (0-100)
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

---

## 17. Usage Analytics

Built-in page and tab visit tracking to understand how your team uses RevFlare.

### How it works
- Every page navigation and account detail tab click fires a `POST /api/track`
- Uses `c.executionCtx.waitUntil()` for fire-and-forget DB writes -- zero impact on page load
- Data stored in `page_views` table with indexed `user_email`, `page`, and `created_at`

### Analytics Dashboard (`#/analytics`)

| Section | Description |
|---------|-------------|
| **Top stats** | Total views, most visited page, most popular tab |
| **Page views table** | Every page ranked by views with percentage bars |
| **Tab views table** | Account detail tabs ranked by popularity (color-coded per tab) |
| **Daily trend** | Bar chart of views per day (last 30 days) |
| **User activity** | Views per user, ranked |
| **Recent activity** | Last 50 page views with timestamps |

### What gets tracked

| Event | `page` value | `tab` value |
|-------|-------------|-------------|
| Navigate to Dashboard | `dashboard` | — |
| Navigate to Pipeline | `pipeline` | — |
| Navigate to Leads | `lead-scores` | — |
| Navigate to Alerts | `alerts` | — |
| Navigate to any page | route name | — |
| Click account tab | `account` | `overview`, `research`, `threats`, `competitive`, `messaging`, `advanced`, `history` |

---

## 18. Gmail Integration

OAuth flow via Google Cloud Console credentials. Stored **encrypted** (AES-GCM) in D1 or as Worker secrets. Sends via Gmail API (`gmail.send` + `gmail.readonly` + `gmail.settings.basic` scopes). Auto-refreshes tokens. In-app wizard with no CLI needed.

**Email Approval Workflow**: Every generated email (persona messages and campaign emails) starts with `pending_approval` status. Before sending via Gmail, users must:
1. **Review recipient info** — account name, website, industry, location, account status, IT spend, and tech stack are displayed prominently
2. **Approve or reject** — explicit approve/reject buttons gate the send action
3. **Send** — only approved emails can be sent via Gmail; the backend enforces this check

For campaigns, bulk approve/reject actions and filter-by-status tabs allow efficient review of large email batches.

**Signature Appending**: On first connection, RevFlare fetches the user's default Gmail signature via the Gmail Settings API and appends it to every outbound message (both persona emails and campaign emails), preserving the sender's identity and reducing manual editing.

**Daily Email Limit (100/day per user)**: To protect email domain reputation and prevent abuse flags:
- Each successful send is logged in `email_send_log` with an atomic check-and-insert (no race conditions)
- When the limit is reached, a persistent amber notification banner explains the limit and directs the user to contact their admin
- A warning toast appears when fewer than 10 sends remain
- Campaign batch sends are automatically capped to the remaining daily allowance
- `GET /api/gmail/daily-limit` returns current usage for the frontend

**Reply Tracking**: Sent emails record their Gmail thread ID. The `POST /api/gmail/check-replies` endpoint (and nightly cron) polls Gmail threads to detect replies, updating the `replied` flag on `persona_messages` and `campaign_emails`.

**Scheduled Sending**: Emails can be scheduled for future delivery via `POST /api/scheduled-sends`. The nightly cron processes all pending sends whose `scheduled_for` has passed, respecting the daily email limit.

---

## 19. Salesforce Integration

OAuth flow to Salesforce. Tokens stored **encrypted** (AES-GCM) in D1. Supports:
- **Push activities**: Send research reports and generated emails as SF Tasks
- **Pull opportunities**: Fetch opportunities from SF for any account
- **Automatic nightly sync**: The cron job pushes recently sent emails (last 24h) as Salesforce Tasks, matched to SF Account by name
- Credentials stored encrypted in D1 via in-app settings

---

## 20. Sharing System

32-char UUID tokenized links (128-bit entropy) with mandatory 30-day expiry. Public endpoints bypass Access. Shows account data + all research + all messages. Tokens deletable.

---

## 21. Encrypted Settings

AES-256-GCM via Web Crypto API. Key derived from SHA-256 of `revflare-settings-v1:{ENC_SECRET}:{keyName}`. Random 12-byte IV per encryption. The `ENC_SECRET` Worker secret ensures encryption is not deterministic from source code alone.

**What's encrypted**:
- App settings (API keys, OAuth client secrets)
- Gmail OAuth tokens (access_token, refresh_token)
- Salesforce OAuth tokens (access_token, refresh_token)

Legacy plaintext tokens are transparently handled: decryption falls back to raw value, and tokens are re-encrypted on next refresh/reconnect.

---

## 22. MCP Integration

RevFlare implements the **Model Context Protocol** (MCP) on both sides of the wire: as a **client** consuming external MCP servers for enrichment, and as a **server** exposing RevFlare data to external AI agents.

### RevFlare as MCP Client

The worker can connect to any JSON-RPC 2.0 MCP server over HTTP/HTTPS transport. Connected servers are queried during AI research, email generation, meeting prep, and contact lookup; their results are injected into the LLM prompt as additional context.

**Built-in integration presets** (Quick-Add in `#/mcp`):

| Server | Use Cases |
|--------|-----------|
| `netstrat` | Network metrics + account strategy lookup during research and email generation |
| `google-workspace` | Calendar search for meeting prep; contacts search for account contacts |
| `wiki` | Internal wiki search during research; competitive positioning lookup during email generation |
| `cloudflare-docs` | Product documentation lookup during email generation |
| `jira` | Issue search during research and meeting prep |

Any other MCP server (internal or public) can be added by URL; `tools/list` is called automatically and the tool catalog is cached in `mcp_servers.tools_cache`.

**Security**:
- MCP server URLs are validated via `isValidMCPServerUrl()` — HTTPS only, no IPs, no localhost/private ranges, no `.local`/`.internal`/`.corp` TLDs, must have a real dotted hostname
- Auth tokens are encrypted with the same AES-256-GCM pipeline used for OAuth tokens
- Every tool call has a 15s abort timeout and is logged to `mcp_tool_calls` with duration and error state

### RevFlare as MCP Server

The endpoint `POST /api/mcp` speaks JSON-RPC 2.0 (MCP protocol version `2025-03-26`) and exposes **6 tools** to any external MCP client (Claude Desktop, Cursor, OpenCode, custom agents):

| Tool | Purpose |
|------|---------|
| `lookup_account` | Search accounts by name or domain; returns industry, IT spend, tech stack, competitors |
| `get_lead_score` | Return the AI-computed 0–100 lead score with scoring factors |
| `get_account_research` | Return the latest 3 AI research reports for an account |
| `get_pipeline` | Return pipeline opportunities with ACV, stage, and notes |
| `get_alerts` | Return recent unread infrastructure + threat alerts |
| `get_email_stats` | Return sent/opened/replied counts and rates |

The endpoint is protected by Cloudflare Access (same JWT auth as the rest of the API), so external clients must include a valid Access token.

---

## 23. Email Tracking & Compliance

RevFlare implements full CAN-SPAM compliant outbound email with transparent open tracking and automated suppression.

### Open Tracking

- Every persona message and campaign email gets a random 16-char `tracking_id` at generation time
- A 1×1 transparent GIF is appended to the email body as `<img src="https://revflare.../api/public/track/{trackingId}/pixel.gif">`
- When a recipient opens the email, the pixel request logs an `email_opens` row and atomically increments `open_count` on the source message
- The pixel endpoint is under `/api/public/*` and bypasses Cloudflare Access
- Opens are aggregated in the **Email Performance Dashboard** per message, per campaign, and globally

### Unsubscribes

- Every email body and `List-Unsubscribe` / `List-Unsubscribe-Post` header includes a one-click unsubscribe URL: `/api/public/unsubscribe/{trackingId}`
- `GET` returns a branded confirmation landing page; `POST` (for Gmail/Yahoo one-click) is accepted without CSRF
- Unsubscribing inserts into both `unsubscribes` and `email_suppression` tables so the recipient is blocked from future sends
- The list is **per-user** — one rep's unsubscribe doesn't block another rep from sending to the same recipient

### Suppression List

`email_suppression` is consulted before every send. Reasons include:
- `unsubscribe` — recipient clicked unsubscribe
- `bounce` — Gmail API reported a permanent delivery failure
- `invalid` — malformed address format
- `complaint` — recipient marked as spam

The dashboard at `#/email-stats` shows the full list with reason, timestamp, and a one-click remove button (in case of false-positive bounces).

---

## 24. AI Chat Email Refinement

Instead of re-generating from scratch, users can conversationally refine any generated email via a chat panel on the Email Composer tab.

### How it works

1. User clicks **Refine with AI** on an approved or pending email
2. Chat panel opens with the current email rendered as the initial assistant turn
3. User types an instruction in plain English — e.g. "Cut 30% of length, lead with the DDoS incident, close with a 15-min Tuesday meeting ask"
4. `POST /api/chat/message/:messageId` sends the instruction plus the full chat history to **Llama 3.3 70B** as a multi-turn conversation
5. The model returns the fully rewritten email (including `Subject:` line)
6. The backend extracts the new subject, updates `persona_messages.content` / `persona_messages.subject`, and **resets `approval_status` to `pending_approval`** so changes can be re-reviewed before sending
7. Both the user instruction and AI response are persisted to `email_chat_history` for full auditability

Works for both persona messages and campaign emails. Up to 20 prior turns are included in each call for context continuity.

---

## 25. Email Performance Dashboard

Route: `#/email-stats` — a dedicated analytics surface for outbound email outreach.

### Sections

| Section | Details |
|---------|---------|
| **Top-line stats** | Total sent, total opened, total replied, open rate %, reply rate % |
| **Daily usage** | Today's sent count vs. 100/day cap, with color-coded progress bar |
| **Daily send trend** | Last 14 days of send volume as a bar chart |
| **Per-campaign funnel** | For each of the last 20 campaigns: sent, opened, replied |
| **Suppression list** | Searchable table of suppressed addresses with reason and remove button |

All data is user-scoped — each rep sees only their own outreach performance.

---

## 26. Semantic Search

Real semantic search via **@cf/baai/bge-base-en-v1.5** embeddings stored in D1 — replaces the previous keyword-only scoring.

### How it works

1. **Indexing** (`POST /api/search/index`): every research report and persona message is embedded into a 768-dimension Float32 vector via BGE. Vectors are stored as BLOB in `vectorize_cache` alongside the source text. Indexing runs in batches of 10 to respect Workers AI rate limits.
2. **Querying** (`GET /api/search?q=...`): the query is embedded once, then scored against all cached vectors via cosine similarity. Results are filtered to similarity > 0.12 and returned top-20.
3. **Hybrid ranking**: the final score is `0.7 × cosine_similarity + 0.3 × keyword_match`, which combines semantic understanding ("CDN displacement" matches "Akamai migration") with exact-term precision ("Shopify" always surfaces Shopify research).
4. **Graceful fallback**: if embedding fails or rows predate the migration, the endpoint transparently falls back to pure keyword scoring and flags the response with `method: "keyword-only"`.

Stats are indexed per-user; semantic search across tenant boundaries is never exposed.

---

## 27. AI Quality Optimizations

### Probe Result Caching

Every call to `POST /api/live-probe/:accountId` used to re-run all 8 probes (website scrape, headers, DNS, SEC, news, funding, Intricately, Radar). Probes are now cached in **Workers KV** (`THREAT_CACHE` binding) with a **6-hour TTL** and a day-bucketed key:

```
probe:v1:{accountId}:{domain}:{dayBucket}
```

- Cache writes are non-blocking via `ctx.waitUntil()` — callers never wait on the write
- Cache hits return immediately with `cached: true` for UI signaling
- `?fresh=1` query param bypasses the cache for intentional re-scans

Net effect: email composer opens 10-50x faster for previously-probed accounts, and Browser Rendering quota is preserved for fresh targets.

### Reply-Rate-Aware Persona Recommender

`GET /api/messaging/suggest-persona/:accountId` ranks every (persona, message_type) combination by predicted reply rate for the given account.

**Scoring formula**:
- **Evidence**: weight same-industry outcomes 3x versus global outcomes (industry behavior is a stronger signal than global averages)
- **Posterior reply rate**: Laplace-smoothed with priors `α=1, β=10` (≈9% baseline) so pairs with <5 sends don't dominate from lucky early hits
- **Exploration bonus**: UCB-style `sqrt(2 * log(totalSent) / (pairSent + 1)) × 0.05` — surfaces under-explored combinations so the system keeps learning

The Email Composer renders the top 3 as a clickable banner (`Suggested: BDR → Cold Email (4.1%)`), and clicking applies both the persona and the message type. As reply data accumulates, the ranking compounds — winners stay on top, underperformers rotate out.

Data source: `persona_messages` table (`replied`, `open_count`). No manual labeling needed.

---

## 28. Command Palette & Bulk Actions

### Command Palette (`⌘K` / `Ctrl+K`)

A fuzzy-searchable overlay for fast navigation and common actions — inspired by Linear / Raycast.

- **Keyboard-first**: `⌘K` opens, arrow keys navigate, `Enter` selects, `Esc` closes
- **Searches across**: every nav route, up to 200 accounts (fetched lazily on first open), and global actions
- **Fuzzy scorer**: exact match (1000 pts) > prefix match (500) > substring (200) > character-in-order (per-char score)
- **Actions currently exposed**: `Create organization...`, `Re-index search`

Adding new actions is a one-liner in `PALETTE_ROUTES` or the candidate list builder in `app.js`.

### Bulk Actions on the Dashboard

Every row on `#/` now has a checkbox. Selections persist across pagination so you can build up a batch across pages, then act on the full set.

| Action | Endpoint | Cap | Notes |
|--------|----------|-----|-------|
| **Score Leads** | `POST /api/bulk/score` | 100 | Recomputes lead scores via the existing 8-factor model. No AI call — purely derived math. |
| **Run Research** | `POST /api/bulk/research` | 10 | Generates `executive_brief` reports in parallel via DeepSeek R1. Capped low to protect AI quota. |

A floating toolbar appears when any rows are selected (`N selected · Score · Research · Clear`). Clears automatically on success.

---

## 29. Organizations & Teams

RevFlare is no longer just a single-user tool. Users can now create and join **organizations** for collaborative workflows.

### Data Model

| Table | Purpose |
|-------|---------|
| `organizations` | Top-level org with name, slug, description, settings, created_by |
| `org_members` | Membership with roles: `owner`, `admin`, `member` |
| `user_prefs` | Per-user preferences including `active_org_id` for org context switching |
| `persona_performance` | (reserved) Future: industry × persona × message_type aggregates for global reply-rate trends |

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orgs` | List user's organizations with their role in each |
| `POST` | `/api/orgs` | Create a new organization; caller becomes `owner` and the org becomes active |
| `POST` | `/api/orgs/switch/:id` | Change the user's active org (membership enforced) |
| `GET` | `/api/orgs/:id/members` | List members of an org (must be a member) |
| `POST` | `/api/orgs/:id/members` | Invite a user by email (owner/admin only) |
| `DELETE` | `/api/orgs/:id/members/:email` | Remove a member (self-removal or owner/admin). Last owner cannot be removed. |

### Org Context Middleware

After auth resolves `userEmail`, a second middleware calls `resolveActiveOrgId()` which:
1. Reads `user_prefs.active_org_id` if set and the user is still a member
2. Falls back to the earliest org they joined
3. Fails open (`orgId = null`) if the `organizations` table doesn't yet exist (migration-opt-in)

The result is stored as `c.var.orgId` and is available to every handler.

### Shared Playbooks

Playbooks gain an optional `org_id` column. On creation, the UI offers **"Share with organization"** — if checked and an active org exists, the playbook is attached to the org. On list, the user sees:
- Their own playbooks (always)
- Playbooks attached to their **active** org (shared across teammates)

`POST /api/playbooks/:id/use` verifies membership before incrementing — a user cannot use another user's private playbook. Legacy playbooks (no `org_id`) behave exactly as before.

### UI

- **`#/org`** — dedicated Teams page: list orgs, view members, invite by email, remove, switch active org
- **Nav switcher** — dropdown next to the search box shows current org + lists all orgs for 1-click switching. Hidden entirely if the user has no orgs.
- **Command palette** — `Create organization...` action opens the create modal directly

---

## 30. Deployment

```bash
git clone https://github.com/pottaarun/RevFlare.git
cd RevFlare
npm install

# Create database and run all migrations (in order)
wrangler d1 create revflare-db
wrangler d1 execute revflare-db --remote --file=schema-full.sql
wrangler d1 execute revflare-db --remote --file=migration-approval.sql
wrangler d1 execute revflare-db --remote --file=migration-email-daily-limit.sql
wrangler d1 execute revflare-db --remote --file=migration-improvements.sql
wrangler d1 execute revflare-db --remote --file=migration-email-tracking.sql
wrangler d1 execute revflare-db --remote --file=migration-mcp.sql
wrangler d1 execute revflare-db --remote --file=migration-semantic-search.sql
wrangler d1 execute revflare-db --remote --file=migration-orgs.sql

# Set required secrets
wrangler secret put ENC_SECRET              # Any random string for encryption
wrangler secret put CF_ACCESS_TEAM_DOMAIN   # e.g. 'myteam.cloudflareaccess.com'
wrangler secret put CF_ACCESS_AUD           # From Access app config

# Deploy
wrangler deploy
```

Configure Cloudflare Access on `revflare.*.workers.dev` for auth.

### Running Tests
```bash
npm install -D vitest
npm test
```

---

## 31. File Structure

```
revFlare/
├── src/
│   ├── index.ts                    # Main Worker (~6,100 lines)
│   ├── advanced-features.ts        # Lead scoring, ROI, lookalikes, sequences, etc. (~265 lines)
│   ├── advanced-features.test.ts   # Unit tests (vitest, ~167 lines)
│   ├── mcp-client.ts               # MCP client + SSRF guard + integration map (~281 lines)
│   └── threat-intel.ts             # Threat intelligence module (~482 lines)
├── public/
│   ├── index.html                  # HTML shell + nav + Gmail wizard (~160 lines)
│   ├── app.js                      # Frontend SPA (~4,560 lines)
│   └── styles.css                  # Design system (~1,650 lines)
├── screenshots/                    # App screenshots (auto-generated)
├── schema-full.sql                 # Complete DB schema (21 base tables + indexes)
├── schema.sql                      # Core DB schema (legacy)
├── migration-approval.sql          # Email approval workflow migration
├── migration-email-daily-limit.sql # Daily send limit tracking table
├── migration-improvements.sql      # Contacts, scheduled sends, reply tracking, indexes
├── migration-email-tracking.sql    # Opens, unsubscribes, suppression, AI chat history
├── migration-mcp.sql               # MCP servers + tool call audit log
├── migration-semantic-search.sql   # BGE embedding BLOB column for true semantic search
├── migration-orgs.sql              # Organizations, members, user prefs, persona_performance
├── build_final_pptx.py             # Presentation builder (mock server + Playwright + PPTX)
├── seed.mjs                        # Excel seed script
├── wrangler.toml                   # Worker config
├── package.json                    # Dependencies + test scripts
├── tsconfig.json                   # TypeScript config (strict, zero errors)
└── README.md                       # This file
```

**Total codebase**: ~13,600 lines across 11 source files.
**Dependencies**: hono, @cloudflare/puppeteer, @cloudflare/workers-types, typescript, wrangler, xlsx, vitest (dev)
