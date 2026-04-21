-- Migration: True semantic search via BGE embeddings stored in D1
-- Run: wrangler d1 execute revflare-db --remote --file=migration-semantic-search.sql

-- Embeddings stored as Float32 BLOB alongside existing keyword cache.
-- Dimension 768 matches @cf/baai/bge-base-en-v1.5 output.
ALTER TABLE vectorize_cache ADD COLUMN embedding BLOB;
ALTER TABLE vectorize_cache ADD COLUMN embedding_model TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_vcache_user_type ON vectorize_cache(user_email, content_type);
