/**
 * Test script to verify prompt output for different themes
 * Run: node scripts/test-prompt-output.mjs
 */

// Mock buildAllDataPrompt function inline for testing
function buildAllDataPrompt(lang, theme, data) {
  const { astrology = {}, saju } = data ?? {};
  const {
    planets = [],
    houses = [],
    aspects = [],
    ascendant,
    mc,
    facts,
    transits = [],
  } = astrology;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = saju ?? {};

  // Helper functions
  const getPlanet = (name) => planets.find((p) => p.name === name);
  const formatPillar = (p) => {
    if (!p) return null;
    const stem = p.heavenlyStem?.name || '';
    const branch = p.earthlyBranch?.name || '';
    return stem && branch ? `${stem}${branch}` : null;
  };

  // Basic planetary data
  const sun = getPlanet("Sun");
  const moon = getPlanet("Moon");
  const venus = getPlanet("Venus");
  const mars = getPlanet("Mars");
  const jupiter = getPlanet("Jupiter");
  const saturn = getPlanet("Saturn");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const birthYear = facts?.birthDate ? new Date(facts.birthDate).getFullYear() : 1995;
  const currentAge = currentYear - birthYear;

  // Day master
  const actualDayMaster = dayMaster?.name || pillars?.day?.heavenlyStem?.name || "-";
  const actualDayMasterElement = dayMaster?.element || pillars?.day?.heavenlyStem?.element || "-";

  // Pillars
  const pillarText = [
    formatPillar(pillars?.year),
    formatPillar(pillars?.month),
    formatPillar(pillars?.day),
    formatPillar(pillars?.time),
  ].filter(Boolean).join(" / ") || "-";

  // Advanced analysis
  const adv = advancedAnalysis ?? {};
  const geokgukText = adv?.extended?.geokguk?.type ?? "-";
  const geokgukDesc = adv?.extended?.geokguk?.description ?? "";
  const yongsinPrimary = adv?.extended?.yongsin?.primary ?? "-";
  const yongsinSecondary = adv?.extended?.yongsin?.secondary ?? "-";
  const yongsinAvoid = adv?.extended?.yongsin?.avoid ?? "-";

  // Sibsin
  const sibsin = adv?.sibsin ?? {};
  const sibsinDist = sibsin?.count ?? {};
  const sibsinDistText = Object.entries(sibsinDist)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}(${v})`)
    .join(", ");

  // Sinsal
  const sinsalRecord = sinsal ?? {};
  const lucky = (sinsalRecord?.luckyList ?? []).map((x) => x.name).join(", ");
  const unlucky = (sinsalRecord?.unluckyList ?? []).map((x) => x.name).join(", ");

  // Daeun
  const currentDaeun = (unse?.daeun ?? []).find((d) => {
    const startAge = d.age;
    const endAge = startAge + 9;
    return currentAge >= startAge && currentAge <= endAge;
  });
  const daeunText = currentDaeun
    ? `${currentDaeun.age}-${currentDaeun.age + 9}세: ${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch}`
    : "-";

  // Transits
  const significantTransits = transits
    .filter((t) => ["conjunction", "trine", "square", "opposition"].includes(t.aspectType))
    .slice(0, 8)
    .map((t) => `${t.transitPlanet}-${t.aspectType}-${t.natalPoint}`)
    .join("; ");

  // Extra points
  const extraPoints = data.extraPoints ?? {};
  const chiron = extraPoints.chiron;
  const lilith = extraPoints.lilith;
  const juno = data.asteroids?.juno;

  // Progressions
  const progressions = data.progressions ?? {};
  const progressedSun = progressions?.secondary?.summary?.keySigns?.sun ?? "-";
  const progressedMoon = progressions?.secondary?.summary?.keySigns?.moon ?? "-";
  const progressedMoonPhase = progressions?.secondary?.moonPhase?.phase ?? "-";
  const progressionsText = `P.Sun: ${progressedSun}; P.Moon: ${progressedMoon} (Phase: ${progressedMoonPhase})`;

  // Solar/Lunar Return
  const solarReturn = data.solarReturn ?? {};
  const solarReturnText = solarReturn?.summary
    ? `SR ASC: ${solarReturn.summary.ascSign ?? "-"}; SR Sun H${solarReturn.summary.sunHouse ?? "-"}; Theme: ${solarReturn.summary.theme ?? "-"}`
    : "-";
  const lunarReturn = data.lunarReturn ?? {};
  const lunarReturnText = lunarReturn?.summary
    ? `LR ASC: ${lunarReturn.summary.ascSign ?? "-"}; Theme: ${lunarReturn.summary.theme ?? "-"}`
    : "-";

  // House signs for themes
  const house5Sign = houses?.[4]?.sign ?? "-";
  const house7Sign = houses?.[6]?.sign ?? "-";
  const house6Sign = houses?.[5]?.sign ?? "-";
  const house10Sign = houses?.[9]?.sign ?? "-";
  const house4Sign = houses?.[3]?.sign ?? "-";

  // Sibsin counts
  const officialStar = (sibsinDist?.["정관"] ?? 0) + (sibsinDist?.["편관"] ?? 0);
  const wealthStar = (sibsinDist?.["정재"] ?? 0) + (sibsinDist?.["편재"] ?? 0);

  // Theme-specific sections
  const loveAnalysisSection = theme === "love" ? `
