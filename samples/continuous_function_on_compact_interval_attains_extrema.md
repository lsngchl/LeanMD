# A Continuous Function on a Compact Interval Attains Its Extrema

## Theorem

Let \(a,b\in\mathbb{R}\) with \(a\le b\), and let

\[
f:[a,b]\longrightarrow\mathbb{R}
\]

be continuous. Then there exist points \(x_{\min},x_{\max}\in[a,b]\) such
that

\[
f(x_{\min})\le f(x)\le f(x_{\max})
\qquad\text{for every }x\in[a,b].
\]

In other words, \(f\) attains both its minimum and its maximum on \([a,b]\).

## Previously established results

We use the following two facts as established theorems:

1. [A closed bounded interval is compact](./closed_bounded_interval_is_compact.md).
   In particular, \([a,b]\) is compact.
2. [A continuous image of a compact set is compact](./continuous_image_of_compact_set_is_compact.md).
   Therefore, the image of \([a,b]\) under \(f\) is compact.

The links lead to full proofs. A reader who already knows these results may
simply use the statements above and continue directly to the proof.

## Proof

Set

\[
K=[a,b].
\]

By the [compactness of closed bounded intervals](./closed_bounded_interval_is_compact.md),
the set \(K\) is compact. Since \(f\) is continuous, the
[continuous-image theorem](./continuous_image_of_compact_set_is_compact.md)
shows that

\[
C=f(K)
\]

is compact in \(\mathbb{R}\). The set \(C\) is nonempty because \(K\) is
nonempty.

It remains to show that a nonempty compact subset of \(\mathbb{R}\) has a
largest and a smallest element.

### 1. The image \(C\) is bounded

The collection

\[
\mathcal{U}=\{(-n,n):n\in\mathbb{N}\}
\]

is an open cover of \(\mathbb{R}\), and therefore an open cover of \(C\).
Compactness gives finitely many members of \(\mathcal{U}\) that cover \(C\).
If \(N\) is the largest index occurring in this finite collection, then

\[
C\subseteq(-N,N).
\]

Thus \(C\) is bounded above and below.

### 2. The supremum belongs to \(C\)

Because \(C\) is nonempty and bounded above, the number

\[
M=\sup C
\]

exists. We claim that \(M\in C\).

Suppose instead that \(M\notin C\). Every \(y\in C\) then satisfies \(y<M\),
so for some \(n\in\mathbb{N}\),

\[
y<M-\frac{1}{n}.
\]

Consequently, the family

\[
\left\{\left(-\infty,M-\frac{1}{n}\right):n\in\mathbb{N}\right\}
\]

is an open cover of \(C\). A finite subcover would place all of \(C\) below
\(M-1/N\) for some \(N\in\mathbb{N}\). But then \(M-1/N\) would be an upper
bound of \(C\) strictly smaller than \(M\), contradicting \(M=\sup C\).

Therefore \(M\in C\), and hence \(M=\max C\).

### 3. The infimum belongs to \(C\)

Similarly, let

\[
m=\inf C.
\]

If \(m\notin C\), then the open sets

\[
\left\{\left(m+\frac{1}{n},\infty\right):n\in\mathbb{N}\right\}
\]

cover \(C\). Any finite subcover would imply that \(m+1/N\) is a lower bound
of \(C\) strictly larger than \(m\), contradicting \(m=\inf C\). Thus
\(m\in C\), and therefore \(m=\min C\).

### 4. Return to the function

Since \(M,m\in C=f(K)\), there exist \(x_{\max},x_{\min}\in K\) such that

\[
f(x_{\max})=M
\qquad\text{and}\qquad
f(x_{\min})=m.
\]

For every \(x\in[a,b]\), we have \(f(x)\in C\), so

\[
f(x_{\min})=m\le f(x)\le M=f(x_{\max}).
\]

Hence \(f\) attains both its minimum and its maximum on \([a,b]\).
\(\square\)

## Dependency outline

1. [Closed bounded intervals are compact](./closed_bounded_interval_is_compact.md).
2. [Continuous images of compact sets are compact](./continuous_image_of_compact_set_is_compact.md).
3. A nonempty compact subset of \(\mathbb{R}\) is bounded and contains its
   supremum and infimum.
4. Apply these facts to \(C=f([a,b])\).
