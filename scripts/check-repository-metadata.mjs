#!/usr/bin/env node
/**
 * CLI check ensuring every workspace `package.json` points `repository.url`
 * and `repository.directory` at the canonical OverSync repository (issue #394).
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkRepoRepositoryMetadata } from "./lib/repository-metadata.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const result = checkRepoRepositoryMetadata(repoRoot);

if (!result.ok) {
  console.error("Repository metadata validation failed:");
  for (const violation of result.violations) {
    console.error(`  - ${violation.path}: ${violation.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${result.checkedCount} manifest(s): all repository URLs and workspace directory fields match canonical OverSync metadata.`,
  );
}
