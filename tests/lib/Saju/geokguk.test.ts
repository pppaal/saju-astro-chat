/**
 * Geokguk (격국) Tests
 * Tests for Korean fortune-telling pattern determination
 */

import {
  determineGeokguk,
  evaluateGeokgukStatus,
  evaluateHwagiGeokguk,
  determineGeokgukAdvanced,
  getStrengthScore,
  type GeokgukType,
  type SajuPillarsInput,
} from '@/lib/saju/geokguk'

// Note: evaluateGeokgukStatus takes (geokguk, pillars) in that order
// Note: evaluateHwagiGeokguk returns { possible, type, conditions, description }

// Helper to create test pillars
function createPillars(
  yearStem: string,
  yearBranch: string,
  monthStem: string,
  monthBranch: string,
  dayStem: string,
  dayBranch: string,
  timeStem: string,
  timeBranch: string
): SajuPillarsInput {
  return {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    time: { stem: timeStem, branch: timeBranch },
  }
}

describe('Geokguk Module', () => {
  describe('determineGeokguk', () => {
    it('returns a valid GeokgukResult structure', () => {
      const pillars = createPillars('甲', '子', '丙', '寅', '戊', '辰', '庚', '午')
      const result = determineGeokguk(pillars)

      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('description')
    })

    it('assigns a category from valid categories', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokguk(pillars)

      const validCategories = ['정격', '종격', '비격', '화기격국', '특수격국', '미정']
      expect(validCategories).toContain(result.category)
    })

    it('assigns confidence level', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokguk(pillars)

      expect(['high', 'medium', 'low']).toContain(result.confidence)
    })

    it('provides description for the geokguk', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokguk(pillars)

      expect(result.description).toBeTruthy()
      expect(typeof result.description).toBe('string')
    })
  })

  describe('evaluateGeokgukStatus', () => {
    it('returns status evaluation object', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const geokguk = determineGeokguk(pillars)
      // Note: evaluateGeokgukStatus takes (geokguk, pillars) in that order
      const status = evaluateGeokgukStatus(geokguk.primary, pillars)

      expect(status).toHaveProperty('status')
      expect(status).toHaveProperty('factors')
      expect(status).toHaveProperty('description')
    })

    it('status is valid value', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const geokguk = determineGeokguk(pillars)
      const status = evaluateGeokgukStatus(geokguk.primary, pillars)

      expect(['성격', '파격', '반성반파']).toContain(status.status)
    })

    it('factors has positive and negative arrays', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const geokguk = determineGeokguk(pillars)
      const status = evaluateGeokgukStatus(geokguk.primary, pillars)

      expect(Array.isArray(status.factors.positive)).toBe(true)
      expect(Array.isArray(status.factors.negative)).toBe(true)
    })
  })

  describe('evaluateHwagiGeokguk', () => {
    it('returns hwagi evaluation object', () => {
      const pillars = createPillars('甲', '子', '己', '丑', '甲', '寅', '己', '卯')
      const result = evaluateHwagiGeokguk(pillars)

      // API returns { possible, type, conditions, description }
      expect(result).toHaveProperty('possible')
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('conditions')
      expect(result).toHaveProperty('description')
    })

    it('possible is boolean', () => {
      const pillars = createPillars('甲', '子', '己', '丑', '甲', '寅', '己', '卯')
      const result = evaluateHwagiGeokguk(pillars)

      expect(typeof result.possible).toBe('boolean')
    })

    it('conditions object has required fields', () => {
      const pillars = createPillars('甲', '子', '己', '丑', '甲', '寅', '己', '卯')
      const result = evaluateHwagiGeokguk(pillars)

      expect(result.conditions).toHaveProperty('hasHap')
      expect(result.conditions).toHaveProperty('isDaymasterPart')
      expect(result.conditions).toHaveProperty('monthSupport')
      expect(result.conditions).toHaveProperty('noBreaker')
    })

    it('detects 갑기화토격 when conditions are met', () => {
      // 甲 and 己 together should trigger hwagi detection
      const pillars = createPillars('甲', '辰', '己', '戌', '甲', '丑', '己', '未')
      const result = evaluateHwagiGeokguk(pillars)

      // Should at least detect the 합 exists
      expect(result.conditions.hasHap).toBe(true)
    })
  })

  describe('determineGeokgukAdvanced', () => {
    it('returns extended GeokgukResult', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      const result = determineGeokgukAdvanced(pillars)

      expect(result).toHaveProperty('primary')
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('description')
    })

    it('handles various pillar combinations', () => {
      const testCases = [
        createPillars('甲', '子', '甲', '子', '甲', '子', '甲', '子'),
        createPillars('乙', '丑', '乙', '丑', '乙', '丑', '乙', '丑'),
        createPillars('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳'),
        createPillars('庚', '申', '辛', '酉', '壬', '戌', '癸', '亥'),
      ]

      for (const pillars of testCases) {
        const result = determineGeokgukAdvanced(pillars)
        expect(result).toBeTruthy()
        expect(result.primary).toBeTruthy()
      }
    })
  })

  describe('determineGeokgukAdvanced — month-branch sweep', () => {
    // Sweep every month branch (incl. 진술축미 잡기 months) so the advanced
    // path exercises both the 성패(statusResult) branch and the 잡기격 branch.
    const monthBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

    for (const mb of monthBranches) {
      it(`returns a coherent result for month branch ${mb}`, () => {
        const pillars = createPillars('甲', '子', '戊', mb, '丙', '寅', '丁', '卯')
        const result = determineGeokgukAdvanced(pillars)

        expect(result.primary).toBeTruthy()
        const validCategories = ['정격', '종격', '비격', '화기격국', '특수격국', '미정']
        expect(validCategories).toContain(result.category)
        expect(['high', 'medium', 'low']).toContain(result.confidence)
      })
    }

    it('attaches statusResult for 정격/비격 outcomes', () => {
      // At least one chart in the sweep should land on 정격 or 비격 and carry
      // a 성패 evaluation; verify the shape when present.
      const pillars = createPillars('甲', '子', '辛', '酉', '甲', '寅', '丙', '午')
      const result = determineGeokgukAdvanced(pillars)
      if (result.category === '정격' || result.category === '비격') {
        expect(result.statusResult).toBeDefined()
        expect(['성격', '파격', '반성반파']).toContain(result.statusResult?.status)
      } else {
        expect(result).toHaveProperty('primary')
      }
    })
  })

  describe('getStrengthScore', () => {
    it('returns a number within the 0–100 band', () => {
      const pillars = createPillars('甲', '寅', '甲', '寅', '甲', '寅', '甲', '寅')
      const score = getStrengthScore(pillars)
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('is deterministic for the same input', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')
      expect(getStrengthScore(pillars)).toBe(getStrengthScore(pillars))
    })

    it('scores a self-reinforcing chart higher than a drained one', () => {
      // day master 甲(목): a chart full of 목/수 (비겁·인성) should be stronger
      // than one surrounded by 금(관성) which controls 목.
      const strong = createPillars('甲', '寅', '甲', '寅', '甲', '寅', '甲', '寅')
      const weak = createPillars('庚', '申', '庚', '申', '甲', '申', '庚', '申')
      expect(getStrengthScore(strong)).toBeGreaterThan(getStrengthScore(weak))
    })
  })

  describe('Edge cases', () => {
    it('produces consistent results for same input', () => {
      const pillars = createPillars('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯')

      const result1 = determineGeokguk(pillars)
      const result2 = determineGeokguk(pillars)

      expect(result1.primary).toBe(result2.primary)
      expect(result1.category).toBe(result2.category)
      expect(result1.confidence).toBe(result2.confidence)
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // 특수격국 (한 오행 ≥ 6 + 일간 동일 오행) — 5종 전부
  // ───────────────────────────────────────────────────────────────────────
  describe('특수격국 (전 5종)', () => {
    it('곡직격 — 목 일간, 목 압도', () => {
      const p = createPillars('甲', '寅', '乙', '卯', '甲', '寅', '乙', '卯')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('곡직격')
      expect(r.category).toBe('특수격국')
      expect(r.confidence).toBe('high')
      expect(r.yongsin).toBe('같은 오행 강화')
    })

    it('염상격 — 화 일간, 화 압도', () => {
      const p = createPillars('丙', '午', '丁', '巳', '丙', '午', '丁', '巳')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('염상격')
      expect(r.category).toBe('특수격국')
    })

    it('가색격 — 토 일간, 토 압도', () => {
      const p = createPillars('戊', '辰', '己', '丑', '戊', '戌', '己', '未')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('가색격')
      expect(r.category).toBe('특수격국')
    })

    it('종혁격 — 금 일간, 금 압도', () => {
      const p = createPillars('庚', '申', '辛', '酉', '庚', '申', '辛', '酉')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('종혁격')
      expect(r.category).toBe('특수격국')
    })

    it('윤하격 — 수 일간, 수 압도', () => {
      const p = createPillars('壬', '子', '癸', '亥', '壬', '子', '癸', '亥')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('윤하격')
      expect(r.category).toBe('특수격국')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // 종격 — 흐름(weight 기반) 판정 + 극신강 임계 판정
  // ───────────────────────────────────────────────────────────────────────
  describe('종격 (從格)', () => {
    it('종재격 — 약한 일간이 재성(토)을 따름 (weight<30)', () => {
      const p = createPillars('戊', '戌', '庚', '酉', '甲', '戌', '戊', '申')
      const r = determineGeokguk(p)
      expect(getStrengthScore(p)).toBeLessThan(30)
      expect(r.primary).toBe('종재격')
      expect(r.category).toBe('종격')
      expect(r.yongsin).toBe('강한 오행 따름')
    })

    it('종살격 — 약한 일간이 관성(금)을 따름 (weight<30)', () => {
      const p = createPillars('庚', '戌', '辛', '酉', '甲', '酉', '庚', '戌')
      const r = determineGeokguk(p)
      expect(getStrengthScore(p)).toBeLessThan(30)
      expect(r.primary).toBe('종살격')
      expect(r.category).toBe('종격')
    })

    it('종아격 — 약한 일간이 식상(화)을 따름 (weight<30)', () => {
      const p = createPillars('丙', '巳', '丙', '戌', '甲', '午', '戊', '戌')
      const r = determineGeokguk(p)
      expect(getStrengthScore(p)).toBeLessThan(30)
      expect(r.primary).toBe('종아격')
      expect(r.category).toBe('종격')
    })

    it('종강격 — 극신강 + 인성 우세 (극신강 임계 arm)', () => {
      const p = createPillars('乙', '午', '己', '午', '己', '未', '丁', '巳')
      const r = determineGeokguk(p)
      expect(getStrengthScore(p)).toBeGreaterThanOrEqual(80)
      expect(r.primary).toBe('종강격')
      expect(r.category).toBe('종격')
      expect(r.yongsin).toBe('비겁/인성')
    })

    it('종왕격 — 강한 일간이 비겁 흐름으로 종 (weight>70 흐름 arm)', () => {
      const p = createPillars('庚', '子', '丁', '卯', '壬', '子', '癸', '酉')
      const r = determineGeokguk(p)
      expect(getStrengthScore(p)).toBeGreaterThan(70)
      expect(r.primary).toBe('종왕격')
      expect(r.category).toBe('종격')
      expect(r.yongsin).toBe('비겁/인성')
    })

    it('화기 흐름 — checkJonggyeok 내부 化氣 흐름(갑기화토)이 종격으로 분류', () => {
      // 일간 甲 + 인접 월간 己 천간합, 화한 토가 우세, 파합(목) ≤1 → 화기 흐름
      const p = createPillars('戊', '戌', '己', '戌', '甲', '戌', '己', '戌')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('갑기화토격')
      expect(r.category).toBe('종격')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // 비격 — 건록격 / 양인격 / 월겁격
  // ───────────────────────────────────────────────────────────────────────
  describe('비격 (建祿/羊刃/月劫)', () => {
    it('건록격 — 월지가 일간의 록지 (甲→寅)', () => {
      const p = createPillars('辛', '酉', '庚', '寅', '甲', '寅', '戊', '辰')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('건록격')
      expect(r.category).toBe('비격')
      expect(r.yongsin).toBe('재성 또는 관성')
      expect(r.gisin).toBe('비겁/인성')
    })

    it('양인격 — 월지가 일간의 양인지 (甲→卯)', () => {
      const p = createPillars('辛', '酉', '丁', '卯', '甲', '辰', '戊', '辰')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('양인격')
      expect(r.category).toBe('비격')
    })

    it('월겁격 — 월지 정기가 겁재 (乙 일간 + 寅월 정기 甲)', () => {
      const p = createPillars('甲', '子', '戊', '寅', '乙', '丑', '庚', '午')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('월겁격')
      expect(r.category).toBe('비격')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // 화기격국 — checkHwagiGeokguk 경유 (종/비격/특수 모두 미해당)
  // ───────────────────────────────────────────────────────────────────────
  describe('화기격국 (checkHwagiGeokguk)', () => {
    it('갑기화토격 — 천간합이 화하는 격국 (medium confidence)', () => {
      const p = createPillars('甲', '卯', '壬', '寅', '己', '巳', '甲', '巳')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('갑기화토격')
      expect(r.category).toBe('화기격국')
      expect(r.confidence).toBe('medium')
      expect(r.yongsin).toBe('화한 오행')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // 정격 — 월지 지장간 투출 + 신강/중화/신약 용신·기신 분기
  // ───────────────────────────────────────────────────────────────────────
  describe('정격 (월령 투출) 강약별 용신', () => {
    it('정격 신강 — 용신 재성/관성/식상, 기신 비겁/인성', () => {
      const p = createPillars('甲', '寅', '丙', '巳', '甲', '寅', '壬', '子')
      const r = determineGeokguk(p)
      expect(r.category).toBe('정격')
      expect(r.primary).toBe('식신격')
      expect(getStrengthScore(p)).toBeGreaterThanOrEqual(60)
      expect(r.yongsin).toBe('재성/관성/식상')
      expect(r.gisin).toBe('비겁/인성')
    })

    it('정격 신약 — 용신 인성/비겁, 기신 재성/관성/식상', () => {
      const p = createPillars('庚', '申', '辛', '酉', '甲', '申', '庚', '戌')
      const r = determineGeokguk(p)
      expect(r.category).toBe('정격')
      expect(getStrengthScore(p)).toBeLessThan(40)
      expect(r.yongsin).toBe('인성/비겁')
      expect(r.gisin).toBe('재성/관성/식상')
    })

    it('정격 중화 — 용신 "격국에 맞는 용신", 기신 빈 문자열', () => {
      const p = createPillars('辛', '未', '丁', '丑', '丁', '申', '己', '戌')
      const r = determineGeokguk(p)
      expect(r.category).toBe('정격')
      const score = getStrengthScore(p)
      expect(score).toBeGreaterThanOrEqual(40)
      expect(score).toBeLessThan(60)
      expect(r.yongsin).toBe('격국에 맞는 용신')
      expect(r.gisin).toBe('')
    })

    it('여기(餘氣) 투출 — 정기/중기 미투출 시 여기로 격 형성 (편인격)', () => {
      // 庚 일간 + 寅월(여기 戊·중기 丙·정기 甲). 정기 甲·중기 丙 미투출, 여기 戊 투출.
      const p = createPillars('戊', '子', '辛', '寅', '庚', '辰', '壬', '午')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('편인격')
      expect(r.category).toBe('정격')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // 미정 / 잡기격 — fallback 경로
  // ───────────────────────────────────────────────────────────────────────
  describe('미정 / 잡기격', () => {
    it('미정 — 어떤 격에도 해당하지 않을 때', () => {
      // 월지가 록/양인/비겁 아님, 정기·중·여기 투출이 비겁뿐이라 투출 없음
      const p = createPillars('丙', '午', '丙', '申', '甲', '午', '丁', '午')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('미정')
      expect(r.category).toBe('미정')
      expect(r.confidence).toBe('low')
    })

    it('잡기격 — 진술축미월 정기 미투출, 중기/여기 투출 (advanced 경로)', () => {
      const p = createPillars('乙', '巳', '丁', '辰', '乙', '亥', '丁', '戌')
      expect(determineGeokguk(p).primary).toBe('미정')
      const adv = determineGeokgukAdvanced(p)
      expect(adv.primary).toBe('잡기격')
      expect(adv.category).toBe('비격')
      expect(adv.confidence).toBe('medium')
      expect(adv.yongsin).toBe('투출된 십성에 따라 결정')
    })

    it('잡기격 — 여기(餘氣)만 투출한 진술축미월', () => {
      const p = createPillars('癸', '卯', '丁', '未', '丁', '酉', '戊', '戌')
      expect(determineGeokguk(p).primary).toBe('미정')
      expect(determineGeokgukAdvanced(p).primary).toBe('잡기격')
    })

    it('invalid 월지 — 지장간 없는 가지에서 미정으로 안전 폴백', () => {
      const p = createPillars('甲', '子', '丙', 'XX', '甲', '寅', '戊', '午')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('미정')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // evaluateGeokgukStatus — 격국별 성패 switch 전 arm
  // ───────────────────────────────────────────────────────────────────────
  describe('evaluateGeokgukStatus — 격국별 성패 분기', () => {
    it('식신격 성격 — 식신 존재 + 편인 없음', () => {
      const p = createPillars('丙', '子', '丙', '寅', '甲', '辰', '戊', '午')
      const r = evaluateGeokgukStatus('식신격', p)
      expect(r.status).toBe('성격')
      expect(r.factors.positive).toContain('식신 존재')
      expect(r.factors.positive).toContain('편인(도식) 없음')
      expect(r.factors.negative).toEqual([])
      expect(r.description).toBe('격국이 순수하게 성립하여 길한 작용')
    })

    it('식신격 파격 — 편인(도식) + 편관 과다', () => {
      const p = createPillars('壬', '申', '庚', '申', '甲', '辰', '庚', '午')
      const r = evaluateGeokgukStatus('식신격', p)
      expect(r.status).toBe('파격')
      expect(r.factors.negative).toContain('편인(도식)이 식신을 극함')
      expect(r.factors.negative).toContain('편관 과다로 식신 소모')
      expect(r.description).toBe('격국이 파손되어 흉한 작용 가능')
    })

    it('상관격 — 상관견관 발생 (반성반파)', () => {
      const p = createPillars('丁', '卯', '辛', '酉', '甲', '午', '丁', '午')
      const r = evaluateGeokgukStatus('상관격', p)
      expect(r.status).toBe('반성반파')
      expect(r.factors.positive).toContain('상관 존재')
      expect(r.factors.positive).toContain('편인 없어 상관 보존')
      expect(r.factors.negative).toContain('상관견관 - 관성 손상')
      expect(r.description).toBe('격국이 부분적으로 성립, 희기 혼재')
    })

    it('편재격 — 비겁 분탈 + 관성 제어', () => {
      const p = createPillars('甲', '寅', '庚', '申', '甲', '寅', '戊', '辰')
      const r = evaluateGeokgukStatus('편재격', p)
      expect(r.factors.positive).toContain('편재 존재')
      expect(r.factors.positive).toContain('관성이 비겁 제어')
      expect(r.factors.negative).toContain('비겁 과다로 재성 분탈')
    })

    it('정재격 — 겁재 분탈 + 관성 제어', () => {
      const p = createPillars('乙', '卯', '辛', '酉', '甲', '子', '己', '未')
      const r = evaluateGeokgukStatus('정재격', p)
      expect(r.factors.positive).toContain('정재 존재')
      expect(r.factors.positive).toContain('관성이 비겁 제어')
      expect(r.factors.negative).toContain('겁재 과다로 재성 분탈')
    })

    it('편관격 — 식신제살 + 편인 파괴', () => {
      const p = createPillars('庚', '申', '丙', '寅', '甲', '子', '壬', '子')
      const r = evaluateGeokgukStatus('편관격', p)
      expect(r.factors.positive).toContain('편관 존재')
      expect(r.factors.positive).toContain('식신이 편관 제어(식신제살)')
      expect(r.factors.negative).toContain('편인이 식신 파괴')
    })

    it('정관격 — 관살혼잡 + 상관견관 + 인성 보호', () => {
      const p = createPillars('辛', '酉', '庚', '申', '甲', '子', '丁', '卯')
      const r = evaluateGeokgukStatus('정관격', p)
      expect(r.factors.positive).toContain('정관 존재')
      expect(r.factors.positive).toContain('인성 보호')
      expect(r.factors.negative).toContain('관살혼잡')
      expect(r.factors.negative).toContain('상관견관')
    })

    it('편인격 — 재성 파괴', () => {
      const p = createPillars('壬', '子', '戊', '辰', '甲', '子', '戊', '辰')
      const r = evaluateGeokgukStatus('편인격', p)
      expect(r.factors.positive).toContain('편인 존재')
      expect(r.factors.negative).toContain('재성이 인성 파괴')
    })

    it('정인격 — 관인상생 + 재성 파괴', () => {
      const p = createPillars('癸', '子', '己', '丑', '甲', '子', '辛', '酉')
      const r = evaluateGeokgukStatus('정인격', p)
      expect(r.factors.positive).toContain('정인 존재')
      expect(r.factors.positive).toContain('관인상생')
      expect(r.factors.negative).toContain('재성이 인성 파괴')
    })

    it('건록격(비격 arm) — 관성/재성 설기 → 성격', () => {
      const p = createPillars('辛', '酉', '庚', '申', '甲', '寅', '戊', '辰')
      const r = evaluateGeokgukStatus('건록격', p)
      expect(r.status).toBe('성격')
      expect(r.factors.positive).toContain('관성이 비겁 제어')
      expect(r.factors.positive).toContain('재성으로 설기')
    })

    it('편관격 칠살 과다 — 편관≥3 + 식신 0', () => {
      const p = createPillars('庚', '申', '庚', '酉', '甲', '申', '庚', '酉')
      const r = evaluateGeokgukStatus('편관격', p)
      expect(r.factors.negative).toContain('칠살 과다, 제어 없음')
    })

    it('비격 비겁 과다 — 비견+겁재 ≥ 4', () => {
      const p = createPillars('甲', '寅', '乙', '卯', '甲', '寅', '乙', '卯')
      const r = evaluateGeokgukStatus('양인격', p)
      expect(r.factors.negative).toContain('비겁 과다로 재성 분탈 위험')
    })

    it('default arm — 알 수 없는 격국은 "기타 격국"', () => {
      const p = createPillars('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯')
      const r = evaluateGeokgukStatus('미정', p)
      expect(r.status).toBe('반성반파')
      expect(r.factors.positive).toContain('기타 격국')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // evaluateHwagiGeokguk — 성립/미성립 4조건 전부
  // ───────────────────────────────────────────────────────────────────────
  describe('evaluateHwagiGeokguk — 4조건 분기', () => {
    it('을경화금격 성립 — 4조건 모두 충족', () => {
      const p = createPillars('己', '丑', '乙', '酉', '庚', '戌', '戊', '辰')
      const r = evaluateHwagiGeokguk(p)
      expect(r.possible).toBe(true)
      expect(r.type).toBe('을경화금격')
      expect(r.conditions).toEqual({
        hasHap: true,
        isDaymasterPart: true,
        monthSupport: true,
        noBreaker: true,
      })
      expect(r.description).toContain('성립')
    })

    it('병신화수격 성립 — 4조건 모두 충족', () => {
      const p = createPillars('甲', '寅', '丙', '子', '辛', '酉', '壬', '子')
      const r = evaluateHwagiGeokguk(p)
      expect(r.possible).toBe(true)
      expect(r.type).toBe('병신화수격')
    })

    it('파합 요소 존재 — noBreaker=false면 미성립', () => {
      // 甲己화토, 파합(목) 2개 이상
      const p = createPillars('甲', '寅', '己', '辰', '甲', '寅', '乙', '卯')
      const r = evaluateHwagiGeokguk(p)
      expect(r.possible).toBe(false)
      expect(r.type).toBeNull()
      expect(r.conditions.noBreaker).toBe(false)
      expect(r.description).toContain('파합 요소 존재')
    })

    it('일간 미포함 — isDaymasterPart=false면 미성립', () => {
      const p = createPillars('乙', '子', '庚', '申', '丙', '寅', '丁', '卯')
      const r = evaluateHwagiGeokguk(p)
      expect(r.conditions.hasHap).toBe(true)
      expect(r.conditions.isDaymasterPart).toBe(false)
      expect(r.possible).toBe(false)
      expect(r.description).toContain('일간이 합에 미포함')
    })

    it('월령 미지지 — monthSupport=false면 미성립', () => {
      const p = createPillars('甲', '子', '己', '子', '甲', '寅', '己', '卯')
      const r = evaluateHwagiGeokguk(p)
      expect(r.conditions.monthSupport).toBe(false)
      expect(r.possible).toBe(false)
      expect(r.description).toContain('월령 미지지')
    })

    it('천간합 없음 — 빈 조건 반환', () => {
      const p = createPillars('甲', '子', '甲', '子', '甲', '寅', '甲', '午')
      const r = evaluateHwagiGeokguk(p)
      expect(r.possible).toBe(false)
      expect(r.type).toBeNull()
      expect(r.conditions).toEqual({
        hasHap: false,
        isDaymasterPart: false,
        monthSupport: false,
        noBreaker: false,
      })
      expect(r.description).toBe('천간합 없음')
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // determineGeokgukAdvanced — statusResult 부착 검증
  // ───────────────────────────────────────────────────────────────────────
  describe('determineGeokgukAdvanced — statusResult 부착', () => {
    it('정격 결과에는 statusResult 부착', () => {
      const p = createPillars('甲', '寅', '丙', '巳', '甲', '寅', '壬', '子')
      const r = determineGeokgukAdvanced(p)
      expect(r.category).toBe('정격')
      expect(r.statusResult).toBeDefined()
      expect(['성격', '파격', '반성반파']).toContain(r.statusResult?.status)
    })

    it('비격 결과에도 statusResult 부착', () => {
      const p = createPillars('辛', '酉', '庚', '寅', '甲', '寅', '戊', '辰')
      const r = determineGeokgukAdvanced(p)
      expect(r.category).toBe('비격')
      expect(r.statusResult).toBeDefined()
    })

    it('종격/특수격국 결과에는 statusResult 미부착', () => {
      const p = createPillars('甲', '寅', '乙', '卯', '甲', '寅', '乙', '卯')
      const r = determineGeokgukAdvanced(p)
      expect(r.category).toBe('특수격국')
      expect((r as { statusResult?: unknown }).statusResult).toBeUndefined()
    })
  })

  // ───────────────────────────────────────────────────────────────────────
  // getStrengthScore — 임계 라벨 경계
  // ───────────────────────────────────────────────────────────────────────
  describe('getStrengthScore — 극단/경계', () => {
    it('극신강 차트는 80 이상', () => {
      const p = createPillars('乙', '午', '己', '午', '己', '未', '丁', '巳')
      expect(getStrengthScore(p)).toBeGreaterThanOrEqual(80)
    })

    it('극히 신약한 차트도 0 미만으로 내려가지 않음 (clamp)', () => {
      const p = createPillars('庚', '酉', '辛', '酉', '甲', '酉', '辛', '酉')
      const s = getStrengthScore(p)
      expect(s).toBeGreaterThanOrEqual(0)
    })
  })
})
