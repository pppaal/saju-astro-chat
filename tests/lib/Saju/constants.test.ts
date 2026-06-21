import {
  STEMS,
  BRANCHES,
  STEM_NAMES,
  BRANCH_NAMES,
  JIJANGGAN,
  MONTH_STEM_LOOKUP,
  TIME_STEM_LOOKUP,
  FIVE_ELEMENT_RELATIONS,
  CHEONEUL_GWIIN_MAP,
  YUKHAP,
  CHUNG,
  SAMHAP,
  XING,
  HAI,
  PA,
} from '@/lib/saju/constants'

describe('Saju Constants', () => {
  describe('STEMS (천간)', () => {
    it('has exactly 10 stems', () => {
      expect(STEMS).toHaveLength(10)
    })

    it('has unique stem names', () => {
      const names = STEMS.map((s) => s.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(10)
    })

    it('has all required properties for each stem', () => {
      STEMS.forEach((stem) => {
        expect(stem).toHaveProperty('name')
        expect(stem).toHaveProperty('element')
        expect(stem).toHaveProperty('yin_yang')
        expect(['목', '화', '토', '금', '수']).toContain(stem.element)
        expect(['양', '음']).toContain(stem.yin_yang)
      })
    })

    it('alternates between yang and yin', () => {
      for (let i = 0; i < STEMS.length; i++) {
        const expectedYinYang = i % 2 === 0 ? '양' : '음'
        expect(STEMS[i].yin_yang).toBe(expectedYinYang)
      }
    })

    it('follows 5 element cycle (2 stems per element)', () => {
      const elementOrder = ['목', '화', '토', '금', '수']
      for (let i = 0; i < STEMS.length; i++) {
        const expectedElement = elementOrder[Math.floor(i / 2)]
        expect(STEMS[i].element).toBe(expectedElement)
      }
    })
  })

  describe('BRANCHES (지지)', () => {
    it('has exactly 12 branches', () => {
      expect(BRANCHES).toHaveLength(12)
    })

    it('has unique branch names', () => {
      const names = BRANCHES.map((b) => b.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(12)
    })

    it('has all required properties for each branch', () => {
      BRANCHES.forEach((branch) => {
        expect(branch).toHaveProperty('name')
        expect(branch).toHaveProperty('element')
        expect(branch).toHaveProperty('yin_yang')
        expect(['목', '화', '토', '금', '수']).toContain(branch.element)
        expect(['양', '음']).toContain(branch.yin_yang)
      })
    })
  })

  describe('STEM_NAMES and BRANCH_NAMES', () => {
    it('STEM_NAMES matches STEMS array', () => {
      expect(STEM_NAMES).toHaveLength(10)
      STEM_NAMES.forEach((name, i) => {
        expect(name).toBe(STEMS[i].name)
      })
    })

    it('BRANCH_NAMES matches BRANCHES array', () => {
      expect(BRANCH_NAMES).toHaveLength(12)
      BRANCH_NAMES.forEach((name, i) => {
        expect(name).toBe(BRANCHES[i].name)
      })
    })
  })

  describe('JIJANGGAN (지장간)', () => {
    it('maps all 12 branches', () => {
      expect(Object.keys(JIJANGGAN)).toHaveLength(12)
    })

    it('has 정기 for all branches', () => {
      BRANCH_NAMES.forEach((branch) => {
        expect(JIJANGGAN[branch]).toHaveProperty('정기')
      })
    })

    it('has correct number of entries per branch type', () => {
      // 子, 卯, 酉: 정기만 (1개)
      const singleOnly = ['子', '卯', '酉']
      singleOnly.forEach((branch) => {
        expect(Object.keys(JIJANGGAN[branch])).toHaveLength(1)
      })

      // 나머지: 여기 + 중기 + 정기 (3개). 午(왕지지만 중기 己 보유)·亥(생지) 포함.
      const tripleOnly = ['丑', '寅', '辰', '巳', '午', '未', '申', '戌', '亥']
      tripleOnly.forEach((branch) => {
        expect(Object.keys(JIJANGGAN[branch])).toHaveLength(3)
      })
    })

    it('contains only valid stem names', () => {
      Object.values(JIJANGGAN).forEach((jjg) => {
        Object.values(jjg).forEach((stem) => {
          expect(STEM_NAMES).toContain(stem)
        })
      })
    })

    // 값-골든: 여기·중기·정기 전체(12지지). 기존엔 정기만 잠겼고 여기/중기는
    // value-blind 라 한 칸이 틀려도 통과했다. 여기/중기는 통근·암합 신호를 좌우하므로
    // 정통 도식(子·卯·酉 정기만; 午=丙己丁, 亥=戊甲壬 등)을 직접 고정한다.
    it('matches 지장간 doctrine for all 12 branches (여기/중기/정기)', () => {
      const GOLDEN: Record<string, Record<string, string>> = {
        子: { 정기: '癸' },
        丑: { 여기: '癸', 중기: '辛', 정기: '己' },
        寅: { 여기: '戊', 중기: '丙', 정기: '甲' },
        卯: { 정기: '乙' },
        辰: { 여기: '乙', 중기: '癸', 정기: '戊' },
        巳: { 여기: '戊', 중기: '庚', 정기: '丙' },
        午: { 여기: '丙', 중기: '己', 정기: '丁' },
        未: { 여기: '丁', 중기: '乙', 정기: '己' },
        申: { 여기: '戊', 중기: '壬', 정기: '庚' },
        酉: { 정기: '辛' },
        戌: { 여기: '辛', 중기: '丁', 정기: '戊' },
        亥: { 여기: '戊', 중기: '甲', 정기: '壬' },
      }
      for (const [branch, layers] of Object.entries(GOLDEN)) {
        expect(JIJANGGAN[branch], `${branch} 지장간`).toEqual(layers)
      }
    })
  })

  describe('MONTH_STEM_LOOKUP (월두법 / 五虎遁)', () => {
    it('maps all 10 stems', () => {
      expect(Object.keys(MONTH_STEM_LOOKUP)).toHaveLength(10)
    })

    it('maps to valid stems', () => {
      Object.values(MONTH_STEM_LOOKUP).forEach((stem) => {
        expect(STEM_NAMES).toContain(stem)
      })
    })

    // 값-골든: 五虎遁 — 연간(年干) → 寅월(첫 절기달) 천간.
    // 甲己年 丙寅頭 / 乙庚年 戊寅頭 / 丙辛年 庚寅頭 / 丁壬年 壬寅頭 / 戊癸年 甲寅頭.
    // 한 칸이라도 틀리면 그 연주 그룹(전체의 1/5)의 월주 천간이 통째로 어긋난다.
    // ("maps to valid stems" 만으로는 못 잡으므로 정통 도식 값을 직접 고정한다.)
    it('matches 五虎遁 doctrine for every year stem', () => {
      const FIVE_TIGER: Record<string, string> = {
        甲: '丙',
        己: '丙',
        乙: '戊',
        庚: '戊',
        丙: '庚',
        辛: '庚',
        丁: '壬',
        壬: '壬',
        戊: '甲',
        癸: '甲',
      }
      for (const [yearStem, expected] of Object.entries(FIVE_TIGER)) {
        expect(MONTH_STEM_LOOKUP[yearStem], `${yearStem}年 → 寅월 천간`).toBe(expected)
      }
    })
  })

  describe('TIME_STEM_LOOKUP (시두법 / 五鼠遁)', () => {
    it('maps all 10 stems', () => {
      expect(Object.keys(TIME_STEM_LOOKUP)).toHaveLength(10)
    })

    it('maps to valid stems', () => {
      Object.values(TIME_STEM_LOOKUP).forEach((stem) => {
        expect(STEM_NAMES).toContain(stem)
      })
    })

    // 값-골든: 五鼠遁 — 일간(日干) → 子시 천간.
    // 甲己日 甲子時 / 乙庚日 丙子時 / 丙辛日 戊子時 / 丁壬日 庚子時 / 戊癸日 壬子時.
    // 틀리면 그 일간 그룹의 시주 천간이 통째로 어긋난다(→ 십신·신살 연쇄 오류).
    it('matches 五鼠遁 doctrine for every day stem', () => {
      const FIVE_RAT: Record<string, string> = {
        甲: '甲',
        己: '甲',
        乙: '丙',
        庚: '丙',
        丙: '戊',
        辛: '戊',
        丁: '庚',
        壬: '庚',
        戊: '壬',
        癸: '壬',
      }
      for (const [dayStem, expected] of Object.entries(FIVE_RAT)) {
        expect(TIME_STEM_LOOKUP[dayStem], `${dayStem}日 → 子시 천간`).toBe(expected)
      }
    })
  })

  describe('FIVE_ELEMENT_RELATIONS', () => {
    const elements = ['목', '화', '토', '금', '수'] as const

    it('has all four relation types', () => {
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty('생하는관계')
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty('생받는관계')
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty('극하는관계')
      expect(FIVE_ELEMENT_RELATIONS).toHaveProperty('극받는관계')
    })

    it('maps all 5 elements for each relation', () => {
      Object.values(FIVE_ELEMENT_RELATIONS).forEach((relation) => {
        expect(Object.keys(relation)).toHaveLength(5)
        elements.forEach((el) => {
          expect(elements).toContain(relation[el])
        })
      })
    })

    it('has correct 생 (generation) cycle: 목→화→토→금→수→목', () => {
      const gen = FIVE_ELEMENT_RELATIONS.생하는관계
      expect(gen['목']).toBe('화') // Wood generates Fire
      expect(gen['화']).toBe('토') // Fire generates Earth
      expect(gen['토']).toBe('금') // Earth generates Metal
      expect(gen['금']).toBe('수') // Metal generates Water
      expect(gen['수']).toBe('목') // Water generates Wood
    })

    it('has correct 극 (overcoming) cycle: 목→토→수→화→금→목', () => {
      const over = FIVE_ELEMENT_RELATIONS.극하는관계
      expect(over['목']).toBe('토') // Wood overcomes Earth
      expect(over['토']).toBe('수') // Earth overcomes Water
      expect(over['수']).toBe('화') // Water overcomes Fire
      expect(over['화']).toBe('금') // Fire overcomes Metal
      expect(over['금']).toBe('목') // Metal overcomes Wood
    })
  })

  describe('CHEONEUL_GWIIN_MAP (천을귀인)', () => {
    it('maps all 10 stems', () => {
      expect(Object.keys(CHEONEUL_GWIIN_MAP)).toHaveLength(10)
    })

    it('maps to arrays of valid branches', () => {
      Object.values(CHEONEUL_GWIIN_MAP).forEach((branches) => {
        expect(Array.isArray(branches)).toBe(true)
        branches.forEach((branch) => {
          expect(BRANCH_NAMES).toContain(branch)
        })
      })
    })
  })

  describe('YUKHAP (육합)', () => {
    it('maps all 12 branches', () => {
      expect(Object.keys(YUKHAP)).toHaveLength(12)
    })

    it('is bidirectional (symmetric)', () => {
      Object.entries(YUKHAP).forEach(([branch, partner]) => {
        expect(YUKHAP[partner]).toBe(branch)
      })
    })

    it('contains only valid branches', () => {
      Object.entries(YUKHAP).forEach(([branch, partner]) => {
        expect(BRANCH_NAMES).toContain(branch)
        expect(BRANCH_NAMES).toContain(partner)
      })
    })
  })

  describe('CHUNG (충)', () => {
    it('maps all 12 branches', () => {
      expect(Object.keys(CHUNG)).toHaveLength(12)
    })

    it('is bidirectional (symmetric)', () => {
      Object.entries(CHUNG).forEach(([branch, partner]) => {
        expect(CHUNG[partner]).toBe(branch)
      })
    })

    it('pairs branches that are 6 positions apart', () => {
      // In the 12 branches, 충 pairs are opposite (index difference = 6)
      const chungPairs = [
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ]

      chungPairs.forEach(([a, b]) => {
        expect(CHUNG[a]).toBe(b)
        expect(CHUNG[b]).toBe(a)
      })
    })
  })

  describe('SAMHAP (삼합)', () => {
    it('has 4 three-way combinations', () => {
      expect(Object.keys(SAMHAP)).toHaveLength(4)
    })

    it('maps to elements', () => {
      const elements = ['수', '목', '화', '금']
      Object.keys(SAMHAP).forEach((element) => {
        expect(elements).toContain(element)
      })
    })

    it('each combination has 3 branches', () => {
      Object.values(SAMHAP).forEach((branches) => {
        expect(branches).toHaveLength(3)
      })
    })

    it('uses valid branch names', () => {
      Object.values(SAMHAP).forEach((branches) => {
        branches.forEach((branch) => {
          expect(BRANCH_NAMES).toContain(branch)
        })
      })
    })
  })

  describe('XING (형)', () => {
    it('includes key branch interactions', () => {
      // 무은지형: 寅巳申 interact with each other
      expect(XING['寅']).toContain('巳')
      expect(XING['寅']).toContain('申')

      // 자형: self-punishment branches
      expect(XING['辰']).toContain('辰')
      expect(XING['午']).toContain('午')
      expect(XING['酉']).toContain('酉')
      expect(XING['亥']).toContain('亥')

      // 무례지형: 子卯
      expect(XING['子']).toContain('卯')
      expect(XING['卯']).toContain('子')
    })

    it('uses valid branch names', () => {
      Object.entries(XING).forEach(([branch, targets]) => {
        expect(BRANCH_NAMES).toContain(branch)
        targets.forEach((target) => {
          expect(BRANCH_NAMES).toContain(target)
        })
      })
    })
  })

  describe('HAI (해)', () => {
    it('has 12 branch mappings (6 pairs, bidirectional)', () => {
      expect(Object.keys(HAI)).toHaveLength(12)
    })

    it('is bidirectional', () => {
      Object.entries(HAI).forEach(([branch, partner]) => {
        expect(HAI[partner]).toBe(branch)
      })
    })
  })

  describe('PA (파)', () => {
    it('has 12 branch mappings (6 pairs, bidirectional)', () => {
      expect(Object.keys(PA)).toHaveLength(12)
    })

    it('is bidirectional', () => {
      Object.entries(PA).forEach(([branch, partner]) => {
        expect(PA[partner]).toBe(branch)
      })
    })
  })
})
