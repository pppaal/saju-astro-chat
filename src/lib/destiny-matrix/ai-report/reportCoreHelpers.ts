import type { adaptCoreToReport } from '@/lib/destiny-matrix/core/adapters'
import type { ReportTheme, ThemedReportSections, TimingReportSections } from './types'

import { getPathText, setPathText } from './rewriteGuards'

type Lang = 'ko' | 'en'

export type ReportCoreViewModel = ReturnType<typeof adaptCoreToReport>

export function stripGenericEvidenceFooterText(text: string, lang: Lang): string {
  const value = String(text || '').trim()
  if (!value) return value
  const pattern =
    lang === 'ko'
      ? /\s*핵심 근거는\s*[^.!?\n]+입니다\.?\s*$/u
      : /\s*Key grounding comes from\s*[^.!?\n]+\.\s*$/iu
  return value.replace(pattern, '').trim()
}

export function stripGenericEvidenceFooters<T extends Record<string, unknown>>(
  sections: T,
  paths: string[],
  lang: Lang
): T {
  for (const path of paths) {
    const text = getPathText(sections, path)
    if (!text) continue
    setPathText(sections, path, stripGenericEvidenceFooterText(text, lang))
  }
  return sections
}

export function buildTimingSectionHook(section: keyof TimingReportSections, lang: Lang): string {
  if (lang !== 'ko') {
    const hooks: Record<keyof TimingReportSections, string> = {
      overview: 'This is not a day to win by speed. It is a day to win by clean sequencing.',
      energy: 'If you push past your rhythm, recovery cost will rise faster than output.',
      opportunities: 'The real opening sits in closing what is already within reach.',
      cautions:
        'The main risk now is not lack of talent, but interpretation drift and rushed confirmation.',
      domains:
        'Each domain improves when timing and confirmation are treated as separate decisions.',
      actionPlan: 'Keep the plan brutally simple so execution can actually happen.',
      luckyElements: 'Your edge today comes from order, not from impulse.',
    }
    return hooks[section]
  }
  const hooks: Record<keyof TimingReportSections, string> = {
    overview: '오늘은 빨리 밀어붙여 이기는 날이 아니라, 순서를 잘 나눠서 이기는 날입니다.',
    energy: '컨디션을 무리해서 끌어올리면 성과보다 회복 비용이 먼저 커질 수 있습니다.',
    opportunities:
      '지금 기회는 새 문을 여러 개 여는 데보다, 이미 열린 문을 정확히 닫는 데 있습니다.',
    cautions: '이번 구간의 리스크는 실력 부족보다 해석 오차와 성급한 확정에서 생기기 쉽습니다.',
    domains: '도메인별로 보면 공통 승부처는 속도가 아니라 확인과 합의의 밀도입니다.',
    actionPlan: '실행 계획은 멋있게 짜는 것보다 끝까지 지킬 수 있게 줄이는 편이 훨씬 강합니다.',
    luckyElements: '오늘의 운은 감각보다 운영 순서에서 갈립니다.',
  }
  return hooks[section]
}

