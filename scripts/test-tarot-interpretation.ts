/**
 * 타로 해석 API 테스트 스크립트
 */

const testCases = [
  {
    name: "원카드 - 오늘의 운세",
    categoryId: "daily",
    spreadId: "one-card",
    spreadTitle: "오늘의 한 장",
    userQuestion: "오늘 하루 어떨까요?",
    cards: [
      {
        name: "The Fool",
        nameKo: "바보",
        isReversed: false,
        position: "Today",
        positionKo: "오늘",
        keywords: ["new beginnings", "innocence", "adventure"],
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

const BASE_URL = process.env.AI_BACKEND_URL || "http://127.0.0.1:5000";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || "0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69";

async function testTarotAPI(testCase: typeof testCases[0]) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`테스트: ${testCase.name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`스프레드: ${testCase.spreadTitle}`);
  console.log(`질문: ${testCase.userQuestion}`);
  console.log(`카드: ${testCase.cards.map(c => `${c.nameKo}${c.isReversed ? '(역)' : ''}`).join(', ')}`);

  try {
    const response = await fetch(`${BASE_URL}/api/tarot/interpret`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        category: testCase.categoryId,
        spread_id: testCase.spreadId,
        spread_title: testCase.spreadTitle,
        cards: testCase.cards.map(c => ({
          name: c.name,
          is_reversed: c.isReversed,
          position: c.position,
        })),
        user_question: testCase.userQuestion,
        language: "ko",
      }),
    });

    if (!response.ok) {
      console.log(`\n❌ 에러: HTTP ${response.status}`);
      const errorText = await response.text();
      console.log(`   상세: ${errorText.substring(0, 300)}`);
      return { success: false, name: testCase.name };
    }

    const result = await response.json();
    const data = result.data || result;

    console.log(`\n✅ 성공!`);

    if (data.overall_message) {
      console.log(`\n📜 전체 메시지:`);
      console.log(`   ${data.overall_message.substring(0, 400)}...`);
    }

    if (data.card_insights?.length > 0) {
      console.log(`\n🃏 카드별 해석:`);
      data.card_insights.slice(0, 3).forEach((card: any) => {
        console.log(`\n   [${card.position}] ${card.card_name}${card.is_reversed ? ' (역방향)' : ''}`);
        if (card.interpretation) {
          console.log(`   ${card.interpretation.substring(0, 200)}...`);
        }
      });
    }

    if (data.guidance) {
      console.log(`\n💡 조언:`);
      const guidance = typeof data.guidance === 'string' ? data.guidance : JSON.stringify(data.guidance);
      console.log(`   ${guidance.substring(0, 200)}...`);
    }

    if (data.affirmation) {
      console.log(`\n✨ 확언: ${data.affirmation}`);
    }

    if (data.fallback) {
      console.log(`\n⚠️ 폴백 응답 사용됨`);
    }

    return { success: true, name: testCase.name, result: data };

  } catch (error) {
    console.log(`\n❌ 실패: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, name: testCase.name, error };
  }
}

async function main() {
  console.log("🃏 타로 해석 API 테스트 시작");
  console.log(`   서버: ${BASE_URL}`);
  console.log(`   테스트 케이스: ${testCases.length}개`);

  const results: { success: boolean; name: string }[] = [];

  for (const testCase of testCases) {
    const result = await testTarotAPI(testCase);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 테스트 결과 요약");
  console.log(`${"=".repeat(70)}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ 성공: ${successful}/${results.length}`);
  console.log(`❌ 실패: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log(`\n실패한 테스트:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.name}`);
    });
  }
}

main().catch(console.error);
