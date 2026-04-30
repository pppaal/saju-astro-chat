// @ts-nocheck
/**
 * 타로 해석이 사용자 질문 맥락에 맞게 작동하는지 직접 검증.
 * /api/tarot/interpret는 auth 필요 — 내부 fallback 함수를 직접 호출해서 테스트.
 *
 * 검증 항목:
 *  1) 사용자 질문 텍스트가 답변에 포함되거나 맥락이 반영됨
 *  2) 카드별 해석이 위치(position) + 카드 이름 + 질문 맥락을 cross함
 *  3) Mojibake (?? 패턴) 없음
 *  4) 자연스러운 한국어
 */
import { generateSimpleFallback } from '../src/app/api/tarot/interpret/routeSupport'

const CASES = [
  {
    label: '이직 결정',
    spreadTitle: '할까 말까',
    userQuestion: '이번에 이직해야 할까?',
    cards: [
      { name: 'The Fool', nameKo: '바보', isReversed: false, position: 'Yes', positionKo: '네 신호', keywords: ['새 시작', '도약'] },
      { name: 'The Tower', nameKo: '탑', isReversed: true, position: 'No', positionKo: '아니오 신호', keywords: ['격변', '리셋'] },
      { name: 'The Star', nameKo: '별', isReversed: false, position: 'Why', positionKo: '이유', keywords: ['희망', '방향'] },
    ],
  },
  {
    label: '관계 결혼',
    spreadTitle: '관계 크로스',
    userQuestion: '지금 만나고 있는 사람이랑 결혼해도 될까?',
    cards: [
      { name: 'The Lovers', nameKo: '연인', isReversed: false, position: 'Current', positionKo: '현재', keywords: ['선택', '결합'] },
      { name: 'The Empress', nameKo: '여황제', isReversed: false, position: 'Partner', positionKo: '상대', keywords: ['풍요', '돌봄'] },
      { name: 'The Hermit', nameKo: '은둔자', isReversed: true, position: 'Self', positionKo: '본인', keywords: ['고립', '내면'] },
      { name: 'The Sun', nameKo: '태양', isReversed: false, position: 'Outcome', positionKo: '결과', keywords: ['성공', '명료'] },
      { name: 'The World', nameKo: '세계', isReversed: false, position: 'Lesson', positionKo: '교훈', keywords: ['완성', '통합'] },
    ],
  },
  {
    label: '재정 투자',
    spreadTitle: '할까 말까',
    userQuestion: '주식 투자 시작해도 괜찮을까?',
    cards: [
      { name: 'The Magician', nameKo: '마법사', isReversed: false, position: 'Yes', positionKo: '네 신호', keywords: ['능력', '실현'] },
      { name: 'Five of Pentacles', nameKo: '펜타클 5', isReversed: false, position: 'No', positionKo: '아니오 신호', keywords: ['결핍', '주의'] },
      { name: 'The High Priestess', nameKo: '여사제', isReversed: false, position: 'Why', positionKo: '이유', keywords: ['직관', '신중'] },
    ],
  },
  {
    label: '시기 운',
    spreadTitle: '언제가 좋을까',
    userQuestion: '올해 안에 좋은 일 생길까?',
    cards: [
      { name: 'Wheel of Fortune', nameKo: '운명의 수레바퀴', isReversed: false, position: 'Now', positionKo: '지금', keywords: ['변화', '전환'] },
      { name: 'Three of Cups', nameKo: '컵 3', isReversed: false, position: 'Soon', positionKo: '가까운 미래', keywords: ['축하', '연결'] },
      { name: 'The Sun', nameKo: '태양', isReversed: false, position: 'Mid', positionKo: '중기', keywords: ['성공', '명료'] },
      { name: 'Ten of Pentacles', nameKo: '펜타클 10', isReversed: false, position: 'End', positionKo: '결실', keywords: ['풍요', '안정'] },
    ],
  },
]

function check(text: string, mustHave: string[], label: string): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []
  // 1) Mojibake 검사
  if (/\? *\? *\?/.test(text)) {
    reasons.push('mojibake (?? 패턴) 발견')
  }
  // 2) 키워드 적어도 1개는 들어가야 함
  const hits = mustHave.filter((kw) => text.includes(kw))
  if (hits.length === 0) {
    reasons.push(`질문 키워드 ${mustHave.join('/')} 미반영`)
  }
  // 3) 빈 텍스트
  if (!text.trim()) {
    reasons.push('빈 출력')
  }
  return { passed: reasons.length === 0, reasons }
}

async function main() {
  console.log('━━━ 타로 해석 — 질문 맥락 반영 검증 ━━━\n')
  let totalPass = 0
  let totalFail = 0
  for (const c of CASES) {
    console.log(`▶ ${c.label}: "${c.userQuestion}"`)
    console.log(`  스프레드: ${c.spreadTitle} (${c.cards.length}장)`)
    const result = generateSimpleFallback(c.cards, c.spreadTitle, 'ko', c.userQuestion)
    console.log()
    console.log('  [overall]')
    console.log('  ' + (result.overall_message || '(없음)').slice(0, 220))
    console.log()
    console.log('  [cards]')
    for (const ci of result.card_insights || []) {
      console.log(`  - ${ci.card_name}${ci.is_reversed ? '(역)' : ''} @ ${ci.position}: ${(ci.interpretation || '').slice(0, 140)}`)
    }
    console.log()
    console.log('  [advice]')
    console.log('  ' + (result.guidance || '').slice(0, 200))
    console.log()
    // 검증 — 질문 키워드 감지
    const fullText = JSON.stringify(result)
    const mustHave = c.label === '이직 결정' ? ['이직', '직장', '커리어']
      : c.label === '관계 결혼' ? ['결혼', '관계', '파트너', '상대']
      : c.label === '재정 투자' ? ['투자', '주식', '재정', '돈']
      : ['올해', '시기', '타이밍']
    const r = check(fullText, mustHave, c.label)
    if (r.passed) {
      console.log('  ✓ 통과')
      totalPass++
    } else {
      console.log('  ✗ 실패: ' + r.reasons.join(' / '))
      totalFail++
    }
    console.log()
    console.log('─'.repeat(60))
    console.log()
  }
  console.log(`━━━ ${totalPass}/${CASES.length} 통과 ━━━`)
  process.exit(totalFail > 0 ? 1 : 0)
}

main()
