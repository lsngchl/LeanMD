# Pullback of a Distribution by a Submersion

Let \(F:X\to Y\) be a smooth submersion between Euclidean domains, and let \(u\in\mathcal D'(Y)\).
Regard distributions as acting on compactly supported smooth densities, with the Euclidean volume element understood implicitly.
For every compactly supported smooth density \(\omega\) on \(X\), integration along the fibers of \(F\) defines a density \(F_*\omega\) on \(Y\).
The pullback of \(u\) is defined by
\[
\langle F^*u,\omega\rangle
:=
\langle u,F_*\omega\rangle.
\]
The submersion theorem gives local coordinates \((z,t)\) on \(X\) and \(t\) on \(Y\) in which
\[
F(z,t)=t.
\]
If
\[
\omega=\varphi(z,t)|dz\,dt|,
\]
then
\[
F_*\omega
=
\left(\int\varphi(z,t)\,dz\right)|dt|,
\]
so in these coordinates \(F^*u=1_z\otimes u_t\), where \(1_z\) denotes integration in the fiber variable.
The use of densities makes this definition independent of the chosen submersion coordinates.

Now let \(g:V\subset\mathbb R^n\to\mathbb R\) be smooth, and suppose that
\[
\nabla g(y)\ne0,
\qquad y\in g^{-1}(r).
\]
Then \(g\) is a submersion near \(g^{-1}(r)\), so the Dirac delta \(\delta_r\) can be pulled back by \(g\).
This pullback is denoted by
\[
g^*\delta_r
=
\delta(g-r).
\]
For every test function \(\varphi\in C_c^\infty(V)\),
\[
\left\langle\delta(g-r),\varphi\right\rangle
=
\int_{\{g=r\}}
\frac{\varphi(y)}{|\nabla g(y)|}\,d\sigma_r(y).
\]
Hence \(\delta(g-r)\) is the distribution supported on \(g^{-1}(r)\) whose density relative to the induced hypersurface measure is \(1/|\nabla g|\).
