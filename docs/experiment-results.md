# Reproducible experiment results

The following results were recorded from the GitHub Actions run for the Statecraft CLI experiments.

| Model | Result | Reachable states | Transitions | Deadlocks |
|---|---:|---:|---:|---:|
| Peterson protocol | Safe | 26 | 44 | 0 |
| Broken guard (fault injection) | Violation | 33 | 52 | 0 |

The broken protocol produced a counterexample of six transitions (seven states including the initial state). Both experiments ran with the default 100,000-state bound, so neither result was truncated.

## Interpretation

The correct model's finite reachable state graph was fully explored and every reachable state satisfied the mutual-exclusion invariant. The fault-injected model reached a state with both `inCritical[0]` and `inCritical[1]` true, demonstrating that the invariant checker detects this particular safety failure.

These counts are implementation- and model-specific. They are not benchmark comparisons and do not establish properties outside the encoded finite abstraction. The model omits scheduler fairness, memory reordering, real-time behavior, and liveness properties.
