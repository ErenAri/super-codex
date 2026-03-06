# MCP Connectors

This document defines the stable SuperCodex MCP connector contract used by
`mcp connectors`, `mcp connector`, and `mcp capabilities`.

## Connector Contract

Each connector declares:

- `id`: stable connector id
- `name`: user-facing name
- `description`: short connector purpose
- `catalog_entry_id`: MCP catalog entry backing this connector
- `official`: whether this connector is part of the official bundle
- `capabilities`: capability identifiers exposed by this connector
- `health_checks`: supported diagnostics (`definition`, `connectivity`)

Connectors resolve through the catalog entry to inherit transport (`stdio` or `http`).
Capability discovery is transport-aware and consistent for both transports.

## Official Connectors (Core 4)

| Connector | Catalog Entry | Capability Coverage |
| --- | --- | --- |
| `git-operations` | `github` | `git.operations`, `pull-requests` |
| `code-search` | `filesystem` | `code.search`, `file.navigation` |
| `issue-tracker` | `github` | `issue.tracker`, `work-item.triage` |
| `docs-retrieval` | `fetch` | `docs.retrieval`, `web.fetch` |

## Diagnostics

Connector diagnostics are available via:

```bash
supercodex mcp connectors --official --health --json
supercodex mcp connectors --official --health --connectivity --json
```

Health status meanings:

- `healthy`: definition valid and connectivity probe passed
- `degraded`: definition valid but connectivity not checked or failed
- `missing`: expected catalog-backed server is not configured

## Capability Discovery

Discover capabilities and backing connectors:

```bash
supercodex mcp capabilities --official --json
supercodex mcp capabilities --official --transport stdio --json
```

