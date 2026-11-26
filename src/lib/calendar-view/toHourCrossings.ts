/**
 * 시진별 하루 리듬 — Day tier '하루 시간 리듬' 원료.
 *
 * 사주 측: 그 날 12 시진 중 의미 있는(용신 부합/기피) 시진 — 일진 cell 안에
 *   이미 들어있는 hourly pillar-sibsin 신호(sajuHourExtractor)에서 그대로 뽑는다.
 *   (polarity 0 중립은 extractor 가 미리 걸러냄 → '켜지는 시간'만 남음.)
 * 점성 측: 그 시진 한가운데 순간의 상승궁(Ascendant) — 나란히 보여 주는 사실일 뿐이다.
 *
 * 시각 (재감사 TP-8): 줄의 시각은 엔진 시진 창 그대로 — 평균태양시라 출생지 경도·그날 UTC
 * offset 만큼 명목 시각에서 움직인다(서울 子 23:32–01:32, 마드리드 여름 卯 07:15–09:15).
 * 상승궁도 그 *실제* 창의 한가운데 순간(신호 detail.centerUtc)에서 구한다. 예전엔 '5-7am'
 * 같은 명목 라벨과 명목 시각+1시의 상승궁을 보여 줘, 서울 밖에선 30분~2시간 넘게 다른
 * 시각을 말했다.
 *
 * 교차 아님 (owner 결정 19, 재감사 CC-3): 시진 × 상승궁(룰러) 짝은 교차가 아니다 — 상승궁
 * 룰러는 하늘에서 움직이는 행성이 아니라 그 시각의 지정(행성시와 같은 부류, 결정 10)이다.
 * 그래서 matched·교차 해석을 싣지 않는다. 예전엔 의미 사전으로 '정관 × 토성' 같은 짝을
 * 교차로 내보내 CROSS_LAYER_BAND 밖(2시간 시진 × 토성·목성)을 교차로 보여 줬다. 시진 교차는
 * 엔진 cross-activation 의 hourly 층(시진 × 빠른 행성, 밴드 안)만이다.
 */

import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import { calcHouses } from '@/lib/astrology/foundation/houses'
import { isoToJD, natalToJD } from '@/lib/astrology/foundation/shared'
import { formatLongitude } from '@/lib/astrology/foundation/utils'
import {
  HOUR_BRANCH_NARRATIVE,
  pickHourNarrative,
} from '@/lib/calendar-engine/data/hourBranchNarrative'
import { SIGN_KO } from './shared'

// HOUR_BRANCH_NARRATIVE 키(한글 시지) — 원본 Branch 타입이 미노출이라 동형 재정의.
type HangulBranch =
  | '자'
  | '축'
  | '인'
  | '묘'
  | '진'
  | '사'
  | '오'
  | '미'
  | '신'
  | '유'
  | '술'
  | '해'

/** 한자 시지 → 한글 (HOUR_BRANCH_NARRATIVE 키). */
const HANJA_TO_HANGUL: Record<string, HangulBranch> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

export interface HourCrossItem {
  /** 시진 실제 시계 창 라벨 — '07:15–09:15 (묘시)'. */
  when: string
  /** 시진 실제 시계 창 라벨(en) — '07:15–09:15 (Rabbit hour)'. */
  whenEn: string
  /** 그 시진의 실제 시작 시계 시각 'HH:MM' (자정을 감싸는 지지는 전날 밤 시각). */
  clockStart: string
  /** 그 시진의 실제 끝 시계 시각 'HH:MM'. */
  clockEnd: string
  /** 시주 천간의 일간 기준 십신. */
  sibsin: string
  /** 용신 부합(길) / 기피(주의). */
  tone: 'good' | 'caution'
  /** 그 시진 한가운데 순간의 상승궁 한글 — '게자리'. 출생지 미상이면 ''. */
  risingSignKo: string
  /** 그 시진 한가운데 순간의 상승궁 영문 — 'Cancer'. 출생지 미상이면 ''. */
  risingSignEn: string
  /** 시진 흐름 한 줄(사주 narrative, ko). */
  narrative?: string
  /** 시진 흐름 한 줄(en). */
  narrativeEn?: string
  /** |polarity| — 메인에 가장 센 시진만 추리는 용. */
  strength: number
}

interface HourSignalDetail {
  hourBranch?: string
  hourStem?: string
  clockStart?: string
  clockEnd?: string
  centerUtc?: string
}

/** 떠 있는 벽시계 ISO('YYYY-MM-DDTHH:MM…Z') 의 'HH:MM' — 하루 끝(23:59:59.999)은 '24:00'. */
function clockOf(floatingIso: string): string {
  if (/T23:59:59\.999Z$/.test(floatingIso)) return '24:00'
  return floatingIso.slice(11, 16)
}

