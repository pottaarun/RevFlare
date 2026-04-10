// ══════════════════════════════════════════════════════════════════
// RevFlare Advanced Features Module
// Lead Scoring, Change Detection, Sequences, Meeting Prep,
// ROI Calculator, Lookalike, Win/Loss, Playbooks, Voice Notes,
// A/B Testing, Team Dashboard
// ══════════════════════════════════════════════════════════════════

// ── Lead Scoring Engine ────────────────────────────────────────────
export function calculateLeadScore(account: any): { score: number; factors: { name: string; points: number; detail: string }[] } {
  const factors: { name: string; points: number; detail: string }[] = [];
  let score = 0;

  // 1. IT Spend (0-20 pts)
  const itSpend = account.total_it_spend || 0;
  if (itSpend > 1000000) { factors.push({ name: 'IT Spend', points: 20, detail: '$' + (itSpend/1000000).toFixed(1) + 'M/mo — massive opportunity' }); score += 20; }
  else if (itSpend > 100000) { factors.push({ name: 'IT Spend', points: 15, detail: '$' + (itSpend/1000).toFixed(0) + 'K/mo — significant spend' }); score += 15; }
  else if (itSpend > 10000) { factors.push({ name: 'IT Spend', points: 10, detail: '$' + (itSpend/1000).toFixed(0) + 'K/mo' }); score += 10; }
  else if (itSpend > 1000) { factors.push({ name: 'IT Spend', points: 5, detail: '$' + itSpend.toFixed(0) + '/mo' }); score += 5; }

  // 2. Wallet Penetration Gap (0-15 pts) — low penetration = more upside
  const cfMRR = account.current_monthly_fee || 0;
  const penetration = itSpend > 0 ? cfMRR / itSpend : 0;
  if (penetration < 0.05 && itSpend > 5000) { factors.push({ name: 'Low Wallet Penetration', points: 15, detail: (penetration * 100).toFixed(1) + '% — huge expansion opportunity' }); score += 15; }
  else if (penetration < 0.2) { factors.push({ name: 'Growth Room', points: 10, detail: (penetration * 100).toFixed(1) + '% penetration' }); score += 10; }
  else if (penetration < 0.5) { factors.push({ name: 'Moderate Penetration', points: 5, detail: (penetration * 100).toFixed(1) + '%' }); score += 5; }

  // 3. Displaceable Competitors (0-15 pts)
  const allProds = [account.cdn_products, account.security_products, account.dns_products, account.cloud_hosting_products].filter(Boolean).join(';').toLowerCase();
  const competitors = ['akamai', 'cloudfront', 'fastly', 'imperva', 'zscaler', 'palo alto', 'crowdstrike', 'f5'];
  const found = competitors.filter(c => allProds.includes(c));
  if (found.length >= 3) { factors.push({ name: 'Multi-Vendor Displacement', points: 15, detail: found.length + ' displaceable vendors: ' + found.join(', ') }); score += 15; }
  else if (found.length >= 1) { factors.push({ name: 'Competitor Present', points: 8, detail: found.join(', ') }); score += 8; }

  // 4. Activity Recency (0-10 pts) — recent activity = engaged
  const lastActivity = account.last_activity;
  if (lastActivity) {
    const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
    if (days < 30) { factors.push({ name: 'Recent Activity', points: 10, detail: days + ' days ago' }); score += 10; }
    else if (days < 90) { factors.push({ name: 'Active Account', points: 5, detail: days + ' days ago' }); score += 5; }
  }
  if (account.activities_last_30 > 5) { factors.push({ name: 'High Activity', points: 5, detail: account.activities_last_30 + ' activities in 30 days' }); score += 5; }

  // 5. Open Opportunities (0-10 pts)
  const openOpps = account.opportunities_open || 0;
  if (openOpps > 0) { factors.push({ name: 'Open Pipeline', points: 10, detail: openOpps + ' open opportunities' }); score += 10; }

  // 6. Company Size (0-10 pts)
  const employees = account.employees || 0;
  if (employees > 10000) { factors.push({ name: 'Enterprise', points: 10, detail: employees.toLocaleString() + ' employees' }); score += 10; }
  else if (employees > 1000) { factors.push({ name: 'Mid-Market', points: 7, detail: employees.toLocaleString() + ' employees' }); score += 7; }
  else if (employees > 100) { factors.push({ name: 'Growth Company', points: 4, detail: employees.toLocaleString() + ' employees' }); score += 4; }

  // 7. Security Gaps (0-10 pts) — no CF security = opportunity
  const secPrimary = (account.security_primary || '').toLowerCase();
  if (secPrimary && !secPrimary.includes('cloudflare')) { factors.push({ name: 'Security Gap', points: 8, detail: 'Using ' + account.security_primary + ' — not on CF security' }); score += 8; }

  // 8. SAM (0-10 pts)
  const sam = account.sam || 0;
  if (sam > 100000) { factors.push({ name: 'High SAM', points: 10, detail: '$' + (sam/1000).toFixed(0) + 'K SAM' }); score += 10; }
  else if (sam > 10000) { factors.push({ name: 'Moderate SAM', points: 5, detail: '$' + (sam/1000).toFixed(0) + 'K SAM' }); score += 5; }

  return { score: Math.min(100, score), factors };
}

