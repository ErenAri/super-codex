# Command Reference

This page summarizes day-to-day SuperCodex commands with practical examples.

## Core Lifecycle

Install or upgrade managed SuperCodex state:

```bash
supercodex install
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

Run diagnostics (report-only by default):

```bash
supercodex doctor
supercodex doctor --json
supercodex doctor --strict
supercodex doctor --fix
supercodex doctor --mcp-connectivity
```

## Command Workflows

SuperCodex ships 30 command workflows. Each has a rich behavioral prompt with activation rules, execution flow, and output format.

### Running commands

```bash
supercodex run analyze --json
supercodex run brainstorm "API redesign options"
supercodex run build --mode fast --persona shipper
supercodex run research --mode deep --persona architect --json
```

### Via aliases

```bash
supercodex /sc:research "map migration risks"
supercodex sc:brainstorming "list architecture options"
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

## Alias Workflows

List and inspect aliases:

```bash
supercodex aliases packs
supercodex aliases list
supercodex aliases search security
supercodex aliases show research
```

Run an alias through SuperCodex CLI:

```bash
supercodex /sc:research "map migration risks"
supercodex sc:brainstorming "list architecture options"
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
/prompts:sc-research map migration risks
/prompts:sc-review review this diff for regressions
/prompts:sc-debug isolate flaky timeout root cause
/prompts:sc-analyze review auth module architecture
```

Wrappers are installed in `~/.codex/prompts/sc-*.md`.

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
supercodex /sc:research --brainstorm "explore options"   # activates brainstorming mode
supercodex /sc:analyze --think "deep analysis"           # enables high reasoning budget
supercodex /sc:research --c7 "use Context7"              # enables Context7 MCP
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
```

Health and maintenance:

```bash
supercodex mcp list
supercodex mcp test filesystem
supercodex mcp doctor
supercodex mcp doctor --connectivity
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
sc /sc:security "threat model this change"
sc analyze "review auth module"
```

## Project Template

Create additive project-local files:

```bash
supercodex init
supercodex init --dir ./my-project
```

Generated files:

- `.codex/config.toml`
- `.codex/README.md`

## Useful Flags

- `--codex-home <path>`: point to an alternate Codex home for testing or CI
- `--json`: machine-readable output for automation
- `--strict`: fail on warnings where supported
- `--force`: override conflict-preserving merge behavior
- `--full`: show rich content (used with `mode show`)
