import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  CANONICAL_REPOSITORY_URL,
  checkRepoRepositoryMetadata,
  validateRepositoryManifests,
} from "./repository-metadata.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("repository metadata", () => {
  it("points the root and every workspace package.json at the canonical OverSync repository and directory", () => {
    const result = checkRepoRepositoryMetadata(repoRoot);
    assert.equal(result.ok, true, JSON.stringify(result.violations));
    assert.ok(result.checkedCount >= 9);
  });

  it("rejects missing repository blocks, non-canonical URLs, and mismatched directory fields", () => {
    const check = validateRepositoryManifests([
      {
        dir: ".",
        raw: "",
        json: { repository: { type: "git", url: CANONICAL_REPOSITORY_URL } },
      },
      {
        dir: "packages/sdk",
        raw: "",
        json: { repository: { type: "git", url: CANONICAL_REPOSITORY_URL, directory: "sdk" } },
      },
      {
        dir: "coordinator",
        raw: "",
        json: {},
      },
      {
        dir: "resolver",
        raw: "",
        json: { repository: { type: "git", url: "https://github.com/other/OverSync.git", directory: "resolver" } },
      },
    ]);
    assert.equal(check.ok, false);
    assert.deepEqual(
      check.violations.map((v) => v.path),
      ["packages/sdk/package.json", "coordinator/package.json", "resolver/package.json"],
    );
  });

  it("wires check:repository-metadata into package.json and executes cleanly", () => {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    assert.equal(pkg.scripts["check:repository-metadata"], "node scripts/check-repository-metadata.mjs");
    const run = spawnSync(process.execPath, [resolve(repoRoot, "scripts/check-repository-metadata.mjs")], {
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
  });
});
