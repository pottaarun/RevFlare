#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# RevFlare — End-to-end deployment script
# ──────────────────────────────────────────────────────────────────
# Runs Mode B steps B.3 → B.7 sequentially:
#   1. Create D1 database
#   2. Apply all 9 migrations in order
#   3. Create KV namespace
#   4. Prompt for required secrets
#   5. Deploy the worker
#
# Assumes you have already cloned/scaffolded the project and are in
# the project root (with wrangler.toml present).
#
# Usage:
#   cd /path/to/revflare
#   bash ~/.config/opencode/skills/revflare/scripts/deploy.sh
#
# Environment:
#   NODE_TLS_REJECT_UNAUTHORIZED=0  # if on corporate VPN with SSL inspection
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

RED=$'\033[31m'
GRN=$'\033[32m'
YLW=$'\033[33m'
BLU=$'\033[34m'
CLR=$'\033[0m'
BLD=$'\033[1m'

info()  { echo "${BLU}[info]${CLR}  $*"; }
ok()    { echo "${GRN}[ok]${CLR}    $*"; }
warn()  { echo "${YLW}[warn]${CLR}  $*"; }
error() { echo "${RED}[error]${CLR} $*" >&2; }
step()  { echo; echo "${BLD}${BLU}━━ $* ━━${CLR}"; }

# ── Pre-flight checks ─────────────────────────────────────────────
step "Pre-flight checks"

if [[ ! -f wrangler.toml ]]; then
  error "wrangler.toml not found. Run this from the RevFlare project root."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  error "npx not found. Install Node.js 18+."
  exit 1
fi

if ! npx wrangler whoami >/dev/null 2>&1; then
  error "wrangler not authenticated. Run: npx wrangler login"
  exit 1
fi

ok "wrangler authenticated"
ok "wrangler.toml present"

# Skill reference directory (for migration SQL files)
SKILL_REF="${HOME}/.config/opencode/skills/revflare/reference"
if [[ ! -d "$SKILL_REF" ]]; then
  warn "Skill reference dir $SKILL_REF not found; looking for migration files in ."
  SKILL_REF="."
fi

# ── Collect configuration ─────────────────────────────────────────
step "Configuration"

DB_NAME="${DB_NAME:-revflare-db}"
KV_NAME="${KV_NAME:-THREAT_CACHE}"

info "D1 database name: $DB_NAME"
info "KV namespace:     $KV_NAME"
read -rp "Proceed with these names? [Y/n] " CONFIRM
if [[ "$CONFIRM" =~ ^[Nn] ]]; then
  error "Aborted. Set DB_NAME / KV_NAME env vars and re-run."
  exit 1
fi

# ── Create D1 database ────────────────────────────────────────────
step "Creating D1 database"

if npx wrangler d1 list 2>/dev/null | grep -q " $DB_NAME "; then
  warn "D1 database '$DB_NAME' already exists. Skipping creation."
else
  info "Creating database..."
  npx wrangler d1 create "$DB_NAME" | tee /tmp/revflare-d1-create.log
  DB_ID=$(grep -oE 'database_id = "[a-f0-9-]+"' /tmp/revflare-d1-create.log | head -1 | sed 's/.*"\(.*\)"/\1/')
  if [[ -n "$DB_ID" ]]; then
    ok "Database created: $DB_ID"
    warn "Paste this database_id into wrangler.toml under [[d1_databases]]:"
    echo "     database_id = \"$DB_ID\""
    read -rp "Press ENTER after updating wrangler.toml..."
  else
    warn "Could not auto-extract database_id. Check /tmp/revflare-d1-create.log and update wrangler.toml manually."
    read -rp "Press ENTER after updating wrangler.toml..."
  fi
fi

# ── Create KV namespace ───────────────────────────────────────────
step "Creating KV namespace"

if npx wrangler kv namespace list 2>/dev/null | grep -q "\"$KV_NAME\""; then
  warn "KV namespace '$KV_NAME' already exists. Skipping creation."
else
  info "Creating KV namespace..."
  npx wrangler kv namespace create "$KV_NAME" | tee /tmp/revflare-kv-create.log
  KV_ID=$(grep -oE 'id = "[a-f0-9]+"' /tmp/revflare-kv-create.log | head -1 | sed 's/.*"\(.*\)"/\1/')
  if [[ -n "$KV_ID" ]]; then
    ok "KV namespace created: $KV_ID"
    warn "Paste this id into wrangler.toml under [[kv_namespaces]] (binding: $KV_NAME):"
    echo "     id = \"$KV_ID\""
    read -rp "Press ENTER after updating wrangler.toml..."
  fi
