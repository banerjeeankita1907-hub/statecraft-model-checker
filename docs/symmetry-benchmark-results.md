# Symmetry-reduction benchmark results

## Reproducibility record

The counts below were emitted by the repository's GitHub Actions run for
`npm run benchmark` on 18 November 2026. The workflow used Node.js 22 on
GitHub-hosted Ubuntu runners. The benchmark is deterministic and reports
reachable states and generated transition edges, not elapsed time.

Workflow: https://github.com/banerjeeankita1907-hub/statecraft-model-checker/actions/runs/44315683169

## Peterson mutual exclusion

| Model | Search | Result | States | Transitions | Counterexample depth |
|---|---|---:|---:|---:|---:|
| Correct Peterson | Ordinary BFS | Safe | 30 | 52 | — |
| Correct Peterson | (S_2) quotient | Safe | 16 | 28 | — |
| Fault-injected guard | Ordinary BFS | Violation | 36 | 54 | 6 |
| Fault-injected guard | (S_2) quotient | Violation | 18 | 26 | 6 |

The two-process permutation quotient reduced the correct model's stored
representatives from 30 to 16 and generated transitions from 52 to 28. In the
fault-injected model, both searches found the mutual-exclusion violation at
depth six (seven states including the initial state). The reduction therefore
preserved the safety verdict and this counterexample depth for the encoded
model.

The model initializes `turn` to `null` to represent an unspecified initial
tie-break value. Each process writes `turn` before evaluating its waiting
guard, so the initial value is not read by the protocol; the representation
keeps the single initial state fixed under process renaming.

## Independent one-shot process family

For (n) identical processes, each process may perform one independent
`done[i]: false -> true` action. The concrete Boolean state space has
(2^n) reachable states. Under the full symmetric group (S_n), an orbit is
determined by the number of completed processes, so there are exactly (n+1)
orbits. Both counts are asserted by the benchmark executable, not just
reported as observations.

| Processes (n) | Group size (n!) | Ordinary states | Quotient states | State reduction | Ordinary transitions | Quotient transitions | Transition reduction |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | 2 | 4 | 3 | 25.00% | 4 | 3 | 25.00% |
| 3 | 6 | 8 | 4 | 50.00% | 12 | 6 | 50.00% |
| 4 | 24 | 16 | 5 | 68.75% | 32 | 10 | 68.75% |
| 5 | 120 | 32 | 6 | 81.25% | 80 | 15 | 81.25% |
| 6 | 720 | 64 | 7 | 89.06% | 192 | 21 | 89.06% |
| 7 | 5,040 | 128 | 8 | 93.75% | 448 | 28 | 93.75% |

These experiments demonstrate quotient correctness and state-count reduction
for a deliberately highly symmetric family. They do **not** establish the
same reduction for arbitrary concurrent systems. The independent-process
family has a closed-form orbit count and is a controlled implementation
benchmark, not a representative workload from production software.

## Limitations and interpretation

- The built-in implementation enumerates all (n!) permutations and caps
  (n) at seven. State-count reduction is not a claim of wall-clock speedup.
- The runtime validator checks invariant preservation, terminal
  classification, and transition equivariance for every explored orbit
  representative and every enumerated permutation.
- The model author must still supply a genuine group action on every
  process-indexed state field. The runtime checks cannot prove the group
  axioms for an arbitrary callback over every possible state.
- Labels are ignored in the equivariance check. The quotient is intended for
  reachability safety, not label-sensitive temporal logic, fairness, or
  liveness.
- Peterson's protocol is represented as a finite interleaving abstraction.
  This experiment does not prove memory-model correctness, starvation
  freedom, scheduler fairness, or equivalence to compiled machine code.

See [the proof obligations](symmetry-reduction.md) and
[the model semantics](semantics.md) before interpreting a `safe` result.