export function buildThemedSectionHook(
  theme: ReportTheme,
  section: keyof ThemedReportSections,
  lang: Lang
): string {
  if (lang !== 'ko') {
    const en: Record<ReportTheme, Partial<Record<keyof ThemedReportSections, string>>> = {
      love: {
        deepAnalysis:
          'The relationship theme sharpens around emotional clarity, not emotional volume.',
        compatibility:
          'Compatibility improves when emotional tempo and commitment tempo stop fighting each other.',
        spouseProfile:
          'The partner profile becomes clearer when steadiness matters more than excitement alone.',
        marriageTiming: 'Commitment timing strengthens when trust and daily fit rise together.',
        timing: 'Relationship timing improves when confirmation catches up with attraction.',
        actionPlan:
          'The strongest move here is to slow the conclusion and strengthen the understanding.',
      },
      career: {
        deepAnalysis:
          'The career theme turns on whether your standards are visible enough to trust.',
        strategy:
          'The win here is not expansion alone, but becoming the person trusted with harder decisions.',
        roleFit:
          'The right seat is the one where judgment and coordination matter more than noise.',
        turningPoints: 'Career turning points open when old operating rules are no longer enough.',
        actionPlan:
          'Execution improves when role, scope, and deadline are locked before momentum builds.',
      },
      wealth: {
        deepAnalysis: 'The wealth theme rewards controlled upside rather than hurried gain.',
        strategy: 'The strongest financial move is disciplined filtering before commitment.',
        incomeStreams:
          'Income grows faster when repeatable structure beats short-lived excitement.',
        riskManagement:
          'Financial defense matters most before momentum convinces you that risk is small.',
        actionPlan: 'Protect the downside first, then decide how much upside is worth chasing.',
      },
      health: {
        deepAnalysis: 'The health theme is less about endurance and more about recovery quality.',
        prevention:
          'Prevention works best when small signals are handled before they become expensive.',
        riskWindows: 'Risk windows open quietly, usually before the body has to force a stop.',
        recoveryPlan:
          'Recovery improves when the plan is sustainable enough to repeat without negotiation.',
        timing: 'Body signals matter most when they appear small enough to ignore.',
        actionPlan: 'Short, repeatable recovery choices will outperform one heroic correction.',
      },
      family: {
        deepAnalysis:
          'The family theme stabilizes when interpretation becomes clearer than emotion.',
        dynamics:
          'Family dynamics calm down when roles and expectations are clearer than assumptions.',
        communication:
          'Communication improves when the message gets shorter and the context gets clearer.',
        legacy:
          'What remains in family life is shaped less by intensity than by the patterns repeated over time.',
        actionPlan: 'Reduce friction by shortening the message and clarifying the context first.',
      },
    }
    return en[theme]?.[section] || ''
  }
  const ko: Record<ReportTheme, Partial<Record<keyof ThemedReportSections, string>>> = {
    love: {
      deepAnalysis:
        '이번 관계 테마의 핵심은 감정의 크기보다 감정이 정확히 전달되는 구조를 만드는 데 있습니다.',
      compatibility:
        '관계 궁합은 감정의 온도보다 서로의 속도와 약속 방식이 맞아들 때 훨씬 안정됩니다.',
      spouseProfile: '배우자상은 설렘의 강도보다 꾸준함과 생활 적합성이 드러날 때 더 정확해집니다.',
      marriageTiming:
        '결혼 타이밍은 감정이 커질 때보다 신뢰와 생활 리듬이 함께 맞아들 때 강해집니다.',
      timing: '관계 타이밍은 끌림이 올라오는 순간보다 이해가 맞춰지는 순간에 더 강해집니다.',
      actionPlan: '지금 가장 강한 선택은 결론을 서두르는 것이 아니라, 이해를 먼저 맞추는 것입니다.',
    },
    career: {
      deepAnalysis:
        '이번 커리어 테마의 승부처는 많이 하는 사람이 아니라, 기준이 선명한 사람으로 보이는 데 있습니다.',
      strategy:
        '지금 커리어 전략의 승부처는 일을 많이 벌이는 것이 아니라, 더 어려운 결정을 맡겨도 흔들리지 않는 사람으로 보이는 데 있습니다.',
      roleFit: '잘 맞는 자리는 화려한 직함보다 판단과 조율의 무게를 견딜 수 있는 자리입니다.',
      turningPoints:
        '커리어 전환점은 기회가 몰려올 때보다, 지금 방식으로는 다음 단계에 못 간다는 사실을 인정할 때 열립니다.',
      actionPlan: '실행력은 의욕보다 역할·범위·마감이 먼저 고정될 때 훨씬 강해집니다.',
    },
    wealth: {
      deepAnalysis:
        '이번 재정 테마는 빨리 버는 흐름보다, 새는 구멍을 먼저 막는 설계에서 힘이 납니다.',
      strategy: '재정 전략의 핵심은 수익을 키우는 것보다 손실 상한을 분명히 정하는 데 있습니다.',
      incomeStreams:
        '수입 흐름은 한 번 크게 벌리는 시도보다, 반복 가능한 구조를 늘릴 때 더 안정적으로 커집니다.',
      riskManagement:
        '리스크 관리는 손실이 터진 뒤 수습하는 것이 아니라, 흔들릴 지점을 먼저 줄이는 데서 시작합니다.',
      actionPlan: '조건을 먼저 고정하면 수익은 늦게 보여도 결과는 더 오래 남습니다.',
    },
    health: {
      deepAnalysis:
        '이번 건강 테마는 버티는 힘보다 회복을 끊기지 않게 이어가는 힘이 더 중요합니다.',
      prevention:
        '예방의 핵심은 큰 이상을 기다리는 것이 아니라, 작은 무리 신호를 초기에 바로잡는 데 있습니다.',
      riskWindows:
        '건강 리스크 구간은 갑자기 터지는 듯 보여도, 실제로는 작은 신호를 놓치면서 조용히 열리는 경우가 많습니다.',
      recoveryPlan:
        '회복 계획은 강한 처방 한 번보다, 반복 가능한 회복 습관이 끊기지 않게 이어질 때 힘을 냅니다.',
      timing: '몸의 타이밍은 큰 경고보다 작은 피로 신호를 어떻게 다루느냐에서 갈립니다.',
      actionPlan:
        '강한 하루 한 번보다, 지킬 수 있는 회복 루틴 여러 번이 지금은 더 강한 해법입니다.',
    },
    family: {
      deepAnalysis:
        '이번 가족 테마는 누가 맞는지보다 서로의 해석 차이를 얼마나 줄일 수 있는지가 핵심입니다.',
      dynamics:
        '가족 관계의 흐름은 감정의 세기보다 역할과 기대가 얼마나 분명한지에 따라 훨씬 크게 달라집니다.',
      communication:
        '가족 커뮤니케이션은 말을 많이 하는 것보다, 같은 상황을 같은 뜻으로 이해하게 만드는 데서 풀립니다.',
      legacy: '가족에게 남는 것은 한 번의 강한 장면보다 오랫동안 반복된 태도와 방식입니다.',
      actionPlan:
        '관계 마찰을 줄이는 가장 빠른 방법은 말을 늘리는 게 아니라 맥락을 먼저 맞추는 것입니다.',
    },
  }
  return ko[theme]?.[section] || ''
}

