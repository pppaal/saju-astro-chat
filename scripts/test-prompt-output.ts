/**
 * Test script to verify prompt output for different themes
 * Run: npx ts-node scripts/test-prompt-output.ts
 */

import { buildAllDataPrompt } from "../src/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt";

// Mock data for 1995.02.09 06:40 Seoul male
const mockCombinedResult = {
  saju: {
    pillars: {
      year: { heavenlyStem: { name: "乙", element: "목" }, earthlyBranch: { name: "亥", element: "수" }, ganji: "乙亥" },
      month: { heavenlyStem: { name: "戊", element: "토" }, earthlyBranch: { name: "寅", element: "목" }, ganji: "戊寅" },
      day: { heavenlyStem: { name: "壬", element: "수" }, earthlyBranch: { name: "辰", element: "토" }, ganji: "壬辰" },
      time: { heavenlyStem: { name: "癸", element: "수" }, earthlyBranch: { name: "卯", element: "목" }, ganji: "癸卯" },
    },
    dayMaster: { name: "壬", element: "수" },
    unse: {
      daeun: [
        { age: 3, heavenlyStem: "丁", earthlyBranch: "丑", element: "화" },
        { age: 13, heavenlyStem: "丙", earthlyBranch: "子", element: "화" },
        { age: 23, heavenlyStem: "乙", earthlyBranch: "亥", element: "목" },
        { age: 33, heavenlyStem: "甲", earthlyBranch: "戌", element: "목" },
        { age: 43, heavenlyStem: "癸", earthlyBranch: "酉", element: "수" },
        { age: 53, heavenlyStem: "壬", earthlyBranch: "申", element: "수" },
      ],
      annual: [
        { year: 2024, ganji: "甲辰", element: "목" },
        { year: 2025, ganji: "乙巳", element: "목" },
        { year: 2026, ganji: "丙午", element: "화" },
      ],
      monthly: [
        { year: 2026, month: 1, ganji: "己丑", element: "토" },
        { year: 2026, month: 2, ganji: "庚寅", element: "금" },
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
        count: { 비견: 1, 겁재: 0, 식신: 2, 상관: 1, 편재: 1, 정재: 0, 편관: 0, 정관: 1, 편인: 1, 정인: 1 },
        dominantSibsin: ["식신", "상관"],
        missingSibsin: ["겁재", "정재"],
        relationships: [{ type: "친구", quality: "협력적" }],
        careerAptitudes: [{ field: "창작", score: 85 }, { field: "교육", score: 75 }],
      },
      hyeongchung: {
        chung: [{ branch1: "辰", branch2: "戌" }],
        hap: [{ branch1: "寅", branch2: "亥", result: "목" }],
        samhap: [],
      },
      healthCareer: {
        health: { vulnerabilities: ["신장", "방광"] },
        career: { suitableFields: ["예술", "교육", "IT"] },
      },
      score: { total: 78, business: 72, wealth: 68, health: 75 },
    },
  },
  astrology: {
    planets: [
      { name: "Sun", sign: "Aquarius", house: 4 },
      { name: "Moon", sign: "Cancer", house: 10 },
      { name: "Mercury", sign: "Aquarius", house: 4 },
      { name: "Venus", sign: "Pisces", house: 5 },
      { name: "Mars", sign: "Leo", house: 11 },
      { name: "Jupiter", sign: "Sagittarius", house: 3 },
      { name: "Saturn", sign: "Pisces", house: 5 },
      { name: "Uranus", sign: "Capricorn", house: 3 },
      { name: "Neptune", sign: "Capricorn", house: 3 },
      { name: "Pluto", sign: "Scorpio", house: 2 },
      { name: "North Node", sign: "Scorpio", house: 2 },
    ],
    houses: [
      { sign: "Scorpio", cusp: 210 },
      { sign: "Sagittarius", cusp: 240 },
      { sign: "Capricorn", cusp: 270 },
      { sign: "Aquarius", cusp: 300 },
      { sign: "Pisces", cusp: 330 },
      { sign: "Aries", cusp: 0 },
      { sign: "Taurus", cusp: 30 },
      { sign: "Gemini", cusp: 60 },
      { sign: "Cancer", cusp: 90 },
      { sign: "Leo", cusp: 120 },
      { sign: "Virgo", cusp: 150 },
      { sign: "Libra", cusp: 180 },
    ],
    aspects: [
      { planet1: { name: "Sun" }, type: "trine", planet2: { name: "Mars" } },
      { planet1: { name: "Moon" }, type: "opposition", planet2: { name: "Saturn" } },
    ],
    ascendant: { sign: "Scorpio" },
    mc: { sign: "Leo" },
    facts: {
      elementRatios: { Fire: 2.5, Earth: 1.5, Air: 2.0, Water: 4.0 },
      birthDate: "1995-02-09",
    },
    transits: [
      { transitPlanet: "Jupiter", natalPoint: "Sun", aspectType: "trine", isApplying: true },
      { transitPlanet: "Saturn", natalPoint: "Moon", aspectType: "square", isApplying: false },
    ],
  },
  extraPoints: {
    chiron: { sign: "Virgo", house: 11 },
    lilith: { sign: "Scorpio", house: 1 },
    vertex: { sign: "Taurus", house: 7 },
    partOfFortune: { sign: "Leo", house: 10 },
  },
  asteroids: {
    juno: { sign: "Sagittarius", house: 2 },
    ceres: { sign: "Taurus", house: 7 },
    pallas: { sign: "Aquarius", house: 4 },
    vesta: { sign: "Leo", house: 10 },
  },
  solarReturn: {
    summary: {
      ascSign: "Capricorn",
      sunHouse: 2,
      moonSign: "Gemini",
      moonHouse: 6,
      theme: "재물과 자기가치에 집중하는 해",
    },
  },
  lunarReturn: {
    summary: {
      ascSign: "Libra",
      moonHouse: 1,
      theme: "자아 성찰과 균형의 달",
    },
  },
  progressions: {
    secondary: {
      summary: {
        keySigns: { sun: "Pisces", moon: "Sagittarius" },
        moonHouse: 3,
        ascendant: "Scorpio",
      },
      moonPhase: { phase: "Gibbous" },
    },
    solarArc: {
      summary: {
        keySigns: { sun: "Aries" },
      },
    },
  },
  draconic: {
    chart: {
      planets: [
        { name: "Sun", sign: "Aries" },
        { name: "Moon", sign: "Virgo" },
      ],
      ascendant: { sign: "Aquarius" },
    },
  },
  harmonics: {
    profile: {
      dominant: 5,
      creative: 78,
      intuitive: 62,
      spiritual: 55,
    },
  },
  fixedStars: [
    { star: "Regulus", planet: "MC", meaning: "왕의 별, 리더십" },
  ],
  eclipses: {
    impact: { eclipseType: "Solar", affectedPoint: "Moon" },
    upcoming: [{ date: "2026-03-29", type: "Total Solar" }],
  },
  electional: {
    moonPhase: "Waxing Crescent",
    voidOfCourse: { isVoid: false },
    planetaryHour: { planet: "Jupiter" },
    retrograde: ["Mercury"],
  },
  midpoints: {
    sunMoon: { sign: "Taurus", degree: 15 },
    ascMc: { sign: "Sagittarius", degree: 22 },
  },
  meta: { generator: "test", generatedAt: new Date().toISOString() },
  summary: "",
};

