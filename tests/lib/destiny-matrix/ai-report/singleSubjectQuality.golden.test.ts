import { describe, expect, it } from 'vitest'
import { buildReportQualityMetrics } from '@/lib/destiny-matrix/ai-report/reportQuality'
import type { SectionEvidenceRefs } from '@/lib/destiny-matrix/ai-report/evidenceRefs'

type CaseDef = {
  id: string
  lang: 'ko' | 'en'
  sections: Record<string, string>
}

function buildRegex(lang: 'ko' | 'en') {
  return lang === 'ko'
    ? {
        recheck: /재확인|다시 확인|점검/i,
        absoluteRisk: /절대|무조건|반드시/i,
        irreversibleAction: /서명|확정|올인/i,
        cautionIndicator: /주의|리스크|경고/i,
        immediateForce: /즉시|바로/i,
        mitigation: /검토|점검|기록|조건/i,
        recommendationTone: /권장|우선|먼저|하세요/i,
      }
    : {
        recheck: /recheck|verify|review/i,
        absoluteRisk: /always|never|guaranteed|certainly/i,
        irreversibleAction: /sign|lock in|all-in/i,
        cautionIndicator: /risk|warning|caution/i,
        immediateForce: /immediately|right now/i,
        mitigation: /verify|review|document|condition/i,
        recommendationTone: /use this phase|start with|first move|review/i,
      }
}

function buildMetrics(item: CaseDef) {
  const sectionPaths = Object.keys(item.sections)
  const evidenceRefs: SectionEvidenceRefs = Object.fromEntries(
    sectionPaths.map((path) => [
      path,
      [
        { id: `SIG:${path}:1`, keyword: item.lang === 'ko' ? '사주' : 'saju' },
        { id: `SIG:${path}:2`, keyword: item.lang === 'ko' ? '점성' : 'astrology' },
      ],
    ])
  )

  return buildReportQualityMetrics({
    sections: item.sections,
    sectionPaths,
    evidenceRefs,
    context: {
      requiredPaths: sectionPaths,
      requiredHeadingsByPath: {
        structure: ['Structure'],
        timing: ['Timing'],
        branches: ['Branches'],
        nextMove: ['Next Move'],
      },
      scenarioBundles: [
        {
          id: `${item.id}-career`,
          domain: 'career',
          main: { eventIds: ['career-window'], summaryTokens: ['review_first'] },
          alt: [],
          selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
        },
        {
          id: `${item.id}-relationship`,
          domain: 'relationship',
          main: { eventIds: ['boundary-window'], summaryTokens: ['boundary'] },
          alt: [],
          selectionWhy: { claimIds: [], signalIds: [], anchorIds: [] },
        },
      ],
      timelineEvents: [
        { id: `${item.id}-job`, type: 'job', date: '2026-05-01', title: 'career window' } as any,
        {
          id: `${item.id}-relationship`,
          type: 'relationship',
          date: '2026-06-10',
          title: 'relationship window',
        } as any,
      ],
      coreQuality: {
        score: 95,
        grade: 'A',
        warnings: [],
      },
    },
    minEvidenceRefsPerSection: 2,
    regex: buildRegex(item.lang),
    hasEvidenceSupport: (text, refs) => {
      const lowered = text.toLowerCase()
      return refs.every((ref) => lowered.includes(ref.keyword.toLowerCase()))
    },
    forbiddenAdditionsPass: true,
  })
}

