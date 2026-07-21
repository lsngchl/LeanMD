# 연속함수의 균등연속성 논증

[균등연속성의 정의](../continuous_interval_consequences.md "recall")를
부정해 보자. 그러면 어떤 \(\varepsilon_0>0\)가 존재하여, 아무리 작은
\(\delta>0\)를 주더라도 다음을 만족하는 \(x,y\in[a,b]\)를 찾을 수 있다.

\[
|x-y|<\delta,
\qquad
|f(x)-f(y)|\ge\varepsilon_0.
\]

각 자연수 \(n\ge1\)에 대해 \(\delta=1/n\)을 대입하여 점
\(x_n,y_n\in[a,b]\)를 선택하면

\[
|x_n-y_n|<\frac1n,
\qquad
|f(x_n)-f(y_n)|\ge\varepsilon_0
\]

이다. 수열 \((x_n)\)은 닫힌 구간에 있으므로 어떤 부분수열
\((x_{n_k})\)가 구간 안의 점 \(x\)로 수렴한다
([닫힌 구간에서 수렴 부분수열의 존재](../boundedness_argument/bolzano_weierstrass_subsequence/bolzano_weierstrass_subsequence.md "why")).

또한 \(|x_{n_k}-y_{n_k}|<1/n_k\to0\)이므로
\(y_{n_k}\to x\)이다
([서로 가까워지는 두 수열의 공통 극한](nearby_sequences_share_limit/nearby_sequences_share_limit.md "why")).
두 수열에 연속성을 적용하면

\[
f(x_{n_k})\longrightarrow f(x),
\qquad
f(y_{n_k})\longrightarrow f(x)
\]

를 얻는다
([연속성의 수열 판정](../boundedness_argument/sequential_continuity/sequential_continuity.md "why")).
따라서

\[
|f(x_{n_k})-f(y_{n_k})|\longrightarrow0.
\]

이는 모든 \(k\)에 대해 그 값이 \(\varepsilon_0\) 이상이라는 선택과
모순이다. 그러므로 \(f\)는 \([a,b]\)에서 균등연속이다.
