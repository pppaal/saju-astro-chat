import type { MatrixCalculationInput } from '../types'
import type { ReportTheme, ThemedReportSections, TimingReportSections } from './types'
import type { SignalSynthesisResult } from './signalSynthesizer'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import { normalizeUserFacingGuidance } from '@/lib/destiny-matrix/guidanceLanguage'

type Lang = 'ko' | 'en'

function normalizeTimingSections(sections: TimingReportSections, lang: Lang): TimingReportSections {
  return {
    overview: normalizeUserFacingGuidance(sections.overview, lang),
    energy: normalizeUserFacingGuidance(sections.energy, lang),
    opportunities: normalizeUserFacingGuidance(sections.opportunities, lang),
    cautions: normalizeUserFacingGuidance(sections.cautions, lang),
    domains: {
      career: normalizeUserFacingGuidance(sections.domains.career, lang),
      love: normalizeUserFacingGuidance(sections.domains.love, lang),
      wealth: normalizeUserFacingGuidance(sections.domains.wealth, lang),
      health: normalizeUserFacingGuidance(sections.domains.health, lang),
    },
    actionPlan: normalizeUserFacingGuidance(sections.actionPlan, lang),
    luckyElements: normalizeUserFacingGuidance(sections.luckyElements, lang),
  }
}

function normalizeThemedSections(sections: ThemedReportSections, lang: Lang): ThemedReportSections {
  const normalizedEntries = Object.entries(sections).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, value.map((item) => normalizeUserFacingGuidance(item, lang))]
    }
    if (typeof value === 'string') {
      return [key, normalizeUserFacingGuidance(value, lang)]
    }
    return [key, value]
  })
  return Object.fromEntries(normalizedEntries) as ThemedReportSections
}

export interface SecondaryFallbackDeps {
  ensureLongSectionNarrative: (base: string, minChars: number, extras: string[]) => string
  cleanRecommendationLine: (line: string, lang: Lang) => string
  buildTimingWindowNarrative: (
    domain: string,
    item: NonNullable<ReportCoreViewModel['domainTimingWindows'][number]>,
    lang: Lang
  ) => string
  findReportCoreAdvisory: (
    reportCore: ReportCoreViewModel,
    domain: string
  ) => ReportCoreViewModel['advisories'][number] | null
  findReportCoreTimingWindow: (
    reportCore: ReportCoreViewModel,
    domain: string
  ) => ReportCoreViewModel['domainTimingWindows'][number] | null
  findReportCoreManifestation: (
    reportCore: ReportCoreViewModel,
    domain: string
  ) => ReportCoreViewModel['manifestations'][number] | null
}

