import { getJohuYongsin } from '@/lib/saju/johuYongsin'
import { iga } from '@/lib/i18n/koParticle'
import { STEMS, ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import { calendarTimeZone, monthWindows } from '../periodPillars'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { FiveElement } from '@/lib/saju/types'

// 오행 KO→EN — 공용 SSOT(constants.ELEMENT_KO_TO_EN)에서 파생(복붙 금지).
const ELEMENT_EN_JOHU = ELEMENT_KO_TO_EN
// 월지 pinyin — EN 출력에 생 한자(午-month)가 새지 않게. 표시용 romanization
// (도그마 아님, 안정적). 정통 12지지 표준 병음.
const BRANCH_PINYIN: Record<string, string> = {
  子: 'Zi',
  丑: 'Chou',
  寅: 'Yin',
  卯: 'Mao',
  辰: 'Chen',
  巳: 'Si',
  午: 'Wu',
  未: 'Wei',
  申: 'Shen',
  酉: 'You',
  戌: 'Xu',
  亥: 'Hai',
}

/**
 * 조후용신 (調候用神) 추출기 — 명리 정통성.
 *
 * 명리는 두 축이 정통:
 *   1. 억부용신 (강약 균형)        ← 이미 saju-yongsin 추출기
 *   2. 조후용신 (한·열 균형)        ← 이번 추출기
 *
 * 본명 일간 + 그 달의 月支(월지)로 결정 — "내 일간이 이 달에 어느 오행이
 * 가장 필요한지". 매달 月支가 바뀌면 조후용신이 달라짐.
 *
 * 매 절기월(月運) 진입 시 신호 emit:
 *  - 그 달 月支 변동 → 조후용신 재평가
 *  - 활성 시 그 절기월 내내 활성 (monthly layer, periodPillars 절기월 창)
 */
const sajuJohuYongsinExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const daymaster = natal.saju.pillars.day.heavenlyStem.name
    if (!daymaster) return []

    const signals: ActiveSignal[] = []

    // 절기월마다 月支별로 조후용신 계산 — 창은 절입이 든 현지 날 ~ 다음 절입 전날
    // (periodPillars, 재감사 G2). 예전엔 양력 달마다 15일의 월지를 1일~말일에 도장해
    // 1일~절입 전날이 다음 달 조후를 달았다(TP-2).
    for (const w of monthWindows(range, calendarTimeZone(natal))) {
      const monthBranch = w.branch
      const info = getJohuYongsin(daymaster, monthBranch)
      if (!info) continue

      const yongsinStem = STEMS.find((s) => s.element === info.primaryYongsin)
      // polarity — rating 1~5 따라 +1 ~ +3
      // (조후가 급할수록 그 용신 활성이 더 큰 의미)
      const polarity: Polarity =
        info.rating >= 4 ? 3 : info.rating >= 3 ? 2 : info.rating >= 2 ? 1 : 0
      if (polarity <= 0) continue

      signals.push({
        id: `saju.johu-yongsin.${w.startDate}.${info.primaryYongsin}`,
        source: 'saju',
        kind: 'pillar-sibsin',
        name: `조후용신 ${info.primaryYongsin} 활성`,
        korean: `${monthBranch}月 조후 — ${info.primaryYongsin}${iga(info.primaryYongsin)} ${info.climate} 균형에 필요`,
        english: `${BRANCH_PINYIN[monthBranch] ?? monthBranch}-month climate balance — ${ELEMENT_EN_JOHU[info.primaryYongsin] ?? info.primaryYongsin} is needed to temper the season`,
        polarity,
        layer: 'monthly',
        active: { start: w.start, peak: w.peak, end: w.end },
        weight: 0.65,
        evidence: {
          module: 'saju-johu-yongsin',
          element: info.primaryYongsin as FiveElement,
          detail: {
            daymaster,
            monthBranch,
            climate: info.climate,
            primaryYongsin: info.primaryYongsin,
            secondaryYongsin: info.secondaryYongsin,
            rating: info.rating,
            reasoning: info.reasoning,
            yongsinStem: yongsinStem?.name,
          },
        },
      })
    }

    return signals
  },
}

export default sajuJohuYongsinExtractor
