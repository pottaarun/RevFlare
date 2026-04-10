// ══════════════════════════════════════════════════════════════════
// RevFlare Threat Intelligence Module (complete port from cf-bdr-worker)
// All 7 news sources, country detection, scoring, AI enrichment
// ══════════════════════════════════════════════════════════════════

// ── RSS Feeds (26 cybersecurity sources) ───────────────────────────
const RSS_FEEDS = [
  'https://feeds.feedburner.com/TheHackersNews','https://www.bleepingcomputer.com/feed/',
  'http://feeds.feedburner.com/Securityweek','https://www.darkreading.com/rss_simple.asp',
  'https://threatpost.com/feed/','https://www.cisa.gov/cybersecurity-advisories/all.xml',
  'https://www.cisa.gov/news.xml','https://www.us-cert.cisa.gov/ncas/alerts.xml',
  'https://isc.sans.edu/rssfeed_full.xml','https://krebsonsecurity.com/feed/',
  'https://www.scmagazine.com/feed','https://www.infosecurity-magazine.com/rss/news/',
  'https://hackread.com/feed/','https://cybersecuritynews.com/feed/',
  'https://securityaffairs.com/feed','https://grahamcluley.com/feed/',
  'https://www.tripwire.com/state-of-security/feed','https://blog.talosintelligence.com/rss/',
  'https://therecord.media/feed','https://databreaches.net/feed/',
  'https://cybernews.com/security/feed/','https://www.helpnetsecurity.com/feed/',
  'https://cyberscoop.com/feed/','https://feeds.feedburner.com/TheRegister/Security',
  'https://www.csoonline.com/feed/',
];

const SECURITY_DOMAINS = [
  'bleepingcomputer.com','thehackernews.com','securityweek.com','darkreading.com',
  'csoonline.com','helpnetsecurity.com','theregister.com','krebsonsecurity.com',
  'infosecurity-magazine.com','threatpost.com','cyberscoop.com','cisa.gov',
  'us-cert.cisa.gov','isc.sans.edu','grahamcluley.com','tripwire.com',
  'scmagazine.com','hackread.com','cybersecuritynews.com','securityaffairs.com',
  'blog.talosintelligence.com','therecord.media','databreaches.net','cybernews.com',
];

// ── Country & Region Data ──────────────────────────────────────────
const COUNTRY_LIST: string[][] = [
  ['ALL','All Countries'],
  ['US','United States','USA','America','United States of America'],
  ['CA','Canada'],['UK','United Kingdom','Britain','England','Scotland','Wales','U.K.'],
  ['DE','Germany','Deutschland'],['FR','France'],['AU','Australia'],['JP','Japan'],
  ['IN','India'],['BR','Brazil'],['ES','Spain'],['IT','Italy'],
  ['NL','Netherlands','Holland'],['SE','Sweden'],['NO','Norway'],['FI','Finland'],
  ['DK','Denmark'],['IE','Ireland'],['CH','Switzerland'],['AT','Austria'],
];

const SUB_NATIONAL_REGIONS: Record<string, string[]> = {
  US: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
  CA: ['Ontario','Quebec','Nova Scotia','New Brunswick','Manitoba','British Columbia','Prince Edward Island','Saskatchewan','Alberta','Newfoundland'],
  AU: ['New South Wales','Victoria','Queensland','Western Australia','South Australia','Tasmania'],
};

const TLD_TO_CC: Record<string, string> = {
  '.uk':'UK','.us':'US','.ca':'CA','.de':'DE','.fr':'FR','.au':'AU','.jp':'JP','.in':'IN','.br':'BR','.es':'ES',
  '.it':'IT','.nl':'NL','.se':'SE','.no':'NO','.fi':'FI','.dk':'DK','.ie':'IE','.ch':'CH','.at':'AT',
};

// ── Attack/Entity Detection ────────────────────────────────────────
const ATTACK_TERMS = [
  'ransomware','cyber attack','cyber-attack','hacked','hackers','data breach','security breach',
  'network breach','intrusion','systems down','it outage','service outage','ddos',
  'extortion','data leak','exfiltration','stolen data','taken offline','disrupted','compromised',
];

