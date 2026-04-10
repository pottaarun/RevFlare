import { Hono } from 'hono';
import { cors } from 'hono/cors';
import puppeteer from '@cloudflare/puppeteer';
import { fetchThreatIntelligence, matchIncidentsToAccount, buildIncidentBDREmail, inferCloudflareProducts, type ThreatIncident } from './threat-intel';
import { calculateLeadScore, calculateROI, scoreSimilarity, buildMeetingPrepPrompt, SEQUENCE_TEMPLATES, buildWinLossPrompt } from './advanced-features';

// ── Types ──────────────────────────────────────────────────────────
type Bindings = {
  DB: D1Database;
  AI: Ai;
  BROWSER: Fetcher;
  THREAT_CACHE: KVNamespace;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  INTRICATELY_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: { userEmail: string } }>();
app.use('/api/*', cors());

// ── Auth middleware: extract user email from Cloudflare Access JWT ──
// Skip auth for public share endpoints
app.use('/api/public/*', async (c, next) => { c.set('userEmail', 'public'); await next(); });

app.use('/api/*', async (c, next) => {
  // Skip if already handled by public middleware
  if (c.req.path.startsWith('/api/public')) { await next(); return; }
  let email = '';

  // 1. Try Cloudflare Access JWT header
  const jwt = c.req.header('Cf-Access-Jwt-Assertion');
  if (jwt) {
    try {
      // JWT is base64url encoded: header.payload.signature
      const payload = jwt.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      email = decoded.email || '';
    } catch (_) {}
  }

  // 2. Fallback: Cf-Access-Authenticated-User-Email header (set by Access)
  if (!email) {
    email = c.req.header('Cf-Access-Authenticated-User-Email') || '';
  }

  // 3. Fallback for local dev / no Access configured: use a query param or default
  if (!email) {
    email = c.req.query('_user') || 'default@revflare.local';
  }

  email = email.toLowerCase().trim();
  c.set('userEmail', email);
  await next();
});

// ── Get current user endpoint ──────────────────────────────────────
app.get('/api/me', async (c) => {
  const email = c.get('userEmail');
  const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM accounts WHERE user_email = ?').bind(email).first();
  return c.json({ email, accountCount: (count as any)?.cnt || 0 });
});

// ── Global platform stats (all users combined) ────────────────────
app.get('/api/platform-stats', async (c) => {
  const [emails, research, campaigns, users] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM persona_messages').first(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM research_reports').first(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM campaigns').first(),
    c.env.DB.prepare('SELECT COUNT(DISTINCT user_email) as cnt FROM accounts WHERE user_email != ""').first(),
  ]);
  return c.json({
    totalEmails: (emails as any)?.cnt || 0,
    totalResearch: (research as any)?.cnt || 0,
    totalCampaigns: (campaigns as any)?.cnt || 0,
    totalUsers: (users as any)?.cnt || 0,
  });
});

// ── Column Mapping (Excel Header -> DB Column) ────────────────────
const COLUMN_MAP: Record<string, string> = {
  'Account Name': 'account_name',
  'Website(MT)': 'website',
  'Website Domain': 'website_domain',
  'Industry': 'industry',
  'Status': 'status',
  'Account Status': 'account_status',
  'Account Segment': 'account_segment',
  'Billing Country': 'billing_country',
  'Billing City': 'billing_city',
  'Billing State/Province': 'billing_state',
  'Current Monthly Fee': 'current_monthly_fee',
  'Revenue Bucket': 'revenue_bucket',
  'Employee Bucket': 'employee_bucket',
  'Annual Revenue': 'annual_revenue',
  'Employees': 'employees',
  'Serviceable Addressable Market (SAM)': 'sam',
  'LinkedIn Profile URL': 'linkedin_url',
  'LinkedIn Followers': 'linkedin_followers',
  'NA Traffic (%)': 'na_traffic',
  'EMEA Traffic (%)': 'emea_traffic',
  'APJ Traffic (%)': 'apj_traffic',
  'LATAM Traffic (%)': 'latam_traffic',
  'Total IT Infrastructure Estimated Monthly Spend': 'total_it_spend',
  'Total IT Infrastructure Estimated Monthly Spend Tier': 'total_it_spend_tier',
  'Spend Potential (Range)': 'spend_potential',
  'Primary Cloud Hosting Product': 'cloud_hosting_primary',
  'Cloud Hosting Estimated Monthly Spend': 'cloud_hosting_spend',
  'Cloud Hosting Products (List)': 'cloud_hosting_products',
  'Primary Data Center Hosting Product': 'data_center_primary',
  'Data Center Hosting Estimated Monthly Spend': 'data_center_spend',
  'Data Center Hosting Products (List)': 'data_center_products',
  'Primary Security Product': 'security_primary',
  'Cloud Security Estimated Monthly Spend': 'security_spend',
  'Cloud Security Products (List)': 'security_products',
  'Primary CDN (Content Delivery) Product': 'cdn_primary',
  'Content Delivery (CDN) Estimated Monthly Spend': 'cdn_spend',
  'Content Delivery (CDN) Products (List)': 'cdn_products',
  'Primary DNS Product': 'dns_primary',
  'DNS Estimated Monthly Spend': 'dns_spend',
  'DNS Products (List)': 'dns_products',
  'Primary Traffic Management (GTM) Product': 'traffic_mgmt_primary',
  'Traffic Management (GTM) Estimated Monthly Spend': 'traffic_mgmt_spend',
  'Performance Management (APM) Products (List)': 'apm_products',
  'SaaS (Software as a Service) Products (List)': 'saas_products',
  '# of Opportunities (Total)': 'opportunities_total',
  '# of Opportunities (Open)': 'opportunities_open',
  '# of Opportunities (Closed Lost)': 'opportunities_closed_lost',
  'Last Activity': 'last_activity',
  'Activities in last 30 days': 'activities_last_30',
  'Customer Acquisition Date': 'customer_acquisition_date',
};

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ── Clear all data before batch upload ─────────────────────────────
app.post('/api/accounts/clear', async (c) => {
  const email = c.get('userEmail');
  await c.env.DB.prepare('DELETE FROM persona_messages WHERE user_email = ?').bind(email).run();
  await c.env.DB.prepare('DELETE FROM research_reports WHERE user_email = ?').bind(email).run();
  await c.env.DB.prepare('DELETE FROM accounts WHERE user_email = ?').bind(email).run();
  return c.json({ success: true });
});

// ── Upload Accounts (batch-safe, no auto-clear) ───────────────────
app.post('/api/accounts/upload', async (c) => {
  try {
    const { headers, rows } = await c.req.json<{ headers: string[]; rows: any[][] }>();
    if (!headers || !rows || !rows.length) {
      return c.json({ error: 'No data provided' }, 400);
    }

    const dbCols = Object.values(COLUMN_MAP);
    const headerIndexMap: Record<string, number> = {};
    headers.forEach((h, i) => {
      if (COLUMN_MAP[h]) headerIndexMap[COLUMN_MAP[h]] = i;
    });

    let inserted = 0;
    const BATCH = 50;

    for (let b = 0; b < rows.length; b += BATCH) {
      const batch = rows.slice(b, b + BATCH);
      const stmts = batch.map((row) => {
        const vals: Record<string, any> = {};
        for (const [dbCol, idx] of Object.entries(headerIndexMap)) {
          let v = row[idx];
          if (['current_monthly_fee', 'annual_revenue', 'sam', 'total_it_spend',
               'cloud_hosting_spend', 'data_center_spend', 'security_spend',
               'cdn_spend', 'dns_spend', 'traffic_mgmt_spend', 'na_traffic',
               'emea_traffic', 'apj_traffic', 'latam_traffic', 'linkedin_followers',
               'employees', 'opportunities_total', 'opportunities_open',
               'opportunities_closed_lost', 'activities_last_30'].includes(dbCol)) {
            v = parseNumeric(v);
          }
          vals[dbCol] = v ?? null;
        }
        vals['raw_data'] = JSON.stringify(
          Object.fromEntries(headers.map((h, i) => [h, row[i] ?? null]))
        );

        const columns = [...dbCols, 'raw_data', 'user_email'];
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map((col) => col === 'user_email' ? c.get('userEmail') : (vals[col] ?? null));

        return c.env.DB.prepare(
          `INSERT INTO accounts (${columns.join(',')}) VALUES (${placeholders})`
        ).bind(...values);
      });

      await c.env.DB.batch(stmts);
      inserted += batch.length;
    }

    // Dedup safety: remove any duplicates by account_name + user_email (keep lowest ID)
    const email = c.get('userEmail');
    await c.env.DB.prepare(`
      DELETE FROM accounts WHERE user_email = ? AND id NOT IN (
        SELECT MIN(id) FROM accounts WHERE user_email = ? GROUP BY account_name
      )
    `).bind(email, email).run();

    const finalCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM accounts WHERE user_email = ?'
    ).bind(email).first() as any;

    return c.json({ success: true, inserted, total: finalCount?.cnt || inserted });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── List Accounts (user-scoped) ────────────────────────────────────
app.get('/api/accounts', async (c) => {
  const email = c.get('userEmail');
  const search = c.req.query('search') || '';
  const industry = c.req.query('industry') || '';
  const country = c.req.query('country') || '';
  const segment = c.req.query('segment') || '';
  const status = c.req.query('status') || '';
  const sort = c.req.query('sort') || 'total_it_spend';
  const order = c.req.query('order') || 'DESC';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  let where = 'WHERE user_email = ?';
  const params: any[] = [email];

  if (search) {
    where += ' AND (account_name LIKE ? OR website LIKE ? OR industry LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (industry) { where += ' AND industry = ?'; params.push(industry); }
  if (country) { where += ' AND billing_country = ?'; params.push(country); }
  if (segment) { where += ' AND account_segment = ?'; params.push(segment); }
  if (status) { where += ' AND account_status = ?'; params.push(status); }

  const validSorts = ['account_name', 'total_it_spend', 'annual_revenue', 'employees',
                      'current_monthly_fee', 'cdn_spend', 'security_spend', 'dns_spend',
                      'opportunities_total', 'last_activity'];
  const safeSort = validSorts.includes(sort) ? sort : 'total_it_spend';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM accounts ${where}`
  ).bind(...params).first<{ total: number }>();

  const rows = await c.env.DB.prepare(
    `SELECT id, account_name, website, industry, account_status, account_segment,
            billing_country, billing_city, current_monthly_fee, revenue_bucket,
            employee_bucket, annual_revenue, employees, total_it_spend, total_it_spend_tier,
            spend_potential, cdn_primary, cdn_spend, security_primary, security_spend,
            dns_primary, dns_spend, cloud_hosting_primary, cloud_hosting_spend,
            opportunities_total, opportunities_open, last_activity, linkedin_url,
            linkedin_followers, na_traffic, emea_traffic, apj_traffic, latam_traffic
     FROM accounts ${where}
     ORDER BY ${safeSort} ${safeOrder} NULLS LAST
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({
    accounts: rows.results,
    total: countResult?.total || 0,
    page,
    limit,
    pages: Math.ceil((countResult?.total || 0) / limit),
  });
});

// ── Filter Options ─────────────────────────────────────────────────
app.get('/api/filters', async (c) => {
  const email = c.get('userEmail');
  const [industries, countries, segments, statuses] = await Promise.all([
    c.env.DB.prepare('SELECT DISTINCT industry FROM accounts WHERE user_email = ? AND industry IS NOT NULL AND industry != "" ORDER BY industry').bind(email).all(),
    c.env.DB.prepare('SELECT DISTINCT billing_country FROM accounts WHERE user_email = ? AND billing_country IS NOT NULL AND billing_country != "" ORDER BY billing_country').bind(email).all(),
    c.env.DB.prepare('SELECT DISTINCT account_segment FROM accounts WHERE user_email = ? AND account_segment IS NOT NULL AND account_segment != "" ORDER BY account_segment').bind(email).all(),
    c.env.DB.prepare('SELECT DISTINCT account_status FROM accounts WHERE user_email = ? AND account_status IS NOT NULL AND account_status != "" ORDER BY account_status').bind(email).all(),
  ]);
  return c.json({
    industries: industries.results.map((r: any) => r.industry),
    countries: countries.results.map((r: any) => r.billing_country),
    segments: segments.results.map((r: any) => r.account_segment),
    statuses: statuses.results.map((r: any) => r.account_status),
  });
});

// ── Dashboard Stats ────────────────────────────────────────────────
app.get('/api/stats', async (c) => {
  const email = c.get('userEmail');
  const result = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_accounts,
      SUM(CASE WHEN account_status = 'Active' THEN 1 ELSE 0 END) as active_accounts,
      SUM(CASE WHEN account_status = 'Not Renewed' THEN 1 ELSE 0 END) as churned_accounts,
      ROUND(AVG(total_it_spend), 0) as avg_it_spend,
      ROUND(SUM(current_monthly_fee), 0) as total_cf_revenue,
      ROUND(SUM(total_it_spend), 0) as total_addressable_spend,
      ROUND(AVG(cdn_spend), 0) as avg_cdn_spend,
      ROUND(AVG(security_spend), 0) as avg_security_spend,
      ROUND(AVG(dns_spend), 0) as avg_dns_spend,
      SUM(opportunities_open) as total_open_opps
    FROM accounts WHERE user_email = ?
  `).bind(email).first();
  return c.json(result);
});

// ── Single Account ─────────────────────────────────────────────────
app.get('/api/accounts/:id', async (c) => {
  const id = c.req.param('id');
  const email = c.get('userEmail');
  const account = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_email = ?'
  ).bind(id, email).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);
  return c.json(account);
});

// ── Cloudflare Product Positioning Map ─────────────────────────────
const CF_PRODUCT_MAP: Record<string, { products: string[]; pitch: string; resources: { title: string; url: string; type: string }[] }> = {
  cdn: {
    products: ['Cloudflare CDN', 'Argo Smart Routing', 'Tiered Caching', 'Cache Reserve', 'China Network'],
    pitch: 'Replace legacy CDN with Cloudflare\'s global network (330+ cities). Argo Smart Routing reduces latency 30%+. No bandwidth charges -- flat-rate pricing eliminates bill shock.',
    resources: [
      { title: 'Cloudflare CDN Overview', url: 'https://www.cloudflare.com/application-services/products/cdn/', type: 'Product Page' },
      { title: 'Argo Smart Routing', url: 'https://www.cloudflare.com/application-services/products/argo-smart-routing/', type: 'Product Page' },
      { title: 'CDN Performance Benchmark Report', url: 'https://www.cloudflare.com/network/', type: 'Benchmark' },
      { title: 'How Cloudflare CDN Works', url: 'https://developers.cloudflare.com/cache/', type: 'Documentation' },
      { title: 'Case Study: How NCR Voyix Cut Latency', url: 'https://www.cloudflare.com/case-studies/ncr/', type: 'Case Study' },
    ],
  },
  security: {
    products: ['Cloudflare WAF', 'DDoS Protection', 'Bot Management', 'API Shield', 'Page Shield', 'Turnstile'],
    pitch: 'Consolidate point security solutions into Cloudflare\'s integrated platform. WAF + DDoS + Bot Management on every request, zero performance penalty. L3/L4/L7 protection included.',
    resources: [
      { title: 'Cloudflare Application Security', url: 'https://www.cloudflare.com/application-services/products/', type: 'Product Page' },
      { title: 'WAF Overview', url: 'https://www.cloudflare.com/application-services/products/waf/', type: 'Product Page' },
      { title: 'DDoS Protection', url: 'https://www.cloudflare.com/ddos/', type: 'Product Page' },
      { title: 'Bot Management', url: 'https://www.cloudflare.com/application-services/products/bot-management/', type: 'Product Page' },
      { title: 'Forrester TEI: Cloudflare Application Security', url: 'https://www.cloudflare.com/lp/forrester-tei-cloudflare-application-security-and-performance/', type: 'Analyst Report' },
      { title: 'DDoS Threat Landscape Report', url: 'https://radar.cloudflare.com/reports/ddos', type: 'Research Report' },
    ],
  },
  zero_trust: {
    products: ['Cloudflare Access', 'Cloudflare Gateway', 'WARP Client', 'Browser Isolation', 'CASB', 'DLP', 'Email Security'],
    pitch: 'Replace VPN + SASE stack with Cloudflare Zero Trust. Single agent, single dashboard. Enforce identity-aware access across all apps. Built-in email security stops phishing at the source.',
    resources: [
      { title: 'Cloudflare Zero Trust Platform', url: 'https://www.cloudflare.com/zero-trust/', type: 'Product Page' },
      { title: 'Replace Your VPN', url: 'https://www.cloudflare.com/zero-trust/solutions/vpn-replacement/', type: 'Solution Guide' },
      { title: 'SSE & SASE Overview', url: 'https://www.cloudflare.com/zero-trust/products/sse-sase/', type: 'Product Page' },
      { title: 'Email Security', url: 'https://www.cloudflare.com/zero-trust/products/email-security/', type: 'Product Page' },
      { title: 'Forrester Wave: SSE Leader', url: 'https://www.cloudflare.com/lp/forrester-wave-sse/', type: 'Analyst Report' },
      { title: 'Zero Trust Architecture Whitepaper', url: 'https://www.cloudflare.com/resources/assets/slt3lc6tev37/5oMQ6BTR5Oqt15SJOa5aFH/7d65d5506bde79a2a83d4f8f5c87a8ab/Whitepaper_A-Roadmap-to-Zero-Trust-Architecture.pdf', type: 'Whitepaper' },
    ],
  },
  dns: {
    products: ['Cloudflare DNS', 'DNS Firewall', 'DNSSEC', 'Secondary DNS'],
    pitch: 'Fastest authoritative DNS globally (sub-10ms). Free DNSSEC, instant propagation, 100% uptime SLA. Foundation DNS moves $1B+ revenue domains.',
    resources: [
      { title: 'Cloudflare DNS', url: 'https://www.cloudflare.com/application-services/products/dns/', type: 'Product Page' },
      { title: 'Foundation DNS for Enterprise', url: 'https://www.cloudflare.com/dns/dns-firewall/', type: 'Product Page' },
      { title: 'DNS Performance Comparison', url: 'https://www.dnsperf.com/#!dns-resolvers', type: 'Benchmark' },
      { title: 'DNS Documentation', url: 'https://developers.cloudflare.com/dns/', type: 'Documentation' },
    ],
  },
  compute: {
    products: ['Cloudflare Workers', 'Workers KV', 'Durable Objects', 'D1', 'R2', 'Queues', 'Vectorize', 'Workers AI'],
    pitch: 'Build and deploy at the edge -- 0ms cold starts, 330+ cities. R2 eliminates S3 egress fees (zero egress). D1 for edge SQL. Workers AI runs inference at the edge.',
    resources: [
      { title: 'Cloudflare Workers Platform', url: 'https://www.cloudflare.com/developer-platform/products/', type: 'Product Page' },
      { title: 'R2 — Zero Egress Object Storage', url: 'https://www.cloudflare.com/developer-platform/products/r2/', type: 'Product Page' },
      { title: 'Workers AI', url: 'https://www.cloudflare.com/developer-platform/products/workers-ai/', type: 'Product Page' },
      { title: 'Developer Documentation', url: 'https://developers.cloudflare.com/workers/', type: 'Documentation' },
      { title: 'Built with Workers — Showcase', url: 'https://workers.cloudflare.com/built-with', type: 'Showcase' },
    ],
  },
  performance: {
    products: ['Cloudflare Observatory', 'Web Analytics', 'Speed Brain', 'Early Hints', 'Zaraz'],
    pitch: 'Real-time performance insights without client-side bloat. Zaraz offloads 3rd-party scripts to the edge. Speed Brain pre-fetches pages for instant navigation.',
    resources: [
      { title: 'Cloudflare Performance', url: 'https://www.cloudflare.com/application-services/products/website-optimization/', type: 'Product Page' },
      { title: 'Zaraz — Third-Party Manager', url: 'https://www.cloudflare.com/application-services/products/zaraz/', type: 'Product Page' },
      { title: 'Cloudflare Radar — Internet Trends', url: 'https://radar.cloudflare.com/', type: 'Research' },
      { title: 'Speed & Reliability Documentation', url: 'https://developers.cloudflare.com/speed/', type: 'Documentation' },
    ],
  },
  media: {
    products: ['Cloudflare Stream', 'Cloudflare Images', 'Image Resizing'],
    pitch: 'Stream video at scale with adaptive bitrate, no encoding pipeline needed. Images API for on-the-fly resizing and optimization.',
    resources: [
      { title: 'Cloudflare Stream', url: 'https://www.cloudflare.com/developer-platform/products/cloudflare-stream/', type: 'Product Page' },
      { title: 'Cloudflare Images', url: 'https://www.cloudflare.com/developer-platform/products/cloudflare-images/', type: 'Product Page' },
      { title: 'Stream Developer Docs', url: 'https://developers.cloudflare.com/stream/', type: 'Documentation' },
    ],
  },
  network: {
    products: ['Cloudflare Network Interconnect', 'Magic Transit', 'Magic WAN', 'Spectrum'],
    pitch: 'Magic Transit for DDoS protection of entire IP ranges. Magic WAN replaces legacy MPLS. Network Interconnect for dedicated private connectivity.',
    resources: [
      { title: 'Magic Transit', url: 'https://www.cloudflare.com/network-services/products/magic-transit/', type: 'Product Page' },
      { title: 'Magic WAN', url: 'https://www.cloudflare.com/network-services/products/magic-wan/', type: 'Product Page' },
      { title: 'Network Services Documentation', url: 'https://developers.cloudflare.com/magic-transit/', type: 'Documentation' },
    ],
  },
};

// Build resources context string for AI prompts
function getResourcesForAccount(account: any): string {
  const competitors = getCompetitorMapping(account);
  const categories = new Set(competitors.map(c => c.category));

  const general = [
    { title: 'Cloudflare Network Map — 330+ cities globally', url: 'https://www.cloudflare.com/network/', type: 'Interactive Map' },
    { title: 'Customer Stories & Case Studies', url: 'https://www.cloudflare.com/case-studies/', type: 'Case Studies' },
    { title: 'Cloudflare Blog — Latest Product Announcements', url: 'https://blog.cloudflare.com/', type: 'Blog' },
    { title: 'Cloudflare Radar — Live Internet Insights', url: 'https://radar.cloudflare.com/', type: 'Research' },
  ];

  const relevant: { title: string; url: string; type: string }[] = [...general];

  // Add resources from CF_PRODUCT_MAP
  for (const cat of categories) {
    const prod = CF_PRODUCT_MAP[cat];
    if (prod?.resources) relevant.push(...prod.resources);
  }

  // Also add competitive comparison resources from the full catalog
  const allProducts = [
    account.cdn_products, account.security_products, account.dns_products,
    account.cloud_hosting_products, account.data_center_products, account.apm_products,
  ].filter(Boolean).join(';').toLowerCase();

  for (const [catKey, cat] of Object.entries(CF_PRODUCT_CATALOG)) {
    for (const comp of cat.competitors) {
      if (allProducts.includes(comp.key) || allProducts.includes(comp.name.toLowerCase())) {
        // Add the CF product pages for this category as competitive alternatives
        for (const p of cat.products.slice(0, 2)) {
          relevant.push({ title: `${p.name} — ${p.desc}`, url: p.url, type: `Competitive Alternative to ${comp.name}` });
        }
        break; // One match per category is enough
      }
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = relevant.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });

  return '\nRELEVANT CLOUDFLARE RESOURCES & COMPETITIVE ALTERNATIVES (include 4-6 most relevant links in the email — mix product pages, case studies, and competitive comparisons):\n' +
    deduped.map(r => `- [${r.type}] ${r.title}: ${r.url}`).join('\n');
}

function getCompetitorMapping(account: any): { category: string; competitor: string; cfProducts: string[]; pitch: string }[] {
  const mappings: { category: string; competitor: string; cfProducts: string[]; pitch: string }[] = [];
  const competitorToCf: Record<string, string> = {
    'akamai': 'cdn', 'amazon cloudfront': 'cdn', 'cloudfront': 'cdn', 'fastly': 'cdn',
    'varnish': 'cdn', 'nginx': 'cdn', 'limelight': 'cdn', 'edgecast': 'cdn',
    'crowdstrike': 'security', 'palo alto': 'security', 'alert logic': 'security',
    'imperva': 'security', 'f5': 'security', 'fortinet': 'security', 'barracuda': 'security',
    'akamai dns': 'dns', 'route 53': 'dns', 'amazon route 53': 'dns', 'dyn': 'dns',
    'ultradns': 'dns', 'ns1': 'dns', 'godaddy': 'dns',
    'zscaler': 'zero_trust', 'netskope': 'zero_trust', 'cisco umbrella': 'zero_trust',
    'blue coat': 'zero_trust', 'symantec': 'zero_trust',
    'datadog': 'performance', 'new relic': 'performance', 'akamai rum': 'performance',
    'amazon ec2': 'compute', 'aws lambda': 'compute', 'google compute': 'compute',
    'azure': 'compute',
    'aws elastic load balancer': 'network', 'f5 networks': 'network',
  };

  const allProducts = [
    account.cdn_products, account.security_products, account.dns_products,
    account.cloud_hosting_products, account.data_center_products, account.apm_products,
  ].filter(Boolean).join(';').toLowerCase();

  for (const [competitor, category] of Object.entries(competitorToCf)) {
    if (allProducts.includes(competitor)) {
      const cf = CF_PRODUCT_MAP[category];
      if (cf) {
        mappings.push({
          category,
          competitor: competitor.charAt(0).toUpperCase() + competitor.slice(1),
          cfProducts: cf.products,
          pitch: cf.pitch,
        });
      }
    }
  }
  return mappings;
}

// ══════════════════════════════════════════════════════════════════
// LIVE RESEARCH ENGINE — Real data, not AI inference
// ══════════════════════════════════════════════════════════════════

// ── 1. Website Scraper (with Browser Rendering fallback) ───────────
async function scrapeWebsite(domain: string, browser?: Fetcher): Promise<{ aboutText: string; metaDescription: string; title: string; careers: string; techSignals: string[]; investorRelations: string; pressReleases: string }> {
  const result = { aboutText: '', metaDescription: '', title: '', careers: '', techSignals: [] as string[], investorRelations: '', pressReleases: '' };
  if (!domain) return result;

  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const urls = [
    { url: `https://${clean}`, type: 'home' },
    { url: `https://${clean}/about`, type: 'about' },
    { url: `https://${clean}/about-us`, type: 'about' },
    { url: `https://${clean}/careers`, type: 'careers' },
    { url: `https://${clean}/investors`, type: 'ir' },
    { url: `https://${clean}/investor-relations`, type: 'ir' },
    { url: `https://${clean}/press`, type: 'press' },
    { url: `https://${clean}/newsroom`, type: 'press' },
    { url: `https://${clean}/news`, type: 'press' },
  ];

  function extractFromHTML(html: string, url: string, type: string) {
    const slice = html.slice(0, 80000);

    const titleMatch = slice.match(/<title[^>]*>(.*?)<\/title>/is);
    if (titleMatch && !result.title) result.title = titleMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 200);

    const metaMatch = slice.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is)
      || slice.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/is);
    if (metaMatch && !result.metaDescription) result.metaDescription = metaMatch[1].trim().slice(0, 500);

    const ogMatch = slice.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/is);
    if (ogMatch && !result.metaDescription) result.metaDescription = ogMatch[1].trim().slice(0, 500);

    const textContent = slice
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (type === 'about') result.aboutText = textContent.slice(0, 4000);
    else if (type === 'careers') result.careers = textContent.slice(0, 2000);
    else if (type === 'ir') result.investorRelations = textContent.slice(0, 4000);
    else if (type === 'press') result.pressReleases = textContent.slice(0, 3000);

    const techPatterns: [RegExp, string][] = [
      [/cloudflare/i, 'Cloudflare detected'], [/akamai/i, 'Akamai detected'],
      [/amazonaws\.com/i, 'AWS detected'], [/googletagmanager/i, 'GTM detected'],
      [/wp-content/i, 'WordPress'], [/next\.js|_next\//i, 'Next.js'],
      [/react/i, 'React'], [/vue\.js|vuejs/i, 'Vue.js'],
      [/shopify/i, 'Shopify'], [/salesforce/i, 'Salesforce'],
    ];
    for (const [p, s] of techPatterns) {
      if (p.test(slice) && !result.techSignals.includes(s)) result.techSignals.push(s);
    }
  }

  // Try Browser Rendering (headless Chromium via @cloudflare/puppeteer)
  if (browser) {
    let browserInstance: any = null;
    try {
      browserInstance = await puppeteer.launch(browser);
      const page = await browserInstance.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const renderPages = [
        { url: `https://${clean}`, type: 'home' as const },
        { url: `https://${clean}/about`, type: 'about' as const },
        { url: `https://${clean}/investors`, type: 'ir' as const },
      ];

      for (const rp of renderPages) {
        try {
          await page.goto(rp.url, { waitUntil: 'networkidle0', timeout: 10000 });
          const html = await page.content();
          extractFromHTML(html, rp.url, rp.type);
        } catch (_) {
          // Page didn't load — skip
        }
      }
      await browserInstance.close();
    } catch (_) {
      // Browser Rendering failed — fall through to direct fetch
      try { if (browserInstance) await browserInstance.close(); } catch (_) {}
    }
  }

  // Fallback / supplement with direct fetch for remaining URLs
  await Promise.all(urls.map(async ({ url, type }) => {
    if (type === 'about' && result.aboutText) return;
    if (type === 'ir' && result.investorRelations) return;
    if (type === 'press' && result.pressReleases) return;
    if (type === 'careers' && result.careers) return;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return;
      const html = await r.text();
      extractFromHTML(html, url, type);
    } catch (_) {}
  }));

  return result;
}

