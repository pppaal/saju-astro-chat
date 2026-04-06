import { getLocalizedArchetypes } from './archetypes'
import type {
  PersonaAnalysis,
  PersonaAxisKey,
  PersonaAxisResult,
  PersonaPole,
  PersonalityProfile,
} from './types'
import { sanitizePersonaList, sanitizePersonaPayload, sanitizePersonaText } from './sanitize'

import {
  AXIS_META,
  HERO_DEFINITION_OVERRIDES,
  LETTER_LABELS,
  MOTIVATION_BY_LETTER,
  METRIC_BY_AXIS,
  ROLE_FALLBACK_BY_CODE,
  t,
  clampScore,
  getScoreBand,
  getAxisOrientation,
  scoreBandLabel,
  parseTypeCode,
  axisRules,
  axisScore,
  confidenceBlock,
} from './narrativeSupport'
import type {
  PersonaLocale,
  ScoreBand,
  AxisOrientation,
  TypeLetter,
  AxisMeta,
  PersonaNarrative,
  PersonaNarrativeAxis,
} from './narrativeSupport'
export type { PersonaNarrative, PersonaNarrativeAxis } from './narrativeSupport'

interface AxisScoreEntry {
  key: PersonaAxisKey
  score: number
  orientation: AxisOrientation
}

function axisEntries(result: PersonaAnalysis): AxisScoreEntry[] {
  return (Object.keys(AXIS_META) as PersonaAxisKey[]).map((key) => {
    const score = axisScore(result, key)
    return {
      key,
      score,
      orientation: getAxisOrientation(score),
    }
  })
}

function topAndBottomAxes(result: PersonaAnalysis): {
  strongest: AxisScoreEntry
  growth: AxisScoreEntry
} {
  const entries = axisEntries(result)
  const strongest = [...entries].sort((a, b) => b.score - a.score)[0]
  const growth = [...entries].sort((a, b) => a.score - b.score)[0]
  return { strongest, growth }
}

function buildHero(result: PersonaAnalysis, locale: PersonaLocale): PersonaNarrative['hero'] {
  const typeCode = sanitizePersonaText(result.typeCode).toUpperCase() || 'RSLA'
  const [energy, cognition, decision, rhythm] = parseTypeCode(typeCode)
  const codeSummary = [
    `${energy} ${LETTER_LABELS[energy].ko}`,
    `${cognition} ${LETTER_LABELS[cognition].ko}`,
    `${decision} ${LETTER_LABELS[decision].ko}`,
    `${rhythm} ${LETTER_LABELS[rhythm].ko}`,
  ].join(' · ')

  const fallbackDefinition = t(
    locale,
    `${LETTER_LABELS[cognition].ko} 사고와 ${LETTER_LABELS[decision].ko} 판단을 기반으로 실행 품질을 관리하는 운영형 프로필`,
    `An execution profile that combines ${LETTER_LABELS[cognition].en} cognition with ${LETTER_LABELS[decision].en} decisions.`
  )
  const definition =
    HERO_DEFINITION_OVERRIDES[typeCode]?.[locale] ??
    HERO_DEFINITION_OVERRIDES[typeCode]?.ko ??
    fallbackDefinition

  const topBottom = topAndBottomAxes(result)
  const strongest = topBottom.strongest
  const growth = topBottom.growth
  const strongestMeta = AXIS_META[strongest.key]
  const growthMeta = AXIS_META[growth.key]

  const subcopy = sanitizePersonaList(
    [
      t(
        locale,
        `${strongestMeta.titleKo} ${strongest.score}% 축이 현재 행동을 가장 강하게 이끌고 있습니다.`,
        `${strongestMeta.titleEn} at ${strongest.score}% is the main driver of your current behavior.`
      ),
      t(
        locale,
        `${growthMeta.titleKo} ${growth.score}% 축은 상황에 따라 성과 편차가 커질 수 있어, 작은 실험으로 보완하는 것이 효과적입니다.`,
        `${growthMeta.titleEn} at ${growth.score}% may create bigger variance by context, so micro-experiments help stabilize outcomes.`
      ),
      t(
        locale,
        '이 프로필은 성향의 우열이 아니라, 현재 업무·관계에서 자주 나타나는 작동 방식을 설명합니다.',
        'This profile describes recurring operating patterns, not personal superiority.'
      ),
      sanitizePersonaText(result.compatibilityHint) ||
        t(
          locale,
          '협업에서는 서로 다른 강점을 역할로 분리할수록 마찰 비용이 줄어듭니다.',
          'In collaboration, friction drops when different strengths are separated by role.'
        ),
    ],
    4
  )

  return {
    typeName: sanitizePersonaText(result.personaName) || sanitizePersonaText(result.title),
    code: typeCode,
    codeSummary: locale === 'ko' ? codeSummary : typeCode,
    oneLineDefinition: sanitizePersonaText(definition),
    subcopy,
  }
}

