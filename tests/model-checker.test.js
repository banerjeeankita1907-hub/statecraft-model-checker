import test from "node:test";
import assert from "node:assert/strict";
import { explore, stableStateKey } from "../src/model-checker.js";
import { createPetersonModel } from "../src/models/peterson.js";

test("canonical state keys ignore object property insertion order", () => {
  assert.equal(stableStateKey({ b: 2, a: 1 }), stableStateKey({ a: 1, b: 2 }));
});

test("canonicalization rejects non-finite and cyclic states", () => {
  assert.throws(() => stableStateKey({ x: Number.NaN }), /non-finite/);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => stableStateKey(cyclic), /circular/);
});

test("correct Peterson model preserves mutual exclusion over reachable states", () => {
  const report = explore(createPetersonModel());
  assert.equal(report.status, "safe");
  assert.ok(report.statesExplored > 1);
  assert.equal(report.deadlockCount, 0);
  assert.equal(report.counterexample, null);
});

test("broken critical-section guard returns a shortest counterexample", () => {
  const report = explore(createPetersonModel({ broken: true }));
  assert.equal(report.status, "violation");
  assert.match(report.violation, /Mutual exclusion violated/);
  assert.ok(report.counterexample.length >= 2);
  assert.equal(report.counterexample[0].depth, 0);
  assert.equal(report.counterexample.at(-1).state.inCritical.every(Boolean), true);
  assert.equal(report.counterexample.at(-1).depth, report.counterexample.length - 1);
});

test("state limit produces inconclusive rather than an unsafe proof claim", () => {
  const report = explore({ ...createPetersonModel(), maxStates: 1 });
  assert.equal(report.status, "inconclusive");
  assert.equal(report.statesExplored, 1);
});

test("depth limit is reported as inconclusive when unexplored transitions remain", () => {
  const model = {
    initialState: { value: 0 },
    successors: (state) => state.value < 3 ? [{ state: { value: state.value + 1 }, label: "increment" }] : [],
    invariant: () => true,
  };
  const report = explore({ ...model, maxDepth: 1 });
  assert.equal(report.status, "inconclusive");
  assert.equal(report.maxDepthReached, 1);
});

test("deadlocks are counted separately from explicit terminal states", () => {
  const deadlock = explore({ initialState: { x: 0 }, successors: () => [], invariant: () => true });
  const terminal = explore({
    initialState: { x: 0 },
    successors: () => [],
    invariant: () => true,
    isTerminal: () => true,
  });
  assert.equal(deadlock.deadlockCount, 1);
  assert.equal(terminal.deadlockCount, 0);
});

test("rejects malformed transition and invalid limits", () => {
  assert.throws(() => explore({ initialState: {}, invariant: () => true }), /successors/);
  assert.throws(() => explore({ initialState: {}, successors: () => [null], invariant: () => true }), /transition/);
  assert.throws(() => explore({ initialState: {}, successors: () => [{ state: {} }], invariant: () => true }), /label/);
  assert.throws(() => explore({ initialState: {}, successors: () => [], invariant: () => true, maxStates: 0 }), /maxStates/);
});

test("successors cannot mutate stored states", () => {
  const model = {
    initialState: { count: 0 },
    successors(state) {
      assert.equal(Object.isFrozen(state), true);
      return state.count === 0 ? [{ state: { count: 1 }, label: "advance" }] : [];
    },
    invariant: () => true,
  };
  assert.equal(explore(model).status, "safe");
});
