// src/lib/fusion/lifeReport/sections/lifeStages.ts
// 생애 단계 4개 (0-20 / 20-40 / 40-60 / 60+).
//
// Absorbs:
//   • saju/extendedAnalysis.ts → 5-stage life narrative (compressed 5→4)
//   • saju/orthodoxInterpretation.ts → pillar position rule (year=초년 ...)
//   • fusion/lifeReport/signals/astroLifecycle.ts → Saturn/Jupiter/Uranus/Chiron returns
//   • saju/ultraAdvanced.iljuDeep.twelveStage → 12운성 flavor
//
// Each stage gets 3–4 paragraphs:
//   1. macro flow (which pillar + daewoon + progressed sun governs)
//   2. signature events (daewoon ganji shift + astro lifecycle hit)
//   3. challenges & gifts (sibsin tone + lifecycle event meaning)
//   4. one-line guidance

import type { BuilderInput, LifeStage, LifeStageId, LifeStages, Paragraph } from '../types'
import {
  daeunCycles,
  dayElement,
  geokgukType,
  isJonggeok,
  jonggeokType,
} from '../signals/sajuSignals'
import { findPlanet } from '../signals/astroSynthesis'
import { nearestEclipses } from '../signals/astroSignals'
import {
  eventsInAgeRange,
  type AstroLifecycleEvent,
} from '../signals/astroLifecycle'
import { signLabel, paragraph } from '../templates/sentences'

interface StageRange {
  id: LifeStageId
  years: string
  ageLow: number
  ageHigh: number
  titleKo: string
  titleEn: string
  pillarKo: string
  pillarEn: string
  themeKo: string
  themeEn: string
}

const RANGES: StageRange[] = [
  {
    id: 'early',
    years: '0-20',
    ageLow: 0,
    ageHigh: 20,
    titleKo: '초년기 (0–20세)',
    titleEn: 'Early years (0–20)',
    pillarKo: '뿌리와 환경',
    pillarEn: 'early-life pillar',
    themeKo: '환경에 적응하고 처음 자기 색을 느끼는 시기',
    themeEn: 'environment, roots, learning',
  },
  {
    id: 'young',
    years: '20-40',
    ageLow: 20,
    ageHigh: 40,
    titleKo: '청년기 (20–40세)',
    titleEn: 'Young adulthood (20–40)',
    pillarKo: '독립과 진로',
    pillarEn: 'young-adulthood pillar',
    themeKo: '진로와 관계의 토대를 짓는 시기',
    themeEn: 'career, independence, forming bonds',
  },
  {
    id: 'middle',
    years: '40-60',
    ageLow: 40,
    ageHigh: 60,
    titleKo: '장년기 (40–60세)',
    titleEn: 'Middle years (40–60)',
    pillarKo: '본격적 자기 무대',
    pillarEn: 'middle-life pillar',
    themeKo: '진짜 자기 색이 가장 진하게 드러나는 시기',
    themeEn: 'true self, social position',
  },
  {
    id: 'late',
    years: '60+',
    ageLow: 60,
    ageHigh: 99,
    titleKo: '후반기 (60세 이후)',
    titleEn: 'Later years (60+)',
    pillarKo: '결실과 내면',
    pillarEn: 'late-life pillar',
    themeKo: '결실을 거두고 남길 것을 정리하는 시기',
    themeEn: 'harvest, legacy, inner work',
  },
]

const ELEMENT_TEXTURE_KO: Record<string, string> = {
  목: '성장과 학습',
  화: '표현과 열정',
  토: '안정과 신뢰',
  금: '결단과 정밀',
  수: '깊이와 직관',
  wood: '성장과 학습',
  fire: '표현과 열정',
  earth: '안정과 신뢰',
  metal: '결단과 정밀',
  water: '깊이와 직관',
}
const ELEMENT_TEXTURE_EN: Record<string, string> = {
  목: 'growth and learning',
  화: 'expression and passion',
  토: 'steadiness and trust',
  금: 'decisiveness and precision',
  수: 'depth and intuition',
  wood: 'growth and learning',
  fire: 'expression and passion',
  earth: 'steadiness and trust',
  metal: 'decisiveness and precision',
  water: 'depth and intuition',
}

