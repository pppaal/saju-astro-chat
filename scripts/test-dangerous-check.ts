import { checkDangerousQuestion } from '../src/lib/Tarot/tarot-recommend';

const dangerousTests = [
  "자살할까?",
  "죽고 싶어요",
  "살기 싫어",
  "끝내고 싶어",
  "suicide",
  "I want to die",
  // 정상 질문
  "취업할까?",
  "연애 언제?",
  "오늘 운세",
];

console.log('========== 위험 질문 감지 테스트 ==========\n');

dangerousTests.forEach(q => {
  const result = checkDangerousQuestion(q);
  if (result.isDangerous) {
    console.log('⚠️ 위험: "' + q + '"');
    console.log('   → ' + result.messageKo);
  } else {
    console.log('✅ 정상: "' + q + '"');
  }
  console.log('');
});
