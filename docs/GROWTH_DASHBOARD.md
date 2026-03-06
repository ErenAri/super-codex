# Growth Dashboard

This dashboard is generated/updated with:

```bash
supercodex growth dashboard --output docs/GROWTH_DASHBOARD.md --json
```

Recommended cadence: once per week.
CI workflow: `.github/workflows/growth-dashboard.yml` (scheduled weekly + manual dispatch).

## Weekly Snapshot

| Week | Installs | Starts | First command | Week-1 retained | Week-1 retention rate | Top funnel issue |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| YYYY-MM-DD |  |  |  |  |  |  |

## Funnel Conversion

| Step | Users | Conversion from previous | Conversion from install |
| --- | ---: | ---: | ---: |
| install |  | - | 100% |
| start |  |  |  |
| first_command |  |  |  |
| week1_retention |  |  |  |

## Experiment Tracker

Source: `growth/experiments.json`

| Experiment | Status | Primary metric | Start | End | Result summary |
| --- | --- | --- | --- | --- | --- |
| exp-quickstart-cta | won | install_to_start_rate | 2026-02-03 | 2026-02-17 | Install-to-start conversion improved from 41% to 57%. |
| exp-start-wizard-copy | completed | start_to_first_command_rate | 2026-02-18 | 2026-03-01 | Neutral impact; keep previous copy. |
| exp-project-preset-prompt | running | week1_retention_rate | 2026-03-02 |  |  |

## Funnel Health

- Start conversion: 
- First-command conversion: 
- Week-1 retention (eligible starts): 

## Next Actions

1. Address the largest conversion drop from the funnel report.
2. Keep at least 3 conversion experiments active/completed in each v2 cycle.
3. Merge winning experiment changes into onboarding docs before stable release.
