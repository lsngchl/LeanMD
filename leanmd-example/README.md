# LeanMD 수학 증명 문서 작성 원칙

이 문서는 수학 증명을 구조화된 LeanMD Markdown 문서 집합으로 작성할 때 따르는 공통 원칙을 기록한다.

## 1. 두 링크 역할

Markdown 링크의 title에 `why` 또는 `recall`을 기록한다.
링크의 역할은 대상 문서의 종류가 아니라 **독자가 링크를 누르는 이유**로 정한다.

| 링크 역할 | 독자의 질문 | 의미 | DAG 포함 여부 |
|---|---|---|---|
| `why` | “왜 이것이 성립하지?” | 현재 내용을 더 자세한 논증으로 풀어낸다. | 포함 |
| `recall` | “이게 뭐였더라?” | 이미 나온 정의, 표기 또는 가정을 다시 확인한다. | 제외 |

### `why`: 왜 이것이 성립하는가?

`why` 링크의 대상은 현재 문서에서 말한 주장이나 논증을 더 자세히
설명한다. 간선은 추상적인 상위 논증에서 그것을 뒷받침하는 구체적인 하위
논증으로 향한다.

다음과 같은 경우 `why`를 사용한다.

- 현재 문서가 결론만 말하고 대상 문서에 자세한 증명을 맡긴다.
- 계산이나 경우 나누기를 별도 문서에서 전개한다.
- 보조정리의 내용이 현재 단계가 성립하는 이유를 제공한다.
- 같은 보조정리를 여러 논증이 각자의 근거로 사용한다.

대상 문서가 앞에 있는지 뒤에 있는지는 역할을 결정하지 않는다. 이미 앞에서
증명한 보조정리를 다시 사용하더라도, 그 결과가 현재 단계의 근거라면
`why`이다.

모든 `why` 링크를 모으면 다음 조건을 만족하는 DAG가 된다.

- 루트가 하나다.
- 순환이 없다.
- 문서가 자기 자신을 `why`로 가리키지 않는다.
- 모든 증명 문서가 루트에서 도달 가능하다.

### `recall`: 이것이 무엇이었는가?

`recall` 링크는 현재 논증을 더 증명하지 않는다. 독자가 이미 등장한 정의,
표기, 가정 또는 문맥을 잊었을 때 원래 설명으로 돌아가 확인하게 한다.

다음과 같은 경우 `recall`을 사용한다.

- 대상 문서에서 실제로 정의하거나 명시한 정의와 가정을 다시 보여 준다.
- 기호가 처음 도입된 곳을 찾아가게 한다.
- 현재 문장을 이해하는 데 필요한 설명이 대상 문서에 있을 때 그 설명을 다시 확인하게 한다.

같은 기호나 구간이 앞 문서에 등장했다는 이유만으로 `recall`을 붙이지 않는다.
대상 문서에 다시 읽을 정의, 가정 또는 설명이 실제로 있어야 한다.

`recall` 링크는 하위 문서에서 상위 문서로 향해도 되고 서로 순환해도 된다.
이는 탐색 관계일 뿐이므로 다음 항목에 영향을 주지 않는다.

- DAG의 순환 검사와 루트 판정
- 문서의 진입 차수
- canonical 부모와 공유 문서 판정
- 문서별 sidecar
- 전체 `.leanmd/dependencies.json`

### 빠른 판별법

링크를 따라갔을 때 독자가 얻게 되는 답을 기준으로 판단한다.

- “이 단계가 성립하는 이유는 이것이다”라는 답이면 `why`이다.
- “이 말의 뜻과 문맥은 앞에서 이렇게 정했다”라는 답이면 `recall`이다.

정리 링크라고 항상 `why`인 것도 아니고, 정의 링크라고 무조건 `recall`인
것도 아니다. 링크가 현재 문장에서 맡는 역할이 기준이다. 한 링크가 두
기능을 동시에 수행하는 것처럼 보이면 문장을 나누어 주된 질문이 드러나게
작성한다.

## 2. Markdown 본문 작성

