import type { ICPAnalysis, ICPOctantCode } from './types'
import { ICP_OCTANTS } from './analysis'
import { ICP_ARCHETYPE_PROFILES } from '@/lib/icpTest/results'

type IcpLocale = 'ko' | 'en'
type IcpAxisKey = 'agency' | 'warmth' | 'boundary' | 'resilience'
type ScoreBand = 'low' | 'mid' | 'high'

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const MOJIBAKE_REGEX = new RegExp(
  String.raw`(?:\u00C3|\u00C2|\u00F0\u0178|\u00E2\u20AC\u00A2|\u00C2\u00B7|\u00EC|\u00EB)`,
  'g'
)

const OCTANT_LABELS: Record<ICPOctantCode, { ko: string; en: string }> = {
  PA: { ko: '리더형', en: 'Leader' },
  BC: { ko: '성취형', en: 'Achiever' },
  DE: { ko: '분석형', en: 'Analyst' },
  FG: { ko: '관찰형', en: 'Observer' },
  HI: { ko: '평화형', en: 'Peacemaker' },
  JK: { ko: '협력형', en: 'Supporter' },
  LM: { ko: '친화형', en: 'Connector' },
  NO: { ko: '멘토형', en: 'Mentor' },
}

export const ICP_SAMPLE_STYLE_CODES: ICPOctantCode[] = [
  'PA',
  'BC',
  'DE',
  'FG',
  'HI',
  'JK',
  'LM',
  'NO',
]

const STYLE_TODAY_ACTION: Record<ICPOctantCode, { ko: string; en: string }> = {
  PA: {
    ko: '오늘 10분: 회의 시작 전에 의사결정 기준 2개를 먼저 공유하세요.',
    en: 'Today (10 min): share two decision criteria before the meeting starts.',
  },
  BC: {
    ko: '오늘 10분: 핵심 결정 전에 반대 근거 3개를 빠르게 체크하세요.',
    en: 'Today (10 min): quickly check three opposing reasons before a key decision.',
  },
  DE: {
    ko: '오늘 10분: 사실 1개를 말한 뒤 공감 문장 1개를 바로 붙이세요.',
    en: 'Today (10 min): after one fact, add one empathy sentence immediately.',
  },
  FG: {
    ko: '오늘 10분: 회의에서 내 의견을 최소 1회 먼저 발화하세요.',
    en: 'Today (10 min): voice your opinion at least once early in a meeting.',
  },
  HI: {
    ko: '오늘 10분: 수락 전에 내 여유(시간/에너지)를 먼저 체크하세요.',
    en: 'Today (10 min): check your capacity (time/energy) before saying yes.',
  },
  JK: {
    ko: '오늘 10분: 팀플 시작 전에 역할·기대치를 한 줄로 정렬하세요.',
    en: 'Today (10 min): align role and expectation in one sentence before teamwork.',
  },
  LM: {
    ko: '오늘 10분: 공감 후 행동 제안은 1개만 남기고 나머지는 덜어내세요.',
    en: 'Today (10 min): after empathy, keep only one action suggestion.',
  },
  NO: {
    ko: '오늘 10분: 조언 전에 “지금 조언이 필요한지” 먼저 질문하세요.',
    en: 'Today (10 min): ask whether advice is wanted before giving it.',
  },
}

const STYLE_SCENARIOS: Record<ICPOctantCode, { ko: string[]; en: string[] }> = {
  PA: {
    ko: [
      '회의: 안건을 빠르게 구조화해 결론을 앞당깁니다.',
      '팀플: 역할 분배를 선명하게 해 실행 속도를 올립니다.',
      '갈등: 결론을 서두르기 쉬워 상대 수용도 확인이 필요합니다.',
    ],
    en: [
      'Meetings: you structure agendas quickly and accelerate conclusions.',
      'Teamwork: clear role split boosts execution speed.',
      'Conflict: you may rush closure, so buy-in checks are important.',
    ],
  },
  BC: {
    ko: [
      '회의: 승부처 안건에서 집중력이 올라가 결단을 밀어붙입니다.',
      '연애/친구: 목표 중심 대화가 빠르지만 질문 비율이 낮아질 수 있습니다.',
      '갈등: 속도를 늦추고 반대 근거를 확인하면 손실을 줄입니다.',
    ],
    en: [
      'Meetings: pressure moments increase your focus and decisiveness.',
      'Close relationships: goal-driven talk is fast but questions can drop.',
      'Conflict: slowing down and checking opposing reasons lowers cost.',
    ],
  },
  DE: {
    ko: [
      '회의: 감정보다 구조를 먼저 잡아 논점을 정리합니다.',
      '팀플: 기준과 리스크를 선명히 만들어 품질을 높입니다.',
      '갈등: 사실 중심 표현이 거리감으로 읽히지 않게 공감 문장이 필요합니다.',
    ],
    en: [
      'Meetings: you organize points by structure before emotion.',
      'Teamwork: clear criteria and risk framing improve quality.',
      'Conflict: add empathy lines so fact-based speech is not read as distance.',
    ],
  },
  FG: {
    ko: [
      '회의: 관찰은 정확하지만 발화가 늦어질 수 있습니다.',
      '친구/연애: 신중한 반응으로 신뢰를 쌓지만 표현 타이밍이 중요합니다.',
      '팀플: 디테일 품질은 높지만 80% 시점 공유가 필요합니다.',
    ],
    en: [
      'Meetings: observation is precise, but speaking can be delayed.',
      'Relationships: careful responses build trust, but timing matters.',
      'Teamwork: detail quality is high, but earlier 80% sharing helps.',
    ],
  },
  HI: {
    ko: [
      '팀플: 분위기 안정화와 충돌 완화에 강점이 있습니다.',
      '연애/친구: 배려가 깊지만 내 필요를 뒤로 미루기 쉽습니다.',
      '갈등: 조율에 집중하다 결정을 늦추지 않도록 마감이 필요합니다.',
    ],
    en: [
      'Teamwork: you are strong at stabilizing mood and reducing clashes.',
      'Relationships: care is deep, but your needs can be postponed.',
      'Conflict: use deadlines so mediation does not delay decisions.',
    ],
  },
  JK: {
    ko: [
      '팀플: 사람을 연결해 실행 흐름을 안정화합니다.',
      '회의: 다수 의견을 살리지만 핵심 이슈 정면 대응이 늦어질 수 있습니다.',
      '갈등: 회피보다 명시적 합의 문장을 남기면 재발이 줄어듭니다.',
    ],
    en: [
      'Teamwork: you connect people and stabilize execution flow.',
      'Meetings: inclusive stance is strong, but direct issue handling may delay.',
      'Conflict: explicit agreement lines reduce recurrence.',
    ],
  },
  LM: {
    ko: [
      '연애/친구: 감정 회복과 유대 형성 속도가 빠릅니다.',
      '회의: 공감으로 분위기를 풀지만 경계가 흐려질 수 있습니다.',
      '갈등: 공감 뒤 행동 제안을 1개로 좁히면 피로가 줄어듭니다.',
    ],
    en: [
      'Relationships: you restore emotion and bond quickly.',
      'Meetings: empathy softens tone, but boundaries can blur.',
      'Conflict: one focused action after empathy reduces fatigue.',
    ],
  },
  NO: {
    ko: [
      '팀플: 잠재력을 보고 성장 방향을 제시하는 데 강합니다.',
      '연애/친구: 돕는 의도가 통제로 읽히지 않게 상대 속도를 존중해야 합니다.',
      '갈등: 조언 전 동의 확인이 관계 비용을 줄입니다.',
    ],
    en: [
      'Teamwork: you are strong at spotting potential and guiding growth.',
      'Relationships: respect pace so support is not read as control.',
      'Conflict: consent before advice reduces relational cost.',
    ],
  },
}