export function buildLifeStages(input: BuilderInput): LifeStages {
  return {
    early: buildOne(input, RANGES[0]),
    young: buildOne(input, RANGES[1]),
    middle: buildOne(input, RANGES[2]),
    late: buildOne(input, RANGES[3]),
  }
}

function buildOne(input: BuilderInput, range: StageRange): LifeStage {
  const { saju, astro } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []

  // ─ pillar element for this stage (year/month/day/time)
  const pillarMap: Record<LifeStageId, { stem: string; branch: string }> = {
    early: saju.pillars.year,
    young: saju.pillars.month,
    middle: saju.pillars.day,
    late: saju.pillars.time,
  }
  const pillar = pillarMap[range.id]
  if (pillar) sajuUsed.push(`pillars.${range.id === 'early' ? 'year' : range.id === 'young' ? 'month' : range.id === 'middle' ? 'day' : 'time'}`)
  const dayEl = dayElement(saju)
  if (dayEl) sajuUsed.push('pillars.day.element')

  // ─ daewoon cycles overlapping this stage's age range
  const cycles = daeunCycles(saju)
  const stageDaeun = cycles.filter((c) => {
    const a = c.age
    return a + 9 >= range.ageLow && a <= range.ageHigh
  })
  if (stageDaeun.length > 0) sajuUsed.push('cycles.daeunCycles')

  // ─ astro lifecycle events in this stage
  const lifecycleEvts = eventsInAgeRange(range.ageLow, range.ageHigh)
  if (lifecycleEvts.length > 0) astroUsed.push('lifecycle.events')

  // ─ progressed sun (for young/middle especially)
  const progSun = astro.progressions?.secondary?.progressedSun
  if (progSun) astroUsed.push('progressions.secondary.progressedSun')

  // ─ saju ultra-advanced flavor — pick the 12운성 of the pillar that
  //   governs *this* stage (not always the day pillar).
  const twelveAll = input.calendarSignals?.twelveStageAll
  const ilju12 = saju.ultraAdvanced?.iljuDeep?.twelveStage
  const pillarKey: 'year' | 'month' | 'day' | 'time' =
    range.id === 'early' ? 'year' :
    range.id === 'young' ? 'month' :
    range.id === 'middle' ? 'day' : 'time'
  const stageTwelve =
    (twelveAll && twelveAll[pillarKey]) ||
    (pillarKey === 'day' ? ilju12 : undefined)
  if (stageTwelve) {
    sajuUsed.push(`calendarSignals.twelveStageAll.${pillarKey}`)
  } else if (ilju12 && pillarKey === 'day') {
    sajuUsed.push('ultraAdvanced.iljuDeep.twelveStage')
  }
  const geokguk = geokgukType(saju)
  if (geokguk) sajuUsed.push('advanced.geokguk.type')
  const jong = isJonggeok(saju) ? jonggeokType(saju) : ''
  if (jong) sajuUsed.push('ultraAdvanced.jonggeok.type')

  // ─ sun for "your central planet" flavor
  const sun = findPlanet(astro, 'Sun')
  if (sun) astroUsed.push('planets.sun')

  // ───────────────────── 文단 1: 큰 흐름
  const p1ko = paragraph([
    `${range.titleKo}는 ${range.pillarKo}${iGaForBatchim(range.pillarKo)} 무게중심이 되는 때에요.`,
    pillar?.stem || pillar?.branch
      ? `${ELEMENT_TEXTURE_KO[dayEl] ?? '균형'}의 톤이 ${range.themeKo}에 스며들어요.`
      : '',
    progSun && range.id !== 'early'
      ? `자아의 색이 ${signLabel(progSun.sign, 'ko')} 쪽으로 천천히 옮겨가며 톤이 살짝 바뀌어요.`
      : '',
  ])
  const p1en = paragraph([
    `${range.titleEn} is ruled by the ${range.pillarEn} — the anchor for ${range.themeEn}.`,
    pillar?.stem || pillar?.branch
      ? `Its ${pillarGrainEn(pillar.stem, pillar.branch)} essence brings ${ELEMENT_TEXTURE_EN[dayEl] ?? 'balance'} to this season.`
      : '',
    progSun && range.id !== 'early'
      ? `Your progressed Sun has moved into ${signLabel(progSun.sign, 'en')}, slowly retuning identity.`
      : '',
  ])

  // ───────────────────── 文단 2: 주요 사건 (대운 + 점성 lifecycle hits)
  const eventLinesKo: string[] = []
  const eventLinesEn: string[] = []
  const daeunAges = stageDaeun.slice(0, 3).map((d) => d.age).filter((a): a is number => !!a)
  if (daeunAges.length > 0) {
    eventLinesKo.push(`${daeunAges.join('세, ')}세 무렵에 인생 흐름이 새로운 챕터로 갈아타요.`)
  }
  const daeunSentenceEn = daeunAgesSentenceEn(daeunAges)
  if (daeunSentenceEn) eventLinesEn.push(daeunSentenceEn)
  lifecycleEvts.slice(0, 3).forEach((ev, idx) => {
    eventLinesKo.push(
      `${ev.ageStart}~${ev.ageEnd}세, ${ev.labelKo} — ${ev.meaningKo}`
    )
    eventLinesEn.push(lifecycleSentenceEn(ev, idx))
  })
  const p2ko = paragraph(
    eventLinesKo.length > 0
      ? eventLinesKo
      : ['이 시기엔 큰 격동 없이 잔잔한 흐름이 이어져요.']
  )
  const p2en = paragraph(
    eventLinesEn.length > 0
      ? eventLinesEn
      : ['Major pivots stay quiet through this stretch — a steady current.']
  )

  // ───────────────────── 文단 3: 도전·성취
  // Early stage(초년기)에는 출생 직전·직후 일식·월식이 이 시기의 결을 새깁니다.
  let earlyEclipseKo = ''
  let earlyEclipseEn = ''
  if (range.id === 'early') {
    const eclipses = nearestEclipses(astro)
    if (eclipses.length > 0) {
      astroUsed.push('eclipses.nearest')
      const solar = eclipses.find((e) => e.type === 'solar')
      const lunar = eclipses.find((e) => e.type === 'lunar')
      if (solar) {
        const signKo = solar.sign ? signLabel(solar.sign, 'ko') : ''
        earlyEclipseKo = `출생 즈음 ${signKo ? signKo + ' 자리의 ' : ''}일식의 영향으로, 초년기의 정체성에 큰 결이 한 번 새겨져요.`
        const signEn = solar.sign ? signLabel(solar.sign, 'en') : ''
        earlyEclipseEn = `A solar eclipse near birth${signEn ? ' (in ' + signEn + ')' : ''} stamps an identity-marker into the early years.`
      } else if (lunar) {
        const signKo = lunar.sign ? signLabel(lunar.sign, 'ko') : ''
        earlyEclipseKo = `출생 즈음 ${signKo ? signKo + ' 자리의 ' : ''}월식의 영향으로, 초년기의 감정 결에 깊은 변곡이 한 번 새겨져요.`
        const signEn = lunar.sign ? signLabel(lunar.sign, 'en') : ''
        earlyEclipseEn = `A lunar eclipse near birth${signEn ? ' (in ' + signEn + ')' : ''} sets a deep emotional bend through the early years.`
      }
    }
  }
  const p3ko = paragraph([
    challengePieceKo(range.id, stageTwelve, geokguk, jong, lifecycleEvts),
    sun && range.id === 'middle'
      ? `${signLabel(sun.sign, 'ko')}의 자아 색깔이 이 시기에 가장 진하게 드러나요.`
      : '',
    earlyEclipseKo,
  ])
  const p3en = paragraph([
    challengePieceEn(range.id, stageTwelve, geokguk, jong, lifecycleEvts),
    sun && range.id === 'middle'
      ? `Your ${signLabel(sun.sign, 'en')} Sun shows its truest colour through this window.`
      : '',
    earlyEclipseEn,
  ])

  // ───────────────────── 文단 4: 한 줄 조언
  const p4ko = guideKo(range.id)
  const p4en = guideEn(range.id)

  const paragraphs: Paragraph[] = [
    { ko: p1ko, en: p1en },
    { ko: p2ko, en: p2en },
    { ko: p3ko, en: p3en },
    { ko: p4ko, en: p4en },
  ]

  return {
    id: range.id,
    years: range.years,
    title: { ko: range.titleKo, en: range.titleEn },
    paragraphs,
    signals: { saju: sajuUsed, astro: astroUsed },
  }
}

