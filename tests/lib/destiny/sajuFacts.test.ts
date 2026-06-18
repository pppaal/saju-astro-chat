// tests/lib/destiny/sajuFacts.test.ts
import { describe, it, expect } from 'vitest'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'

// 본 테스트의 기준 출생 = destinypal preview 가 쓰는 1995-02-09 06:40 KST 남자.
// 1995 = 乙亥'년'(음년), 일주는 辛未 → 일간(日干)=辛(음금). calculateSajuData
// 결정성 골든(saju-astro-doctrine-regressions)으로 잠겨있어 회귀 alarm 신뢰 가능.
// (옛 주석은 연주 乙亥 를 일주로 착각해 일간을 乙 로 적었던 오류 — 수정함.)
const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  timezone: 'Asia/Seoul',
  longitude: 126.978,
}

describe('collectSajuFacts — 순수 facts 계산', () => {
  it('pillars 4기둥 다 채움 (천간/지지/십신/지장간)', () => {
    const f = collectSajuFacts(BIRTH)
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      expect(f.pillars[k].stem).toBeTruthy()
      expect(f.pillars[k].branch).toBeTruthy()
      // 지장간은 천간 0~3개 배열 — 子·卯·午·酉 같은 왕지는 1~2개일 수 있음
      expect(Array.isArray(f.pillars[k].jijanggan)).toBe(true)
    }
  })

  it('dayMaster — name + element + yinYang 셋 다 채워짐', () => {
    const f = collectSajuFacts(BIRTH)
    expect(f.dayMaster.name).toBe('辛')
    expect(f.dayMaster.element).toBe('금')
    expect(f.dayMaster.yinYang).toBe('음')
  })

  it('dayMaster.rooted — 지장간에 일간 오행이 있으면 true', () => {
    const f = collectSajuFacts(BIRTH)
    // 辛은 金. 지지/지장간 어디든 金 있으면 rooted.
    expect(typeof f.dayMaster.rooted).toBe('boolean')
  })

  it('fiveElements 합산이 사주 천간 4 + 지지 4 + 지장간 = 양수', () => {
    const f = collectSajuFacts(BIRTH)
    const sum =
      f.fiveElements.wood +
      f.fiveElements.fire +
      f.fiveElements.earth +
      f.fiveElements.metal +
      f.fiveElements.water
    expect(sum).toBeGreaterThan(0)
  })

  it('strength — 신강/신약/빈 문자열 셋 중 하나', () => {
    const f = collectSajuFacts(BIRTH)
    expect(['신강', '신약', '']).toContain(f.strength)
  })

  it('geokguk — null 또는 격국명 (예: 정관격)', () => {
    const f = collectSajuFacts(BIRTH)
    if (f.geokguk !== null) {
      expect(f.geokguk).toMatch(/격$/)
    }
  })

  it('determinism — 주입한 now 가 대운에 반영되되 원국 4기둥은 불변', () => {
    // 원국은 birthDate/Time 만으로 결정 → now 무관하게 동일.
    // 대운(10년 단위)은 "지금"에 의존 → 주입한 now 를 따라가야(결정론 + 시계 누수 방지).
    const now2012 = new Date(2012, 5, 15, 12, 0, 0)
    const now2042 = new Date(2042, 5, 15, 12, 0, 0)
    const a = collectSajuFacts({ ...BIRTH, now: now2012 })
    const b = collectSajuFacts({ ...BIRTH, now: now2042 })

    for (const k of ['year', 'month', 'day', 'time'] as const) {
      expect(a.pillars[k]).toEqual(b.pillars[k])
    }
    // 같은 now → 같은 결과(반복 호출 결정론).
    expect(collectSajuFacts({ ...BIRTH, now: now2012 }).daeun.current).toEqual(a.daeun.current)
    // 30년 차이면 현재 대운이 달라야 — now 가 실제로 대운 선택에 흐른다는 증거.
    expect(a.daeun.current).not.toBeNull()
    expect(b.daeun.current).not.toBeNull()
    expect(a.daeun.current?.age).not.toBe(b.daeun.current?.age)
  })

  it('yongsin — null 또는 primaryYongsin 있는 객체', () => {
    const f = collectSajuFacts(BIRTH)
    if (f.yongsin !== null) {
      expect(f.yongsin.primaryYongsin).toBeTruthy()
    }
  })

  it('relations — 배열 (합·충·형·파·해·공망 등)', () => {
    const f = collectSajuFacts(BIRTH)
    expect(Array.isArray(f.relations)).toBe(true)
    for (const r of f.relations) {
      expect(typeof r.kind).toBe('string')
    }
  })

  it('gwansalHonjap — boolean (정관+편관 같이 있으면 true)', () => {
    const f = collectSajuFacts(BIRTH)
    expect(typeof f.gwansalHonjap).toBe('boolean')
  })

  it('포매팅 0 — 결과 JSON-serializable (text 0)', () => {
    const f = collectSajuFacts(BIRTH)
    // JSON round-trip 으로 검증: 모든 값이 plain JSON 이어야 (Date, function 등 X)
    const cloned = JSON.parse(JSON.stringify(f))
    expect(cloned.dayMaster.name).toBe(f.dayMaster.name)
    expect(cloned.fiveElements.wood).toBe(f.fiveElements.wood)
  })

  it('locale 무관 — 같은 input → 같은 output (locale 인자 자체가 없음)', () => {
    const f1 = collectSajuFacts(BIRTH)
    const f2 = collectSajuFacts(BIRTH)
    expect(f1.dayMaster).toEqual(f2.dayMaster)
    expect(f1.fiveElements).toEqual(f2.fiveElements)
    expect(f1.strength).toBe(f2.strength)
    expect(f1.geokguk).toBe(f2.geokguk)
  })

  it('다른 출생 → 다른 결과', () => {
    const a = collectSajuFacts(BIRTH)
    const b = collectSajuFacts({ ...BIRTH, birthDate: '1980-01-01' })
    expect(
      a.pillars.year.stem !== b.pillars.year.stem || a.pillars.year.branch !== b.pillars.year.branch
    ).toBe(true)
  })
})
