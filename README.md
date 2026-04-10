# RevFlare — Cloudflare Sales Intelligence Platform

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Cloudflare Services Used](#3-cloudflare-services-used)
4. [Environment Variables & Secrets](#4-environment-variables--secrets)
5. [Database Schema](#5-database-schema)
6. [Authentication System](#6-authentication-system)
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
17. [Gmail Integration](#17-gmail-integration)
18. [Salesforce Integration](#18-salesforce-integration)
19. [Sharing System](#19-sharing-system)
20. [Encrypted Settings](#20-encrypted-settings)
21. [Deployment Instructions](#21-deployment-instructions)
22. [File Structure](#22-file-structure)

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
- **Send emails directly via Gmail** through OAuth integration
- **Sync with Salesforce** via OAuth to push activities and pull opportunities
- **Share account intelligence** via tokenized public links that bypass Cloudflare Access

The entire application is a **single Cloudflare Worker** (~3,500 lines of TypeScript) with a **vanilla JavaScript SPA** frontend (~2,800 lines). No React, no build step for the frontend, no external backend.

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
│  │  voice_notes, vectorize_cache, salesforce_tokens           │ │
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
| **D1** | `DB` | SQLite database (17+ tables) |
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
| `persona_messages` | Generated emails | account_id, persona, message_type, subject, content, user_email |
| `campaigns` | Mass email campaigns | name, theme, persona, accountIds (JSON), status, generated count |
| `campaign_emails` | Individual campaign emails | campaign_id, account_id, subject, content, status |
| `share_tokens` | Public share links | token (16-char), account_id, created_by, expires_at |
| `gmail_tokens` | OAuth tokens | user_email (PK), access_token, refresh_token, gmail_address |
| `salesforce_tokens` | SF OAuth tokens | user_email (PK), instance_url, access_token, refresh_token |
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

All data is **user-scoped** via `user_email` column.

---

## 6. Authentication System

1. **Cloudflare Access** injects JWT headers on every request
2. Worker middleware extracts email from `Cf-Access-Jwt-Assertion` or `Cf-Access-Authenticated-User-Email`
3. All queries include `WHERE user_email = ?`
4. Public share endpoints (`/api/public/*`) bypass auth

---

## 7. API Endpoints (60+ endpoints)

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

### Semantic Search
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/search/index` | Re-index all content for user |
| `GET` | `/api/search?q=` | Keyword + AI-ranked search |

### Gmail
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/gmail/connect` | Start OAuth flow |
| `POST` | `/api/gmail/send` | Send email |
| `POST` | `/api/gmail/send-campaign/:id` | Bulk send (10/batch) |

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
Dashboard  Threats  Campaigns  |  Pipeline  Leads  Alerts  |  Team  Playbooks  Upload    [Search]
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
| `#/account/:id` | Account detail with 7 tabs (see below) |
| `#/share/:token` | Public share view (no auth required) |

### Account Detail Tabs

| Tab | Features |
|-----|----------|
| **Overview** | KPIs, tech stack, competitor map, quick actions |
| **Deep Research** | 4 research types with live 8-probe data |
| **Threat Intel** | Account-matched incidents with email generation |
| **Competitive Intel** | Full product catalog with live battlecard generation |
| **Email Composer** | 5 personas × 5 message types with probe pre-fetch |
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

## 17. Gmail Integration

OAuth flow via Google Cloud Console credentials. Stored encrypted in D1 or as Worker secrets. Sends via Gmail API (`gmail.send` scope only). Auto-refreshes tokens. In-app wizard with no CLI needed.

---

## 18. Salesforce Integration

OAuth flow to Salesforce. Supports:
- **Push activities**: Send research reports and generated emails as SF Tasks
- **Pull opportunities**: Fetch opportunities from SF for any account
- Credentials stored encrypted in D1 via in-app settings

---

## 19. Sharing System

16-char tokenized links. Public endpoints bypass Access. Shows account data + all research + all messages. Tokens deletable, optional expiry.

---

## 20. Encrypted Settings

AES-256-GCM via Web Crypto API. Key derived from SHA-256 of `revflare-settings-v1:{keyName}`. Random 12-byte IV per encryption. Only the running Worker can decrypt.

---

## 21. Deployment

```bash
git clone https://github.com/pottaarun/RevFlare.git
cd RevFlare
npm install
wrangler d1 create revflare-db          # Create database
wrangler d1 execute revflare-db --remote --file=schema.sql
wrangler d1 execute revflare-db --remote --file=migration-auth.sql
wrangler deploy                          # Deploy to Cloudflare
```

Configure Cloudflare Access on `revflare.*.workers.dev` for auth.

---

## 22. File Structure

```
revFlare/
├── src/
│   ├── index.ts              # Main Worker (~3,500 lines)
│   ├── advanced-features.ts  # Lead scoring, ROI, lookalikes, sequences, etc.
│   └── threat-intel.ts       # Threat intelligence module (~465 lines)
├── public/
│   ├── index.html            # HTML shell + nav + Gmail wizard
│   ├── app.js                # Frontend SPA (~2,800 lines)
│   └── styles.css            # Design system (~1,400 lines)
├── schema.sql                # Core DB schema
├── migration-auth.sql        # Auth migration
├── seed.mjs                  # Excel seed script
├── wrangler.toml             # Worker config
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

**Total codebase**: ~8,600 lines across 9 source files.
**Dependencies**: hono, @cloudflare/puppeteer, @cloudflare/workers-types, typescript, wrangler, xlsx
