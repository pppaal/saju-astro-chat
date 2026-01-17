/**
 * 실제 상담 내용 테스트
 * 1995.02.09 06:40 서울 남성 데이터로 테스트
 */

const testQuestions = [
  { theme: "love", question: "올해 연애운 어때요?" },
  { theme: "career", question: "이직하면 좋을까요?" },
  { theme: "year", question: "2026년 운세 전체적으로 어떤가요?" },
];

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

// Mock 고급 점성술 데이터
const mockAdvancedAstro = {
  extraPoints: {
    chiron: { sign: "Virgo", house: 11 },
    lilith: { sign: "Scorpio", house: 1 },
  },
  asteroids: {
    juno: { sign: "Sagittarius", house: 2 },
    ceres: { sign: "Taurus", house: 7 },
  },
  solarReturn: {
    summary: { ascSign: "Capricorn", sunHouse: 2, theme: "재물과 자기가치에 집중" },
  },
  lunarReturn: {
    summary: { ascSign: "Libra", moonHouse: 1, theme: "자아 성찰과 균형" },
  },
  progressions: {
    secondary: {
      summary: { keySigns: { sun: "Pisces", moon: "Sagittarius" }, moonHouse: 3 },
      moonPhase: { phase: "Gibbous" },
    },
  },
  electional: {
    moonPhase: 0.35,
    moonPhaseName: "Waxing Crescent",
    moonSign: "Taurus",
    voidOfCourse: { isVoid: false },
    retrogradePlanets: [],
  },
};

async function testChatAPI(theme, question) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`📌 테마: ${theme.toUpperCase()} | 질문: "${question}"`);
  console.log("═".repeat(70));

  try {
    const response = await fetch("http://localhost:3001/api/destiny-map/chat-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: question }],
        theme,
        lang: "ko",
        // 필수 필드
        birthDate: "1995-02-09",
        birthTime: "06:40",
        latitude: 37.5665,   // 서울
        longitude: 126.9780,
        gender: "male",
        // 사주/점성술 데이터
        saju: mockSaju,
        astro: mockAstro,
        advancedAstro: mockAdvancedAstro,
      }),
    });

    if (!response.ok) {
      console.log(`❌ API 오류: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(text.slice(0, 500));
      return;
    }

    // 스트리밍 응답 읽기
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              process.stdout.write(parsed.text);
            }
          } catch {
            // SSE 포맷이 아닌 경우 무시
          }
        }
      }
    }

    console.log("\n");
    console.log(`📊 응답 길이: ${fullText.length} 글자`);

  } catch (error) {
    console.log(`❌ 네트워크 오류: ${error.message}`);
    console.log("💡 서버가 실행 중인지 확인하세요: npm run dev");
  }
}

async function main() {
  console.log("🔮 사주+점성술 상담 테스트");
  console.log("대상: 1995.02.09 06:40 서울 남성 (壬辰일주, Aquarius Sun)");
  console.log("─".repeat(70));

  for (const { theme, question } of testQuestions) {
    await testChatAPI(theme, question);
    // API 호출 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n✅ 테스트 완료");
}

main();