// ── 2. DNS / SSL / HTTP Header Probe ───────────────────────────────
async function probeDomain(domain: string): Promise<{ headers: Record<string, string>; serverInfo: string; cdnDetected: string; securityHeaders: string[]; tlsInfo: string }> {
  const result = { headers: {} as Record<string, string>, serverInfo: '', cdnDetected: '', securityHeaders: [] as string[], tlsInfo: '' };
  if (!domain) return result;

  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  try {
    const r = await fetch(`https://${clean}`, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RevFlare/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });

    // Capture all response headers
    const interesting = ['server', 'x-powered-by', 'x-cdn', 'x-cache', 'x-served-by',
      'cf-ray', 'cf-cache-status', 'x-amz-cf-id', 'x-akamai-transformed',
      'x-fastly-request-id', 'via', 'strict-transport-security', 'content-security-policy',
      'x-frame-options', 'x-content-type-options', 'x-xss-protection',
      'report-to', 'nel', 'expect-ct', 'permissions-policy'];

    for (const h of interesting) {
      const v = r.headers.get(h);
      if (v) result.headers[h] = v;
    }

    // Detect CDN from headers
    if (r.headers.get('cf-ray')) result.cdnDetected = 'Cloudflare (confirmed via cf-ray header)';
    else if (r.headers.get('x-amz-cf-id')) result.cdnDetected = 'Amazon CloudFront (confirmed via x-amz-cf-id header)';
    else if (r.headers.get('x-akamai-transformed') || (r.headers.get('server') || '').toLowerCase().includes('akamai')) result.cdnDetected = 'Akamai (confirmed via headers)';
    else if (r.headers.get('x-fastly-request-id')) result.cdnDetected = 'Fastly (confirmed via x-fastly-request-id header)';
    else if ((r.headers.get('via') || '').includes('varnish')) result.cdnDetected = 'Varnish/Fastly (confirmed via Via header)';
    else if ((r.headers.get('server') || '').toLowerCase().includes('cloudflare')) result.cdnDetected = 'Cloudflare (confirmed via server header)';

    result.serverInfo = r.headers.get('server') || 'Not disclosed';

    // Security header audit
    const secHeaders = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options', 'permissions-policy'];
    for (const sh of secHeaders) {
      if (r.headers.get(sh)) result.securityHeaders.push(`${sh}: present`);
      else result.securityHeaders.push(`${sh}: MISSING`);
    }

    result.tlsInfo = `TLS connection to ${clean} successful (HTTPS)`;
  } catch (e: any) {
    result.serverInfo = `Probe failed: ${e.message}`;
  }
  return result;
}

// ── 3. DNS Record Lookup via Cloudflare DoH ────────────────────────
async function lookupDNS(domain: string): Promise<{ aRecords: string[]; cnameRecords: string[]; mxRecords: string[]; nsRecords: string[]; dnsProvider: string }> {
  const result = { aRecords: [] as string[], cnameRecords: [] as string[], mxRecords: [] as string[], nsRecords: [] as string[], dnsProvider: '' };
  if (!domain) return result;
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');

  const types = ['A', 'CNAME', 'MX', 'NS'];
  for (const type of types) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${clean}&type=${type}`, {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(3000),
      });
      if (!r.ok) continue;
      const data = await r.json() as any;
      const answers = (data.Answer || []).map((a: any) => a.data).filter(Boolean);
      if (type === 'A') result.aRecords = answers.slice(0, 5);
      else if (type === 'CNAME') result.cnameRecords = answers.slice(0, 3);
      else if (type === 'MX') result.mxRecords = answers.slice(0, 5);
      else if (type === 'NS') {
        result.nsRecords = answers.slice(0, 5);
        // Detect DNS provider from NS records
        const ns = answers.join(' ').toLowerCase();
        if (ns.includes('cloudflare')) result.dnsProvider = 'Cloudflare DNS (confirmed via NS records)';
        else if (ns.includes('awsdns')) result.dnsProvider = 'AWS Route 53 (confirmed via NS records)';
        else if (ns.includes('akamai')) result.dnsProvider = 'Akamai DNS (confirmed via NS records)';
        else if (ns.includes('google')) result.dnsProvider = 'Google Cloud DNS (confirmed via NS records)';
        else if (ns.includes('azure')) result.dnsProvider = 'Azure DNS (confirmed via NS records)';
        else if (ns.includes('domaincontrol')) result.dnsProvider = 'GoDaddy DNS (confirmed via NS records)';
        else result.dnsProvider = `NS: ${answers.slice(0, 2).join(', ')}`;
      }
    } catch (_) {}
  }
  return result;
}

// ── 4. SEC EDGAR — Public company filings (fixed: correct EFTS API) ─
async function fetchSECFilings(companyName: string): Promise<{ filings: string; recentFilingText: string }> {
  const result = { filings: '', recentFilingText: '' };
  if (!companyName) return result;
  const cleanName = companyName.replace(/,?\s*(Inc\.?|LLC|Corp\.?|Ltd\.?|Co\.?|Group|Incorporated|Corporation|Limited|Company)$/i, '').trim();

  // Method 1: EDGAR full-text search API (efts.sec.gov)
  try {
    const q = encodeURIComponent(`"${cleanName}"`);
    const r = await fetch(`https://efts.sec.gov/LATEST/search-index?q=${q}&dateRange=custom&startdt=2023-01-01&forms=10-K,10-Q,8-K&from=0&size=5`, {
      headers: { 'User-Agent': 'RevFlare research@cloudflare.com', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const d = await r.json() as any;
      const hits = d?.hits?.hits;
      if (hits?.length) {
        result.filings = hits.slice(0, 5).map((h: any) => {
          const s = h._source || {};
          return `${s.form_type || 'Filing'}: ${s.entity_name || cleanName} (${s.file_date || '?'}) — ${s.file_description || 'N/A'}`;
        }).join('\n');
      }
    }
  } catch (_) {}

  // Method 2: EDGAR company tickers JSON (fast CIK lookup)
  if (!result.filings) {
    try {
      const r = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'RevFlare research@cloudflare.com' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const tickers = await r.json() as any;
        // Strict matching: require significant overlap, not just first 10 chars
        const searchTerms = cleanName.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const match = Object.values(tickers).find((t: any) => {
          if (!t.title) return false;
          const title = t.title.toLowerCase();
          // At least 2 words must match, or the full clean name is contained
          if (title.includes(cleanName.toLowerCase())) return true;
          const matchingWords = searchTerms.filter((w: string) => title.includes(w));
          return matchingWords.length >= Math.min(2, searchTerms.length);
        }) as any;
        if (match) {
          const cik = String(match.cik_str).padStart(10, '0');
          result.filings = `Ticker: ${match.ticker} | CIK: ${match.cik_str} | "${match.title}"\nFilings: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${match.cik_str}&type=10-K&dateb=&owner=include&count=5\nRecent data: https://data.sec.gov/submissions/CIK${cik}.json`;

          // Fetch actual filing metadata
          try {
            const sub = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
              headers: { 'User-Agent': 'RevFlare research@cloudflare.com' },
              signal: AbortSignal.timeout(5000),
            });
            if (sub.ok) {
              const sd = await sub.json() as any;
              const recent = sd.filings?.recent;
              if (recent?.form) {
                const filings = [];
                for (let i = 0; i < Math.min(recent.form.length, 8); i++) {
                  filings.push(`${recent.form[i]}: ${recent.primaryDocument?.[i] || ''} (${recent.filingDate?.[i] || ''})`);
                }
                result.filings += '\nRecent Filings:\n' + filings.join('\n');
                // Try to get description from 10-K
                const tenKIdx = recent.form.indexOf('10-K');
                if (tenKIdx >= 0) {
                  result.recentFilingText = `Most recent 10-K filed: ${recent.filingDate[tenKIdx]}. Accession: ${recent.accessionNumber?.[tenKIdx] || 'N/A'}`;
                }
              }
              // Company info
              if (sd.name) result.filings = `SEC Entity: ${sd.name} | SIC: ${sd.sic || 'N/A'} (${sd.sicDescription || ''})\n` + result.filings;
              if (sd.category) result.filings += `\nCategory: ${sd.category}`;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  return result;
}

// ── 5. News Search (multi-source: Google News RSS + Bing News) ─────
async function searchNews(companyName: string): Promise<string> {
  if (!companyName) return '';
  const items: string[] = [];

  // Source 1: Google News RSS
  try {
    const q = encodeURIComponent(`"${companyName}"`);
    const r = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/rss+xml,text/xml,application/xml' },
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) {
      const xml = await r.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) && items.length < 6) {
        const titleMatch = match[1].match(/<title>(.*?)<\/title>/s);
        const dateMatch = match[1].match(/<pubDate>(.*?)<\/pubDate>/);
        if (titleMatch) {
          const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
          const date = dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : '';
          if (title) items.push(`- [${date}] ${title} [Google News]`);
        }
      }
    }
  } catch (_) {}

  // Source 2: Bing News RSS (fallback if Google returned nothing)
  if (items.length < 2) {
    try {
      const q = encodeURIComponent(companyName);
      const r = await fetch(`https://www.bing.com/news/search?q=${q}&format=rss&count=5`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const xml = await r.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) && items.length < 8) {
          const titleMatch = match[1].match(/<title>(.*?)<\/title>/s);
          const dateMatch = match[1].match(/<pubDate>(.*?)<\/pubDate>/);
          if (titleMatch) {
            const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').trim();
            const date = dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : '';
            if (title && !items.some(i => i.includes(title.slice(0, 30)))) items.push(`- [${date}] ${title} [Bing News]`);
          }
        }
      }
    } catch (_) {}
  }

  // Source 3: DuckDuckGo Lite (another fallback)
  if (items.length < 2) {
    try {
      const q = encodeURIComponent(companyName + ' news');
      const r = await fetch(`https://lite.duckduckgo.com/lite/?q=${q}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const html = await r.text();
        // Extract result titles from DuckDuckGo Lite
        const resultRegex = /<a[^>]*class="result-link"[^>]*>(.*?)<\/a>/gi;
        let m;
        while ((m = resultRegex.exec(html)) && items.length < 6) {
          const title = m[1].replace(/<[^>]+>/g, '').trim();
          if (title && title.length > 15) items.push(`- ${title} [DuckDuckGo]`);
        }
      }
    } catch (_) {}
  }

  return items.join('\n');
}

// ── 6. Funding / Investment Search ─────────────────────────────────
async function searchFunding(companyName: string, domain: string): Promise<string> {
  if (!companyName) return '';
  const items: string[] = [];
  const clean = domain?.replace(/^https?:\/\//, '').replace(/\/.*/, '') || '';

  // Source 1: Crunchbase public page (no API key needed)
  if (clean) {
    try {
      const slug = clean.replace(/\.(com|io|co|net|org|ai)$/, '');
      const r = await fetch(`https://www.crunchbase.com/organization/${slug}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const html = await r.text();
        // Extract funding info from Crunchbase page
        const totalFundingMatch = html.match(/Total Funding[^<]*<[^>]*>([^<]+)/i) || html.match(/"funding_total"[^}]*"value_usd":(\d+)/);
        const lastRoundMatch = html.match(/Last Funding[^<]*<[^>]*>([^<]+)/i) || html.match(/"last_funding_type":"([^"]+)"/);
        const fundingRoundsMatch = html.match(/Number of Funding Rounds[^<]*<[^>]*>([^<]+)/i) || html.match(/"num_funding_rounds":(\d+)/);

        if (totalFundingMatch) items.push('Total Funding: ' + (totalFundingMatch[1] || '$' + Number(totalFundingMatch[1]).toLocaleString()));
        if (lastRoundMatch) items.push('Last Round: ' + lastRoundMatch[1]);
        if (fundingRoundsMatch) items.push('Funding Rounds: ' + fundingRoundsMatch[1]);

        // Look for investor names
        const investorMatches = html.match(/"investor_name":"([^"]+)"/g);
        if (investorMatches) {
          const investors = investorMatches.slice(0, 5).map((m: string) => m.replace(/"investor_name":"([^"]+)"/, '$1'));
          items.push('Key Investors: ' + investors.join(', '));
        }

        if (items.length) items.unshift('[Source: Crunchbase]');
      }
    } catch (_) {}
  }

  // Source 2: Search for funding news
  if (items.length < 2) {
    try {
      const cleanName = companyName.replace(/,?\s*(Inc|LLC|Corp|Ltd|Co)\.?$/i, '').trim();
      const q = encodeURIComponent(cleanName + ' funding round investment series');
      const r = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/rss+xml,text/xml' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const xml = await r.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) && items.length < 6) {
          const titleMatch = match[1].match(/<title>(.*?)<\/title>/s);
          const dateMatch = match[1].match(/<pubDate>(.*?)<\/pubDate>/);
          if (titleMatch) {
            const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').trim();
            if (title.toLowerCase().includes('fund') || title.toLowerCase().includes('invest') || title.toLowerCase().includes('rais') || title.toLowerCase().includes('series') || title.toLowerCase().includes('valuation')) {
              const date = dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : '';
              items.push('[' + date + '] ' + title);
            }
          }
        }
      }
    } catch (_) {}
  }

  return items.join('\n');
}

