// ══════════════════════════════════════════════════════════════════
// RevFlare Threat Intelligence Module
// Ported from cf-bdr-worker — cybersecurity news aggregation,
// incident-to-CF-product mapping, incident-triggered BDR emails
// ══════════════════════════════════════════════════════════════════

// ── Constants ──────────────────────────────────────────────────────
const RSS_FEEDS = [
  'https://feeds.feedburner.com/TheHackersNews',
  'https://www.bleepingcomputer.com/feed/',
  'http://feeds.feedburner.com/Securityweek',
  'https://www.darkreading.com/rss_simple.asp',
  'https://threatpost.com/feed/',
  'https://www.cisa.gov/cybersecurity-advisories/all.xml',
  'https://www.cisa.gov/news.xml',
  'https://isc.sans.edu/rssfeed_full.xml',
  'https://krebsonsecurity.com/feed/',
  'https://www.scmagazine.com/feed',
  'https://www.infosecurity-magazine.com/rss/news/',
  'https://hackread.com/feed/',
  'https://cybersecuritynews.com/feed/',
  'https://securityaffairs.com/feed',
  'https://grahamcluley.com/feed/',
  'https://www.tripwire.com/state-of-security/feed',
  'https://blog.talosintelligence.com/rss/',
  'https://therecord.media/feed',
  'https://databreaches.net/feed/',
  'https://cybernews.com/security/feed/',
  'https://www.helpnetsecurity.com/feed/',
  'https://cyberscoop.com/feed/',
  'https://feeds.feedburner.com/TheRegister/Security',
  'https://www.csoonline.com/feed/',
];

const ATTACK_TERMS = [
  'ransomware','cyber attack','cyber-attack','hacked','hackers','data breach','security breach',
  'network breach','intrusion','systems down','it outage','service outage','ddos',
  'extortion','data leak','exfiltration','stolen data','taken offline','disrupted','compromised',
];

const ENTITY_KEYWORDS = [
  'city of','county of','town of','borough of','municipality','parish',
  'school district','public schools','school board','university','college','campus',
  'hospital','medical center','clinic','health system','police department','sheriff',
  'department of','ministry of','government of','state of','province of',
  'airport','port authority','transit authority','water authority','utility','power',
  'electric','energy','bank','credit union',
];

const NON_VICTIM_NEGATIVES = [
  /advisory|patch|update available|released patch|mitigation/i,
  /researchers? (found|discover)|poc|proof[-\s]?of[-\s]?concept/i,
  /preview|beta|partnership|launch/i,
];

// ── Helpers ────────────────────────────────────────────────────────
function toLower(x: any): string {
  try { return String(Array.isArray(x) ? x.join(', ') : x || '').toLowerCase(); } catch { return ''; }
}

function isEntityCompromised(text: string): boolean {
  const t = toLower(text);
  const hasEntity = ENTITY_KEYWORDS.some(k => t.includes(k));
  const hasAttack = ATTACK_TERMS.some(k => t.includes(k));
  if (!hasEntity || !hasAttack) return false;
  if (NON_VICTIM_NEGATIVES.some(re => re.test(text))) return false;
  return true;
}

