// src/lib/premium-reports/ultimateNarrativePrompts.ts
//
// Builds the system + user prompts for the second-pass LLM call that
// generates the UltimateCore JSON. The first pass (existing AIPremiumReport
// pipeline) supplies grounded analysis text; this pass rewrites that text
// into a magazine-style premium layout with strict length targets and a
// fixed JSON shape that matches `UltimateCore`.

import type {
  UltimateComputed,
  UltimateInsight,
  UltimatePeriod,
} from './ultimateReport'

export interface UltimateNarrativePromptInput {
  period: UltimatePeriod
  /** Localised period label (e.g. "2026년 5월", "2026년", "전체 인생"). */
  periodLabel: string
  /** Optional ISO date the report is anchored to. */
  targetDate?: string
  computed: UltimateComputed
  /** Plain-text dump of the legacy AIPremiumReport sections. */
  legacySections: Record<string, string>
  /** Top insights, key strengths, key challenges from the matrix summary. */
  matrixHints?: {
    overallScore?: number
    grade?: string
    topInsights?: string[]
    keyStrengths?: string[]
    keyChallenges?: string[]
  }
}

const ICON_KEYS: ReadonlyArray<UltimateInsight['iconKey']> = [
  'sparkles',
  'flame',
  'message',
  'heart',
  'compass',
  'star',
  'shield',
  'target',
]

const PERIOD_BRIEF: Record<
  UltimatePeriod,
  {
    headline: string
    pacing: string
    keyDateGuidance: string
    radarAxes: string
    insightTitles: string
    volatilityScale: string
  }
> = {
  monthly: {
    headline:
      '"이번 달 한 달의 결정적 흐름". 거시적인 인생론보다는 28~31일 단위에서 무엇이 어떻게 움직이는지를 잡는다.',
    pacing:
      '주차 단위(1주/2주/3주/4주/5주)로 흐름을 끊되, summary 4문단은 곧 들어올 한 달의 시작 → 중반 → 후반 → 마무리로 구조화한다.',
    keyDateGuidance:
      'keyDates는 3~5개. date 필드는 "YYYY-MM-DD" 또는 "X월 X일" 형식. 가능한 한 월중·월말의 결정적 일자를 짚어준다.',
    radarAxes:
      '레이더 5축 권장: 전체 흐름 / 커리어·실무 / 관계·소통 / 재물·결정 / 건강·에너지. value는 이 달의 정성적 평가를 0–100으로.',
    insightTitles:
      '인사이트 4영역 권장 제목: "이달의 핵심 흐름", "관계와 소통", "커리어와 결정", "건강과 내면 정비".',
    volatilityScale: '월간 변동성: 주차별(1~5주차) 에너지 대 갈등 리스크.',
  },
  yearly: {
    headline:
      '"올해 1년의 운명선". 시즌·분기 단위로 흐름을 잡고, 변곡점을 명시한다.',
    pacing:
      'summary 4문단은 1Q → 2Q → 3Q → 4Q 구조로 가도 좋고, "올해의 주제 → 상반기 → 하반기 → 마무리·다음 해 진입" 구조도 가능. 단, 흐름의 연속성이 보여야 한다.',
    keyDateGuidance:
      'keyDates는 3~6개. date 필드는 "YYYY-MM" 또는 "X월" 또는 "X월 ~ X월" 형식. 한 해의 결정적 변곡 시기를 표시한다.',
    radarAxes:
      '레이더 5축 권장: 전체 흐름 / 커리어 / 관계 / 재물 / 건강. 한 해의 종합 점수.',
    insightTitles:
      '인사이트 4영역 권장 제목: "올해의 큰 흐름", "관계와 인연", "일과 재물", "건강과 변곡점".',
    volatilityScale: '연간 변동성: 분기별(1Q~4Q) 추진 에너지 대 도전 강도.',
  },
  comprehensive: {
    headline:
      '"인생 전반을 관통하는 운명 청사진". 단기 운보다 캐릭터, 사명, 큰 기회·시련의 패턴을 잡는다.',
    pacing:
      'summary 4문단은 "본질적 캐릭터 → 관계와 사회 → 일·재물·물질 흐름 → 인생 사명·영적 성장" 또는 "초년기 → 청년기 → 중년기 → 노년기" 중 사주 명식 흐름에 맞는 쪽을 선택한다.',
    keyDateGuidance:
      'keyDates는 3~5개의 인생 변곡점. date 필드는 "X대 초반", "X대 중반", "X세 전후" 형식. 대운 전환·중요 변곡을 짚는다.',
    radarAxes:
      '레이더 5축 권장: 성격·자아 / 관계 / 커리어·사명 / 재물·안정 / 건강·생명력.',
    insightTitles:
      '인사이트 4영역 권장 제목: "성격과 자아", "관계 패턴", "커리어와 재물", "인생 사명과 변곡점".',
    volatilityScale: '인생 변동성: 연령대별(10대/20대/30대/40대/50대+) 성장 곡선 대 도전 강도.',
  },
}

