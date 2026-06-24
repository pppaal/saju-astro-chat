/**
 * 미성년 안전 모드 (검수 C5) — 만 14세 미만이면
 *  - natalToReportData 가 isMinor=true 를 실어 보내고(§01/§02 연애 슬롯 reframe 신호),
 *  - buildCrossRows 가 §05 교차에서 '연애·매력'·'재물 그릇' 축을 제거한다.
 * now 를 주입해 같은 사주를 미성년/성인 두 관점으로 비교(결정적).
 */
import { describe, it, expect } from 'vitest'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { natalToReportData, buildCrossRows } from '@/components/report/integrated/adapter'
import { getPlanetCore, getHouseRich } from '@/lib/chart-dictionary'
import { getShinsalInterpretation, shinsalDisplayText } from '@/lib/saju/interpretations'
import { evalRelations, planetTheme } from '@/lib/report/natalCross'

const ROMANCE = new Set(['연애·매력', 'Love & Magnetism'])
const WEALTH = new Set(['재물 그릇', 'Wealth Capacity'])

async function childCtx() {
  const ctx = (await buildNatalContext({
    birthDate: '2015-03-15',
    birthTime: '09:20',
    gender: 'female',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })) as Record<string, unknown>
  const saju = ctx.saju as Record<string, unknown>
  saju.twelveStages = getTwelveStagesForPillars(saju.pillars as never)
  ;(ctx as Record<string, unknown>).input = {
    ...(ctx.input as object),
    gender: 'female',
    timeZone: 'Asia/Seoul',
  }
  return ctx
}

describe('통합 리포트 — 미성년 안전 모드 (C5)', () => {
  it('만 14세 미만이면 isMinor=true, 그 이후면 false (now 주입)', async () => {
    const ctx = await childCtx()
    const asChild = natalToReportData(ctx, 'ko', new Date('2026-06-24T00:00:00Z')) // 만 11세
    const asAdult = natalToReportData(ctx, 'ko', new Date('2099-06-24T00:00:00Z')) // 만 84세
    expect(asChild.isMinor).toBe(true)
    expect(asAdult.isMinor).toBe(false)
  }, 30000)

  it('미성년 교차에는 연애·재물 축이 절대 없고, 성인 대비 행이 더 적거나 같다', async () => {
    const ctx = await childCtx()
    const minor = buildCrossRows(ctx, 'ko', new Date('2026-06-24T00:00:00Z'))
    const adult = buildCrossRows(ctx, 'ko', new Date('2099-06-24T00:00:00Z'))

    // 안전 불변식: 미성년 리포트엔 연애·재물 카테고리가 없다.
    expect(minor.rows.some((r) => ROMANCE.has(r.category) || WEALTH.has(r.category))).toBe(false)
    // 필터는 제거만 한다 — 미성년 행 수 ≤ 성인 행 수.
    expect(minor.rows.length).toBeLessThanOrEqual(adult.rows.length)
    // 성인 쪽에 연애/재물이 있었다면 미성년에선 사라진 것(제거된 만큼 차이).
    const removed = adult.rows.filter((r) => ROMANCE.has(r.category) || WEALTH.has(r.category)).length
    expect(adult.rows.length - minor.rows.length).toBe(removed)
  }, 30000)

  it('영문 미성년 교차도 Love & Magnetism / Wealth Capacity 가 없다', async () => {
    const ctx = await childCtx()
    const minorEn = buildCrossRows(ctx, 'en', new Date('2026-06-24T00:00:00Z'))
    expect(minorEn.rows.some((r) => ROMANCE.has(r.category) || WEALTH.has(r.category))).toBe(false)
  }, 30000)
})

// ── C5.2: 신살·행성·하우스·자녀 교차 누출 차단 (순수 함수 단위) ──
describe('미성년 안전 모드 C5.2 — 신살·행성·하우스·자녀 (순수 함수)', () => {
  it('연애성 신살(도화·금여) 풀이가 미성년이면 이성·배우자 표현을 빼고 치환된다', () => {
    for (const name of ['도화', '금여']) {
      const interp = getShinsalInterpretation(name)
      expect(interp).toBeTruthy()
      const adult = shinsalDisplayText(interp!, name, 'ko', false)
      const minor = shinsalDisplayText(interp!, name, 'ko', true)
      expect(minor).not.toBe(adult)
      expect(minor).not.toMatch(/이성|배우자/)
    }
    // 연애성이 아닌 신살은 미성년이어도 그대로
    const dohwaEn = shinsalDisplayText(getShinsalInterpretation('도화')!, '도화', 'en', true)
    expect(dohwaEn).not.toMatch(/romantic|spouse|sexual/i)
  })

  it('화성·릴리스·명왕성 의미·결·키워드가 미성년이면 성적/죽음 표현을 빼고 치환된다', () => {
    const marsMinor = getPlanetCore('Mars', 'ko', true)
    expect(marsMinor?.meaning).not.toMatch(/성적/)
    expect(marsMinor?.principle).not.toMatch(/욕망/)
    expect((marsMinor?.keywords ?? []).join()).not.toMatch(/욕망|분노|성/)
    const lilithMinor = getPlanetCore('Lilith', 'ko', true)
    expect(lilithMinor?.principle ?? '').not.toMatch(/여성성|금기/)
    const plutoMinor = getPlanetCore('Pluto', 'ko', true)
    expect((plutoMinor?.keywords ?? []).join()).not.toMatch(/죽음/)
    expect(plutoMinor?.meaning ?? '').not.toMatch(/죽고|트라우마/)
    // 일반 행성(태양)은 미성년이어도 동일
    expect(getPlanetCore('Sun', 'ko', true)?.meaning).toBe(
      getPlanetCore('Sun', 'ko', false)?.meaning
    )
  })

  it('almuten 행성 결(planetTheme)이 미성년이면 안전, 성인은 원형 유지', () => {
    // 화성 almuten 가정: 성인은 "욕망" 포함, 미성년은 제외
    expect(planetTheme('Mars', 'ko', false)).toMatch(/욕망/)
    expect(planetTheme('Mars', 'ko', true)).not.toMatch(/욕망/)
    expect(planetTheme('Pluto', 'ko', true)).not.toMatch(/죽음/)
  })

  it('5·7·8하우스 키워드가 미성년이면 연애·결혼·자녀·성·죽음을 뺀다', () => {
    expect(getHouseRich(5, 'ko', true)?.domain).not.toMatch(/연애|자녀/)
    expect(getHouseRich(7, 'ko', true)?.domain).not.toMatch(/결혼/)
    expect(getHouseRich(8, 'ko', true)?.domain).not.toMatch(/성·죽음|죽음/)
    // 무관 하우스(1)는 그대로
    expect(getHouseRich(1, 'ko', true)?.domain).toBe(getHouseRich(1, 'ko', false)?.domain)
  })

  it('관계 교차의 자녀·후대 서술이 미성년이면 생략된다', () => {
    const adult = evalRelations(2, 0, 2, 0, 'male', 1, false)
    const minor = evalRelations(2, 0, 2, 0, 'male', 1, true)
    expect(adult?.reason.ko).toMatch(/자식|자녀/)
    expect(minor?.reason.ko).not.toMatch(/자식|자녀/)
    expect(minor?.reason.en ?? '').not.toMatch(/child|next generation/i)
  })
})
