/**
 * Finite permutation groups for process-symmetric state representations.
 *
 * permuteState(state, permutation) must implement the corresponding group
 * action on every process-indexed field and preserve all shared fields.
 */
function enumeratePermutations(size) {
  const result = [];
  const current = [];
  const used = Array(size).fill(false);

  function visit() {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let value = 0; value < size; value += 1) {
      if (used[value]) continue;
      used[value] = true;
      current.push(value);
      visit();
      current.pop();
      used[value] = false;
    }
  }

  visit();
  return result;
}

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("states cannot contain non-finite numbers");
    return value;
  }
  if (!value || typeof value !== "object") {
    throw new TypeError("states must contain only JSON-compatible values");
  }
  if (Array.isArray(value)) return value.map(canonicalJson);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("states must use plain objects and arrays");
  }
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = canonicalJson(value[key]);
  return output;
}

function keyOf(value) {
  return JSON.stringify(canonicalJson(value));
}

/**
 * Build the full symmetric group S_n over n interchangeable processes.
 * Exact orbit canonicalization costs O(n! * state-size), so this helper is
 * deliberately bounded to at most seven processes.
 */
export function createPermutationSymmetry({ processCount, permuteState } = {}) {
  if (!Number.isSafeInteger(processCount) || processCount < 1 || processCount > 7) {
    throw new RangeError("processCount must be an integer from 1 through 7");
  }
  if (typeof permuteState !== "function") {
    throw new TypeError("permuteState must be a function");
  }

  const permutations = enumeratePermutations(processCount);
  const identity = Array.from({ length: processCount }, (_, index) => index);

  function transform(state, permutation) {
    return canonicalJson(permuteState(state, permutation));
  }

  function canonicalize(state) {
    let bestState = canonicalJson(state);
    let bestKey = keyOf(bestState);
    for (const permutation of permutations) {
      const candidate = transform(state, permutation);
      const candidateKey = keyOf(candidate);
      if (candidateKey < bestKey) {
        bestKey = candidateKey;
        bestState = candidate;
      }
    }
    return bestState;
  }

  return Object.freeze({
    kind: "permutation",
    processCount,
    groupSize: permutations.length,
    permutations: Object.freeze(permutations.map((permutation) => Object.freeze(permutation))),
    identity: Object.freeze(identity),
    transform,
    canonicalize,
    keyOf,
  });
}

export function permuteProcessArray(values, permutation) {
  if (!Array.isArray(values) || values.length !== permutation.length) {
    throw new RangeError("process-indexed arrays must match the symmetry group size");
  }
  const result = Array(values.length);
  for (let source = 0; source < values.length; source += 1) {
    result[permutation[source]] = values[source];
  }
  return result;
}
