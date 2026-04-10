-- RevFlare Complete Database Schema (all tables)
-- Run: wrangler d1 execute revflare-db --remote --file=schema-full.sql

-- Core tables (from schema.sql)
CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, account_name TEXT NOT NULL, website TEXT, website_domain TEXT, industry TEXT, status TEXT, account_status TEXT, account_segment TEXT, billing_country TEXT, billing_city TEXT, billing_state TEXT, current_monthly_fee REAL DEFAULT 0, revenue_bucket TEXT, employee_bucket TEXT, annual_revenue REAL, employees INTEGER, sam REAL, linkedin_url TEXT, linkedin_followers INTEGER, na_traffic REAL, emea_traffic REAL, apj_traffic REAL, latam_traffic REAL, total_it_spend REAL, total_it_spend_tier TEXT, spend_potential TEXT, cloud_hosting_primary TEXT, cloud_hosting_spend REAL, cloud_hosting_products TEXT, data_center_primary TEXT, data_center_spend REAL, data_center_products TEXT, security_primary TEXT, security_spend REAL, security_products TEXT, cdn_primary TEXT, cdn_spend REAL, cdn_products TEXT, dns_primary TEXT, dns_spend REAL, dns_products TEXT, traffic_mgmt_primary TEXT, traffic_mgmt_spend REAL, apm_products TEXT, saas_products TEXT, opportunities_total INTEGER DEFAULT 0, opportunities_open INTEGER DEFAULT 0, opportunities_closed_lost INTEGER DEFAULT 0, last_activity TEXT, activities_last_30 INTEGER DEFAULT 0, customer_acquisition_date TEXT, raw_data TEXT, user_email TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS research_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, report_type TEXT NOT NULL, title TEXT, content TEXT NOT NULL, user_email TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS persona_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, persona TEXT NOT NULL, message_type TEXT NOT NULL, subject TEXT, content TEXT NOT NULL, user_email TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, theme TEXT NOT NULL, persona TEXT NOT NULL, message_type TEXT NOT NULL, filters TEXT, total_accounts INTEGER DEFAULT 0, generated INTEGER DEFAULT 0, status TEXT DEFAULT 'draft', custom_context TEXT, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS campaign_emails (id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL, account_id INTEGER NOT NULL, account_name TEXT, subject TEXT, content TEXT, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE);

-- Sharing
CREATE TABLE IF NOT EXISTS share_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL UNIQUE, account_id INTEGER NOT NULL, created_by TEXT NOT NULL, label TEXT, expires_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE);

-- Gmail OAuth
CREATE TABLE IF NOT EXISTS gmail_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL UNIQUE, access_token TEXT NOT NULL, refresh_token TEXT NOT NULL, gmail_address TEXT, expires_at INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Salesforce OAuth
CREATE TABLE IF NOT EXISTS salesforce_tokens (user_email TEXT PRIMARY KEY, instance_url TEXT NOT NULL, access_token TEXT NOT NULL, refresh_token TEXT NOT NULL, expires_at INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Encrypted Settings
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Opportunities / ACV
CREATE TABLE IF NOT EXISTS opportunities (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER, account_name TEXT, industry TEXT, country TEXT, acv REAL DEFAULT 0, stage TEXT DEFAULT 'prospecting', notes TEXT, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Lead Scoring
CREATE TABLE IF NOT EXISTS lead_scores (account_id INTEGER PRIMARY KEY, score INTEGER DEFAULT 0, factors TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Probe History (change detection)
CREATE TABLE IF NOT EXISTS probe_history (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, cdn_detected TEXT, dns_provider TEXT, security_headers TEXT, server_info TEXT, probe_hash TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER, alert_type TEXT NOT NULL, title TEXT NOT NULL, detail TEXT, severity TEXT DEFAULT 'info', read INTEGER DEFAULT 0, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Sequences
CREATE TABLE IF NOT EXISTS sequences (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, account_id INTEGER NOT NULL, persona TEXT NOT NULL, theme TEXT, status TEXT DEFAULT 'draft', touches TEXT, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Playbooks
CREATE TABLE IF NOT EXISTS playbooks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, persona TEXT NOT NULL, industry TEXT, template TEXT NOT NULL, usage_count INTEGER DEFAULT 0, created_by TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Meeting Preps
CREATE TABLE IF NOT EXISTS meeting_preps (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, content TEXT NOT NULL, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Email A/B Variants
CREATE TABLE IF NOT EXISTS email_variants (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id INTEGER, variant TEXT DEFAULT 'A', content TEXT NOT NULL, sent INTEGER DEFAULT 0, replied INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Voice Notes
CREATE TABLE IF NOT EXISTS voice_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER, transcript TEXT, generated_email TEXT, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Page/Tab Analytics
CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, page TEXT NOT NULL, tab TEXT, account_id INTEGER, user_email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Semantic Search Cache
CREATE TABLE IF NOT EXISTS vectorize_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, content_type TEXT NOT NULL, content_id INTEGER NOT NULL, content_text TEXT NOT NULL, account_id INTEGER, user_email TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_industry ON accounts(industry);
CREATE INDEX IF NOT EXISTS idx_accounts_country ON accounts(billing_country);
CREATE INDEX IF NOT EXISTS idx_accounts_segment ON accounts(account_segment);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_email);
CREATE INDEX IF NOT EXISTS idx_research_account ON research_reports(account_id);
CREATE INDEX IF NOT EXISTS idx_research_user ON research_reports(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_account ON persona_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_persona ON persona_messages(persona);
CREATE INDEX IF NOT EXISTS idx_messages_user ON persona_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_share_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_campaign_user ON campaigns(user_email);
CREATE INDEX IF NOT EXISTS idx_campaign_emails ON campaign_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_opp_user ON opportunities(user_email);
CREATE INDEX IF NOT EXISTS idx_probe_hist ON probe_history(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_email, read);
CREATE INDEX IF NOT EXISTS idx_vec_cache ON vectorize_cache(user_email, content_type);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_email, page);
CREATE INDEX IF NOT EXISTS idx_page_views_time ON page_views(created_at);
