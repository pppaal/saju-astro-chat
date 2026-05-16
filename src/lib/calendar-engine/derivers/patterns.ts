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
  /** 근거 한 줄 — 어떤 신호 조합인지 */
  description?: string
  /** 사용자 액션 추천 — 발동 시 "이 날엔 X 하세요" */
  action?: string
  /** UI 헤드라인 — "오늘은 ... 발동일!" */
  headline?: string
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
    headline: '오늘은 재물 흐름이 두텁게 들어오는 날',
    description: '일진 재성 + 길성 트랜짓 peak가 동시에 들어옴',
    action: '투자·계약·큰 결정·재정 정리에 우호적. 미뤘던 돈 관련 일을 처리하기 좋음.',
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
  {
    id: 'romance-trigger',
    name: '도화·연애 트리거',
    themes: ['love'],
    headline: '오늘은 인연이 가까이 오는 날',
    description: '일진 도화/홍염 + Venus 트랜짓 peak',
    action: '소개 자리·모임·연락 시도가 우호적. 평소 어울리지 않는 곳에서 새 인연 가능.',
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
  {
    id: 'shadow-cluster',
    name: '흉살 집중일',
    themes: ['crisis'],
    headline: '오늘은 신중 모드 — 큰 결정 미루기',
    description: '일진에 강한 흉신호 4+개 발동',
    action: '큰 결정·계약·이동·새 시작은 길일로 미루기. 일상 루틴 유지에 집중.',
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

  // ─── 4. 5층 정렬 (공명) — 진짜 5층 (大運·歲運·月運·日辰·時辰) ───
  // 사주 5층 AND 점성 5층 모두 같은 방향일 때만 매칭.
  // raw data 둘 다 진짜로 정렬돼야 의미 있음.
  {
    id: 'five-layer-resonance',
    name: '5층 정렬 (사주×점성 동시)',
    themes: [],
    headline: '5층 정렬 — 사주와 점성 모두 같은 방향',
    description: '사주 5층 + 점성 5층 모두 정렬 — 진짜 동시 공명',
    action: '큰 결정의 절호. 사주와 점성이 동시에 같은 답을 주는 드문 시기.',
    match(signals) {
      const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily', 'hourly']

      // source × layer별 평균 polarity
      function avgByLayer(source: 'saju' | 'astro'): Record<SignalLayer, number> | null {
        const result: Record<string, number> = {}
        let hasAnySignal = false
        for (const l of layers) {
          const sigs = signals.filter((s) => s.layer === l && s.source === source)
          if (sigs.length === 0) {
            result[l] = 0
            continue
          }
          hasAnySignal = true
          result[l] = sigs.reduce((a, s) => a + s.polarity * s.weight, 0) / sigs.length
        }
        return hasAnySignal ? (result as Record<SignalLayer, number>) : null
      }

      const sajuLayer = avgByLayer('saju')
      const astroLayer = avgByLayer('astro')
      if (!sajuLayer || !astroLayer) {
        return { matched: false, strength: 0, matchedIds: [] }
      }

      // 각 source가 모든 layer에서 같은 방향인지 검사
      function alignment(la: Record<SignalLayer, number>): 'positive' | 'negative' | null {
        const present = layers.filter((l) => la[l] !== 0)
        if (present.length < 3) return null   // 최소 3개 layer는 신호 있어야
        const allPos = present.every((l) => la[l] > 0)
        const allNeg = present.every((l) => la[l] < 0)
        const avg = present.reduce((a, l) => a + la[l], 0) / present.length
        // 모든 layer가 |강도| ≥ 0.15 (drift 무시)
        const minMag = Math.min(...present.map((l) => Math.abs(la[l])))
        if (allPos && minMag >= 0.15) return 'positive'
        if (allNeg && minMag >= 0.15) return 'negative'
        return null
      }

      const sajuAlign = alignment(sajuLayer)
      const astroAlign = alignment(astroLayer)

      // 둘 다 정렬 + 같은 방향
      if (!sajuAlign || !astroAlign || sajuAlign !== astroAlign) {
        return { matched: false, strength: 0, matchedIds: [] }
      }

      const dominant = sajuAlign
      const matched = signals.filter((s) =>
        layers.includes(s.layer) &&
        (dominant === 'positive' ? s.polarity >= 1 : s.polarity <= -1),
      )
      return { matched: true, strength: 99, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 4a. 사주 5층 정렬 (점성 무관) ───
  // 사주만 정렬되어도 명리적으로 의미 있는 시기. 점성은 따로 검사.
  {
    id: 'saju-five-layer',
    name: '사주 5층 정렬',
    themes: [],
    headline: '사주 5층 정렬 — 대운부터 시진까지 같은 방향',
    description: '사주 시간축 5개 모두 동방향',
    action: '명리적 흐름이 모두 정렬된 시기. 큰 결정·시작에 강한 추진력.',
    match(signals) {
      const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily', 'hourly']
      const layerAvgs: Record<string, number> = {}
      let validLayers = 0
      for (const l of layers) {
        const sigs = signals.filter((s) => s.layer === l && s.source === 'saju')
        if (sigs.length === 0) { layerAvgs[l] = 0; continue }
        layerAvgs[l] = sigs.reduce((a, s) => a + s.polarity * s.weight, 0) / sigs.length
        validLayers++
      }
      if (validLayers < 4) return { matched: false, strength: 0, matchedIds: [] }
      const present = layers.filter((l) => layerAvgs[l] !== 0)
      if (present.length < 5) return { matched: false, strength: 0, matchedIds: [] }
      // 진짜 정렬 — 모든 layer가 |강도| ≥ 0.5 + 같은 부호
      // (가장 약한 layer 기준 — 어떤 layer라도 약하면 매칭 X)
      const minMagnitude = Math.min(...present.map((l) => Math.abs(layerAvgs[l])))
      const allPos = present.every((l) => layerAvgs[l] > 0)
      const allNeg = present.every((l) => layerAvgs[l] < 0)
      const positive = allPos && minMagnitude >= 0.2
      const negative = allNeg && minMagnitude >= 0.2
      if (!positive && !negative) return { matched: false, strength: 0, matchedIds: [] }
      const dominant = positive ? 1 : -1
      const matched = signals.filter((s) =>
        s.source === 'saju' && layers.includes(s.layer) && s.polarity * dominant >= 1,
      )
      return { matched: true, strength: 92, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 4b. 점성 5층 정렬 (사주 무관) ───
  // 점성만 정렬되어도 의미 — 대운 챕터·세운·월간 트랜짓·일진 어스펙트·행성시 정렬.
  {
    id: 'astro-five-layer',
    name: '점성 5층 정렬',
    themes: [],
    headline: '점성 5층 정렬 — 행성 흐름이 모두 같은 방향',
    description: '점성 시간축 5개 모두 동방향',
    action: '점성적 흐름 정렬기. 외부 환경과 기회가 같은 신호를 주는 시기.',
    match(signals) {
      const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily', 'hourly']
      const layerAvgs: Record<string, number> = {}
      let validLayers = 0
      for (const l of layers) {
        const sigs = signals.filter((s) => s.layer === l && s.source === 'astro')
        if (sigs.length === 0) { layerAvgs[l] = 0; continue }
        layerAvgs[l] = sigs.reduce((a, s) => a + s.polarity * s.weight, 0) / sigs.length
        validLayers++
      }
      if (validLayers < 4) return { matched: false, strength: 0, matchedIds: [] }
      const present = layers.filter((l) => layerAvgs[l] !== 0)
      if (present.length < 5) return { matched: false, strength: 0, matchedIds: [] }
      // 진짜 정렬 — 모든 layer가 |강도| ≥ 0.5 + 같은 부호
      // (가장 약한 layer 기준 — 어떤 layer라도 약하면 매칭 X)
      const minMagnitude = Math.min(...present.map((l) => Math.abs(layerAvgs[l])))
      const allPos = present.every((l) => layerAvgs[l] > 0)
      const allNeg = present.every((l) => layerAvgs[l] < 0)
      const positive = allPos && minMagnitude >= 0.2
      const negative = allNeg && minMagnitude >= 0.2
      if (!positive && !negative) return { matched: false, strength: 0, matchedIds: [] }
      const dominant = positive ? 1 : -1
      const matched = signals.filter((s) =>
        s.source === 'astro' && layers.includes(s.layer) && s.polarity * dominant >= 1,
      )
      return { matched: true, strength: 90, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 5. 천을귀인 + 길성 트라인 ───
  {
    id: 'noble-fortune',
    name: '귀인 강림',
    themes: ['career', 'reputation', 'crisis'],
    headline: '오늘은 도움 받기 좋은 날',
    description: '천을귀인 일진 + 길성 트라인',
    action: '부탁·조언·중요한 만남 — 평소 멀어진 인맥에 먼저 연락하기 좋음.',
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
  {
    id: 'life-chapter-shift',
    name: '인생 챕터 전환',
    themes: ['personality', 'spirituality'],
    headline: '인생 큰 흐름의 전환점',
    description: '외행성 트랜짓 peak + 라이프사이클·ZR 배경',
    action: '큰 그림을 다시 그리기 좋음. 작은 일에 매이지 말고 방향성 점검.',
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
      headline: rule.headline,
      action: rule.action,
    })
  }
  return matched
}
