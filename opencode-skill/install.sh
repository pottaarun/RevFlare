#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# RevFlare OpenCode Skill Installer
# ──────────────────────────────────────────────────────────────────
# Installs the RevFlare skill to ~/.config/opencode/skills/revflare/
# by symlinking SKILL.md + scripts/ and copying reference files
# (schema, migrations, etc.) from the repo root.
#
# Symlinks ensure the skill stays in sync with `git pull`.
#
# Usage:
#   From the RevFlare repo root:   bash opencode-skill/install.sh
#   Or with curl:                  curl -fsSL https://raw.githubusercontent.com/pottaarun/RevFlare/main/opencode-skill/install.sh | REVFLARE_CLONE=1 bash
#
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

# ── Locate the repo root ──────────────────────────────────────────
# This script is at <repo>/opencode-skill/install.sh — resolve repo root.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_ROOT/wrangler.toml" ]] || [[ ! -f "$REPO_ROOT/schema-full.sql" ]]; then
  error "Could not find RevFlare repo root."
  error "Expected wrangler.toml and schema-full.sql at: $REPO_ROOT"
  error "Run this from inside a RevFlare clone: bash opencode-skill/install.sh"
  exit 1
fi

ok "Found RevFlare repo root: $REPO_ROOT"

# ── Target installation path ──────────────────────────────────────
TARGET="${HOME}/.config/opencode/skills/revflare"

if [[ -e "$TARGET" ]]; then
  warn "Skill already installed at $TARGET"
  read -rp "Remove and reinstall? [y/N] " CONFIRM
  if [[ "$CONFIRM" =~ ^[Yy] ]]; then
    rm -rf "$TARGET"
    info "Removed previous installation"
  else
    info "Keeping existing installation. Updates will be overlaid via symlinks."
  fi
fi

mkdir -p "$TARGET/reference"

# ── Symlink SKILL.md ──────────────────────────────────────────────
ln -sf "$REPO_ROOT/opencode-skill/SKILL.md" "$TARGET/SKILL.md"
ok "Linked SKILL.md"

# ── Symlink scripts/ ──────────────────────────────────────────────
rm -rf "$TARGET/scripts"
ln -s "$REPO_ROOT/opencode-skill/scripts" "$TARGET/scripts"
ok "Linked scripts/"

# ── Symlink reference files (schema + migrations) ─────────────────
# Live source files stay with the repo; updates via `git pull` propagate.
for f in schema-full.sql \
         migration-auth.sql migration-approval.sql \
         migration-email-daily-limit.sql migration-improvements.sql \
         migration-email-tracking.sql migration-mcp.sql \
         migration-semantic-search.sql migration-orgs.sql; do
  if [[ -f "$REPO_ROOT/$f" ]]; then
    ln -sf "$REPO_ROOT/$f" "$TARGET/reference/$f"
  else
    warn "Not found in repo: $f  (skipped)"
  fi
done
ok "Linked 9 migration / schema files"

# Optional: seed.mjs, wrangler.toml as examples
[[ -f "$REPO_ROOT/seed.mjs" ]]     && ln -sf "$REPO_ROOT/seed.mjs"     "$TARGET/reference/seed.mjs.example"
[[ -f "$REPO_ROOT/wrangler.toml" ]] && ln -sf "$REPO_ROOT/wrangler.toml" "$TARGET/reference/wrangler.toml.example"

# README.md → FULL_DOCS.md
[[ -f "$REPO_ROOT/README.md" ]] && ln -sf "$REPO_ROOT/README.md" "$TARGET/reference/FULL_DOCS.md"

ok "Linked 3 additional reference files"

# ── Verify ────────────────────────────────────────────────────────
if [[ -x "$TARGET/scripts/verify-skill.sh" ]]; then
  echo
  info "Running verification..."
  echo
  "$TARGET/scripts/verify-skill.sh" || warn "Verification flagged issues — review above."
fi

echo
cat <<EOF
${GRN}${BLD}RevFlare skill installed.${CLR}

${BLD}Location:${CLR} $TARGET
${BLD}Trigger phrases:${CLR} "revflare", "deploy revflare", "connect opencode to revflare"

OpenCode will auto-discover the skill on its next session.

${BLD}To update later:${CLR}
  cd $REPO_ROOT && git pull
  (symlinks pick up changes automatically)

${BLD}To uninstall:${CLR}
  rm -rf $TARGET
EOF