function shortStrength(entry: AxisScoreEntry, locale: PersonaLocale): string {
  if (entry.key === 'decision') {
    return t(locale, '기준 중심 빠른 판단', 'Fast criteria-based decisions')
  }
  if (entry.key === 'cognition') {
    return entry.orientation === 'left'
      ? t(locale, '실행 구조 빠른 정리', 'Rapid execution structuring')
      : t(locale, '전략 대안 폭 넓음', 'Broad strategic options')
  }
  if (entry.key === 'energy') {
    return entry.orientation === 'right'
      ? t(locale, '논의 초반 추진력', 'Early discussion momentum')
      : t(locale, '깊은 집중 지속력', 'Sustained deep focus')
  }
  return entry.orientation === 'left'
    ? t(locale, '루틴 기반 안정성', 'Routine-based stability')
    : t(locale, '변화 대응 탄력성', 'Adaptive response speed')
}

function shortCaution(entry: AxisScoreEntry, locale: PersonaLocale): string {
  if (entry.key === 'cognition') {
    return t(locale, '대안 탐색 폭 축소', 'Narrow option exploration')
  }
  if (entry.key === 'energy') {
    return entry.orientation === 'left'
      ? t(locale, '초반 발화 지연', 'Delayed early voice')
      : t(locale, '사회적 피로 누적', 'Social fatigue buildup')
  }
  if (entry.key === 'decision') {
    return entry.orientation === 'right'
      ? t(locale, '관계 맥락 누락', 'Missing relational context')
      : t(locale, '결론 타이밍 지연', 'Delayed final closure')
  }
  return entry.orientation === 'left'
    ? t(locale, '변화 대응 지연', 'Slow adaptation to change')
    : t(locale, '우선순위 분산', 'Priority scattering')
}

function detailedStrength(entry: AxisScoreEntry, locale: PersonaLocale): string {
  const meta = AXIS_META[entry.key]
  return t(
    locale,
    `${meta.titleKo} 축 ${entry.score}% 구간에서는 ${shortStrength(entry, locale)}이 강점으로 작동합니다.`,
    `${meta.titleEn} at ${entry.score}% reliably reproduces ${shortStrength(entry, locale)}.`
  )
}

function detailedRisk(entry: AxisScoreEntry, locale: PersonaLocale): string {
  const meta = AXIS_META[entry.key]
  return t(
    locale,
    `${meta.titleKo} 축 ${entry.score}% 구간에서는 ${shortCaution(entry, locale)} 패턴이 나타날 수 있습니다.`,
    `At ${meta.titleEn} ${entry.score}%, the pattern of ${shortCaution(entry, locale)} can emerge.`
  )
}

