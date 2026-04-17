-- Migration: Add email_send_log table for daily send limit tracking (100/day per user)
-- Run: wrangler d1 execute revflare-db --remote --file=migration-email-daily-limit.sql

CREATE TABLE IF NOT EXISTS email_send_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  recipient TEXT,
  subject TEXT,
  source TEXT DEFAULT 'single',  -- 'single' or 'campaign'
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user_date ON email_send_log(user_email, sent_at);
