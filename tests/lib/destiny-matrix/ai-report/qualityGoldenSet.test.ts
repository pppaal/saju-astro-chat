import { describe, expect, it } from 'vitest'
import { evaluateThemedReportQuality } from '@/lib/destiny-matrix/ai-report/qualityAudit'

type GoldenCase = {
  id: string
  theme: 'career' | 'love' | 'wealth' | 'health' | 'family'
  sections: Record<string, string>
}

const baseSections = {
  deepAnalysis:
    'Saju structure shows baseline tendencies while astrology transit and house activation explain near-term expression.',
  patterns:
    'Saju ten-god flow and astrology planetary pattern together indicate repeatable behavior cycles.',
  timing:
    'Saju luck-cycle turning points align with astrology transit windows for practical decision timing.',
  recommendations:
    'Use both saju baseline and astrology timing to pick lower-risk actions and sequence commitments.',
  actionPlan:
    'Week 1 define one measurable goal. Week 2 execute one bounded action in the recommended timing window.',
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

describe('quality golden set', () => {
  it('keeps cross evidence quality above floor across deterministic cases', () => {
    for (const item of cases) {
      const result = evaluateThemedReportQuality({
        theme: item.theme,
        lang: 'en',
        sections: item.sections,
      })
      expect(result.crossEvidenceScore, item.id).toBeGreaterThanOrEqual(80)
      expect(result.overallQualityScore, item.id).toBeGreaterThanOrEqual(75)
      expect(result.completenessScore, item.id).toBeGreaterThanOrEqual(80)
    }
  })
})
