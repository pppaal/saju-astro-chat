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

// ── 십신 조합 (古典 명리) 헬퍼 ──
// 두 십신이 "활성 기간"(歲運·月運·日辰)에 동시 존재할 때 발동.
// decadal(大運)은 10년 고정이라 제외 — 그래야 달·해마다 패턴이 바뀜.
// 방향 게이트: 같은 조합도 用神 조화에 따라 길흉이 갈리므로(예: 신약의
// 비겁은 오히려 도움) polarity 부호로 차트별 작동 여부를 가린다.
const PERIOD_LAYERS: SignalLayer[] = ['yearly', 'monthly', 'daily']
function sibsinSignals(signals: ActiveSignal[], names: string[]): ActiveSignal[] {
  return signals.filter(
    (s) =>
      s.kind === 'pillar-sibsin' &&
      PERIOD_LAYERS.includes(s.layer) &&
      names.includes((s.evidence.sibsin as string | undefined) ?? '')
  )
}
function netPolarity(sigs: ActiveSignal[]): number {
  if (sigs.length === 0) return 0
  return sigs.reduce((a, s) => a + s.polarity * (s.weight ?? 0.5), 0) / sigs.length
}
function comboMatch(
  groupA: ActiveSignal[],
  groupB: ActiveSignal[],
  dir: 'favorable' | 'caution'
): { matched: boolean; strength: number; matchedIds: string[] } {
  if (groupA.length === 0 || groupB.length === 0) {
    return { matched: false, strength: 0, matchedIds: [] }
  }
  const all = [...groupA, ...groupB]
  const net = netPolarity(all)
  // 차트별 작동 게이트 — 길조합은 비음(非陰), 흉조합은 비양(非陽)일 때만.
  if (dir === 'favorable' && net < 0.1) return { matched: false, strength: 0, matchedIds: [] }
  if (dir === 'caution' && net > -0.1) return { matched: false, strength: 0, matchedIds: [] }
  const mag = Math.min(1, Math.abs(net))
  const strength = Math.min(100, 55 + Math.round(mag * 30) + (groupA.length + groupB.length) * 3)
  return { matched: true, strength, matchedIds: [...new Set(all.map((s) => s.id))] }
}

const GWAN = ['정관', '편관']
const IN = ['정인', '편인']
const JAE = ['정재', '편재']
const SIKSANG = ['식신', '상관']
const BIGYEOP = ['비견', '겁재']

