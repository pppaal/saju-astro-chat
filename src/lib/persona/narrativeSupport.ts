import type { PersonaAxisKey, PersonaAnalysis } from './types'
import { sanitizePersonaText } from './sanitize'

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


export {
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
}
export type { PersonaLocale, ScoreBand, AxisOrientation, TypeLetter, AxisMeta }
