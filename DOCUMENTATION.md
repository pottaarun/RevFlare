# RevFlare — Master Reference Document

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
15. [Gmail Integration](#15-gmail-integration)
16. [Sharing System](#16-sharing-system)
17. [Encrypted Settings](#17-encrypted-settings)
18. [Deployment Instructions](#18-deployment-instructions)
19. [File Structure](#19-file-structure)

---

## 1. Executive Summary

**RevFlare** is a Cloudflare-native AI-powered sales intelligence platform built as a single Cloudflare Worker. It enables Cloudflare sales teams (BDRs, AEs, CSMs, SEs, VP Sales) to:

- **Upload Salesforce account exports** (`.xlsx`) and store them in D1
- **Run deep AI research** on any account using 8 live data probes (website scraping via Browser Rendering, DNS, HTTP headers, SEC EDGAR, news, funding, Intricately, Cloudflare Radar)
- **Generate hyper-personalized outreach emails** across 5 sales personas with 25 message type variants per account
- **Generate competitive battlecards** for 12 product categories against 40+ competitors, using live-scraped competitor pages + DeepSeek R1 analysis
- **Monitor real-time threat intelligence** from 26 RSS feeds + GDELT + Google/Bing News + 3 optional paid sources, matching incidents to accounts by industry/country
- **Run mass email campaigns** across hundreds of accounts with 8 campaign themes, each email individually researched with live public intelligence
- **Send emails directly via Gmail** through OAuth integration
- **Share account intelligence** via tokenized public links that bypass Cloudflare Access
- **Track pipeline** with opportunity CRUD and ACV reporting

The entire application is a **single Cloudflare Worker** (~3,400 lines of TypeScript) with a **vanilla JavaScript SPA** frontend (~1,800 lines). No React, no build step for the frontend, no external backend.

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
│  │  - 45+ API endpoints                                      │ │
│  │  - Live research engine (8 probes)                         │ │
│  │  - Threat intelligence (7 source categories)               │ │
│  │  - AI orchestration (DeepSeek R1 + Llama 3.3 + 3.1)       │ │
│  │  - 5 persona × 5 message type messaging engine             │ │
│  │  - 12-category competitive intelligence                    │ │
│  │  - 8-theme mass campaign engine                            │ │
│  │  - Gmail OAuth agent                                       │ │
│  │  - Encrypted settings (AES-256-GCM)                        │ │
│  └──────────────────────┬────────────────────────────────────┘ │
│                         │                                      │
│  ┌──────────────────────▼────────────────────────────────────┐ │
│  │                    D1 Database                             │ │
│  │  accounts, research_reports, persona_messages,             │ │
│  │  campaigns, campaign_emails, share_tokens,                 │ │
│  │  gmail_tokens, app_settings, opportunities                 │ │
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

---

## 3. Cloudflare Services Used

| Service | Binding | Purpose |
|---------|---------|---------|
| **Workers** | (runtime) | Application server |
| **D1** | `DB` | SQLite database (9 tables) |
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
| `campaign_emails` | Individual campaign emails | campaign_id, account_id, subject, content, status (generated/sent) |
| `share_tokens` | Public share links | token (16-char), account_id, created_by, expires_at |
| `gmail_tokens` | OAuth tokens | user_email (PK), access_token, refresh_token, gmail_address, expires_at |
| `app_settings` | Encrypted config | key (PK), value (AES-256-GCM encrypted) |
| `opportunities` | Pipeline tracking | account_name, industry, country, acv, stage, user_email |

All data is **user-scoped** via `user_email` column.

---

## 6. Authentication System

1. **Cloudflare Access** injects JWT headers on every request
2. Worker middleware extracts email from `Cf-Access-Jwt-Assertion` or `Cf-Access-Authenticated-User-Email`
3. All queries include `WHERE user_email = ?`
4. Public share endpoints (`/api/public/*`) bypass auth

---

## 7. API Endpoints (45+ endpoints)

### Account Management
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/accounts/clear` | Clear user's data |
| `POST` | `/api/accounts/upload` | Batch upload from Excel |
| `GET` | `/api/accounts` | Paginated list with search/filter/sort |
| `GET` | `/api/accounts/:id` | Full account detail |
| `GET` | `/api/filters` | Filter dropdown values |
| `GET` | `/api/stats` | Dashboard aggregates |

### Research
| `POST` | `/api/research/:id` | Generate AI research (4 types) |
| `GET` | `/api/research/:id` | List reports |
| `POST` | `/api/live-probe/:id` | Pre-fetch 8 probes |

### Messaging
| `GET` | `/api/personas` | All 5 persona configs |
| `POST` | `/api/messaging/:id` | Generate persona email |
| `GET` | `/api/messaging/:id` | List messages |

### Competitive Intel
| `GET` | `/api/catalog` | Full 12-category product catalog |
| `POST` | `/api/competitive/:id` | Generate battlecard |

### Threat Intel
| `GET` | `/api/threats` | Global threat feed (7 sources) |
| `GET` | `/api/threats/:id` | Account-matched threats |
| `POST` | `/api/threats/:id/email` | Incident-triggered email |

### Campaigns
| `GET` | `/api/campaign-themes` | 8 campaign themes |
| `POST` | `/api/campaigns` | Create with account selection |
| `POST` | `/api/campaigns/:id/generate` | Generate batch (2 emails) |
| `GET` | `/api/campaigns/:id/export` | Download CSV |

### Gmail
| `GET` | `/api/gmail/connect` | Start OAuth flow |
| `POST` | `/api/gmail/send` | Send email |
| `POST` | `/api/gmail/send-campaign/:id` | Bulk send (10/batch) |

### Sharing
| `POST` | `/api/share/:id` | Create share link |
| `GET` | `/api/public/:token` | Public account view |

### Pipeline
| `GET/POST/DELETE` | `/api/opportunities` | Opportunity CRUD |
| `GET` | `/api/acv` | ACV breakdown |

### Settings
| `POST` | `/api/settings` | Save encrypted setting |
| `GET` | `/api/settings/status` | Check which keys are set |

---

## 8. Frontend Pages

| Route | View |
|-------|------|
| `#/` | Dashboard (stats + account table) |
| `#/threats` | Global threat intelligence dashboard |
| `#/campaigns` | Campaign builder + list |
| `#/campaign/:id` | Campaign detail + generation |
| `#/upload` | Excel upload |
| `#/account/:id` | Account detail with 6 tabs: Overview, Deep Research, Threat Intel, Competitive Intel, Email Composer, History |
| `#/share/:token` | Public share view (no auth) |

---

## 9. AI Models

| Model | Usage | Fallback |
|-------|-------|----------|
| **DeepSeek R1 32B** (`@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`) | Research reports, battlecards | Llama 3.3 |
| **Llama 3.3 70B** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) | Emails, campaigns, threat emails | — |
| **Llama 3.1 8B** (`@cf/meta/llama-3.1-8b-instruct`) | Quick enrichment | — |

Auto-fallback: if primary model fails, retries with Llama 3.3. Context auto-trimmed per model.

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

## 11. Persona System (5 Personas × 5 Message Types = 25 Variants)

| Persona | Icon | Message Types |
|---------|------|---------------|
| **BDR** | 🎯 | Cold Email, LinkedIn Message, Cold Call Script, Follow-Up, Displacement Outreach |
| **AE** | 💼 | Executive Email, Proposal Summary, ROI/Business Case, Champion Enablement, Displacement Proposal |
| **CSM** | 🤝 | QBR Talking Points, Expansion Pitch, Health Check, Renewal Prep, Vendor Consolidation Pitch |
| **SE** | 🔧 | Technical Brief, Migration Plan, Architecture Review, POC Proposal, Technical Displacement Brief |
| **VP Sales** | 👑 | Executive Brief, CxO Outreach, Strategic Proposal, Board Talking Points, Platform Consolidation Case |

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

**Pipeline**: Parallel fetch → dedup (in-request + KV) → date filter → entity-compromise filter → relevance scoring (SECURITY_DOMAINS boost) → country detection (20 countries + sub-national) → CF product mapping → severity scoring (age decay + country boost) → cache (10-min KV TTL)

**KV Dedup**: 5,000 URL hash set with 30-day TTL. 10-minute result cache prevents feed hammering.

---

## 15. Gmail Integration

OAuth flow via Google Cloud Console credentials. Stored encrypted in D1 or as Worker secrets. Sends via Gmail API (`gmail.send` scope only). Auto-refreshes tokens. In-app wizard with no CLI needed.

---

## 16. Sharing System

16-char tokenized links. Public endpoints bypass Access. Shows account data + all research + all messages. Tokens deletable, optional expiry.

---

## 17. Encrypted Settings

AES-256-GCM via Web Crypto API. Key derived from SHA-256 of `revflare-settings-v1:{keyName}`. Random 12-byte IV per encryption. Only the running Worker can decrypt.

---

## 18. Deployment

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

## 19. File Structure

```
revFlare/
├── src/
│   ├── index.ts              # Main Worker (~3,400 lines)
│   └── threat-intel.ts       # Threat intelligence module (~465 lines)
├── public/
│   ├── index.html            # HTML shell + Gmail wizard
│   ├── app.js                # Frontend SPA (~1,800 lines)
│   └── styles.css            # Design system (~1,400 lines)
├── schema.sql                # Core DB schema
├── migration-auth.sql        # Auth migration
├── seed.mjs                  # Excel seed script
├── wrangler.toml             # Worker config
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── DOCUMENTATION.md          # This file
```

**Total codebase**: ~7,065 lines across 8 source files.
**Dependencies**: hono, @cloudflare/puppeteer, @cloudflare/workers-types, typescript, wrangler, xlsx