const ENTITY_KEYWORDS = [
  'city of','county of','town of','borough of','municipality','parish',
  'school district','unified school district','public schools','school board',
  'university','college','campus','hospital','medical center','clinic','health system',
  'police department','sheriff','sheriff\'s office','fire department',
  'department of','ministry of','government of','state of','province of',
  'airport','port authority','transit authority','transport authority',
  'water authority','utility','power','electric','energy','bank','credit union',
];

const NON_VICTIM_NEGATIVES = [
  /advisory|patch|update available|released patch|mitigation/i,
  /researchers? (found|discover)|poc|proof[-\s]?of[-\s]?concept|demo/i,
  /preview|beta|partnership|launch/i,
];

const PRODUCT_PATTERNS = [
  'moveit','progress moveit','citrix','netscaler','gateway','ivanti','pulse secure','connect secure',
  'cisco','asa','anyconnect','ios xe','fortinet','fortigate','fortios','palo alto','pan-os','globalprotect',
  'juniper','struts','apache','microsoft exchange','exchange server','o365','sharepoint',
  'confluence','jira','atlassian','vmware','vcenter','esxi','wordpress','joomla','drupal',
  'vpn','ssl vpn','okta','saml','adfs','gitlab','github','bitbucket','f5','big-ip',
];

// ── Helpers ────────────────────────────────────────────────────────
function toLower(x: any): string {
  try { return String(Array.isArray(x) ? x.join(', ') : x || '').toLowerCase(); } catch { return ''; }
}

function isEntityCompromised(text: string): boolean {
  const t = toLower(text);
  if (!ENTITY_KEYWORDS.some(k => t.includes(k))) return false;
  if (!ATTACK_TERMS.some(k => t.includes(k))) return false;
  if (NON_VICTIM_NEGATIVES.some(re => re.test(text))) return false;
  return true;
}