// ── 7. Intricately / HG Cloud Dynamics API ─────────────────────────
async function fetchIntricately(domain: string, apiKey?: string): Promise<{ company: string; spend: string; services: string[]; products: string[]; traffic: string; spendPotential: string; description: string; raw: string }> {
  const result = { company: '', spend: '', services: [] as string[], products: [] as string[], traffic: '', spendPotential: '', description: '', raw: '' };
  if (!domain || !apiKey) return result;
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');

  try {
    // Step 1: Resolve domain to company slug
    const lookupRes = await fetch(`https://api.intricately.com/api/v2/companies?domain=${encodeURIComponent(clean)}`, {
      headers: { 'X-API-KEY': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!lookupRes.ok) return result;
    const lookup = await lookupRes.json() as any;

    if (lookup.status_code !== 2 || !lookup.slug) {
      // Report not ready or queued
      result.raw = `Intricately status: ${lookup.status_message || 'unknown'} for ${clean}`;
      return result;
    }

    // Step 2: Fetch full company document
    const compRes = await fetch(`https://api.intricately.com/api/v2/companies/${lookup.slug}`, {
      headers: { 'X-API-KEY': apiKey, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!compRes.ok) return result;
    const comp = await compRes.json() as any;

    result.company = comp.name || lookup.name || '';
    result.description = comp.description || '';
    result.spendPotential = comp.spend_ability?.value || '';

    // Total IT spend
    if (comp.report?.spend) result.spend = `$${Number(comp.report.spend).toLocaleString()}/mo (Intricately estimate)`;
    if (comp.report?.spend_range) result.spend += ` — Tier: ${comp.report.spend_range}`;

    // Traffic distribution
    if (comp.traffic_distribution) {
      const td = comp.traffic_distribution;
      result.traffic = `NA: ${td.na ? (td.na * 100).toFixed(0) + '%' : '?'}, EMEA: ${td.emea ? (td.emea * 100).toFixed(0) + '%' : '?'}, APJ: ${td.apj ? (td.apj * 100).toFixed(0) + '%' : '?'}, LATAM: ${td.latam ? (td.latam * 100).toFixed(0) + '%' : '?'}`;
    }

    // Services (product categories) with spend and vendors
    if (comp.services?.length) {
      for (const svc of comp.services) {
        const svcLine = `${svc.name}: $${(svc.spend || 0).toLocaleString()}/mo (${svc.spend_range || 'unknown tier'}) — ${svc.vendor_count || 0} products`;
        result.services.push(svcLine);

        // Individual products/vendors
        if (svc.vendors?.length) {
          for (const v of svc.vendors) {
            const prodLine = `  - ${v.name}: $${(v.spend || 0).toLocaleString()}/mo (${v.spend_range || '?'})${v.self_hosted ? ' [self-hosted]' : ''}${v.started_at ? ' [since ' + v.started_at.slice(0, 7) + ']' : ''}`;
            result.products.push(prodLine);
          }
        }
      }
    }

    // Build raw summary
    const lines = [
      `Company: ${result.company}`,
      result.description ? `Description: ${result.description}` : '',
      result.spend ? `Total IT Spend: ${result.spend}` : '',
      result.spendPotential ? `Spend Potential: ${result.spendPotential}` : '',
      result.traffic ? `Traffic: ${result.traffic}` : '',
      comp.employees?.count ? `Employees: ${comp.employees.count.toLocaleString()} (${comp.employees.range || ''})` : '',
      comp.location ? `HQ: ${[comp.location.city, comp.location.state, comp.location.country].filter(Boolean).join(', ')}` : '',
      comp.industry?.name ? `Industry: ${comp.industry.name}` : '',
      comp.linkedin?.url ? `LinkedIn: ${comp.linkedin.url} (${comp.linkedin.followers?.toLocaleString() || '?'} followers)` : '',
      comp.domains?.count ? `Domains: ${comp.domains.count}` : '',
      comp.rollups?.product_count ? `Total Products: ${comp.rollups.product_count}` : '',
      comp.application?.workload_score ? `Application Workload Score: ${comp.application.workload_score}` : '',
      result.services.length ? `\nProduct Categories:\n${result.services.join('\n')}` : '',
      result.products.length ? `\nDetailed Product Deployments:\n${result.products.join('\n')}` : '',
    ].filter(Boolean);
    result.raw = lines.join('\n');

  } catch (_) {}
  return result;
}

// ── 8. Cloudflare Radar API (requires CF_API_TOKEN secret) ─────────
async function fetchRadarData(domain: string, apiToken?: string, accountId?: string): Promise<{ rank: string; categories: string[]; trafficTrend: string }> {
  const result = { rank: '', categories: [] as string[], trafficTrend: '' };
  if (!domain || !apiToken) return result;
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const headers = { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' };

  // Domain ranking
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/radar/ranking/domain/${clean}`, {
      headers, signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json() as any;
      const details = data?.result?.details_0;
      if (details) {
        const rank = details.categories?.[0]?.rank;
        const bucket = details.bucket;
        result.rank = rank ? `Global Rank #${rank}` : (bucket ? `Rank bucket: ${bucket}` : 'Ranked in Cloudflare Radar top domains');
        result.categories = (details.categories || []).map((c: any) => `${c.name} (#${c.rank})`).slice(0, 5);
      }
    }
  } catch (_) {}

  // Domain summary / traffic trend (if available)
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = now.toISOString().split('T')[0];
    const r = await fetch(`https://api.cloudflare.com/client/v4/radar/http/summary/http_version?dateStart=${dateFrom}&dateEnd=${dateTo}&name=domain_${clean.replace(/\./g, '_')}&limit=1`, {
      headers, signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json() as any;
      if (data?.result?.summary_0) {
        const s = data.result.summary_0;
        result.trafficTrend = `HTTP/2: ${s.http2 || 'N/A'}, HTTP/3: ${s.http3 || 'N/A'}, HTTP/1.x: ${s.http1x || 'N/A'}`;
      }
    }
  } catch (_) {}

  return result;
}

// ── Master: Run all probes in parallel ─────────────────────────────
interface LiveResearchResult {
  website: { aboutText: string; metaDescription: string; title: string; careers: string; techSignals: string[]; investorRelations: string; pressReleases: string };
  probe: { headers: Record<string, string>; serverInfo: string; cdnDetected: string; securityHeaders: string[]; tlsInfo: string };
  dns: { aRecords: string[]; cnameRecords: string[]; mxRecords: string[]; nsRecords: string[]; dnsProvider: string };
  sec: { filings: string; recentFilingText: string };
  news: string;
  funding: string;
  intricately: { company: string; spend: string; services: string[]; products: string[]; traffic: string; spendPotential: string; description: string; raw: string };
  radar: { rank: string; categories: string[]; trafficTrend: string };
}

async function runLiveResearch(domain: string, companyName: string, apiToken?: string, accountId?: string, browser?: Fetcher, intricatelyKey?: string): Promise<LiveResearchResult> {
  const [website, probe, dns, sec, news, funding, intricately, radar] = await Promise.all([
    scrapeWebsite(domain, browser),
    probeDomain(domain),
    lookupDNS(domain),
    fetchSECFilings(companyName),
    searchNews(companyName),
    searchFunding(companyName, domain),
    fetchIntricately(domain, intricatelyKey),
    fetchRadarData(domain, apiToken, accountId),
  ]);
  return { website, probe, dns, sec, news, funding, intricately, radar };
}

function formatLiveResearch(lr: LiveResearchResult): string {
  const sections: string[] = [];

  sections.push('=== LIVE RESEARCH DATA (verified, real-time) ===');

  // Website intelligence
  if (lr.website.title || lr.website.metaDescription || lr.website.aboutText) {
    sections.push('\n## WEBSITE INTELLIGENCE (scraped live)');
    if (lr.website.title) sections.push(`Page Title: ${lr.website.title}`);
    if (lr.website.metaDescription) sections.push(`Meta Description: ${lr.website.metaDescription}`);
    if (lr.website.aboutText) sections.push(`About Page Content:\n${lr.website.aboutText.slice(0, 3000)}`);
    if (lr.website.careers) sections.push(`Careers/Jobs Page Signals:\n${lr.website.careers.slice(0, 1500)}`);
    if ((lr.website as any).investorRelations) sections.push(`\n## INVESTOR RELATIONS PAGE (scraped live)\n${(lr.website as any).investorRelations.slice(0, 3000)}`);
    if ((lr.website as any).pressReleases) sections.push(`\n## PRESS / NEWSROOM PAGE (scraped live)\n${(lr.website as any).pressReleases.slice(0, 2000)}`);
    if (lr.website.techSignals.length) sections.push(`Tech Signals Detected: ${lr.website.techSignals.join(', ')}`);
  }

  // Infrastructure probe
  sections.push('\n## LIVE INFRASTRUCTURE PROBE (HTTP headers, verified now)');
  sections.push(`Server: ${lr.probe.serverInfo}`);
  if (lr.probe.cdnDetected) sections.push(`CDN Verified: ${lr.probe.cdnDetected}`);
  if (lr.probe.securityHeaders.length) sections.push(`Security Headers Audit:\n${lr.probe.securityHeaders.map(h => `  ${h}`).join('\n')}`);
  if (Object.keys(lr.probe.headers).length) {
    sections.push(`Raw Response Headers:\n${Object.entries(lr.probe.headers).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`);
  }

  // DNS
  sections.push('\n## DNS RECORDS (via Cloudflare DoH, verified now)');
  if (lr.dns.dnsProvider) sections.push(`DNS Provider: ${lr.dns.dnsProvider}`);
  if (lr.dns.nsRecords.length) sections.push(`NS Records: ${lr.dns.nsRecords.join(', ')}`);
  if (lr.dns.aRecords.length) sections.push(`A Records: ${lr.dns.aRecords.join(', ')}`);
  if (lr.dns.cnameRecords.length) sections.push(`CNAME Records: ${lr.dns.cnameRecords.join(', ')}`);
  if (lr.dns.mxRecords.length) sections.push(`MX Records: ${lr.dns.mxRecords.join(', ')}`);

  // SEC filings
  if (lr.sec.filings) {
    sections.push('\n## SEC EDGAR FILINGS (public company data)');
    sections.push(lr.sec.filings);
  }

  // News
  if (lr.news) {
    sections.push('\n## RECENT NEWS (from Google News RSS, real headlines)');
    sections.push(lr.news);
  }

  // Intricately / HG Cloud Dynamics
  if (lr.intricately.raw) {
    sections.push('\n## INTRICATELY / HG CLOUD DYNAMICS (live API data — verified IT spend & product deployments)');
    sections.push(lr.intricately.raw);
  }

  // Funding / Investment
  if (lr.funding) {
    sections.push('\n## FUNDING & INVESTMENT DATA');
    sections.push(lr.funding);
  }

  // Cloudflare Radar
  if (lr.radar.rank || lr.radar.categories.length || lr.radar.trafficTrend) {
    sections.push('\n## CLOUDFLARE RADAR DATA (Cloudflare\'s own internet intelligence)');
    if (lr.radar.rank) sections.push(`Domain Popularity: ${lr.radar.rank}`);
    if (lr.radar.categories.length) sections.push(`Category Rankings: ${lr.radar.categories.join(', ')}`);
    if (lr.radar.trafficTrend) sections.push(`HTTP Protocol Mix: ${lr.radar.trafficTrend}`);
    sections.push(`Radar Page: https://radar.cloudflare.com/domains/domain/${lr.dns.aRecords.length ? '' : ''}${lr.website.title ? '' : ''}`);
  }

  sections.push('\n=== END LIVE RESEARCH DATA ===');
  return sections.join('\n');
}

// ── AI: Research Engine ────────────────────────────────────────────
const RESEARCH_MODEL = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b'; // Fixed model ID
const EMAIL_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FAST_MODEL = '@cf/meta/llama-3.1-8b-instruct';

async function runAI(ai: Ai, model: string, system: string, user: string): Promise<string> {
  // Trim context if too long (DeepSeek R1 has smaller context than Llama)
  const maxCtx = model.includes('deepseek') ? 12000 : 20000;
  if (user.length > maxCtx) user = user.slice(0, maxCtx) + '\n\n[Context trimmed for length]';

  try {
    const response = await ai.run(model as any, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });
    const result = (response as any).response || '';
    if (result) return result;
    throw new Error('Empty response from ' + model);
  } catch (e: any) {
    // Fallback to Llama 3.3 if primary model fails
    if (model !== EMAIL_MODEL) {
      console.log(`Model ${model} failed: ${e.message}. Falling back to ${EMAIL_MODEL}`);
      try {
        const fallback = await ai.run(EMAIL_MODEL as any, {
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user.slice(0, 20000) },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        });
        return (fallback as any).response || '';
      } catch (_) {}
    }
    throw e;
  }
}

function buildAccountContext(account: any): string {
  return `
ACCOUNT: ${account.account_name}
Website: ${account.website || 'N/A'}
Industry: ${account.industry || 'N/A'}
Status: ${account.account_status || 'N/A'} | Segment: ${account.account_segment || 'N/A'}
Location: ${[account.billing_city, account.billing_state, account.billing_country].filter(Boolean).join(', ')}
Revenue: ${account.revenue_bucket || 'N/A'} | Annual: $${account.annual_revenue?.toLocaleString() || 'N/A'}
Employees: ${account.employees || 'N/A'} (${account.employee_bucket || 'N/A'})
Current Cloudflare MRR: $${account.current_monthly_fee?.toLocaleString() || '0'}
SAM: $${account.sam?.toLocaleString() || 'N/A'}
LinkedIn: ${account.linkedin_url || 'N/A'} (${account.linkedin_followers?.toLocaleString() || '0'} followers)

IT INFRASTRUCTURE:
Total Monthly IT Spend: $${account.total_it_spend?.toLocaleString() || 'N/A'} (${account.total_it_spend_tier || 'N/A'})
Spend Potential: ${account.spend_potential || 'N/A'}

Cloud Hosting: ${account.cloud_hosting_primary || 'None'} ($${account.cloud_hosting_spend?.toLocaleString() || '0'}/mo)
  Products: ${account.cloud_hosting_products || 'None'}

Data Center: ${account.data_center_primary || 'None'} ($${account.data_center_spend?.toLocaleString() || '0'}/mo)
  Products: ${account.data_center_products || 'None'}

Security: ${account.security_primary || 'None'} ($${account.security_spend?.toLocaleString() || '0'}/mo)
  Products: ${account.security_products || 'None'}

CDN: ${account.cdn_primary || 'None'} ($${account.cdn_spend?.toLocaleString() || '0'}/mo)
  Products: ${account.cdn_products || 'None'}

DNS: ${account.dns_primary || 'None'} ($${account.dns_spend?.toLocaleString() || '0'}/mo)
  Products: ${account.dns_products || 'None'}

Traffic Mgmt: ${account.traffic_mgmt_primary || 'None'} ($${account.traffic_mgmt_spend?.toLocaleString() || '0'}/mo)
APM: ${account.apm_products || 'None'}
SaaS: ${account.saas_products || 'None'}

TRAFFIC DISTRIBUTION:
NA: ${account.na_traffic ? (account.na_traffic * 100).toFixed(1) + '%' : 'N/A'}
EMEA: ${account.emea_traffic ? (account.emea_traffic * 100).toFixed(1) + '%' : 'N/A'}
APJ: ${account.apj_traffic ? (account.apj_traffic * 100).toFixed(1) + '%' : 'N/A'}
LATAM: ${account.latam_traffic ? (account.latam_traffic * 100).toFixed(1) + '%' : 'N/A'}

SALES ACTIVITY:
Total Opportunities: ${account.opportunities_total || 0}
Open Opportunities: ${account.opportunities_open || 0}
Closed Lost: ${account.opportunities_closed_lost || 0}
Last Activity: ${account.last_activity || 'N/A'}
Activities (30d): ${account.activities_last_30 || 0}
Customer Since: ${account.customer_acquisition_date || 'N/A'}
  `.trim();
}

app.post('/api/research/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const { type } = await c.req.json<{ type: string }>();

  const account = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_email = ?'
  ).bind(accountId, c.get("userEmail")).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  // Run live research in parallel with data preparation
  const domain = account.website || account.website_domain || '';
  const [liveData] = await Promise.all([
    runLiveResearch(String(domain), String(account.account_name), c.env.CF_API_TOKEN, c.env.CF_ACCOUNT_ID, c.env.BROWSER, c.env.INTRICATELY_API_KEY),
  ]);
  const liveCtx = formatLiveResearch(liveData);

  const ctx = buildAccountContext(account);
  const competitors = getCompetitorMapping(account);
  const competitorCtx = competitors.length > 0
    ? '\nCOMPETITOR-TO-CLOUDFLARE MAPPING:\n' + competitors.map(m =>
        `- ${m.competitor} (${m.category}) -> CF: ${m.cfProducts.join(', ')}\n  Pitch: ${m.pitch}`
      ).join('\n')
    : '\nNo direct competitor products detected.';

  let system = '';
  let prompt = '';
  let title = '';

  const sourceInstructions = `\nIMPORTANT: You have TWO data sources. Clearly distinguish them:
1. CRM DATA (from Salesforce/Intricately) — treat as estimates, may be dated
2. LIVE RESEARCH DATA (scraped/probed just now) — treat as verified ground truth
When the live data contradicts the CRM data (e.g., CDN provider differs), flag the discrepancy and trust the live data. Always note the source of each claim: [CRM], [Live Probe], [Website], [DNS], [News], [SEC].`;

  switch (type) {
    case 'company_overview':
      title = `Company Overview: ${account.account_name}`;
      system = `You are a senior sales intelligence analyst at Cloudflare. Produce a concise executive briefing on a target account. You have access to BOTH CRM data AND live research data (website scraping, DNS probes, HTTP header analysis, news, SEC filings). Cite your sources. Format with clear headers using markdown. Be specific with numbers.${sourceInstructions}`;
      prompt = `Analyze this account and produce an executive briefing:\n\nCRM DATA:\n${ctx}\n\n${liveCtx}\n\nCover:\n1. **Company Profile** — Who they are, what they do, their mission (USE the website About page text and meta description from live data)\n2. **Verified Infrastructure** — Compare CRM data vs live probe results. Flag any discrepancies (e.g., CRM says CDN is X but live headers show Y)\n3. **Security Posture** — Analyze the security headers audit from the live probe. Identify missing headers as gaps.\n4. **Traffic Footprint** — Geographic distribution and implications\n5. **Recent News & Market Context** — Summarize any recent headlines found. What do they tell us about the company's priorities?\n6. **SEC Filings** — If found, summarize relevance. If not found, skip this section entirely.\n7. **Growth Signals** — Revenue, headcount, hiring signals (from careers page), digital presence\n8. **Key Risks & Recommendations**\n\nCite [Source] for every claim.`;
      break;

    case 'competitive_analysis':
      title = `Competitive Analysis: ${account.account_name}`;
      system = `You are a competitive intelligence analyst at Cloudflare. You have access to CRM estimates AND live infrastructure probes (DNS records, HTTP headers, website analysis). When live data reveals different vendors than CRM data, trust the live data and flag the discrepancy.${sourceInstructions}`;
      prompt = `Analyze competitive landscape and build displacement strategy:\n\nCRM DATA:\n${ctx}\n${competitorCtx}\n\n${liveCtx}\n\nFor each competitor found (from BOTH CRM and live probe):\n1. Current Vendor & Data Source ([CRM estimate] vs [Live verified])\n2. Cloudflare Replacement Product(s)\n3. Key Differentiators\n4. Migration Complexity (Low/Medium/High)\n5. Estimated Savings\n\nIMPORTANT: The live DNS probe shows their actual NS records and the HTTP probe shows their actual CDN/server. Compare this to CRM data. If the live probe shows they're already on Cloudflare CDN but CRM says Akamai, note that.\n\nThen provide:\n- Priority displacement order (highest value, lowest effort first)\n- Consolidation play\n- Total addressable opportunity`;
      break;

    case 'cf_positioning':
      title = `Cloudflare Positioning: ${account.account_name}`;
      system = `You are a Cloudflare Solutions Architect. You have access to the company's actual website content (their own words about their mission/vision), live infrastructure data, and CRM estimates. Use their own language and priorities to position Cloudflare products.${sourceInstructions}`;
      prompt = `Create a Cloudflare product positioning strategy:\n\nCRM DATA:\n${ctx}\n${competitorCtx}\n\n${liveCtx}\n\nUSE THE COMPANY'S OWN WORDS from their website to frame positioning. If they talk about "speed" or "customer experience" on their site, lead with CDN/performance. If they talk about "security" or "trust", lead with WAF/Zero Trust.\n\nStructure:\n1. **IMMEDIATE WINS** (deploy in < 30 days)\n   - For each: CF Product, Business Problem (in THEIR language from their website), Quantified Value, Evidence from live data\n2. **STRATEGIC PLAYS** (90-day roadmap)\n   - Map to their company vision (from About page)\n3. **PLATFORM VISION** (Cloudflare Everywhere)\n   - Connect to their likely board-level priorities\n4. **Security Gap Analysis** (from live security headers audit)\n   - List every missing security header found in the probe and the specific CF product that addresses it\n\nEnd with deal structure and pricing approach.`;
      break;

    case 'quarterly_intel':
      title = `Earnings & Market Intel: ${account.account_name}`;
      system = `You are a senior financial analyst creating an earnings-aligned intelligence briefing. You have access to live news headlines, SEC filing data, the company's own website content, and infrastructure probes. Ground every claim in actual data.${sourceInstructions}`;
      prompt = `Generate an earnings-aligned quarterly intelligence briefing:\n\nCRM DATA:\n${ctx}\n${competitorCtx}\n\n${liveCtx}\n\n## 1. COMPANY IN THEIR OWN WORDS\nSummarize what their website says about their mission, products, and priorities. Quote directly from the scraped content.\n\n## 2. RECENT NEWS ANALYSIS\nAnalyze each recent headline found. What do these stories tell us about the company's current priorities, challenges, and opportunities?\n\n## 3. EARNINGS & FINANCIAL CONTEXT\nIf SEC filings were found, discuss. If not, note they're likely private and infer financial priorities from their scale (${account.revenue_bucket}) and industry (${account.industry}).\n\n## 4. VERIFIED INFRASTRUCTURE STATUS\nCompare what the CRM says vs what live probes found. Note any changes or discrepancies — these could be buying signals (e.g., they recently switched CDN providers).\n\n## 5. COST OF INACTION\nQuantify using real spend data: CDN ($${account.cdn_spend?.toLocaleString() || '0'}/mo on ${account.cdn_primary}), Security ($${account.security_spend?.toLocaleString() || '0'}/mo), DNS ($${account.dns_spend?.toLocaleString() || '0'}/mo). Include security header gaps from probe.\n\n## 6. BUYING SIGNALS\nCombine CRM activity data, live infrastructure state, news, and hiring signals from careers page.\n\n## 7. 90-DAY ENGAGEMENT PLAN\nSpecific weekly actions grounded in the data above.`;
      break;

    default:
      return c.json({ error: 'Invalid research type' }, 400);
  }

  const content = await runAI(c.env.AI, RESEARCH_MODEL, system, prompt);

  await c.env.DB.prepare(
    'INSERT INTO research_reports (account_id, report_type, title, content, user_email) VALUES (?, ?, ?, ?, ?)'
  ).bind(accountId, type, title, content, c.get('userEmail')).run();

  return c.json({ title, content, type });
});