function challengePieceKo(
  id: LifeStageId,
  twelveStage: string | undefined,
  geokguk: string,
  jong: string,
  events: AstroLifecycleEvent[]
): string {
  const stagePiece = twelveStage
    ? `${twelveStageMeaningKo(twelveStage)} `
    : ''
  if (id === 'early') {
    return `${stagePiece}어린 시절엔 환경에 적응하며 자기 색을 처음 느껴요. ${jong ? '한 방향으로 강하게 흐르는 성향이 일찍부터 드러나요.' : geokguk ? `${geokgukShortKo(geokguk)}의 색이 가정과 학교에서 일찍부터 보여요.` : ''}`
  }
  if (id === 'young') {
    const sat = events.find((e) => e.kind === 'saturn_return_1')
    return `${stagePiece}청년기는 진짜 자기를 시험하는 때예요. ${sat ? `특히 ${sat.ageStart}세 무렵엔 어른됨의 통과의례가 와요 — 책임과 전문성, 기반이 자리 잡는 시기예요.` : '인생 흐름이 바뀌는 지점마다 자기 검증의 층이 한 겹씩 쌓여요.'}`
  }
  if (id === 'middle') {
    const ura = events.find((e) => e.kind === 'uranus_opposition')
    return `${stagePiece}40대는 진짜 자기와 맞지 않는 길이 흔들리는 시기예요. ${ura ? `${ura.ageStart}~${ura.ageEnd}세 무렵 자유의 각성이 가장 격렬하게 와요.` : '인생 흐름이 바뀌면서 사회적 위치도 다시 정렬돼요.'}`
  }
  const chi = events.find((e) => e.kind === 'chiron_return')
  return `${stagePiece}후반기는 평생 모아온 흐름을 결산하는 시기예요. ${chi ? `${chi.ageStart}세 무렵 치유의 회귀가 와서, 오랜 상처가 다른 사람을 돕는 자원으로 바뀌어요.` : '두 번째 어른됨의 통과의례가 진짜 남길 것을 정해줘요.'}`
}

