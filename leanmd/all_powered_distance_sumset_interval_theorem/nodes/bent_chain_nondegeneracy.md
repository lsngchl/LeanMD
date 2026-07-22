# Nondegeneracy at a Bent Chain

## Proposition

Let \(d\ge2\) and \(m\ge2\), and let
\[
\Phi_{1,m}(x,y)
:=
\sum_{i=1}^m|x_i-y_i|
+
\sum_{i=1}^{m-1}|x_{i+1}-y_i|,
\]
where \(x=(x_1,\ldots,x_m)\) and \(y=(y_1,\ldots,y_m)\).
Let
\[
z_1^0,z_2^0,\ldots,z_{2m}^0\in\mathbb R^d
\]
satisfy the following conditions:

1. every edge \(z_{j+1}^0-z_j^0\) is nonzero;
2. all vertices lie in an affine two-plane;
3. the directions of \(z_j^0-z_{j-1}^0\) and \(z_{j+1}^0-z_j^0\) are not parallel for \(2\le j\le2m-1\).

Write
\[
x_i^0:=z_{2i-1}^0,
\qquad
y_i^0:=z_{2i}^0,
\qquad 1\le i\le m,
\]
and define \(x^0=(x_1^0,\ldots,x_m^0)\) and \(y^0=(y_1^0,\ldots,y_m^0)\).
Then
\[
\det
\begin{pmatrix}
0 & \nabla_x\Phi_{1,m}(x^0,y^0)^T\\
\nabla_y\Phi_{1,m}(x^0,y^0) & (\Phi_{1,m})_{yx}(x^0,y^0)
\end{pmatrix}
\ne0.
\]

The key linear-algebra input is that the mixed Hessian has rank \(md-1\), with its right and left kernels supported in the first and last endpoint directions, respectively ([Kernel of the Bent-Chain Mixed Hessian](./bent_chain_mixed_hessian_kernel.md "why")).