export function buildComprehensiveSectionHook(
  section:
    | 'introduction'
    | 'careerPath'
    | 'relationshipDynamics'
    | 'wealthPotential'
    | 'healthGuidance'
    | 'conclusion',
  lang: Lang
): string {
  if (lang !== 'ko') {
    const hooks = {
      introduction:
        'This is a report about operating leverage, not vague potential, so the first priority is where momentum is actually moving.',
      careerPath:
        'Career moves now favor visible judgment and priority control more than broad expansion.',
      relationshipDynamics:
        'Relationship quality improves fastest when interpretation drift is reduced before emotion escalates.',
      wealthPotential:
        'Financial quality rises when condition checks become stronger than upside excitement.',
      healthGuidance:
        'Health management is decided less by endurance and more by how quickly recovery rhythm is restored.',
      conclusion:
        'The conclusion of this cycle is simple: results improve when speed and verification stop fighting each other.',
    } as const
    return hooks[section]
  }

  const hooks = {
    introduction:
      '이번 종합 리포트의 핵심은 막연한 가능성을 늘어놓는 것이 아니라, 지금 판세를 실제로 움직이는 축을 먼저 선명하게 잡아내는 데 있습니다.',
    careerPath:
      '커리어는 많이 벌이는 사람보다, 우선순위와 판단 기준을 선명하게 보여주는 사람이 이기는 구간입니다.',
    relationshipDynamics:
      '관계의 체감 품질은 감정 표현보다 해석 오차를 얼마나 빨리 줄이느냐에서 먼저 갈립니다.',
    wealthPotential:
      '재정은 기대수익을 키우는 것보다, 조건 검증과 손실 상한을 먼저 다루는 사람이 결국 이깁니다.',
    healthGuidance:
      '건강은 버티는 힘보다 회복 리듬을 얼마나 빨리 되찾는지가 컨디션 격차를 만듭니다.',
    conclusion:
      '이번 흐름의 결론은 재능보다 운영입니다. 밀어붙일 순간과 멈춰 점검할 순간만 정확히 가르면 같은 재능도 전혀 다른 결과를 만듭니다.',
  } as const
  return hooks[section]
}

export function findReportCoreAdvisory(
  reportCore: ReportCoreViewModel,
  domain: string
): ReportCoreViewModel['advisories'][number] | null {
  return reportCore.advisories.find((item) => item.domain === domain) || null
}

export function findReportCoreTimingWindow(
  reportCore: ReportCoreViewModel,
  domain: string
): ReportCoreViewModel['domainTimingWindows'][number] | null {
  return reportCore.domainTimingWindows.find((item) => item.domain === domain) || null
}

export function findReportCoreManifestation(
  reportCore: ReportCoreViewModel,
  domain: string
): ReportCoreViewModel['manifestations'][number] | null {
  return reportCore.manifestations.find((item) => item.domain === domain) || null
}

export function findReportCoreVerdict(
  reportCore: ReportCoreViewModel,
  domain: string
): ReportCoreViewModel['domainVerdicts'][number] | null {
  return reportCore.domainVerdicts.find((item) => item.domain === domain) || null
}
