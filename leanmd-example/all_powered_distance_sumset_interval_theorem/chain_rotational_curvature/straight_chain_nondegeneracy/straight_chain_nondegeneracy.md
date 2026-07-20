# Nondegeneracy at a Straight Chain

## Proposition

Let \(m\ge2\), let \(d\ge1\) be an integer, let \(a>0\) with \(a\ne1\), and let \(p,q\in\mathbb R^d\) be distinct.
For \(X=(x_1,\ldots,x_m)\) and \(Y=(y_1,\ldots,y_m)\), define
\[
\Phi_{a,m}(X,Y)
=
\sum_{i=1}^m|x_i-y_i|^a
+
\sum_{i=1}^{m-1}|x_{i+1}-y_i|^a.
\]
For
\[
x_i^0:=p,
\qquad
y_i^0:=q,
\qquad 1\le i\le m,
\]
define \(X^0=(x_1^0,\ldots,x_m^0)\) and \(Y^0=(y_1^0,\ldots,y_m^0)\).
Then
\[
\det
\begin{pmatrix}
0 & \nabla_X\Phi_{a,m}(X^0,Y^0)^T\\
\nabla_Y\Phi_{a,m}(X^0,Y^0) & (\Phi_{a,m})_{YX}(X^0,Y^0)
\end{pmatrix}
\ne0.
\]
