# Reproducible baseline experiment results

These baseline measurements are superseded by the ordinary-versus-symmetry
comparison in [symmetry-benchmark-results.md](symmetry-benchmark-results.md),
which includes current model versions and exact CI-run provenance.

For the current Peterson model, GitHub Actions recorded:

| Model | Result | Reachable states | Transitions | Deadlocks |
|---|---:|---:|---:|---:|
| Peterson protocol | Safe | 30 | 52 | 0 |
| Broken guard (fault injection) | Violation | 36 | 54 | 0 |

The broken model produces a counterexample of six transitions (seven states
including the initial state). The ordinary BFS run uses the default
100,000-state bound and is not truncated.

The full-versus-reduced comparison, fault-injection preservation check,
independent-process microbenchmarks and reduction percentages are documented
in [the symmetry benchmark report](symmetry-benchmark-results.md).

These counts describe this explicit finite model only. They do not establish
scheduler fairness, memory reordering correctness, real-time behavior,
liveness, or properties outside the encoded abstraction.