Markdown 본문에는 사람이 읽을 수 있는 자연스러운 수학 글을 작성한다.
의존성 목록이나 기계용 머리말을 본문에 삽입하지 않는다.

### 문장과 줄

증명 본문의 산문은 **한 문장을 Markdown 소스의 한 줄에 쓴다**.
편집기 폭에 맞추기 위한 임의 줄바꿈으로 한 문장을 여러 소스 줄에 나누지 않는다.
문단은 빈 줄로 구분하고, 표시 수식은 별도 줄에 둔다.
이 규칙을 따르면 LeanMD에서 선택한 문구와 원본 문장을 쉽게 대응시킬 수 있다.

### 링크를 문장에 넣는 방식

`why` 링크는 별도의 보조정리 목록이나 인용 블록을 만들지 않고, 설명이 필요한 주장 바로 뒤에 괄호로 붙인다.
링크 문구에는 대상 문서의 실제 제목 전체를 사용하고, 마침표는 닫는 괄호 뒤에 쓴다.

```md
수렴하는 실수열은 유계이다 ([수렴하는 실수열의 유계성](convergent_sequence_is_bounded/convergent_sequence_is_bounded.md "why")).
```

`See`나 `Lemma` 같은 표지를 링크 앞에 덧붙이지 않는다.
수학 본문과 링크 문구에서 `루트 문서`, `상위 문서`, `앞 문서`처럼 파일 구조를 설명하는 메타 표현을 사용하지 않는다.
`recall` 링크도 파일 위치가 아니라 다시 확인할 정의나 내용의 이름을 링크 문구로 사용한다.

```md
[균등연속성의 정의](../continuous_interval_consequences.md "recall")를 부정해 보자.
```

### 문서의 역할

각 문서는 다음 중 하나처럼 하나의 명확한 설명 책임을 맡는다.

- 하나의 정리 또는 보조정리
- 전체 증명의 한 논증 분기
- 상위 문서에서 분리할 가치가 있는 긴 계산
- 여러 문서가 이유로 사용할 수 있는 독립적인 명제

상위 문서는 전체 논리의 윤곽을 설명하고, “왜?”에 대한 상세한 답은 `why`
링크로 하위 문서에 위임한다.

## 3. 실제 폴더는 canonical 트리

`why` 관계 전체는 DAG지만, 한 문서는 파일 시스템에서 한 곳에만 저장한다.
각 문서에 `why` 부모가 여러 개라면 그중 하나만 canonical 부모로 선택한다.
실제 폴더는 이 canonical 부모 관계를 나타내는 트리다.

각 문서 집합의 최상위 폴더는 루트 Markdown 문서의 폴더 역할을 한다. 비루트
문서는 자신과 같은 이름의 폴더 안에 둔다.

```text
document_set/
├─ root_theorem.md
├─ root_theorem.md.leanmd.json
└─ child_argument/
   ├─ child_argument.md
   └─ child_argument.md.leanmd.json
```

`index.md`처럼 모든 노드에서 같은 파일명을 반복하지 않는다. 파일명은
LeanMD 지도에서 해당 문서를 구분할 수 있어야 한다.

폴더를 `arguments/`, `lemmas/`, `shared/`처럼 문서 종류별로 분류하지 않는다.
폴더의 위치는 문서 종류가 아니라 canonical `why` 부모 관계를 나타낸다.

## 4. canonical 자식과 공유 자식

새 `why` 자식이 처음 등장하면, 그것을 처음 사용하는 부모의 하위 폴더에
canonical Markdown 문서를 만든다.

```text
first_argument/
├─ first_argument.md
└─ common_lemma/
   ├─ common_lemma.md
   └─ common_lemma.md.leanmd.json
```

다른 부모가 같은 문서를 `why`로 사용하더라도 내용을 복제하거나 `shared/`로
옮기지 않는다. canonical 경로를 그대로 유지하고 두 번째 부모 쪽에는 같은
자식 이름의 폴더와 바로가기만 만든다.

```text
second_argument/
├─ second_argument.md
└─ common_lemma/
   └─ shortcut.leanmd.json
```

