/**
 * Two-process Peterson mutual exclusion model.
 *
 * Each process executes atomic protocol steps. The state is intentionally
 * small and finite so exhaustive state-space exploration is practical.
 */

export function createPetersonModel({ broken = false } = {}) {
  const initialState = {
    flag: [false, false],
    // `null` represents an unspecified initial tie-break value. The protocol\n    // overwrites it before a process evaluates its waiting guard; this keeps\n    // the initial state invariant under exchanging identical process IDs.\n    turn: null,
    pc: [0, 0],
    inCritical: [false, false],
  };

  function successors(state) {
    const transitions = [];
    for (let process = 0; process < 2; process += 1) {
      const other = 1 - process;
      const next = {
        flag: [...state.flag],
        turn: state.turn,
        pc: [...state.pc],
        inCritical: [...state.inCritical],
      };
      const pc = state.pc[process];

      if (pc === 0) {
        next.flag[process] = true;
        next.pc[process] = 1;
        transitions.push({ state: next, label: `P${process}: flag[${process}] := true` });
      } else if (pc === 1) {
        next.turn = other;
        next.pc[process] = 2;
        transitions.push({ state: next, label: `P${process}: turn := P${other}` });
      } else if (pc === 2) {
        const mustWait = !broken && state.flag[other] && state.turn === other;
        if (!mustWait) {
          next.inCritical[process] = true;
          next.pc[process] = 3;
          transitions.push({ state: next, label: `P${process}: enter critical section` });
        }
      } else if (pc === 3) {
        next.inCritical[process] = false;
        next.pc[process] = 4;
        transitions.push({ state: next, label: `P${process}: leave critical section` });
      } else if (pc === 4) {
        next.flag[process] = false;
        next.pc[process] = 0;
        transitions.push({ state: next, label: `P${process}: flag[${process}] := false` });
      } else {
        throw new RangeError(`invalid program counter for process ${process}`);
      }
    }
    return transitions;
  }

  function invariant(state) {
    return !(state.inCritical[0] && state.inCritical[1]) ||
      "Mutual exclusion violated: both processes are in the critical section";
  }

  return { initialState, successors, invariant };
}