// ── ROI Calculator ─────────────────────────────────────────────────
export function calculateROI(account: any): {
  currentMonthly: number; projectedMonthly: number; annualSavings: number;
  breakdown: { category: string; current: number; projected: number; savings: number; product: string }[];
  consolidationValue: number; vendorCount: number;
} {
  const breakdown: { category: string; current: number; projected: number; savings: number; product: string }[] = [];

  const categories = [
    { name: 'CDN', spend: account.cdn_spend || 0, vendor: account.cdn_primary, cfProduct: 'Cloudflare CDN + Argo', savingsPct: 0.35 },
    { name: 'Security', spend: account.security_spend || 0, vendor: account.security_primary, cfProduct: 'Cloudflare WAF + DDoS + Bot Mgmt', savingsPct: 0.30 },
    { name: 'DNS', spend: account.dns_spend || 0, vendor: account.dns_primary, cfProduct: 'Cloudflare DNS', savingsPct: 0.50 },
    { name: 'Cloud Hosting', spend: account.cloud_hosting_spend || 0, vendor: account.cloud_hosting_primary, cfProduct: 'Workers + R2 + D1', savingsPct: 0.25 },
    { name: 'Data Center', spend: account.data_center_spend || 0, vendor: account.data_center_primary, cfProduct: 'Magic Transit + Magic WAN', savingsPct: 0.20 },
    { name: 'Traffic Mgmt', spend: account.traffic_mgmt_spend || 0, vendor: account.traffic_mgmt_primary, cfProduct: 'Argo + Load Balancing', savingsPct: 0.30 },
  ];

  let currentTotal = 0, projectedTotal = 0, vendorCount = 0;
  for (const cat of categories) {
    if (cat.spend > 0) {
      const savings = Math.round(cat.spend * cat.savingsPct);
      const projected = cat.spend - savings;
      breakdown.push({ category: cat.name, current: cat.spend, projected, savings, product: cat.cfProduct });
      currentTotal += cat.spend;
      projectedTotal += projected;
      if (cat.vendor) vendorCount++;
    }
  }

  // Consolidation operational savings (fewer vendors = less overhead)
  const consolidationValue = vendorCount > 2 ? Math.round(vendorCount * 2000) : 0; // ~$2K/mo per vendor in mgmt overhead

  return {
    currentMonthly: currentTotal,
    projectedMonthly: projectedTotal,
    annualSavings: (currentTotal - projectedTotal + consolidationValue) * 12,
    breakdown,
    consolidationValue,
    vendorCount,
  };
}

// ── Account Lookalike Finder ───────────────────────────────────────
export function scoreSimilarity(a: any, reference: any): number {
  let score = 0;

  // Industry match (most important)
  if (a.industry && reference.industry && a.industry === reference.industry) score += 30;

  // IT Spend range (within 2x)
  const aSpend = a.total_it_spend || 0, rSpend = reference.total_it_spend || 0;
  if (rSpend > 0 && aSpend > 0) {
    const ratio = aSpend / rSpend;
    if (ratio >= 0.5 && ratio <= 2.0) score += 20;
    else if (ratio >= 0.25 && ratio <= 4.0) score += 10;
  }

  // Employee range (within 3x)
  const aEmp = a.employees || 0, rEmp = reference.employees || 0;
  if (rEmp > 0 && aEmp > 0) {
    const ratio = aEmp / rEmp;
    if (ratio >= 0.33 && ratio <= 3.0) score += 15;
  }

  // Same CDN vendor
  if (a.cdn_primary && reference.cdn_primary && a.cdn_primary === reference.cdn_primary) score += 10;
  // Same security vendor
  if (a.security_primary && reference.security_primary && a.security_primary === reference.security_primary) score += 10;
  // Same country
  if (a.billing_country && reference.billing_country && a.billing_country === reference.billing_country) score += 10;
  // Same segment
  if (a.account_segment && reference.account_segment && a.account_segment === reference.account_segment) score += 5;

  return score;
}

// ── Meeting Prep Prompt Builder ────────────────────────────────────
export function buildMeetingPrepPrompt(account: any, accountContext: string, recentResearch: string, recentMessages: string): string {
  return `Generate a one-page meeting preparation briefing for a call with ${account.account_name}.

ACCOUNT DATA:
${accountContext}

RECENT RESEARCH ON THIS ACCOUNT:
${recentResearch || 'No previous research generated.'}

RECENT MESSAGES SENT:
${recentMessages || 'No previous messages generated.'}

STRUCTURE THE BRIEFING AS:

## Meeting Prep: ${account.account_name}

### 1. Company Snapshot (2-3 sentences)
Who they are, what they do, their scale.

### 2. Current Infrastructure & Spend
Their tech stack in a quick table format. Flag any Cloudflare products already in use.

### 3. Recent Activity & Context
Any news, funding, SEC filings, or recent interactions. What's top of mind for them right now?

### 4. Our Relationship
Current Cloudflare MRR, open opportunities, last activity date, customer since date.

### 5. Competitive Landscape
What competitors are in their stack and what's the displacement opportunity.

### 6. Three Questions to Ask
Specific, insightful questions based on their situation.

### 7. Three Things to Pitch
Specific Cloudflare products/capabilities mapped to their needs.

### 8. Potential Objections
What pushback to expect and how to handle it.

Keep it concise — this should be scannable in 2 minutes before the call.`;
}

