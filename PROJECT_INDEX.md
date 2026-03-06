# Project Index

This file is a fast map for new sessions and contributors to locate core implementation areas.

## Entry Points

- [`README.md`](README.md): product overview, quickstart, and docs index.
- [`package.json`](package.json): scripts, version, and publish metadata.
- [`src/cli.ts`](src/cli.ts): CLI bootstrap and command registration.

## Core Runtime

- [`src/registry/`](src/registry): built-in modes, commands, agents, catalog, and overlay loader.
- [`src/runtime/`](src/runtime): workflow resolution, compatibility checks, alias dispatch.
- [`src/services/`](src/services): verification, policy, lockfile, metrics, quick actions, start flow.
- [`src/doctor/`](src/doctor): diagnostics, safety/fix plans, report formatting.
- [`src/profiles.ts`](src/profiles.ts): framework profile contracts (core loop, core agents, core modes).
- [`src/kernel.ts`](src/kernel.ts): kernel primitive export snapshot for tooling/diagnostics.

## Prompt and Framework Content

- [`content/commands/`](content/commands): command workflow prompt definitions.
- [`content/workflows/`](content/workflows): base workflow prompt definitions.
- [`content/modes/`](content/modes): mode overlays and policies.
- [`content/agents/`](content/agents): agent prompt definitions.
- [`content/personas/`](content/personas): persona overlays.
- [`content/framework/`](content/framework): principles/rules/flags references.

## Benchmarks and Quality Gates

- [`benchmarks/`](benchmarks): evaluation harness, scorecards, thresholds, tasks.
- [`tests/`](tests): CLI contracts, golden outputs, service tests, benchmark tests.
- [`tests/helpers/temp-cleanup.ts`](tests/helpers/temp-cleanup.ts): shared flaky-cleanup hardening helper.
- [`.supercodex.lock.json`](.supercodex.lock.json): deterministic command/content hash lock.

## Automation

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml): build/test/verify and benchmark workflows.
- [`.github/workflows/publish.yml`](.github/workflows/publish.yml): npm trusted publish pipeline.
- [`scripts/sync-metadata.ts`](scripts/sync-metadata.ts): README/docs metadata synchronization.
- [`scripts/update-golden.ts`](scripts/update-golden.ts): golden fixture refresh runner.

## Key Docs

- [`docs/QUICKSTART.md`](docs/QUICKSTART.md): first-run path.
- [`docs/COMMANDS.md`](docs/COMMANDS.md): command reference and JSON contracts.
- [`docs/UPGRADE.md`](docs/UPGRADE.md): version upgrade checklist.
- [`docs/RELEASE_CHANNELS.md`](docs/RELEASE_CHANNELS.md): release channel strategy.
- [`BACKLOG_V2.md`](BACKLOG_V2.md): active V2 delivery plan.