export interface IcpNarrativeAxis {
  key: IcpAxisKey
  label: string
  score: number
  levelLabel: string
  summary: string
  meaning: string
  whenGood: string
  whenRisk: string
  microAction: string
  poles: [string, string]
}

export interface IcpNarrative {
  hero: {
    title: string
    subtitle: string
    oneLiner: string
    confidenceBadgeText: string
    confidenceScore: number
    confidenceLevel: string
  }
  snapshot: {
    strengths: string[]
    risks: string[]
    bestIn: string[]
    watchFor: string[]
  }
  actions: {
    todayOneThing: string
    thisWeek: string[]
    thisMonthPlan: string[]
    twoWeekChecklist: string[]
  }
  axes: IcpNarrativeAxis[]
  archetypes: {
    primary: { code: ICPOctantCode; label: string; name: string; score: number; summary: string }
    secondary: {
      code: ICPOctantCode
      label: string
      name: string
      score: number
      summary: string
    } | null
    lowest: {
      code: ICPOctantCode
      label: string
      name: string
      score: number
      adjustmentPoint: string
    }
    ranked: Array<{ code: ICPOctantCode; label: string; name: string; score: number }>
    whyItShowsUp: string[]
    scenarioExamples: string[]
    collaborationTips: string[]
    conflictTips: string[]
  }
  confidence: {
    score: number
    levelLabel: string
    whatItMeans: string
    howToUse: string[]
  }
  whyThisResult: {
    summary: string
    lines: string[]
  }
  disclaimers: {
    nonClinical: string
    variability: string
  }
}

interface IcpNarrativeInput extends ICPAnalysis {
  locale?: string
}