function buildSnapshot(
  result: PersonaAnalysis,
  locale: PersonaLocale
): PersonaNarrative['snapshot'] & { strengthsLong: string[]; risksLong: string[] } {
  const entries = axisEntries(result)
  const sortedHigh = [...entries].sort((a, b) => b.score - a.score)
  const sortedLow = [...entries].sort((a, b) => a.score - b.score)

  const strengthsShort = sanitizePersonaList(
    [
      shortStrength(sortedHigh[0], locale),
      shortStrength(sortedHigh[1], locale),
      shortStrength(sortedHigh[2], locale),
    ],
    3
  )
  const cautionShort = sanitizePersonaList(
    [shortCaution(sortedLow[0], locale), shortCaution(sortedLow[1], locale)],
    2
  )
  const fitEnvironments = sanitizePersonaList(
    [
      t(locale, '역할·기준 명확한 팀', 'Teams with clear role and criteria'),
      sortedHigh[0].key === 'decision'
        ? t(locale, '결정 속도 요구 환경', 'Decision-speed critical environments')
        : t(locale, '협업-집중 혼합 환경', 'Mixed collaboration-focus environment'),
    ],
    2
  )
  const wobbleConditions = sanitizePersonaList(
    [
      sortedLow[0].key === 'cognition'
        ? t(locale, '대안 탐색 없는 반복 실행', 'Repeated execution without option scan')
        : t(locale, '기준 없는 급한 의사결정', 'Urgent decisions without explicit criteria'),
      sortedLow[1].key === 'rhythm'
        ? t(locale, '예측 불가 요청 폭증', 'Surge of unpredictable requests')
        : t(locale, '과속·과소통 동시 발생', 'High speed with low communication'),
    ],
    2
  )

  const strengthsLong = sanitizePersonaList(
    [
      detailedStrength(sortedHigh[0], locale),
      detailedStrength(sortedHigh[1], locale),
      detailedStrength(sortedHigh[2], locale),
      ...sanitizePersonaList(result.strengths, 2),
    ],
    4
  )
  const risksLong = sanitizePersonaList(
    [
      detailedRisk(sortedLow[0], locale),
      detailedRisk(sortedLow[1], locale),
      ...sanitizePersonaList(result.challenges, 2),
    ],
    3
  )

  return {
    strengths: strengthsShort,
    cautions: cautionShort,
    fitEnvironments,
    wobbleConditions,
    scoreNote: t(
      locale,
      '퍼센트는 오른쪽 성향(외향/비전/논리/유동)으로 기운 정도이며, 50%는 균형에 가깝습니다.',
      'Percent indicates leaning toward the right-side trait (Radiant/Visionary/Logic/Flow), while 50% means near-balance.'
    ),
    strengthsLong,
    risksLong,
  }
}

function buildAxes(result: PersonaAnalysis, locale: PersonaLocale): PersonaNarrativeAxis[] {
  return axisEntries(result).map((entry) => {
    const meta = AXIS_META[entry.key]
    const rules = axisRules(entry.key, entry.orientation, locale)
    const leftLabel = `${meta.leftKo} (${meta.leftEn})`
    const rightLabel = `${meta.rightKo} (${meta.rightEn})`
    const dominantLabel =
      entry.orientation === 'balanced'
        ? t(locale, '균형 구간', 'Balanced')
        : entry.orientation === 'left'
          ? meta.leftKo
          : meta.rightKo

    return {
      key: entry.key,
      title: t(locale, meta.titleKo, meta.titleEn),
      score: entry.score,
      scoreBandLabel: scoreBandLabel(entry.score, locale),
      leftLabel,
      rightLabel,
      dominantLabel,
      currentPosition: rules.currentPosition,
      favorableSituation: rules.favorableSituation,
      overdriveRisk: rules.overdriveRisk,
      microAdjustment: rules.microAdjustment,
    }
  })
}

