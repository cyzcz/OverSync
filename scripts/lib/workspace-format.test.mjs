import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkBufferFormatting,
  checkWorkspaceFormatting,
  validateFormatCheckConfiguration,
} from "./workspace-format.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("deterministic workspace format:check", () => {
  it("wires a non-mutating format:check script into package.json and ci.yml", () => {
    const rootManifest = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    const ciWorkflowText = readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf8");
    const cfg = validateFormatCheckConfiguration({ rootManifest, ciWorkflowText });
    assert.equal(cfg.ok, true, cfg.violations.join("; "));
  });

  it("passes across all tracked workspace files without rewriting the worktree", () => {
    const result = checkWorkspaceFormatting(repoRoot);
    assert.equal(result.ok, true, JSON.stringify(result.violations));
    assert.ok(result.checkedFiles > 100);

    const cli = spawnSync(process.execPath, [resolve(repoRoot, "scripts/check-format.mjs")], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(cli.status, 0, cli.stderr);
  });

  it("flags CRLF, UTF-8 BOM, leading tabs, and mutating script flags without touching disk", () => {
    const crlf = Buffer.from('export const x = 1;\r\n', "utf8");
    assert.equal(checkBufferFormatting(crlf, "packages/sdk/src/x.ts")[0]?.kind, "crlf");

    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"a":1}\n', "utf8")]);
    assert.equal(checkBufferFormatting(bom, "coordinator/package.json")[0]?.kind, "utf8-bom");

    const tabs = Buffer.from("export function f() {\n\treturn 1;\n}\n", "utf8");
    assert.equal(checkBufferFormatting(tabs, "resolver/src/f.ts")[0]?.kind, "tab-indent");

    const badCfg = validateFormatCheckConfiguration({
      rootManifest: { scripts: { "format:check": "prettier --write ." } },
      ciWorkflowText: "run: pnpm format:check",
    });
    assert.equal(badCfg.ok, false);
  });
});
