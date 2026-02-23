import type { ICPAnalysis, ICPOctantCode } from '@/lib/icp/types'
import type { PersonaAnalysis } from '@/lib/persona/types'
import type { IcpHybridResult } from '@/lib/icpTest/types'
import { ICP_ARCHETYPE_PROFILES } from '@/lib/icpTest/results'
import { ICP_OCTANTS } from '@/lib/icp/analysis'
import { PERSONA_ARCHETYPES, PERSONA_ARCHETYPES_KO } from '@/lib/persona/archetypes'

export type HybridLocale = 'ko' | 'en'
type HybridAxisKey = 'dominance' | 'affiliation' | 'energy' | 'decision'
type ScoreBand = 'low' | 'mid' | 'high'

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const MOJIBAKE_REGEX = /(?:\u00c3|\u00c2|\u00ec|\u00eb|\ufffd)/gi

const FALLBACK_HYBRID: IcpHybridResult = {
  id: 'HX11',
  nameKo: '성과 균형형',
  descriptionKo: '성과와 사람을 동시에 관리하는 밸런스형 하이브리드입니다.',
  guidance: [
    '성과와 관계 지표를 함께 본다',
    '우선순위를 문서로 고정한다',
    '주간 회고 루틴을 유지한다',
  ],
  blindspots: ['멀티목표 과부하', '결정 피로'],
  fallback: true,
}

const HYBRID_DEFINITION: Record<
  string,
  { ko: string; en: string; aliasKo: string; aliasEn: string }
> = {
  HX08: {
    ko: '기준 수호형(HX08): 원칙을 지키며 속도를 관리하고, 성과와 관계 비용을 함께 설계하는 실행형 리드',
    en: 'HX08 Standard Keeper: an execution architect who protects principles and keeps speed.',
    aliasKo: '원칙 가속 설계자',
    aliasEn: 'Principled Speed Architect',
  },
  HX11: {
    ko: '성과 균형형(HX11): 결과와 관계를 함께 관리하는 운영형 조율자',
    en: 'HX11 Balance Driver: an operator who manages outcomes and people together.',
    aliasKo: '성과-관계 밸런서',
    aliasEn: 'Outcome-Relationship Balancer',
  },
}

const CHALLENGING_STYLE: Record<ICPOctantCode, { ko: string; en: string }> = {
  PA: { ko: '신중 관찰자(FG)', en: 'Careful Observer (FG)' },
  BC: { ko: '안정 조율자(HI)', en: 'Stability Harmonizer (HI)' },
  DE: { ko: '공감 촉진자(LM)', en: 'Empathy Catalyst (LM)' },
  FG: { ko: '주도적 연결자(PA)', en: 'Leading Connector (PA)' },
  HI: { ko: '돌파 전략가(BC)', en: 'Breakthrough Strategist (BC)' },
  JK: { ko: '원칙 분석가(DE)', en: 'Principled Analyst (DE)' },
  LM: { ko: '원칙 분석가(DE)', en: 'Principled Analyst (DE)' },
  NO: { ko: '돌파 전략가(BC)', en: 'Breakthrough Strategist (BC)' },
}

export interface HybridAxisNarrative {
  key: HybridAxisKey
  label: string
  spectrum: string
  score: number
  levelLabel: string
  positionSummary: string
  advantage: string
  overdriveRisk: string
  microAdjustment: string
}

export interface HybridInsight {
  name: string
  evidence: string
  strengthWhen: string
  riskAndAdjustment: string
  quickAction: string
}

export interface HybridNarrative {
  hero: {
    combination: string
    hybridCode: string
    hybridAlias: string
    definitionLine: string
    confidenceBadge: string
    todayPoint: string
  }
  snapshot: {
    strengths: string[]
    risks: string[]
    bestFitEnvironments: string[]
    breakdownConditions: string[]
  }
  axes: HybridAxisNarrative[]
  hybridCore: {
    title: string
    lines: string[]
  }
  insights: HybridInsight[]
  playbook: {
    start: string
    maintain: string
    conflict: string
    recovery: string
    scripts: string[]
  }
  roleFit: {
    shineRoles: string[]
    avoidRoles: string[]
    checklist: string[]
  }
  actionPlan: {
    today10Min: string
    thisWeek: string[]
    twoWeekExperiment: {
      title: string
      steps: string[]
      metric: string
    }
  }
  nextAction: {
    title: string
    items: string[]
    optionalCta: string
  }
  disclosure: {
    nonClinical: string
    variability: string
    interpretation: string[]
  }
}

export interface HybridNarrativeInput {
  icp: ICPAnalysis
  persona: PersonaAnalysis
  hybrid?: IcpHybridResult | null
  locale?: HybridLocale
}

