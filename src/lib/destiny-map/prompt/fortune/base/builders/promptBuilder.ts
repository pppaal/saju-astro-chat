/**
 * promptBuilder.ts - 메인 프롬프트 빌더
 * 모든 섹션을 조합하여 최종 프롬프트 생성
 */

import type { CombinedResult } from '@/lib/destiny-map/astrologyengine'
import type { AstrologyData, SajuData } from '@/lib/destiny-map/astrology/types'
import type { PlanetData } from '@/lib/astrology'
import {
  formatPlanetLines,
  formatHouseLines,
  formatAspectLines,
  formatElementRatios,
} from '../formatters/astrologyFormatter'
import {
  extractSajuBasics,
  calculateCurrentLuck,
  buildFutureLuckData,
  extractSinsal,
} from '../sections/sajuSection'
import { extractAdvancedAnalysis } from '../sections/advancedSajuSection'
import {
  formatTransits,
  extractExtraPoints,
  extractAsteroids,
  extractReturns,
  extractProgressions,
  extractFixedStars,
} from '../sections/astrologySection'
import {
  buildLoveAnalysisSection,
  buildCareerAnalysisSection,
  buildHealthAnalysisSection,
} from './themeBuilder'

/**
 * 종합 데이터 스냅샷 빌드
 */
