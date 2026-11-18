import { explore } from "./model-checker.js";
import { createPetersonModel } from "./models/peterson.js";
import {
  createIndependentOneShotModel,
  createIndependentOneShotSymmetry,
  createPetersonSymmetry,
} from "./models/symmetry-benchmarks.js";

function summarize(report) {
  return {
    status: report.status,
    states: report.statesExplored,
    transitions: report.transitionsExplored,
    deadlocks: report.deadlockCount,
    symmetryGroupSize: report.symmetryGroupSize,
    symmetryStatesValidated: report.symmetryStatesValidated,
    counterexampleDepth: report.counterexample?.at(-1)?.depth ?? null,
  };
}

function compare(model, symmetry) {
  const baseline = explore(model);
  const reduced = explore({ ...model, symmetry });
  if (baseline.status !== reduced.status) {
    throw new Error("symmetry quotient changed the safety result");
  }
  return { baseline: summarize(baseline), reduced: summarize(reduced) };
}

/** Deterministic state-count experiments; deliberately avoids noisy wall-clock claims. */
export function runSymmetryBenchmarks({ maxProcesses = 7 } = {}) {
  if (!Number.isSafeInteger(maxProcesses) || maxProcesses < 2 || maxProcesses > 7) {
    throw new RangeError("maxProcesses must be an integer from 2 through 7");
  }

  const petersonCorrect = compare(createPetersonModel(), createPetersonSymmetry());
  const petersonBroken = compare(
    createPetersonModel({ broken: true }),
    createPetersonSymmetry(),
  );
  if (petersonCorrect.baseline.status !== "safe"
    || petersonBroken.baseline.status !== "violation") {
    throw new Error("Peterson benchmark did not produce its expected safety outcomes");
  }

  const independentProcesses = [];
  for (let processCount = 2; processCount <= maxProcesses; processCount += 1) {
    const result = compare(
      createIndependentOneShotModel(processCount),
      createIndependentOneShotSymmetry(processCount),
    );
    const expectedRawStates = 2 ** processCount;
    const expectedQuotientStates = processCount + 1;
    if (result.baseline.states !== expectedRawStates
      || result.reduced.states !== expectedQuotientStates) {
      throw new Error(`unexpected state counts for ${processCount} independent processes`);
    }
    independentProcesses.push({
      processCount,
      groupSize: result.reduced.symmetryGroupSize,
      baseline: result.baseline,
      reduced: result.reduced,
      stateReductionPercent: Number(
        ((1 - result.reduced.states / result.baseline.states) * 100).toFixed(2)
      ),
      transitionReductionPercent: Number(
        ((1 - result.reduced.transitions / result.baseline.transitions) * 100).toFixed(2)
      ),
    });
  }

  return {
    method: "quotient by the full symmetric group on process identities",
    correctnessChecks: {
      correctPetersonPreserved: petersonCorrect.baseline.status === petersonCorrect.reduced.status,
      brokenPetersonViolationPreserved: petersonBroken.baseline.status === petersonBroken.reduced.status,
      independentModelStateCountsMatchOrbits: true,
    },
    peterson: {
      correct: petersonCorrect,
      faultInjected: petersonBroken,
    },
    independentProcesses,
  };
}
