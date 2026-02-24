import { getLocalizedArchetypes } from './archetypes'
import type {
  PersonaAnalysis,
  PersonaAxisKey,
  PersonaAxisResult,
  PersonaPole,
  PersonalityProfile,
} from './types'
import { sanitizePersonaList, sanitizePersonaPayload, sanitizePersonaText } from './sanitize'

type PersonaLocale = 'ko' | 'en'
type ScoreBand = 'low' | 'mid' | 'high'
type AxisOrientation = 'left' | 'right' | 'balanced'
type TypeLetter = 'R' | 'G' | 'V' | 'S' | 'L' | 'H' | 'A' | 'F'

interface AxisMeta {
  key: PersonaAxisKey
  titleKo: string
  titleEn: string
  leftKo: string
  leftEn: string
  rightKo: string
  rightEn: string
  leftCode: TypeLetter
  rightCode: TypeLetter
}

export interface PersonaNarrativeAxis {
  key: PersonaAxisKey
  title: string
  score: number
  scoreBandLabel: string
  leftLabel: string
  rightLabel: string
  dominantLabel: string
  currentPosition: string
  favorableSituation: string
  overdriveRisk: string
  microAdjustment: string
}

export interface PersonaNarrative {
  hero: {
    typeName: string
    code: string
    codeSummary: string
    oneLineDefinition: string
    subcopy: string[]
  }
  confidence: {
    score: number
    level: 'low' | 'medium' | 'high'
    levelLabel: string
    interpretation: string
    usageGuide: string[]
    experimentRule: string
  }
  snapshot: {
    strengths: string[]
    cautions: string[]
    fitEnvironments: string[]
    wobbleConditions: string[]
    scoreNote: string
  }
  axes: PersonaNarrativeAxis[]
  mechanism: {
    title: string
    lines: string[]
  }
  motivations: string[]
  strengths: string[]
  risks: string[]
  roleFit: {
    shineRoles: string[]
    avoidEnvironments: string[]
    operatingChecklist: string[]
  }
  relationshipPlaybook: {
    start: string
    maintain: string
    conflict: string
    recovery: string
    scripts: string[]
    compatibility: {
      complementaryTraits: string[]
      collisionPoints: string[]
      operatingRoutine: string
      optionalCta: string
    }
  }
  actionPlan: {
    today: {
      title: string
      task: string
      metric: string
    }
    thisWeek: string[]
    twoWeekExperiment: {
      title: string
      steps: string[]
      metric: string
    }
  }
  disclosure: {
    nonClinical: string
    contextImpact: string
    retestCriteria: string
    interpretationRules: string[]
  }
}

const AXIS_META: Record<PersonaAxisKey, AxisMeta> = {
  energy: {
    key: 'energy',
    titleKo: '에너지',
    titleEn: 'Energy',
    leftKo: '내향',
    leftEn: 'Grounded',
    rightKo: '외향',
    rightEn: 'Radiant',
    leftCode: 'G',
    rightCode: 'R',
  },
  cognition: {
    key: 'cognition',
    titleKo: '사고',
    titleEn: 'Cognition',
    leftKo: '구조',
    leftEn: 'Structured',
    rightKo: '비전',
    rightEn: 'Visionary',
    leftCode: 'S',
    rightCode: 'V',
  },
  decision: {
    key: 'decision',
    titleKo: '결정',
    titleEn: 'Decision',
    leftKo: '공감',
    leftEn: 'Empathic',
    rightKo: '논리',
    rightEn: 'Logic',
    leftCode: 'H',
    rightCode: 'L',
  },
  rhythm: {
    key: 'rhythm',
    titleKo: '리듬',
    titleEn: 'Rhythm',
    leftKo: '안정',
    leftEn: 'Anchor',
    rightKo: '유동',
    rightEn: 'Flow',
    leftCode: 'A',
    rightCode: 'F',
  },
}

const HERO_DEFINITION_OVERRIDES: Record<string, { ko: string; en: string }> = {
  RSLA: {
    ko: '구조와 기준으로 팀의 속도를 안정화하고, 변동 구간에서도 실행 품질을 지키는 운영형 리더',
    en: 'An operations-focused leader who stabilizes speed with structure and protects execution quality under change.',
  },
}

const LETTER_LABELS: Record<TypeLetter, { ko: string; en: string }> = {
  R: { ko: '발산형', en: 'Radiant' },
  G: { ko: '내향형', en: 'Grounded' },
  V: { ko: '비전형', en: 'Visionary' },
  S: { ko: '구조형', en: 'Structured' },
  L: { ko: '논리형', en: 'Logic' },
  H: { ko: '공감형', en: 'Empathic' },
  A: { ko: '안정형', en: 'Anchor' },
  F: { ko: '유동형', en: 'Flow' },
}

