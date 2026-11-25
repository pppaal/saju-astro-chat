/**
 * Tests for Saju relations.ts
 * Pillar relationship analysis: 천간합/충, 지지육합/충/형/파/해/원진, 삼합, 방합, 공망
 */

import {
  normalizeBranchName,
  analyzeRelations,
  toAnalyzeInputFromSaju,
  DEFAULT_RELATION_OPTIONS,
  type PillarInput,
  type AnalyzeRelationsOptions,
} from '@/lib/saju/relations'
import { STEM_CLASH_MODE, THREE_HARMONY, DIRECTIONAL_HARMONY } from '@/lib/saju/relationTables'
import { calculateSajuData } from '@/lib/saju/saju'

// Helper to create pillar input
function makePillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): PillarInput {
  return {
    year: { heavenlyStem: year[0], earthlyBranch: year[1] },
    month: { heavenlyStem: month[0], earthlyBranch: month[1] },
    day: { heavenlyStem: day[0], earthlyBranch: day[1] },
    time: { heavenlyStem: time[0], earthlyBranch: time[1] },
  }
}

describe('relations.ts', () => {
  describe('normalizeBranchName', () => {
    it('converts Korean to Chinese characters', () => {
      expect(normalizeBranchName('자')).toBe('子')
      expect(normalizeBranchName('축')).toBe('丑')
      expect(normalizeBranchName('인')).toBe('寅')
      expect(normalizeBranchName('묘')).toBe('卯')
      expect(normalizeBranchName('진')).toBe('辰')
      expect(normalizeBranchName('사')).toBe('巳')
      expect(normalizeBranchName('오')).toBe('午')
      expect(normalizeBranchName('미')).toBe('未')
      expect(normalizeBranchName('신')).toBe('申')
      expect(normalizeBranchName('유')).toBe('酉')
      expect(normalizeBranchName('술')).toBe('戌')
      expect(normalizeBranchName('해')).toBe('亥')
    })

    it('returns Chinese characters unchanged', () => {
      expect(normalizeBranchName('子')).toBe('子')
      expect(normalizeBranchName('午')).toBe('午')
      expect(normalizeBranchName('酉')).toBe('酉')
    })

    it('handles empty or null input', () => {
      expect(normalizeBranchName('')).toBe('')
      expect(normalizeBranchName(null as unknown as string)).toBe('')
      expect(normalizeBranchName(undefined as unknown as string)).toBe('')
    })

    it('trims whitespace', () => {
      expect(normalizeBranchName(' 자 ')).toBe('子')
      expect(normalizeBranchName('  子  ')).toBe('子')
    })
  })

  describe('DEFAULT_RELATION_OPTIONS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_RELATION_OPTIONS.includeHeavenly).toBe(true)
      expect(DEFAULT_RELATION_OPTIONS.includeEarthly).toBe(true)
      expect(DEFAULT_RELATION_OPTIONS.includeGongmang).toBe(true)
      expect(DEFAULT_RELATION_OPTIONS.includeHeavenlyTransformNote).toBe(true)
      expect(DEFAULT_RELATION_OPTIONS.includeTrineElementNote).toBe(true)
      expect(DEFAULT_RELATION_OPTIONS.includeSelfPunish).toBe(true)
      expect(DEFAULT_RELATION_OPTIONS.gongmangPolicy).toBe('dayPillar-60jiazi')
      // 엔진 공통 천간충 모드(STEM_CLASH_MODE) — 운·캘린더·궁합과 같은 4쌍 (SD-11)
      expect(DEFAULT_RELATION_OPTIONS.heavenlyClashMode).toBe(STEM_CLASH_MODE)
      expect(DEFAULT_RELATION_OPTIONS.heavenlyClashMode).toBe('4')
    })
  })

  describe('analyzeRelations - Heavenly Stem Relations (천간)', () => {
    describe('천간합 (Heavenly Combines)', () => {
      it('detects 甲-己 합 (transforms to 토)', () => {
        const pillars = makePillars(
          ['甲', '子'], // year
          ['己', '丑'], // month
          ['丙', '寅'], // day
          ['丁', '卯'] // time
        )
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '천간합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('甲-己')
        expect(combine?.detail).toContain('합화토')
      })

      it('detects 乙-庚 합 (transforms to 금)', () => {
        const pillars = makePillars(['乙', '子'], ['庚', '丑'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '천간합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('합화금')
      })

      it('detects 丙-辛 합 (transforms to 수)', () => {
        const pillars = makePillars(['丙', '子'], ['辛', '丑'], ['戊', '寅'], ['己', '卯'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '천간합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('합화수')
      })

      it('detects 丁-壬 합 (transforms to 목)', () => {
        const pillars = makePillars(['丁', '子'], ['壬', '丑'], ['甲', '寅'], ['乙', '卯'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '천간합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('합화목')
      })

      it('detects 戊-癸 합 (transforms to 화)', () => {
        const pillars = makePillars(['戊', '子'], ['癸', '丑'], ['甲', '寅'], ['乙', '卯'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '천간합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('합화화')
      })

      it('omits transform note when option is disabled', () => {
        const pillars = makePillars(['甲', '子'], ['己', '丑'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({
          pillars,
          options: { includeHeavenlyTransformNote: false },
        })
        const combine = result.find((h) => h.kind === '천간합')
        expect(combine?.detail).toBe('甲-己 합')
        expect(combine?.detail).not.toContain('합화')
      })
    })

    describe('천간충 (Heavenly Clashes)', () => {
      it('detects 甲-庚 충 with mode 4', () => {
        const pillars = makePillars(['甲', '子'], ['庚', '丑'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({
          pillars,
          options: { heavenlyClashMode: '4' },
        })
        const clash = result.find((h) => h.kind === '천간충')
        expect(clash).toBeDefined()
        expect(clash?.detail).toContain('甲-庚')
      })

      it('detects 戊-甲 충 with mode 5', () => {
        const pillars = makePillars(['戊', '子'], ['甲', '丑'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({
          pillars,
          options: { heavenlyClashMode: '5' },
        })
        const clash = result.find((h) => h.kind === '천간충')
        expect(clash).toBeDefined()
        expect(clash?.detail).toContain('충')
      })

      it('does not detect 戊-甲 충 with mode 4', () => {
        const pillars = makePillars(['戊', '子'], ['甲', '丑'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({
          pillars,
          options: { heavenlyClashMode: '4' },
        })
        const clash = result.find((h) => h.kind === '천간충' && h.detail?.includes('戊'))
        expect(clash).toBeUndefined()
      })

      it('detects multiple clashes with mode 10', () => {
        const pillars = makePillars(['甲', '子'], ['丙', '丑'], ['戊', '寅'], ['庚', '卯'])
        const result = analyzeRelations({
          pillars,
          options: { heavenlyClashMode: '10' },
        })
        const clashes = result.filter((h) => h.kind === '천간충')
        expect(clashes.length).toBeGreaterThan(0)
      })
    })

    it('excludes heavenly relations when disabled', () => {
      const pillars = makePillars(
        ['甲', '子'],
        ['己', '丑'], // 甲-己 합
        ['庚', '寅'], // 甲-庚 충
        ['丁', '卯']
      )
      const result = analyzeRelations({
        pillars,
        options: { includeHeavenly: false },
      })
      expect(result.find((h) => h.kind === '천간합')).toBeUndefined()
      expect(result.find((h) => h.kind === '천간충')).toBeUndefined()
    })
  })

  describe('analyzeRelations - Earthly Branch Relations (지지)', () => {
    describe('지지육합 (Six Combines)', () => {
      it('detects 子-丑 육합', () => {
        const pillars = makePillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '지지육합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('子-丑')
      })

      it('detects 寅-亥 육합', () => {
        const pillars = makePillars(['甲', '寅'], ['乙', '亥'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '지지육합')
        expect(combine).toBeDefined()
        expect(combine?.detail).toContain('육합')
      })

      it('detects 午-未 육합', () => {
        const pillars = makePillars(['甲', '午'], ['乙', '未'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const combine = result.find((h) => h.kind === '지지육합')
        expect(combine).toBeDefined()
      })
    })

    describe('지지충 (Clashes)', () => {
      it('detects 子-午 충', () => {
        const pillars = makePillars(['甲', '子'], ['乙', '午'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({ pillars })
        const clash = result.find((h) => h.kind === '지지충')
        expect(clash).toBeDefined()
        expect(clash?.detail).toContain('子-午')
      })

      it('detects 卯-酉 충', () => {
        const pillars = makePillars(['甲', '卯'], ['乙', '酉'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const clash = result.find((h) => h.kind === '지지충')
        expect(clash).toBeDefined()
      })
    })

    describe('지지형 (Punishments)', () => {
      it('detects 寅-巳 형 (part of 삼형)', () => {
        const pillars = makePillars(['甲', '寅'], ['乙', '巳'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const punish = result.find((h) => h.kind === '지지형')
        expect(punish).toBeDefined()
      })

      it('detects 子-卯 형 (무은형)', () => {
        const pillars = makePillars(['甲', '子'], ['乙', '卯'], ['丙', '午'], ['丁', '酉'])
        const result = analyzeRelations({ pillars })
        const punish = result.find((h) => h.kind === '지지형')
        expect(punish).toBeDefined()
        expect(punish?.detail).toContain('子-卯')
      })

      it('detects self-punishment when enabled', () => {
        const pillars = makePillars(['甲', '午'], ['乙', '午'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({
          pillars,
          options: { includeSelfPunish: true },
        })
        const selfPunish = result.find((h) => h.kind === '지지형' && h.detail?.includes('午-午'))
        expect(selfPunish).toBeDefined()
      })

      it('excludes self-punishment when disabled', () => {
        const pillars = makePillars(['甲', '午'], ['乙', '午'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({
          pillars,
          options: { includeSelfPunish: false },
        })
        const selfPunish = result.find((h) => h.kind === '지지형' && h.detail?.includes('午-午'))
        expect(selfPunish).toBeUndefined()
      })
    })

    describe('지지파 (Breaks)', () => {
      it('detects 子-酉 파', () => {
        const pillars = makePillars(['甲', '子'], ['乙', '酉'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({ pillars })
        const brk = result.find((h) => h.kind === '지지파')
        expect(brk).toBeDefined()
        expect(brk?.detail).toContain('子-酉')
      })
    })

    describe('지지해 (Harms)', () => {
      it('detects 子-未 해', () => {
        const pillars = makePillars(['甲', '子'], ['乙', '未'], ['丙', '寅'], ['丁', '卯'])
        const result = analyzeRelations({ pillars })
        const harm = result.find((h) => h.kind === '지지해')
        expect(harm).toBeDefined()
        expect(harm?.detail).toContain('子-未')
      })
    })

    describe('원진 (Yuanjin)', () => {
      // 표준 원진 6쌍: 子未 丑午 寅酉 卯申 辰亥 巳戌 (해(害)와 혼동 금지)
      it('detects 寅-酉 원진', () => {
        const pillars = makePillars(['甲', '寅'], ['乙', '酉'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const yuanjin = result.find((h) => h.kind === '원진')
        expect(yuanjin).toBeDefined()
        expect(yuanjin?.detail).toContain('원진')
      })

      it('detects 巳-戌 원진', () => {
        const pillars = makePillars(['甲', '巳'], ['乙', '戌'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const yuanjin = result.find((h) => h.kind === '원진')
        expect(yuanjin?.detail).toContain('원진')
      })

      // 酉-戌 은 해(害)이지 원진이 아니다 — 과거 원진 표가 해 표로 잘못 복제된 회귀 방지
      it('does NOT treat 酉-戌 (해) as 원진', () => {
        const pillars = makePillars(['甲', '酉'], ['乙', '戌'], ['丙', '子'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        expect(result.find((h) => h.kind === '원진')).toBeUndefined()
        expect(result.find((h) => h.kind === '지지해')).toBeDefined()
      })
    })

    describe('지지삼합 (Three Harmonies)', () => {
      it('detects 申-子-辰 삼합 (수)', () => {
        const pillars = makePillars(['甲', '申'], ['乙', '子'], ['丙', '辰'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const trine = result.find((h) => h.kind === '지지삼합')
        expect(trine).toBeDefined()
        expect(trine?.detail).toContain('삼합')
        expect(trine?.detail).toContain('수')
      })

      it('detects 亥-卯-未 삼합 (목)', () => {
        const pillars = makePillars(['甲', '亥'], ['乙', '卯'], ['丙', '未'], ['丁', '丑'])
        const result = analyzeRelations({ pillars })
        const trine = result.find((h) => h.kind === '지지삼합')
        expect(trine).toBeDefined()
        expect(trine?.detail).toContain('목')
      })

      it('omits element note when option disabled', () => {
        const pillars = makePillars(['甲', '申'], ['乙', '子'], ['丙', '辰'], ['丁', '丑'])
        const result = analyzeRelations({
          pillars,
          options: { includeTrineElementNote: false },
        })
        const trine = result.find((h) => h.kind === '지지삼합')
        expect(trine).toBeDefined()
        expect(trine?.detail).not.toContain('수')
      })
    })

    describe('반합 (Half Harmonies)', () => {
      it('detects 申-子 반합 (지지삼합 kind) when 삼합 is not complete', () => {
        const pillars = makePillars(
          ['甲', '申'],
          ['乙', '子'],
          ['丙', '午'], // Not 辰
          ['丁', '丑']
        )
        const result = analyzeRelations({ pillars })
        // 반합쌍(申-子)은 삼합의 절반 → kind '지지삼합', detail '반합' (옛 '지지방합' 오표기 수정 R2)
        const half = result.find((h) => h.kind === '지지삼합' && h.detail?.includes('申-子'))
        expect(half).toBeDefined()
        expect(half?.detail).toContain('반합')
        expect(half?.detail).not.toContain('방합')
      })

      it('hides 반합 when 삼합 is complete', () => {
        const pillars = makePillars(
          ['甲', '申'],
          ['乙', '子'],
          ['丙', '辰'], // Complete 삼합
          ['丁', '丑']
        )
        const result = analyzeRelations({ pillars })
        // Should have full 삼합 …
        const trine = result.find((h) => h.kind === '지지삼합' && h.detail?.includes('삼합'))
        expect(trine).toBeDefined()
        // … but not a separate 반합 within that same set
        const halfFromSameSet = result.find(
          (h) =>
            h.kind === '지지삼합' &&
            h.detail?.includes('반합') &&
            (h.detail?.includes('申-子') || h.detail?.includes('子-辰'))
        )
        expect(halfFromSameSet).toBeUndefined()
      })
    })

    it('excludes earthly relations when disabled', () => {
      const pillars = makePillars(
        ['甲', '子'],
        ['乙', '午'], // 충
        ['丙', '丑'], // 육합
        ['丁', '卯']
      )
      const result = analyzeRelations({
        pillars,
        options: { includeEarthly: false },
      })
      expect(result.find((h) => h.kind === '지지충')).toBeUndefined()
      expect(result.find((h) => h.kind === '지지육합')).toBeUndefined()
    })
  })

  describe('analyzeRelations - 공망 (Gongmang)', () => {
    describe('dayPillar-60jiazi policy', () => {
      it('detects 공망 for 甲子 day pillar (戌亥 are empty)', () => {
        const pillars = makePillars(
          ['甲', '戌'], // year has 戌 - should be empty
          ['乙', '丑'],
          ['甲', '子'], // day pillar = 甲子
          ['丁', '卯']
        )
        const result = analyzeRelations({
          pillars,
          options: { gongmangPolicy: 'dayPillar-60jiazi' },
        })
        const gongmang = result.find((h) => h.kind === '공망')
        expect(gongmang).toBeDefined()
        expect(gongmang?.detail).toContain('戌')
      })

      it('detects 공망 for 甲戌 day pillar (申酉 are empty)', () => {
        const pillars = makePillars(
          ['甲', '申'], // year has 申 - should be empty
          ['乙', '丑'],
          ['甲', '戌'], // day pillar = 甲戌
          ['丁', '卯']
        )
        const result = analyzeRelations({
          pillars,
          options: { gongmangPolicy: 'dayPillar-60jiazi' },
        })
        const gongmang = result.find((h) => h.kind === '공망')
        expect(gongmang).toBeDefined()
        expect(gongmang?.detail).toContain('申')
      })

      it('detects multiple 공망 when multiple pillars match', () => {
        const pillars = makePillars(
          ['甲', '戌'], // empty
          ['乙', '亥'], // also empty for 甲子 day
          ['甲', '子'],
          ['丁', '卯']
        )
        const result = analyzeRelations({
          pillars,
          options: { gongmangPolicy: 'dayPillar-60jiazi' },
        })
        const gongmangs = result.filter((h) => h.kind === '공망')
        expect(gongmangs.length).toBe(2)
      })
    })

    describe('dayMaster-basic policy', () => {
      it('detects 공망 based on day master stem', () => {
        const pillars = makePillars(
          ['甲', '戌'], // 甲 -> 戌亥 empty
          ['乙', '丑'],
          ['甲', '子'],
          ['丁', '卯']
        )
        const result = analyzeRelations({
          pillars,
          options: { gongmangPolicy: 'dayMaster-basic' },
        })
        const gongmang = result.find((h) => h.kind === '공망')
        expect(gongmang).toBeDefined()
      })
    })

    describe('yearPillar-basic policy', () => {
      it('detects 공망 based on year stem', () => {
        const pillars = makePillars(
          ['甲', '子'], // year stem = 甲 -> 戌亥 empty
          ['乙', '戌'], // 戌 should be empty
          ['丙', '寅'],
          ['丁', '卯']
        )
        const result = analyzeRelations({
          pillars,
          options: { gongmangPolicy: 'yearPillar-basic' },
        })
        const gongmang = result.find((h) => h.kind === '공망')
        expect(gongmang).toBeDefined()
        expect(gongmang?.detail).toContain('戌')
      })
    })

    it('excludes 공망 when disabled', () => {
      const pillars = makePillars(['甲', '戌'], ['乙', '亥'], ['甲', '子'], ['丁', '卯'])
      const result = analyzeRelations({
        pillars,
        options: { includeGongmang: false },
      })
      expect(result.find((h) => h.kind === '공망')).toBeUndefined()
    })
  })

  describe('analyzeRelations - sorting', () => {
    it('sorts results by kind, then pillar count, then detail', () => {
      const pillars = makePillars(
        ['甲', '子'],
        ['己', '午'], // 甲-己 합, 子-午 충
        ['丙', '寅'],
        ['丁', '卯']
      )
      const result = analyzeRelations({ pillars })

      // Results should be sorted alphabetically by kind
      for (let i = 1; i < result.length; i++) {
        const cmp = result[i - 1].kind.localeCompare(result[i].kind)
        if (cmp === 0) {
          // Same kind - should be sorted by pillar count
          expect(result[i - 1].pillars.length).toBeLessThanOrEqual(result[i].pillars.length)
        }
      }
    })
  })

  describe('analyzeRelations - Korean branch names', () => {
    it('handles Korean branch names correctly', () => {
      const pillars: PillarInput = {
        year: { heavenlyStem: '甲', earthlyBranch: '자' }, // Korean
        month: { heavenlyStem: '乙', earthlyBranch: '오' }, // Korean
        day: { heavenlyStem: '丙', earthlyBranch: '寅' },
        time: { heavenlyStem: '丁', earthlyBranch: '卯' },
      }
      const result = analyzeRelations({ pillars })
      // Should detect 子-午 충
      const clash = result.find((h) => h.kind === '지지충')
      expect(clash).toBeDefined()
    })
  })

  describe('toAnalyzeInputFromSaju', () => {
    it('converts Saju structure to AnalyzeInput', () => {
      const sajuPillars = {
        year: {
          heavenlyStem: { name: '甲' },
          earthlyBranch: { name: '子' },
        },
        month: {
          heavenlyStem: { name: '乙' },
          earthlyBranch: { name: '丑' },
        },
        day: {
          heavenlyStem: { name: '丙' },
          earthlyBranch: { name: '寅' },
        },
        time: {
          heavenlyStem: { name: '丁' },
          earthlyBranch: { name: '卯' },
        },
      }

      const input = toAnalyzeInputFromSaju(sajuPillars, '丙')

      expect(input.pillars.year.heavenlyStem).toBe('甲')
      expect(input.pillars.year.earthlyBranch).toBe('子')
      expect(input.pillars.month.heavenlyStem).toBe('乙')
      expect(input.pillars.day.heavenlyStem).toBe('丙')
      expect(input.pillars.time.heavenlyStem).toBe('丁')
      expect(input.dayMasterStem).toBe('丙')
    })

    it('passes options through', () => {
      const sajuPillars = {
        year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
        month: { heavenlyStem: { name: '乙' }, earthlyBranch: { name: '丑' } },
        day: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
        time: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '卯' } },
      }

      const options: Partial<AnalyzeRelationsOptions> = {
        includeGongmang: false,
        heavenlyClashMode: '10',
      }

      const input = toAnalyzeInputFromSaju(sajuPillars, undefined, options)

      expect(input.options).toEqual(options)
    })
  })

  describe('analyzeRelations - empty/edge cases', () => {
    it('returns empty array when all options are disabled', () => {
      const pillars = makePillars(['甲', '子'], ['己', '午'], ['庚', '寅'], ['丁', '卯'])
      const result = analyzeRelations({
        pillars,
        options: {
          includeHeavenly: false,
          includeEarthly: false,
          includeGongmang: false,
        },
      })
      expect(result).toEqual([])
    })

    it('handles pillars with no relationships', () => {
      // Carefully chosen pillars with minimal relationships
      const pillars = makePillars(['甲', '寅'], ['丙', '辰'], ['戊', '午'], ['庚', '申'])
      const result = analyzeRelations({
        pillars,
        options: {
          includeHeavenly: true,
          includeEarthly: false,
          includeGongmang: false,
        },
      })
      // Should only have heavenly relations if any
      result.forEach((h) => {
        expect(h.kind).toMatch(/천간/)
      })
    })
  })
})

// ─── E2 관계 canon (SD-01 / SD-07 / SD-11 / SD-12 / SD-18) ───
// 국(三合·方合)은 서로 다른 세 지지가 모두 있어야 성립, 형은 hyeong.isHyeong 단일 교리,
// 천간충은 엔진 공통 4쌍. 아래 사주는 audit 재현 케이스(실제 생일에서 나온 원국)다.
describe('relations canon — E2', () => {
  const fromGanzhi = (gz: string): PillarInput => {
    const [y, m, d, t] = gz.split(' ')
    return makePillars([y[0], y[1]], [m[0], m[1]], [d[0], d[1]], [t[0], t[1]])
  }
  const rel = (gz: string) => analyzeRelations({ pillars: fromGanzhi(gz) })
  const fullSamhap = (gz: string) =>
    rel(gz).filter((h) => h.kind === '지지삼합' && h.detail.includes('삼합'))

  describe('삼합 needs three distinct members (SD-01)', () => {
    it('辛亥 丁酉 癸亥 己未 — two 亥 are one member: no 亥卯未 삼합, no 亥-未 반합', () => {
      expect(fullSamhap('辛亥 丁酉 癸亥 己未')).toEqual([])
      // 亥-未 에는 왕지(卯)가 없어 반합도 아니다
      expect(rel('辛亥 丁酉 癸亥 己未').filter((h) => h.kind === '지지삼합')).toEqual([])
    })

    it('丙午 甲午 戊寅 戊午 — no 寅午戌 삼합 (no 戌), its 寅-午 반합 remain', () => {
      expect(fullSamhap('丙午 甲午 戊寅 戊午')).toEqual([])
      const halves = rel('丙午 甲午 戊寅 戊午').filter(
        (h) => h.kind === '지지삼합' && h.detail.includes('반합')
      )
      expect(halves.length).toBe(3) // 午(year·month·time) × 寅(day)
      for (const h of halves) expect(h.pillars).toContain('day')
    })

    it('戊戌 丙辰 戊寅 甲寅 — no 寅午戌 삼합 without 午', () => {
      expect(fullSamhap('戊戌 丙辰 戊寅 甲寅')).toEqual([])
    })

    it('a doubled member still joins a complete 삼합: every holding pillar is listed', () => {
      const hits = fullSamhap('甲申 丙子 庚子 壬辰')
      expect(hits).toHaveLength(1)
      expect(hits[0].detail).toBe('申·子·辰 삼합(수)')
      expect(hits[0].pillars).toEqual(['year', 'month', 'day', 'time'])
    })
  })

  describe('방합 detection (SD-12)', () => {
    it.each([
      ['甲午 乙亥 辛丑 戊子', '亥·子·丑 방합(수)', ['month', 'day', 'time']],
      ['丁巳 己酉 丙戌 丙申', '申·酉·戌 방합(금)', ['month', 'day', 'time']],
      ['丙午 甲午 己未 己巳', '巳·午·未 방합(화)', ['year', 'month', 'day', 'time']],
    ])('%s → 지지방합 %s', (gz, detail, pillars) => {
      const hits = rel(gz).filter((h) => h.kind === '지지방합')
      expect(hits.map((h) => h.detail)).toEqual([detail])
      expect(hits[0].pillars).toEqual(pillars)
    })

    it('omits the element note when includeTrineElementNote is false', () => {
      const hits = analyzeRelations({
        pillars: fromGanzhi('甲午 乙亥 辛丑 戊子'),
        options: { includeTrineElementNote: false },
      }).filter((h) => h.kind === '지지방합')
      expect(hits.map((h) => h.detail)).toEqual(['亥·子·丑 방합'])
    })

    it('two members only (亥·亥·子) is not a 방합', () => {
      expect(rel('辛亥 庚子 癸亥 甲寅').filter((h) => h.kind === '지지방합')).toEqual([])
    })
  })

  describe('형 = hyeong.isHyeong (SD-07)', () => {
    it('戊子 丁巳 丁未 庚子 — 子 is not a 自刑 branch', () => {
      const hy = rel('戊子 丁巳 丁未 庚子').filter((h) => h.kind === '지지형')
      expect(hy.some((h) => h.detail.includes('子-子'))).toBe(false)
    })

    it('丑未 and 寅申 are 충 only, not 형', () => {
      const a = rel('乙丑 乙未 丙子 甲子')
      expect(a.some((h) => h.kind === '지지충' && h.detail === '丑-未 충')).toBe(true)
      expect(a.some((h) => h.kind === '지지형' && /丑|未/.test(h.detail))).toBe(false)
      const b = rel('甲寅 甲申 丙子 戊子')
      expect(b.some((h) => h.kind === '지지충' && h.detail === '寅-申 충')).toBe(true)
      expect(b.some((h) => h.kind === '지지형' && /寅|申/.test(h.detail))).toBe(false)
    })

    it('寅巳·巳申·丑戌·戌未 and 子卯 remain 형; 辰午酉亥 自刑 remains', () => {
      const hy = (gz: string) =>
        rel(gz)
          .filter((h) => h.kind === '지지형')
          .map((h) => h.detail)
      expect(hy('甲寅 乙巳 丙申 戊子')).toEqual(expect.arrayContaining(['寅-巳 형', '巳-申 형']))
      expect(hy('乙丑 甲戌 丁未 丙午')).toEqual(expect.arrayContaining(['丑-戌 형', '戌-未 형']))
      expect(hy('甲子 乙卯 丙寅 戊寅')).toEqual(['子-卯 형'])
      for (const [b, s1, s2] of [
        ['辰', '甲', '丙'],
        ['午', '甲', '丙'],
        ['酉', '乙', '丁'],
        ['亥', '乙', '丁'],
      ]) {
        expect(hy(`${s1}${b} ${s2}${b} 丙子 丁丑`)).toContain(`${b}-${b} 형`)
      }
    })
  })

  describe('천간충 uses the shared 4-pair mode (SD-11)', () => {
    it('丙午 甲午 戊寅 戊午 — 甲-戊 is not a 천간충 by default', () => {
      expect(rel('丙午 甲午 戊寅 戊午').filter((h) => h.kind === '천간충')).toEqual([])
    })

    it('乙己 is not a 천간충 by default, 乙辛 is', () => {
      const hits = rel('乙丑 己卯 辛巳 丙子').filter((h) => h.kind === '천간충')
      expect(hits.map((h) => h.detail)).toEqual(['乙-辛 충'])
    })
  })

  // 실제 날짜 400개(시드 고정)에서 나온 원국 — 국의 카디널리티 불변식 (SD-18).
  // (오프라인 4000개 샘플: 방합 4.5%, 유령 삼합 15.6% 가 이 불변식 위반이었다.)
  describe('property: 삼합/방합 cardinality over 400 seeded real birth dates', () => {
    const NOW = new Date('2026-01-01T00:00:00Z')
    let seed = 20261125
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const span = Date.UTC(2048, 0, 1) - Date.UTC(1941, 0, 1)
    const charts = Array.from({ length: 400 }, () => {
      const date = new Date(Date.UTC(1941, 0, 1) + Math.floor(rnd() * span))
        .toISOString()
        .slice(0, 10)
      const hh = String(Math.floor(rnd() * 24)).padStart(2, '0')
      const mm = String(Math.floor(rnd() * 60)).padStart(2, '0')
      const r = calculateSajuData(
        date,
        `${hh}:${mm}`,
        'male',
        'solar',
        'Asia/Seoul',
        false,
        126.978,
        NOW
      )
      const p = { year: r.yearPillar, month: r.monthPillar, day: r.dayPillar, time: r.timePillar }
      const branches = [p.year, p.month, p.day, p.time].map((x) => x.earthlyBranch.name)
      return {
        branches,
        hits: analyzeRelations(toAnalyzeInputFromSaju(p, p.day.heavenlyStem.name)),
      }
    })
    const trios = [
      ...THREE_HARMONY.map((t) => ({ kind: '지지삼합', members: t.members })),
      ...DIRECTIONAL_HARMONY.map((d) => ({ kind: '지지방합', members: d.members })),
    ]
    const isFull = (h: { kind: string; detail: string }) =>
      (h.kind === '지지삼합' && h.detail.includes('삼합')) || h.kind === '지지방합'

    it('every 삼합/방합 hit names three distinct members, all present in the chart', () => {
      const BRANCH = /[子丑寅卯辰巳午未申酉戌亥]/g
      let seen = 0
      for (const { branches, hits } of charts) {
        for (const h of hits.filter(isFull)) {
          seen++
          const members = [...new Set(h.detail.match(BRANCH) ?? [])]
          expect(members).toHaveLength(3)
          for (const m of members) expect(branches).toContain(m)
          // pillars 의 지지 집합도 정확히 그 세 멤버
          const POS = ['year', 'month', 'day', 'time'] as const
          const atPillars = new Set(h.pillars.map((k) => branches[POS.indexOf(k)]))
          expect([...atPillars].sort()).toEqual([...members].sort())
        }
      }
      expect(seen).toBeGreaterThan(20) // 불변식이 공허하게 통과하지 않도록
    })

    it('every complete distinct 三合/方合 in the chart is reported exactly once', () => {
      let complete = 0
      for (const { branches, hits } of charts) {
        for (const t of trios) {
          const want = t.members.every((m) => branches.includes(m))
          const got = hits.filter(
            (h) => isFull(h) && h.kind === t.kind && t.members.every((m) => h.detail.includes(m))
          )
          expect(got.length).toBe(want ? 1 : 0)
          if (want) complete++
        }
      }
      expect(complete).toBeGreaterThan(20)
    })
  })
})