app.get('/api/research/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const reports = await c.env.DB.prepare(
    'SELECT * FROM research_reports WHERE account_id = ? AND user_email = ? ORDER BY created_at DESC'
  ).bind(accountId, c.get('userEmail')).all();
  return c.json(reports.results);
});

// ── AI: Persona Messaging ──────────────────────────────────────────
const PERSONA_CONFIGS: Record<string, {
  name: string;
  title: string;
  description: string;
  tone: string;
  focus: string;
  messageTypes: { id: string; label: string }[];
}> = {
  bdr: {
    name: 'BDR',
    title: 'Business Development Representative',
    description: 'Cold outreach specialist focused on opening doors and booking meetings.',
    tone: 'Energetic, curious, concise, value-driven. Avoids jargon. Leads with insight, not product.',
    focus: 'Pattern interrupts, competitive intelligence hooks, industry-specific pain points, personalization.',
    messageTypes: [
      { id: 'cold_email', label: 'Cold Email' },
      { id: 'linkedin_message', label: 'LinkedIn Message' },
      { id: 'call_script', label: 'Cold Call Script' },
      { id: 'follow_up', label: 'Follow-Up Sequence' },
      { id: 'displacement_outreach', label: 'Displacement Outreach' },
    ],
  },
  ae: {
    name: 'AE',
    title: 'Account Executive',
    description: 'Deal driver focused on building business cases and closing.',
    tone: 'Consultative, strategic, ROI-focused. Speaks the language of business outcomes.',
    focus: 'TCO analysis, competitive displacement, executive alignment, multi-threading.',
    messageTypes: [
      { id: 'executive_email', label: 'Executive Email' },
      { id: 'proposal_summary', label: 'Proposal Summary' },
      { id: 'roi_framework', label: 'ROI / Business Case' },
      { id: 'champion_enablement', label: 'Champion Enablement' },
      { id: 'displacement_proposal', label: 'Displacement Proposal' },
    ],
  },
  csm: {
    name: 'CSM',
    title: 'Customer Success Manager',
    description: 'Relationship owner focused on adoption, expansion, and retention.',
    tone: 'Supportive, proactive, data-driven. Celebrates wins, surfaces opportunities.',
    focus: 'Usage optimization, expansion plays, QBR preparation, churn prevention.',
    messageTypes: [
      { id: 'qbr_deck', label: 'QBR Talking Points' },
      { id: 'expansion_email', label: 'Expansion Pitch' },
      { id: 'health_check', label: 'Account Health Check' },
      { id: 'renewal_prep', label: 'Renewal Preparation' },
      { id: 'consolidation_pitch', label: 'Vendor Consolidation Pitch' },
    ],
  },
  se: {
    name: 'SE',
    title: 'Solutions Engineer',
    description: 'Technical advisor focused on architecture, migration, and proof of value.',
    tone: 'Technical, precise, architecture-focused. Uses specifics over generalities.',
    focus: 'Technical validation, migration planning, integration design, POC scoping.',
    messageTypes: [
      { id: 'technical_brief', label: 'Technical Brief' },
      { id: 'migration_plan', label: 'Migration Plan' },
      { id: 'architecture_review', label: 'Architecture Review' },
      { id: 'poc_proposal', label: 'POC Proposal' },
      { id: 'displacement_technical', label: 'Technical Displacement Brief' },
    ],
  },
  vp_sales: {
    name: 'VP Sales',
    title: 'VP of Sales',
    description: 'Executive sponsor focused on strategic alignment and C-level engagement.',
    tone: 'Executive, strategic, visionary. Speaks to transformation, not features. Peer-to-peer with CxOs.',
    focus: 'Digital transformation, board-level concerns, strategic partnerships, market positioning.',
    messageTypes: [
      { id: 'executive_brief', label: 'Executive Brief' },
      { id: 'cxo_outreach', label: 'CxO Outreach' },
      { id: 'strategic_proposal', label: 'Strategic Proposal' },
      { id: 'board_talking_points', label: 'Board Talking Points' },
      { id: 'platform_consolidation', label: 'Platform Consolidation Case' },
    ],
  },
};

app.get('/api/personas', (c) => c.json(PERSONA_CONFIGS));

// ── Pre-fetch live probes (called when Email Composer opens) ───────
app.post('/api/live-probe/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(accountId, c.get("userEmail")).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const domain = String(account.website || account.website_domain || '');
  const name = String(account.account_name);

  // Run all probes in parallel, catch individually so partial results still return
  const results: Record<string, { status: string; data: any; ms: number }> = {};

  const probes = [
    { key: 'website', label: 'Website Scraper', fn: () => scrapeWebsite(domain, c.env.BROWSER) },
    { key: 'headers', label: 'HTTP Header Probe', fn: () => probeDomain(domain) },
    { key: 'dns', label: 'DNS Records', fn: () => lookupDNS(domain) },
    { key: 'sec', label: 'SEC EDGAR Filings', fn: () => fetchSECFilings(name) },
    { key: 'news', label: 'News Search', fn: () => searchNews(name) },
    { key: 'funding', label: 'Funding Search', fn: () => searchFunding(name, domain) },
    { key: 'intricately', label: 'Intricately / HG Data', fn: () => fetchIntricately(domain, c.env.INTRICATELY_API_KEY) },
    { key: 'radar', label: 'Cloudflare Radar', fn: () => fetchRadarData(domain, c.env.CF_API_TOKEN, c.env.CF_ACCOUNT_ID) },
  ];

  await Promise.all(probes.map(async (p) => {
    const start = Date.now();
    try {
      const data = await p.fn();
      const ms = Date.now() - start;
      // Determine if probe found useful data
      let hasData = false;
      if (p.key === 'website') hasData = !!(data as any).metaDescription || !!(data as any).aboutText || !!(data as any).title;
      else if (p.key === 'headers') hasData = !!(data as any).cdnDetected || !!(data as any).serverInfo;
      else if (p.key === 'dns') hasData = (data as any).nsRecords?.length > 0;
      else if (p.key === 'sec') hasData = !!(data as any).filings;
      else if (p.key === 'news') hasData = !!(data as string);
      else if (p.key === 'funding') hasData = !!(data as string);
      else if (p.key === 'intricately') hasData = !!(data as any).raw;
      else if (p.key === 'radar') hasData = !!(data as any).rank;
      results[p.key] = { status: hasData ? 'found' : 'empty', data, ms };
    } catch (e: any) {
      results[p.key] = { status: 'error', data: e.message, ms: Date.now() - start };
    }
  }));

  // Build summary lines for the UI
  const summary = probes.map(p => {
    const r = results[p.key];
    let detail = '';
    if (r.status === 'found') {
      if (p.key === 'website') {
        const wd = results.website.data as any;
        const parts = [];
        if (wd.metaDescription) parts.push(wd.metaDescription.slice(0, 60));
        else if (wd.title) parts.push(wd.title);
        if (wd.aboutText) parts.push('+about');
        if (wd.investorRelations) parts.push('+investors');
        if (wd.pressReleases) parts.push('+press');
        if (wd.careers) parts.push('+careers');
        if (wd.techSignals?.length) parts.push(wd.techSignals.length + ' tech signals');
        detail = parts.join(' | ') || 'Content found';
      }
      else if (p.key === 'headers') detail = (results.headers.data as any).cdnDetected || `Server: ${(results.headers.data as any).serverInfo}`;
      else if (p.key === 'dns') detail = (results.dns.data as any).dnsProvider || `${(results.dns.data as any).nsRecords?.length || 0} NS records`;
      else if (p.key === 'sec') detail = (results.sec.data as any).filings?.split('\n')[0]?.slice(0, 80) || 'Filings found';
      else if (p.key === 'news') { const lines = (results.news.data as string).split('\n').filter(Boolean); detail = `${lines.length} headlines found`; }
      else if (p.key === 'funding') { const lines = (results.funding?.data as string || '').split('\n').filter(Boolean); detail = lines.length ? `${lines.length} funding signals` : ''; }
      else if (p.key === 'intricately') { const d = results.intricately?.data as any; detail = d?.spend ? `${d.company}: ${d.spend}` : (d?.raw ? d.company || 'Data found' : ''); }
      else if (p.key === 'radar') detail = (results.radar.data as any).rank || 'Data found';
    }
    return { key: p.key, label: p.label, status: r.status, detail, ms: r.ms };
  });

  return c.json({ summary, probeData: results, accountId: Number(accountId) });
});

app.post('/api/messaging/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const { persona, messageType, customContext, prefetchedProbeData } = await c.req.json<{
    persona: string; messageType: string; customContext?: string; prefetchedProbeData?: any;
  }>();

  const personaConfig = PERSONA_CONFIGS[persona];
  if (!personaConfig) return c.json({ error: 'Invalid persona' }, 400);

  const account = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_email = ?'
  ).bind(accountId, c.get("userEmail")).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  // Use pre-fetched data if available, otherwise run live probes
  let liveData: LiveResearchResult;
  if (prefetchedProbeData) {
    liveData = {
      website: prefetchedProbeData.website?.data || { aboutText:'', metaDescription:'', title:'', careers:'', techSignals:[] },
      probe: prefetchedProbeData.headers?.data || { headers:{}, serverInfo:'', cdnDetected:'', securityHeaders:[], tlsInfo:'' },
      dns: prefetchedProbeData.dns?.data || { aRecords:[], cnameRecords:[], mxRecords:[], nsRecords:[], dnsProvider:'' },
      sec: prefetchedProbeData.sec?.data || { filings:'', recentFilingText:'' },
      news: prefetchedProbeData.news?.data || '',
      funding: prefetchedProbeData.funding?.data || '',
      intricately: prefetchedProbeData.intricately?.data || { company:'', spend:'', services:[], products:[], traffic:'', spendPotential:'', description:'', raw:'' },
      radar: prefetchedProbeData.radar?.data || { rank:'', categories:[], trafficTrend:'' },
    };
  } else {
    const domain = String(account.website || account.website_domain || '');
    liveData = await runLiveResearch(domain, String(account.account_name), c.env.CF_API_TOKEN, c.env.CF_ACCOUNT_ID, c.env.BROWSER, c.env.INTRICATELY_API_KEY);
  }
  const liveCtx = formatLiveResearch(liveData);

  const ctx = buildAccountContext(account);
  const competitors = getCompetitorMapping(account);
  const competitorCtx = competitors.length > 0
    ? '\nKEY COMPETITORS TO DISPLACE:\n' + competitors.map(m =>
        `- ${m.competitor} -> Cloudflare ${m.cfProducts[0]}: ${m.pitch.split('.')[0]}`
      ).join('\n')
    : '';

  const msgTypeLabel = personaConfig.messageTypes.find(m => m.id === messageType)?.label || messageType;
  const isExistingCustomer = account.account_status === 'Active';

  // Calculate cost-of-inaction data points
  const cdnSpend = account.cdn_spend || 0;
  const secSpend = account.security_spend || 0;
  const dnsSpend = account.dns_spend || 0;
  const totalDisplaceable = cdnSpend + secSpend + dnsSpend;
  const estimatedSavings = Math.round(totalDisplaceable * 0.3); // ~30% savings estimate
  const annualWaste = estimatedSavings * 12;
  const latencyPenalty = account.cdn_primary && !String(account.cdn_primary).toLowerCase().includes('cloudflare');
  const securityGap = account.security_products && !String(account.security_products).toLowerCase().includes('cloudflare');

  const costOfInactionCtx = `
COST OF INACTION ANALYSIS:
- Current displaceable spend: $${totalDisplaceable.toLocaleString()}/month across CDN ($${cdnSpend.toLocaleString()}), Security ($${secSpend.toLocaleString()}), DNS ($${dnsSpend.toLocaleString()})
- Estimated annual savings with Cloudflare consolidation: $${annualWaste.toLocaleString()}/year (~30% reduction through platform consolidation)
- ${latencyPenalty ? `PERFORMANCE RISK: Using ${account.cdn_primary} as CDN — lacks Cloudflare's 330+ city network. Every 100ms of latency costs 1% of revenue (Google/Amazon research). For a ${account.revenue_bucket || 'significant revenue'} company, this is material.` : 'Already on Cloudflare CDN — good foundation.'}
- ${securityGap ? `SECURITY RISK: Primary security is ${account.security_primary || 'unknown'} — point solution, not integrated with CDN/DNS. Gap between security and performance layers = increased attack surface. Average data breach cost: $4.45M (IBM 2023). DDoS downtime costs $5,600/minute (Gartner).` : 'Cloudflare security in place — assess expansion.'}
- VENDOR SPRAWL COST: Managing ${(() => { const prods = [account.cdn_products, account.security_products, account.dns_products, account.cloud_hosting_products].filter(Boolean).join(';').split(';').filter(Boolean); return prods.length; })()} separate IT products = operational overhead, integration tax, and slower incident response
- OPPORTUNITY COST: Every quarter without consolidation is another quarter of: fragmented visibility, slower deployments, higher operational burden, and vendor management overhead`;

  // Build competitive displacement context from full product catalog
  const isDisplacementMsg = ['displacement_outreach','displacement_proposal','consolidation_pitch','displacement_technical','platform_consolidation'].includes(messageType);
  const allProductsStr = [account.cdn_products, account.security_products, account.dns_products, account.cloud_hosting_products, account.data_center_products, account.apm_products].filter(Boolean).join(';').toLowerCase();

  const displacementTargets: { competitor: string; category: string; cfProducts: string; cfEdge: string; spend: string }[] = [];
  for (const [catKey, cat] of Object.entries(CF_PRODUCT_CATALOG)) {
    for (const comp of cat.competitors) {
      if (allProductsStr.includes(comp.key) || allProductsStr.includes(comp.name.toLowerCase())) {
        const cfProds = cat.products.slice(0, 3).map(p => p.name).join(', ');
        const spendMap: Record<string, number> = { cdn: cdnSpend, waf: secSpend, ddos: secSpend, bot: secSpend, zerotrust: secSpend, email: 0, dns: dnsSpend, compute: 0, network: 0, performance: 0, media: 0, registrar: 0 };
        displacementTargets.push({
          competitor: comp.name,
          category: cat.category,
          cfProducts: cfProds,
          cfEdge: cat.products[0]?.desc || '',
          spend: `$${(spendMap[catKey] || 0).toLocaleString()}/mo`,
        });
      }
    }
  }

  const displacementCtx = displacementTargets.length > 0 ? `
COMPETITIVE DISPLACEMENT MAP (vendor-by-vendor):
${displacementTargets.map(d => `
DISPLACE: ${d.competitor} (${d.category}) — current spend: ${d.spend}
  -> REPLACE WITH: ${d.cfProducts}
  -> CLOUDFLARE EDGE: ${d.cfEdge}
  -> WHY SWITCH: Cloudflare runs the world's largest global network (330+ cities, 100+ Tbps capacity). Single platform = one dashboard, one vendor, one invoice. No bandwidth charges. Integrated security on every request with zero performance penalty. Sub-50ms global latency. 100% uptime SLA on enterprise. Zero egress fees on R2. 0ms cold starts on Workers.`).join('\n')}

CLOUDFLARE PLATFORM ADVANTAGES OVER ALL COMPETITORS:
- Network: 330+ cities, 13,000+ interconnections, 100+ Tbps capacity — larger than Akamai, CloudFront, Fastly combined
- Pricing: Flat-rate, no bandwidth charges, no surge pricing, no egress fees (R2)
- Speed: Fastest DNS (sub-10ms), fastest CDN (independent benchmarks), 0ms cold starts (Workers)
- Security: Integrated L3/L4/L7 DDoS (unmetered), WAF, Bot Management on every request — no performance penalty
- Platform: CDN + Security + Zero Trust + DNS + Compute + Storage on ONE platform — consolidate 5-10 point solutions
- Innovation: Fastest shipping velocity in infrastructure (Birthday Week, GA Week, Security Week deliver dozens of features quarterly)
- AI: Workers AI runs inference at the edge, Vectorize for vector search, AI Gateway for LLM management
- Analyst recognition: Gartner Magic Quadrant Leader (SSE), Forrester Wave Leader (WAF, DDoS, CDN), IDC Leader (Zero Trust)` : '';

  const system = `You are writing as a ${personaConfig.title} at Cloudflare.

PERSONA: ${personaConfig.name} - ${personaConfig.description}
TONE: ${personaConfig.tone}
FOCUS: ${personaConfig.focus}

CRITICAL RULES:
- Never mention that you're an AI or that you're analyzing data
- Write as if you are the actual ${personaConfig.name} who has done their homework on this company
- Be SPECIFIC — reference the company's actual tech stack, spend numbers, and competitive situation
- ${isExistingCustomer ? 'This is an EXISTING Cloudflare customer. Reference the relationship. Focus on EXPANSION and deeper adoption, not acquisition.' : 'This is a PROSPECT. Focus on opening the door with sharp insight that demonstrates you understand their world.'}
- ALWAYS include a "Cost of Inaction" section — quantify what staying on the current path costs them in dollars, risk, and competitive disadvantage. Make it urgent but not fear-mongering. Use specific numbers from their data.
- Align messaging to the company's likely VISION based on their industry and scale — frame Cloudflare as an accelerator of their strategic objectives, not just a vendor swap
- Reference likely EARNINGS CALL THEMES for their industry: digital transformation, cost optimization, security posture, AI readiness, operational efficiency, customer experience
- Cloudflare products: CDN, Argo Smart Routing, WAF, DDoS Protection, Bot Management, Zero Trust (Access, Gateway, WARP, Browser Isolation), Workers (edge compute), R2 (zero-egress storage), D1, Pages, DNS, Magic Transit, Magic WAN, Stream, Images, Email Security, API Shield, Page Shield, Zaraz, Observatory, Cache Reserve, Waiting Room
- Make it READY TO SEND — professional, polished, no placeholders. The rep should be able to copy-paste and hit send.
- ALWAYS include a "Resources" or "Learn More" section at the end of the email with 3-5 hyperlinked resources (product pages, case studies, whitepapers, analyst reports) relevant to the products you are recommending. Format them as clickable markdown links. Choose the MOST relevant resources from the list provided.
- ABSOLUTE OUTPUT RULES: NEVER include internal notes, system text, or data-gap indicators in the email. No "N/A", "No data found", "data not available", "unknown", "not configured", "no public data". If a data point is missing, skip it entirely — do not mention its absence. Never reference "CRM data", "live probe", "scraped data", "AI", or any tooling. The email must read as a polished message from a real human who personally researched the company.`;

  const resourcesCtx = getResourcesForAccount(account);

  // Build a concise website quote for the opening hook
  const websiteQuote = liveData.website.metaDescription
    ? `\nCOMPANY'S OWN DESCRIPTION (from their website): "${liveData.website.metaDescription}"`
    : (liveData.website.title ? `\nCOMPANY WEBSITE TITLE: "${liveData.website.title}"` : '');
  const newsContext = liveData.news
    ? `\nRECENT NEWS HEADLINES:\n${liveData.news}`
    : '';
  const verifiedInfra = liveData.probe.cdnDetected
    ? `\nVERIFIED CDN (live probe): ${liveData.probe.cdnDetected}`
    : '';
  const verifiedDNS = liveData.dns.dnsProvider
    ? `\nVERIFIED DNS (live probe): ${liveData.dns.dnsProvider}`
    : '';
  const securityGaps = liveData.probe.securityHeaders.filter(h => h.includes('MISSING'));
  const secGapCtx = securityGaps.length
    ? `\nMISSING SECURITY HEADERS (verified via live HTTP probe): ${securityGaps.map(h => h.replace(': MISSING', '')).join(', ')}`
    : '';

  const prompt = `Generate a ${msgTypeLabel} for this account:

CRM DATA:
${ctx}
${competitorCtx}
${costOfInactionCtx}
${displacementCtx}
${websiteQuote}
${verifiedInfra}
${verifiedDNS}
${secGapCtx}
${newsContext}
${resourcesCtx}
${customContext ? `\nADDITIONAL CONTEXT FROM REP:\n${customContext}` : ''}

${isDisplacementMsg ? `THIS IS A DISPLACEMENT MESSAGE. The PRIMARY goal is to convince the recipient to replace their current vendors with Cloudflare. Structure as follows:

1. **Opening** — Reference their current vendor by name (from verified probes or CRM data) and acknowledge it's a known product. Show respect, then pivot to why the landscape has changed.
2. **The Shift** — Explain why companies in their industry are consolidating from point solutions to platform plays. Cite specific Cloudflare advantages from the DISPLACEMENT MAP above. Use real numbers: 330+ cities, 100+ Tbps, zero egress, flat-rate pricing.
3. **Vendor-by-Vendor Displacement** — For EACH vendor detected in their stack, write a dedicated paragraph explaining:
   - What they currently use and approximate spend
   - The specific Cloudflare product(s) that replace it
   - Cloudflare's concrete edge (performance benchmark, pricing advantage, integration benefit)
   - What they gain by switching (not just feature parity — what NEW capability they unlock)
4. **Consolidation ROI** — Quantify the total value of consolidating N vendors into Cloudflare: reduced operational overhead, single dashboard, unified analytics, faster incident response, one vendor to manage. Include the cost-of-inaction numbers.
5. **Proof Points** — Reference 2-3 Cloudflare analyst recognitions (Gartner SSE Leader, Forrester WAF Leader, etc.) and link to relevant case studies.
6. **Resources** — Include 4-6 links: product pages for each displacement target, plus a case study and the Cloudflare network page.
7. **CTA** — Propose a specific displacement workshop or POC scoped to their highest-spend vendor.

` : `STRUCTURE THE MESSAGE AS FOLLOWS:
1. **Opening Hook** — Use the company's OWN WORDS from their website description or a recent news headline to show you've done real research. Do NOT use generic industry platitudes. Reference something SPECIFIC and verifiable.
2. **Value Proposition** — Connect specific Cloudflare capabilities to THEIR stated business priorities (from their website/news). Frame it around their company's vision, not feature lists.
3. **Competitive Insight** — Reference their VERIFIED infrastructure (from live probes) — e.g., "I noticed your site is currently served via [verified CDN]" or "your DNS is hosted on [verified DNS provider]". This is much more credible than guessing.
4. **Security Gap Alert** — If missing security headers were found in the live probe, tactfully mention this as a finding from a routine technical review. Position specific CF products (WAF, Page Shield, etc.) to address each gap.`}
5. **Cost of Inaction** — Quantify: wasted spend ($${annualWaste.toLocaleString()}/yr), performance penalties, security exposure (cite the missing headers), operational overhead. Make it urgent and data-backed.
6. **Recommended Resources** — 3-5 clickable links: format as [Title](URL) with a one-line description of relevance to THEIR situation. Choose from the resource list provided.
7. **Clear CTA** — Specific next step appropriate for the ${personaConfig.name} role

If this is an email, start with: Subject: [compelling subject line]

Make it feel like a real human wrote this after spending 2 hours researching the account. The tone should match exactly what a top-performing ${personaConfig.name} would write.`;


  const content = await runAI(c.env.AI, EMAIL_MODEL, system, prompt);

  const subject = content.match(/Subject:?\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || `${msgTypeLabel} - ${account.account_name}`;

  await c.env.DB.prepare(
    'INSERT INTO persona_messages (account_id, persona, message_type, subject, content, user_email) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(accountId, persona, messageType, subject, content, c.get('userEmail')).run();

  return c.json({ persona, messageType, subject, content });
});

app.get('/api/messaging/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const persona = c.req.query('persona');
  let query = 'SELECT * FROM persona_messages WHERE account_id = ? AND user_email = ?';
  const params: any[] = [accountId, c.get('userEmail')];
  if (persona) { query += ' AND persona = ?'; params.push(persona); }
  query += ' ORDER BY created_at DESC';
  const msgs = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(msgs.results);
});

// ── AI: Quick Enrichment (live research placeholder) ───────────────
app.post('/api/enrich/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const account = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_email = ?'
  ).bind(accountId, c.get("userEmail")).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const ctx = buildAccountContext(account);

  const system = `You are a business research analyst. Based on the company data provided, generate a brief research dossier that synthesizes what is publicly known about this company. Note where live web research would add additional value. Format in markdown.`;

  const prompt = `Generate a research dossier for ${account.account_name} (${account.website}):\n\n${ctx}\n\nSynthesize:\n1. What this company likely does based on industry + tech stack\n2. Their digital maturity based on IT spend patterns\n3. Key technology decisions visible from their stack\n4. Public signals to investigate (earnings, news, expansion)\n5. Recommended research queries for live enrichment`;

  const content = await runAI(c.env.AI, FAST_MODEL, system, prompt);
  return c.json({ content });
});

// ══════════════════════════════════════════════════════════════════
// COMPETITIVE INTELLIGENCE ENGINE
// ══════════════════════════════════════════════════════════════════

// Full Cloudflare product catalog with all competitors per product category
const CF_PRODUCT_CATALOG: Record<string, {
  category: string;
  icon: string;
  products: { name: string; url: string; desc: string }[];
  competitors: { key: string; name: string; urls: { label: string; url: string }[] }[];
}> = {
  cdn: {
    category: 'Content Delivery (CDN)',
    icon: '\u{26A1}',
    products: [
      { name: 'Cloudflare CDN', url: 'https://www.cloudflare.com/application-services/products/cdn/', desc: 'Global CDN, 330+ cities, flat-rate pricing' },
      { name: 'Argo Smart Routing', url: 'https://www.cloudflare.com/application-services/products/argo-smart-routing/', desc: 'Optimized routing, 30%+ latency reduction' },
      { name: 'Cache Reserve', url: 'https://www.cloudflare.com/application-services/products/cache-reserve/', desc: 'Persistent cache, higher hit ratios' },
      { name: 'Tiered Caching', url: 'https://www.cloudflare.com/application-services/products/cdn/', desc: 'Reduced origin load' },
      { name: 'China Network', url: 'https://www.cloudflare.com/network/china/', desc: 'China delivery via JD Cloud partnership' },
    ],
    competitors: [
      { key: 'akamai', name: 'Akamai', urls: [{ label: 'CDN', url: 'https://www.akamai.com/products/content-delivery-network' }, { label: 'Pricing', url: 'https://www.akamai.com/pricing' }] },
      { key: 'cloudfront', name: 'Amazon CloudFront', urls: [{ label: 'Product', url: 'https://aws.amazon.com/cloudfront/' }, { label: 'Pricing', url: 'https://aws.amazon.com/cloudfront/pricing/' }] },
      { key: 'fastly', name: 'Fastly', urls: [{ label: 'CDN', url: 'https://www.fastly.com/products/cdn' }, { label: 'Pricing', url: 'https://www.fastly.com/pricing' }] },
      { key: 'gcp-cdn', name: 'Google Cloud CDN', urls: [{ label: 'Product', url: 'https://cloud.google.com/cdn' }, { label: 'Pricing', url: 'https://cloud.google.com/cdn/pricing' }] },
      { key: 'azure-cdn', name: 'Azure CDN', urls: [{ label: 'Product', url: 'https://azure.microsoft.com/en-us/products/cdn' }] },
    ],
  },
  waf: {
    category: 'Web Application Firewall',
    icon: '\u{1F6E1}',
    products: [
      { name: 'Cloudflare WAF', url: 'https://www.cloudflare.com/application-services/products/waf/', desc: 'ML-powered WAF, managed rulesets' },
      { name: 'API Shield', url: 'https://www.cloudflare.com/application-services/products/api-gateway/', desc: 'API discovery, schema validation, rate limiting' },
      { name: 'Page Shield', url: 'https://www.cloudflare.com/application-services/products/page-shield/', desc: 'Client-side security, supply chain protection' },
      { name: 'Turnstile', url: 'https://www.cloudflare.com/products/turnstile/', desc: 'CAPTCHA replacement, privacy-first' },
    ],
    competitors: [
      { key: 'imperva-waf', name: 'Imperva WAF', urls: [{ label: 'WAF', url: 'https://www.imperva.com/products/web-application-firewall-waf/' }] },
      { key: 'aws-waf', name: 'AWS WAF', urls: [{ label: 'Product', url: 'https://aws.amazon.com/waf/' }, { label: 'Pricing', url: 'https://aws.amazon.com/waf/pricing/' }] },
      { key: 'akamai-waf', name: 'Akamai App & API Protector', urls: [{ label: 'Product', url: 'https://www.akamai.com/products/app-and-api-protector' }] },
      { key: 'f5', name: 'F5 Advanced WAF', urls: [{ label: 'Product', url: 'https://www.f5.com/products/security/advanced-waf' }] },
      { key: 'barracuda', name: 'Barracuda WAF', urls: [{ label: 'Product', url: 'https://www.barracuda.com/products/application-protection/web-application-firewall' }] },
    ],
  },
  ddos: {
    category: 'DDoS Protection',
    icon: '\u{1F6AB}',
    products: [
      { name: 'DDoS Protection', url: 'https://www.cloudflare.com/ddos/', desc: 'Unmetered L3/L4/L7 DDoS mitigation' },
      { name: 'Magic Transit', url: 'https://www.cloudflare.com/network-services/products/magic-transit/', desc: 'Network-layer DDoS for entire IP ranges' },
      { name: 'Spectrum', url: 'https://www.cloudflare.com/products/cloudflare-spectrum/', desc: 'DDoS for TCP/UDP applications' },
    ],
    competitors: [
      { key: 'akamai-ddos', name: 'Akamai Prolexic', urls: [{ label: 'Product', url: 'https://www.akamai.com/products/prolexic-solutions' }] },
      { key: 'aws-shield', name: 'AWS Shield', urls: [{ label: 'Product', url: 'https://aws.amazon.com/shield/' }, { label: 'Pricing', url: 'https://aws.amazon.com/shield/pricing/' }] },
      { key: 'imperva-ddos', name: 'Imperva DDoS', urls: [{ label: 'Product', url: 'https://www.imperva.com/products/ddos-protection-services/' }] },
      { key: 'radware', name: 'Radware DefensePro', urls: [{ label: 'Product', url: 'https://www.radware.com/products/defensepro/' }] },
    ],
  },
  bot: {
    category: 'Bot Management',
    icon: '\u{1F916}',
    products: [
      { name: 'Bot Management', url: 'https://www.cloudflare.com/application-services/products/bot-management/', desc: 'ML-based bot detection, JS fingerprinting' },
      { name: 'Turnstile', url: 'https://www.cloudflare.com/products/turnstile/', desc: 'Privacy-preserving challenge platform' },
    ],
    competitors: [
      { key: 'akamai-bot', name: 'Akamai Bot Manager', urls: [{ label: 'Product', url: 'https://www.akamai.com/products/bot-manager' }] },
      { key: 'datadome', name: 'DataDome', urls: [{ label: 'Product', url: 'https://datadome.co/products/' }] },
      { key: 'perimeterx', name: 'HUMAN (PerimeterX)', urls: [{ label: 'Product', url: 'https://www.humansecurity.com/products/human-bot-defender' }] },
    ],
  },
  zerotrust: {
    category: 'Zero Trust / SASE',
    icon: '\u{1F512}',
    products: [
      { name: 'Cloudflare Access', url: 'https://www.cloudflare.com/zero-trust/products/access/', desc: 'Identity-aware proxy, replace VPN' },
      { name: 'Cloudflare Gateway', url: 'https://www.cloudflare.com/zero-trust/products/gateway/', desc: 'Secure web gateway, DNS filtering' },
      { name: 'WARP Client', url: 'https://www.cloudflare.com/zero-trust/products/warp-enterprise/', desc: 'Device agent, WireGuard-based' },
      { name: 'Browser Isolation', url: 'https://www.cloudflare.com/zero-trust/products/remote-browser-isolation/', desc: 'Remote browser isolation' },
      { name: 'CASB', url: 'https://www.cloudflare.com/zero-trust/products/casb/', desc: 'SaaS security posture management' },
      { name: 'DLP', url: 'https://www.cloudflare.com/zero-trust/products/dlp/', desc: 'Data loss prevention' },
    ],
    competitors: [
      { key: 'zscaler', name: 'Zscaler', urls: [{ label: 'ZIA', url: 'https://www.zscaler.com/products/zscaler-internet-access' }, { label: 'ZPA', url: 'https://www.zscaler.com/products/zscaler-private-access' }] },
      { key: 'paloalto', name: 'Palo Alto Prisma', urls: [{ label: 'Prisma SASE', url: 'https://www.paloaltonetworks.com/sase' }, { label: 'Prisma Access', url: 'https://www.paloaltonetworks.com/prisma/access' }] },
      { key: 'netskope', name: 'Netskope', urls: [{ label: 'SSE', url: 'https://www.netskope.com/products/security-service-edge' }] },
      { key: 'cisco', name: 'Cisco Secure Access', urls: [{ label: 'Product', url: 'https://www.cisco.com/site/us/en/products/security/secure-access/index.html' }] },
    ],
  },
  email: {
    category: 'Email Security',
    icon: '\u{1F4E7}',
    products: [
      { name: 'Email Security', url: 'https://www.cloudflare.com/zero-trust/products/email-security/', desc: 'Anti-phishing, BEC protection' },
      { name: 'Email Routing', url: 'https://www.cloudflare.com/developer-platform/products/email-routing/', desc: 'Free email forwarding' },
    ],
    competitors: [
      { key: 'proofpoint', name: 'Proofpoint', urls: [{ label: 'Product', url: 'https://www.proofpoint.com/us/products/email-security-and-protection' }] },
      { key: 'mimecast', name: 'Mimecast', urls: [{ label: 'Product', url: 'https://www.mimecast.com/products/email-security/' }] },
      { key: 'abnormal', name: 'Abnormal Security', urls: [{ label: 'Product', url: 'https://abnormalsecurity.com/products' }] },
      { key: 'microsoft-defender', name: 'Microsoft Defender for O365', urls: [{ label: 'Product', url: 'https://www.microsoft.com/en-us/security/business/siem-and-xdr/microsoft-defender-office-365' }] },
    ],
  },
  dns: {
    category: 'DNS',
    icon: '\u{1F310}',
    products: [
      { name: 'Cloudflare DNS', url: 'https://www.cloudflare.com/application-services/products/dns/', desc: 'Fastest authoritative DNS, free DNSSEC' },
      { name: 'DNS Firewall', url: 'https://www.cloudflare.com/dns/dns-firewall/', desc: 'Enterprise DNS protection' },
      { name: 'Secondary DNS', url: 'https://www.cloudflare.com/dns/secondary-dns/', desc: 'Multi-provider DNS' },
      { name: '1.1.1.1 Resolver', url: 'https://1.1.1.1/', desc: 'Fastest public resolver' },
    ],
    competitors: [
      { key: 'route53', name: 'AWS Route 53', urls: [{ label: 'Product', url: 'https://aws.amazon.com/route53/' }, { label: 'Pricing', url: 'https://aws.amazon.com/route53/pricing/' }] },
      { key: 'akamai-dns', name: 'Akamai Edge DNS', urls: [{ label: 'Product', url: 'https://www.akamai.com/products/edge-dns' }] },
      { key: 'ns1', name: 'NS1 (IBM)', urls: [{ label: 'Product', url: 'https://ns1.com/products/managed-dns' }] },
      { key: 'google-dns', name: 'Google Cloud DNS', urls: [{ label: 'Product', url: 'https://cloud.google.com/dns' }] },
    ],
  },
  compute: {
    category: 'Edge Compute / Developer Platform',
    icon: '\u{1F4BB}',
    products: [
      { name: 'Workers', url: 'https://www.cloudflare.com/developer-platform/products/workers/', desc: 'Edge serverless, 0ms cold starts' },
      { name: 'Pages', url: 'https://www.cloudflare.com/developer-platform/products/pages/', desc: 'Full-stack web app hosting' },
      { name: 'R2', url: 'https://www.cloudflare.com/developer-platform/products/r2/', desc: 'S3-compatible, zero egress fees' },
      { name: 'D1', url: 'https://www.cloudflare.com/developer-platform/products/d1/', desc: 'Edge SQL database' },
      { name: 'Workers KV', url: 'https://www.cloudflare.com/developer-platform/products/workers-kv/', desc: 'Global key-value store' },
      { name: 'Durable Objects', url: 'https://www.cloudflare.com/developer-platform/products/durable-objects/', desc: 'Stateful edge compute' },
      { name: 'Queues', url: 'https://www.cloudflare.com/developer-platform/products/queues/', desc: 'Message queues' },
      { name: 'Workers AI', url: 'https://www.cloudflare.com/developer-platform/products/workers-ai/', desc: 'Inference at the edge' },
      { name: 'Vectorize', url: 'https://www.cloudflare.com/developer-platform/products/vectorize/', desc: 'Vector database' },
    ],
    competitors: [
      { key: 'lambda', name: 'AWS Lambda@Edge', urls: [{ label: 'Lambda', url: 'https://aws.amazon.com/lambda/' }, { label: 'Lambda@Edge', url: 'https://aws.amazon.com/lambda/edge/' }] },
      { key: 'vercel', name: 'Vercel', urls: [{ label: 'Platform', url: 'https://vercel.com/products' }, { label: 'Pricing', url: 'https://vercel.com/pricing' }] },
      { key: 'netlify', name: 'Netlify', urls: [{ label: 'Platform', url: 'https://www.netlify.com/platform/' }, { label: 'Pricing', url: 'https://www.netlify.com/pricing/' }] },
      { key: 'deno', name: 'Deno Deploy', urls: [{ label: 'Product', url: 'https://deno.com/deploy' }] },
      { key: 's3', name: 'AWS S3 (vs R2)', urls: [{ label: 'S3', url: 'https://aws.amazon.com/s3/' }, { label: 'Pricing', url: 'https://aws.amazon.com/s3/pricing/' }] },
    ],
  },
  network: {
    category: 'Network Services (Magic)',
    icon: '\u{1F5A7}',
    products: [
      { name: 'Magic Transit', url: 'https://www.cloudflare.com/network-services/products/magic-transit/', desc: 'BGP-based DDoS protection for networks' },
      { name: 'Magic WAN', url: 'https://www.cloudflare.com/network-services/products/magic-wan/', desc: 'Replace MPLS with Cloudflare backbone' },
      { name: 'Network Interconnect', url: 'https://www.cloudflare.com/network-services/products/network-interconnect/', desc: 'Private peering to Cloudflare' },
    ],
    competitors: [
      { key: 'mpls', name: 'Legacy MPLS (AT&T, Verizon)', urls: [{ label: 'AT&T SD-WAN', url: 'https://www.business.att.com/products/sd-wan.html' }] },
      { key: 'velo', name: 'VMware VeloCloud', urls: [{ label: 'Product', url: 'https://sase.vmware.com/' }] },
      { key: 'silver-peak', name: 'Aruba EdgeConnect', urls: [{ label: 'Product', url: 'https://www.arubanetworks.com/products/sd-wan/' }] },
    ],
  },
  performance: {
    category: 'Performance & Optimization',
    icon: '\u{1F680}',
    products: [
      { name: 'Speed Brain', url: 'https://www.cloudflare.com/application-services/products/website-optimization/', desc: 'Predictive pre-fetching' },
      { name: 'Zaraz', url: 'https://www.cloudflare.com/application-services/products/zaraz/', desc: 'Server-side tag manager' },
      { name: 'Observatory', url: 'https://www.cloudflare.com/application-services/products/website-optimization/', desc: 'Performance monitoring' },
      { name: 'Web Analytics', url: 'https://www.cloudflare.com/web-analytics/', desc: 'Privacy-first analytics' },
      { name: 'Early Hints', url: 'https://developers.cloudflare.com/cache/about/early-hints/', desc: '103 Early Hints' },
      { name: 'Waiting Room', url: 'https://www.cloudflare.com/application-services/products/waiting-room/', desc: 'Virtual queue for traffic spikes' },
    ],
    competitors: [
      { key: 'google-tag', name: 'Google Tag Manager', urls: [{ label: 'Product', url: 'https://tagmanager.google.com/' }] },
      { key: 'segment', name: 'Twilio Segment', urls: [{ label: 'Product', url: 'https://segment.com/product/' }, { label: 'Pricing', url: 'https://segment.com/pricing/' }] },
      { key: 'datadog-rum', name: 'Datadog RUM', urls: [{ label: 'Product', url: 'https://www.datadoghq.com/product/real-user-monitoring/' }] },
      { key: 'newrelic', name: 'New Relic', urls: [{ label: 'Product', url: 'https://newrelic.com/platform' }, { label: 'Pricing', url: 'https://newrelic.com/pricing' }] },
    ],
  },
  media: {
    category: 'Media & Streaming',
    icon: '\u{1F3AC}',
    products: [
      { name: 'Cloudflare Stream', url: 'https://www.cloudflare.com/developer-platform/products/cloudflare-stream/', desc: 'Video encoding + delivery + player' },
      { name: 'Cloudflare Images', url: 'https://www.cloudflare.com/developer-platform/products/cloudflare-images/', desc: 'Image storage, resize, optimization' },
      { name: 'Image Resizing', url: 'https://developers.cloudflare.com/images/', desc: 'On-the-fly transforms' },
    ],
    competitors: [
      { key: 'mux', name: 'Mux', urls: [{ label: 'Product', url: 'https://www.mux.com/products' }, { label: 'Pricing', url: 'https://www.mux.com/pricing/video' }] },
      { key: 'cloudinary', name: 'Cloudinary', urls: [{ label: 'Product', url: 'https://cloudinary.com/products' }, { label: 'Pricing', url: 'https://cloudinary.com/pricing' }] },
      { key: 'imgix', name: 'imgix', urls: [{ label: 'Product', url: 'https://imgix.com/' }, { label: 'Pricing', url: 'https://imgix.com/pricing' }] },
    ],
  },
  registrar: {
    category: 'Domain Registrar',
    icon: '\u{1F3F7}',
    products: [
      { name: 'Cloudflare Registrar', url: 'https://www.cloudflare.com/products/registrar/', desc: 'At-cost domain registration, no markup' },
    ],
    competitors: [
      { key: 'godaddy', name: 'GoDaddy', urls: [{ label: 'Domains', url: 'https://www.godaddy.com/domains' }] },
      { key: 'namecheap', name: 'Namecheap', urls: [{ label: 'Domains', url: 'https://www.namecheap.com/' }] },
      { key: 'google-domains', name: 'Squarespace Domains', urls: [{ label: 'Product', url: 'https://www.squarespace.com/domains' }] },
    ],
  },
};

