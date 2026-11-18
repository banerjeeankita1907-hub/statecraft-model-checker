import { createPermutationSymmetry, permuteProcessArray } from "../symmetry.js";

export function permutePetersonState(state, permutation) {
  return {
    ...state,
    flag: permuteProcessArray(state.flag, permutation),
    turn: state.turn === null ? null : permutation[state.turn],
    pc: permuteProcessArray(state.pc, permutation),
    inCritical: permuteProcessArray(state.inCritical, permutation),
  };
}

export function createPetersonSymmetry() {
  return createPermutationSymmetry({
    processCount: 2,
    permuteState: permutePetersonState,
  });
}

export function createIndependentOneShotModel(processCount) {
  if (!Number.isSafeInteger(processCount) || processCount < 1 || processCount > 7) {
    throw new RangeError("processCount must be an integer from 1 through 7");
  }
  const initialState = { done: Array(processCount).fill(false) };

  function successors(state) {
    const edges = [];
    for (let process = 0; process < processCount; process += 1) {
      if (state.done[process]) continue;
      const done = [...state.done];
      done[process] = true;
      edges.push({ state: { done }, label: `P${process}: complete` });
    }
    return edges;
  }

  function invariant(state) {
    return state.done.length === processCount
      || "Process-vector dimension changed";
  }

  return { initialState, successors, invariant };
}

export function createIndependentOneShotSymmetry(processCount) {
  return createPermutationSymmetry({
    processCount,
    permuteState: (state, permutation) => ({
      ...state,
      done: permuteProcessArray(state.done, permutation),
    }),
  });
}
