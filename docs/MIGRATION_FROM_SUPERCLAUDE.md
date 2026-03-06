# Migration Guide: SuperClaude to SuperCodex

This guide is for teams moving an existing SuperClaude-style workflow to SuperCodex with minimal friction.

For capability comparison first, see [`SUPERCLAUDE_PARITY.md`](SUPERCLAUDE_PARITY.md).

## 1) Install and Baseline

```bash
npm install -g supercodex
supercodex install
supercodex start --yes
supercodex verify --strict
```

Outcome:

- prompt wrappers are installed
- managed config is merged safely
- baseline verification is green

## 2) Map Command Syntax by Context

Use this mapping as the migration rule of thumb.

| If you are in... | Use this form | Example |
| --- | --- | --- |
| Codex interactive chat | `/prompts:supercodex-<workflow>` | `/prompts:supercodex-review review this diff` |
| Terminal | `supercodex <alias>` | `supercodex review "review this diff"` |
| Terminal (explicit slash alias) | `supercodex /supercodex:<alias>` | `supercodex /supercodex:review "review this diff"` |

Do not use `/supercodex:*` directly inside Codex chat. Use `/prompts:*` there.

## 3) Migrate Core Workflow Loop

Recommended first migration set:

1. planning/spec
2. implementation
3. testing
4. review
5. documentation

Example command sequence:

```bash
supercodex guide "plan auth migration"
supercodex spec "auth migration scope"
supercodex implement "token rotation and refresh flow"
supercodex test "auth integration coverage"
supercodex review "regression and security checks"
supercodex document "migration notes"
```

## 4) Move Team Defaults to Project Presets

Pick a preset and commit deterministic output.

```bash
supercodex init --list-presets
supercodex init --preset api-service --refresh-lock
supercodex verify --strict
```

Commit:

- `.codex/config.toml`
- `.codex/README.md`
- `.supercodex.lock.json`

## 5) Update CI Gates

Add/confirm these commands in CI:

```bash
npm run build
npm test
npm run verify:consistency
```

For release lanes:

- use `.github/workflows/release-train.yml`
- generate notes from changelog fragments
- publish via trusted publisher flow on tag push

## 6) Migrate Operational Reporting

Track adoption/retention with built-in growth reporting:

```bash
supercodex growth funnel --json
supercodex growth experiments --json
supercodex growth dashboard --output docs/GROWTH_DASHBOARD.md --json
```

Keep experiment registry in `growth/experiments.json`.

## Common Migration Issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/supercodex:*` fails in Codex chat | Wrong command namespace for interactive chat | Use `/prompts:supercodex-*` |
| `verify --strict` fails after upgrades | Lock/metadata drift | Run `supercodex lock refresh` and `npm run metadata:sync`, then re-verify |
| Team behavior diverges by machine | Missing project preset lock-in | Re-run `init --preset ... --refresh-lock` and commit generated files |
| Release notes are inconsistent | Manual notes process | Use changelog fragments + `npm run release:notes -- --version <v>` |

## Migration Completion Checklist

- [ ] Install/start/strict verify passes on maintainer machine.
- [ ] Team preset selected and committed.
- [ ] CI gates are strict and reproducible.
- [ ] Command syntax conventions documented for chat vs terminal.
- [ ] Release-train and changelog-fragment workflow adopted.