export function buildTimingFallbackSections(
  _input: MatrixCalculationInput,
  reportCore: ReportCoreViewModel | undefined,
  synthesis: SignalSynthesisResult | undefined,
  lang: Lang,
  deps: SecondaryFallbackDeps
): TimingReportSections {
  if (reportCore) {
    const timing = deps.findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
    const career = deps.findReportCoreAdvisory(reportCore, 'career')
    const relation = deps.findReportCoreAdvisory(reportCore, 'relationship')
    const wealth = deps.findReportCoreAdvisory(reportCore, 'wealth')
    const health = deps.findReportCoreAdvisory(reportCore, 'health')
    if (lang === 'ko') {
      const coreSections: TimingReportSections = {
        overview: `${reportCore.thesis} ${timing ? deps.buildTimingWindowNarrative(reportCore.focusDomain, timing, lang) : reportCore.gradeReason}`,
        energy: `${health?.thesis || '에너지는 회복 우선 구조로 관리하는 편이 맞습니다.'} ${health?.caution || reportCore.primaryCaution}`,
        opportunities: `${career?.thesis || '기회는 커리어 쪽에서 단계적으로 열립니다.'} ${career?.action || reportCore.primaryAction}`,
        cautions: `${relation?.caution || reportCore.primaryCaution} ${reportCore.riskControl}`,
        domains: {
          career: `${career?.thesis || ''} ${career?.action || reportCore.primaryAction}`.trim(),
          love: `${relation?.thesis || ''} ${relation?.caution || reportCore.primaryCaution}`.trim(),
          wealth: `${wealth?.thesis || ''} ${wealth?.caution || reportCore.riskControl}`.trim(),
          health: `${health?.thesis || ''} ${health?.action || reportCore.primaryAction}`.trim(),
        },
        actionPlan: `${reportCore.primaryAction} ${reportCore.primaryCaution} ${reportCore.riskControl}`,
        luckyElements: reportCore.judgmentPolicy.rationale,
      }
      return normalizeTimingSections(
        {
          overview: deps.ensureLongSectionNarrative(coreSections.overview, 560, [
            '타이밍 해석의 핵심은 속도를 높이는 것이 아니라, 실행과 확정을 분리해 오류 비용을 줄이는 데 있습니다.',
            '지금 구간은 같은 결론도 언제 어떻게 실행하느냐에 따라 결과 편차가 크게 갈릴 수 있습니다.',
          ]),
          energy: deps.ensureLongSectionNarrative(coreSections.energy, 520, [
            '피로 신호를 뒤늦게 다루기보다, 먼저 회복 슬롯을 배치하는 방식이 현재 흐름과 더 잘 맞습니다.',
            '짧은 회복 루틴을 반복하는 쪽이 한 번의 강한 몰입보다 컨디션을 더 안정시킵니다.',
          ]),
          opportunities: deps.ensureLongSectionNarrative(coreSections.opportunities, 520, [
            '기회는 넓게 벌리는 것보다, 이미 열린 문을 단계적으로 확정하는 과정에서 더 선명해집니다.',
            '지금은 시작 자체보다 완료 품질과 조건 합의가 다음 기회를 결정합니다.',
          ]),
          cautions: deps.ensureLongSectionNarrative(coreSections.cautions, 500, [
            '특히 관계와 소통 영역의 주의 신호는 결론보다 확인 절차를 먼저 두라는 뜻으로 읽는 편이 맞습니다.',
            '같은 메시지도 해석 차이가 크면 결과가 달라지므로, 짧은 재확인이 리스크를 크게 줄입니다.',
          ]),
          domains: {
            career: deps.ensureLongSectionNarrative(coreSections.domains.career, 420, [
              '커리어는 새로운 약속보다 기존 역할과 기준을 선명하게 정할수록 결과가 더 안정됩니다.',
            ]),
            love: deps.ensureLongSectionNarrative(coreSections.domains.love, 420, [
              '관계는 감정의 크기보다 해석 일치를 먼저 맞추는 편이 현재 흐름에 더 적합합니다.',
            ]),
            wealth: deps.ensureLongSectionNarrative(coreSections.domains.wealth, 420, [
              '재정은 상승 신호가 있어도 조건 검토가 빠지면 같은 속도로 새는 구멍도 커질 수 있습니다.',
            ]),
            health: deps.ensureLongSectionNarrative(coreSections.domains.health, 420, [
              '건강은 무너지기 전에 리듬을 유지하는 운영이 가장 큰 차이를 만듭니다.',
            ]),
          },
          actionPlan: deps.ensureLongSectionNarrative(coreSections.actionPlan, 520, [
            '실행 기준을 단순하게 유지해야 실제 행동 전환률과 결과 재현성이 함께 올라갑니다.',
            '오늘은 많이 하기보다 중요한 것을 정확히 닫는 구조가 맞습니다.',
          ]),
          luckyElements: deps.ensureLongSectionNarrative(coreSections.luckyElements || '', 360, [
            '행운 요소는 감이 아니라 운영 원칙으로 작동하며, 기준을 지킬수록 체감 품질이 올라갑니다.',
          ]),
        },
        lang
      )
    }
    return normalizeTimingSections(
      {
        overview: `${reportCore.thesis} ${timing ? deps.buildTimingWindowNarrative(reportCore.focusDomain, timing, lang) : reportCore.gradeReason}`,
        energy: `${health?.thesis || 'Energy should be managed with recovery-first pacing.'} ${health?.caution || reportCore.primaryCaution}`,
        opportunities: `${career?.thesis || 'Opportunity opens through staged career moves.'} ${career?.action || reportCore.primaryAction}`,
        cautions: `${relation?.caution || reportCore.primaryCaution} ${reportCore.riskControl}`,
        domains: {
          career: `${career?.thesis || ''} ${career?.action || reportCore.primaryAction}`.trim(),
          love: `${relation?.thesis || ''} ${relation?.caution || reportCore.primaryCaution}`.trim(),
          wealth: `${wealth?.thesis || ''} ${wealth?.caution || reportCore.riskControl}`.trim(),
          health: `${health?.thesis || ''} ${health?.action || reportCore.primaryAction}`.trim(),
        },
        actionPlan: `${reportCore.primaryAction} ${reportCore.primaryCaution} ${reportCore.riskControl}`,
        luckyElements: reportCore.judgmentPolicy.rationale,
      },
      lang
    )
  }

  const claims = synthesis?.claims || []
  const pick = (domain: string) => claims.find((claim) => claim.domain === domain)
  const merge = (lead: string | undefined, body: string) =>
    lead && lead.trim().length > 0 ? `${lead} ${body}` : body
  const timing = pick('timing')
  const career = pick('career')
  const relation = pick('relationship')
  const wealth = pick('wealth')
  const health = pick('health')

  if (lang === 'ko') {
    const koSections: TimingReportSections = {
      overview: merge(
        timing?.thesis,
        '오늘 흐름은 확정 속도보다 재확인 순서가 중요합니다. 결론과 실행 시점을 분리하면 손실 가능성을 줄일 수 있습니다. 오전에는 핵심 과제 1개를 끝내는 데 집중하고, 오후에는 외부 공유 전 조건/기한/책임을 문서로 다시 확인하세요. 당일 확정이 필요한 항목과 보류 항목을 분리하면 판단 피로가 줄고 실수 비용도 낮아집니다.'
      ),
      energy: merge(
        health?.thesis,
        '에너지는 단기 집중 후 회복 관리가 핵심입니다. 수면·수분·루틴을 먼저 고정한 뒤 업무 볼륨을 늘리세요. 과속을 막기 위해 60~90분 집중 블록 뒤에 10분 회복 블록을 고정하면 생산성 편차가 줄어듭니다. 피로 신호가 올라올수록 새 일을 늘리기보다 진행 중인 일을 깔끔히 마무리하는 편이 성과를 지켜줍니다.'
      ),
      opportunities: merge(
        career?.thesis,
        '기회 구간에서는 핵심 과업 1~2개 완결 전략이 유리합니다. 확장 전에 역할과 책임을 먼저 정리하세요. 제안/협업은 범위를 좁혀 파일럿 형태로 시작하면 실패 비용을 줄이면서도 학습 속도를 높일 수 있습니다. 오늘은 실행 속도보다 완료 품질을 기준으로 우선순위를 정하면 다음 단계 확장이 훨씬 수월해집니다.'
      ),
      cautions: merge(
        relation?.riskControl,
        '커뮤니케이션 오차가 누적되면 성과가 흔들릴 수 있습니다. 대화/문서 전달 전 한 줄 요약 재확인을 넣으세요. 특히 숫자/기한/범위가 포함된 메시지는 송신 전 체크리스트를 거쳐야 오해를 줄일 수 있습니다. 감정이 올라온 상태에서는 즉시 확정 답변보다 시간차 응답이 결과적으로 관계 비용을 낮춥니다.'
      ),
      domains: {
        career: merge(
          career?.riskControl,
          '커리어는 일정·우선순위·마감 정의를 먼저 고정하는 운영이 안전합니다. 업무 요청이 많아질수록 “오늘 끝낼 일/이번 주 처리할 일/보류할 일”로 나눠 운영하면 완료율이 올라갑니다. 역할 경계를 문서로 남겨야 협업 충돌이 줄어듭니다.'
        ),
        love: merge(
          relation?.riskControl,
          '관계는 감정 속도보다 해석 일치가 먼저입니다. 확인 질문으로 오차를 줄이세요. 중요한 대화는 상대가 이해한 핵심을 한 문장으로 되짚게 하면 오해 누적을 막을 수 있습니다. 결론을 서두르기보다 맥락을 맞춘 뒤 합의점을 정하세요.'
        ),
        wealth: merge(
          wealth?.riskControl,
          '재정은 금액·기한·취소조건을 체크리스트로 검증한 뒤 확정하세요. 지출은 즉흥 결제보다 24시간 보류 규칙을 두면 후회 비용을 크게 줄일 수 있습니다. 현금흐름표를 짧게라도 업데이트하면 의사결정 정확도가 올라갑니다.'
        ),
        health: merge(
          health?.riskControl,
          '건강은 과속보다 회복 리듬 유지가 우선입니다. 피로 누적 신호를 선제적으로 차단하세요. 무리한 운동/수면 부족/카페인 과다 조합은 집중력 하락을 키울 수 있으니 피하는 것이 좋습니다. 회복 루틴을 일정에 먼저 배치하면 하루 품질이 안정됩니다.'
        ),
      },
      actionPlan:
        '오늘은 1) 끝낼 결과물 1개 정의 2) 외부 전달 전 조건·기한·책임 재확인 3) 당일 확정이 아닌 항목은 24시간 재검토 슬롯으로 이동의 3단계로 운영하세요. 이 루틴을 반복하면 실수율은 낮아지고, 같은 시간 대비 체감 성과는 높아집니다. 실행 기준은 “많이 하기”가 아니라 “완결도 높게 끝내기”로 잡는 것이 유리합니다.',
      luckyElements:
        '행운 요소는 속도보다 순서입니다. 먼저 재확인하고 이후 확정하세요. 오늘은 작은 승리를 빠르게 쌓기보다 핵심 한 건의 완성도를 높이는 방식이 전체 흐름을 안정시키는 데 더 효과적입니다. 계획을 좁히고 마감을 명확히 두면 체감 운의 흔들림이 줄어듭니다.',
    }

    const extra: Record<string, string[]> = {
      overview: [
        '핵심은 많이 처리하는 날이 아니라, 중요한 것을 정확히 닫는 날이라는 점입니다.',
        '오전은 생산 블록, 오후는 조정 블록으로 역할을 분리하면 하루의 밀도가 확실히 올라갑니다.',
      ],
      energy: [
        '에너지 관리가 무너지면 판단 품질이 먼저 떨어지므로, 회복 시간을 일정 안에 먼저 배치하는 운영이 필요합니다.',
        '집중 시간이 길어질수록 짧은 회복 간격을 의도적으로 넣어야 후반부 결정력이 유지됩니다.',
      ],
      opportunities: [
        '오늘 기회는 새 시작보다 기존 과업의 완결에서 더 크게 발생합니다.',
        '작게 검증하고 빠르게 보완하는 루프를 돌리면 확장 비용을 크게 낮출 수 있습니다.',
      ],
      cautions: [
        '특히 메시지/문서/합의처럼 기록이 남는 커뮤니케이션은 한 번 더 확인하는 습관이 필수입니다.',
        '감정이 올라온 순간의 즉시 확정은 피하고, 시간차 응답으로 판단 오차를 줄이세요.',
      ],
      career: [
        '커리어 신뢰는 화려한 시작보다 누락 없는 마감에서 쌓입니다.',
        '오늘은 새로운 약속을 늘리기보다 기존 책임을 선명하게 정리하는 쪽이 유리합니다.',
      ],
      love: [
        '관계에서는 이기려는 대화보다 정확히 이해하는 대화가 장기적으로 훨씬 강합니다.',
        '짧은 확인 질문 하나가 길어진 갈등을 미리 끊어낼 수 있습니다.',
      ],
      wealth: [
        '재정은 기대수익보다 조건 통제가 먼저입니다.',
        '작은 지출이라도 기준을 통일하면 월말 변동성이 눈에 띄게 줄어듭니다.',
      ],
      health: [
        '건강은 컨디션이 나빠졌을 때 고치는 것보다, 나빠지기 전에 리듬을 유지하는 것이 훨씬 효율적입니다.',
        '오늘은 강한 루틴 하나보다 약한 루틴 여러 번이 실제 회복에 더 유리합니다.',
      ],
      actionPlan: [
        '실행 항목을 줄이면 집중이 살아나고, 집중이 살아나면 결과 품질이 올라갑니다.',
        '하루 종료 전 10분 리뷰만 고정해도 다음 날 출발 속도가 달라집니다.',
      ],
      luckyElements: [
        '오늘의 운은 감각보다 운영에서 갈립니다.',
        '결정과 확정을 분리하는 습관이 장기 성과를 보호해 줍니다.',
      ],
    }

    return normalizeTimingSections(
      {
        overview: deps.ensureLongSectionNarrative(koSections.overview, 560, extra.overview),
        energy: deps.ensureLongSectionNarrative(koSections.energy, 520, extra.energy),
        opportunities: deps.ensureLongSectionNarrative(
          koSections.opportunities,
          520,
          extra.opportunities
        ),
        cautions: deps.ensureLongSectionNarrative(koSections.cautions, 500, extra.cautions),
        domains: {
          career: deps.ensureLongSectionNarrative(koSections.domains.career, 420, extra.career),
          love: deps.ensureLongSectionNarrative(koSections.domains.love, 420, extra.love),
          wealth: deps.ensureLongSectionNarrative(koSections.domains.wealth, 420, extra.wealth),
          health: deps.ensureLongSectionNarrative(koSections.domains.health, 420, extra.health),
        },
        actionPlan: deps.ensureLongSectionNarrative(koSections.actionPlan, 520, extra.actionPlan),
        luckyElements: deps.ensureLongSectionNarrative(
          koSections.luckyElements || '',
          360,
          extra.luckyElements
        ),
      },
      lang
    )
  }

  return normalizeTimingSections(
    {
      overview:
        timing?.thesis ||
        'Today favors verification order over commitment speed. Separate decision timing from execution timing.',
      energy:
        health?.thesis ||
        'Your energy pattern needs recovery-first pacing. Lock sleep, hydration, and routine before scaling workload.',
      opportunities:
        career?.thesis ||
        'High-yield windows reward narrow-and-finish execution. Lock scope and ownership before expansion.',
      cautions:
        relation?.riskControl ||
        'Communication drift can amplify loss. Add one-line confirmation before sending messages or documents.',
      domains: {
        career:
          career?.riskControl ||
          'For career, stabilize schedule, priorities, and deadlines before hard commitment.',
        love:
          relation?.riskControl ||
          'In relationships, alignment quality beats emotional speed. Use confirmation questions.',
        wealth:
          wealth?.riskControl ||
          'For money decisions, validate amount, due date, and cancellation terms before commit.',
        health:
          health?.riskControl ||
          'For health, preserve recovery rhythm and cut overdrive before fatigue compounds.',
      },
      actionPlan:
        'Execution sequence: 1) define one must-finish output, 2) verify scope/deadline/ownership before external delivery, 3) move non-urgent commitments into a 24h recheck slot.',
      luckyElements:
        'Your practical lucky element is disciplined sequencing: verify first, then commit.',
    },
    lang
  )
}

