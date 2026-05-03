// @ts-nocheck
/**
 * Demo: 사용자가 "그 사람이 나를 좋아하나요?" 물었을 때
 * 우리 엔진이 실제로 내놓는 답을 처음부터 끝까지 출력.
 */
import { generateSimpleFallback } from '../src/app/api/tarot/interpret/routeSupport'

const userQuestion = '그 사람이 나를 좋아하나요?'
const spreadTitle = '그 사람 마음'

// 실제 뽑은 것처럼 무작위성 있는 카드 3장 (crush-feelings 위치)
const cards = [
  {
    name: 'Two of Cups',
    nameKo: '컵 2',
    isReversed: false,
    position: 'Their Feelings',
    positionKo: '상대 마음',
    keywords: ['연결', '끌림', '교감'],
  },
  {
    name: 'Knight of Cups',
    nameKo: '컵 기사',
    isReversed: true,
    position: 'What They Want',
    positionKo: '원하는 것',
    keywords: ['망설임', '신중', '미숙한 표현'],
  },
  {
    name: 'The Star',
    nameKo: '별',
    isReversed: false,
    position: 'Possibility',
    positionKo: '가능성',
    keywords: ['희망', '가능성', '회복'],
  },
]

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`사용자 질문: "${userQuestion}"`)
console.log(`선택된 스프레드: ${spreadTitle} (${cards.length}장)`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

console.log('◾ 뽑힌 카드')
for (const c of cards) {
  console.log(`  ${c.positionKo} → ${c.nameKo}${c.isReversed ? '(역방향)' : '(정방향)'}`)
}
console.log()

const result = generateSimpleFallback(cards, spreadTitle, 'ko', userQuestion)

console.log('━━━ overall_message ━━━')
console.log(result.overall_message || '(없음)')
console.log()

console.log('━━━ 카드별 해석 ━━━')
for (const ci of result.card_insights || []) {
  console.log(`\n▸ ${ci.position} — ${ci.card_name}${ci.is_reversed ? ' (역)' : ''}`)
  console.log(`  ${ci.interpretation || '(없음)'}`)
}
console.log()

console.log('━━━ 행동 지침 (guidance) ━━━')
console.log(result.guidance || '(없음)')
console.log()

console.log('━━━ 오늘의 한마디 ━━━')
console.log(result.affirmation || '(없음)')
