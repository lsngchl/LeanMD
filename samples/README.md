# LeanMD 수학 증명 샘플 작성 원칙

이 문서는 `samples/` 아래에서 수학 증명을 LeanMD용 Markdown 문서 집합으로
구조화할 때 따르는 공통 원칙을 기록한다.

핵심 구조는 다음 한 문장으로 요약된다.

> 수학적 구조는 proof DAG로 관리하고, 실제 폴더는 그 DAG에서 각 문서의
> canonical 부모 하나만 선택한 트리로 만들며, 나머지 부모 관계는
> `shortcut.leanmd.json`으로 표현한다.

## 1. Markdown 문서의 역할

Markdown 본문에는 사람이 읽을 수 있는 자연스러운 수학 글을 작성한다.
의존성 목록이나 기계용 머리말을 본문에 삽입하지 않는다.

각 문서는 다음 중 하나처럼 하나의 명확한 증명 책임을 맡는다.

- 하나의 정리 또는 보조정리
- 전체 증명의 한 논증 분기
- 상위 문서에서 분리할 가치가 있는 긴 계산
- 다른 문서가 결과로 사용할 수 있는 독립적인 명제

상위 문서는 전체 논리의 윤곽을 설명하고, 자세한 증명은 하위 문서에
위임한다.

## 2. `proof`와 `reference` 링크

Markdown 링크의 title로 링크 역할을 표시한다.

```md
[자세한 하위 증명](./child/child.md "proof")
[앞에서 정한 정의](../parent.md "reference")
```

### `proof`

`proof` 링크는 대상 문서가 현재 문서의 증명 의무를 해결한다는 뜻이다.
간선 방향은 추상적인 상위 논증에서 구체적인 하위 증명으로 향한다.

`proof` 링크만 모아서 다음 조건을 만족하는 DAG를 만든다.

- 루트가 하나다.
- 순환이 없다.
- 자기 자신을 proof로 참조하지 않는다.
- 모든 증명 문서는 루트에서 도달 가능하다.

### `reference`

`reference` 링크는 이미 등장한 정의, 표기 또는 문맥을 다시 확인하기 위한
독자용 탐색 링크다. 하위 문서에서 상위 문서로 향해도 된다.

`reference`는 proof DAG의 일부가 아니며 다음 항목에 영향을 주지 않는다.

- 순환 검사와 루트 판정
- 문서의 진입 차수
- canonical 부모와 공유 여부
- 문서별 sidecar
- 전체 `.leanmd/dependencies.json`

따라서 DAG 관련 JSON 파일에는 proof 정보만 기록한다.

## 3. 한 문서에 한 폴더

각 샘플의 최상위 폴더는 루트 Markdown 문서의 폴더 역할을 한다. 비루트
문서는 자신과 같은 이름의 폴더 안에 둔다.

```text
sample_name/
├─ root_theorem.md
├─ root_theorem.md.leanmd.json
└─ child_argument/
   ├─ child_argument.md
   └─ child_argument.md.leanmd.json
```

`index.md`처럼 모든 노드에서 같은 파일명을 반복하지 않는다. 파일명은
LeanMD 지도에서 해당 문서를 구분할 수 있어야 한다.

폴더는 `arguments/`, `lemmas/`, `shared/` 같은 문서 종류별 분류가 아니라
canonical proof 부모 관계를 나타낸다.

## 4. canonical 자식과 공유 자식

새 proof 자식이 처음 등장하면 그것을 처음 사용하는 부모의 하위 폴더에
canonical Markdown 문서를 만든다.

```text
first_argument/
├─ first_argument.md
└─ common_lemma/
   ├─ common_lemma.md
   └─ common_lemma.md.leanmd.json
```

나중에 다른 부모가 같은 결과를 사용하더라도 문서를 복제하거나
`shared/`로 이동하지 않는다. 최초 canonical 경로를 그대로 유지하고 두
번째 부모 쪽에는 같은 자식 이름의 폴더와 바로가기만 만든다.

```text
second_argument/
├─ second_argument.md
└─ common_lemma/
   └─ shortcut.leanmd.json
```

바로가기는 다음처럼 proof 간선의 source와 canonical target을 기록한다.

