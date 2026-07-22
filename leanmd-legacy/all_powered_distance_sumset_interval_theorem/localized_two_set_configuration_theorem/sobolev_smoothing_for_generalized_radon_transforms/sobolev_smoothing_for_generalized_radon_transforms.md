# Sobolev Smoothing for the Generalized Radon Transform

Let \(n\ge1\) be an integer, let \(U,V\subset\mathbb R^n\) be open, and let \(\Phi\in C^\infty(U\times V;\mathbb R)\).
Let \(\chi\in C_c^\infty(U\times V)\).
Assume that \(\nabla_x\Phi\ne0\) and \(\nabla_y\Phi\ne0\) on \(U\times V\), and that, for every \(r\in\mathbb R\), the conormal canonical relation \(C_r\) of \(\Phi(x,y)=r\) is locally a canonical graph at every point arising from \((x,y)\in\operatorname{spt}\chi\).
For \(f\in C_c^\infty(V)\), define
\[
T_r^\chi f(x)
:=
\int_{\{y\in V:\Phi(x,y)=r\}}
f(y)\chi(x,y)\,d\sigma_{x,r}(y).
\]

## Proposition

For every \(s\in\mathbb R\), the operator \(T_r^\chi\) extends to a bounded map
\[
T_r^\chi:H^s(V)\longrightarrow H^{s+(n-1)/2}(U).
\]
More precisely, for every compact interval \(I\subset\mathbb R\), there is a constant \(C_{s,\chi,I}\) such that
\[
\|T_r^\chi f\|_{H^{s+(n-1)/2}(U)}
\le
C_{s,\chi,I}\|f\|_{H^s(V)},
\qquad r\in I.
\tag{SM}
\]
> **Remark.** Averaging \(f\) over the level hypersurfaces \(\Phi(x,y)=r\) improves \(L^2\)-Sobolev regularity by \((n-1)/2\).

## Proof

By the [coarea formula](coarea_formula/coarea_formula.md "why"), the [Schwartz kernel](schwartz_kernel/schwartz_kernel.md "why") of \(T_r^\chi\) is
\[
K_r(x,y)
=
\chi(x,y)|\nabla_y\Phi(x,y)|\,\delta\bigl(\Phi(x,y)-r\bigr).
\]
Using the Fourier representation of the delta distribution, this becomes
\[
K_r(x,y)
=
\frac1{2\pi}
\int_{\mathbb R}
e^{i\tau(\Phi(x,y)-r)}
\chi(x,y)|\nabla_y\Phi(x,y)|\,d\tau.
\]
The phase \(\tau(\Phi-r)\) parametrizes \(C_r\).
Since the amplitude has order \(0\), there is one frequency variable, and both base spaces have dimension \(n\), the operator \(T_r^\chi\) is a Fourier integral operator of order
\[
\mu
=
0+\frac12-\frac{n+n}{4}
=
-\frac{n-1}{2}.
\]
The Sobolev mapping theorem for Fourier integral operators associated with local canonical graphs therefore gives
\[
T_r^\chi:H^s(V)
\longrightarrow
H^{s-\mu}(U)
=
H^{s+(n-1)/2}(U).
\]
For \(r\in I\), only the compact set
\[
\{(x,y)\in\operatorname{spt}\chi:\Phi(x,y)\in I\}
\]
is relevant.
A finite cover by canonical-graph coordinate patches makes the preceding estimate uniform in \(r\in I\), which gives \((\mathrm{SM})\). \(\square\)

## Application here

In the parent document,
\[
U,V\subset(\mathbb R^d)^m\cong\mathbb R^{md},
\]
so the proposition applies with
\[
n=md.
\]
The phase \(\Phi\), cutoff \(\chi\), and operator \(T_r^\chi\) there are exactly those in the proposition above.
Condition \((\mathrm{ND})\) gives \(\nabla_x\Phi\ne0\) and \(\nabla_y\Phi\ne0\), and the preceding projection argument shows that every \(C_r\) is locally a canonical graph on \(U\times V\), hence at every point arising from \(\operatorname{spt}\chi\).
Substituting \(n=md\) into the proposition gives
\[
\|T_r^\chi f\|_{H^{s+(md-1)/2}(U)}
\le
C_{s,\chi,I}\|f\|_{H^s(V)},
\qquad r\in I,
\]
for every compact interval \(I\subset\mathbb R\), which is precisely \((\mathrm{SM})\) in the parent document.