function parseArticleDate(s: any): Date | null {
  if (!s) return null;
  const str = String(s);
  if (/^\d{14}$/.test(str)) {
    const dt = new Date(Date.UTC(+str.slice(0,4), +str.slice(4,6)-1, +str.slice(6,8), +str.slice(8,10), +str.slice(10,12), +str.slice(12,14)));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function inferCloudflareProducts(text: string): string[] {
  const t = toLower(text);
  const prods = new Set<string>();
  if (/ddos|denial\s+of\s+service|udp flood|syn flood/.test(t)) { prods.add('DDoS Protection'); prods.add('Magic Transit'); prods.add('Rate Limiting'); }
  if (/api\b|graphql|endpoint|jwt|api abuse/.test(t)) { prods.add('API Gateway'); prods.add('API Shield'); prods.add('WAF'); }
  if (/sql injection|xss|rce|remote code|path traversal|command injection|exploit/.test(t)) { prods.add('WAF'); prods.add('Managed Rules'); }
  if (/ransomware|malware|payload|beacon|c2|command and control/.test(t)) { prods.add('Zero Trust (Access & Gateway)'); prods.add('DLP'); prods.add('CASB'); prods.add('Email Security'); }
  if (/phishing|spoof|email|credential\s*harvest|business\s+email/.test(t)) { prods.add('Email Security'); prods.add('Zero Trust Gateway'); prods.add('DNS Filtering'); }
  if (/data breach|exposed|leak|pii|ssn|credentials? leaked/.test(t)) { prods.add('WAF'); prods.add('DLP'); prods.add('Zero Trust'); }
  if (/dns|hijack|poison|resolver|nameserver/.test(t)) { prods.add('DNS'); prods.add('DNSSEC'); prods.add('Zero Trust Gateway'); }
  if (/bot\b|scraping|credential stuffing|ato/.test(t)) { prods.add('Bot Management'); prods.add('Rate Limiting'); prods.add('Turnstile'); }
  if (/supply\s*chain|third[-\s]?party|dependency/.test(t)) { prods.add('Page Shield'); prods.add('CASB'); }
  return Array.from(prods);
}

function scoreIncident(item: any): number {
  const txt = toLower(`${item.title || ''} ${item.summary || ''} ${item.attack_summary || ''}`);
  let score = 0;
  const kw: [RegExp, number][] = [
    [/ransomware|double extortion|lockbit|blackcat|alphv|cl0p/, 35],
    [/data\s*breach|records?\s*(exposed|leaked)|exfiltration/, 24],
    [/zero[-\s]?day|0day/, 18],
    [/cve-\d{4}-\d+/, 12],
    [/supply\s*chain|third[-\s]?party/, 14],
    [/ddos|denial\s+of\s+service/, 10],
    [/critical|sev(?:erity)?\s*(critical|high)/, 12],
    [/infrastructure|ics|scada|utility|hospital|school|government|municipal/, 10],
  ];
  kw.forEach(([re, w]) => { if (re.test(txt)) score += w; });
  if (/\b(\d{1,3}(?:[,\.]\d{3})+|\d{5,})\b/.test(txt)) score += 10;
  if (/\bmillion\b|\bbillion\b/.test(txt)) score += 10;
  const cfProds = inferCloudflareProducts(txt);
  if (cfProds.length) score += 45 + cfProds.length * 5;
  return Math.round(score);
}

// ── Fetchers ───────────────────────────────────────────────────────
interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
}

function parseRssItems(xml: string, source: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const x = match[1];
    const titleM = x.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const linkM = x.match(/<link>(.*?)<\/link>/);
    const dateM = x.match(/<pubDate>(.*?)<\/pubDate>/);
    const descM = x.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
    if (titleM && linkM) {
      items.push({
        title: (titleM[1] || titleM[2] || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        summary: descM ? (descM[1] || descM[2] || '').replace(/<[^>]*>/g, ' ').slice(0, 500) : '',
        url: linkM[1] || '',
        publishedAt: dateM ? dateM[1] : new Date().toISOString(),
        source,
      });
    }
  }
  return items;
}

async function fetchRssFeeds(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(url =>
      fetch(url, { headers: { 'User-Agent': 'RevFlare-ThreatIntel/1.0' }, signal: AbortSignal.timeout(8000) })
        .then(r => r.ok ? r.text() : '')
    )
  );
  const all: NewsArticle[] = [];
  results.forEach(r => { if (r.status === 'fulfilled' && r.value) all.push(...parseRssItems(r.value, 'RSS')); });
  return all;
}

async function fetchGDELT(): Promise<NewsArticle[]> {
  try {
    const q = '("data breach" OR ransomware OR "cyber attack") AND (government OR city OR hospital OR university)';
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&timespan=14d&sort=datedesc&maxrecords=50&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json() as any;
    return (data.articles || []).map((a: any) => ({
      title: a.title || '', summary: a.title || '', url: a.url || '',
      publishedAt: a.seendate || '', source: 'GDELT',
    }));
  } catch { return []; }
}

async function fetchGoogleNewsRss(): Promise<NewsArticle[]> {
  const queries = ['cyber+attack+breach', 'ransomware+attack', 'data+breach+government', 'cybersecurity+incident'];
  const results = await Promise.allSettled(
    queries.map(q =>
      fetch(`https://news.google.com/rss/search?q=${q}+when:14d&hl=en&gl=US&ceid=US:en`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000),
      }).then(r => r.ok ? r.text() : '')
    )
  );
  const all: NewsArticle[] = [];
  results.forEach(r => { if (r.status === 'fulfilled' && r.value) all.push(...parseRssItems(r.value, 'GoogleNews')); });
  return all;
}

async function fetchBingNewsRss(): Promise<NewsArticle[]> {
  const queries = ['cyber+attack+data+breach', 'ransomware+attack+government', 'cybersecurity+incident'];
  const results = await Promise.allSettled(
    queries.map(q =>
      fetch(`https://www.bing.com/news/search?q=${q}&format=rss&count=50`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000),
      }).then(r => r.ok ? r.text() : '')
    )
  );
  const all: NewsArticle[] = [];
  results.forEach(r => { if (r.status === 'fulfilled' && r.value) all.push(...parseRssItems(r.value, 'BingNews')); });
  return all;
}

