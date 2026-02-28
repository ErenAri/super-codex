# Benchmark Task Authoring Guide

Each task is a JSON file validated by `benchmarks/schema/task.schema.json`.

Current starter corpus ships with 54 tasks across:

- bugfix
- feature
- refactor
- migration
- review
- debug

## Required fields

- `id`: stable unique id.
- `title`: short human-readable title.
- `category`: one of `bugfix|feature|refactor|migration|review|debug`.
- `repo_fixture`: path to fixture directory.
- `prompt`: task intent passed to benchmark tools.
- `verify`: verification rule.
- `timeout_seconds`: per-command timeout.
- `run_cmd` or `mode_cmds`: execution command(s).

## Command format

Commands are token arrays, for example:

```json
["codex", "--version"]
```

Use `mode_cmds` for per-mode commands:

```json
{
  "mode_cmds": {
    "codex_native": ["codex", "--version"],
    "supercodex": ["npx", "tsx", "{REPO_ROOT}/src/cli.ts", "status", "--json"]
  }
}
```

Supported placeholders in command args:

- `{REPO_ROOT}`
- `{WORKSPACE}`
- `{TASK_PROMPT}`
- `{NODE_PATH}`

## Verification

- `command` or `tests`: runs command and expects exit code `0`.
- `file_assert`: checks one or more files exist in workspace.

## Reliability rules

- Keep fixtures self-contained.
- Avoid network dependencies.
- Prefer deterministic checks with explicit outputs.
