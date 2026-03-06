# Release Channels

Use release channels to ship fast without breaking trust.

## Tag Strategy

- Stable release tag: `vX.Y.Z` -> publishes with npm dist-tag `latest`
- Pre-release tag: `vX.Y.Z-beta.N` or `vX.Y.Z-rc.N` -> publishes with npm dist-tag `next`

The publish workflow in `.github/workflows/publish.yml` resolves this automatically.

## Trusted Publishing and Provenance

The workflow uses:
- GitHub `id-token: write` permission
- `npm publish --provenance ...`

Recommended setup:
1. Configure npm trusted publishing for this GitHub repository.
2. Keep `NPM_TOKEN` as fallback only while trusted publishing is being rolled out.

## Manual Publish Commands

Stable:

```bash
npm publish --access public --tag latest
```

Pre-release:

```bash
npm publish --access public --tag next
```

Move a version to another tag:

```bash
npm dist-tag add supercodex@2.0.0 latest
npm dist-tag add supercodex@2.0.0-beta.2 next
```

Inspect tags:

```bash
npm dist-tag ls supercodex
```

## Recommended Cadence

- `latest`: one stable release every 2-4 weeks
- `next`: 1-2 pre-releases per week for risky/new command changes

## Automated Release Train

Workflow: `.github/workflows/release-train.yml`

- Weekly canary readiness runs every Monday (build + test + strict verify + generated canary notes artifact).
- Manual dispatch supports two lanes:
  - `canary` (requires prerelease version such as `2.0.0-beta.2`)
  - `stable` (requires stable version such as `2.0.0`)
- Dispatch preflight gates:
  - `npm run build`
  - `npm test`
  - `npm run verify:consistency`
  - stable lane only: `node dist/cli.js growth gate --strict --json`
- Tag push from release-train triggers publish workflow, which publishes to:
  - `next` for prerelease tags
  - `latest` for stable tags

### Dispatch Inputs

- `release_channel`: `canary` or `stable`
- `version`: semver without leading `v`
- `release_date`: optional override (`YYYY-MM-DD`)
- `push_tag`: whether to create/push git tag
- `create_github_release`: whether to create GitHub Release
- `fragments_dir`: structured changelog fragment directory

## Structured Changelog Fragments

Release notes are generated from JSON fragments under `changelog/fragments`.

Generate notes:

```bash
npm run release:notes -- --version 2.0.0-beta.2
```

Check notes are current:

```bash
npm run release:notes:check -- --version 2.0.0-beta.2
```

Verify published package version and dist-tag:

```bash
npm run release:publish:verify -- --version 2.0.0-beta.2 --dist-tag next
```

Fragment format reference: `changelog/fragments/README.md`

## PR Benchmark Smoke Gate

- Add the `benchmark-smoke` label to a pull request to run the smoke benchmark gate in CI.
- Or trigger CI manually via `workflow_dispatch` with `run_benchmark_smoke=true`.
- Smoke gate commands:
  - `npm run bench:smoke`
  - `npm run bench:smoke:score`
  - `npm run bench:smoke:diff`
  - `npm run bench:smoke:check`
- Diff artifacts produced in CI:
  - `benchmarks/results/latest-diff.json`
  - `benchmarks/results/latest-diff.md`

## Release Checklist

1. `npm ci`
2. `npm run build`
3. `npm test`
4. `npm run verify:consistency`
5. Confirm README install snippets still use `supercodex`
6. Publish with correct dist-tag