// 12운성을 의미로 풀어쓰는 헬퍼 (코드 로직 안 건드림 — narrative만)
function twelveStageMeaningKo(stage: string): string {
  if (!stage) return ''
  if (stage.includes('생') || stage.includes('장생')) return '탄생의 기운이 흐르는 시기라'
  if (stage.includes('욕')) return '성장의 기운이 흐르는 시기라'
  if (stage.includes('관대')) return '성장기를 마무리하는 시기라'
  if (stage.includes('임관') || stage.includes('건록')) return '공적 무대로 진입하는 시기라'
  if (stage.includes('제왕') || stage.includes('왕지')) return '정점의 기운이 흐르는 시기라'
  if (stage.includes('쇠')) return '쇠퇴의 시작이라'
  if (stage.includes('병')) return '천천히 내려오는 시기라'
  if (stage.includes('사')) return '고요한 기운이 흐르는 시기라'
  if (stage.includes('묘')) return '휴식과 비움의 시기라'
  if (stage.includes('절')) return '끝과 새로운 시작이 만나는 시기라'
  if (stage.includes('태')) return '잉태의 기운이 흐르는 시기라'
  if (stage.includes('양')) return '키워지는 시기라'
  return ''
}

function twelveStageMeaningEn(stage: string): string {
  if (!stage) return ''
  if (stage.includes('장생') || stage === '생') return 'a current of birth'
  if (stage.includes('욕')) return 'a current of growth'
  if (stage.includes('관대')) return 'the closing of a growth phase'
  if (stage.includes('임관') || stage.includes('건록')) return 'an entry into the public stage'
  if (stage.includes('제왕') || stage.includes('왕지')) return 'a current at its peak'
  if (stage.includes('쇠')) return 'the first softening'
  if (stage.includes('병')) return 'a slow descent'
  if (stage.includes('사')) return 'a current of stillness'
  if (stage.includes('묘')) return 'a phase of rest and emptying'
  if (stage.includes('절')) return 'an ending meeting a new beginning'
  if (stage.includes('태')) return 'a current of conception'
  if (stage.includes('양')) return 'a phase of being nurtured'
  return ''
}