// Keep old COMPETITOR_URLS for backward compat (used by messaging)
const COMPETITOR_URLS = Object.fromEntries(
  Object.values(CF_PRODUCT_CATALOG).flatMap(cat =>
    cat.competitors.map(comp => [comp.key, {
      name: comp.name,
      urls: comp.urls,
      cfAlternative: cat.products[0]?.name || cat.category,
      cfUrl: cat.products[0]?.url || '',
    }])
  )
);

async function scrapeCompetitorPage(url: string): Promise<string> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return '';
    const html = await r.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
  } catch (_) { return ''; }
}

// ══════════════════════════════════════════════════════════════════
// SHARING SYSTEM — tokenized public links, bypass Access
// ══════════════════════════════════════════════════════════════════

// Create share link
app.post('/api/share/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const email = c.get('userEmail');
  const { label } = await c.req.json<{ label?: string }>();

  // Verify ownership
  const account = await c.env.DB.prepare(
    'SELECT id, account_name FROM accounts WHERE id = ? AND user_email = ?'
  ).bind(accountId, email).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  // Generate token
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  await c.env.DB.prepare(
    'INSERT INTO share_tokens (token, account_id, created_by, label) VALUES (?, ?, ?, ?)'
  ).bind(token, accountId, email, label || account.account_name).run();

  const shareUrl = new URL(`/share/${token}`, c.req.url).toString();
  return c.json({ token, url: shareUrl, label: label || account.account_name });
});

// List share links for an account
app.get('/api/share/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const email = c.get('userEmail');
  const tokens = await c.env.DB.prepare(
    'SELECT * FROM share_tokens WHERE account_id = ? AND created_by = ? ORDER BY created_at DESC'
  ).bind(accountId, email).all();
  return c.json(tokens.results);
});

// Delete share link
app.delete('/api/share/token/:token', async (c) => {
  const token = c.req.param('token');
  const email = c.get('userEmail');
  await c.env.DB.prepare('DELETE FROM share_tokens WHERE token = ? AND created_by = ?').bind(token, email).run();
  return c.json({ success: true });
});

// ── Public share data endpoint (NO auth required) ──────────────────
app.get('/api/public/:token', async (c) => {
  const token = c.req.param('token');
  const st = await c.env.DB.prepare(
    'SELECT * FROM share_tokens WHERE token = ?'
  ).bind(token).first();
  if (!st) return c.json({ error: 'Invalid or expired share link' }, 404);

  // Check expiry
  if (st.expires_at && new Date(st.expires_at as string) < new Date()) {
    return c.json({ error: 'Share link has expired' }, 410);
  }

  const account = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE id = ?'
  ).bind(st.account_id).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  // Get research and messages
  const [research, messages] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM research_reports WHERE account_id = ? ORDER BY created_at DESC').bind(st.account_id).all(),
    c.env.DB.prepare('SELECT * FROM persona_messages WHERE account_id = ? ORDER BY created_at DESC').bind(st.account_id).all(),
  ]);

  // Strip raw_data to reduce payload
  const { raw_data, user_email, ...safeAccount } = account as any;

  return c.json({
    account: safeAccount,
    research: research.results,
    messages: messages.results,
    sharedBy: (st.created_by as string).split('@')[0],
    label: st.label,
  });
});

// Generate research on a shared account (public, no auth)
app.post('/api/public/:token/research', async (c) => {
  const token = c.req.param('token');
  const { type } = await c.req.json<{ type: string }>();

  const st = await c.env.DB.prepare('SELECT * FROM share_tokens WHERE token = ?').bind(token).first();
  if (!st) return c.json({ error: 'Invalid share link' }, 404);

  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(st.account_id).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const domain = String(account.website || account.website_domain || '');
  const liveData = await runLiveResearch(domain, String(account.account_name), c.env.CF_API_TOKEN, c.env.CF_ACCOUNT_ID, c.env.BROWSER, c.env.INTRICATELY_API_KEY);
  const liveCtx = formatLiveResearch(liveData);
  const ctx = buildAccountContext(account);
  const competitors = getCompetitorMapping(account);
  const competitorCtx = competitors.length > 0
    ? '\nCOMPETITOR-TO-CLOUDFLARE MAPPING:\n' + competitors.map(m => `- ${m.competitor} (${m.category}) -> CF: ${m.cfProducts.join(', ')}`).join('\n')
    : '';

  const system = `You are a senior sales intelligence analyst at Cloudflare creating a shareable research briefing. Be professional, data-driven, and cite your sources. Format in clean markdown.`;
  const prompt = `Generate a comprehensive briefing for ${account.account_name}:\n\nCRM DATA:\n${ctx}\n${competitorCtx}\n\n${liveCtx}\n\nCover: Company profile, IT infrastructure, competitive landscape, Cloudflare opportunity, and recommended next steps.`;

  const content = await runAI(c.env.AI, RESEARCH_MODEL, system, prompt);
  return c.json({ title: `Research: ${account.account_name}`, content, type: 'shared_research' });
});

// ══════════════════════════════════════════════════════════════════
// GMAIL AGENT — OAuth + Send
// ══════════════════════════════════════════════════════════════════

const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

// Helper: get Google OAuth creds - Worker secrets first, then encrypted D1
async function getGoogleCreds(db: D1Database, env: Bindings): Promise<{ clientId: string; clientSecret: string }> {
  // Worker secrets take priority (most secure)
  let clientId = env.GOOGLE_CLIENT_ID || '';
  let clientSecret = env.GOOGLE_CLIENT_SECRET || '';

  // Fallback to encrypted D1 settings
  if (!clientId) {
    const row = await db.prepare("SELECT value FROM app_settings WHERE key = 'google_client_id'").first() as any;
    if (row?.value) clientId = await decryptValue(row.value, 'google_client_id');
  }
  if (!clientSecret) {
    const row = await db.prepare("SELECT value FROM app_settings WHERE key = 'google_client_secret'").first() as any;
    if (row?.value) clientSecret = await decryptValue(row.value, 'google_client_secret');
  }
  return { clientId, clientSecret };
}

// ── Encrypted settings (AES-GCM) ───────────────────────────────────
const ENC_SALT = 'revflare-settings-v1'; // Combined with key name for unique derivation

async function deriveKey(keyName: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(ENC_SALT + ':' + keyName);
  const hash = await crypto.subtle.digest('SHA-256', raw);
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptValue(value: string, keyName: string): Promise<string> {
  const key = await deriveKey(keyName);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  // Store as: base64(iv):base64(ciphertext)
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return ivB64 + ':' + ctB64;
}

async function decryptValue(stored: string, keyName: string): Promise<string> {
  try {
    const [ivB64, ctB64] = stored.split(':');
    if (!ivB64 || !ctB64) return ''; // Not encrypted (legacy plaintext) - return empty to force re-save
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
    const key = await deriveKey(keyName);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(decrypted);
  } catch (_) {
    return ''; // Decryption failed
  }
}

// Save settings (encrypted)
app.post('/api/settings', async (c) => {
  const { key, value } = await c.req.json<{ key: string; value: string }>();
  const allowedKeys = ['google_client_id', 'google_client_secret', 'intricately_api_key', 'news_api_key', 'gnews_api_key', 'mediastack_api_key'];
  if (!allowedKeys.includes(key)) return c.json({ error: 'Invalid setting' }, 400);
  const encrypted = await encryptValue(value, key);
  await c.env.DB.prepare(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP'
  ).bind(key, encrypted).run();
  return c.json({ success: true });
});

// Get settings status (never exposes values)
app.get('/api/settings/status', async (c) => {
  const keys = ['google_client_id', 'google_client_secret', 'intricately_api_key'];
  const result: Record<string, boolean> = {};
  for (const key of keys) {
    const row = await c.env.DB.prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first() as any;
    result[key] = !!(row?.value);
  }
  if (c.env.GOOGLE_CLIENT_ID) result.google_client_id = true;
  if (c.env.GOOGLE_CLIENT_SECRET) result.google_client_secret = true;
  if (c.env.INTRICATELY_API_KEY) result.intricately_api_key = true;
  return c.json(result);
});

// Check if Gmail is connected
app.get('/api/gmail/status', async (c) => {
  const email = c.get('userEmail');
  const token = await c.env.DB.prepare('SELECT gmail_address, expires_at FROM gmail_tokens WHERE user_email = ?').bind(email).first() as any;
  if (!token) return c.json({ connected: false });
  return c.json({ connected: true, gmailAddress: token.gmail_address, expired: token.expires_at < Date.now() / 1000 });
});

// Start OAuth flow
app.get('/api/gmail/connect', async (c) => {
  const { clientId } = await getGoogleCreds(c.env.DB, c.env);
  if (!clientId) return c.json({ error: 'Google Client ID not configured. Use the Connect Gmail wizard to enter your credentials.' }, 500);

  const redirectUri = new URL('/api/gmail/callback', c.req.url).toString();
  const state = c.get('userEmail'); // Pass user email as state

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(GMAIL_SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(state)}`;

  return c.redirect(authUrl);
});

// OAuth callback
app.get('/api/gmail/callback', async (c) => {
  const code = c.req.query('code');
  const userEmail = c.req.query('state') || c.get('userEmail');
  if (!code) return c.html('<h2>Authorization failed</h2><p>No code received.</p>');

  const { clientId, clientSecret } = await getGoogleCreds(c.env.DB, c.env);
  if (!clientId || !clientSecret) return c.html('<h2>Google OAuth credentials not configured</h2><p>Use the Connect Gmail wizard in RevFlare to enter your Client ID and Secret.</p>');

  const redirectUri = new URL('/api/gmail/callback', c.req.url).toString();

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return c.html(`<h2>Token exchange failed</h2><pre>${err}</pre>`);
  }

  const tokens = await tokenRes.json() as any;

  // Get Gmail address
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json() as any;

  // Store tokens
  await c.env.DB.prepare(`
    INSERT INTO gmail_tokens (user_email, access_token, refresh_token, gmail_address, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_email) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, gmail_tokens.refresh_token),
      gmail_address = excluded.gmail_address,
      expires_at = excluded.expires_at
  `).bind(
    userEmail,
    tokens.access_token,
    tokens.refresh_token || '',
    profile.email || '',
    Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
  ).run();

  return c.html(`
    <html><body style="background:#08090a;color:#f7f8f8;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">
      <div>
        <h2 style="color:#34d399">Gmail Connected!</h2>
        <p>${profile.email} is now linked to RevFlare.</p>
        <p>You can close this window and return to RevFlare.</p>
        <script>setTimeout(function(){ window.close(); }, 2000);</script>
      </div>
    </body></html>
  `);
});

// Refresh token helper
async function refreshGmailToken(db: D1Database, userEmail: string, clientId: string, clientSecret: string): Promise<string | null> {
  const stored = await db.prepare('SELECT * FROM gmail_tokens WHERE user_email = ?').bind(userEmail).first() as any;
  if (!stored || !stored.refresh_token) return null;

  // If not expired, return existing
  if (stored.expires_at > Date.now() / 1000 + 60) return stored.access_token;

  // Refresh
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: stored.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as any;

  await db.prepare('UPDATE gmail_tokens SET access_token = ?, expires_at = ? WHERE user_email = ?')
    .bind(data.access_token, Math.floor(Date.now() / 1000) + (data.expires_in || 3600), userEmail).run();

  return data.access_token;
}

// Send email via Gmail API
app.post('/api/gmail/send', async (c) => {
  const email = c.get('userEmail');
  const { to, subject, body, accountId } = await c.req.json<{ to: string; subject: string; body: string; accountId?: number }>();

  if (!to || !subject || !body) return c.json({ error: 'Missing to, subject, or body' }, 400);
  const { clientId: gci, clientSecret: gcs } = await getGoogleCreds(c.env.DB, c.env);
  if (!gci || !gcs) return c.json({ error: 'Gmail not configured. Use the Connect Gmail wizard to enter credentials.' }, 500);

  const accessToken = await refreshGmailToken(c.env.DB, email, gci, gcs);
  if (!accessToken) return c.json({ error: 'Gmail not connected. Click Connect Gmail first.' }, 401);

  const stored = await c.env.DB.prepare('SELECT gmail_address FROM gmail_tokens WHERE user_email = ?').bind(email).first() as any;
  const from = stored?.gmail_address || email;

  // Build RFC 2822 email
  const rawEmail = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
  ].join('\r\n');

  // Base64url encode
  const encoded = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.json() as any;
    return c.json({ error: err.error?.message || 'Gmail send failed' }, sendRes.status);
  }

  const result = await sendRes.json() as any;
  return c.json({ success: true, messageId: result.id, threadId: result.threadId });
});

// Bulk send campaign emails
app.post('/api/gmail/send-campaign/:campaignId', async (c) => {
  const campaignId = c.req.param('campaignId');
  const email = c.get('userEmail');
  const { emailIds, toField } = await c.req.json<{ emailIds: number[]; toField: string }>();

  const { clientId: gci2, clientSecret: gcs2 } = await getGoogleCreds(c.env.DB, c.env);
  if (!gci2 || !gcs2) return c.json({ error: 'Gmail not configured' }, 500);

  const accessToken = await refreshGmailToken(c.env.DB, email, gci2, gcs2);
  if (!accessToken) return c.json({ error: 'Gmail not connected' }, 401);

  const stored = await c.env.DB.prepare('SELECT gmail_address FROM gmail_tokens WHERE user_email = ?').bind(email).first() as any;
  const from = stored?.gmail_address || email;

  const results: { id: number; status: string; error?: string }[] = [];

  for (const eid of emailIds.slice(0, 10)) { // Max 10 per batch
    const em = await c.env.DB.prepare('SELECT * FROM campaign_emails WHERE id = ? AND campaign_id = ?').bind(eid, campaignId).first() as any;
    if (!em) { results.push({ id: eid, status: 'not_found' }); continue; }

    const bodyText = (em.content || '').replace(/^Subject:.*\n*/im, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
    const rawEmail = [`From: ${from}`, `To: ${toField}`, `Subject: ${em.subject}`, `Content-Type: text/plain; charset=utf-8`, '', bodyText].join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded }),
      });
      if (sendRes.ok) {
        await c.env.DB.prepare('UPDATE campaign_emails SET status = ? WHERE id = ?').bind('sent', eid).run();
        results.push({ id: eid, status: 'sent' });
      } else {
        const err = await sendRes.json() as any;
        results.push({ id: eid, status: 'error', error: err.error?.message });
      }
    } catch (e: any) {
      results.push({ id: eid, status: 'error', error: e.message });
    }
  }

  return c.json({ results, sent: results.filter(r => r.status === 'sent').length });
});

// Disconnect Gmail
app.delete('/api/gmail/disconnect', async (c) => {
  const email = c.get('userEmail');
  await c.env.DB.prepare('DELETE FROM gmail_tokens WHERE user_email = ?').bind(email).run();
  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════
// MASS CAMPAIGN ENGINE
// ══════════════════════════════════════════════════════════════════

const CAMPAIGN_THEMES: Record<string, { name: string; icon: string; color: string; description: string; prompt: string }> = {
  security_posture: {
    name: 'Security Posture Review',
    icon: '\u{1F6E1}',
    color: '#f87171',
    description: 'Alert prospects about security gaps found in their infrastructure. Position Cloudflare WAF, DDoS, Bot Management, Zero Trust.',
    prompt: 'Focus the email on SECURITY. Reference any missing security headers found in their live probe, their current security vendor, and position Cloudflare as the integrated security platform. Mention: average breach cost $4.45M (IBM), DDoS downtime $5,600/minute (Gartner). Urgency: threat landscape is evolving faster than point solutions can adapt.',
  },
  cost_optimization: {
    name: 'Cost Optimization',
    icon: '\u{1F4B0}',
    color: '#34d399',
    description: 'Help customers reduce IT spend through vendor consolidation and Cloudflare\'s flat-rate pricing model.',
    prompt: 'Focus the email on COST SAVINGS. Calculate their total displaceable spend across CDN, Security, DNS. Position Cloudflare\'s flat-rate pricing (no bandwidth charges, no surge pricing, zero egress on R2). Quantify annual savings. Frame it as: "every month you wait costs $X in unnecessary vendor overhead."',
  },
  vendor_consolidation: {
    name: 'Vendor Consolidation',
    icon: '\u{1F504}',
    color: '#a78bfa',
    description: 'Pitch consolidating multiple point solutions into Cloudflare\'s unified platform.',
    prompt: 'Focus on VENDOR CONSOLIDATION. Count how many separate IT products they use and position Cloudflare as the single platform replacement. Benefits: one dashboard, one vendor, unified analytics, faster incident response, reduced procurement overhead. Reference their actual vendor list.',
  },
  digital_transformation: {
    name: 'Digital Transformation',
    icon: '\u{1F680}',
    color: '#60a5fa',
    description: 'Position Cloudflare as the infrastructure foundation for digital transformation and AI readiness.',
    prompt: 'Focus on DIGITAL TRANSFORMATION and AI READINESS. Position Cloudflare Workers as edge compute, R2 as zero-egress storage, Workers AI for edge inference, Vectorize for AI apps. Frame their current legacy infrastructure as a blocker to innovation. Their competitors are already building at the edge.',
  },
  performance_edge: {
    name: 'Performance & Speed',
    icon: '\u{26A1}',
    color: '#fbbf24',
    description: 'Focus on performance gains — faster load times, lower latency, better user experience.',
    prompt: 'Focus on PERFORMANCE. Cloudflare\'s 330+ city network delivers sub-50ms latency globally. Reference Google research: every 100ms of latency costs 1% of revenue. Position Argo Smart Routing (30%+ latency reduction), Early Hints, Speed Brain, Zaraz. Compare to their current CDN provider.',
  },
  zero_trust_modernization: {
    name: 'Zero Trust Modernization',
    icon: '\u{1F512}',
    color: '#f472b6',
    description: 'Replace legacy VPN and SASE with Cloudflare Zero Trust — Access, Gateway, WARP, Browser Isolation.',
    prompt: 'Focus on ZERO TRUST. Legacy VPNs are the #1 attack vector. Position Cloudflare Access (identity-aware proxy), Gateway (SWG), WARP (device agent), Browser Isolation, CASB, DLP. Reference Forrester Wave SSE Leader recognition. Frame VPN replacement as urgent security modernization.',
  },
  competitive_displacement: {
    name: 'Competitive Displacement',
    icon: '\u{1F3AF}',
    color: '#fb923c',
    description: 'Target accounts using specific competitors (Akamai, CloudFront, Zscaler, etc.) with displacement messaging.',
    prompt: 'Focus on COMPETITIVE DISPLACEMENT. Name their current vendor explicitly. Explain why Cloudflare is the better choice with specific advantages: larger network, better pricing, integrated platform, faster innovation. Include a vendor-by-vendor displacement map for every competitor in their stack.',
  },
  ai_edge: {
    name: 'AI at the Edge',
    icon: '\u{1F916}',
    color: '#818cf8',
    description: 'Position Workers AI, Vectorize, AI Gateway for companies building AI-powered products.',
    prompt: 'Focus on AI INFRASTRUCTURE. Position Workers AI (inference at the edge, 0ms cold starts), Vectorize (vector database), AI Gateway (LLM caching, rate limiting, logging). Frame: running AI centralized = high latency + high cost. Edge AI = faster, cheaper, better UX. Cloudflare is the only platform offering compute + storage + AI + CDN + security in one.',
  },
};

// List campaigns
app.get('/api/campaigns', async (c) => {
  const email = c.get('userEmail');
  const campaigns = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE user_email = ? ORDER BY created_at DESC'
  ).bind(email).all();
  return c.json(campaigns.results);
});

// Get campaign themes
app.get('/api/campaign-themes', (c) => c.json(CAMPAIGN_THEMES));

// Create campaign (with explicit account selection)
app.post('/api/campaigns', async (c) => {
  const email = c.get('userEmail');
  const { name, theme, persona, messageType, accountIds, customContext } = await c.req.json<{
    name: string; theme: string; persona: string; messageType: string; accountIds?: number[]; customContext?: string;
  }>();

  if (!CAMPAIGN_THEMES[theme]) return c.json({ error: 'Invalid theme' }, 400);
  if (!PERSONA_CONFIGS[persona]) return c.json({ error: 'Invalid persona' }, 400);
  if (!accountIds?.length) return c.json({ error: 'Select at least one account' }, 400);

  const totalAccounts = accountIds.length;

  const result = await c.env.DB.prepare(
    'INSERT INTO campaigns (name, theme, persona, message_type, filters, total_accounts, status, custom_context, user_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(name, theme, persona, messageType, JSON.stringify({ accountIds }), totalAccounts, 'draft', customContext || '', email).run();

  return c.json({ id: result.meta.last_row_id, totalAccounts });
});

// Generate campaign emails (processes accounts in batches)
app.post('/api/campaigns/:id/generate', async (c) => {
  const campaignId = c.req.param('id');
  const email = c.get('userEmail');

  const campaign = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE id = ? AND user_email = ?'
  ).bind(campaignId, email).first() as any;
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  const themeConfig = CAMPAIGN_THEMES[campaign.theme];
  const personaConfig = PERSONA_CONFIGS[campaign.persona];
  if (!themeConfig || !personaConfig) return c.json({ error: 'Invalid campaign config' }, 400);

  // Get selected account IDs
  const filterData = JSON.parse(campaign.filters || '{}');
  const accountIds: number[] = filterData.accountIds || [];

  // Get batch of accounts not yet generated
  const alreadyGenerated = await c.env.DB.prepare(
    'SELECT account_id FROM campaign_emails WHERE campaign_id = ?'
  ).bind(campaignId).all();
  const generatedIds = new Set(alreadyGenerated.results.map((r: any) => r.account_id));

  const pendingIds = accountIds.filter(id => !generatedIds.has(id));
  const batchIds = pendingIds.slice(0, 2); // 2 at a time (full live research per email)

  if (!batchIds.length) {
    await c.env.DB.prepare('UPDATE campaigns SET status = ? WHERE id = ?').bind('complete', campaignId).run();
    return c.json({ status: 'complete', generated: generatedIds.size, total: campaign.total_accounts });
  }

  // Fetch full account data for this batch
  const batch: any[] = [];
  for (const aid of batchIds) {
    const acc = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(aid, email).first();
    if (acc) batch.push(acc);
  }

  if (!batch.length) {
    await c.env.DB.prepare('UPDATE campaigns SET status = ? WHERE id = ?').bind('complete', campaignId).run();
    return c.json({ status: 'complete', generated: generatedIds.size, total: campaign.total_accounts });
  }

  await c.env.DB.prepare('UPDATE campaigns SET status = ? WHERE id = ?').bind('generating', campaignId).run();

  // Generate hyper-personalized emails for this batch
  const results: any[] = [];
  for (const account of batch) {
    const a = account as any;
    const ctx = buildAccountContext(a);
    const competitors = getCompetitorMapping(a);
    const competitorCtx = competitors.length > 0
      ? '\nDETECTED COMPETITORS:\n' + competitors.map(m => `- ${m.competitor} (${m.category}) -> CF: ${m.cfProducts.join(', ')}\n  Edge: ${m.pitch}`).join('\n')
      : '';

    // Build displacement context from full catalog
    const allProds = [a.cdn_products, a.security_products, a.dns_products, a.cloud_hosting_products].filter(Boolean).join(';').toLowerCase();
    const displacementLines: string[] = [];
    for (const [catKey, cat] of Object.entries(CF_PRODUCT_CATALOG)) {
      for (const comp of cat.competitors) {
        if (allProds.includes(comp.key) || allProds.includes(comp.name.toLowerCase())) {
          displacementLines.push(`${comp.name} (${cat.category}) -> Replace with: ${cat.products.slice(0,2).map(p=>p.name).join(', ')} — ${cat.products[0]?.desc || ''}`);
        }
      }
    }
    const displacementCtx = displacementLines.length ? '\nVENDOR DISPLACEMENT MAP:\n' + displacementLines.map(l => '- ' + l).join('\n') : '';

    // Cost of inaction
    const cdnS = a.cdn_spend || 0, secS = a.security_spend || 0, dnsS = a.dns_spend || 0;
    const totalDisplaceable = cdnS + secS + dnsS;
    const annualSavings = Math.round(totalDisplaceable * 0.3 * 12);
    const costCtx = totalDisplaceable > 0 ? `\nCOST OF INACTION: $${annualSavings.toLocaleString()}/year in potential savings. CDN: $${cdnS.toLocaleString()}/mo (${a.cdn_primary||'unknown'}), Security: $${secS.toLocaleString()}/mo (${a.security_primary||'unknown'}), DNS: $${dnsS.toLocaleString()}/mo (${a.dns_primary||'unknown'}).` : '';

    // Full live intelligence gather per account (parallel: website + news + SEC + funding)
    const domain = String(a.website || a.website_domain || '');
    const companyName = String(a.account_name);
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');

    const [websiteData, newsData, secData, fundingData] = await Promise.all([
      // Website: homepage + about + investor relations
      (async () => {
        const result = { desc: '', about: '', ir: '', title: '' };
        const pages = [
          { url: `https://${cleanDomain}`, key: 'desc' },
          { url: `https://${cleanDomain}/about`, key: 'about' },
          { url: `https://${cleanDomain}/investors`, key: 'ir' },
        ];
        for (const pg of pages) {
          try {
            const r = await fetch(pg.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html' }, signal: AbortSignal.timeout(5000), redirect: 'follow' });
            if (!r.ok) continue;
            const html = await r.text();
            const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
            if (pg.key === 'desc') {
              const metaM = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is);
              if (metaM) result.desc = metaM[1].trim().slice(0, 300);
              const titleM = html.match(/<title[^>]*>(.*?)<\/title>/is);
              if (titleM) result.title = titleM[1].replace(/<[^>]+>/g,'').trim().slice(0, 150);
            } else if (pg.key === 'about') {
              result.about = text.slice(0, 1500);
            } else if (pg.key === 'ir') {
              result.ir = text.slice(0, 1500);
            }
          } catch (_) {}
        }
        return result;
      })(),
      // News
      searchNews(companyName),
      // SEC filings
      fetchSECFilings(companyName),
      // Funding
      searchFunding(companyName, domain),
    ]);

    // Build rich public intel context
    let publicIntel = '';
    if (websiteData.desc) publicIntel += `\nFROM THEIR WEBSITE: "${websiteData.desc}"`;
    if (websiteData.about) publicIntel += `\nABOUT PAGE (their own words):\n${websiteData.about.slice(0, 800)}`;
    if (websiteData.ir) publicIntel += `\nINVESTOR RELATIONS PAGE:\n${websiteData.ir.slice(0, 800)}`;
    if (newsData) publicIntel += `\nRECENT NEWS HEADLINES:\n${newsData}`;
    if (secData.filings) publicIntel += `\nSEC FILINGS:\n${secData.filings.slice(0, 500)}`;
    if (fundingData) publicIntel += `\nFUNDING DATA:\n${fundingData.slice(0, 400)}`;

    const system = `You are a ${personaConfig.title} at Cloudflare writing a hyper-personalized campaign email.
PERSONA: ${personaConfig.name} — ${personaConfig.description}
TONE: ${personaConfig.tone}
CAMPAIGN THEME: ${themeConfig.name}

CRITICAL: This email must feel like you spent an HOUR researching this specific account. You MUST reference:
1. What the company does IN THEIR OWN WORDS (from their website/about page)
2. Recent news about them — earnings announcements, leadership changes, acquisitions, partnerships, security incidents, product launches. If news was found, weave it into the narrative naturally.
3. Their investor relations content or SEC filings — revenue trends, strategic priorities mentioned in earnings calls, risk factors
4. Any funding rounds or investment activity
5. Their current vendor stack BY NAME with spend amounts
6. Specific Cloudflare products that replace each vendor, with concrete advantages
7. Quantified cost of inaction with their real spend numbers

If they had a security breach/incident in the news, lead with that. If they announced earnings, reference their stated priorities. If they raised funding, connect Cloudflare to their growth plans. If they changed leadership, position this as a fresh start.

${themeConfig.prompt}

Start with: Subject: [highly personalized subject referencing something specific about them — a news headline, their mission, or a concrete finding]
Keep it 300-400 words. Every sentence must be specific to THIS account.

ABSOLUTE RULES FOR THE OUTPUT:
- NEVER include any meta-instructions, internal notes, or system text in the email (no "N/A", "No data found", "use CRM data", "no public data", "not available", etc.)
- If a data point is missing, simply DO NOT mention it. Skip it entirely. Do not say "data not available" or "unknown".
- The output must read as a polished, professional email from a real human. Zero indication that it was AI-generated or that data was missing.
- Do not reference "CRM data", "live probe", "scraped", "AI", or any internal tooling. Write as if you personally researched this company.`;

    const prompt = `Generate a hyper-personalized ${themeConfig.name} email for ${a.account_name}:

ACCOUNT PROFILE:
${ctx}
${competitorCtx}
${displacementCtx}
${costCtx}

PUBLIC INTELLIGENCE (live-gathered):
${publicIntel || ''}

CLOUDFLARE PLATFORM EDGE:
- Network: 330+ cities, 100+ Tbps, sub-50ms global latency
- Pricing: Flat-rate, no bandwidth charges, zero egress (R2)
- Platform: CDN + Security + Zero Trust + DNS + Compute + Storage — one vendor
- Analyst: Gartner SSE Leader, Forrester WAF/CDN/DDoS Leader
- Innovation: Birthday Week, Security Week, GA Week ship dozens of features quarterly
${campaign.custom_context ? '\nCAMPAIGN CONTEXT: ' + campaign.custom_context : ''}`;

    try {
      const content = await runAI(c.env.AI, EMAIL_MODEL, system, prompt);
      const subject = content.match(/Subject:?\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || `${themeConfig.name} - ${a.account_name}`;

      await c.env.DB.prepare(
        'INSERT INTO campaign_emails (campaign_id, account_id, account_name, subject, content, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(campaignId, a.id, a.account_name, subject, content, 'generated').run();

      results.push({ accountId: a.id, accountName: a.account_name, subject, status: 'generated' });
    } catch (e: any) {
      results.push({ accountId: a.id, accountName: a.account_name, status: 'error', error: e.message });
    }
  }

  const successCount = results.filter(r => r.status === 'generated').length;
  const newGenCount = generatedIds.size + successCount;
  const remaining = accountIds.length - newGenCount;
  const isComplete = remaining <= 0;

  await c.env.DB.prepare('UPDATE campaigns SET generated = ?, status = ? WHERE id = ?')
    .bind(newGenCount, isComplete ? 'complete' : 'generating', campaignId).run();

  return c.json({
    status: isComplete ? 'complete' : 'generating',
    generated: newGenCount,
    total: campaign.total_accounts,
    batch: results,
    hasMore: !isComplete,
  });
});

