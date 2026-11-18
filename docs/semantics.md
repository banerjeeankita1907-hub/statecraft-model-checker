# Statecraft semantics

## Transition systems

A model is a tuple \(M = (S, S_0, T)\), where \(S\) is a set of states, \(S_0\) is one initial state, and \(T \subseteq S \times A \times S\) is a labelled transition relation. The JavaScript API represents the initial state as a JSON-compatible value and the transition relation as a successor function returning `{ state, label }` edges.

State equality is defined by canonical JSON serialization with recursively sorted object keys. Arrays retain order. Non-finite numbers, unsupported objects, and cycles are rejected.

## Breadth-first exploration

The checker uses a FIFO queue and a visited-state map. Every canonical state is expanded at most once. Parent pointers retain one predecessor and action label per discovered state. Therefore, when a safety invariant fails, the returned counterexample has minimum transition length among all discovered paths to a violating state.

The checker counts outgoing transitions encountered during expansion. A state with no outgoing edges is counted as a deadlock unless the model marks it terminal.

## Result meanings

- `safe`: the reachable graph was exhausted and every visited state satisfied the invariant.
- `violation`: a reachable state falsified the invariant; a shortest counterexample trace is returned.
- `inconclusive`: a state, depth, or transition budget prevented complete exploration.

Only `safe` means the supplied finite model was exhaustively checked. A bounded run must never be interpreted as a proof.

## Invariant contract

The invariant is a pure predicate over one state. Return `true` for a valid state and `false` (or a diagnostic string) for a violation. The engine freezes snapshots passed to the predicate and successor function to discourage accidental mutation.

## Complexity

Let \(|S_r|\) be the number of reachable states and \(|T_r|\) the number of reachable transitions. With expected constant-time hash-map access, time is \(O(|S_r| + |T_r|)\), and memory is \(O(|S_r|)\), including one predecessor per discovered state.

The state-space itself can grow exponentially in the number of independent components. Limits are therefore first-class API inputs rather than hidden implementation details.


## Symmetry quotient exploration

An optional finite permutation group can identify states that differ only by
renaming interchangeable process identities. The reducer stores one
lexicographically canonical JSON representative per orbit. Successors are
generated from that representative and canonicalized before insertion.

The supplied `createPermutationSymmetry` helper enumerates the full symmetric
group `S_n` for at most seven processes. This is deliberately a small-model
implementation: orbit canonicalization enumerates `n!` process permutations.
It is exact, but its canonicalization overhead can outweigh state savings for
small or weakly symmetric models.

Before a representative is expanded, the checker evaluates every group image
and checks that (i) the safety predicate has the same truth value, (ii)
terminal-state classification agrees, and (iii) the successor-state sets are
exactly related by the same permutation. Transition labels are ignored by the
equivariance check because this version checks reachability safety, not
label-sensitive temporal properties. A failed check aborts rather than
silently claiming a proof.

The initial-state requirement is intentionally strict: this API accepts one
initial state and requires it to be fixed by every group action. It does not
yet accept a set of initial states or compute the closure of an asymmetric
initial set. The `permuteState` callback must implement a genuine group action
(identity, composition and inverses) on all process-indexed state fields.
Runtime transition checks do not prove that callback's group-action algebra.

With symmetry enabled, `statesExplored` counts orbit representatives rather
than concrete states. `symmetryGroupSize` and
`symmetryStatesValidated` report the group size and number of representatives
for which all runtime preservation checks completed.