function enforceThemedDepth(
  sections: ThemedReportSections,
  theme: ReportTheme,
  deps: Pick<SecondaryFallbackDeps, 'ensureLongSectionNarrative' | 'cleanRecommendationLine'>
): ThemedReportSections {
  const extraByField: Record<string, string[]> = {
    deepAnalysis: [
      '핵심은 기질 자체보다 기질을 운용하는 순서를 정하는 데 있습니다.',
      '같은 재능도 실행 구조에 따라 결과 밀도가 크게 달라집니다.',
    ],
    patterns: [
      '상승 신호와 주의 신호가 동시에 있을 때는 공격과 방어를 분리하는 설계가 필수입니다.',
      '패턴을 읽는 목적은 예언이 아니라 손실을 줄이면서 기회를 확장하는 데 있습니다.',
    ],
    timing: [
      '오늘-이번 주-이번 달의 시간축을 분리하면 의사결정 품질이 크게 올라갑니다.',
      '시기를 맞춘다는 것은 기다리는 것이 아니라 순서를 설계하는 일에 가깝습니다.',
    ],
    strategy: [
      '전략은 화려한 선택보다 재현 가능한 반복으로 완성됩니다.',
      '실행 전에 기준을 문장으로 고정하면 돌발 변수 대응력이 높아집니다.',
    ],
    roleFit: [
      '역할 적합은 좋아 보이는 직함보다 실제 에너지 사용 방식과 맞아야 오래 갑니다.',
      '잘 맞는 포지션일수록 성과뿐 아니라 피로 회복 속도도 함께 좋아집니다.',
    ],
    turningPoints: [
      '전환점은 보통 기회 신호와 조정 신호가 동시에 나타나는 지점에서 발생합니다.',
      '변화를 크게 만들수록 기준을 더 단순하게 유지해야 흔들림이 줄어듭니다.',
    ],
    compatibility: [
      '궁합의 본질은 감정 크기보다 해석 정확도와 회복 속도에 있습니다.',
      '강한 끌림이 오래 가려면 소통 규칙이 먼저 합의되어야 합니다.',
    ],
    spouseProfile: [
      '잘 맞는 상대는 완벽한 사람이 아니라 기준을 공유할 수 있는 사람입니다.',
      '관계 안정성은 취향보다 갈등 처리 방식에서 갈리는 경우가 많습니다.',
    ],
    marriageTiming: [
      '관계 확정 시점은 감정 고조보다 생활 조건 정렬이 되었는지가 더 중요합니다.',
      '시간차 재확인은 확신을 약화시키는 것이 아니라 관계 리스크를 줄이는 절차입니다.',
    ],
    incomeStreams: [
      '수입 다각화는 채널 수보다 채널별 리스크 통제 수준이 성패를 가릅니다.',
      '작은 검증 루프를 반복하면 실패 비용은 낮추고 학습 속도는 높일 수 있습니다.',
    ],
    riskManagement: [
      '리스크 관리는 기회를 포기하는 것이 아니라 손실 상한을 정해 기회를 오래 유지하는 방법입니다.',
      '규칙 없는 공격은 성과를 흔들고, 규칙 있는 공격은 성과를 누적시킵니다.',
    ],
    prevention: [
      '예방은 문제가 생긴 뒤의 큰 조치보다, 평소의 작은 조정에서 더 높은 효율이 납니다.',
      '몸 상태는 의지보다 일정 배치의 영향을 크게 받습니다.',
    ],
    riskWindows: [
      '위험 구간은 대체로 일정 밀집과 커뮤니케이션 과부하가 동시에 나타날 때 커집니다.',
      '위험 구간의 핵심 대응은 강행이 아니라 강도 조절과 우선순위 재배치입니다.',
    ],
    recoveryPlan: [
      '회복 계획은 강도보다 지속성이 중요하며, 지킬 수 있는 기준이 오래 갑니다.',
      '루틴이 단순할수록 실제 유지율이 올라갑니다.',
    ],
    dynamics: [
      '가족 역학은 정답 찾기보다 서로의 해석 차이를 줄이는 과정에서 안정됩니다.',
      '짧고 정확한 대화를 반복하는 방식이 장기적으로 갈등 비용을 크게 줄입니다.',
    ],
    communication: [
      '소통의 질은 말의 양이 아니라 맥락과 결론을 분리하는 구조에서 올라갑니다.',
      '중요한 대화일수록 전달 전 요약 확인이 필요합니다.',
    ],
    legacy: [
      '유산은 자산만이 아니라 문제를 다루는 원칙이 다음 세대로 전달되는 방식입니다.',
      '기준 문서화를 습관화하면 관계 운영 품질이 안정됩니다.',
    ],
    actionPlan: [
      '실행 계획은 복잡한 프레임보다 실제 행동으로 전환되는 단순한 단계가 효과적입니다.',
      '핵심은 계획을 많이 세우는 것이 아니라 계획을 끝까지 지키는 구조입니다.',
    ],
  }

  const out: ThemedReportSections = { ...sections }
  out.deepAnalysis = deps.ensureLongSectionNarrative(
    out.deepAnalysis,
    560,
    extraByField.deepAnalysis
  )
  out.patterns = deps.ensureLongSectionNarrative(out.patterns, 520, extraByField.patterns)
  out.timing = deps.ensureLongSectionNarrative(out.timing, 520, extraByField.timing)
  out.actionPlan = deps.ensureLongSectionNarrative(out.actionPlan, 520, extraByField.actionPlan)
  out.recommendations = (out.recommendations || []).map((line, idx) =>
    deps.cleanRecommendationLine(
      deps.ensureLongSectionNarrative(line, 280, [
        `실행 전 체크포인트를 ${idx + 1}개라도 명확히 두면 결과 편차를 줄일 수 있습니다.`,
      ]),
      'ko'
    )
  )

  if (out.strategy)
    out.strategy = deps.ensureLongSectionNarrative(out.strategy, 500, extraByField.strategy)
  if (out.roleFit)
    out.roleFit = deps.ensureLongSectionNarrative(out.roleFit, 460, extraByField.roleFit)
  if (out.turningPoints) {
    out.turningPoints = deps.ensureLongSectionNarrative(
      out.turningPoints,
      460,
      extraByField.turningPoints
    )
  }
  if (out.compatibility) {
    out.compatibility = deps.ensureLongSectionNarrative(
      out.compatibility,
      500,
      extraByField.compatibility
    )
  }
  if (out.spouseProfile) {
    out.spouseProfile = deps.ensureLongSectionNarrative(
      out.spouseProfile,
      460,
      extraByField.spouseProfile
    )
  }
  if (out.marriageTiming) {
    out.marriageTiming = deps.ensureLongSectionNarrative(
      out.marriageTiming,
      420,
      extraByField.marriageTiming
    )
  }
  if (out.incomeStreams) {
    out.incomeStreams = deps.ensureLongSectionNarrative(
      out.incomeStreams,
      440,
      extraByField.incomeStreams
    )
  }
  if (out.riskManagement) {
    out.riskManagement = deps.ensureLongSectionNarrative(
      out.riskManagement,
      420,
      extraByField.riskManagement
    )
  }
  if (out.prevention)
    out.prevention = deps.ensureLongSectionNarrative(out.prevention, 440, extraByField.prevention)
  if (out.riskWindows)
    out.riskWindows = deps.ensureLongSectionNarrative(
      out.riskWindows,
      420,
      extraByField.riskWindows
    )
  if (out.recoveryPlan)
    out.recoveryPlan = deps.ensureLongSectionNarrative(
      out.recoveryPlan,
      420,
      extraByField.recoveryPlan
    )
  if (out.dynamics)
    out.dynamics = deps.ensureLongSectionNarrative(out.dynamics, 460, extraByField.dynamics)
  if (out.communication)
    out.communication = deps.ensureLongSectionNarrative(
      out.communication,
      420,
      extraByField.communication
    )
  if (out.legacy) out.legacy = deps.ensureLongSectionNarrative(out.legacy, 420, extraByField.legacy)

  void theme
  return out
}

