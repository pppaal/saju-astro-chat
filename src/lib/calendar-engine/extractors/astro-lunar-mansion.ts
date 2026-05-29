import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getCachedTransitChart } from '../ephe-cache'
import { getLunarMansion } from '../timing-helpers/modules/lunarMansions'

/**
 * 28수 (Lunar Mansion) 추출기 — 동양 별자리 (Chinese constellations / Indian Nakshatra 계열).
 *
 * 황도를 28 구간으로 나눠 달이 그 날 머무는 수(宿)를 분류.
 * 28수는 4 방향(청룡·현무·백호·주작) × 7수로 구성, 각 수마다 길/평/흉
 * 분류가 명리·택일 자료에 표준화돼 있다.
 *
 * 데이터 출처 (재사용):
 *  - 28수 이름·한글·오행·동물·길흉/goodFor/badFor 분류는 기존
 *    timing-helpers/modules/lunarMansions.ts 의 LUNAR_MANSIONS 테이블을
 *    그대로 사용 — 같은 프로젝트의 timing-helpers / life-prediction / electional
 *    엔진이 이미 같은 표를 쓰므로 일관된 길흉 시그널 보장.
 *  - 일자 → 수 매핑도 같은 모듈의 getLunarMansion(date) 재사용
 *    (1900-01-01 = 氐宿 기준 일수 카운트 — 한국 전통 택일 관습 따라).
 *
 * 추가 정보 (evidence 보강):
 *  - 정오 트랜짓 차트에서 달의 황경(moonLon)을 캐시 통해 가져와 evidence 에 함께 기록.
 *  - 균등분할 인덱스 (Equal Mansion, floor(lon / (360/28))) 도 참고용으로
 *    같이 기록. 표준 한국 28수 계산은 일수 카운트 방식이라 이 둘은 일치하지 않을
 *    수 있다 — 표시는 일수 카운트 결과를 정본으로 함.
 *
 * polarity:
 *  - isAuspicious === true → +1 (길수)
 *  - badFor 가 비고 길/평 경계인 경우는 그대로 +1 또는 0 처리
 *  - isAuspicious === false → -1 (흉수)
 *  표준 명리·택일 자료의 길/흉 분류만 따르며 자의적 추정은 하지 않는다.
 *
 * 활성 윈도우: 그 1일 (달이 평균적으로 하루에 약 13° = 1개 수만큼 이동).
 *
 * 알려진 한계:
 *  - 28수는 본래 균등분할이 아닌 변형(중국 고대 적도좌표 不均等度)이 있으나
 *    이 추출기는 한국 전통 일수 카운트(=실효적 균등 분할)을 따른다.
 *  - 정오 1회 샘플이므로 자정 무렵 수 전환 시점은 정확하지 않을 수 있다.
 */

// 28수 방향 (4 × 7) — 인덱스 1~28 기준
function directionOf(index: number): '동' | '북' | '서' | '남' {
  if (index <= 7)  return '동'  // 청룡: 角亢氐房心尾箕
  if (index <= 14) return '북'  // 현무: 斗牛女虛危室壁
  if (index <= 21) return '서'  // 백호: 奎婁胃昴畢觜參
  return '남'                   // 주작: 井鬼柳星張翼軫
}

const DIRECTION_BEAST: Record<'동' | '북' | '서' | '남', string> = {
  동: '청룡',
  북: '현무',
  서: '백호',
  남: '주작',
}

const astroLunarMansionExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'lunar-mansion',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const day = new Date(t)
      const dayIso = day.toISOString().slice(0, 10)
      const noonIso = `${dayIso}T12:00:00`

      // 1) 그 날의 28수 — 기존 timing-helpers 룩업 재사용 (정본)
      const mansion = getLunarMansion(day)
      const direction = directionOf(mansion.index)
      const beast = DIRECTION_BEAST[direction]

      // 2) 정오 달 황경 (evidence 보강용 — 실패해도 신호는 그대로 발행)
      let moonLon: number | undefined
      let equalIndex: number | undefined
      try {
        const chart: Chart = await getCachedTransitChart({
          iso: noonIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
          inMemoryCache: cache,
        })
        const moon = chart.planets.find((p) => p.name === 'Moon')
        if (moon) {
          moonLon = moon.longitude
          // Equal Mansion 인덱스 (참고용, 0-27)
          equalIndex = Math.floor(((moonLon % 360) + 360) % 360 / (360 / 28))
        }
      } catch {
        // 무시 — 정본은 일수 카운트
      }

      // 3) polarity — 표준 분류만 사용
      const polarity: Polarity = mansion.isAuspicious ? 1 : -1

      signals.push({
        id: `astro.lunar-mansion.${mansion.name}.${dayIso}`,
        source: 'astro',
        kind: 'lunar-mansion',
        name: mansion.name,
        korean: `${mansion.nameKo}수 (${beast})`,
        themes: [],
        polarity,
        layer: 'daily',
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak: `${dayIso}T12:00:00.000Z`,
          end: `${dayIso}T23:59:59.999Z`,
        },
        weight: 0.35,
        evidence: {
          module: 'astro-lunar-mansion',
          planets: ['Moon'],
          element: mansion.element,
          detail: {
            mansionIndex: mansion.index,
            mansionName: mansion.name,
            mansionNameKo: mansion.nameKo,
            direction,
            directionBeast: beast,
            animal: mansion.animal,
            isAuspicious: mansion.isAuspicious,
            goodFor: mansion.goodFor,
            badFor: mansion.badFor,
            moonLon,
            equalMansionIndex: equalIndex,
          },
        },
      })
    }

    return signals
  },
}

export default astroLunarMansionExtractor