function t(locale: HybridLocale, ko: string, en: string): string {
  return locale === 'ko' ? ko : en
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 50
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getBand(score: number): ScoreBand {
  if (score <= 39) return 'low'
  if (score <= 69) return 'mid'
  return 'high'
}

export function sanitizeHybridText(input: string): string {
  return String(input ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHAR_REGEX, '')
    .replace(/\uFEFF/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sanitizeHybridList(items: string[], limit?: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  items.forEach((item) => {
    const clean = sanitizeHybridText(item)
    if (!clean) return
    const key = clean.replace(/\s+/g, '').toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(clean)
  })
  if (typeof limit === 'number') return out.slice(0, limit)
  return out
}

function safeKoText(value: string, fallback: string, locale: HybridLocale): string {
  const clean = sanitizeHybridText(value)
  if (!clean) return fallback
  if (locale !== 'ko') return clean
  const hasHangul = /[\u3131-\u318e\uac00-\ud7a3]/.test(clean)
  if (!hasHangul && MOJIBAKE_REGEX.test(clean)) return fallback
  return clean
}

function levelLabel(score: number, locale: HybridLocale): string {
  const band = getBand(score)
  if (band === 'low') return t(locale, '낮음', 'Low')
  if (band === 'high') return t(locale, '높음', 'High')
  return t(locale, '중간', 'Mid')
}

function buildAxisNarratives(input: HybridNarrativeInput): HybridAxisNarrative[] {
  const locale = input.locale ?? 'ko'
  const dominance = clampScore(input.icp.dominanceScore)
  const affiliation = clampScore(input.icp.affiliationScore)
  const energy = clampScore(input.persona.axes.energy.score)
  const logic = clampScore(input.persona.axes.decision.score)

  const dominanceBand = getBand(dominance)
  const affiliationBand = getBand(affiliation)
  const energyBand = getBand(energy)
  const decisionBand = getBand(logic)

  return [
    {
      key: 'dominance',
      label: t(locale, '지배-복종 (ICP)', 'Dominance-Submission (ICP)'),
      spectrum: t(locale, '복종 ↔ 지배', 'Submission ↔ Dominance'),
      score: dominance,
      levelLabel: levelLabel(dominance, locale),
      positionSummary:
        dominanceBand === 'high'
          ? t(
              locale,
              '지배 측 우세: 결정을 앞당기는 성향',
              'Dominance-leading: decisions are accelerated'
            )
          : dominanceBand === 'low'
            ? t(
                locale,
                '복종 측 우세: 충분한 확인 후 움직이는 성향',
                'Submission-leading: moves after validation'
              )
            : t(
                locale,
                '균형 구간: 상황에 따라 리드와 협조를 전환',
                'Balanced zone: alternates lead/support by context'
              ),
      advantage:
        dominanceBand === 'high'
          ? t(
              locale,
              '장점: 의사결정이 막힌 회의에서 방향을 신속히 정리합니다.',
              'Strength: clears stalled decisions quickly.'
            )
          : dominanceBand === 'low'
            ? t(
                locale,
                '장점: 충돌 비용을 낮추고 합의를 안정적으로 만듭니다.',
                'Strength: lowers friction and stabilizes agreement.'
              )
            : t(
                locale,
                '장점: 주도와 경청을 균형 있게 사용합니다.',
                'Strength: balances initiative and listening.'
              ),
      overdriveRisk:
        dominanceBand === 'high'
          ? t(
              locale,
              '과잉 시 문제: 상대의 처리 속도를 건너뛰면 저항이 커집니다.',
              'Risk: skipping others pace raises resistance.'
            )
          : dominanceBand === 'low'
            ? t(
                locale,
                '과잉 시 문제: 핵심 타이밍에서 발화가 늦어 기회를 놓칠 수 있습니다.',
                'Risk: delayed voice can miss timing.'
              )
            : t(
                locale,
                '과잉 시 문제: 중립 유지가 길어지면 결론이 늦어집니다.',
                'Risk: prolonged neutrality delays closure.'
              ),
      microAdjustment: t(
        locale,
        '미세조정: 결정 직전 “빠뜨린 반대 관점 1개”를 확인한 뒤 확정하세요.',
        'Micro-adjustment: check one opposing view before final decision.'
      ),
    },
    {
      key: 'affiliation',
      label: t(locale, '친밀-적대 (ICP)', 'Intimacy-Hostility (ICP)'),
      spectrum: t(locale, '적대/거리 ↔ 친밀/협력', 'Distance ↔ Intimacy'),
      score: affiliation,
      levelLabel: levelLabel(affiliation, locale),
      positionSummary:
        affiliationBand === 'high'
          ? t(
              locale,
              '친밀 측 우세: 신뢰를 빠르게 형성하는 성향',
              'Intimacy-leading: builds trust fast'
            )
          : affiliationBand === 'low'
            ? t(
                locale,
                '거리 측 우세: 감정보다 과제 정렬을 우선하는 성향',
                'Distance-leading: prioritizes task over emotion'
              )
            : t(
                locale,
                '중간 구간: 관계와 과제를 번갈아 조정',
                'Mid-zone: alternates people and task focus'
              ),
      advantage:
        affiliationBand === 'high'
          ? t(
              locale,
              '장점: 갈등 후 관계 회복 속도가 빠릅니다.',
              'Strength: recovers relationships quickly.'
            )
          : affiliationBand === 'low'
            ? t(
                locale,
                '장점: 감정 소음이 큰 상황에서도 기준을 유지합니다.',
                'Strength: keeps criteria under emotional noise.'
              )
            : t(
                locale,
                '장점: 과제와 관계를 둘 다 놓치지 않습니다.',
                'Strength: holds both task and relationship.'
              ),
      overdriveRisk:
        affiliationBand === 'high'
          ? t(
              locale,
              '과잉 시 문제: 경계가 흐려져 피로가 누적될 수 있습니다.',
              'Risk: blurred boundaries can increase fatigue.'
            )
          : affiliationBand === 'low'
            ? t(
                locale,
                '과잉 시 문제: 정확한 말도 차갑게 전달될 수 있습니다.',
                'Risk: precise words may feel cold.'
              )
            : t(
                locale,
                '과잉 시 문제: 조율 시간이 길어지면 실행이 밀릴 수 있습니다.',
                'Risk: long tuning can delay execution.'
              ),
      microAdjustment: t(
        locale,
        '미세조정: 사실 설명 전, 상대 감정을 확인하는 질문 1개를 먼저 두세요.',
        'Micro-adjustment: ask one emotion-check question before facts.'
      ),
    },
    {
      key: 'energy',
      label: t(locale, '에너지 (Persona)', 'Energy (Persona)'),
      spectrum: t(locale, '내향 ↔ 외향', 'Introvert ↔ Extravert'),
      score: energy,
      levelLabel: levelLabel(energy, locale),
      positionSummary:
        energyBand === 'high'
          ? t(
              locale,
              '외향 측 우세: 고강도 상호작용에서 추진력이 오릅니다.',
              'Extravert-leading: momentum rises in interaction.'
            )
          : energyBand === 'low'
            ? t(
                locale,
                '내향 측 우세: 단독 집중에서 생산성이 높아집니다.',
                'Introvert-leading: output rises in focused solo work.'
              )
            : t(
                locale,
                '중간 구간: 필요에 따라 에너지 배분이 가능합니다.',
                'Mid-zone: flexible energy allocation by context.'
              ),
      advantage:
        energyBand === 'high'
          ? t(
              locale,
              '장점: 팀 프로젝트에서 시동을 걸고 분위기를 끌어올립니다.',
              'Strength: starts motion in team projects.'
            )
          : energyBand === 'low'
            ? t(
                locale,
                '장점: 복잡한 문제를 깊게 분석해 품질을 높입니다.',
                'Strength: deep analysis improves quality.'
              )
            : t(
                locale,
                '장점: 회의/집중 업무를 큰 무리 없이 오갈 수 있습니다.',
                'Strength: switches between meetings and focus work.'
              ),
      overdriveRisk:
        energyBand === 'high'
          ? t(
              locale,
              '과잉 시 문제: 휴식 없이 밀어붙이면 회복 지연이 생깁니다.',
              'Risk: nonstop pace delays recovery.'
            )
          : energyBand === 'low'
            ? t(
                locale,
                '과잉 시 문제: 소통 타이밍이 늦어 오해가 생길 수 있습니다.',
                'Risk: delayed communication can create misunderstanding.'
              )
            : t(
                locale,
                '과잉 시 문제: 우선순위 없이 에너지를 분산하면 밀도가 떨어집니다.',
                'Risk: scattered energy lowers intensity.'
              ),
      microAdjustment: t(
        locale,
        '미세조정: 하루 시작 전에 “고강도 1개 + 회복 슬롯 1개”를 캘린더에 먼저 고정하세요.',
        'Micro-adjustment: lock one high-intensity block and one recovery block daily.'
      ),
    },
    {
      key: 'decision',
      label: t(locale, '의사결정 (논리-공감, Persona)', 'Decision (Logic-Empathy, Persona)'),
      spectrum: t(locale, '논리 ↔ 공감', 'Logic ↔ Empathy'),
      score: logic,
      levelLabel: levelLabel(logic, locale),
      positionSummary:
        decisionBand === 'high'
          ? t(
              locale,
              '논리 측 우세: 기준·증거 중심으로 판단',
              'Logic-leading: criteria and evidence first'
            )
          : decisionBand === 'low'
            ? t(
                locale,
                '공감 측 우세: 맥락·관계 영향을 함께 판단',
                'Empathy-leading: context and people impact first'
              )
            : t(
                locale,
                '균형 구간: 사안에 따라 논리와 공감을 전환',
                'Balanced zone: toggles logic and empathy by case'
              ),
      advantage:
        decisionBand === 'high'
          ? t(
              locale,
              '장점: 협상에서 조건을 명확히 해 재작업을 줄입니다.',
              'Strength: clearer terms reduce rework in negotiation.'
            )
          : decisionBand === 'low'
            ? t(
                locale,
                '장점: 갈등 상황에서 관계 손상을 줄이며 합의를 만듭니다.',
                'Strength: protects relationship in conflict negotiation.'
              )
            : t(
                locale,
                '장점: 난이도 높은 결정에서 현실성과 수용성을 함께 봅니다.',
                'Strength: balances realism and acceptance.'
              ),
      overdriveRisk:
        decisionBand === 'high'
          ? t(
              locale,
              '과잉 시 문제: 맞는 말이어도 상대는 배제감을 느낄 수 있습니다.',
              'Risk: even right answers may feel exclusionary.'
            )
          : decisionBand === 'low'
            ? t(
                locale,
                '과잉 시 문제: 배려가 길어지면 결론이 지연됩니다.',
                'Risk: prolonged care may delay closure.'
              )
            : t(
                locale,
                '과잉 시 문제: 기준 전환이 잦으면 메시지가 흔들립니다.',
                'Risk: too many switches can blur message.'
              ),
      microAdjustment: t(
        locale,
        '미세조정: 결정 문장을 “근거 1개 + 관계 영향 1개” 구조로 고정해 보세요.',
        'Micro-adjustment: format decisions as one reason plus one people impact.'
      ),
    },
  ]
}

function buildHybridDefinition(
  hybrid: IcpHybridResult,
  locale: HybridLocale
): { definitionLine: string; alias: string } {
  const preset = HYBRID_DEFINITION[hybrid.id] ?? HYBRID_DEFINITION.HX11
  return {
    definitionLine: t(locale, preset.ko, preset.en),
    alias: t(locale, preset.aliasKo, preset.aliasEn),
  }
}

function buildSnapshot(input: HybridNarrativeInput): HybridNarrative['snapshot'] {
  const locale = input.locale ?? 'ko'
  const dominance = clampScore(input.icp.dominanceScore)
  const affiliation = clampScore(input.icp.affiliationScore)
  const boundary = clampScore(input.icp.boundaryScore ?? 50)
  const resilience = clampScore(input.icp.resilienceScore ?? 50)
  const logic = clampScore(input.persona.axes.decision.score)

  const strengths = sanitizeHybridList(
    [
      dominance >= 70
        ? t(
            locale,
            '승부 구간에서 결정 속도를 높여 교착을 끊습니다.',
            'Breaks deadlocks by accelerating decision pace.'
          )
        : t(
            locale,
            '불필요한 충돌을 줄이며 합의 기반으로 전진합니다.',
            'Moves forward with low-friction alignment.'
          ),
      boundary >= 70
        ? t(
            locale,
            '원칙과 예외를 구분해 실행 품질을 안정화합니다.',
            'Stabilizes quality by separating principle and exception.'
          )
        : t(
            locale,
            '상황에 맞춰 경계를 조정하며 협업을 이어갑니다.',
            'Sustains collaboration with adaptive boundaries.'
          ),
      logic >= 70
        ? t(
            locale,
            '우선순위가 모호한 과제에서 기준을 명확히 정리합니다.',
            'Clarifies priorities under ambiguity.'
          )
        : t(
            locale,
            '관계 맥락을 반영해 수용도 높은 결정을 만듭니다.',
            'Builds high-acceptance decisions with context.'
          ),
    ],
    3
  )

  const risks = sanitizeHybridList(
    [
      affiliation <= 45
        ? t(
            locale,
            '성과 중심 대화가 길어지면 상대는 배제감을 느낄 수 있습니다.',
            'Outcome-heavy talk can feel exclusionary.'
          )
        : t(
            locale,
            '배려가 과해지면 핵심 결정이 늦어질 수 있습니다.',
            'Over-care can slow key decisions.'
          ),
      resilience <= 60
        ? t(
            locale,
            '연속 고강도 일정 뒤 회복 지연으로 판단 품질이 흔들릴 수 있습니다.',
            'Back-to-back intensity can reduce decision quality.'
          )
        : t(
            locale,
            '회복이 빨라도 과속 루프가 반복되면 피로가 누적됩니다.',
            'Fast recovery can still hide accumulated fatigue.'
          ),
    ],
    2
  )

  const bestFitEnvironments = sanitizeHybridList(
    [
      t(
        locale,
        '권한과 마감이 명확한 프로젝트형 팀',
        'Project teams with clear ownership and deadlines'
      ),
      t(
        locale,
        '성과와 운영 기준을 동시에 요구하는 리드 역할',
        'Lead roles requiring both outcomes and operating standards'
      ),
    ],
    2
  )

  const breakdownConditions = sanitizeHybridList(
    [
      t(
        locale,
        '목표는 높은데 역할 경계와 예외 기준이 불명확한 환경',
        'High-pressure contexts without role boundaries or exception rules'
      ),
      t(
        locale,
        '정서 신호를 확인하지 않은 채 속도만 높이는 의사결정',
        'High-speed decisions without emotional signal checks'
      ),
    ],
    2
  )

  return { strengths, risks, bestFitEnvironments, breakdownConditions }
}

function buildInsights(input: HybridNarrativeInput): HybridInsight[] {
  const locale = input.locale ?? 'ko'
  const dominance = clampScore(input.icp.dominanceScore)
  const affiliation = clampScore(input.icp.affiliationScore)
  const boundary = clampScore(input.icp.boundaryScore ?? 50)
  const resilience = clampScore(input.icp.resilienceScore ?? 50)
  const logic = clampScore(input.persona.axes.decision.score)
  const energy = clampScore(input.persona.axes.energy.score)
  const rhythm = clampScore(input.persona.axes.rhythm.score)
  const cognition = clampScore(input.persona.axes.cognition.score)

  return [
    {
      name: t(locale, '고속 기준 실행 리드', 'High-Speed Standards Lead'),
      evidence: t(
        locale,
        `근거: ICP 지배-복종 ${dominance}점, ICP 경계 유연성 ${boundary}점, Persona 의사결정(논리) ${logic}점 조합입니다.`,
        `Evidence: ICP dominance ${dominance}, ICP boundary ${boundary}, Persona logic ${logic}.`
      ),
      strengthWhen: t(
        locale,
        '강점: 회의에서 쟁점이 흩어질 때 기준을 먼저 고정해 의사결정을 당깁니다.',
        'Strength: in meetings, fixes criteria first and pulls decisions forward.'
      ),
      riskAndAdjustment: t(
        locale,
        '리스크·조정: 기준 설명이 길면 반발이 생길 수 있으니, 합의 질문 1개를 먼저 두세요.',
        'Risk/adjustment: lengthy criteria explanation can trigger resistance; ask one alignment question first.'
      ),
      quickAction: t(
        locale,
        '10분 실행: 다음 회의 안건 1개에 대해 “결정 기준 2개 + 예외 1개”를 미리 메모합니다.',
        '10-minute action: pre-note two criteria and one exception for one agenda.'
      ),
    },
    {
      name: t(locale, '저온 구간 정렬 커뮤니케이션', 'Low-Temperature Alignment Communication'),
      evidence: t(
        locale,
        `근거: ICP 친밀-적대 ${affiliation}점, ICP 지배-복종 ${dominance}점, Persona 에너지 ${energy}점이 결합됩니다.`,
        `Evidence: ICP affiliation ${affiliation}, ICP dominance ${dominance}, Persona energy ${energy} combine.`
      ),
      strengthWhen: t(
        locale,
        '강점: 팀 프로젝트에서 감정 소음이 큰 날에도 과제 우선순위를 선명하게 정리합니다.',
        'Strength: keeps task priorities clear even on emotionally noisy team-project days.'
      ),
      riskAndAdjustment: t(
        locale,
        '리스크·조정: 속도가 빠를수록 차갑게 보일 수 있으니, 결정 전 맥락 확인 문장 1개를 넣으세요.',
        'Risk/adjustment: faster pace can look cold; add one context-check line before decisions.'
      ),
      quickAction: t(
        locale,
        '10분 실행: 오늘 대화 1건에서 “지금 가장 우려되는 점이 뭐야?” 질문을 먼저 사용합니다.',
        '10-minute action: ask “what is your biggest concern now?” in one conversation today.'
      ),
    },
    {
      name: t(locale, '압축 추진-회복 운영', 'Compressed Push-Recovery Operation'),
      evidence: t(
        locale,
        `근거: ICP 지배-복종 ${dominance}점, ICP 회복 탄력 ${resilience}점, Persona 리듬 ${rhythm}점 프로파일입니다.`,
        `Evidence: ICP dominance ${dominance}, ICP resilience ${resilience}, Persona rhythm ${rhythm} profile.`
      ),
      strengthWhen: t(
        locale,
        '강점: 협상 직전처럼 시간 압박이 큰 구간에서 짧은 집중 스퍼트가 효과적입니다.',
        'Strength: short focus sprints work well under negotiation-time pressure.'
      ),
      riskAndAdjustment: t(
        locale,
        '리스크·조정: 스퍼트를 연속으로 쓰면 회복 지연이 오므로 고강도 뒤 15분 복구 슬롯을 고정하세요.',
        'Risk/adjustment: repeated sprints delay recovery; lock a 15-minute recovery slot after intensity.'
      ),
      quickAction: t(
        locale,
        '10분 실행: 오늘 캘린더에서 고강도 작업 뒤 15분 비워진 칸을 1개 확보합니다.',
        '10-minute action: reserve one 15-minute recovery block after today’s high-intensity task.'
      ),
    },
    {
      name: t(locale, '원칙-실험 균형 설계', 'Principle-Experiment Balance Design'),
      evidence: t(
        locale,
        `근거: ICP 경계 유연성 ${boundary}점, ICP 회복 탄력 ${resilience}점, Persona 인지(비전/구조) ${cognition}점이 근거입니다.`,
        `Evidence: ICP boundary ${boundary}, ICP resilience ${resilience}, Persona cognition ${cognition}.`
      ),
      strengthWhen: t(
        locale,
        '강점: 팀 프로젝트에서 기준을 지키면서도 작은 실험을 병행해 학습 속도를 유지합니다.',
        'Strength: preserves standards while running small experiments in team projects.'
      ),
      riskAndAdjustment: t(
        locale,
        '리스크·조정: 원칙이 많아지면 실험이 멈출 수 있으니, 주간 실험 1개를 필수 슬롯으로 두세요.',
        'Risk/adjustment: too many principles can freeze experiments; keep one mandatory weekly test.'
      ),
      quickAction: t(
        locale,
        '10분 실행: 이번 주 실험 1개를 “목표-중단기준-측정지표” 3줄로 정의합니다.',
        '10-minute action: define this week’s experiment in three lines: goal-stop rule-metric.'
      ),
    },
  ]
}

function buildHybridCore(input: HybridNarrativeInput): HybridNarrative['hybridCore'] {
  const locale = input.locale ?? 'ko'
  const icpName =
    locale === 'ko'
      ? ICP_ARCHETYPE_PROFILES[input.icp.primaryStyle].nameKo
      : ICP_ARCHETYPE_PROFILES[input.icp.primaryStyle].nameEn
  const dominance = clampScore(input.icp.dominanceScore)
  const affiliation = clampScore(input.icp.affiliationScore)
  const boundary = clampScore(input.icp.boundaryScore ?? 50)
  const resilience = clampScore(input.icp.resilienceScore ?? 50)
  const logic = clampScore(input.persona.axes.decision.score)

  return {
    title: t(locale, '이 조합이 작동하는 방식', 'How This Combination Operates'),
    lines: sanitizeHybridList(
      [
        t(
          locale,
          `${icpName} 축의 주도성(${dominance})은 승부 구간에서 결정을 앞당기는 엔진으로 작동합니다.`,
          `Agency in ${icpName} (${dominance}) works as the engine that pulls decisions forward.`
        ),
        t(
          locale,
          `경계 유연성(${boundary})과 논리 의사결정(${logic})이 결합되어 “기준-예외” 프레임을 빠르게 세웁니다.`,
          `Boundary flexibility (${boundary}) plus logic (${logic}) quickly forms a principle-exception frame.`
        ),
        t(
          locale,
          `관계 온도(${affiliation})가 중간 이하일수록 실행 속도는 오르지만 수용도 점검이 필수입니다.`,
          `When relational warmth (${affiliation}) is mid or lower, pace rises but acceptance checks become essential.`
        ),
        t(
          locale,
          `회복 탄력(${resilience})이 중간권이면 연속 고강도 구간 뒤 품질 편차가 나타날 수 있습니다.`,
          `With mid-range resilience (${resilience}), quality variance can appear after repeated intensity.`
        ),
        t(
          locale,
          '결론적으로 이 조합은 “원칙 고정 → 빠른 실행 → 짧은 복구” 루프를 관리할 때 가장 안정적입니다.',
          'In short, this blend is most stable when you manage the loop: standards, speed, brief recovery.'
        ),
      ],
      5
    ),
  }
}

function buildPlaybook(input: HybridNarrativeInput): HybridNarrative['playbook'] {
  const locale = input.locale ?? 'ko'
  const logic = clampScore(input.persona.axes.decision.score)
  const affiliation = clampScore(input.icp.affiliationScore)
  const resilience = clampScore(input.icp.resilienceScore ?? 50)

  const conflictLead =
    logic >= 60
      ? t(locale, '사실-기준-대안 순서로 대화를 정리합니다.', 'Use fact-criteria-option order.')
      : t(locale, '감정-영향-요청 순서로 대화를 정리합니다.', 'Use emotion-impact-request order.')

  return {
    start: t(
      locale,
      '시작: 역할·목표·마감 3가지를 먼저 합의하면 초반 오해를 줄일 수 있습니다.',
      'Start: align role, goal, and deadline first to reduce early mismatch.'
    ),
    maintain: t(
      locale,
      affiliation <= 45
        ? '유지: 주 1회 10분 체크인으로 관계 온도를 보정해야 추진력이 유지됩니다.'
        : '유지: 주 1회 우선순위 재정렬로 속도와 관계를 함께 유지합니다.',
      affiliation <= 45
        ? 'Maintain: use a weekly 10-minute check-in to stabilize relationship temperature.'
        : 'Maintain: run weekly priority resets to keep pace and relationships together.'
    ),
    conflict: t(
      locale,
      `갈등: ${conflictLead} 결론을 서두르기보다 확인 질문 1개를 먼저 둡니다.`,
      `Conflict: ${conflictLead} Ask one verification question before closure.`
    ),
    recovery: t(
      locale,
      resilience <= 60
        ? '회복: 갈등 후 24시간 이내에 합의 문장을 재확인하면 오해 재발을 줄일 수 있습니다.'
        : '회복: 갈등 후 핵심 합의 1문장을 기록하면 재작업을 줄일 수 있습니다.',
      resilience <= 60
        ? 'Recovery: re-check agreement statements within 24 hours after conflict.'
        : 'Recovery: record one key agreement sentence after conflict.'
    ),
    scripts: sanitizeHybridList(
      [
        t(
          locale,
          '말문 1: “지금은 결론보다 정렬이 먼저예요. 핵심 쟁점 두 가지만 먼저 맞춰볼게요.”',
          'Script 1: “Before conclusion, let’s align two core points first.”'
        ),
        t(
          locale,
          '말문 2: “내 속도가 부담됐을 수 있어요. 빠진 맥락 1가지를 말해주면 기준을 바로 조정하겠습니다.”',
          'Script 2: “My pace may have felt heavy. Share one missing context and I will adjust criteria.”'
        ),
      ],
      2
    ),
  }
}

function buildRoleFit(
  input: HybridNarrativeInput,
  hybrid: IcpHybridResult
): HybridNarrative['roleFit'] {
  const locale = input.locale ?? 'ko'
  const dominantStyle = input.icp.primaryStyle
  const personaRoles = sanitizeHybridList(input.persona.recommendedRoles, 3)
  const icpRole = t(
    locale,
    ICP_ARCHETYPE_PROFILES[dominantStyle].workStyle,
    ICP_ARCHETYPE_PROFILES[dominantStyle].workStyle
  )
  const avoidRoles = sanitizeHybridList(
    [
      t(locale, '권한은 없고 책임만 큰 역할', 'Roles with responsibility but no authority'),
      t(
        locale,
        '기준 없이 감정 조율만 반복되는 환경',
        'Environments with repeated emotional mediation without criteria'
      ),
    ],
    2
  )

  return {
    shineRoles: sanitizeHybridList([...personaRoles, icpRole], 3),
    avoidRoles,
    checklist: sanitizeHybridList(
      [
        t(
          locale,
          '운영법: 시작 전에 기준·예외·마감 3요소를 문서화한다.',
          'Ops: document criteria, exceptions, and deadline at kickoff.'
        ),
        t(
          locale,
          '운영법: 주간 리뷰에서 성과지표 1개와 관계지표 1개를 같이 점검한다.',
          'Ops: review one outcome metric and one relationship metric weekly.'
        ),
        t(
          locale,
          `운영법: ${hybrid.guidance[0] ?? '합의 기준을 먼저 고정한다.'}`,
          `Ops: ${hybrid.guidance[0] ?? 'Fix agreement criteria first.'}`
        ),
      ],
      3
    ),
  }
}

function buildActionPlan(
  input: HybridNarrativeInput,
  hybrid: IcpHybridResult
): HybridNarrative['actionPlan'] {
  const locale = input.locale ?? 'ko'
  const dominance = clampScore(input.icp.dominanceScore)
  const affiliation = clampScore(input.icp.affiliationScore)
  const resilience = clampScore(input.icp.resilienceScore ?? 50)

  const today10Min =
    affiliation <= 50
      ? t(
          locale,
          '오늘 10분: 최근 갈등 대화 1건을 골라 “사실 1문장 + 감정 확인 1문장”으로 다시 써보세요.',
          'Today 10 min: rewrite one conflict message with one fact line and one emotion-check line.'
        )
      : t(
          locale,
          '오늘 10분: 이번 주 핵심 결정 1개에 대해 기준 2개와 예외 1개를 미리 적어두세요.',
          'Today 10 min: pre-write two criteria and one exception for one key decision this week.'
        )

  const thisWeek = sanitizeHybridList(
    [
      t(
        locale,
        `이번주 1: 회의 3회에서 결정 전 질문 1개를 먼저 사용합니다. (지배-복종 ${dominance}점 보정)`,
        `Week 1: use one pre-decision question in three meetings. (dominance ${dominance} tuning)`
      ),
      t(
        locale,
        `이번주 2: 관계 온도 체크인 10분을 2회 진행합니다. (친밀-적대 ${affiliation}점 보정)`,
        `Week 2: run two 10-minute relationship check-ins. (affiliation ${affiliation} tuning)`
      ),
      t(
        locale,
        `이번주 3: 고강도 일정 뒤 복구 슬롯 15분을 3회 고정합니다. (회복 탄력 ${resilience}점 보정)`,
        `Week 3: lock three 15-minute recovery slots after high-intensity blocks. (resilience ${resilience} tuning)`
      ),
    ],
    3
  )

  return {
    today10Min,
    thisWeek,
    twoWeekExperiment: {
      title: t(
        locale,
        '2주 실험: 속도-수용도 동시 개선',
        '2-week experiment: improve pace and acceptance together'
      ),
      steps: sanitizeHybridList(
        [
          t(
            locale,
            '1) 중요한 대화 5건에서 “결정 전 확인 질문 1개”를 고정한다.',
            '1) In five important talks, enforce one pre-decision check question.'
          ),
          t(
            locale,
            '2) 대화 직후 상대 반응을 3단계(수용/보류/저항)로 기록한다.',
            '2) Log immediate response in three levels: accept/hold/resist.'
          ),
          t(
            locale,
            `3) 주말에 ${hybrid.guidance[1] ?? '합의 기준'} 실행 여부를 회고한다.`,
            `3) Weekend review of ${hybrid.guidance[1] ?? 'agreement standard'} execution.`
          ),
        ],
        3
      ),
      metric: t(
        locale,
        '측정 지표: 재설명 요청 횟수, 갈등 재발 횟수, 결정 완료 리드타임(일).',
        'Metric: re-explanation count, conflict recurrence count, decision lead time (days).'
      ),
    },
  }
}

function buildNextAction(input: HybridNarrativeInput): HybridNarrative['nextAction'] {
  const locale = input.locale ?? 'ko'
  const style = CHALLENGING_STYLE[input.icp.primaryStyle]
  const logic = clampScore(input.persona.axes.decision.score)

  return {
    title: t(locale, '관계 시너지를 높이려면', 'To Raise Relationship Synergy'),
    items: sanitizeHybridList(
      [
        t(
          locale,
          `자주 부딪히는 유형 1개: ${style?.ko ?? '상반된 의사결정 속도 유형'}와 충돌 지점을 먼저 정의하세요.`,
          `Frequent friction type: define clash points with ${style?.en ?? 'opposite decision-speed style'} first.`
        ),
        logic >= 60
          ? t(
              locale,
              '대화 루틴 1개: 결론 전에 “상대가 우려하는 비용”을 1문장으로 요약해 확인하세요.',
              'Conversation routine: summarize counterpart cost concern in one line before conclusion.'
            )
          : t(
              locale,
              '대화 루틴 1개: 공감 이후 “결정 기준 2개”를 명시해 실행력을 보존하세요.',
              'Conversation routine: after empathy, state two decision criteria to preserve execution.'
            ),
        t(
          locale,
          '경고 신호 1개: 같은 이슈를 두 번 이상 재설명하게 되면 속도보다 정렬을 먼저 복구하세요.',
          'Warning signal: if you re-explain the same issue twice, restore alignment before speed.'
        ),
      ],
      3
    ),
    optionalCta: t(
      locale,
      '원하면 궁합 분석에서 나/상대 조합의 세부 패턴을 비교해볼 수 있어요.',
      'If helpful, you can compare your pair pattern in compatibility analysis.'
    ),
  }
}

function buildDisclosure(input: HybridNarrativeInput): HybridNarrative['disclosure'] {
  const locale = input.locale ?? 'ko'
  const confidence = clampScore(input.icp.confidence ?? input.icp.consistencyScore)
  return {
    nonClinical: t(
      locale,
      '이 결과는 비임상 자기이해 도구이며, 진단 또는 치료 목적이 아닙니다.',
      'This result is a non-clinical self-reflection tool, not for diagnosis or treatment.'
    ),
    variability: t(
      locale,
      `컨디션·관계 맥락·최근 사건에 따라 점수는 달라질 수 있습니다. (현재 신뢰도 ${confidence}%)`,
      `Scores can vary by condition, relationship context, and recent events. (Current confidence ${confidence}%)`
    ),
    interpretation: sanitizeHybridList(
      [
        t(
          locale,
          '관찰: 점수는 우열이 아니라 현재 반응 패턴의 방향입니다.',
          'Observation: scores show direction, not superiority.'
        ),
        t(
          locale,
          '해석: 높은 축은 유지 전략, 낮은 축은 미세조정 전략으로 사용하세요.',
          'Interpretation: use high axes for maintenance and lower axes for micro-adjustment.'
        ),
        t(
          locale,
          '권장 행동: 2주 단위 실험으로 실제 변화 지표를 확인하세요.',
          'Recommendation: validate real change with 2-week experiments.'
        ),
      ],
      3
    ),
  }
}

export function buildHybridNarrative(input: HybridNarrativeInput): HybridNarrative {
  const locale = input.locale ?? 'ko'
  const hybrid = input.hybrid ?? FALLBACK_HYBRID
  const icpProfile = ICP_ARCHETYPE_PROFILES[input.icp.primaryStyle]
  const personaName = safeKoText(
    input.persona.personaName,
    locale === 'ko'
      ? (PERSONA_ARCHETYPES_KO[input.persona.typeCode]?.name ?? input.persona.typeCode)
      : (PERSONA_ARCHETYPES[input.persona.typeCode]?.name ?? input.persona.typeCode),
    locale
  )
  const icpName = locale === 'ko' ? icpProfile.nameKo : icpProfile.nameEn
  const confidence = clampScore(input.icp.confidence ?? input.icp.consistencyScore)
  const axisNarratives = buildAxisNarratives(input)
  const snapshot = buildSnapshot(input)
  const insights = buildInsights(input)
  const playbook = buildPlaybook(input)
  const roleFit = buildRoleFit(input, hybrid)
  const actionPlan = buildActionPlan(input, hybrid)
  const definition = buildHybridDefinition(hybrid, locale)

  return {
    hero: {
      combination: t(
        locale,
        `${icpName}(${input.icp.primaryStyle}) + ${personaName}(${input.persona.typeCode})`,
        `${icpName}(${input.icp.primaryStyle}) + ${personaName}(${input.persona.typeCode})`
      ),
      hybridCode: `${hybrid.nameKo} (${hybrid.id})`,
      hybridAlias: definition.alias,
      definitionLine: definition.definitionLine,
      confidenceBadge: t(locale, `신뢰도 ${confidence}%`, `Confidence ${confidence}%`),
      todayPoint: actionPlan.today10Min,
    },
    snapshot,
    axes: axisNarratives,
    hybridCore: buildHybridCore(input),
    insights,
    playbook,
    roleFit,
    actionPlan,
    nextAction: buildNextAction(input),
    disclosure: buildDisclosure(input),
  }
}

function buildSamplePersona(locale: HybridLocale): PersonaAnalysis {
  const archetype = locale === 'ko' ? PERSONA_ARCHETYPES_KO.RSLA : PERSONA_ARCHETYPES.RSLA
  return {
    title: archetype.name,
    personaName: archetype.name,
    summary: archetype.summary,
    typeCode: 'RSLA',
    axes: {
      energy: { pole: 'radiant', score: 62 },
      cognition: { pole: 'structured', score: 34 },
      decision: { pole: 'logic', score: 72 },
      rhythm: { pole: 'anchor', score: 28 },
    },
    consistencyScore: 76,
    consistencyLabel: 'high',
    primaryColor: '#60A5FA',
    secondaryColor: '#38BDF8',
    strengths: archetype.strengths.slice(0, 4),
    challenges: archetype.cautions.slice(0, 3),
    career: archetype.idealRoles.slice(0, 3).join(', '),
    relationships: archetype.compatibilityHint,
    guidance: archetype.growth.join(' '),
    growthTips: archetype.growth.slice(0, 3),
    keyMotivations:
      locale === 'ko'
        ? ['성과 가시성', '운영 안정성', '명확한 기준']
        : ['Visible outcomes', 'Operational stability', 'Clear standards'],
    recommendedRoles: archetype.idealRoles.slice(0, 4),
    compatibilityHint: archetype.compatibilityHint,
    profile: {
      openness: 42,
      conscientiousness: 84,
      extraversion: 62,
      agreeableness: 48,
      neuroticism: 36,
      introversion: 38,
      intuition: 44,
      thinking: 74,
      perceiving: 30,
      enneagram: {
        '1': 42,
        '2': 18,
        '3': 61,
        '4': 12,
        '5': 28,
        '6': 55,
        '7': 26,
        '8': 63,
        '9': 20,
      },
    },
  }
}

function buildSampleIcp(_locale: HybridLocale): ICPAnalysis {
  const primaryStyle: ICPOctantCode = 'BC'
  const secondaryStyle: ICPOctantCode = 'PA'
  return {
    dominanceScore: 75,
    affiliationScore: 45,
    dominanceNormalized: 0.5,
    affiliationNormalized: -0.1,
    boundaryScore: 75,
    resilienceScore: 60,
    octantScores: {
      BC: 74,
      PA: 52,
      DE: 47,
      FG: 45,
      JK: 31,
      LM: 30,
      NO: 25,
      HI: 13,
    },
    primaryStyle,
    secondaryStyle,
    primaryOctant: ICP_OCTANTS.BC,
    secondaryOctant: ICP_OCTANTS.PA,
    summary: ICP_ARCHETYPE_PROFILES.BC.summaryEn,
    summaryKo: ICP_ARCHETYPE_PROFILES.BC.summaryKo,
    consistencyScore: 64,
    confidence: 64,
    confidenceLevel: 'medium',
    testVersion: 'icp_v2',
    resultId: 'icp_v2_bc_sample',
    explainability: {
      topAxes: [
        { axis: 'agency', score: 75, interpretation: '주도성 높음' },
        { axis: 'boundary', score: 75, interpretation: '경계 유연성 높음' },
      ],
      lowAxes: [{ axis: 'warmth', score: 45, interpretation: '관계 온도 중간' }],
      evidence: [
        { questionId: 'ag_01', axis: 'agency', answer: 5, reverse: false, reason: '주도 문항' },
        { questionId: 'wa_02', axis: 'warmth', answer: 2, reverse: true, reason: '역문항' },
      ],
      note: 'sample',
    },
  }
}

export function buildHybridSampleInput(locale: HybridLocale = 'ko'): HybridNarrativeInput {
  return {
    icp: buildSampleIcp(locale),
    persona: buildSamplePersona(locale),
    hybrid: {
      id: 'HX08',
      nameKo: '기준 수호형',
      descriptionKo: '원칙과 성과를 함께 지키는 하이브리드입니다.',
      guidance: ['원칙-예외 기준 동시 명시', '합의 없는 확장 금지', '사후 회고 규칙화'],
      blindspots: ['유연성 저하', '관계 온도 하락'],
      fallback: false,
    },
    locale,
  }
}

export function buildHybridNarrativeSample(locale: HybridLocale = 'ko'): HybridNarrative {
  return buildHybridNarrative(buildHybridSampleInput(locale))
}
