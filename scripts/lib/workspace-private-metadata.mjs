/**
 * Validates that every non-published workspace package explicitly declares
 * `"private": true` so internal services and harnesses cannot be published to a
 * package registry by accident (issue #392).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const PUBLISHED_WORKSPACES = Object.freeze(["packages/sdk"]);

export function expandWorkspaceDirs(repoRoot, workspacePatterns) {
  return (workspacePatterns ?? []).flatMap((pattern) => {
    if (!pattern.endsWith("/*")) return [pattern];
    const parent = pattern.slice(0, -2);
    const parentAbs = join(repoRoot, parent);
    if (!existsSync(parentAbs)) return [];
    return readdirSync(parentAbs, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${parent}/${entry.name}`)
      .sort();
  });
}

export function validateWorkspaceManifests(manifests, publishedWorkspaces = PUBLISHED_WORKSPACES) {
  const publishedSet = new Set(publishedWorkspaces);
  const violations = [];

  for (const item of manifests) {
    const { dir, manifest } = item;
    const isRoot = dir === ".";
    const isPublished = !isRoot && publishedSet.has(dir);

    if (isPublished) {
      if (manifest?.private === true) {
        violations.push({
          dir,
          path: `${dir}/package.json`,
          reason: "published workspace must not set private: true",
        });
      }
      continue;
    }

    if (manifest?.private !== true) {
      violations.push({
        dir,
        path: isRoot ? "package.json" : `${dir}/package.json`,
        reason: `non-published workspace must explicitly declare "private": true (got ${JSON.stringify(manifest?.private)})`,
      });
    }
  }

  return {
    ok: violations.length === 0,
    checkedCount: manifests.length,
    violations,
  };
}

export function checkRepoWorkspacePrivateMetadata(repoRoot, publishedWorkspaces = PUBLISHED_WORKSPACES) {
  const rootRaw = readFileSync(join(repoRoot, "package.json"), "utf8");
  const rootManifest = JSON.parse(rootRaw);
  const dirs = expandWorkspaceDirs(repoRoot, rootManifest.workspaces);

  const manifests = [
    { dir: ".", manifest: rootManifest },
    ...dirs
      .filter((dir) => existsSync(join(repoRoot, dir, "package.json")))
      .map((dir) => ({
        dir,
        manifest: JSON.parse(readFileSync(join(repoRoot, dir, "package.json"), "utf8")),
      })),
  ];

  return validateWorkspaceManifests(manifests, publishedWorkspaces);
}
