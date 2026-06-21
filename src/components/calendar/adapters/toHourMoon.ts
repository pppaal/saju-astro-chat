/**
 * 시(時)별 달 흐름 — Day tier '시 정밀' 원료 (점성).
 *
 * 일(日) 티어 본계산은 하루 *정오 1회* 스냅샷이라, 하루 12~13° 움직이는 달은
 * 시각별 정밀도가 떨어진다(±6° orb). 이 어댑터는 그날 **12 시진 한가운데 시각마다
 * 달 위치를 다시 계산**(Swiss Ephemeris)해서, 달이 본명 점과 맺는 메이저 어스펙트의
 * *절정 시각*(가장 타이트한 시진)을 뽑는다 — "오늘 몇 시쯤 감정/연애 흐름이 켜지나".
 *
 * 달 외 행성은 하루 변화가 작아 정오 계산으로 충분 → 여기선 달만 시각별로 본다.
 * 각 (본명점 × 어스펙트) 짝마다 가장 가까운(orb 최소) 시진 한 개만 남겨 절정으로.
 */

import { getCachedTransitChart } from '@/lib/calendar-engine/ephe-cache'
import { createCache } from '@/lib/calendar-engine/cache'
import { findTransitAspects } from '@/lib/astrology/foundation/transit'
import { inferAspectPolarity } from '@/lib/calendar-engine/aspect-polarity'
import type { AspectType, Chart, ZodiacKo } from '@/lib/astrology/foundation/types'
import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { SIGN_KO, PLANET_KO } from './shared'

const MAJOR: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition']

// 12 시진 — rep hour(시계 한가운데), 한자 시지, KO/EN 창 라벨.
const SIJIN: Array<{ hour: number; ko: string; en: string }> = [
  { hour: 0, ko: '23-01시 (자시)', en: '11pm–1am (Rat)' },
  { hour: 2, ko: '01-03시 (축시)', en: '1–3am (Ox)' },
  { hour: 4, ko: '03-05시 (인시)', en: '3–5am (Tiger)' },
  { hour: 6, ko: '05-07시 (묘시)', en: '5–7am (Rabbit)' },
  { hour: 8, ko: '07-09시 (진시)', en: '7–9am (Dragon)' },
  { hour: 10, ko: '09-11시 (사시)', en: '9–11am (Snake)' },
  { hour: 12, ko: '11-13시 (오시)', en: '11am–1pm (Horse)' },
  { hour: 14, ko: '13-15시 (미시)', en: '1–3pm (Goat)' },
  { hour: 16, ko: '15-17시 (신시)', en: '3–5pm (Monkey)' },
  { hour: 18, ko: '17-19시 (유시)', en: '5–7pm (Rooster)' },
  { hour: 20, ko: '19-21시 (술시)', en: '7–9pm (Dog)' },
  { hour: 22, ko: '21-23시 (해시)', en: '9–11pm (Pig)' },
]

const ASPECT_KO: Record<string, string> = {
  conjunction: '합',
  sextile: '육각',
  square: '사각',
  trine: '삼각',
  opposition: '대립',
}

function natalPointKo(name: string): string {
  if (name === 'Ascendant') return '내 사주의 상승점'
  if (name === 'MC') return '내 사주의 중천'
  return `내 사주의 ${PLANET_KO[name] ?? name}`
}
function natalPointEn(name: string): string {
  if (name === 'Ascendant') return 'natal ASC'
  if (name === 'MC') return 'natal MC'
  return `natal ${name}`
}

