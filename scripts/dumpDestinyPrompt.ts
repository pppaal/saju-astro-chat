/**
 * Dump the destiny counselor (/api/counselor/realtime) prompt for a
 * single person, mirroring how route.ts builds it.
 *
 * Run: npx tsx scripts/dumpDestinyPrompt.ts
 *
 * Astro is calculated via swisseph; in dev environments without the
 * native binding the astro half will fail and only the saju half
 * appears (same caveat as dumpCompatPrompt.ts).
 */

import { buildSajuNormalizerInput } from '../src/lib/fortune/cross-rules/adapters/saju'
import {
  formatSajuAsTable,
  formatDestinyTiming,
  formatDestinyAstro,
} from '../src/lib/compatibility/sajuTableFormatter'

const birth = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  calendarType: 'solar' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
  astroTimezone: 'Asia/Seoul',
}

const SYSTEM_PROMPT_KO = `[Birth Snapshot] 의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다.

규칙:
- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.
- snapshot에 birthTimeUnknown=true면 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true면 위치 의존 결론 금지.
- caution 신호가 명시되면 비가역 행동(서명·확정·결제·이별 통보)을 즉시 권하지 않는다.
- AI/모델/상담사 정체 노출 금지.`

const userQuestion = '올해 흐름 어때?'

async function main() {
  // Saju only — astro requires swisseph which isn't bundled in this
  // dev environment. The production route runs the same saju + the
  // missing astro half via runFortuneWithRaw.
  const saju = buildSajuNormalizerInput({
    birthDate: birth.birthDate,
    birthTime: birth.birthTime,
    gender: birth.gender,
    calendarType: birth.calendarType,
    timezone: birth.timezone,
    queryDate: new Date(),
  })
  void formatDestinyAstro

  const parts: string[] = ['[Birth Snapshot]']
  parts.push('')
  parts.push(formatSajuAsTable(saju.saju, '나'))
  const timingBlock = formatDestinyTiming(saju)
  if (timingBlock) {
    parts.push('')
    parts.push(timingBlock)
  }
  parts.push('')
  parts.push('== 점성 == (dev: swisseph 부재로 생략, production에선 formatDestinyAstro 출력)')
  const cachedUserContext = parts.join('\n')

  const userPrompt = `이전 대화:\n(none)\n\n위 birth snapshot을 바탕으로 마지막 질문에 답하세요.\n\n질문: ${userQuestion}`

  console.log('================================================================')
  console.log('SYSTEM PROMPT')
  console.log('================================================================')
  console.log(SYSTEM_PROMPT_KO)
  console.log()
  console.log('================================================================')
  console.log('CACHED USER CONTEXT')
  console.log('================================================================')
  console.log(cachedUserContext)
  console.log()
  console.log('================================================================')
  console.log('USER PROMPT')
  console.log('================================================================')
  console.log(userPrompt)
  console.log()
  console.log('================================================================')
  console.log('STATS')
  console.log('================================================================')
  console.log(`system    : ${SYSTEM_PROMPT_KO.length} chars`)
  console.log(`cached    : ${cachedUserContext.length} chars`)
  console.log(`userPrompt: ${userPrompt.length} chars`)
  console.log(`TOTAL     : ${SYSTEM_PROMPT_KO.length + cachedUserContext.length + userPrompt.length} chars`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
