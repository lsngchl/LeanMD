# Sobolev Mapping for Nondegenerate Fourier Integral Operators

Let \(X\) and \(Y\) be smooth manifolds with
\[
\dim X=d_1,
\qquad
\dim Y=d_2.
\]
Let
\[
C\subset(T^*X\setminus0)\times(T^*Y\setminus0)
\]
be a nondegenerate canonical relation, meaning that its natural left and right projections have maximal rank.

## Theorem

Source: [Greenleaf, Iosevich, and Taylor, Theorem 3.1](https://arxiv.org/abs/1907.12513).

Let \(\mu\in\mathbb R\).
If
\[
A\in I^{\mu-|d_1-d_2|/4}(X,Y;C)
\]
has a compactly supported Schwartz kernel, then, for every \(s\in\mathbb R\),
\[
A:L_s^2(Y)\longrightarrow L_{s-\mu}^2(X)
\]
is bounded.

In particular, if \(d_1=d_2\) and \(C\) is a local canonical graph, then
\[
A\in I^\mu(X,Y;C)
\quad\Longrightarrow\quad
A:L_s^2(Y)\longrightarrow L_{s-\mu}^2(X).
\]
Here \(L_s^2\) denotes the \(L^2\)-Sobolev space \(H^s\).

## Application here

For the operator \(T_r^\chi\), take
\[
X=U,
\qquad
Y=V,
\qquad
d_1=d_2=md,
\qquad
C=C_r,
\qquad
\mu=-\frac{md-1}{2}.
\]
The parent document proves that \(C_r\) is locally a canonical graph and that \(T_r^\chi\) has Fourier integral order \(-(md-1)/2\).
Thus the theorem gives, for every \(s\in\mathbb R\),
\[
T_r^\chi:H^s(V)
\longrightarrow
H^{s+(md-1)/2}(U).
\]
