/**
 * Core Prompt Template Builder
 * 핵심 프롬프트 템플릿 빌더
 *
 * This module assembles all data into the final comprehensive prompt structure.
 * It creates a structured, multi-part prompt with clear sections for different
 * analysis types (Eastern, Western, Advanced).
 */

 

/**
 * Assembled prompt data for template generation
 */
export interface PromptData {
  // Basic info
  lang: string;
  theme: string;
  birthYear: number;
  currentAge: number;
  currentYear: number;
  currentMonth: number;

  // Eastern destiny
  dayMaster: { name: string; element: string };
  pillarText: string;
  strengthText: string;
  geokgukText: string;
  geokgukDesc: string;
  yongsinPrimary: string;
  yongsinSecondary: string;
  yongsinAvoid: string;
  tonggeunText: string;
  tuechulText: string;
  hoegukText: string;
  deukryeongText: string;
  sibsinDistText: string;
  sibsinDominant: string;
  sibsinMissing: string;
  relationshipText: string;
  careerText: string;
  chungText: string;
  hapText: string;
  samhapText: string;
  daeunText: string;
  currentAnnualElement: string;
  currentAnnualGanji: string;
  currentMonthlyElement: string;
  currentDailyGanji: string;
  lucky: string;
  unlucky: string;
  allDaeunText: string;
  futureAnnualList: string;
  futureMonthlyList: string;
  healthWeak: string;
  scoreText: string;
  jonggeokText: string;
  iljuText: string;
  gongmangText: string;

  // Western astrology
  ascendantSign: string;
  mcSign: string;
  sunSign: string;
  sunHouse: string;
  moonSign: string;
  moonHouse: string;
  mercurySign: string;
  mercuryHouse: string;
  venusSign: string;
  venusHouse: string;
  marsSign: string;
  marsHouse: string;
  jupiterSign: string;
  jupiterHouse: string;
  saturnSign: string;
  saturnHouse: string;
  uranusSign: string;
  uranusHouse: string;
  neptuneSign: string;
  neptuneHouse: string;
  plutoSign: string;
  plutoHouse: string;
  northNodeSign: string;
  northNodeHouse: string;
  elements: string;
  planetLines: string;
  houseLines: string;
  aspectLines: string;
  significantTransits: string;

  // Extra points & asteroids
  extraPointsText: string;
  asteroidsText: string;
  asteroidAspectsText: string;

  // Advanced astrology
  solarReturnText: string;
  lunarReturnText: string;
  progressionsText: string;
  draconicText: string;
  harmonicsText: string;
  harmonicChartsText: string;
  fixedStarsText: string;
  eclipsesText: string;
  electionalText: string;
  midpointsText: string;
  allMidpointsText: string;

  // Theme section
  themeSection: string;
}

/**
 * Assemble the comprehensive prompt template
 *
 * This function creates the final prompt structure with all data organized
 * into clear sections: Basic Info, Eastern Destiny, Western Astrology, and
 * Advanced Analysis, plus theme-specific sections.
 *
 * @param data - Assembled prompt data
 * @returns Formatted prompt string ready for AI consumption
 */
