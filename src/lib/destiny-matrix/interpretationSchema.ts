import type { LayerId } from './layerSemantics'

export type MatrixThemeKey = 'comprehensive' | 'love' | 'career' | 'wealth' | 'health' | 'family'

export interface ThemeInterpretationRule {
  theme: MatrixThemeKey
  label: { ko: string; en: string }
  primaryLayers: LayerId[]
  secondaryLayers: LayerId[]
  focusQuestions: { ko: string[]; en: string[] }
  requiredEvidence: string[]
  antiPatterns: { ko: string[]; en: string[] }
  outputTargets: { minCharsKo: number; minCharsEn: number; minParagraphs: number }
}

export interface LifeCyclePhase {
  key: string
  ageStart: number
  ageEnd: number
  title: { ko: string; en: string }
  mission: { ko: string; en: string }
  risks: { ko: string[]; en: string[] }
  leverage: { ko: string[]; en: string[] }
  checkpoints: { ko: string[]; en: string[] }
}

export const MATRIX_SCHEMA_VERSION = '2.0.0'

export const THEME_INTERPRETATION_RULES: Record<MatrixThemeKey, ThemeInterpretationRule> = {
  comprehensive: {
    theme: 'comprehensive',
    label: { ko: '인생 총운', en: 'Life Fortune' },
    primaryLayers: ['layer1', 'layer4', 'layer7', 'layer10'],
    secondaryLayers: ['layer2', 'layer3', 'layer5', 'layer6', 'layer8', 'layer9'],
    focusQuestions: {
      ko: [
        '인생의 상승-조정-확장 구간은 언제인가?',
        '반복 손실 패턴은 무엇이며 어떤 습관으로 차단할 수 있는가?',
        '향후 10년의 실행 우선순위는 무엇인가?',
      ],
      en: [
        'Where are the expansion-adjustment-expansion windows in life?',
        'What loss pattern repeats and which habit blocks it?',
        'What are the top execution priorities for the next decade?',
      ],
    },
    requiredEvidence: [
      'dayMasterElement',
      'geokguk',
      'yongsin',
      'currentDaeunElement',
      'currentSaeunElement',
      'activeTransits',
      'graphRagEvidence.anchors',
      'domainAnalysis',
    ],
    antiPatterns: {
      ko: ['일반론 위로문', '증거 없는 단정', '데일리 문장 반복', '동일 문장 반복'],
      en: [
        'generic comfort text',
        'unsupported certainty',
        'daily-style repetition',
        'semantic sentence duplication',
      ],
    },
    outputTargets: { minCharsKo: 9000, minCharsEn: 7000, minParagraphs: 14 },
  },
  love: {
    theme: 'love',
    label: { ko: '연애/관계', en: 'Love/Relationship' },
    primaryLayers: ['layer5', 'layer4', 'layer2'],
    secondaryLayers: ['layer1', 'layer7', 'layer8', 'layer10'],
    focusQuestions: {
      ko: ['관계 안정도를 올리는 소통 규칙은 무엇인가?', '갈등 재발 방지 장치는 무엇인가?'],
      en: [
        'Which communication rule increases relationship stability?',
        'Which guardrail prevents conflict recurrence?',
      ],
    },
    requiredEvidence: ['relations', 'aspects', 'planetHouses', 'shinsalList', 'activeTransits'],
    antiPatterns: {
      ko: ['막연한 감정론', '상대 단정', '확정 강요 문장'],
      en: ['vague emotionalism', 'partner stereotyping', 'forced-finalization copy'],
    },
    outputTargets: { minCharsKo: 4500, minCharsEn: 3500, minParagraphs: 8 },
  },
  career: {
    theme: 'career',
    label: { ko: '커리어/직업', en: 'Career/Work' },
    primaryLayers: ['layer3', 'layer4', 'layer7'],
    secondaryLayers: ['layer1', 'layer2', 'layer5', 'layer9'],
    focusQuestions: {
      ko: [
        '지금 성장률을 올리는 역할/범위 설계는 무엇인가?',
        '언제 확장하고 언제 검증해야 하는가?',
      ],
      en: ['Which role/scope design increases growth now?', 'When to scale vs when to verify?'],
    },
    requiredEvidence: ['sibsinDistribution', 'planetHouses', 'domainAnalysis', 'activeTransits'],
    antiPatterns: {
      ko: ['근거 없는 낙관', '즉시 확정 권유', '실행 순서 누락'],
      en: ['unsupported optimism', 'instant commitment push', 'missing execution sequence'],
    },
    outputTargets: { minCharsKo: 5000, minCharsEn: 3800, minParagraphs: 9 },
  },
  wealth: {
    theme: 'wealth',
    label: { ko: '재물/자산', en: 'Wealth/Assets' },
    primaryLayers: ['layer4', 'layer3', 'layer9'],
    secondaryLayers: ['layer1', 'layer2', 'layer7', 'layer10'],
    focusQuestions: {
      ko: ['수익보다 먼저 확인할 손실 요인은 무엇인가?', '지출/투자에서 잠금 기준은 무엇인가?'],
      en: [
        'Which loss driver must be checked before upside?',
        'What lock criteria should govern spending/investing?',
      ],
    },
    requiredEvidence: ['domainAnalysis', 'activeTransits', 'asteroidHouses', 'currentSaeunElement'],
    antiPatterns: {
      ko: ['고수익 단정', '리스크 설명 누락', '당일 확정 권고'],
      en: ['high-return certainty', 'missing risk explanation', 'same-day finalization advice'],
    },
    outputTargets: { minCharsKo: 5000, minCharsEn: 3800, minParagraphs: 9 },
  },
  health: {
    theme: 'health',
    label: { ko: '건강/컨디션', en: 'Health/Conditioning' },
    primaryLayers: ['layer6', 'layer4', 'layer1'],
    secondaryLayers: ['layer2', 'layer8', 'layer10'],
    focusQuestions: {
      ko: ['에너지 누수 구간은 어디인가?', '회복 속도를 높이는 루틴은 무엇인가?'],
      en: ['Where is energy leakage happening?', 'Which routine improves recovery speed?'],
    },
    requiredEvidence: ['twelveStages', 'activeTransits', 'dayMasterElement', 'shinsalList'],
    antiPatterns: {
      ko: ['의학적 단정', '공포 문구', '근거 없는 금지'],
      en: ['medical certainty', 'fear copy', 'unsupported prohibitions'],
    },
    outputTargets: { minCharsKo: 4200, minCharsEn: 3200, minParagraphs: 8 },
  },
  family: {
    theme: 'family',
    label: { ko: '가족/생활', en: 'Family/Home' },
    primaryLayers: ['layer5', 'layer3', 'layer10'],
    secondaryLayers: ['layer1', 'layer4', 'layer7'],
    focusQuestions: {
      ko: ['가정 내 역할 충돌을 줄이는 합의 규칙은?', '정서 안정 리듬은 어떻게 만들까?'],
      en: [
        'Which agreement rule reduces home-role conflicts?',
        'How to build emotional stability rhythm?',
      ],
    },
    requiredEvidence: ['relations', 'planetHouses', 'extraPointSigns', 'domainAnalysis'],
    antiPatterns: {
      ko: ['가족 역할 고정관념', '책임 전가 문장', '양자택일 강요'],
      en: ['family-role stereotyping', 'blame framing', 'forced either-or framing'],
    },
    outputTargets: { minCharsKo: 4200, minCharsEn: 3200, minParagraphs: 8 },
  },
}

