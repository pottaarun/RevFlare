# RevFlare OpenCode Skill

A complete OpenCode skill that teaches AI coding agents how to **deploy**, **query**, and **extend** RevFlare — this Cloudflare-native sales intelligence platform.

## Why Install This?

Once installed, OpenCode (and any other skill-aware AI coding agent) automatically loads the full RevFlare knowledge base when you mention RevFlare. That means you can say things like:

- _"Deploy a new RevFlare instance for my team"_ — agent runs the 12-step deployment
- _"Add a 'Partner Manager' persona to RevFlare"_ — agent edits the right files, runs type-check, deploys
- _"Connect OpenCode to my RevFlare's MCP server"_ — agent edits your `opencode.jsonc` with the correct config
- _"Run bulk research on my top 10 accounts"_ — agent hits the right API endpoint
- _"Why is my semantic search returning nothing?"_ — agent walks the troubleshooting tree

All 117 API endpoints, 33 DB tables, 9 migrations, and every major capability are documented inline.

## Install

### Option 1 — From a local clone (recommended for contributors)

```bash
git clone https://github.com/pottaarun/RevFlare.git
cd RevFlare
bash opencode-skill/install.sh
```

The installer **symlinks** the skill files into `~/.config/opencode/skills/revflare/`. Running `git pull` auto-updates the skill — no reinstall needed.

### Option 2 — One-liner (for users who just want to use the skill)

```bash
git clone https://github.com/pottaarun/RevFlare.git ~/.revflare-skill \
  && bash ~/.revflare-skill/opencode-skill/install.sh
```

### Option 3 — Via the opencode-skills tap (if published)

```bash
clearskies skill install revflare
```

## What Gets Installed

```
~/.config/opencode/skills/revflare/
├── SKILL.md           → symlink to opencode-skill/SKILL.md
├── scripts/           → symlink to opencode-skill/scripts/
│   ├── deploy.sh              # End-to-end deploy automation
│   ├── api-examples.md        # Every endpoint with curl examples (671 lines)
│   ├── mcp-integration.md     # MCP client + server wiring
│   ├── customize.md           # 20 customization recipes
│   └── verify-skill.sh        # Installation verifier
└── reference/         → 12 symlinks to files in the repo
    ├── schema-full.sql
    ├── migration-*.sql (×8)
    ├── wrangler.toml.example
    ├── seed.mjs.example
    └── FULL_DOCS.md   → symlink to repo README.md
```

Total: **~3,000 lines of curated instructions + every migration file + the full 60KB README**, all kept in sync with the repo via symlinks.

## Structure of SKILL.md

The master skill file organizes everything into:

1. **Frontmatter** — name, category, 450-char description for auto-discovery
2. **When to Load** — trigger phrase categories
3. **Three Modes of Use**:
   - **Mode A**: Query an existing RevFlare via MCP or HTTP API (client configs for OpenCode, Claude, Cursor)
   - **Mode B**: Deploy a fresh instance end-to-end (12-step checklist, prereqs, secrets, Access config)
   - **Mode C**: Extend/customize (project structure, migration discipline, endpoint patterns, testing)
4. **Complete Capability Inventory** — every feature in 20 categories
5. **Common Task Recipes** — 14 copy-paste cookbook entries
6. **Troubleshooting** — 17 symptom→fix mappings
7. **Reference Files Index**

## Uninstall

```bash
rm -rf ~/.config/opencode/skills/revflare
```

No system-wide side effects — everything lives under your user home.

## Updating

Because the installer uses symlinks:

```bash
cd /path/to/your/revflare/clone
git pull
```

That's it. The skill sees the updated files immediately.

## Verify

```bash
bash ~/.config/opencode/skills/revflare/scripts/verify-skill.sh
```

Runs 40+ checks: file presence, frontmatter validity, content coverage, executable bits.

## Skill Format

This follows the **OpenCode skills convention**:

- Canonical location: `~/.config/opencode/skills/<name>/SKILL.md`
- Frontmatter fields: `name`, `category`, `description`, `author`, `source`
- Auto-discovered by OpenCode on session start
- Trigger phrases in the description + "When to Load" section drive automatic loading

See the [OpenCode docs](https://opencode.ai/docs/) for the full spec.

## License

Same as the RevFlare project. See the parent repo's LICENSE.

## Authored by

Arun Potta — [github.com/pottaarun/RevFlare](https://github.com/pottaarun/RevFlare)