function geokgukShortKo(g: string): string {
  if (!g) return '본연의 색'
  if (g.includes('편관')) return '도전을 동력으로 쓰는 성향'
  if (g.includes('정관')) return '책임감 있는 흐름'
  if (g.includes('편재')) return '기회를 잡는 감각'
  if (g.includes('정재')) return '꾸준한 흐름'
  if (g.includes('식신')) return '여유로운 표현'
  if (g.includes('상관')) return '재능을 발산하는 자질'
  if (g.includes('편인')) return '독특한 직관'
  if (g.includes('정인')) return '배움과 돌봄'
  return '본연의 색'
}

function challengePieceEn(
  id: LifeStageId,
  twelveStage: string | undefined,
  geokguk: string,
  jong: string,
  events: AstroLifecycleEvent[]
): string {
  const pillarLabel: Record<LifeStageId, string> = {
    early: 'early-life pillar',
    young: 'young-adulthood pillar',
    middle: 'middle-life pillar',
    late: 'late-life pillar',
  }
  const stagePiece = twelveStage
    ? `Because ${twelveStageMeaningEn(twelveStage)} runs on the ${pillarLabel[id]}, `
    : ''
  if (id === 'early') {
    return `${stagePiece}childhood is the first felt-sense of your own grain. ${jong ? 'A single-direction current shows up early on, pulling life toward one focus.' : geokguk ? `Your ${geokgukShortEn(geokguk)} shows up at school and at home from the very start.` : ''}`
  }
  if (id === 'young') {
    const sat = events.find((e) => e.kind === 'saturn_return_1')
    return `${stagePiece}young adulthood tests identity head-on. ${sat ? `The decisive rite arrives around age ${sat.ageStart} — the first Saturn return.` : 'Each 10-year life-chapter adds a fresh layer of self-verification.'}`
  }
  if (id === 'middle') {
    const ura = events.find((e) => e.kind === 'uranus_opposition')
    return `${stagePiece}middle adulthood is when paths that are not truly yours start to crack. ${ura ? `Ages ${ura.ageStart}–${ura.ageEnd}, the Uranus opposition, drives the loudest shaking.` : 'Fresh life-chapters realign your social position.'}`
  }
  const chi = events.find((e) => e.kind === 'chiron_return')
  return `${stagePiece}later life harvests everything you've gathered. ${chi ? `The Chiron return at age ${chi.ageStart} converts old wounds into healing capacity.` : 'A second Saturn return finalises what you choose to leave behind.'}`
}

// 격국 → natural English (lifeStages 섹션 전용 — raw 사주 라벨 없이).
function geokgukShortEn(g: string): string {
  if (!g) return 'native colour'
  if (g.includes('편관')) return 'pressure-as-fuel colour'
  if (g.includes('정관')) return 'steady-authority colour'
  if (g.includes('편재')) return 'opportunistic-resource colour'
  if (g.includes('정재')) return 'steady-resource colour'
  if (g.includes('식신')) return 'easeful-expression colour'
  if (g.includes('상관')) return 'free-talent colour'
  if (g.includes('편인')) return 'unconventional-wisdom colour'
  if (g.includes('정인')) return 'learning-and-care colour'
  return 'native colour'
}

