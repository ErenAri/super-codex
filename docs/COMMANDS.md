# Command Reference

This page summarizes day-to-day SuperCodex commands with practical examples.

## Core Lifecycle

Install or upgrade managed SuperCodex state:

```bash
supercodex install
supercodex start
supercodex start --yes
```

Inspect what is installed:

```bash
supercodex status
supercodex status --json
supercodex list
```

Remove only SuperCodex-managed sections and prompts:

```bash
supercodex uninstall
```

## Validation and Diagnostics

Validate registry/config compatibility:

```bash
supercodex validate
supercodex validate --strict
```

Run full consistency checks (registry + policy + lockfile):

```bash
supercodex verify
supercodex verify --strict
supercodex policy validate --strict
supercodex lock status --strict
supercodex lock refresh
```

Run diagnostics (report-only by default):

```bash
supercodex doctor
supercodex doctor --json
supercodex doctor --strict
supercodex doctor --plain
supercodex doctor --fix
supercodex doctor --mcp-connectivity
```

## Guided Command Selection

Use `guide` when intent is clear but command choice is not:

```bash
supercodex guide "security review for auth flow"
supercodex guide "plan migration risks" --context chat
supercodex guide "improve CI reliability" --pack command-workflows
supercodex guide "debug flaky tests" --json
```

`guide` returns:

- recommended alias
- terminal/slash/prompt command forms
- next suggested commands
- core profile onboarding hints (`recommended_agents`, `recommended_modes`)
- shared quick action contract fields: `best_next_command`, ordered `next_commands`, and labeled `quick_actions`

## Shared Quick Action Contract

`start`, `guide`, `doctor`, and `verify` now emit a shared quick-action shape in JSON output:

```json
{
  "best_next_command": "supercodex verify --strict",
  "next_commands": [
    "supercodex verify --strict",
    "supercodex lock refresh"
  ],
  "quick_actions": [
    {
      "id": "best_next",
      "label": "Best next command",
      "command": "supercodex verify --strict"
    }
  ]
}
```

Use this contract for CLI/GUI integrations that need deterministic "what to run next" guidance.

## Command Workflows

SuperCodex ships a broad command-workflow set. Each has a rich behavioral prompt with activation rules, execution flow, and output format. Generated counts live in `docs/METADATA.md`.

### Running commands

```bash
supercodex run analyze --json
supercodex run brainstorm --dry-run --explain "API redesign options"
supercodex run build --mode fast --persona shipper
supercodex run research --mode deep --persona architect --json
```

Safe mode write guardrails:

```bash
supercodex run implement --mode safe --dry-run --explain --json
```

In `safe` mode, write-capable workflows require `--dry-run` and `--explain`.

### Via aliases

```bash
supercodex /supercodex:research "map migration risks"
supercodex /supercodex:brainstorming "list architecture options"
supercodex analyze "review auth module"
supercodex estimate "migration to PostgreSQL"
```

### Full command list

| Command | Description |
| --- | --- |
| `run analyze` | Code and architecture analysis |
| `run brainstorm` | Idea generation and exploration |
| `run build` | Feature implementation from requirements |
| `run business-panel` | Multi-expert business analysis panel |
| `run cleanup` | Code cleanup and technical debt reduction |
| `run debug` | Debugging workflow |
| `run design` | System or feature design |
| `run document` | Documentation generation |
| `run estimate` | Effort estimation with ranges |
| `run explain` | Code explanation and walkthrough |
| `run git` | Git operations workflow |
| `run help` | Framework help and guidance |
| `run implement` | Implementation from spec |
| `run improve` | Code improvement and optimization |
| `run index` | File and project indexing |
| `run index-repo` | Repository-level indexing |
| `run load` | Context loading and orientation |
| `run plan` | Planning workflow |
| `run pm` | Project management workflow |
| `run recommend` | Recommendation generation |
| `run reflect` | Self-reflection and retrospective |
| `run refactor` | Refactoring workflow |
| `run research` | Deep research workflow |
| `run review` | Code review workflow |
| `run save` | Session and context saving |
| `run sc` | SuperCodex meta help |
| `run select-tool` | Tool selection guidance |
| `run spawn` | Sub-task decomposition and spawning |
| `run spec-panel` | Multi-expert spec review panel |
| `run task` | Task management and breakdown |
| `run test` | Test generation and execution |
| `run troubleshoot` | Problem troubleshooting |
| `run workflow` | Workflow management and optimization |