function parseArticleDate(s: any): Date | null {
  if (!s) return null;
  const str = String(s);
  if (/^\d{14}$/.test(str)) return new Date(Date.UTC(+str.slice(0,4), +str.slice(4,6)-1, +str.slice(6,8), +str.slice(8,10), +str.slice(10,12), +str.slice(12,14)));
  if (/^\d{8}$/.test(str)) return new Date(Date.UTC(+str.slice(0,4), +str.slice(4,6)-1, +str.slice(6,8)));
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function extractCountryFromUrl(url: string): string | null {
  try { const host = new URL(url).hostname.toLowerCase(); for (const t in TLD_TO_CC) if (host.endsWith(t)) return TLD_TO_CC[t]; } catch {} return null;
}

function detectCountryFromText(text: string): string | null {
  for (const row of COUNTRY_LIST) {
    if (row[0] === 'ALL') continue;
    for (let i = 1; i < row.length; i++) {
      if (!row[i]) continue;
      const re = new RegExp(`\\b${row[i].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) return row[0];
    }
  }
  if (/\b(city|county|town|school|police|sheriff|state|university|college|hospital|utility|district|government)\b/i.test(text)) {
    for (const [code, regions] of Object.entries(SUB_NATIONAL_REGIONS)) {
      for (const region of regions) {
        if (region.length <= 2) continue;
        if (new RegExp(`\\b${region.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(text)) return code;
      }
    }
  }
  return null;
}

function detectCountryFromItem(item: any): string | null {
  return detectCountryFromText(`${item.title || ''} ${item.summary || ''}`) || extractCountryFromUrl(item.url || '') || null;
}

function extractProduct(text: string): string {
  const t = toLower(text);
  for (const p of PRODUCT_PATTERNS) if (t.includes(p)) return p.replace(/\b\w/g, c => c.toUpperCase());
  const m = t.match(/\b(cve-\d{4}-\d+)\b/i); if (m) return `Vulnerability (${m[1].toUpperCase()})`;
  return '';
}

export function inferCloudflareProducts(text: string): string[] {
  const t = toLower(text);
  const prods = new Set<string>();
  if (/ddos|denial\s+of\s+service|udp flood|syn flood|amplification/.test(t)) { prods.add('DDoS Protection'); prods.add('Magic Transit'); prods.add('Rate Limiting'); }
  if (/api\b|graphql|endpoint|jwt|api abuse|api attack/.test(t)) { prods.add('API Gateway'); prods.add('API Shield'); prods.add('WAF'); }
  if (/sql injection|xss|rce|remote code|path traversal|command injection|exploit/.test(t)) { prods.add('WAF'); prods.add('Managed Rules'); prods.add('mTLS (API Shield)'); }
  if (/ransomware|malware|payload|beacon|c2|command and control/.test(t)) { prods.add('Zero Trust (Access & Gateway)'); prods.add('DLP'); prods.add('CASB'); prods.add('Email Security'); }
  if (/phishing|spoof|email|credential\s*harvest|business\s+email\s+compromise/.test(t)) { prods.add('Email Security'); prods.add('Zero Trust Gateway'); prods.add('DNS Filtering'); }
  if (/data breach|exposed|leak|pii|ssn|credentials? leaked|source code leaked/.test(t)) { prods.add('WAF'); prods.add('DLP'); prods.add('Zero Trust'); }
  if (/dns|hijack|poison|resolver|nameserver/.test(t)) { prods.add('DNS'); prods.add('DNSSEC'); prods.add('Zero Trust Gateway'); }
  if (/bot\b|scraping|credential stuffing|ato/.test(t)) { prods.add('Bot Management'); prods.add('Rate Limiting'); prods.add('Turnstile'); }
  if (/supply\s*chain|third[-\s]?party|dependency|typosquat/.test(t)) { prods.add('Page Shield'); prods.add('CASB'); }
  return Array.from(prods);
}

// ── Scoring (dual: pre-filter relevance + post-enrichment severity) ─
function newsRelevanceScore(article: any): number {
  const title = toLower(article.title || '');
  const desc = toLower(article.summary || article.description || '');
  const text = `${title} ${desc}`;
  if (!isEntityCompromised(text)) return -1000;

  let score = SECURITY_DOMAINS.some(d => (article.url || '').includes(d)) ? 8 : 0;
  const pos: [RegExp, number][] = [
    [/ransomware|double extortion|lockbit|blackcat|alphv|cl0p/, 20],
    [/data\s*breach|records?\s*(exposed|leaked)|exfiltration/, 16],
    [/zero[-\s]?day|0day/, 12],[/cve-\d{4}-\d+/, 10],
    [/ddos|denial\s+of\s+service/, 10],[/vulnerabilit|exploit|rce|csrf|xss|sqli/, 10],
    [/api security|api attack|graphql|endpoint/, 8],[/phishing|email security|bec|spoof/, 8],
    [/supply\s*chain|third[-\s]?party/, 8],[/bot|scraping|credential stuffing|ato/, 8],
    [/ics|scada|critical infrastructure|hospital|school|municipal/, 6],
  ];
  pos.forEach(([re, w]) => { if (re.test(text)) score += w; });
  if (/\b(\d{1,3}(?:[,\.]\d{3})+|\d{5,})\b/.test(text)) score += 5;
  if (/million|billion/.test(text)) score += 6;
  return score;
}

function scoreIncident(item: any): number {
  const txt = toLower(`${item.title || ''} ${item.summary || ''} ${item.attack_summary || ''}`);
  let score = 0;
  const kw: [RegExp, number][] = [
    [/ransomware|double extortion|lockbit|blackcat|alphv|cl0p/, 35],
    [/data\s*breach|records?\s*(exposed|leaked)|exfiltration/, 24],
    [/zero[-\s]?day|0day/, 18],[/cve-\d{4}-\d+/, 12],
    [/supply\s*chain|third[-\s]?party/, 14],[/ddos|denial\s+of\s+service/, 10],
    [/critical|sev(?:erity)?\s*(critical|high)/, 12],
    [/infrastructure|ics|scada|utility|hospital|school|government|municipal/, 10],
  ];
  kw.forEach(([re, w]) => { if (re.test(txt)) score += w; });
  if (/\b(\d{1,3}(?:[,\.]\d{3})+|\d{5,})\b/.test(txt)) score += 10;
  if (/million|billion/.test(txt)) score += 10;

  const cfProds = inferCloudflareProducts(txt);
  if (cfProds.length) { score += 45; cfProds.forEach(() => score += 5); }

  // Age decay
  let ageDays = 14;
  if (item.publishedAt) { const t = parseArticleDate(item.publishedAt)?.getTime(); if (t) ageDays = Math.max(0, (Date.now() - t) / 86400000); }
  if (ageDays < 1) score += 20; else score += Math.max(0, 10 - ageDays);

  // Country boost
  const country = (item.country || '').toUpperCase();
  if (['US','UK','CA','DE','FR','AU','JP','IN'].includes(country)) score += 4;

  return Math.round(score);
}

// ── RSS Parser ─────────────────────────────────────────────────────
interface NewsArticle { title: string; summary: string; url: string; publishedAt: string; source: string; }

function parseRssItems(xml: string, source: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const rx = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = rx.exec(xml)) !== null) {
    const x = m[1];
    const ti = x.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const li = x.match(/<link>(.*?)<\/link>/);
    const dt = x.match(/<pubDate>(.*?)<\/pubDate>/);
    const ds = x.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
    if (ti && li) items.push({
      title: (ti[1]||ti[2]||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'),
      summary: ds ? (ds[1]||ds[2]||'').replace(/<[^>]*>/g,' ').slice(0,500) : '',
      url: li[1]||'', publishedAt: dt ? dt[1] : new Date().toISOString(), source,
    });
  }
  return items;
}