const themes = ["love", "career", "health", "family", "today", "month", "year", "life", "chat"];

console.log("=" .repeat(80));
console.log("테마별 프롬프트 출력 테스트");
console.log("=" .repeat(80));

for (const theme of themes) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📌 테마: ${theme.toUpperCase()}`);
  console.log("=".repeat(80));

  const prompt = buildAllDataPrompt("ko", theme, mockCombinedResult as any);

  // 테마별 섹션만 추출해서 보여줌
  const themeSection = prompt.match(/═{10,}[\s\S]*?(?=═{10,}PART 4|$)/g);

  // 테마별 심층 분석 섹션 찾기
  const loveMatch = prompt.match(/💕 연애[\s\S]*?(?=═{5,}|💼|🏥|👨|📅|📆|🗓️|🌟|$)/);
  const careerMatch = prompt.match(/💼 직업[\s\S]*?(?=═{5,}|💕|🏥|👨|📅|📆|🗓️|🌟|$)/);
  const healthMatch = prompt.match(/🏥 건강[\s\S]*?(?=═{5,}|💕|💼|👨|📅|📆|🗓️|🌟|$)/);
  const familyMatch = prompt.match(/👨‍👩‍👧 가족[\s\S]*?(?=═{5,}|💕|💼|🏥|📅|📆|🗓️|🌟|$)/);
  const todayMatch = prompt.match(/📅 오늘[\s\S]*?(?=═{5,}|💕|💼|🏥|👨|📆|🗓️|🌟|$)/);
  const monthMatch = prompt.match(/📆 이달[\s\S]*?(?=═{5,}|💕|💼|🏥|👨|📅|🗓️|🌟|$)/);
  const yearMatch = prompt.match(/🗓️ 올해[\s\S]*?(?=═{5,}|💕|💼|🏥|👨|📅|📆|🌟|$)/);
  const lifeMatch = prompt.match(/🌟 인생[\s\S]*?(?=═{5,}|💕|💼|🏥|👨|📅|📆|🗓️|$)/);

  const themeMatches: Record<string, RegExpMatchArray | null> = {
    love: loveMatch,
    career: careerMatch,
    health: healthMatch,
    family: familyMatch,
    today: todayMatch,
    month: monthMatch,
    year: yearMatch,
    life: lifeMatch,
  };

  // 해당 테마의 심층 분석 섹션 표시
  if (themeMatches[theme]) {
    console.log("\n[테마별 심층 분석 섹션]");
    console.log("-".repeat(60));
    console.log(themeMatches[theme]![0].slice(0, 2000));
    if (themeMatches[theme]![0].length > 2000) {
      console.log("... (truncated)");
    }
  } else if (theme === "chat") {
    console.log("\n[chat 테마: 테마별 심층 섹션 없음 - 기본 데이터만 제공]");
  }

  // 융합 해석 가이드 표시
  const fusionMatch = prompt.match(/PART 4: 동서양 융합[\s\S]*$/);
  if (fusionMatch && theme === "chat") {
    console.log("\n[동서양 융합 해석 가이드]");
    console.log("-".repeat(60));
    console.log(fusionMatch[0].slice(0, 1500));
  }

  console.log(`\n📊 전체 프롬프트 길이: ${prompt.length} 글자`);
}

// 질문별 테마 감지 시뮬레이션
console.log("\n\n" + "=".repeat(80));
console.log("🔍 질문별 테마 감지 시뮬레이션");
console.log("=".repeat(80));

const questionThemeMap = [
  { question: "올해 연애운 어때?", expectedTheme: "love" },
  { question: "내 결혼 시기 언제야?", expectedTheme: "love" },
  { question: "이직하면 좋을까?", expectedTheme: "career" },
  { question: "재물운 어때?", expectedTheme: "career" },
  { question: "건강 조심해야 할 거 있어?", expectedTheme: "health" },
  { question: "부모님과의 관계는?", expectedTheme: "family" },
  { question: "오늘 운세 알려줘", expectedTheme: "today" },
  { question: "이번 달 어때?", expectedTheme: "month" },
  { question: "2026년 운세는?", expectedTheme: "year" },
  { question: "내 인생 전체 흐름은?", expectedTheme: "life" },
  { question: "나 어떤 사람이야?", expectedTheme: "chat" },
];

for (const { question, expectedTheme } of questionThemeMap) {
  console.log(`\n질문: "${question}"`);
  console.log(`예상 테마: ${expectedTheme}`);

  // 실제로는 프론트엔드/백엔드에서 분류됨
  // 여기서는 간단한 키워드 기반 시뮬레이션
  let detectedTheme = "chat";
  if (/연애|사랑|결혼|배우자|남친|여친|애인/.test(question)) detectedTheme = "love";
  else if (/직업|이직|취업|돈|재물|사업|회사/.test(question)) detectedTheme = "career";
  else if (/건강|아프|병|체력/.test(question)) detectedTheme = "health";
  else if (/부모|가족|형제|자녀/.test(question)) detectedTheme = "family";
  else if (/오늘|today/.test(question)) detectedTheme = "today";
  else if (/이번.?달|월|month/.test(question)) detectedTheme = "month";
  else if (/올해|년|2026|year/.test(question)) detectedTheme = "year";
  else if (/인생|전체|평생|삶/.test(question)) detectedTheme = "life";

  const match = detectedTheme === expectedTheme ? "✅" : "❌";
  console.log(`감지된 테마: ${detectedTheme} ${match}`);
}

console.log("\n" + "=".repeat(80));
console.log("테스트 완료");
console.log("=".repeat(80));
