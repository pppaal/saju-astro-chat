// tests/lib/saju/iljuProfile.test.ts
//
// 60갑자 일주 프로필 — 프로그래매틱 SEO 페이지 60개의 콘텐츠 엔진.
// 페이지가 자동 생성되므로 **엔진이 틀리면 60페이지가 같이 틀린다.**
// 그래서 슬러그 유일성·60갑자 정합성·배우자궁 십성을 전수 검사한다.

import { describe, it, expect } from 'vitest'
import {
  allIljuGanji,
  allIljuSlugs,
  iljuProfile,
  iljuBySlug,
  iljuWithBranch,
} from '@/lib/saju/iljuProfile'
import { sibseongFor, BRANCH_MAIN_STEM, gongmangOf } from '@/lib/compatibility/sajuSynastryData'

describe('allIljuGanji — 60갑자', () => {
  it('정확히 60개이고 중복이 없다', () => {
    const all = allIljuGanji()
    expect(all).toHaveLength(60)
    expect(new Set(all).size).toBe(60)
  })

  it('甲子 로 시작하고 癸亥 로 끝난다', () => {
    const all = allIljuGanji()
    expect(all[0]).toBe('甲子')
    expect(all[59]).toBe('癸亥')
  })

  it('양간은 양지, 음간은 음지와만 짝한다 — 60갑자의 기본 성질', () => {
    // 천간 짝수 index = 양, 지지 짝수 index = 양(子寅辰午申戌).
    const YANG_BRANCH = new Set(['子', '寅', '辰', '午', '申', '戌'])
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      const branchIsYang = YANG_BRANCH.has(p.dayBranch.han)
      expect(p.dayStem.yinYang === '양', g).toBe(branchIsYang)
    }
  })
})

describe('슬러그 — URL 안정성', () => {
  it('60개가 전부 유일하다 (충돌하면 두 일주가 같은 URL 을 쓴다)', () => {
    const slugs = allIljuSlugs()
    expect(slugs).toHaveLength(60)
    expect(new Set(slugs).size).toBe(60)
  })

  it('소문자 영문자만 — percent-encoding·대소문자 중복 색인 방지', () => {
    for (const s of allIljuSlugs()) {
      expect(s, s).toMatch(/^[a-z]+$/)
    }
  })

  it('왕복한다 — slug → 프로필 → 같은 slug', () => {
    for (const s of allIljuSlugs()) {
      const p = iljuBySlug(s)
      expect(p, s).not.toBeNull()
      expect(p!.slug).toBe(s)
    }
  })

  it('대소문자·공백을 허용한다(외부 링크 오염 대비)', () => {
    expect(iljuBySlug('SINMI')?.ganji).toBe('辛未')
    expect(iljuBySlug('  sinmi  ')?.ganji).toBe('辛未')
  })

  it('없는 슬러그와 60갑자 밖 조합은 null — 404 로 보낸다', () => {
    expect(iljuBySlug('nonexistent')).toBeNull()
    expect(iljuProfile('甲丑')).toBeNull() // 양간 × 음지 = 60갑자에 없음
    expect(iljuProfile('辛')).toBeNull()
    expect(iljuProfile('')).toBeNull()
  })
})

describe('iljuProfile — 필드가 전부 엔진에서 나온다(날조 금지)', () => {
  it('60개 전부 핵심 필드가 비어 있지 않다', () => {
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      expect(p.dayStem.element, g).toBeTruthy()
      expect(p.dayBranch.element, g).toBeTruthy()
      expect(p.dayBranch.hiddenStem, g).toBeTruthy()
      expect(p.spouseSeat.sibsin, g).toBeTruthy()
      expect(p.gongmang.length, g).toBe(2)
      expect(p.cheoneul.length, g).toBeGreaterThan(0)
      expect(p.index, g).toBeGreaterThanOrEqual(1)
      expect(p.index, g).toBeLessThanOrEqual(60)
    }
  })

  it('배우자궁 십성 = 일지 본기를 일간으로 본 십성 (SSOT 와 일치)', () => {
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      const expected = sibseongFor(p.dayStem.han, BRANCH_MAIN_STEM[p.dayBranch.han])
      expect(p.spouseSeat.sibsin, g).toBe(expected)
    }
  })

  it('공망은 gongmangOf SSOT 와 일치한다', () => {
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      expect(p.gongmang, g).toEqual(gongmangOf(p.dayStem.han, p.dayBranch.han))
    }
  })

  it('배우자성 판정은 성별로 갈린다 — 남=재성, 여=관성', () => {
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      const s = p.spouseSeat.sibsin
      expect(p.spouseSeat.isSpouseStarForMale, `${g} ${s}`).toBe(s === '정재' || s === '편재')
      expect(p.spouseSeat.isSpouseStarForFemale, `${g} ${s}`).toBe(s === '정관' || s === '편관')
    }
    // 남녀 모두 해당인 일주는 없어야 한다(재성과 관성은 배타적).
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      expect(p.spouseSeat.isSpouseStarForMale && p.spouseSeat.isSpouseStarForFemale, g).toBe(false)
    }
  })

  it('알려진 일주 한 건을 손으로 검산한다 — 辛未', () => {
    const p = iljuProfile('辛未')!
    expect(p.slug).toBe('sinmi')
    expect(p.ko).toBe('신미')
    expect(p.dayStem).toMatchObject({ element: '금', yinYang: '음' })
    expect(p.dayBranch).toMatchObject({ element: '토', hiddenStem: '己', animalKo: '양' })
    // 辛(금) 입장에서 己(토)는 인성 — 재성/관성이 아니므로 배우자성 아님.
    expect(p.spouseSeat.sibsin).toBe('편인')
    expect(p.spouseSeat.isSpouseStarForMale).toBe(false)
    expect(p.spouseSeat.isSpouseStarForFemale).toBe(false)
    expect(p.gongmang).toEqual(['戌', '亥'])
    // 未 의 지지 관계
    expect(p.relations.yukhap).toBe('午')
    expect(p.relations.chung).toBe('丑')
    expect(p.relations.samhap?.branches.sort()).toEqual(['亥', '卯'])
  })
})

describe('relations — 내부 링크의 근거', () => {
  it('육합·충은 서로 대칭이다', () => {
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      if (p.relations.yukhap) {
        const back = iljuWithBranch(p.relations.yukhap)[0]
        expect(back.relations.yukhap, `${g} ↔ ${back.ganji}`).toBe(p.dayBranch.han)
      }
      if (p.relations.chung) {
        const back = iljuWithBranch(p.relations.chung)[0]
        expect(back.relations.chung, `${g} ↔ ${back.ganji}`).toBe(p.dayBranch.han)
      }
    }
  })

  it('일지 자신은 자기 관계에 들어가지 않는다', () => {
    for (const g of allIljuGanji()) {
      const p = iljuProfile(g)!
      const b = p.dayBranch.han
      expect(p.relations.yukhap, g).not.toBe(b)
      expect(p.relations.chung, g).not.toBe(b)
      expect(p.relations.samhap?.branches, g).not.toContain(b)
    }
  })
})

describe('iljuWithBranch — 링크 그래프', () => {
  it('지지마다 정확히 5개 일주 (천간 10 중 음양 맞는 5개)', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    for (const b of branches) {
      expect(iljuWithBranch(b), b).toHaveLength(5)
    }
  })

  it('12지지 × 5 = 60 으로 전체를 덮는다', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    const total = branches.flatMap((b) => iljuWithBranch(b)).map((p) => p.ganji)
    expect(new Set(total).size).toBe(60)
  })
})
