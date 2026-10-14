import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { coverage, report } from "./spec-coverage.mjs";

// Fixture IDs start with Z, and test names carry no IDs, so nothing in this
// file covers a real scenario in a project made from the template.
const repo = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "spec-coverage-"));
  execFileSync("git", ["init", "--quiet"], { cwd: dir });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), body);
  }
  return dir;
};

const change = (name, schema, headings, { started = true } = {}) => ({
  [`openspec/changes/${name}/.openspec.yaml`]: `schema: ${schema}\ncreated: 2026-10-10\n`,
  [`openspec/changes/${name}/tasks.md`]: `## 1. Slice\n\n- [${started ? "x" : " "}] 1.1 Tests written and failing (red)\n- [ ] 1.2 Tests pass\n`,
  [`openspec/changes/${name}/specs/area/spec.md`]: [
    "## ADDED Requirements",
    "### Requirement: Something",
    ...headings.map((heading) => `#### Scenario: ${heading}`),
  ].join("\n"),
});

test("every scenario has a test", () => {
  const result = coverage(
    repo({
      ...change("add-audience", "skills-driven", [
        "ZA-01 owner sees the list",
        "ZA-02 owner filters the list",
      ]),
      "frontend/src/audience.test.ts":
        'it("ZA-01 shows the list", () => {});\nit("ZA-02 filters", () => {});\n',
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.total, 2);
  assert.equal(result.covered, 2);
  assert.deepEqual(result.uncovered, []);
  assert.match(report(result), /2 of 2 scenarios covered/);
});

test("a scenario without a test fails the check", () => {
  const result = coverage(
    repo({
      ...change("add-lifecycle", "skills-driven", [
        "ZL-01 a new lead is Prospect",
        "ZL-04 a lost deal is Closed lost",
      ]),
      "frontend/src/lifecycle.test.ts": 'it("ZL-01 prospect", () => {});\n',
    }),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncovered, [
    { change: "add-lifecycle", id: "ZL-04" },
  ]);
  assert.match(report(result), /add-lifecycle: ZL-04/);
});

test("a mention in the docs is not a test", () => {
  const result = coverage(
    repo({
      ...change("add-audience", "skills-driven", ["ZA-05 owner pages"]),
      "docs/notes.md": "ZA-05 is covered somewhere.\n",
    }),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncovered, [{ change: "add-audience", id: "ZA-05" }]);
});

test("a longer ID does not cover a shorter one", () => {
  const result = coverage(
    repo({
      ...change("add-audience", "skills-driven", ["ZA-1 owner sees one"]),
      "e2e/app.spec.ts": 'test("ZA-10 page range", () => {});\n',
    }),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncovered, [{ change: "add-audience", id: "ZA-1" }]);
});

test("other schemas and archived changes are ignored", () => {
  const result = coverage(
    repo({
      ...change("add-knowledge", "spec-driven", ["ZK1-01 owner adds a doc"]),
      ...change("archive/2026-10-01-old", "skills-driven", ["ZO-01 old"]),
      "openspec/specs/area/spec.md": "#### Scenario: ZM-01 shipped\n",
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.total, 0);
  assert.match(report(result), /no scenarios in scope/);
});

test("a change with no ticked box has not started and is ignored", () => {
  const result = coverage(
    repo({
      ...change("add-goals", "skills-driven", ["ZG-01 owner adds a goal"], {
        started: false,
      }),
      ...change("add-audience", "skills-driven", ["ZA-01 owner sees the list"]),
      "frontend/src/audience.test.ts": 'it("ZA-01 shows the list", () => {});\n',
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.total, 1);
  assert.deepEqual(result.uncovered, []);
});

test("a ticked box counts with any case or spacing", () => {
  const result = coverage(
    repo({
      ...change("add-goals", "skills-driven", ["ZG-02 owner removes a goal"], {
        started: false,
      }),
      "openspec/changes/add-goals/tasks.md": "## 1. Slice\n\n- [ X] 1.1 red\n",
    }),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.uncovered, [{ change: "add-goals", id: "ZG-02" }]);
});

test("a scenario without an ID fails the check", () => {
  const result = coverage(
    repo(change("add-audience", "skills-driven", ["owner sees the list"])),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.unidentified, [
    {
      file: "openspec/changes/add-audience/specs/area/spec.md",
      line: 3,
      heading: "#### Scenario: owner sees the list",
    },
  ]);
  assert.match(
    report(result),
    /openspec\/changes\/add-audience\/specs\/area\/spec\.md:3/,
  );
});
