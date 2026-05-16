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
  formatSajuExtras,
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
- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.
- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.
- snapshot에 birthTimeUnknown=true면 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true면 위치 의존 결론 금지.
- AI/모델/상담사 정체 노출 금지.`

const userQuestion = '올해 흐름 어때?'

async function main() {
  // Now swisseph rebuilt, run the real fortune pipeline.
  const { runFortuneWithRaw } = await import('../src/lib/fortune/cross-rules')
  const { saju, astro, birthTimeUnknown, birthCityUnknown } = await runFortuneWithRaw({
    birth,
    queryDate: new Date(),
  })

  const parts: string[] = ['[Birth Snapshot]']
  if (birthTimeUnknown) parts.push('# 시간 미상.')
  if (birthCityUnknown) parts.push('# 출생지 미상.')
  const ageYears = (saju as { ageYears?: number }).ageYears
  if (typeof ageYears === 'number' && Number.isFinite(ageYears)) {
    parts.push(`# 오늘 기준: 만 ${ageYears}세 (한국 ${ageYears + 1}세)`)
  }
  parts.push('')
  parts.push(formatSajuAsTable(saju.saju, '나'))
  const extrasBlock = formatSajuExtras({
    extras: (saju as { extras?: Parameters<typeof formatSajuExtras>[0]['extras'] }).extras,
    natalRelations: (saju as { natalRelations?: Parameters<typeof formatSajuExtras>[0]['natalRelations'] }).natalRelations,
  })
  if (extrasBlock) {
    parts.push('')
    parts.push(extrasBlock)
  }
  const timingBlock = formatDestinyTiming(saju)
  if (timingBlock) {
    parts.push('')
    parts.push(timingBlock)
  }
  parts.push('')
  parts.push(formatDestinyAstro(astro))
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
