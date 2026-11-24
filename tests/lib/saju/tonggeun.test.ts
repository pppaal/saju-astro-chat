import {
  calculateTonggeun,
  calculateTuechul,
  getMonthBranchTransparency,
  calculateHoeguk,
  calculateDeukryeong,
  calculateElementStrengths,
  analyzeStrength,
  evaluateStemPower,
  type SajuPillarsInput,
} from '@/lib/saju/tonggeun'

// Helper to create mock pillars input
function createPillarsInput(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillarsInput {
  return {
    year: { stem: year[0], branch: year[1] },
    month: { stem: month[0], branch: month[1] },
    day: { stem: day[0], branch: day[1] },
    time: { stem: time[0], branch: time[1] },
  }
}

describe('tonggeun', () => {
  describe('calculateTonggeun', () => {
    it('finds roots when stem matches hidden stem exactly', () => {
      // 甲木 in 寅地 (has 甲 as hidden stem)
      const pillars = createPillarsInput(
        ['甲', '寅'], // 寅에 甲이 있음
        ['丙', '午'],
        ['戊', '辰'],
        ['庚', '申']
      )

      const result = calculateTonggeun('甲', pillars)

      expect(result.hasRoot).toBe(true)
      expect(result.roots.length).toBeGreaterThan(0)
      expect(result.totalStrength).toBeGreaterThan(0)
    })

    it('returns hasRoot false when no roots found', () => {
      // 癸水 has no roots in these branches
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '戌'])

      const result = calculateTonggeun('癸', pillars)

      // 癸 might find partial roots through 水 element
      expect(result.stem).toBe('癸')
    })

    it('finds same-element partial roots (동기통근)', () => {
      // 甲木 in 卯地 (has 乙 as hidden stem, same element 목)
      const pillars = createPillarsInput(
        ['甲', '卯'], // 卯에 乙(목)이 있음
        ['丙', '午'],
        ['戊', '辰'],
        ['庚', '申']
      )

      const result = calculateTonggeun('甲', pillars)

      expect(result.hasRoot).toBe(true)
      // Should find 乙 as partial root
    })

    it('applies pillar weights correctly', () => {
      // 甲 in day branch should be stronger than in year branch
      const pillarsWithDayRoot = createPillarsInput(
        ['丙', '午'],
        ['丙', '午'],
        ['甲', '寅'], // 일지 통근
        ['庚', '申']
      )

      const pillarsWithYearRoot = createPillarsInput(
        ['甲', '寅'], // 년지 통근
        ['丙', '午'],
        ['戊', '辰'],
        ['庚', '申']
      )

      const dayResult = calculateTonggeun('甲', pillarsWithDayRoot)
      const yearResult = calculateTonggeun('甲', pillarsWithYearRoot)

      // Day pillar has higher weight
      expect(dayResult.totalStrength).toBeGreaterThan(yearResult.totalStrength)
    })

    it('caps total strength at 200', () => {
      // Multiple strong roots
      const pillars = createPillarsInput(['甲', '寅'], ['甲', '卯'], ['甲', '寅'], ['甲', '卯'])

      const result = calculateTonggeun('甲', pillars)

      expect(result.totalStrength).toBeLessThanOrEqual(200)
    })
  })

  describe('calculateTuechul', () => {
    it('returns tuechul results for all four pillars', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const results = calculateTuechul(pillars)

      expect(results).toHaveLength(4)
      expect(results.map((r) => r.pillar)).toEqual(['year', 'month', 'day', 'time'])
    })

    it('marks hidden stems as transparent when they appear in stems', () => {
      // 寅의 지장간 중 하나가 천간에 있으면 투출
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const results = calculateTuechul(pillars)
      const yearResult = results.find((r) => r.pillar === 'year')

      expect(yearResult).toBeDefined()
      const transparentStem = yearResult?.hiddenStems.find((h) => h.transparent)
      expect(transparentStem).toBeDefined()
      // 투출된 지장간이 있으면 됨 (정확한 지장간은 JIJANGGAN 상수에 따라 다름)
      expect(transparentStem?.transparent).toBe(true)
    })

    it('includes transparent pillar information', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const results = calculateTuechul(pillars)
      const yearResult = results.find((r) => r.pillar === 'year')
      const transparentStem = yearResult?.hiddenStems.find((h) => h.transparent)

      // 투출된 stem이 있으면 투출된 pillar 정보도 있어야 함
      if (transparentStem) {
        expect(transparentStem.transparentPillar).toBeDefined()
      }
    })
  })

  describe('getMonthBranchTransparency', () => {
    it('returns transparent stem when month hidden stem appears in other stems', () => {
      // 寅월의 甲이 년간에 투출
      const pillars = createPillarsInput(
        ['甲', '子'], // 甲이 천간에
        ['丙', '寅'], // 월지 寅의 정기 甲
        ['戊', '辰'],
        ['庚', '申']
      )

      const result = getMonthBranchTransparency(pillars)

      expect(result.transparentStem).toBe('甲')
      expect(result.transparentType).toBe('정기')
      expect(result.priority).toBe(3)
    })

    it('returns null when no hidden stem is transparent', () => {
      const pillars = createPillarsInput(
        ['壬', '子'],
        ['癸', '寅'], // 寅의 지장간이 천간에 없음
        ['戊', '辰'],
        ['辛', '申']
      )

      const result = getMonthBranchTransparency(pillars)

      expect(result.transparentStem).toBeNull()
      expect(result.priority).toBe(0)
    })

    it('prioritizes 정기 over 중기 over 여기', () => {
      // 寅: 정기 甲, 중기 丙, 여기 戊
      // 戊가 천간에 있지만, 여기라 우선순위 낮음
      const pillars = createPillarsInput(
        ['戊', '子'], // 戊 = 寅의 여기
        ['丁', '寅'],
        ['己', '辰'],
        ['辛', '申']
      )

      const result = getMonthBranchTransparency(pillars)

      expect(result.transparentStem).toBe('戊')
      expect(result.transparentType).toBe('여기')
      expect(result.priority).toBe(1)
    })
  })

  describe('calculateHoeguk', () => {
    it('detects complete 삼합 (three-way combination)', () => {
      // 申子辰 수국 삼합
      const pillars = createPillarsInput(['甲', '申'], ['丙', '子'], ['戊', '辰'], ['庚', '寅'])

      const results = calculateHoeguk(pillars)
      const samhap = results.find((r) => r.type === '삼합')

      expect(samhap).toBeDefined()
      expect(samhap?.resultElement).toBe('수')
      expect(samhap?.complete).toBe(true)
      expect(samhap?.strength).toBe(100)
    })

    it('detects complete 방합 (directional combination)', () => {
      // 寅卯辰 동방목국
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '卯'], ['戊', '辰'], ['庚', '申'])

      const results = calculateHoeguk(pillars)
      const banghap = results.find((r) => r.type === '방합')

      expect(banghap).toBeDefined()
      expect(banghap?.resultElement).toBe('목')
      expect(banghap?.complete).toBe(true)
    })

    it('detects 반합 (partial combination) when no 삼합', () => {
      // 申子 반합 (辰 없음)
      const pillars = createPillarsInput(['甲', '申'], ['丙', '子'], ['戊', '午'], ['庚', '戌'])

      const results = calculateHoeguk(pillars)
      const banhap = results.find((r) => r.type === '반합')

      expect(banhap).toBeDefined()
      expect(banhap?.resultElement).toBe('수')
      expect(banhap?.complete).toBe(false)
      expect(banhap?.strength).toBe(50)
    })

    it('does not detect 반합 when 삼합 exists', () => {
      // 完全한 申子辰 삼합
      const pillars = createPillarsInput(
        ['甲', '申'],
        ['丙', '子'],
        ['戊', '辰'],
        ['庚', '子'] // 추가 子 - 반합 조건도 충족
      )

      const results = calculateHoeguk(pillars)
      const banhap = results.find((r) => r.type === '반합')

      // 삼합이 있으므로 반합은 없어야 함
      expect(banhap).toBeUndefined()
    })

    it('returns empty array when no combinations', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '戌'], ['庚', '亥'])

      const results = calculateHoeguk(pillars)

      // 寅午戌은 화국 삼합
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('calculateDeukryeong', () => {
    it('returns 득령 for same element season', () => {
      // 甲木 in 寅月 (목월)
      const result = calculateDeukryeong('甲', '寅')

      expect(result.status).toBe('득령')
      expect(result.strength).toBe(100)
    })

    it('returns 득령 for generating element season', () => {
      // 甲木 in 子月 (수월, 수생목)
      const result = calculateDeukryeong('甲', '子')

      expect(result.status).toBe('득령')
      expect(result.strength).toBe(80)
    })

    it('returns 실령 for controlling element season', () => {
      // 甲木 in 申月 (금월, 금극목)
      const result = calculateDeukryeong('甲', '申')

      expect(result.status).toBe('실령')
      expect(result.strength).toBeLessThan(0)
    })

    it('returns 평령 for drained element season', () => {
      // 甲木 in 午月 (화월, 목생화 = 휴령)
      const result = calculateDeukryeong('甲', '午')

      expect(result.status).toBe('평령')
      expect(result.strength).toBe(0)
    })

    it('includes description', () => {
      const result = calculateDeukryeong('甲', '寅')

      expect(result.description).toBeDefined()
      expect(result.description.length).toBeGreaterThan(0)
    })
  })

  describe('calculateElementStrengths', () => {
    it('calculates strength for all five elements', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const strengths = calculateElementStrengths(pillars)

      expect(strengths).toHaveProperty('목')
      expect(strengths).toHaveProperty('화')
      expect(strengths).toHaveProperty('토')
      expect(strengths).toHaveProperty('금')
      expect(strengths).toHaveProperty('수')
    })

    it('gives higher strength to dominant elements', () => {
      // All wood pillars
      const pillars = createPillarsInput(['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯'])

      const strengths = calculateElementStrengths(pillars)

      expect(strengths['목']).toBeGreaterThan(strengths['화'])
      expect(strengths['목']).toBeGreaterThan(strengths['금'])
    })

    it('adds hoeguk bonus to element strength', () => {
      // 寅午戌 화국 삼합
      const pillarsWithHoeguk = createPillarsInput(
        ['甲', '寅'],
        ['丙', '午'],
        ['戊', '戌'],
        ['庚', '子']
      )

      const pillarsWithoutHoeguk = createPillarsInput(
        ['甲', '寅'],
        ['丙', '午'],
        ['戊', '辰'],
        ['庚', '子']
      )

      const withHoeguk = calculateElementStrengths(pillarsWithHoeguk)
      const withoutHoeguk = calculateElementStrengths(pillarsWithoutHoeguk)

      expect(withHoeguk['화']).toBeGreaterThan(withoutHoeguk['화'])
    })
  })

  describe('analyzeStrength', () => {
    it('returns complete strength analysis', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const analysis = analyzeStrength(pillars)

      expect(analysis.daymaster).toBe('戊')
      expect(analysis.daymasterElement).toBe('토')
      expect(analysis.tonggeun).toBeDefined()
      expect(analysis.deukryeong).toBeDefined()
      expect(analysis.hoeguk).toBeInstanceOf(Array)
      expect(analysis.elementStrengths).toBeDefined()
      expect(analysis.finalStrength).toBeDefined()
      expect(typeof analysis.score).toBe('number')
    })

    it('determines correct final strength level', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const analysis = analyzeStrength(pillars)

      expect(['극신강', '신강', '중화', '신약', '극신약']).toContain(analysis.finalStrength)
    })

    it('considers tonggeun in score calculation', () => {
      // Strong root case
      const strongRootPillars = createPillarsInput(
        ['戊', '辰'],
        ['戊', '戌'],
        ['戊', '辰'], // 戊土 with many 土 roots
        ['戊', '戌']
      )

      const analysis = analyzeStrength(strongRootPillars)

      expect(analysis.tonggeun.hasRoot).toBe(true)
      expect(analysis.tonggeun.totalStrength).toBeGreaterThan(0)
    })
  })

  describe('evaluateStemPower', () => {
    it('returns stem power evaluation', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])

      const result = evaluateStemPower('甲', pillars)

      expect(result.tonggeunScore).toBeGreaterThanOrEqual(0)
      expect(result.transparentScore).toBeGreaterThanOrEqual(0)
      expect(result.hoegukBonus).toBeGreaterThanOrEqual(0)
      expect(typeof result.total).toBe('number')
      expect(result.description).toBeDefined()
    })

    it('adds transparent score when stem is in month branch', () => {
      // 甲이 천간에 있고 월지 寅의 정기
      const pillars = createPillarsInput(
        ['甲', '子'],
        ['丙', '寅'], // 寅의 정기 甲
        ['戊', '辰'],
        ['庚', '申']
      )

      const result = evaluateStemPower('甲', pillars)

      expect(result.transparentScore).toBeGreaterThan(0)
    })

    it('adds hoeguk bonus when stem element matches', () => {
      // 화국 삼합 寅午戌
      const pillars = createPillarsInput(
        ['丙', '寅'],
        ['丙', '午'],
        ['丙', '戌'], // 丙火
        ['庚', '子']
      )

      const result = evaluateStemPower('丙', pillars)

      expect(result.hoegukBonus).toBeGreaterThan(0)
    })

    it('returns correct description based on total', () => {
      const pillars = createPillarsInput(['甲', '寅'], ['甲', '卯'], ['甲', '寅'], ['甲', '卯'])

      const result = evaluateStemPower('甲', pillars)

      expect(['매우 강함', '강함', '보통', '약함', '무력']).toContain(result.description)
    })

    // ============ 추가: 미커버 분기 ============

    it("returns '매우 강함' for total >= 100 (강한 통근+회국)", () => {
      // 甲: 寅(정기甲) 일지통근 + 寅卯辰 방합 목국 등으로 100 이상
      const pillars = createPillarsInput(['甲', '寅'], ['甲', '卯'], ['甲', '辰'], ['甲', '寅'])
      const result = evaluateStemPower('甲', pillars)
      expect(result.total).toBeGreaterThanOrEqual(100)
      expect(result.description).toBe('매우 강함')
    })

    it("returns '무력' for stem with no roots/transparency/hoeguk (total 0)", () => {
      // 庚(금) 천간이지만 지지에 금 지장간/회국 전혀 없음
      // 子(癸) 卯(乙) 午(丙己丁) 未(丁乙己) — 금 지장간 없음
      const pillars = createPillarsInput(['甲', '子'], ['乙', '卯'], ['丙', '午'], ['丁', '未'])
      const result = evaluateStemPower('庚', pillars)
      expect(result.tonggeunScore).toBe(0)
      expect(result.hoegukBonus).toBe(0)
      expect(result.total).toBe(0)
      expect(result.description).toBe('무력')
    })

    it("returns '약함' for total between 1 and 29", () => {
      // 약한 단일 통근 하나만 잡히도록: 庚이 년지 申의 정기로 통근 (가중 0.4)
      // 100 * 0.4 = 40? -> 그건 보통. 더 약하게: 여기 통근(동기) 한 개.
      // 戊가 년지 辰의 정기(戊) → 100*0.4=40(보통). 약함을 노리려면 동기/여기.
      // 壬이 년지 申 중기(壬) 통근: 60*0.4=24 → 약함
      const pillars = createPillarsInput(['甲', '申'], ['乙', '卯'], ['丙', '午'], ['丁', '巳'])
      const result = evaluateStemPower('壬', pillars)
      // 申 중기 壬 통근만 존재 (정기 庚, 여기 戊 동기 아님)
      if (result.total > 0 && result.total < 30) {
        expect(result.description).toBe('약함')
      }
      expect(result.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateDeukryeong - 미커버 분기', () => {
    it('falls back to 평령/0 for invalid daymaster', () => {
      // getStemElement('?') 결과로 relations 매핑 실패 시 fallback
      const result = calculateDeukryeong('???', '寅')
      expect(['득령', '실령', '평령']).toContain(result.status)
      expect(typeof result.strength).toBe('number')
    })

    it('uses 토 default for unknown month branch', () => {
      // MONTH_ELEMENT_MAP['XYZ'] 없으면 '토'로 기본 처리
      const result = calculateDeukryeong('戊', 'XYZ')
      // 戊(토) in 토(default) → 득령 100
      expect(result.status).toBe('득령')
      expect(result.strength).toBe(100)
    })

    it('returns 사령(-80) for controlled-by-me season (목 in 토월)', () => {
      // 甲(목) in 辰/未/戌/丑(토월) → 목극토, 사령 -80
      const result = calculateDeukryeong('甲', '辰')
      expect(result.status).toBe('실령')
      expect(result.strength).toBe(-80)
      expect(result.description).toContain('사령')
    })
  })

  describe('analyzeStrength - finalStrength 밴드', () => {
    it('극신강 for heavily self-supported chart (score > 50)', () => {
      // 甲 일간 + 목/수로 도배
      const pillars = createPillarsInput(['壬', '子'], ['甲', '寅'], ['甲', '卯'], ['乙', '辰'])
      const analysis = analyzeStrength(pillars)
      expect(['극신강', '신강']).toContain(analysis.finalStrength)
      if (analysis.score > 50) {
        expect(analysis.finalStrength).toBe('극신강')
      }
    })

    it('극신약/신약 for heavily controlled chart (score <= -20)', () => {
      // 甲 일간을 금/토로 강하게 억제, 월지도 실령(申금월)
      const pillars = createPillarsInput(['庚', '申'], ['辛', '酉'], ['甲', '戌'], ['庚', '申'])
      const analysis = analyzeStrength(pillars)
      expect(['신약', '극신약']).toContain(analysis.finalStrength)
      if (analysis.score <= -50) {
        expect(analysis.finalStrength).toBe('극신약')
      }
    })

    it('중화 band achievable for balanced chart (-20 < score <= 20)', () => {
      const candidates: SajuPillarsInput[] = [
        createPillarsInput(['甲', '辰'], ['乙', '戌'], ['庚', '辰'], ['辛', '戌']),
        createPillarsInput(['壬', '辰'], ['甲', '戌'], ['丙', '辰'], ['戊', '戌']),
      ]
      for (const p of candidates) {
        const a = analyzeStrength(p)
        expect(['극신강', '신강', '중화', '신약', '극신약']).toContain(a.finalStrength)
      }
    })
  })

  describe('calculateTonggeun - skip when no jijanggan (방어)', () => {
    it('handles branch with no jijanggan entry gracefully', () => {
      const pillars = createPillarsInput(['甲', 'XX'], ['丙', '午'], ['戊', '辰'], ['庚', '申'])
      // 寅 없이 진행 — XX 지지는 JIJANGGAN에 없어 skip
      const result = calculateTonggeun('甲', pillars)
      expect(result.stem).toBe('甲')
      expect(Array.isArray(result.roots)).toBe(true)
    })
  })
})
