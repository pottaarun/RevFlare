-- Migration: Contacts table, email tracking enhancements, scheduled sends
-- Run: wrangler d1 execute revflare-db --remote --file=migration-improvements.sql

-- Contacts table (linked to accounts)
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role TEXT,              -- 'decision_maker', 'champion', 'influencer', 'end_user'
  is_primary INTEGER DEFAULT 0,
  salesforce_id TEXT,     -- Salesforce Contact ID for sync
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_email);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Email thread tracking (for reply detection)
ALTER TABLE persona_messages ADD COLUMN gmail_thread_id TEXT;
ALTER TABLE persona_messages ADD COLUMN gmail_message_id TEXT;
ALTER TABLE persona_messages ADD COLUMN sent_to TEXT;
ALTER TABLE persona_messages ADD COLUMN sent_at DATETIME;
ALTER TABLE persona_messages ADD COLUMN replied INTEGER DEFAULT 0;

-- Campaign email thread tracking
ALTER TABLE campaign_emails ADD COLUMN gmail_thread_id TEXT;
ALTER TABLE campaign_emails ADD COLUMN gmail_message_id TEXT;
ALTER TABLE campaign_emails ADD COLUMN sent_to TEXT;
ALTER TABLE campaign_emails ADD COLUMN replied INTEGER DEFAULT 0;

-- Scheduled sends table
CREATE TABLE IF NOT EXISTS scheduled_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  account_id INTEGER,
  contact_id INTEGER,
  message_id INTEGER,        -- FK to persona_messages.id (nullable for campaign emails)
  campaign_email_id INTEGER, -- FK to campaign_emails.id (nullable for single emails)
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for DATETIME NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'sent', 'failed', 'cancelled'
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_sends_pending ON scheduled_sends(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_sends_user ON scheduled_sends(user_email);

-- Performance: add missing indexes
CREATE INDEX IF NOT EXISTS idx_accounts_it_spend ON accounts(user_email, total_it_spend);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user_date ON email_send_log(user_email, sent_at);
