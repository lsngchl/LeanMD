# LeanMD 문서 집합 형식

이 문서는 LeanMD 문서 집합의 링크 형식, 저장 구조, 생성 메타데이터와 검증 방법을 설명한다.
에이전트 작업 규칙은 [AGENTS.md](AGENTS.md), 수학 문서 작성 원칙은 [STYLE.md](STYLE.md)를 따른다.

## 1. Markdown 문서와 링크

증명 내용은 Markdown 문서에 작성한다.
산문의 한 문장은 Markdown 소스의 한 줄에 쓰고, 문단은 빈 줄로 구분하며, 표시 수식은 별도 줄에 둔다.

링크의 title로 LeanMD에서의 역할을 지정한다.

```md
[근거 문서](target.md "why")
[정의 또는 문맥](target.md "recall")
```

- `why` 링크는 현재 문서에서 대상 문서로 향하는 증명 의존성이다.
- `recall` 링크는 정의나 문맥을 다시 확인하기 위한 탐색 링크이며 증명 의존성에 포함되지 않는다.
- title이 없는 링크는 일반 Markdown 링크로 취급한다.

모든 `why` 링크는 하나의 루트를 가지며 순환이 없고 모든 문서가 루트에서 도달 가능한 DAG를 이루어야 한다.

## 2. Canonical 폴더 트리

문서 집합의 최상위 폴더에는 루트 Markdown 문서를 둔다.
비루트 문서는 canonical `why` 부모 아래에서 자신과 같은 이름의 폴더 안에 둔다.

```text
document_set/
├─ root_theorem.md
└─ child_argument/
   └─ child_argument.md
```

여러 부모가 같은 문서를 `why`로 사용하는 경우 Markdown 문서는 canonical 위치에 한 번만 저장한다.
다른 부모 아래의 대응 폴더에는 validator가 `shortcut.leanmd.json`을 생성한다.
내용을 복제하거나 OS symlink, hard link 또는 `.lnk` 파일을 사용하지 않는다.

## 3. 생성 메타데이터

작성자는 Markdown 본문과 그 안의 링크만 직접 편집한다.

`validate-why-dag.js --write`가 다음 파일을 Markdown의 `why` 링크에서 생성하거나 갱신한다.

- `<document>.md.leanmd.json`
- `shortcut.leanmd.json`
- `.leanmd/dependencies.json`

LeanMD 앱은 다음 상태 파일을 관리한다.

- `<document>.unresolved`
- `.leanmd/current-context.json`
- `.leanmd/exploration-map.json`

이 메타데이터 파일들은 직접 편집하지 않는다.

## 4. 검증

현재 문서 집합을 검증하려면 다음 명령을 실행한다.

```sh
node validate-why-dag.js path/to/document_set
```

Markdown의 `why` 링크를 기준으로 생성 메타데이터를 갱신한 뒤 검증하려면 `--write`를 사용한다.

```sh
node validate-why-dag.js path/to/document_set --write
```

Validator는 canonical 폴더 구조, shortcut과 sidecar의 일치, 하나의 루트를 가진 acyclic `why` graph, 그리고 모든 문서의 도달 가능성을 확인한다.
