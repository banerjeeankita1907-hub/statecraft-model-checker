# Statecraft

[![CI](https://github.com/banerjeeankita1907-hub/pact-/actions/workflows/ci.yml/badge.svg)](https://github.com/banerjeeankita1907-hub/pact-/actions/workflows/ci.yml)

**An explicit-state model checker for small concurrent systems.**

Statecraft explores finite transition systems with breadth-first search, checks safety invariants, detects deadlocks, and returns shortest counterexample traces. It includes a two-process Peterson mutual-exclusion model and an intentionally broken variant to demonstrate a counterexample.

## Why this project exists

Concurrent programs are difficult to reason about because many behaviors depend on the order in which individually simple actions interleave. Statecraft makes that interleaving space concrete and reproducible.

## Quick start

Requires Node.js 20+; no runtime dependencies.

```bash
npm test
npm run check
npm run peterson
npm run broken
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

See [docs/semantics.md](docs/semantics.md), [docs/peterson.md](docs/peterson.md), and the [CI-recorded experiment results](docs/experiment-results.md).

## Project structure

```text
src/model-checker.js      Generic BFS state-space explorer
src/models/peterson.js    Correct and intentionally broken examples
src/cli.js                Reproducible command-line experiments
tests/                    Engine, invariant, and counterexample tests
docs/                     Semantics, proof sketch, and limitations
```

## Scope

Statecraft is an educational explicit-state safety checker. It does not prove liveness, fairness, real-time properties, unbounded systems, or correctness of a model against an implementation. A passing result is only as meaningful as the supplied model and invariant.

## License

MIT.
