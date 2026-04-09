-- Add user scoping to accounts
ALTER TABLE accounts ADD COLUMN user_email TEXT DEFAULT '';

-- Index for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_email);

-- Update research and messages to also have user_email for faster queries
ALTER TABLE research_reports ADD COLUMN user_email TEXT DEFAULT '';
ALTER TABLE persona_messages ADD COLUMN user_email TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_research_user ON research_reports(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_user ON persona_messages(user_email);
