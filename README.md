# @erenari/supercodex

SuperCodex is a safety-first workflow layer for Codex CLI.
It installs a curated prompt pack, manages a deterministic command/mode/persona registry, and merges config into `~/.codex/config.toml` without destructive overwrites.

Built on the [SuperClaude Framework](https://github.com/superclaude/framework) behavioral model — 30 command workflows, 16 specialist agents, 11 modes, a skills system, and flag-based dispatch.

## Why SuperCodex

- Backup-first config changes (timestamped backup on every mutating command)
- Scoped config ownership (`[supercodex]` plus optional managed `agents` and `mcp_servers` entries)
- Idempotent install behavior
- 30 rich command workflows with domain-specific behavioral prompts
- 16 specialist agent definitions (PM, Security, Performance, DevOps, etc.)
- 11 modes (balanced, deep, fast, safe, brainstorming, deep-research, etc.)
- Skills system with confidence-check gating
- Flag-based dispatch (`--brainstorm`, `--think`, `--ultrathink`, `--c7`, `--seq`)
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

## Command Workflows (30 commands)

SuperCodex ships 30 command workflows, each with rich behavioral prompts:

| Category | Commands |
| --- | --- |
| Analysis | `analyze`, `explain`, `index`, `index-repo`, `research` |
| Planning | `brainstorm`, `design`, `estimate`, `plan`, `spec-panel`, `business-panel` |
| Implementation | `build`, `implement`, `improve`, `cleanup`, `refactor` |
| Quality | `review`, `test`, `troubleshoot`, `debug` |
| Operations | `git`, `workflow`, `task`, `pm`, `spawn` |
| Documentation | `document`, `recommend`, `reflect`, `save` |
| Meta | `sc`, `help`, `select-tool`, `load` |

Run any command:

```bash
supercodex run analyze --json
supercodex /sc:research "evaluate caching strategies"
supercodex brainstorm "API redesign options"
```

## Agents (16 specialists)

Specialist agent definitions with triggers, capabilities, and handoff criteria:

```bash
supercodex agent list
supercodex agent show security-engineer
```

Available agents: `pm`, `deep-research`, `system-architect`, `security-engineer`, `frontend-architect`, `backend-architect`, `performance-engineer`, `devops-engineer`, `data-engineer`, `qa-engineer`, `tech-writer`, `incident-responder`, `ml-engineer`, `mobile-architect`, `database-architect`, `accessibility-engineer`

## Modes (11 modes)

```bash
supercodex mode list
supercodex mode show deep
supercodex mode show brainstorming --full   # show rich behavioral content
supercodex mode set deep
supercodex mode unset
```

| Mode | Reasoning Budget | Purpose |
| --- | --- | --- |
| `balanced` | medium | General-purpose coding tasks |
| `deep` | high | Architecture and risky changes |
| `fast` | low | Straightforward delivery |
| `safe` | high | Tests and rollback emphasis |
| `brainstorming` | high | Divergent idea generation |
| `deep-research` | high | Multi-source evidence research |
| `task-management` | medium | Task decomposition and tracking |
| `orchestration` | medium | Multi-tool coordination |
| `token-efficiency` | low | 30-50% token reduction |
| `business-panel` | high | Multi-expert business analysis |
| `introspection` | high | Self-analysis with bias detection |

## Flags

Shorthand flags that activate modes, reasoning depth, or MCP servers:

```bash
supercodex flag list
supercodex flag show brainstorm
```

| Flag | Category | Effect |
| --- | --- | --- |
| `--brainstorm` | mode | Activate brainstorming mode |
| `--think` | depth | Extended reasoning (high) |
| `--ultrathink` | depth | Maximum reasoning depth |
| `--c7` | mcp | Enable Context7 MCP server |
| `--seq` | mcp | Enable Sequential MCP server |

## Skills

```bash
supercodex skill list
supercodex skill show confidence-check
supercodex skill enable confidence-check
supercodex skill disable confidence-check
```

Current skills:

- **confidence-check**: Pre-implementation confidence assessment (>=90% threshold)

## Personas

```bash
supercodex persona list
supercodex persona show reviewer
supercodex persona set reviewer
supercodex persona unset
```

Built-in personas: `architect`, `reviewer`, `refactorer`, `debugger`, `shipper`, `educator`

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

- Base workflows: `plan.md`, `review.md`, `refactor.md`, `debug.md`
- Commands: `commands/*.md` (29 command-specific prompts)
- Modes: `modes/*.md` (11 mode behavioral definitions)
- Agents: `agents/*.md` (16 agent definitions)
- Personas: `personas/*.md`
- Framework: `framework/PRINCIPLES.md`, `framework/RULES.md`, `framework/FLAGS.md`
- Skills: `skills/confidence-check/SKILL.md`

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
supercodex agent list|show
supercodex skill list|show|enable|disable
supercodex flag list|show
supercodex run <command> [--mode <name>] [--persona <name>] [--json]
supercodex catalog list|search|show|sync
supercodex mcp add|list|install|remove|test|doctor|catalog
```

For detailed examples, see [docs/COMMANDS.md](docs/COMMANDS.md).

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

[supercodex.framework]
principles = "supercodex/framework/PRINCIPLES.md"
rules = "supercodex/framework/RULES.md"
flags = "supercodex/framework/FLAGS.md"

[supercodex.catalog]
source = "local"
installed_ids = ["filesystem"]
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
