# Workspace repository metadata validation

`pnpm check:repository-metadata` (`scripts/check-repository-metadata.mjs`) validates that the root `package.json` and every workspace manifest declare canonical Git repository metadata:

- `repository.type`: `"git"`
- `repository.url`: `"https://github.com/karagozemin/OverSync.git"`
- `repository.directory`: exact workspace path relative to the repository root (for example `"packages/sdk"` or `"coordinator"`).