const SYSTEM_PROMPT_HEAD = `당신은 한국의 사주명리학과 서양 점성학(Astrology)을 모두 깊이 다룰 줄 아는 프리미엄 운명 분석 칼럼니스트입니다. 당신의 글은 단순한 운세 풀이가 아니라, 결제한 독자가 "이건 내 이야기다"라고 느끼는 매거진 톤의 분석입니다.

[톤 & 스타일]
- 한국어 존중하지 않는 가벼운 운세 톤(예: "오늘은 ~할 거예요!") 절대 금지
- 차분하고 단정적인 문장, 그러나 거만하지 않게
- 사주 용어(일간·대운·세운·월운·식신·정관·도화·홍염·격국·용신 등)는 자연스럽게 본문에 녹이되, 독자가 처음 보는 사람도 이해할 수 있게 풀어쓴다
- 점성 용어(태양·달·금성·화성·트랜짓·하우스 등)도 마찬가지
- 미신적·운명론적 단정 금지. 항상 "흐름·경향·신호"로 표현
- 사용자에 대한 도덕적 평가, 외모 평가, 성별 고정관념 금지
- 영어 단어는 필요할 때만 (예: Venus, Trine 등). 한자는 괄호 병기 (예: 도화살(桃花殺))

[가장 중요한 규칙]
- 응답은 반드시 단 하나의 JSON 객체로만. 앞뒤 설명·코드펜스·해설 텍스트 절대 금지.
- 모든 한국어 본문은 정해진 글자수 목표를 반드시 충족할 것. 짧으면 광고문이 되고, 너무 길면 가독성이 떨어진다.
- 사용자에게 제공되는 "근거 자료"의 분석 방향과 모순되는 새로운 사실(예: 새로운 대운 시기, 다른 일간) 절대 발명 금지.`

const SYSTEM_PROMPT_LENGTH_RULES = `[글자수 목표 (한국어 기준)]
- theme: 28~50자. 시기·핵심 키워드를 담은 제목.
- subTheme: 50~90자. 부제. 사주 또는 점성 키워드 1개 포함.
- summary: 정확히 4개 문단. 각 문단 220~320자. 각 문단은 완결된 한 호흡(시작·중간·마무리).
- insights: 정확히 4개. 각 insight:
    - title: 8~22자.
    - content: 정확히 2개 문단. 각 문단 180~260자.
    - highlight: 60~140자. "핵심 조언:" 같은 접두어 없이 한 문장 또는 두 문장.
- keyDates: 3~5개. 각 항목:
    - date: 기간에 맞는 형식 (아래 PERIOD 가이드 참고)
    - title: 6~20자
    - desc: 60~140자
- dosAndDonts: dos 4개 / donts 4개. 각 항목 12~38자, 명령형으로 끝나는 행동 처방. 일반적인 격언 금지(예: "건강을 챙기세요" 금지).
- radar: 정확히 5개 축. subject 4~14자, value 0~100, fullMark 100.

문단마다 본인 사주의 특정 글자(예: 일간 丁, 월지 巳, Venus in Taurus 등)를 최소 한 개씩 자연스럽게 인용한다.`

const SYSTEM_PROMPT_SCHEMA = `[출력 JSON 스키마]
반드시 아래 키 이름과 타입을 정확히 따른다. 추가 키 금지, 누락 키 금지.
{
  "theme": string,
  "subTheme": string,
  "summary": [string, string, string, string],
  "insights": [
    {
      "id": string,                     // 영문 소문자, 하이픈 (예: "core-flow")
      "title": string,
      "iconKey": one of ${ICON_KEYS.map((k) => `"${k}"`).join(' | ')},
      "content": [string, string],
      "highlight": string
    },
    // 정확히 4개
  ],
  "keyDates": [
    { "date": string, "title": string, "desc": string },
    // 3~5개
  ],
  "dosAndDonts": {
    "dos": [string, string, string, string],
    "donts": [string, string, string, string]
  },
  "radar": [
    { "subject": string, "value": number, "fullMark": 100 },
    // 정확히 5개
  ]
}`

