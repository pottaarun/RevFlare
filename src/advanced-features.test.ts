import { describe, it, expect } from 'vitest';
import { calculateLeadScore, calculateROI, scoreSimilarity } from './advanced-features';

// ── Lead Scoring Tests ────────────────────────────────────────────
describe('calculateLeadScore', () => {
  it('returns 0 for an empty account', () => {
    const result = calculateLeadScore({});
    expect(result.score).toBe(0);
    expect(result.factors).toEqual([]);
  });

  it('scores high for a large enterprise with displaceable competitors', () => {
    const account = {
      total_it_spend: 2000000,
      current_monthly_fee: 10000,
      employees: 50000,
      cdn_products: 'Akamai; Cloudflare',
      security_products: 'Imperva; Zscaler',
      dns_products: 'Route53',
      cloud_hosting_products: 'AWS',
      opportunities_open: 3,
      activities_last_30: 10,
      last_activity: new Date().toISOString(),
      sam: 200000,
      security_primary: 'Zscaler',
    };
    const result = calculateLeadScore(account);
    expect(result.score).toBeGreaterThan(70);
    expect(result.factors.length).toBeGreaterThan(5);
  });

  it('caps score at 100', () => {
    const account = {
      total_it_spend: 5000000,
      current_monthly_fee: 100,
      employees: 100000,
      cdn_products: 'Akamai; Cloudfront; Fastly',
      security_products: 'Imperva; Zscaler; Palo Alto; CrowdStrike',
      dns_products: 'Route53',
      opportunities_open: 5,
      activities_last_30: 20,
      last_activity: new Date().toISOString(),
      sam: 500000,
      security_primary: 'Zscaler',
    };
    const result = calculateLeadScore(account);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('gives points for low wallet penetration', () => {
    const account = {
      total_it_spend: 100000,
      current_monthly_fee: 500, // 0.5% penetration
    };
    const result = calculateLeadScore(account);
    const penetrationFactor = result.factors.find(f => f.name === 'Low Wallet Penetration');
    expect(penetrationFactor).toBeDefined();
    expect(penetrationFactor!.points).toBe(15);
  });

  it('gives no activity points for stale accounts', () => {
    const account = {
      last_activity: '2020-01-01',
      activities_last_30: 0,
    };
    const result = calculateLeadScore(account);
    const activityFactor = result.factors.find(f => f.name === 'Recent Activity' || f.name === 'Active Account');
    expect(activityFactor).toBeUndefined();
  });
});

// ── ROI Calculator Tests ──────────────────────────────────────────
describe('calculateROI', () => {
  it('returns zero savings for an account with no spend', () => {
    const result = calculateROI({});
    expect(result.currentMonthly).toBe(0);
    expect(result.projectedMonthly).toBe(0);
    expect(result.annualSavings).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('calculates savings based on category-specific percentages', () => {
    const account = {
      cdn_spend: 10000,
      cdn_primary: 'Akamai',
      security_spend: 20000,
      security_primary: 'Imperva',
    };
    const result = calculateROI(account);
    expect(result.currentMonthly).toBe(30000);
    expect(result.projectedMonthly).toBeLessThan(30000);
    expect(result.annualSavings).toBeGreaterThan(0);
    expect(result.breakdown).toHaveLength(2);

    // CDN: 35% savings
    const cdnRow = result.breakdown.find(b => b.category === 'CDN');
    expect(cdnRow!.savings).toBe(3500); // 10000 * 0.35

    // Security: 30% savings
    const secRow = result.breakdown.find(b => b.category === 'Security');
    expect(secRow!.savings).toBe(6000); // 20000 * 0.30
  });

  it('includes vendor consolidation value for 3+ vendors', () => {
    const account = {
      cdn_spend: 5000, cdn_primary: 'Akamai',
      security_spend: 5000, security_primary: 'Imperva',
      dns_spend: 1000, dns_primary: 'Route53',
    };
    const result = calculateROI(account);
    expect(result.vendorCount).toBe(3);
    expect(result.consolidationValue).toBe(6000); // 3 vendors * $2K
  });

  it('does not include consolidation for fewer than 3 vendors', () => {
    const account = {
      cdn_spend: 5000, cdn_primary: 'Akamai',
      security_spend: 5000, security_primary: 'Imperva',
    };
    const result = calculateROI(account);
    expect(result.vendorCount).toBe(2);
    expect(result.consolidationValue).toBe(0);
  });
});

// ── Similarity Scoring Tests ──────────────────────────────────────
describe('scoreSimilarity', () => {
  it('returns 0 for completely different accounts', () => {
    const a = { industry: 'Finance', total_it_spend: 100, employees: 10 };
    const b = { industry: 'Healthcare', total_it_spend: 1000000, employees: 100000 };
    expect(scoreSimilarity(a, b)).toBe(0);
  });

  it('gives 30 points for same industry', () => {
    const a = { industry: 'Technology' };
    const b = { industry: 'Technology' };
    expect(scoreSimilarity(a, b)).toBe(30);
  });

  it('gives points for similar IT spend (within 2x)', () => {
    const a = { total_it_spend: 50000 };
    const b = { total_it_spend: 80000 };
    expect(scoreSimilarity(a, b)).toBe(20); // ratio 0.625, within 0.5-2.0
  });

  it('gives partial points for loosely similar spend (within 4x)', () => {
    const a = { total_it_spend: 30000 };
    const b = { total_it_spend: 100000 };
    expect(scoreSimilarity(a, b)).toBe(10); // ratio 0.3, within 0.25-4.0
  });

  it('accumulates all matching factors', () => {
    const a = {
      industry: 'Retail', total_it_spend: 100000, employees: 5000,
      cdn_primary: 'Akamai', security_primary: 'Zscaler',
      billing_country: 'US', account_segment: 'Enterprise',
    };
    const b = {
      industry: 'Retail', total_it_spend: 120000, employees: 6000,
      cdn_primary: 'Akamai', security_primary: 'Zscaler',
      billing_country: 'US', account_segment: 'Enterprise',
    };
    const score = scoreSimilarity(a, b);
    // 30 (industry) + 20 (spend) + 15 (employees) + 10 (cdn) + 10 (security) + 10 (country) + 5 (segment)
    expect(score).toBe(100);
  });
});
