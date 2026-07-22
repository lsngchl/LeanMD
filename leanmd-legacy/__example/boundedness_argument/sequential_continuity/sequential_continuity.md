# 연속성의 수열 판정

함수 \(f:[a,b]\to\mathbb{R}\)가 [연속](../../continuous_interval_consequences.md "recall")이고 수열 \((x_n)\)이 \([a,b]\) 안에서 \(x\in[a,b]\)로 수렴하면

\[
f(x_n)\longrightarrow f(x)
\]

이다.

실제로 \(\varepsilon>0\)을 주자.
\(f\)가 \(x\)에서 연속이므로 어떤 \(\delta>0\)가 존재하여

\[
|y-x|<\delta
\quad\Longrightarrow\quad
|f(y)-f(x)|<\varepsilon
\]

이다.
한편 \(x_n\to x\)이므로 충분히 큰 모든 \(n\)에 대해 \(|x_n-x|<\delta\)이다.
따라서 충분히 큰 모든 \(n\)에 대해 \(|f(x_n)-f(x)|<\varepsilon\)이고, 원하는 수렴이 성립한다.