═══════════════════════════════════════
💕 연애/배우자 심층 분석 (愛情 LOVE ANALYSIS)
═══════════════════════════════════════

[사주 연애/배우자 분석]
• 배우자궁(일지): ${pillars?.day?.earthlyBranch?.name ?? "-"} (${pillars?.day?.earthlyBranch?.element ?? "-"})
• 정재(남성-아내): ${sibsinDist?.["정재"] ?? 0}개 | 편재(여자친구): ${sibsinDist?.["편재"] ?? 0}개
• 정관(여성-남편): ${sibsinDist?.["정관"] ?? 0}개 | 편관(남자친구): ${sibsinDist?.["편관"] ?? 0}개
• 도화살: ${lucky.includes("도화") ? "있음 → 이성에게 인기" : "없음"} | 홍염살: ${lucky.includes("홍염") ? "있음" : "없음"}

[점성술 연애 분석]
• Venus(금성): ${venus?.sign ?? "-"} H${venus?.house ?? "-"} → 연애 스타일
• Mars(화성): ${mars?.sign ?? "-"} H${mars?.house ?? "-"} → 성적 매력
• 5하우스(연애): ${house5Sign} → 로맨스 스타일
• 7하우스(결혼): ${house7Sign} → 배우자 특성
• Juno(결혼): ${juno ? `${juno.sign} H${juno.house}` : "-"} → 이상적 배우자상

[해석 포인트]
• 배우자궁 오행 → 배우자 기질/성격
• 금성 사인 → 끌리는 타입
• 7하우스 사인 → 배우자 외적 특성
` : "";

  const careerAnalysisSection = (theme === "career" || theme === "wealth") ? `
═══════════════════════════════════════
💼 직업/재물 심층 분석 (職業 CAREER ANALYSIS)
═══════════════════════════════════════

[사주 직업 분석]
• 격국(格局): ${geokgukText} - ${geokgukDesc}
• 용신(用神): ${yongsinPrimary} (보조: ${yongsinSecondary}, 기신: ${yongsinAvoid})
• 관성(官星) 직장운: 총 ${officialStar}개
• 재성(財星) 재물운: 총 ${wealthStar}개

[점성술 직업 분석]
• MC(천정): ${mc?.sign ?? "-"} - 커리어 방향
• 10th House: ${house10Sign} - 직업적 성공 영역
• Saturn(토성): ${saturn?.sign ?? "-"} H${saturn?.house ?? "-"} - 책임/장기목표
• Jupiter(목성): ${jupiter?.sign ?? "-"} H${jupiter?.house ?? "-"} - 기회/행운

[해석 포인트]
• 관성 강함(3+) → 조직 생활 유리
• 관성 없음 → 프리랜서/창업 적합
• MC 사인 → 사회적 이미지
` : "";

  const healthAnalysisSection = theme === "health" ? `
═══════════════════════════════════════
🏥 건강 심층 분석 (健康 HEALTH ANALYSIS)
═══════════════════════════════════════

[사주 체질 분석]
• 일간 체질: ${actualDayMaster} (${actualDayMasterElement})
• 부족 오행(용신): ${yongsinPrimary} → 이 오행 관련 장기 보강 필요

[오행별 장기 연관]
• 木: 간, 담, 눈 | 火: 심장, 혈관 | 土: 비장, 위장
• 金: 폐, 피부 | 水: 신장, 방광

[점성술 건강 분석]
• 6th House(건강궁): ${house6Sign}
• Chiron(카이론): ${chiron ? `${chiron.sign} H${chiron.house}` : "-"} - 상처/치유
` : "";

  const familyAnalysisSection = theme === "family" ? `
