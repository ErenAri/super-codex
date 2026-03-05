# supercodex

[![npm version](https://img.shields.io/npm/v/supercodex.svg)](https://www.npmjs.com/package/supercodex)
[![npm downloads](https://img.shields.io/npm/dw/supercodex.svg)](https://www.npmjs.com/package/supercodex)
[![license](https://img.shields.io/npm/l/supercodex.svg)](https://www.npmjs.com/package/supercodex)

SuperCodex is a safety-first workflow layer for Codex CLI.
It installs a curated prompt pack, manages a deterministic command/mode/persona registry, and merges config into `~/.codex/config.toml` without destructive overwrites.

Built on the [SuperClaude Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) behavioral model with workflow commands, specialist agents, mode overlays, a skills system, and flag-based dispatch.

<!-- supercodex:metadata:start -->
## Framework Snapshot

- Workflow commands: 33 (4 base + 29 extended)
- Workflow content files: 33 (4 in content/workflows + 29 in content/commands)
- Agent definitions: 16
- Mode definitions: 11
- Persona definitions: 6
- Skill definitions: 1
<!-- supercodex:metadata:end -->

## Why SuperCodex :sparkles:

- Safe-by-default config changes with automatic backups.
- Scoped config ownership (`[supercodex]` plus optional managed `agents` and `mcp_servers` entries).
- Idempotent install/update behavior.
- Rich workflow command system with mode/persona overlays.
- Specialist agents (PM, Security, Performance, DevOps, and more).
- Skills + confidence-check gating.
- Intent-aware command guidance (`supercodex guide "<intent>"`).
- Persistent session checkpoints (`supercodex session save|load|reflect`).
- Policy + lockfile verification gates (`supercodex verify`, `supercodex policy validate`, `supercodex lock refresh`).
- Flag-based dispatch (`--brainstorm`, `--think`, `--ultrathink`, `--c7`, `--seq`).
- Cross-platform support (Windows, macOS, Linux).

## 2-Minute Quickstart :zap:

```bash
npm install -g supercodex
supercodex install
supercodex start --yes
supercodex guide "review auth security"
supercodex status
supercodex verify --strict
```

After install:

- Prompt pack: `~/.codex/prompts/supercodex/`
- Interactive prompt wrappers: `~/.codex/prompts/supercodex-*.md`
- Config merge target: `~/.codex/config.toml`

## When To Use / Not Use :control_knobs:

Use SuperCodex when you need:
- repeatable AI workflow command quality in teams
- stable aliases/modes/personas with registry validation
- MCP + prompt pack automation with safe config merges

Skip SuperCodex when you need:
- a minimal one-command wrapper only
- no prompt scaffolding, no policy checks, and no lockfile consistency gates

## 30-Second Value Demo :rocket:

```bash
supercodex guide "review auth security"
supercodex run analyze --dry-run --explain
supercodex verify --strict
```

Expected outcome:
- You get the best command path for intent.
- You can preview workflow decisions before acting.
- You can enforce consistency in CI with one gate.

## Alias Invocation: Which Syntax Works Where :compass:

| Context | Use this syntax | Example |
| --- | --- | --- |
| Codex interactive chat | `/prompts:<name>` | `/prompts:supercodex-research "map migration risks"` |
| SuperCodex CLI | `/supercodex:<name>` or `supercodex:<name>` | `supercodex /supercodex:research "map migration risks"` |
| SuperCodex CLI (plain alias) | `<name>` | `supercodex research "map migration risks"` |
| Shell shortcut (optional bridge) | `sc <name>` | `sc research "map migration risks"` |

Notes:

- Codex interactive custom commands are exposed under `/prompts:*`.
- `/supercodex:*` and `/sc:*` are SuperCodex CLI alias parsers, not native Codex interactive namespaces.

## Install, List, Uninstall :hammer_and_wrench:

```bash
supercodex install [--force] [--codex-home <path>]
supercodex list [--codex-home <path>]
supercodex status [--json] [--codex-home <path>]
supercodex uninstall [--codex-home <path>]
```

## Command Workflows :brain:

SuperCodex ships command workflows with rich behavioral prompts:

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
supercodex /supercodex:research "evaluate caching strategies"
supercodex brainstorm "API redesign options"
```

## Guided Command Selection :dart:

Use `guide` when you know intent but are unsure which command syntax/path to run:

```bash
supercodex guide "security review for auth flow"
supercodex guide "plan migration risks" --context chat
supercodex guide "improve CI reliability" --json
```

`guide` returns the best alias plus terminal/slash/prompt command forms and recommended next commands.

## Agents :robot:

Specialist agent definitions with triggers, capabilities, and handoff criteria:

```bash
supercodex agent list
supercodex agent show security-engineer
```

Available agents: `pm`, `deep-research`, `system-architect`, `security-engineer`, `frontend-architect`, `backend-architect`, `performance-engineer`, `devops-engineer`, `data-engineer`, `qa-engineer`, `tech-writer`, `incident-responder`, `ml-engineer`, `mobile-architect`, `database-architect`, `accessibility-engineer`

## Modes :jigsaw:

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

## Flags :triangular_flag_on_post:

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

## Skills :toolbox:

```bash
supercodex skill list
supercodex skill show confidence-check
supercodex skill enable confidence-check
supercodex skill disable confidence-check
```

Current skills:

- **confidence-check**: Pre-implementation confidence assessment (>=90% threshold)

## Personas :performing_arts:

```bash
supercodex persona list
supercodex persona show reviewer
supercodex persona set reviewer
supercodex persona unset
```

Built-in personas: `architect`, `reviewer`, `refactorer`, `debugger`, `shipper`, `educator`

## Shell Bridge (Optional) :shell:

Install a lightweight shell function named `sc` for shorthand alias use:

```bash
supercodex shell install
supercodex shell status
```

Then use:

```bash
sc research "scope and constraints"
sc /supercodex:brainstorming "alternatives"
```

## Session Memory :memo:

Persist lightweight session checkpoints across runs:

```bash
supercodex session save "implemented cache invalidation" --decision "use tag-based invalidation" --next "add eviction metrics"
supercodex session load --recent 5
supercodex session reflect
```

Memory defaults to local JSONL storage:

- path: `~/.codex/supercodex/memory/sessions.jsonl`
- max entries: `5000` (configurable via `[supercodex.memory]`)

## Safety Model :lock:

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

## Prompt Pack :package:

Installed under `~/.codex/prompts/supercodex/`:

- Base workflows: `plan.md`, `review.md`, `refactor.md`, `debug.md`
- Commands: `commands/*.md` (command workflow prompts)
- Modes: `modes/*.md` (mode behavioral definitions)
- Agents: `agents/*.md` (agent definitions)
- Personas: `personas/*.md`
- Framework: `framework/PRINCIPLES.md`, `framework/RULES.md`, `framework/FLAGS.md`
- Skills: `skills/confidence-check/SKILL.md`

Interactive wrappers installed under `~/.codex/prompts/`:

- `supercodex-research.md` -> `/prompts:supercodex-research`
- `supercodex-brainstorming.md` -> `/prompts:supercodex-brainstorming`
- wrappers for all built-in aliases

## Core Command Groups :books:

```bash
supercodex validate [--strict] [--json]
supercodex verify [--strict] [--json]
supercodex policy validate [--strict] [--json]
supercodex lock refresh|status [--json]
supercodex doctor [--fix] [--strict] [--json] [--plain] [--mcp-connectivity]
supercodex start [--yes] [--json] [--plain]
supercodex init [--dir <path>]
supercodex guide <intent> [--pack <name>] [--context auto|terminal|chat] [--json]
supercodex aliases list|show|packs|search|recommend
supercodex mode list|show|set|unset
supercodex persona list|show|set|unset
supercodex agent list|show
supercodex skill list|show|enable|disable
supercodex flag list|show
supercodex session save|load|reflect [--json]
supercodex run <command> [--mode <name>] [--persona <name>] [--dry-run] [--explain] [--json]
supercodex catalog list|search|show|sync
supercodex mcp add|list|install|remove|test|doctor|guided|catalog
```

For detailed examples, see [docs/COMMANDS.md](docs/COMMANDS.md).

## MCP Quick Examples :electric_plug:

Catalog install:

```bash
supercodex mcp install filesystem
supercodex mcp install --profile recommended
supercodex mcp guided --goal docs --yes
```

Manual STDIO server:

```bash
supercodex mcp add filesystem npx -y @modelcontextprotocol/server-filesystem . --env NODE_ENV=production
```

Manual HTTP server:

```bash
supercodex mcp add internal-api --http http://localhost:3333/mcp --env API_TOKEN=secret
```

## Config Snippet :gear:

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

[supercodex.memory]
enabled = true
path = "~/.codex/supercodex/memory/sessions.jsonl"
max_entries = 5000

[supercodex.policy]
enabled = true
strictness = "standard"

[supercodex.lock]
path = ".supercodex.lock.json"
enforce_in_ci = true
```

## Docs :book:

- [Quickstart Guide](docs/QUICKSTART.md)
- [Command Reference](docs/COMMANDS.md)
- [Command Chooser](docs/COMMAND_CHOOSER.md)
- [Session Memory Guide](docs/SESSION_MEMORY.md)
- [Release Channels](docs/RELEASE_CHANNELS.md)
- [Growth Playbook](docs/GROWTH_PLAYBOOK.md)
- [Growth Dashboard](docs/GROWTH_DASHBOARD.md)
- [Framework Metadata (Generated)](docs/METADATA.md)
- [Prompt Quality Checklist](docs/PROMPT_QUALITY_CHECKLIST.md)
- [ADR 0001: SuperClaude Compatibility Target](docs/adr/0001-superclaude-compatibility-target.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Publishing and Channels :mega:

Stable publish:

```bash
npm publish --access public --tag latest
```

Pre-release publish:

```bash
npm publish --access public --tag next
```

Full guide: [docs/RELEASE_CHANNELS.md](docs/RELEASE_CHANNELS.md)

## Benchmarking :chart_with_upwards_trend:

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
