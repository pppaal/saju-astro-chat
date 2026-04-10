import { buildDeterministicCore } from './deterministicCore'
import { buildUnifiedEnvelope } from './unifiedReport'
import type { ReportCoreViewModel } from './reportCoreHelpers'
import { sanitizeUserFacingNarrative } from './reportNarrativeSanitizer'
import { applyReportBrandVoice } from './reportBrandVoice'
import {
  getReportDomainLabel,
  localizeReportNarrativeText,
  normalizeNarrativeCoreText,
} from './reportTextHelpers'
import { buildInterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'

function getDomainSpecificGenericRewrite(
  actionDomain: string,
  lang: 'ko' | 'en'
): ReadonlyArray<readonly [RegExp, string]> {
  if (lang !== 'ko') return []

  const domainSpecific = {
    career: [
      [
        /지금은 준비와 정보 수집에 집중하세요\.?/g,
        '이번 주에는 역할 범위, 평가 기준, 협상 조건을 문장으로 분리해 두세요.',
      ],
      [
        /결론보다 검토 기준과 보류 조건을 먼저 정리하세요\.?/g,
        '바로 수락하기보다 어떤 조건에서만 움직일지 기준부터 적어 두는 편이 유리합니다.',
      ],
      [
        /감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g,
        '기대감보다 역할 정의와 책임 범위 확인을 앞세워야 판단 오차가 줄어듭니다.',
      ],
    ],
    relationship: [
      [
        /지금은 준비와 정보 수집에 집중하세요\.?/g,
        '이번 주에는 관계 속도, 기대치, 연락 리듬을 짧은 문장으로 먼저 맞춰 보세요.',
      ],
      [
        /결론보다 검토 기준과 보류 조건을 먼저 정리하세요\.?/g,
        '관계를 정의하기보다 어떤 거리와 리듬이 편한지부터 분명히 하는 편이 낫습니다.',
      ],
      [
        /감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g,
        '감정 표현보다 서로의 기대와 경계가 맞는지 확인하는 질문을 앞세워야 합니다.',
      ],
    ],
    wealth: [
      [
        /지금은 준비와 정보 수집에 집중하세요\.?/g,
        '이번 주에는 수익 조건, 지출 누수, 보류 기준을 따로 적어 재정 구조를 먼저 정리하세요.',
      ],
      [
        /결론보다 검토 기준과 보류 조건을 먼저 정리하세요\.?/g,
        '확장보다 손실 상한과 조건선을 먼저 정해 두는 편이 결과를 더 오래 지킵니다.',
      ],
      [
        /감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g,
        '수익 기대보다 비용 구조와 계약 조건 확인을 앞세워야 재정 판단이 흔들리지 않습니다.',
      ],
    ],
    health: [
      [
        /지금은 준비와 정보 수집에 집중하세요\.?/g,
        '이번 주에는 회복 시간부터 확보하고, 과부하가 올라오는 시간을 먼저 기록해 두세요.',
      ],
      [
        /결론보다 검토 기준과 보류 조건을 먼저 정리하세요\.?/g,
        '버티기보다 무엇을 줄여야 몸이 회복되는지 기준부터 세우는 편이 맞습니다.',
      ],
      [
        /감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g,
        '의욕보다 수면, 식사, 과부하 신호를 먼저 확인해야 회복 판단이 정확해집니다.',
      ],
    ],
    move: [
      [
        /지금은 준비와 정보 수집에 집중하세요\.?/g,
        '이번 주에는 후보 지역, 통근 시간, 생활비 차이를 나란히 비교해 이동 조건을 좁혀 보세요.',
      ],
      [
        /결론보다 검토 기준과 보류 조건을 먼저 정리하세요\.?/g,
        '이사 결론보다 어떤 조건이면 옮기고 어떤 조건이면 보류할지부터 정리해야 손실이 줄어듭니다.',
      ],
      [
        /감정 속도보다 확인 질문을 먼저 놓고 해석 오차를 줄이세요\.?/g,
        '기분보다 거리, 비용, 계약 조건 같은 생활 기준을 먼저 확인해야 이동 판단이 선명해집니다.',
      ],
    ],
  } as const

  return [...(domainSpecific[actionDomain as keyof typeof domainSpecific] || [])]
}

function polishFinalSectionValue(value: unknown, actionDomain: string, lang: 'ko' | 'en'): unknown {
  if (typeof value === 'string') {
    const normalized = normalizeNarrativeCoreText(
      value
        .replace(
          /Pushing through fatigue can degrade judgment quality\.?/gi,
          '무리해서 버티면 판단 품질이 급격히 떨어질 수 있습니다.'
        )
        .replace(
          /Pushing through irritation or heat signals often turns a short warning into a longer slowdown\.?/gi,
          '경고 신호를 무시하고 밀어붙이면 짧게 끝날 문제도 길게 끌 수 있습니다.'
        ),
      lang
    )
    const rewritten = getDomainSpecificGenericRewrite(actionDomain, lang).reduce(
      (current, [pattern, replacement]) => current.replace(pattern, replacement),
      normalized
    )
    return sanitizeUserFacingNarrative(dedupeNarrativeSentences(rewritten, lang))
  }
  if (Array.isArray(value)) {
    return value.map((item) => polishFinalSectionValue(item, actionDomain, lang))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        polishFinalSectionValue(child, actionDomain, lang),
      ])
    )
  }
  return value
}

