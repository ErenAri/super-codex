# Compatibility and SemVer Policy

This policy defines what SuperCodex treats as a stable contract in `2.x`.

## Versioning Model

- Stable releases use `MAJOR.MINOR.PATCH` and publish to npm `latest`.
- Pre-releases use `MAJOR.MINOR.PATCH-beta.N` (or `rc.N`) and publish to npm `next`.
- Semantic versioning applies:
  - `PATCH`: bug fixes with no intentional breaking changes.
  - `MINOR`: new additive features, commands, fields, and docs.
  - `MAJOR`: explicit breaking changes with migration guidance.

## Stable Contracts in 2.x

The following are treated as compatibility contracts for all `2.x` stable releases:

- CLI command surface in built-in command groups.
- Alias invocation forms:
  - `/prompts:supercodex-*` (Codex chat)
  - `/supercodex:*`, `supercodex:*`, and plain alias forms (CLI)
- JSON quick-action contract fields when present:
  - `best_next_command`
  - `next_commands`
  - `quick_actions`
- Safety/verification primitives:
  - `supercodex verify --strict`
  - `supercodex policy validate`
  - `supercodex lock refresh|status`

## Allowed Additive Changes in 2.x

- Add new commands, aliases, agents, modes, and MCP connectors.
- Add JSON fields (without removing or changing existing field meaning).
- Improve prompt text, docs, and diagnostics.
- Tighten safety checks if migration path and remediation text are included.

## Breaking Change Rules

The following require a major version bump (`3.0.0`):

- Removing a documented command/alias syntax.
- Renaming or changing meaning of existing JSON contract fields.
- Changing stable command behavior in a way that invalidates existing automation.

## Deprecation Policy

- Deprecations must be announced in release notes before removal.
- Stable deprecations remain available through at least one minor release.
- Migration command examples must be included in docs/releases notes.

## Release Gate for Stable

Stable release (`latest`) requires:

1. `npm run build`
2. `npm test`
3. `npm run verify:consistency`
4. `node dist/cli.js growth gate --strict --json`
5. Release notes generated and checked from changelog fragments

## Scope Note

Behavioral compatibility with SuperClaude is a target, not a strict byte-for-byte output parity promise.
See: `docs/adr/0001-superclaude-compatibility-target.md`.
