# ADR 0001: SuperClaude Compatibility Target

- Status: Accepted
- Date: 2026-03-04
- Deciders: SuperCodex maintainers
- Related: `README.md`, `src/registry/builtins.ts`, `src/commands/run.ts`, `src/runtime/*`

## Context

SuperCodex is inspired by SuperClaude behavior and vocabulary, but it is a distinct implementation:

- TypeScript + Node runtime instead of Python-first packaging.
- Runtime context resolution (`mode`, `persona`, `registry`, aliases) instead of only slash-command installation.
- Safety-first, non-destructive config merges in `~/.codex/config.toml`.

This created ambiguity around what "compatible" means when users compare the projects.

## Decision

SuperCodex adopts **behavioral compatibility** as the primary contract.

Behavioral compatibility means:

1. Workflow intent parity:
   - SuperCodex preserves the conceptual workflow surface aligned with SuperClaude command intent.
2. Runtime determinism:
   - Workflow resolution is explicit and reproducible from registry + config state.
3. Safety guarantees:
   - Mutating operations are backup-first and idempotent by default.

SuperCodex does **not** promise packaging/runtime identity with SuperClaude.

## In Scope

- Command, mode, persona, and agent intent alignment.
- Predictable alias and flag dispatch behavior.
- Config ownership and deterministic merge semantics.
- MCP catalog and server declaration behavior in local config.

## Out of Scope

- Exact CLI flag surface parity with SuperClaude Python tooling.
- Identical installer flow (`pipx`, `pytest` plugin lifecycle, Docker bootstrap behavior).
- Byte-for-byte prompt content parity guarantees across releases.

## Consequences

Positive:

- Clear compatibility promise users can reason about.
- Freedom to evolve TypeScript runtime architecture while preserving expected behavior.
- Reduced risk of accidental destructive behavior from installer-level coupling.

Tradeoffs:

- Some SuperClaude operational/documentation assumptions remain non-portable.
- Compatibility needs explicit release notes and validation checks to avoid drift.

## Implementation Direction

1. Keep behavioral contracts testable:
   - Alias dispatch, workflow resolution, mode/persona compatibility checks, and diagnostics stay under contract tests.
2. Make metadata explicit and generated:
   - Derive command/agent/mode counts from source of truth, not hardcoded docs.
3. Continue modularization:
   - Move high-fan-in concerns behind focused service interfaces while preserving CLI behavior.

## Review Trigger

Revisit this ADR if SuperCodex decides to:

- Ship Python/plugin compatibility layers, or
- Promise full CLI/package parity beyond behavioral intent.
