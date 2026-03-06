# Project Templates and Team Presets

SuperCodex project templates are reusable, additive presets for repository-local `.codex/config.toml`.

## Quick Commands

```bash
supercodex init --list-presets
supercodex init --preset api-service --dir ./my-project
supercodex init --preset monorepo --refresh-lock
```

Notes:
- Presets are additive and non-destructive.
- Existing conflicting values are preserved and reported as skipped paths.
- `--refresh-lock` writes `.supercodex.lock.json` so teams can version-control deterministic output.

## Preset Matrix

| Preset | Best For | Command Packs | Policy Defaults |
| --- | --- | --- | --- |
| `api-service` | Backend APIs and service repos | `core-planning`, `quality-review`, `command-workflows` | `mode=safe`, `persona=architect`, `strictness=strict` |
| `web-app` | Frontend/fullstack product apps | `core-planning`, `quality-review`, `refactor-delivery`, `command-workflows` | `mode=balanced`, `persona=architect`, `strictness=standard` |
| `library` | Reusable packages and SDKs | `core-planning`, `quality-review`, `command-workflows` | `mode=safe`, `persona=reviewer`, `strictness=strict` |
| `monorepo` | Multi-package workspaces | `core-planning`, `quality-review`, `refactor-delivery`, `command-workflows` | `mode=deep`, `persona=architect`, `strictness=strict` |

## Team Version-Control Flow

1. Apply preset in repo root:
   - `supercodex init --preset <preset-id> --refresh-lock`
2. Validate consistency:
   - `supercodex verify --strict`
3. Commit generated artifacts:
   - `.codex/config.toml`
   - `.codex/README.md`
   - `.supercodex.lock.json`

## JSON Output Contract

Use `--json` for scripting:

```bash
supercodex init --preset api-service --refresh-lock --json
```

Key fields include:
- `project_root`
- `preset`
- `config_path`
- `readme_path`
- `config_changed`
- `readme_changed`
- `skipped_paths`
- `lock.refreshed` and `lock.path`
