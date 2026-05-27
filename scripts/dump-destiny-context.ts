/**
 * 운명상담사 cachedUserContext + daily prefix 덤프 — LLM 한테 실제로 가는
 * 모든 블록을 그대로 출력. 궁합 dump-compat-context.ts 의 destiny 버전.
 *
 *   현우: 1995-02-09 06:40 男 서울
 *
 * 실행: npx tsx scripts/dump-destiny-context.ts
 */

import { buildSajuNormalizerInput } from '../src/lib/fusion/adapters/saju'
import { buildDestinyContext } from '../src/lib/destiny/counselorContext'
import { getNowInTimezone } from '../src/lib/datetime'

const SEOUL = { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' }

const PERSON = {
  name: '현우',
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  birthTimeUnknown: false,
  birthCityUnknown: false,
  ...SEOUL,
}

async function main() {
  // route 의 흐름과 동일: raw saju 엔진 호출 X. buildSajuNormalizerInput
  // 이 currentSeun/Wolun/Iljin 채워 넣어줘야 ## 타이밍 에 세운/월운/일진
  // 라인이 노출됨 (현재 dump 가 raw 엔진을 직접 부르면 모두 undefined).
  // queryDate 는 route 와 동일하게 유저 TZ 로컬 컴포넌트로 — 서버 UTC vs
  // 유저 KST 어긋남 방지.
  const localNow = getNowInTimezone(SEOUL.timezone)
  const queryDate = new Date(localNow.year, localNow.month - 1, localNow.day, 12, 0, 0)
  const saju = buildSajuNormalizerInput({
    birthDate: PERSON.birthDate,
    birthTime: PERSON.birthTime,
    gender: PERSON.gender,
    timezone: SEOUL.timezone,
    queryDate,
    latitude: SEOUL.latitude,
    longitude: SEOUL.longitude,
  })

  const sn = saju as unknown as {
    currentSeun?: { heavenlyStem?: string; earthlyBranch?: string } | null
    currentWolun?: { heavenlyStem?: string; earthlyBranch?: string } | null
    currentIljin?: { heavenlyStem?: string; earthlyBranch?: string } | null
    unseRelations?: Array<{
      source: string
      relation: { kind: string; detail?: string; pillars?: string[] }
    }>
  }
  const un = (u?: { heavenlyStem?: string; earthlyBranch?: string } | null) =>
    u ? { stem: u.heavenlyStem ?? '', branch: u.earthlyBranch ?? '' } : null

  // 2) destiny context (stable + daily) — queryDate 는 위 buildSaju 에 사용한 동일 객체.
  const split = await buildDestinyContext(
    {
      birthDate: PERSON.birthDate,
      birthTime: PERSON.birthTime,
      gender: PERSON.gender,
      timezone: SEOUL.timezone,
      latitude: SEOUL.latitude,
      longitude: SEOUL.longitude,
      birthTimeUnknown: PERSON.birthTimeUnknown,
      birthCityUnknown: PERSON.birthCityUnknown,
    },
    queryDate,
    'ko',
    {
      seun: un(sn.currentSeun),
      wolun: un(sn.currentWolun),
      iljin: un(sn.currentIljin),
      relations: sn.unseRelations,
    },
    SEOUL.timezone
  )

  // 3) route.ts:330-342 의 [Birth Snapshot] + [Meta] 헤더 재현
  const parts: string[] = ['[Birth Snapshot]']
  const locTag = PERSON.birthCityUnknown
    ? '미상'
    : `${PERSON.latitude.toFixed(4)},${PERSON.longitude.toFixed(4)}`
  const timeTag = PERSON.birthTimeUnknown ? '미상' : PERSON.birthTime
  parts.push(
    `[Meta] birthDate: ${PERSON.birthDate} | birthTime: ${timeTag} | location: ${locTag} | timezone: ${SEOUL.timezone} | birthTimeUnknown: ${PERSON.birthTimeUnknown ? 'true' : 'false'} | birthCityUnknown: ${PERSON.birthCityUnknown ? 'true' : 'false'}`
  )

  const stableContext = `<birth_data>\n${parts.join('\n')}${split.stable ? `\n\n${split.stable}` : ''}\n</birth_data>`
  const dailyContext = split.daily

  console.log('======== STABLE (cachedUserContext, 30d cache) ========')
  console.log(stableContext)
  console.log('\n\n======== DAILY (userPrompt prefix, 1d cache) ========')
  console.log(dailyContext)

  console.log('\n\n=== 통계 ===')
  console.log(`STABLE chars: ${stableContext.length} / lines: ${stableContext.split('\n').length}`)
  console.log(`DAILY  chars: ${dailyContext.length} / lines: ${dailyContext.split('\n').length}`)
  console.log(`합계 chars: ${stableContext.length + dailyContext.length}`)
}

main().catch((e) => {
  console.error('실행 실패:', e)
  process.exit(1)
})
