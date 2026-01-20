/**
 * Prompt Template Tests
 * Tests for the core prompt template builder
 */

import {
  assemblePromptTemplate,
  type PromptData,
} from "@/lib/destiny-map/prompt/fortune/base/prompt-template";

describe("assemblePromptTemplate", () => {
  const createMockPromptData = (overrides?: Partial<PromptData>): PromptData => ({
    lang: "ko",
    theme: "today",
    birthYear: 1990,
    currentAge: 35,
    currentYear: 2026,
    currentMonth: 1,

    dayMaster: { name: "甲木", element: "Wood" },
    pillarText: "甲子 乙丑 丙寅 丁卯",
    strengthText: "Strong (70%)",
    geokgukText: "정관격",
    geokgukDesc: "질서와 규율을 중시",
    yongsinPrimary: "火",
    yongsinSecondary: "土",
    yongsinAvoid: "水",
    tonggeunText: "子水에 통근",
    tuechulText: "丙火 투출",
    hoegukText: "三合 水局",
    deukryeongText: "득령",
    sibsinDistText: "비겁 30%, 식상 20%, 재성 20%, 관성 15%, 인성 15%",
    sibsinDominant: "비겁",
    sibsinMissing: "정재",
    relationshipText: "협력적",
    careerText: "리더십 중심",
    chungText: "子午 충",
    hapText: "子丑 합",
    samhapText: "申子辰 三合",
    daeunText: "현재 대운: 丙寅 (36-45세)",
    currentAnnualElement: "火",
    currentAnnualGanji: "丙午",
    currentMonthlyElement: "水",
    lucky: "火, 土",
    unlucky: "水",
    allDaeunText: "1-10세: 甲子 | 11-20세: 乙丑 | 21-30세: 丙寅",
    futureAnnualList: "2026: 丙午 | 2027: 丁未 | 2028: 戊申",
    futureMonthlyList: "1월: 庚寅 | 2월: 辛卯 | 3월: 壬辰",
    healthWeak: "간, 담",
    scoreText: "총합 78점",
    jonggeokText: "",
    iljuText: "갑자일주 - 지혜와 적응력",
    gongmangText: "辰巳",

    ascendantSign: "Aries",
    mcSign: "Capricorn",
    sunSign: "Leo",
    sunHouse: "5",
    moonSign: "Cancer",
    moonHouse: "4",
    mercurySign: "Virgo",
    mercuryHouse: "6",
    venusSign: "Libra",
    venusHouse: "7",
    marsSign: "Scorpio",
    marsHouse: "8",
    jupiterSign: "Sagittarius",
    jupiterHouse: "9",
    saturnSign: "Capricorn",
    saturnHouse: "10",
    uranusSign: "Aquarius",
    uranusHouse: "11",
    neptuneSign: "Pisces",
    neptuneHouse: "12",
    plutoSign: "Scorpio",
    plutoHouse: "8",
    northNodeSign: "Gemini",
    northNodeHouse: "3",
    elements: "Fire 4, Earth 3, Air 2, Water 3",
    planetLines: "Sun in Leo, Moon in Cancer, Mercury in Virgo",
    houseLines: "1st: Aries, 7th: Libra, 10th: Capricorn",
    aspectLines: "Sun trine Moon, Venus square Mars",
    significantTransits: "Saturn conjunct MC",

    extraPointsText: "Part of Fortune: 15° Taurus (House 2)",
    asteroidsText: "Ceres: 10° Cancer, Juno: 22° Libra",
    asteroidAspectsText: "Ceres trine Moon",

    solarReturnText: "Solar Return ASC: Scorpio, Sun in House 9",
    lunarReturnText: "Lunar Return Moon: 5° Pisces",
    progressionsText: "Progressed Sun: 12° Virgo",
    draconicText: "Draconic Sun: 5° Capricorn",
    harmonicsText: "H7 strong, H9 active",
    harmonicChartsText: "7th Harmonic Sun conjunct Venus",
    fixedStarsText: "Regulus conjunct MC",
    eclipsesText: "Lunar Eclipse 15° Scorpio impacts 8th house",
    electionalText: "Good day for new beginnings",
    midpointsText: "Sun/Moon = 10° Leo",
    allMidpointsText: "Sun/Moon, Venus/Mars, Mercury/Jupiter",

    themeSection: "\n\n💫 오늘의 운세 특별 섹션\n오늘은 좋은 에너지가 흐릅니다.",
    ...overrides,
  });

  it("should assemble a complete prompt template", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("[COMPREHENSIVE DATA SNAPSHOT v3.1 - today]");
    expect(result).toContain("Locale: ko");
  });

  it("should include basic user info section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("생년: 1990년생");
    expect(result).toContain("현재 만 나이: 35세");
    expect(result).toContain("오늘 날짜: 2026년 1월");
  });

  it("should include Eastern destiny analysis section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("PART 1: 동양 운명 분석 (EASTERN DESTINY ANALYSIS)");
    expect(result).toContain("Day Master: 甲木 (Wood)");
    expect(result).toContain("Four Pillars: 甲子 乙丑 丙寅 丁卯");
    expect(result).toContain("성향 유형: 정관격");
    expect(result).toContain("핵심 에너지: 火 | 보조: 土 | 주의: 水");
  });

  it("should include energy distribution section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("📊 에너지 분포 (Energy Distribution)");
    expect(result).toContain("주요 에너지: 비겁");
    expect(result).toContain("부족 에너지: 정재");
  });

  it("should include energy interactions section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🔄 에너지 상호작용 (Energy Interactions)");
    expect(result).toContain("충돌: 子午 충");
    expect(result).toContain("조화: 子丑 합");
    expect(result).toContain("삼중 조화: 申子辰 三合");
  });

  it("should include current luck section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("📅 현재 운세 흐름 (Current Luck)");
    expect(result).toContain("현재 장기 흐름: 현재 대운: 丙寅 (36-45세)");
    expect(result).toContain("2026년 연간 흐름: 火 (丙午)");
    expect(result).toContain("길한 에너지: 火, 土");
  });

  it("should include future predictions section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🔮 미래 예측용 운세 데이터 (Future Predictions)");
    expect(result).toContain("[전체 장기 흐름 - 10년 주기]");
    expect(result).toContain("1-10세: 甲子 | 11-20세: 乙丑");
    expect(result).toContain("[향후 5년 연간 운세]");
    expect(result).toContain("2026: 丙午 | 2027: 丁未");
  });

  it("should include health section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🏥 건강/종합 점수");
    expect(result).toContain("건강 취약점: 간, 담");
    expect(result).toContain("종합 점수: 총합 78점");
  });

  it("should include Western astrology section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("PART 2: 서양 점성술 (WESTERN ASTROLOGY)");
    expect(result).toContain("🌟 핵심 행성 배치 (Core Planets)");
    expect(result).toContain("ASC: Aries | MC: Capricorn");
    expect(result).toContain("Sun: Leo (H5)");
    expect(result).toContain("Moon: Cancer (H4)");
  });

  it("should include all planet positions", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("Mercury: Virgo (H6)");
    expect(result).toContain("Venus: Libra (H7)");
    expect(result).toContain("Mars: Scorpio (H8)");
    expect(result).toContain("Jupiter: Sagittarius (H9)");
    expect(result).toContain("Saturn: Capricorn (H10)");
    expect(result).toContain("Uranus: Aquarius (H11)");
    expect(result).toContain("Neptune: Pisces (H12)");
    expect(result).toContain("Pluto: Scorpio (H8)");
    expect(result).toContain("North Node: Gemini (H3)");
  });

  it("should include extra points and asteroids", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🔮 Extra Points (특수점)");
    expect(result).toContain("Part of Fortune: 15° Taurus");
    expect(result).toContain("🌠 Asteroids (소행성)");
    expect(result).toContain("Ceres: 10° Cancer");
  });

  it("should include advanced astrology section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("PART 3: 고급 점성 분석 (ADVANCED ASTROLOGY)");
    expect(result).toContain("☀️ Solar Return");
    expect(result).toContain("🌙 Lunar Return");
    expect(result).toContain("📈 Progressions");
    expect(result).toContain("🐉 Draconic Chart");
  });

  it("should include harmonics and fixed stars", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🎵 Harmonics (하모닉 분석)");
    expect(result).toContain("Profile: H7 strong, H9 active");
    expect(result).toContain("⭐ Fixed Stars (항성)");
    expect(result).toContain("Regulus conjunct MC");
  });

  it("should include eclipses and electional", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🌑 Eclipses (일/월식 영향)");
    expect(result).toContain("Lunar Eclipse 15° Scorpio");
    expect(result).toContain("📆 Electional (택일 분석)");
    expect(result).toContain("Good day for new beginnings");
  });

  it("should include midpoints section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("🎯 Midpoints (미드포인트)");
    expect(result).toContain("Key: Sun/Moon = 10° Leo");
    expect(result).toContain("All: Sun/Moon, Venus/Mars");
  });

  it("should include theme section", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("💫 오늘의 운세 특별 섹션");
    expect(result).toContain("오늘은 좋은 에너지가 흐릅니다");
  });

  it("should handle missing optional data with defaults", () => {
    const data = createMockPromptData({
      sibsinDistText: "",
      lucky: "",
      unlucky: "",
      allDaeunText: "",
      futureAnnualList: "",
      futureMonthlyList: "",
      elements: "",
      significantTransits: "",
      jonggeokText: "",
      iljuText: "",
      gongmangText: "",
    });
    const result = assemblePromptTemplate(data);

    expect(result).toContain("분포: -");
    expect(result).toContain("길한 에너지: -");
    expect(result).toContain("Elements: -");
    expect(result).toContain("Current Transits: -");
    expect(result).not.toContain("특수 성향:");
    expect(result).not.toContain("핵심 성격:");
    expect(result).not.toContain("빈 에너지:");
  });

  it("should include jonggeok, ilju, gongmang when provided", () => {
    const data = createMockPromptData({
      jonggeokText: "종격",
      iljuText: "갑자일주",
      gongmangText: "辰巳",
    });
    const result = assemblePromptTemplate(data);

    expect(result).toContain("특수 성향: 종격");
    expect(result).toContain("핵심 성격: 갑자일주");
    expect(result).toContain("빈 에너지: 辰巳");
  });

  it("should include data accuracy warning", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).toContain("⚠️⚠️⚠️ CRITICAL DATA ACCURACY RULES ⚠️⚠️⚠️");
    expect(result).toContain("대운/세운/월운 등 운세 데이터는 반드시 아래 제공된 데이터만 사용하세요");
    expect(result).toContain("NEVER fabricate 대운/운세 data!");
  });

  it("should handle different themes", () => {
    const themes = ["today", "love", "career", "health", "newyear"];

    for (const theme of themes) {
      const data = createMockPromptData({ theme });
      const result = assemblePromptTemplate(data);

      expect(result).toContain(`[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${theme}]`);
    }
  });

  it("should handle different languages", () => {
    const data = createMockPromptData({ lang: "en" });
    const result = assemblePromptTemplate(data);

    expect(result).toContain("Locale: en");
  });

  it("should trim the output", () => {
    const data = createMockPromptData();
    const result = assemblePromptTemplate(data);

    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
  });
});