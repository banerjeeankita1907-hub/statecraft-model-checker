# Peterson's two-process mutual exclusion protocol

This model represents two processes, \(P_0\) and \(P_1\), sharing:

- `flag[i]`: process \(P_i\) wants to enter the critical section.
- `turn`: tie-break preference. Its initial value is `null`, representing an unspecified initial tie-break; each process writes it before testing the waiting condition.
- `pc[i]`: finite program counter for each process.
- `inCritical[i]`: whether a process is currently inside the critical section.

Each process executes the protocol:

1. Set its intent flag.
2. Give priority to the other process by writing `turn := other`.
3. Wait while the other process wants entry and the other process has priority.
4. Enter and leave the critical section.
5. Clear its intent flag and repeat.

The model treats each source-level action and successful guard as an atomic transition. Scheduling is interleaving: one enabled process action is selected at a time.

## Safety property

The mutual-exclusion invariant is:

\[
\neg (inCritical[0] \land inCritical[1]).
\]

The model checker exhaustively explores the finite reachable state graph and checks this predicate at every reachable state.

## Fault injection

The `broken` variant deliberately removes the waiting guard. This is not a subtle compiler bug; it is a controlled fault injection used to verify that the checker can produce a concrete counterexample when both processes enter the critical section.

Run:

```bash
npm run peterson
npm run broken
```

The second command is expected to exit with code 1 because a counterexample is the expected result.

## What this experiment does not establish

The experiment checks a finite abstraction and a safety property. It does not prove starvation freedom, scheduler fairness, real-time guarantees, memory-model correctness, or equivalence between this model and a compiled implementation. Those require additional assumptions and formal arguments.
