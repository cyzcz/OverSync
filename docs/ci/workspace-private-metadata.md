# Workspace private metadata check

`pnpm check:workspace-private` (`scripts/check-workspace-private.mjs`) verifies that the root manifest and every non-published workspace explicitly declare `"private": true` in `package.json`.

- **Published workspaces** (`packages/sdk` / `@oversync/sdk`) remain public so the client SDK can be packaged and published intentionally.
- **Internal workspaces** (`contracts`, `stellar`, `relayer`, `frontend`, `resolver`, `coordinator`, `e2e`) must declare `"private": true` to prevent accidental registry publication.
