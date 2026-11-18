# Symmetry reduction: construction, proof obligations and limits

## 1. The object being reduced

Let a finite labelled transition system be

\[
\mathcal{T} = (S, s_0, \rightarrow, P),
\]

where \(S\) is the state set, \(s_0\) is one initial state,
\(\rightarrow \subseteq S \times A \times S\) is the transition
relation, and \(P : S \rightarrow \{\mathsf{true},\mathsf{false}\}\)
is a safety predicate. A state is safe when \(P(s)\) is true.

Let \(G\) be a finite group acting on states. In this implementation,
\(G=S_n\), the full symmetric group that renames \(n\) interchangeable
process identities. The orbit of a state is

\[
[s]_G = \{g(s) \mid g \in G\}.
\]

The reducer stores one representative per orbit. The representative is the
state with the lexicographically smallest canonical JSON serialization among
all process permutations. Arrays remain ordered during ordinary state-key
canonicalization; only the explicit process action reorders process-indexed
arrays.

## 2. Sufficient conditions for preserving safety

The quotient is sound for reachability safety when the following conditions
hold.

**A. A genuine group action.** The process transformations implement the
identity, composition and inverse laws:

\[
e(s)=s, \qquad (g_2\circ g_1)(s)=g_2(g_1(s)).
\]

The built-in helper enumerates all permutations in \(S_n\). The model author
supplies the action on each process-indexed field. A field representing a
process identity (such as Peterson's turn field) must be renamed too.

**B. Initial-state invariance.** Because this API accepts one initial state,

\[
g(s_0)=s_0 \quad \text{for every } g\in G.
\]

(For a set of initial states, the corresponding general condition is that the
set is closed under the group action; this API does not yet implement that
case.)

**C. Transition equivariance.** Every group action preserves the transition
relation:

\[
s\rightarrow t
\iff
g(s)\rightarrow g(t)
\quad \text{for every }g\in G.
\]

The implementation checks equality of successor-state sets for every group
image of each explored representative. Labels are intentionally ignored:
this checker currently establishes reachability properties, not
label-sensitive temporal properties.

**D. Property invariance.** The safety predicate is constant on each orbit:

\[
P(g(s))=P(s)
\quad \text{for every }s\in S,\ g\in G.
\]

The implementation checks the truth value of the invariant for every group
image of each explored representative. Diagnostic text may differ; the
truth value must not.

The terminal-state predicate is also required to be invariant so that the
reported deadlock/terminal distinction remains meaningful.

## 3. Quotient correctness argument

Define \(s\sim t\) iff \(t=g(s)\) for some \(g\in G\). Since \(G\)
is a group, \(\sim\) is an equivalence relation and partitions \(S\) into
orbits.

We show that \(\sim\) is a strong bisimulation for the unlabelled
state-transition relation.

Take any \(s\sim s'\). Then \(s'=g(s)\) for some \(g\in G\).
Suppose \(s\rightarrow t\). By transition equivariance,
\(g(s)\rightarrow g(t)\), so \(s'\rightarrow g(t)\). Since
\(g(t)\sim t\), the successor is in the same orbit as \(t\). The
converse direction follows by applying the inverse permutation
\(g^{-1}\). Thus each transition from either member of an orbit can be
matched by a transition from the other into the same target orbit.

Therefore the quotient transition system over \(S/\sim\) is bisimilar to
the concrete transition system with respect to state reachability. By initial
invariance, both systems start in the same singleton initial orbit. By
property invariance, an orbit is bad exactly when all of its members are bad.
Consequently,

\[
\exists s\in\operatorname{Reach}(\mathcal{T}) : \neg P(s)
\iff
\exists [s]_G\in\operatorname{Reach}(\mathcal{T}/G) :
\neg P(s).
\]

So exhaustive exploration of the quotient proves the same safety result as
exhaustive exploration of the concrete finite system. A path in the quotient
can be lifted step by step from the current concrete representative using
equivariance, so shortest path length to a violating orbit is preserved.

This argument does **not** establish liveness, fairness, quantitative
probabilities, timing properties, or properties that distinguish process
identities.

## 4. What the implementation checks

For each representative removed from the BFS queue, Statecraft:

1. Evaluates the invariant on the representative.
2. Computes its outgoing state relation.
3. Applies every enumerated permutation to the state.
4. Checks invariant truth-value preservation.
5. Checks terminal-state classification preservation.
6. Checks that the permuted outgoing state set equals the outgoing state set
   of the permuted source state.
7. Expands the representative's successors after canonicalizing each target
   to its orbit representative.

If a runtime check fails, exploration throws an error and does not return
safe. This is a fail-closed check of the finite reachable quotient
representatives and all their group images.

The runtime checks do not prove that an arbitrary user-supplied
permuteState callback obeys the group-action algebra for every possible
JSON value. The callback remains part of the model's trusted definition.
The tests check identity/composition behavior on representative data and
check the supplied Peterson and independent-process actions.

## 5. Complexity and engineering trade-offs

For \(n\) processes, the supplied implementation enumerates \(n!\)
permutations per canonicalization. If a state has representation size
\(m\), canonicalization is \(O(n!\,m)\). The runtime relation validator
also evaluates every group image of every quotient representative. The memory
cost of BFS is proportional to the number of quotient representatives, plus
predecessor metadata.

The technique can reduce the number of stored states dramatically when many
states differ only by process identity. It can also be slower than ordinary
BFS when the group is large or the system has little symmetry. The helper
therefore caps \(n\) at seven; this is a transparent research prototype,
not a production-scale graph-isomorphism or symmetry-discovery engine.

The benchmark reports state and transition counts rather than wall-clock
speedups. Those counts are deterministic across machines; runtime claims
would require repeated measurements, warm-up, a stated hardware/software
environment, and careful isolation of the \(n!\) canonicalization cost.

## 6. Reproducibility

Run the following from the repository root:

    npm test
    npm run check
    npm run benchmark

The benchmark compares ordinary BFS with symmetry-reduced BFS for correct
and fault-injected Peterson models and for a family of \(n\) independent,
one-shot processes. The latter has \(2^n\) concrete Boolean states and
\(n+1\) permutation orbits, providing a controlled check of the quotient
implementation. It is a state-space microbenchmark, not a claim that all
concurrent programs exhibit this reduction.

## 7. References

- E. A. Emerson and A. P. Sistla. “Symmetry and Model Checking.”
  *Formal Methods in System Design* 9, 105–131 (1996).
  https://doi.org/10.1007/BF00625970.
- A. P. Sistla and P. Godefroid. “Symmetry and Reduced Symmetry in Model
  Checking.” *ACM Transactions on Programming Languages and Systems* 26(4),
  702–734 (2004). https://doi.org/10.1145/1011508.1011511.
- “A Symmetry Reduction Technique for Model Checking Temporal-Epistemic
  Logic.” *Proceedings of IJCAI* (2009).
  https://www.ijcai.org/proceedings/2009/125.

The implementation here is a small explicit-state instance of these
established ideas; it does not claim a new symmetry-reduction algorithm.