const MOTIVATION_BY_LETTER: Record<TypeLetter, { ko: string; en: string }> = {
  R: { ko: '가시적인 진전과 속도', en: 'Visible momentum and pace' },
  G: { ko: '깊이 있는 완성과 집중', en: 'Deep completion and focus' },
  V: { ko: '새 가능성과 탐색', en: 'New possibilities and exploration' },
  S: { ko: '명확한 구조와 재현성', en: 'Clear structure and repeatability' },
  L: { ko: '기준·증거 기반 정확성', en: 'Criteria-and-evidence accuracy' },
  H: { ko: '관계 맥락과 수용성', en: 'Relational context and acceptance' },
  A: { ko: '예측 가능한 루틴', en: 'Predictable routines' },
  F: { ko: '상황 적응과 유연성', en: 'Adaptive flexibility' },
}

const METRIC_BY_AXIS: Record<PersonaAxisKey, { ko: string; en: string }> = {
  energy: {
    ko: '회의 후 에너지 저하 시간(분), 발언 편중도',
    en: 'Post-meeting energy drop (minutes), speaking concentration ratio',
  },
  cognition: {
    ko: '회의 지연률, 리워크 횟수',
    en: 'Meeting delay rate, rework count',
  },
  decision: {
    ko: '결정 재논의 횟수, 합의 도달 시간',
    en: 'Decision re-open count, time-to-agreement',
  },
  rhythm: {
    ko: '일정 지연률, 긴급 요청 비중',
    en: 'Schedule delay rate, emergency-request ratio',
  },
}

const ROLE_FALLBACK_BY_CODE: Record<string, { ko: string[]; en: string[] }> = {
  RSLA: {
    ko: ['운영 리드', '프로젝트 매니저', '프로덕트 운영'],
    en: ['Operations lead', 'Project manager', 'Product operations'],
  },
  default: {
    ko: ['문제 해결 리드', '협업 조율자', '실행 담당'],
    en: ['Problem-solving lead', 'Collaboration coordinator', 'Execution owner'],
  },
}

function t(locale: PersonaLocale, ko: string, en: string): string {
  return locale === 'ko' ? ko : en
}

function clampScore(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 50
  }
  return Math.max(0, Math.min(100, Math.round(value as number)))
}

function getScoreBand(score: number): ScoreBand {
  if (score <= 33) {
    return 'low'
  }
  if (score >= 67) {
    return 'high'
  }
  return 'mid'
}

function getAxisOrientation(score: number): AxisOrientation {
  if (score <= 33) {
    return 'left'
  }
  if (score >= 67) {
    return 'right'
  }
  return 'balanced'
}

function scoreBandLabel(score: number, locale: PersonaLocale): string {
  const band = getScoreBand(score)
  if (band === 'high') {
    return t(locale, '높음', 'High')
  }
  if (band === 'low') {
    return t(locale, '낮음', 'Low')
  }
  return t(locale, '중간', 'Mid')
}

function parseTypeCode(typeCode: string): [TypeLetter, TypeLetter, TypeLetter, TypeLetter] {
  const safe = (sanitizePersonaText(typeCode).toUpperCase() || 'RSLA').padEnd(4, 'A')
  const e = (safe[0] === 'R' || safe[0] === 'G' ? safe[0] : 'R') as TypeLetter
  const c = (safe[1] === 'V' || safe[1] === 'S' ? safe[1] : 'S') as TypeLetter
  const d = (safe[2] === 'L' || safe[2] === 'H' ? safe[2] : 'L') as TypeLetter
  const r = (safe[3] === 'A' || safe[3] === 'F' ? safe[3] : 'A') as TypeLetter
  return [e, c, d, r]
}