// ── Fetchers (7 sources) ───────────────────────────────────────────
async function fetchRss(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(RSS_FEEDS.map(url => fetch(url, { headers:{'User-Agent':'RevFlare-ThreatIntel/1.0'}, signal: AbortSignal.timeout(8000) }).then(r=>r.ok?r.text():'')));
  const all: NewsArticle[] = [];
  results.forEach(r => { if (r.status==='fulfilled' && r.value) all.push(...parseRssItems(r.value, 'RSS')); });
  return all;
}

async function fetchGDELT(daysBack: number): Promise<NewsArticle[]> {
  try {
    const q = '("data breach" OR ransomware OR "cyber attack") AND (government OR city OR hospital OR university)';
    const r = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&timespan=${daysBack}d&sort=datedesc&maxrecords=100&format=json`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json() as any;
    return (d.articles||[]).map((a:any) => ({ title:a.title||'', summary:a.title||'', url:a.url||'', publishedAt:a.seendate||'', source:'GDELT' }));
  } catch { return []; }
}

async function fetchGoogleNews(): Promise<NewsArticle[]> {
  const qs = ['cyber+attack+breach','ransomware+attack','data+breach+government','cybersecurity+incident+hospital'];
  const results = await Promise.allSettled(qs.map(q => fetch(`https://news.google.com/rss/search?q=${q}+when:14d&hl=en&gl=US&ceid=US:en`, { headers:{'User-Agent':'Mozilla/5.0'}, signal: AbortSignal.timeout(6000) }).then(r=>r.ok?r.text():'')));
  const all: NewsArticle[] = [];
  results.forEach(r => { if (r.status==='fulfilled' && r.value) all.push(...parseRssItems(r.value, 'GoogleNews')); });
  return all;
}

async function fetchBingNews(): Promise<NewsArticle[]> {
  const qs = ['cyber+attack+data+breach','ransomware+attack+government','cybersecurity+incident+compromised'];
  const results = await Promise.allSettled(qs.map(q => fetch(`https://www.bing.com/news/search?q=${q}&format=rss&count=50`, { headers:{'User-Agent':'Mozilla/5.0'}, signal: AbortSignal.timeout(6000) }).then(r=>r.ok?r.text():'')));
  const all: NewsArticle[] = [];
  results.forEach(r => { if (r.status==='fulfilled' && r.value) all.push(...parseRssItems(r.value, 'BingNews')); });
  return all;
}

// Paid sources (optional, via API keys stored in D1 settings or env)
async function fetchNewsAPI(apiKey: string): Promise<NewsArticle[]> {
  if (!apiKey) return [];
  try {
    const from = new Date(Date.now()-14*86400000).toISOString().split('T')[0];
    const q = encodeURIComponent('(ransomware OR "data breach" OR "cyber attack") AND (government OR city OR hospital OR university)');
    const r = await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&pageSize=100&sortBy=publishedAt&from=${from}&apiKey=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json() as any;
    return (d.articles||[]).map((a:any) => ({ title:a.title||'', summary:a.description||'', url:a.url||'', publishedAt:a.publishedAt||'', source:'NewsAPI' }));
  } catch { return []; }
}

async function fetchGNews(apiKey: string): Promise<NewsArticle[]> {
  if (!apiKey) return [];
  try {
    const from = new Date(Date.now()-14*86400000).toISOString().slice(0,10);
    const to = new Date().toISOString().slice(0,10);
    const q = encodeURIComponent('("data breach" OR ransomware OR "cyber attack") (government OR city OR hospital)');
    const r = await fetch(`https://gnews.io/api/v4/search?token=${apiKey}&q=${q}&lang=en&from=${from}&to=${to}&sortby=relevance&max=100`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json() as any;
    return (d.articles||[]).map((a:any) => ({ title:a.title||'', summary:a.description||'', url:a.url||'', publishedAt:a.publishedAt||'', source:'GNews' }));
  } catch { return []; }
}

async function fetchMediaStack(apiKey: string): Promise<NewsArticle[]> {
  if (!apiKey) return [];
  try {
    const from = new Date(Date.now()-14*86400000).toISOString().split('T')[0];
    const r = await fetch(`http://api.mediastack.com/v1/news?access_key=${apiKey}&keywords=ransomware,cyber attack,data breach&sort=published_desc&languages=en&date=${from}&limit=100`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json() as any;
    return (d.data||[]).map((a:any) => ({ title:a.title||'', summary:a.description||'', url:a.url||'', publishedAt:a.published_at||'', source:'MediaStack' }));
  } catch { return []; }
}

// ── Main: fetch all, filter, score ─────────────────────────────────
export interface ThreatIncident {
  title: string; summary: string; url: string; publishedAt: string; source: string;
  score: number; cfProducts: string[]; country: string; product: string;
  isNew?: boolean; // true if first seen in this fetch (not in KV dedup set)
}

// ── KV dedup helpers ───────────────────────────────────────────────
function hashUrl(url: string): string {
  // Fast non-crypto hash — just need uniqueness, not security
  let h = 0;
  for (let i = 0; i < url.length; i++) { h = ((h << 5) - h + url.charCodeAt(i)) | 0; }
  return 'art:' + (h >>> 0).toString(36);
}

async function getSeenUrls(kv: KVNamespace | undefined): Promise<Set<string>> {
  if (!kv) return new Set();
  try {
    const data = await kv.get('seen_urls', 'json') as string[] | null;
    return new Set(data || []);
  } catch { return new Set(); }
}

async function persistSeenUrls(kv: KVNamespace | undefined, urls: Set<string>): Promise<void> {
  if (!kv) return;
  try {
    // Keep max 5000 URLs, trim oldest (set has insertion order)
    const arr = Array.from(urls);
    const trimmed = arr.length > 5000 ? arr.slice(arr.length - 5000) : arr;
    await kv.put('seen_urls', JSON.stringify(trimmed), { expirationTtl: 30 * 86400 }); // 30-day TTL
  } catch {}
}

async function getCachedResult(kv: KVNamespace | undefined): Promise<{ incidents: ThreatIncident[]; sourceCount: number; totalFetched: number } | null> {
  if (!kv) return null;
  try {
    return await kv.get('threat_cache', 'json');
  } catch { return null; }
}

async function setCachedResult(kv: KVNamespace | undefined, data: any): Promise<void> {
  if (!kv) return;
  try {
    await kv.put('threat_cache', JSON.stringify(data), { expirationTtl: 600 }); // 10-min cache
  } catch {}
}

export async function fetchThreatIntelligence(daysBack: number = 14, apiKeys?: { newsApi?: string; gNews?: string; mediaStack?: string }, kv?: KVNamespace): Promise<{ incidents: ThreatIncident[]; sourceCount: number; totalFetched: number; cached: boolean }> {
  // Check cache first (avoid hammering feeds on every page load)
  const cached = await getCachedResult(kv);
  if (cached) return { ...cached, cached: true };

  const [rss, gdelt, google, bing, newsApi, gNews, mediaStack] = await Promise.all([
    fetchRss(), fetchGDELT(daysBack), fetchGoogleNews(), fetchBingNews(),
    fetchNewsAPI(apiKeys?.newsApi || ''), fetchGNews(apiKeys?.gNews || ''), fetchMediaStack(apiKeys?.mediaStack || ''),
  ]);

  // In-request dedup by URL
  const inReqSeen = new Set<string>();
  const all: NewsArticle[] = [];
  [rss, gdelt, google, bing, newsApi, gNews, mediaStack].forEach(batch => {
    batch.forEach(a => { if (a.url && !inReqSeen.has(a.url)) { all.push(a); inReqSeen.add(a.url); } });
  });
  const totalFetched = all.length;

  // KV dedup — filter out articles already seen in previous requests
  const kvSeen = await getSeenUrls(kv);
  const newArticles = all.filter(a => !kvSeen.has(hashUrl(a.url)));

  // Persist all URLs (old + new) to KV
  all.forEach(a => kvSeen.add(hashUrl(a.url)));
  persistSeenUrls(kv, kvSeen); // fire-and-forget

  // Use all articles for scoring (not just new), but flag new ones
  const newUrlSet = new Set(newArticles.map(a => a.url));

  // Filter by date
  const cutoff = Date.now() - daysBack * 86400000;
  let filtered = all.filter(a => { const d = parseArticleDate(a.publishedAt); return d && d.getTime() >= cutoff; });

  // Pre-filter by relevance
  filtered = filtered.filter(a => newsRelevanceScore(a) > 0);
  filtered.sort((a, b) => newsRelevanceScore(b) - newsRelevanceScore(a));

  // Enrich
  const incidents: ThreatIncident[] = filtered.slice(0, 100).map(a => ({
    ...a,
    score: scoreIncident(a),
    cfProducts: inferCloudflareProducts(a.title + ' ' + a.summary),
    country: detectCountryFromItem(a) || '',
    product: extractProduct(a.title + ' ' + a.summary),
    isNew: newUrlSet.has(a.url),
  }));

  incidents.sort((a, b) => b.score - a.score);

  const sourceCount = [rss.length, gdelt.length, google.length, bing.length, newsApi.length, gNews.length, mediaStack.length].filter(n => n > 0).length;
  const result = { incidents: incidents.slice(0, 50), sourceCount, totalFetched, cached: false };

  // Cache for 10 minutes
  setCachedResult(kv, result);

  return result;
}

// ── AI enrichment prompt ───────────────────────────────────────────
export function buildIncidentAIPrompt(incident: ThreatIncident): string {
  return `Analyze this cybersecurity incident and output a JSON object:
Title: "${incident.title}"
Summary: "${incident.summary}"
Source: ${incident.source}, Date: ${incident.publishedAt}
Return JSON with: "industry", "country", "attack_type", "severity", "affected_entity", "attack_summary", "recommended_cf_products"`;
}

// ── BDR email from incident ────────────────────────────────────────
export function buildIncidentBDREmail(incident: ThreatIncident, accountName?: string, industry?: string): string {
  const cfProds = incident.cfProducts.length ? incident.cfProducts : ['Cloudflare Zero Trust','WAF','DDoS Protection'];
  const bullets = cfProds.map(p => `- ${p}`).join('\n');
  const target = accountName || 'your organization';
  const ind = industry || 'your industry';
  const product = incident.product ? ` involving ${incident.product}` : '';
  const country = incident.country ? ` in ${incident.country}` : '';

  return `Subject: Recent ${ind} security incident${country} — protecting ${target}

Hi,

A recent security incident${product}${country} has been reported. ${incident.summary.slice(0, 200)}

Based on the attack pattern, these Cloudflare capabilities directly mitigate the risks:
${bullets}

Companies across ${ind} are consolidating their security posture on Cloudflare's platform — one dashboard, one vendor, protection from edge to origin.

Would you be open to a 15-minute call to discuss how similar organizations have strengthened their defenses?

Best regards`;
}

// ── Match incidents to account ─────────────────────────────────────
export function matchIncidentsToAccount(incidents: ThreatIncident[], account: any): ThreatIncident[] {
  const industry = toLower(account.industry || '');
  const country = toLower(account.billing_country || '');
  const name = toLower(account.account_name || '');

  return incidents.filter(inc => {
    const text = toLower(inc.title + ' ' + inc.summary);
    const incCountry = toLower(inc.country);
    if (industry) {
      if (text.includes(industry)) return true;
      if (industry.includes('health') && /hospital|medical|clinic|health/.test(text)) return true;
      if (industry.includes('edu') && /university|college|school/.test(text)) return true;
      if (industry.includes('government') && /government|municipal|city of|county/.test(text)) return true;
      if (industry.includes('financial') && /bank|credit union|financial/.test(text)) return true;
      if (industry.includes('retail') && /retail|e-commerce|shopping/.test(text)) return true;
      if (industry.includes('telecom') && /telecom|carrier|isp/.test(text)) return true;
    }
    if (country && incCountry && incCountry.includes(country)) return true;
    if (name.length > 3 && text.includes(name)) return true;
    return false;
  }).slice(0, 10);
}
