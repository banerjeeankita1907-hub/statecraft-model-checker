# Statecraft

[![CI](https://github.com/banerjeeankita1907-hub/statecraft-model-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/banerjeeankita1907-hub/statecraft-model-checker/actions/workflows/ci.yml)

**An explicit-state model checker for small concurrent systems.**

Statecraft explores finite transition systems with breadth-first search, checks safety invariants, detects deadlocks, and returns shortest counterexample traces. It also supports validated quotient exploration under finite process-permutation symmetries. The examples include Peterson mutual exclusion, a fault-injected variant, and a parameterized family of independent concurrent processes.

## Why this project exists

Concurrent programs are difficult to reason about because many behaviors depend on the order in which individually simple actions interleave. Statecraft makes that interleaving space concrete and reproducible.

## Quick start

Requires Node.js 20+; no runtime dependencies.

```bash
npm test
npm run check
npm run peterson
npm run broken
npm run benchmark
```

The correct Peterson model should be safe within the explored finite state graph. The deliberately broken model should return a mutual-exclusion counterexample; the CLI uses exit code 1 for that expected violation.

## Model-checking semantics

The engine explores a finite labelled transition system:

- A state is a JSON-serializable value.
- A successor function returns labelled outgoing transitions.
- A safety invariant returns `true` for a valid state and `false` for a violation.
- Breadth-first search visits each canonical state once.
- A violated invariant produces a shortest trace in number of transitions.
- State, depth, and transition limits return `inconclusive`, never an unqualified proof of safety.

See [docs/semantics.md](docs/semantics.md), [docs/peterson.md](docs/peterson.md), [the symmetry-reduction argument](docs/symmetry-reduction.md), and the [CI-recorded experiments](docs/experiment-results.md) and [symmetry benchmarks](docs/symmetry-benchmark-results.md).

## Project structure

```text
src/model-checker.js      BFS explorer and validated quotient traversal
src/symmetry.js           Finite process-permutation groups
src/models/peterson.js    Correct and fault-injected protocol
src/models/symmetry-benchmarks.js  Symmetric concurrent benchmark models
src/benchmark.js          Full-vs-reduced experiment suite
src/cli.js                Reproducible command-line interface
tests/                    Engine, symmetry, invariant and CLI tests
docs/                     Semantics, proof, benchmarks and limitations
```

## Scope

Statecraft is an educational explicit-state safety checker. Symmetry reduction is only sound when the supplied process permutation is a group action preserving the initial state, transition relation, terminal classification and safety invariant. The checker validates the latter three conditions across every group image of each explored representative; the model author remains responsible for defining a mathematically valid group action. It does not prove liveness, fairness, real-time properties, unbounded systems, or correctness of a model against an implementation. A passing result is only as meaningful as the supplied model and invariant.

## License

MIT.
