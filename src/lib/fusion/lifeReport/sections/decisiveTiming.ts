// src/lib/fusion/lifeReport/sections/decisiveTiming.ts
// 결정적 타이밍 — fuses saju daewoon pivots with astro lifecycle hits
// to produce 5-8 "decisive years" plus a 4-paragraph narrative.
//
// Absorbs:
//   • saju/extendedAnalysis.ts → 7 decisive timings (marriage/job/business/
//     move/health_warning/wealth_peak/crisis)
//   • fusion/lifeReport/signals/astroLifecycle.ts → Saturn/Jupiter/Uranus/Chiron returns
//   • saju/orthodoxInterpretation.ts → pillar position rule (for ages 30/40/50)

import type { BuilderInput, DecisiveTiming, DecisiveYear, Paragraph } from '../types'
import { daeunCycles, dayStrength } from '../signals/sajuSignals'
import {
  birthYearFromBirthDate,
  eventsInAgeRange,
  lifecycleEvents,
} from '../signals/astroLifecycle'
import { solarArcSummary } from '../signals/astroSignals'
import { iGa, paragraph, signLabel } from '../templates/sentences'

// 받침 유무에 따라 으로/로 선택 (사인명 + 으로/로).
function euroLoFromBatchim(s: string): string {
  if (!s) return '로'
  const last = s[s.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '로'
  const final = (code - 0xac00) % 28
  // 리을(ㄹ, final=8) 종성도 '로' 사용
  if (final === 0 || final === 8) return '로'
  return '으로'
}

// Map daewoon position (index) → heuristic domain — mirrors the legacy
// extendedAnalysis logic which used `i % 3 === 1` etc. We keep the same
// pattern so behaviour is reproducible.
const DAEUN_HEURISTIC: Array<{
  domain: DecisiveYear['domain']
  domainKo: string
  domainEn: string
  match: (i: number) => boolean
}> = [
  {
    domain: 'job_change',
    domainKo: '이직·전환',
    domainEn: 'career shift',
    match: (i) => i % 3 === 1,
  },
  {
    domain: 'business',
    domainKo: '사업·창업',
    domainEn: 'business launch',
    match: (i) => i >= 2 && i <= 4,
  },
  {
    domain: 'move',
    domainKo: '이사·이동',
    domainEn: 'move / relocation',
    match: (i) => i === 1 || i === 3,
  },
  {
    domain: 'health',
    domainKo: '건강 주의',
    domainEn: 'health caution',
    match: (i) => i === 4 || i === 6,
  },
  {
    domain: 'wealth',
    domainKo: '재물 호황',
    domainEn: 'wealth peak',
    match: (i) => i === 2 || i === 5,
  },
  { domain: 'crisis', domainKo: '위기·시련', domainEn: 'crisis', match: (i) => i === 5 || i === 7 },
]

const LIFECYCLE_TO_DOMAIN: Record<
  string,
  {
    domain: DecisiveYear['domain']
    ko: string
    en: string
  }
> = {
  saturn_return_1: { domain: 'career', ko: '커리어 토대가 굳어지는 때', en: 'career foundation' },
  saturn_return_2: {
    domain: 'career',
    ko: '커리어 마지막 정리의 때',
    en: 'late-career consolidation',
  },
  jupiter_return_2: { domain: 'career', ko: '진로 큰 그림이 잡히는 때', en: 'career big picture' },
  jupiter_return_5: {
    domain: 'wealth',
    ko: '환갑의 전환, 후반 인생 첫 사이클',
    en: 'a 60-year turning point, the first cycle of the second half of life',
  },
  uranus_opposition: { domain: 'crisis', ko: '중년 자유의 각성', en: 'midlife awakening' },
  pluto_square_pluto: {
    domain: 'crisis',
    ko: '정체성이 깊이 재구성되는 때',
    en: 'identity rebuild pressure',
  },
  chiron_return: { domain: 'health', ko: '치유의 회귀', en: 'healing turning point' },
  neptune_square: { domain: 'crisis', ko: '의미가 시험에 오르는 때', en: 'meaning test' },
  progressed_lunar_1: {
    domain: 'love',
    ko: '감정 사이클의 졸업',
    en: 'emotional cycle graduation',
  },
}

export function buildDecisiveTiming(input: BuilderInput): DecisiveTiming {
  const { saju, astro } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []

  // ─ Resolve birth year (used only to compute calendar year for each age)
  const birthYear = birthYearFromBirthDate(saju.input.birthDate) ?? new Date().getFullYear()

  const cycles = daeunCycles(saju)
  if (cycles.length > 0) sajuUsed.push('cycles.daeunCycles')

  // ─ Build candidate decisive years from saju daewoon
  const sajuPicks: DecisiveYear[] = []
  cycles.forEach((c, i) => {
    if (!c.age) return
    // marriage window: daewoon overlapping 26-40
    if (c.age + 9 >= 26 && c.age <= 40) {
      sajuPicks.push({
        age: c.age,
        year: birthYear + c.age,
        domain: 'marriage',
        description: {
          ko: `${c.age}세 무렵 — 결혼이나 동반자 흐름이 한 단계 강해지는 시기예요.`,
          en: `Around age ${c.age} — a window where marriage and partnership flow grow stronger.`,
        },
        sources: { saju: `daewoon@${c.age}` },
      })
    }
    for (const rule of DAEUN_HEURISTIC) {
      if (!rule.match(i)) continue
      sajuPicks.push({
        age: c.age,
        year: birthYear + c.age,
        domain: rule.domain,
        description: {
          ko: `${c.age}세 무렵 — ${rule.domainKo} 흐름이 본격적으로 피어나는 시기예요.`,
          en: `Around age ${c.age} — ${rule.domainEn} comes into its own.`,
        },
        sources: { saju: `daewoon@${c.age}` },
      })
    }
  })

  // ─ Astro lifecycle events
  const astroPicks: DecisiveYear[] = []
  const evts = lifecycleEvents()
  if (evts.length > 0) astroUsed.push('lifecycle.events')
  for (const e of evts) {
    const mapping = LIFECYCLE_TO_DOMAIN[e.kind]
    if (!mapping) continue
    astroPicks.push({
      age: e.ageStart,
      year: birthYear + e.ageStart,
      domain: mapping.domain,
      description: {
        ko: `${e.ageStart}~${e.ageEnd}세, ${e.labelKo} — ${e.meaningKo}`,
        en: `Ages ${e.ageStart}–${e.ageEnd}, ${e.labelEn}: ${e.meaningEn}`,
      },
      sources: { astro: e.kind },
    })
  }

  // ─ "결정적 해": where saju daewoon shift and astro lifecycle hit overlap
  const merged: DecisiveYear[] = []
  const seen = new Set<string>()
  for (const a of astroPicks) {
    const overlap = sajuPicks.find((s) => Math.abs(s.age - a.age) <= 2 && s.domain !== 'marriage')
    if (overlap) {
      const key = `dual@${a.age}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({
        age: a.age,
        year: a.year,
        domain: a.domain,
        description: {
          ko: `${a.age}세 — 인생 흐름의 변곡과 별의 큰 변곡이 같은 해에 만나는 결정적인 해예요. ${a.description.ko.split(' — ').slice(-1)[0]}`,
          en: `Age ${a.age} — a decisive year where a fresh 10-year life-chapter and a large astrology pivot land together. ${a.description.en.split(': ').slice(-1)[0]}`,
        },
        sources: { saju: overlap.sources.saju, astro: a.sources.astro },
      })
    }
  }

  // ─ Build the final decisiveYears list:
  //   merged (overlap) first → top saju (marriage + earliest of each domain)
  //   → top astro Saturn/Uranus/Chiron windows → cap at 8 entries.
  const decisiveYears: DecisiveYear[] = []
  const usedAges = new Set<number>()
  for (const y of [
    ...merged,
    ...filterRepresentativeSaju(sajuPicks),
    ...representativeAstro(astroPicks),
  ]) {
    if (usedAges.has(y.age)) continue
    decisiveYears.push(y)
    usedAges.add(y.age)
    if (decisiveYears.length >= 8) break
  }
  decisiveYears.sort((a, b) => a.age - b.age)

  // ─────────── narrative paragraphs (4)
  const strength = dayStrength(saju)
  if (strength) sajuUsed.push('advanced.strength.level')

  // P1 — 30대 변곡점
  const e30s = eventsInAgeRange(28, 39)
  const d30s = decisiveYears.filter((d) => d.age >= 28 && d.age < 40)
  if (e30s.length > 0) astroUsed.push('lifecycle.30s')
  const e30sLabel = e30s.map((e) => e.labelKo).join('·') || '별의 큰 변곡 몇 가지'
  const p1ko = paragraph([
    `30대는 인생 흐름이 한 번 크게 갈리는 때에, ${e30sLabel}${iGa(e30sLabel)} 겹쳐 들어와요.`,
    d30s.length > 0
      ? `특히 ${d30s.map((d) => `${d.age}세(${labelKoDomain(d.domain)})`).join(', ')}가 인생의 첫 큰 매듭이 되는 해예요.`
      : '결혼과 전문성, 기반이 한 번에 결정되는 시기라 회피하지 말고 책임을 받아들이는 선택이 토대가 됩니다.',
  ])
  const p1en = paragraph([
    `Your 30s carry a decisive 10-year life-chapter shift, and ${e30s.map((e) => e.labelEn).join(' / ') || 'several major astrology pivots'} land on the same decade.`,
    d30s.length > 0
      ? `In particular, ages ${d30s.map((d) => `${d.age} (${labelEnDomain(d.domain)})`).join(', ')} form the first great knot of your life.`
      : 'Marriage, expertise and foundation often decide together here — accept responsibility rather than dodging it.',
  ])

  // P2 — 40대 변곡점
  const e40s = eventsInAgeRange(40, 49)
  const d40s = decisiveYears.filter((d) => d.age >= 40 && d.age < 50)
  const e40sLabel = e40s.map((e) => e.labelKo).join('·') || '별의 큰 변곡들'
  const p2ko = paragraph([
    `40대엔 ${e40sLabel}${iGa(e40sLabel)} 한꺼번에 몰려와요.`,
    d40s.length > 0
      ? `${d40s.map((d) => `${d.age}세(${labelKoDomain(d.domain)})`).join(', ')}가 진짜 자기와 맞지 않는 길을 깨고 다시 정렬해줘요.`
      : '자유의 각성과 의미의 시험이 동시에 와서, 안정을 빌미로 미뤘던 결정이 표면으로 올라와요.',
  ])
  const p2en = paragraph([
    `Your 40s gather ${e40s.map((e) => e.labelEn).join(' / ') || 'large astrology pivots'} into a single decade.`,
    d40s.length > 0
      ? `Ages ${d40s.map((d) => `${d.age} (${labelEnDomain(d.domain)})`).join(', ')} crack the paths that are not truly yours.`
      : 'Uranus and Neptune shake at once, surfacing the decisions you had postponed.',
  ])

  // P3 — 50대+ 변곡점
  const e50s = eventsInAgeRange(50, 65)
  const d50s = decisiveYears.filter((d) => d.age >= 50)
  const e50sLabel =
    e50s.map((e) => e.labelKo).join('·') || '치유의 회귀와 두 번째 어른됨의 통과의례'
  const p3ko = paragraph([
    `50대 이후로는 ${e50sLabel}${iGa(e50sLabel)} 핵심이에요.`,
    d50s.length > 0
      ? `${d50s.map((d) => `${d.age}세(${labelKoDomain(d.domain)})`).join(', ')}가 평생의 흐름을 결산해주는 변곡이에요.`
      : '결과보다 의미에 시간을 쓰는 쪽으로 무게추가 옮겨가요.',
  ])
  const p3en = paragraph([
    `From your 50s onward, ${e50s.map((e) => e.labelEn).join(' / ') || 'the Chiron return and second Saturn return'} dominate.`,
    d50s.length > 0
      ? `Ages ${d50s.map((d) => `${d.age} (${labelEnDomain(d.domain)})`).join(', ')} settle the long account of your life.`
      : 'The weight shifts from outcomes toward meaning.',
  ])

  // P4 — 가장 큰 변곡 한 해
  const peak = merged[0] || decisiveYears[0]
  const p4ko = peak
    ? paragraph([
        `가장 큰 변곡 한 해를 꼽자면 ${peak.age}세 (${peak.year}년 즈음)이에요.`,
        peak.sources.saju && peak.sources.astro
          ? `인생 흐름의 큰 변곡과 별의 큰 변곡이 같은 해에 겹쳐서, ${strength === 'strong' || strength === 'verystrong' ? '단단한 심지가 추진력을 줘서 한 번의 결정이 평생 흐름을 잡아요.' : '섬세한 심지를 책임이 떠받쳐 새로운 정체성으로 도약하게 해줘요.'}`
          : `${labelKoDomain(peak.domain)}의 흐름이 가장 진하게 표면으로 올라오는 시기예요.`,
      ])
    : '큰 변곡이 골고루 분산돼 있어, 한 해에 모든 게 몰리기보다 시기마다 조금씩 흐름을 갱신해요.'
  const p4en = peak
    ? paragraph([
        `If you had to name the single most decisive year, it would be age ${peak.age} (≈ ${peak.year}).`,
        peak.sources.saju && peak.sources.astro
          ? `A fresh 10-year life-chapter and a large astrology pivot overlap on the same year, and ${strength === 'strong' || strength === 'verystrong' ? 'your strong core gives the drive — one decision can set the rest of the path.' : 'responsibility carries your tender core into a new identity.'}`
          : `${labelEnDomain(peak.domain)} surfaces most strongly here.`,
      ])
    : 'Major pivots stay distributed — instead of one big year, each fresh 10-year life-chapter adds a small renewal.'

  // P5 — 5-10년 윈도우: ZR + multi-year solar return view
  const zr = input.calendarSignals?.zrCurrent
  const zrNext = input.calendarSignals?.zrNext
  const profTimeline = input.calendarSignals?.profectionTimeline
  const p5pieces: string[] = []
  const p5piecesEn: string[] = []
  if (zr) {
    astroUsed.push('calendarSignals.zrCurrent')
    p5pieces.push(
      `다음 5~10년의 인생 분위기는 ${zrSignKo(zr.sign)}의 색, ${planetName(zr.ruler, 'ko')}이 다스리는 챕터예요. 큰 톤은 ${zrThemeKo(zr.sign)}으로 흘러요.`
    )
    p5piecesEn.push(
      `Over the next 5–10 years, the life-tone is the ${zr.sign} chapter ruled by ${zr.ruler} — the broad theme is ${zrThemeEn(zr.sign)}.`
    )
  }
  if (zrNext) {
    p5pieces.push(
      `이 챕터가 끝나면 ${zrSignKo(zrNext.sign)}의 분위기로 넘어가요. 큰 흐름의 갈림길이 한 번 더 기다리고 있어요.`
    )
    p5piecesEn.push(
      `When the current chapter closes, you move into the ${zrNext.sign} chapter — another large bend in the river awaits.`
    )
  }
  // ZR L2: the smaller sub-period inside the current L1 chapter — adds 1-2
  // upcoming micro-pivots inside the 5-10y window.
  const zrSubCurrent = input.calendarSignals?.zrSubCurrent
  const zrSubPeriods = input.calendarSignals?.zrSubPeriods
  if (zrSubCurrent) {
    astroUsed.push('calendarSignals.zrSubCurrent')
    const birthYearForSub = birthYearFromBirthDate(saju.input.birthDate) ?? new Date().getFullYear()
    const endAge = Math.round(zrSubCurrent.endYear)
    const endYearAbsolute = birthYearForSub + endAge
    p5pieces.push(
      `그 안의 작은 시기로 보면, 지금은 ${zrSignKo(zrSubCurrent.sign)}의 색을 ${planetName(zrSubCurrent.ruler, 'ko')}이 다스리는 sub-period 안에 있어요. 이 작은 시기는 ${endAge}세(${endYearAbsolute}년) 무렵 닫히면서 작은 변곡이 한 번 와요.`
    )
    p5piecesEn.push(
      `Inside the chapter, you sit in a smaller ${zrSubCurrent.sign} sub-period ruled by ${zrSubCurrent.ruler}; it closes around age ${endAge} (≈ ${endYearAbsolute}), bringing one minor pivot.`
    )
  }
  if (zrSubPeriods && zrSubPeriods.length > 0) {
    astroUsed.push('calendarSignals.zrSubPeriods')
    // Pull the next 1-2 sub-period transitions inside the 5-10y window.
    const ageNow = ageFromBirthInline(saju)
    const upcoming = zrSubPeriods
      .filter((s) => s.startYear > ageNow && s.startYear - ageNow <= 10)
      .slice(0, 2)
    if (upcoming.length > 0) {
      const birthYearForSub =
        birthYearFromBirthDate(saju.input.birthDate) ?? new Date().getFullYear()
      const labelsKo = upcoming.map(
        (u) => `${Math.round(u.startYear)}세(${birthYearForSub + Math.round(u.startYear)}년)`
      )
      const labelsEn = upcoming.map(
        (u) => `age ${Math.round(u.startYear)} (≈ ${birthYearForSub + Math.round(u.startYear)})`
      )
      p5pieces.push(
        `다음 작은 변곡은 ${labelsKo.join(', ')} 즈음이에요. 인생 큰 챕터 안에서 흐름의 톤이 한 번씩 바뀌어요.`
      )
      p5piecesEn.push(
        `The next small pivots fall near ${labelsEn.join(', ')} — the tone of the chapter shifts a notch each time.`
      )
    }
  }
  if (profTimeline && profTimeline.length > 0) {
    astroUsed.push('calendarSignals.profectionTimeline')
    // pick first non-trivial activation in next 5 years (house != 1)
    const next5 = profTimeline.slice(1, 6)
    const focus = next5.find((p) => [10, 7, 5, 9, 2].includes(p.house)) ?? next5[0]
    if (focus) {
      p5pieces.push(
        `매년의 포커스도 또렷해서, ${focus.age}세에는 ${profHouseKo(focus.house)} 영역이 한 해의 무게추가 돼요.`
      )
      p5piecesEn.push(
        `Year by year the focus is clear — at age ${focus.age}, the ${profHouseEn(focus.house)} carries the year's weight.`
      )
    }
  }
  // Solar Arc — 진행된 결. 각 행성이 새로운 사인에 들어가는 시점이 큰 변곡을
  // 만든다. astro.progressions.solarArc 가 있을 때만 등장.
  const sa = solarArcSummary(astro)
  if (sa?.upcomingIngress) {
    astroUsed.push('progressions.solarArc')
    const ing = sa.upcomingIngress
    const planetKoMap: Record<string, string> = {
      Sun: '태양',
      Moon: '달',
      Mercury: '수성',
      Venus: '금성',
      Mars: '화성',
      Jupiter: '목성',
      Saturn: '토성',
      Uranus: '천왕성',
      Neptune: '해왕성',
      Pluto: '명왕성',
      MC: '사회 무대',
      ASC: '첫인상',
    }
    const planetKo = planetKoMap[ing.planet] ?? ing.planet
    const signKo = ing.sign ? signLabel(ing.sign, 'ko') : ''
    const signEn = ing.sign ? signLabel(ing.sign, 'en') : ''
    // 받침 유무에 따라 이/가, 으로/로 선택 (자연 한국어).
    const planetParticle = iGa(planetKo)
    const signParticle = signKo ? euroLoFromBatchim(signKo) : ''
    p5pieces.push(
      `${ing.ingressAge}세 무렵엔 진행된 결 안에서 ${planetKo}${planetParticle}${signKo ? ' ' + signKo + signParticle : ''} 들어가, 인생 색의 변곡이 한 번 또렷이 잡혀요.`
    )
    p5piecesEn.push(
      `Around age ${ing.ingressAge}, solar-arc directed ${ing.planet}${signEn ? ' enters ' + signEn : ' changes sign'}, marking a clear inflection of life-tone.`
    )
  }
  const p5ko = p5pieces.length
    ? paragraph(p5pieces)
    : '다음 5~10년의 흐름은 잔잔히 정렬돼 있어, 큰 굴곡보다 매 시기마다 작은 톤을 갱신해가는 길이에요.'
  const p5en = p5piecesEn.length
    ? paragraph(p5piecesEn)
    : 'The 5–10 year horizon sits calmly arranged — many small renewals rather than a single dramatic bend.'

  // P6 — 단기 안내 (올해 / 이번달 / 오늘 electional hint)
  const profCur = input.calendarSignals?.profectionCurrent
  const hc = input.calendarSignals?.sajuHyeongchung
  const p6pieces: string[] = []
  const p6piecesEn: string[] = []
  if (profCur) {
    astroUsed.push('calendarSignals.profectionCurrent')
    p6pieces.push(
      `올해는 ${profCur.house}궁(${profHouseKo(profCur.house)})이 활성돼서, ${profPracticalKo(profCur.house)}에 결과가 잘 맺혀요.`
    )
    p6piecesEn.push(
      `This year activates house ${profCur.house} (${profHouseEn(profCur.house)}) — outcomes ripen most clearly in ${profPracticalEn(profCur.house)}.`
    )
  }
  if (hc && hc.hasInteractions) {
    sajuUsed.push('calendarSignals.sajuHyeongchung')
    const dominant = hc.chungCount >= hc.hapCount ? '충돌의 흐름' : '결합의 흐름'
    const dominantEn = hc.chungCount >= hc.hapCount ? 'a clash accent' : 'a harmony accent'
    p6pieces.push(
      `사주 안에 ${dominant}이 강해서, 이번 시기엔 ${hc.chungCount >= hc.hapCount ? '결정과 단절을 미루지 않을 때' : '함께하는 사람과의 결합'}이 운을 끌어와요.`
    )
    p6piecesEn.push(
      `Your chart carries ${dominantEn} — this season ${hc.chungCount >= hc.hapCount ? 'decisions and clean breaks pull luck in' : 'partnerships pull luck in'}.`
    )
  }
  const p6ko = p6pieces.length
    ? paragraph(p6pieces)
    : '오늘과 이번 달의 흐름은 평이해요. 큰 결정을 서두르기보단 일상의 톤을 다듬는 시기가 맞아요.'
  const p6en = p6piecesEn.length
    ? paragraph(p6piecesEn)
    : 'Today and this month sit calmly — refine daily grain rather than rushing big decisions.'

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
    { ko: p5ko, en: p5en },
    { ko: p6ko, en: p6en },
  ]

  return {
    decisiveYears,
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed },
  }
}

