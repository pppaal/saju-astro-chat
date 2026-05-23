import { buildCalendar } from './index'
import { deriveConvergence, type Convergence } from './derivers/convergence'
import type { NatalContext } from './context/types'

/**
 * 연간 수렴 — 그 해 1년 전체에서 "큰 날"(점성·사주 무거운 이벤트가 겹치는 날)을 뽑는다.
 *
 * 월 단위 convergence 와 달리 365일을 빌드해야 해서 비싸다(~1.7s). 같은 본명·연도면
 * 결과가 동일하므로 프로세스 인메모리 캐시로 1회만 빌드한다(DB 불필요). 캐시는 서버
 * 인스턴스 수명 동안 유지되며, 항목당 크기가 작아(상위 N일) 단순 FIFO 상한으로 충분.
 */

const CACHE_CAP = 200
const cache = new Map<string, Convergence>()

export async function getYearConvergence(args: {
  birthKey: string
  year: number
  natal: NatalContext
  topN?: number
  lang?: 'ko' | 'en'
}): Promise<Convergence> {
  const { birthKey, year, natal, topN = 8, lang = 'ko' } = args
  const key = `${birthKey}|${year}|${lang}`
  const cached = cache.get(key)
  if (cached) return cached

  const cells = await buildCalendar(
    natal,
    {
      start: `${year}-01-01T00:00:00.000Z`,
      end: `${year}-12-31T23:59:59.999Z`,
      granularity: 'day',
    },
    { includeEvidence: true }
  )
  const conv = deriveConvergence(cells, topN, lang)

  if (cache.size >= CACHE_CAP) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, conv)
  return conv
}