const curatedCases: CaseDef[] = [
  {
    id: 'ko-career',
    lang: 'ko',
    sections: {
      structure:
        'Structure\n사주 구조는 역할과 책임을 먼저 세우게 하고, 점성 timing은 다음 1-3개월에 실행 창이 열린다고 말한다.',
      timing:
        'Timing\n사주 대운 흐름과 점성 transit이 함께 열리는 구간은 1-3개월이다. 지금은 바로 확정보다 조건 검토가 먼저다.',
      branches:
        'Branches\n문서화된 역할 경로는 열려 있고, 모호한 제안 경로는 막힌다. 사주 기준선과 점성 촉발이 함께 scope verification을 요구한다.',
      risks:
        'Risk\n사주에서는 책임 과부하가 리스크이고, 점성에서는 timing trigger가 빠르다. 조건 없이 서명하면 구조가 흔들린다.',
      nextMove:
        'Next Move\n사주 근거와 점성 창을 함께 보고, 먼저 역할 정의 문장을 기록하세요. 이번 주에는 검토 기준을 문서로 남기고 다음 면담 전 재확인하세요.',
    },
  },
  {
    id: 'en-relationship',
    lang: 'en',
    sections: {
      structure:
        'Structure\nSaju shows a boundary-first relationship pattern, while astrology timing opens a cautious reconnection window over the next 1-3 months.',
      timing:
        'Timing\nSaju baseline says trust grows slowly, and astrology transit says the trigger arrives before commitment. Review pace and ownership before you lock anything in.',
      branches:
        'Branches\nThe respectful-distance path stays open, while the rushed-definition path weakens. Saju and astrology both support a slower repair sequence.',
      risks:
        'Risk\nThe risk is not lack of feeling but premature certainty. Saju marks pressure around expectation mismatch, and astrology marks emotional acceleration.',
      nextMove:
        'Next Move\nStart with one clear boundary sentence. Use this phase to verify pace, scope, and reciprocity because saju favors paced trust and astrology keeps the emotional trigger active.',
    },
  },
]

describe('single-subject quality goldens', () => {
  it('keeps curated single-subject narratives above the hard-quality floor', () => {
    for (const item of curatedCases) {
      const quality = buildMetrics(item)
      expect(quality.tokenIntegrityPass, item.id).toBe(true)
      expect(quality.structurePass, item.id).toBe(true)
      expect(quality.forbiddenAdditionsPass, item.id).toBe(true)
      expect(quality.evidenceCoverageRatio, item.id).toBe(1)
      expect(quality.minEvidenceSatisfiedRatio, item.id).toBe(1)
      expect(quality.crossSectionRepetition ?? 0, item.id).toBe(0)
      expect(quality.genericAdviceDensity ?? 0, item.id).toBeLessThanOrEqual(0.4)
      expect(quality.repetitiveLeadPatternCount ?? 0, item.id).toBe(0)
      expect(quality.internalScenarioLeakCount ?? 0, item.id).toBe(0)
      expect(quality.coreQualityPass, item.id).toBe(true)
    }
  })

  it('flags flat generic drafts before they can pass as premium', () => {
    const sections = {
      structure:
        'Flat lead\nUse this phase carefully. Use this phase carefully. Use this phase carefully.',
      timing:
        'Flat lead\nUse this phase carefully. Use this phase carefully. Use this phase carefully.',
      branches:
        'Flat lead\nGeneric fallback window. Generic fallback window. scenario id career_window.',
      risks: 'Flat lead\nAlways do it immediately. Always do it immediately.',
      nextMove:
        'Flat lead\nUse this phase carefully. Use this phase carefully. Use this phase carefully.',
    }

    const quality = buildReportQualityMetrics({
      sections,
      sectionPaths: Object.keys(sections),
      evidenceRefs: {
        structure: [{ id: 'SIG:1', keyword: 'saju' }],
        timing: [{ id: 'SIG:2', keyword: 'astrology' }],
        branches: [{ id: 'SIG:3', keyword: 'saju' }],
        risks: [{ id: 'SIG:4', keyword: 'astrology' }],
        nextMove: [{ id: 'SIG:5', keyword: 'saju' }],
      },
      context: {
        requiredPaths: Object.keys(sections),
        coreQuality: { score: 82, grade: 'B', warnings: ['verification_bias_active'] },
      },
      minEvidenceRefsPerSection: 1,
      regex: buildRegex('en'),
      hasEvidenceSupport: (text, refs) => {
        const lowered = text.toLowerCase()
        return refs.every((ref) => lowered.includes(ref.keyword.toLowerCase()))
      },
      forbiddenAdditionsPass: false,
    })

    expect(quality.forbiddenAdditionsPass).toBe(false)
    expect(quality.evidenceCoverageRatio).toBeLessThan(1)
    expect(quality.crossSectionRepetition ?? 0).toBeGreaterThan(0)
    expect(quality.internalScenarioLeakCount ?? 0).toBeGreaterThan(0)
  })
})