// 달이 본명 점을 건드릴 때의 짧은 해석 — 점(=인생 영역)별 길/흉 한 줄.
// 달=감정·타이밍이라, "그 시각 이 영역의 기분/흐름이 어떻게 켜지나"로 읽는다.
type Meaning = { goodKo: string; goodEn: string; cautionKo: string; cautionEn: string }
const POINT_MEANING: Record<string, Meaning> = {
  Sun: {
    goodKo: '기분·활력이 차오르는 시각 — 중요한 약속·활동에 좋아요.',
    goodEn: 'Mood and vitality rise — good for key meetings and activity.',
    cautionKo: '자존심이 부딪히기 쉬운 시각 — 한 박자 양보가 이득.',
    cautionEn: 'Egos clash easily now — yielding a beat pays off.',
  },
  Moon: {
    goodKo: '감정이 편안해지는 시각 — 휴식·교감·집안일에 좋아요.',
    goodEn: 'Feelings settle — good for rest, closeness and home matters.',
    cautionKo: '기분 기복이 큰 시각 — 즉흥 감정 결정은 미루세요.',
    cautionEn: 'Moods swing now — postpone decisions made on feeling.',
  },
  Mercury: {
    goodKo: '소통·집중이 잘 되는 시각 — 대화·문서·공부에 좋아요.',
    goodEn: 'Talk and focus flow — good for conversation, papers, study.',
    cautionKo: '말실수·착오가 잦은 시각 — 한 번 더 확인하세요.',
    cautionEn: 'Slips and mix-ups are likely — double-check.',
  },
  Venus: {
    goodKo: '연애·관계가 부드러워지는 시각 — 만남·화해·즐거움에 좋아요.',
    goodEn: 'Love and ties soften — good for dates, making up, pleasure.',
    cautionKo: '감정 소비·과소비가 쉬운 시각 — 지갑과 마음 단속.',
    cautionEn: 'Easy to overspend on feeling — guard wallet and heart.',
  },
  Mars: {
    goodKo: '의욕·추진력이 붙는 시각 — 운동·결단·돌파에 좋아요.',
    goodEn: 'Drive and push kick in — good for exercise, decisions, breakthroughs.',
    cautionKo: '다툼·조급함이 튀는 시각 — 욱하지 말고 한 호흡.',
    cautionEn: 'Friction and haste flare — breathe before reacting.',
  },
  Jupiter: {
    goodKo: '기회·여유가 열리는 시각 — 제안·확장·배움에 좋아요.',
    goodEn: 'Opportunity and ease open — good for offers, growth, learning.',
    cautionKo: '과욕·과신이 쉬운 시각 — 크게 벌이기 전에 한 번 더.',
    cautionEn: 'Overreach is easy — sanity-check before going big.',
  },
  Saturn: {
    goodKo: '차분히 매듭짓기 좋은 시각 — 정리·집중·마무리에 좋아요.',
    goodEn: 'Good for wrapping up calmly — tidying, focus, finishing.',
    cautionKo: '위축·피로가 오는 시각 — 무리 말고 쉬어가세요.',
    cautionEn: 'Heaviness and fatigue set in — don’t push; rest.',
  },
  Ascendant: {
    goodKo: '컨디션·첫인상이 좋은 시각 — 사람 만나기에 좋아요.',
    goodEn: 'Condition and first impression shine — good to meet people.',
    cautionKo: '예민해지기 쉬운 시각 — 몸·기분을 먼저 챙기세요.',
    cautionEn: 'You’re easily on edge — tend to body and mood first.',
  },
  MC: {
    goodKo: '일·평판에 유리한 시각 — 공적 자리·보고에 좋아요.',
    goodEn: 'Favorable for work and reputation — good for public moments.',
    cautionKo: '공적 자리에서 무리하기 쉬운 시각 — 욕심을 줄이세요.',
    cautionEn: 'Easy to overdo it publicly now — dial back ambition.',
  },
}
function moonMeaning(natalPoint: string, good: boolean): { ko: string; en: string } {
  const m = POINT_MEANING[natalPoint]
  if (!m) {
    return good
      ? { ko: '흐름이 우호적인 시각이에요.', en: 'A favorable window.' }
      : { ko: '한 박자 천천히 가면 좋은 시각이에요.', en: 'A window to slow down a beat.' }
  }
  return good ? { ko: m.goodKo, en: m.goodEn } : { ko: m.cautionKo, en: m.cautionEn }
}

export interface HourMoonEvent {
  /** 시진 창 라벨 ko — '13-15시 (미시)'. */
  when: string
  whenEn: string
  /** rep hour(0,2,…,22) — 정렬용. */
  hour: number
  /** 그 시각 달 별자리. */
  moonSignKo: string
  moonSignEn: string
  /** 달이 맺는 어스펙트. */
  aspectKo: string
  aspectEn: string
  /** 본명 상대 점. */
  natalPointKo: string
  natalPointEn: string
  /** 본명 상대 점 raw 이름('Venus'·'Ascendant'…) — 분야 라우팅용. */
  body: string
  polarity: number
  tone: 'good' | 'caution'
  /** 그 시각 해석 한 줄 (점×길흉). */
  meaning: string
  meaningEn: string
}

