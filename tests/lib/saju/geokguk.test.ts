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
import { calculateSajuData } from '@/lib/saju/saju'

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

    it('종재격 — 일간 甲 무근 + 土 재성 도배 → 강한 오행(土) 따름', () => {
      // 강약 SSOT 재균형(2026) 후: 甲 무근에 土(재성)가 도배되면 극신약→종격이
      // 화기(갑기화토)보다 우선 잡혀 종재격(적천수 從財 흐름). 이전엔 강약 편향으로
      // 극단까지 못 내려가 화기격으로 빠졌다.
      const p = createPillars('戊', '戌', '己', '戌', '甲', '戌', '己', '戌')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('종재격')
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
  // 화기격국 — evaluateHwagiGeokguk 엄격 규칙 (종격 다음, 비격·정격 전)
  // ───────────────────────────────────────────────────────────────────────
  describe('화기격국 (evaluateHwagiGeokguk 엄격 규칙)', () => {
    it('갑기화토격 — 천간합이 화하는 격국 (medium confidence)', () => {
      // 甲 일간 + 월간 己(인접) + 丑월(토 월령) + 천간 목 1개(일간뿐) + 토 우세
      const p = createPillars('丙', '子', '己', '丑', '甲', '申', '戊', '寅')
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
      // 甲 일간이 金 관살에 눌려 신약이되, 壬子(수 인성)로 한 뿌리는 있어 극신약
      // (종격)까지는 안 가는 *적당히* 신약한 정격(정관격). 강약 재균형 후에도 정격 유지.
      const p = createPillars('庚', '申', '辛', '酉', '甲', '申', '壬', '子')
      const r = determineGeokguk(p)
      expect(r.category).toBe('정격')
      expect(getStrengthScore(p)).toBeLessThan(40)
      expect(r.yongsin).toBe('인성/비겁')
      expect(r.gisin).toBe('재성/관성/식상')
    })

    it('정격 중화 — 용신 "격국에 맞는 용신", 기신 빈 문자열', () => {
      // E4 중심 보정 후 辛未 丁丑 丁申 己戌 은 30(신약). 중화(40~59) 정격으로 교체.
      const p = createPillars('甲', '子', '壬', '辰', '庚', '戌', '癸', '未')
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
    it('월령 용사 — 투출 없으면 월지 본기로 정격을 잡고 fallback 표시', () => {
      // CONVENTIONS §9: 투출이 없어도 월지 본기 십신으로 격을 정한다(월령 용사).
      // 월지 申 본기 庚 = (甲 일간 기준) 편관 → 편관격. 표시용 폴백(타이밍 신호 제외).
      // 庚 미투출 + 중화권(극단 아님)이라 강약 재균형 후에도 종격으로 빠지지 않는다.
      const p = createPillars('乙', '卯', '丙', '申', '甲', '午', '乙', '丑')
      const r = determineGeokguk(p)
      expect(r.primary).toBe('편관격')
      expect(r.category).toBe('정격')
      expect(r.confidence).toBe('medium')
      expect(r.fallback).toBe(true)
    })

    it('잡기격 — 진술축미월 정기 미투출, 중기/여기 투출 (basic·advanced 모두)', () => {
      // 리포트는 basic determineGeokguk 을 쓰므로 잡기격을 basic 에서도 잡는다.
      const p = createPillars('乙', '巳', '丁', '辰', '乙', '亥', '丁', '戌')
      expect(determineGeokguk(p).primary).toBe('잡기격')
      const adv = determineGeokgukAdvanced(p)
      expect(adv.primary).toBe('잡기격')
      expect(adv.category).toBe('비격')
      expect(adv.confidence).toBe('medium')
      expect(adv.yongsin).toBe('투출된 십성에 따라 결정')
    })

    it('잡기격 — 여기(餘氣)만 투출한 진술축미월', () => {
      const p = createPillars('癸', '卯', '丁', '未', '丁', '酉', '戊', '戌')
      expect(determineGeokguk(p).primary).toBe('잡기격')
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
  describe('evaluateHwagiGeokguk — 6조건 분기', () => {
    it('을경화금격 성립 — 6조건 모두 충족', () => {
      // 庚 일간 + 월간 乙(인접) + 酉월 + 천간 화 0 + 금(庚辛 + 丑酉申巳 지장간) 6
      const p = createPillars('己', '丑', '乙', '酉', '庚', '申', '辛', '巳')
      const r = evaluateHwagiGeokguk(p)
      expect(r.possible).toBe(true)
      expect(r.type).toBe('을경화금격')
      expect(r.conditions).toEqual({
        hasHap: true,
        isDaymasterPart: true,
        adjacentPartner: true,
        monthSupport: true,
        noBreaker: true,
        dominant: true,
      })
      expect(r.description).toContain('성립')
    })

    it('화신 미약 — 금이 천간+지장간 4 뿐이면 미성립 (dominant=false)', () => {
      // 己丑 乙酉 庚戌 戊辰: 庚 + 丑·酉·戌 의 辛 = 4 < 5
      const p = createPillars('己', '丑', '乙', '酉', '庚', '戌', '戊', '辰')
      const r = evaluateHwagiGeokguk(p)
      expect(r.conditions.dominant).toBe(false)
      expect(r.possible).toBe(false)
      expect(r.description).toContain('화신 오행 미약')
    })

    it('합 상대가 년간뿐 — adjacentPartner=false면 미성립 (年干 은 멀다)', () => {
      // 辛酉 乙未 丙辰 戊戌: 丙 일간의 합 상대 辛 이 년간에만 (감사 SD-03 재현)
      const p = createPillars('辛', '酉', '乙', '未', '丙', '辰', '戊', '戌')
      const r = evaluateHwagiGeokguk(p)
      expect(r.conditions.isDaymasterPart).toBe(true)
      expect(r.conditions.adjacentPartner).toBe(false)
      expect(r.possible).toBe(false)
      expect(r.description).toContain('합 상대가 월간·시간에 없음')
    })

    it('일간의 합을 우선 평가 — 다른 합이 앞에 있어도 일간 합의 조건을 본다', () => {
      // 甲·己(일간 무관) 와 丙·辛(일간 丙) 이 함께: 丙辛 을 평가해야 한다
      const p = createPillars('甲', '亥', '辛', '子', '丙', '子', '己', '亥')
      const r = evaluateHwagiGeokguk(p)
      expect(r.conditions.isDaymasterPart).toBe(true)
      expect(r.description).toContain('병신화수격')
    })

    it('병신화수격 성립 — 6조건 모두 충족', () => {
      // 辛 일간 + 월간 丙(인접) + 子월 + 천간 토 0 + 수(壬癸 + 子子亥 지장간) 5
      const p = createPillars('壬', '子', '丙', '子', '辛', '亥', '癸', '巳')
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
        adjacentPartner: false,
        monthSupport: false,
        noBreaker: false,
        dominant: false,
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

// ───────────────────────────────────────────────────────────────────────────
// 엔진 감사 E4 — 화기격국은 엄격 규칙에서만 (SD-03)
// ───────────────────────────────────────────────────────────────────────────

const gzPillars = (gz: string): SajuPillarsInput => {
  const p = gz.split(' ')
  return createPillars(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1])
}
const HWAGI_NAMES = ['갑기화토격', '을경화금격', '병신화수격', '정임화목격', '무계화화격']
const PARTNER: Record<string, string> = {
  甲: '己',
  己: '甲',
  乙: '庚',
  庚: '乙',
  丙: '辛',
  辛: '丙',
  丁: '壬',
  壬: '丁',
  戊: '癸',
  癸: '戊',
}

describe('E4 화기격국 — 감사 재현 (SD-03)', () => {
  it('壬辰 乙巳 壬申 丁未 → 화기격국 아님 (丁壬→木 인데 巳월은 화)', () => {
    const g = determineGeokguk(gzPillars('壬辰 乙巳 壬申 丁未'))
    expect(g.category).not.toBe('화기격국')
    expect(g.primary).not.toBe('정임화목격')
  })

  it('辛酉 乙未 丙辰 戊戌 → 병신화수격 아님 (합 상대 辛 이 년간에만)', () => {
    const g = determineGeokguk(gzPillars('辛酉 乙未 丙辰 戊戌'))
    expect(g.primary).not.toBe('병신화수격')
    expect(g.category).not.toBe('화기격국')
  })

  it('甲寅 戊辰 癸未 辛酉 → 무계화화격 아님 (辰월은 화를 지지하지 않음)', () => {
    expect(determineGeokguk(gzPillars('甲寅 戊辰 癸未 辛酉')).primary).not.toBe('무계화화격')
  })
})

describe('E4 화기격국 — 시드 400 실제 생일 불변식', () => {
  let seed = 12345
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const pad = (x: number) => String(x).padStart(2, '0')
  const now = new Date('2026-11-24T00:00:00Z')
  const charts: SajuPillarsInput[] = []
  for (let i = 0; i < 400; i++) {
    const date = `${1941 + Math.floor(rnd() * 108)}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`
    const time = `${pad(Math.floor(rnd() * 24))}:${pad(Math.floor(rnd() * 60))}`
    const gender = rnd() < 0.5 ? 'male' : 'female'
    const raw = calculateSajuData(
      date,
      time,
      gender,
      'solar',
      'Asia/Seoul',
      false,
      126.978,
      now
    ) as unknown as {
      pillars: Record<string, { heavenlyStem: { name: string }; earthlyBranch: { name: string } }>
    }
    const P = raw.pillars
    const pick = (k: string) => ({ stem: P[k].heavenlyStem.name, branch: P[k].earthlyBranch.name })
    charts.push({ year: pick('year'), month: pick('month'), day: pick('day'), time: pick('time') })
  }
  const results = charts.map((p) => ({ p, g: determineGeokguk(p) }))

  it('화기격국 ⇒ evaluateHwagiGeokguk.possible + 합 상대가 인접 월간/시간', () => {
    for (const { p, g } of results.filter((x) => x.g.category === '화기격국')) {
      const h = evaluateHwagiGeokguk(p)
      expect(h.possible).toBe(true)
      expect(h.type).toBe(g.primary)
      const partner = PARTNER[p.day.stem]
      expect(p.month.stem === partner || p.time.stem === partner).toBe(true)
    }
  })

  it('化氣 이름은 category 화기격국 으로만 나온다 (종격으로 새지 않음)', () => {
    const leaked = results.filter(
      ({ g }) => HWAGI_NAMES.includes(g.primary) && g.category !== '화기격국'
    )
    expect(leaked.map(({ g }) => `${g.primary}/${g.category}`)).toEqual([])
  })

  it('화기격국 비율 < 3% — 예전 느슨한 판정은 약 20%', () => {
    const n = results.filter(({ g }) => g.category === '화기격국').length
    expect(n / results.length).toBeLessThan(0.03)
  })
})
