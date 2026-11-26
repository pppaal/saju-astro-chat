/**
 * crossPair.pickDayReason — 그날 '왜 이런 날' 근거 선택(계획 B1 #4, 엔진 E10).
 *
 * 월 리드아웃(assembleTiers cell.reason)과 일 티어(assembleDayTier day.reason)가 같은
 * 함수를 같은 월 셀에 부른다. 그리드 마크 부호 게이트: good·best=+, caution·avoid=−,
 * 무색·focus=어느 쪽이든. 통과하는 교차가 없으면 null.
 */
import { describe, it, expect } from 'vitest'
import { crossSajuEn, pickDayReason, reasonSignForMark } from '@/app/calendar/crossPair'
import { SAJU_ASTRO_MAPPINGS } from '@/lib/calendar-engine/data/saju-astro-mapping'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import type { ActiveSignal, Polarity, SignalLayer } from '@/lib/calendar-engine/types'

let seq = 0
function cross(
  saju: string,
  astroEn: string,
  polarity: Polarity,
  layer: SignalLayer,
  weight = 0.5,
  meaning = `${saju} 뜻`
): ActiveSignal {
  seq++
  return {
    id: `cross.${saju}-x-${astroEn}.${layer}:${seq}`,
    source: 'saju',
    kind: 'cross-activation',
    name: `${saju} × ${astroEn}`,
    korean: `${saju} × ${astroEn} — ${meaning}`,
    english: `${saju} × ${astroEn} — ${meaning} (en)`,
    polarity,
    layer,
    active: { start: '2026-11-19T00:00', peak: '2026-11-19T12:00', end: '2026-11-19T23:59' },
    weight,
    evidence: { module: 'cross-activation', detail: { sajuKey: saju, astroKey: astroEn } },
  }
}

const cellOf = (...signals: ActiveSignal[]) => ({ signals })

describe('reasonSignForMark', () => {
  it('good·best=+1, caution·avoid=−1, 무색·focus=0', () => {
    expect(reasonSignForMark('good')).toBe(1)
    expect(reasonSignForMark('best')).toBe(1)
    expect(reasonSignForMark('caution')).toBe(-1)
    expect(reasonSignForMark('avoid')).toBe(-1)
    expect(reasonSignForMark(null)).toBe(0)
    expect(reasonSignForMark('focus')).toBe(0)
    expect(reasonSignForMark(undefined)).toBe(0)
  })
})