function axisRules(
  axis: PersonaAxisKey,
  orientation: AxisOrientation,
  locale: PersonaLocale
): {
  currentPosition: string
  favorableSituation: string
  overdriveRisk: string
  microAdjustment: string
} {
  switch (axis) {
    case 'energy':
      if (orientation === 'right') {
        return {
          currentPosition: t(
            locale,
            '외향 쪽 기울기가 커서 논의 초반에 발화를 주도하는 경향이 나타납니다.',
            'Right-leaning energy tends to lead speaking in early discussions.'
          ),
          favorableSituation: t(
            locale,
            '이해관계자 정렬이 필요한 킥오프 상황에서 속도를 만듭니다.',
            'Creates momentum in kickoffs that require stakeholder alignment.'
          ),
          overdriveRisk: t(
            locale,
            '연속 상호작용이 길어지면 판단 피로가 누적될 수 있습니다.',
            'Long interaction streaks can accumulate decision fatigue.'
          ),
          microAdjustment: t(
            locale,
            '10분: 다음 회의 전 3줄 아젠다를 먼저 공유하고, 종료 후 5분 회복 슬롯을 확보하세요.',
            '10 min: share a 3-line agenda before the next meeting and reserve a 5-minute recovery slot.'
          ),
        }
      }
      if (orientation === 'left') {
        return {
          currentPosition: t(
            locale,
            '내향 쪽 기울기가 커서 깊은 집중 구간에서 품질이 높아집니다.',
            'Left-leaning energy raises quality in deep-focus blocks.'
          ),
          favorableSituation: t(
            locale,
            '복잡한 문제를 정리하고 문서로 구조화할 때 강점이 나타납니다.',
            'Strong when structuring complex problems into documentation.'
          ),
          overdriveRisk: t(
            locale,
            '필요한 발화 타이밍을 늦추면 합의 속도가 떨어질 수 있습니다.',
            'Delayed speaking timing can slow agreement velocity.'
          ),
          microAdjustment: t(
            locale,
            '10분: 오늘 회의에서 시작 5분 안에 핵심 의견 1문장을 먼저 제시하세요.',
            '10 min: present one key sentence within the first 5 minutes of today’s meeting.'
          ),
        }
      }
      return {
        currentPosition: t(
          locale,
          '중간 구간으로, 상황에 따라 외향/내향 모드를 전환하는 편입니다.',
          'Mid-zone energy switches between outgoing and inward modes by context.'
        ),
        favorableSituation: t(
          locale,
          '협업과 집중이 번갈아 필요한 운영 환경에서 안정적으로 작동합니다.',
          'Works steadily in environments alternating collaboration and focus.'
        ),
        overdriveRisk: t(
          locale,
          '전환 기준이 없으면 일정 중반 이후 에너지 분산이 커질 수 있습니다.',
          'Without switching rules, energy scattering can grow mid-schedule.'
        ),
        microAdjustment: t(
          locale,
          '10분: 오늘 일정에 협업 블록 1개와 집중 블록 1개를 분리해 표기하세요.',
          '10 min: mark one collaboration block and one focus block separately on today’s calendar.'
        ),
      }

    case 'cognition':
      if (orientation === 'right') {
        return {
          currentPosition: t(
            locale,
            '비전 쪽 기울기가 커서 가능성과 방향을 먼저 보는 경향이 있습니다.',
            'Right-leaning cognition tends to prioritize possibilities and direction first.'
          ),
          favorableSituation: t(
            locale,
            '새 전략을 정의하거나 탐색 옵션이 많은 문제에서 강점을 냅니다.',
            'Strong in strategic framing and option-rich problems.'
          ),
          overdriveRisk: t(
            locale,
            '실행 단위가 늦게 정리되면 팀이 체감하는 진척이 낮아질 수 있습니다.',
            'If execution units are defined late, visible progress may drop.'
          ),
          microAdjustment: t(
            locale,
            '10분: 아이디어 1개를 오늘 실행 가능한 2단계 체크리스트로 쪼개세요.',
            '10 min: split one idea into a two-step checklist executable today.'
          ),
        }
      }
      if (orientation === 'left') {
        return {
          currentPosition: t(
            locale,
            '구조 쪽 기울기가 커서 문제를 실행 단위로 빠르게 정리합니다.',
            'Left-leaning cognition quickly structures problems into execution units.'
          ),
          favorableSituation: t(
            locale,
            '우선순위가 흔들리는 프로젝트에서 기준을 고정할 때 유리합니다.',
            'Useful for stabilizing criteria in shifting-priority projects.'
          ),
          overdriveRisk: t(
            locale,
            '대안 탐색 폭이 좁아지면 혁신 옵션을 놓칠 수 있습니다.',
            'Narrow exploration width can miss innovation options.'
          ),
          microAdjustment: t(
            locale,
            '10분: 의사결정 전 “대안 2개 비교” 표를 한 번 작성하세요.',
            '10 min: write one “compare two alternatives” table before deciding.'
          ),
        }
      }
      return {
        currentPosition: t(
          locale,
          '중간 구간으로, 아이디어 확장과 구조화 검증을 함께 사용합니다.',
          'Mid-zone cognition balances ideation and structured validation.'
        ),
        favorableSituation: t(
          locale,
          '기획-실행이 빠르게 반복되는 환경에서 완성도를 유지합니다.',
          'Maintains completeness in fast plan-to-execution loops.'
        ),
        overdriveRisk: t(
          locale,
          '두 모드를 동시에 쓰면 판단 시간이 길어질 수 있습니다.',
          'Using both modes at once can lengthen decision time.'
        ),
        microAdjustment: t(
          locale,
          '10분: 기획안에 “왜(비전) 1줄 + 어떻게(구조) 1줄”을 같이 적으세요.',
          '10 min: add one “why” line and one “how” line to the plan.'
        ),
      }

    case 'decision':
      if (orientation === 'right') {
        return {
          currentPosition: t(
            locale,
            '논리 쪽 기울기가 있어 기준과 근거를 우선해 결정을 정리합니다.',
            'Right-leaning decision style prioritizes criteria and evidence.'
          ),
          favorableSituation: t(
            locale,
            '책임 경계가 필요한 협업에서 재논의 비용을 줄입니다.',
            'Reduces re-open cost in collaborations needing clear accountability.'
          ),
          overdriveRisk: t(
            locale,
            '맥락 설명이 부족하면 상대가 배제감을 느낄 수 있습니다.',
            'If context is thin, others may feel excluded.'
          ),
          microAdjustment: t(
            locale,
            '10분: 결정문에 “영향받는 사람 1줄”을 추가해 수용도를 점검하세요.',
            '10 min: add one “people impact” line to the decision memo.'
          ),
        }
      }
      if (orientation === 'left') {
        return {
          currentPosition: t(
            locale,
            '공감 쪽 기울기가 있어 관계 맥락과 감정 신호를 함께 반영합니다.',
            'Left-leaning decision style integrates emotional and relational context.'
          ),
          favorableSituation: t(
            locale,
            '갈등 조정이나 민감한 피드백 상황에서 신뢰를 지키기 쉽습니다.',
            'Strong for conflict mediation and sensitive feedback contexts.'
          ),
          overdriveRisk: t(
            locale,
            '배려 비중이 커지면 결론 타이밍이 밀릴 수 있습니다.',
            'Heavy care weighting can delay closure timing.'
          ),
          microAdjustment: t(
            locale,
            '10분: 오늘 결정 1건에 숫자 기준 1개를 먼저 적고 논의를 시작하세요.',
            '10 min: write one numeric criterion before discussing today’s decision.'
          ),
        }
      }
      return {
        currentPosition: t(
          locale,
          '중간 구간으로, 논리와 공감 기준을 상황에 맞게 조정합니다.',
          'Mid-zone decision style adjusts logic and empathy by context.'
        ),
        favorableSituation: t(
          locale,
          '성과와 관계를 동시에 관리해야 하는 팀 운영 상황에 적합합니다.',
          'Fits team operations that must manage outcomes and relationships together.'
        ),
        overdriveRisk: t(
          locale,
          '기준 전환이 잦으면 메시지가 모호해질 수 있습니다.',
          'Frequent criterion switching can blur messaging.'
        ),
        microAdjustment: t(
          locale,
          '10분: 회의마다 “사실 1개 + 감정 확인 1개” 순서로 발화해 보세요.',
          '10 min: in each meeting, speak with one fact and one emotion check.'
        ),
      }

    case 'rhythm':
      if (orientation === 'right') {
        return {
          currentPosition: t(
            locale,
            '유동 쪽 기울기가 있어 변화 구간에서 빠르게 전환합니다.',
            'Right-leaning rhythm pivots quickly under changing conditions.'
          ),
          favorableSituation: t(
            locale,
            '요구사항이 자주 바뀌는 환경에서 대응 속도를 높입니다.',
            'Increases response speed where requirements change frequently.'
          ),
          overdriveRisk: t(
            locale,
            '핵심 루틴이 없으면 우선순위가 분산될 수 있습니다.',
            'Without core routines, priorities can scatter.'
          ),
          microAdjustment: t(
            locale,
            '10분: 이번 주 고정 루틴 2개를 캘린더에 먼저 잠그세요.',
            '10 min: lock two fixed routines in this week’s calendar.'
          ),
        }
      }
      if (orientation === 'left') {
        return {
          currentPosition: t(
            locale,
            '안정 쪽 기울기가 있어 계획 기반 누적 성과에 강합니다.',
            'Left-leaning rhythm is strong in plan-based cumulative execution.'
          ),
          favorableSituation: t(
            locale,
            '장기 일정과 품질 관리가 필요한 운영 업무에서 강점을 냅니다.',
            'Strong in long-horizon operations requiring quality control.'
          ),
          overdriveRisk: t(
            locale,
            '변화 비용을 과대평가하면 기회 포착이 늦어질 수 있습니다.',
            'Overestimating change cost can delay opportunity capture.'
          ),
          microAdjustment: t(
            locale,
            '10분: 이번 주 일정에 30분 실험 슬롯 1개를 의도적으로 넣어보세요.',
            '10 min: intentionally add one 30-minute experiment slot this week.'
          ),
        }
      }
      return {
        currentPosition: t(
          locale,
          '중간 구간으로, 계획과 즉흥 전환을 상황에 맞춰 조절합니다.',
          'Mid-zone rhythm adjusts between planned and flexible pacing.'
        ),
        favorableSituation: t(
          locale,
          '예측 가능한 업무와 긴급 대응이 섞인 환경에서 안정적으로 작동합니다.',
          'Works steadily in mixed environments of planned work and urgent response.'
        ),
        overdriveRisk: t(
          locale,
          '전환 기준이 흐리면 일정 중복과 누락이 생길 수 있습니다.',
          'Vague switching rules can cause schedule overlap or misses.'
        ),
        microAdjustment: t(
          locale,
          '10분: 오늘 할 일에 “고정 2개/가변 1개” 태그를 붙여 우선순위를 분리하세요.',
          '10 min: tag tasks as “2 fixed / 1 flexible” to separate priorities.'
        ),
      }
  }
}

