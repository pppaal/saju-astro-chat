/**
 * E2E QA: 30 user questions → analyze → draw cards → interpret
 */

const PUBLIC_TOKEN =
  process.env.PUBLIC_API_TOKEN ||
  "066d4b836cd3ac8abc3313e68225d14aea20f877efb1a47c07260279685acb9e";
const BASE_URL = process.env.API_BASE || "http://localhost:3000";
const HEADERS = {
  "Content-Type": "application/json",
  "x-api-token": PUBLIC_TOKEN,
};

const questions = [
  "연애운이 언제 풀릴까요?",
  "그 사람이 나를 어떻게 생각하나요?",
  "재회 가능성이 있을까요?",
  "올해 결혼운 흐름은 어때요?",
  "이직을 고민 중인데 방향이 맞나요?",
  "이번 면접 결과가 어떨까요?",
  "사업 시작해도 될까요?",
  "금전운이 좋아지는 시기는 언제일까요?",
  "주식 투자 타이밍을 봐주세요.",
  "부동산 매수해도 괜찮을까요?",
  "건강 흐름에서 주의할 점은?",
  "요즘 불안감이 심한데 이유가 뭘까요?",
  "이사해도 될까요?",
  "여행 계획이 있는데 진행해도 될까요?",
  "새로운 공부를 시작해도 될까요?",
  "부모님과의 관계가 답답해요.",
  "친구와의 갈등을 어떻게 풀면 좋을까요?",
  "지금 선택한 길이 맞나요?",
  "지금 시기에 가장 중요한 과제는?",
  "이 사람과의 궁합이 궁금해요.",
  "내 강점과 약점은 무엇인가요?",
  "다음 달 운세 흐름이 궁금해요.",
  "올해 남은 운세 흐름을 알려주세요.",
  "최근 슬럼프를 벗어날 방법이 있을까요?",
  "나에게 맞는 직업 방향을 알려주세요.",
  "Is my relationship with my partner improving?",
  "What career move should I make next?",
  "Should I start a new business this year?",
  "Will my financial situation stabilize soon?",
  "What is the best timing for a big decision?",
];

const birthdates = [
  "1995-02-15",
  "1990-07-25",
  "1988-11-05",
  "1992-03-18",
  "1997-09-02",
];

function detectLanguage(text: string): "ko" | "en" {
  return /[가-힣]/.test(text) ? "ko" : "en";
}

async function analyzeQuestion(question: string, language: "ko" | "en") {
  const response = await fetch(`${BASE_URL}/api/tarot/analyze-question`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ question, language }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`analyze-question ${response.status}: ${errorText.slice(0, 200)}`);
  }
  return response.json();
}

async function drawCards(themeId: string, spreadId: string) {
  const response = await fetch(`${BASE_URL}/api/tarot`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ categoryId: themeId, spreadId }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`draw-cards ${response.status}: ${errorText.slice(0, 200)}`);
  }
  return response.json();
}

async function interpretTarot(payload: Record<string, unknown>) {
  const response = await fetch(`${BASE_URL}/api/tarot/interpret`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`interpret ${response.status}: ${errorText.slice(0, 200)}`);
  }
  return response.json();
}

async function run() {
  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];
    const language = detectLanguage(question);
    const birthdate = birthdates[i % birthdates.length];
    console.log(`\n[${i + 1}/${questions.length}] ${question}`);

    try {
      const analysis = await analyzeQuestion(question, language);
      const themeId = analysis.themeId;
      const spreadId = analysis.spreadId;

      const draw = await drawCards(themeId, spreadId);
      const spread = draw.spread || {};
      const positions = Array.isArray(spread.positions) ? spread.positions : [];
      const spreadTitle =
        language === "ko"
          ? (spread.titleKo || spread.title || "")
          : (spread.title || spread.titleKo || "");

      const cards = (draw.drawnCards || []).map(
        (entry: { card: Record<string, unknown>; isReversed: boolean }, idx: number) => ({
          name: entry.card?.name,
          nameKo: entry.card?.nameKo,
          isReversed: entry.isReversed,
          position: positions[idx]?.title || `Card ${idx + 1}`,
          positionKo: positions[idx]?.titleKo,
          keywords: entry.card?.keywords,
          keywordsKo: entry.card?.keywordsKo,
        })
      );

      const interpretation = await interpretTarot({
        categoryId: themeId,
        spreadId,
        spreadTitle,
        cards,
        userQuestion: question,
        language,
        birthdate,
      });

      const overall = String(interpretation.overall_message || "");
      const guidance = String(interpretation.guidance || "");
      const cardInsights = Array.isArray(interpretation.card_insights)
        ? interpretation.card_insights
        : [];

      results.push({
        question,
        language,
        themeId,
        spreadId,
        spreadTitle,
        cardCount: cards.length,
        overallLength: overall.length,
        guidanceLength: guidance.length,
        cardInsights: cardInsights.length,
        fallback: Boolean(interpretation.fallback),
        ok: true,
      });
      console.log(`   ✅ ok (cards=${cards.length}, overall=${overall.length} chars)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ question, ok: false, error: message });
      console.log(`   ❌ ${message}`);
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const fallbackCount = results.filter((r) => r.ok && r.fallback).length;
  const avgOverall = Math.round(
    results
      .filter((r) => r.ok)
      .reduce((sum, r) => sum + (r.overallLength as number), 0) / Math.max(1, okCount)
  );

  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join("logs", "qa-tarot-e2e-30.json");
  fs.writeFileSync(outPath, JSON.stringify({ total: results.length, ok: okCount, fallbackCount, avgOverall, results }, null, 2), "utf8");

  console.log(`\nSaved ${outPath}`);
  console.log(`OK ${okCount}/${results.length}, fallback ${fallbackCount}, avg overall length ${avgOverall}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