function buildMechanism(
  result: PersonaAnalysis,
  locale: PersonaLocale
): PersonaNarrative['mechanism'] & { motivations: string[] } {
  const typeCode = sanitizePersonaText(result.typeCode).toUpperCase() || 'RSLA'
  const [energyLetter, cognitionLetter, decisionLetter, rhythmLetter] = parseTypeCode(typeCode)
  const energy = axisScore(result, 'energy')
  const cognition = axisScore(result, 'cognition')
  const decision = axisScore(result, 'decision')
  const rhythm = axisScore(result, 'rhythm')
  const strongest = topAndBottomAxes(result).strongest
  const strongestMeta = AXIS_META[strongest.key]

  const lines = sanitizePersonaList(
    [
      t(
        locale,
        `코드 ${typeCode}는 ${LETTER_LABELS[energyLetter].ko}-${LETTER_LABELS[cognitionLetter].ko}-${LETTER_LABELS[decisionLetter].ko}-${LETTER_LABELS[rhythmLetter].ko} 조합으로 작동합니다.`,
        `Code ${typeCode} combines ${LETTER_LABELS[energyLetter].en}-${LETTER_LABELS[cognitionLetter].en}-${LETTER_LABELS[decisionLetter].en}-${LETTER_LABELS[rhythmLetter].en}.`
      ),
      t(
        locale,
        `${strongestMeta.titleKo} ${strongest.score}%가 상대적으로 높아, 관련 장면에서 일관된 강점이 먼저 나타납니다.`,
        `${strongestMeta.titleEn} at ${strongest.score}% is relatively strongest, so its pattern appears first in relevant situations.`
      ),
      t(
        locale,
        `사고 ${cognition}%는 ${cognition <= 33 ? '구조' : cognition >= 67 ? '비전' : '균형'} 쪽 패턴을 보여 협업 설계 방식에 직접 영향을 줍니다.`,
        `Cognition at ${cognition}% shows a ${cognition <= 33 ? 'structured' : cognition >= 67 ? 'visionary' : 'balanced'} pattern that directly shapes collaboration design.`
      ),
      t(
        locale,
        `에너지 ${energy}%와 리듬 ${rhythm}%의 조합은 회의 템포와 회복 속도를 결정하며, 과속 구간의 리스크 관리 포인트를 만듭니다.`,
        `The combination of Energy ${energy}% and Rhythm ${rhythm}% sets meeting tempo and recovery speed, defining risk points under acceleration.`
      ),
      t(
        locale,
        '협업에서는 “기준 합의 → 역할 정렬 → 예외 규칙 확인” 순서가 맞을 때 재작업 비용이 가장 낮아집니다.',
        'In collaboration, “criteria alignment → role alignment → exception check” gives the lowest rework cost.'
      ),
    ],
    5
  )

  const motivations = sanitizePersonaList(
    [
      t(locale, MOTIVATION_BY_LETTER[energyLetter].ko, MOTIVATION_BY_LETTER[energyLetter].en),
      t(locale, MOTIVATION_BY_LETTER[cognitionLetter].ko, MOTIVATION_BY_LETTER[cognitionLetter].en),
      t(locale, MOTIVATION_BY_LETTER[decisionLetter].ko, MOTIVATION_BY_LETTER[decisionLetter].en),
    ],
    3
  )

  return { title: t(locale, '작동 원리', 'Mechanism'), lines, motivations }
}

function buildRelationshipPlaybook(
  result: PersonaAnalysis,
  locale: PersonaLocale
): PersonaNarrative['relationshipPlaybook'] {
  const growthAxis = topAndBottomAxes(result).growth.key
  const growthMeta = AXIS_META[growthAxis]

  const start = t(
    locale,
    '시작: 첫 대화에서 목표·기대치·의사결정 기준을 3문장으로 맞추면 관계 온도가 빠르게 안정됩니다.',
    'Start: align goal, expectation, and decision criteria in three sentences to stabilize relational temperature fast.'
  )
  const maintain = t(
    locale,
    '유지: 주 1회 10분 체크인으로 진행률과 감정 신호를 함께 확인하세요.',
    'Maintain: run one 10-minute weekly check-in covering progress and emotional signals.'
  )
  const conflict = t(
    locale,
    `갈등: ${growthMeta.titleKo} 축이 흔들릴 때 오해가 커지므로, 사실-해석-요청 순서로 말하면 비용이 줄어듭니다.`,
    `Conflict: when ${growthMeta.titleEn} wobbles, misunderstanding grows; use fact-interpretation-request order to reduce cost.`
  )
  const recovery = t(
    locale,
    '회복: 합의 후 24시간 내 후속 문장을 남기면 재충돌 확률을 낮출 수 있습니다.',
    'Recovery: leave one follow-up sentence within 24 hours after agreement to lower relapse risk.'
  )

  const scripts = sanitizePersonaList(
    [
      t(
        locale,
        '“지금은 제 해석이 빠를 수 있어요. 먼저 우려 지점을 1개만 알려주실래요?”',
        '"My interpretation may be fast right now. Could you share one main concern first?"'
      ),
      t(
        locale,
        '“결론부터 말하면 A안입니다. 다만 수용도를 위해 영향받는 사람을 같이 확인하고 결정하죠.”',
        '"Bottom line, I prefer option A. For acceptance, let’s confirm who is impacted before finalizing."'
      ),
    ],
    2
  )

  return {
    start,
    maintain,
    conflict,
    recovery,
    scripts,
    compatibility: {
      complementaryTraits: sanitizePersonaList(
        [
          t(
            locale,
            '결정 전에 맥락을 짧게 정리해 주는 상대',
            'A partner who briefly frames context before decisions'
          ),
          t(
            locale,
            '아이디어를 실행 단위로 쪼개는 습관이 있는 상대',
            'A partner who decomposes ideas into executable units'
          ),
          t(
            locale,
            '피드백을 감정이 아닌 규칙으로 표현하는 상대',
            'A partner who frames feedback with rules, not moods'
          ),
        ],
        3
      ),
      collisionPoints: sanitizePersonaList(
        [
          t(
            locale,
            '속도 우선 대화에서 정서 신호가 누락될 때',
            'When emotional signals are missed in speed-first dialogue'
          ),
          t(
            locale,
            '변경 요청 기준이 합의되지 않은 채 일정이 밀릴 때',
            'When schedule slips without agreed change criteria'
          ),
        ],
        2
      ),
      operatingRoutine: t(
        locale,
        '운영 루틴: 회의 시작 5분에 목적-기준-역할 순서로 합의하고, 종료 전에 다음 책임자를 1명 지정합니다.',
        'Operating routine: spend the first 5 minutes aligning objective-criteria-roles, then assign one next owner before ending.'
      ),
      optionalCta: t(
        locale,
        '원하면 상대 유형과 비교해볼 수 있어요.',
        'If you want, you can compare with a partner profile.'
      ),
    },
  }
}

