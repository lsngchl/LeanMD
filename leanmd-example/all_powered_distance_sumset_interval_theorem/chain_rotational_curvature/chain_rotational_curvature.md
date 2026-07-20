# Rotational Curvature of the Alternating Chain Phase

## Proposition

Let \(m\ge2\), let \(d\ge1\) be an integer, let \(a>0\), and assume that \((a,d)\ne(1,1)\).
Let \(\mu\) be a compactly supported \(t\)-Frostman probability measure on \(\mathbb R^d\), where
\[
t>\frac d2+\frac1{2m}.
\]
For \(X=(x_1,\ldots,x_m)\) and \(Y=(y_1,\ldots,y_m)\), define
\[
\Phi_{a,m}(X,Y)
=
\sum_{i=1}^m|x_i-y_i|^a
+
\sum_{i=1}^{m-1}|x_{i+1}-y_i|^a.
\]
Then there exist points
\[
p_1,\ldots,p_m,q_1,\ldots,q_m\in\operatorname{spt}\mu
\]
and open neighborhoods \(U_i\) of \(p_i\) and \(V_i\) of \(q_i\) such that, with
\[
U:=U_1\times\cdots\times U_m,
\qquad
V:=V_1\times\cdots\times V_m,
\]
the phase \(\Phi_{a,m}\) is smooth on \(U\times V\) and
\[
\det
\begin{pmatrix}
0 & \nabla_X\Phi_{a,m}(X,Y)^T\\
\nabla_Y\Phi_{a,m}(X,Y) & (\Phi_{a,m})_{YX}(X,Y)
\end{pmatrix}
\ne0,\qquad (X,Y)\in U\times V.
\tag{ND}
\]

## Proof

For \(z\in\mathbb R^d\setminus\{0\}\), put
\[
h_a(z):=|z|^a,
\qquad
g_a(z):=\nabla h_a(z)=a|z|^{a-2}z,
\]
and
\[
A_a(z):=\nabla^2h_a(z)
=a|z|^{a-2}I_d+a(a-2)|z|^{a-4}zz^T.
\]
If \(u=z/|z|\), then the radial eigenvalue of \(A_a(z)\) is \(a(a-1)|z|^{a-2}\), while every tangential eigenvalue is \(a|z|^{a-2}\).
Thus \(A_a(z)\) is invertible when \(a\ne1\), whereas
\[
A_1(z)=\frac1{|z|}(I_d-u\otimes u),
\qquad
\ker A_1(z)=\mathbb Ru.
\]

Introduce the alternating vertices
\[
z_{2i-1}:=x_i,
\qquad
z_{2i}:=y_i,
\qquad 1\le i\le m,
\]
and, whenever every consecutive pair is distinct, set
\[
e_j:=z_{j+1}-z_j,
\qquad
A_j:=A_a(e_j),
\qquad 1\le j\le2m-1.
\]
For \(H:=(\Phi_{a,m})_{YX}\), the only nonzero \(d\times d\) blocks are
\[
H_{i,i}=-A_{2i-1},
\qquad 1\le i\le m,
\]
and
\[
H_{i,i+1}=-A_{2i},
\qquad 1\le i\le m-1.
\]
Consequently,
\[
H
=-
\begin{pmatrix}
A_1&A_2&&&\\
&A_3&A_4&&\\
&&\ddots&\ddots&\\
&&&A_{2m-3}&A_{2m-2}\\
&&&&A_{2m-1}
\end{pmatrix}.
\]

### The case \(a\ne1\)

Since \(t>0\), the Frostman estimate implies that \(\operatorname{spt}\mu\) contains two distinct points \(p\) and \(q\).
Set
\[
p_i:=p,
\qquad
q_i:=q,
\qquad 1\le i\le m.
\]
Define
\[
X^0:=(p_1,\ldots,p_m),
\qquad
Y^0:=(q_1,\ldots,q_m).
\]
At this straight chain, the bordered matrix in \((\mathrm{ND})\) is invertible ([Nondegeneracy at a Straight Chain](straight_chain_nondegeneracy/straight_chain_nondegeneracy.md "why")).
Every edge at the straight chain is nonzero, so \(\Phi_{a,m}\) is smooth near the corresponding point \((X^0,Y^0)\).
The determinant in \((\mathrm{ND})\) is continuous and nonzero at \((X^0,Y^0)\).
Hence there are coordinate neighborhoods \(U_i\) of \(p_i\) and \(V_i\) of \(q_i\) on whose product the phase is smooth and the determinant remains nonzero.

### The case \(a=1\)

The excluded pair \((a,d)=(1,1)\) gives \(d\ge2\), and the assumption on \(t\) gives \(t>1\).
The Frostman estimate yields
\[
\dim_H(\operatorname{spt}\mu)\ge t>1,
\]
so \(\operatorname{spt}\mu\) is not contained in an affine line.
Choose noncollinear points \(p,q,r\in\operatorname{spt}\mu\), and define
\[
z_j^0
=
\begin{cases}
p,&j\equiv1\pmod3,\\
q,&j\equiv2\pmod3,\\
r,&j\equiv0\pmod3.
\end{cases}
\]
Set
\[
p_i:=z_{2i-1}^0,
\qquad
q_i:=z_{2i}^0,
\qquad 1\le i\le m.
\]
Define
\[
X^0:=(p_1,\ldots,p_m),
\qquad
Y^0:=(q_1,\ldots,q_m).
\]
Every edge of this chain is nonzero, and the two edges meeting at any internal vertex have nonparallel directions.
At this bent chain, the bordered matrix in \((\mathrm{ND})\) is invertible ([Nondegeneracy at a Bent Chain](bent_chain_nondegeneracy/bent_chain_nondegeneracy.md "why")).
As in the first case, smoothness and continuity give coordinate neighborhoods \(U_i\) of \(p_i\) and \(V_i\) of \(q_i\) on whose product \((\mathrm{ND})\) holds.

This proves the proposition. \(\square\)