function axisScore(result: PersonaAnalysis, key: PersonaAxisKey): number {
  return clampScore(result.axes[key]?.score)
}

function confidenceBlock(score: number, locale: PersonaLocale): PersonaNarrative['confidence'] {
  if (score <= 39) {
    return {
      score,
      level: 'low',
      levelLabel: t(locale, '낮음', 'Low'),
      interpretation: t(
        locale,
        '현재 결과는 결론이 아니라 경향 가설입니다. 컨디션과 최근 사건의 영향이 클 수 있습니다.',
        'Treat this as a directional hypothesis, not a fixed conclusion; recent context may have strong influence.'
      ),
      usageGuide: [
        t(
          locale,
          '상위 포인트 1개만 선택해 2주간 실험합니다.',
          'Pick one top point and run a 2-week experiment.'
        ),
        t(
          locale,
          '매일 1줄 체감 기록을 남겨 변화 패턴을 확인합니다.',
          'Log one-line daily observations to verify pattern shifts.'
        ),
      ],
      experimentRule: t(
        locale,
        '사용법: 상위 1개 포인트만 2주 실험 후 재검사하세요.',
        'Usage: test only one top point for 2 weeks, then retest.'
      ),
    }
  }

  if (score <= 69) {
    return {
      score,
      level: 'medium',
      levelLabel: t(locale, '중간', 'Medium'),
      interpretation: t(
        locale,
        '핵심 경향은 유효하지만, 상황 변화에 따라 강도가 달라질 수 있습니다.',
        'Core tendencies are valid, while intensity may shift by context.'
      ),
      usageGuide: [
        t(
          locale,
          '강점 1개와 성장 포인트 1개를 같이 운영하세요.',
          'Operate one strength and one growth point together.'
        ),
        t(
          locale,
          '주간 지표로 체감 여부를 확인하세요.',
          'Use weekly metrics to confirm practical impact.'
        ),
      ],
      experimentRule: t(
        locale,
        '사용법: 이번 주 3개 실행 후, 2주 차에 지표를 비교하세요.',
        'Usage: run 3 weekly actions and compare metrics on week 2.'
      ),
    }
  }

  return {
    score,
    level: 'high',
    levelLabel: t(locale, '높음', 'High'),
    interpretation: t(
      locale,
      '응답 일관성이 높아 현재 행동 패턴을 비교적 안정적으로 설명합니다.',
      'High response consistency gives a stable read on current behavior patterns.'
    ),
    usageGuide: [
      t(
        locale,
        '강점은 유지 전략으로 고정하고, 약점은 미세조정하세요.',
        'Lock strengths as maintenance strategy and tune weak points.'
      ),
      t(
        locale,
        '월 1회 점검으로 패턴 변화를 추적하세요.',
        'Track shifts with a monthly review cadence.'
      ),
    ],
    experimentRule: t(
      locale,
      '사용법: 강점 유지 1개와 보완 1개를 동시에 운영하세요.',
      'Usage: operate one maintenance action and one improvement action together.'
    ),
  }
}

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
