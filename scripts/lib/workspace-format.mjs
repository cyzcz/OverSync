/**
 * Deterministic, read-only formatting check across workspaces (issue #390).
 *
 * Scans tracked source, manifest, and workflow files across the root and every
 * workspace declared in `package.json` without rewriting any files on disk.
 * Enforces UTF-8 without BOM, LF-only line endings, space indentation (no
 * leading tabs in TS/JS/JSON/YAML), and parseable JSON manifests.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const CHECKED_EXTENSIONS = [".ts", ".tsx", ".mjs", ".cjs", ".json", ".yml", ".yaml"];
const EXCLUDED_PREFIXES = [
  "contracts/lib/",
  "scripts/fixtures/",
  "node_modules/",
];

function shouldCheckPath(relPath) {
  if (EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix))) {
    return false;
  }
  return CHECKED_EXTENSIONS.some((ext) => relPath.endsWith(ext));
}

export function checkBufferFormatting(buffer, relPath) {
  const violations = [];

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    violations.push({ file: relPath, line: 1, kind: "utf8-bom", detail: "file must not start with a UTF-8 BOM" });
  }

  const text = buffer.toString("utf8");
  const crlfIndex = text.indexOf("\r\n");
  if (crlfIndex !== -1) {
    const line = text.slice(0, crlfIndex).split("\n").length;
    violations.push({ file: relPath, line, kind: "crlf", detail: "use LF line endings instead of CRLF" });
  }

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("\t")) {
      violations.push({
        file: relPath,
        line: i + 1,
        kind: "tab-indent",
        detail: "use spaces instead of leading tab indentation",
      });
      break;
    }
  }

  if (relPath.endsWith("package.json")) {
    try {
      JSON.parse(text);
    } catch (err) {
      violations.push({
        file: relPath,
        line: 1,
        kind: "invalid-json",
        detail: `invalid JSON: ${err.message}`,
      });
    }
  }

  return violations;
}

export function checkWorkspaceFormatting(repoRoot) {
  const tracked = execFileSync("git", ["ls-files"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(shouldCheckPath)
    .sort();

  const violations = [];
  let checkedFiles = 0;

  for (const relPath of tracked) {
    const absPath = resolve(repoRoot, relPath);
    if (!existsSync(absPath)) continue;
    const buf = readFileSync(absPath);
    checkedFiles += 1;
    violations.push(...checkBufferFormatting(buf, relPath));
  }

  return {
    ok: violations.length === 0,
    checkedFiles,
    violations,
  };
}

export function validateFormatCheckConfiguration({ rootManifest, ciWorkflowText }) {
  const violations = [];
  const script = rootManifest?.scripts?.["format:check"];

  if (!script) {
    violations.push('root package.json is missing a "format:check" script');
  } else if (/--write\b|\s-w\b|--fix\b/.test(script)) {
    violations.push(`format:check script must not rewrite files (${script})`);
  }

  if (ciWorkflowText) {
    if (!/pnpm\s+(?:run\s+)?format:check\b/.test(ciWorkflowText)) {
      violations.push("ci.yml must run pnpm format:check");
    }
    if (/prettier[^\n]*--write/.test(ciWorkflowText)) {
      violations.push("ci.yml must not run prettier --write");
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}
