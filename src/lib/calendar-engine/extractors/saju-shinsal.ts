import { STEMS, BRANCHES } from '@/lib/saju/constants'
import { getShinsalHitsForDailyTarget } from '@/lib/saju/shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'

/**
 * 신살 (神煞) 일진 활성 추출기.
 *
 * 매일 일진(日柱)을 계산하고, 본명 일주 기준으로 활성 신살을 뽑음.
 * shinsal.getShinsalHitsForDailyTarget()이 50+ 신살 룰을 이미 가지고 있어
 * 추출기는 호출과 ActiveSignal 변환만 담당.
 *
 * 활성 윈도우: 해당 일진 1일 (00:00 ~ 23:59), peak는 정오.
 */

const SHINSAL_POLARITY: Record<string, Polarity> = {
  // ─── 12신살 (일지 기준 12개) ───
  장성:  2,   장성살: 2,
  반안:  1,   반안살: 1,
  역마:  0,   역마살: 0,
  육해: -1,   육해살: -1,
  화개:  1,   화개살: 1,
  겁살: -3,
  재살: -2,
  천살: -2,
  월살: -1,
  망신: -2,   망신살: -2,
  지살:  0,
  년살:  0,

  // ─── 길성 (귀인·문창류) ───
  천을귀인: 3,  천을: 3,
  태극귀인: 2,
  천덕귀인: 2,  천덕: 2,
  월덕귀인: 2,  월덕: 2,
  천주귀인: 2,
  암록:    2,
  금여성:  2,   금여: 2,
  천의성:  2,
  천문성:  2,
  문창:    2,   문창귀인: 2,
  문곡:    2,
  학당귀인: 2,  학당: 2,
  관귀학관: 2,
  건록:    2,
  제왕:    1,
  길성:    2,

  // ─── 흉신·살 (도화 포함, 도화는 테마 강함) ───
  도화:    1,   도화살: 1,
  홍염:    1,   홍염살: 1,
  현침:   -1,   현침살: -1,
  고신:   -1,   고신살: -1,
  과숙:   -1,   과숙살: -1,
  괴강:   -1,   괴강살: -1,
  양인:   -2,   양인살: -2,
  백호:   -2,   백호살: -2,
  공망:   -1,
  귀문관: -1,   귀문: -1,  귀문관살: -1,
  원진:   -2,
  천라지망: -2,
  삼재:   -2,
  화해:   -1,   화해살: -1,
  괘살:   -1,
  흉성:   -2,
}

const sajuShinsalExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'shinsal',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const signals: ActiveSignal[] = []
    const { natal, range } = ctx
    const dayPillar = natal.saju.pillars.day
    const natalDayStem = dayPillar.heavenlyStem?.name ?? ''
    const natalDayBranch = dayPillar.earthlyBranch?.name ?? ''

    if (!natalDayStem || !natalDayBranch) return signals

    const start = new Date(range.start)
    const end = new Date(range.end)
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue

      const hits = getShinsalHitsForDailyTarget(natalDayStem, natalDayBranch, targetBranch)
      const dayIso = date.toISOString().slice(0, 10)
      const peakIso = `${dayIso}T12:00:00.000Z`
      const startIso = `${dayIso}T00:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`

      for (const hit of hits) {
        const polarity = SHINSAL_POLARITY[hit.kind] ?? 0
        signals.push({
          id: `saju.shinsal.${hit.kind}.${dayIso}`,
          source: 'saju',
          kind: 'shinsal',
          name: hit.kind,
          themes: [],   // tagger가 SHINSAL_THEME_MAP으로 채움
          polarity,
          layer: 'daily',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: weightForDailyShinsal(polarity),
          evidence: {
            module: 'saju-shinsal',
            shinsalName: hit.kind,
            detail: { basis: hit.basis, targetBranch, natalDayStem, natalDayBranch },
          },
        })
      }
    }

    return signals
  },
}

function weightForDailyShinsal(polarity: Polarity): number {
  // 일진 신살은 단발이라 가중치 0.6 base. 강한 길흉은 +0.2.
  const intensity = Math.abs(polarity) / 3   // 0~1
  return 0.6 + intensity * 0.3
}

/**
 * Date → 일지(地支) 한 글자 계산.
 * saju.ts:getIljinCalendar의 JDN 알고리즘과 동일.
 */
function computeDayBranch(date: Date): string | null {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  const branch = BRANCHES[(jdn + 49) % 12]
  return branch?.name ?? null
}

/** 일진의 천간 — 다른 추출기에서도 쓰일 수 있어 export. */
export function computeDayStem(date: Date): string | null {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  const stem = STEMS[(jdn + 49) % 10]
  return stem?.name ?? null
}

export { computeDayBranch }
export default sajuShinsalExtractor
