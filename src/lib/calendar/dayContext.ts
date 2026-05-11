/**
 * 캘린더 연속성·요일 컨텍스트 유틸 (Calendar Day Context).
 *
 * dayNarrative가 매일 독립적으로 만들어지지 않게 *어제·내일 흐름 변화*와
 * *요일 톤*을 prompt input에 포함시키는 헬퍼.
 */

import { calculateSajuData } from '@/lib/saju/saju'

const STEM_ELEMENT_KO: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}

export interface DayContinuity {
  yesterdayElement?: string
  todayElement?: string
  tomorrowElement?: string
  flowChange?: 'rising' | 'falling' | 'stable' | 'pivot' | 'unknown'
  flowNarrativeKo?: string
  flowNarrativeEn?: string
}

/**
 * 어제·오늘·내일 일진 element를 사주 dummy 계산으로 추출.
 * (실제 사용자 사주 자체는 필요 없음 — 일진은 절대시각 기반)
 */
export function buildDayContinuity(date: string, locale: 'ko' | 'en' = 'ko'): DayContinuity {
  try {
    const today = new Date(`${date}T12:00:00+09:00`)
    if (Number.isNaN(today.getTime())) return {}
    const yesterday = new Date(today.getTime() - 86400000)
    const tomorrow = new Date(today.getTime() + 86400000)

    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    // dummy male/12:00 — 일진 element만 필요
    const sToday = calculateSajuData(fmt(today), '12:00', 'male', 'solar', 'Asia/Seoul')
    const sYesterday = calculateSajuData(fmt(yesterday), '12:00', 'male', 'solar', 'Asia/Seoul')
    const sTomorrow = calculateSajuData(fmt(tomorrow), '12:00', 'male', 'solar', 'Asia/Seoul')

    const todayEl = STEM_ELEMENT_KO[sToday.dayPillar?.heavenlyStem?.name || ''] || undefined
    const yesterdayEl = STEM_ELEMENT_KO[sYesterday.dayPillar?.heavenlyStem?.name || ''] || undefined
    const tomorrowEl = STEM_ELEMENT_KO[sTomorrow.dayPillar?.heavenlyStem?.name || ''] || undefined

    if (!todayEl) return {}

    // 5행 순환에서 어제→오늘→내일 흐름 변화 추정
    const SEQ = ['목', '화', '토', '금', '수']
    const sameRowYest = yesterdayEl === todayEl
    const sameRowTomr = tomorrowEl === todayEl
    let flowChange: DayContinuity['flowChange'] = 'unknown'
    if (yesterdayEl && tomorrowEl) {
      if (sameRowYest && sameRowTomr) flowChange = 'stable'
      else if (yesterdayEl !== todayEl && tomorrowEl !== todayEl) flowChange = 'pivot'
      else if (yesterdayEl !== todayEl)
        flowChange = 'rising' // 새 결로 들어옴
      else if (tomorrowEl !== todayEl) flowChange = 'falling' // 결이 떠나감
    }

    const koNarr = buildFlowNarrativeKo({ yesterdayEl, todayEl, tomorrowEl, flowChange })
    const enNarr = buildFlowNarrativeEn({ yesterdayEl, todayEl, tomorrowEl, flowChange })

    return {
      yesterdayElement: yesterdayEl,
      todayElement: todayEl,
      tomorrowElement: tomorrowEl,
      flowChange,
      flowNarrativeKo: koNarr,
      flowNarrativeEn: enNarr,
    }
  } catch {
    return {}
  }
}

const ELEMENT_TONE_KO: Record<string, string> = {
  목: '시작·확장',
  화: '표현·발산',
  토: '안정·중심',
  금: '결단·정리',
  수: '직관·정서',
}

function buildFlowNarrativeKo(input: {
  yesterdayEl?: string
  todayEl?: string
  tomorrowEl?: string
  flowChange?: DayContinuity['flowChange']
}): string {
  const { yesterdayEl, todayEl, tomorrowEl, flowChange } = input
  if (!todayEl) return ''
  const today = ELEMENT_TONE_KO[todayEl]
  const yest = yesterdayEl ? ELEMENT_TONE_KO[yesterdayEl] : ''
  const tomr = tomorrowEl ? ELEMENT_TONE_KO[tomorrowEl] : ''
  if (flowChange === 'stable') {
    return `어제도 ${yest} 결, 오늘도 ${today} 결, 내일도 ${tomr} 결로 흐름이 *3일째 이어지는 자리*예요. 진행 중인 일에 가속이 잘 붙는 구간이에요.`
  }
  if (flowChange === 'pivot') {
    return `어제는 ${yest} 결이었는데 오늘 ${today}로 바뀌고, 내일은 ${tomr}로 또 한 번 옮겨가요. *흐름이 빠르게 도는 자리*라 한 가지에 무게중심 두기 어려운 구간이에요.`
  }
  if (flowChange === 'rising') {
    return `어제 ${yest} 결에서 오늘 ${today} 결로 *새 결이 들어오는 자리*예요. 어제 마무리 못 한 일은 정리하고, 오늘 새 톤에 맞춰 시작 결정에 무게를 싣는 게 자연스러워요.`
  }
  if (flowChange === 'falling') {
    return `오늘 ${today} 결인데 내일은 ${tomr} 결로 바뀌어요. *오늘 안에 마무리*해야 할 일이 있다면 오늘 처리하는 편이 안전한 구간이에요.`
  }
  if (yest && tomr) {
    return `어제 ${yest} → 오늘 ${today} → 내일 ${tomr}로 흐름이 흘러가는 자리예요.`
  }
  return ''
}

