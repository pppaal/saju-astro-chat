// P0 검증 — v2 셀 하나로 yearlyDates 계약 전체를 뽑는 deriveDayInterpretation 이
// (1) 모든 필드를 채우는지(하나도 안 놓치는지) (2) valence 모순이 없는지 확인.
// route 에 안 물린 순수 함수라 프로덕션 영향 0.
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { deriveDayInterpretation } from '../src/app/api/calendar/lib/dayInterpretation'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const REQUIRED_FIELDS = [
  'date',
  'grade',
  'score',
  'categories',
  'titleKey',
  'descKey',
  'ganzhi',
  'crossVerified',
  'transitSunSign',
  'sajuFactorKeys',
  'astroFactorKeys',
  'recommendationKeys',
  // warningKeys 는 의도적으로 빌 수 있음(좋은 날+높은 교차합의 → 경고 없음)이라 제외
  'crossAgreementPercent',
  'crossCheck',
  'longCycleContext',
  'scoreBreakdown',
] as const

const NEGATIVE = ['제동을 걸어요', '한 박자', '흩트리는', '리스크부터 줄이', '미루세요', '약한 날']
const POSITIVE = ['힘을 실어줘요', '가벼워지는', '받쳐주는', '진도 빼기 좋', '밀어붙이기 좋']

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'string') return v.trim() === ''
  if (typeof v === 'object') return Object.keys(v as object).length === 0
  return false
}

async function main() {
  const saju = calculateSajuData(
    BIRTH.birthDate,
    BIRTH.birthTime,
    BIRTH.gender,
    'solar',
    BIRTH.timeZone
  )
  const natal = await buildNatalContext(BIRTH, { saju })
  const cells = await buildCalendar(
    natal,
    { start: '2026-01-01T00:00:00.000Z', end: '2026-12-31T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: true }
  )

  const interps = cells.map((cell) => deriveDayInterpretation({ cell, natal, lang: 'ko' }))

  // 1) 필드 커버리지 — 하나라도 비면 신고
  let missing = 0
  for (const d of interps) {
    for (const f of REQUIRED_FIELDS) {
      if (isEmpty((d as Record<string, unknown>)[f])) {
        missing++
        if (missing <= 10) console.log(`  ⚠️ ${d.date} 빈 필드: ${f}`)
      }
    }
  }
  // longCycleContext.iljin / scoreBreakdown 세부도 확인
  const noIljin = interps.filter((d) => !d.longCycleContext?.iljin?.ganji).length
  const noGanzhi = interps.filter((d) => !d.ganzhi).length

  // 2) valence 모순 — 그날 "verdict"(title/desc)만 검사. 요소(factors)는 신호별
  //    단서라 강등급일에도 소수극성이 정직하게 섞일 수 있음(예: 흉일에 대운 삼합격
  //    1줄) — 이는 모순이 아니라 nuance이므로 verdict 검사에서 제외.
  let contradictions = 0
  for (const d of interps) {
    const verdict = [d.titleKey, d.descKey].join(' │ ')
    if (d.grade <= 1 && NEGATIVE.some((p) => verdict.includes(p))) contradictions++
    if (d.grade >= 3 && POSITIVE.some((p) => verdict.includes(p))) contradictions++
  }

  const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const d of interps) dist[d.grade]++

  console.log('=== deriveDayInterpretation P0 검증 (2026, 365일) ===\n')
  console.log(`등급 분포(절대): 0=${dist[0]} 1=${dist[1]} 2=${dist[2]} 3=${dist[3]} 4=${dist[4]}`)
  console.log(
    `필드 커버리지: 빈 필드 ${missing}건 / iljin 없음 ${noIljin}일 / ganzhi 없음 ${noGanzhi}일`
  )
  console.log(`valence 모순: ${contradictions}건\n`)

  for (const [tag, pick] of [
    ['길일 샘플', interps.find((d) => d.grade <= 1)],
    ['보통 샘플', interps.find((d) => d.grade === 2)],
    ['흉일 샘플', interps.find((d) => d.grade >= 3)],
  ] as const) {
    if (!pick) continue
    console.log(`────── ${tag} ──────`)
    console.log(JSON.stringify(pick, null, 2))
    console.log()
  }
}

main().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
