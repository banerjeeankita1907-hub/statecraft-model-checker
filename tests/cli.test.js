import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src/cli.js");

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

test("CLI exits successfully when the correct Peterson model is exhaustively safe", () => {
  const result = run(["peterson"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "safe");
});

test("CLI exits 1 and emits a counterexample for the broken model", () => {
  const result = run(["broken"]);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "violation");
  assert.ok(report.counterexample.length > 1);
});

test("CLI reports bounded exploration as inconclusive", () => {
  const result = run(["peterson", "--max-states", "1"]);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).status, "inconclusive");
});

test("CLI rejects malformed options", () => {
  assert.equal(run(["peterson", "--max-states", "0"]).status, 2);
  assert.equal(run(["peterson", "--unknown"]).status, 2);
});