바로가기는 두 번째 `why` 간선의 source와 canonical target을 기록한다.

```json
{
  "kind": "why-shortcut",
  "source": "second_argument/second_argument.md",
  "target": "first_argument/common_lemma/common_lemma.md"
}
```

두 번째 부모의 Markdown 링크도 canonical Markdown 파일을 직접 가리킨다.
바로가기는 내용을 복제하지 않고 폴더 트리에서 공유 자식의 위치를 표시하는
LeanMD 메타데이터다.

OS 전용 `.lnk`, 심볼릭 링크 또는 하드 링크는 사용하지 않는다. canonical
위치는 수학적 우선순위나 전용 소유권을 뜻하지 않고, 최초 작성 위치를
안정적으로 유지하기 위한 저장 위치일 뿐이다.

## 5. 문서별 `why` sidecar

각 Markdown 문서 바로 옆에 `<document>.md.leanmd.json` 파일을 둔다.

```text
child_argument.md
child_argument.md.leanmd.json
```

sidecar에는 해당 문서에서 나가는 `why` 링크의 canonical 대상만 문서 집합 루트
기준 경로로 기록한다.

```json
{
  "document": "child_argument/child_argument.md",
  "whyLinks": [
    "child_argument/detail/detail.md"
  ]
}
```

`why` 자식이 없는 leaf 문서는 빈 배열을 기록한다.

```json
{
  "document": "child_argument/detail/detail.md",
  "whyLinks": []
}
```

`recall` 링크는 sidecar에 기록하지 않는다.

## 6. 전체 `why` DAG

각 문서 집합의 전체 `why` DAG는 다음 파일에 기록한다.

```text
.leanmd/dependencies.json
```

이 파일은 모든 문서별 `whyLinks`를 간선 목록으로 취합한 결과다.

```json
{
  "root": "root_theorem.md",
  "edges": [
    {
      "from": "root_theorem.md",
      "to": "child_argument/child_argument.md",
      "kind": "why"
    }
  ]
}
```

`recall` 링크는 이 파일에도 기록하지 않는다.

## 7. 작성 순서

새로운 증명 문서 집합은 다음 순서로 작성한다.

1. 루트 명제와 전체 논리의 개요를 루트 Markdown에 작성한다.
2. “왜 성립하는가?”를 별도로 설명할 부분을 `why` 링크로 분리한다.
3. 새 `why` 자식을 부모의 같은 이름 하위 폴더에 작성한다.
4. 각 Markdown 옆에 `why` 전용 sidecar를 작성한다.
5. 기존 문서를 두 번째 부모가 사용하면 복사하지 않고 바로가기를 추가한다.
6. 정의나 문맥을 다시 확인하는 링크에는 `recall`을 붙인다.
7. 전체 `.leanmd/dependencies.json`을 생성한다.
8. 검증기를 실행하여 폴더 트리와 `why` DAG가 일치하는지 확인한다.

## 8. 검증

문서 집합을 검사하려면 이 README와 같은 폴더에 있는 검증기에 대상 문서 집합의 경로를 지정한다.

```sh
node validate-why-dag.js path/to/document_set
```

Markdown의 `why` 링크를 기준으로 문서별 sidecar, 바로가기 및 전체 manifest를
갱신하려면 `--write`를 사용한다.

```sh
node validate-why-dag.js path/to/document_set --write
```

검증기는 다음 사항을 확인한다.

- 모든 비루트 문서가 자신과 같은 이름의 폴더에 있는가
- 각 비루트 문서에 canonical `why` 부모가 정확히 하나 있는가
- 추가 `why` 부모마다 올바른 `shortcut.leanmd.json`이 있는가
- Markdown의 `why` 링크와 문서별 sidecar가 일치하는가
- 전체 manifest가 모든 `why` 간선을 정확히 취합하는가
- `why` 그래프가 하나의 루트를 가진 DAG인가
- 모든 증명 문서가 루트에서 도달 가능한가
- `recall` 링크가 DAG 메타데이터에 섞이지 않았는가