export function assemblePromptTemplate(data: PromptData): string {
  return `
[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${data.theme}]
Locale: ${data.lang}

📌 사용자 기본 정보
───────────────────────────────────────
생년: ${data.birthYear}년생
현재 만 나이: ${data.currentAge}세
오늘 날짜: ${data.currentYear}년 ${data.currentMonth}월

⚠️⚠️⚠️ CRITICAL DATA ACCURACY RULES ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════
1. 대운/세운/월운 등 운세 데이터는 반드시 아래 제공된 데이터만 사용하세요.
2. 절대로 대운 간지를 추측하거나 만들어내지 마세요!
3. "현재 대운" 정보는 아래 "현재 장기 흐름" 섹션을 정확히 참조하세요.
4. 질문에서 특정 나이나 시기를 물으면, 아래 "전체 장기 흐름" 목록에서 해당 나이 범위의 대운을 찾아 답변하세요.
5. 데이터에 없는 정보는 "해당 정보가 데이터에 없습니다"라고 솔직히 말하세요.

NEVER fabricate 대운/운세 data! ONLY use exact data from sections below!
═══════════════════════════════════════════════════════════════

════════════════════════════════════════════════════════════════
PART 1: 동양 운명 분석 (EASTERN DESTINY ANALYSIS)
════════════════════════════════════════════════════════════════

⚠️ 핵심 정체성 (CORE IDENTITY)
───────────────────────────────────────
Day Master: ${data.dayMaster.name} (${data.dayMaster.element})
Four Pillars: ${data.pillarText}
에너지 강도: ${data.strengthText}
성향 유형: ${data.geokgukText}
핵심 에너지: ${data.yongsinPrimary} | 보조: ${data.yongsinSecondary} | 주의: ${data.yongsinAvoid}
뿌리 연결: ${data.tonggeunText}
표출: ${data.tuechulText}
결합: ${data.hoegukText}
시기 조화: ${data.deukryeongText}

📊 에너지 분포 (Energy Distribution)
───────────────────────────────────────
분포: ${data.sibsinDistText || "-"}
주요 에너지: ${data.sibsinDominant}
부족 에너지: ${data.sibsinMissing}
인간관계 패턴: ${data.relationshipText}
직업 적성: ${data.careerText}

🔄 에너지 상호작용 (Energy Interactions)
───────────────────────────────────────
충돌: ${data.chungText}
조화: ${data.hapText}
삼중 조화: ${data.samhapText}

📅 현재 운세 흐름 (Current Luck)
───────────────────────────────────────
현재 장기 흐름: ${data.daeunText}
${data.currentYear}년 연간 흐름: ${data.currentAnnualElement} (${data.currentAnnualGanji})
${data.currentYear}년 ${data.currentMonth}월 월간 흐름: ${data.currentMonthlyElement}
오늘 일진: ${data.currentDailyGanji || "-"}
길한 에너지: ${data.lucky || "-"}
주의 에너지: ${data.unlucky || "-"}

🔮 미래 예측용 운세 데이터 (Future Predictions)
───────────────────────────────────────
[전체 장기 흐름 - 10년 주기]
  ${data.allDaeunText || "데이터 없음"}

[향후 5년 연간 운세]
  ${data.futureAnnualList || "데이터 없음"}

[향후 12개월 월간 흐름]
  ${data.futureMonthlyList || "데이터 없음"}

⚠️ 미래 예측 시 활용:
- "연애는 언제?" → 연간/월간 흐름에서 연애 에너지, 금성 트랜짓 시기 분석
- "결혼 시기?" → 장기 흐름 전환점, 7하우스 트랜짓, 파트너 에너지 활성화 시기
- "취업/이직?" → 연간 흐름에서 직업 에너지 활성화, MC 트랜짓 시기
- "재물운?" → 재물 에너지 활성화, 2하우스/8하우스 트랜짓

🏥 건강/종합 점수
───────────────────────────────────────
건강 취약점: ${data.healthWeak}
종합 점수: ${data.scoreText}
${data.jonggeokText ? `특수 성향: ${data.jonggeokText}` : ""}
${data.iljuText ? `핵심 성격: ${data.iljuText}` : ""}
${data.gongmangText ? `빈 에너지: ${data.gongmangText}` : ""}

════════════════════════════════════════════════════════════════
PART 2: 서양 점성술 (WESTERN ASTROLOGY)
════════════════════════════════════════════════════════════════

🌟 핵심 행성 배치 (Core Planets)
───────────────────────────────────────
ASC: ${data.ascendantSign} | MC: ${data.mcSign}
Planets: ${data.planetLines}
Houses: ${data.houseLines}
Major Aspects: ${data.aspectLines}
Current Transits: ${data.significantTransits || "-"}
Elements: ${data.elements || "-"}

🔮 Extra Points (특수점)
───────────────────────────────────────
${data.extraPointsText}

🌠 Asteroids (소행성)
───────────────────────────────────────
${data.asteroidsText}
Asteroid Aspects: ${data.asteroidAspectsText}

════════════════════════════════════════════════════════════════
PART 3: 고급 점성 분석 (ADVANCED ASTROLOGY)
════════════════════════════════════════════════════════════════

☀️ Solar Return (연간 차트 - ${data.currentYear})
───────────────────────────────────────
${data.solarReturnText}

🌙 Lunar Return (월간 차트)
───────────────────────────────────────
${data.lunarReturnText}

📈 Progressions (진행 차트)
───────────────────────────────────────
${data.progressionsText}

🐉 Draconic Chart (드라코닉 - 영혼 차트)
───────────────────────────────────────
${data.draconicText}

🎵 Harmonics (하모닉 분석)
───────────────────────────────────────
Profile: ${data.harmonicsText}
Charts: ${data.harmonicChartsText}

⭐ Fixed Stars (항성)
───────────────────────────────────────
${data.fixedStarsText}

🌑 Eclipses (일/월식 영향)
───────────────────────────────────────
${data.eclipsesText}

📆 Electional (택일 분석)
───────────────────────────────────────
${data.electionalText}

🎯 Midpoints (미드포인트)
───────────────────────────────────────
Key: ${data.midpointsText}
All: ${data.allMidpointsText}
${data.themeSection}
════════════════════════════════════════════════════════════════
`.trim();
}
