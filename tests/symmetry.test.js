import test from "node:test";
import assert from "node:assert/strict";
import { explore } from "../src/model-checker.js";
import {
  createIndependentOneShotModel,
  createIndependentOneShotSymmetry,
  createPetersonSymmetry,
  permutePetersonState,
} from "../src/models/symmetry-benchmarks.js";
import { createPetersonModel } from "../src/models/peterson.js";
import { permuteProcessArray } from "../src/symmetry.js";

test("permutation helper obeys identity, inverse and composition on process arrays", () => {
  const values = ["a", "b", "c"];
  const permutations = [
    [0, 1, 2],
    [1, 0, 2],
    [2, 1, 0],
    [1, 2, 0],
    [2, 0, 1],
    [0, 2, 1],
  ];
  for (const left of permutations) {
    for (const right of permutations) {
      const composed = left.map((destination) => right[destination]);
      const sequential = permuteProcessArray(
        permuteProcessArray(values, left),
        right,
      );
      assert.deepEqual(sequential, permuteProcessArray(values, composed));
    }
  }
});

test("symmetry reduction preserves Peterson safety and reduces its state graph", () => {
  const model = createPetersonModel();
  const baseline = explore(model);
  const reduced = explore({ ...model, symmetry: createPetersonSymmetry() });
  assert.equal(baseline.status, "safe");
  assert.equal(reduced.status, baseline.status);
  assert.ok(reduced.statesExplored < baseline.statesExplored);
  assert.equal(reduced.symmetryGroupSize, 2);
  assert.equal(reduced.symmetryStatesValidated, reduced.statesExplored);
});

test("symmetry reduction preserves a Peterson counterexample", () => {
  const model = createPetersonModel({ broken: true });
  const baseline = explore(model);
  const reduced = explore({ ...model, symmetry: createPetersonSymmetry() });
  assert.equal(baseline.status, "violation");
  assert.equal(reduced.status, "violation");
  assert.equal(reduced.counterexample.at(-1).state.inCritical.every(Boolean), true);
});

test("fully symmetric independent processes collapse 2^n states to n+1 orbits", () => {
  for (let count = 2; count <= 5; count += 1) {
    const model = createIndependentOneShotModel(count);
    const baseline = explore(model);
    const reduced = explore({
      ...model,
      symmetry: createIndependentOneShotSymmetry(count),
    });
    assert.equal(baseline.status, "safe");
    assert.equal(reduced.status, "safe");
    assert.equal(baseline.statesExplored, 2 ** count);
    assert.equal(reduced.statesExplored, count + 1);
  }
});

test("rejects a single initial state that is not fixed by the group", () => {
  const model = {
    initialState: { done: [true, false] },
    successors: () => [],
    invariant: () => true,
  };
  assert.throws(
    () => explore({ ...model, symmetry: createIndependentOneShotSymmetry(2) }),
    /initial state must be fixed/,
  );
});

test("runtime checker rejects a property that distinguishes symmetric processes", () => {
  const model = {
    ...createIndependentOneShotModel(2),
    invariant: (state) => !state.done[1],
  };
  assert.throws(
    () => explore({ ...model, symmetry: createIndependentOneShotSymmetry(2) }),
    /invariant is not preserved/,
  );
});

test("runtime checker rejects a transition relation that is not equivariant", () => {
  const model = {
    initialState: { done: [false, false] },
    successors: (state) => state.done[0]
      ? []
      : [{ state: { done: [true, state.done[1]] }, label: "complete P0" }],
    invariant: () => true,
  };
  assert.throws(
    () => explore({ ...model, symmetry: createIndependentOneShotSymmetry(2) }),
    /transition relation is not equivariant/,
  );
});

test("runtime checker rejects terminal classifications that break symmetry", () => {
  const model = {
    ...createIndependentOneShotModel(2),
    isTerminal: (state) => state.done[0],
  };
  assert.throws(
    () => explore({ ...model, symmetry: createIndependentOneShotSymmetry(2) }),
    /terminal-state classification is not preserved/,
  );
});

test("Peterson process-state permutation maps the tie-break process index", () => {
  const state = {
    flag: [true, false],
    turn: 0,
    pc: [2, 1],
    inCritical: [false, true],
  };
  assert.deepEqual(
    permutePetersonState(state, [1, 0]),
    { flag: [false, true], turn: 1, pc: [1, 2], inCritical: [true, false] },
  );
});
