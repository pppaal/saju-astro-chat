// 본명 차트 중복 계산 제거 검증
// preComputed 전달 vs 미전달 — 시간 측정
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'

async function main() {
  const input = {
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male' as const,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }

  // 1. preComputed 미전달 — 모든 걸 다시 계산
  console.log('▶ Case A: preComputed 미전달 (모두 새로 계산)')
  const tA0 = Date.now()
  await buildNatalContext(input)
  const tA = Date.now() - tA0
  console.log(`  소요: ${tA}ms\n`)

  // 2. 기존 엔진이 이미 계산한 결과를 시뮬레이션
  console.log('▶ Case B: pre-compute (기존 엔진 시뮬)')
  const tB0 = Date.now()
  const sajuResult = calculateSajuData(
    input.birthDate, input.birthTime, input.gender, 'solar', input.timeZone,
  )
  const natalChartData = await calculateNatalChart({
    year: 1993, month: 8, date: 15, hour: 14, minute: 30,
    latitude: input.latitude, longitude: input.longitude, timeZone: input.timeZone,
  })
  const natalChart = toChart(natalChartData)
  const tBprep = Date.now() - tB0
  console.log(`  기존 엔진이 본명 계산하는 데: ${tBprep}ms`)

  const tB1 = Date.now()
  await buildNatalContext(input, { saju: sajuResult, astroChart: natalChart })
  const tB = Date.now() - tB1
  console.log(`  + buildNatalContext (preComputed 전달): ${tB}ms`)
  console.log(`  Case B 합계: ${tBprep + tB}ms\n`)

  // 3. preComputed 미전달 (route.ts에서 직접 augmentation 했을 때)
  // 즉 본명을 2번 계산하는 시나리오
  console.log('▶ Case C: 중복 계산 (Case A + Case B 본명 다시)')
  console.log(`  기존 엔진 본명: ${tBprep}ms`)
  console.log(`  + augment에서 또 본명: ~${tA}ms`)
  console.log(`  합계 추정: ${tBprep + tA}ms\n`)

  console.log('=== 결론 ===')
  console.log(`  중복 계산 (refactor 전): 약 ${tBprep + tA}ms`)
  console.log(`  재사용 (refactor 후):    약 ${tBprep + tB}ms`)
  console.log(`  절감: ${tA - tB}ms (= Swiss Eph 본명 1회 호출 시간)`)
}

main().catch((err) => { console.error(err); process.exit(1) })
