import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { findSlitherArtifactNamingViolations } from "./slither-artifact-naming.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("Slither commit-specific artifact naming", () => {
  it("names the contracts.yml Slither upload with the short commit SHA", () => {
    const workflow = readFileSync(resolve(repoRoot, ".github/workflows/contracts.yml"), "utf8");
    const violations = findSlitherArtifactNamingViolations(workflow, ".github/workflows/contracts.yml");
    assert.deepEqual(violations, []);
  });

  it("rejects static slither-report names without a commit SHA", () => {
    const bad = [
      "jobs:",
      "  slither:",
      "    steps:",
      "      - name: Upload Slither report",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          name: slither-report",
      "          path: contracts/slither-results.json",
      "          retention-days: 14",
    ].join("\n");
    const violations = findSlitherArtifactNamingViolations(bad, "contracts.yml");
    assert.equal(violations.length, 1);
    assert.match(violations[0].reason, /commit-specific SHA/);
  });

  it("rejects step output references when no prior step computes the short SHA", () => {
    const missingProducer = [
      "jobs:",
      "  slither:",
      "    steps:",
      "      - name: Upload Slither report",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          name: slither-report-${{ steps.slither_meta.outputs.short_sha }}",
      "          path: contracts/slither-results.json",
      "          retention-days: 14",
    ].join("\n");
    const violations = findSlitherArtifactNamingViolations(missingProducer, "contracts.yml");
    assert.equal(violations.length, 1);
    assert.match(violations[0].reason, /slither_meta/);
  });
});
