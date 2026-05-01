/**
 * LLM 출력 검증 스크립트.
 *
 * 사용법:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/probe-llm-output.ts
 *
 * 출력:
 *   - calendar polish 한 사람 1일 (실제 Claude 호출)
 *   - 길이 / 단락 수 / 톤 sample
 *
 * 키 없으면 친근한 fallback 출력 확인.
 */

import { polishCalendarDayNarrationKo } from '../src/lib/llm/calendarNarrativePolish'
import { isClaudeAvailable } from '../src/lib/llm/claude'

async function main() {
  const hasKey = isClaudeAvailable()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  LLM Output Verification')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`ANTHROPIC_API_KEY: ${hasKey ? '✓ 셋팅됨' : '✗ 없음 (fallback 모드)'}`)
  console.log()

  const input = {
    date: '2026-05-04',
    locale: 'ko' as const,
    natal: {
      dayMaster: '辛',
      dayMasterElement: '금',
      fiveElements: { wood: 1, fire: 2, earth: 2, metal: 2, water: 1 },
      geokguk: '정관격',
    },
    timing: {
      daeunGanji: '戊寅',
      daeunElement: '목',
      saeunYear: 2026,
      saeunElement: '금',
      wolunElement: '화',
      iljinElement: '수',
    },
    astro: {
      transits: ['saturn return', 'jupiter on natal MC'],
      activeAspects: ['Sun-Pluto opposition', 'Moon-Jupiter trine'],
      saturnHouse: 4,
      jupiterHouse: 10,
      sunSign: 'Cancer',
      moonSign: 'Scorpio',
      ascSign: 'Libra',
    },
    bestSlots: [
      {
        hour: '14시',
        reason: '집중력 정점',
        sajuSignals: ['일진 화 정점', '천을귀인 활성'],
        astroSignals: ['Venus on natal MC'],
        summary: '표현·발표가 매끄러운 자리',
      },
      {
        hour: '16시',
        reason: '협업 자리',
        sajuSignals: ['비겁 시기'],
        astroSignals: ['Mercury 6H'],
        summary: '동료 소통 자연스러움',
      },
    ],
    cautionSlots: [
      {
        hour: '11시',
        reason: '결정 보류',
        sajuSignals: ['지지충 활성'],
        astroSignals: ['Saturn square Sun'],
        summary: '큰 결정 한 박자 늦추기',
      },
    ],
    matrixCore: { phase: 'integration', focus: '커리어', risk: '과부하' },
    continuity: {
      yesterdayElement: '목',
      todayElement: '수',
      tomorrowElement: '화',
      flowChange: 'pivot' as const,
      narrative: '어제 시작·확장 결에서 오늘 직관·정서 결로 옮겨가는 자리예요.',
    },
    weekday: {
      label: '월',
      tone: '한 주 시작 톤. 큰 그림 잡고 우선순위 정하는 게 자연스러움',
      weekPosition: 'start' as const,
    },
  }

  const skeleton = '오늘 핵심: 정관격 + 점성 토성 4H · 좋은 시간: 14, 16 · 조심: 11'

  const t0 = Date.now()
  const output = await polishCalendarDayNarrationKo(input, skeleton)
  const elapsed = Date.now() - t0

  console.log(`출력 길이: ${output.length}자`)
  console.log(`소요 시간: ${elapsed}ms`)
  console.log(`단락 수: ${output.split('\n\n').length}`)
  console.log()
  console.log('━━━━━━━━ 출력 ━━━━━━━━')
  console.log(output)
  console.log('━━━━━━━━━━━━━━━━━━━━━━')

  if (!hasKey) {
    console.log()
    console.log('💡 ANTHROPIC_API_KEY를 셋팅하면 Claude polish가 적용된 자연스러운 4-5단락 출력을 볼 수 있어요.')
    console.log('   .env.local에 ANTHROPIC_API_KEY=sk-ant-... 추가 후 재실행.')
  }
}

main().catch((err) => {
  console.error('❌ 실행 실패:', err)
  process.exit(1)
})
