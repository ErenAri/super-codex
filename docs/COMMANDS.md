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

## Codex Interactive Commands

Inside Codex chat, use `/prompts:*` wrappers:

```text
/prompts:sc-research map migration risks
/prompts:sc-review review this diff for regressions
/prompts:sc-debug isolate flaky timeout root cause
```

Wrappers are installed in `~/.codex/prompts/sc-*.md`.

## Modes and Personas

View and manage runtime defaults:

```bash
supercodex mode list
supercodex mode show deep
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