/**
 * 그날 12 시진의 달을 시각별로 재계산 → 달×본명 메이저 어스펙트의 절정 시각 목록.
 * Swiss Ephemeris 12회(시진별) 호출 — Redis 캐시(iso·위경도 키)로 재방문 시 무료.
 */
export async function buildHourMoon(
  focusDayIso: string,
  natal: NatalContext
): Promise<HourMoonEvent[]> {
  const loc = natal.astro.location
  const natalChart = natal.astro.chart
  const cache = createCache()

  // (본명점|어스펙트) → 가장 타이트한 시진 샘플(=절정).
  type Peak = {
    orb: number
    hour: number
    sign: ZodiacKo
    type: string
    natalPoint: string
    polarity: number
  }
  const peak = new Map<string, Peak>()

  // 12 시진 차트를 *병렬*로 받는다. assembleTiers 는 DB 캐시 바깥이라 매 요청 재실행
  // 되는데, 직전엔 이 12개를 for 루프로 하나씩 await 해 Swiss Ephemeris(미스 시)나
  // Redis(히트 시) 호출 12번이 직렬로 쌓였다(시각별 키라 정오 스냅샷 캐시와도 별개라
  // 항상 새로). getCachedTransitChart 는 in-flight 프로미스를 캐시해 동시 호출이
  // 한 계산을 공유하므로, Promise.all 로 묶으면 직렬 12회 → 1배치 round-trip.
  const charts = await Promise.all(
    SIJIN.map(async (sj): Promise<Chart | null> => {
      const iso = `${focusDayIso}T${String(sj.hour).padStart(2, '0')}:00:00`
      try {
        return await getCachedTransitChart({
          iso,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timeZone: loc.timeZone,
          inMemoryCache: cache,
        })
      } catch {
        return null // 고위도·ephemeris 실패 시 해당 시진 건너뜀.
      }
    })
  )

  // peak 선택은 SIJIN 순서(이른 시각 우선)로 — 직전 직렬 루프와 동일한 동점
  // tie-break(같은 orb 면 먼저 본 이른 시진 유지)를 보존해 출력이 바뀌지 않게 한다.
  for (let i = 0; i < SIJIN.length; i++) {
    const sj = SIJIN[i]
    const chart = charts[i]
    if (!chart) continue
    const moon = chart.planets.find((p) => p.name === 'Moon')
    if (!moon) continue
    const aspects = findTransitAspects(chart, natalChart, MAJOR).filter(
      (a) => a.transitPlanet === 'Moon'
    )
    for (const a of aspects) {
      const key = `${a.natalPoint}|${a.type}`
      const prev = peak.get(key)
      if (!prev || a.orb < prev.orb) {
        peak.set(key, {
          orb: a.orb,
          hour: sj.hour,
          sign: moon.sign,
          type: a.type,
          natalPoint: a.natalPoint,
          polarity: inferAspectPolarity(a.type, 'Moon', a.natalPoint),
        })
      }
    }
  }

  const byHour = new Map(SIJIN.map((s) => [s.hour, s]))
  return (
    [...peak.values()]
      .map((b): HourMoonEvent => {
        const sj = byHour.get(b.hour)!
        const good = b.polarity >= 0
        const mean = moonMeaning(b.natalPoint, good)
        return {
          when: sj.ko,
          whenEn: sj.en,
          hour: b.hour,
          moonSignKo: SIGN_KO[b.sign] ?? b.sign,
          moonSignEn: b.sign,
          aspectKo: ASPECT_KO[b.type] ?? b.type,
          aspectEn: b.type,
          natalPointKo: natalPointKo(b.natalPoint),
          natalPointEn: natalPointEn(b.natalPoint),
          body: b.natalPoint,
          polarity: b.polarity,
          tone: good ? 'good' : 'caution',
          meaning: mean.ko,
          meaningEn: mean.en,
        }
      })
      // 센 것(|polarity|) 우선, 같으면 이른 시각. 메인엔 최대 5개.
      .sort((a, b) => Math.abs(b.polarity) - Math.abs(a.polarity) || a.hour - b.hour)
      .slice(0, 5)
  )
}
