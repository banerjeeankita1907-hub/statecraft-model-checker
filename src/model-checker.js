/**
 * Explicit-state breadth-first model checker with optional symmetry quotienting.
 *
 * States must be JSON-serializable. The checker treats them as immutable and
 * canonicalizes object keys so structurally equal states have the same key.
 */

function canonicalize(value, ancestors = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("states cannot contain non-finite numbers");
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError("states must contain only JSON-compatible values");
  }
  if (ancestors.has(value)) throw new TypeError("states cannot contain circular references");
  ancestors.add(value);
  let output;
  if (Array.isArray(value)) {
    output = value.map((item) => canonicalize(item, ancestors));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("states must use plain objects and arrays");
    }
    output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalize(value[key], ancestors);
    }
  }
  ancestors.delete(value);
  return output;
}

export function stableStateKey(state) {
  return JSON.stringify(canonicalize(state));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function snapshot(state) {
  return deepFreeze(canonicalize(state));
}

function reconstructTrace(key, states, parents, depths) {
  const reversed = [];
  let cursor = key;
  while (cursor !== null) {
    const parent = parents.get(cursor);
    reversed.push({
      state: states.get(cursor),
      depth: depths.get(cursor),
      action: parent?.action ?? null,
    });
    cursor = parent?.previous ?? null;
  }
  return reversed.reverse();
}

function validateLimit(value, name, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer >= ${minimum}`);
  }
}

function validateTransitionList(edges, description) {
  if (!Array.isArray(edges)) {
    throw new TypeError(`${description} successors must return an array`);
  }
  for (const edge of edges) {
    if (!edge || typeof edge !== "object" || !("state" in edge)) {
      throw new TypeError(`${description} transition must contain a state`);
    }
    snapshot(edge.state);
  }
}

function assertSymmetryContract({ state, outgoing, invariantResult, successors, invariant, isTerminal, symmetry }) {
  const originalTerminal = Boolean(isTerminal(state));
  const originalTargets = new Set(outgoing.map((edge) => stableStateKey(edge.state)));
  for (const permutation of symmetry.permutations) {
    const transformed = snapshot(symmetry.transform(state, permutation));
    const transformedInvariant = invariant(transformed);
    if ((transformedInvariant === true) !== (invariantResult === true)) {
      throw new Error(
        `symmetry contract failed: invariant is not preserved by permutation [${permutation.join(",")}]`
      );
    }
    if (Boolean(isTerminal(transformed)) !== originalTerminal) {
      throw new Error(
        `symmetry contract failed: terminal-state classification is not preserved by permutation [${permutation.join(",")}]`
      );
    }
    const transformedOutgoing = successors(transformed);
    validateTransitionList(transformedOutgoing, "transformed");
    const expectedTargets = new Set(
      outgoing.map((edge) => stableStateKey(symmetry.transform(edge.state, permutation)))
    );
    const actualTargets = new Set(
      transformedOutgoing.map((edge) => stableStateKey(edge.state))
    );
    if (expectedTargets.size !== actualTargets.size
      || [...expectedTargets].some((key) => !actualTargets.has(key))) {
      throw new Error(
        `symmetry contract failed: transition relation is not equivariant for permutation [${permutation.join(",")}]`
      );
    }
  }
}

export function explore({
  initialState,
  successors,
  invariant,
  isTerminal = () => false,
  stateKey = stableStateKey,
  symmetry = null,
  maxStates = 100_000,
  maxDepth = 10_000,
  maxTransitions = 1_000_000,
} = {}) {
  if (typeof successors !== "function") throw new TypeError("successors must be a function");
  if (typeof invariant !== "function") throw new TypeError("invariant must be a function");
  if (typeof isTerminal !== "function") throw new TypeError("isTerminal must be a function");
  if (typeof stateKey !== "function") throw new TypeError("stateKey must be a function");
  if (symmetry !== null) {
    if (typeof symmetry.canonicalize !== "function"
      || typeof symmetry.transform !== "function"
      || !Array.isArray(symmetry.permutations)
      || !Number.isSafeInteger(symmetry.groupSize)
      || symmetry.groupSize !== symmetry.permutations.length
      || symmetry.groupSize < 1) {
      throw new TypeError("symmetry must be created by createPermutationSymmetry");
    }
    if (stateKey !== stableStateKey) {
      throw new TypeError("custom stateKey is not supported with symmetry reduction");
    }
  }
  validateLimit(maxStates, "maxStates", 1);
  validateLimit(maxDepth, "maxDepth", 0);
  validateLimit(maxTransitions, "maxTransitions", 1);

  const rawInitial = snapshot(initialState);
  let initial = rawInitial;
  if (symmetry) {
    const rawInitialKey = stableStateKey(rawInitial);
    for (const permutation of symmetry.permutations) {
      const transformedInitial = snapshot(symmetry.transform(rawInitial, permutation));
      if (stableStateKey(transformedInitial) !== rawInitialKey) {
        throw new Error("symmetry contract failed: the single initial state must be fixed by every group action");
      }
    }
    initial = snapshot(symmetry.canonicalize(rawInitial));
    if (stableStateKey(initial) !== rawInitialKey) {
      throw new Error("symmetry contract failed: canonicalize changed a fixed initial state");
    }
  }
  const initialKey = stateKey(initial);
  if (typeof initialKey !== "string") throw new TypeError("stateKey must return a string");

  const states = new Map([[initialKey, initial]]);
  const parents = new Map([[initialKey, null]]);
  const depths = new Map([[initialKey, 0]]);
  const queue = [initialKey];
  let head = 0;
  let transitionsExplored = 0;
  let deadlockCount = 0;
  let maxDepthReached = 0;
  let truncated = false;
  let symmetryStatesValidated = 0;

  while (head < queue.length) {
    const currentKey = queue[head++];
    const currentState = states.get(currentKey);
    const currentDepth = depths.get(currentKey);
    maxDepthReached = Math.max(maxDepthReached, currentDepth);

    const valid = invariant(currentState);
    const outgoing = successors(currentState);
    if (!Array.isArray(outgoing)) {
      throw new TypeError("successors must return an array");
    }
    if (symmetry) {
      assertSymmetryContract({
        state: currentState,
        outgoing,
        invariantResult: valid,
        successors,
        invariant,
        isTerminal,
        symmetry,
      });
      symmetryStatesValidated += 1;
    }
    if (valid !== true) {
      const message = typeof valid === "string"
        ? valid
        : valid && typeof valid.message === "string"
          ? valid.message
          : "Safety invariant returned false";
      return {
        status: "violation",
        violation: message,
        statesExplored: states.size,
        transitionsExplored,
        deadlockCount,
        maxDepthReached,
        symmetryGroupSize: symmetry?.groupSize ?? 1,
        symmetryStatesValidated,
        counterexample: reconstructTrace(currentKey, states, parents, depths),
      };
    }
    if (outgoing.length === 0 && !isTerminal(currentState)) {
      deadlockCount += 1;
    }

    for (const edge of outgoing) {
      transitionsExplored += 1;
      if (!edge || typeof edge !== "object" || !("state" in edge)) {
        throw new TypeError("each transition must contain a state");
      }
      if (typeof edge.label !== "string" || !edge.label.trim()) {
        throw new TypeError("each transition must contain a non-empty label");
      }
      if (transitionsExplored > maxTransitions) {
        truncated = true;
        break;
      }

      const rawNext = snapshot(edge.state);
      const next = symmetry ? snapshot(symmetry.canonicalize(rawNext)) : rawNext;
      if (symmetry && stableStateKey(symmetry.canonicalize(next)) !== stableStateKey(next)) {
        throw new Error("symmetry contract failed: canonicalize must return an idempotent orbit representative");
      }
      const nextKey = stateKey(next);
      if (typeof nextKey !== "string") throw new TypeError("stateKey must return a string");
      if (states.has(nextKey)) continue;

      if (currentDepth >= maxDepth || states.size >= maxStates) {
        truncated = true;
        continue;
      }

      states.set(nextKey, next);
      parents.set(nextKey, { previous: currentKey, action: edge.label });
      depths.set(nextKey, currentDepth + 1);
      queue.push(nextKey);
    }
    if (transitionsExplored > maxTransitions) break;
  }

  return {
    status: truncated ? "inconclusive" : "safe",
    violation: null,
    statesExplored: states.size,
    transitionsExplored,
    deadlockCount,
    maxDepthReached,
    symmetryGroupSize: symmetry?.groupSize ?? 1,
    symmetryStatesValidated,
    counterexample: null,
  };
}
