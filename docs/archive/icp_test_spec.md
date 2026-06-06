# ICP Test V2 Product Spec + Data Contract

작성일: 2026-02-12  
범위: ICP 단일 검사 + ICP/Persona 결합 결과 + 상담 프롬프트 연계

## 1. 제품 목적

- 목적: 관계 성향 신호를 구조화해 운세 상담(사주/점성/타로) 품질을 높인다.
- 원칙: 비임상, 비진단, 비결정론. 자기성찰/행동실험 중심.
- Non-goals:
- 임상 진단(우울/불안/성격장애 등) 제공 금지
- 의료/법률/투자 확정적 지시 금지

## 2. 측정 축 (4축)

- `agency` (주도성): 의견 표현, 경계 설정, 결정 주도
- `warmth` (관계 온도): 친화적 소통, 신뢰 형성, 협력
- `boundary` (경계 유연성): 과잉양보 vs 과잉통제 사이의 균형
- `resilience` (관계 회복탄력): 갈등/피드백 후 회복, 감정 조절

스코어 해석: 각 축 `0–100` (50 중립)

## 3. 문항 설계

- 총 20문항(축당 5문항)
- 응답 척도(고정):
- `1 전혀 아니다`
- `2 아니다`
- `3 보통이다`
- `4 그렇다`
- `5 매우 그렇다`
- 역문항 정책:
- 축당 최소 1문항 역채점
- 문항 메타데이터에 `reverse: true`

## 4. 채점 알고리즘

### 4.1 축 점수

- 원점수: 응답값 `1..5`
- 역문항 변환: `v_rev = 6 - v`
- 축 평균: `mean(axisItems)`
- 0-100 변환: `axisScore = ((mean - 1) / 4) * 100`

### 4.2 결측 처리

- 결측 0개: 정상
- 결측 1~2개: 해당 축 평균대치(중립 3 우선)
- 결측 3개 이상: 결과는 생성하되 `confidence` 강등 + `mixed_exploring` fallback 가능

### 4.3 아키타입 판정

- 1차: `agency` x `warmth` 사분면
- 2차: `boundary`, `resilience`로 세부 subtype 분기
- 결과: base archetype 8종

## 5. Confidence 점수

`confidence = completeness(40) + consistency(35) + pace(15) + separation(10)`

- `completeness`: 응답 완결성
- `consistency`: 유사/역문항 쌍 모순도
- `pace`: 비정상적으로 빠른 완료(예: 20문항 < 40초) 감점
- `separation`: 1/2순위 archetype 점수 차이

레벨:

- `high`: 75+
- `medium`: 50~74
- `low`: 0~49

Low confidence면:

- 하이브리드 결과 `혼합형(탐색 중)`
- UI에서 재측정 권장

## 6. 결과 템플릿 규격

### 6.1 단일 결과

필수 섹션:

- 핵심 요약(1~2문장)
- 강점 3
- 주의할 점(그림자) 2
- 추천 행동 3
- 연애/관계 스타일 2~3줄
- 일/돈/목표 스타일 2~3줄
- 이 결과가 나온 이유(축 high/low + 문항 근거)

### 6.2 결합 결과 (ICP + Persona)

- 하이브리드 archetype 8~16종 (v2는 12종)
- low confidence fallback: `혼합형(탐색 중)`
- "단순 문자열 연결" 금지: 새로운 행동 가이드/의사결정 관점 추가

## 7. Explainability Payload

UI 렌더 목적의 구조화 데이터:

```ts
export interface ExplainabilityPayload {
  top_axes: Array<{ axis: IcpAxisKey; score: number; interpretation: string }>
  low_axes: Array<{ axis: IcpAxisKey; score: number; interpretation: string }>
  evidence_items: Array<{ question_id: string; answer: number; reverse: boolean; axis: IcpAxisKey }>
  note: string
}
```

## 8. 데이터 계약 (TypeScript)

```ts
export type IcpAxisKey = 'agency' | 'warmth' | 'boundary' | 'resilience'

export interface IcpAxisScore {
  axis: IcpAxisKey
  score: number // 0-100
  interpretation: string
}

export interface IcpResultV2 {
  test_version: 'icp_v2'
  result_id: string
  archetype_id: string
  archetype_name_ko: string
  axes: Record<IcpAxisKey, number>
  confidence: number // 0-100
  confidence_level: 'high' | 'medium' | 'low'
  completion_seconds?: number
  missing_answer_count: number
  explainability: ExplainabilityPayload
}

export interface HybridResultV2 {
  hybrid_id: string
  hybrid_name_ko: string
  confidence: number
  fallback: boolean
  guidance: string[]
}

export interface CounselingBrief {
  user_archetype: { id: string; name_ko: string }
  axes: Array<{ name: IcpAxisKey; score: number; interpretation: string }>
  hybrid_archetype: { id: string; name_ko: string; fallback?: boolean }
  confidence: { score: number; level: 'high' | 'medium' | 'low' }
  key_strengths: string[]
  key_blindspots: string[]
  what_user_wants?: string
  disclaimer: string
}
```

## 9. Prisma 모델 변경안

`ICPResult` 확장:

- `testVersion String @default("icp_v2")`
- `resultId String?`
- `confidence Int?`
- `axes Json?`
- `completionSeconds Int?`
- `missingAnswerCount Int? @default(0)`

주의: 기존 필드(`analysisData`, `answers`, `octantScores`) 유지해 하위호환 보장.

## 10. API 계약

### POST `/api/icp`

Request 핵심:

- `testVersion`, `resultId`, `primaryStyle`, `secondaryStyle?`
- `dominanceScore`, `affiliationScore`
- `axes`, `confidence`, `completionSeconds`, `missingAnswerCount`
- `analysisData`, `answers`, `locale`

Response:

- `id`, `testVersion`, `resultId`, `confidence`

### GET `/api/icp`

- 최신 결과 + `testVersion` 포함 반환

## 11. i18n 전략

- 질문/결과 카피는 `ko` 원문 우선
- `en`은 파생 번역(동일 데이터 구조)
- 하드코딩 문구 최소화, 결과 카피는 `results.ts` 단일 소스

## 12. 안전 문구 표준

모든 결과/상담 진입부에 고정 문구:

- "이 결과는 자기이해를 돕기 위한 비임상 성향 안내입니다. 의료·법률·투자 판단의 근거로 사용하지 마세요."

상담 출력 규칙:

- 단정적 예언 금지
- 확률/가능성/선택지 표현
- 위험 신호 시 전문가 도움 권장 문구 사용
