// src/lib/destiny-matrix/compatibility/narrativePrompt.ts
//
// Builds the system + user prompts for the LLM polish pass that turns
// `analyzeThreeLayerCompatibility()` engine output into a magazine-style
// `CompatibilityNarrative` JSON.

import type { ThreeLayerCompatibility, CompatibilityPerson } from './threeLayerSynastry'

export interface CompatibilityNarrativePromptInput {
  personA: CompatibilityPerson
  personB: CompatibilityPerson
  /** Optional display labels — falls back to "A" / "B". */
  labelA?: string
  labelB?: string
  layers: ThreeLayerCompatibility
}

const ICON_KEYS = [
  'sparkles',
  'flame',
  'message',
  'heart',
  'compass',
  'star',
  'shield',
  'target',
] as const

const SYSTEM_PROMPT = `당신은 한국의 사주명리학과 서양 점성학을 모두 깊이 다루는 프리미엄 관계 분석 칼럼니스트입니다. 두 사람의 사주·점성 데이터를 받아 매거진 톤의 궁합 리포트를 작성합니다.

[톤 & 스타일]
- 가벼운 운세 톤 절대 금지("천생연분이에요!" 류). 차분하고 단정적인, 그러나 거만하지 않은 분석가의 톤.
- 사주 용어(일간·일지·천간합·지지충·삼합·원진·식상·관성 등)는 자연스럽게 본문에 녹이되, 처음 접하는 독자도 이해할 수 있게 풀어쓴다.
- 점성 용어(태양·달·수성·시너스트리·컴포지트 등)도 마찬가지.
- 관계를 운명론으로 단정 짓지 말 것 — "흐름·경향·신호"로 표현.
- 두 사람을 도덕적으로 평가하지 않음. 어느 한 쪽을 가해자/피해자로 그리지 말 것.
- 성별 고정관념 금지. 한쪽이 일방적으로 맞춰야 한다는 식의 표현 금지.

[가장 중요한 규칙]
- 응답은 반드시 단 하나의 JSON 객체. 앞뒤 설명·코드펜스·해설 절대 금지.
- 글자수 목표를 반드시 충족할 것. 짧으면 광고문, 너무 길면 가독성 떨어짐.
- 입력으로 주는 "엔진 결과(팩트)"의 점수·신호와 모순되는 새 사실 발명 금지.
  예: 엔진이 "일간 충"이라 했는데 LLM이 "일간 합"이라 쓰면 안 됨.

[글자수 목표 (한국어 기준)]
- theme: 28~50자. 두 사람 관계의 한 줄 헤드라인.
- subTheme: 50~90자. 부제. 사주 또는 점성 키워드 1개 포함.
- summary: 정확히 4개 문단. 각 문단 220~320자. 4문단의 흐름은 다음 중 하나로:
    (a) "첫 만남 인상 → 정서 패턴 → 갈등 지점 → 장기 흐름"
    (b) "본질적 끌림 → 일상의 결 → 부딪히는 지점 → 함께 성장하는 길"
- insights: 정확히 4개. 각 insight:
    - title: 8~22자.
    - content: 정확히 2개 문단. 각 문단 180~260자.
    - advice: 60~140자, 행동 처방 한두 문장.
    - 인사이트 권장 4영역: "끌림과 매력 / 의사소통과 일상 / 갈등과 주의 / 장기 성장과 공명".
- dosAndDonts: dos 4개 / donts 4개. 각 12~38자, 명령형 / 행동 처방.
  일반적 격언("서로 존중하세요") 금지. 두 사람 사주의 구체적 신호에 근거한 처방만.
- keyMoments: 3~5개. 각 항목:
    - phase: 4~10자 (예: "첫 만남", "안정기", "갈등 시기", "장기 흐름")
    - headline: 6~20자
    - desc: 60~140자

[출력 JSON 스키마]
정확히 아래 키와 타입만. 추가/누락 키 금지.
{
  "theme": string,
  "subTheme": string,
  "summary": [string, string, string, string],
  "insights": [
    {
      "id": string,                  // 영문 소문자, 하이픈
      "title": string,
      "iconKey": one of ${ICON_KEYS.map((k) => `"${k}"`).join(' | ')},
      "content": [string, string],
      "advice": string
    },
    // 정확히 4개
  ],
  "dosAndDonts": {
    "dos": [string, string, string, string],
    "donts": [string, string, string, string]
  },
  "keyMoments": [
    { "phase": string, "headline": string, "desc": string }
    // 3~5개
  ]
}`

export function buildCompatibilityNarrativeSystemPrompt(): string {
  return SYSTEM_PROMPT
}

function formatLayer(label: string, layer: ThreeLayerCompatibility[keyof ThreeLayerCompatibility]): string {
  if (layer && typeof layer === 'object' && 'score' in layer) {
    const signals =
      'signals' in layer && Array.isArray(layer.signals)
        ? layer.signals
            .slice(0, 8)
            .map((s) => `  • [${s.delta >= 0 ? '+' : ''}${s.delta}] ${s.text}`)
            .join('\n')
        : ''
    const narration = 'narration' in layer && typeof layer.narration === 'string' ? layer.narration : ''
    return [`### ${label}`, `점수: ${layer.score}/100`, signals, narration].filter(Boolean).join('\n')
  }
  return `### ${label}\n(데이터 없음)`
}

function formatPerson(label: string, p: CompatibilityPerson, displayName?: string): string {
  return [
    `${label} (${displayName || label})`,
    `- 생년월일: ${p.birthDate}`,
    `- 출생시간: ${p.birthTime}`,
    `- 성별: ${p.gender === 'female' ? '여성' : '남성'}`,
  ].join('\n')
}

export function buildCompatibilityNarrativeUserPrompt(input: CompatibilityNarrativePromptInput): string {
  const labelA = input.labelA || 'A'
  const labelB = input.labelB || 'B'
  return [
    '[두 사람 정보]',
    formatPerson('Person A', input.personA, labelA),
    '',
    formatPerson('Person B', input.personB, labelB),
    '',
    '[엔진 결과 — 팩트 (이 점수·신호와 모순되는 내용 절대 작성 금지)]',
    formatLayer('Layer 1: 사주 정합도', input.layers.layer1_saju),
    '',
    formatLayer('Layer 2: 점성 시너스트리 (간이)', input.layers.layer2_synastry),
    '',
    formatLayer('Layer 3: 합쳐진 에너지 (Composite)', input.layers.layer3_composite),
    '',
    `### 종합`,
    `점수: ${input.layers.integrated.score}/100`,
    `등급: ${input.layers.integrated.level}`,
    input.layers.integrated.narration,
    '',
    '[작성 지시]',
    '위 팩트만을 근거로 매거진 톤의 궁합 narrative JSON을 생성하라.',
    '신호 텍스트(예: "일간 천간합 丁-壬", "일지 충 卯-酉")를 본문에 자연스럽게 인용해 신뢰를 줄 것.',
    '글자수 규칙·JSON 스키마를 정확히 따르고, JSON 객체 하나만 출력. 앞뒤 텍스트·코드펜스 금지.',
  ].join('\n')
}
