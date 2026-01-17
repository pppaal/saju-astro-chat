/**
 * 테마별 프롬프트 상세 출력 테스트
 */

// 실제 buildAllDataPrompt 함수의 핵심 로직을 시뮬레이션
function buildDetailedPrompt(theme, data) {
  const { saju, astrology, extraPoints, asteroids, progressions, solarReturn, lunarReturn } = data;
  const { pillars, dayMaster, unse, sinsal, advancedAnalysis } = saju;
  const { planets, houses, ascendant, mc, transits } = astrology;

  const getPlanet = (name) => planets.find(p => p.name === name);
  const sun = getPlanet("Sun");
  const moon = getPlanet("Moon");
  const venus = getPlanet("Venus");
  const mars = getPlanet("Mars");
  const jupiter = getPlanet("Jupiter");
  const saturn = getPlanet("Saturn");
  const northNode = getPlanet("North Node");

  const currentYear = 2026;
  const currentAge = currentYear - 1995;

  // 대운 찾기
  const currentDaeun = unse.daeun.find(d => currentAge >= d.age && currentAge <= d.age + 9);

  // 십신 분포
  const sibsinCount = advancedAnalysis.sibsin.count;
  const officialStar = (sibsinCount?.["정관"] ?? 0) + (sibsinCount?.["편관"] ?? 0);
  const wealthStar = (sibsinCount?.["정재"] ?? 0) + (sibsinCount?.["편재"] ?? 0);
  const outputStar = (sibsinCount?.["식신"] ?? 0) + (sibsinCount?.["상관"] ?? 0);

  // 트랜짓 텍스트
  const transitText = transits.map(t =>
    `${t.transitPlanet}-${t.aspectType}-${t.natalPoint}`
  ).join("; ");

  // 프로그레션 텍스트
  const progText = progressions?.secondary
    ? `P.Sun: ${progressions.secondary.summary.keySigns.sun}, P.Moon: ${progressions.secondary.summary.keySigns.moon} (Phase: ${progressions.secondary.moonPhase.phase})`
    : "-";

  // ========== 공통 기본 데이터 ==========
  let output = `
${"═".repeat(70)}
📌 테마: ${theme.toUpperCase()} - 프롬프트 상세 출력
${"═".repeat(70)}

[PART 1: 사주팔자 기본 데이터]
• 일주(日主): ${dayMaster.name} (${dayMaster.element})
• 사주 팔자: ${pillars.year.heavenlyStem.name}${pillars.year.earthlyBranch.name} / ${pillars.month.heavenlyStem.name}${pillars.month.earthlyBranch.name} / ${pillars.day.heavenlyStem.name}${pillars.day.earthlyBranch.name} / ${pillars.time.heavenlyStem.name}${pillars.time.earthlyBranch.name}
• 격국(格局): ${advancedAnalysis.extended.geokguk.type} - ${advancedAnalysis.extended.geokguk.description}
• 용신/기신: ${advancedAnalysis.extended.yongsin.primary} / ${advancedAnalysis.extended.yongsin.avoid}
• 십신 분포: ${Object.entries(sibsinCount).filter(([,v]) => v > 0).map(([k,v]) => `${k}(${v})`).join(", ")}
• 신살: 길신(${sinsal.luckyList.map(x => x.name).join(", ")}) | 흉신(${sinsal.unluckyList.map(x => x.name).join(", ")})
• 현재 대운(${currentAge}세): ${currentDaeun ? `${currentDaeun.age}-${currentDaeun.age+9}세 ${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch}` : "-"}

[PART 2: 점성술 기본 데이터]
• ASC: ${ascendant.sign} | MC: ${mc.sign}
• Sun: ${sun.sign} (H${sun.house}) | Moon: ${moon.sign} (H${moon.house})
• Venus: ${venus.sign} (H${venus.house}) | Mars: ${mars.sign} (H${mars.house})
• Jupiter: ${jupiter.sign} (H${jupiter.house}) | Saturn: ${saturn.sign} (H${saturn.house})
• North Node: ${northNode.sign} (H${northNode.house})
• Current Transits: ${transitText}

[PART 3: 고급 점성 데이터]
• Chiron: ${extraPoints.chiron.sign} (H${extraPoints.chiron.house})
• Juno: ${asteroids.juno.sign} (H${asteroids.juno.house})
• Solar Return: ASC ${solarReturn.summary.ascSign}, Sun H${solarReturn.summary.sunHouse}
• Lunar Return: ASC ${lunarReturn.summary.ascSign}
• Progressions: ${progText}
`;

  // ========== 테마별 심층 섹션 ==========
  if (theme === "love") {
    output += `
${"─".repeat(70)}
💕 [LOVE 테마 심층 분석 - AI가 받는 추가 데이터]
${"─".repeat(70)}

[사주 연애/배우자 분석]
• 배우자궁(일지): ${pillars.day.earthlyBranch.name} (${pillars.day.earthlyBranch.element})
• 정재(남성-아내): ${sibsinCount?.["정재"] ?? 0}개 | 편재(여자친구): ${sibsinCount?.["편재"] ?? 0}개
• 정관(여성-남편): ${sibsinCount?.["정관"] ?? 0}개 | 편관(남자친구): ${sibsinCount?.["편관"] ?? 0}개
• 도화살: ${sinsal.luckyList.some(x => x.name.includes("도화")) ? "✅ 있음 → 이성에게 인기" : "없음"}

[점성술 연애 분석]
• Venus(금성): ${venus.sign} H${venus.house} → 연애 스타일, 끌리는 타입
• Mars(화성): ${mars.sign} H${mars.house} → 성적 매력, 추구 방식
• 5하우스(연애): ${houses[4].sign} → 로맨스/즐거움
• 7하우스(결혼): ${houses[6].sign} → 배우자 특성
• Juno(결혼): ${asteroids.juno.sign} H${asteroids.juno.house} → 이상적 배우자상

[AI 해석 포인트]
→ 배우자궁 오행(${pillars.day.earthlyBranch.element}) = 배우자 기질
→ 금성 사인(${venus.sign}) = 끌리는 타입
→ 7하우스 사인(${houses[6].sign}) = 배우자 첫인상
→ 정관/정재 많으면 → 진지한 교제, 조기 결혼
→ 도화+편관/편재 → 연애는 많으나 결혼 신중
`;
  }

  if (theme === "career") {
    output += `
${"─".repeat(70)}
💼 [CAREER 테마 심층 분석 - AI가 받는 추가 데이터]
${"─".repeat(70)}

[사주 직업 분석]
• 격국(格局): ${advancedAnalysis.extended.geokguk.type}
• 용신(用神): ${advancedAnalysis.extended.yongsin.primary} (보조: ${advancedAnalysis.extended.yongsin.secondary})
• 관성(官星) 직장운: 정관 ${sibsinCount?.["정관"] ?? 0}개 + 편관 ${sibsinCount?.["편관"] ?? 0}개 = 총 ${officialStar}개
• 재성(財星) 재물운: 정재 ${sibsinCount?.["정재"] ?? 0}개 + 편재 ${sibsinCount?.["편재"] ?? 0}개 = 총 ${wealthStar}개
• 식상(食傷) 창의력: 식신 ${sibsinCount?.["식신"] ?? 0}개 + 상관 ${sibsinCount?.["상관"] ?? 0}개 = 총 ${outputStar}개

[점성술 직업 분석]
• MC(천정): ${mc.sign} → 커리어 방향/사회적 이미지
• 10th House: ${houses[9].sign} → 직업적 성공 영역
• 6th House: ${houses[5].sign} → 일하는 방식
• 2nd House: ${houses[1].sign} → 돈 버는 방식
• Saturn(토성): ${saturn.sign} H${saturn.house} → 책임/장기목표
• Jupiter(목성): ${jupiter.sign} H${jupiter.house} → 기회/행운

[AI 해석 포인트]
→ 관성 강함(${officialStar}개) → ${officialStar >= 3 ? "조직 생활 유리" : "프리랜서/창업 고려"}
→ 재성 강함(${wealthStar}개) → ${wealthStar >= 2 ? "사업/투자 능력" : "안정적 수입 추구"}
→ 식상 강함(${outputStar}개) → ${outputStar >= 2 ? "창의직/예술/기술직 적합" : "실무/관리직 적합"}
→ MC ${mc.sign} = 사회에서 보이고 싶은 이미지
`;
  }

  if (theme === "year") {
    output += `
${"─".repeat(70)}
🗓️ [YEAR 테마 심층 분석 - AI가 받는 추가 데이터]
${"─".repeat(70)}

[사주 세운 + 대운 분석]
• 본인 일간: ${dayMaster.name} (${dayMaster.element})
• 현재 대운(10년 단위): ${currentDaeun ? `${currentDaeun.age}-${currentDaeun.age+9}세 ${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch}` : "-"}
• 용신(用神): ${advancedAnalysis.extended.yongsin.primary} → 이 오행 세운이면 좋은 해
• 기신(忌神): ${advancedAnalysis.extended.yongsin.avoid} → 이 오행 세운이면 주의

[점성술 Solar Return + Progressions]
• Solar Return ASC: ${solarReturn.summary.ascSign} → 올해의 페르소나
• SR Sun House: ${solarReturn.summary.sunHouse} → 올해 에너지 집중 영역
• SR Theme: ${solarReturn.summary.theme}
• Progressed Sun: ${progressions.secondary.summary.keySigns.sun} → 현재 자아 성장 방향
• Progressed Moon: ${progressions.secondary.summary.keySigns.moon} → 현재 감정적 초점
• Progressed Moon Phase: ${progressions.secondary.moonPhase.phase} → 29.5년 주기 중 위치

[AI 해석 포인트]
→ 세운 = 용신(${advancedAnalysis.extended.yongsin.primary}) → 성장/확장/기회의 해
→ 세운 = 기신(${advancedAnalysis.extended.yongsin.avoid}) → 내면 성장/준비의 해
→ SR Sun ${solarReturn.summary.sunHouse}하우스 → 올해 ${solarReturn.summary.sunHouse === 2 ? "재물/자기가치" : "집중 영역"}
→ P.Moon Phase ${progressions.secondary.moonPhase.phase} → 인생 주기 상 현재 단계
`;
  }

  if (theme === "life") {
    output += `
${"─".repeat(70)}
🌟 [LIFE 테마 심층 분석 - AI가 받는 추가 데이터]
${"─".repeat(70)}

[대운(大運) 인생 흐름]
${unse.daeun.map(d => {
  const isCurrent = currentAge >= d.age && currentAge <= d.age + 9;
  return `• ${d.age}-${d.age+9}세: ${d.heavenlyStem}${d.earthlyBranch} ${isCurrent ? "★현재★" : ""}`;
}).join("\n")}

[사주 핵심 운명 코드]
• 일주(日主): ${dayMaster.name} (${dayMaster.element}) - 본질적 자아
• 격국(格局): ${advancedAnalysis.extended.geokguk.type} - 성향 유형
• 용신(用神): ${advancedAnalysis.extended.yongsin.primary} - 필요한 에너지
• 기신(忌神): ${advancedAnalysis.extended.yongsin.avoid} - 조심할 에너지

[점성술 영혼 분석]
• North Node: ${northNode.sign} (H${northNode.house}) → 이번 생의 목표
• Chiron: ${extraPoints.chiron.sign} (H${extraPoints.chiron.house}) → 상처와 치유 영역

[인생 주요 전환점]
• 토성 회귀(29세, 58세): 인생 성숙의 관문
• 카이론 회귀(50세): 상처 치유와 지혜의 시기
• 대운 전환기: 삶의 테마가 바뀌는 시기

[AI 해석 포인트]
→ 용신(${advancedAnalysis.extended.yongsin.primary}) 대운 = 발전의 10년
→ 기신(${advancedAnalysis.extended.yongsin.avoid}) 대운 = 성찰의 10년
→ North Node H${northNode.house} = 이번 생 발전시켜야 할 영역
→ Chiron H${extraPoints.chiron.house} = 상처를 통해 타인을 치유할 영역
`;
  }

  // ========== 동서양 융합 가이드 ==========
  output += `
${"─".repeat(70)}
🔗 [동서양 융합 해석 가이드 - 모든 테마 공통]
${"─".repeat(70)}

[사주-점성술 대응 관계]
• 일간(${dayMaster.name}) ↔ 태양(${sun.sign}): 핵심 정체성 융합
• 격국(${advancedAnalysis.extended.geokguk.type}) ↔ ASC(${ascendant.sign}): 성향/페르소나
• 용신(${advancedAnalysis.extended.yongsin.primary}) ↔ 조화 행성: 필요한 에너지

[현재 트랜짓 해석]
${transits.map(t => `• ${t.transitPlanet}-${t.aspectType}-${t.natalPoint}: ${
  t.aspectType === "trine" ? "순조로운 흐름, 기회" :
  t.aspectType === "square" ? "도전/긴장, 성장 동력" :
  t.aspectType === "conjunction" ? "강력한 활성화" : "영향"
}`).join("\n")}

[질문 유형별 핵심 분석 포인트]
• 연애/결혼 → 사주: 배우자궁, 정재/정관, 도화살 | 점성: Venus, 7th House, Juno
• 직업/재물 → 사주: 격국, 관성/재성 분포 | 점성: MC, 10th House, Saturn
• 건강 → 사주: 오행 균형, 부족 오행 | 점성: 6th House, Chiron
• 타이밍 → 사주: 대운/세운 흐름 | 점성: 트랜짓, 프로그레션
`;

  return output;
}