// ─── helpers for P5/P6 (calendar-engine adapter consumers) ────────────
const ZR_SIGN_KO: Record<string, string> = {
  Aries: '시작과 자기 발견',
  Taurus: '안정과 뿌리내림',
  Gemini: '연결과 학습',
  Cancer: '돌봄과 정서',
  Leo: '자기 표현과 창조',
  Virgo: '정밀과 헌신',
  Libra: '관계와 조화',
  Scorpio: '심층 변형',
  Sagittarius: '확장과 진리',
  Capricorn: '구조와 성취',
  Aquarius: '혁신과 공동체',
  Pisces: '용해와 연민',
}
const ZR_SIGN_EN: Record<string, string> = {
  Aries: 'beginning and self-discovery',
  Taurus: 'stability and rooting',
  Gemini: 'connection and learning',
  Cancer: 'care and emotion',
  Leo: 'self-expression and creation',
  Virgo: 'precision and devotion',
  Libra: 'relationship and harmony',
  Scorpio: 'deep transformation',
  Sagittarius: 'expansion and truth',
  Capricorn: 'structure and achievement',
  Aquarius: 'innovation and community',
  Pisces: 'dissolution and compassion',
}
function zrSignKo(sign: string): string {
  return ZR_SIGN_KO[sign] ?? '본연의 톤'
}
function zrThemeKo(sign: string): string {
  return ZR_SIGN_KO[sign] ?? '본연의 톤'
}
function zrThemeEn(sign: string): string {
  return ZR_SIGN_EN[sign] ?? 'a native grain'
}
function planetName(p: string, lang: 'ko' | 'en'): string {
  if (lang === 'en') return p
  const ko: Record<string, string> = {
    Sun: '태양',
    Moon: '달',
    Mercury: '수성',
    Venus: '금성',
    Mars: '화성',
    Jupiter: '목성',
    Saturn: '토성',
  }
  return ko[p] ?? p
}
function profHouseKo(h: number): string {
  const map: Record<number, string> = {
    1: '정체성',
    2: '재산',
    3: '소통과 학습',
    4: '가정과 뿌리',
    5: '창조와 자녀',
    6: '일상과 건강',
    7: '관계와 동반자',
    8: '깊이와 공동 자원',
    9: '확장과 신념',
    10: '사회 무대',
    11: '동료와 비전',
    12: '내면과 마무리',
  }
  return map[h] ?? `${h}궁`
}
function profHouseEn(h: number): string {
  const map: Record<number, string> = {
    1: 'identity',
    2: 'resources and value',
    3: 'speech and learning',
    4: 'home and roots',
    5: 'creation and children',
    6: 'daily work and health',
    7: 'partnership',
    8: 'depth and shared resource',
    9: 'expansion and belief',
    10: 'public standing',
    11: 'community and vision',
    12: 'inner closure',
  }
  return map[h] ?? `house ${h}`
}
function profPracticalKo(h: number): string {
  const map: Record<number, string> = {
    1: '자기 표현과 새 시작',
    2: '돈과 자원의 정리',
    3: '학습·짧은 이동·이웃 일',
    4: '가정·부동산·뿌리 일',
    5: '창작·자녀·연애',
    6: '건강·일상 루틴',
    7: '결혼·계약·공식 관계',
    8: '공동 자원·심리적 변환',
    9: '여행·교육·확장',
    10: '커리어·공적 성취',
    11: '동료·이상·후원',
    12: '마무리·은둔·치유',
  }
  return map[h] ?? '한 해의 핵심 영역'
}
function profPracticalEn(h: number): string {
  const map: Record<number, string> = {
    1: 'self-expression and new beginnings',
    2: 'money and value organisation',
    3: 'study, short travel, neighbourhood',
    4: 'home, property, roots',
    5: 'creation, children, romance',
    6: 'health and daily routine',
    7: 'marriage, contract, formal relationship',
    8: 'shared resources, psychological transformation',
    9: 'travel, education, expansion',
    10: 'career and public achievement',
    11: 'peers, ideals, sponsorship',
    12: 'closure, retreat, healing',
  }
  return map[h] ?? "the year's central area"
}

