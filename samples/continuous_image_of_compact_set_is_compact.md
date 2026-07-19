# A Continuous Image of a Compact Set Is Compact

## Theorem

Let \(X\) and \(Y\) be topological spaces, let \(K\subseteq X\) be compact,
and let

\[
f:X\longrightarrow Y
\]

be continuous. Then the image

\[
f(K)=\{f(x):x\in K\}
\]

is compact in \(Y\).

> We use the open-cover definition of compactness: every open cover of the
> set must contain a finite subcover.

## Proof

Let \(\mathcal{V}\) be an arbitrary open cover of \(f(K)\). Thus every member
of \(\mathcal{V}\) is open in \(Y\), and

\[
f(K)\subseteq\bigcup_{V\in\mathcal{V}}V.
\]

For each \(V\in\mathcal{V}\), continuity of \(f\) implies that the inverse
image \(f^{-1}(V)\) is open in \(X\). Consider the family

\[
\mathcal{U}=\bigl\{f^{-1}(V):V\in\mathcal{V}\bigr\}.
\]

This family covers \(K\). Indeed, if \(x\in K\), then \(f(x)\in f(K)\).
Because \(\mathcal{V}\) covers \(f(K)\), there is some
\(V\in\mathcal{V}\) such that \(f(x)\in V\). Equivalently,
\(x\in f^{-1}(V)\).

Since \(K\) is compact, finitely many members of \(\mathcal{U}\) cover
\(K\). Therefore there exist \(V_1,\ldots,V_n\in\mathcal{V}\) such that

\[
K\subseteq f^{-1}(V_1)\cup\cdots\cup f^{-1}(V_n).
\]

We claim that the corresponding sets \(V_1,\ldots,V_n\) cover \(f(K)\).
Let \(y\in f(K)\). Then \(y=f(x)\) for some \(x\in K\). The finite-cover
relation above gives an index \(j\in\{1,\ldots,n\}\) for which

\[
x\in f^{-1}(V_j).
\]

Hence \(f(x)\in V_j\), so \(y\in V_j\). It follows that

\[
f(K)\subseteq V_1\cup\cdots\cup V_n.
\]

Thus the arbitrary open cover \(\mathcal{V}\) of \(f(K)\) contains a finite
subcover. Therefore \(f(K)\) is compact. \(\square\)

## Logical outline

1. Start with an arbitrary open cover of \(f(K)\).
2. Pull every open set back through \(f\).
3. Continuity makes these inverse images open, and they cover \(K\).
4. Compactness of \(K\) produces finitely many inverse images covering
   \(K\).
5. Their corresponding original open sets cover \(f(K)\).

## Remarks

- No Hausdorff assumption on \(X\) or \(Y\) is needed.
- The same proof applies when the continuous map is defined only on \(K\),
  that is, when \(f:K\to Y\).
- If \(K=\varnothing\), then \(f(K)=\varnothing\), which is compact.

## Key implication

The essential step may be summarized as

\[
K\subseteq\bigcup_{j=1}^{n}f^{-1}(V_j)
\quad\Longrightarrow\quad
f(K)\subseteq\bigcup_{j=1}^{n}V_j.
\]

The inverse images are used to invoke compactness of the domain, while the
original sets provide the required finite subcover of the image.
