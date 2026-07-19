# A Closed Bounded Interval Is Compact

## Theorem

Let \(a,b\in\mathbb{R}\) with \(a\le b\). Then the closed bounded interval

\[
[a,b]=\{x\in\mathbb{R}:a\le x\le b\}
\]

is compact in \(\mathbb{R}\) with its usual topology.

> We use the open-cover definition of compactness: every open cover of the
> set must contain a finite subcover.

## Proof

If \(a=b\), then \([a,b]=\{a\}\) is a one-point set, so the conclusion is
immediate. Assume from now on that \(a<b\).

Let \(\mathcal{U}\) be an arbitrary open cover of \([a,b]\). Define

\[
S=\bigl\{x\in[a,b]:[a,x]\text{ can be covered by finitely many members of }
\mathcal{U}\bigr\}.
\]

We will prove that \(b\in S\).

### 1. The set \(S\) has a supremum

Because \(\mathcal{U}\) covers \([a,b]\), some member of \(\mathcal{U}\)
contains \(a\). Hence the singleton interval \([a,a]\) has a finite cover, and
therefore \(a\in S\). Thus \(S\ne\varnothing\).

Moreover, \(S\subseteq[a,b]\), so \(S\) is bounded above by \(b\). By the
least-upper-bound property of \(\mathbb{R}\), the number

\[
c=\sup S
\]

exists and satisfies \(a\le c\le b\).

### 2. The point \(c\) belongs to \(S\)

Choose \(U_c\in\mathcal{U}\) such that \(c\in U_c\). Since \(U_c\) is open,
there exists \(\varepsilon>0\) such that

\[
(c-\varepsilon,c+\varepsilon)\subseteq U_c.
\]

Since \(c=\sup S\), there is some \(x\in S\) satisfying

\[
c-\frac{\varepsilon}{2}<x\le c.
\]

By the definition of \(S\), finitely many members of \(\mathcal{U}\) cover
\([a,x]\). The one additional set \(U_c\) covers \([x,c]\). Consequently,
\([a,c]\) has a finite subcover, and hence \(c\in S\).

### 3. The supremum must equal \(b\)

Suppose, for contradiction, that \(c<b\). Set

\[
y=\min\left\{b,c+\frac{\varepsilon}{2}\right\}.
\]

Then \(c<y\le b\). The finite collection covering \([a,c]\), together with
\(U_c\), covers \([a,y]\). Therefore \(y\in S\), contradicting the fact that
\(c\) is an upper bound of \(S\).

Thus \(c=b\). Since Step 2 showed that \(c\in S\), it follows that \(b\in S\).
Equivalently, finitely many members of \(\mathcal{U}\) cover \([a,b]\).
Because \(\mathcal{U}\) was arbitrary, \([a,b]\) is compact. \(\square\)

## Logical outline

1. Start with an arbitrary open cover \(\mathcal{U}\).
2. Collect all endpoints \(x\) up to which a finite subcover is possible.
3. Let \(c\) be the supremum of those endpoints.
4. Openness extends a finite cover slightly beyond \(c\).
5. Therefore \(c\) cannot be smaller than \(b\), so \(c=b\).

## Rendering checks

| Feature | Source example | Expected result |
|---|---|---|
| Inline mathematics | `\(c=\sup S\)` | Mathematics within the line |
| Display mathematics | `\[c=\sup S\]` | A centered display equation |
| Dollar inline mathematics | `$c=\sup S$` | Mathematics within the line |
| Dollar display mathematics | `$$c=\sup S$$` | A centered display equation |
| Markdown emphasis | `**compact**` | **compact** |
| Inline code | `` `\(not mathematics\)` `` | `\(not mathematics\)` |

The same identity also renders with dollar delimiters: $e^{i\pi}+1=0$.

$$
\sum_{n=1}^{\infty}\frac{1}{n^2}=\frac{\pi^2}{6}
$$

The delimiters inside the following fenced code block should remain literal:

```text
\(This should not be rendered as inline mathematics.\)
\[This should not be rendered as display mathematics.\]
$This should not be rendered as inline mathematics.$
$$This should not be rendered as display mathematics.$$
```