// ── Main: fetch all sources, filter, score, enrich ─────────────────
export interface ThreatIncident {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  score: number;
  cfProducts: string[];
  industry?: string;
  country?: string;
  attackSummary?: string;
}

export async function fetchThreatIntelligence(daysBack: number = 14): Promise<{ incidents: ThreatIncident[]; sourceCount: number; totalFetched: number }> {
  // Fetch all sources in parallel
  const [rss, gdelt, google, bing] = await Promise.all([
    fetchRssFeeds(),
    fetchGDELT(),
    fetchGoogleNewsRss(),
    fetchBingNewsRss(),
  ]);

  // Dedup by URL
  const seenUrls = new Set<string>();
  const all: NewsArticle[] = [];
  [rss, gdelt, google, bing].forEach(batch => {
    batch.forEach(a => {
      if (a.url && !seenUrls.has(a.url)) { all.push(a); seenUrls.add(a.url); }
    });
  });

  const totalFetched = all.length;

  // Filter by date
  const cutoff = Date.now() - daysBack * 86400000;
  let filtered = all.filter(a => {
    const d = parseArticleDate(a.publishedAt);
    return d && d.getTime() >= cutoff;
  });

  // Filter for entity-compromise incidents only
  filtered = filtered.filter(a => isEntityCompromised(a.title + ' ' + a.summary));

  // Score and sort
  const incidents: ThreatIncident[] = filtered.map(a => ({
    ...a,
    score: scoreIncident(a),
    cfProducts: inferCloudflareProducts(a.title + ' ' + a.summary),
  })).sort((a, b) => b.score - a.score);

  return { incidents: incidents.slice(0, 50), sourceCount: 4, totalFetched };
}

// ── AI enrichment for a single incident ────────────────────────────
export function buildIncidentAIPrompt(incident: ThreatIncident): string {
  return `Analyze this cybersecurity incident and output a JSON object:
Title: "${incident.title}"
Summary: "${incident.summary}"
Source: ${incident.source}
Date: ${incident.publishedAt}

Return JSON with: "industry", "country", "attack_type", "severity" (critical/high/medium/low), "affected_entity", "attack_summary" (2-3 sentences), "recommended_cf_products" (array of Cloudflare product names)`;
}

// ── BDR email from incident ────────────────────────────────────────
export function buildIncidentBDREmail(incident: ThreatIncident, accountName?: string, industry?: string): string {
  const cfProds = incident.cfProducts.length ? incident.cfProducts : ['Cloudflare Zero Trust', 'WAF', 'DDoS Protection'];
  const bullets = cfProds.map(p => `- ${p}`).join('\n');
  const target = accountName || 'your organization';
  const ind = industry || 'your industry';

  return `Subject: Recent ${ind} security incident — protecting ${target}

Hi,

A recent cybersecurity incident has been reported that is relevant to organizations in ${ind}:

"${incident.title}"

${incident.summary.slice(0, 300)}

Based on the attack pattern, these Cloudflare capabilities directly address the risks:
${bullets}

Companies across ${ind} are consolidating their security posture on Cloudflare's integrated platform — one dashboard, one vendor, protection from edge to origin.

Would you be open to a 15-minute call to discuss how similar organizations have strengthened their defenses?

Best regards`;
}

// ── Match incidents to an account's industry/country ───────────────
export function matchIncidentsToAccount(incidents: ThreatIncident[], account: any): ThreatIncident[] {
  const industry = toLower(account.industry || '');
  const country = toLower(account.billing_country || '');
  const name = toLower(account.account_name || '');

  return incidents.filter(inc => {
    const text = toLower(inc.title + ' ' + inc.summary);
    // Match by industry keywords
    if (industry && (text.includes(industry) || industry.includes('health') && text.includes('hospital') || industry.includes('edu') && text.includes('university') || industry.includes('government') && text.includes('government'))) return true;
    // Match by country
    if (country && text.includes(country)) return true;
    // Match by company name
    if (name.length > 3 && text.includes(name)) return true;
    // Match if same sector
    if (industry.includes('financial') && /bank|credit union|financial/.test(text)) return true;
    if (industry.includes('retail') && /retail|e-commerce|shopping/.test(text)) return true;
    if (industry.includes('telecom') && /telecom|carrier|isp/.test(text)) return true;
    return false;
  }).slice(0, 10);
}