function buildRoleFit(result: PersonaAnalysis, locale: PersonaLocale): PersonaNarrative['roleFit'] {
  const typeCode = sanitizePersonaText(result.typeCode).toUpperCase() || 'RSLA'
  const rolesFromResult = sanitizePersonaList(result.recommendedRoles, 3)
  const fallbackRoles =
    ROLE_FALLBACK_BY_CODE[typeCode]?.[locale] ?? ROLE_FALLBACK_BY_CODE.default[locale]
  const shineRoles = rolesFromResult.length > 0 ? rolesFromResult : fallbackRoles

  const growthAxis = topAndBottomAxes(result).growth
  const avoidEnvironments = sanitizePersonaList(
    [
      growthAxis.key === 'cognition'
        ? t(
            locale,
            '대안 검토 없이 속도만 요구하는 환경',
            'Environments demanding speed without option review'
          )
        : t(
            locale,
            '역할 경계 없이 요청이 누적되는 환경',
            'Environments where requests pile up without role boundaries'
          ),
      growthAxis.key === 'energy'
        ? t(
            locale,
            '연속 대면 일정이 과도한 환경',
            'Environments with excessive back-to-back meetings'
          )
        : t(
            locale,
            '변경 기준 없이 우선순위가 수시로 바뀌는 환경',
            'Environments with constant priority shifts and no change rules'
          ),
    ],
    2
  )

  const operatingChecklist = sanitizePersonaList(
    [
      t(locale, '핵심 목표를 1문장으로 고정한다.', 'Lock the core objective in one sentence.'),
      t(locale, '결정 기준을 최대 3개로 제한한다.', 'Limit decision criteria to three.'),
      t(locale, '역할 책임자를 명시한다.', 'Name an explicit owner for each role.'),
      t(locale, '예외 처리 기준을 사전에 합의한다.', 'Agree exception rules upfront.'),
      t(locale, '주간 지표 1개를 기록한다.', 'Track one weekly metric.'),
      t(
        locale,
        '리뷰에서 재작업 원인을 1개만 수정한다.',
        'Fix one root cause of rework in each review.'
      ),
    ],
    6
  )

  return { shineRoles, avoidEnvironments, operatingChecklist }
}

