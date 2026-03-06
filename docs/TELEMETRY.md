# Telemetry and Privacy

SuperCodex telemetry is anonymous and opt-in.

Default install state:

- `[supercodex.metrics].enabled = false`
- no events are written until you explicitly enable telemetry

Enable telemetry:

```bash
supercodex growth telemetry enable
supercodex growth telemetry status --json
```

Disable telemetry:

```bash
supercodex growth telemetry disable
```

Export local events for inspection:

```bash
supercodex growth export --output growth/telemetry-events.json --json
```

## Event Schema

Each line in metrics storage is a JSON object:

| Field | Type | Notes |
| --- | --- | --- |
| `schema_version` | number | Event schema version (`1`) |
| `event` | string | Event name (`install_success`, `start_invoked`, etc.) |
| `at` | string | UTC ISO timestamp |
| `actor_id` | string | Stable anonymous id derived from local Codex home |
| `...` | object | Optional event payload fields |

## Privacy Boundaries

- Telemetry is written to local disk only unless you export/share it.
- No prompt content or source code bodies are captured.
- Actor identity uses a stable hash-like id, not username/email.
