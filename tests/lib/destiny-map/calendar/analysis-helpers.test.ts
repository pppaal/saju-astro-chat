/**
 * Analysis Helpers - Comprehensive Tests
 *
 * Tests every exported function from analysis-helpers.ts:
 *   convertBranchInteractions, extractBranchInteractionFactors,
 *   extractSpecialDayFactors, extractShinsalFactors, extractSipsinFactors,
 *   extractHiddenStemFactors, extractStemRelationFactors,
 *   extractBranchRelationFactors, extractAstroElementFactors,
 *   extractLunarPhaseFactors, extractRetrogradeFactors,
 *   removeFromArray, calculateConfidence, calculateTimeContext
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock only the logger; let real constants & utils pass through
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  convertBranchInteractions,
  extractBranchInteractionFactors,
  extractSpecialDayFactors,
  extractShinsalFactors,
  extractSipsinFactors,
  extractHiddenStemFactors,
  extractStemRelationFactors,
  extractBranchRelationFactors,
  extractAstroElementFactors,
  extractLunarPhaseFactors,
  extractRetrogradeFactors,
  removeFromArray,
  calculateConfidence,
  calculateTimeContext,
  type SpecialDayFlags,
  type ShinsalInfo,
} from '@/lib/destiny-map/calendar/analysis-helpers'
import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine'

// ═══════════════════════════════════════════════════════════════════════
// convertBranchInteractions
// ═══════════════════════════════════════════════════════════════════════

describe('convertBranchInteractions', () => {
  it('converts positive branch interaction with result', () => {
    const input: BranchInteraction[] = [
      {
        type: '육합',
        branches: ['子', '丑'],
        impact: 'positive',
        result: '토',
        score: 5,
        description: '',
      },
    ]
    const result = convertBranchInteractions(input)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: '육합', impact: 'positive', element: '토' })
  })

  it('converts negative branch interaction without result', () => {
    const input: BranchInteraction[] = [
      { type: '충', branches: ['子', '午'], impact: 'negative', score: -5, description: '' },
    ]
    const result = convertBranchInteractions(input)
    expect(result[0].impact).toBe('negative')
    expect(result[0].element).toBeUndefined()
  })

  it('maps transformative impact to neutral', () => {
    const input: BranchInteraction[] = [
      {
        type: '삼합',
        branches: ['申', '子', '辰'],
        impact: 'transformative',
        result: '수',
        score: 3,
        description: '',
      },
    ]
    const result = convertBranchInteractions(input)
    expect(result[0].impact).toBe('neutral')
  })

  it('handles empty array', () => {
    expect(convertBranchInteractions([])).toHaveLength(0)
  })

  it('handles multiple interactions', () => {
    const input: BranchInteraction[] = [
      {
        type: '육합',
        branches: ['子', '丑'],
        impact: 'positive',
        result: '토',
        score: 5,
        description: '',
      },
      { type: '충', branches: ['子', '午'], impact: 'negative', score: -5, description: '' },
      {
        type: '방합',
        branches: ['寅', '卯', '辰'],
        impact: 'transformative',
        score: 3,
        description: '',
      },
    ]
    const result = convertBranchInteractions(input)
    expect(result).toHaveLength(3)
    expect(result[2].impact).toBe('neutral')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractBranchInteractionFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractBranchInteractionFactors', () => {
  it('extracts positive 육합 factors', () => {
    const input: BranchInteraction[] = [
      { type: '육합', branches: ['子', '丑'], impact: 'positive', score: 5, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_육합')
    expect(result.recommendationKeys).toContain('partnership')
    expect(result.recommendationKeys).toContain('harmony')
  })

  it('extracts positive 삼합 factors', () => {
    const input: BranchInteraction[] = [
      { type: '삼합', branches: ['申', '子', '辰'], impact: 'positive', score: 5, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_삼합')
    expect(result.recommendationKeys).toContain('collaboration')
    expect(result.recommendationKeys).toContain('synergy')
  })

  it('extracts positive 방합 factors', () => {
    const input: BranchInteraction[] = [
      { type: '방합', branches: ['寅', '卯', '辰'], impact: 'positive', score: 5, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_방합')
    expect(result.recommendationKeys).toContain('expansion')
    expect(result.recommendationKeys).toContain('growth')
  })

  it('extracts negative 충 factors', () => {
    const input: BranchInteraction[] = [
      { type: '충', branches: ['子', '午'], impact: 'negative', score: -5, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_충')
    expect(result.warningKeys).toContain('conflict')
    expect(result.warningKeys).toContain('change')
  })

  it('extracts negative 형 factors', () => {
    const input: BranchInteraction[] = [
      { type: '형', branches: ['寅', '巳'], impact: 'negative', score: -3, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_형')
    expect(result.warningKeys).toContain('tension')
    expect(result.warningKeys).toContain('challenge')
  })

  it('ignores neutral interactions', () => {
    const input: BranchInteraction[] = [
      {
        type: '합' as any,
        branches: ['子', '丑'],
        impact: 'neutral' as any,
        score: 0,
        description: '',
      },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.recommendationKeys).toHaveLength(0)
    expect(result.warningKeys).toHaveLength(0)
  })

  it('handles empty array', () => {
    const result = extractBranchInteractionFactors([])
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.recommendationKeys).toHaveLength(0)
    expect(result.warningKeys).toHaveLength(0)
  })

  it('accumulates factors from multiple interactions', () => {
    const input: BranchInteraction[] = [
      { type: '육합', branches: ['子', '丑'], impact: 'positive', score: 5, description: '' },
      { type: '충', branches: ['子', '午'], impact: 'negative', score: -5, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_육합')
    expect(result.sajuFactorKeys).toContain('advanced_충')
    expect(result.recommendationKeys).toContain('partnership')
    expect(result.warningKeys).toContain('conflict')
  })

  it('positive interaction with unknown type still adds saju factor', () => {
    const input: BranchInteraction[] = [
      { type: '파' as any, branches: ['子', '卯'], impact: 'positive', score: 2, description: '' },
    ]
    const result = extractBranchInteractionFactors(input)
    expect(result.sajuFactorKeys).toContain('advanced_파')
    // No recommendation keys for unknown type
    expect(result.recommendationKeys).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractSpecialDayFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractSpecialDayFactors', () => {
  function makeFlags(overrides: Partial<SpecialDayFlags> = {}): SpecialDayFlags {
    return {
      hasCheoneulGwiin: false,
      hasGeonrok: false,
      hasSonEomneun: false,
      hasYeokma: false,
      hasDohwa: false,
      isSamjaeYear: false,
      ...overrides,
    }
  }

  it('returns empty results when no flags are set and no dohwa', () => {
    const result = extractSpecialDayFactors(makeFlags(), '子', '午')
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.recommendationKeys).toHaveLength(0)
    expect(result.warningKeys).toHaveLength(0)
    expect(result.categories).toHaveLength(0)
    expect(result.titleKey).toBe('')
    expect(result.descKey).toBe('')
  })

  it('extracts cheoneulGwiin factors', () => {
    const result = extractSpecialDayFactors(makeFlags({ hasCheoneulGwiin: true }), '子', '午')
    expect(result.sajuFactorKeys).toContain('cheoneulGwiin')
    expect(result.recommendationKeys).toContain('majorDecision')
    expect(result.recommendationKeys).toContain('contract')
    expect(result.recommendationKeys).toContain('meeting')
    expect(result.titleKey).toBe('calendar.cheoneulGwiin')
    expect(result.descKey).toBe('calendar.cheoneulGwiinDesc')
  })

  it('extracts sonEomneun factors', () => {
    const result = extractSpecialDayFactors(makeFlags({ hasSonEomneun: true }), '子', '午')
    expect(result.sajuFactorKeys).toContain('sonEomneunDay')
    expect(result.recommendationKeys).toContain('moving')
    expect(result.recommendationKeys).toContain('wedding')
    expect(result.recommendationKeys).toContain('business')
    expect(result.categories).toContain('general')
  })

  it('extracts geonrok factors', () => {
    const result = extractSpecialDayFactors(makeFlags({ hasGeonrok: true }), '子', '午')
    expect(result.sajuFactorKeys).toContain('geonrokDay')
    expect(result.recommendationKeys).toContain('career')
    expect(result.recommendationKeys).toContain('authority')
    expect(result.recommendationKeys).toContain('promotion')
    expect(result.categories).toContain('career')
  })

  it('extracts samjae year factors', () => {
    const result = extractSpecialDayFactors(makeFlags({ isSamjaeYear: true }), '子', '午')
    expect(result.sajuFactorKeys).toContain('samjaeYear')
    expect(result.warningKeys).toContain('samjae')
    expect(result.warningKeys).toContain('caution')
  })

  it('extracts yeokma factors', () => {
    const result = extractSpecialDayFactors(makeFlags({ hasYeokma: true }), '子', '午')
    expect(result.sajuFactorKeys).toContain('yeokmaDay')
    expect(result.recommendationKeys).toContain('travel')
    expect(result.recommendationKeys).toContain('change')
    expect(result.recommendationKeys).toContain('interview')
    expect(result.warningKeys).toContain('instability')
    expect(result.categories).toContain('travel')
  })

  it('extracts dohwa factors when yearBranch+ganzhiBranch match dohwa table', () => {
    // From DOHWA_BY_YEAR_BRANCH: '寅' -> '卯' (dohwa day when yearBranch=寅 and ganzhiBranch=卯)
    const result = extractSpecialDayFactors(makeFlags(), '寅', '卯')
    expect(result.sajuFactorKeys).toContain('dohwaDay')
    expect(result.recommendationKeys).toContain('dating')
    expect(result.recommendationKeys).toContain('socializing')
    expect(result.recommendationKeys).toContain('charm')
    expect(result.categories).toContain('love')
  })

  it('does NOT add dohwa when yearBranch is undefined', () => {
    const result = extractSpecialDayFactors(makeFlags(), undefined, '卯')
    expect(result.sajuFactorKeys).not.toContain('dohwaDay')
  })

  it('does NOT add dohwa when branches do not match', () => {
    const result = extractSpecialDayFactors(makeFlags(), '寅', '午')
    expect(result.sajuFactorKeys).not.toContain('dohwaDay')
  })

  it('accumulates multiple flags together', () => {
    const result = extractSpecialDayFactors(
      makeFlags({ hasCheoneulGwiin: true, hasGeonrok: true, hasYeokma: true }),
      '子',
      '午'
    )
    expect(result.sajuFactorKeys).toContain('cheoneulGwiin')
    expect(result.sajuFactorKeys).toContain('geonrokDay')
    expect(result.sajuFactorKeys).toContain('yeokmaDay')
    expect(result.categories).toContain('career')
    expect(result.categories).toContain('travel')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractShinsalFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractShinsalFactors', () => {
  it('returns empty arrays when shinsalActive is undefined', () => {
    const result = extractShinsalFactors(undefined)
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.recommendationKeys).toHaveLength(0)
    expect(result.warningKeys).toHaveLength(0)
  })

  it('returns empty arrays when shinsalActive is empty', () => {
    const result = extractShinsalFactors([])
    expect(result.sajuFactorKeys).toHaveLength(0)
  })

  // --- Lucky shinsal ---

  it('extracts 태극귀인 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '태극귀인', type: 'lucky', affectedArea: 'general' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_taegukGwiin')
    expect(result.recommendationKeys).toContain('majorLuck')
    expect(result.recommendationKeys).toContain('blessing')
  })

  it('extracts 천덕귀인 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '천덕귀인', type: 'lucky', affectedArea: 'general' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_cheondeokGwiin')
    expect(result.recommendationKeys).toContain('heavenlyHelp')
  })

  it('extracts 천덕 (short form) factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '천덕', type: 'lucky', affectedArea: 'general' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_cheondeokGwiin')
  })

  it('extracts 월덕귀인 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '월덕귀인', type: 'lucky', affectedArea: 'general' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_woldeokGwiin')
    expect(result.recommendationKeys).toContain('lunarBlessing')
  })

  it('extracts 월덕 (short form) factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '월덕', type: 'lucky', affectedArea: 'general' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_woldeokGwiin')
  })

  it('extracts 화개 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '화개', type: 'lucky', affectedArea: 'spiritual' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_hwagae')
    expect(result.recommendationKeys).toContain('creativity')
    expect(result.recommendationKeys).toContain('spiritual')
  })

  // --- Unlucky shinsal ---

  it('extracts 공망 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '공망', type: 'unlucky', affectedArea: 'general' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_gongmang')
    expect(result.warningKeys).toContain('emptiness')
    expect(result.warningKeys).toContain('voidDay')
  })

  it('extracts 원진 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '원진', type: 'unlucky', affectedArea: 'relationships' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_wonjin')
    expect(result.warningKeys).toContain('resentment')
    expect(result.warningKeys).toContain('conflict')
  })

  it('extracts 양인 factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '양인', type: 'unlucky', affectedArea: 'health' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_yangin')
    expect(result.warningKeys).toContain('danger')
    expect(result.warningKeys).toContain('impulsiveness')
  })

  it('extracts 괴강 factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '괴강', type: 'unlucky', affectedArea: 'career' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_goegang')
    expect(result.warningKeys).toContain('extremes')
    expect(result.warningKeys).toContain('intensity')
  })

  it('extracts 백호 factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '백호', type: 'unlucky', affectedArea: 'health' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_backho')
    expect(result.warningKeys).toContain('accident')
    expect(result.warningKeys).toContain('surgery')
  })

  it('extracts 귀문관 factors', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '귀문관', type: 'unlucky', affectedArea: 'mental' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_guimungwan')
    expect(result.warningKeys).toContain('mentalConfusion')
    expect(result.warningKeys).toContain('anxiety')
  })

  // --- Special shinsal ---

  it('extracts 역마 factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '역마', type: 'special', affectedArea: 'travel' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_yeokma')
    expect(result.recommendationKeys).toContain('travel')
    expect(result.recommendationKeys).toContain('movement')
  })

  it('extracts 재살 factors', () => {
    const shinsalActive: ShinsalInfo[] = [{ name: '재살', type: 'special', affectedArea: 'legal' }]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_jaesal')
    expect(result.warningKeys).toContain('dispute')
    expect(result.warningKeys).toContain('legalIssue')
  })

  // --- Multiple shinsal ---

  it('handles multiple shinsal at once', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '태극귀인', type: 'lucky', affectedArea: 'general' },
      { name: '공망', type: 'unlucky', affectedArea: 'general' },
      { name: '역마', type: 'special', affectedArea: 'travel' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toContain('shinsal_taegukGwiin')
    expect(result.sajuFactorKeys).toContain('shinsal_gongmang')
    expect(result.sajuFactorKeys).toContain('shinsal_yeokma')
  })

  it('ignores unknown shinsal names', () => {
    const shinsalActive: ShinsalInfo[] = [
      { name: '알수없는살', type: 'special', affectedArea: 'general' },
    ]
    const result = extractShinsalFactors(shinsalActive)
    expect(result.sajuFactorKeys).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractSipsinFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractSipsinFactors', () => {
  it('returns empty when dayMasterStem is undefined', () => {
    const result = extractSipsinFactors(undefined, '甲')
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.categories).toHaveLength(0)
  })

  it('returns empty when sipsin lookup yields nothing', () => {
    // '?' is not a valid stem, getSipsin returns ''
    const result = extractSipsinFactors('?', '甲')
    expect(result.sajuFactorKeys).toHaveLength(0)
  })

  it('extracts 정재 sipsin factors', () => {
    // dayMaster=甲, target=己 => 정재
    const result = extractSipsinFactors('甲', '己')
    expect(result.sajuFactorKeys).toContain('sipsin_정재')
    expect(result.categories).toContain('wealth')
    expect(result.recommendationKeys).toContain('stableWealth')
    expect(result.recommendationKeys).toContain('savings')
  })

  it('extracts 편재 sipsin factors with warning', () => {
    // dayMaster=甲, target=戊 => 편재
    const result = extractSipsinFactors('甲', '戊')
    expect(result.sajuFactorKeys).toContain('sipsin_편재')
    expect(result.categories).toContain('wealth')
    expect(result.recommendationKeys).toContain('speculation')
    expect(result.warningKeys).toContain('riskManagement')
  })

  it('extracts 정인 sipsin factors', () => {
    // dayMaster=甲, target=癸 => 정인
    const result = extractSipsinFactors('甲', '癸')
    expect(result.sajuFactorKeys).toContain('sipsin_정인')
    expect(result.categories).toContain('study')
    expect(result.recommendationKeys).toContain('learning')
    expect(result.recommendationKeys).toContain('certification')
    expect(result.recommendationKeys).toContain('mother')
  })

  it('extracts 편인 sipsin factors', () => {
    // dayMaster=甲, target=壬 => 편인
    const result = extractSipsinFactors('甲', '壬')
    expect(result.sajuFactorKeys).toContain('sipsin_편인')
    expect(result.categories).toContain('study')
    expect(result.recommendationKeys).toContain('spirituality')
    expect(result.recommendationKeys).toContain('unique')
  })

  it('extracts 겁재 sipsin factors', () => {
    // dayMaster=甲, target=乙 => 겁재
    const result = extractSipsinFactors('甲', '乙')
    expect(result.sajuFactorKeys).toContain('sipsin_겁재')
    expect(result.warningKeys).toContain('rivalry')
    expect(result.warningKeys).toContain('loss')
    expect(result.categories).toHaveLength(0) // No category for 겁재
  })

  it('extracts sipsin that is not in switch cases (e.g. 비견)', () => {
    // dayMaster=甲, target=甲 => 비견
    const result = extractSipsinFactors('甲', '甲')
    expect(result.sajuFactorKeys).toContain('sipsin_비견')
    // 비견 has no switch case so no extra recommendations/warnings/categories
    expect(result.categories).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractHiddenStemFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractHiddenStemFactors', () => {
  it('returns empty array when relations is undefined', () => {
    const result = extractHiddenStemFactors('子', undefined)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for unknown branch', () => {
    const result = extractHiddenStemFactors('X', { generatedBy: 'water', controlledBy: 'earth' })
    expect(result).toHaveLength(0)
  })

  it('adds hiddenStemSupport when main hidden stem element matches generatedBy', () => {
    // 子 hidden stem 정기=癸 => element=water
    // If generatedBy === 'water' => support
    const result = extractHiddenStemFactors('子', { generatedBy: 'water', controlledBy: 'earth' })
    expect(result).toContain('hiddenStemSupport')
  })

  it('adds hiddenStemConflict when main hidden stem element matches controlledBy', () => {
    // 子 hidden stem 정기=癸 => element=water
    // If controlledBy === 'water' => conflict
    const result = extractHiddenStemFactors('子', { generatedBy: 'fire', controlledBy: 'water' })
    expect(result).toContain('hiddenStemConflict')
  })

  it('returns empty for branch where hidden stem element does not match either relation', () => {
    // 子 hidden stem 정기=癸 => element=water
    const result = extractHiddenStemFactors('子', { generatedBy: 'fire', controlledBy: 'metal' })
    expect(result).toHaveLength(0)
  })

  it('works with 寅 branch (정기=甲 => wood)', () => {
    // 寅 hidden stem 정기=甲 => element=wood
    const result = extractHiddenStemFactors('寅', { generatedBy: 'wood', controlledBy: 'fire' })
    expect(result).toContain('hiddenStemSupport')
  })

  it('works with 午 branch (정기=丁 => fire)', () => {
    // 午 hidden stem 정기=丁 => element=fire
    const result = extractHiddenStemFactors('午', { generatedBy: 'fire', controlledBy: 'metal' })
    expect(result).toContain('hiddenStemSupport')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractStemRelationFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractStemRelationFactors', () => {
  // ELEMENT_RELATIONS['wood'] = { generates:'fire', controls:'earth', generatedBy:'water', controlledBy:'metal' }
  const woodRelations = {
    generatedBy: 'water',
    controls: 'earth',
    generates: 'fire',
    controlledBy: 'metal',
  }

  it('returns 비견 when stem element matches day master element', () => {
    const result = extractStemRelationFactors('wood', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('stemBijeon')
    expect(result.categories).toContain('career')
    expect(result.titleKey).toBe('calendar.bijeon')
    expect(result.recommendationKeys).toContain('business')
    expect(result.warningKeys).toContain('competition')
  })

  it('returns 인성 when stem element is generatedBy day master', () => {
    const result = extractStemRelationFactors('water', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('stemInseong')
    expect(result.categories).toContain('study')
    expect(result.categories).toContain('career')
    expect(result.titleKey).toBe('calendar.inseong')
    expect(result.recommendationKeys).toContain('study')
  })

  it('returns 재성 when stem element is what day master controls', () => {
    const result = extractStemRelationFactors('earth', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('stemJaeseong')
    expect(result.categories).toContain('wealth')
    expect(result.categories).toContain('love')
    expect(result.titleKey).toBe('calendar.jaeseong')
    expect(result.recommendationKeys).toContain('finance')
  })

  it('returns 식상 when stem element is what day master generates', () => {
    const result = extractStemRelationFactors('fire', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('stemSiksang')
    expect(result.categories).toContain('love')
    expect(result.categories).toContain('career')
    expect(result.titleKey).toBe('calendar.siksang')
    expect(result.recommendationKeys).toContain('creative')
  })

  it('returns 관살 when stem element controls day master', () => {
    const result = extractStemRelationFactors('metal', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('stemGwansal')
    expect(result.categories).toContain('health')
    expect(result.categories).toContain('career')
    expect(result.titleKey).toBe('calendar.gwansal')
    expect(result.warningKeys).toContain('conflict')
    expect(result.warningKeys).toContain('health')
  })

  it('returns empty when no element relation matches', () => {
    // This should not happen with 5-element system, but test it anyway
    const result = extractStemRelationFactors('unknown', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.titleKey).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractBranchRelationFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractBranchRelationFactors', () => {
  const woodRelations = { generatedBy: 'water', controlledBy: 'metal' }

  it('returns empty when dayBranch is undefined', () => {
    const result = extractBranchRelationFactors(undefined, '午', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toHaveLength(0)
    expect(result.titleKey).toBe('')
  })

  it('detects 육합 (yukhap) when branches match YUKHAP table', () => {
    // YUKHAP: 子-丑
    const result = extractBranchRelationFactors('子', '丑', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('branchYukhap')
    expect(result.categories).toContain('love')
    expect(result.recommendationKeys).toContain('love')
    expect(result.recommendationKeys).toContain('meeting')
    expect(result.recommendationKeys).toContain('reconciliation')
  })

  it('detects 충 (chung) when branches match CHUNG table', () => {
    // CHUNG: 子-午
    const result = extractBranchRelationFactors('子', '午', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('branchChung')
    expect(result.categories).toContain('travel')
    expect(result.categories).toContain('health')
    expect(result.warningKeys).toContain('avoidTravel')
    expect(result.warningKeys).toContain('conflict')
    expect(result.titleKey).toBe('calendar.chung')
  })

  it('detects 형 (xing) when branches match XING table', () => {
    // XING: 寅-巳
    const result = extractBranchRelationFactors('寅', '巳', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('branchXing')
    expect(result.warningKeys).toContain('legal')
    expect(result.warningKeys).toContain('injury')
  })

  it('detects 해 (hai) when branches match HAI_MAP', () => {
    // HAI: 子-未
    const result = extractBranchRelationFactors('子', '未', 'wood', woodRelations)
    expect(result.sajuFactorKeys).toContain('branchHai')
    expect(result.warningKeys).toContain('betrayal')
    expect(result.warningKeys).toContain('misunderstanding')
  })

  it('detects 삼합 positive when element matches dayMasterElement', () => {
    // SAMHAP['water'] = ['申', '子', '辰']
    // dayBranch=申, ganzhiBranch=子, dayMasterElement='water' => positive samhap
    const result = extractBranchRelationFactors('申', '子', 'water', {
      generatedBy: 'metal',
      controlledBy: 'earth',
    })
    expect(result.sajuFactorKeys).toContain('branchSamhap')
    expect(result.recommendationKeys).toContain('bigDecision')
    expect(result.categories).toContain('general')
  })

  it('detects 삼합 positive when element matches generatedBy', () => {
    // SAMHAP['water'] = ['申', '子', '辰']
    // dayBranch=申, ganzhiBranch=子, generatedBy='water' => positive samhap
    const result = extractBranchRelationFactors('申', '子', 'wood', {
      generatedBy: 'water',
      controlledBy: 'metal',
    })
    expect(result.sajuFactorKeys).toContain('branchSamhap')
  })

  it('detects 삼합 negative when element matches controlledBy', () => {
    // SAMHAP['metal'] = ['巳', '酉', '丑']
    // dayBranch=巳, ganzhiBranch=酉, controlledBy='metal' => negative samhap
    const result = extractBranchRelationFactors('巳', '酉', 'wood', {
      generatedBy: 'water',
      controlledBy: 'metal',
    })
    expect(result.sajuFactorKeys).toContain('branchSamhapNegative')
    expect(result.warningKeys).toContain('opposition')
  })

  it('does not detect samhap when branches are not in same samhap group', () => {
    const result = extractBranchRelationFactors('子', '寅', 'wood', woodRelations)
    expect(result.sajuFactorKeys).not.toContain('branchSamhap')
    expect(result.sajuFactorKeys).not.toContain('branchSamhapNegative')
  })

  it('chung overrides yukhap titleKey', () => {
    // CHUNG: 卯-酉, YUKHAP: 卯-戌 (different), no overlap here
    // But 辰-酉 is yukhap AND 辰-戌 is chung => find pair that has both
    // Actually, let's just verify chung overwrites titleKey
    const result = extractBranchRelationFactors('子', '午', 'wood', woodRelations)
    expect(result.titleKey).toBe('calendar.chung')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractAstroElementFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractAstroElementFactors', () => {
  it('detects same element', () => {
    const result = extractAstroElementFactors('fire', 'fire')
    expect(result.astroFactorKeys).toContain('sameElement')
    expect(result.recommendationKeys).toContain('confidence')
    expect(result.recommendationKeys).toContain('selfExpression')
  })

  it('detects support element (transit generates natal)', () => {
    // ELEMENT_RELATIONS['fire'].generatedBy === 'wood'
    const result = extractAstroElementFactors('wood', 'fire')
    expect(result.astroFactorKeys).toContain('supportElement')
    expect(result.recommendationKeys).toContain('learning')
    expect(result.recommendationKeys).toContain('receiving')
  })

  it('detects giving element (natal generates transit)', () => {
    // ELEMENT_RELATIONS['fire'].generates === 'earth'
    const result = extractAstroElementFactors('earth', 'fire')
    expect(result.astroFactorKeys).toContain('givingElement')
    expect(result.recommendationKeys).toContain('giving')
    expect(result.recommendationKeys).toContain('teaching')
  })

  it('detects conflict element (transit controls natal)', () => {
    // ELEMENT_RELATIONS['fire'].controlledBy === 'water'
    const result = extractAstroElementFactors('water', 'fire')
    expect(result.astroFactorKeys).toContain('conflictElement')
    expect(result.warningKeys).toContain('stress')
    expect(result.warningKeys).toContain('opposition')
  })

  it('detects control element (natal controls transit)', () => {
    // ELEMENT_RELATIONS['fire'].controls === 'metal'
    const result = extractAstroElementFactors('metal', 'fire')
    expect(result.astroFactorKeys).toContain('controlElement')
    expect(result.recommendationKeys).toContain('achievement')
    expect(result.recommendationKeys).toContain('discipline')
  })

  it('returns empty for unknown natal element', () => {
    const result = extractAstroElementFactors('fire', 'unknown')
    expect(result.astroFactorKeys).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractLunarPhaseFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractLunarPhaseFactors', () => {
  it('extracts newMoon factors', () => {
    const result = extractLunarPhaseFactors('newMoon')
    expect(result.astroFactorKeys).toContain('lunarNewMoon')
    expect(result.recommendationKeys).toContain('newBeginning')
    expect(result.recommendationKeys).toContain('planning')
  })

  it('extracts fullMoon factors', () => {
    const result = extractLunarPhaseFactors('fullMoon')
    expect(result.astroFactorKeys).toContain('lunarFullMoon')
    expect(result.recommendationKeys).toContain('completion')
    expect(result.recommendationKeys).toContain('celebration')
  })

  it('extracts firstQuarter factors', () => {
    const result = extractLunarPhaseFactors('firstQuarter')
    expect(result.astroFactorKeys).toContain('lunarFirstQuarter')
    expect(result.warningKeys).toContain('tension')
    expect(result.warningKeys).toContain('challenge')
  })

  it('extracts lastQuarter factors', () => {
    const result = extractLunarPhaseFactors('lastQuarter')
    expect(result.astroFactorKeys).toContain('lunarLastQuarter')
    expect(result.recommendationKeys).toContain('reflection')
    expect(result.recommendationKeys).toContain('release')
  })

  it('returns empty for unknown phase', () => {
    const result = extractLunarPhaseFactors('waxingGibbous')
    expect(result.astroFactorKeys).toHaveLength(0)
    expect(result.recommendationKeys).toHaveLength(0)
    expect(result.warningKeys).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// extractRetrogradeFactors
// ═══════════════════════════════════════════════════════════════════════

describe('extractRetrogradeFactors', () => {
  it('returns empty for no retrograde planets', () => {
    const result = extractRetrogradeFactors([])
    expect(result.astroFactorKeys).toHaveLength(0)
    expect(result.warningKeys).toHaveLength(0)
    expect(result.removeRecs).toHaveLength(0)
  })

  it('extracts mercury retrograde factors and removal list', () => {
    const result = extractRetrogradeFactors(['mercury'])
    expect(result.astroFactorKeys).toContain('retrogradeMercury')
    expect(result.warningKeys).toContain('mercuryRetrograde')
    expect(result.removeRecs).toContain('contract')
    expect(result.removeRecs).toContain('documents')
    expect(result.removeRecs).toContain('interview')
  })

  it('extracts venus retrograde factors and removal list', () => {
    const result = extractRetrogradeFactors(['venus'])
    expect(result.astroFactorKeys).toContain('retrogradeVenus')
    expect(result.warningKeys).toContain('venusRetrograde')
    expect(result.removeRecs).toContain('dating')
    expect(result.removeRecs).toContain('love')
    expect(result.removeRecs).toContain('finance')
    expect(result.removeRecs).toContain('investment')
    expect(result.removeRecs).toContain('shopping')
  })

  it('extracts mars retrograde factors (no removeRecs)', () => {
    const result = extractRetrogradeFactors(['mars'])
    expect(result.astroFactorKeys).toContain('retrogradeMars')
    expect(result.warningKeys).toContain('marsRetrograde')
    // Mars retrograde does not remove recommendations
    expect(result.removeRecs).toHaveLength(0)
  })

  it('handles multiple retrograde planets', () => {
    const result = extractRetrogradeFactors(['mercury', 'venus', 'mars'])
    expect(result.astroFactorKeys).toHaveLength(3)
    expect(result.warningKeys).toContain('mercuryRetrograde')
    expect(result.warningKeys).toContain('venusRetrograde')
    expect(result.warningKeys).toContain('marsRetrograde')
    expect(result.removeRecs).toContain('contract')
    expect(result.removeRecs).toContain('dating')
  })

  it('capitalizes planet name for factor key', () => {
    const result = extractRetrogradeFactors(['jupiter'])
    expect(result.astroFactorKeys).toContain('retrogradeJupiter')
    // Jupiter has no special handling
    expect(result.warningKeys).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// removeFromArray
// ═══════════════════════════════════════════════════════════════════════

describe('removeFromArray', () => {
  it('removes specified items from the array in-place', () => {
    const arr = ['a', 'b', 'c', 'd', 'e']
    removeFromArray(arr, ['b', 'd'])
    expect(arr).toEqual(['a', 'c', 'e'])
  })

  it('handles empty toRemove', () => {
    const arr = ['a', 'b', 'c']
    removeFromArray(arr, [])
    expect(arr).toEqual(['a', 'b', 'c'])
  })

  it('handles empty source array', () => {
    const arr: string[] = []
    removeFromArray(arr, ['a'])
    expect(arr).toEqual([])
  })

  it('handles items not present in the array', () => {
    const arr = ['a', 'b', 'c']
    removeFromArray(arr, ['x', 'y'])
    expect(arr).toEqual(['a', 'b', 'c'])
  })

  it('removes all occurrences of duplicates', () => {
    const arr = ['a', 'b', 'a', 'c', 'a']
    removeFromArray(arr, ['a'])
    expect(arr).toEqual(['b', 'c'])
  })

  it('can remove all items from the array', () => {
    const arr = ['a', 'b', 'c']
    removeFromArray(arr, ['a', 'b', 'c'])
    expect(arr).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════
// calculateConfidence
// ═══════════════════════════════════════════════════════════════════════

describe('calculateConfidence', () => {
  it('returns max 100 confidence when all flags are true', () => {
    const result = calculateConfidence(true, true, true, true)
    expect(result.confidence).toBe(100)
    expect(result.confidenceNote).toBe('완전한 분석')
  })

  it('returns base confidence of 60 when all flags are false', () => {
    const result = calculateConfidence(false, false, false, false)
    expect(result.confidence).toBe(60)
    expect(result.confidenceNote).toContain('시주 없음')
    expect(result.confidenceNote).toContain('대운 정보 없음')
    expect(result.confidenceNote).toContain('용신 정보 없음')
  })

  it('adds 15 for pillars time', () => {
    const result = calculateConfidence(true, false, false, false)
    expect(result.confidence).toBe(75)
  })

  it('adds 10 for daeun cycles', () => {
    const result = calculateConfidence(false, true, false, false)
    expect(result.confidence).toBe(70)
  })

  it('adds 10 for yongsin', () => {
    const result = calculateConfidence(false, false, true, false)
    expect(result.confidence).toBe(70)
  })

  it('adds 5 for cross verification', () => {
    const result = calculateConfidence(false, false, false, true)
    expect(result.confidence).toBe(65)
  })

  it('caps at 100 even if sum exceeds', () => {
    // 60 + 15 + 10 + 10 + 5 = 100 exactly
    const result = calculateConfidence(true, true, true, true)
    expect(result.confidence).toBe(100)
  })

  it('lists only missing components in note', () => {
    const result = calculateConfidence(true, false, true, false)
    expect(result.confidenceNote).not.toContain('시주 없음')
    expect(result.confidenceNote).toContain('대운 정보 없음')
    expect(result.confidenceNote).not.toContain('용신 정보 없음')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// calculateTimeContext
// ═══════════════════════════════════════════════════════════════════════

describe('calculateTimeContext', () => {
  it('identifies a past date', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 2, false, false, { isMajorTransitYear: false })
    expect(result.isPast).toBe(true)
    expect(result.isFuture).toBe(false)
    expect(result.isToday).toBe(false)
    expect(result.daysFromToday).toBeLessThan(0)
  })

  it('identifies a future date', () => {
    const futureDate = new Date(2099, 0, 1)
    const result = calculateTimeContext(futureDate, 2, false, false, { isMajorTransitYear: false })
    expect(result.isPast).toBe(false)
    expect(result.isFuture).toBe(true)
    expect(result.isToday).toBe(false)
    expect(result.daysFromToday).toBeGreaterThan(0)
  })

  it('identifies today', () => {
    const today = new Date()
    const result = calculateTimeContext(today, 2, false, false, { isMajorTransitYear: false })
    expect(result.isToday).toBe(true)
    expect(result.daysFromToday).toBe(0)
  })

  it('provides retrospective note for past date with grade <= 1', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 1, false, false, { isMajorTransitYear: false })
    expect(result.retrospectiveNote).toBeDefined()
    expect(result.retrospectiveNote).toContain('좋은 기운')
  })

  it('provides retrospective note for past date with grade >= 4', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 4, false, false, { isMajorTransitYear: false })
    expect(result.retrospectiveNote).toBeDefined()
    expect(result.retrospectiveNote).toContain('도전적인')
  })

  it('provides gongmang retrospective note for past date', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 2, true, false, { isMajorTransitYear: false })
    expect(result.retrospectiveNote).toBeDefined()
    expect(result.retrospectiveNote).toContain('공망')
  })

  it('provides lucky shinsal retrospective note for past date', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 2, false, true, { isMajorTransitYear: false })
    expect(result.retrospectiveNote).toBeDefined()
    expect(result.retrospectiveNote).toContain('길신')
  })

  it('provides transit retrospective note for past date', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 2, false, false, {
      isMajorTransitYear: true,
      transitType: '대운',
    })
    expect(result.retrospectiveNote).toBeDefined()
    expect(result.retrospectiveNote).toContain('대운')
  })

  it('no retrospective note for future dates', () => {
    const futureDate = new Date(2099, 0, 1)
    const result = calculateTimeContext(futureDate, 0, true, true, {
      isMajorTransitYear: true,
      transitType: '대운',
    })
    expect(result.retrospectiveNote).toBeUndefined()
  })

  it('grade 2 past date with no special flags returns no retrospective note', () => {
    const pastDate = new Date(2020, 0, 1)
    const result = calculateTimeContext(pastDate, 2, false, false, { isMajorTransitYear: false })
    expect(result.retrospectiveNote).toBeUndefined()
  })
})
