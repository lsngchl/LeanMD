# 닫힌 구간 위 연속함수의 두 가지 결과

실수 \(a,b\)가 \(a\le b\)를 만족하고 함수

\[
f:[a,b]\longrightarrow\mathbb{R}
\]

가 연속이라고 하자. 여기서 연속이라는 것은 모든 \(x\in[a,b]\)와
\(\varepsilon>0\)에 대하여 적당한 \(\delta>0\)가 존재해서

\[
y\in[a,b],\quad |x-y|<\delta
\quad\Longrightarrow\quad
|f(x)-f(y)|<\varepsilon
\]

가 성립한다는 뜻이다.

함수 \(f\)가 **유계**라는 것은 어떤 \(M\ge 0\)가 존재하여 모든
\(x\in[a,b]\)에 대해 \(|f(x)|\le M\)이 된다는 뜻이다. 한편 \(f\)가
**균등연속**이라는 것은 모든 \(\varepsilon>0\)에 대하여 하나의
\(\delta>0\)를 선택할 수 있고, 그 \(\delta\)가 구간 안의 모든
\(x,y\)에 동시에 적용된다는 뜻이다.

우리가 보일 것은 다음 두 결론이다.

1. \(f\)는 \([a,b]\)에서 유계이다 ([연속함수의 유계성 논증](./boundedness_argument/boundedness_argument.md "why")).
2. \(f\)는 \([a,b]\)에서 균등연속이다 ([연속함수의 균등연속성 논증](./uniform_continuity_argument/uniform_continuity_argument.md "why")).
