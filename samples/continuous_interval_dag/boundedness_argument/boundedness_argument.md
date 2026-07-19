# 연속함수의 유계성 논증

[루트 문서에서 정한 유계성의 정의](../continuous_interval_consequences.md "reference")에
반하여 \(f\)가 유계가 아니라고 가정하자. 그러면 각 자연수 \(n\ge1\)에
대하여

\[
|f(x_n)|\ge n
\]

을 만족하는 점 \(x_n\in[a,b]\)를 선택할 수 있다.

[닫힌 구간의 부분수열 보조정리](bolzano_weierstrass_subsequence/bolzano_weierstrass_subsequence.md "proof")에
따라 어떤 증가하는 자연수열 \((n_k)\)와 점 \(x\in[a,b]\)가 존재하여

\[
x_{n_k}\longrightarrow x
\]

가 된다. 이제 [연속성의 수열 판정](sequential_continuity/sequential_continuity.md "proof")을
적용하면 \(f(x_{n_k})\to f(x)\)이다. 수렴하는 실수열은 유계이므로
\((f(x_{n_k}))\)도 유계여야 한다.

그러나 선택 방법에 의해

\[
|f(x_{n_k})|\ge n_k\ge k
\]

이다. 이는 부분수열의 함수값이 유계라는 결론과 모순이다. 따라서 \(f\)는
\([a,b]\)에서 유계이다.
