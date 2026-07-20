# The Two-Set Configuration Theorem

Let \(n\ge1\) and \(1\le k\le n\), and let
\[
\Phi:\mathbb R^n\times\mathbb R^n\longrightarrow\mathbb R^k
\]
be smooth.
Assume the double-fibration condition
\[
\operatorname{rank}D_X\Phi(X,Y)
=
\operatorname{rank}D_Y\Phi(X,Y)
=k.
\]
For \(\mathbf r\in\mathbb R^k\), let \(\mathcal R_{\mathbf r}\) be a compactly localized generalized Radon transform associated with the incidence relation \(\Phi(X,Y)=\mathbf r\).
Assume that, locally uniformly in \(\mathbf r\),
\[
\mathcal R_{\mathbf r}:
L_s^2(\mathbb R^n)
\longrightarrow
L_{s+\alpha_\Phi}^2(\mathbb R^n)
\]
is bounded for every \(s\in\mathbb R\).
Write
\[
\beta_\Phi
:=
\frac{n-k}{2}-\alpha_\Phi.
\]

## Theorem

Source: [Greenleaf, Iosevich, and Taylor, Theorem 1.5](https://arxiv.org/abs/1907.12513).

If \(E,F\subset\mathbb R^n\) are compact and
\[
\dim_HE+\dim_HF
>
2n-2\alpha_\Phi
=
n+k+2\beta_\Phi,
\]
then the configuration set
\[
\Delta_\Phi(E,F)
:=
\{\Phi(X,Y):X\in E,\ Y\in F\}
\]
has nonempty interior in \(\mathbb R^k\).

## Application here

In the parent document, the two ambient spaces both have dimension \(md\), the output is scalar, and \((\mathrm{SM})\) gives
\[
n=md,
\qquad
k=1,
\qquad
\alpha_\Phi=\frac{md-1}{2},
\qquad
\beta_\Phi=0.
\]
Taking \(E=A\) and \(F=B\), the dimension condition becomes
\[
\dim_HA+\dim_HB
>
2md-2\left(\frac{md-1}{2}\right)
=
md+1.
\]
Therefore
\[
\operatorname{int}\Phi(A,B)\ne\varnothing.
\]
