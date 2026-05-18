// src/lib/fusion/lifeReport/sections/lifeStages.ts
// 생애 단계 4개 (0-20 / 20-40 / 40-60 / 60+).
//
// Absorbs:
//   • saju/extendedAnalysis.ts → 5-stage life narrative (compressed 5→4)
//   • saju/orthodoxInterpretation.ts → pillar position rule (year=초년 ...)
//   • astrology/lifecycleTiming.ts → Saturn/Jupiter/Uranus/Chiron returns
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
    pillarKo: '년주',
    pillarEn: 'year pillar',
    themeKo: '환경·뿌리·학습',
    themeEn: 'environment, roots, learning',
  },
  {
    id: 'young',
    years: '20-40',
    ageLow: 20,
    ageHigh: 40,
    titleKo: '청년기 (20–40세)',
    titleEn: 'Young adulthood (20–40)',
    pillarKo: '월주',
    pillarEn: 'month pillar',
    themeKo: '진로·독립·관계 형성',
    themeEn: 'career, independence, forming bonds',
  },
  {
    id: 'middle',
    years: '40-60',
    ageLow: 40,
    ageHigh: 60,
    titleKo: '장년기 (40–60세)',
    titleEn: 'Middle years (40–60)',
    pillarKo: '일주',
    pillarEn: 'day pillar',
    themeKo: '본인 색깔·사회적 위치',
    themeEn: 'true self, social position',
  },
  {
    id: 'late',
    years: '60+',
    ageLow: 60,
    ageHigh: 99,
    titleKo: '후반기 (60세 이후)',
    titleEn: 'Later years (60+)',
    pillarKo: '시주',
    pillarEn: 'time pillar',
    themeKo: '결실·후대·내면',
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

  // ─ saju ultra-advanced flavor
  const ilju12 = saju.ultraAdvanced?.iljuDeep?.twelveStage
  if (ilju12) sajuUsed.push('ultraAdvanced.iljuDeep.twelveStage')
  const geokguk = geokgukType(saju)
  if (geokguk) sajuUsed.push('advanced.geokguk.type')
  const jong = isJonggeok(saju) ? jonggeokType(saju) : ''
  if (jong) sajuUsed.push('ultraAdvanced.jonggeok.type')

  // ─ sun for "your central planet" flavor
  const sun = findPlanet(astro, 'Sun')
  if (sun) astroUsed.push('planets.sun')

  // ───────────────────── 文단 1: 큰 흐름
  const p1ko = paragraph([
    `${range.titleKo}는 사주의 ${range.pillarKo}가 운명의 무게중심으로 작동하는 시기에요.`,
    pillar?.stem || pillar?.branch
      ? `${pillar.stem}${pillar.branch}의 결이 ${ELEMENT_TEXTURE_KO[dayEl] ?? '균형'}의 톤으로 ${range.themeKo}에 작용해요.`
      : '',
    progSun && range.id !== 'early'
      ? `점성의 진행 태양이 ${signLabel(progSun.sign, 'ko')}로 옮겨가며 정체성 톤을 천천히 바꿔요.`
      : '',
  ])
  const p1en = paragraph([
    `${range.titleEn} is ruled by the ${range.pillarEn} — the centre of gravity for ${range.themeEn}.`,
    pillar?.stem || pillar?.branch
      ? `Its ${pillar.stem}${pillar.branch} grain works the ${ELEMENT_TEXTURE_EN[dayEl] ?? 'balance'} note into this season.`
      : '',
    progSun && range.id !== 'early'
      ? `Your progressed Sun has moved into ${signLabel(progSun.sign, 'en')}, slowly retuning identity.`
      : '',
  ])

  // ───────────────────── 文단 2: 주요 사건 (대운 + 점성 lifecycle hits)
  const eventLinesKo: string[] = []
  const eventLinesEn: string[] = []
  for (const d of stageDaeun.slice(0, 3)) {
    if (!d.age) continue
    const ganji = d.ganji ? ` ${d.ganji}` : ''
    eventLinesKo.push(`${d.age}세 대운${ganji}이 한 챕터를 여는 변곡이에요.`)
    eventLinesEn.push(`Age ${d.age} opens a new daeun${ganji}, beginning a fresh chapter.`)
  }
  for (const ev of lifecycleEvts.slice(0, 3)) {
    eventLinesKo.push(
      `${ev.ageStart}~${ev.ageEnd}세 ${ev.labelKo}: ${ev.meaningKo}`
    )
    eventLinesEn.push(
      `Ages ${ev.ageStart}–${ev.ageEnd}, ${ev.labelEn}: ${ev.meaningEn}`
    )
  }
  const p2ko = paragraph(
    eventLinesKo.length > 0
      ? eventLinesKo
      : ['이 시기에 떠오르는 결정적 사건은 큰 변곡 없이 잔잔하게 흘러요.']
  )
  const p2en = paragraph(
    eventLinesEn.length > 0
      ? eventLinesEn
      : ['Major pivots stay quiet through this stretch — a steady current.']
  )

  // ───────────────────── 文단 3: 도전·성취
  const p3ko = paragraph([
    challengePieceKo(range.id, ilju12, geokguk, jong, lifecycleEvts),
    sun && range.id === 'middle'
      ? `점성의 태양이 ${signLabel(sun.sign, 'ko')}에 자리해서 이 시기에 본인 색깔이 가장 진하게 드러나요.`
      : '',
  ])
  const p3en = paragraph([
    challengePieceEn(range.id, ilju12, geokguk, jong, lifecycleEvts),
    sun && range.id === 'middle'
      ? `Your ${signLabel(sun.sign, 'en')} Sun shows its truest colour through this window.`
      : '',
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
    ? `사주 12운성으로 일주가 ${twelveStage}에 자리해서, `
    : ''
  if (id === 'early') {
    return `${stagePiece}어린 시절은 환경에 적응하며 자기 결을 처음 느끼는 시기에요. ${jong ? `${jong}이라 한 방향으로 강하게 흐르는 성향이 일찍부터 드러나요.` : geokguk ? `${geokguk}의 색이 가정·학교에서 일찍부터 보여요.` : ''}`
  }
  if (id === 'young') {
    const sat = events.find((e) => e.kind === 'saturn_return_1')
    return `${stagePiece}청년기는 정체성을 시험하는 시기에요. ${sat ? `특히 ${sat.ageStart}세 전후 첫 토성 회귀에서 어른됨의 결정적 통과의례가 와요.` : '대운 천간이 바뀌는 지점마다 자기 검증의 결이 더해져요.'}`
  }
  if (id === 'middle') {
    const ura = events.find((e) => e.kind === 'uranus_opposition')
    return `${stagePiece}장년기는 진짜 자기와 맞지 않는 길이 흔들리는 시기에요. ${ura ? `${ura.ageStart}~${ura.ageEnd}세 천왕성 어포지션에서 그 흔들림이 가장 격렬해요.` : '대운 변화가 사회적 위치의 재배열을 만들어요.'}`
  }
  const chi = events.find((e) => e.kind === 'chiron_return')
  return `${stagePiece}후반기는 평생 모아온 결을 결산하는 시기에요. ${chi ? `${chi.ageStart}세 카이런 회귀에서 상처가 치유 자원으로 전환돼요.` : '두 번째 토성 회귀가 진짜 남길 것을 결정해요.'}`
}

function challengePieceEn(
  id: LifeStageId,
  twelveStage: string | undefined,
  geokguk: string,
  jong: string,
  events: AstroLifecycleEvent[]
): string {
  const stagePiece = twelveStage
    ? `Your day pillar sits at the ${twelveStage} stage of the 12-phase cycle, so `
    : ''
  if (id === 'early') {
    return `${stagePiece}childhood is the first felt-sense of your grain. ${jong ? `Because you carry a ${jong}, that one-direction current shows up early.` : geokguk ? `Your ${geokguk} colour appears at school and home from the start.` : ''}`
  }
  if (id === 'young') {
    const sat = events.find((e) => e.kind === 'saturn_return_1')
    return `${stagePiece}young adulthood tests identity head-on. ${sat ? `The decisive rite arrives around age ${sat.ageStart} — the first Saturn return.` : 'Each daewoon stem flip adds a layer of self-verification.'}`
  }
  if (id === 'middle') {
    const ura = events.find((e) => e.kind === 'uranus_opposition')
    return `${stagePiece}middle adulthood is when paths that are not truly yours start to crack. ${ura ? `Ages ${ura.ageStart}–${ura.ageEnd}, the Uranus opposition, drives the loudest shaking.` : 'Daewoon shifts realign your social position.'}`
  }
  const chi = events.find((e) => e.kind === 'chiron_return')
  return `${stagePiece}later life harvests everything you've gathered. ${chi ? `The Chiron return at age ${chi.ageStart} converts old wounds into healing capacity.` : 'A second Saturn return finalises what you choose to leave behind.'}`
}

function guideKo(id: LifeStageId): string {
  if (id === 'early')
    return '한 줄 조언: 환경이 주는 결을 거부하지 말고 천천히 흡수하세요. 진짜 자기 색깔은 아직 다 드러나지 않아요.'
  if (id === 'young')
    return '한 줄 조언: 회피하지 말고 책임을 한 단계씩 받아들이세요. 30세 전후의 선택이 평생의 토대가 됩니다.'
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
