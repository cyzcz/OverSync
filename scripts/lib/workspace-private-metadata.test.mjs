import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  PUBLISHED_WORKSPACES,
  checkRepoWorkspacePrivateMetadata,
  validateWorkspaceManifests,
} from "./workspace-private-metadata.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("workspace private metadata", () => {
  it("requires private: true on every non-published workspace in this repository", () => {
    const result = checkRepoWorkspacePrivateMetadata(repoRoot);
    assert.equal(result.ok, true, JSON.stringify(result.violations));
    assert.ok(result.checkedCount >= 9);
  });

  it("rejects non-published workspaces missing private: true or setting private: false", () => {
    const check = validateWorkspaceManifests(
      [
        { dir: ".", manifest: { name: "oversync", private: true } },
        { dir: "frontend", manifest: { name: "@oversync/frontend" } },
        { dir: "relayer", manifest: { name: "@oversync/relayer", private: false } },
        { dir: "packages/sdk", manifest: { name: "@oversync/sdk" } },
      ],
      PUBLISHED_WORKSPACES,
    );
    assert.equal(check.ok, false);
    assert.deepEqual(
      check.violations.map((v) => v.path),
      ["frontend/package.json", "relayer/package.json"],
    );
  });

  it("wires check:workspace-private into package.json and executes cleanly", () => {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    assert.equal(pkg.scripts["check:workspace-private"], "node scripts/check-workspace-private.mjs");
    const run = spawnSync(process.execPath, [resolve(repoRoot, "scripts/check-workspace-private.mjs")], {
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
  });
});
