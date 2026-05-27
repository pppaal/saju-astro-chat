/**
 * 두 페어링을 실제 엔진으로 돌려 비교 — LLM 한테 가는 그대로의 데이터.
 *   M:  1995-02-09 06:40 男 서울 (현우)
 *   W1: 1991-02-03 00:35 女 서울 (서연)
 *   W2: 1995-04-22 09:51 女 서울 (지원)
 *   페어링 1: M × W1
 *   페어링 2: M × W2
 * 실행: npx tsx scripts/compare-compat.ts
 */

import { calculateSajuData } from '../src/lib/saju/saju'
import { formatSajuSynastry } from '../src/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '../src/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '../src/lib/compatibility/compositeChartFormatter'
import { calculateNatalChart, toChart } from '../src/lib/astrology/foundation/astrologyService'

const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

const M = { name: '현우', date: '1995-02-09', time: '06:40', gender: 'male' as const, ...SEOUL }
const W1 = { name: '서연', date: '1991-02-03', time: '00:35', gender: 'female' as const, ...SEOUL }
const W2 = { name: '지원', date: '1995-04-22', time: '09:51', gender: 'female' as const, ...SEOUL }

type Person = typeof M

async function buildContextForPair(a: Person, b: Person, label: string): Promise<string> {
  // Saju
  const sajuA = calculateSajuData(a.date, a.time, a.gender, 'solar', SEOUL.timeZone)
  const sajuB = calculateSajuData(b.date, b.time, b.gender, 'solar', SEOUL.timeZone)
  const toPair = (p: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }) => ({
    stem: p?.heavenlyStem?.name ?? '',
    branch: p?.earthlyBranch?.name ?? '',
  })
  const pillarsA = [toPair(sajuA.yearPillar), toPair(sajuA.monthPillar), toPair(sajuA.dayPillar), toPair(sajuA.timePillar)]
  const pillarsB = [toPair(sajuB.yearPillar), toPair(sajuB.monthPillar), toPair(sajuB.dayPillar), toPair(sajuB.timePillar)]
  const dA = sajuA.daeWoon?.current
  const dB = sajuB.daeWoon?.current
  const sajuSynastryBlock = formatSajuSynastry({
    pillarsA,
    pillarsB,
    currentDaeunA: dA ? { stem: dA.heavenlyStem, branch: dA.earthlyBranch, age: dA.age } : null,
    currentDaeunB: dB ? { stem: dB.heavenlyStem, branch: dB.earthlyBranch, age: dB.age } : null,
    nameA: a.name,
    nameB: b.name,
  })

  // Astro
  const [Ya, Ma, Da] = a.date.split('-').map(Number)
  const [ha, mia] = a.time.split(':').map(Number)
  const [Yb, Mb, Db] = b.date.split('-').map(Number)
  const [hb, mib] = b.time.split(':').map(Number)
  const [natalA, natalB] = await Promise.all([
    calculateNatalChart({ year: Ya, month: Ma, date: Da, hour: ha, minute: mia, latitude: SEOUL.latitude, longitude: SEOUL.longitude, timeZone: SEOUL.timeZone }),
    calculateNatalChart({ year: Yb, month: Mb, date: Db, hour: hb, minute: mib, latitude: SEOUL.latitude, longitude: SEOUL.longitude, timeZone: SEOUL.timeZone }),
  ])
  const chartA = toChart(natalA)
  const chartB = toChart(natalB)
  const astroSynastryBlock = formatAstroSynastry({
    chartA, chartB,
    latA: SEOUL.latitude, lonA: SEOUL.longitude,
    latB: SEOUL.latitude, lonB: SEOUL.longitude,
    nameA: a.name, nameB: b.name,
  })
  const compositeChartBlock = formatCompositeChart({ chartA, chartB, nameA: a.name, nameB: b.name })

  const ageOf = (d: string) => new Date().getFullYear() - Number(d.split('-')[0])
  const personsInfo = [
    `A (${a.name}): ${a.date} ${a.time} (만 ${ageOf(a.date)}세)`,
    `B (${b.name}): ${b.date} ${b.time} (만 ${ageOf(b.date)}세) - 연인`,
  ].join('\n')

  return [
    `\n\n${'='.repeat(80)}\n[페어링: ${label}]\n${'='.repeat(80)}`,
    '== 참여자 정보 ==',
    personsInfo,
    sajuSynastryBlock,
    astroSynastryBlock,
    compositeChartBlock,
  ].filter(Boolean).join('\n')
}

async function main() {
  const ctx1 = await buildContextForPair(M, W1, `${M.name} × ${W1.name} (남 31세 × 여 35세)`)
  const ctx2 = await buildContextForPair(M, W2, `${M.name} × ${W2.name} (남 31세 × 여 31세)`)
  console.log(ctx1)
  console.log(ctx2)
}

main().catch((e) => {
  console.error('실행 실패:', e)
  process.exit(1)
})