// Get campaign emails
app.get('/api/campaigns/:id/emails', async (c) => {
  const campaignId = c.req.param('id');
  const email = c.get('userEmail');
  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ? AND user_email = ?').bind(campaignId, email).first();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  const emails = await c.env.DB.prepare(
    'SELECT * FROM campaign_emails WHERE campaign_id = ? ORDER BY created_at ASC'
  ).bind(campaignId).all();
  return c.json({ campaign, emails: emails.results });
});

// Export campaign as CSV
app.get('/api/campaigns/:id/export', async (c) => {
  const campaignId = c.req.param('id');
  const email = c.get('userEmail');
  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ? AND user_email = ?').bind(campaignId, email).first();
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  const emails = await c.env.DB.prepare(
    'SELECT account_name, subject, content FROM campaign_emails WHERE campaign_id = ? AND status = ? ORDER BY created_at ASC'
  ).bind(campaignId, 'generated').all();

  let csv = 'Account Name,Subject,Email Body\n';
  for (const e of emails.results as any[]) {
    const body = (e.content || '').replace(/^Subject:.*\n*/im, '').replace(/"/g, '""').replace(/\n/g, ' ');
    csv += `"${e.account_name}","${e.subject}","${body}"\n`;
  }

  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="campaign-${campaignId}.csv"` } });
});

// ══════════════════════════════════════════════════════════════════
// THREAT INTELLIGENCE
// ══════════════════════════════════════════════════════════════════

// Helper to get API keys for paid news sources
async function getNewsApiKeys(db: D1Database): Promise<{ newsApi: string; gNews: string; mediaStack: string }> {
  const keys = { newsApi: '', gNews: '', mediaStack: '' };
  try {
    const [k1, k2, k3] = await Promise.all([
      db.prepare("SELECT value FROM app_settings WHERE key = 'news_api_key'").first(),
      db.prepare("SELECT value FROM app_settings WHERE key = 'gnews_api_key'").first(),
      db.prepare("SELECT value FROM app_settings WHERE key = 'mediastack_api_key'").first(),
    ]);
    if ((k1 as any)?.value) keys.newsApi = await decryptValue((k1 as any).value, 'news_api_key');
    if ((k2 as any)?.value) keys.gNews = await decryptValue((k2 as any).value, 'gnews_api_key');
    if ((k3 as any)?.value) keys.mediaStack = await decryptValue((k3 as any).value, 'mediastack_api_key');
  } catch {}
  return keys;
}

// Global threat feed (all incidents, not account-specific)
app.get('/api/threats', async (c) => {
  const days = parseInt(c.req.query('days') || '14');
  const country = c.req.query('country') || '';
  const apiKeys = await getNewsApiKeys(c.env.DB);
  const result = await fetchThreatIntelligence(days, apiKeys, c.env.THREAT_CACHE);
  if (country) {
    result.incidents = result.incidents.filter((inc: any) => (inc.country || '').toUpperCase() === country.toUpperCase());
  }
  return c.json(result);
});

// Threats relevant to a specific account
app.get('/api/threats/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?')
    .bind(accountId, c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const apiKeys = await getNewsApiKeys(c.env.DB);
  const result = await fetchThreatIntelligence(14, apiKeys, c.env.THREAT_CACHE);
  const matched = matchIncidentsToAccount(result.incidents, account);

  return c.json({
    incidents: matched,
    totalScanned: result.totalFetched,
    accountName: account.account_name,
    industry: account.industry,
  });
});

// Generate incident-triggered BDR email for an account
app.post('/api/threats/:accountId/email', async (c) => {
  const accountId = c.req.param('accountId');
  const { incidentIndex, persona } = await c.req.json<{ incidentIndex?: number; persona?: string }>();

  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?')
    .bind(accountId, c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const apiKeys2 = await getNewsApiKeys(c.env.DB);
  const result = await fetchThreatIntelligence(14, apiKeys2, c.env.THREAT_CACHE);
  const matched = matchIncidentsToAccount(result.incidents, account);

  if (!matched.length) return c.json({ error: 'No relevant incidents found for this account' }, 404);

  const incident = matched[incidentIndex || 0];
  const ctx = buildAccountContext(account);
  const personaConfig = PERSONA_CONFIGS[persona || 'bdr'];

  const system = `You are a ${personaConfig?.title || 'BDR'} at Cloudflare writing an INCIDENT-TRIGGERED outreach email.
A real cybersecurity incident has just been reported that is directly relevant to this prospect's industry.
Your job is to reference the specific incident, connect it to the prospect's situation, and position Cloudflare as the solution.
TONE: ${personaConfig?.tone || 'Urgent but professional. Not fear-mongering — consultative.'}
Write a ready-to-send email. Start with Subject: line.`;

  const prompt = `Generate an incident-triggered email for ${account.account_name}:

INCIDENT:
Title: ${incident.title}
Summary: ${incident.summary}
Source: ${incident.source} (${incident.publishedAt})
Attack Score: ${incident.score}
Cloudflare Products That Address This: ${incident.cfProducts.join(', ')}

ACCOUNT:
${ctx}

STRUCTURE:
1. Open by referencing the specific incident — make it clear this is timely and real
2. Connect to the prospect's industry and situation
3. Position specific Cloudflare products that would have prevented this
4. Quantify the risk — reference their current security vendor (${account.security_primary || 'unknown'}) and whether it covers this attack vector
5. Clear CTA — offer a security assessment or incident briefing`;

  const content = await runAI(c.env.AI, EMAIL_MODEL, system, prompt);
  return c.json({ content, incident: { title: incident.title, score: incident.score, cfProducts: incident.cfProducts } });
});

// ══════════════════════════════════════════════════════════════════
// ADVANCED FEATURES
// ══════════════════════════════════════════════════════════════════

// ── Lead Scoring ───────────────────────────────────────────────────
app.get('/api/lead-scores', async (c) => {
  const email = c.get('userEmail');
  const limit = parseInt(c.req.query('limit') || '20');
  const accounts = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE user_email = ? ORDER BY total_it_spend DESC LIMIT 200'
  ).bind(email).all();

  const scored = accounts.results.map((a: any) => {
    const { score, factors } = calculateLeadScore(a);
    return { id: a.id, account_name: a.account_name, industry: a.industry, score, factors, total_it_spend: a.total_it_spend, current_monthly_fee: a.current_monthly_fee, cdn_primary: a.cdn_primary, security_primary: a.security_primary };
  }).sort((a: any, b: any) => b.score - a.score).slice(0, limit);

  // Persist scores
  for (const s of scored) {
    await c.env.DB.prepare('INSERT INTO lead_scores (account_id, score, factors, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET score=excluded.score, factors=excluded.factors, updated_at=CURRENT_TIMESTAMP')
      .bind(s.id, s.score, JSON.stringify(s.factors)).run();
  }

  return c.json(scored);
});

app.get('/api/lead-scores/:accountId', async (c) => {
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(c.req.param('accountId'), c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);
  return c.json(calculateLeadScore(account));
});

// ── ROI Calculator ─────────────────────────────────────────────────
app.get('/api/roi/:accountId', async (c) => {
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(c.req.param('accountId'), c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);
  return c.json(calculateROI(account));
});

// ── Account Lookalikes ─────────────────────────────────────────────
app.get('/api/lookalikes/:accountId', async (c) => {
  const email = c.get('userEmail');
  const refAccount = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(c.req.param('accountId'), email).first();
  if (!refAccount) return c.json({ error: 'Account not found' }, 404);

  const allAccounts = await c.env.DB.prepare('SELECT * FROM accounts WHERE user_email = ? AND id != ?').bind(email, refAccount.id).all();
  const scored = allAccounts.results.map((a: any) => ({
    id: a.id, account_name: a.account_name, industry: a.industry, total_it_spend: a.total_it_spend,
    employees: a.employees, cdn_primary: a.cdn_primary, security_primary: a.security_primary,
    billing_country: a.billing_country, similarity: scoreSimilarity(a, refAccount),
  })).filter((a: any) => a.similarity > 20).sort((a: any, b: any) => b.similarity - a.similarity).slice(0, 20);

  return c.json({ reference: { id: refAccount.id, account_name: (refAccount as any).account_name }, lookalikes: scored });
});

// ── Meeting Prep ───────────────────────────────────────────────────
app.post('/api/meeting-prep/:accountId', async (c) => {
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(c.req.param('accountId'), c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const ctx = buildAccountContext(account);
  const research = await c.env.DB.prepare('SELECT content FROM research_reports WHERE account_id = ? ORDER BY created_at DESC LIMIT 1').bind(account.id).first();
  const messages = await c.env.DB.prepare('SELECT content FROM persona_messages WHERE account_id = ? ORDER BY created_at DESC LIMIT 1').bind(account.id).first();

  const prompt = buildMeetingPrepPrompt(account, ctx, (research as any)?.content || '', (messages as any)?.content || '');
  const content = await runAI(c.env.AI, EMAIL_MODEL, 'You are preparing a sales rep for an important customer call. Be concise, specific, and actionable.', prompt);

  await c.env.DB.prepare('INSERT INTO meeting_preps (account_id, content, user_email) VALUES (?, ?, ?)').bind(account.id, content, c.get('userEmail')).run();
  return c.json({ content, accountName: (account as any).account_name });
});

// ── Sequences ──────────────────────────────────────────────────────
app.get('/api/sequence-templates', (c) => c.json(SEQUENCE_TEMPLATES));

app.post('/api/sequences', async (c) => {
  const email = c.get('userEmail');
  const { name, account_id, persona, template_key, theme } = await c.req.json<any>();

  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(account_id, email).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const template = SEQUENCE_TEMPLATES[template_key];
  if (!template) return c.json({ error: 'Invalid template' }, 400);

  // Generate content for each touch
  const ctx = buildAccountContext(account);
  const touches: any[] = [];

  for (const touch of template.touches) {
    const system = `You are a ${persona.toUpperCase()} at Cloudflare writing touch ${touches.length + 1} of a ${template.touches.length}-touch sequence.
Channel: ${touch.channel}. Goal: ${touch.description}.
${touches.length > 0 ? 'Previous touches have been sent. This is a follow-up — reference the sequence naturally.' : 'This is the first touch.'}
Keep it concise. ${touch.channel === 'linkedin' ? '300 chars max.' : touch.channel === 'phone' ? 'Call script format with talk track.' : '200-300 words.'}`;

    const prompt = `Generate touch ${touches.length + 1}: ${touch.description}\n\nAccount: ${(account as any).account_name}\n${ctx.slice(0, 4000)}`;
    const content = await runAI(c.env.AI, EMAIL_MODEL, system, prompt);
    touches.push({ ...touch, content, generated: true });
  }

  const r = await c.env.DB.prepare('INSERT INTO sequences (name, account_id, persona, theme, status, touches, user_email) VALUES (?,?,?,?,?,?,?)')
    .bind(name || template.name + ' — ' + (account as any).account_name, account_id, persona, theme || template_key, 'generated', JSON.stringify(touches), email).run();

  return c.json({ id: r.meta.last_row_id, name, touches });
});

app.get('/api/sequences', async (c) => {
  const seqs = await c.env.DB.prepare('SELECT * FROM sequences WHERE user_email = ? ORDER BY created_at DESC').bind(c.get('userEmail')).all();
  return c.json(seqs.results.map((s: any) => ({ ...s, touches: JSON.parse(s.touches || '[]') })));
});

// ── Change Detection ───────────────────────────────────────────────
app.post('/api/detect-changes/:accountId', async (c) => {
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(c.req.param('accountId'), c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const domain = String((account as any).website || (account as any).website_domain || '');
  if (!domain) return c.json({ changes: [], message: 'No domain to probe' });

  // Run live probes
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const [probe, dns] = await Promise.all([probeDomain(clean), lookupDNS(clean)]);

  const currentHash = JSON.stringify({ cdn: probe.cdnDetected, dns: dns.dnsProvider, server: probe.serverInfo, headers: probe.securityHeaders });

  // Get last probe
  const lastProbe = await c.env.DB.prepare('SELECT * FROM probe_history WHERE account_id = ? ORDER BY created_at DESC LIMIT 1').bind((account as any).id).first() as any;

  // Save current probe
  await c.env.DB.prepare('INSERT INTO probe_history (account_id, cdn_detected, dns_provider, security_headers, server_info, probe_hash) VALUES (?,?,?,?,?,?)')
    .bind((account as any).id, probe.cdnDetected, dns.dnsProvider, JSON.stringify(probe.securityHeaders), probe.serverInfo, currentHash).run();

  const changes: { type: string; field: string; from: string; to: string }[] = [];
  if (lastProbe) {
    if (lastProbe.cdn_detected !== probe.cdnDetected) changes.push({ type: 'CDN Change', field: 'cdn', from: lastProbe.cdn_detected || 'unknown', to: probe.cdnDetected || 'unknown' });
    if (lastProbe.dns_provider !== dns.dnsProvider) changes.push({ type: 'DNS Provider Change', field: 'dns', from: lastProbe.dns_provider || 'unknown', to: dns.dnsProvider || 'unknown' });
    if (lastProbe.server_info !== probe.serverInfo) changes.push({ type: 'Server Change', field: 'server', from: lastProbe.server_info || 'unknown', to: probe.serverInfo || 'unknown' });

    // Generate alerts for changes
    for (const change of changes) {
      await c.env.DB.prepare('INSERT INTO alerts (account_id, alert_type, title, detail, severity, user_email) VALUES (?,?,?,?,?,?)')
        .bind((account as any).id, 'infrastructure_change', change.type + ': ' + (account as any).account_name,
          change.from + ' → ' + change.to, 'high', c.get('userEmail')).run();
    }
  }

  return c.json({ changes, isFirstProbe: !lastProbe, current: { cdn: probe.cdnDetected, dns: dns.dnsProvider, server: probe.serverInfo } });
});

// ── Alerts ──────────────────────────────────────────────────────────
app.get('/api/alerts', async (c) => {
  const alerts = await c.env.DB.prepare('SELECT * FROM alerts WHERE user_email = ? ORDER BY created_at DESC LIMIT 50').bind(c.get('userEmail')).all();
  return c.json(alerts.results);
});

app.post('/api/alerts/:id/read', async (c) => {
  await c.env.DB.prepare('UPDATE alerts SET read = 1 WHERE id = ? AND user_email = ?').bind(c.req.param('id'), c.get('userEmail')).run();
  return c.json({ success: true });
});

// ── Win/Loss Analysis ──────────────────────────────────────────────
app.post('/api/win-loss/:opportunityId', async (c) => {
  const opp = await c.env.DB.prepare('SELECT * FROM opportunities WHERE id = ? AND user_email = ?').bind(c.req.param('opportunityId'), c.get('userEmail')).first() as any;
  if (!opp) return c.json({ error: 'Opportunity not found' }, 404);

  let account: any = {};
  let ctx = '';
  if (opp.account_id) {
    account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?').bind(opp.account_id).first() || {};
    ctx = buildAccountContext(account);
  }

  const prompt = buildWinLossPrompt(opp, account, ctx);
  const content = await runAI(c.env.AI, RESEARCH_MODEL, 'You are a sales operations analyst performing win/loss analysis. Be data-driven and actionable.', prompt);
  return c.json({ content, opportunity: opp });
});

// ── Playbooks ──────────────────────────────────────────────────────
app.get('/api/playbooks', async (c) => {
  const playbooks = await c.env.DB.prepare('SELECT * FROM playbooks ORDER BY usage_count DESC').all();
  return c.json(playbooks.results);
});

app.post('/api/playbooks', async (c) => {
  const { name, persona, industry, template } = await c.req.json<any>();
  const r = await c.env.DB.prepare('INSERT INTO playbooks (name, persona, industry, template, created_by) VALUES (?,?,?,?,?)')
    .bind(name, persona, industry || '', template, c.get('userEmail')).run();
  return c.json({ id: r.meta.last_row_id });
});

app.post('/api/playbooks/:id/use', async (c) => {
  await c.env.DB.prepare('UPDATE playbooks SET usage_count = usage_count + 1 WHERE id = ?').bind(c.req.param('id')).run();
  const pb = await c.env.DB.prepare('SELECT * FROM playbooks WHERE id = ?').bind(c.req.param('id')).first();
  return c.json(pb);
});

// ── Email A/B Variants ─────────────────────────────────────────────
app.post('/api/ab-test/:accountId', async (c) => {
  const { persona, messageType, customContext } = await c.req.json<any>();
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(c.req.param('accountId'), c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  const ctx = buildAccountContext(account);
  const personaConfig = PERSONA_CONFIGS[persona];
  if (!personaConfig) return c.json({ error: 'Invalid persona' }, 400);

  // Generate two variants in parallel
  const systemA = `You are a ${personaConfig.title} at Cloudflare. VARIANT A: Lead with a BUSINESS OUTCOME hook. Focus on ROI and cost savings. ${personaConfig.tone}`;
  const systemB = `You are a ${personaConfig.title} at Cloudflare. VARIANT B: Lead with a TECHNICAL INSIGHT hook. Focus on architecture and performance. ${personaConfig.tone}`;
  const prompt = `Generate a ${messageType} for ${(account as any).account_name}:\n${ctx.slice(0, 6000)}\n${customContext ? 'Context: ' + customContext : ''}`;

  const [a, b] = await Promise.all([
    runAI(c.env.AI, EMAIL_MODEL, systemA, prompt),
    runAI(c.env.AI, EMAIL_MODEL, systemB, prompt),
  ]);

  return c.json({ variantA: a, variantB: b, accountName: (account as any).account_name });
});

// ── Voice Notes ────────────────────────────────────────────────────
app.post('/api/voice-note', async (c) => {
  const { accountId, transcript } = await c.req.json<any>();
  const email = c.get('userEmail');

  let accountCtx = '';
  let accountName = 'the prospect';
  if (accountId) {
    const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ? AND user_email = ?').bind(accountId, email).first();
    if (account) { accountCtx = buildAccountContext(account); accountName = (account as any).account_name; }
  }

  const system = `You are a sales assistant. A rep just finished a call and dictated notes. Generate a professional follow-up email based on their notes. Reference specific things discussed. Be warm but professional.`;
  const prompt = `Call notes (transcribed): "${transcript}"\n\nAccount: ${accountName}\n${accountCtx.slice(0, 4000)}\n\nGenerate a follow-up email starting with Subject: line.`;

  const generatedEmail = await runAI(c.env.AI, EMAIL_MODEL, system, prompt);

  await c.env.DB.prepare('INSERT INTO voice_notes (account_id, transcript, generated_email, user_email) VALUES (?,?,?,?)')
    .bind(accountId || null, transcript, generatedEmail, email).run();

  return c.json({ email: generatedEmail, transcript });
});

// ── Team Dashboard ─────────────────────────────────────────────────
app.get('/api/team-stats', async (c) => {
  const [users, emailsByUser, researchByUser, campaignsByUser, oppsByUser] = await Promise.all([
    c.env.DB.prepare('SELECT DISTINCT user_email FROM accounts WHERE user_email != ""').all(),
    c.env.DB.prepare('SELECT user_email, COUNT(*) as cnt FROM persona_messages GROUP BY user_email ORDER BY cnt DESC').all(),
    c.env.DB.prepare('SELECT user_email, COUNT(*) as cnt FROM research_reports GROUP BY user_email ORDER BY cnt DESC').all(),
    c.env.DB.prepare('SELECT user_email, COUNT(*) as cnt FROM campaigns GROUP BY user_email ORDER BY cnt DESC').all(),
    c.env.DB.prepare('SELECT user_email, COUNT(*) as cnt, SUM(acv) as total_acv FROM opportunities GROUP BY user_email ORDER BY total_acv DESC').all(),
  ]);

  return c.json({
    users: users.results,
    emailsByUser: emailsByUser.results,
    researchByUser: researchByUser.results,
    campaignsByUser: campaignsByUser.results,
    opportunitiesByUser: oppsByUser.results,
  });
});

// ══════════════════════════════════════════════════════════════════
// OPPORTUNITY MANAGEMENT & ACV TRACKING
// ══════════════════════════════════════════════════════════════════

app.get('/api/opportunities', async (c) => {
  const email = c.get('userEmail');
  const opps = await c.env.DB.prepare('SELECT * FROM opportunities WHERE user_email = ? ORDER BY created_at DESC').bind(email).all();
  return c.json(opps.results);
});

app.post('/api/opportunities', async (c) => {
  const email = c.get('userEmail');
  const { id, account_id, account_name, industry, country, acv, stage, notes } = await c.req.json<any>();
  if (id) {
    await c.env.DB.prepare('UPDATE opportunities SET account_name=?, industry=?, country=?, acv=?, stage=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_email=?')
      .bind(account_name, industry, country, acv||0, stage||'prospecting', notes||'', id, email).run();
    return c.json({ success: true, id });
  }
  const r = await c.env.DB.prepare('INSERT INTO opportunities (account_id, account_name, industry, country, acv, stage, notes, user_email) VALUES (?,?,?,?,?,?,?,?)')
    .bind(account_id||null, account_name||'', industry||'', country||'', acv||0, stage||'prospecting', notes||'', email).run();
  return c.json({ success: true, id: r.meta.last_row_id });
});

app.delete('/api/opportunities/:id', async (c) => {
  const email = c.get('userEmail');
  await c.env.DB.prepare('DELETE FROM opportunities WHERE id = ? AND user_email = ?').bind(c.req.param('id'), email).run();
  return c.json({ success: true });
});

app.get('/api/acv', async (c) => {
  const email = c.get('userEmail');
  const total = await c.env.DB.prepare('SELECT COALESCE(SUM(acv),0) as total FROM opportunities WHERE user_email = ?').bind(email).first() as any;
  const byCountry = await c.env.DB.prepare('SELECT country, SUM(acv) as total FROM opportunities WHERE user_email = ? AND country != "" GROUP BY country ORDER BY total DESC').bind(email).all();
  const byStage = await c.env.DB.prepare('SELECT stage, COUNT(*) as cnt, SUM(acv) as total FROM opportunities WHERE user_email = ? GROUP BY stage ORDER BY total DESC').bind(email).all();
  return c.json({ totalAcv: total?.total || 0, byCountry: byCountry.results, byStage: byStage.results });
});

// ── Catalog endpoint: return full CF product catalog for browsing ───
app.get('/api/catalog', (c) => {
  const catalog = Object.entries(CF_PRODUCT_CATALOG).map(([key, cat]) => ({
    key,
    category: cat.category,
    icon: cat.icon,
    productCount: cat.products.length,
    competitorCount: cat.competitors.length,
    products: cat.products.map(p => ({ name: p.name, desc: p.desc })),
    competitors: cat.competitors.map(comp => ({ key: comp.key, name: comp.name })),
  }));
  return c.json(catalog);
});

// ── Battlecard generation: works for any CF product vs any competitor ──
app.post('/api/competitive/:accountId', async (c) => {
  const accountId = c.req.param('accountId');
  const { category, competitorKey } = await c.req.json<{ category?: string; competitorKey?: string }>();

  const account = await c.env.DB.prepare(
    'SELECT * FROM accounts WHERE id = ? AND user_email = ?'
  ).bind(accountId, c.get('userEmail')).first();
  if (!account) return c.json({ error: 'Account not found' }, 404);

  // If category + competitor specified, generate a single focused battlecard
  if (category && competitorKey) {
    const cat = CF_PRODUCT_CATALOG[category];
    if (!cat) return c.json({ error: 'Unknown category' }, 400);
    const comp = cat.competitors.find(c => c.key === competitorKey);
    if (!comp) return c.json({ error: 'Unknown competitor' }, 400);

    // Scrape competitor + CF pages in parallel
    const [compPages, cfPage] = await Promise.all([
      Promise.all(comp.urls.map(async u => ({ label: u.label, content: await scrapeCompetitorPage(u.url) }))),
      scrapeCompetitorPage(cat.products[0]?.url || ''),
    ]);

    const competitorCtx = compPages.filter(p => p.content).map(p => `[${p.label}]: ${p.content.slice(0, 2500)}`).join('\n\n');
    const cfProducts = cat.products.map(p => `- ${p.name}: ${p.desc}`).join('\n');

    const system = `You are a Cloudflare competitive intelligence analyst. You have REAL scraped content from both the competitor's and Cloudflare's websites. Create a detailed, actionable battlecard. Cite real claims from the scraped pages. Format in clean markdown.`;

    const prompt = `Create a battlecard: **${comp.name}** vs **Cloudflare ${cat.category}**

ACCOUNT: ${account.account_name}
Industry: ${account.industry || 'N/A'} | IT Spend: $${account.total_it_spend?.toLocaleString() || 'N/A'}/mo
CDN: ${account.cdn_primary || 'N/A'} ($${account.cdn_spend || 0}/mo) | Security: ${account.security_primary || 'N/A'} ($${account.security_spend || 0}/mo) | DNS: ${account.dns_primary || 'N/A'} ($${account.dns_spend || 0}/mo)

CLOUDFLARE PRODUCTS IN THIS CATEGORY:
${cfProducts}

LIVE SCRAPED: ${comp.name} PAGES:
${competitorCtx || ''}

LIVE SCRAPED: CLOUDFLARE PAGE:
${cfPage.slice(0, 3000) || ''}

Generate these sections:

## ${comp.name} vs Cloudflare ${cat.category}

### Competitor Overview
What ${comp.name} offers based on their website. Key features, positioning, any pricing found.

### Cloudflare Advantage
Specific advantages for EACH Cloudflare product in this category. Include:
- Performance & scale (330+ cities, Tbps capacity)
- Pricing (flat-rate, no bandwidth charges, zero egress for R2)
- Platform integration (one dashboard, one vendor)
- Innovation velocity (reference Birthday Week, GA Week launches)

### Head-to-Head Feature Comparison
Table format comparing 6-8 key capabilities.

### Sales Talk Track
5 specific bullet points tailored to ${account.account_name}'s industry (${account.industry || 'their'} sector).

### Common Objections & Responses
4 objections specific to displacing ${comp.name}, with data-backed responses.

### Migration Playbook
Step-by-step migration from ${comp.name} to Cloudflare. Include timeline estimate and risk mitigation.

### ROI Estimate
Based on the account's spend profile, estimate potential savings and efficiency gains.`;

    const content = await runAI(c.env.AI, RESEARCH_MODEL, system, prompt);

    return c.json({
      battlecard: {
        category: cat.category,
        categoryKey: category,
        competitor: comp.name,
        competitorKey: comp.key,
        content,
        cfProducts: cat.products.map(p => ({ name: p.name, url: p.url, desc: p.desc })),
      },
    });
  }

  // If no specific category: auto-detect from account data and return all detected
  const allProducts = [
    account.cdn_products, account.security_products, account.dns_products,
    account.cloud_hosting_products, account.data_center_products, account.apm_products,
  ].filter(Boolean).join(';').toLowerCase();

  const detected: { categoryKey: string; category: string; icon: string; competitorKey: string; competitorName: string; spend: string }[] = [];

  for (const [catKey, cat] of Object.entries(CF_PRODUCT_CATALOG)) {
    for (const comp of cat.competitors) {
      if (allProducts.includes(comp.key) || allProducts.includes(comp.name.toLowerCase())) {
        detected.push({
          categoryKey: catKey,
          category: cat.category,
          icon: cat.icon,
          competitorKey: comp.key,
          competitorName: comp.name,
          spend: '',
        });
      }
    }
  }

  return c.json({ detected, accountName: account.account_name });
});