export function sanitizeNarrativeText(input: string): string {
  return String(input ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(/\uFEFF/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sanitizeNarrativeList(items: string[]): string[] {
  const seen = new Set<string>()
  const cleaned: string[] = []
  items.forEach((item) => {
    const normalized = sanitizeNarrativeText(item)
    if (!normalized) return
    const key = normalized.replace(/\s+/g, '').toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    cleaned.push(normalized)
  })
  return cleaned
}

function t(locale: IcpLocale, ko: string, en: string): string {
  return locale === 'ko' ? ko : en
}

function getBand(score: number): ScoreBand {
  if (score <= 39) return 'low'
  if (score <= 69) return 'mid'
  return 'high'
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 50
  return Math.max(0, Math.min(100, Math.round(score)))
}

function toPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return clampScore(score <= 1 ? score * 100 : score)
}

function axisName(axis: string, locale: IcpLocale): string {
  const map: Record<string, [string, string]> = {
    agency: ['주도성', 'Agency'],
    warmth: ['관계 온도', 'Warmth'],
    boundary: ['경계 유연성', 'Boundary Flexibility'],
    resilience: ['회복 탄력', 'Resilience'],
  }
  const found = map[axis]
  return found ? t(locale, found[0], found[1]) : axis
}

function safeLocalizedText(input: string, fallback: string, locale: IcpLocale): string {
  const cleaned = sanitizeNarrativeText(input)
  if (!cleaned) return fallback
  if (locale === 'ko') {
    const hasHangul = /[\u3131-\u318e\uac00-\ud7a3]/.test(cleaned)
    if (!hasHangul && MOJIBAKE_REGEX.test(cleaned)) {
      return fallback
    }
  }
  return cleaned
}

function confidenceInfo(score: number, locale: IcpLocale): { level: string; meaning: string } {
  if (score >= 80) {
    return {
      level: t(locale, '높음', 'High'),
      meaning: t(
        locale,
        '응답 일관성이 높아 현재 관계 습관을 비교적 선명하게 읽을 수 있습니다.',
        'Response consistency is high, so your current interpersonal pattern is clearer.'
      ),
    }
  }
  if (score >= 60) {
    return {
      level: t(locale, '중간', 'Medium'),
      meaning: t(
        locale,
        '핵심 경향은 유효하지만 최근 컨디션의 영향이 일부 포함될 수 있습니다.',
        'Core tendency is valid, with moderate influence from current condition.'
      ),
    }
  }
  return {
    level: t(locale, '낮음', 'Low'),
    meaning: t(
      locale,
      '상태 변동 영향이 커질 수 있어 2~3주 뒤 같은 조건 재검사가 유용합니다.',
      'State fluctuation may be high, so retesting in 2-3 weeks is useful.'
    ),
  }
}

function relationshipMode(agency: number, warmth: number, locale: IcpLocale): string {
  const agencyLabel =
    agency >= 70
      ? t(locale, '주도적 소통', 'Leading communication')
      : agency <= 39
        ? t(locale, '신중한 소통', 'Careful communication')
        : t(locale, '균형형 소통', 'Balanced communication')
  const warmthLabel =
    warmth >= 70
      ? t(locale, '관계 친화형', 'Warm and affiliative')
      : warmth <= 39
        ? t(locale, '거리 조절형', 'Boundary-first')
        : t(locale, '상황 적응형', 'Context-adaptive')
  return `${agencyLabel} · ${warmthLabel}`
}

function levelByBand(band: ScoreBand, locale: IcpLocale): string {
  if (band === 'high') return t(locale, '높음', 'High')
  if (band === 'low') return t(locale, '낮음', 'Low')
  return t(locale, '중간', 'Mid')
}

function axisNarrative(axis: IcpAxisKey, score: number, locale: IcpLocale): IcpNarrativeAxis {
  const band = getBand(score)
  const base = {
    key: axis,
    score,
    levelLabel: levelByBand(band, locale),
  }

  if (axis === 'agency') {
    return {
      ...base,
      label: t(locale, '주도성', 'Agency'),
      poles: locale === 'ko' ? ['신중', '주도'] : ['Reserved', 'Initiating'],
      summary:
        band === 'high'
          ? t(
              locale,
              '결정 순간에 방향을 빠르게 잡습니다.',
              'You set direction quickly in decision moments.'
            )
          : band === 'low'
            ? t(locale, '충분히 듣고 움직이는 신중형입니다.', 'You move carefully after listening.')
            : t(
                locale,
                '리드와 협력을 상황에 맞게 전환합니다.',
                'You switch between leading and supporting by context.'
              ),
      meaning:
        band === 'high'
          ? t(
              locale,
              '회의에서 속도를 올리지만 수용도 확인이 필요합니다.',
              'You accelerate meetings, but buy-in checks are essential.'
            )
          : band === 'low'
            ? t(
                locale,
                '갈등 비용은 낮지만 타이밍을 놓칠 수 있습니다.',
                'You reduce friction but may miss timing.'
              )
            : t(
                locale,
                '필요할 때 리드하고 필요할 때 받쳐주는 균형형입니다.',
                'You lead or support as needed.'
              ),
      whenGood:
        band === 'high'
          ? t(
              locale,
              '의사결정 지연이 큰 팀에서 추진력을 만듭니다.',
              'You create momentum in decision-delayed teams.'
            )
          : band === 'low'
            ? t(
                locale,
                '관계가 예민한 대화에서 긴장을 낮춥니다.',
                'You lower tension in sensitive conversations.'
              )
            : t(
                locale,
                '역할이 자주 바뀌는 팀플에서 안정적으로 작동합니다.',
                'You work well in shifting team roles.'
              ),
      whenRisk:
        band === 'high'
          ? t(
              locale,
              '과잉 주도로 상대 반응을 놓치면 갈등 비용이 커질 수 있습니다.',
              'Over-leading can increase conflict costs.'
            )
          : band === 'low'
            ? t(
                locale,
                '중요 순간 발화 지연으로 기회를 놓칠 수 있습니다.',
                'Delayed voice in key moments can miss opportunities.'
              )
            : t(
                locale,
                '중립 유지가 길어지면 결단 타이밍이 늦어질 수 있습니다.',
                'Extended neutrality can delay decisions.'
              ),
      microAction:
        band === 'high'
          ? t(
              locale,
              '오늘 10분: 결론 전 반대 근거 1개를 먼저 확인하세요.',
              'Today: check one opposing reason before deciding.'
            )
          : band === 'low'
            ? t(
                locale,
                '오늘 10분: 회의 전 내 의견 한 줄을 메모하고 1회 먼저 말하세요.',
                'Today: note one opinion and voice it once early.'
              )
            : t(
                locale,
                '오늘 10분: 회의 시작 전 리드/검토 역할을 먼저 나누세요.',
                'Today: split lead/review roles before meetings.'
              ),
    }
  }

  if (axis === 'warmth') {
    return {
      ...base,
      label: t(locale, '관계 온도', 'Warmth'),
      poles: locale === 'ko' ? ['거리 조절', '관계 친화'] : ['Boundary-first', 'Warm'],
      summary:
        band === 'high'
          ? t(
              locale,
              '신뢰와 친밀감을 빠르게 형성합니다.',
              'You build trust and closeness quickly.'
            )
          : band === 'low'
            ? t(
                locale,
                '감정보다 구조를 우선하는 편입니다.',
                'You prioritize structure over emotional immediacy.'
              )
            : t(
                locale,
                '사람과 과업의 균형을 안정적으로 유지합니다.',
                'You maintain a stable people-task balance.'
              ),
      meaning:
        band === 'high'
          ? t(
              locale,
              '연애/친구 관계에서 연결을 빠르게 복원합니다.',
              'You restore connection quickly in close relationships.'
            )
          : band === 'low'
            ? t(
                locale,
                '객관성은 강점이지만 차갑게 보일 수 있습니다.',
                'Objectivity is a strength but can look distant.'
              )
            : t(
                locale,
                '업무와 관계를 동시에 챙기는 실무형 온도입니다.',
                'You balance work and relationships pragmatically.'
              ),
      whenGood:
        band === 'high'
          ? t(
              locale,
              '협업 초기 신뢰 형성이 중요한 상황에서 강합니다.',
              'You excel when early trust-building matters.'
            )
          : band === 'low'
            ? t(
                locale,
                '복잡한 갈등을 사실 기반으로 정리할 때 유리합니다.',
                'You are strong at fact-based conflict structuring.'
              )
            : t(
                locale,
                '새 팀에서도 관계와 성과 균형을 빠르게 맞춥니다.',
                'You stabilize social/task balance quickly in new teams.'
              ),
      whenRisk:
        band === 'high'
          ? t(
              locale,
              '경계가 흐려지면 감정 소진이 누적될 수 있습니다.',
              'Blurred boundaries can accumulate burnout.'
            )
          : band === 'low'
            ? t(
                locale,
                '감정 신호를 늦게 읽으면 오해가 쌓일 수 있습니다.',
                'Delayed emotional reading can accumulate misunderstandings.'
              )
            : t(
                locale,
                '모두를 맞추려다 핵심 이슈를 늦게 다룰 수 있습니다.',
                'Trying to satisfy everyone may delay key issues.'
              ),
      microAction:
        band === 'high'
          ? t(
              locale,
              '오늘 10분: 수용 뒤에 가능한 범위를 한 문장으로 명시하세요.',
              'Today: add one boundary sentence after empathy.'
            )
          : band === 'low'
            ? t(
                locale,
                '오늘 10분: 사실 설명 전에 공감 문장 1개를 먼저 두세요.',
                'Today: place one empathy line before facts.'
              )
            : t(
                locale,
                '오늘 10분: 팀원 1명에게 상태 체크 질문 1개를 던지세요.',
                'Today: ask one teammate a short check-in question.'
              ),
    }
  }

  if (axis === 'boundary') {
    return {
      ...base,
      label: t(locale, '경계 유연성', 'Boundary Flexibility'),
      poles: locale === 'ko' ? ['흔들림', '유연함'] : ['Unsteady', 'Flexible'],
      summary:
        band === 'high'
          ? t(
              locale,
              '기준을 지키며 상황에 맞게 조정합니다.',
              'You keep standards while adapting to context.'
            )
          : band === 'low'
            ? t(
                locale,
                '과잉 수용/통제 사이 흔들릴 수 있습니다.',
                'You may swing between over-giving and over-control.'
              )
            : t(
                locale,
                '대체로 무리 없이 경계를 조정합니다.',
                'You regulate boundaries without major strain.'
              ),
      meaning:
        band === 'high'
          ? t(
              locale,
              '역할이 불명확한 팀플에서도 기대치를 또렷하게 정리합니다.',
              'You clarify expectations even in ambiguous roles.'
            )
          : band === 'low'
            ? t(
                locale,
                '부탁을 누적 수락한 뒤 한 번에 지칠 수 있습니다.',
                'Accumulated yeses can cause sudden exhaustion.'
              )
            : t(
                locale,
                '상황별 우선순위에 맞춰 수락·거절을 조정합니다.',
                'You adjust yes/no choices by situational priority.'
              ),
      whenGood:
        band === 'high'
          ? t(
              locale,
              '요구 충돌이 큰 협업에서 조정자 역할에 강합니다.',
              'You coordinate well in high-demand conflicts.'
            )
          : band === 'low'
            ? t(
                locale,
                '초기 신뢰를 얻는 공감적 태도는 강점입니다.',
                'Empathic attitude helps build early trust.'
              )
            : t(
                locale,
                '관계 손상을 줄이면서 실무 타협점을 찾습니다.',
                'You find practical compromises with less relational damage.'
              ),
      whenRisk:
        band === 'high'
          ? t(
              locale,
              '기준 설명이 부족하면 단호함이 거리감으로 읽힐 수 있습니다.',
              'Firmness without context may feel distant.'
            )
          : band === 'low'
            ? t(
                locale,
                '거절 지연은 일정·관계 비용을 동시에 키울 수 있습니다.',
                'Delayed refusal can raise both schedule and relationship costs.'
              )
            : t(
                locale,
                '애매한 요청에 즉답하면 후반 경계가 흔들릴 수 있습니다.',
                'Quick yes to vague asks can erode later boundaries.'
              ),
      microAction:
        band === 'high'
          ? t(
              locale,
              '오늘 10분: 수락 시 범위와 종료 시점을 함께 명시하세요.',
              'Today: define scope and end point when accepting requests.'
            )
          : band === 'low'
            ? t(
                locale,
                '오늘 10분: 정중한 거절 템플릿 1개를 만들어두세요.',
                'Today: create one polite decline template.'
              )
            : t(
                locale,
                '오늘 10분: 새 요청마다 우선순위/시간/영향 3가지를 체크하세요.',
                'Today: check priority/time/impact before accepting new requests.'
              ),
    }
  }

  return {
    ...base,
    label: t(locale, '회복 탄력', 'Resilience'),
    poles: locale === 'ko' ? ['회복 지연', '회복 빠름'] : ['Slower recovery', 'Faster recovery'],
    summary:
      band === 'high'
        ? t(locale, '갈등 이후 회복 전환이 빠른 편입니다.', 'You recover quickly after conflict.')
        : band === 'low'
          ? t(locale, '스트레스 여파가 길어질 수 있습니다.', 'Stress residue may last longer.')
          : t(locale, '회복 속도는 상황에 따라 달라집니다.', 'Recovery speed varies by context.'),
    meaning:
      band === 'high'
        ? t(
            locale,
            '문제 정리 후 다음 행동으로 전환하는 속도가 빠릅니다.',
            'You pivot quickly to next actions.'
          )
        : band === 'low'
          ? t(
              locale,
              '갈등 여파가 다음 일정 집중력에 영향을 줄 수 있습니다.',
              'After-effects can reduce next-task focus.'
            )
          : t(
              locale,
              '일상 스트레스는 소화하지만 강한 이벤트 후 루틴이 필요합니다.',
              'Routine stress is manageable, but intense events need a routine.'
            ),
    whenGood:
      band === 'high'
        ? t(
            locale,
            '압박 프로젝트에서 회복-실행 사이클을 유지합니다.',
            'You sustain recover-execute cycles in pressure projects.'
          )
        : band === 'low'
          ? t(
              locale,
              '감정 신호를 세밀하게 읽어 성급한 대응을 줄입니다.',
              'You notice emotional signals and avoid rash reactions.'
            )
          : t(
              locale,
              '장기전에서 안정적으로 페이스를 유지합니다.',
              'You keep pace steadily in long runs.'
            ),
    whenRisk:
      band === 'high'
        ? t(
            locale,
            '복구가 빨라 감정 처리 생략 시 같은 갈등이 반복될 수 있습니다.',
            'Fast recovery can repeat conflict if reflection is skipped.'
          )
        : band === 'low'
          ? t(
              locale,
              '회복 없이 밀어붙이면 관계와 성과 손실이 누적됩니다.',
              'Pushing without recovery can accumulate loss.'
            )
          : t(
              locale,
              '회복 시점이 들쭉날쭉하면 컨디션 편차가 커질 수 있습니다.',
              'Irregular recovery timing can increase condition variance.'
            ),
    microAction:
      band === 'high'
        ? t(
            locale,
            '오늘 10분: 회복 후 배운 점 1줄을 남겨 재발을 막으세요.',
            'Today: write one lesson after recovery.'
          )
        : band === 'low'
          ? t(
              locale,
              '오늘 10분: 산책·메모·대화 중 하나를 바로 실행하세요.',
              'Today: run one decompression step.'
            )
          : t(
              locale,
              '오늘 10분: 스트레스 이벤트 후 24시간 점검 알림을 설정하세요.',
              'Today: set a 24-hour post-stress reminder.'
            ),
  }
}

function buildWhyThisResult(
  analysis: ICPAnalysis,
  confidenceScore: number,
  locale: IcpLocale
): { summary: string; lines: string[] } {
  const topAxes = analysis.explainability?.topAxes ?? []
  const evidence = analysis.explainability?.evidence ?? []
  const reverseCount = evidence.filter((item) => item.reverse).length
  const first =
    topAxes[0] != null
      ? t(
          locale,
          `${axisName(topAxes[0].axis, locale)} ${topAxes[0].score}점이 핵심 패턴을 만들었습니다.`,
          `${axisName(topAxes[0].axis, locale)} scored ${topAxes[0].score}, shaping your core pattern.`
        )
      : t(
          locale,
          '응답에서 반복된 선택 패턴이 핵심 성향으로 집계되었습니다.',
          'Repeated response patterns formed your core style.'
        )
  const second =
    topAxes[1] != null
      ? t(
          locale,
          `${axisName(topAxes[1].axis, locale)} 축이 보조 축으로 작동해 상황 반응을 조절합니다.`,
          `${axisName(topAxes[1].axis, locale)} works as a secondary axis for situational response.`
        )
      : t(
          locale,
          '보조 축은 상황별 반응 강도를 조절하는 역할을 했습니다.',
          'Secondary dimensions adjust response intensity by context.'
        )
  const third = t(
    locale,
    reverseCount > 0
      ? '직접문항과 역문항을 함께 반영해 한쪽 치우침을 줄였습니다.'
      : '문항 교차 검증을 통해 결과 안정성을 점검했습니다.',
    reverseCount > 0
      ? 'Both direct and reverse items were used to reduce one-sided bias.'
      : 'Cross-item validation was used to check result stability.'
  )
  const fourth = t(
    locale,
    `신뢰도 ${confidenceScore}%로, 현재 컨디션을 함께 고려하면 활용도가 높아집니다.`,
    `Confidence is ${confidenceScore}%; interpretation is strongest with current context.`
  )
  return {
    summary: t(
      locale,
      '주요 축, 응답 일관성, 문항 교차 검증을 함께 반영해 계산된 결과입니다.',
      'This result combines axis scores, response consistency, and cross-item validation.'
    ),
    lines: sanitizeNarrativeList([first, second, third, fourth]).slice(0, 4),
  }
}

function buildBestIn(axes: Array<{ key: IcpAxisKey; score: number }>, locale: IcpLocale): string[] {
  const sorted = [...axes].sort((a, b) => b.score - a.score)
  const out: string[] = []
  sorted.slice(0, 2).forEach(({ key }) => {
    if (key === 'agency')
      out.push(t(locale, '회의: 빠른 의사결정이 필요한 안건', 'Meetings requiring fast decisions'))
    if (key === 'warmth')
      out.push(
        t(locale, '연애/친구: 신뢰 회복이 필요한 대화', 'Conversations needing trust repair')
      )
    if (key === 'boundary')
      out.push(
        t(
          locale,
          '팀플: 역할·기대치 정렬이 필요한 협업',
          'Teamwork requiring role-boundary alignment'
        )
      )
    if (key === 'resilience')
      out.push(
        t(
          locale,
          '갈등 후: 빠른 회복 전환이 필요한 일정',
          'Schedules requiring quick post-conflict recovery'
        )
      )
  })
  return sanitizeNarrativeList(out).slice(0, 2)
}

function buildWatchFor(weakest: IcpAxisKey, locale: IcpLocale, risks: string[]): string[] {
  const axisRisk: Record<IcpAxisKey, string> = {
    agency: t(
      locale,
      '결단 지연으로 기회를 놓치는 패턴',
      'Missing opportunities from delayed decisions'
    ),
    warmth: t(
      locale,
      '사실 중심 대화가 거리감으로 읽히는 패턴',
      'Fact-heavy communication read as distance'
    ),
    boundary: t(
      locale,
      '과수용 뒤 급격한 거리두기 패턴',
      'Over-accommodation followed by sudden withdrawal'
    ),
    resilience: t(
      locale,
      '회복 지연으로 집중력이 떨어지는 패턴',
      'Lower focus from delayed recovery'
    ),
  }
  return sanitizeNarrativeList([axisRisk[weakest], ...risks]).slice(0, 2)
}

function buildCollabTips(style: ICPOctantCode, locale: IcpLocale): string[] {
  const name = ICP_ARCHETYPE_PROFILES[style].nameKo
  return sanitizeNarrativeList([
    t(
      locale,
      `팀플: 시작 10분 안에 목표-역할-마감을 정렬하면 ${name} 강점이 선명해집니다.`,
      'Teamwork: align goal-role-deadline in the first 10 minutes.'
    ),
    t(
      locale,
      '회의: 내 주장 1개와 상대 제안 1개를 동시에 기록해 수용도를 높이세요.',
      'Meetings: record one own point and one opposing point to improve buy-in.'
    ),
  ])
}

function buildConflictTips(style: ICPOctantCode, locale: IcpLocale): string[] {
  const name = ICP_ARCHETYPE_PROFILES[style].nameKo
  return sanitizeNarrativeList([
    t(
      locale,
      `갈등: ${name} 성향은 결론을 빠르게 내기 쉬워 24시간 냉각 후 재합의가 효과적입니다.`,
      'Conflict: add a 24-hour cooling step before final agreement.'
    ),
    t(
      locale,
      '연애/친구: 사실 설명 전에 감정 확인 질문 1개를 먼저 두세요.',
      'In close relationships, ask one emotion-check question before facts.'
    ),
  ])
}

function axisScoreMap(analysis: ICPAnalysis): Record<IcpAxisKey, number> {
  return {
    agency: clampScore(analysis.dominanceScore),
    warmth: clampScore(analysis.affiliationScore),
    boundary: clampScore(analysis.boundaryScore ?? 50),
    resilience: clampScore(analysis.resilienceScore ?? 50),
  }
}

export function buildIcpNarrative(resultData: IcpNarrativeInput): IcpNarrative {
  const locale: IcpLocale = resultData.locale === 'en' ? 'en' : 'ko'
  const scoreMap = axisScoreMap(resultData)
  const axisPairs = Object.entries(scoreMap) as Array<[IcpAxisKey, number]>
  const weakestAxis = [...axisPairs].sort((a, b) => a[1] - b[1])[0][0]
  const confidenceScore = clampScore(resultData.consistencyScore)
  const confidence = confidenceInfo(confidenceScore, locale)
  const profile = ICP_ARCHETYPE_PROFILES[resultData.primaryStyle]
  const oneLiner = safeLocalizedText(
    locale === 'ko' ? resultData.summaryKo : resultData.summary,
    locale === 'ko' ? profile.summaryKo : profile.summaryEn,
    locale
  )

  const strengths = sanitizeNarrativeList(
    locale === 'ko' ? resultData.primaryOctant.traitsKo : resultData.primaryOctant.traits
  ).slice(0, 3)
  const risks = sanitizeNarrativeList(
    (locale === 'ko' ? resultData.primaryOctant.shadowKo : resultData.primaryOctant.shadow)
      .split('/')
      .map((v) => v.trim())
  ).slice(0, 2)

  const axes = (['agency', 'warmth', 'boundary', 'resilience'] as IcpAxisKey[]).map((key) =>
    axisNarrative(key, scoreMap[key], locale)
  )
  const ranked = (Object.entries(resultData.octantScores) as Array<[ICPOctantCode, number]>)
    .map(([code, raw]) => {
      const octant = ICP_OCTANTS[code]
      return {
        code,
        label: t(locale, OCTANT_LABELS[code].ko, OCTANT_LABELS[code].en),
        name: locale === 'ko' ? octant.korean : octant.name,
        score: toPercent(raw),
      }
    })
    .sort((a, b) => b.score - a.score)

  const primary = ranked[0]
  const secondary = ranked[1] ?? null
  const lowest = ranked[ranked.length - 1]
  const whyThisResult = buildWhyThisResult(resultData, confidenceScore, locale)
  const axisTodayAction = axes.find((item) => item.key === weakestAxis)?.microAction ?? ''
  const styleTodayAction = t(
    locale,
    STYLE_TODAY_ACTION[resultData.primaryStyle].ko,
    STYLE_TODAY_ACTION[resultData.primaryStyle].en
  )
  const scenarioExamples = sanitizeNarrativeList(
    locale === 'ko'
      ? STYLE_SCENARIOS[resultData.primaryStyle].ko
      : STYLE_SCENARIOS[resultData.primaryStyle].en
  )
  const weekly = sanitizeNarrativeList([
    ...(locale === 'ko'
      ? resultData.primaryOctant.growthRecommendationsKo
      : resultData.primaryOctant.growthRecommendations),
    axisTodayAction,
  ]).slice(0, 3)

  return {
    hero: {
      title: t(
        locale,
        `${resultData.primaryOctant.korean} (${resultData.primaryStyle})`,
        `${resultData.primaryOctant.name} (${resultData.primaryStyle})`
      ),
      subtitle: relationshipMode(scoreMap.agency, scoreMap.warmth, locale),
      oneLiner,
      confidenceBadgeText: t(
        locale,
        `신뢰도 ${confidenceScore}%`,
        `Confidence ${confidenceScore}%`
      ),
      confidenceScore,
      confidenceLevel: confidence.level,
    },
    snapshot: {
      strengths,
      risks,
      bestIn: buildBestIn(
        axisPairs.map(([key, score]) => ({ key, score })),
        locale
      ),
      watchFor: buildWatchFor(weakestAxis, locale, risks),
    },
    actions: {
      todayOneThing: styleTodayAction,
      thisWeek: weekly,
      thisMonthPlan: sanitizeNarrativeList([
        t(
          locale,
          '1주차: 반복 갈등 장면 1개 기록하고 패턴 확인하기',
          'Week 1: log one repeated conflict scene'
        ),
        t(
          locale,
          '2주차: 강점 축 1개와 보완 축 1개를 같이 쓰는 실험하기',
          'Week 2: run one experiment using strength + adjustment axis'
        ),
        t(
          locale,
          '4주차: 신뢰하는 사람 1명에게 변화 피드백 받기',
          'Week 4: get one feedback from trusted person'
        ),
      ]).slice(0, 3),
      twoWeekChecklist: sanitizeNarrativeList([
        t(locale, 'D1: 오늘의 10분 행동 1개 실행', 'D1: complete one 10-minute action'),
        t(
          locale,
          'D3: 회의/대화에서 반대 의견 1개 먼저 확인',
          'D3: verify one opposing view first'
        ),
        t(locale, 'D5: 관계 체크인 15분 진행', 'D5: run a 15-minute check-in'),
        t(locale, 'D7: 지난 갈등 장면 1개 리뷰', 'D7: review one recent conflict'),
        t(locale, 'D10: 거절/수락 문장 템플릿 1개 업데이트', 'D10: update one yes/no template'),
        t(
          locale,
          'D14: 3줄 회고 후 다음 2주 목표 설정',
          'D14: write a 3-line review and set next 2-week goal'
        ),
      ]),
    },
    axes,
    archetypes: {
      primary: {
        code: primary.code,
        label: primary.label,
        name: primary.name,
        score: primary.score,
        summary: safeLocalizedText(
          locale === 'ko'
            ? ICP_ARCHETYPE_PROFILES[primary.code].summaryKo
            : ICP_ARCHETYPE_PROFILES[primary.code].summaryEn,
          oneLiner,
          locale
        ),
      },
      secondary: secondary
        ? {
            code: secondary.code,
            label: secondary.label,
            name: secondary.name,
            score: secondary.score,
            summary: safeLocalizedText(
              locale === 'ko'
                ? ICP_ARCHETYPE_PROFILES[secondary.code].summaryKo
                : ICP_ARCHETYPE_PROFILES[secondary.code].summaryEn,
              '',
              locale
            ),
          }
        : null,
      lowest: {
        code: lowest.code,
        label: lowest.label,
        name: lowest.name,
        score: lowest.score,
        adjustmentPoint: t(
          locale,
          `${lowest.label}(${lowest.score}점)은 덜 쓰는 모드입니다. 갈등 시 속도를 늦추고 질문 비율을 높이면 보완됩니다.`,
          `${lowest.label} (${lowest.score}) is less used. Slow down and ask more questions in conflict to balance it.`
        ),
      },
      ranked,
      whyItShowsUp: sanitizeNarrativeList([
        t(
          locale,
          `${axisName(axisPairs.sort((a, b) => b[1] - a[1])[0][0], locale)} 축이 가장 강하게 작동했습니다.`,
          'Top axis contributed the most to this style.'
        ),
        t(
          locale,
          `${primary.label} ${primary.score}점, ${secondary?.label ?? t(locale, '보조 원형', 'Secondary')} ${secondary?.score ?? 0}점 조합입니다.`,
          `Top combination is ${primary.label} ${primary.score} and ${secondary?.label ?? 'Secondary'} ${secondary?.score ?? 0}.`
        ),
        whyThisResult.lines[0] ?? '',
      ]),
      scenarioExamples,
      collaborationTips: buildCollabTips(resultData.primaryStyle, locale),
      conflictTips: buildConflictTips(resultData.primaryStyle, locale),
    },
    confidence: {
      score: confidenceScore,
      levelLabel: confidence.level,
      whatItMeans: confidence.meaning,
      howToUse: sanitizeNarrativeList([
        t(
          locale,
          '점수는 우열이 아니라 현재 관계 습관의 방향으로 해석하세요.',
          'Read score as direction of habits, not superiority.'
        ),
        t(
          locale,
          '높은 축은 유지 전략, 낮은 축은 미세 행동으로 보완하세요.',
          'Maintain strong axes and improve low axes with micro-actions.'
        ),
        t(
          locale,
          '2~3주 뒤 같은 조건 재검사로 변화 추적 정확도를 높이세요.',
          'Retest in 2-3 weeks under similar conditions to track change.'
        ),
      ]),
    },
    whyThisResult,
    disclaimers: {
      nonClinical: t(
        locale,
        '이 결과는 비임상 자기이해 도구이며 진단·치료 목적이 아닙니다.',
        'This is a non-clinical self-reflection tool, not for diagnosis or treatment.'
      ),
      variability: t(
        locale,
        '현재 컨디션, 최근 사건, 관계 맥락에 따라 점수는 달라질 수 있습니다.',
        'Scores can vary by condition, recent events, and relationship context.'
      ),
    },
  }
}

const SAMPLE_PROFILE: Record<
  ICPOctantCode,
  { agency: number; warmth: number; boundary: number; resilience: number; secondary: ICPOctantCode }
> = {
  PA: { agency: 78, warmth: 76, boundary: 68, resilience: 72, secondary: 'NO' },
  BC: { agency: 75, warmth: 45, boundary: 75, resilience: 60, secondary: 'PA' },
  DE: { agency: 56, warmth: 30, boundary: 72, resilience: 64, secondary: 'FG' },
  FG: { agency: 34, warmth: 36, boundary: 58, resilience: 66, secondary: 'DE' },
  HI: { agency: 30, warmth: 70, boundary: 42, resilience: 54, secondary: 'JK' },
  JK: { agency: 40, warmth: 68, boundary: 66, resilience: 58, secondary: 'LM' },
  LM: { agency: 52, warmth: 82, boundary: 48, resilience: 53, secondary: 'NO' },
  NO: { agency: 68, warmth: 74, boundary: 60, resilience: 70, secondary: 'PA' },
}

function buildSampleOctantScores(
  primary: ICPOctantCode,
  secondary: ICPOctantCode
): Record<ICPOctantCode, number> {
  const priority = [
    primary,
    secondary,
    ...ICP_SAMPLE_STYLE_CODES.filter((code) => code !== primary && code !== secondary),
  ]
  const rankScores = [0.74, 0.52, 0.47, 0.44, 0.38, 0.31, 0.24, 0.15]
  const out = {} as Record<ICPOctantCode, number>
  priority.forEach((code, idx) => {
    out[code] = rankScores[idx]
  })
  return out
}

export function isIcpStyleCode(value: string | null | undefined): value is ICPOctantCode {
  if (!value) return false
  return ICP_SAMPLE_STYLE_CODES.includes(value as ICPOctantCode)
}

export function buildIcpRenderSample(
  primaryCode: ICPOctantCode = 'BC',
  locale: IcpLocale = 'ko'
): IcpNarrativeInput {
  const sample = SAMPLE_PROFILE[primaryCode]
  const primary = ICP_OCTANTS[primaryCode]
  const secondary = ICP_OCTANTS[sample.secondary]
  const octantScores = buildSampleOctantScores(primaryCode, sample.secondary)
  const sortedAxes = [
    { key: 'agency', score: sample.agency },
    { key: 'warmth', score: sample.warmth },
    { key: 'boundary', score: sample.boundary },
    { key: 'resilience', score: sample.resilience },
  ].sort((a, b) => b.score - a.score)

  return {
    locale,
    dominanceScore: sample.agency,
    affiliationScore: sample.warmth,
    dominanceNormalized: (sample.agency - 50) / 50,
    affiliationNormalized: (sample.warmth - 50) / 50,
    boundaryScore: sample.boundary,
    resilienceScore: sample.resilience,
    octantScores,
    primaryStyle: primaryCode,
    secondaryStyle: sample.secondary,
    primaryOctant: primary,
    secondaryOctant: secondary,
    summary: ICP_ARCHETYPE_PROFILES[primaryCode].summaryEn,
    summaryKo: ICP_ARCHETYPE_PROFILES[primaryCode].summaryKo,
    consistencyScore: 64,
    confidence: 64,
    confidenceLevel: 'medium',
    testVersion: 'icp_v2',
    resultId: `icp_v2_${primaryCode}_sample`,
    explainability: {
      topAxes: sortedAxes.slice(0, 2).map((axis) => ({
        axis: axis.key as 'agency' | 'warmth' | 'boundary' | 'resilience',
        score: axis.score,
        interpretation: `${axisName(axis.key, locale)} 축이 상대적으로 높게 나타났습니다.`,
      })),
      lowAxes: sortedAxes.slice(-2).map((axis) => ({
        axis: axis.key as 'agency' | 'warmth' | 'boundary' | 'resilience',
        score: axis.score,
        interpretation: `${axisName(axis.key, locale)} 축은 보완 여지가 있습니다.`,
      })),
      evidence: [
        { questionId: 'ag_01', axis: 'agency', answer: 5, reverse: false, reason: '직접문항' },
        { questionId: 'ag_04', axis: 'agency', answer: 1, reverse: true, reason: '역문항' },
      ],
      note: `${primaryCode} sample`,
    },
  }
}

export function buildBCRenderSample(locale: IcpLocale = 'ko'): IcpNarrativeInput {
  return buildIcpRenderSample('BC', locale)
}