export const LIFE_CYCLE_SCHEMA: LifeCyclePhase[] = [
  {
    key: 'foundation',
    ageStart: 0,
    ageEnd: 24,
    title: { ko: '기반 구축기', en: 'Foundation Stage' },
    mission: {
      ko: '정체성, 학습 방식, 관계 경계의 기본 틀을 만든다.',
      en: 'Build baseline identity, learning style, and relational boundaries.',
    },
    risks: {
      ko: ['과몰입 후 번아웃', '기준 없이 선택지 확대', '감정 우선 의사결정'],
      en: [
        'over-immersion burnout',
        'expanding options without criteria',
        'emotion-first decisions',
      ],
    },
    leverage: {
      ko: ['기록 습관', '핵심 루틴 2개 고정', '피드백 순환'],
      en: ['tracking habit', 'lock two core routines', 'feedback loop'],
    },
    checkpoints: {
      ko: ['분기별 목표 재설계', '관계/학업/일정 균형 점검'],
      en: ['quarterly goal redesign', 'balance check across relationship/study/schedule'],
    },
  },
  {
    key: 'expansion',
    ageStart: 25,
    ageEnd: 39,
    title: { ko: '확장 실행기', en: 'Expansion Stage' },
    mission: {
      ko: '성과를 구조화하고, 기회 창을 실행으로 전환한다.',
      en: 'Structure output and convert opportunity windows into execution.',
    },
    risks: {
      ko: ['과속 확정', '역할 경계 붕괴', '체력 관리 실패'],
      en: ['premature finalization', 'role-boundary collapse', 'energy management failure'],
    },
    leverage: {
      ko: ['문서 기반 합의', '단계별 확정', '주간 리뷰 체계'],
      en: ['document-based alignment', 'phased finalization', 'weekly review system'],
    },
    checkpoints: {
      ko: ['반기별 포트폴리오 정리', '손실 패턴 제거'],
      en: ['semiannual portfolio reset', 'loss-pattern removal'],
    },
  },
  {
    key: 'consolidation',
    ageStart: 40,
    ageEnd: 54,
    title: { ko: '재편/고도화기', en: 'Consolidation Stage' },
    mission: {
      ko: '규모보다 재현성을 높이고, 운영 모델을 최적화한다.',
      en: 'Optimize operating model with repeatability over raw scale.',
    },
    risks: {
      ko: ['과거 성공 공식 고집', '리스크 분산 미흡', '관계 피로 누적'],
      en: [
        'clinging to old success formula',
        'insufficient risk distribution',
        'relationship fatigue',
      ],
    },
    leverage: {
      ko: ['의사결정 프레임 고정', '권한 위임', '핵심지표 관리'],
      en: ['fixed decision frame', 'delegation', 'KPI discipline'],
    },
    checkpoints: {
      ko: ['연간 운영 구조 재설계', '성장/안정 비중 조정'],
      en: ['annual operating redesign', 'rebalance growth vs stability'],
    },
  },
  {
    key: 'legacy',
    ageStart: 55,
    ageEnd: 90,
    title: { ko: '영향력/유산기', en: 'Legacy Stage' },
    mission: {
      ko: '축적된 기준을 시스템과 사람에게 이전한다.',
      en: 'Transfer accumulated standards into systems and people.',
    },
    risks: {
      ko: ['과도한 통제', '회복 리듬 저하', '변화 거부'],
      en: ['over-control', 'recovery decline', 'change resistance'],
    },
    leverage: {
      ko: ['멘토링', '지식 체계화', '건강 리듬 고정'],
      en: ['mentoring', 'knowledge codification', 'health rhythm lock'],
    },
    checkpoints: {
      ko: ['연간 에너지 배분 재설정', '핵심 관계 유지 전략'],
      en: ['annual energy allocation reset', 'core relationship maintenance strategy'],
    },
  },
]

