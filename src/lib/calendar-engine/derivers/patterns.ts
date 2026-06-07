import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import type { ActiveSignal, SignalLayer, SignalPattern } from '../types'
import { PATTERN_I18N_EN } from './patternsI18n'

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
  match: (signals: ActiveSignal[]) => {
    matched: boolean
    strength: number
    matchedIds: string[]
    meta?: { sajuLayers?: number; astroLayers?: number }
  }
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
    headline: '재정 영역 — 큰 돈 결정에 우호적인 날',
    description: '일진 재성 + 길성 트랜짓 peak가 동시에 들어옴',
    action:
      '재정 영역의 큰 결정 우호. 미뤘던 투자·계약·정리 한 가지를 골라 오늘 안에 매듭짓고, 통장 한 곳을 30분 들여 정리하세요.',
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
    headline: '관계 영역 — 새 인연이 가까이 오는 날',
    description: '일진 도화/홍염 + Venus 트랜짓 peak',
    action:
      '관계 영역 우호. 오늘 안에 소개 자리·모임에 한 곳 나가거나, 마음에 둔 사람에게 먼저 연락 한 통을 보내세요. 평소 안 가던 장소에서 새 인연이 나타날 가능성.',
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
    headline: '건강·일상 영역 — 신중 모드로 큰 결정 보류일',
    description: '일진에 강한 흉신호 4+개 발동',
    action:
      '큰 결정·계약·이사·이직·새 시작은 다음 길일까지 보류하세요. 오늘은 식사·수면·운전 안전 같은 일상 루틴 한 가지만 단단히 지키고, 위험한 동선·과음·과지출은 피하세요.',
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
    headline: '인생·진로 영역 — 1년 안 가장 강력한 추진 신호',
    description: '사주 5층 + 점성 4층 모두 같은 방향',
    action:
      '사주·점성 모두 같은 답 — 미뤄둔 가장 큰 결정(이직·창업·결혼·이사·큰 투자) 한 가지를 이번 주 안에 매듭짓고 첫 실행 단계까지 옮기세요.',
    match(signals) {
      const sajuLayers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily', 'hourly']
      const astroLayers: SignalLayer[] = ['decadal', 'yearly', 'monthly', 'daily']

      function alignment(
        source: 'saju' | 'astro',
        layers: SignalLayer[],
        minLayers: number,
        minMag: number
      ): { dir: 'positive' | 'negative' | null; count: number } {
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
        const present = layers.filter((l) => layerAvgs[l] !== 0)
        const count = present.length // 신호 있고 정렬에 참여하는 층 수
        if (valid < minLayers) return { dir: null, count }
        const allPos = present.every((l) => layerAvgs[l] > 0)
        const allNeg = present.every((l) => layerAvgs[l] < 0)
        const minAbsMag = present.length
          ? Math.min(...present.map((l) => Math.abs(layerAvgs[l])))
          : 0
        if (allPos && minAbsMag >= minMag) return { dir: 'positive', count }
        if (allNeg && minAbsMag >= minMag) return { dir: 'negative', count }
        return { dir: null, count }
      }

      // 동시 매칭 = 사주 5층 alignment AND 점성 4층 alignment + 같은 방향
      // (saju-five-layer · astro-five-layer 룰과 동일 조건 사용 — 동시는 그 교집합)
      const sajuAlign = alignment('saju', sajuLayers, 4, 0.2)
      const astroAlign = alignment('astro', astroLayers, 3, 0.15)
      if (!sajuAlign.dir || !astroAlign.dir || sajuAlign.dir !== astroAlign.dir) {
        return { matched: false, strength: 0, matchedIds: [] }
      }

      const dominant = sajuAlign.dir
      const matched = signals.filter((s) =>
        dominant === 'positive' ? s.polarity >= 1 : s.polarity <= -1
      )
      // 몇 개 층이 같은 방향인지 — "사주 N/5, 점성 M/4" UI 헤드라인용.
      return {
        matched: true,
        strength: 99,
        matchedIds: matched.map((s) => s.id),
        meta: { sajuLayers: sajuAlign.count, astroLayers: astroAlign.count },
      }
    },
  },

  // ─── 4a. 사주 5층 정렬 (점성 무관) ───
  // 사주만 정렬되어도 명리적으로 의미 있는 시기. 점성은 따로 검사.
  {
    id: 'saju-five-layer',
    name: '사주 5층 정렬',
    themes: [],
    headline: '진로·인생 영역 — 사주 시간축이 같은 방향을 가리키는 달',
    description: '사주 시간축 5개 모두 동방향',
    action:
      '진로·인생 큰 결정에 강한 추진력. 이번 달 안에 미뤄둔 큰 결정(이직·사업·계약·합격 도전) 한 가지를 골라 첫 신청·지원·미팅까지 진행하세요.',
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
      return {
        matched: true,
        strength: 92,
        matchedIds: matched.map((s) => s.id),
        meta: { sajuLayers: present.length },
      }
    },
  },

  // ─── 4b. 점성 4층 정렬 (사주 무관) ───
  // 점성에 명확한 "시진" 단위가 없어 4층(챕터·세운·월·일진)만 검사.
  {
    id: 'astro-five-layer',
    name: '점성 4층 정렬',
    themes: [],
    headline: '진로·외부 기회 영역 — 환경이 같은 답을 주는 달',
    description: '점성 시간축 4개 모두 동방향 (챕터·세운·월·일진)',
    action:
      '외부 환경·기회가 같은 답을 가리키는 시기. 이번 달 안에 미뤄둔 외부 액션(지원·제안·노출·홍보·이주) 한 가지를 골라 실제 신청·발송까지 진행하세요.',
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
      return {
        matched: true,
        strength: 90,
        matchedIds: matched.map((s) => s.id),
        meta: { astroLayers: present.length },
      }
    },
  },

  // ─── 5. 천을귀인 + 길성 트라인 ───
  {
    id: 'noble-fortune',
    name: '귀인 강림',
    themes: ['career', 'health'],
    headline: '관계·인맥 영역 — 도움을 받기 쉬운 날',
    description: '천을귀인 일진 + 길성 트라인',
    action:
      '관계·인맥 영역 우호. 오늘 안에 부탁 한 건·조언 요청 한 건·중요한 만남 한 자리를 진행하고, 멀어진 사람 한 명에게 먼저 연락 한 통을 보내세요.',
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
    headline: '인생 방향 영역 — 챕터가 바뀌는 전환점',
    description: '외행성 트랜짓 peak + 라이프사이클·ZR 배경',
    action:
      '인생 방향 재설계 시기. 오늘 30분 들여 1·3·5년 목표를 노트에 다시 적고, 지금 하던 일 중 정리할 한 가지·새로 시작할 한 가지를 종이에 명시하세요. 자잘한 일은 잠시 미루기.',
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
    headline: '일·승진 영역 — 결재선·자격증 라인이 열리는 흐름',
    description: '관성 + 인성이 같은 기간에 동시 작동 (윗선의 인정 + 받쳐주는 후원)',
    action:
      '일·승진 영역 우호. 이번 주 안에 윗사람·기관 한 곳에 공식 제안서·승진 신청·자격증 등록 한 건을 정식 절차로 제출하세요.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, GWAN), sibsinSignals(signals, IN), 'favorable')
    },
  },

  // ─── 8. 식상생재 (食傷生財) — 재능·표현이 돈으로 ───
  {
    id: 'siksang-wealth',
    name: '식상생재',
    themes: ['money', 'career'],
    headline: '창의·수익 영역 — 만든 것이 돈으로 바뀌는 흐름',
    description: '식상(표현·생산) + 재성(수익)이 같은 기간에 동시 작동',
    action:
      '창의·수익 영역 우호. 이번 주 안에 만들어둔 콘텐츠·강의·시제품·서비스 한 가지를 실제 판매 페이지·세일즈 메시지·인보이스로 옮겨 첫 매출 라인을 여세요.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, SIKSANG), sibsinSignals(signals, JAE), 'favorable')
    },
  },

  // ─── 9. 재생관 (財生官) — 재물이 지위·신뢰로 ───
  {
    id: 'wealth-to-status',
    name: '재생관',
    themes: ['career', 'money'],
    headline: '일·평판 영역 — 실적이 직책·신뢰로 환산되는 흐름',
    description: '재성 + 관성이 같은 기간에 동시 작동 (성과가 직책·평판으로)',
    action:
      '일·평판 영역 우호. 이번 주 안에 최근 매출·성과·실적 수치를 1장 자료로 정리해 윗사람·고객·시장에 보여주고, 직책·재계약·요율 인상 협상 한 건을 시작하세요.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, JAE), sibsinSignals(signals, GWAN), 'favorable')
    },
  },

  // ─── 10. 군겁쟁재 (群劫爭財) — 경쟁이 재물을 분탈 ───
  {
    id: 'wealth-rivalry',
    name: '군겁쟁재',
    themes: ['money'],
    headline: '재정 영역 — 경쟁·분탈로 돈이 새기 쉬운 시기',
    description: '비겁(경쟁) + 재성이 동시 작동하며 이 차트엔 불리하게 기움',
    action:
      '재정 영역 주의. 이번 달 동업·금전 대여·공동 투자·할부 신규 가입은 보류하고, 진행 중 건은 내 지분·환수 조건을 서면으로 못 박으세요. 큰 지출 한 건은 다음 달로 미루기.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, BIGYEOP), sibsinSignals(signals, JAE), 'caution')
    },
  },

  // ─── 11. 상관견관 (傷官見官) — 표현이 규칙·윗선과 충돌 ───
  {
    id: 'output-vs-authority',
    name: '상관견관',
    themes: ['career'],
    headline: '일·관계 영역 — 윗선·규칙과 부딪히기 쉬운 시기',
    description: '상관(자유로운 표현) + 정관(규칙·권위)이 충돌 방향으로 작동',
    action:
      '일·관계 영역 주의. 이번 주 상사·고객·관공서 대상 감정적 직언, SNS 폭로·험담 글, 즉흥 계약 위반은 보류하고, 보내야 할 메일·결재서는 12시간 묵힌 뒤 발송하세요.',
    match(signals) {
      return comboMatch(
        sibsinSignals(signals, ['상관']),
        sibsinSignals(signals, ['정관']),
        'caution'
      )
    },
  },

  // ─── 12. 식신제살 (食神制殺) — 식신이 압박·경쟁을 다스림 ───
  {
    id: 'siksin-controls-pressure',
    name: '식신제살',
    themes: ['career', 'growth'],
    headline: '일·실력 영역 — 압박을 실력으로 눌러 돌파하는 시기',
    description: '식신(꾸준한 생산) + 편관(압박·경쟁)이 제압 방향으로 작동',
    action:
      '일·실력 영역 우호. 미뤄둔 가장 부담스러운 업무·시험·과제 한 가지를 골라 이번 주 안에 정공법으로 정면 돌파하고, 매일 같은 시간 30분 작업 루틴을 끝까지 지키세요.',
    match(signals) {
      return comboMatch(
        sibsinSignals(signals, ['식신']),
        sibsinSignals(signals, ['편관']),
        'favorable'
      )
    },
  },

  // ─── 13. 상관패인 (傷官佩印) — 표현 + 절제의 균형 ───
  {
    id: 'expression-with-restraint',
    name: '상관패인',
    themes: ['growth', 'career'],
    headline: '창의·배움 영역 — 아이디어를 학습으로 완성도까지 끌어올리는 시기',
    description: '상관(자유로운 재능) + 인성(절제·학습)이 균형 방향으로 작동',
    action:
      '창의·배움 영역 우호. 작업 중인 글·기획·발표·작품 하나를 골라 이번 주 안에 자료 조사·레퍼런스 학습을 더해 한 단계 더 다듬고 초안→마감본까지 완성하세요.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, ['상관']), sibsinSignals(signals, IN), 'favorable')
    },
  },

  // ─── 14. 관살혼잡 (官殺混雜) — 정관·편관 혼재 ───
  {
    id: 'authority-mixed',
    name: '관살혼잡',
    themes: ['career'],
    headline: '일·조직 영역 — 여러 라인·기준이 충돌해 산만한 시기',
    description: '정관 + 편관이 동시에 떠 결정·라인이 흐려짐',
    action:
      '일·조직 영역 주의. 이번 주 보고 라인 한 곳을 명시적으로 정해 나머지 윗선·기준은 잠시 보류하고, 들어오는 곁가지 요청 한 건은 정중히 거절하거나 다음 달로 미루세요.',
    match(signals) {
      return comboMatch(
        sibsinSignals(signals, ['정관']),
        sibsinSignals(signals, ['편관']),
        'caution'
      )
    },
  },

  // ─── 15. 탐재괴인 (貪財壞印) — 재물 욕심이 명예·학업을 흔듦 ───
  {
    id: 'wealth-erodes-resource',
    name: '탐재괴인',
    themes: ['growth', 'money'],
    headline: '재정·평판 영역 — 단기 이익이 신뢰·배움을 갉을 수 있는 시기',
    description: '재성 + 인성이 상극 방향으로 작동 (재가 인을 깸)',
    action:
      '재정·평판 영역 주의. 이번 주 들어온 단기 수익·외주·부업 제안 중 평판·자격증·본업·학업을 깎아먹는 건 한 건은 거절하고, 공부·자격증 일정은 그대로 지키세요.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, JAE), sibsinSignals(signals, IN), 'caution')
    },
  },

  // ─── 16. 토수 (吐秀) — 비겁 에너지가 표현으로 분출 ───
  {
    id: 'energy-into-output',
    name: '토수(吐秀)',
    themes: ['growth', 'career'],
    headline: '창의·활동 영역 — 넘치는 활력을 결과물로 쏟아내는 시기',
    description: '비겁(자기 에너지) + 식상(표현·생산)이 분출 방향으로 작동',
    action:
      '창의·활동 영역 우호. 이번 주 안에 협업·발표·라이브·공연·운동·공모전 한 건을 직접 실행하고, 묵혀둔 초안 한 편은 끝까지 마무리해 외부에 공개하세요.',
    match(signals) {
      return comboMatch(
        sibsinSignals(signals, BIGYEOP),
        sibsinSignals(signals, SIKSANG),
        'favorable'
      )
    },
  },

  // ─── 17. 인비방조 (印比幇助) — 후원·동료가 약한 일간을 받침 ───
  {
    id: 'support-reinforcement',
    name: '인비방조',
    themes: ['health', 'growth'],
    headline: '건강·관계 영역 — 주변 도움으로 체력을 회복하는 시기',
    description: '인성(후원) + 비겁(동료·자기)이 보강 방향으로 작동 (약한 기운에 힘이 됨)',
    action:
      '건강·관계 영역 우호. 이번 주 혼자 끌어안고 있던 일 한 건은 동료·가족·전문가에게 분담 요청하고, 매일 30분 휴식·운동·수면 보강 루틴 한 가지를 지키세요.',
    match(signals) {
      return comboMatch(sibsinSignals(signals, IN), sibsinSignals(signals, BIGYEOP), 'favorable')
    },
  },
]

export function derivePatterns(signals: ActiveSignal[]): SignalPattern[] {
  const matched: SignalPattern[] = []
  for (const rule of RULES) {
    const result = rule.match(signals)
    if (!result.matched) continue
    const en = PATTERN_I18N_EN[rule.id]
    matched.push({
      id: rule.id,
      name: rule.name,
      themes: rule.themes,
      matchedSignalIds: result.matchedIds,
      strength: result.strength,
      description: rule.description,
      headline: rule.headline,
      action: rule.action,
      nameEn: en?.name,
      descriptionEn: en?.description,
      headlineEn: en?.headline,
      actionEn: en?.action,
      meta: result.meta,
    })
  }
  return matched
}
