# SuperCodex Metadata

This file is auto-generated from framework source-of-truth files.
Do not edit manually. Run `npm run metadata:sync`.

## Counts

| Metric | Value |
| --- | ---: |
| Total command definitions | 80 |
| Workflow command definitions (run.*) | 33 |
| Base workflow definitions | 4 |
| Extended workflow definitions | 29 |
| Workflow base files (content/workflows) | 4 |
| Workflow command files (content/commands) | 29 |
| Agent definitions | 16 |
| Agent content files | 16 |
| Mode definitions | 11 |
| Mode content files | 11 |
| Persona definitions | 6 |
| Persona content files | 2 |
| Skill definitions | 1 |
| Skill content files | 1 |

## Invariants

| Status | Rule |
| --- | --- |
| pass | run.* command definitions must equal workflow files + command workflow files. |
| pass | run.* extended workflow definitions must match content/commands/*.md files. |
| pass | Built-in agent definitions must match content/agents/*.md files. |
| pass | Built-in mode definitions must match content/modes/*.md files. |