// 기둥의 천간+지지 (hanja) → 자연 영어 grain label (e.g. "Yang Metal Dragon").
const PILLAR_STEM_EN: Record<string, string> = {
  甲: 'Yang Wood', 乙: 'Yin Wood',
  丙: 'Yang Fire', 丁: 'Yin Fire',
  戊: 'Yang Earth', 己: 'Yin Earth',
  庚: 'Yang Metal', 辛: 'Yin Metal',
  壬: 'Yang Water', 癸: 'Yin Water',
}
const PILLAR_BRANCH_EN: Record<string, string> = {
  子: 'Rat', 丑: 'Ox', 寅: 'Tiger', 卯: 'Rabbit',
  辰: 'Dragon', 巳: 'Snake', 午: 'Horse', 未: 'Goat',
  申: 'Monkey', 酉: 'Rooster', 戌: 'Dog', 亥: 'Pig',
}
function pillarGrainEn(stem: string | undefined, branch: string | undefined): string {
  const s = stem ? (PILLAR_STEM_EN[stem] ?? '') : ''
  const b = branch ? (PILLAR_BRANCH_EN[branch] ?? '') : ''
  if (s && b) return `${s} ${b}`
  if (s) return s
  if (b) return b
  return 'native'
}

// Collapse multiple daewoon ages into one natural English sentence
// (avoids the repetitive "Age X opens... Age Y opens..." pattern).
function daeunAgesSentenceEn(ages: number[]): string {
  if (ages.length === 0) return ''
  if (ages.length === 1) {
    return `Age ${ages[0]} opens a fresh 10-year life-chapter.`
  }
  if (ages.length === 2) {
    return `Ages ${ages[0]} and ${ages[1]} each open a fresh 10-year life-chapter.`
  }
  const head = ages.slice(0, -1).join(', ')
  const tail = ages[ages.length - 1]
  return `Ages ${head}, and ${tail} each open a fresh 10-year life-chapter.`
}

// Vary the sentence structure used to introduce lifecycle events so we
// don't repeat "Ages X–Y, EVENT: explanation" three times in a row.
// Each kind has a hand-tuned natural-English variant; idx is used to
// rotate opening connectors (Around / Then at / —) when no variant exists.
function lifecycleSentenceEn(ev: AstroLifecycleEvent, idx: number): string {
  const variant = LIFECYCLE_EN_VARIANTS[ev.kind]?.[idx]
    ?? LIFECYCLE_EN_VARIANTS[ev.kind]?.[0]
  if (variant) return variant
  // Fallback to the generic "Ages X–Y, EVENT: meaning" form.
  return `Ages ${ev.ageStart}–${ev.ageEnd}, ${ev.labelEn}: ${ev.meaningEn}`
}

