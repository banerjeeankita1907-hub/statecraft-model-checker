#!/usr/bin/env node

import { explore } from "./model-checker.js";
import { runSymmetryBenchmarks } from "./benchmark.js";
import { createPetersonModel } from "./models/peterson.js";

function usage() {
  process.stderr.write(
    "Usage: node src/cli.js <peterson|broken|benchmark> [--max-states N | --max-processes N]\n",
  );
}

function parseOption(args, option, fallback, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  if (args.length === 0) return fallback;
  if (args.length !== 2 || args[0] !== option) {
    throw new RangeError(`expected ${option} followed by one integer`);
  }
  const value = Number(args[1]);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${option} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

const [command, ...args] = process.argv.slice(2);
if (command === "benchmark") {
  try {
    const report = runSymmetryBenchmarks({
      maxProcesses: parseOption(args, "--max-processes", 7, 2, 7),
    });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    process.exitCode = Object.values(report.correctnessChecks).every(Boolean) ? 0 : 1;
  } catch (error) {
    process.stderr.write(`statecraft: ${error.message}\n`);
    process.exitCode = 2;
  }
} else if (!["peterson", "broken"].includes(command)) {
  usage();
  process.exitCode = 2;
} else {
  try {
    const model = createPetersonModel({ broken: command === "broken" });
    const report = explore({
      ...model,
      maxStates: parseOption(args, "--max-states", 100_000, 1),
    });
    process.stdout.write(JSON.stringify({ model: command, ...report }, null, 2) + "\n");
    process.exitCode = report.status === "safe" ? 0 : report.status === "violation" ? 1 : 2;
  } catch (error) {
    process.stderr.write(`statecraft: ${error.message}\n`);
    process.exitCode = 2;
  }
}