// Pick representative saju entries — one per domain, earliest age first.
function filterRepresentativeSaju(picks: DecisiveYear[]): DecisiveYear[] {
  const byDomain: Record<string, DecisiveYear> = {}
  for (const p of picks) {
    if (!byDomain[p.domain] || byDomain[p.domain].age > p.age) {
      byDomain[p.domain] = p
    }
  }
  return Object.values(byDomain)
}

function representativeAstro(picks: DecisiveYear[]): DecisiveYear[] {
  // Keep Saturn returns, Uranus opposition, Chiron return — drop micro events.
  const keep = new Set([
    'saturn_return_1',
    'saturn_return_2',
    'uranus_opposition',
    'chiron_return',
    'jupiter_return_5',
  ])
  return picks.filter((p) => p.sources.astro && keep.has(p.sources.astro))
}

function labelKoDomain(d: string): string {
  switch (d) {
    case 'marriage':
      return '결혼'
    case 'job_change':
      return '이직·전환'
    case 'business':
      return '사업'
    case 'move':
      return '이사·이동'
    case 'health':
      return '건강'
    case 'wealth':
      return '재물'
    case 'crisis':
      return '위기'
    case 'career':
      return '커리어'
    case 'love':
      return '관계'
    default:
      return d
  }
}

// Inline age computation — mirrors adapter's ageFromBirth so we don't have
// to plumb it down. Deterministic against the current UTC date.
function ageFromBirthInline(saju: { input?: { birthDate?: string } }): number {
  const bd = saju.input?.birthDate
  if (!bd) return 0
  const parts = bd.split('-')
  if (parts.length !== 3) return 0
  const by = Number(parts[0]) || 0
  const bm = Number(parts[1]) || 1
  const bdy = Number(parts[2]) || 1
  if (!by) return 0
  const now = new Date()
  let age = now.getUTCFullYear() - by
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  if (m < bm || (m === bm && d < bdy)) age -= 1
  return Math.max(0, age)
}

function labelEnDomain(d: string): string {
  switch (d) {
    case 'marriage':
      return 'marriage'
    case 'job_change':
      return 'career shift'
    case 'business':
      return 'business'
    case 'move':
      return 'relocation'
    case 'health':
      return 'health'
    case 'wealth':
      return 'wealth'
    case 'crisis':
      return 'crisis'
    case 'career':
      return 'career'
    case 'love':
      return 'relationship'
    default:
      return d
  }
}
