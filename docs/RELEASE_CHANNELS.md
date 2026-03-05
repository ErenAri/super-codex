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
npm dist-tag add supercodex@1.6.0 latest
npm dist-tag add supercodex@1.6.0 next
```

Inspect tags:

```bash
npm dist-tag ls supercodex
```

## Recommended Cadence

- `latest`: one stable release every 2-4 weeks
- `next`: 1-2 pre-releases per week for risky/new command changes

## Release Checklist

1. `npm ci`
2. `npm run build`
3. `npm test`
4. `npm run verify:consistency`
5. Confirm README install snippets still use `supercodex`
6. Publish with correct dist-tag
