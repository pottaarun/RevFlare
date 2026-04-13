-- Add email approval workflow
-- Emails must be approved before they can be sent to customers

ALTER TABLE persona_messages ADD COLUMN approval_status TEXT DEFAULT 'pending_approval';
ALTER TABLE campaign_emails ADD COLUMN approval_status TEXT DEFAULT 'pending_approval';

-- Index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_messages_approval ON persona_messages(approval_status);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_approval ON campaign_emails(approval_status);