// Per-event natural English variants, indexed by the order the event
// appears in the stage (0 = first, 1 = second, 2 = third). Variants beyond
// the available index fall back to variant[0]. Each line is self-contained
// and avoids the "<label>: <sentence>" colon pattern.
const LIFECYCLE_EN_VARIANTS: Partial<Record<AstroLifecycleEvent['kind'], string[]>> = {
  jupiter_return_1: [
    'Ages 11–13 bring the first Jupiter return — your worldview expands a step.',
  ],
  jupiter_return_2: [
    'Around ages 23–25, your second Jupiter return helps you first grasp the bigger picture of your career.',
    'Ages 23–25 then bring a second Jupiter return, sharpening the bigger picture of your career.',
  ],
  progressed_lunar_1: [
    'At ages 27–29, the Progressed Moon return graduates one full emotional and relational cycle.',
    'Then at ages 27–29, a Progressed Moon return brings one full emotional cycle to graduation.',
  ],
  saturn_return_1: [
    'The first Saturn return between 28–31 marks the rite of adulthood — responsibility, craft and foundation lock in.',
    'Between 28–31, the first Saturn return arrives as the rite of adulthood — responsibility, craft and foundation lock in.',
    'The first Saturn return at 28–31 marks the rite of adulthood — responsibility, craft and foundation lock in.',
  ],
  jupiter_return_3: [
    'Around ages 35–37, a third Jupiter return opens the last big expansion window before midlife.',
    'Ages 35–37 then bring the last big expansion window before midlife, via the third Jupiter return.',
  ],
  pluto_square_pluto: [
    'Between 36 and 40, Pluto squares its natal place — identity and the deep self are forcibly reorganised.',
    'Then between 36 and 40, the Pluto square reorganises identity and the deep self from the ground up.',
    'Ages 36–40 bring a Pluto square that reorganises identity and the deep self from the ground up.',
  ],
  uranus_opposition: [
    'Around ages 40–43, the Uranus opposition cracks open whatever in your life is not truly yours.',
    'Then at ages 40–43, the Uranus opposition cracks open what in your life is not truly yours.',
  ],
  neptune_square: [
    'Ages 41–43 put meaning and illusion on trial through the Neptune square.',
    'Then at 41–43, the Neptune square puts meaning and illusion on trial.',
    'The Neptune square at 41–43 puts meaning and illusion on trial.',
  ],
  chiron_return: [
    'Around ages 49–51, the Chiron return turns your lifelong wound into healing capacity.',
    'Then at 49–51, the Chiron return converts the lifelong wound into healing capacity.',
  ],
  saturn_return_2: [
    'Ages 57–60 bring the second Saturn return — the last great social pivot, deciding what you leave behind.',
    'Then between 57 and 60, the second Saturn return becomes the last great social pivot, deciding what you leave behind.',
  ],
  jupiter_return_5: [
    'At ages 59–61, a fifth Jupiter return marks a 60-year turning point — the second half of life opens its first cycle.',
    'Then at 59–61, a fifth Jupiter return opens the first cycle of the second half of life.',
  ],
  uranus_return: [
    'Ages 83–85 bring the Uranus return — a lifetime of freedom and originality finishes its full circle.',
  ],
}

function guideKo(id: LifeStageId): string {
  if (id === 'early')
    return '한 줄 조언: 환경이 주는 결을 거부하지 말고 천천히 흡수하세요. 진짜 자기 색은 아직 다 드러나지 않았어요.'
  if (id === 'young')
    return '한 줄 조언: 회피하지 말고 책임을 한 단계씩 받아들이세요. 30세 무렵의 선택이 평생의 토대가 됩니다.'
  if (id === 'middle')
    return '한 줄 조언: 안정을 빌미로 미루지 마세요. 40대의 진짜 결정이 후반기 자유를 만들어요.'
  return '한 줄 조언: 결과보다 의미에 시간을 쓰세요. 남기는 결이 진짜 자산이에요.'
}

function guideEn(id: LifeStageId): string {
  if (id === 'early')
    return 'One-line guide: Absorb the environment without resisting it — your true colour has not yet fully emerged.'
  if (id === 'young')
    return 'One-line guide: Accept responsibility step by step. The choices you make around 30 set the foundation for the rest of your life.'
  if (id === 'middle')
    return 'One-line guide: Do not postpone the real decisions in the name of stability. What you choose in your 40s shapes the freedom of your 60s.'
  return 'One-line guide: Spend time on meaning rather than results. What you leave behind is your real wealth.'
}

// 받침 유무에 따라 이/가 선택 (한국어 자연 조사).
// 마지막 글자가 한글이고 종성(받침)이 있으면 '이', 없으면 '가'.
function iGaForBatchim(s: string): string {
  if (!s) return '가'
  const last = s[s.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return '가'
  const final = (code - 0xac00) % 28
  return final === 0 ? '가' : '이'
}