export function resolveLifeCyclePhase(age: number): LifeCyclePhase {
  return (
    LIFE_CYCLE_SCHEMA.find((phase) => age >= phase.ageStart && age <= phase.ageEnd) ||
    LIFE_CYCLE_SCHEMA[LIFE_CYCLE_SCHEMA.length - 1]
  )
}

export function buildThemeSchemaPromptBlock(theme: MatrixThemeKey, lang: 'ko' | 'en'): string {
  const rule = THEME_INTERPRETATION_RULES[theme]
  if (!rule) return ''
  const focus = (lang === 'ko' ? rule.focusQuestions.ko : rule.focusQuestions.en).join(' | ')
  const anti = (lang === 'ko' ? rule.antiPatterns.ko : rule.antiPatterns.en).join(', ')
  const label = lang === 'ko' ? rule.label.ko : rule.label.en
  return [
    `## Matrix Interpretation Schema ${MATRIX_SCHEMA_VERSION}`,
    `- Theme: ${label}`,
    `- Primary layers: ${rule.primaryLayers.join(', ')}`,
    `- Secondary layers: ${rule.secondaryLayers.join(', ')}`,
    `- Focus questions: ${focus}`,
    `- Required evidence keys: ${rule.requiredEvidence.join(', ')}`,
    `- Anti-patterns: ${anti}`,
    `- Output target: minChars=${lang === 'ko' ? rule.outputTargets.minCharsKo : rule.outputTargets.minCharsEn}, minParagraphs=${rule.outputTargets.minParagraphs}`,
  ].join('\n')
}

export function buildLifeCyclePromptBlock(age: number, lang: 'ko' | 'en'): string {
  const phase = resolveLifeCyclePhase(age)
  const title = lang === 'ko' ? phase.title.ko : phase.title.en
  const mission = lang === 'ko' ? phase.mission.ko : phase.mission.en
  const risks = (lang === 'ko' ? phase.risks.ko : phase.risks.en).join(', ')
  const leverage = (lang === 'ko' ? phase.leverage.ko : phase.leverage.en).join(', ')
  const checkpoints = (lang === 'ko' ? phase.checkpoints.ko : phase.checkpoints.en).join(', ')
  return [
    '## Life Cycle Schema',
    `- Current phase: ${title} (${phase.ageStart}-${phase.ageEnd})`,
    `- Mission: ${mission}`,
    `- Risks: ${risks}`,
    `- Leverage: ${leverage}`,
    `- Checkpoints: ${checkpoints}`,
  ].join('\n')
}
