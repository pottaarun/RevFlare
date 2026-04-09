#!/usr/bin/env node
/**
 * Seed script: Parse the Excel file and seed the local D1 database.
 * Usage: npm run seed
 * Prerequisites: npm run db:init (creates tables in local D1)
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const EXCEL_PATH = './Sharable - Nam - Account Report.xlsx';

const COLUMN_MAP = {
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

const NUMERIC_COLS = new Set([
  'current_monthly_fee', 'annual_revenue', 'sam', 'total_it_spend',
  'cloud_hosting_spend', 'data_center_spend', 'security_spend',
  'cdn_spend', 'dns_spend', 'traffic_mgmt_spend', 'na_traffic',
  'emea_traffic', 'apj_traffic', 'latam_traffic', 'linkedin_followers',
  'employees', 'opportunities_total', 'opportunities_open',
  'opportunities_closed_lost', 'activities_last_30',
]);

function parseNumeric(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

console.log('Reading Excel file...');
const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
const headers = rows[0];
const dataRows = rows.slice(1).filter(r => r.some(c => c != null && c !== ''));

console.log(`Found ${dataRows.length} accounts in ${wb.SheetNames[0]}`);

const dbCols = Object.values(COLUMN_MAP);
const headerIndexMap = {};
headers.forEach((h, i) => {
  if (COLUMN_MAP[h]) headerIndexMap[COLUMN_MAP[h]] = i;
});

// Generate SQL
let sql = 'DELETE FROM persona_messages;\nDELETE FROM research_reports;\nDELETE FROM accounts;\n\n';

for (const row of dataRows) {
  const vals = {};
  for (const [dbCol, idx] of Object.entries(headerIndexMap)) {
    let v = row[idx];
    if (NUMERIC_COLS.has(dbCol)) v = parseNumeric(v);
    vals[dbCol] = v ?? null;
  }

  const rawData = JSON.stringify(Object.fromEntries(headers.map((h, i) => [h, row[i] ?? null])));
  const columns = [...dbCols, 'raw_data'];
  const values = columns.map(col => col === 'raw_data' ? escapeSQL(rawData) : escapeSQL(vals[col]));

  sql += `INSERT INTO accounts (${columns.join(',')}) VALUES (${values.join(',')});\n`;
}

const sqlFile = '.seed-data.sql';
writeFileSync(sqlFile, sql);
console.log(`Generated ${sqlFile} (${(sql.length / 1024 / 1024).toFixed(1)} MB)`);

console.log('Executing against local D1...');
try {
  execSync(`npx wrangler d1 execute revflare-db --local --file=${sqlFile}`, { stdio: 'inherit' });
  console.log(`\nSeeded ${dataRows.length} accounts into local D1.`);
  console.log('Run: npm run dev');
} catch (err) {
  console.error('Failed to seed. Make sure you ran: npm run db:init');
  console.log(`SQL file is at ${sqlFile} -- you can execute it manually.`);
}
