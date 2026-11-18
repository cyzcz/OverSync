#!/usr/bin/env node
/**
 * CLI check ensuring every non-published workspace declares `"private": true`
 * (issue #392).
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkRepoWorkspacePrivateMetadata } from "./lib/workspace-private-metadata.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const result = checkRepoWorkspacePrivateMetadata(repoRoot);

if (!result.ok) {
  console.error("Workspace private metadata check failed:");
  for (const violation of result.violations) {
    console.error(`  - ${violation.path}: ${violation.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${result.checkedCount} manifest(s): all non-published workspaces declare "private": true.`,
  );
}
