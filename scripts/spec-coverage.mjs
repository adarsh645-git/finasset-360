#!/usr/bin/env node
// Fails when a scenario in an active skills-driven OpenSpec change has no
// test carrying its ID. Rule: docs/agents/issue-tracker.md (Scenario IDs and
// their tests).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA = "skills-driven";
const NOT_CODE = ["openspec/", "docs/"];
const SCENARIO_HEADING = /^####\s+Scenario:/;
const ID = String.raw`[A-Z][A-Z0-9]*-\d+`;
const LEADING_ID = new RegExp(
  String.raw`^####\s+Scenario:\s*(${ID})(?![A-Za-z0-9-])`,
);
const ID_TOKEN = new RegExp(
  String.raw`(?<![A-Za-z0-9-])${ID}(?![A-Za-z0-9-])`,
  "g",
);

const codeFiles = (root) =>
  execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
    .split("\0")
    .filter((file) => file && !NOT_CODE.some((dir) => file.startsWith(dir)));

const readText = (path) => {
  try {
    const bytes = readFileSync(path);
    return bytes.includes(0) ? "" : bytes.toString("utf8");
  } catch {
    return ""; // deleted from the work tree, or a directory such as a submodule
  }
};

const idsInCode = (root) => {
  const ids = new Set();
  for (const file of codeFiles(root)) {
    for (const [id] of readText(join(root, file)).matchAll(ID_TOKEN))
      ids.add(id);
  }
  return ids;
};

const activeChanges = (root) => {
  const changesDir = join(root, "openspec/changes");
  if (!existsSync(changesDir)) return [];
  return readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => entry.name)
    .filter((name) => {
      const meta = readText(join(changesDir, name, ".openspec.yaml"));
      return meta.match(/^schema:\s*(\S+)/m)?.[1] === SCHEMA;
    })
    .sort();
};

const specFiles = (root, change) => {
  const specsDir = join("openspec/changes", change, "specs");
  if (!existsSync(join(root, specsDir))) return [];
  return readdirSync(join(root, specsDir), { recursive: true })
    .filter((path) => path.endsWith(".md"))
    .sort()
    .map((path) => join(specsDir, path));
};

const scenarios = (root, change) =>
  specFiles(root, change).flatMap((file) =>
    readText(join(root, file))
      .split("\n")
      .map((heading, index) => ({ file, line: index + 1, heading }))
      .filter(({ heading }) => SCENARIO_HEADING.test(heading))
      .map((scenario) => ({
        ...scenario,
        id: scenario.heading.match(LEADING_ID)?.[1],
      })),
  );

/** Checks every scenario ID in active skills-driven changes against the code. */
export const coverage = (root) => {
  const found = idsInCode(root);
  const required = [];
  const unidentified = [];
  for (const change of activeChanges(root)) {
    const ids = new Set();
    for (const { id, file, line, heading } of scenarios(root, change)) {
      if (id) ids.add(id);
      else unidentified.push({ file, line, heading });
    }
    required.push(...[...ids].map((id) => ({ change, id })));
  }
  const uncovered = required.filter(({ id }) => !found.has(id));
  return {
    ok: uncovered.length === 0 && unidentified.length === 0,
    total: required.length,
    covered: required.length - uncovered.length,
    uncovered,
    unidentified,
  };
};

/** Renders a coverage result as the CLI's human-readable output. */
export const report = ({ total, covered, uncovered, unidentified }) => {
  const lines = [
    total === 0 && unidentified.length === 0
      ? `spec:coverage: no scenarios in scope (no active ${SCHEMA} change has scenarios).`
      : `spec:coverage: ${covered} of ${total} scenarios covered by a test naming their ID.`,
  ];
  if (uncovered.length > 0) {
    lines.push(
      "",
      "Uncovered scenarios (no file outside openspec/ and docs/ names the ID):",
    );
    for (const change of new Set(uncovered.map(({ change }) => change))) {
      const ids = uncovered.filter((item) => item.change === change);
      lines.push(`  ${change}: ${ids.map(({ id }) => id).join(", ")}`);
    }
  }
  if (unidentified.length > 0) {
    lines.push("", "Scenario headings that do not start with an ID:");
    for (const { file, line, heading } of unidentified) {
      lines.push(`  ${file}:${line}  ${heading}`);
    }
  }
  return lines.join("\n");
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = coverage(fileURLToPath(new URL("..", import.meta.url)));
  console.log(report(result));
  process.exitCode = result.ok ? 0 : 1;
}
