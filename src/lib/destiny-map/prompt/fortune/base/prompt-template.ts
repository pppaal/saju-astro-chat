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
  const isKo = data.lang === 'ko'

  // 모든 라벨 / 섹션 헤더 / inline 텍스트를 lang별 분기. 사주 개념 자체
  // (격국 / 용신 / 신살 / 干支)는 통째로 한자/한글 그대로 — 직역하면
  // 의미 손실이 큼. 영어 사용자에겐 LLM이 자연어로 풀어 설명하도록
  // counselorVoiceBase의 "weave" 룰이 처리.
  const L = isKo
    ? {
        // Basic info
        basicInfo: '📌 사용자 기본 정보',
        bornYear: '생년',
        bornYearSuffix: '년생',
        currentAgeLabel: '현재 만 나이',
        ageSuffix: '세',
        todayLabel: '오늘 날짜',
        // Accuracy rules
        rule1:
          '1. 대운/세운/월운 등 운세 데이터는 반드시 아래 제공된 데이터만 사용하세요.',
        rule2: '2. 절대로 대운 간지를 추측하거나 만들어내지 마세요!',
        rule3: '3. "현재 대운" 정보는 아래 "현재 장기 흐름" 섹션을 정확히 참조하세요.',
        rule4: '4. 질문에서 특정 나이나 시기를 물으면, 아래 "전체 장기 흐름" 목록에서 해당 나이 범위의 대운을 찾아 답변하세요.',
        rule5: '5. 데이터에 없는 정보는 "해당 정보가 데이터에 없습니다"라고 솔직히 말하세요.',
        // Part headers
        part1Header: 'PART 1: 동양 운명 분석 (EASTERN DESTINY ANALYSIS)',
        part2Header: 'PART 2: 서양 점성술 (WESTERN ASTROLOGY)',
        part3Header: 'PART 3: 고급 점성 분석 (ADVANCED ASTROLOGY)',
        // Eastern subsections
        coreIdentity: '⚠️ 핵심 정체성 (CORE IDENTITY)',
        strength: '에너지 강도',
        geokguk: '성향 유형',
        yongsinCore: '핵심 에너지',
        yongsinAux: '보조',
        yongsinAvoid: '주의',
        tonggeun: '뿌리 연결',
        tuechul: '표출',
        hoeguk: '결합',
        deukryeong: '시기 조화',
        energyDist: '📊 에너지 분포 (Energy Distribution)',
        sibsinDist: '분포',
        sibsinDominant: '주요 에너지',
        sibsinMissing: '부족 에너지',
        relationship: '인간관계 패턴',
        career: '직업 적성',
        interactions: '🔄 에너지 상호작용 (Energy Interactions)',
        chung: '충돌',
        hap: '조화',
        samhap: '삼중 조화',
        currentLuck: '📅 현재 운세 흐름 (Current Luck)',
        currentDaeun: '현재 장기 흐름',
        annualFlow: '연간 흐름',
        monthlyFlow: '월간 흐름',
        todayIljin: '오늘 일진',
        lucky: '길한 에너지',
        unlucky: '주의 에너지',
        futureData: '🔮 미래 예측용 운세 데이터 (Future Predictions)',
        allDaeunHeader: '[전체 장기 흐름 - 10년 주기]',
        futureAnnualHeader: '[향후 5년 연간 운세]',
        futureMonthlyHeader: '[향후 12개월 월간 흐름]',
        noData: '데이터 없음',
        futureGuide: '⚠️ 미래 예측 시 활용:',
        futureExamples: [
          '- "연애는 언제?" → 연간/월간 흐름에서 연애 에너지, 금성 트랜짓 시기 분석',
          '- "결혼 시기?" → 장기 흐름 전환점, 7하우스 트랜짓, 파트너 에너지 활성화 시기',
          '- "취업/이직?" → 연간 흐름에서 직업 에너지 활성화, MC 트랜짓 시기',
          '- "재물운?" → 재물 에너지 활성화, 2하우스/8하우스 트랜짓',
        ].join('\n'),
        healthScore: '🏥 건강/종합 점수',
        healthWeak: '건강 취약점',
        scoreLabel: '종합 점수',
        jonggeok: '특수 성향',
        ilju: '핵심 성격',
        gongmang: '빈 에너지',
        // Astro
        corePlanets: '🌟 핵심 행성 배치 (Core Planets)',
        currentTransits: 'Current Transits',
        extraPoints: '🔮 Extra Points (특수점)',
        asteroids: '🌠 Asteroids (소행성)',
        asteroidAspects: 'Asteroid Aspects',
        solarReturn: '☀️ Solar Return (연간 차트',
        lunarReturn: '🌙 Lunar Return (월간 차트)',
        progressions: '📈 Progressions (진행 차트)',
        draconic: '🐉 Draconic Chart (드라코닉 - 영혼 차트)',
        harmonics: '🎵 Harmonics (하모닉 분석)',
        harmonicsProfile: 'Profile',
        harmonicsCharts: 'Charts',
        fixedStars: '⭐ Fixed Stars (항성)',
        eclipses: '🌑 Eclipses (일/월식 영향)',
        electional: '📆 Electional (택일 분석)',
        midpoints: '🎯 Midpoints (미드포인트)',
        midpointsKey: 'Key',
        midpointsAll: 'All',
      }
    : {
        basicInfo: '📌 BASIC USER INFO',
        bornYear: 'Birth year',
        bornYearSuffix: '',
        currentAgeLabel: 'Current age',
        ageSuffix: ' yrs',
        todayLabel: "Today's date",
        rule1:
          '1. Luck-cycle data (daeun/yearly/monthly) MUST come only from the data provided below.',
        rule2: '2. NEVER guess or fabricate daeun ganji.',
        rule3:
          '3. For "current daeun" info, refer exactly to the "Current Daeun" section below.',
        rule4:
          '4. When the question asks about a specific age or period, look up the matching cycle in the "Full Life Daeun" list below.',
        rule5:
          '5. If data is not present, say plainly "that detail is not in the data" instead of guessing.',
        part1Header: 'PART 1: EASTERN DESTINY ANALYSIS (사주 / 四柱命理)',
        part2Header: 'PART 2: WESTERN ASTROLOGY',
        part3Header: 'PART 3: ADVANCED ASTROLOGY',
        coreIdentity: '⚠️ CORE IDENTITY',
        strength: 'Day Master Strength',
        geokguk: 'Structural Pattern (격국 / geokguk)',
        yongsinCore: 'Core Yongsin (favorable element)',
        yongsinAux: 'Auxiliary',
        yongsinAvoid: 'Avoid',
        tonggeun: 'Root Connection (통근)',
        tuechul: 'Expression (투출)',
        hoeguk: 'Branch Combinations (회국)',
        deukryeong: 'Seasonal Alignment (득령)',
        energyDist: '📊 Energy Distribution',
        sibsinDist: 'Sibsin Distribution',
        sibsinDominant: 'Dominant Energy',
        sibsinMissing: 'Missing Energy',
        relationship: 'Relationship Pattern',
        career: 'Career Aptitude',
        interactions: '🔄 Pillar Interactions',
        chung: 'Clash (충)',
        hap: 'Combination (합)',
        samhap: 'Triple Harmony (삼합)',
        currentLuck: '📅 Current Luck Flow',
        currentDaeun: 'Current Daeun (10y cycle)',
        annualFlow: 'annual flow',
        monthlyFlow: 'monthly flow',
        todayIljin: "Today's pillar (일진)",
        lucky: 'Favorable Shinsal',
        unlucky: 'Cautionary Shinsal',
        futureData: '🔮 FUTURE PROJECTION DATA',
        allDaeunHeader: '[Full Life Daeun — 10y cycles]',
        futureAnnualHeader: '[Next 5 yrs — Annual]',
        futureMonthlyHeader: '[Next 12 months — Monthly]',
        noData: 'no data',
        futureGuide: '⚠️ How to use future data:',
        futureExamples: [
          '- "When will I find love?" → annual/monthly flow + Venus transits',
          '- "When will I marry?" → daeun turning point + 7th-house transits + partner-energy activation',
          '- "Career change / new job?" → annual flow + MC transits',
          '- "Wealth?" → wealth-energy activation + 2nd/8th-house transits',
        ].join('\n'),
        healthScore: '🏥 Health & Overall Score',
        healthWeak: 'Health Vulnerability',
        scoreLabel: 'Overall Score',
        jonggeok: 'Special Pattern',
        ilju: 'Day-pillar Personality',
        gongmang: 'Empty Branches (공망 / gongmang)',
        corePlanets: '🌟 Core Planet Placements',
        currentTransits: 'Current Transits',
        extraPoints: '🔮 Extra Points',
        asteroids: '🌠 Asteroids',
        asteroidAspects: 'Asteroid Aspects',
        solarReturn: '☀️ Solar Return (annual chart',
        lunarReturn: '🌙 Lunar Return (monthly chart)',
        progressions: '📈 Progressions',
        draconic: '🐉 Draconic Chart (soul chart)',
        harmonics: '🎵 Harmonics',
        harmonicsProfile: 'Profile',
        harmonicsCharts: 'Charts',
        fixedStars: '⭐ Fixed Stars',
        eclipses: '🌑 Eclipses',
        electional: '📆 Electional',
        midpoints: '🎯 Midpoints',
        midpointsKey: 'Key',
        midpointsAll: 'All',
      }

  const accuracyTail = isKo
    ? 'NEVER fabricate 대운/운세 data! ONLY use exact data from sections below!'
    : 'NEVER fabricate daeun/luck-cycle data! ONLY use exact data from sections below!'

  return `
[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${data.theme}]
Locale: ${data.lang}

${L.basicInfo}
───────────────────────────────────────
${L.bornYear}: ${data.birthYear}${L.bornYearSuffix}
${L.currentAgeLabel}: ${data.currentAge}${L.ageSuffix}
${L.todayLabel}: ${data.currentYear}-${String(data.currentMonth).padStart(2, '0')}

⚠️⚠️⚠️ CRITICAL DATA ACCURACY RULES ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════
${L.rule1}
${L.rule2}
${L.rule3}
${L.rule4}
${L.rule5}

${accuracyTail}
═══════════════════════════════════════════════════════════════

════════════════════════════════════════════════════════════════
${L.part1Header}
════════════════════════════════════════════════════════════════

${L.coreIdentity}
───────────────────────────────────────
Day Master: ${data.dayMaster.name} (${data.dayMaster.element})
Four Pillars: ${data.pillarText}
${L.strength}: ${data.strengthText}
${L.geokguk}: ${data.geokgukText}
${L.yongsinCore}: ${data.yongsinPrimary} | ${L.yongsinAux}: ${data.yongsinSecondary} | ${L.yongsinAvoid}: ${data.yongsinAvoid}
${L.tonggeun}: ${data.tonggeunText}
${L.tuechul}: ${data.tuechulText}
${L.hoeguk}: ${data.hoegukText}
${L.deukryeong}: ${data.deukryeongText}

${L.energyDist}
───────────────────────────────────────
${L.sibsinDist}: ${data.sibsinDistText || "-"}
${L.sibsinDominant}: ${data.sibsinDominant}
${L.sibsinMissing}: ${data.sibsinMissing}
${L.relationship}: ${data.relationshipText}
${L.career}: ${data.careerText}

${L.interactions}
───────────────────────────────────────
${L.chung}: ${data.chungText}
${L.hap}: ${data.hapText}
${L.samhap}: ${data.samhapText}

${L.currentLuck}
───────────────────────────────────────
${L.currentDaeun}: ${data.daeunText}
${data.currentYear} ${L.annualFlow}: ${data.currentAnnualElement} (${data.currentAnnualGanji})
${data.currentYear}-${String(data.currentMonth).padStart(2, '0')} ${L.monthlyFlow}: ${data.currentMonthlyElement}
${L.todayIljin}: ${data.currentDailyGanji || "-"}
${L.lucky}: ${data.lucky || "-"}
${L.unlucky}: ${data.unlucky || "-"}

${L.futureData}
───────────────────────────────────────
${L.allDaeunHeader}
  ${data.allDaeunText || L.noData}

${L.futureAnnualHeader}
  ${data.futureAnnualList || L.noData}

${L.futureMonthlyHeader}
  ${data.futureMonthlyList || L.noData}

${L.futureGuide}
${L.futureExamples}

${L.healthScore}
───────────────────────────────────────
${L.healthWeak}: ${data.healthWeak}
${L.scoreLabel}: ${data.scoreText}
${data.jonggeokText ? `${L.jonggeok}: ${data.jonggeokText}` : ""}
${data.iljuText ? `${L.ilju}: ${data.iljuText}` : ""}
${data.gongmangText ? `${L.gongmang}: ${data.gongmangText}` : ""}

════════════════════════════════════════════════════════════════
${L.part2Header}
════════════════════════════════════════════════════════════════

${L.corePlanets}
───────────────────────────────────────
ASC: ${data.ascendantSign} | MC: ${data.mcSign}
Planets: ${data.planetLines}
Houses: ${data.houseLines}
Major Aspects: ${data.aspectLines}
${L.currentTransits}: ${data.significantTransits || "-"}
Elements: ${data.elements || "-"}

${L.extraPoints}
───────────────────────────────────────
${data.extraPointsText}

${L.asteroids}
───────────────────────────────────────
${data.asteroidsText}
${L.asteroidAspects}: ${data.asteroidAspectsText}

════════════════════════════════════════════════════════════════
${L.part3Header}
════════════════════════════════════════════════════════════════

${L.solarReturn} - ${data.currentYear})
───────────────────────────────────────
${data.solarReturnText}

${L.lunarReturn}
───────────────────────────────────────
${data.lunarReturnText}

${L.progressions}
───────────────────────────────────────
${data.progressionsText}

${L.draconic}
───────────────────────────────────────
${data.draconicText}

${L.harmonics}
───────────────────────────────────────
${L.harmonicsProfile}: ${data.harmonicsText}
${L.harmonicsCharts}: ${data.harmonicChartsText}

${L.fixedStars}
───────────────────────────────────────
${data.fixedStarsText}

${L.eclipses}
───────────────────────────────────────
${data.eclipsesText}

${L.electional}
───────────────────────────────────────
${data.electionalText}

${L.midpoints}
───────────────────────────────────────
${L.midpointsKey}: ${data.midpointsText}
${L.midpointsAll}: ${data.allMidpointsText}
${data.themeSection}
════════════════════════════════════════════════════════════════
`.trim();
}
