-- Migration: Email open tracking, suppression list, unsubscribes, tracking IDs
-- Run: wrangler d1 execute revflare-db --remote --file=migration-email-tracking.sql

-- Email suppression list (bounced/invalid addresses)
CREATE TABLE IF NOT EXISTS email_suppression (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address TEXT NOT NULL,
  reason TEXT NOT NULL,          -- 'bounce', 'invalid', 'complaint', 'unsubscribe'
  detail TEXT,
  user_email TEXT NOT NULL,      -- which RevFlare user triggered the suppression
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppression_email ON email_suppression(email_address, user_email);

-- Email open tracking
CREATE TABLE IF NOT EXISTS email_opens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id TEXT NOT NULL,
  source_type TEXT NOT NULL,     -- 'persona_message' or 'campaign_email'
  source_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_opens_tracking ON email_opens(tracking_id);
CREATE INDEX IF NOT EXISTS idx_opens_source ON email_opens(source_type, source_id);

-- Unsubscribe log
CREATE TABLE IF NOT EXISTS unsubscribes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address TEXT NOT NULL,
  user_email TEXT NOT NULL,       -- the RevFlare sender
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unsub_email ON unsubscribes(email_address, user_email);

-- Add tracking_id + open_count columns to messages
ALTER TABLE persona_messages ADD COLUMN tracking_id TEXT;
ALTER TABLE persona_messages ADD COLUMN open_count INTEGER DEFAULT 0;

ALTER TABLE campaign_emails ADD COLUMN tracking_id TEXT;
ALTER TABLE campaign_emails ADD COLUMN open_count INTEGER DEFAULT 0;

-- AI chat history for email refinement
CREATE TABLE IF NOT EXISTS email_chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,       -- FK to persona_messages.id
  message_type TEXT NOT NULL,        -- 'persona_message' or 'campaign_email'
  role TEXT NOT NULL,                -- 'user' or 'assistant'
  content TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_message ON email_chat_history(message_id, message_type);

-- Add sequence execution columns
ALTER TABLE sequences ADD COLUMN current_touch INTEGER DEFAULT 0;
ALTER TABLE sequences ADD COLUMN next_send_at DATETIME;
ALTER TABLE sequences ADD COLUMN to_address TEXT;
