import { describe, expect, it } from 'vitest'
import { evaluateThemedReportQuality } from '@/lib/destiny-matrix/ai-report/qualityAudit'

type GoldenCase = {
  id: string
  theme: 'career' | 'love' | 'wealth' | 'health' | 'family'
  sections: Record<string, string>
}

const baseSections = {
  deepAnalysis:
    'Saju structure shows baseline tendencies while astrology transit and house activation explain near-term expression with angle=120deg orb=1.3deg allowed=6deg.',
  patterns:
    'Saju ten-god flow and astrology planetary pattern together indicate repeatable behavior cycles with angle=60deg orb=1.8deg allowed=5deg.',
  timing:
    'Saju luck-cycle turning points align with astrology transit windows for practical decision timing using angle=90deg orb=1.4deg allowed=6deg.',
  recommendations:
    'Use both saju baseline and astrology timing to pick lower-risk actions and sequence commitments. Keep a weekly review and adjust scope when signals diverge.',
  actionPlan:
    'Week 1 define one measurable goal. Week 2 execute one bounded action in the recommended timing window. Week 3 review outcomes and adjust. Week 4 lock one repeatable routine.',
}

const cases: GoldenCase[] = [
  {
    id: 'career-1',
    theme: 'career',
    sections: {
      ...baseSections,
      strategy: 'Blend saju risk profile with astrology momentum before major commitments.',
    },
  },
  {
    id: 'career-2',
    theme: 'career',
    sections: {
      ...baseSections,
      strategy:
        'Prioritize stable execution when saju indicates pressure and astrology shows short volatility.',
    },
  },
  {
    id: 'love-1',
    theme: 'love',
    sections: {
      ...baseSections,
      compatibility:
        'Saju relational dynamics and astrology synastry both indicate where cooperation improves outcomes.',
    },
  },
  {
    id: 'love-2',
    theme: 'love',
    sections: {
      ...baseSections,
      compatibility:
        'Read saju emotional triggers with astrology communication aspects to reduce conflict loops.',
    },
  },
  {
    id: 'wealth-1',
    theme: 'wealth',
    sections: {
      ...baseSections,
      strategy:
        'Use saju wealth pattern as baseline and astrology cycle for entry and review timing.',
    },
  },
  {
    id: 'wealth-2',
    theme: 'wealth',
    sections: {
      ...baseSections,
      strategy:
        'Preserve cash when saju signals compression and astrology confirms volatility, then scale on aligned expansion windows.',
    },
  },
  {
    id: 'health-1',
    theme: 'health',
    sections: {
      ...baseSections,
      prevention:
        'Saju vitality profile and astrology stress indicators together define preventive routine intensity.',
    },
  },
  {
    id: 'health-2',
    theme: 'health',
    sections: {
      ...baseSections,
      prevention:
        'Pair saju constitution hints with astrology recovery windows for sustainable rhythm design.',
    },
  },
  {
    id: 'family-1',
    theme: 'family',
    sections: {
      ...baseSections,
      dynamics:
        'Saju role tendencies and astrology emotional patterns clarify family communication priorities.',
    },
  },
  {
    id: 'family-2',
    theme: 'family',
    sections: {
      ...baseSections,
      dynamics:
        'Resolve recurring family tension by combining saju duty signals with astrology boundary timing.',
    },
  },
  {
    id: 'career-3',
    theme: 'career',
    sections: {
      ...baseSections,
      strategy:
        'Convert insight to action by matching saju role strengths with astrology opportunity windows.',
    },
  },
  {
    id: 'love-3',
    theme: 'love',
    sections: {
      ...baseSections,
      compatibility:
        'Use saju compatibility baseline and astrology daily timing to plan difficult conversations.',
    },
  },
]

const variants = [
  {
    id: 'vA',
    deep:
      'Evidence: Saju day-master tendencies and astrology house activation both support practical adaptation with angle=120deg orb=1.2deg allowed=6deg.',
    action:
      'Today define one concrete step, this week execute one bounded experiment, and this month lock one repeatable routine.',
  },
  {
    id: 'vB',
    deep:
      'Source: Saju timing pressure and astrology transit momentum converge, so prioritization beats expansion with angle=90deg orb=1.1deg allowed=6deg.',
    action:
      'Start with one measurable objective, remove one low-value task, and review outcomes every 7 days.',
  },
]

const expandedCases: GoldenCase[] = cases.flatMap((item, idx) =>
  variants.map((v) => ({
    id: `${item.id}-${v.id}`,
    theme: item.theme,
    sections: {
      ...item.sections,
      deepAnalysis: `${item.sections.deepAnalysis} ${v.deep}`,
      actionPlan: `${item.sections.actionPlan} ${v.action}`,
      recommendations: `${item.sections.recommendations} Evidence: keep risk limits and written checkpoints.`,
      patterns: `${item.sections.patterns} angle=60deg orb=1.6deg allowed=5deg.`,
      timing: `${item.sections.timing} source: timeline overlap confirms window.`,
      ...(idx % 2 === 0
        ? {}
        : {
            // add additional practical sentence density
            actionPlan: `${item.sections.actionPlan} ${v.action} Keep one fallback option with a clear stop rule.`,
          }),
    },
  }))
)

describe('quality golden set', () => {
  it('keeps cross evidence quality above floor across deterministic cases', () => {
    for (const item of expandedCases) {
      const result = evaluateThemedReportQuality({
        theme: item.theme,
        lang: 'en',
        sections: item.sections,
      })
      expect(result.crossEvidenceScore, item.id).toBeGreaterThanOrEqual(80)
      expect(result.overallQualityScore, item.id).toBeGreaterThanOrEqual(75)
      expect(result.completenessScore, item.id).toBeGreaterThanOrEqual(80)
      expect(result.actionabilityScore, item.id).toBeGreaterThanOrEqual(60)
      expect(result.antiOverclaimScore, item.id).toBeGreaterThanOrEqual(70)
      expect(result.shouldBlock, item.id).toBe(false)
    }
  })
})