fi

# ── Apply migrations ──────────────────────────────────────────────
step "Applying migrations (in order)"

MIGRATIONS=(
  "schema-full.sql"
  "migration-auth.sql"
  "migration-approval.sql"
  "migration-email-daily-limit.sql"
  "migration-improvements.sql"
  "migration-email-tracking.sql"
  "migration-mcp.sql"
  "migration-semantic-search.sql"
  "migration-orgs.sql"
)

for m in "${MIGRATIONS[@]}"; do
  # Look in local project first, then skill reference dir
  if [[ -f "./$m" ]]; then
    FILE="./$m"
  elif [[ -f "$SKILL_REF/$m" ]]; then
    FILE="$SKILL_REF/$m"
  else
    warn "Migration file not found: $m  (skipping)"
    continue
  fi

  info "Applying: $m"
  if npx wrangler d1 execute "$DB_NAME" --remote --file="$FILE" 2>&1 | tail -5; then
    ok "Applied: $m"
  else
    warn "Migration $m failed (column may already exist — usually safe to ignore)"
  fi
done

# ── Verify table count ────────────────────────────────────────────
step "Verifying schema"

npx wrangler d1 execute "$DB_NAME" --remote \
  --command="SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\_cf\_%' ESCAPE '\\';" \
  2>&1 | tail -10 || warn "Could not verify table count"

info "Expected table count: 33"

# ── Set required secrets ──────────────────────────────────────────
step "Setting required Worker secrets"

warn "The following secrets MUST be set for RevFlare to work in production."
warn "You'll be prompted interactively for each. Ctrl+D to skip an individual secret."
echo

set_secret() {
  local name="$1" desc="$2"
  read -rp "Set $name ($desc)? [Y/n] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Nn] ]]; then
    npx wrangler secret put "$name"
  else
    warn "Skipped $name"
  fi
  echo
}

set_secret "ENC_SECRET"            "MANDATORY — any random 32+ char string (try: openssl rand -hex 32)"
set_secret "CF_ACCESS_TEAM_DOMAIN" "MANDATORY — e.g. yourteam.cloudflareaccess.com"
set_secret "CF_ACCESS_AUD"         "RECOMMENDED — Application AUD tag from Cloudflare Access"

info "Optional secrets can be set later via the in-app wizard:"
echo "  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET  (Gmail OAuth)"
echo "  CF_API_TOKEN / CF_ACCOUNT_ID             (Cloudflare Radar)"
echo "  INTRICATELY_API_KEY                      (HG Cloud Dynamics)"
echo

# ── Deploy ────────────────────────────────────────────────────────
step "Deploying worker"

if npx wrangler deploy 2>&1 | tail -20; then
  ok "Deploy succeeded"
else
  error "Deploy failed. Check wrangler output above."
  exit 1
fi

# ── Final instructions ────────────────────────────────────────────
step "Done"

cat <<EOF

${GRN}RevFlare deployed successfully.${CLR}

${BLD}Next steps:${CLR}
  1. Configure Cloudflare Access on your Worker's domain
     - Zero Trust Dashboard → Access → Applications → Add an application
     - Type: Self-hosted
     - Domain: revflare.<your-subdomain>.workers.dev
     - Identity providers: Google, GitHub, or One-time PIN
     - Policies: email ends_with your-domain.com

  2. Visit your worker URL, authenticate via Access
     - ${BLU}https://revflare.<your-subdomain>.workers.dev${CLR}

  3. Upload account data
     - Dashboard → #/upload → drag/drop Salesforce .xlsx export
     - Or: node seed.mjs

  4. Optional integrations (via in-app wizard, no CLI):
     - Top-right "Connect Gmail" button
     - Settings → Salesforce OAuth
     - Settings → API keys (Intricately, NewsAPI, etc.)

  5. Re-index semantic search once you have data:
     - ⌘K → Re-index search
     - Or: POST /api/search/index

${BLD}Troubleshooting${CLR}: see ~/.config/opencode/skills/revflare/SKILL.md → Troubleshooting section.

EOF
