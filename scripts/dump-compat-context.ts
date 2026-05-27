/**
 * 궁합 cachedUserContext 덤프 — LLM 한테 실제로 가는 모든 블록을 그대로 출력.
 *   A: 1995-02-09 06:40 男 서울
 *   B: 1991-02-03 00:35 女 서울
 * 실행: npx tsx scripts/dump-compat-context.ts
 */

import { calculateSajuData } from '../src/lib/saju/saju'
import { formatSajuSynastry } from '../src/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '../src/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '../src/lib/compatibility/compositeChartFormatter'
import { calculateNatalChart, toChart } from '../src/lib/astrology/foundation/astrologyService'

const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

const PERSON_A = {
  name: '현우',
  date: '1995-02-09',
  time: '06:40',
  gender: 'male' as const,
  ...SEOUL,
}
const PERSON_B = {
  name: '서연',
  date: '1991-02-03',
  time: '00:35',
  gender: 'female' as const,
  ...SEOUL,
}

const PERSONAL_SHINSAL_KEEP: Record<string, string> = {
  도화: '매력·이성 끌림',
  홍염살: '색기·끌림(외도 주의)',
  백호: '강렬·격정',
  괴강: '강한 카리스마·고집',
  양인: '날카로움·과격',
  귀문관: '집착·예민',
  원진: '미묘한 반감',
  고신: '고독 기질',
  금여성: '배우자 복·기품',
  천덕귀인: '보호·덕',
  월덕귀인: '보호·덕',
}
const PILLAR_KO: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }

function formatPersonalShinsal(label: string, shinsal: unknown): string | null {
  if (!Array.isArray(shinsal) || shinsal.length === 0) return null
  const byKind = new Map<string, Set<string>>()
  for (const raw of shinsal) {
    const h = raw as { kind?: string; pillars?: string[] }
    if (!h?.kind || !(h.kind in PERSONAL_SHINSAL_KEEP)) continue
    const set = byKind.get(h.kind) ?? new Set<string>()
    for (const p of h.pillars ?? []) set.add(PILLAR_KO[p] ?? p)
    byKind.set(h.kind, set)
  }
  if (byKind.size === 0) return null
  const parts = [...byKind.entries()].map(([kind, ps]) => {
    const loc = [...ps].join('·')
    return `${kind}(${loc ? `${loc}, ` : ''}${PERSONAL_SHINSAL_KEEP[kind]})`
  })
  return `${label}: ${parts.join(' · ')}`
}

async function main() {
  // 1) Saju
  const sajuA = calculateSajuData(PERSON_A.date, PERSON_A.time, PERSON_A.gender, 'solar', SEOUL.timeZone)
  const sajuB = calculateSajuData(PERSON_B.date, PERSON_B.time, PERSON_B.gender, 'solar', SEOUL.timeZone)

  const toPair = (p: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }) => ({
    stem: p?.heavenlyStem?.name ?? '',
    branch: p?.earthlyBranch?.name ?? '',
  })

  const pillarsA = [
    toPair(sajuA.yearPillar),
    toPair(sajuA.monthPillar),
    toPair(sajuA.dayPillar),
    toPair(sajuA.timePillar),
  ]
  const pillarsB = [
    toPair(sajuB.yearPillar),
    toPair(sajuB.monthPillar),
    toPair(sajuB.dayPillar),
    toPair(sajuB.timePillar),
  ]

  const daeunCurrentA = sajuA.daeWoon?.current
  const daeunCurrentB = sajuB.daeWoon?.current

  const sajuSynastryBlock = formatSajuSynastry({
    pillarsA,
    pillarsB,
    currentDaeunA: daeunCurrentA
      ? { stem: daeunCurrentA.heavenlyStem, branch: daeunCurrentA.earthlyBranch, age: daeunCurrentA.age }
      : null,
    currentDaeunB: daeunCurrentB
      ? { stem: daeunCurrentB.heavenlyStem, branch: daeunCurrentB.earthlyBranch, age: daeunCurrentB.age }
      : null,
    nameA: PERSON_A.name,
    nameB: PERSON_B.name,
  })

  // 2) Astro
  const [Y1, M1, D1] = PERSON_A.date.split('-').map(Number)
  const [h1, mi1] = PERSON_A.time.split(':').map(Number)
  const [Y2, M2, D2] = PERSON_B.date.split('-').map(Number)
  const [h2, mi2] = PERSON_B.time.split(':').map(Number)
  const [natalA, natalB] = await Promise.all([
    calculateNatalChart({
      year: Y1, month: M1, date: D1, hour: h1, minute: mi1,
      latitude: SEOUL.latitude, longitude: SEOUL.longitude, timeZone: SEOUL.timeZone,
    }),
    calculateNatalChart({
      year: Y2, month: M2, date: D2, hour: h2, minute: mi2,
      latitude: SEOUL.latitude, longitude: SEOUL.longitude, timeZone: SEOUL.timeZone,
    }),
  ])
  const chartA = toChart(natalA)
  const chartB = toChart(natalB)

  const astroSynastryBlock = formatAstroSynastry({
    chartA, chartB,
    latA: SEOUL.latitude, lonA: SEOUL.longitude,
    latB: SEOUL.latitude, lonB: SEOUL.longitude,
    nameA: PERSON_A.name, nameB: PERSON_B.name,
  })
  const compositeChartBlock = formatCompositeChart({ chartA, chartB, nameA: PERSON_A.name, nameB: PERSON_B.name })

  // 3) Personal info + Meta + Shinsal
  const ageOf = (d: string) => {
    const [yy] = d.split('-').map(Number)
    return new Date().getFullYear() - yy
  }
  const personsInfo = [
    `A (${PERSON_A.name}): ${PERSON_A.date} ${PERSON_A.time} (만 ${ageOf(PERSON_A.date)}세)`,
    `B (${PERSON_B.name}): ${PERSON_B.date} ${PERSON_B.time} (만 ${ageOf(PERSON_B.date)}세) - 연인`,
  ].join('\n')
  const metaBlock = [
    `[Meta] A: timeUnknown=false, cityUnknown=false`,
    `[Meta] B: timeUnknown=false, cityUnknown=false`,
  ].join('\n')
  const personalShinsalLines = [
    formatPersonalShinsal(`A(${PERSON_A.name})`, (sajuA as { extras?: { shinsal?: unknown } }).extras?.shinsal),
    formatPersonalShinsal(`B(${PERSON_B.name})`, (sajuB as { extras?: { shinsal?: unknown } }).extras?.shinsal),
  ].filter(Boolean)
  const personalShinsalBlock = personalShinsalLines.length
    ? `[개별 신살 (self)]\n${personalShinsalLines.join('\n')}`
    : ''

  // 4) Assemble like route.ts
  const cachedUserContext = [
    '# 호출자(질문자): 현우 — 한국어로 답할 때 \'현우님\'으로 호명',
    '== 참여자 정보 ==',
    personsInfo,
    metaBlock,
    personalShinsalBlock,
    sajuSynastryBlock,
    astroSynastryBlock,
    compositeChartBlock,
  ]
    .filter(Boolean)
    .join('\n')

  console.log(cachedUserContext)
  console.log('\n\n=== 통계 ===')
  console.log(`총 chars: ${cachedUserContext.length}`)
  console.log(`총 lines: ${cachedUserContext.split('\n').length}`)
}

main().catch((e) => {
  console.error('실행 실패:', e)
  process.exit(1)
})
