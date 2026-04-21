-- Migration: Organizations / teams for multi-user collaboration.
-- Run: wrangler d1 execute revflare-db --remote --file=migration-orgs.sql

-- Top-level org. One user can belong to multiple orgs via org_members.
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  settings TEXT,               -- JSON blob for org-level prefs
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Membership list with role. Roles: owner, admin, member.
CREATE TABLE IF NOT EXISTS org_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_unique ON org_members(org_id, user_email);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_email);

-- Per-user prefs, including which org is currently active.
CREATE TABLE IF NOT EXISTS user_prefs (
  user_email TEXT PRIMARY KEY,
  active_org_id INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Playbooks become shareable across an org.
-- NULL org_id = user-owned (legacy behavior preserved).
ALTER TABLE playbooks ADD COLUMN org_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_playbooks_org ON playbooks(org_id);

-- Historical reply-rate tracking by (industry, persona, message_type).
-- Populated by the reply-rate recommender; updated on every message insert/reply.
CREATE TABLE IF NOT EXISTS persona_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  industry TEXT NOT NULL,
  persona TEXT NOT NULL,
  message_type TEXT NOT NULL,
  sent INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  replied INTEGER DEFAULT 0,
  user_email TEXT,             -- NULL = global aggregate
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_perf_lookup ON persona_performance(industry, persona, message_type);
