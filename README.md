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
15. [Advanced Features (15)](#15-advanced-features)
16. [Opportunity Agent](#16-opportunity-agent)
17. [Usage Analytics](#17-usage-analytics)
18. [Gmail Integration](#18-gmail-integration)
19. [Salesforce Integration](#19-salesforce-integration)
20. [Sharing System](#20-sharing-system)
21. [Encrypted Settings](#21-encrypted-settings)
22. [Deployment Instructions](#22-deployment-instructions)
23. [File Structure](#23-file-structure)

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
- **Send emails directly via Gmail** through OAuth integration, with a **100 email/day limit per user** to protect domain reputation
- **Track email replies** via Gmail API thread polling, with automated nightly checks
- **Schedule emails** for future delivery, processed automatically by cron
- **Manage contacts** linked to accounts, with bulk import from Salesforce
- **Sync with Salesforce** via OAuth to push activities and pull opportunities, with **automatic nightly sync** of sent emails
- **Share account intelligence** via tokenized public links that bypass Cloudflare Access

The entire application is a **single Cloudflare Worker** (~4,700 lines of TypeScript) with a **vanilla JavaScript SPA** frontend (~3,700 lines). No React, no build step for the frontend, no external backend.

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
│  │  - 60+ API endpoints                                      │ │
│  │  - Live research engine (8 probes)                         │ │
│  │  - Threat intelligence (7 source categories)               │ │
│  │  - AI orchestration (DeepSeek R1 + Llama 3.3 + 3.1)       │ │
│  │  - Daisy-chained opportunity agent                         │ │
│  │  - 5 persona × 5 message type messaging engine             │ │
│  │  - 12-category competitive intelligence                    │ │
│  │  - 8-theme mass campaign engine                            │ │
│  │  - Gmail OAuth + Salesforce OAuth                          │ │
│  │  - Lead scoring, ROI calc, sequences, A/B testing          │ │
│  │  - Encrypted settings (AES-256-GCM)                        │ │
│  └──────────────────────┬────────────────────────────────────┘ │
│                         │                                      │
│  ┌──────────────────────▼────────────────────────────────────┐ │
│  │                    D1 Database                             │ │
│  │  accounts, research_reports, persona_messages,             │ │
│  │  campaigns, campaign_emails, share_tokens, gmail_tokens,   │ │
│  │  app_settings, opportunities, lead_scores, sequences,      │ │
│  │  meeting_preps, alerts, probe_history, playbooks,          │ │
│  │  voice_notes, vectorize_cache, salesforce_tokens,          │ │
│  │  page_views                                                │ │
│  └───────────────────────────────────────────────────────────┘ │
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

---

## 3. Cloudflare Services Used

| Service | Binding | Purpose |
|---------|---------|---------|
| **Workers** | (runtime) | Application server |
| **D1** | `DB` | SQLite database (21 tables) |
| **Workers AI** | `AI` | LLM inference (3 models) |
| **Browser Rendering** | `BROWSER` | Headless Chromium via @cloudflare/puppeteer |
| **Workers KV** | `THREAT_CACHE` | Threat intel cache + URL dedup |
| **Cloudflare Access** | (infrastructure) | JWT-based auth |
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
| `persona_messages` | Generated emails | account_id, persona, message_type, subject, content, approval_status, gmail_thread_id, replied, user_email |
| `campaigns` | Mass email campaigns | name, theme, persona, accountIds (JSON), status, generated count |
| `campaign_emails` | Individual campaign emails | campaign_id, account_id, subject, content, status, approval_status, gmail_thread_id, replied |
| `contacts` | **People linked to accounts** | account_id, first_name, last_name, email, title, phone, role, is_primary, salesforce_id, user_email |
| `email_send_log` | **Daily send limit tracking** | user_email, recipient, subject, source, sent_at |
| `scheduled_sends` | **Future email delivery** | user_email, to_address, subject, body, scheduled_for, status |
| `share_tokens` | Public share links | token (32-char UUID), account_id, created_by, expires_at (30-day default) |
| `gmail_tokens` | OAuth tokens (encrypted) | user_email (PK), access_token, refresh_token, gmail_address |
| `salesforce_tokens` | SF OAuth tokens (encrypted) | user_email (PK), instance_url, access_token, refresh_token |
| `app_settings` | Encrypted config | key (PK), value (AES-256-GCM encrypted) |
| `opportunities` | Pipeline tracking | account_id, account_name, industry, country, acv, stage, notes, user_email |
| `lead_scores` | Cached lead scores | account_id (PK), score, factors (JSON) |
| `sequences` | Multi-touch sequences | account_id, persona, theme, touches (JSON), status |
| `meeting_preps` | AI meeting briefs | account_id, content, user_email |
| `alerts` | Infrastructure/threat alerts | account_id, alert_type, title, detail, severity, read |
| `probe_history` | CDN/DNS snapshots | account_id, cdn_detected, dns_provider, security_headers, probe_hash |
| `playbooks` | Reusable sales templates | name, persona, industry, template, usage_count |
| `voice_notes` | Call note transcripts | account_id, transcript, generated_email, user_email |
| `vectorize_cache` | Search index | content_type, content_id, content_text, account_id |
| `page_views` | Usage analytics | page, tab, account_id, user_email, created_at |

All data is **user-scoped** via `user_email` column. **21 tables** total.

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

## 7. API Endpoints (80+ endpoints)

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
| `POST` | `/api/detect-changes/:id` | CDN/DNS change detection |
| `GET` | `/api/alerts` | All alerts & notifications |
| `POST` | `/api/alerts/:id/read` | Mark alert as read |
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
Dashboard  Threats  Campaigns  |  Pipeline  Leads  Alerts  |  Team  Playbooks  Upload  |  Analytics    [Search]
```

### Routes

| Route | View |
|-------|------|
| `#/` | Dashboard — stats cards + searchable/filterable account table |
| `#/threats` | Global threat intelligence dashboard with country/days filters |
| `#/campaigns` | Campaign builder + existing campaign list |
| `#/campaign/:id` | Campaign detail with batch generation + email preview |
| `#/pipeline` | Opportunities table + ACV stats + AI auto-generate agent |
| `#/lead-scores` | Lead scoring leaderboard with score bars and factors |
| `#/alerts` | Alert/notification feed with severity, mark-as-read |
| `#/team` | Team activity dashboard with leaderboard |
| `#/playbooks` | Playbook CRUD with usage tracking |
| `#/upload` | Excel upload with drag-and-drop |
| `#/search/:query` | Semantic search results across all intel |
| `#/analytics` | Usage analytics: page views, tab popularity, daily trends, per-user activity |
| `#/account/:id` | Account detail with 7 tabs (see below) |
| `#/share/:token` | Public share view (no auth required) |

### Account Detail Tabs

| Tab | Features |
|-----|----------|
| **Overview** | KPIs, tech stack, competitor map, quick actions |
| **Deep Research** | 4 research types with live 8-probe data |
| **Threat Intel** | Account-matched incidents with email generation |
| **Competitive Intel** | Full product catalog with live battlecard generation |
| **Email Composer** | 5 personas × 5 message types with probe pre-fetch, recipient info display, and approval workflow (approve/reject before sending) |
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

OAuth flow via Google Cloud Console credentials. Stored **encrypted** (AES-GCM) in D1 or as Worker secrets. Sends via Gmail API (`gmail.send` + `gmail.readonly` scopes). Auto-refreshes tokens. In-app wizard with no CLI needed.

**Email Approval Workflow**: Every generated email (persona messages and campaign emails) starts with `pending_approval` status. Before sending via Gmail, users must:
1. **Review recipient info** — account name, website, industry, location, account status, IT spend, and tech stack are displayed prominently
2. **Approve or reject** — explicit approve/reject buttons gate the send action
3. **Send** — only approved emails can be sent via Gmail; the backend enforces this check

For campaigns, bulk approve/reject actions and filter-by-status tabs allow efficient review of large email batches.

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

## 22. Deployment

```bash
git clone https://github.com/pottaarun/RevFlare.git
cd RevFlare
npm install

# Create database and run all migrations
wrangler d1 create revflare-db
wrangler d1 execute revflare-db --remote --file=schema-full.sql
wrangler d1 execute revflare-db --remote --file=migration-approval.sql
wrangler d1 execute revflare-db --remote --file=migration-email-daily-limit.sql
wrangler d1 execute revflare-db --remote --file=migration-improvements.sql

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

## 23. File Structure

```
revFlare/
├── src/
│   ├── index.ts                    # Main Worker (~4,700 lines)
│   ├── advanced-features.ts        # Lead scoring, ROI, lookalikes, sequences, etc.
│   ├── advanced-features.test.ts   # Unit tests (vitest)
│   └── threat-intel.ts             # Threat intelligence module (~465 lines)
├── public/
│   ├── index.html                  # HTML shell + nav + Gmail wizard
│   ├── app.js                      # Frontend SPA (~3,700 lines)
│   └── styles.css                  # Design system (~1,400 lines)
├── screenshots/                    # App screenshots (auto-generated)
├── schema-full.sql                 # Complete DB schema (21 tables + indexes)
├── schema.sql                      # Core DB schema (legacy)
├── migration-approval.sql          # Email approval workflow migration
├── migration-email-daily-limit.sql # Daily send limit tracking table
├── migration-improvements.sql      # Contacts, scheduled sends, reply tracking, indexes
├── seed.mjs                        # Excel seed script
├── wrangler.toml                   # Worker config
├── package.json                    # Dependencies + test scripts
├── tsconfig.json                   # TypeScript config (strict, zero errors)
└── README.md                       # This file
```

**Total codebase**: ~10,500 lines across 10 source files.
**Dependencies**: hono, @cloudflare/puppeteer, @cloudflare/workers-types, typescript, wrangler, xlsx, vitest (dev)