describe('pickDayReason', () => {
  // 11/29 피할 날 재현 모양: 그날 고유 ▲ 정관×태양(+2)이 가장 센데 마크는 avoid.
  const avoidDay = cellOf(
    cross('정관', 'Sun', 2, 'daily', 0.7),
    cross('상관', 'Sun', -2, 'daily', 0.4),
    cross('편재', 'Mars', 1, 'monthly', 0.9)
  )

  it('피할 날엔 ▲ 교차가 근거가 될 수 없다 — 가장 센 ▼ 를 고른다', () => {
    const r = pickDayReason(avoidDay, 'avoid')
    expect(r?.saju).toBe('상관')
    expect(r?.polarity).toBeLessThan(0)
  })

  it('좋은 날엔 ▼ 교차가 근거가 될 수 없다', () => {
    const r = pickDayReason(
      cellOf(cross('상관', 'Sun', -3, 'daily', 0.9), cross('식신', 'Mercury', 1, 'daily', 0.2)),
      'best'
    )
    expect(r?.saju).toBe('식신')
    expect(r?.polarity).toBeGreaterThan(0)
  })

  it('무색(null)·focus 는 부호 무관 — 가장 센 그날 고유 교차', () => {
    expect(pickDayReason(avoidDay, null)?.saju).toBe('정관')
    expect(pickDayReason(avoidDay, 'focus')?.saju).toBe('정관')
  })

  it('부호가 맞는 교차가 없으면 null (반대 부호로 채우지 않는다)', () => {
    expect(pickDayReason(cellOf(cross('정관', 'Sun', 2, 'daily')), 'caution')).toBeNull()
    expect(pickDayReason(cellOf(cross('겁재', 'Mars', -1, 'daily')), 'good')).toBeNull()
  })

  it('polarity 0(부호 충돌로 무력화된) 교차는 근거가 아니다', () => {
    expect(pickDayReason(cellOf(cross('정재', 'Moon', 0, 'daily', 1)), null)).toBeNull()
  })

  it('그날 일진·정점 층(daily·instant)이 monthly 배경을 이긴다 — 영향이 더 작아도', () => {
    const daily = pickDayReason(
      cellOf(cross('편재', 'Mars', 3, 'monthly', 1), cross('식신', 'Venus', 1, 'daily', 0.1)),
      'good'
    )
    expect(daily?.saju).toBe('식신')
    const instant = pickDayReason(
      cellOf(cross('편재', 'Mars', 3, 'monthly', 1), cross('정인', 'Moon', 1, 'instant', 0.1)),
      'good'
    )
    expect(instant?.saju).toBe('정인')
  })

  // F3 — 2시간 시진 교차는 그날 '왜'의 머리에 서지 않는다(OD-10: 시진은 시진에 남는다).
  it('부호가 맞는 daily·instant 교차가 있으면 시진(hourly) 교차는 근거가 아니다 — 영향이 더 커도', () => {
    const r = pickDayReason(
      cellOf(cross('편관', 'Mars', -2, 'hourly', 0.9), cross('정재', 'Mars', -1, 'daily', 0.1)),
      'caution'
    )
    expect(r?.saju).toBe('정재')
    const i = pickDayReason(
      cellOf(cross('비견', 'Sun', 2, 'hourly', 0.9), cross('정인', 'Moon', 1, 'instant', 0.1)),
      null
    )
    expect(i?.saju).toBe('정인')
  })

  it('daily 교차가 마크 게이트에 걸리면 그때만 시진 교차가 근거가 될 수 있다', () => {
    const r = pickDayReason(
      cellOf(cross('정관', 'Sun', 2, 'daily', 0.7), cross('편관', 'Mars', -2, 'hourly', 0.2)),
      'avoid'
    )
    expect(r?.saju).toBe('편관')
    // 시진 교차는 가산점이 없다 — 남은 monthly 배경과는 영향(|polarity|×weight)으로 겨룬다.
    const vsMonthly = pickDayReason(
      cellOf(
        cross('정관', 'Sun', 2, 'daily', 0.7),
        cross('편관', 'Mars', -2, 'hourly', 0.2),
        cross('정재', 'Mars', -1, 'monthly', 0.47)
      ),
      'avoid'
    )
    expect(vsMonthly?.saju).toBe('정재')
  })

  it('그날 고유 교차가 게이트에 걸리면 monthly 배경으로 내려간다', () => {
    const r = pickDayReason(
      cellOf(cross('정관', 'Sun', 2, 'daily', 0.7), cross('겁재', 'Mars', -1, 'monthly', 0.5)),
      'avoid'
    )
    expect(r?.saju).toBe('겁재')
  })

  it('근거 모양 — 페어 머리를 뗀 KO/EN 뜻, EN 라벨, 부호', () => {
    const r = pickDayReason(cellOf(cross('정관', 'Sun', 2, 'daily', 0.7, '인정받는 날')), 'good')
    expect(r).toEqual({
      saju: '정관',
      sajuEn: 'Direct Officer',
      astro: '태양',
      astroEn: 'Sun',
      meaning: '인정받는 날',
      meaningEn: '인정받는 날 (en)',
      polarity: 2,
    })
  })

  it('evidence.detail 이 비어도(월 캐시 셀) name 파싱으로 페어를 복원한다', () => {
    const s = cross('정관', '태양', -2, 'daily')
    s.evidence = { module: 'cross-activation', detail: {} }
    expect(pickDayReason(cellOf(s), 'caution')?.saju).toBe('정관')
  })

  it('셀이 없으면 null', () => {
    expect(pickDayReason(null, 'good')).toBeNull()
    expect(pickDayReason(undefined, null)).toBeNull()
  })
})

// 재감사 SI-2·CC-4 — 교차 사주 키는 어느 화면이든 같은 EN 라벨(crossSajuEn)로, 한글 없이.
describe('crossSajuEn — 교차 사주 키 EN 라벨', () => {
  const keys = [...new Set(SAJU_ASTRO_MAPPINGS.map((m) => m.saju))]

  it('매핑의 사주 키 전부가 한글 없는 EN 라벨을 갖는다', () => {
    expect(keys.length).toBeGreaterThanOrEqual(14)
    for (const k of keys) {
      const en = crossSajuEn(k)
      expect(en, k).toBeTruthy()
      expect(en, `${k} → ${en}`).not.toMatch(/[가-힣]/)
    }
  })

  it('십신은 SIBSIN_EN, 신살은 정본 신살 이름(건록 = Established Stipend)', () => {
    for (const k of Object.keys(SIBSIN_EN)) expect(crossSajuEn(k)).toBe(SIBSIN_EN[k])
    expect(crossSajuEn('건록')).toBe('Established Stipend')
    expect(crossSajuEn('도화')).toBe('Peach Blossom')
    expect(crossSajuEn('역마')).toBe('Traveling Horse')
    expect(crossSajuEn('양인')).toBe('Blade Edge')
  })

  it("pickDayReason 의 sajuEn 도 같은 라벨 — '건록 × Sun' 이 EN 칩에 서지 않는다", () => {
    const r = pickDayReason({ signals: [cross('건록', 'Sun', 2, 'daily')] }, 'good')
    expect(r?.saju).toBe('건록')
    expect(r?.sajuEn).toBe('Established Stipend')
  })
})
