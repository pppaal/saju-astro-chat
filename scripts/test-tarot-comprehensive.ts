import { recommendSpreads } from '../src/lib/Tarot/tarot-recommend';

// 실제 사람들이 물어볼 법한 다양한 질문들
const testCases = [
  // 연애/결혼
  "그 사람이 나 좋아해?",
  "그사람 마음이 어때요?",
  "썸남이 나한테 관심 있을까?",
  "남자친구랑 결혼해도 될까?",
  "결혼 언제 할 수 있을까요?",
  "이혼해야 할까요?",
  "헤어진 남친이 돌아올까?",
  "전여친이 나를 아직 좋아할까?",
  "새로운 연애 언제 시작될까?",
  "애인이 바람피는 거 아닐까?",

  // 취업/커리어
  "취업 언제 할 수 있을까요?",
  "이번 면접 붙을까요?",
  "공무원 시험 합격할 수 있을까?",
  "이직해도 될까요?",
  "회사 그만둬도 될까?",
  "승진 가능할까요?",
  "사업 시작해도 될까?",
  "창업 성공할 수 있을까?",

  // 재정/투자
  "주식 사도 될까요?",
  "비트코인 투자해도 될까?",
  "돈 언제 들어올까요?",
  "이번 달 재물운 어때요?",
  "부동산 투자 괜찮을까?",

  // 일상/선택
  "오늘 운세 어때요?",
  "이번 주 운세",
  "A회사 vs B회사 어디로?",
  "이 컴퓨터 살까요?",
  "이사해도 될까요?",
  "여행 가도 될까?",

  // 건강/멘탈
  "요즘 너무 우울해요",
  "스트레스가 너무 심해요",
  "건강 괜찮을까요?",

  // 기타
  "나는 누구일까?",
  "앞으로 어떻게 살아야 할까?",
  "운명의 상대 언제 만날까?",
];

console.log('========================================================================');
console.log('              AI 타로 키워드 매칭 종합 테스트                           ');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;
const issues: string[] = [];

testCases.forEach((question, idx) => {
  const result = recommendSpreads(question, 1);
  const spread = result[0];

  if (!spread) {
    console.log('X [' + (idx + 1) + '] "' + question + '"');
    console.log('   -> 매칭 실패!\n');
    failCount++;
    issues.push('"' + question + '" - 매칭 실패');
    return;
  }

  const title = spread.spread.titleKo || spread.spread.title;
  const theme = spread.theme.categoryKo || spread.theme.category;
  const cardCount = spread.spread.cardCount;
  const positions = spread.spread.positions.map(p => p.titleKo || p.title).join(', ');

  // 매칭 적절성 평가
  let isAppropriate = true;
  let reason = '';

  // 연애 질문인데 연애 테마가 아닌 경우
  if ((question.includes('좋아') || question.includes('마음') || question.includes('썸') ||
       question.includes('연애') || question.includes('결혼') || question.includes('헤어') ||
       question.includes('전여친') || question.includes('전남친') || question.includes('애인')) &&
      !theme.includes('연애') && !theme.includes('Love')) {
    isAppropriate = false;
    reason = '연애 관련 질문인데 연애 테마 아님';
  }

  // 취업/직장 질문인데 커리어 테마가 아닌 경우
  if ((question.includes('취업') || question.includes('면접') || question.includes('이직') ||
       question.includes('승진') || question.includes('회사') || question.includes('사업') ||
       question.includes('창업') || question.includes('시험') || question.includes('합격')) &&
      !theme.includes('직장') && !theme.includes('Career')) {
    isAppropriate = false;
    reason = '커리어 관련 질문인데 커리어 테마 아님';
  }

  // 재정 질문인데 재물 테마가 아닌 경우
  if ((question.includes('주식') || question.includes('투자') || question.includes('코인') ||
       question.includes('비트') || question.includes('부동산') || question.includes('재물')) &&
      !theme.includes('재물') && !theme.includes('Money') && !theme.includes('Finance')) {
    isAppropriate = false;
    reason = '재정 관련 질문인데 재물 테마 아님';
  }

  // 오늘/주간 운세인데 일일 테마가 아닌 경우
  if ((question.includes('오늘') || question.includes('이번 주') || question.includes('이번주')) &&
      !theme.includes('운세') && !theme.includes('daily') && !theme.includes('Daily')) {
    isAppropriate = false;
    reason = '일일/주간 질문인데 해당 테마 아님';
  }

  // 건강/멘탈 질문
  if ((question.includes('우울') || question.includes('스트레스') || question.includes('건강')) &&
      !theme.includes('건강') && !theme.includes('Health') && !theme.includes('Well')) {
    isAppropriate = false;
    reason = '건강/멘탈 질문인데 건강 테마 아님';
  }

  const icon = isAppropriate ? 'O' : '!';
  if (isAppropriate) {
    passCount++;
  } else {
    failCount++;
    issues.push('"' + question + '" -> ' + title + ' (' + reason + ')');
  }

  console.log(icon + ' [' + (idx + 1) + '] "' + question + '"');
  console.log('   -> ' + title + ' (' + theme + ')');
  console.log('   -> ' + cardCount + '장: [' + positions + ']');
  if (!isAppropriate) {
    console.log('   !! ' + reason);
  }
  console.log('');
});

console.log('========================================================================');
console.log('\n결과 요약: ' + passCount + '/' + testCases.length + ' 적절 (' + Math.round(passCount/testCases.length*100) + '%)');
console.log('   O 적절: ' + passCount + '개');
console.log('   ! 개선 필요: ' + failCount + '개');

if (issues.length > 0) {
  console.log('\n!! 개선이 필요한 케이스:');
  issues.forEach(issue => console.log('   - ' + issue));
}
