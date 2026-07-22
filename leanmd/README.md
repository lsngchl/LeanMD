# LeanMD 문서 집합 형식

LeanMD 문서 집합은 증명 DAG의 논리적 깊이와 파일시스템의 물리적 깊이를 분리한다.
진입 문서는 문서 집합 최상위의 `root.md`에 두고, 나머지 작성 문서는 `nodes/` 바로 아래에 두며, 증명 관계는 Markdown의 `why` 링크와 여기서 생성되는 `.leanmd/dependencies.json`으로 표현한다.

## 작업 공간 구성요소

`AGENTS.md`, `README.md`, `STYLE.md`는 LeanMD 문서 작업 공간의 규칙과 형식을 정의하는 구성요소이므로 함께 유지한다.
새 작업 공간을 만들 때 이 세 파일을 함께 복사하고, 문서 집합의 구조 검사에는 `validate-why-dag.js`를 사용한다.

## Markdown 문서와 링크

증명 내용은 Markdown 문서에 작성한다.
산문의 한 문장은 Markdown 소스의 한 줄에 쓰고, 문단은 빈 줄로 구분하며, 표시 수식은 별도 줄에 둔다.

링크의 title로 LeanMD에서의 역할을 지정한다.

```md
[근거 문서](./nodes/supporting_argument.md "why")
[정의 또는 문맥](../root.md "recall")
```

- `why` 링크는 현재 문서에서 대상 문서로 향하는 증명 의존성이다.
- `recall` 링크는 정의나 문맥을 다시 확인하기 위한 탐색 링크이며 증명 의존성에 포함되지 않는다.
- title이 없는 링크는 일반 Markdown 링크로 취급한다.

모든 `why` 링크는 하나의 루트를 가지며 순환이 없고 모든 문서가 루트에서 도달 가능한 DAG를 이루어야 한다.

## 평면 문서 구조

```text
document_set/
├─ root.md
├─ .leanmd/
│  └─ dependencies.json
└─ nodes/
   ├─ supporting_argument.md
   └─ shared_lemma.md
```

- 문서 집합의 진입점은 최상위의 `root.md`로 고정한다.
- 루트를 제외한 모든 작성 문서는 `nodes/` 바로 아래에 두고 하위 디렉터리를 만들지 않는다.
- `nodes/`의 모든 문서 파일명은 문서 집합 안에서 고유한 소문자 ASCII slug여야 한다.
- 문서의 표시 제목은 파일명이 아니라 첫 번째 `#` 제목으로 정한다.
- `why`와 `recall`은 표준 Markdown 상대 링크를 사용한다.
- 논리적 증명 깊이는 폴더 깊이에 영향을 주지 않는다.

## 생성 메타데이터와 앱 상태

작성자는 Markdown 본문과 그 안의 링크만 직접 편집한다.
`validate-why-dag.js --write`는 모든 Markdown의 `why` 링크를 직접 읽어 `.leanmd/dependencies.json` 하나를 생성하거나 갱신한다.

LeanMD 앱은 다음 상태 파일을 관리한다.

- `<document>.unresolved`
- `.leanmd/current-context.json`
- `.leanmd/exploration-map.json`

이 상태 파일들은 의존성 DAG를 구성하는 입력으로 사용하지 않는다.

## 검증

문서 집합을 검증하려면 작업 공간 루트에서 다음 명령을 실행한다.

```sh
node validate-why-dag.js path/to/document_set
```

Markdown 링크에서 manifest를 생성하거나 갱신한 뒤 검증하려면 `--write`를 사용한다.

```sh
node validate-why-dag.js path/to/document_set --write
```

Validator는 고정된 `root.md` 진입점, acyclic `why` graph, 전체 도달 가능성, 평면 `nodes/` 구조, 문서별 경로 길이 예산을 검사한다.
