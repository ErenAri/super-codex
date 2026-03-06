# Quickstart Guide

This guide gets a new installation from zero to first useful output quickly.

## 1) Install and Verify

```bash
npm install -g supercodex
supercodex install
supercodex start --yes
supercodex status
```

## 2) Ask Guide for the Best Command

```bash
supercodex guide "security review for auth flow"
```

This returns:

- the best alias
- terminal form (`supercodex <alias>`)
- slash form (`supercodex /supercodex:<alias>`)
- Codex interactive form (`/prompts:supercodex-<workflow>`)

## 3) Apply a Project Preset (Optional, Recommended for Teams)

```bash
supercodex init --list-presets
supercodex init --preset api-service --refresh-lock
```

This creates additive project-local defaults and writes lock output for reproducible team setup.

## 4) Run a Workflow

Terminal:

```bash
supercodex research "map migration risks"
```

Codex interactive chat:

```text
/prompts:supercodex-research map migration risks
```

## 5) Save Context for Later

```bash
supercodex session save "mapped migration risks" --next "draft rollout plan"
supercodex session load --recent 5
supercodex session reflect
```

## 6) Troubleshoot Quickly

```bash
supercodex doctor --strict
supercodex mcp doctor --connectivity
```

If slash syntax is confusing, see `docs/TROUBLESHOOTING.md`.
For project navigation in new sessions, see `PROJECT_INDEX.md`.
