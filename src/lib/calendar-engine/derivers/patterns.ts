import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer, SignalPattern } from '../types'

/**
 * 신호 조합 → 명명된 패턴 검출.
 *
 * 셀의 ActiveSignal[]에서 알려진 조합 룰에 매칭되면 SignalPattern으로 띄움.
 *
 * 핵심 원칙: 패턴 트리거는 transient 레이어(daily/monthly/hourly)에서만.
 * decadal/yearly 신호는 한 달 내내 동일하므로 트리거에 쓰면 매일 매칭됨 (의미 없음).
 * decadal/yearly는 "배경 컨텍스트"로만 — 매칭 시 부가 strength 보너스.
 */

interface PatternRule {
  id: string
  name: string
  themes: AstroThemeKey[]
  match: (signals: ActiveSignal[]) => { matched: boolean; strength: number; matchedIds: string[] }
  description?: string
}

// 트리거 = 일별 차이를 만드는 레이어 (그 날만 활성)
// 月運/歲運/大運 신호는 한 달/일년/십년 내내 동일하므로 트리거에 쓰면 매일 매칭됨.
const TRIGGER_LAYERS: SignalLayer[] = ['daily', 'hourly', 'instant']
const isTrigger = (s: ActiveSignal) => TRIGGER_LAYERS.includes(s.layer)
const isBackground = (s: ActiveSignal) =>
  s.layer === 'decadal' || s.layer === 'yearly' || s.layer === 'monthly'

