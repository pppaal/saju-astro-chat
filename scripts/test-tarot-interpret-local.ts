/**
 * Local Next API: /api/tarot/interpret QA script
 */

const PUBLIC_TOKEN =
  process.env.PUBLIC_API_TOKEN ||
  "066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e";
const BASE_URL = "http://localhost:3000";

const testCases = [
  {
    name: "원카드 - 오늘의 운세",
    categoryId: "daily",
    spreadId: "one-card",
    spreadTitle: "오늘의 한 장",
    userQuestion: "오늘 하루 어떨까요?",
    birthdate: "1995-02-15",
    cards: [
      {
        name: "The Fool",
        nameKo: "바보",
        isReversed: false,
        position: "Today",
        positionKo: "오늘",
        keywordsKo: ["새로운 시작", "순수", "모험"],
      },
    ],
  },
  {
    name: "쓰리카드 - 연애운",
    categoryId: "love",
    spreadId: "three-card",
    spreadTitle: "과거-현재-미래",
    userQuestion: "지금 만나는 사람과의 관계가 어떻게 될까요?",
    cards: [
      {
        name: "The Lovers",
        nameKo: "연인",
        isReversed: false,
        position: "Past",
        positionKo: "과거",
      },
      {
        name: "Two of Cups",
        nameKo: "컵 2",
        isReversed: false,
        position: "Present",
        positionKo: "현재",
      },
      {
        name: "Ten of Cups",
        nameKo: "컵 10",
        isReversed: false,
        position: "Future",
        positionKo: "미래",
      },
    ],
  },
  {
    name: "역방향 카드 테스트",
    categoryId: "general",
    spreadId: "three-card",
    spreadTitle: "마음-장애물-조언",
    userQuestion: "요즘 왜 이렇게 힘들까요?",
    cards: [
      {
        name: "The Moon",
        nameKo: "달",
        isReversed: true,
        position: "Your Mind",
        positionKo: "당신의 마음",
      },
      {
        name: "Nine of Swords",
        nameKo: "검 9",
        isReversed: false,
        position: "Obstacle",
        positionKo: "장애물",
      },
      {
        name: "The Sun",
        nameKo: "태양",
        isReversed: false,
        position: "Advice",
        positionKo: "조언",
      },
    ],
  },
];

async function testLocalInterpret(testCase: (typeof testCases)[number]) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`테스트: ${testCase.name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`스프레드: ${testCase.spreadTitle}`);
  console.log(`질문: ${testCase.userQuestion}`);
  console.log(
    `카드: ${testCase.cards
      .map((c) => `${c.nameKo}${c.isReversed ? "(역)" : ""}`)
      .join(", ")}`
  );

  const response = await fetch(`${BASE_URL}/api/tarot/interpret`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": PUBLIC_TOKEN,
    },
    body: JSON.stringify({
      categoryId: testCase.categoryId,
      spreadId: testCase.spreadId,
      spreadTitle: testCase.spreadTitle,
      cards: testCase.cards,
      userQuestion: testCase.userQuestion,
      language: "ko",
      birthdate: testCase.birthdate,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`\n❌ 에러: HTTP ${response.status}`);
    console.log(`   상세: ${errorText.substring(0, 300)}`);
    return false;
  }

  const data = await response.json();
  console.log(`\n✅ 성공!`);
  console.log(`   overall: ${(data.overall_message || "").substring(0, 200)}...`);
  console.log(`   guidance: ${(data.guidance || "").substring(0, 120)}...`);
  console.log(`   cards: ${Array.isArray(data.card_insights) ? data.card_insights.length : 0}`);
  if (data.fallback === true) {
    console.log(`   ⚠️ fallback 응답`);
  }
  return true;
}

async function main() {
  console.log("🃏 로컬 타로 해석 API 테스트 (/api/tarot/interpret)");
  console.log(`   서버: ${BASE_URL}`);
  console.log(`   테스트 케이스: ${testCases.length}개`);

  let success = 0;
  for (const testCase of testCases) {
    const ok = await testLocalInterpret(testCase);
    if (ok) success += 1;
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 테스트 결과 요약");
  console.log(`${"=".repeat(70)}`);
  console.log(`✅ 성공: ${success}/${testCases.length}`);
  console.log(`❌ 실패: ${testCases.length - success}/${testCases.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