function buildFlowNarrativeEn(input: {
  yesterdayEl?: string
  todayEl?: string
  tomorrowEl?: string
  flowChange?: DayContinuity['flowChange']
}): string {
  const { yesterdayEl, todayEl, tomorrowEl, flowChange } = input
  if (!todayEl) return ''
  const map: Record<string, string> = {
    목: 'wood',
    화: 'fire',
    토: 'earth',
    금: 'metal',
    수: 'water',
  }
  const today = map[todayEl]
  const yest = yesterdayEl ? map[yesterdayEl] : ''
  const tomr = tomorrowEl ? map[tomorrowEl] : ''
  if (flowChange === 'stable') {
    return `Yesterday ${yest}, today ${today}, tomorrow ${tomr} — the flow holds for 3 days. Momentum builds on continuing work.`
  }
  if (flowChange === 'pivot') {
    return `Yesterday ${yest} → today ${today} → tomorrow ${tomr} — the flow rotates fast. Hard to anchor on one thread.`
  }
  if (flowChange === 'rising') {
    return `From yesterday's ${yest} to today's ${today} — a new tone enters. Wrap unfinished items, lean into the new tone for fresh starts.`
  }
  if (flowChange === 'falling') {
    return `Today is ${today}, but tomorrow shifts to ${tomr}. If anything must close today, handle it today.`
  }
  if (yest && tomr) {
    return `Yesterday ${yest} → today ${today} → tomorrow ${tomr}.`
  }
  return ''
}

// ───────── 요일 톤 (Day-of-week tone) ─────────

export interface DayOfWeekTone {
  weekdayKo: string
  weekdayEn: string
  toneKo: string
  toneEn: string
  weekPosition: 'start' | 'mid' | 'end' | 'weekend'
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TONE_KO: Record<number, { tone: string; pos: DayOfWeekTone['weekPosition'] }> = {
  0: { tone: '주말 마무리·내일 시작 준비. 정리·휴식·재충전이 자연스러운 결', pos: 'weekend' },
  1: { tone: '한 주 시작 톤. 큰 그림 잡고 우선순위 정하는 게 자연스러움', pos: 'start' },
  2: { tone: '한 주 진행 가속. 시작한 일을 본격 진도 내는 결', pos: 'mid' },
  3: { tone: '주 중반 점검 자리. 절반 지점에서 방향 다시 확인하기 좋음', pos: 'mid' },
  4: { tone: '주 후반 마무리 톤 진입. 결과물·확정 결정에 가까워짐', pos: 'mid' },
  5: { tone: '주말 직전 마무리·정리 결. 큰 결정 한 가지 매듭짓기 좋음', pos: 'end' },
  6: { tone: '주말 톤. 회복·관계·창의 결이 자연스러움', pos: 'weekend' },
}

const TONE_EN: Record<number, { tone: string }> = {
  0: {
    tone: 'Sunday — wrapping the weekend and prepping for Monday. Rest, reset, and a light plan',
  },
  1: { tone: "Monday — set the week's big picture and priorities" },
  2: { tone: 'Tuesday — momentum building, dig into started work' },
  3: { tone: 'Wednesday — midweek checkpoint, recalibrate direction' },
  4: { tone: 'Thursday — push toward outcomes, decisions firming up' },
  5: { tone: 'Friday — wrap and commit one decision before the weekend' },
  6: { tone: 'Saturday — recovery, relationships, creative work' },
}

export function buildDayOfWeekTone(date: string): DayOfWeekTone | null {
  try {
    const d = new Date(`${date}T12:00:00+09:00`)
    if (Number.isNaN(d.getTime())) return null
    const dow = d.getUTCDay() // 0=Sun ... 6=Sat — ISO 보정 필요할 수 있음
    // KST 기준 요일은 UTC+9 보정으로 안전하게 다시
    const kstDow = new Date(d.getTime()).getDay()
    const koInfo = TONE_KO[kstDow]
    const enInfo = TONE_EN[kstDow]
    if (!koInfo || !enInfo) return null
    return {
      weekdayKo: WEEKDAY_KO[kstDow],
      weekdayEn: WEEKDAY_EN[kstDow],
      toneKo: koInfo.tone,
      toneEn: enInfo.tone,
      weekPosition: koInfo.pos,
    }
  } catch {
    return null
  }
}
