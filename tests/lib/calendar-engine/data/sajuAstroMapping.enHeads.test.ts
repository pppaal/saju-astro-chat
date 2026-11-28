/**
 * 교차 매핑 meaning.en 머리 = 칩 라벨 정본 (G13 — EN 이 주 시장이라 한 용어에 영어 이름 하나).
 *
 * 머리('<사주 키> × <행성>')의 사주 쪽 이름은 신살이면 SHINSAL_NAME_EN(interpretations.json 정본),
 * 십신이면 SIBSIN_EN 과 같아야 한다. 예전엔 'Travelling Horse'·'Yang Blade' 가 칩의
 * 'Traveling Horse'·'Blade Edge' 와 달라 topReasonsEn 한 줄에 두 이름이 섞였다.
 */
import { describe, it, expect } from 'vitest'
import { SAJU_ASTRO_MAPPINGS } from '@/lib/calendar-engine/data/saju-astro-mapping'
import { SHINSAL_NAME_EN } from '@/lib/calendar-engine/derivers/signalI18n'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'

describe('saju-astro-mapping — meaning.en 머리 = 칩 정본 이름', () => {
  it.each(SAJU_ASTRO_MAPPINGS.map((m) => [`${m.saju} × ${m.astro}`, m] as const))(
    '%s',
    (_label, m) => {
      const canon = SIBSIN_EN[m.saju] ?? SHINSAL_NAME_EN[m.saju]
      expect(canon, `${m.saju}: 정본 EN 이름 없음`).toBeTruthy()
      const head = m.meaning.en.split(' — ')[0]
      expect(head).toBe(`${canon} × ${m.astro}`)
    }
  )

  it('신살 머리는 SHINSAL_NAME_EN 그대로 — 역마·양인 포함', () => {
    const shinsalRows = SAJU_ASTRO_MAPPINGS.filter((m) => !SIBSIN_EN[m.saju])
    expect(shinsalRows.map((m) => m.saju).sort()).toEqual(
      expect.arrayContaining(['역마', '양인', '도화', '건록'])
    )
    for (const m of shinsalRows) {
      expect(m.meaning.en.startsWith(`${SHINSAL_NAME_EN[m.saju]} × `), m.meaning.en).toBe(true)
    }
    expect(SAJU_ASTRO_MAPPINGS.some((m) => /Travelling|Yang Blade/.test(m.meaning.en))).toBe(false)
  })
})