export function buildThemedFallbackSections(
  theme: ReportTheme,
  reportCore: ReportCoreViewModel | undefined,
  synthesis: SignalSynthesisResult | undefined,
  lang: Lang,
  deps: SecondaryFallbackDeps
): ThemedReportSections {
  if (reportCore) {
    const focusAdvisory = deps.findReportCoreAdvisory(reportCore, reportCore.focusDomain)
    const focusTiming = deps.findReportCoreTimingWindow(reportCore, reportCore.focusDomain)
    const focusManifestation = deps.findReportCoreManifestation(reportCore, reportCore.focusDomain)
    const common = {
      deepAnalysis: `${focusManifestation?.baselineThesis || focusAdvisory?.thesis || reportCore.thesis} ${reportCore.riskControl}`,
      patterns: `${focusManifestation?.activationThesis || reportCore.gradeReason} ${reportCore.judgmentPolicy.rationale}`,
      timing: `${focusTiming ? deps.buildTimingWindowNarrative(reportCore.focusDomain, focusTiming, lang) : reportCore.gradeReason}`,
      recommendations: [
        reportCore.primaryAction,
        reportCore.primaryCaution,
        reportCore.riskControl,
      ].filter(Boolean),
      actionPlan: `${reportCore.primaryAction} ${reportCore.primaryCaution} ${reportCore.riskControl}`,
    } satisfies ThemedReportSections

    switch (theme) {
      case 'love': {
        const loveRelationship = deps.findReportCoreAdvisory(reportCore, 'relationship')
        const loveWealth = deps.findReportCoreAdvisory(reportCore, 'wealth')
        const loveHealth = deps.findReportCoreAdvisory(reportCore, 'health')
        const loveRelationshipTiming = deps.findReportCoreTimingWindow(reportCore, 'relationship')
        const loveWealthTiming = deps.findReportCoreTimingWindow(reportCore, 'wealth')
        return normalizeThemedSections(
          enforceThemedDepth(
            {
              ...common,
              compatibility:
                `${loveRelationship?.thesis || reportCore.thesis} ${loveHealth?.caution || reportCore.riskControl}`.trim(),
              spouseProfile:
                `${deps.findReportCoreManifestation(reportCore, 'relationship')?.manifestation || reportCore.gradeReason} ${loveWealth?.thesis || ''}`.trim(),
              marriageTiming: loveRelationshipTiming
                ? `${deps.buildTimingWindowNarrative('relationship', loveRelationshipTiming, lang)} ${loveWealthTiming ? deps.buildTimingWindowNarrative('wealth', loveWealthTiming, lang) : reportCore.riskControl}`.trim()
                : reportCore.riskControl,
            },
            theme,
            deps
          ),
          lang
        )
      }
      case 'career':
        return normalizeThemedSections(
          enforceThemedDepth(
            {
              ...common,
              strategy:
                deps.findReportCoreAdvisory(reportCore, 'career')?.thesis || reportCore.thesis,
              roleFit:
                deps.findReportCoreManifestation(reportCore, 'career')?.manifestation ||
                reportCore.gradeReason,
              turningPoints: deps.findReportCoreTimingWindow(reportCore, 'career')
                ? deps.buildTimingWindowNarrative(
                    'career',
                    deps.findReportCoreTimingWindow(reportCore, 'career')!,
                    lang
                  )
                : reportCore.riskControl,
            },
            theme,
            deps
          ),
          lang
        )
      case 'wealth':
        return normalizeThemedSections(
          enforceThemedDepth(
            {
              ...common,
              strategy:
                deps.findReportCoreAdvisory(reportCore, 'wealth')?.thesis || reportCore.thesis,
              incomeStreams:
                deps.findReportCoreManifestation(reportCore, 'wealth')?.manifestation ||
                reportCore.gradeReason,
              riskManagement:
                deps.findReportCoreAdvisory(reportCore, 'wealth')?.caution ||
                reportCore.riskControl,
            },
            theme,
            deps
          ),
          lang
        )
      case 'health':
        return normalizeThemedSections(
          enforceThemedDepth(
            {
              ...common,
              prevention:
                deps.findReportCoreAdvisory(reportCore, 'health')?.thesis || reportCore.thesis,
              riskWindows: deps.findReportCoreTimingWindow(reportCore, 'health')
                ? deps.buildTimingWindowNarrative(
                    'health',
                    deps.findReportCoreTimingWindow(reportCore, 'health')!,
                    lang
                  )
                : reportCore.gradeReason,
              recoveryPlan:
                deps.findReportCoreAdvisory(reportCore, 'health')?.action ||
                reportCore.primaryAction,
            },
            theme,
            deps
          ),
          lang
        )
      case 'family': {
        const familyRelationship = deps.findReportCoreAdvisory(reportCore, 'relationship')
        const familyWealth = deps.findReportCoreAdvisory(reportCore, 'wealth')
        const familyHealth = deps.findReportCoreAdvisory(reportCore, 'health')
        const familyRelationshipTiming = deps.findReportCoreTimingWindow(reportCore, 'relationship')
        const familyHealthTiming = deps.findReportCoreTimingWindow(reportCore, 'health')
        return normalizeThemedSections(
          enforceThemedDepth(
            {
              ...common,
              dynamics:
                `${familyRelationship?.thesis || reportCore.thesis} ${familyWealth?.caution || familyHealth?.caution || reportCore.riskControl}`.trim(),
              communication:
                `${familyRelationship?.caution || reportCore.primaryCaution} ${familyHealth?.action || reportCore.primaryAction}`.trim(),
              legacy:
                `${familyWealth?.thesis || reportCore.judgmentPolicy.rationale} ${familyRelationshipTiming ? deps.buildTimingWindowNarrative('relationship', familyRelationshipTiming, lang) : familyHealthTiming ? deps.buildTimingWindowNarrative('health', familyHealthTiming, lang) : reportCore.riskControl}`.trim(),
            },
            theme,
            deps
          ),
          lang
        )
      }
    }
  }

  const claims = synthesis?.claims || []
  const pick = (domain: string) => claims.find((claim) => claim.domain === domain)
  const merge = (lead: string | undefined, body: string) =>
    lead && lead.trim().length > 0 ? `${lead} ${body}` : body
  const career = pick('career')
  const relation = pick('relationship')
  const wealth = pick('wealth')
  const health = pick('health')
  const personality = pick('personality')
  const timing = pick('timing')

  const baseKo: ThemedReportSections = {
    deepAnalysis: merge(
      personality?.thesis,
      '핵심 성향은 빠른 판단과 검증 필요가 함께 작동하는 구조입니다. 확정 전 재확인 단계를 고정하면 변동성이 줄어듭니다. 강점은 판단 속도와 구조화 능력이며, 리스크는 과속 결론과 누락입니다. 따라서 결론을 내는 순간과 외부 확정을 하는 순간을 분리해 운영하면 성과의 재현성이 올라갑니다. 오늘은 감정 반응보다 실행 순서를 먼저 정해 리듬을 안정화하세요.'
    ),
    patterns:
      '반복 패턴은 상승 신호와 주의 신호가 동시에 나타나는 형태입니다. 따라서 "확장 + 리스크관리"를 하나의 전략으로 묶어 운영하는 것이 유리합니다. 상승 구간에서는 과업을 좁혀 완결률을 높이고, 주의 구간에서는 체크리스트로 손실을 먼저 막아야 합니다. 이 두 단계를 분리하면 같은 노력 대비 결과 편차가 줄어듭니다. 패턴의 핵심은 속도보다 순서, 직감보다 검증입니다.',
    timing: merge(
      timing?.thesis,
      '타이밍 전략은 당일 확정보다 단계적 검증에 강점이 있습니다. 오늘 결론, 내일 확정의 이중 단계가 안정적입니다. 대운/세운 흐름이 엇갈리는 구간에서는 착수는 가능하되 확정은 보수적으로 운영하는 편이 손실을 줄입니다. 중요한 문서/약속/결제는 최소 1회의 재확인 창을 둬야 오차를 줄일 수 있습니다. 타이밍은 빠른 시작보다 정확한 마감에서 차이가 납니다.'
    ),
    recommendations: [
      merge(
        career?.riskControl,
        '핵심 과업 1~2개를 먼저 완결하세요. 범위를 넓히기 전에 역할·기한·책임을 문서 한 줄로 고정하면 실행 오차를 크게 줄일 수 있습니다.'
      ),
      merge(
        relation?.riskControl,
        '대화/문서 전달 전 한 줄 요약 재확인을 넣으세요. 특히 감정이 개입되는 대화일수록 결론보다 해석 일치 확인을 먼저 해야 갈등 비용이 낮아집니다.'
      ),
      merge(
        wealth?.riskControl,
        '금액·기한·취소조건을 체크리스트로 검증하세요. 당일 확정 대신 24시간 보류 후 재검토하면 후회 비용과 누락 리스크를 동시에 줄일 수 있습니다.'
      ),
    ],
    actionPlan:
      '실행 순서는 1) 목표 1개 고정 2) 조건 재확인 3) 확정 분할입니다. 이 순서를 2주 유지하면 결과 재현성이 올라갑니다. 매일 종료 전에 “완료 1건 / 보류 1건 / 재확인 1건”을 기록하면 다음 날 의사결정 속도가 빨라집니다. 핵심은 많이 하는 것이 아니라, 중요한 것을 정확히 끝내는 것입니다.',
  }

  switch (theme) {
    case 'love':
      return normalizeThemedSections(
        enforceThemedDepth(
          {
            ...baseKo,
            compatibility: merge(
              `${relation?.thesis || ''} ${health?.riskControl || ''}`.trim(),
              '관계 궁합은 감정 강도보다 해석 일치와 관계 속도 합이 맞는지가 핵심입니다. 서로의 기대를 문장으로 맞추면 갈등 비용이 줄어듭니다. 좋아하는 마음이 있어도 표현 속도와 확정 속도가 다르면 관계는 쉽게 흔들릴 수 있으니, 감정보다 먼저 속도와 기준을 맞추는 것이 중요합니다.'
            ),
            spouseProfile: merge(
              wealth?.thesis,
              '관계형 파트너와의 조합에서 장점이 커집니다. 다만 확정 속도가 빠르면 오해가 누적되므로 확인 질문 루틴이 필요합니다. 잘 맞는 상대일수록 작은 말실수도 크게 남을 수 있으니, 감정 표현과 사실 확인을 분리하는 대화 습관이 중요합니다. 장기적으로는 설렘만큼 생활 적합도와 책임감의 합이 관계를 지켜주는 순간이 많습니다.'
            ),
            marriageTiming: merge(
              `${timing?.riskControl || ''} ${wealth?.riskControl || ''}`.trim(),
              '중요 확정은 당일보다 24시간 검증 창을 둔 뒤 진행하는 방식이 더 안전합니다. 일정·예산·역할 분담을 문서로 먼저 맞추면 감정 변수에 흔들릴 확률이 낮아집니다. 타이밍이 좋을수록 더 신중하게 기준을 맞추는 것이 실제 만족도를 높이고, 재접근과 결혼 논의는 서로 다른 속도로 운영해야 만족도가 올라갑니다.'
            ),
          },
          theme,
          deps
        ),
        lang
      )
    case 'career':
      return normalizeThemedSections(
        enforceThemedDepth(
          {
            ...baseKo,
            strategy: merge(
              career?.thesis,
              '커리어 전략은 폭넓은 시도보다 핵심 과업 완결 중심이 유리합니다. 역할·마감·책임의 명확화가 성과를 지킵니다. 상승 신호가 있어도 리스크 관리가 함께 필요하므로, 실행은 공격적으로 하되 확정은 단계적으로 진행하세요. 성과가 나는 사람의 공통점은 속도보다 누락 없는 마감 품질에 있습니다.'
            ),
            roleFit:
              '의사결정과 구조화가 필요한 포지션에서 강점이 큽니다. 단, 속도전보다 품질 검증 프로세스가 필수입니다. 리더/기획/운영처럼 기준을 정하고 조율하는 역할에서 특히 성과가 잘 납니다. 반대로 기준 없는 다중 업무는 에너지를 분산시키므로 업무 구조를 먼저 정리해야 합니다.',
            turningPoints: merge(
              timing?.thesis,
              '전환점은 상승 신호와 조정 신호가 동시에 들어오는 구간에서 나타납니다. 확장과 재정의를 병행하세요. 새로운 기회를 잡을 때 기존 방식의 일부를 정리해야 다음 레벨로 올라갈 수 있습니다. 전환기의 핵심은 “더 많이”가 아니라 “더 정확히”입니다.'
            ),
          },
          theme,
          deps
        ),
        lang
      )
    case 'wealth':
      return normalizeThemedSections(
        enforceThemedDepth(
          {
            ...baseKo,
            strategy: merge(
              wealth?.thesis,
              '재정 전략은 수익 기대보다 현금흐름 안정과 조건 검증에 우선순위를 둬야 합니다. 기회가 있어도 리스크를 통제하지 못하면 누적 성과가 흔들릴 수 있으므로, 먼저 손실 상한을 정하고 그 안에서 실행해야 합니다. 수익률보다 생존률을 높이는 운영이 장기적으로 더 큰 결과를 만듭니다.'
            ),
            incomeStreams:
              '수입원 다각화는 가능하지만, 새 채널 확정은 소규모 검증 후 확대가 안전합니다. 파일럿 단계에서 고객 반응/비용 구조/회수 기간을 먼저 확인하면 실패 비용을 크게 줄일 수 있습니다. 작은 성공을 반복해 확장하는 방식이 현재 흐름과 잘 맞습니다.',
            riskManagement: merge(
              wealth?.riskControl,
              '지출 상한과 손절 규칙을 먼저 정하고 실행하세요. 계약/투자/결제는 당일 확정보다 24시간 검토를 넣어 리스크를 통제하는 편이 안정적입니다.'
            ),
          },
          theme,
          deps
        ),
        lang
      )
    case 'health':
      return normalizeThemedSections(
        enforceThemedDepth(
          {
            ...baseKo,
            prevention: merge(
              health?.thesis,
              '예방의 핵심은 과부하 누적을 차단하는 것입니다. 수면·수분·회복 루틴을 일정에 고정하세요. 컨디션이 좋을 때 무리해서 당기는 패턴이 반복되면 반동 피로가 커질 수 있으니 강도 조절이 필수입니다. 건강 전략은 의지보다 시스템이 오래 갑니다.'
            ),
            riskWindows: merge(
              timing?.thesis,
              '리스크 구간은 일정 밀집과 커뮤니케이션 과부하가 겹칠 때 커집니다. 일정 분할로 충격을 줄이세요. 특히 이동/야근/수면 부족이 동시에 겹치면 실수 확률이 급격히 올라갈 수 있습니다. 위험 구간은 미리 예고하고 일정 강도를 낮추는 것이 안전합니다.'
            ),
            recoveryPlan: merge(
              health?.riskControl,
              '회복 계획은 강도보다 지속성이 중요합니다. 2주 단위로 재점검하세요. 무리한 목표보다 매일 지킬 수 있는 기본 루틴을 정해두면 회복 효율이 높아집니다. 기준은 “완벽한 하루”가 아니라 “무너지지 않는 패턴”입니다.'
            ),
          },
          theme,
          deps
        ),
        lang
      )
    case 'family':
      return normalizeThemedSections(
        enforceThemedDepth(
          {
            ...baseKo,
            dynamics: merge(
              `${relation?.thesis || ''} ${wealth?.riskControl || ''}`.trim(),
              '가족 역학은 표현 속도 차이만이 아니라 책임 배분과 실무 부담에서 오해가 커지기 쉽습니다. 누가 감정 정리와 실무 처리를 동시에 떠안는지 보이지 않으면 가까운 관계일수록 억울함이 누적됩니다. 그래서 결론보다 역할, 비용, 돌봄 범위를 먼저 맞추는 습관이 중요합니다. 작은 불균형을 빠르게 정리하면 장기 갈등을 예방할 수 있습니다.'
            ),
            communication: merge(
              `${relation?.riskControl || ''} ${health?.riskControl || ''}`.trim(),
              '결론 전달 전 상대 해석을 다시 확인하면 갈등 비용을 줄일 수 있습니다. 민감한 주제는 즉시 해결하려 하기보다 합의 가능한 기준부터 정하는 편이 안정적입니다. 특히 부모/형제/자녀마다 받아들이는 속도가 다르기 때문에, 누구와는 설명을 길게 하고 누구와는 경계선을 먼저 세워야 하는지 구분하는 것이 중요합니다.'
            ),
            legacy: merge(
              `${wealth?.thesis || ''} ${health?.thesis || ''}`.trim(),
              '세대 과제는 단기 성과보다 일관된 운영 원칙을 남기는 것입니다. 가족 안에서 반복되는 돈 문제, 돌봄 부담, 감정 노동의 패턴을 먼저 보이는 언어로 바꿔야 합니다. 기준 문서화를 습관화하면 역할/책임/기대치가 선명해지고, 남기는 것은 말이 아니라 반복 가능한 운영 규칙이 됩니다.'
            ),
          },
          theme,
          deps
        ),
        lang
      )
  }
}
