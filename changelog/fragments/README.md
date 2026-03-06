# Changelog Fragments

Structured release-note fragments live in this folder as JSON files.

## File Naming

Use sortable names:

- `YYYY-MM-DD-short-topic.json`

Example:

- `2026-03-06-sc2-008-project-presets.json`

## Schema

```json
{
  "id": "sc2-008",
  "type": "feat",
  "summary": "Added project template presets for init workflow.",
  "details": "Includes api-service, web-app, library, and monorepo defaults.",
  "commands": [
    "supercodex init --list-presets",
    "supercodex init --preset api-service --refresh-lock"
  ],
  "issues": [
    "SC2-008",
    "#123"
  ]
}
```

Fields:

- `id` (optional string): stable identifier. Defaults to filename stem.
- `type` (optional): `feat`, `fix`, `perf`, `security`, `docs`, `chore`, `breaking`.
- `summary` (required): one-line user-visible change summary.
- `details` (optional): short supporting context.
- `commands` (optional string[]): copy-paste commands impacted by this change.
- `issues` (optional string[]): issue IDs, PR numbers, or references.
- `breaking` (optional boolean): when `true`, type is treated as `breaking`.

## Generation

Generate notes from fragments:

```bash
npm run release:notes -- --version 2.0.0-beta.2
```

Check generated notes are current:

```bash
npm run release:notes:check -- --version 2.0.0-beta.2
```
