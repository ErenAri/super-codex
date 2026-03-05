# Growth Playbook

This playbook is focused on increasing npm installs for `supercodex`.

## Core Levers

1. Search discoverability:
   - Keep package `description` and `keywords` up to date with user intent terms.
   - Keep README top section conversion-focused (quickstart + value demo).
2. Conversion quality:
   - Keep install command consistent: `npm install -g supercodex`.
   - Keep "When to Use / Not Use" current.
3. Trust and reliability:
   - Enforce `npm run verify:consistency` in CI.
   - Publish with provenance.
4. Distribution:
   - Ship one short tutorial per release.
   - Announce each stable release with a concrete before/after example.

## Weekly Operating Rhythm

Monday:
- Review `docs/GROWTH_DASHBOARD.md` metrics.
- Pick one funnel bottleneck (search, conversion, retention).

Mid-week:
- Ship one improvement focused on that bottleneck.
- Publish `next` tag for testing if risk is medium/high.

Friday:
- Promote to `latest` if stable.
- Post release notes with one copy-paste usage snippet.

## Monthly Targets

- Increase weekly downloads by 15-25%.
- Improve README-to-install conversion (measured by click/install proxy).
- Reduce support friction by refreshing troubleshooting docs from real issues.
