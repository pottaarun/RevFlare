#!/usr/bin/env bash
# Verify the RevFlare skill is installed correctly and all bundled files are present.
set -e

SKILL_DIR="${HOME}/.config/opencode/skills/revflare"

RED=$'\033[31m'
GRN=$'\033[32m'
YLW=$'\033[33m'
CLR=$'\033[0m'

FAIL=0
check() {
  if [[ -e "$1" ]]; then
    echo "${GRN}✓${CLR} $1"
  else
    echo "${RED}✗${CLR} $1  (missing)"
    FAIL=1
  fi
}

echo "Verifying RevFlare skill installation..."
echo

echo "── Core ──"
check "$SKILL_DIR/SKILL.md"

echo
echo "── Reference files ──"
for f in schema-full.sql \
         migration-auth.sql migration-approval.sql \
         migration-email-daily-limit.sql migration-improvements.sql \
         migration-email-tracking.sql migration-mcp.sql \
         migration-semantic-search.sql migration-orgs.sql \
         wrangler.toml.example seed.mjs.example FULL_DOCS.md; do
  check "$SKILL_DIR/reference/$f"
done

echo
echo "── Scripts ──"
for f in deploy.sh api-examples.md mcp-integration.md customize.md verify-skill.sh; do
  check "$SKILL_DIR/scripts/$f"
done

echo
echo "── Skill metadata ──"
if head -10 "$SKILL_DIR/SKILL.md" | grep -q "^name: revflare$"; then
  echo "${GRN}✓${CLR} Frontmatter 'name: revflare' present"
else
  echo "${RED}✗${CLR} Frontmatter missing or malformed"
  FAIL=1
fi

if head -10 "$SKILL_DIR/SKILL.md" | grep -q "^category:"; then
  echo "${GRN}✓${CLR} Frontmatter 'category' present"
else
  echo "${RED}✗${CLR} Frontmatter 'category' missing"
  FAIL=1
fi

DESCLINE=$(grep -E "^description:" "$SKILL_DIR/SKILL.md" | head -1)
if [[ -n "$DESCLINE" ]]; then
  DESCLEN=$(echo -n "$DESCLINE" | wc -c)
  if (( DESCLEN >= 100 )); then
    echo "${GRN}✓${CLR} Frontmatter 'description' is comprehensive ($DESCLEN chars)"
  else
    echo "${YLW}⚠${CLR} Frontmatter 'description' is only $DESCLEN chars (recommend >100)"
  fi
else
  echo "${RED}✗${CLR} Frontmatter 'description' missing"
  FAIL=1
fi

echo
echo "── SKILL.md content coverage ──"
SKILL_CONTENT=$(cat "$SKILL_DIR/SKILL.md")
for topic in "Mode A" "Mode B" "Mode C" "117 endpoints" "33" "MCP" "semantic search" "persona" "campaign" "threat" "opportunity agent" "lead scoring" "organizations" "bulk actions" "command palette" "email tracking" "AI chat" "gmail" "salesforce" "BGE" "DeepSeek" "Llama"; do
  if echo "$SKILL_CONTENT" | grep -qi "$topic"; then
    echo "${GRN}✓${CLR} Covers: $topic"
  else
    echo "${RED}✗${CLR} Does NOT cover: $topic"
    FAIL=1
  fi
done

echo
echo "── Deploy script executable ──"
if [[ -x "$SKILL_DIR/scripts/deploy.sh" ]]; then
  echo "${GRN}✓${CLR} deploy.sh is executable"
else
  echo "${YLW}⚠${CLR} deploy.sh not executable — fix with: chmod +x $SKILL_DIR/scripts/deploy.sh"
fi

echo
echo "── File sizes (sanity check) ──"
wc -l "$SKILL_DIR/SKILL.md" "$SKILL_DIR/scripts/"*.md "$SKILL_DIR/scripts/"*.sh 2>/dev/null | tail -20

echo
if (( FAIL )); then
  echo "${RED}FAILED.${CLR} Some checks did not pass. See above."
  exit 1
else
  echo "${GRN}All checks passed.${CLR} Skill is ready to use."
  echo
  echo "To load in OpenCode, the skill is auto-discovered at:"
  echo "  $SKILL_DIR/SKILL.md"
  echo
  echo "Trigger phrases: 'revflare', 'sales intel', 'deploy sales platform', 'revflare mcp'"
fi
