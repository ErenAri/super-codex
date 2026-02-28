# @erenari/supercodex

SuperClaude-style configuration framework for Codex CLI with:

- safe backup-first config merges
- command/mode/persona registry system
- bundled MCP catalog + doctor workflows

## Quickstart

```bash
npm install -g @erenari/supercodex
supercodex install
supercodex status
```

## Safety Model

- Never overwrites `~/.codex/config.toml` blindly.
- Always creates timestamped backups in:
  - `~/.codex/backups/YYYY-MM-DD-HHMMSS/`
- Managed merge scope:
  - `[supercodex]`
  - optional `[agents.*]`
  - optional `[mcp_servers.*]`
- Idempotent installs.
- Conflict policy:
  - preserve existing differing values
  - record desired values in `[supercodex.overrides]`
  - use `--force` to apply in standard locations

## Prompt Pack

Installed in `~/.codex/prompts/supercodex/`:

- `plan.md`
- `review.md`
- `refactor.md`
- `debug.md`

Additional overlays:

- `modes/deep.md`
- `modes/fast.md`
- `personas/architect.md`
- `personas/reviewer.md`

## Command Surface

Core:

```bash
supercodex install [--force] [--codex-home <path>]
supercodex uninstall [--codex-home <path>]
supercodex list [--codex-home <path>]
supercodex status [--json] [--codex-home <path>]
supercodex init [--dir <path>]
supercodex validate [--strict] [--json] [--codex-home <path>]
supercodex doctor [--fix] [--strict] [--json] [--mcp-connectivity]
```

Catalog:

```bash
supercodex catalog list|search|show|sync
```

SuperClaude compatibility aliases:

```bash
supercodex aliases list|show|packs|search
supercodex /sc:research [args...]
supercodex sc:brainstorming [args...]
supercodex research [args...]
```

Modes and personas:

```bash
supercodex mode list|show|set|unset
supercodex persona list|show|set|unset
supercodex shell install|remove|status|script
```

MCP:

```bash
supercodex mcp add <name> <command...> [--env KEY=VALUE] [--force]
supercodex mcp add <name> --http <url> [--env KEY=VALUE] [--force]
supercodex mcp list
supercodex mcp install <catalog-id>
supercodex mcp remove <name>
supercodex mcp test <name>
supercodex mcp doctor [--connectivity]
supercodex mcp catalog list|search|show
```

Workflow context:

```bash
supercodex run plan|review|refactor|debug [--mode <name>] [--persona <name>] [--json]
```

## SuperClaude Alias Mapping

Built-in aliases (focused v2, grouped by pack):

- `core-planning`: `research`, `brainstorming`, `plan`, `spec`, `investigate`, `synthesize`
- `quality-review`: `review`, `audit`, `security`, `perf`, `test`, `checklist`
- `debug-investigation`: `debug`, `trace`, `repro`, `rootcause`, `triage`, `fixplan`
- `refactor-delivery`: `refactor`, `simplify`, `migrate`, `architect`, `doc`, `ship`

Key mappings:

- `/sc:research` -> `run plan --mode deep --persona architect`
- `/sc:brainstorming` -> `run plan --mode balanced --persona educator`
- `/sc:security` -> `run review --mode safe --persona reviewer`
- `/sc:rootcause` -> `run debug --mode deep --persona debugger`
- `/sc:migrate` -> `run refactor --mode safe --persona architect`
- `/sc:ship` -> `run refactor --mode fast --persona shipper`

Supported invocation forms:

- `/sc:<name>`
- `sc:<name>`
- `<name>` (plain alias form; command names still take precedence)

Important:

- `/sc:*` aliases are parsed by `supercodex` arguments (for example: `supercodex /sc:research`).
- Codex interactive native slash commands are not currently extensible through this package.
- For terminal shorthand, install the shell bridge and use `sc`.

```bash
supercodex shell install
sc research "scope and risks"
sc /sc:brainstorming "new architecture options"
```

Inspect alias packs:

```bash
supercodex aliases packs
supercodex aliases list --pack quality-review
supercodex aliases search security
```

## Project Template (`supercodex init`)

Creates:

- `.codex/config.toml`
- `.codex/README.md`

`init` is additive and preserves existing keys.

## MCP Examples

Install from catalog:

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
version = "0.2.0"
prompt_pack = "supercodex"
prompts_dir = "/home/user/.codex/prompts/supercodex"

[supercodex.runtime]
default_mode = "balanced"
default_persona = "architect"
catalog_version = "2026.02.28"

[supercodex.catalog]
source = "local"
installed_ids = ["filesystem"]
```

Conflict capture:

```toml
[supercodex.overrides]
"agents.supercodex_planner" = { description = "SuperCodex structured planning profile", prompt = "supercodex/plan.md" }
```

## Prompt Invocation Examples

```bash
codex --prompt-file ~/.codex/prompts/supercodex/plan.md "Plan a safe migration from v1 to v2"
codex --prompt-file ~/.codex/prompts/supercodex/review.md "Review this branch for regressions"
codex --prompt-file ~/.codex/prompts/supercodex/debug.md "Debug intermittent timeout in API tests"
```

## Benchmarking

M0 benchmarking compares `codex_native` vs `supercodex` using the task corpus in `benchmarks/tasks/`.

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

Threshold policy is locked in:

- `benchmarks/thresholds.json`

Tune policy from historical runs:

```bash
npx tsx benchmarks/tune-thresholds.ts --last=5
npx tsx benchmarks/tune-thresholds.ts --last=5 --write
```

If `codex` is not available on PATH, harness preflight records it and baseline entries are marked as `infra_error`.
