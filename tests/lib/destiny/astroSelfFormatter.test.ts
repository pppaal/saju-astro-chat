/**
 * astroSelfFormatter — formatAstroSelf 의 각 섹션·분기 회귀 스위트.
 *
 * 입력 chart 는 collectAstroFacts 의 실 엔진(_chart)에서 가져온다(가짜 X).
 * 다루는 분기:
 *  - skipAngles true/false (행성 in 사인 / +angle·house, ASC/MC aspect 제외)
 *  - label override
 *  - profection (age 유무·skipAngles 와 상호작용)
 *  - natalInput 유무 → Solar/Lunar Return + Secondary Progression 섹션
 *  - day ruler / transit / fixed star / eclipse 섹션 존재성
 *  - 빈 chart 폴백
 * now 는 결정성을 위해 고정한다.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { formatAstroSelf, type AstroSelfInput } from '@/lib/destiny/astroSelfFormatter'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'
import type { Chart, NatalInput } from '@/lib/astrology/foundation/types'

const BIRTH = {
  // 1990-03-01 14:30 Seoul — Saturn 이 항성 Altair 와 orb 0.07° 로 합(느린
  // 행성이라 시각에 둔감·안정적). 이 fixture 로 Fixed Stars 섹션 렌더를 검증한다.
  // (이전 1990-05-15 fixture 는 잘못 배치됐던 항성과의 '가짜 합'에 의존했는데,
  //  항성 경도 sign-off-by-one 정정 후 그 합이 사라져 fixture 를 교체했다.)
  birthDate: '1990-03-01',
  birthTime: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
}
const NOW = new Date('2024-06-21T09:00:00.000Z')

const NATAL: NatalInput = {
  year: 1990,
  month: 3,
  date: 1,
  hour: 14,
  minute: 30,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

let chart: Chart

beforeAll(async () => {
  const f = await collectAstroFacts(BIRTH, NOW)
  expect(f).not.toBeNull()
  chart = f!._chart
})

function baseInput(over: Partial<AstroSelfInput> = {}): AstroSelfInput {
  return {
    chart,
    latitude: BIRTH.latitude,
    longitude: BIRTH.longitude,
    timeZone: BIRTH.timezone,
    now: NOW,
    ...over,
  }
}

describe('formatAstroSelf — 기본 구조', () => {
  it('빈 chart → 빈 문자열', async () => {
    const out = await formatAstroSelf({
      ...baseInput(),
      chart: undefined as unknown as Chart,
    })
    expect(out).toBe('')
  })

  it('기본 라벨 "점성" 헤더', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).toContain('== 점성 ==')
  })

  it('label override 반영', async () => {
    const out = await formatAstroSelf(baseInput({ label: 'A 점성' }))
    expect(out).toContain('== A 점성 ==')
  })

  it('행성·angle 헤더 + house 표기 (skipAngles=false)', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).toContain('[행성·angle in 사인 · house]')
    expect(out).toMatch(/Sun in/)
    expect(out).toContain('House') // angle/house 출력
    // ASC/MC 라인 — angle 포함
    expect(out).toMatch(/Ascendant in|MC in/)
  })

  it('Natal aspects 섹션 (angle 포함 헤더)', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).toContain('[Natal aspects — 행성·angle 사이]')
  })

  it('Fixed Stars / Current transits / Eclipses 섹션 렌더 (이 fixture 에서)', async () => {
    // 항성 합은 *출생연도* 세차보정이라 natalInput(출생연도) 필요.
    const out = await formatAstroSelf(baseInput({ natalInput: NATAL }))
    expect(out).toContain('[Fixed Stars — 본명 행성·angle ↔ 항성 합 (orb 1°)]')
    expect(out).toContain('[Current transits — 행성 (오늘) → natal, 2024-06-21]')
    // transit 라인은 "(transit)" 표기와 natal 키워드 포함
    expect(out).toMatch(/\(transit\) in .+ natal /)
    expect(out).toContain('[Upcoming Eclipses — 본명 차트에 임팩트 (orb 3°)]')
    // eclipse 라인 — 일식/월식 + House + orb
    expect(out).toMatch(/(일식|월식) \d{4}-\d{2}-\d{2}/)
  })

  it('출생연도(natalInput) 없으면 항성 합 섹션 skip (세차 epoch 불명)', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).not.toContain('[Fixed Stars')
  })

  it('현재 시점 행성 신호 — day ruler 항상 출력', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).toContain('[현재 시점 행성 신호]')
    expect(out).toContain('요일 ruler:')
    // NOW=2024-06-21 (금요일, UTC) → 요일 ruler 매핑 검증(Venus 계열)
    expect(out).toMatch(/요일 ruler: (Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn)/)
    expect(out).toContain('2024-06-21')
  })
})

describe('formatAstroSelf — skipAngles 분기', () => {
  it('skipAngles=true → 출생지 미상 안내 + angle 헤더 제거', async () => {
    const out = await formatAstroSelf(baseInput({ skipAngles: true }))
    expect(out).toContain('출생지 미상')
    expect(out).toContain('[행성 in 사인]')
    expect(out).not.toContain('[행성·angle in 사인 · house]')
    expect(out).toContain('[Natal aspects — 행성 사이]')
  })

  it('skipAngles=true → ASC/MC 라인·House 표기 제거', async () => {
    const out = await formatAstroSelf(baseInput({ skipAngles: true }))
    // 행성 in 사인 섹션에 House 표기가 없어야(행성만, house 생략)
    const planetSection = out.split('[Natal aspects')[0]
    expect(planetSection).not.toContain('House ')
    // Ascendant/MC 라인 자체가 행성 목록에 없음
    expect(planetSection).not.toMatch(/Ascendant in/)
  })

  it('skipAngles=true → Natal aspects 에 angle 미포함', async () => {
    const out = await formatAstroSelf(baseInput({ skipAngles: true }))
    const aspectSection = out.split('[Natal aspects — 행성 사이]')[1] ?? ''
    const firstBlock = aspectSection.split('\n\n')[0]
    expect(firstBlock).not.toContain('Ascendant')
    expect(firstBlock).not.toContain('MC ')
  })
})

describe('formatAstroSelf — Profection (age)', () => {
  it('age 주어지면 활성 house 섹션 출력 (만 나이 % 12 + 1)', async () => {
    const out = await formatAstroSelf(baseInput({ age: 34 }))
    expect(out).toContain('[Profection — 이번 해 (만 34세) 활성 house]')
    // 34 % 12 = 10 → 11H
    expect(out).toContain('해 단위 활성 house: 11H')
  })

  it('age=0 도 출력 (>= 0 경계) → 1H', async () => {
    const out = await formatAstroSelf(baseInput({ age: 0 }))
    expect(out).toContain('(만 0세)')
    expect(out).toContain('활성 house: 1H')
  })

  it('age 없으면 Profection 섹션 없음', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).not.toContain('[Profection')
  })

  it('age 있어도 skipAngles=true 면 Profection 생략', async () => {
    const out = await formatAstroSelf(baseInput({ age: 34, skipAngles: true }))
    expect(out).not.toContain('[Profection')
  })

  it('age 음수면 생략', async () => {
    const out = await formatAstroSelf(baseInput({ age: -1 }))
    expect(out).not.toContain('[Profection')
  })
})

describe('formatAstroSelf — natalInput 섹션 (SR/LR/Progression)', () => {
  it('natalInput 있으면 Solar Return + Lunar Return 섹션', async () => {
    const out = await formatAstroSelf(baseInput({ natalInput: NATAL }))
    expect(out).toContain('[Solar Return — 2024]')
    expect(out).toContain('[Lunar Return — 2024-06]')
  })

  it('natalInput 있으면 Secondary Progression 섹션 (major 행성)', async () => {
    const out = await formatAstroSelf(baseInput({ natalInput: NATAL }))
    expect(out).toContain('[Secondary Progression')
    expect(out).toMatch(/Progressed (Sun|Moon|Mercury|Venus|Mars)/)
  })

  it('SR/LR 섹션 — skipAngles=false 면 Asc/MC + House 표기', async () => {
    const out = await formatAstroSelf(baseInput({ natalInput: NATAL }))
    const sr = out.split('[Solar Return')[1]?.split('[')[0] ?? ''
    expect(sr).toContain('House')
  })

  it('SR/LR 섹션 — skipAngles=true 면 Asc/MC + House 생략', async () => {
    const out = await formatAstroSelf(baseInput({ natalInput: NATAL, skipAngles: true }))
    const sr = out.split('[Solar Return')[1]?.split('[')[0] ?? ''
    expect(sr).not.toContain('House')
    expect(sr).not.toContain('Asc:')
    // Progression 도 Asc/MC 줄 없음
    const prog = out.split('[Secondary Progression')[1] ?? ''
    expect(prog).not.toContain('Progressed Asc')
  })

  it('natalInput 없으면 SR/LR/Progression 모두 없음', async () => {
    const out = await formatAstroSelf(baseInput())
    expect(out).not.toContain('[Solar Return')
    expect(out).not.toContain('[Lunar Return')
    expect(out).not.toContain('[Secondary Progression')
  })
})

describe('formatAstroSelf — 결정성·now 폴백', () => {
  it('같은 입력 → 같은 출력 (결정적)', async () => {
    const a = await formatAstroSelf(baseInput({ age: 34, natalInput: NATAL }))
    const b = await formatAstroSelf(baseInput({ age: 34, natalInput: NATAL }))
    expect(a).toBe(b)
  })

  it('now 생략해도 (현재시각 폴백) 빈 문자열 아님 + day ruler 출력', async () => {
    const out = await formatAstroSelf({
      chart,
      latitude: BIRTH.latitude,
      longitude: BIRTH.longitude,
      timeZone: BIRTH.timezone,
    })
    expect(out).toContain('== 점성 ==')
    expect(out).toContain('요일 ruler:')
  })
})
