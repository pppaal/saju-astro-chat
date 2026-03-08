import { describe, expect, it } from 'vitest'
import { validateEvidenceBinding } from '@/lib/destiny-matrix/ai-report/rewriteGuards'
import type { SectionEvidenceRefs } from '@/lib/destiny-matrix/ai-report/evidenceRefs'

describe('rewriteGuards.validateEvidenceBinding', () => {
  it('does not flag jupiterReturn tokens as unsupported "return"', () => {
    const sections = {
      timing: 'Current jupiterReturn signal is active. Proceed with schedule verification.',
    }
    const evidenceRefs: SectionEvidenceRefs = {
      timing: [
        {
          id: 'SIG:timing:jupiterreturn',
          domain: 'timing',
          rowKey: 'daeun',
          colKey: 'jupiterReturn',
          keyword: 'jupiterreturn',
          sajuBasis: 'daeun transition',
          astroBasis: 'jupiter return window',
          score: 84,
        },
      ],
    }

    const result = validateEvidenceBinding(sections, ['timing'], evidenceRefs)
    expect(result.needsRepair).toBe(false)
    expect(result.violations).toEqual([])
  })

  it('flags unsupported explicit transit keywords', () => {
    const sections = {
      timing: 'Today finalize with solar return analysis.',
    }
    const evidenceRefs: SectionEvidenceRefs = {
      timing: [
        {
          id: 'SIG:timing:base',
          domain: 'timing',
          rowKey: 'daeun',
          colKey: 'window',
          keyword: 'timing window',
          sajuBasis: 'daeun flow',
          astroBasis: 'transit cadence',
          score: 72,
        },
      ],
    }

    const result = validateEvidenceBinding(sections, ['timing'], evidenceRefs)
    expect(result.needsRepair).toBe(true)
    expect(result.violations[0]?.unsupportedTokens).toContain('solar return')
  })
})
