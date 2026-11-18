/**
 * Explicit-state breadth-first model checker.
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

export function explore({
  initialState,
  successors,
  invariant,
  isTerminal = () => false,
  stateKey = stableStateKey,
  maxStates = 100_000,
  maxDepth = 10_000,
  maxTransitions = 1_000_000,
} = {}) {
  if (typeof successors !== "function") throw new TypeError("successors must be a function");
  if (typeof invariant !== "function") throw new TypeError("invariant must be a function");
  if (typeof isTerminal !== "function") throw new TypeError("isTerminal must be a function");
  if (typeof stateKey !== "function") throw new TypeError("stateKey must be a function");
  validateLimit(maxStates, "maxStates", 1);
  validateLimit(maxDepth, "maxDepth", 0);
  validateLimit(maxTransitions, "maxTransitions", 1);

  const initial = snapshot(initialState);
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

  while (head < queue.length) {
    const currentKey = queue[head++];
    const currentState = states.get(currentKey);
    const currentDepth = depths.get(currentKey);
    maxDepthReached = Math.max(maxDepthReached, currentDepth);

    const valid = invariant(currentState);
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
        counterexample: reconstructTrace(currentKey, states, parents, depths),
      };
    }

    const outgoing = successors(currentState);
    if (!Array.isArray(outgoing)) {
      throw new TypeError("successors must return an array");
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

      const next = snapshot(edge.state);
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
    counterexample: null,
  };
}