```json
{
  "kind": "proof-shortcut",
  "source": "second_argument/second_argument.md",
  "target": "first_argument/common_lemma/common_lemma.md"
}
```

두 번째 부모의 Markdown `proof` 링크도 canonical Markdown 파일을 직접
가리킨다. 바로가기는 내용을 복제하지 않고 폴더 트리에서 공유 자식의
위치를 표시하기 위한 LeanMD 메타데이터다.

OS 전용 `.lnk`, 심볼릭 링크 또는 하드 링크는 사용하지 않는다.

canonical 위치는 수학적 우선순위나 전용 소유권을 뜻하지 않는다. 최초
작성 위치를 안정적으로 유지하기 위한 저장 위치일 뿐이다.

## 5. 문서별 proof sidecar

각 Markdown 문서 바로 옆에 `<document>.md.leanmd.json` 파일을 둔다.

```text
child_argument.md
child_argument.md.leanmd.json
```

sidecar에는 해당 문서에서 나가는 proof 링크의 canonical 대상만 샘플 루트
기준 경로로 기록한다.

```json
{
  "document": "child_argument/child_argument.md",
  "proofLinks": [
    "child_argument/detail/detail.md"
  ]
}
```

proof 자식이 없는 leaf 문서는 빈 배열을 기록한다.

```json
{
  "document": "child_argument/detail/detail.md",
  "proofLinks": []
}
```

`reference` 링크는 sidecar에 기록하지 않는다.

## 6. 전체 proof DAG

각 샘플의 전체 proof DAG는 다음 파일에 기록한다.

```text
.leanmd/dependencies.json
```

이 파일은 모든 문서별 `proofLinks`를 간선 목록으로 취합한 결과다.

```json
{
  "root": "root_theorem.md",
  "edges": [
    {
      "from": "root_theorem.md",
      "to": "child_argument/child_argument.md",
      "kind": "proof"
    }
  ]
}
```

이 파일에도 `reference` 간선은 기록하지 않는다.

## 7. 작성 순서

새로운 증명 샘플은 다음 순서로 작성한다.

1. 루트 명제와 전체 논리의 개요를 루트 Markdown에 작성한다.
2. 독립적인 증명 책임을 맡길 부분을 `proof` 링크로 분리한다.
3. 새 proof 자식을 부모의 같은 이름 하위 폴더에 작성한다.
4. 각 Markdown 옆에 proof 전용 sidecar를 작성한다.
5. 기존 문서를 두 번째 부모가 사용하면 내용을 복사하지 않고 바로가기를
   추가한다.
6. 전체 `.leanmd/dependencies.json`을 생성한다.
7. 검증기를 실행하여 폴더 트리와 proof DAG가 일치하는지 확인한다.

## 8. 검증

샘플을 검사하려면 저장소 루트에서 다음 명령을 실행한다.

```sh
node scripts/validate-proof-dag.js samples/continuous_interval_dag
```

Markdown의 proof 링크를 기준으로 문서별 sidecar, proof 바로가기 및 전체
manifest를 갱신하려면 `--write`를 사용한다.

```sh
node scripts/validate-proof-dag.js samples/continuous_interval_dag --write
```

검증기는 다음 사항을 확인한다.

- 모든 비루트 문서가 자신과 같은 이름의 폴더에 있는가
- 각 비루트 문서에 canonical 부모가 정확히 하나 있는가
- 추가 부모마다 올바른 `shortcut.leanmd.json`이 있는가
- Markdown의 proof 링크와 문서별 sidecar가 일치하는가
- 전체 manifest가 모든 proof 간선을 정확히 취합하는가
- proof 그래프가 하나의 루트를 가진 DAG인가
- 모든 증명 문서가 루트에서 도달 가능한가

## 9. 현재 예시

- `continuous_interval_dag/`: 두 주요 논증, 두 공유 보조정리, 하나의 전용
  보조정리를 포함하는 예시

이 예시의 실제 폴더는 canonical 부모 관계에 따른 트리이고, 전체 proof
관계는 sidecar, 바로가기와 `.leanmd/dependencies.json`을 통해 DAG로 기록된다.