function buildActionPlan(
  result: PersonaAnalysis,
  locale: PersonaLocale
): PersonaNarrative['actionPlan'] {
  const growth = topAndBottomAxes(result).growth
  const axisCard = buildAxes(result, locale).find((axis) => axis.key === growth.key)
  const todayTask =
    axisCard?.microAdjustment ??
    t(
      locale,
      '10분: 오늘 회의 1건에서 기준 1개와 확인 질문 1개를 먼저 사용해 보세요.',
      '10 min: in one meeting today, use one criterion and one check question first.'
    )
  const metric = t(locale, METRIC_BY_AXIS[growth.key].ko, METRIC_BY_AXIS[growth.key].en)
  const growthTip = sanitizePersonaList(result.growthTips, 1)[0]
  const growthTipLine = growthTip
    ? t(locale, `이번 주 2: ${growthTip}`, `Week task 2: ${growthTip}`)
    : t(
        locale,
        '이번 주 2: 의사결정 로그에 “선택 기준/대안/결과”를 1줄씩 남깁니다.',
        'Week task 2: keep one-line decision logs for criteria, alternatives, and outcomes.'
      )

  return {
    today: {
      title: t(locale, '오늘의 10분 액션', 'Today’s 10-Minute Action'),
      task: todayTask,
      metric,
    },
    thisWeek: sanitizePersonaList(
      [
        t(
          locale,
          `이번 주 1: ${AXIS_META[growth.key].titleKo} 축 보완을 위해 회의 전 3줄 프리브리프를 3회 실행합니다.`,
          `Week task 1: run a three-line pre-brief three times to improve ${AXIS_META[growth.key].titleEn}.`
        ),
        growthTipLine,
        t(
          locale,
          '이번 주 3: 금요일 15분 회고에서 지연 원인 1개와 개선 1개를 확정합니다.',
          'Week task 3: in a 15-minute Friday review, lock one delay cause and one improvement.'
        ),
      ],
      3
    ),
    twoWeekExperiment: {
      title: t(
        locale,
        `${AXIS_META[growth.key].titleKo} 축 보정 실험 (2주)`,
        `${AXIS_META[growth.key].titleEn} calibration experiment (2 weeks)`
      ),
      steps: sanitizePersonaList(
        [
          t(
            locale,
            '1주차: 동일 유형 업무 3건에 동일한 체크리스트를 적용합니다.',
            'Week 1: apply one checklist to three similar tasks.'
          ),
          t(
            locale,
            '2주차: 체크리스트 항목 중 효과가 낮은 1개를 교체해 A/B로 비교합니다.',
            'Week 2: replace one low-impact checklist item and run an A/B comparison.'
          ),
          t(
            locale,
            '종료일: 체감 기록과 지표를 합쳐 다음 2주 운영 규칙을 1개 확정합니다.',
            'End day: combine observed notes and metrics to lock one rule for the next two weeks.'
          ),
        ],
        3
      ),
      metric,
    },
  }
}

function buildDisclosure(
  confidence: PersonaNarrative['confidence'],
  locale: PersonaLocale
): PersonaNarrative['disclosure'] {
  return {
    nonClinical: t(
      locale,
      '이 결과는 비임상 자기이해 도구이며, 진단 또는 치료 판단에 사용되지 않습니다.',
      'This result is a non-clinical self-reflection tool and is not for diagnosis or treatment.'
    ),
    contextImpact: t(
      locale,
      `점수는 컨디션, 최근 사건, 팀 환경에 따라 변동될 수 있습니다. (현재 신뢰도 ${confidence.score}%)`,
      `Scores can vary with condition, recent events, and team context. (Current confidence ${confidence.score}%)`
    ),
    retestCriteria: t(
      locale,
      '재테스트 권장: 수면/업무 강도가 안정된 시점, 또는 역할 변화 후 2~4주 시점.',
      'Retest recommended when sleep/workload is stable, or 2-4 weeks after role changes.'
    ),
    interpretationRules: sanitizePersonaList(
      [
        t(
          locale,
          '점수는 우열이 아니라 “어느 쪽으로 기울었는가”를 의미합니다.',
          'Scores indicate leaning direction, not superiority.'
        ),
        t(
          locale,
          '낮은 신뢰도에서는 결론보다 실험 가설로 사용하세요.',
          'Under low confidence, use this as an experiment hypothesis.'
        ),
        t(
          locale,
          '한 번에 한 축만 조정해야 체감 차이를 확인하기 쉽습니다.',
          'Adjust one axis at a time for clearer observed differences.'
        ),
      ],
      3
    ),
  }
}

function buildRiskAndStrengthLists(snapshot: { strengthsLong: string[]; risksLong: string[] }): {
  strengths: string[]
  risks: string[]
} {
  return {
    strengths: snapshot.strengthsLong,
    risks: snapshot.risksLong,
  }
}

