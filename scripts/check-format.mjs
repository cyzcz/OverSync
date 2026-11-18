#!/usr/bin/env node
/**
 * Non-mutating formatting check across all OverSync workspaces (issue #390).
 *
 * Usage:
 *   pnpm format:check
 *   node scripts/check-format.mjs
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkWorkspaceFormatting } from "./lib/workspace-format.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const result = checkWorkspaceFormatting(repoRoot);

if (!result.ok) {
  console.error(`Formatting check failed with ${result.violations.length} violation(s):`);
  for (const v of result.violations) {
    console.error(`  - ${v.file}:${v.line} [${v.kind}]: ${v.detail}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Formatting check passed across ${result.checkedFiles} tracked workspace file(s) with zero file modifications.`,
  );
}