## Session Memory

Persist and resume lightweight checkpoints:

```bash
supercodex session save "implemented cache invalidation" --decision "use tag-based invalidation" --next "add eviction metrics"
supercodex session load --recent 5
supercodex session reflect
```

Session options:

- `--project <path>`: scope checkpoints to a project
- `--all-projects`: disable project filtering for load/reflect
- `--recent <count>`: cap returned/analyzed checkpoints
- `--json`: machine-readable output

Defaults:

- path: `~/.codex/supercodex/memory/sessions.jsonl`
- max entries: `5000` (from `[supercodex.memory.max_entries]`)

## Growth Funnel and Experiments

Track install -> start -> first command -> week-1 retention and inspect experiment status:

```bash
supercodex growth telemetry status --json
supercodex growth telemetry enable --json
supercodex growth funnel --json
supercodex growth events --limit 50 --json
supercodex growth export --output growth/telemetry-events.json --json
supercodex growth experiments --json
supercodex growth dashboard --output docs/GROWTH_DASHBOARD.md --json
supercodex growth telemetry disable --json
```

Use `growth dashboard` in weekly reporting workflows to keep `docs/GROWTH_DASHBOARD.md` current.

## Alias Workflows

List and inspect aliases:

```bash
supercodex aliases packs
supercodex aliases list
supercodex aliases search security
supercodex aliases show research
supercodex aliases recommend "security review"
```

Run an alias through SuperCodex CLI:

```bash
supercodex /supercodex:research "map migration risks"
supercodex /supercodex:brainstorming "list architecture options"
supercodex research "scope implementation plan"
```

### Alias Packs

| Pack | Aliases |
| --- | --- |
| `core-planning` | research, brainstorming, plan, spec, investigate, synthesize |
| `quality-review` | review, audit, security, perf, test, checklist |
| `debug-investigation` | debug, trace, repro, rootcause, triage, fixplan |
| `refactor-delivery` | refactor, simplify, migrate, architect, doc, ship |
| `command-workflows` | analyze, build, business-panel, cleanup, design, document, estimate, explain, git, help, implement, improve, index, index-repo, load, pm, recommend, reflect, save, sc, select-tool, spawn, spec-panel, task, troubleshoot, workflow |

## Codex Interactive Commands

Inside Codex chat, use `/prompts:*` wrappers:

```text
/prompts:supercodex-research map migration risks
/prompts:supercodex-review review this diff for regressions
/prompts:supercodex-debug isolate flaky timeout root cause
/prompts:supercodex-analyze review auth module architecture
```

Wrappers are installed in `~/.codex/prompts/supercodex-*.md`.

## Agents

List and inspect specialist agent definitions:

```bash
supercodex agent list
supercodex agent show pm
supercodex agent show security-engineer
```

### Available Agents

| Agent | Primary Mode | Description |
| --- | --- | --- |
| `pm` | balanced | Project management with PDCA cycle |
| `deep-research` | deep | Multi-hop reasoning and evidence management |
| `system-architect` | deep | Holistic system design and scalability |
| `security-engineer` | safe | Threat modeling and vulnerability assessment |
| `frontend-architect` | balanced | UI/UX and component architecture |
| `backend-architect` | deep | API design and data modeling |
| `performance-engineer` | deep | Profiling and optimization |
| `devops-engineer` | balanced | CI/CD and infrastructure |
| `data-engineer` | deep | Data pipelines and schema design |
| `qa-engineer` | safe | Test strategy and coverage |
| `tech-writer` | balanced | Documentation and API docs |
| `incident-responder` | fast | Incident response and postmortems |
| `ml-engineer` | deep | Model development and evaluation |
| `mobile-architect` | balanced | iOS/Android and cross-platform |
| `database-architect` | deep | Schema design and query optimization |
| `accessibility-engineer` | safe | WCAG compliance and a11y assessment |

