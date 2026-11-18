# Deterministic workspace formatting check

`pnpm format:check` (`scripts/check-format.mjs`) runs a deterministic, read-only formatting check across tracked root and workspace files (`packages/*`, `coordinator`, `resolver`, `frontend`, `relayer`, `e2e`, `contracts`, and `stellar`) without rewriting files on disk:

- Enforces LF-only line endings (no `CRLF`), UTF-8 without BOM, space indentation (no leading tabs), and valid JSON workspace manifests.
- Runs in `.github/workflows/ci.yml` as `pnpm format:check`; `scripts/lib/workspace-format.test.mjs` verifies that neither the script nor CI invokes mutating flags (`--write`, `-w`, `--fix`).
