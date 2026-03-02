# Troubleshooting

## `/sc:...` does not work inside Codex interactive chat

Expected behavior.

- Codex interactive custom commands are exposed as `/prompts:<name>`.
- SuperCodex installs wrappers such as `/prompts:sc-research`.

Use this inside Codex chat:

```text
/prompts:sc-research map migration risks
```

Use this in terminal (outside Codex chat):

```bash
supercodex /sc:research "map migration risks"
```

## `/prompts:sc-*` commands are missing

Run:

```bash
supercodex install
supercodex list
```

Then verify files exist in:

- `~/.codex/prompts/sc-research.md` (and other `sc-*.md` files)

If still missing, check your Codex home override:

```bash
supercodex status --json
```

Look at:

- `codexHome`
- `interactivePromptCommandsInstalled`
- `interactivePromptCommandsMissing`

## `supercodex` command shows old behavior/version

You likely have an older global install in PATH.

Check version:

```bash
supercodex --version
npm view @erenari/supercodex version
```

Reinstall globally:

```bash
npm uninstall -g @erenari/supercodex
npm install -g @erenari/supercodex@latest
```

Then run:

```bash
supercodex install
```

## Shell shortcut `sc` not recognized

Install bridge and reload your shell:

```bash
supercodex shell install
supercodex shell status
```

- PowerShell: open a new terminal session.
- Bash/Zsh/Fish: restart terminal or source the profile file shown by `shell status`.

## Existing config values were not changed

Default merge policy preserves conflicting existing values and records desired values under:

- `[supercodex.overrides]`

Inspect warnings during install, then use `--force` only when you want SuperCodex values to replace conflicts:

```bash
supercodex install --force
```

## MCP server added but fails test

Run MCP diagnostics:

```bash
supercodex mcp test <name>
supercodex mcp doctor --connectivity
```

Common causes:

- missing command in PATH (stdio transport)
- invalid URL or local service down (http transport)
- missing required environment variables

## Doctor reports missing framework files

If `supercodex doctor` shows warnings about missing framework files (PRINCIPLES.md, RULES.md, FLAGS.md):

```bash
supercodex install
supercodex doctor
```

The framework files are installed under `~/.codex/prompts/supercodex/framework/`.

## Agent or skill commands not recognized

Make sure you have the latest version:

```bash
supercodex --version
```

The `agent`, `skill`, and `flag` commands were added in v1.0.0. Update if needed:

```bash
npm install -g @erenari/supercodex@latest
```

## Mode `--full` flag shows "Content file not found"

The mode's content file may not be installed yet. Run:

```bash
supercodex install
supercodex mode show brainstorming --full
```

## Flag dispatch not working with aliases

Flags like `--brainstorm`, `--think`, `--ultrathink` are processed during alias dispatch. They must appear after the alias name:

```bash
# Correct
supercodex /sc:research --brainstorm "explore options"

# Incorrect (flag before alias)
supercodex --brainstorm /sc:research "explore options"
```

## Need a clean local repro environment

Use an alternate Codex home path:

```bash
supercodex install --codex-home /tmp/supercodex-test
supercodex status --codex-home /tmp/supercodex-test --json
```

Windows example:

```powershell
supercodex install --codex-home C:\Temp\supercodex-test
supercodex status --codex-home C:\Temp\supercodex-test --json
```
