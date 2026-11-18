# Slither artifact naming

`.github/workflows/contracts.yml` uploads Slither JSON output under a commit-specific artifact name:

- `slither-report-<short_sha>` (derived from `${GITHUB_SHA::7}`), retained for `14` days.

Including the 7-character commit SHA keeps downloaded reports unambiguous across workflow reruns and stacked pull requests. `scripts/lib/slither-artifact-naming.test.mjs` and `scripts/check-artifact-retention.mjs` enforce both the commit-specific name and bounded retention in CI.