export function buildPersonaNarrative(
  result: PersonaAnalysis,
  locale: PersonaLocale = 'ko'
): PersonaNarrative {
  const safeLocale: PersonaLocale = locale === 'en' ? 'en' : 'ko'
  const hero = buildHero(result, safeLocale)
  const confidence = confidenceBlock(clampScore(result.consistencyScore), safeLocale)
  const snapshot = buildSnapshot(result, safeLocale)
  const axes = buildAxes(result, safeLocale)
  const mechanism = buildMechanism(result, safeLocale)
  const playbook = buildRelationshipPlaybook(result, safeLocale)
  const roleFit = buildRoleFit(result, safeLocale)
  const actionPlan = buildActionPlan(result, safeLocale)
  const disclosure = buildDisclosure(confidence, safeLocale)
  const strengthRisk = buildRiskAndStrengthLists(snapshot)

  return sanitizePersonaPayload({
    hero,
    confidence,
    snapshot: {
      strengths: snapshot.strengths,
      cautions: snapshot.cautions,
      fitEnvironments: snapshot.fitEnvironments,
      wobbleConditions: snapshot.wobbleConditions,
      scoreNote: snapshot.scoreNote,
    },
    axes,
    mechanism: {
      title: mechanism.title,
      lines: mechanism.lines,
    },
    motivations: mechanism.motivations,
    strengths: strengthRisk.strengths,
    risks: strengthRisk.risks,
    roleFit,
    relationshipPlaybook: playbook,
    actionPlan,
    disclosure,
  })
}

function buildDefaultProfile(): PersonalityProfile {
  return {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50,
    introversion: 50,
    intuition: 50,
    thinking: 50,
    perceiving: 50,
    enneagram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
  }
}

export function buildPersonaRenderSample(
  typeCode: string = 'RSLA',
  locale: PersonaLocale = 'ko'
): PersonaAnalysis {
  const safeLocale: PersonaLocale = locale === 'en' ? 'en' : 'ko'
  const safeTypeCode = sanitizePersonaText(typeCode).toUpperCase() || 'RSLA'
  const archetypes = getLocalizedArchetypes(safeLocale)
  const fallbackArchetype = archetypes.RSLA
  const archetype = archetypes[safeTypeCode] ?? fallbackArchetype

  return {
    title: archetype.name,
    personaName: archetype.name,
    summary: archetype.summary,
    typeCode: safeTypeCode,
    axes: {
      energy: { pole: 'radiant' as PersonaPole, score: 61 },
      cognition: { pole: 'structured' as PersonaPole, score: 32 },
      decision: { pole: 'logic' as PersonaPole, score: 63 },
      rhythm: { pole: 'anchor' as PersonaPole, score: 37 },
    } as Record<PersonaAxisKey, PersonaAxisResult>,
    consistencyScore: 25,
    consistencyLabel: 'low',
    primaryColor: '#2f5e83',
    secondaryColor: '#7aa2b8',
    strengths: sanitizePersonaList(archetype.strengths, 3),
    challenges: sanitizePersonaList(archetype.cautions, 2),
    career: sanitizePersonaList(archetype.idealRoles, 3).join(', '),
    relationships: sanitizePersonaText(archetype.compatibilityHint),
    guidance: sanitizePersonaList(archetype.growth, 2).join(' '),
    growthTips: sanitizePersonaList(archetype.growth, 3),
    keyMotivations: sanitizePersonaList(
      [
        t(safeLocale, '운영 안정성과 실행 완결', 'Operational stability and execution closure'),
        t(safeLocale, '명확한 기준과 책임 분배', 'Clear criteria and accountable ownership'),
        t(safeLocale, '리스크를 낮춘 지속 성과', 'Sustained outcomes with lower risk'),
      ],
      3
    ),
    recommendedRoles: sanitizePersonaList(archetype.idealRoles, 4),
    compatibilityHint: sanitizePersonaText(archetype.compatibilityHint),
    profile: buildDefaultProfile(),
  }
}

export function buildPersonaNarrativeSample(locale: PersonaLocale = 'ko'): PersonaNarrative {
  return buildPersonaNarrative(buildPersonaRenderSample('RSLA', locale), locale)
}