/**
 * 일진 cell 의 hourly 시진 신호 + 그 시진 한가운데 상승궁 → 시진별 리듬 줄(시각순).
 *
 * @param dayCell      포커스 일자의 CalendarCell (signals 에 hourly 시진 포함)
 * @param focusDayIso  'YYYY-MM-DD'
 * @param loc          본명 위치(상승점은 위·경도 의존) — natal.astro.location
 * @param opts.placeUnreliable  출생시각/출생지 미상(natal.astro.placeUnreliable) — 좌표가
 *   기본값 폴백이라 그 시각 상승궁을 구하지 않는다. 시진은 사주 한 줄만 남는다(엔진 감사 F1).
 */
export function buildHourCrossings(
  dayCell: CalendarCell,
  focusDayIso: string,
  loc: { latitude: number; longitude: number; timeZone: string },
  opts: { placeUnreliable?: boolean } = {}
): HourCrossItem[] {
  const placeUnreliable = opts.placeUnreliable === true
  const [year, month, date] = focusDayIso.split('-').map(Number)
  if (!year || !month || !date) return []

  // 시각순 — 떠 있는 벽시계 창 시작(자정을 감싸는 지지는 00:00 조각이 먼저).
  const hourSigs = dayCell.signals
    .filter((s) => s.kind === 'pillar-sibsin' && s.layer === 'hourly')
    .sort((a, b) => Date.parse(a.active.start) - Date.parse(b.active.start))

  const rows: HourCrossItem[] = []
  // 자정을 감싸는 시진(보통 子)은 엔진이 민용일 안에서 두 조각(00시대·23시대)으로 낸다
  // (CONVENTIONS §1). 같은 時柱·같은 창이라 한 줄만 — 시각순 첫 조각(자정 직후)을 남긴다.
  const seenPillar = new Set<string>()
  for (const s of hourSigs) {
    const det = (s.evidence?.detail ?? {}) as HourSignalDetail
    if (det.hourBranch && det.hourStem) {
      const pillarKey = `${det.hourStem}${det.hourBranch}`
      if (seenPillar.has(pillarKey)) continue
      seenPillar.add(pillarKey)
    }
    // 실제 시계 창 — 엔진 detail(그 시진 한 번 전체), 없으면(구 셀) 이 조각의 창.
    const clockStart = det.clockStart ?? clockOf(s.active.start)
    const clockEnd = det.clockEnd ?? clockOf(s.active.end)
    const branchHangul = det.hourBranch ? HANJA_TO_HANGUL[det.hourBranch] : undefined
    const nar = branchHangul ? HOUR_BRANCH_NARRATIVE[branchHangul] : undefined
    const span = `${clockStart}–${clockEnd}`
    const when = nar ? `${span} (${nar.nameKo})` : span
    const whenEn = nar ? `${span} (${nar.nameEn})` : span
    const sibsin = s.evidence?.sibsin ?? ''
    // 시지가 사전에 매핑되면 시진 narrative 를, 아니면(미매핑 한자) KO 가 s.korean 을
    // 쓰는 것과 대칭으로 s.english 로 폴백 — EN narrative 가 비지 않게 한다.
    const narrativeEn = branchHangul ? pickHourNarrative(branchHangul, s.polarity, 'en') : s.english

    // 그 시진 한가운데 순간의 상승궁 — 엔진의 평균태양시 한가운데 instant(centerUtc).
    // 구 셀(centerUtc 없음)은 이 조각 peak 의 벽시계로.
    let risingSignKo = ''
    let risingSignEn = ''
    try {
      if (placeUnreliable) throw new Error('place unreliable — no rising sign')
      const jd = det.centerUtc
        ? isoToJD(det.centerUtc, 'UTC')
        : natalToJD({
            year,
            month,
            date,
            hour: Number(s.active.peak.slice(11, 13)),
            minute: Number(s.active.peak.slice(14, 16)),
            latitude: loc.latitude,
            longitude: loc.longitude,
            timeZone: loc.timeZone,
          })
      const houses = calcHouses(jd, loc.latitude, loc.longitude)
      const sign = formatLongitude(houses.ascendant).sign as ZodiacKo
      risingSignKo = SIGN_KO[sign] ?? sign
      risingSignEn = sign // formatLongitude.sign 은 영문('Cancer')
    } catch {
      // 상승점 계산 실패(고위도·ephemeris) 또는 출생지 미상 시 사주만으로 한 줄은 유지.
    }

    rows.push({
      when,
      whenEn,
      clockStart,
      clockEnd,
      sibsin,
      tone: s.polarity > 0 ? 'good' : 'caution',
      risingSignKo,
      risingSignEn,
      narrative: s.korean,
      narrativeEn,
      strength: Math.abs(s.polarity),
    })
  }

  return rows
}
