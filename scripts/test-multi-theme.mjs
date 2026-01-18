/**
 * 여러 테마 백엔드 API 직접 테스트
 */

const API_KEY = '0a0bd7ccf9e607a4aafb7f5b03b7e0e8bf18ec0c3949b2ee8522b8a5d9d07e69';

const testCases = [
  { theme: 'love', question: '올해 연애운 어때요?' },
  { theme: 'career', question: '이직하면 좋을까요?' },
  { theme: 'year', question: '2026년 전체 운세 알려주세요' },
  { theme: 'health', question: '건강 관리 어떻게 해야 할까요?' },
  { theme: 'money', question: '재물운은 어떤가요?' },
];

const basePromptData = `
[사주 데이터]
사주: 乙亥/戊寅/壬辰/癸卯
일간: 壬水 (신강 65점)
격국: 식신격 - 창의적이고 표현력이 뛰어남
용신: 화(火) | 희신: 토(土) | 기신: 금(金)
십신 분포: 식신(2), 상관(1), 정관(1), 편인(1)
현재 대운 (23-32세): 乙亥 (목)
2026년 세운: 丙午 (화) - 용신 운!
신살: 천을귀인, 도화살(길) / 겁살(흉)

[점성술]
태양: Aquarius (4H) | 달: Cancer (10H)
ASC: Scorpio | MC: Leo
금성: Pisces (5H) - 연애 예술적
화성: Leo (11H) - 사회활동 리더십
목성: Sagittarius (3H) - 학습 확장
토성: Pisces (5H) - 창작 제약
Chiron: Virgo (11H) - 그룹/친구 관계의 상처
Solar Return 2026: ASC Capricorn, Sun H2 (재물과 자기가치에 집중의 해)
진행 태양: Pisces | 진행 달: Sagittarius`;

// Mock 사주 데이터
const mockSaju = {
  pillars: {
    year: { heavenlyStem: { name: "乙", element: "목" }, earthlyBranch: { name: "亥", element: "수" } },
    month: { heavenlyStem: { name: "戊", element: "토" }, earthlyBranch: { name: "寅", element: "목" } },
    day: { heavenlyStem: { name: "壬", element: "수" }, earthlyBranch: { name: "辰", element: "토" } },
    time: { heavenlyStem: { name: "癸", element: "수" }, earthlyBranch: { name: "卯", element: "목" } },
  },
  dayMaster: { name: "壬", element: "수" },
  unse: {
    daeun: [
      { age: 3, heavenlyStem: "丁", earthlyBranch: "丑", element: "화" },
      { age: 13, heavenlyStem: "丙", earthlyBranch: "子", element: "화" },
      { age: 23, heavenlyStem: "乙", earthlyBranch: "亥", element: "목" },
      { age: 33, heavenlyStem: "甲", earthlyBranch: "戌", element: "목" },
    ],
    annual: [
      { year: 2025, ganji: "乙巳", element: "목" },
      { year: 2026, ganji: "丙午", element: "화" },
    ],
  },
  sinsal: {
    luckyList: [{ name: "천을귀인" }, { name: "도화살" }],
    unluckyList: [{ name: "겁살" }],
  },
  advancedAnalysis: {
    extended: {
      strength: { level: "신강", score: 65, rootCount: 3 },
      geokguk: { type: "식신격", description: "창의적이고 표현력이 뛰어남" },
      yongsin: { primary: "화", secondary: "토", avoid: "금" },
    },
    sibsin: {
      count: { 비견: 1, 식신: 2, 상관: 1, 편재: 1, 정관: 1, 편인: 1, 정인: 1 },
      dominantSibsin: ["식신", "상관"],
      missingSibsin: ["겁재", "정재"],
    },
    hyeongchung: {
      chung: [{ branch1: "辰", branch2: "戌" }],
      hap: [{ branch1: "寅", branch2: "亥", result: "목" }],
    },
  },
};

// Mock 점성술 데이터
const mockAstro = {
  planets: [
    { name: "Sun", sign: "Aquarius", house: 4 },
    { name: "Moon", sign: "Cancer", house: 10 },
    { name: "Venus", sign: "Pisces", house: 5 },
    { name: "Mars", sign: "Leo", house: 11 },
    { name: "Jupiter", sign: "Sagittarius", house: 3 },
    { name: "Saturn", sign: "Pisces", house: 5 },
    { name: "North Node", sign: "Scorpio", house: 2 },
  ],
  houses: Array(12).fill(null).map((_, i) => ({ sign: ["Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra"][i] })),
  ascendant: { sign: "Scorpio" },
  mc: { sign: "Leo" },
  facts: { birthDate: "1995-02-09", elementRatios: { Fire: 2.5, Earth: 1.5, Air: 2.0, Water: 4.0 } },
};

async function testTheme(theme, question) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`📌 테마: ${theme.toUpperCase()} | 질문: "${question}"`);
  console.log("═".repeat(70));

  const prompt = `${question}\n${basePromptData}`;

  try {
    const response = await fetch('http://localhost:5000/ask-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({
        theme,
        prompt,
        locale: 'ko',
        saju: mockSaju,
        astro: mockAstro,
      })
    });

    if (!response.ok) {
      console.log(`❌ 오류: ${response.status}`);
      console.log(await response.text());
      return { theme, success: false, length: 0 };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n');
    console.log(`📊 응답 길이: ${result.length} 글자`);

    return { theme, success: true, length: result.length };
  } catch (error) {
    console.log(`❌ 오류: ${error.message}`);
    return { theme, success: false, length: 0 };
  }
}

async function main() {
  console.log("🔮 사주+점성술 상담 다중 테마 테스트");
  console.log("대상: 1995.02.09 06:40 서울 남성 (壬辰일주, Aquarius Sun)");
  console.log("─".repeat(70));

  const results = [];

  for (const { theme, question } of testCases) {
    const result = await testTheme(theme, question);
    results.push(result);
    // API 호출 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log("\n" + "═".repeat(70));
  console.log("📊 테스트 결과 요약");
  console.log("═".repeat(70));

  for (const r of results) {
    const status = r.success ? "✅" : "❌";
    console.log(`${status} ${r.theme.toUpperCase().padEnd(10)} - ${r.length} 글자`);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n총 ${successCount}/${results.length} 테마 성공`);
}

main();
