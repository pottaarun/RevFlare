-- RevFlare Database Schema

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_name TEXT NOT NULL,
  website TEXT,
  website_domain TEXT,
  industry TEXT,
  status TEXT,
  account_status TEXT,
  account_segment TEXT,
  billing_country TEXT,
  billing_city TEXT,
  billing_state TEXT,
  current_monthly_fee REAL DEFAULT 0,
  revenue_bucket TEXT,
  employee_bucket TEXT,
  annual_revenue REAL,
  employees INTEGER,
  sam REAL,
  linkedin_url TEXT,
  linkedin_followers INTEGER,
  na_traffic REAL,
  emea_traffic REAL,
  apj_traffic REAL,
  latam_traffic REAL,
  total_it_spend REAL,
  total_it_spend_tier TEXT,
  spend_potential TEXT,
  cloud_hosting_primary TEXT,
  cloud_hosting_spend REAL,
  cloud_hosting_products TEXT,
  data_center_primary TEXT,
  data_center_spend REAL,
  data_center_products TEXT,
  security_primary TEXT,
  security_spend REAL,
  security_products TEXT,
  cdn_primary TEXT,
  cdn_spend REAL,
  cdn_products TEXT,
  dns_primary TEXT,
  dns_spend REAL,
  dns_products TEXT,
  traffic_mgmt_primary TEXT,
  traffic_mgmt_spend REAL,
  apm_products TEXT,
  saas_products TEXT,
  opportunities_total INTEGER DEFAULT 0,
  opportunities_open INTEGER DEFAULT 0,
  opportunities_closed_lost INTEGER DEFAULT 0,
  last_activity TEXT,
  activities_last_30 INTEGER DEFAULT 0,
  customer_acquisition_date TEXT,
  raw_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS persona_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  persona TEXT NOT NULL,
  message_type TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_industry ON accounts(industry);
CREATE INDEX IF NOT EXISTS idx_accounts_country ON accounts(billing_country);
CREATE INDEX IF NOT EXISTS idx_accounts_segment ON accounts(account_segment);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_research_account ON research_reports(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_account ON persona_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_persona ON persona_messages(persona);