function dedupeNarrativeSentences(text: string, lang: 'ko' | 'en'): string {
  const normalized = sanitizeUserFacingNarrative(text).replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const parts = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const kept: string[] = []

  for (const part of parts) {
    const key = part
      .replace(/[.!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .replace(/이번 주에는/gi, '')
      .replace(/지금은/gi, '')
      .replace(/다음 행동은/gi, '')
      .trim()
      .toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    kept.push(part)
  }

  const joined = kept.join(lang === 'ko' ? ' ' : ' ')
  return sanitizeUserFacingNarrative(joined).trim()
}

function buildKoActionPlanLead(actionDomain: string, decision: string): string {
  switch (actionDomain) {
    case 'career':
      return `지금 커리어에서는 ${decision} 기조로 역할 범위와 조건선을 먼저 정리하는 편이 유리합니다.`
    case 'relationship':
      return `지금 관계에서는 ${decision} 기조로 속도와 기대치를 먼저 맞추는 편이 유리합니다.`
    case 'wealth':
      return `지금 재정에서는 ${decision} 기조로 현금흐름과 손실 상한을 먼저 정리하는 편이 유리합니다.`
    case 'health':
      return `지금 건강에서는 ${decision} 기조로 회복 리듬과 부하 한계를 먼저 바로잡는 편이 유리합니다.`
    case 'move':
      return `지금 이동과 거점 문제에서는 ${decision} 기조로 후보 지역과 생활 조건을 먼저 비교하는 편이 유리합니다.`
    default:
      return `지금 가장 맞는 기본 자세는 ${decision}입니다.`
  }
}

function applyFinalReportStyle<T extends Record<string, unknown>>(
  sections: T,
  sectionPaths: string[],
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  return applyReportBrandVoice(sections, sectionPaths, lang, {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    riskAxisLabel: reportCore.riskAxisLabel,
    topDecisionLabel: reportCore.topDecisionLabel || reportCore.primaryAction,
    riskControl: reportCore.riskControl,
  }) as T
}

function ensureFinalActionPlanGrounding<T extends Record<string, unknown>>(
  sections: T,
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  const current = String(sections.actionPlan || '').trim()
  if (!current) return sections

  const decision = String(reportCore.topDecisionLabel || reportCore.primaryAction || '').trim()
  const riskControl = String(reportCore.riskControl || '').trim()
  const actionDomain = String(reportCore.actionFocusDomain || reportCore.focusDomain || '').trim()
  const prefix: string[] = []

  if (lang === 'ko') {
    if (decision && !current.includes(decision)) {
      prefix.push(buildKoActionPlanLead(actionDomain, decision))
    }
    if (riskControl && !current.includes(riskControl)) {
      prefix.push(riskControl)
    }
  }

  const cleaned = sanitizeUserFacingNarrative(
    `${prefix.join(' ')} ${current}`
      .replace(
        /ê±´ê°• ê´€ê³„ íë¦„ì€ í™•ìž¥ ê´€ë¦¬ êµ­ë©´ì´ë©°, í•µì‹¬ íŒ¨í„´ì´ ì¤‘ì‹¬ì„ ìž¡ê³  ìžˆìŠµë‹ˆë‹¤\./g,
        ''
      )
      .replace(/ê±´ê°• ì£¼ì˜ ì‹ í˜¸\s*action\?*/gi, '')
      .replace(
        /Pushing through fatigue can degrade judgment quality\.?/gi,
        '무리해서 버티면 판단 품질이 급격히 떨어질 수 있습니다.'
      )
      .replace(
        /Pushing through irritation or heat signals often turns a short warning into a longer slowdown\.?/gi,
        '경고 신호를 무시하고 밀어붙이면 짧게 끝날 문제도 길게 끌 수 있습니다.'
      )
      .replace(
        /ì´í›„ì—ë„ ì´ë™Â·ë³€í™” ê²½ê³„ êµ¬ê°„ ê·¼ê±°ê°€ ì´ì–´ì§ˆ ê²ƒ\.?/g,
        '이후에도 이동과 변화는 한 번 더 확인 절차를 거쳐야 합니다.'
      )
      .replace(/\s{2,}/g, ' ')
      .trim()
  )

  return {
    ...sections,
    actionPlan: dedupeNarrativeSentences(cleaned, lang),
  }
}

function ensureFinalReportPolish<T extends Record<string, unknown>>(
  sections: T,
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  if (lang !== 'ko') return sections

  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  const branchLabel = sanitizeUserFacingNarrative(
    localizeReportNarrativeText(
      String(
        reportCore.branchSet?.[0]?.label || reportCore.projections?.branches?.detailLines?.[0] || ''
      ),
      lang
    )
  ).trim()

  let actionPlan = String(sections.actionPlan || '').trim()
  let conclusion = String(sections.conclusion || '').trim()

  if (actionDomain === 'move') {
    actionPlan = sanitizeUserFacingNarrative(
      [
        reportCore.riskControl || '이동·변화는 한 번에 확정하지 말고 단계별로 작게 검증하세요.',
        '예를 들어 이번 주에는 후보 지역을 세 곳 정도로 좁히고, 통근 시간, 생활비, 계약 조건을 나란히 비교하면서 생활 거점을 다시 잡을 준비가 되었는지 확인하세요.',
        '서두르기보다 확인 절차를 먼저 두고, 큰 이동보다 작은 조정부터 시험하는 편이 손실을 줄입니다.',
      ].join(' ')
    )
    conclusion = sanitizeUserFacingNarrative(
      [
        '지금은 경로를 다시 확인하는 쪽이 가장 현실적인 1안입니다.',
        '이번 승부는 서두르지 않고 순서를 지키는 데 달려 있습니다.',
        '생활 거점을 바꾸더라도 기준을 먼저 세운 사람이 결과를 더 안정적으로 가져갑니다.',
      ].join(' ')
    )
  } else {
    conclusion = sanitizeUserFacingNarrative(
      conclusion
        .split('distance tuning')
        .join('ê±°ë¦¬ ì¡°ì ˆ')
        .split('1ì•ˆì€ ê±°ë¦¬ ì¡°ì ˆ ìª½ìž…ë‹ˆë‹¤.')
        .join('ì§€ê¸ˆì€ ê±°ë¦¬ë¥¼ ë‹¤ì‹œ ì¡°ì ˆí•˜ëŠ” ìª½ì´ ê°€ìž¥ í˜„ì‹¤ì ì¸ 1ì•ˆìž…ë‹ˆë‹¤.')
        .split('ì§€ê¸ˆ ì°¨ì´ë¥¼ ë§Œë“œëŠ” ê±´ ë¥¼ ì–´ë–¤ ìˆœì„œë¡œ ì“°ëŠëƒìž…ë‹ˆë‹¤.')
        .join(
          'ì§€ê¸ˆ ì°¨ì´ë¥¼ ë§Œë“œëŠ” ê±´ ê¸°ì¤€ê³¼ ì†ë„ë¥¼ ì–´ë–¤ ìˆœì„œë¡œ ë§žì¶”ëŠëƒìž…ë‹ˆë‹¤.'
        )
        .split('ì„±ê³¼ë¥¼ ë‚¨ê¸°ê³ . ê¸°ì¤€ ì—†ì´ ë°›ì€ ì‚¬ëžŒì€')
        .join('ì„±ê³¼ë¥¼ ë‚¨ê¸°ê³ , ê¸°ì¤€ ì—†ì´ ë°›ì€ ì‚¬ëžŒì€')
    )
  }

  return polishFinalSectionValue(
    {
      ...sections,
      actionPlan,
      conclusion,
    },
    actionDomain,
    lang
  ) as T
}

function attachDeterministicArtifacts(
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  unified: ReturnType<typeof buildUnifiedEnvelope>
): ReturnType<typeof buildDeterministicCore> {
  return {
    ...deterministicCore,
    artifacts: {
      ...(deterministicCore.artifacts || {}),
      mappingRulebook: unified.mappingRulebook as unknown as Record<string, unknown>,
      blocksBySection: unified.blocksBySection,
      scenarioBundles: (unified.scenarioBundles || []).map((bundle) => ({
        id: bundle.id,
        domain: bundle.domain,
        mainTokens: bundle.main.summaryTokens || [],
        altTokens: (bundle.alt || []).map((alt) => alt.summaryTokens || []),
      })),
      evidenceLinks: (unified.evidenceLinks || []).map((link) => ({
        id: link.id,
        signalId: link.signalId,
        claimIds: link.claimIds || [],
        anchorId: link.anchorId,
        setIds: link.setIds || [],
        score: link.linkScore,
      })),
      timelinePriority: unified.timelinePriority,
    },
  }
}

function buildReportOutputCoreFields(
  reportCore: ReportCoreViewModel | null | undefined,
  lang: 'ko' | 'en' = 'ko'
) {
  if (!reportCore) return {}
  const interpretedAnswer = buildInterpretedAnswerContract({
    packet: {
      singleSubjectView: reportCore.singleSubjectView,
      personModel: reportCore.personModel,
      topTimingWindow:
        reportCore.domainTimingWindows.find(
          (item) => item.domain === (reportCore.actionFocusDomain || reportCore.focusDomain)
        ) || reportCore.domainTimingWindows[0],
      focusDomain: reportCore.focusDomain,
    },
    frame:
      reportCore.focusDomain === 'career'
        ? 'career_decision'
        : reportCore.focusDomain === 'relationship'
          ? 'relationship_repair'
          : reportCore.focusDomain === 'wealth'
            ? 'wealth_planning'
            : reportCore.focusDomain === 'health'
              ? 'health_recovery'
              : reportCore.focusDomain === 'timing'
                ? 'timing_window'
                : 'identity_reflection',
    primaryDomain: (reportCore.actionFocusDomain || reportCore.focusDomain || 'personality') as
      | 'personality'
      | 'career'
      | 'relationship'
      | 'wealth'
      | 'health'
      | 'spirituality'
      | 'timing'
      | 'move',
  })
  const localizeReportFreeText = (text: string | undefined | null): string => {
    const value = String(text || '').trim()
    if (!value || lang !== 'ko') return value
    const directReplacements: Array<[RegExp, string]> = [
      [/\bpersonality\b/gi, '성향'],
      [/\bcareer\b/gi, '커리어'],
      [/\brelationship\b/gi, '관계'],
      [/\bwealth\b/gi, '재정'],
      [/\bhealth\b/gi, '건강'],
      [/\bmove\b/gi, '이동'],
      [/\bspirituality\b/gi, '내면'],
      [/\bnow\b/gi, '지금'],
      [/\bweek\b/gi, '주간'],
      [/\bfortnight\b/gi, '2주'],
      [/\bmonth\b/gi, '월간'],
      [/\bseason\b/gi, '분기'],
      [/\bverify\b/gi, '검증'],
      [/\bprepare\b/gi, '준비'],
      [/\bexecute\b/gi, '실행'],
      [/\bTransit\s+saturnReturn\b/gi, '토성 회귀'],
      [/\bTransit\s+jupiterReturn\b/gi, '목성 회귀'],
      [/\bTransit\s+nodeReturn\b/gi, '노드 회귀'],
      [/\bTransit\s+mercuryRetrograde\b/gi, '수성 역행'],
      [/\bTransit\s+marsRetrograde\b/gi, '화성 역행'],
      [/\bTransit\s+venusRetrograde\b/gi, '금성 역행'],
      [/\bsaturnReturn\b/gi, '토성 회귀'],
      [/\bjupiterReturn\b/gi, '목성 회귀'],
      [/\bnodeReturn\b/gi, '노드 회귀'],
      [/\bmercuryRetrograde\b/gi, '수성 역행'],
      [/\bmarsRetrograde\b/gi, '화성 역행'],
      [/\bvenusRetrograde\b/gi, '금성 역행'],
      [/\bsolarReturn\b/gi, '태양 회귀'],
      [/\blunarReturn\b/gi, '달 회귀'],
      [/\bprogressions?\b/gi, '프로그레션'],
      [/\bcaution\b/gi, '주의 신호'],
      [/\bdowngrade pressure\b/gi, '하향 압력'],
      [/\bgeokguk strength\b/gi, '격국 강도'],
      [/\bdebt restructure\b/gi, '부채 재구성'],
      [/\bliquidity defense\b/gi, '유동성 방어'],
      [/\bexpense spike\b/gi, '지출 급증'],
      [/\bpromotion review\b/gi, '승진 검토'],
      [/\brecovery reset\b/gi, '회복 재정비'],
      [/\bbasecamp reset\b/gi, '거점 재정비'],
      [/\bmap full debt stack\b/gi, '부채 구조 전체 점검'],
      [/\bwealth volatility pattern\b/gi, '재정 변동 흐름'],
      [/\bcareer expansion pattern\b/gi, '커리어 확장 흐름'],
      [/\brelationship tension pattern\b/gi, '관계 긴장 흐름'],
      [/\bcashflow\b/gi, '현금흐름'],
      [/\bmoney expansion action\b/gi, '재정 확장 실행'],
      [/\brelationship caution\b/gi, '관계 주의 신호'],
      [/\bcontract negotiation\b/gi, '조건 협상'],
      [/\bspecialist track\b/gi, '전문 트랙'],
      [/\bsleep disruption\b/gi, '수면 교란'],
      [/\bburnout risk\b/gi, '번아웃 위험'],
      [/\bdebt restructuring\b/gi, '부채 재구성'],
      [/\broute recheck\b/gi, '경로 재점검'],
      [/\bdistance tuning\b/gi, '거리 조절'],
    ]

    let localized = value
    for (const [pattern, replacement] of directReplacements) {
      localized = localized.replace(pattern, replacement)
    }

    return localized
      .replace(
        /action pressure stayed narrow between ([^\s]+) and ([^\s]+)/gi,
        (_, left: string, right: string) =>
          `${getReportDomainLabel(left, 'ko')}과 ${getReportDomainLabel(right, 'ko')} 사이에서 행동 압력이 좁게 유지됐습니다.`
      )
      .replace(
        /\b\w+\s+stayed secondary because total support remained below the winner\b/gi,
        '총 지지가 우세 축보다 낮아 보조 축에 머물렀습니다.'
      )
      .replace(/\s+/g, ' ')
      .trim()
  }
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const polishBranchSentence = (text: string | undefined | null): string => {
    const base = localizeReportFreeText(text)
    if (!base || lang !== 'ko') return base
    const replacements: Array<[RegExp, string]> = [
      [
        new RegExp(
          '([\\uAC00-\\uD7A3]+)\\s+Expansion Pattern\\s+\\uD328\\uD134\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC720\\uC9C0\\uB420\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uD655\\uC7A5 \\uD750\\uB984\\uC774 \\uC720\\uC9C0\\uB420 \\uAC83',
      ],
      [
        new RegExp(
          '(.+?)\\s+\\uC774\\uD6C4\\uC5D0\\uB3C4\\s+([\\uAC00-\\uD7A3]+)\\s+Expansion Pattern\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC774\\uC5B4\\uC9C8\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uC774\\uD6C4\\uC5D0\\uB3C4 $2 \\uD655\\uC7A5 \\uD750\\uB984\\uC774 \\uC774\\uC5B4\\uC9C8 \\uAC83',
      ],
      [new RegExp('\\bExpansion Pattern\\b', 'gi'), '\\uD655\\uC7A5 \\uD750\\uB984'],
      [
        new RegExp(
          '([\\uAC00-\\uD7A3]+)\\s+(?:\\uD655\\uC7A5|\\uAE34\\uC7A5|\\uBCC0\\uB3D9\\uC131)\\s+\\uD750\\uB984\\s+\\uD328\\uD134\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC720\\uC9C0\\uB420\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uD750\\uB984\\uC774 \\uC720\\uC9C0\\uB420 \\uAC83',
      ],
      [
        new RegExp(
          '\\uC2DC\\uB098\\uB9AC\\uC624\\s+\\uD655\\uB960\\s+[\\d.]+%\\uC640\\s+\\uC2E0\\uB8B0\\uB3C4\\s+[\\d.]+%\\uAC00\\s+\\uC720\\uC9C0\\uB420\\s+\\uAC83',
          'gi'
        ),
        '\\uD604\\uC7AC \\uAC00\\uB2A5\\uC131\\uACFC \\uC2E0\\uB8B0\\uB3C4\\uAC00 \\uC720\\uC9C0\\uB420 \\uAC83',
      ],
      [
        new RegExp(
          '\\uD0C0\\uC774\\uBC0D\\s+\\uC801\\uD569\\uB3C4\\s+[\\d.]+%\\s+\\uC774\\uC0C1\\uC5D0\\uC11C\\s+(.+?)\\uB97C\\s+\\uBC14\\uB85C\\s+\\uC2E4\\uD589\\uD560\\s+\\uC218\\s+\\uC788\\uC744\\s+\\uAC83',
          'gi'
        ),
        '\\uD0C0\\uC774\\uBC0D\\uC774 \\uCDA9\\uBD84\\uD788 \\uB9DE\\uC744 \\uB54C $1\\uB97C \\uC2E4\\uD589\\uD560 \\uC218 \\uC788\\uC744 \\uAC83',
      ],
      [
        new RegExp(
          '(.+?)\\s+\\uC774\\uD6C4\\uC5D0\\uB3C4\\s+([\\uAC00-\\uD7A3]+)\\s+\\uD750\\uB984\\s+\\uADFC\\uAC70\\uAC00\\s+\\uC774\\uC5B4\\uC9C8\\s+\\uAC83',
          'gi'
        ),
        '$1 \\uC774\\uD6C4\\uC5D0\\uB3C4 $2 \\uD750\\uB984\\uC774 \\uC774\\uC5B4\\uC9C8 \\uAC83',
      ],
    ]

    return replacements
      .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), base)
      .replace(/\s+/g, ' ')
      .trim()
  }
  const localizeProjectionList = (items: Array<string | undefined | null>) =>
    items.map((item) => polishBranchSentence(item)).filter(Boolean)
  const timingWindow = reportCore.domainTimingWindows.find(
    (item) => item.domain === reportCore.actionFocusDomain || item.domain === reportCore.focusDomain
  )
  const structureSummary =
    lang === 'ko'
      ? reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `지금 직접 다뤄야 할 축은 ${actionLabel}이고, 배경 구조축은 ${focusLabel}입니다. 상위 잠재 축은 ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}입니다.`
        : `기본 구조축은 ${focusLabel}이고, 현재 실행축도 ${actionLabel}입니다. 상위 잠재 축은 ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}입니다.`
      : reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `The axis to handle directly right now is ${actionLabel}, while ${focusLabel} remains the background structural axis. The top latent drivers are ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
        : `The identity axis is ${focusLabel}, the action axis is ${actionLabel}, and the top latent drivers are ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
  const timingSummary =
    lang === 'ko'
      ? `${actionLabel} 타이밍 창은 ${localizeReportFreeText(timingWindow?.window || '확인 필요')}이며, ${localizeReportFreeText(timingWindow?.timingConflictNarrative || '구조와 촉발 신호를 함께 읽어야 합니다.')}`
      : `Timing for ${actionLabel} reads as ${timingWindow?.window || 'unknown'}, and ${timingWindow?.timingConflictNarrative || 'structure and trigger need to be read together.'}`
  const conflictSummary =
    lang === 'ko'
      ? localizeReportFreeText(reportCore.arbitrationBrief.conflictReasons[0]) ||
        `${focusLabel}은 배경 구조축이고, ${actionLabel}은 실제로 움직일 실행축입니다.`
      : reportCore.arbitrationBrief.conflictReasons[0] ||
        `${focusLabel} and ${actionLabel} currently separate into identity and action axes.`
  const evidenceSummary =
    lang === 'ko'
      ? `상위 신호 ${reportCore.topSignalIds.slice(0, 3).length}개, 패턴 ${reportCore.topPatternIds.slice(0, 2).length}개, 시나리오 ${reportCore.topScenarioIds.slice(0, 2).length}개가 현재 해석의 중심축을 이룹니다.`
      : `Top signals ${reportCore.topSignalIds.slice(0, 3).join(', ')}, patterns ${reportCore.topPatternIds.slice(0, 2).join(', ')}, and scenarios ${reportCore.topScenarioIds.slice(0, 2).join(', ')} form the current spine.`
  return {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    matrixView: (reportCore.matrixView || []).slice(0, 4).map((row) => ({
      domain: row.domain,
      label: localizeReportFreeText(row.label),
      cells: (row.cells || []).slice(0, 4).map((cell) => ({
        ...cell,
        summary: localizeReportFreeText(cell.summary),
      })),
    })),
    branchSet: (reportCore.branchSet || []).slice(0, 3).map((branch) => ({
      ...branch,
      label: localizeReportFreeText(branch.label),
      summary: localizeReportFreeText(branch.summary),
      entry: localizeProjectionList(branch.entry || []),
      abort: localizeProjectionList(branch.abort || []),
      sustain: localizeProjectionList(branch.sustain || []),
      reversalRisk: polishBranchSentence(branch.reversalRisk || ''),
      wrongMoveCost: polishBranchSentence(branch.wrongMoveCost || ''),
    })),
    singleUserModel: reportCore.singleUserModel
      ? {
          subject: localizeReportFreeText(reportCore.singleUserModel.subject),
          facets: reportCore.singleUserModel.facets.map((facet) => ({
            ...facet,
            label: localizeReportFreeText(facet.label),
            summary: localizeReportFreeText(facet.summary),
            details: localizeProjectionList(facet.details || []),
          })),
        }
      : undefined,
    singleSubjectView: reportCore.singleSubjectView
      ? {
          directAnswer: localizeReportFreeText(reportCore.singleSubjectView.directAnswer),
          structureAxis: {
            ...reportCore.singleSubjectView.structureAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.structureAxis.label),
            thesis: localizeReportFreeText(reportCore.singleSubjectView.structureAxis.thesis),
            topAxes: localizeProjectionList(
              reportCore.singleSubjectView.structureAxis.topAxes || []
            ),
          },
          actionAxis: {
            ...reportCore.singleSubjectView.actionAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.actionAxis.label),
            nowAction: localizeReportFreeText(reportCore.singleSubjectView.actionAxis.nowAction),
            whyThisFirst: localizeReportFreeText(
              reportCore.singleSubjectView.actionAxis.whyThisFirst
            ),
          },
          riskAxis: {
            ...reportCore.singleSubjectView.riskAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.riskAxis.label),
            warning: localizeReportFreeText(reportCore.singleSubjectView.riskAxis.warning),
            hardStops: localizeProjectionList(
              reportCore.singleSubjectView.riskAxis.hardStops || []
            ),
          },
          timingState: {
            ...reportCore.singleSubjectView.timingState,
            bestWindow: localizeReportFreeText(reportCore.singleSubjectView.timingState.bestWindow),
            whyNow: localizeReportFreeText(reportCore.singleSubjectView.timingState.whyNow),
            whyNotYet: localizeReportFreeText(reportCore.singleSubjectView.timingState.whyNotYet),
            windows: reportCore.singleSubjectView.timingState.windows.map((window) => ({
              ...window,
              summary: localizeReportFreeText(window.summary),
            })),
          },
          competingPressures: reportCore.singleSubjectView.competingPressures.map((pressure) => ({
            ...pressure,
            label: localizeReportFreeText(pressure.label),
            nextWindow: localizeReportFreeText(pressure.nextWindow),
            summary: localizeReportFreeText(pressure.summary),
          })),
          branches: reportCore.singleSubjectView.branches.map((branch) => ({
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            entryConditions: localizeProjectionList(branch.entryConditions || []),
            abortConditions: localizeProjectionList(branch.abortConditions || []),
            nextMove: localizeReportFreeText(branch.nextMove),
          })),
          entryConditions: localizeProjectionList(
            reportCore.singleSubjectView.entryConditions || []
          ),
          abortConditions: localizeProjectionList(
            reportCore.singleSubjectView.abortConditions || []
          ),
          nextMove: localizeReportFreeText(reportCore.singleSubjectView.nextMove),
          confidence: reportCore.singleSubjectView.confidence,
          reliability: reportCore.singleSubjectView.reliability
            ? {
                crossAgreement: reportCore.singleSubjectView.reliability.crossAgreement,
                contradictionFlags: localizeProjectionList(
                  reportCore.singleSubjectView.reliability.contradictionFlags || []
                ),
                notes: localizeProjectionList(reportCore.singleSubjectView.reliability.notes || []),
              }
            : undefined,
        }
      : undefined,
    interpretedAnswer: interpretedAnswer
      ? {
          ...interpretedAnswer,
          directAnswer: localizeReportFreeText(interpretedAnswer.directAnswer),
          why: localizeProjectionList(interpretedAnswer.why || []),
          timing: {
            bestWindow: localizeReportFreeText(interpretedAnswer.timing.bestWindow),
            now: localizeReportFreeText(interpretedAnswer.timing.now),
            next: localizeReportFreeText(interpretedAnswer.timing.next),
            later: localizeReportFreeText(interpretedAnswer.timing.later),
          },
          conditions: {
            entry: localizeProjectionList(interpretedAnswer.conditions.entry || []),
            abort: localizeProjectionList(interpretedAnswer.conditions.abort || []),
          },
          branches: (interpretedAnswer.branches || []).map((branch) => ({
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            nextMove: localizeReportFreeText(branch.nextMove),
          })),
          uncertainty: localizeProjectionList(interpretedAnswer.uncertainty || []),
          nextMove: localizeReportFreeText(interpretedAnswer.nextMove),
        }
      : undefined,
    personModel: reportCore.personModel
      ? {
          subject: localizeReportFreeText(reportCore.personModel.subject),
          overview: localizeReportFreeText(reportCore.personModel.overview),
          structuralCore: {
            ...reportCore.personModel.structuralCore,
            overview: localizeReportFreeText(reportCore.personModel.structuralCore.overview),
            latentAxes: localizeProjectionList(
              reportCore.personModel.structuralCore.latentAxes || []
            ),
          },
          formationProfile: {
            ...reportCore.personModel.formationProfile,
            summary: localizeReportFreeText(reportCore.personModel.formationProfile.summary),
            repeatedPatternFamilies: localizeProjectionList(
              reportCore.personModel.formationProfile.repeatedPatternFamilies || []
            ),
            dominantLatentGroups: localizeProjectionList(
              reportCore.personModel.formationProfile.dominantLatentGroups || []
            ),
            pressureHabits: localizeProjectionList(
              reportCore.personModel.formationProfile.pressureHabits || []
            ),
            supportHabits: localizeProjectionList(
              reportCore.personModel.formationProfile.supportHabits || []
            ),
          },
          timeProfile: {
            ...reportCore.personModel.timeProfile,
            timingNarrative: localizeReportFreeText(
              reportCore.personModel.timeProfile.timingNarrative
            ),
            windows: reportCore.personModel.timeProfile.windows.map((window) => ({
              ...window,
              label: localizeReportFreeText(window.label),
              window: localizeReportFreeText(window.window),
              granularity: localizeReportFreeText(window.granularity),
              whyNow: localizeReportFreeText(window.whyNow),
              entryConditions: localizeProjectionList(window.entryConditions || []),
              abortConditions: localizeProjectionList(window.abortConditions || []),
            })),
            activationSources: reportCore.personModel.timeProfile.activationSources.map(
              (source) => ({
                ...source,
                label: localizeReportFreeText(source.label),
              })
            ),
          },
          layers: reportCore.personModel.layers.map((layer) => ({
            ...layer,
            label: localizeReportFreeText(layer.label),
            summary: localizeReportFreeText(layer.summary),
            bullets: localizeProjectionList(layer.bullets || []),
          })),
          dimensions: reportCore.personModel.dimensions.map((dimension) => ({
            ...dimension,
            label: localizeReportFreeText(dimension.label),
            summary: localizeReportFreeText(dimension.summary),
          })),
          domainStateGraph: reportCore.personModel.domainStateGraph.map((state) => ({
            ...state,
            label: localizeReportFreeText(state.label),
            thesis: localizeReportFreeText(state.thesis),
            supportSignals: localizeProjectionList(state.supportSignals || []),
            pressureSignals: localizeProjectionList(state.pressureSignals || []),
            firstMove: localizeReportFreeText(state.firstMove),
            holdMove: localizeReportFreeText(state.holdMove),
            timescales: (state.timescales || []).map((timescale) => ({
              ...timescale,
              thesis: localizeReportFreeText(timescale.thesis),
              entryConditions: localizeProjectionList(timescale.entryConditions || []),
              abortConditions: localizeProjectionList(timescale.abortConditions || []),
            })),
          })),
          domainPortraits: reportCore.personModel.domainPortraits.map((portrait) => ({
            ...portrait,
            label: localizeReportFreeText(portrait.label),
            summary: localizeReportFreeText(portrait.summary),
            baselineThesis: localizeReportFreeText(portrait.baselineThesis),
            activationThesis: localizeReportFreeText(portrait.activationThesis),
            likelyExpressions: localizeProjectionList(portrait.likelyExpressions || []),
            riskExpressions: localizeProjectionList(portrait.riskExpressions || []),
            allowedActions: localizeProjectionList(portrait.allowedActions || []),
            blockedActions: localizeProjectionList(portrait.blockedActions || []),
          })),
          states: reportCore.personModel.states.map((state) => ({
            ...state,
            label: localizeReportFreeText(state.label),
            summary: localizeReportFreeText(state.summary),
            drivers: localizeProjectionList(state.drivers || []),
            counterweights: localizeProjectionList(state.counterweights || []),
          })),
          appliedProfile: {
            foodProfile: {
              ...reportCore.personModel.appliedProfile.foodProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.foodProfile.summary
              ),
              thermalBias: localizeReportFreeText(
                reportCore.personModel.appliedProfile.foodProfile.thermalBias
              ),
              digestionStyle: localizeReportFreeText(
                reportCore.personModel.appliedProfile.foodProfile.digestionStyle
              ),
              helpfulFoods: localizeProjectionList(
                reportCore.personModel.appliedProfile.foodProfile.helpfulFoods || []
              ),
              cautionFoods: localizeProjectionList(
                reportCore.personModel.appliedProfile.foodProfile.cautionFoods || []
              ),
              rhythmGuidance: localizeProjectionList(
                reportCore.personModel.appliedProfile.foodProfile.rhythmGuidance || []
              ),
            },
            lifeRhythmProfile: {
              ...reportCore.personModel.appliedProfile.lifeRhythmProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.summary
              ),
              peakWindows: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.peakWindows || []
              ),
              recoveryWindows: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.recoveryWindows || []
              ),
              stressBehaviors: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.stressBehaviors || []
              ),
              regulationMoves: localizeProjectionList(
                reportCore.personModel.appliedProfile.lifeRhythmProfile.regulationMoves || []
              ),
            },
            relationshipStyleProfile: {
              ...reportCore.personModel.appliedProfile.relationshipStyleProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.summary
              ),
              attractionPatterns: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.attractionPatterns ||
                  []
              ),
              stabilizers: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.stabilizers || []
              ),
              ruptureTriggers: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.ruptureTriggers || []
              ),
              repairMoves: localizeProjectionList(
                reportCore.personModel.appliedProfile.relationshipStyleProfile.repairMoves || []
              ),
            },
            workStyleProfile: {
              ...reportCore.personModel.appliedProfile.workStyleProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.workStyleProfile.summary
              ),
              bestRoles: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.bestRoles || []
              ),
              bestConditions: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.bestConditions || []
              ),
              fatigueTriggers: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.fatigueTriggers || []
              ),
              leverageMoves: localizeProjectionList(
                reportCore.personModel.appliedProfile.workStyleProfile.leverageMoves || []
              ),
            },
            moneyStyleProfile: {
              ...reportCore.personModel.appliedProfile.moneyStyleProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.moneyStyleProfile.summary
              ),
              earningPattern: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.earningPattern || []
              ),
              savingPattern: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.savingPattern || []
              ),
              leakageRisks: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.leakageRisks || []
              ),
              controlRules: localizeProjectionList(
                reportCore.personModel.appliedProfile.moneyStyleProfile.controlRules || []
              ),
            },
            environmentProfile: {
              ...reportCore.personModel.appliedProfile.environmentProfile,
              summary: localizeReportFreeText(
                reportCore.personModel.appliedProfile.environmentProfile.summary
              ),
              preferredSettings: localizeProjectionList(
                reportCore.personModel.appliedProfile.environmentProfile.preferredSettings || []
              ),
              drainSignals: localizeProjectionList(
                reportCore.personModel.appliedProfile.environmentProfile.drainSignals || []
              ),
              resetActions: localizeProjectionList(
                reportCore.personModel.appliedProfile.environmentProfile.resetActions || []
              ),
            },
          },
          relationshipProfile: {
            ...reportCore.personModel.relationshipProfile,
            summary: localizeReportFreeText(reportCore.personModel.relationshipProfile.summary),
            partnerArchetypes: localizeProjectionList(
              reportCore.personModel.relationshipProfile.partnerArchetypes || []
            ),
            inflowPaths: localizeProjectionList(
              reportCore.personModel.relationshipProfile.inflowPaths || []
            ),
            commitmentConditions: localizeProjectionList(
              reportCore.personModel.relationshipProfile.commitmentConditions || []
            ),
            breakPatterns: localizeProjectionList(
              reportCore.personModel.relationshipProfile.breakPatterns || []
            ),
          },
          careerProfile: {
            ...reportCore.personModel.careerProfile,
            summary: localizeReportFreeText(reportCore.personModel.careerProfile.summary),
            suitableLanes: localizeProjectionList(
              reportCore.personModel.careerProfile.suitableLanes || []
            ),
            executionStyle: localizeProjectionList(
              reportCore.personModel.careerProfile.executionStyle || []
            ),
            hiringTriggers: localizeProjectionList(
              reportCore.personModel.careerProfile.hiringTriggers || []
            ),
            blockers: localizeProjectionList(reportCore.personModel.careerProfile.blockers || []),
          },
          futureBranches: reportCore.personModel.futureBranches.map((branch) => ({
            ...branch,
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            conditions: localizeProjectionList(branch.conditions || []),
            blockers: localizeProjectionList(branch.blockers || []),
          })),
          eventOutlook: reportCore.personModel.eventOutlook.map((event) => ({
            ...event,
            label: localizeReportFreeText(event.label),
            summary: localizeReportFreeText(event.summary),
            bestWindow: localizeReportFreeText(event.bestWindow || ''),
            entryConditions: localizeProjectionList(event.entryConditions || []),
            abortConditions: localizeProjectionList(event.abortConditions || []),
            nextMove: localizeReportFreeText(event.nextMove),
          })),
          birthTimeHypotheses: reportCore.personModel.birthTimeHypotheses.map((item) => ({
            ...item,
            label: localizeReportFreeText(item.label),
            birthTime: localizeReportFreeText(item.birthTime),
            summary: localizeReportFreeText(item.summary),
            supportSignals: localizeProjectionList(item.supportSignals || []),
            cautionSignals: localizeProjectionList(item.cautionSignals || []),
            coreDiff: item.coreDiff
              ? {
                  directAnswer: localizeReportFreeText(item.coreDiff.directAnswer || ''),
                  actionDomain: localizeReportFreeText(item.coreDiff.actionDomain || ''),
                  riskDomain: localizeReportFreeText(item.coreDiff.riskDomain || ''),
                  bestWindow: localizeReportFreeText(item.coreDiff.bestWindow || ''),
                  branchSummary: localizeReportFreeText(item.coreDiff.branchSummary || ''),
                }
              : undefined,
          })),
          crossConflictMap: reportCore.personModel.crossConflictMap.map((item) => ({
            ...item,
            label: localizeReportFreeText(item.label),
            summary: localizeReportFreeText(item.summary),
            sajuView: localizeReportFreeText(item.sajuView),
            astroView: localizeReportFreeText(item.astroView),
            resolutionMove: localizeReportFreeText(item.resolutionMove),
          })),
          pastEventReconstruction: {
            summary: localizeReportFreeText(reportCore.personModel.pastEventReconstruction.summary),
            markers: reportCore.personModel.pastEventReconstruction.markers.map((marker) => ({
              ...marker,
              label: localizeReportFreeText(marker.label),
              ageWindow: localizeReportFreeText(marker.ageWindow),
              summary: localizeReportFreeText(marker.summary),
              evidence: localizeProjectionList(marker.evidence || []),
            })),
          },
          uncertaintyEnvelope: {
            ...reportCore.personModel.uncertaintyEnvelope,
            summary: localizeReportFreeText(reportCore.personModel.uncertaintyEnvelope.summary),
            reliableAreas: localizeProjectionList(
              reportCore.personModel.uncertaintyEnvelope.reliableAreas || []
            ),
            conditionalAreas: localizeProjectionList(
              reportCore.personModel.uncertaintyEnvelope.conditionalAreas || []
            ),
            unresolvedAreas: localizeProjectionList(
              reportCore.personModel.uncertaintyEnvelope.unresolvedAreas || []
            ),
          },
          evidenceLedger: {
            ...reportCore.personModel.evidenceLedger,
            coherenceNotes: localizeProjectionList(
              reportCore.personModel.evidenceLedger.coherenceNotes || []
            ),
            contradictionFlags: localizeProjectionList(
              reportCore.personModel.evidenceLedger.contradictionFlags || []
            ),
          },
        }
      : undefined,
    arbitrationBrief: reportCore.arbitrationBrief,
    latentTopAxes: reportCore.latentTopAxes,
    projections: {
      structure: {
        headline: lang === 'ko' ? '구조 해석' : 'Structure Projection',
        summary: structureSummary,
        topAxes: reportCore.latentTopAxes.slice(0, 4).map((axis) => axis.label),
        detailLines: localizeProjectionList(reportCore.projections?.structure?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.structure?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.structure?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.structure?.nextMoves || []),
      },
      timing: {
        headline: lang === 'ko' ? '타이밍 해석' : 'Timing Projection',
        summary: timingSummary,
        window: timingWindow?.window,
        granularity: timingWindow?.timingGranularity,
        detailLines: localizeProjectionList(reportCore.projections?.timing?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.timing?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.timing?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.timing?.nextMoves || []),
      },
      conflict: {
        headline: lang === 'ko' ? '충돌 해석' : 'Conflict Projection',
        summary: conflictSummary,
        detailLines: localizeProjectionList(reportCore.projections?.conflict?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.conflict?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.conflict?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.conflict?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? reportCore.arbitrationBrief.conflictReasons
                .slice(0, 3)
                .map((item) => localizeReportFreeText(item))
            : reportCore.arbitrationBrief.conflictReasons.slice(0, 3),
      },
      action: {
        headline: lang === 'ko' ? '행동 해석' : 'Action Projection',
        summary:
          lang === 'ko'
            ? `${actionLabel} 축에서는 ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction}이 현재 우선 행동입니다.`
            : `On the ${actionLabel} axis, ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction} is the live move.`,
        detailLines: localizeProjectionList(reportCore.projections?.action?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.action?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.action?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.action?.nextMoves || []),
        reasons: [
          reportCore.topDecisionLabel || reportCore.topDecisionId || '',
          ...(reportCore.judgmentPolicy.allowedActionLabels || []).slice(0, 2),
        ].filter(Boolean),
      },
      risk: {
        headline: lang === 'ko' ? '리스크 해석' : 'Risk Projection',
        summary:
          lang === 'ko'
            ? [
                localizeReportFreeText(reportCore.primaryCaution),
                localizeReportFreeText(reportCore.riskControl),
              ]
                .filter(Boolean)
                .join('. ')
            : `${reportCore.primaryCaution} ${reportCore.riskControl}`.trim(),
        detailLines: localizeProjectionList(reportCore.projections?.risk?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.risk?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.risk?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.risk?.nextMoves || []),
        reasons: [
          ...(reportCore.judgmentPolicy.blockedActionLabels || []).slice(0, 2),
          ...(reportCore.judgmentPolicy.hardStopLabels || []).slice(0, 2),
        ]
          .map((item) => (lang === 'ko' ? localizeReportFreeText(item) : item))
          .filter(Boolean),
      },
      evidence: {
        headline: lang === 'ko' ? '근거 해석' : 'Evidence Projection',
        summary: evidenceSummary,
        detailLines: localizeProjectionList(reportCore.projections?.evidence?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.evidence?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.evidence?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.evidence?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? [
                reportCore.topSignalIds.length
                  ? `상위 신호 ${reportCore.topSignalIds.slice(0, 3).length}개가 현재 구조를 지지합니다.`
                  : '',
                reportCore.topPatternIds.length
                  ? `상위 패턴 ${reportCore.topPatternIds.slice(0, 2).length}개가 반복 흐름을 설명합니다.`
                  : '',
                reportCore.topScenarioIds.length
                  ? `상위 시나리오 ${reportCore.topScenarioIds.slice(0, 2).length}개가 가능한 전개를 좁혀 줍니다.`
                  : '',
              ].filter(Boolean)
            : [
                ...reportCore.topSignalIds.slice(0, 2),
                ...reportCore.topPatternIds.slice(0, 1),
                ...reportCore.topScenarioIds.slice(0, 1),
              ].filter(Boolean),
      },
      branches: {
        headline: lang === 'ko' ? '분기 해석' : 'Branch Projection',
        summary:
          localizeReportFreeText(reportCore.projections?.branches?.summary) ||
          (lang === 'ko'
            ? '하나의 고정 결론보다 2~3개의 현실적인 분기를 함께 비교해야 합니다.'
            : 'Multiple realistic branches are open rather than one fixed outcome.'),
        window: reportCore.projections?.branches?.window,
        granularity: reportCore.projections?.branches?.granularity,
        detailLines: localizeProjectionList(reportCore.projections?.branches?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.branches?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.branches?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.branches?.nextMoves || []),
        reasons: localizeProjectionList(reportCore.projections?.branches?.reasons || []),
      },
    },
    topDecisionId: reportCore.topDecisionId,
    topDecisionLabel: reportCore.topDecisionLabel,
    riskControl: reportCore.riskControl,
  }
}

export {
  buildReportOutputCoreFields,
  ensureFinalActionPlanGrounding,
  ensureFinalReportPolish,
  applyFinalReportStyle,
  attachDeterministicArtifacts,
}
