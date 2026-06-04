// 공망(空亡)·12신살 SSOT 일치 + 골든.
//
// 공망은 과거 7곳(표2+계산식5), 12신살은 3곳에 복제돼 있었다(값은 동일).
// 공망 → pillarLookup.getGongmang(SSOT, 旬空), 12신살 → shinsal.pickTwelveSingle(SSOT)
// 로 통일. 이 테스트가 SSOT 값과 파생 래퍼들의 일치를 잠근다.

import { describe, it, expect } from 'vitest'
import { getGongmang as getGongmangByPillar } from '@/lib/saju/pillarLookup'
import { getGongmang as getGongmangStemBranch, pickTwelveSingle } from '@/lib/saju/shinsal'
import { calculateGongmang } from '@/lib/calendar-engine/timing-helpers/ultra-precision-daily'

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 60갑자 (i%10 천간, i%12 지지)
const SIXTY = Array.from({ length: 60 }, (_, i) => ({
  stem: STEMS[i % 10],
  branch: BRANCHES[i % 12],
  pillar: `${STEMS[i % 10]}${BRANCHES[i % 12]}`,
}))

describe('공망 — SSOT 파생 래퍼들이 60갑자 전부 일치', () => {
  it('shinsal.getGongmang / ultra-precision.calculateGongmang == pillarLookup.getGongmang', () => {
    for (const { stem, branch, pillar } of SIXTY) {
      const ssot = getGongmangByPillar(pillar)
      expect(getGongmangStemBranch(stem, branch)).toEqual(ssot ?? [])
      expect(calculateGongmang(stem, branch)).toEqual(ssot ?? [])
    }
  })

  it('골든: 각 旬의 공망 (甲子→戌亥 … 甲寅→子丑)', () => {
    const golden: Record<string, [string, string]> = {
      甲子: ['戌', '亥'],
      甲戌: ['申', '酉'],
      甲申: ['午', '未'],
      甲午: ['辰', '巳'],
      甲辰: ['寅', '卯'],
      甲寅: ['子', '丑'],
    }
    for (const [pillar, exp] of Object.entries(golden)) {
      expect(getGongmangByPillar(pillar)).toEqual(exp)
    }
  })
})

describe('12신살 — pickTwelveSingle(SSOT)', () => {
  it('12×12 모든 일지×대상지지에 유효한 신살을 부여(누락 없음)', () => {
    const valid = new Set([
      '겁살',
      '재살',
      '천살',
      '지살',
      '년살',
      '월살',
      '망신',
      '장성',
      '반안',
      '역마',
      '육해',
      '화개',
    ])
    for (const d of BRANCHES) {
      for (const t of BRANCHES) {
        const s = pickTwelveSingle(d, t)
        expect(s).not.toBeNull()
        expect(valid.has(s as string)).toBe(true)
      }
    }
  })

  it('골든: 각 三合국 일지의 왕지(王地)는 장성(將星)', () => {
    // 火국 寅午戌→午, 水국 申子辰→子, 金국 巳酉丑→酉, 木국 亥卯未→卯
    const trineKing: Array<[string[], string]> = [
      [['寅', '午', '戌'], '午'],
      [['申', '子', '辰'], '子'],
      [['巳', '酉', '丑'], '酉'],
      [['亥', '卯', '未'], '卯'],
    ]
    for (const [members, king] of trineKing) {
      for (const d of members) {
        expect(pickTwelveSingle(d, king)).toBe('장성')
      }
    }
  })
})
