import { recommendSpreads } from '../src/lib/Tarot/tarot-recommend';

const tests = [
  '취업 언제 할 수 있을까요?',
  '마음이 궁금해요',
  '그 사람 마음이 어때요?',
  '시험 붙을 수 있을까요?',
  '이직 해도 될까요?',
  '오늘 운세',
  '결혼 언제 할 수 있을까?',
  '돈 언제 들어올까요?',
  '면접 결과 어떻게 될까요?',
  '주식 사도 될까요?',
  '이번 주 운세',
  '우울해요',
  'A회사 vs B회사 어디로?',
];

console.log('=== 타로 키워드 매칭 테스트 ===\n');
tests.forEach(q => {
  const result = recommendSpreads(q, 1);
  const spread = result[0];
  const title = spread?.spread?.titleKo || spread?.spread?.title || 'no match';
  const theme = spread?.theme?.categoryKo || spread?.theme?.category || '';
  console.log(`"${q}"`);
  console.log(`  → ${title} (${theme})\n`);
});
