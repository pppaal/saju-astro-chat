import { describe, it, expect } from 'vitest'
import { determineGeokguk, determineGeokgukAdvanced } from '@/lib/saju/geokguk'
import { getGeokgukRich } from '@/lib/chart-dictionary'

type P = {
  year: { stem: string; branch: string }
  month: { stem: string; branch: string }
  day: { stem: string; branch: string }
  time: { stem: string; branch: string }
}
const mk = (
  ys: string,
  yb: string,
  ms: string,
  mb: string,
  ds: string,
  db: string,
  ts: string,
  tb: string
): P => ({
  year: { stem: ys, branch: yb },
  month: { stem: ms, branch: mb },
  day: { stem: ds, branch: db },
  time: { stem: ts, branch: tb },
})

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

describe('geokguk 월령 용사 fallback', () => {
  it('월지 본기가 투출 안 돼도 미정 대신 본기 정격으로 잡고 fallback 표시한다', () => {
    // 일간 甲, 월지 子(정기 癸=정인), 천간에 癸 없음 → 투출 미확인 → 본기 정격.
    const r = determineGeokguk(mk('甲', '寅', '丙', '子', '甲', '午', '甲', '戌') as never)
    expect(r.primary).toBe('정인격')
    expect(r.category).toBe('정격')
    expect(r.confidence).toBe('medium')
    expect(r.fallback).toBe(true)
    expect(r.primary).not.toBe('미정')
  })

  it('월령 본기가 비견/겁재면 본기 정격으로 잡지 않는다(건록·양인·월겁 경로 보존)', () => {
    // 일간 甲, 월지 寅(정기 甲=비견) → 건록격(비격), fallback 아님.
    const r = determineGeokguk(mk('丙', '子', '丙', '寅', '甲', '午', '丙', '戌') as never)
    expect(r.primary).toBe('건록격')
    expect(r.category).toBe('비격')
    expect(r.fallback).toBeFalsy()
  })

  it('진술축미월 정기 미투출 + 중기/여기 투출이면 잡기격으로 남는다(정격으로 뭉개지지 않음)', () => {
    // 사전(geokguk-rich)에 잡기격이 있어야 카드가 뜬다 — 도달 가능성 + 사전 계약 동시 확인.
    let found: P | null = null
    outer: for (const ds of STEMS)
      for (const mb of ['辰', '戌', '丑', '未'])
        for (const ms of STEMS)
          for (const yb of BRANCHES) {
            const p = mk('甲', yb, ms, mb, ds, '子', '甲', '子')
            if (determineGeokguk(p as never).primary === '잡기격') {
              found = p
              break outer
            }
          }
    expect(found, '잡기격이 도달 가능해야 한다(엔진에서 생성)').not.toBeNull()
    const r = determineGeokguk(found as never)
    expect(r.primary).toBe('잡기격')
    expect(r.category).toBe('비격')
    // 잡기격은 표시용 폴백이 아니라 정규 비격 — fallback 플래그가 없어야 한다.
    expect(r.fallback).toBeFalsy()
  })

  it('fallback 정격은 성패 신호(statusResult)를 만들지 않는다 — 캘린더 동급 혼입 방지', () => {
    const p = mk('甲', '寅', '丙', '子', '甲', '午', '甲', '戌')
    const basic = determineGeokguk(p as never)
    expect(basic.fallback).toBe(true)
    const adv = determineGeokgukAdvanced(p as never) as { statusResult?: unknown }
    expect(adv.statusResult).toBeUndefined()
  })

  it('잡기격은 기존대로 성패 신호(statusResult)를 부착한다 — 캘린더 동작 유지', () => {
    let found: P | null = null
    outer: for (const ds of STEMS)
      for (const mb of ['辰', '戌', '丑', '未'])
        for (const ms of STEMS)
          for (const yb of BRANCHES) {
            const p = mk('甲', yb, ms, mb, ds, '子', '甲', '子')
            if (determineGeokguk(p as never).primary === '잡기격') {
              found = p
              break outer
            }
          }
    expect(found).not.toBeNull()
    const adv = determineGeokgukAdvanced(found as never) as { statusResult?: unknown }
    expect(adv.statusResult).toBeDefined()
  })
})

describe('geokguk-rich 사전 계약 — 신규 항목', () => {
  it('월겁격 / 잡기격이 ko·en 모두 사전에 존재한다', () => {
    for (const name of ['월겁격', '잡기격']) {
      for (const lang of ['ko', 'en'] as const) {
        const entry = getGeokgukRich(name, lang)
        expect(entry, `${name}(${lang}) 사전 항목`).toBeTruthy()
        expect(entry?.tagline).toBeTruthy()
        expect(entry?.personality).toBeTruthy()
      }
    }
  })
})
