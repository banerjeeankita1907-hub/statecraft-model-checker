#!/usr/bin/env node

import { explore } from "./model-checker.js";
import { createPetersonModel } from "./models/peterson.js";

function usage() {
  process.stderr.write("Usage: node src/cli.js <peterson|broken> [--max-states N]\n");
}

function parseLimit(args) {
  if (args.length === 0) return 100_000;
  if (args.length !== 2 || args[0] !== "--max-states") {
    throw new RangeError("expected --max-states followed by one positive integer");
  }
  const value = Number(args[1]);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError("--max-states must be a positive integer");
  }
  return value;
}

const [modelName, ...args] = process.argv.slice(2);
if (!["peterson", "broken"].includes(modelName)) {
  usage();
  process.exitCode = 2;
} else {
  try {
    const model = createPetersonModel({ broken: modelName === "broken" });
    const report = explore({ ...model, maxStates: parseLimit(args) });
    process.stdout.write(JSON.stringify({ model: modelName, ...report }, null, 2) + "\n");
    process.exitCode = report.status === "safe" ? 0 : report.status === "violation" ? 1 : 2;
  } catch (error) {
    process.stderr.write(`statecraft: ${error.message}\n`);
    process.exitCode = 2;
  }
}