const RULES: PatternRule[] = [
  // ─── 1. 재물 황금주 ───
  // 트리거: 일진 또는 월운에서 재성 활성 + 그 날 길성 트랜짓 peak
  {
    id: 'wealth-golden-week',
    name: '재물 황금주간',
    themes: ['money', 'business'],
    description: '일진·월운 재성 + 길성 트랜짓 peak + 용신 정렬',
    match(signals) {
      // 트리거: transient 레이어 재성만 카운트
      const wealthTransient = signals.filter((s) =>
        isTrigger(s) &&
        (s.evidence.sibsin === '정재' || s.evidence.sibsin === '편재'),
      )
      // 길성 트랜짓 — daily 신호 (transit 추출기는 segment 단위로 daily/monthly 분류)
      // peak 근처만 = orb 작은 거 (≤ 2°)
      const beneficTransitPeak = signals.filter((s) =>
        s.kind === 'transit' &&
        isTrigger(s) &&
        (s.evidence.planets?.includes('Jupiter') || s.evidence.planets?.includes('Venus')) &&
        s.polarity >= 2 &&
        ((s.evidence.orbDegrees ?? 99) <= 2.5),
      )
      if (wealthTransient.length === 0 || beneficTransitPeak.length === 0) {
        return { matched: false, strength: 0, matchedIds: [] }
      }

      // 배경 보너스 — 大運/歲運에 재성 있으면 strength 추가
      const wealthBackground = signals.filter((s) =>
        isBackground(s) &&
        (s.evidence.sibsin === '정재' || s.evidence.sibsin === '편재'),
      )
      const yongsinPrimary = signals.filter((s) =>
        s.evidence.module === 'saju-yongsin' &&
        (s.evidence.detail as { verdict?: string }).verdict === 'primary',
      )

      const ids = [...wealthTransient, ...beneficTransitPeak].map((s) => s.id)
      const strength = Math.min(
        100,
        50 + wealthTransient.length * 8 + beneficTransitPeak.length * 12 +
        wealthBackground.length * 5 + yongsinPrimary.length * 10,
      )
      return { matched: true, strength, matchedIds: ids }
    },
  },

  // ─── 2. 연애·도화 트리거 ───
  // 트리거: 일진에 도화/홍염 신살 + 그 날 Venus 트랜짓 peak
  {
    id: 'romance-trigger',
    name: '도화·연애 트리거',
    themes: ['love'],
    description: '일진 도화/홍염 + Venus 트랜짓 peak',
    match(signals) {
      // 도화·홍염은 일진 단위로만 (shinsal 추출기는 daily 레이어)
      const dohwaTransient = signals.filter((s) =>
        isTrigger(s) &&
        (s.evidence.shinsalName === '도화' || s.evidence.shinsalName === '도화살' ||
         s.evidence.shinsalName === '홍염' || s.evidence.shinsalName === '홍염살'),
      )
      // Venus 트랜짓 peak (orb 작은 거)
      const venusPeak = signals.filter((s) =>
        s.kind === 'transit' &&
        isTrigger(s) &&
        s.evidence.planets?.includes('Venus') &&
        s.polarity >= 1 &&
        ((s.evidence.orbDegrees ?? 99) <= 2.5),
      )
      // 둘 다 있어야 트리거 (한쪽만으론 부족 — 신살 자주, 트랜짓 자주 → 둘 다 + peak)
      if (dohwaTransient.length === 0 || venusPeak.length === 0) {
        return { matched: false, strength: 0, matchedIds: [] }
      }
      const ids = [...dohwaTransient, ...venusPeak].map((s) => s.id)
      const strength = Math.min(100, 50 + dohwaTransient.length * 10 + venusPeak.length * 15)
      return { matched: true, strength, matchedIds: ids }
    },
  },

  // ─── 3. 흉살 집중일 ───
  // 트리거: 그 날 transient 흉신호 5+ 개 + 평균 강도
  {
    id: 'shadow-cluster',
    name: '흉살 집중일',
    themes: ['crisis'],
    description: '일진 흉신호 5+ 발동 + 평균 polarity ≤ -1.5',
    match(signals) {
      // transient 흉신호만 카운트 — decadal 흉 신호 매일 동일이라 제외
      const bad = signals.filter((s) =>
        isTrigger(s) && s.polarity <= -2 && s.weight >= 0.6,
      )
      if (bad.length < 5) return { matched: false, strength: 0, matchedIds: [] }
      const avgPol = bad.reduce((a, s) => a + s.polarity, 0) / bad.length
      if (avgPol > -1.5) return { matched: false, strength: 0, matchedIds: [] }
      return {
        matched: true,
        strength: Math.min(100, 60 + bad.length * 6),
        matchedIds: bad.map((s) => s.id),
      }
    },
  },

  // ─── 4. 5층 정렬 (공명) ───
  // 트리거: 4개 레이어 모두 강한 동방향 (이미 layer-wide 검사라 OK)
  {
    id: 'five-layer-resonance',
    name: '5층 정렬',
    themes: [],
    description: '대운·세운·월운·일진 모두 강한 동방향',
    match(signals) {
      const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily']
      const layerPolarities = new Map<SignalLayer, number[]>()
      for (const s of signals) {
        if (!layers.includes(s.layer)) continue
        const arr = layerPolarities.get(s.layer) ?? []
        arr.push(s.polarity * s.weight)
        layerPolarities.set(s.layer, arr)
      }
      const layerAvgs: Record<string, number> = {}
      for (const l of layers) {
        const arr = layerPolarities.get(l) ?? []
        layerAvgs[l] = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      }
      const positiveLayers = layers.filter((l) => layerAvgs[l] >= 1.0)
      const negativeLayers = layers.filter((l) => layerAvgs[l] <= -1.0)
      if (positiveLayers.length < 4 && negativeLayers.length < 4) {
        return { matched: false, strength: 0, matchedIds: [] }
      }
      const dominant = positiveLayers.length >= 4 ? 'positive' : 'negative'
      const matched = signals.filter((s) =>
        layers.includes(s.layer) &&
        (dominant === 'positive' ? s.polarity >= 2 : s.polarity <= -2),
      )
      return { matched: true, strength: 95, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 5. 천을귀인 + 길성 트라인 ───
  // 이미 daily 신살 + transit이라 transient OK
  {
    id: 'noble-fortune',
    name: '귀인 강림 (Noble Fortune)',
    themes: ['career', 'reputation', 'crisis'],
    description: '천을귀인 일진 + 길성 트라인',
    match(signals) {
      const noble = signals.find((s) =>
        isTrigger(s) && s.evidence.shinsalName === '천을귀인',
      )
      const benefic = signals.find((s) =>
        s.kind === 'transit' &&
        isTrigger(s) &&
        s.evidence.aspectType === 'trine' &&
        (s.evidence.planets?.includes('Jupiter') || s.evidence.planets?.includes('Venus')) &&
        ((s.evidence.orbDegrees ?? 99) <= 3),
      )
      if (!noble || !benefic) return { matched: false, strength: 0, matchedIds: [] }
      return { matched: true, strength: 85, matchedIds: [noble.id, benefic.id] }
    },
  },

  // ─── 6. 라이프 챕터 전환점 ───
  // 트리거: 라이프사이클·ZR은 본질적으로 long-term. 이 패턴은 "월 1회"가 맞음.
  //   → 트리거 조건을 daily 외행성 트랜짓 peak로 한정.
  //   → lifecycle/ZR은 배경 보너스만.
  {
    id: 'life-chapter-shift',
    name: '인생 챕터 전환',
    themes: ['personality', 'spirituality'],
    description: '외행성 트랜짓 peak + 라이프사이클·ZR 배경',
    match(signals) {
      // 트리거: 외행성 트랜짓 peak (orb ≤ 2°)만
      const slowTransitPeak = signals.find((s) =>
        s.kind === 'transit' &&
        isTrigger(s) &&
        s.evidence.planets?.some((p) => ['Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(p)) &&
        ((s.evidence.orbDegrees ?? 99) <= 2),
      )
      if (!slowTransitPeak) return { matched: false, strength: 0, matchedIds: [] }

      // 배경 보너스
      const milestone = signals.find((s) => s.kind === 'lifecycle')
      const zr = signals.find((s) => s.kind === 'zodiacal-releasing')

      const hits = [slowTransitPeak, milestone, zr].filter(Boolean) as ActiveSignal[]
      return {
        matched: true,
        strength: 50 + hits.length * 15,
        matchedIds: hits.map((s) => s.id),
      }
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
