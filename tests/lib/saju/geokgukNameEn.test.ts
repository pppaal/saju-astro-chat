/**
 * 격국 EN 이름 단일 표 (G13) — 캘린더 화면과 상담사 LLM 컨텍스트가 같은 이름을 쓴다.
 *
 * 예전엔 상담사(counselorContext GEOKGUK_SPECIAL_EN)가 'Established-rank (Geollok)',
 * 캘린더(dayTierEnMaps GEOKGUK_NAME_EN)가 'Geonrok (Officer stipend)' 로 같은 격국을 달리 불렀다.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GEOKGUK_NAME_EN, geokgukNameEn } from '@/lib/saju/geokgukNameEn'
import { GEOKGUK_NAME_EN as CALENDAR_MAP } from '@/lib/calendar-view/dayTierEnMaps'

const ROOT = join(__dirname, '..', '..', '..')

describe('격국 EN 이름 — 단일 표', () => {
  it('캘린더 표면의 GEOKGUK_NAME_EN 은 같은 객체(재노출)다', () => {
    expect(CALENDAR_MAP).toBe(GEOKGUK_NAME_EN)
  })

  it('화면 표기를 정본으로 유지 — 건록격 = Geonrok (Officer stipend)', () => {
    expect(GEOKGUK_NAME_EN['건록격']).toBe('Geonrok (Officer stipend)')
    expect(GEOKGUK_NAME_EN['양인격']).toBe('Yangin (Blade edge)')
    expect(geokgukNameEn('정인격')).toBe('Jeongin (Direct-resource)')
    expect(geokgukNameEn('없는격')).toBeNull()
    for (const [ko, en] of Object.entries(GEOKGUK_NAME_EN)) {
      expect(/[가-힣]/.test(en), ko).toBe(false)
    }
  })

  it('상담사 컨텍스트는 이 표를 import 하고, 자기 격국 영어 표를 따로 두지 않는다', () => {
    const src = readFileSync(join(ROOT, 'src/lib/destiny/counselorContext.ts'), 'utf8')
    expect(src).toContain("from '@/lib/saju/geokgukNameEn'")
    expect(src).not.toMatch(/GEOKGUK_SPECIAL_EN/)
    expect(src).not.toMatch(/Established-rank/)
  })
})