// ── Sequence Touch Templates ───────────────────────────────────────
export const SEQUENCE_TEMPLATES: Record<string, { name: string; touches: { day: number; channel: string; type: string; description: string }[] }> = {
  cold_outbound: {
    name: 'Cold Outbound (7-touch)',
    touches: [
      { day: 0, channel: 'email', type: 'cold_email', description: 'Initial value-driven outreach with industry insight' },
      { day: 3, channel: 'linkedin', type: 'linkedin_message', description: 'LinkedIn connection request with personalized note' },
      { day: 5, channel: 'email', type: 'follow_up', description: 'Follow-up referencing specific tech stack finding' },
      { day: 8, channel: 'phone', type: 'call_script', description: 'Call with voicemail script' },
      { day: 12, channel: 'email', type: 'displacement_outreach', description: 'Competitor displacement angle with cost savings' },
      { day: 17, channel: 'linkedin', type: 'linkedin_message', description: 'Share relevant case study or threat intel' },
      { day: 21, channel: 'email', type: 'follow_up', description: 'Breakup email with clear CTA' },
    ],
  },
  expansion: {
    name: 'Customer Expansion (5-touch)',
    touches: [
      { day: 0, channel: 'email', type: 'expansion_email', description: 'New product announcement relevant to their stack' },
      { day: 4, channel: 'email', type: 'roi_framework', description: 'ROI analysis for expanding Cloudflare footprint' },
      { day: 10, channel: 'phone', type: 'call_script', description: 'QBR check-in call' },
      { day: 15, channel: 'email', type: 'consolidation_pitch', description: 'Vendor consolidation pitch with savings estimate' },
      { day: 22, channel: 'email', type: 'executive_email', description: 'Executive summary to sponsor/champion' },
    ],
  },
  security_incident: {
    name: 'Post-Incident (5-touch)',
    touches: [
      { day: 0, channel: 'email', type: 'cold_email', description: 'Reference the specific incident, position CF solutions' },
      { day: 2, channel: 'linkedin', type: 'linkedin_message', description: 'Share related threat intel report' },
      { day: 5, channel: 'email', type: 'technical_brief', description: 'Technical brief on how CF prevents this attack type' },
      { day: 9, channel: 'phone', type: 'call_script', description: 'Offer complimentary security assessment' },
      { day: 14, channel: 'email', type: 'executive_email', description: 'Board-level security posture pitch' },
    ],
  },
  competitive_displacement: {
    name: 'Competitive Displacement (6-touch)',
    touches: [
      { day: 0, channel: 'email', type: 'displacement_outreach', description: 'Lead with their verified CDN/security stack, position switch' },
      { day: 3, channel: 'linkedin', type: 'linkedin_message', description: 'Share Forrester/Gartner recognition' },
      { day: 7, channel: 'email', type: 'roi_framework', description: 'TCO comparison: current vendors vs Cloudflare' },
      { day: 11, channel: 'phone', type: 'call_script', description: 'Call offering a technical workshop' },
      { day: 16, channel: 'email', type: 'migration_plan', description: 'Migration playbook specific to their stack' },
      { day: 22, channel: 'email', type: 'executive_email', description: 'CxO-level platform consolidation case' },
    ],
  },
};

// ── Win/Loss Analysis Prompt ───────────────────────────────────────
export function buildWinLossPrompt(opportunity: any, account: any, accountContext: string): string {
  const outcome = opportunity.stage === 'closed_won' ? 'WON' : 'LOST';
  return `Generate a detailed win/loss analysis for this ${outcome} deal.

OPPORTUNITY:
Account: ${account.account_name}
ACV: $${(opportunity.acv || 0).toLocaleString()}
Stage: ${opportunity.stage}
Industry: ${opportunity.industry || account.industry || 'Unknown'}
Notes: ${opportunity.notes || 'None'}

ACCOUNT CONTEXT:
${accountContext}

ANALYZE:

## ${outcome === 'WON' ? 'Win' : 'Loss'} Analysis: ${account.account_name}

### What happened?
Summarize the deal based on available data.

### ${outcome === 'WON' ? 'What worked?' : 'Why did we lose?'}
Key factors based on the account's tech stack, competitors, and engagement patterns.

### ${outcome === 'WON' ? 'Replicable playbook' : 'What should we do differently?'}
Specific actions for future similar accounts.

### Account signals that predicted this outcome
What in the data (spend patterns, competitor stack, activity levels) should have signaled this?

### Recommended next steps
${outcome === 'WON' ? 'Expansion opportunities within this account.' : 'Should we re-engage? When? With what angle?'}`;
}
