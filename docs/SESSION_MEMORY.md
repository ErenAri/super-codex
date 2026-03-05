# Session Memory Guide

SuperCodex session memory stores lightweight project checkpoints in local JSONL.

## Commands

Save a checkpoint:

```bash
supercodex session save "implemented cache invalidation" \
  --decision "use tag-based invalidation" \
  --next "add eviction metrics" \
  --tag caching
```

Load recent checkpoints:

```bash
supercodex session load --recent 10
supercodex session load --project ./services/api --recent 5
supercodex session load --all-projects --recent 20
```

Reflect on progress:

```bash
supercodex session reflect
supercodex session reflect --project ./services/api --recent 8
```

## Storage and Defaults

- Default file: `~/.codex/supercodex/memory/sessions.jsonl`
- Default retention: `5000` entries
- Default scope for load/reflect: current working directory project

## Config

```toml
[supercodex.memory]
enabled = true
path = "~/.codex/supercodex/memory/sessions.jsonl"
max_entries = 5000
```

## JSONL Record Shape

Each line is one JSON object:

```json
{
  "id": "uuid",
  "timestamp": "2026-03-05T19:24:31.000Z",
  "project_root": "C:/projects/my-app",
  "summary": "implemented cache invalidation",
  "decisions": ["use tag-based invalidation"],
  "next_steps": ["add eviction metrics"],
  "tags": ["caching"],
  "mode": "deep",
  "persona": "architect"
}
```

## Safety Notes

- Session memory is local-only by default.
- Do not store secrets in summaries or decisions.
- If memory is disabled (`enabled = false`), save/load/reflect become no-op informational commands.
