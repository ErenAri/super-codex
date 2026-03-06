# Upgrade Guide

This guide covers safe upgrades between SuperCodex versions.

## Before You Upgrade

1. Check your current version:
   - `supercodex status --json`
2. Save current lock and run diagnostics:
   - `supercodex lock status --json`
   - `supercodex doctor --json`
3. Ensure local changes are committed before upgrading project-level config.

## Upgrade Flow (Any Version)

1. Update package:
   - `npm install -g supercodex@latest`
2. Re-apply managed install:
   - `supercodex install`
3. Run first-run verification:
   - `supercodex start --yes`
4. Refresh deterministic lock and run strict checks:
   - `supercodex lock refresh`
   - `supercodex verify --strict`

## From 1.x to 2.x Stable

SuperCodex `2.x` adds stricter command contracts and safety policy behavior.

1. Review new quick-action contract fields in JSON output:
   - `best_next_command`
   - `next_commands`
   - `quick_actions`
2. If you run write-capable workflows in `safe` mode, include:
   - `--dry-run`
   - `--explain`
3. Rebuild CI scripts to include benchmark smoke gate commands when needed:
   - `npm run bench:smoke`
   - `npm run bench:smoke:score`
   - `npm run bench:smoke:check`
4. If you use repo-local presets, list and re-apply with lock output:
   - `supercodex init --list-presets`
   - `supercodex init --preset <id> --refresh-lock`

Contract details: [`docs/COMPATIBILITY_POLICY.md`](./COMPATIBILITY_POLICY.md)

## Troubleshooting Upgrade Issues

- Config merge conflicts:
  - Run `supercodex install --force` only if you explicitly want managed values applied.
- Prompt wrapper mismatch:
  - Run `supercodex start --yes` then `supercodex list`.
- Lock mismatch in CI:
  - Run `supercodex lock refresh` and commit `.supercodex.lock.json`.

For broader diagnostics, use [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).
