import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer, SignalPattern } from '../types'

/**
 * 신호 조합 → 명명된 패턴 검출.
 *
 * 셀의 ActiveSignal[]에서 알려진 조합 룰에 매칭되면 SignalPattern으로 띄움.
 * "47점"이 아니라 "재성 황금주", "도화 트리거", "흉살 집중일" 같은 명명.
 *
 * 패턴은 추가하기 쉽도록 데이터 + 매처 함수 분리.
 */

interface PatternRule {
  id: string
  name: string
  themes: AstroThemeKey[]
  match: (signals: ActiveSignal[]) => { matched: boolean; strength: number; matchedIds: string[] }
  description?: string
}

const RULES: PatternRule[] = [
  // ─── 1. 재물 황금주 ───
  {
    id: 'wealth-golden-week',
    name: '재물 황금주간',
    themes: ['money', 'business'],
    description: '재성 활성 + 통근 강화 + 길성 트랜짓 동시 발생',
    match(signals) {
      const wealthSibsin = signals.filter((s) =>
        s.evidence.sibsin === '정재' || s.evidence.sibsin === '편재',
      )
      const beneficTransit = signals.filter((s) =>
        s.kind === 'transit' &&
        (s.evidence.planets?.includes('Jupiter') || s.evidence.planets?.includes('Venus')) &&
        s.polarity > 0,
      )
      const yongsinActive = signals.filter((s) =>
        s.evidence.module === 'saju-yongsin' &&
        (s.evidence.detail as { verdict?: string }).verdict === 'primary',
      )
      if (wealthSibsin.length === 0 || beneficTransit.length === 0) {
        return { matched: false, strength: 0, matchedIds: [] }
      }
      const ids = [...wealthSibsin, ...beneficTransit, ...yongsinActive].map((s) => s.id)
      const strength = Math.min(100, 50 + wealthSibsin.length * 10 + beneficTransit.length * 10 + yongsinActive.length * 15)
      return { matched: true, strength, matchedIds: ids }
    },
  },

  // ─── 2. 연애·도화 트리거 ───
  {
    id: 'romance-trigger',
    name: '도화·연애 트리거',
    themes: ['love'],
    description: '도화·홍염 신살 + 금성 트랜짓 또는 정관/정재 동시',
    match(signals) {
      const dohwa = signals.filter((s) =>
        s.evidence.shinsalName === '도화' || s.evidence.shinsalName === '도화살' ||
        s.evidence.shinsalName === '홍염' || s.evidence.shinsalName === '홍염살',
      )
      const venusTransit = signals.filter((s) =>
        s.kind === 'transit' && s.evidence.planets?.includes('Venus'),
      )
      const officialPair = signals.filter((s) =>
        s.evidence.sibsin === '정관' || s.evidence.sibsin === '정재',
      )
      if (dohwa.length === 0 && venusTransit.length === 0) {
        return { matched: false, strength: 0, matchedIds: [] }
      }
      if (dohwa.length + venusTransit.length + officialPair.length < 2) {
        return { matched: false, strength: 0, matchedIds: [] }
      }
      const ids = [...dohwa, ...venusTransit, ...officialPair].map((s) => s.id)
      const strength = Math.min(100, 40 + dohwa.length * 15 + venusTransit.length * 15 + officialPair.length * 10)
      return { matched: true, strength, matchedIds: ids }
    },
  },

  // ─── 3. 흉살 집중일 ───
  {
    id: 'shadow-cluster',
    name: '흉살 집중일',
    themes: ['crisis'],
    description: '하루에 강한 흉신호 3개 이상 — 신중 모드',
    match(signals) {
      const bad = signals.filter((s) => s.polarity <= -2)
      if (bad.length < 3) return { matched: false, strength: 0, matchedIds: [] }
      return {
        matched: true,
        strength: Math.min(100, 50 + bad.length * 10),
        matchedIds: bad.map((s) => s.id),
      }
    },
  },

  // ─── 4. 5층 정렬 (공명) ───
  {
    id: 'five-layer-resonance',
    name: '5층 정렬',
    themes: [],
    description: '대운·세운·월운·일진·트랜짓 5층이 모두 같은 방향(+ 또는 −)',
    match(signals) {
      const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily']
      const positiveLayers = new Set<SignalLayer>()
      const negativeLayers = new Set<SignalLayer>()
      for (const s of signals) {
        if (s.polarity >= 2) positiveLayers.add(s.layer)
        if (s.polarity <= -2) negativeLayers.add(s.layer)
      }
      const posCount = layers.filter((l) => positiveLayers.has(l)).length
      const negCount = layers.filter((l) => negativeLayers.has(l)).length
      if (posCount < 4 && negCount < 4) return { matched: false, strength: 0, matchedIds: [] }
      const dominant = posCount >= negCount ? 'positive' : 'negative'
      const matched = signals.filter((s) =>
        dominant === 'positive' ? s.polarity >= 2 : s.polarity <= -2,
      )
      return { matched: true, strength: 95, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 5. 천을귀인 + 길성 트라인 ───
  {
    id: 'noble-fortune',
    name: '귀인 강림 (Noble Fortune)',
    themes: ['career', 'reputation', 'crisis'],
    description: '천을귀인 일진 + 길성 어스펙트 — 도움받기 쉬운 날',
    match(signals) {
      const noble = signals.find((s) => s.evidence.shinsalName === '천을귀인')
      const benefic = signals.find((s) =>
        s.kind === 'transit' &&
        s.evidence.aspectType === 'trine' &&
        (s.evidence.planets?.includes('Jupiter') || s.evidence.planets?.includes('Venus')),
      )
      if (!noble || !benefic) return { matched: false, strength: 0, matchedIds: [] }
      return { matched: true, strength: 85, matchedIds: [noble.id, benefic.id] }
    },
  },

  // ─── 6. 라이프 챕터 전환점 ───
  {
    id: 'life-chapter-shift',
    name: '인생 챕터 전환',
    themes: ['personality', 'spirituality'],
    description: '라이프사이클 마일스톤 + ZR 챕터 전환 + 큰 트랜짓 동시',
    match(signals) {
      const milestone = signals.find((s) => s.kind === 'lifecycle')
      const zr = signals.find((s) => s.kind === 'zodiacal-releasing')
      const slowTransit = signals.find((s) =>
        s.kind === 'transit' &&
        s.evidence.planets?.some((p) => ['Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(p)),
      )
      const hits = [milestone, zr, slowTransit].filter(Boolean) as ActiveSignal[]
      if (hits.length < 2) return { matched: false, strength: 0, matchedIds: [] }
      return { matched: true, strength: 50 + hits.length * 15, matchedIds: hits.map((s) => s.id) }
    },
  },
]

export function derivePatterns(signals: ActiveSignal[]): SignalPattern[] {
  const matched: SignalPattern[] = []
  for (const rule of RULES) {
    const result = rule.match(signals)
    if (!result.matched) continue
    matched.push({
      id: rule.id,
      name: rule.name,
      themes: rule.themes,
      matchedSignalIds: result.matchedIds,
      strength: result.strength,
      description: rule.description,
    })
  }
  return matched
}
