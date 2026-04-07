import { adaptCoreToCounselor } from '@/lib/destiny-matrix/core/adapters'
import type {
  CounselorEvidencePacket,
  CounselorProjectionBlock,
} from '@/lib/destiny-matrix/counselorEvidenceTypes'
import { repairPossiblyMojibakeText } from '@/lib/destiny-matrix/textRepair'

export function localizeCounselorDomain(domain: string, lang: 'ko' | 'en'): string {
  if (lang === 'en') return domain
  const labels: Record<string, string> = {
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '사명',
    timing: '타이밍',
    move: '이동/변화',
  }
  return repairPossiblyMojibakeText(labels[domain] || domain)
}

export function sanitizeCounselorFreeText(
  text: string | undefined | null,
  lang: 'ko' | 'en'
): string {
  const value = repairPossiblyMojibakeText(String(text || '')).trim()
  if (!value) return ''
  if (lang !== 'ko') return value

  return repairPossiblyMojibakeText(
    value
      .replace(/배경 구조축/g, '삶의 배경 흐름')
      .replace(/전면 행동축/g, '지금 먼저 움직여야 할 영역')
      .replace(/행동축/g, '실제 행동 방향')
      .replace(/중심축/g, '중심 흐름')
      .replace(/리스크축/g, '가장 조심해야 할 변수')
      .replace(/identity axis/gi, 'background flow')
      .replace(/action axis/gi, 'action direction')
      .replace(/risk axis/gi, 'main risk')
      .replace(
        /\bList leverage points\b/gi,
        '\uC9C0\uB81B\uB300 \uC870\uAC74\uC744 \uBA3C\uC800 \uC815\uB9AC\uD558\uAE30'
      )
      .replace(
        /\bNegotiate role and compensation together\b/gi,
        '\uC5ED\uD560\uACFC \uBCF4\uC0C1 \uC870\uAC74\uC744 \uD568\uAED8 \uD611\uC758\uD558\uAE30'
      )
      .replace(
        /\bDelay signature until scope is fixed\b/gi,
        '\uBC94\uC704\uAC00 \uACE0\uC815\uB418\uAE30 \uC804\uC5D0\uB294 \uC11C\uBA85\uC744 \uBBF8\uB8E8\uAE30'
      )
      .replace(
        /\bExpansion without role clarity can create delivery strain\./gi,
        '\uC5ED\uD560 \uC120\uBA85\uB3C4 \uC5C6\uC774 \uD655\uC7A5\uD558\uBA74 \uC2E4\uD589 \uBD80\uB2F4\uC774 \uCEE4\uC9C8 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
      )
      .replace(/\bpersonality\b/gi, '성향')
      .replace(/\bcareer\b/gi, '커리어')
      .replace(/\brelationship\b/gi, '관계')
      .replace(/\bwealth\b/gi, '재정')
      .replace(/\bhealth\b/gi, '건강')
      .replace(/\bmove\b/gi, '이동')
      .replace(/\btiming\b/gi, '타이밍')
      .replace(/\bspirituality\b/gi, '장기 방향')
      .replace(/\bverify\b/gi, '확인')
      .replace(/\bprepare\b/gi, '준비 우선')
      .replace(/\bexecute\b/gi, '실행')
      .replace(/레이어\s*0/gi, '핵심 흐름')
      .replace(/활성 트랜짓/gi, '활성 신호')
      .replace(/\bTransit\s+saturnReturn\b/gi, '책임 압력 신호')
      .replace(/\bTransit\s+jupiterReturn\b/gi, '확장 신호')
      .replace(/\bTransit\s+nodeReturn\b/gi, '방향 전환 신호')
      .replace(/\bTransit\s+mercuryRetrograde\b/gi, '소통 재검토 신호')
      .replace(/\bTransit\s+marsRetrograde\b/gi, '마찰 재검토 신호')
      .replace(/\bTransit\s+venusRetrograde\b/gi, '관계 재검토 신호')
      .replace(/\bsaturnReturn\b/gi, '책임 압력 신호')
      .replace(/\bjupiterReturn\b/gi, '확장 신호')
      .replace(/\bnodeReturn\b/gi, '방향 전환 신호')
      .replace(/\bmercuryRetrograde\b/gi, '소통 재검토 신호')
      .replace(/\bmarsRetrograde\b/gi, '마찰 재검토 신호')
      .replace(/\bvenusRetrograde\b/gi, '관계 재검토 신호')
      .replace(/\bsolarReturn\b/gi, '연간 초점 강조')
      .replace(/\blunarReturn\b/gi, '감정 파동 신호')
      .replace(/\bprogressions?\b/gi, '장기 전개 흐름')
      .replace(/\brelationship caution\b/gi, '관계에서는 속도보다 기준 확인이 먼저입니다')
      .replace(/\bcaution\b/gi, '주의 신호')
      .replace(/\bdowngrade pressure\b/gi, '하향 조정 압력')
      .replace(/\bmoney expansion action\b/gi, '재정 확장은 조건 검증부터 진행하세요')
      .replace(/\bvolatility pattern\b/gi, '변동성 패턴')
      .replace(/\bgeokguk strength\b/gi, '격국 응집력')
      .replace(/\bdebt restructure\b/gi, '부채 재정리')
      .replace(/\bliquidity defense\b/gi, '유동성 방어')
      .replace(/\bexpense spike\b/gi, '지출 급증 대응')
      .replace(/\bpromotion review\b/gi, '승진 검토')
      .replace(/\brecovery reset\b/gi, '회복 재정렬')
      .replace(/\bbasecamp reset\b/gi, '거점 재정비')
      .replace(/\bmap full debt stack\b/gi, '전체 부채 구조를 다시 정리하기')
      .replace(/\bwealth volatility pattern\b/gi, '재정 변동성 패턴')
      .replace(/\bcareer expansion pattern\b/gi, '커리어 확장 패턴')
      .replace(/\brelationship tension pattern\b/gi, '관계 긴장 패턴')
      .replace(/\bburnout risk pattern\b/gi, '번아웃 리스크 패턴')
      .replace(/\bmovement guardrail window\b/gi, '이동·변화 경계 구간')
      .replace(/\bexpansion pattern\b/gi, '확장 패턴')
      .replace(/\btension pattern\b/gi, '긴장 패턴')
      .replace(/\bsaju pillars\b/gi, '사주 원국 축')
      .replace(/\bMap full debt stack\b/gi, '전체 부채 구조를 다시 정리하기')
      .replace(/활성 신호\s+책임 압력 신호/gi, '책임 압력 신호')
      .replace(/활성 신호\s+확장 신호/gi, '확장 신호')
      .replace(/활성 신호\s+방향 전환 신호/gi, '방향 전환 신호')
      .replace(/활성 신호\s+소통 재검토 신호/gi, '소통 재검토 신호')
      .replace(/활성 신호\s+마찰 재검토 신호/gi, '마찰 재검토 신호')
      .replace(/활성 신호\s+관계 재검토 신호/gi, '관계 재검토 신호')
      .replace(/변동성 패턴\s+패턴/gi, '변동성 패턴')
      .replace(/확장 신호\s+이\s+/gi, '확장 신호가 ')
      .replace(/책임 압력 신호\s+이\s+/gi, '책임 압력 신호가 ')
      .replace(/방향 전환 신호\s+이\s+/gi, '방향 전환 신호가 ')
      .replace(/소통 재검토 신호\s+이\s+/gi, '소통 재검토 신호가 ')
      .replace(/마찰 재검토 신호\s+이\s+/gi, '마찰 재검토 신호가 ')
      .replace(/관계 재검토 신호\s+이\s+/gi, '관계 재검토 신호가 ')
      .replace(
        /action pressure stayed narrow between ([^\s]+) and ([^\s]+)/gi,
        (_, left: string, right: string) =>
          `${localizeCounselorDomain(left, 'ko')}와 ${localizeCounselorDomain(right, 'ko')} 사이의 행동 압력이 좁게 경쟁했습니다`
      )
      .replace(
        /(\w+)\s+stayed secondary because total support remained below the winner/gi,
        (_, domain: string) =>
          `${localizeCounselorDomain(domain, 'ko')}은 최종 지지가 승자축보다 약해 보조축에 머물렀습니다`
      )
      .replace(
        /\bstayed secondary because total support remained below the winner\b/gi,
        '최종 지지가 승자축보다 약해 보조축에 머물렀습니다'
      )
      .replace(
        /\bA strong opportunity signal can hide ([^\s]+) and ([^\s]+) risk\./gi,
        (_, left: string, right: string) =>
          `강한 기회 신호가 ${sanitizeCounselorFreeText(left, 'ko')}과 ${sanitizeCounselorFreeText(right, 'ko')} 리스크를 가릴 수 있습니다`
      )
      .replace(/\bweek\b/gi, '주 단위')
      .replace(/\bfortnight\b/gi, '2주 단위')
      .replace(/\bmonth\b/gi, '월 단위')
      .replace(/\bseason\b/gi, '분기 단위')
      .replace(/\bnow\b/gi, '지금')
      .replace(/\bnone\b/gi, '없음')
      .replace(/\s+action\b/gi, '')
      .replace(/커리어은/g, '커리어는')
      .replace(/관계은/g, '관계는')
      .replace(/재정와/g, '재정과')
      .replace(/건강와/g, '건강과')
      .replace(/밀는/g, '미는')
      .replace(/편이 맞습니다\.입니다\./g, '편이 맞습니다.')
      .replace(/\uD328\uD134\s+\uD328\uD134/gi, '\uD328\uD134')
      .replace(/\uCEE4\uB9AC\uC5B4\uC774/g, '\uCEE4\uB9AC\uC5B4\uB294')
      .replace(/\uAD00\uACC4\uC774/g, '\uAD00\uACC4\uB294')
      .replace(/\uC7AC\uC815\uC774/g, '\uC7AC\uC815\uC740')
      .replace(/\uAC74\uAC15\uC774/g, '\uAC74\uAC15\uC740')
      .replace(/\uAC83\uAC00 \uB9DE\uC73C\uBA74/g, '\uAC83\uC774 \uB9DE\uC73C\uBA74')
      .replace(
        /\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uC810\uC131 \uCABD\uC740/g,
        '\uC810\uC131 \uCABD\uC5D0\uC11C\uB294'
      )
      .replace(
        /\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uCEE4\uB9AC\uC5B4\uC5D0\uC11C\uB294/g,
        '\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uCEE4\uB9AC\uC5B4\uC5D0\uC11C'
      )
      .replace(
        /\uCEE4\uB9AC\uC5B4\uB294 \uCEE4\uB9AC\uC5B4 \uC601\uC5ED\uC740/g,
        '\uCEE4\uB9AC\uC5B4 \uC601\uC5ED\uC740'
      )
      .replace(/\uD2B8\uB79C\uC9D3\uAC00/g, '\uD2B8\uB79C\uC9D3\uC774')
      .replace(
        /\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uC5ED\uD560\uACFC \uCC45\uC784\uC120\uC774 \uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294/g,
        '\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uC5ED\uD560\uACFC \uCC45\uC784\uC120\uC774'
      )
      .replace(
        /\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uCEE4\uB9AC\uC5B4 \uD2B8\uB9AC\uAC70\uAC00 \uC810\uC131 \uCABD\uC5D0\uC11C\uB294/g,
        '\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uCEE4\uB9AC\uC5B4 \uD2B8\uB9AC\uAC70\uAC00'
      )
      .replace(
        /\uADF8\uB798\uC11C \uCEE4\uB9AC\uC5B4 \uD310\uB2E8\uC740 \uCEE4\uB9AC\uC5B4 \uAE30\uC900\uC73C\uB85C \uC7A1\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4/g,
        '\uADF8\uB798\uC11C \uCEE4\uB9AC\uC5B4 \uD310\uB2E8\uC740 \uCEE4\uB9AC\uC5B4 \uAE30\uC900\uC73C\uB85C \uC7A1\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4'
      )
      .replace(
        /\uD575\uC2EC \uADFC\uAC70\uAC00 \uD604\uC7AC \uD750\uB984\uC744 \uACC4\uC18D \uC9C0\uC9C0\uD560 \uAC83/g,
        '\uD575\uC2EC \uADFC\uAC70\uAC00 \uACC4\uC18D \uC0B4\uC544 \uC788\uC744 \uAC83'
      )
      .replace(
        /\uD575\uC2EC \uADFC\uAC70\uAC00 \uACC4\uC18D \uC0B4\uC544 \uC788\uC744 \uAC83/g,
        '\uD575\uC2EC \uADFC\uAC70\uAC00 \uACC4\uC18D \uC0B4\uC544 \uC788\uC5B4\uC57C \uD569\uB2C8\uB2E4.'
      )
      .replace(
        /\uD575\uC2EC \uADFC\uAC70\uAC00 \uACC4\uC18D \uC0B4\uC544 \uC788\uC744 \uAC83,?\s*\uC2DC\uB098\uB9AC\uC624 \uD655\uB960/gi,
        '\uD575\uC2EC \uADFC\uAC70\uAC00 \uACC4\uC18D \uC0B4\uC544 \uC788\uACE0, \uC2DC\uB098\uB9AC\uC624 \uD655\uB960'
      )
      .replace(
        /\uCCAB \uB2E8\uACC4 \uB4A4\uC5D0\uB3C4 \uD604\uC7AC \uC0C1\uC2B9 \uD750\uB984\uC774 \uC720\uC9C0\uB420 \uAC83/g,
        '\uCCAB \uB2E8\uACC4 \uC774\uD6C4\uC5D0\uB3C4 \uD750\uB984\uC774 \uAEBA\uC774\uC9C0 \uC54A\uB294\uC9C0 \uD655\uC778\uD574\uC57C \uD569\uB2C8\uB2E4.'
      )
      .replace(
        /\uCCAB \uB2E8\uACC4 \uC774\uD6C4\uC5D0\uB3C4 \uD750\uB984\uC774 \uAEBA\uC774\uC9C0 \uC54A\uC744 \uAC83/g,
        '\uCCAB \uB2E8\uACC4 \uC774\uD6C4\uC5D0\uB3C4 \uD750\uB984\uC774 \uAEBA\uC774\uC9C0 \uC54A\uB294\uC9C0 \uD655\uC778\uD574\uC57C \uD569\uB2C8\uB2E4.'
      )
      .replace(
        /\uB300\uC6B4,\s*\uC138\uC6B4\uAC00 \uACB9\uCE58\uBA70/g,
        '\uB300\uC6B4\uACFC \uC138\uC6B4 \uD750\uB984\uC774 \uACB9\uCE58\uBA70'
      )
      .replace(
        /\uB300\uC6B4,\s*\uC138\uC6B4,\s*\uC774 \uACB9\uCE58\uBA70/g,
        '\uB300\uC6B4\uACFC \uC138\uC6B4 \uD750\uB984\uC774 \uACB9\uCE58\uBA70'
      )
      .replace(
        /\uC2E4\uC81C \uD0C0\uC774\uBC0D\uC740 \uC9C0\uAE08 \uAD6C\uAC04\uC744 \uBA3C\uC800 \uBCF4\uBA74 \uB429\uB2C8\uB2E4\./g,
        '\uC6B0\uC120\uC740 \uC9C0\uAE08 \uAD6C\uAC04\uC758 \uBC18\uC751\uC744 \uBA3C\uC800 \uBCF4\uB294 \uAC8C \uB9DE\uC2B5\uB2C8\uB2E4.'
      )
      .replace(
        /\uC2E4\uD589 \uC18D\uB3C4\uB97C \uC62C\uB824\uB3C4 \uB429\uB2C8\uB2E4\./g,
        '\uADF8\uB54C\uB294 \uC18D\uB3C4\uB97C \uB192\uC5EC\uB3C4 \uB429\uB2C8\uB2E4.'
      )
      .replace(
        /\uD558\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4\./g,
        '\uD558\uB294 \uCABD\uC774 \uC720\uB9AC\uD569\uB2C8\uB2E4.'
      )
      .replace(/\.\s*\./g, '.')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export function sanitizeCounselorTextList(
  items: Array<string | undefined | null>,
  lang: 'ko' | 'en'
): string[] {
  return items.map((item) => sanitizeCounselorFreeText(item, lang)).filter(Boolean)
}

export function sanitizeCounselorProjectionBlock(
  block: CounselorProjectionBlock | undefined,
  lang: 'ko' | 'en'
): CounselorProjectionBlock | undefined {
  if (!block) return undefined
  return {
    ...block,
    summary: sanitizeCounselorFreeText(block.summary, lang),
    reasons: sanitizeCounselorTextList(block.reasons || [], lang),
    detailLines: sanitizeCounselorTextList(block.detailLines || [], lang),
    drivers: sanitizeCounselorTextList(block.drivers || [], lang),
    counterweights: sanitizeCounselorTextList(block.counterweights || [], lang),
    nextMoves: sanitizeCounselorTextList(block.nextMoves || [], lang),
  }
}

export function buildSanitizedCanonicalBrief(input: {
  counselorCore: ReturnType<typeof adaptCoreToCounselor>
  lang: 'ko' | 'en'
  topDecisionLeadLabel?: string
  scenarioActionHints: string[]
}): CounselorEvidencePacket['canonicalBrief'] {
  const { counselorCore, lang, topDecisionLeadLabel, scenarioActionHints } = input
  return {
    gradeLabel: counselorCore.gradeLabel,
    phaseLabel: counselorCore.phaseLabel,
    actionFocusDomain: counselorCore.actionFocusDomain,
    focusRunnerUpDomain: counselorCore.arbitrationBrief.focusRunnerUpDomain || undefined,
    actionRunnerUpDomain: counselorCore.arbitrationBrief.actionRunnerUpDomain || undefined,
    focusNarrative: counselorCore.arbitrationBrief.focusNarrative || undefined,
    actionNarrative: counselorCore.arbitrationBrief.actionNarrative || undefined,
    suppressionNarratives: sanitizeCounselorTextList(
      counselorCore.arbitrationBrief.suppressionNarratives.slice(0, 2),
      lang
    ),
    topDecisionAction: counselorCore.topDecisionAction || undefined,
    topDecisionLabel: topDecisionLeadLabel || undefined,
    answerThesis: counselorCore.answerThesis,
    primaryAction: sanitizeCounselorFreeText(counselorCore.primaryAction, lang),
    primaryCaution: sanitizeCounselorFreeText(counselorCore.primaryCaution, lang),
    timingHint: sanitizeCounselorFreeText(counselorCore.timingHint, lang),
    policyMode: counselorCore.judgmentPolicy.mode,
    policyRationale: sanitizeCounselorFreeText(counselorCore.judgmentPolicy.rationale, lang),
    allowedActions: [
      ...scenarioActionHints,
      ...(counselorCore.judgmentPolicy.allowedActionLabels || []),
    ]
      .slice(0, 3)
      .map((item) => sanitizeCounselorFreeText(item, lang))
      .filter(Boolean),
    blockedActions: sanitizeCounselorTextList(
      (counselorCore.judgmentPolicy.blockedActionLabels || []).slice(0, 3),
      lang
    ),
    softChecks: sanitizeCounselorTextList(
      counselorCore.judgmentPolicy.softCheckLabels || counselorCore.judgmentPolicy.softChecks,
      lang
    ).slice(0, 3),
    hardStops: sanitizeCounselorTextList(
      counselorCore.judgmentPolicy.hardStopLabels || counselorCore.judgmentPolicy.hardStops,
      lang
    ).slice(0, 3),
    latentTopAxes: counselorCore.latentTopAxes.slice(0, 3).map((axis) => axis.label),
  }
}

export function formatTransitLabels(
  activeTransits: string[],
  lang: 'ko' | 'en',
  limit = 2
): string {
  const labels = activeTransits
    .slice(0, limit)
    .map((item) =>
      sanitizeCounselorFreeText(`Transit ${item}`, lang)
        .replace(/^활성 신호\s+/u, '')
        .trim()
    )
    .filter(Boolean)
  if (labels.length === 0) return ''
  if (lang === 'ko') {
    if (labels.length === 1) return labels[0]
    return `${labels.slice(0, -1).join(', ')}와 ${labels[labels.length - 1]}`
  }
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}