// 테스트 데이터
const testData = {
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
        { age: 43, heavenlyStem: "癸", earthlyBranch: "酉" },
        { age: 53, heavenlyStem: "壬", earthlyBranch: "申" },
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
        count: { 비견: 1, 겁재: 0, 식신: 2, 상관: 1, 편재: 1, 정재: 0, 편관: 0, 정관: 1, 편인: 1, 정인: 1 },
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
    transits: [
      { transitPlanet: "Jupiter", natalPoint: "Sun", aspectType: "trine" },
      { transitPlanet: "Saturn", natalPoint: "Moon", aspectType: "square" },
    ],
  },
  extraPoints: {
    chiron: { sign: "Virgo", house: 11 },
  },
  asteroids: {
    juno: { sign: "Sagittarius", house: 2 },
  },
  solarReturn: {
    summary: { ascSign: "Capricorn", sunHouse: 2, theme: "재물과 자기가치에 집중" },
  },
  lunarReturn: {
    summary: { ascSign: "Libra" },
  },
  progressions: {
    secondary: {
      summary: { keySigns: { sun: "Pisces", moon: "Sagittarius" } },
      moonPhase: { phase: "Gibbous" },
    },
  },
};

// 주요 테마 출력
const themesToTest = ["love", "career", "year", "life"];

for (const theme of themesToTest) {
  const output = buildDetailedPrompt(theme, testData);
  console.log(output);
  console.log("\n");
}
