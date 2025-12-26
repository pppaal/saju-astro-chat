import { recommendSpreads } from '../src/lib/Tarot/tarot-recommend';

// 엣지 케이스: 이상한 질문, 애매한 질문, 극단적 질문 등
const edgeCases = [
  // ===== 극단적/위험한 질문 =====
  "자살할까?",
  "죽고 싶어요",
  "살기 싫어",
  "다 끝내고 싶어",

  // ===== 이상한/재미있는 질문 =====
  "개한테 키스할까?",
  "라면 먹을까 밥 먹을까?",
  "머리 염색할까?",
  "문신해도 될까?",
  "술 마셔도 될까?",
  "복권 사도 될까?",
  "게임해도 될까?",
  "유튜브 볼까?",

  // ===== 모호한 질문 =====
  "어떡해",
  "뭐하지",
  "심심해",
  "궁금해",
  "알려줘",
  "그냥",
  "ㅋㅋㅋ",
  "...",

  // ===== 영어 질문 =====
  "Will I be rich?",
  "Does he love me?",
  "Should I quit my job?",
  "What's my future?",

  // ===== 특수한 상황 =====
  "로또 당첨될까?",
  "부자 될 수 있을까?",
  "유명해질 수 있을까?",
  "해외 이민 갈까?",
  "유학 가도 될까?",
  "군대 언제 가?",
  "전역 언제?",

  // ===== 관계 특수 케이스 =====
  "불륜해도 될까?",
  "바람펴도 될까?",
  "거짓말해도 될까?",
  "친구랑 싸웠어",
  "부모님이 싫어요",
  "동생이 짜증나",

  // ===== 구체적 물건/행동 =====
  "아이폰 살까 갤럭시 살까?",
  "테슬라 주식 살까?",
  "비트코인 지금 살까?",
  "집 살까 전세 살까?",
  "차 바꿀까?",

  // ===== 매우 짧은 질문 =====
  "연애",
  "돈",
  "취업",
  "건강",
  "운세",

  // ===== 매우 긴 질문 =====
  "저는 지금 회사에서 3년째 일하고 있는데 상사가 너무 힘들게 하고 월급도 적고 야근도 많아서 이직을 생각하고 있는데 다른 회사에서 면접 제안이 왔거든요 근데 지금 회사가 안정적이긴 해서 고민이에요 어떻게 해야 할까요?",

  // ===== 감정 표현 =====
  "너무 행복해요",
  "짜증나",
  "화나",
  "슬퍼",
  "외로워",
  "무서워",

  // ===== 시간 관련 =====
  "내년 운세",
  "다음 달 운세",
  "올해 남은 기간",
  "10년 후 나는?",
];

console.log('========================================================================');
console.log('         AI 타로 엣지 케이스 테스트 (이상한 질문들)                      ');
console.log('========================================================================\n');

const categories = {
  dangerous: [] as string[],
  funny: [] as string[],
  vague: [] as string[],
  english: [] as string[],
  special: [] as string[],
  relationship: [] as string[],
  shopping: [] as string[],
  short: [] as string[],
  emotion: [] as string[],
  time: [] as string[],
};

edgeCases.forEach((question, idx) => {
  const result = recommendSpreads(question, 1);
  const spread = result[0];

  const title = spread?.spread?.titleKo || spread?.spread?.title || '매칭 없음';
  const theme = spread?.theme?.categoryKo || spread?.theme?.category || '없음';
  const cardCount = spread?.spread?.cardCount || 0;

  console.log('[' + (idx + 1) + '] "' + question + '"');
  console.log('    -> ' + title + ' (' + theme + ') - ' + cardCount + '장');
  console.log('');
});

console.log('========================================================================');
console.log('\n분석 결과:');
console.log('- 모든 질문에 대해 스프레드가 매칭되었는지 확인');
console.log('- 위험한 질문(자살 등)에 대한 특별 처리 필요 여부 검토');
console.log('- 너무 모호한 질문에 대한 기본 스프레드 적절성 확인');
