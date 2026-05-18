// src/lib/fusion/lifeReport/sections/decisiveTiming.ts
// 결정적 타이밍 — fuses saju daewoon pivots with astro lifecycle hits
// to produce 5-8 "decisive years" plus a 4-paragraph narrative.
//
// Absorbs:
//   • saju/extendedAnalysis.ts → 7 decisive timings (marriage/job/business/
//     move/health_warning/wealth_peak/crisis)
//   • astrology/lifecycleTiming.ts → Saturn/Jupiter/Uranus/Chiron returns
//   • saju/orthodoxInterpretation.ts → pillar position rule (for ages 30/40/50)

import type {
  BuilderInput,
  DecisiveTiming,
  DecisiveYear,
  Paragraph,
} from '../types'
import {
  daeunCycles,
  dayStrength,
} from '../signals/sajuSignals'
import {
  birthYearFromBirthDate,
  eventsInAgeRange,
  lifecycleEvents,
} from '../signals/astroLifecycle'
import { iGa, paragraph } from '../templates/sentences'

// Map daewoon position (index) → heuristic domain — mirrors the legacy
// extendedAnalysis logic which used `i % 3 === 1` etc. We keep the same
// pattern so behaviour is reproducible.
const DAEUN_HEURISTIC: Array<{
  domain: DecisiveYear['domain']
  domainKo: string
  domainEn: string
  match: (i: number) => boolean
}> = [
  { domain: 'job_change', domainKo: '이직·전환', domainEn: 'career shift', match: (i) => i % 3 === 1 },
  { domain: 'business', domainKo: '사업·창업', domainEn: 'business launch', match: (i) => i >= 2 && i <= 4 },
  { domain: 'move', domainKo: '이사·이동', domainEn: 'move / relocation', match: (i) => i === 1 || i === 3 },
  { domain: 'health', domainKo: '건강 주의', domainEn: 'health caution', match: (i) => i === 4 || i === 6 },
  { domain: 'wealth', domainKo: '재물 호황', domainEn: 'wealth peak', match: (i) => i === 2 || i === 5 },
  { domain: 'crisis', domainKo: '위기·시련', domainEn: 'crisis', match: (i) => i === 5 || i === 7 },
]

const LIFECYCLE_TO_DOMAIN: Record<string, {
  domain: DecisiveYear['domain']
  ko: string
  en: string
}> = {
  saturn_return_1: { domain: 'career', ko: '커리어 토대가 굳어지는 때', en: 'career foundation' },
  saturn_return_2: { domain: 'career', ko: '커리어 마지막 정리의 때', en: 'late-career consolidation' },
  jupiter_return_2: { domain: 'career', ko: '진로 큰 그림이 잡히는 때', en: 'career big picture' },
  jupiter_return_5: { domain: 'wealth', ko: '환갑의 결, 후반 인생 첫 사이클', en: '환갑-style turn' },
  uranus_opposition: { domain: 'crisis', ko: '중년 자유의 각성', en: 'midlife awakening' },
  pluto_square_pluto: { domain: 'crisis', ko: '정체성이 깊이 재구성되는 때', en: 'identity rebuild pressure' },
  chiron_return: { domain: 'health', ko: '치유의 회귀', en: 'healing turning point' },
  neptune_square: { domain: 'crisis', ko: '의미가 시험에 오르는 때', en: 'meaning test' },
  progressed_lunar_1: { domain: 'love', ko: '감정 사이클의 졸업', en: 'emotional cycle graduation' },
}

export function buildDecisiveTiming(input: BuilderInput): DecisiveTiming {
  const { saju, astro } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []

  // ─ Resolve birth year (used only to compute calendar year for each age)
  const birthYear =
    birthYearFromBirthDate(saju.input.birthDate) ?? new Date().getFullYear()

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
          en: `Age ${c.age} daewoon ${c.ganji ? c.ganji + ' ' : ''}— a window where marriage / partnership flow strengthens.`,
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
          ko: `${c.age}세 무렵 — ${rule.domainKo}의 결이 본격적으로 피어나는 시기예요.`,
          en: `Age ${c.age} daewoon ${c.ganji ? c.ganji + ' ' : ''}— ${rule.domainEn} activates in earnest.`,
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
    const overlap = sajuPicks.find(
      (s) => Math.abs(s.age - a.age) <= 2 && s.domain !== 'marriage'
    )
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
          en: `Age ${a.age} — a year where the saju (${overlap.sources.saju}) pivot meets the astro (${a.sources.astro}) pivot. ${a.description.en.split(': ').slice(-1)[0]}`,
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
  for (const y of [...merged, ...filterRepresentativeSaju(sajuPicks), ...representativeAstro(astroPicks)]) {
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
    `Your 30s carry a decisive daewoon stem-shift on the saju side, and ${e30s.map((e) => e.labelEn).join(' / ') || 'several major astro pivots'} on the astrology side.`,
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
    `The 40s gather ${e40s.map((e) => e.labelEn).join(' / ') || 'large astro pivots'} into a single decade.`,
    d40s.length > 0
      ? `Ages ${d40s.map((d) => `${d.age} (${labelEnDomain(d.domain)})`).join(', ')} crack the paths that are not truly yours.`
      : 'Uranus and Neptune shake at once, surfacing the decisions you had postponed.',
  ])

  // P3 — 50대+ 변곡점
  const e50s = eventsInAgeRange(50, 65)
  const d50s = decisiveYears.filter((d) => d.age >= 50)
  const e50sLabel = e50s.map((e) => e.labelKo).join('·') || '치유의 회귀와 두 번째 어른됨의 통과의례'
  const p3ko = paragraph([
    `50대 이후로는 ${e50sLabel}${iGa(e50sLabel)} 핵심이에요.`,
    d50s.length > 0
      ? `${d50s.map((d) => `${d.age}세(${labelKoDomain(d.domain)})`).join(', ')}가 평생의 결을 결산해주는 변곡이에요.`
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
          : `${labelKoDomain(peak.domain)}의 결이 가장 진하게 표면으로 올라오는 시기예요.`,
      ])
    : '큰 변곡이 골고루 분산돼 있어, 한 해에 모든 게 몰리기보다 시기마다 조금씩 결을 갱신해요.'
  const p4en = peak
    ? paragraph([
        `If you had to name the single most decisive year, it would be age ${peak.age} (≈ ${peak.year}).`,
        peak.sources.saju && peak.sources.astro
          ? `The saju (${peak.sources.saju}) and astro (${peak.sources.astro}) pivots overlap in the same year, and ${strength === 'strong' || strength === 'verystrong' ? 'your strong day master gives the drive — one decision can set the rest of the path.' : 'responsibility carries the tender day master into a new identity.'}`
          : `${labelEnDomain(peak.domain)} surfaces most strongly here.`,
      ])
    : 'Major pivots stay distributed — instead of one big year, each daewoon adds a small renewal.'

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
  ]

  return {
    decisiveYears,
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed },
  }
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
