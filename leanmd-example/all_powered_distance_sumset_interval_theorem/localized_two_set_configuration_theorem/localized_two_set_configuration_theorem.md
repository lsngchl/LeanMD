# Nonempty Interior of the Configuration Image

## Theorem

Let \(m\ge2\) and let \(d\ge1\) be an integer.
Let \(U,V\subset(\mathbb R^d)^m\) be open, let \(A\subset U\) and \(B\subset V\) be compact, and let
\[
\Phi\in C^\infty(U\times V;\mathbb R).
\]
Assume that
\[
\det
\begin{pmatrix}
0 & \nabla_X\Phi(X,Y)^T\\
\nabla_Y\Phi(X,Y) & \Phi_{YX}(X,Y)
\end{pmatrix}
\ne0,\qquad (X,Y)\in U\times V,
\tag{ND}
\]
and that
\[
\dim_HA+\dim_HB>md+1.
\tag{DIM}
\]
Then
\[
\operatorname{int}\Phi(A,B)\ne\varnothing.
\]

## Proof

Condition \((\mathrm{ND})\) first implies
\[
\nabla_X\Phi(X,Y)\ne0,
\qquad
\nabla_Y\Phi(X,Y)\ne0,
\qquad (X,Y)\in U\times V.
\]
Indeed, if either gradient vanished, the first row or the first column of the matrix in \((\mathrm{ND})\) would vanish.

For each \(r\in\mathbb R\), the [conormal canonical relation](conormal_canonical_relation/conormal_canonical_relation.md "why") of the incidence hypersurface \(\{(X,Y):\Phi(X,Y)=r\}\) is
\[
\begin{aligned}
C_r
=
\Bigl\{
&\Bigl(\bigl(X,\tau\nabla_X\Phi(X,Y)\bigr),\bigl(Y,-\tau\nabla_Y\Phi(X,Y)\bigr)\Bigr):\\
&\Phi(X,Y)=r,\quad (X,Y)\in U\times V,\quad \tau\ne0
\Bigr\}.
\end{aligned}
\]
Using the parametrization of \(C_r\) by triples \((X,Y,\tau)\) satisfying \(\Phi(X,Y)=r\) and \(\tau\ne0\), we verify that the natural projections
\[
\begin{aligned}
\pi_L(X,Y,\tau)&:=\bigl(X,\tau\nabla_X\Phi(X,Y)\bigr),\\
\pi_R(X,Y,\tau)&:=\bigl(Y,-\tau\nabla_Y\Phi(X,Y)\bigr)
\end{aligned}
\]
are local diffeomorphisms.
Suppose
\[
(\dot X,\dot Y,\dot\tau)\in\ker d\pi_R,
\]
and choose a smooth curve \((X(s),Y(s),\tau(s))\in C_r\) through \((X,Y,\tau)\) whose derivative at \(s=0\) is \((\dot X,\dot Y,\dot\tau)\).
Differentiating \(\pi_R(X(s),Y(s),\tau(s))\) at \(s=0\) gives
\[
d\pi_R(\dot X,\dot Y,\dot\tau)
=
\left(
\dot Y,
-\dot\tau\nabla_Y\Phi
-\tau\Phi_{YX}\dot X
-\tau\Phi_{YY}\dot Y
\right)
=0,
\]
where the derivatives of \(\Phi\) are evaluated at \((X,Y)\).
The first component gives
\[
\dot Y=0.
\]
Since the curve lies in \(C_r\), it satisfies
\[
\Phi(X(s),Y(s))=r.
\]
Differentiating this identity at \(s=0\) gives
\[
\nabla_X\Phi(X,Y)^T\dot X
+
\nabla_Y\Phi(X,Y)^T\dot Y
=0.
\]
Using \(\dot Y=0\), we obtain
\[
\nabla_X\Phi(X,Y)^T\dot X=0.
\]
The second component of \(d\pi_R(\dot X,\dot Y,\dot\tau)=0\), together with \(\dot Y=0\) and \(\tau\ne0\), gives
\[
\Phi_{YX}(X,Y)\dot X
+\frac{\dot\tau}{\tau}\nabla_Y\Phi(X,Y)=0.
\]
Therefore the vector
\[
\binom{\dot\tau/\tau}{\dot X}
\]
belongs to the kernel of the matrix in \((\mathrm{ND})\), and hence \(\dot X=0\) and \(\dot\tau=0\).
Thus
\[
\ker d\pi_R=\{0\}.
\]
Since
\[
\dim C_r=\dim T^*V=2md,
\]
the differential \(d\pi_R\) is invertible, and the [inverse function theorem](inverse_function_theorem_for_smooth_manifolds/inverse_function_theorem_for_smooth_manifolds.md "why") shows that \(\pi_R\) is a local diffeomorphism.
The same argument, with \(X\) and \(Y\) interchanged, shows that \(d\pi_L\) is also invertible, so \(\pi_L\) is a local diffeomorphism as well.
Thus \(C_r\) is locally a canonical graph.

Choose \(\chi\in C_c^\infty(U\times V)\) such that \(\chi=1\) on a neighborhood of \(A\times B\).
For \(r\in\mathbb R\), define the localized generalized Radon transform
\[
T_r^\chi f(X)
:=
\int_{\{Y\in V:\Phi(X,Y)=r\}}
f(Y)\chi(X,Y)\,d\sigma_{X,r}(Y),
\]
where \(d\sigma_{X,r}\) is the induced hypersurface measure.
The local canonical graph property gives, for every \(s\in\mathbb R\),
\[
\|T_r^\chi f\|_{H^{s+(md-1)/2}(U)}
\lesssim
\|f\|_{H^s(V)},
\tag{SM}
\]
locally uniformly in \(r\) ([Sobolev Smoothing for the Generalized Radon Transform](sobolev_smoothing_for_generalized_radon_transforms/sobolev_smoothing_for_generalized_radon_transforms.md "why")).
In other words, \(T_r^\chi\) gains \((md-1)/2\) derivatives.
The [two-set configuration theorem](two_set_configuration_theorem/two_set_configuration_theorem.md "why"), with scalar output and smoothing order \((md-1)/2\), applied using \((\mathrm{SM})\), gives nonempty interior whenever
\[
\dim_HA+\dim_HB
>
2md-2\left(\frac{md-1}{2}\right)
=md+1.
\]
This is precisely \((\mathrm{DIM})\), and therefore \(\operatorname{int}\Phi(A,B)\ne\varnothing\).
\(\square\)
