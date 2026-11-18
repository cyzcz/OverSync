/**
 * Validates canonical `repository` metadata (`type`, `url`, and `directory`)
 * across the root `package.json` and every workspace manifest (issue #394).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CANONICAL_REPOSITORY_URL = "https://github.com/karagozemin/OverSync.git";
export const PLACEHOLDER_OWNER = "your-username";

export function workspaceDirs(repoRoot, rootManifest) {
  return (rootManifest?.workspaces ?? []).flatMap((pattern) => {
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

export function validateRepositoryManifests(entries, canonicalUrl = CANONICAL_REPOSITORY_URL) {
  const violations = [];

  for (const entry of entries) {
    const { dir, raw = "", json } = entry;
    const label = dir === "." ? "package.json" : `${dir}/package.json`;

    if (raw.includes(PLACEHOLDER_OWNER)) {
      violations.push({ path: label, reason: `contains placeholder owner "${PLACEHOLDER_OWNER}"` });
    }

    const repo = json?.repository;
    if (!repo || typeof repo !== "object" || Array.isArray(repo)) {
      violations.push({
        path: label,
        reason: 'missing object "repository" metadata ({ type, url, directory })',
      });
      continue;
    }

    if (repo.type !== "git") {
      violations.push({
        path: label,
        reason: `repository.type must be "git" (got ${JSON.stringify(repo.type)})`,
      });
    }

    if (repo.url !== canonicalUrl) {
      violations.push({
        path: label,
        reason: `repository.url must be "${canonicalUrl}" (got ${JSON.stringify(repo.url)})`,
      });
    }

    if (dir === ".") {
      if (repo.directory !== undefined && repo.directory !== "" && repo.directory !== ".") {
        violations.push({
          path: label,
          reason: `root repository.directory should be omitted or "." (got ${JSON.stringify(repo.directory)})`,
        });
      }
    } else if (repo.directory !== dir) {
      violations.push({
        path: label,
        reason: `repository.directory must match workspace path "${dir}" (got ${JSON.stringify(repo.directory)})`,
      });
    }
  }

  return {
    ok: violations.length === 0,
    checkedCount: entries.length,
    violations,
  };
}

export function checkRepoRepositoryMetadata(repoRoot) {
  const rootRaw = readFileSync(join(repoRoot, "package.json"), "utf8");
  const rootJson = JSON.parse(rootRaw);
  const dirs = workspaceDirs(repoRoot, rootJson);

  const entries = [
    { dir: ".", raw: rootRaw, json: rootJson },
    ...dirs
      .filter((dir) => existsSync(join(repoRoot, dir, "package.json")))
      .map((dir) => {
        const raw = readFileSync(join(repoRoot, dir, "package.json"), "utf8");
        return { dir, raw, json: JSON.parse(raw) };
      }),
  ];

  return validateRepositoryManifests(entries);
}