// ── Scheduled: Nightly change detection + threat matching ──────────
const worker = {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // Get all unique user emails
    const users = await env.DB.prepare('SELECT DISTINCT user_email FROM accounts WHERE user_email != ""').all();

    for (const user of users.results as any[]) {
      const email = user.user_email;
      // Get top 50 accounts by IT spend for this user
      const accounts = await env.DB.prepare('SELECT id, account_name, website, website_domain, industry, billing_country FROM accounts WHERE user_email = ? ORDER BY total_it_spend DESC LIMIT 50').bind(email).all();

      for (const a of accounts.results as any[]) {
        const domain = String(a.website || a.website_domain || '');
        if (!domain) continue;
        const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');

        try {
          // Quick probe (no Puppeteer — just HTTP + DNS for speed)
          const [probe, dns] = await Promise.all([probeDomain(clean), lookupDNS(clean)]);

          const lastProbe = await env.DB.prepare('SELECT * FROM probe_history WHERE account_id = ? ORDER BY created_at DESC LIMIT 1').bind(a.id).first() as any;

          await env.DB.prepare('INSERT INTO probe_history (account_id, cdn_detected, dns_provider, security_headers, server_info, probe_hash) VALUES (?,?,?,?,?,?)')
            .bind(a.id, probe.cdnDetected, dns.dnsProvider, JSON.stringify(probe.securityHeaders), probe.serverInfo, '').run();

          if (lastProbe) {
            if (lastProbe.cdn_detected !== probe.cdnDetected && probe.cdnDetected) {
              await env.DB.prepare('INSERT INTO alerts (account_id, alert_type, title, detail, severity, user_email) VALUES (?,?,?,?,?,?)')
                .bind(a.id, 'cdn_change', 'CDN Change: ' + a.account_name, lastProbe.cdn_detected + ' → ' + probe.cdnDetected, 'high', email).run();
            }
            if (lastProbe.dns_provider !== dns.dnsProvider && dns.dnsProvider) {
              await env.DB.prepare('INSERT INTO alerts (account_id, alert_type, title, detail, severity, user_email) VALUES (?,?,?,?,?,?)')
                .bind(a.id, 'dns_change', 'DNS Change: ' + a.account_name, lastProbe.dns_provider + ' → ' + dns.dnsProvider, 'high', email).run();
            }
          }
        } catch (_) {}
      }

      // Match threat intel to this user's accounts
      try {
        const threats = await fetchThreatIntelligence(1, undefined, env.THREAT_CACHE); // last 24h
        for (const a of accounts.results as any[]) {
          const matched = matchIncidentsToAccount(threats.incidents, a);
          for (const inc of matched.slice(0, 2)) { // Max 2 alerts per account
            await env.DB.prepare('INSERT INTO alerts (account_id, alert_type, title, detail, severity, user_email) VALUES (?,?,?,?,?,?)')
              .bind(a.id, 'threat_match', 'Threat: ' + inc.title.slice(0, 80), 'Matched to ' + a.account_name + ' (' + (a.industry || '') + '). Score: ' + inc.score, inc.score > 80 ? 'critical' : 'high', email).run();
          }
        }
      } catch (_) {}
    }
  },
};

export default worker;