═══════════════════════════════════════
👨‍👩‍👧 가족/인간관계 심층 분석 (家族 FAMILY ANALYSIS)
═══════════════════════════════════════

[사주 가족궁 분석]
• 년주(조상): ${formatPillar(pillars?.year) ?? "-"}
• 월주(부모): ${formatPillar(pillars?.month) ?? "-"}
• 일주(배우자): ${formatPillar(pillars?.day) ?? "-"}
• 시주(자녀): ${formatPillar(pillars?.time) ?? "-"}

[점성술 가족 분석]
• 4th House(가정궁): ${house4Sign}
• Moon(달): ${moon?.sign ?? "-"} H${moon?.house ?? "-"} - 감정/어머니
• Saturn(토성): ${saturn?.sign ?? "-"} H${saturn?.house ?? "-"} - 아버지/책임
` : "";

  const todayAnalysisSection = theme === "today" ? `
═══════════════════════════════════════
📅 오늘의 운세 분석 (今日 TODAY'S FORTUNE)
═══════════════════════════════════════

[사주 일간 흐름]
• 본인 일간: ${actualDayMaster} (${actualDayMasterElement})
• 길한 오행(용신): ${yongsinPrimary}
• 주의 오행(기신): ${yongsinAvoid}

[점성술 트랜짓 흐름]
• 현재 트랜짓: ${significantTransits || "특별한 배치 없음"}
• Lunar Return: ${lunarReturnText}
` : "";

  const monthAnalysisSection = theme === "month" ? `
═══════════════════════════════════════
📆 이달의 운세 분석 (本月 THIS MONTH)
═══════════════════════════════════════

[사주 월운 분석]
• 본인 일간: ${actualDayMaster} (${actualDayMasterElement})
• 용신(用神): ${yongsinPrimary}

[점성술 Lunar Return]
• ${lunarReturnText}
` : "";

  const yearAnalysisSection = theme === "year" ? `
═══════════════════════════════════════
🗓️ 올해의 운세 분석 (年運 THIS YEAR)
═══════════════════════════════════════

[사주 세운 + 대운 분석]
• 본인 일간: ${actualDayMaster} (${actualDayMasterElement})
• 현재 대운: ${daeunText}
• 용신(用神): ${yongsinPrimary}

[점성술 Solar Return + Progressions]
• ${solarReturnText}
• ${progressionsText}
` : "";

  const lifeAnalysisSection = theme === "life" ? `
═══════════════════════════════════════
🌟 인생 종합 분석 (人生 LIFE PURPOSE)
═══════════════════════════════════════

[사주 핵심 운명 코드]
• 일주(日主): ${actualDayMaster} (${actualDayMasterElement})
• 격국(格局): ${geokgukText}
• 용신(用神): ${yongsinPrimary}

[점성술 영혼 분석]
• North Node: ${getPlanet("North Node")?.sign ?? "-"} H${getPlanet("North Node")?.house ?? "-"} - 영혼의 목적
• Chiron: ${chiron ? `${chiron.sign} H${chiron.house}` : "-"} - 상처와 치유

[인생 주요 전환점]
• 토성 회귀(29세, 58세): 인생 성숙의 관문
• 카이론 회귀(50세): 치유와 지혜의 시기
` : "";

  // Build final prompt
  return `
[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${theme}]

📌 사용자 기본 정보
───────────────────────────────────────
생년: ${birthYear}년생 | 현재 만 나이: ${currentAge}세

════════════════════════════════════════════════════════════════
PART 1: 사주팔자 (四柱八字)
════════════════════════════════════════════════════════════════
일주(日主): ${actualDayMaster} (${actualDayMasterElement})
사주 팔자: ${pillarText}
격국(格局): ${geokgukText}
용신/기신: ${yongsinPrimary} / ${yongsinAvoid}
십신 분포: ${sibsinDistText || "-"}
신살: 길신(${lucky || "-"}) | 흉신(${unlucky || "-"})
현재 대운: ${daeunText}

════════════════════════════════════════════════════════════════
PART 2: 서양 점성술 (WESTERN ASTROLOGY)
════════════════════════════════════════════════════════════════
ASC: ${ascendant?.sign ?? "-"} | MC: ${mc?.sign ?? "-"}
Sun: ${sun?.sign ?? "-"} H${sun?.house ?? "-"} | Moon: ${moon?.sign ?? "-"} H${moon?.house ?? "-"}
Venus: ${venus?.sign ?? "-"} H${venus?.house ?? "-"} | Mars: ${mars?.sign ?? "-"} H${mars?.house ?? "-"}
Current Transits: ${significantTransits || "-"}

════════════════════════════════════════════════════════════════
PART 3: 고급 점성 분석
════════════════════════════════════════════════════════════════
Solar Return: ${solarReturnText}
Lunar Return: ${lunarReturnText}
Progressions: ${progressionsText}
${loveAnalysisSection}${careerAnalysisSection}${healthAnalysisSection}${familyAnalysisSection}${todayAnalysisSection}${monthAnalysisSection}${yearAnalysisSection}${lifeAnalysisSection}
════════════════════════════════════════════════════════════════
PART 4: 동서양 융합 해석 가이드
════════════════════════════════════════════════════════════════
🔗 사주-점성술 대응 관계
• 일간(日干) ↔ 태양(Sun): 핵심 정체성
• 격국(格局) ↔ ASC: 성향/페르소나
• 용신(用神) ↔ 가장 조화로운 행성

🎯 현재 트랜짓 해석
• Jupiter-trine: 기회/확장
• Saturn-square: 도전/성장

⚡ 질문 유형별 분석 포인트
[연애/결혼] → 사주: 배우자궁, 정재/정관, 도화살 | 점성: Venus, 7th House, Juno
[직업/재물] → 사주: 격국, 관성/재성 | 점성: MC, 10th House, Saturn
[건강] → 사주: 오행 균형 | 점성: 6th House, Chiron
[타이밍] → 사주: 대운/세운 | 점성: 트랜짓, 프로그레션
════════════════════════════════════════════════════════════════
`.trim();
}

// Mock data
const mockCombinedResult = {
  saju: {
    pillars: {
      year: { heavenlyStem: { name: "乙", element: "목" }, earthlyBranch: { name: "亥", element: "수" } },
      month: { heavenlyStem: { name: "戊", element: "토" }, earthlyBranch: { name: "寅", element: "목" } },
      day: { heavenlyStem: { name: "壬", element: "수" }, earthlyBranch: { name: "辰", element: "토" } },
      time: { heavenlyStem: { name: "癸", element: "수" }, earthlyBranch: { name: "卯", element: "목" } },
    },
    dayMaster: { name: "壬", element: "수" },
    unse: {
      daeun: [
        { age: 3, heavenlyStem: "丁", earthlyBranch: "丑" },
        { age: 13, heavenlyStem: "丙", earthlyBranch: "子" },
        { age: 23, heavenlyStem: "乙", earthlyBranch: "亥" },
        { age: 33, heavenlyStem: "甲", earthlyBranch: "戌" },
      ],
    },
    sinsal: {
      luckyList: [{ name: "천을귀인" }, { name: "도화살" }],
      unluckyList: [{ name: "겁살" }],
    },
    advancedAnalysis: {
      extended: {
        geokguk: { type: "식신격", description: "창의적이고 표현력이 뛰어남" },
        yongsin: { primary: "화", secondary: "토", avoid: "금" },
      },
      sibsin: {
        count: { 비견: 1, 식신: 2, 상관: 1, 편재: 1, 정관: 1, 편인: 1, 정인: 1 },
      },
    },
  },
  astrology: {
    planets: [
      { name: "Sun", sign: "Aquarius", house: 4 },
      { name: "Moon", sign: "Cancer", house: 10 },
      { name: "Venus", sign: "Pisces", house: 5 },
      { name: "Mars", sign: "Leo", house: 11 },
      { name: "Jupiter", sign: "Sagittarius", house: 3 },
      { name: "Saturn", sign: "Pisces", house: 5 },
      { name: "North Node", sign: "Scorpio", house: 2 },
    ],
    houses: [
      { sign: "Scorpio" }, { sign: "Sagittarius" }, { sign: "Capricorn" },
      { sign: "Aquarius" }, { sign: "Pisces" }, { sign: "Aries" },
      { sign: "Taurus" }, { sign: "Gemini" }, { sign: "Cancer" },
      { sign: "Leo" }, { sign: "Virgo" }, { sign: "Libra" },
    ],
    ascendant: { sign: "Scorpio" },
    mc: { sign: "Leo" },
    facts: { birthDate: "1995-02-09" },
    transits: [
      { transitPlanet: "Jupiter", natalPoint: "Sun", aspectType: "trine" },
      { transitPlanet: "Saturn", natalPoint: "Moon", aspectType: "square" },
    ],
  },
  extraPoints: {
    chiron: { sign: "Virgo", house: 11 },
    lilith: { sign: "Scorpio", house: 1 },
  },
  asteroids: {
    juno: { sign: "Sagittarius", house: 2 },
  },
  solarReturn: {
    summary: { ascSign: "Capricorn", sunHouse: 2, theme: "재물과 자기가치에 집중" },
  },
  lunarReturn: {
    summary: { ascSign: "Libra", theme: "자아 성찰과 균형" },
  },
  progressions: {
    secondary: {
      summary: { keySigns: { sun: "Pisces", moon: "Sagittarius" } },
      moonPhase: { phase: "Gibbous" },
    },
  },
};

const themes = ["love", "career", "health", "family", "today", "month", "year", "life", "chat"];

console.log("=".repeat(80));
console.log("📊 테마별 프롬프트 출력 테스트 (1995.02.09 서울 남성)");
console.log("=".repeat(80));

for (const theme of themes) {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`📌 테마: ${theme.toUpperCase()}`);
  console.log("─".repeat(80));

  const prompt = buildAllDataPrompt("ko", theme, mockCombinedResult);

  // 테마별 섹션 추출
  const themePatterns = {
    love: /💕 연애[\s\S]*?(?=═{5,}|$)/,
    career: /💼 직업[\s\S]*?(?=═{5,}|$)/,
    health: /🏥 건강[\s\S]*?(?=═{5,}|$)/,
    family: /👨‍👩‍👧 가족[\s\S]*?(?=═{5,}|$)/,
    today: /📅 오늘[\s\S]*?(?=═{5,}|$)/,
    month: /📆 이달[\s\S]*?(?=═{5,}|$)/,
    year: /🗓️ 올해[\s\S]*?(?=═{5,}|$)/,
    life: /🌟 인생[\s\S]*?(?=═{5,}|$)/,
  };

  if (themePatterns[theme]) {
    const match = prompt.match(themePatterns[theme]);
    if (match) {
      console.log("\n[✅ 테마별 심층 분석 섹션 포함됨]");
      console.log(match[0].trim());
    }
  } else {
    console.log("\n[ℹ️ chat 테마: 기본 데이터만 제공, 테마별 심층 섹션 없음]");
  }

  console.log(`\n📊 전체 프롬프트 길이: ${prompt.length} 글자`);
}

// 질문별 테마 감지 테스트
console.log("\n\n" + "=".repeat(80));
console.log("🔍 질문별 테마 감지 시뮬레이션");
console.log("=".repeat(80));

const testQuestions = [
  { q: "올해 연애운 어때요?", expected: "love" },
  { q: "결혼 시기 언제쯤일까요?", expected: "love" },
  { q: "이직하면 좋을까요?", expected: "career" },
  { q: "재물운은 어떤가요?", expected: "career" },
  { q: "건강 조심해야 할 거 있나요?", expected: "health" },
  { q: "부모님과의 관계는 어떤가요?", expected: "family" },
  { q: "오늘 운세 알려주세요", expected: "today" },
  { q: "이번 달 운세는?", expected: "month" },
  { q: "2026년 운세 어떤가요?", expected: "year" },
  { q: "내 인생 전체 흐름은?", expected: "life" },
  { q: "나는 어떤 사람인가요?", expected: "chat" },
];

function detectTheme(question) {
  if (/연애|사랑|결혼|배우자|남친|여친|애인|짝/.test(question)) return "love";
  if (/직업|이직|취업|돈|재물|사업|회사|월급/.test(question)) return "career";
  if (/건강|아프|병|체력|운동/.test(question)) return "health";
  if (/부모|가족|형제|자녀|엄마|아빠/.test(question)) return "family";
  if (/오늘|today/.test(question)) return "today";
  if (/이번.?달|월간|month/.test(question)) return "month";
  if (/올해|년|2026|year|연간/.test(question)) return "year";
  if (/인생|전체|평생|삶|운명/.test(question)) return "life";
  return "chat";
}

console.log("\n질문 | 예상 테마 | 감지된 테마 | 결과");
console.log("-".repeat(70));

let correct = 0;
for (const { q, expected } of testQuestions) {
  const detected = detectTheme(q);
  const result = detected === expected ? "✅" : "❌";
  if (detected === expected) correct++;
  console.log(`"${q.slice(0, 20).padEnd(20)}" | ${expected.padEnd(8)} | ${detected.padEnd(8)} | ${result}`);
}

console.log("-".repeat(70));
console.log(`정확도: ${correct}/${testQuestions.length} (${((correct/testQuestions.length)*100).toFixed(0)}%)`);

console.log("\n" + "=".repeat(80));
console.log("✅ 테스트 완료");
console.log("=".repeat(80));
