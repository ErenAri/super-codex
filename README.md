# @erenari/supercodex

SuperCodex is a safety-first workflow layer for Codex CLI.
It installs a curated prompt pack, manages a deterministic command/mode/persona registry, and merges config into `~/.codex/config.toml` without destructive overwrites.

## Why SuperCodex

- Backup-first config changes (timestamped backup on every mutating command)
- Scoped config ownership (`[supercodex]` plus optional managed `agents` and `mcp_servers` entries)
- Idempotent install behavior
- Built-in workflow aliases, modes, personas, MCP catalog, and diagnostics
- Cross-platform support (Windows, macOS, Linux)

## 2-Minute Quickstart

```bash
npm install -g @erenari/supercodex
supercodex install
supercodex status
```

After install:

- Prompt pack: `~/.codex/prompts/supercodex/`
- Interactive prompt wrappers: `~/.codex/prompts/sc-*.md`
- Config merge target: `~/.codex/config.toml`

## Alias Invocation: Which Syntax Works Where

| Context | Use this syntax | Example |
| --- | --- | --- |
| Codex interactive chat | `/prompts:<name>` | `/prompts:sc-research "map migration risks"` |
| SuperCodex CLI | `/sc:<name>` or `sc:<name>` | `supercodex /sc:research "map migration risks"` |
| SuperCodex CLI (plain alias) | `<name>` | `supercodex research "map migration risks"` |
| Shell shortcut (optional bridge) | `sc <name>` | `sc research "map migration risks"` |

Notes:

- Codex interactive custom commands are exposed under `/prompts:*`.
- `/sc:*` is a SuperCodex CLI alias parser, not a native Codex interactive namespace.

## Install, List, Uninstall

```bash
supercodex install [--force] [--codex-home <path>]
supercodex list [--codex-home <path>]
supercodex status [--json] [--codex-home <path>]
supercodex uninstall [--codex-home <path>]
```

## Shell Bridge (Optional)

Install a lightweight shell function named `sc` for shorthand alias use:

```bash
supercodex shell install
supercodex shell status
```

Then use:

```bash
sc research "scope and constraints"
sc /sc:brainstorming "alternatives"
```

## Safety Model

SuperCodex never blindly overwrites `config.toml`.

- Backup location: `~/.codex/backups/YYYY-MM-DD-HHMMSS/`
- Managed merge scope:
  - `[supercodex]`
  - optional `[agents.*]`
  - optional `[mcp_servers.*]`
- Conflict behavior (default):
  - preserve existing differing value
  - record desired value under `[supercodex.overrides]`
- Use `--force` to apply desired values into conflicting locations

## Prompt Pack

Installed under `~/.codex/prompts/supercodex/`:

- `plan.md`
- `review.md`
- `refactor.md`
- `debug.md`
- overlays: `modes/*`, `personas/*`

Interactive wrappers installed under `~/.codex/prompts/`:

- `sc-research.md` -> `/prompts:sc-research`
- `sc-brainstorming.md` -> `/prompts:sc-brainstorming`
- wrappers for all built-in aliases

## Core Command Groups

```bash
supercodex validate [--strict] [--json]
supercodex doctor [--fix] [--strict] [--json] [--mcp-connectivity]
supercodex init [--dir <path>]
supercodex aliases list|show|packs|search
supercodex mode list|show|set|unset
supercodex persona list|show|set|unset
supercodex run plan|review|refactor|debug [--mode <name>] [--persona <name>] [--json]
supercodex catalog list|search|show|sync
supercodex mcp add|list|install|remove|test|doctor|catalog
```

For detailed examples, see [docs/COMMANDS.md](docs/COMMANDS.md).

## Project Template

Create a project-scoped layer:

```bash
supercodex init
```

This creates:

- `.codex/config.toml`
- `.codex/README.md`

`init` is additive and preserves existing keys.

## MCP Quick Examples

Catalog install:

```bash
supercodex mcp install filesystem
```

Manual STDIO server:

```bash
supercodex mcp add filesystem npx -y @modelcontextprotocol/server-filesystem . --env NODE_ENV=production
```

Manual HTTP server:

```bash
supercodex mcp add internal-api --http http://localhost:3333/mcp --env API_TOKEN=secret
```

## Config Snippet

```toml
[supercodex]
enabled = true
version = "<installed-version>"
prompt_pack = "supercodex"
prompts_dir = "C:/Users/you/.codex/prompts/supercodex"

[supercodex.runtime]
default_mode = "balanced"
default_persona = "architect"
catalog_version = "2026.02.28"

[supercodex.catalog]
source = "local"
installed_ids = ["filesystem"]
```

Conflict capture example:

```toml
[supercodex.overrides]
"agents.supercodex_planner" = { description = "SuperCodex structured planning profile", prompt = "supercodex/plan.md" }
```

## Docs

- [Command Reference](docs/COMMANDS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Benchmarking

Run evaluation harness and scorecards:

```bash
npm run bench
npm run bench:score
npm run bench:check
npm run bench:tune-thresholds
npm run bench:tune-thresholds:last5
npm run bench:tune-thresholds:last5:write
```

Artifacts:

- `benchmarks/results/<run_id>/results.json`
- `benchmarks/results/<run_id>/scorecard.json`
- `benchmarks/results/latest.md`