const RULES: PatternRule[] = [
  // ─── 1. 재물 황금주 ───
  // 트리거: 일진 또는 월운에서 재성 활성 + 그 날 길성 트랜짓 peak
  {
    id: 'wealth-golden-week',
    name: '재물 황금주간',
    themes: ['money'],
    headline: '오늘은 재물 흐름이 두텁게 들어오는 날',
    description: '일진 재성 + 길성 트랜짓 peak가 동시에 들어옴',
    action: '투자·계약·큰 결정·재정 정리에 우호적. 미뤘던 돈 관련 일을 처리하기 좋음.',
    match(signals) {
      // 트리거: transient 레이어 재성만 카운트
      const wealthTransient = signals.filter(
        (s) => isTrigger(s) && (s.evidence.sibsin === '정재' || s.evidence.sibsin === '편재')
      )
      // 길성 트랜짓 — daily 신호 (transit 추출기는 segment 단위로 daily/monthly 분류)
      // peak 근처만 = orb 작은 거 (≤ 2°)
      const beneficTransitPeak = signals.filter(
        (s) =>
          s.kind === 'transit' &&
          isTrigger(s) &&
          (s.evidence.planets?.includes('Jupiter') || s.evidence.planets?.includes('Venus')) &&
          s.polarity >= 2 &&
          (s.evidence.orbDegrees ?? 99) <= 2.5
      )
      if (wealthTransient.length === 0 || beneficTransitPeak.length === 0) {
        return { matched: false, strength: 0, matchedIds: [] }
      }

      // 배경 보너스 — 大運/歲運에 재성 있으면 strength 추가
      const wealthBackground = signals.filter(
        (s) => isBackground(s) && (s.evidence.sibsin === '정재' || s.evidence.sibsin === '편재')
      )
      const yongsinPrimary = signals.filter(
        (s) =>
          s.evidence.module === 'saju-yongsin' &&
          (s.evidence.detail as { verdict?: string }).verdict === 'primary'
      )

      const ids = [...wealthTransient, ...beneficTransitPeak].map((s) => s.id)
      const strength = Math.min(
        100,
        50 +
          wealthTransient.length * 8 +
          beneficTransitPeak.length * 12 +
          wealthBackground.length * 5 +
          yongsinPrimary.length * 10
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
      const dohwaTransient = signals.filter(
        (s) =>
          isTrigger(s) &&
          (s.evidence.shinsalName === '도화' ||
            s.evidence.shinsalName === '도화살' ||
            s.evidence.shinsalName === '홍염' ||
            s.evidence.shinsalName === '홍염살')
      )
      // Venus 트랜짓 peak (orb 작은 거)
      const venusPeak = signals.filter(
        (s) =>
          s.kind === 'transit' &&
          isTrigger(s) &&
          s.evidence.planets?.includes('Venus') &&
          s.polarity >= 1 &&
          (s.evidence.orbDegrees ?? 99) <= 2.5
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
    themes: ['health'],
    headline: '오늘은 신중 모드 — 큰 결정 미루기',
    description: '일진에 강한 흉신호 4+개 발동',
    action: '큰 결정·계약·이동·새 시작은 길일로 미루기. 일상 루틴 유지에 집중.',
    match(signals) {
      // transient 흉신호만 카운트 — decadal 흉 신호 매일 동일이라 제외
      const bad = signals.filter((s) => isTrigger(s) && s.polarity <= -2 && s.weight >= 0.6)
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

  // ─── 4. 5층 정렬 (공명) — 사주 5층 × 점성 4층 ───
  // 사주: 大運·歲運·月運·日辰·時辰 (5층)
  // 점성: ZR챕터·세운트랜짓·월간트랜짓·일진어스펙트 (4층 — 행성시는 미세함)
  // 둘 다 정렬 + 같은 방향 → 진짜 사주×점성 동시 공명.
  {
    id: 'five-layer-resonance',
    name: '5층 정렬 (사주×점성 동시)',
    themes: [],
    headline: '사주 5층 + 점성 4층 — 동서양 동시 정렬',
    description: '사주 5층 + 점성 4층 모두 같은 방향',
    action: '큰 결정의 절호. 사주와 점성이 동시에 같은 답을 주는 드문 시기.',
    match(signals) {
      const sajuLayers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily', 'hourly']
      const astroLayers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily']

      function alignment(
        source: 'saju' | 'astro',
        layers: SignalLayer[],
        minLayers: number,
        minMag: number
      ): 'positive' | 'negative' | null {
        const layerAvgs: Record<string, number> = {}
        let valid = 0
        for (const l of layers) {
          const sigs = signals.filter((s) => s.layer === l && s.source === source)
          if (sigs.length === 0) {
            layerAvgs[l] = 0
            continue
          }
          layerAvgs[l] = sigs.reduce((a, s) => a + s.polarity * s.weight, 0) / sigs.length
          valid++
        }
        if (valid < minLayers) return null
        const present = layers.filter((l) => layerAvgs[l] !== 0)
        const allPos = present.every((l) => layerAvgs[l] > 0)
        const allNeg = present.every((l) => layerAvgs[l] < 0)
        const minAbsMag = Math.min(...present.map((l) => Math.abs(layerAvgs[l])))
        if (allPos && minAbsMag >= minMag) return 'positive'
        if (allNeg && minAbsMag >= minMag) return 'negative'
        return null
      }

      // 동시 매칭 = 사주 5층 alignment AND 점성 4층 alignment + 같은 방향
      // (saju-five-layer · astro-five-layer 룰과 동일 조건 사용 — 동시는 그 교집합)
      const sajuAlign = alignment('saju', sajuLayers, 4, 0.2)
      const astroAlign = alignment('astro', astroLayers, 3, 0.15)
      if (!sajuAlign || !astroAlign || sajuAlign !== astroAlign) {
        return { matched: false, strength: 0, matchedIds: [] }
      }

      const dominant = sajuAlign
      const matched = signals.filter((s) =>
        dominant === 'positive' ? s.polarity >= 1 : s.polarity <= -1
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
        if (sigs.length === 0) {
          layerAvgs[l] = 0
          continue
        }
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
      const matched = signals.filter(
        (s) => s.source === 'saju' && layers.includes(s.layer) && s.polarity * dominant >= 1
      )
      return { matched: true, strength: 92, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 4b. 점성 4층 정렬 (사주 무관) ───
  // 점성에 명확한 "시진" 단위가 없어 4층(챕터·세운·월·일진)만 검사.
  {
    id: 'astro-five-layer',
    name: '점성 4층 정렬',
    themes: [],
    headline: '점성 4층 정렬 — 행성 흐름이 모두 같은 방향',
    description: '점성 시간축 4개 모두 동방향 (챕터·세운·월·일진)',
    action: '점성적 흐름 정렬기. 외부 환경과 기회가 같은 신호를 주는 시기.',
    match(signals) {
      const layers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily']
      const layerAvgs: Record<string, number> = {}
      let validLayers = 0
      for (const l of layers) {
        const sigs = signals.filter((s) => s.layer === l && s.source === 'astro')
        if (sigs.length === 0) {
          layerAvgs[l] = 0
          continue
        }
        layerAvgs[l] = sigs.reduce((a, s) => a + s.polarity * s.weight, 0) / sigs.length
        validLayers++
      }
      // 점성 4층 모두 신호 있어야
      if (validLayers < 3) return { matched: false, strength: 0, matchedIds: [] }
      const present = layers.filter((l) => layerAvgs[l] !== 0)
      // 모든 layer 같은 부호 + 최소 강도 0.15
      const minMagnitude = Math.min(...present.map((l) => Math.abs(layerAvgs[l])))
      const allPos = present.every((l) => layerAvgs[l] > 0)
      const allNeg = present.every((l) => layerAvgs[l] < 0)
      const positive = allPos && minMagnitude >= 0.15
      const negative = allNeg && minMagnitude >= 0.15
      if (!positive && !negative) return { matched: false, strength: 0, matchedIds: [] }
      const dominant = positive ? 1 : -1
      const matched = signals.filter(
        (s) => s.source === 'astro' && layers.includes(s.layer) && s.polarity * dominant >= 1
      )
      return { matched: true, strength: 90, matchedIds: matched.map((s) => s.id) }
    },
  },

  // ─── 5. 천을귀인 + 길성 트라인 ───
  {
    id: 'noble-fortune',
    name: '귀인 강림',
    themes: ['career', 'health'],
    headline: '오늘은 도움 받기 좋은 날',
    description: '천을귀인 일진 + 길성 트라인',
    action: '부탁·조언·중요한 만남 — 평소 멀어진 인맥에 먼저 연락하기 좋음.',
    match(signals) {
      const noble = signals.find((s) => isTrigger(s) && s.evidence.shinsalName === '천을귀인')
      const benefic = signals.find(
        (s) =>
          s.kind === 'transit' &&
          isTrigger(s) &&
          s.evidence.aspectType === 'trine' &&
          (s.evidence.planets?.includes('Jupiter') || s.evidence.planets?.includes('Venus')) &&
          (s.evidence.orbDegrees ?? 99) <= 3
      )
      if (!noble || !benefic) return { matched: false, strength: 0, matchedIds: [] }
      return { matched: true, strength: 85, matchedIds: [noble.id, benefic.id] }
    },
  },

  // ─── 6. 라이프 챕터 전환점 ───
  {
    id: 'life-chapter-shift',
    name: '인생 챕터 전환',
    themes: ['growth'],
    headline: '인생 큰 흐름의 전환점',
    description: '외행성 트랜짓 peak + 라이프사이클·ZR 배경',
    action: '큰 그림을 다시 그리기 좋음. 작은 일에 매이지 말고 방향성 점검.',
    match(signals) {
      // 트리거: 외행성 트랜짓 peak (orb ≤ 2°)만
      const slowTransitPeak = signals.find(
        (s) =>
          s.kind === 'transit' &&
          isTrigger(s) &&
          s.evidence.planets?.some((p) => ['Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(p)) &&
          (s.evidence.orbDegrees ?? 99) <= 2
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

  // ─── 7. 관인상생 (官印相生) — 권위 + 후원이 함께 흐름 ───
  {
    id: 'gwan-in-flow',
    name: '관인상생',
    themes: ['career', 'growth'],
    headline: '인정·승진의 결재선이 열리는 흐름',
    description: '관성 + 인성이 같은 기간에 동시 작동 (윗선의 인정 + 받쳐주는 후원)',
    action: '승진·자격·결재·공식 절차에 우호적. 윗사람·기관에 정식으로 제안하기 좋음.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, GWAN), sibsinSignals(signals, IN), 'favorable')
    },
  },

  // ─── 8. 식상생재 (食傷生財) — 재능·표현이 돈으로 ───
  {
    id: 'siksang-wealth',
    name: '식상생재',
    themes: ['money', 'career'],
    headline: '재능이 수익으로 이어지는 흐름',
    description: '식상(표현·생산) + 재성(수익)이 같은 기간에 동시 작동',
    action: '콘텐츠·영업·사이드 프로젝트·창작의 수익화에 우호적. 만든 것을 파는 행동으로.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, SIKSANG), sibsinSignals(signals, JAE), 'favorable')
    },
  },

  // ─── 9. 재생관 (財生官) — 재물이 지위·신뢰로 ───
  {
    id: 'wealth-to-status',
    name: '재생관',
    themes: ['career', 'money'],
    headline: '재물이 지위·신뢰로 환산되는 흐름',
    description: '재성 + 관성이 같은 기간에 동시 작동 (성과가 직책·평판으로)',
    action: '실적을 가시화해 직책·계약·평판으로 연결하기 좋음. 투자가 입지로 돌아오는 시기.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, JAE), sibsinSignals(signals, GWAN), 'favorable')
    },
  },

  // ─── 10. 군겁쟁재 (群劫爭財) — 경쟁이 재물을 분탈 ───
  {
    id: 'wealth-rivalry',
    name: '군겁쟁재',
    themes: ['money'],
    headline: '경쟁·분탈로 돈이 새기 쉬운 흐름',
    description: '비겁(경쟁) + 재성이 동시 작동하며 이 차트엔 불리하게 기움',
    action: '동업·금전 대여·공동 지출은 신중히. 내 몫을 분명히 하고 큰 지출은 미루기.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, BIGYEOP), sibsinSignals(signals, JAE), 'caution')
    },
  },

  // ─── 11. 상관견관 (傷官見官) — 표현이 규칙·윗선과 충돌 ───
  {
    id: 'output-vs-authority',
    name: '상관견관',
    themes: ['career'],
    headline: '윗선·규칙과 부딪히기 쉬운 흐름',
    description: '상관(자유로운 표현) + 정관(규칙·권위)이 충돌 방향으로 작동',
    action: '상사·계약·법·규정과의 마찰 주의. 감정적 직언·SNS 설화 조심, 공식 절차는 또렷이.',
    match(signals) {
      return comboMatch(
        sibsinSignals(signals, ['상관']),
        sibsinSignals(signals, ['정관']),
        'caution'
      )
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
