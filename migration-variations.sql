-- Migration: Message variations (A/B/C drafts) for persona messages and campaign emails
-- Run: wrangler d1 execute revflare-db --remote --file=migration-variations.sql
--
-- Each generation produces 3 sibling rows sharing a variation_group UUID.
-- The user approves exactly one; siblings stay as pending_approval alternates.
-- "Selected" is derived from approval_status = 'approved' (no separate flag).

-- Persona messages
ALTER TABLE persona_messages ADD COLUMN variation_group TEXT;
ALTER TABLE persona_messages ADD COLUMN variation_index INTEGER DEFAULT 0;
ALTER TABLE persona_messages ADD COLUMN variation_label TEXT;

-- Campaign emails
ALTER TABLE campaign_emails ADD COLUMN variation_group TEXT;
ALTER TABLE campaign_emails ADD COLUMN variation_index INTEGER DEFAULT 0;
ALTER TABLE campaign_emails ADD COLUMN variation_label TEXT;

-- Group lookup indexes (sibling reset on approve, dedupe on export)
CREATE INDEX IF NOT EXISTS idx_persona_messages_variation_group ON persona_messages(variation_group);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_variation_group ON campaign_emails(variation_group);
