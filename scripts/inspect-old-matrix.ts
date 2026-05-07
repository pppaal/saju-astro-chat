/**
 * 기존 destiny-matrix 엔진 실제 출력 검증.
 * 사주+점성을 받아서 1206 셀 매트릭스 계산해서 보여줌.
 */
import { runMainSaju } from '../src/lib/saju-engine'
import { runAstroEngine } from '../src/lib/astro-engine'
import { calculateDestinyMatrix } from '../src/lib/destiny-matrix/engine'

async function main() {
  const saju = runMainSaju({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    timezone: 'Asia/Seoul',
  })
  const astro = await runAstroEngine({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  })

  // 기존 destiny-matrix 가 받는 input 형태로 변환
  const input = {
    dayMasterElement: saju.pillars.day.element,
    pillarElements: [
      saju.pillars.year.stem, saju.pillars.month.stem, saju.pillars.day.stem, saju.pillars.time.stem,
    ].map((s) => {
      const m: Record<string, string> = {
        甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
        庚: '금', 辛: '금', 壬: '수', 癸: '수',
      }
      return m[s] || '토'
    }),
    sibsinDistribution: {},
    twelveStages: {},
    relations: [],
    planetHouses: Object.fromEntries(
      astro.natal.planets.map((p) => [p.name, p.house])
    ),
    planetSigns: Object.fromEntries(
      astro.natal.planets.map((p) => [p.name, p.sign])
    ),
    aspects: astro.natalAspects.map((a) => ({
      planet1: a.from.name,
      planet2: a.to.name,
      type: a.type,
    })),
  }

  console.log('=== 기존 destiny-matrix 엔진 호출 시도 ===')
  try {
    const result = calculateDestinyMatrix(input as never)
    console.log('성공!')
    console.log('Summary:', JSON.stringify(result.summary, null, 2))
    console.log('Highlights:', JSON.stringify(result.highlights, null, 2).slice(0, 800))
    if (result.synergies) console.log(`Synergies: ${result.synergies.length}건`)
    console.log('총 cells:', Object.keys(result).length)
  } catch (err) {
    console.error('실패:', err instanceof Error ? err.message : err)
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
