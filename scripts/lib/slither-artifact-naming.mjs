/**
 * Validates that Slither static-analysis artifact uploads include a
 * commit-specific identifier (such as a short commit SHA) in the artifact name
 * to avoid ambiguity across reruns and downloaded reports (issue #388).
 */

const STEP_START = /^(\s*)-\s/;
const UPLOAD_ARTIFACT_USES = /uses:\s*actions\/upload-artifact@/;
const NAME_FIELD = /^\s*name:\s*(.+?)\s*$/m;
const SLITHER_ARTIFACT_RE = /slither/i;
const COMMIT_SPECIFIC_EXPR_RE =
  /\$\{\{\s*(?:steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)|github\.sha)\s*\}\}/;

function stepBlocks(yamlText) {
  const lines = String(yamlText ?? "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const start = lines[i].match(STEP_START);
    if (!start) {
      i += 1;
      continue;
    }
    const indent = start[1].length;
    const startLine = i;
    const blockLines = [lines[i]];
    let j = i + 1;
    while (j < lines.length) {
      const line = lines[j];
      if (line.trim() === "") {
        blockLines.push(line);
        j += 1;
        continue;
      }
      const indentMatch = line.match(/^(\s*)\S/);
      const lineIndent = indentMatch ? indentMatch[1].length : 0;
      if (lineIndent <= indent) break;
      blockLines.push(line);
      j += 1;
    }
    blocks.push({ text: blockLines.join("\n"), startLine });
    i = j;
  }
  return blocks;
}

export function findSlitherArtifactNamingViolations(yamlText, fileLabel = ".github/workflows/contracts.yml") {
  const blocks = stepBlocks(yamlText);
  const violations = [];

  for (const block of blocks) {
    if (!UPLOAD_ARTIFACT_USES.test(block.text)) continue;

    const withSection = block.text.split(/\bwith:\s*\n/)[1] ?? block.text;
    const nameMatch = withSection.match(NAME_FIELD);
    const artifactName = nameMatch ? nameMatch[1].replace(/^['"]|['"]$/g, "") : "(unnamed)";
    if (!SLITHER_ARTIFACT_RE.test(artifactName)) continue;

    const exprMatch = artifactName.match(COMMIT_SPECIFIC_EXPR_RE);
    if (!exprMatch) {
      violations.push({
        file: fileLabel,
        line: block.startLine + 1,
        artifactName,
        reason: "Slither artifact name must include a commit-specific SHA expression",
      });
      continue;
    }

    const [, stepId, outputName] = exprMatch;
    if (stepId && outputName) {
      const producer = blocks.find(
        (b) =>
          b.startLine < block.startLine &&
          new RegExp(`^\\s*id:\\s*${stepId}\\s*$`, "m").test(b.text) &&
          b.text.includes(`${outputName}=`) &&
          /GITHUB_SHA|git\s+rev-parse\s+--short/.test(b.text),
      );
      if (!producer) {
        violations.push({
          file: fileLabel,
          line: block.startLine + 1,
          artifactName,
          reason: `Step "${stepId}" must compute "${outputName}" from GITHUB_SHA before upload`,
        });
      }
    }
  }

  return violations;
}