export function buildComprehensivePrompt(
  lang: string,
  theme: string,
  data: CombinedResult
): string {
  const { astrology = {}, saju } = data ?? {}
  const astroData = astrology as AstrologyData
  const { planets = [], houses = [], aspects = [], ascendant, mc, facts, transits = [] } = astroData
  const sajuData = saju as SajuData
  const { pillars, advancedAnalysis } = sajuData

  // 현재 시간 정보
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const birthYear = ((pillars?.year as Record<string, unknown>)?.year as number) ?? currentYear - 30
  const currentAge = currentYear - birthYear

  // 행성 정보 - Optimized with Map for O(1) lookup instead of O(n)
  const planetMap = new Map(planets.map((p) => [p.name, p]))
  const sun = planetMap.get('Sun')
  const moon = planetMap.get('Moon')
  const mercury = planetMap.get('Mercury')
  const venus = planetMap.get('Venus')
  const mars = planetMap.get('Mars')
  const jupiter = planetMap.get('Jupiter')
  const saturn = planetMap.get('Saturn')
  const uranus = planetMap.get('Uranus')
  const neptune = planetMap.get('Pluto')
  const pluto = planetMap.get('Pluto')
  const northNode = planetMap.get('North Node')

  // 포맷팅
  const planetLines = formatPlanetLines(planets)
  const houseLines = formatHouseLines(houses)
  const aspectLines = formatAspectLines(aspects)
  const elements = formatElementRatios(facts?.elementRatios ?? {})

  // 사주 데이터 추출
  const { pillarText, actualDayMaster, actualDayMasterElement } = extractSajuBasics(sajuData)
  const { currentDaeun, currentAnnual, currentMonthly, daeunText } = calculateCurrentLuck(
    sajuData,
    currentYear,
    currentMonth,
    currentAge
  )
  const { allDaeunText, futureAnnualList, futureMonthlyList } = buildFutureLuckData(
    sajuData,
    currentYear,
    currentMonth,
    currentAge
  )
  const { lucky, unlucky } = extractSinsal(sajuData)

  // 고급 사주 분석
  const adv = advancedAnalysis as Record<string, unknown> | undefined
  const advancedData = extractAdvancedAnalysis(adv)

  // 점성술 데이터 추출
  const significantTransits = formatTransits(transits)
  const { extraPointsText, chiron, lilith } = extractExtraPoints(
    data as unknown as Record<string, unknown>
  )
  const { asteroidsText, asteroidAspectsText, juno, ceres } = extractAsteroids(
    data as unknown as Record<string, unknown>
  )
  const { solarReturnText, lunarReturnText } = extractReturns(
    data as unknown as Record<string, unknown>
  )
  const { progressionsText, progressionDetailText } = extractProgressions(
    data as unknown as Record<string, unknown>
  )
  const fixedStarsText = extractFixedStars(data as unknown as Record<string, unknown>)

  // 테마별 섹션 생성
  const themeContext = {
    theme,
    pillars,
    sibsinDist: advancedData.sibsinDist as Record<string, number>,
    lucky,
    unlucky,
    daeunText,
    currentDaeun,
    houses,
    venus,
    mars,
    jupiter,
    saturn,
    moon,
    neptune,
    ascendant,
    mc,
    juno,
    lilith,
    chiron,
    ceres,
    relationshipText: advancedData.relationshipText,
    careerText: advancedData.careerText,
    suitableCareers: advancedData.suitableCareers,
    yongsinPrimary: advancedData.yongsinPrimary || '-',
    yongsinAvoid: advancedData.yongsinAvoid || '-',
    healthWeak: advancedData.healthWeak,
    geokgukText: advancedData.geokgukText,
    geokgukDesc: advancedData.geokgukDesc,
    actualDayMaster,
    actualDayMasterElement,
    currentAnnual,
    currentMonthly,
    currentYear,
    currentMonth,
    significantTransits,
    lunarReturnText,
    futureMonthlyList,
    futureAnnualList,
    solarReturnText,
    progressionsText,
    allDaeunText,
    facts,
  }

  const loveAnalysisSection = buildLoveAnalysisSection(themeContext)
  const careerAnalysisSection = buildCareerAnalysisSection(themeContext)
  const healthAnalysisSection = buildHealthAnalysisSection(themeContext)

  // 최종 프롬프트 조합
  return `
[COMPREHENSIVE DATA SNAPSHOT v3.1 - ${theme}]
Locale: ${lang}

📌 사용자 기본 정보
───────────────────────────────────────
생년: ${birthYear}년생
현재 만 나이: ${currentAge}세
오늘 날짜: ${currentYear}년 ${currentMonth}월

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
PART 1: 사주팔자 동양 운명 분석 (四柱八字 EASTERN DESTINY ANALYSIS)
════════════════════════════════════════════════════════════════

⚠️ 일주(日主) 핵심 정체성 / 사주 팔자
───────────────────────────────────────
일주(日主) / Day Master: ${actualDayMaster} (${actualDayMasterElement})
사주 팔자(四柱八字) / Four Pillars: ${pillarText}
신강/신약(身强身弱): ${advancedData.strengthText}
격국(格局) / 성향 유형: ${advancedData.geokgukText}
용신(用神) / 핵심 에너지: ${advancedData.yongsinPrimary} | 희신(喜神) 보조: ${advancedData.yongsinSecondary} | 기신(忌神) 주의: ${advancedData.yongsinAvoid}
통근(通根) 뿌리 연결: ${advancedData.tonggeunText}
투출(透出) 표출: ${advancedData.tuechulText}
회국(會局) 결합: ${advancedData.hoegukText}
득령(得令) 시기 조화: ${advancedData.deukryeongText}

📊 십신(十神) 에너지 분포 (Energy Distribution)
───────────────────────────────────────
십신 분포: ${advancedData.sibsinDistText || '-'}
주요 에너지: ${advancedData.sibsinDominant}
부족 에너지: ${advancedData.sibsinMissing}
인간관계 패턴: ${advancedData.relationshipText}
직업 적성: ${advancedData.careerText}

🔄 형충회합(刑沖會合) 에너지 상호작용
───────────────────────────────────────
충(沖) 충돌: ${advancedData.chungText}
합(合) 조화: ${advancedData.hapText}
삼합(三合) 삼중 조화: ${advancedData.samhapText}

🔮 신살(神煞) 길흉 에너지
───────────────────────────────────────
길신(吉神): ${lucky || '-'}
흉신(凶神): ${unlucky || '-'}

📅 대운(大運)/세운(歲運)/월운(月運) 현재 흐름
───────────────────────────────────────
현재 대운(大運): ${daeunText}
${currentYear}년 세운(歲運): ${currentAnnual?.element ?? '-'} (${currentAnnual?.ganji ?? ''})
${currentYear}년 ${currentMonth}월 월운(月運): ${currentMonthly?.element ?? '-'}

🔮 미래 예측용 운세 데이터 (Future Predictions)
───────────────────────────────────────
[전체 장기 흐름 - 10년 주기]
  ${allDaeunText || '데이터 없음'}

[향후 5년 연간 운세]
  ${futureAnnualList || '데이터 없음'}

[향후 12개월 월간 흐름]
  ${futureMonthlyList || '데이터 없음'}

🏥 건강/종합 점수
───────────────────────────────────────
건강 취약점: ${advancedData.healthWeak}
종합 점수: ${advancedData.scoreText}
${advancedData.jonggeokText ? `특수 성향: ${advancedData.jonggeokText}` : ''}
${advancedData.iljuText ? `핵심 성격: ${advancedData.iljuText}` : ''}
${advancedData.gongmangText ? `빈 에너지: ${advancedData.gongmangText}` : ''}

════════════════════════════════════════════════════════════════
PART 2: 서양 점성술 (WESTERN ASTROLOGY)
════════════════════════════════════════════════════════════════

🌟 핵심 행성 배치 (Core Planets)
───────────────────────────────────────
ASC: ${ascendant?.sign ?? '-'} | MC: ${mc?.sign ?? '-'}
Sun: ${sun?.sign ?? '-'} (H${sun?.house ?? '-'})
Moon: ${moon?.sign ?? '-'} (H${moon?.house ?? '-'})
Mercury: ${mercury?.sign ?? '-'} (H${mercury?.house ?? '-'})
Venus: ${venus?.sign ?? '-'} (H${venus?.house ?? '-'})
Mars: ${mars?.sign ?? '-'} (H${mars?.house ?? '-'})
Jupiter: ${jupiter?.sign ?? '-'} (H${jupiter?.house ?? '-'})
Saturn: ${saturn?.sign ?? '-'} (H${saturn?.house ?? '-'})
Uranus: ${uranus?.sign ?? '-'} (H${uranus?.house ?? '-'})
Neptune: ${neptune?.sign ?? '-'} (H${neptune?.house ?? '-'})
Pluto: ${pluto?.sign ?? '-'} (H${pluto?.house ?? '-'})
North Node: ${northNode?.sign ?? '-'} (H${northNode?.house ?? '-'})
Elements: ${elements || '-'}

All Planets: ${planetLines}
Houses: ${houseLines}
Major Aspects: ${aspectLines}
Current Transits: ${significantTransits || '-'}

🔮 Extra Points (특수점)
───────────────────────────────────────
${extraPointsText}

🌠 Asteroids (소행성)
───────────────────────────────────────
${asteroidsText}
Asteroid Aspects: ${asteroidAspectsText}

════════════════════════════════════════════════════════════════
PART 3: 고급 점성 분석 (ADVANCED ASTROLOGY)
════════════════════════════════════════════════════════════════

☀️ Solar Return (연간 차트 - ${currentYear})
───────────────────────────────────────
${solarReturnText}

🌙 Lunar Return (월간 차트)
───────────────────────────────────────
${lunarReturnText}

📈 프로그레션 Progressions (진행 차트 / 2차 진행법)
───────────────────────────────────────
${progressionsText}
${progressionDetailText}

⭐ Fixed Stars (항성)
───────────────────────────────────────
${fixedStarsText}
${loveAnalysisSection}${careerAnalysisSection}${healthAnalysisSection}
════════════════════════════════════════════════════════════════
PART 4: 동서양 융합 해석 가이드 (EAST-WEST SYNTHESIS)
════════════════════════════════════════════════════════════════

🔗 사주-점성술 대응 관계
───────────────────────────────────────
• 일간(日干) ↔ 태양(Sun): 핵심 정체성/자아
• 월간(月干) ↔ 달(Moon): 감정/내면/어머니
• 격국(格局) ↔ ASC(어센던트): 성향/페르소나
• 용신(用神) ↔ 가장 조화로운 행성: 필요한 에너지
• 대운(大運) ↔ 프로그레션(Progressed): 장기 흐름
• 세운(歲運) ↔ Solar Return: 연간 테마
• 월운(月運) ↔ Lunar Return: 월간 테마

🎯 현재 트랜짓 해석 가이드
───────────────────────────────────────
현재 트랜짓: ${significantTransits || '특별한 배치 없음'}

[트랜짓 어스팩트별 의미]
• conjunction(합): 강력한 활성화, 새로운 시작
• trine(삼합): 순조로운 흐름, 기회
• sextile(육합): 가벼운 기회, 노력하면 성과
• square(사각): 도전/긴장, 성장 동력
• opposition(충): 관계 긴장, 균형 필요

🌊 융합 해석 핵심 원칙
───────────────────────────────────────
1. 일간 오행 + Sun Sign = 핵심 성격 융합
   - ${actualDayMaster}(${actualDayMasterElement}) + ${sun?.sign ?? '-'} = 이 사람의 본질

2. 용신 + 트랜짓 = 시기 판단
   - 용신(${advancedData.yongsinPrimary}) 에너지가 활성화되는 트랜짓 = 좋은 시기
   - 기신(${advancedData.yongsinAvoid}) 에너지가 활성화되는 트랜짓 = 주의 시기

3. 대운/세운 + 프로그레션/Solar Return = 인생 흐름
   - 동양: ${daeunText}
   - 서양: ${progressionsText !== '-' ? progressionsText : '프로그레션 데이터 확인'}

⚡ 질문 유형별 분석 포인트
───────────────────────────────────────
[연애/결혼 질문]
→ 사주: 배우자궁(일지), 정재/편재(남), 정관/편관(여), 도화살
→ 점성: Venus, Mars, 5th/7th House, Juno, 금성 트랜짓

[직업/재물 질문]
→ 사주: 격국, 용신, 관성/재성/식상 분포, 대운 흐름
→ 점성: MC, 10th House, Saturn, Jupiter, 2nd/6th House

[건강 질문]
→ 사주: 오행 균형, 부족 오행 → 장기, 형충 스트레스
→ 점성: 6th House, Mars, Saturn, Chiron, 화성 트랜짓

[타이밍/시기 질문]
→ 사주: 대운 전환기, 세운/월운 흐름, 용신 에너지 시기
→ 점성: 트랜짓, 프로그레션, Solar/Lunar Return, 일/월식

════════════════════════════════════════════════════════════════
`.trim()
}