function formatComputedBlock(computed: UltimateComputed): string {
  const pillars = computed.sajuPillars
    .map(
      (p) =>
        `- ${p.labelKo}: 천간 ${p.stem}(${p.stemElement}) / 지지 ${p.branch}(${p.branchElement})${
          p.sibsin ? ` / 십성 ${p.sibsin}` : ''
        }`
    )
    .join('\n')
  const placements = computed.astroPlacements
    .map((pl) => {
      const sign = pl.signKo || pl.sign
      const houseStr = typeof pl.house === 'number' ? ` · ${pl.house}하우스` : ''
      const retro = pl.retrograde ? ' (R)' : ''
      return `- ${pl.bodyKo || pl.body} in ${sign}${houseStr}${retro}`
    })
    .join('\n')
  const fe = computed.fiveElements
  return [
    '[사주 명식]',
    `일간(日干): ${computed.dayMaster.stem} (${computed.dayMaster.element}, ${computed.dayMaster.yinYang})`,
    pillars,
    '',
    '[오행 분포]',
    `목 ${fe.wood} · 화 ${fe.fire} · 토 ${fe.earth} · 금 ${fe.metal} · 수 ${fe.water}`,
    '',
    '[점성학 주요 배치]',
    placements,
  ].join('\n')
}

function formatLegacySectionsBlock(sections: Record<string, string>): string {
  const entries = Object.entries(sections)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => `### ${key}\n${value.trim()}`)
  if (entries.length === 0) {
    return '(이전 단계 분석 텍스트 없음. 계산된 사주·점성 컨텍스트만 사용해 작성하라.)'
  }
  return entries.join('\n\n')
}

function formatMatrixHintsBlock(hints: UltimateNarrativePromptInput['matrixHints']): string {
  if (!hints) return ''
  const lines: string[] = []
  if (typeof hints.overallScore === 'number') {
    lines.push(`전체 점수: ${hints.overallScore}/100${hints.grade ? ` (${hints.grade})` : ''}`)
  }
  if (Array.isArray(hints.topInsights) && hints.topInsights.length > 0) {
    lines.push(`상위 인사이트: ${hints.topInsights.slice(0, 5).join(' / ')}`)
  }
  if (Array.isArray(hints.keyStrengths) && hints.keyStrengths.length > 0) {
    lines.push(`강점 신호: ${hints.keyStrengths.slice(0, 5).join(' / ')}`)
  }
  if (Array.isArray(hints.keyChallenges) && hints.keyChallenges.length > 0) {
    lines.push(`주의 신호: ${hints.keyChallenges.slice(0, 5).join(' / ')}`)
  }
  if (lines.length === 0) return ''
  return ['[엔진 측 핵심 신호]', ...lines].join('\n')
}

export function buildUltimateNarrativeSystemPrompt(period: UltimatePeriod): string {
  const brief = PERIOD_BRIEF[period]
  return [
    SYSTEM_PROMPT_HEAD,
    '',
    `[현재 작성 대상]`,
    `리포트 종류: ${
      period === 'monthly'
        ? '이번 달 (Monthly)'
        : period === 'yearly'
          ? '올해 (Yearly)'
          : '인생 총운 (Lifetime / Comprehensive)'
    }`,
    `핵심 관점: ${brief.headline}`,
    `호흡 / 페이싱: ${brief.pacing}`,
    `결정적 시점(keyDates) 표기 규칙: ${brief.keyDateGuidance}`,
    `레이더 5축 가이드: ${brief.radarAxes}`,
    `인사이트 4영역 가이드: ${brief.insightTitles}`,
    `(참고) 변동성 차트 의미: ${brief.volatilityScale}`,
    '',
    SYSTEM_PROMPT_LENGTH_RULES,
    '',
    SYSTEM_PROMPT_SCHEMA,
  ].join('\n')
}

export function buildUltimateNarrativeUserPrompt(input: UltimateNarrativePromptInput): string {
  const computedBlock = formatComputedBlock(input.computed)
  const legacyBlock = formatLegacySectionsBlock(input.legacySections)
  const hintsBlock = formatMatrixHintsBlock(input.matrixHints)

  return [
    `대상 기간: ${input.periodLabel}${input.targetDate ? ` (anchor: ${input.targetDate})` : ''}`,
    '',
    computedBlock,
    '',
    hintsBlock,
    hintsBlock ? '' : null,
    '[이전 단계 분석 텍스트 — 톤·사실관계 참고용. 그대로 복사 금지, 매거진 톤으로 재작성]',
    legacyBlock,
    '',
    '[작성 지시]',
    '위 사주 명식·점성 배치·이전 분석 텍스트를 근거로 삼아 UltimateCore JSON을 생성하라.',
    '글자수 규칙·JSON 스키마를 정확히 따르고, 본문 곳곳에 본인 사주의 구체적 글자(천간·지지·일간·태양/달/금성/화성 사인 등)를 자연스럽게 인용하라.',
    '응답은 JSON 객체 하나만, 앞뒤 텍스트·코드펜스·설명 절대 금지.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}
