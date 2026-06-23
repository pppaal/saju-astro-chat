import { getJohuYongsin } from '@/lib/saju/johuYongsin'
import { iga } from '@/lib/i18n/koParticle'
import { STEMS, ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import { getMonthPillarForDate } from '@/lib/saju/datePillars'
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
 * 매달 月運 진입 시 신호 emit:
 *  - 그 달 月支 변동 → 조후용신 재평가
 *  - 활성 시 그 달 내내 활성 (monthly layer)
 */
const sajuJohuYongsinExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const daymaster = natal.saju.pillars.day.heavenlyStem.name
    if (!daymaster) return []

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 매달 月支별로 조후용신 계산
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    while (cursor <= end) {
      // 월주는 *그 달 중순(15일)* 기준으로 — 1일은 절기 경계 직전이라 전월 월지(예:
      // 6/1 은 망종 전이라 巳)가 잡혀, 헤더/월운(15일=午)과 엇갈렸다. 중순 기준 통일.
      const midMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15))
      const monthPillar = getMonthPillarForDate(midMonth)
      const monthBranch = monthPillar.branch
      const info = getJohuYongsin(daymaster, monthBranch)

      if (info) {
        const yongsinStem = STEMS.find((s) => s.element === info.primaryYongsin)
        // polarity — rating 1~5 따라 +1 ~ +3
        // (조후가 급할수록 그 용신 활성이 더 큰 의미)
        const polarity: Polarity =
          info.rating >= 4 ? 3 : info.rating >= 3 ? 2 : info.rating >= 2 ? 1 : 0
        if (polarity > 0) {
          const monthStart = new Date(cursor).toISOString()
          const monthEnd = new Date(
            Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59)
          ).toISOString()
          const monthPeak = new Date(
            Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15)
          ).toISOString()

          signals.push({
            id: `saju.johu-yongsin.${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}.${info.primaryYongsin}`,
            source: 'saju',
            kind: 'pillar-sibsin',
            name: `조후용신 ${info.primaryYongsin} 활성`,
            korean: `${monthPillar.branch}月 조후 — ${info.primaryYongsin}${iga(info.primaryYongsin)} ${info.climate} 균형에 필요`,
            english: `${BRANCH_PINYIN[monthPillar.branch] ?? monthPillar.branch}-month climate balance — ${ELEMENT_EN_JOHU[info.primaryYongsin] ?? info.primaryYongsin} is needed to temper the season`,
            polarity,
            layer: 'monthly',
            active: { start: monthStart, peak: monthPeak, end: monthEnd },
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
      }

      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }

    return signals
  },
}

export default sajuJohuYongsinExtractor