## Modes and Personas

View and manage runtime defaults:

```bash
supercodex mode list
supercodex mode show deep
supercodex mode show brainstorming --full   # display full behavioral content
supercodex mode set deep
supercodex mode unset

supercodex persona list
supercodex persona show reviewer
supercodex persona set reviewer
supercodex persona unset
```

Resolve workflow context without running Codex:

```bash
supercodex run plan --json
supercodex run review --mode safe --persona reviewer --json
supercodex run debug --mode deep --persona debugger --json
```

## Flags

View flag definitions:

```bash
supercodex flag list
supercodex flag show brainstorm
supercodex flag show ultrathink
```

Flags are translated into mode/depth options during alias dispatch:

```bash
supercodex /supercodex:research --brainstorm "explore options"   # activates brainstorming mode
supercodex /supercodex:analyze --think "deep analysis"           # enables high reasoning budget
supercodex /supercodex:research --c7 "use Context7"              # enables Context7 MCP
```

## Skills

Manage skill definitions:

```bash
supercodex skill list
supercodex skill show confidence-check
supercodex skill enable confidence-check
supercodex skill disable confidence-check
```

## MCP

Manual MCP registration:

```bash
supercodex mcp add filesystem npx -y @modelcontextprotocol/server-filesystem .
supercodex mcp add internal-api --http http://localhost:3333/mcp --env API_TOKEN=secret
```

Catalog-driven install:

```bash
supercodex catalog list
supercodex catalog search postgres
supercodex mcp install postgres
supercodex mcp install --profile recommended
supercodex mcp guided --goal docs
supercodex mcp guided --goal docs --yes
```

Health and maintenance:

```bash
supercodex mcp list
supercodex mcp test filesystem
supercodex mcp test filesystem --plain
supercodex mcp doctor
supercodex mcp doctor --connectivity
supercodex mcp connectors --official --json
supercodex mcp connectors --official --health --connectivity --json
supercodex mcp capabilities --official --transport stdio --json
supercodex mcp connector docs-retrieval --json
supercodex mcp guided --goal docs --plain
supercodex mcp remove filesystem
```

## Shell Bridge

Optional shell shortcut (`sc`) for faster alias entry:

```bash
supercodex shell install
supercodex shell status
supercodex shell script --shell bash
supercodex shell remove
```

After install:

```bash
sc research "plan migration"
sc /supercodex:security "threat model this change"
sc analyze "review auth module"
```

## Project Templates and Team Presets

Create additive project-local files from reusable presets:

```bash
supercodex init --list-presets
supercodex init --preset api-service --dir ./my-project
supercodex init --preset monorepo --refresh-lock
supercodex init --preset library --json
```

Generated files:

- `.codex/config.toml`
- `.codex/README.md`
- optional lock output when `--refresh-lock` is used (default: `.supercodex.lock.json`)

For the full preset matrix (expected command packs and policy defaults), see
[`PROJECT_TEMPLATES.md`](PROJECT_TEMPLATES.md).

## Useful Flags

- `--codex-home <path>`: point to an alternate Codex home for testing or CI
- `--json`: machine-readable output for automation
- `--plain`: disable emoji/decorated output in human-readable modes
- `--strict`: fail on warnings where supported
- `--force`: override conflict-preserving merge behavior
- `--full`: show rich content (used with `mode show`)
- `--context auto|terminal|chat`: output recommendation style for `guide`
- `--dry-run`: preview workflow resolution without downstream side effects (`run` commands)
- `--explain`: show reasoning behind workflow/mode/persona resolution (`run` commands)
- `--preset <id>`: choose project preset for `init` (`api-service|web-app|library|monorepo`)
- `--list-presets`: print available project presets (`init`)
- `--refresh-lock`: refresh lock file immediately after preset init
- `--lock-path <path>`: override lock path for `init --refresh-lock` and lock commands
