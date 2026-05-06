import { elementTraits } from '../data'
import type { SajuData, AstroData, PlanetData } from '../types'

// 현재 타이밍 분석 - 오늘, 이번달, 현재 단계 + 용신 에너지 통합
export function getCurrentTimingAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): {
  today: { title: string; subtitle: string; message: string; emoji: string } | null
  thisMonth: { title: string; subtitle: string; message: string; emoji: string } | null
  currentStage: { title: string; subtitle: string; message: string; emoji: string } | null
} {
  const isKo = lang === 'ko'
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  const _currentDay = now.getDate()

  // 생년월일에서 나이 계산
  const birthDateStr = saju?.birthDate
  const birthYear = birthDateStr ? parseInt(birthDateStr.split('-')[0]) : 1990
  const age = currentYear - birthYear

  // 대운 계산 (10년 주기)
  const _daeunCycle = Math.floor(age / 10) + 1
  const daeunProgress = age % 10 // 대운 내 진행도 (0-9)

  // 용신 정보 가져오기 (가장 약한 오행)
  const fiveElements = saju?.fiveElements
  let yongsinElement: string | null = null
  let yongsinPercentage = 100

  if (fiveElements) {
    const sorted = Object.entries(fiveElements).sort(
      ([, a], [, b]) => (a as number) - (b as number)
    )
    if (sorted[0] && typeof sorted[0][1] === 'number') {
      yongsinElement = sorted[0][0]
      yongsinPercentage = sorted[0][1] as number
    }
  }

  // 용신별 실천 방법
  const yongsinActions: Record<string, { ko: string; en: string }> = {
    wood: {
      ko: '🌿 녹색 옷 입기, 식물 가까이, 산책하기',
      en: '🌿 Wear green, be near plants, take walks',
    },
    fire: {
      ko: '🔥 밝은 색 입기, 햇빛 쬐기, 사람 만나기',
      en: '🔥 Wear bright colors, get sunlight, socialize',
    },
    earth: {
      ko: '🏔️ 편안한 색 입기, 규칙적 식사, 자연 가까이',
      en: '🏔️ Wear earth tones, regular meals, be in nature',
    },
    metal: {
      ko: '⚔️ 정돈하기, 명확한 계획, 깔끔한 환경',
      en: '⚔️ Organize, clear plans, tidy environment',
    },
    water: {
      ko: '💧 휴식 취하기, 물 충분히, 조용한 시간',
      en: '💧 Rest well, stay hydrated, quiet time',
    },
  }

  // 1) 오늘 운세 - 태양 위치 + 용신 에너지 통합
  let today = null
  if (astro?.planets) {
    const planets = Array.isArray(astro.planets) ? astro.planets : []
    const sunSign = planets
      .find((p: PlanetData) => p?.name?.toLowerCase() === 'sun')
      ?.sign?.toLowerCase()

    const sunThemes: Record<string, { ko: string; en: string }> = {
      aries: { ko: '새로운 시작', en: 'New beginnings' },
      taurus: { ko: '안정과 풍요', en: 'Stability and abundance' },
      gemini: { ko: '소통과 학습', en: 'Communication and learning' },
      cancer: { ko: '감정과 가족', en: 'Emotions and family' },
      leo: { ko: '자신감과 창조', en: 'Confidence and creativity' },
      virgo: { ko: '실용과 디테일', en: 'Practicality and details' },
      libra: { ko: '관계와 조화', en: 'Relationships and harmony' },
      scorpio: { ko: '변화와 통찰', en: 'Transformation and insight' },
      sagittarius: { ko: '확장과 모험', en: 'Expansion and adventure' },
      capricorn: { ko: '목표와 책임', en: 'Goals and responsibility' },
      aquarius: { ko: '혁신과 자유', en: 'Innovation and freedom' },
      pisces: { ko: '직관과 영성', en: 'Intuition and spirituality' },
    }

    if (sunSign && sunThemes[sunSign]) {
      const yongsinInfo = yongsinElement ? elementTraits[yongsinElement] : null
      const yongsinAction = yongsinElement ? yongsinActions[yongsinElement] : null

      today = {
        emoji: '🌅',
        title: isKo ? '오늘 흐름' : "Today's Flow",
        subtitle: sunThemes[sunSign][isKo ? 'ko' : 'en'],
        message: isKo
          ? `오늘은 ${sunThemes[sunSign].ko}의 에너지가 강해요.\n\n` +
            (yongsinInfo && yongsinAction
              ? `✨ 흐름 타는 법: ${yongsinAction.ko}\n지금 ${yongsinInfo.ko} 에너지(${yongsinPercentage}%)를 보충하면 하루가 더 순조로워져요.`
              : '이 에너지를 활용해 하루를 풍요롭게 보내세요.')
          : `Today's energy emphasizes ${sunThemes[sunSign].en}.\n\n` +
            (yongsinInfo && yongsinAction
              ? `✨ Flow tips: ${yongsinAction.en}\nBoosting your ${yongsinInfo.en} energy (${yongsinPercentage}%) will smooth your day.`
              : 'Use this energy to enrich your day.'),
      }
    }
  }

  // 2) 이번 달 운세 - 월별 오행 에너지 + 용신 조화
  const monthElements: Record<number, string> = {
    1: 'water',
    2: 'wood',
    3: 'wood',
    4: 'earth',
    5: 'fire',
    6: 'fire',
    7: 'earth',
    8: 'metal',
    9: 'metal',
    10: 'earth',
    11: 'water',
    12: 'water',
  }

  const monthElement = monthElements[currentMonth]
  const monthEnergyDesc: Record<string, { ko: string; en: string }> = {
    wood: { ko: '성장과 시작', en: 'Growth and beginnings' },
    fire: { ko: '열정과 활동', en: 'Passion and activity' },
    earth: { ko: '안정과 결실', en: 'Stability and fruition' },
    metal: { ko: '정리와 결단', en: 'Organization and decision' },
    water: { ko: '휴식과 재충전', en: 'Rest and recharge' },
  }

  // 월 에너지와 용신이 같으면 좋은 달, 상극이면 조심해야 할 달
  const monthYongsinMatch = monthElement === yongsinElement
  const elementRelations: Record<string, string> = {
    wood: 'metal',
    fire: 'water',
    earth: 'wood',
    metal: 'fire',
    water: 'earth',
  }
  const monthYongsinClash = yongsinElement && elementRelations[yongsinElement] === monthElement

  const thisMonth = {
    emoji: '🌙',
    title: isKo ? '이번 달 흐름' : "This Month's Flow",
    subtitle: monthEnergyDesc[monthElement][isKo ? 'ko' : 'en'],
    message: isKo
      ? `${currentMonth}월은 ${monthEnergyDesc[monthElement].ko}의 달이에요.\n\n` +
        (monthYongsinMatch
          ? `🎯 당신에게 딱 맞는 달! ${yongsinElement ? elementTraits[yongsinElement]?.ko : ''} 에너지가 충만해져요. 적극적으로 도전하세요.`
          : monthYongsinClash
            ? `⚡ 조금 조심스러운 달이에요. ${yongsinElement ? elementTraits[yongsinElement]?.ko : ''} 에너지 보충에 신경쓰면서 무리하지 마세요.`
            : monthElement === 'wood'
              ? '새로운 프로젝트를 시작하기 좋아요.'
              : monthElement === 'fire'
                ? '적극적으로 행동하고 표현하세요.'
                : monthElement === 'earth'
                  ? '쌓아온 것들을 점검하고 정리하세요.'
                  : monthElement === 'metal'
                    ? '중요한 결정을 내리기 좋은 시기예요.'
                    : '무리하지 말고 에너지를 충전하세요.')
      : `${currentMonth} is the month of ${monthEnergyDesc[monthElement].en}.\n\n` +
        (monthYongsinMatch
          ? `🎯 Perfect month for you! Your ${yongsinElement ? elementTraits[yongsinElement]?.en : ''} energy is strong. Take action boldly.`
          : monthYongsinClash
            ? `⚡ Be careful this month. Focus on boosting ${yongsinElement ? elementTraits[yongsinElement]?.en : ''} energy and don't overextend.`
            : monthElement === 'wood'
              ? 'Good time to start new projects.'
              : monthElement === 'fire'
                ? 'Act and express yourself actively.'
                : monthElement === 'earth'
                  ? "Review and organize what you've built."
                  : monthElement === 'metal'
                    ? 'Good time for important decisions.'
                    : "Don't overdo it, recharge your energy."),
  }

  // 3) 현재 인생 단계 - 대운 기반 + 용신 활용법
  const stageDescriptions: Record<number, { ko: string; en: string; emoji: string }> = {
    0: { ko: '씨앗을 심는 시기', en: 'Time to plant seeds', emoji: '🌱' },
    1: { ko: '기반을 다지는 시기', en: 'Time to build foundation', emoji: '🏗️' },
    2: { ko: '성장하는 시기', en: 'Time of growth', emoji: '🌿' },
    3: { ko: '꽃을 피우는 시기', en: 'Time to bloom', emoji: '🌸' },
    4: { ko: '열매를 맺는 시기', en: 'Time to bear fruit', emoji: '🍎' },
    5: { ko: '수확하는 시기', en: 'Time to harvest', emoji: '🌾' },
    6: { ko: '정리하는 시기', en: 'Time to organize', emoji: '📦' },
    7: { ko: '지혜를 나누는 시기', en: 'Time to share wisdom', emoji: '🦉' },
    8: { ko: '재정비하는 시기', en: 'Time to reorganize', emoji: '🔄' },
    9: { ko: '다음을 준비하는 시기', en: 'Time to prepare for next', emoji: '🎯' },
  }

  const currentStageInfo = stageDescriptions[daeunProgress] || stageDescriptions[0]

  // 단계별 용신 활용 조언
  const stageYongsinAdvice: Record<string, Record<string, { ko: string; en: string }>> = {
    early: {
      // 0-2년차
      wood: { ko: '배우고 성장하는데 집중하세요', en: 'Focus on learning and growth' },
      fire: { ko: '열정적으로 관계를 넓히세요', en: 'Expand relationships passionately' },
      earth: { ko: '튼튼한 기반을 만드세요', en: 'Build a solid foundation' },
      metal: { ko: '체계를 갖추고 정리하세요', en: 'Get organized and systematic' },
      water: { ko: '깊이 생각하고 준비하세요', en: 'Think deeply and prepare' },
    },
    mid: {
      // 3-6년차
      wood: { ko: '성장의 기회를 적극 잡으세요', en: 'Seize growth opportunities' },
      fire: { ko: '에너지를 발산하고 도전하세요', en: 'Express energy and take challenges' },
      earth: { ko: '안정적으로 결실을 만드세요', en: 'Create results steadily' },
      metal: { ko: '명확한 결단을 내리세요', en: 'Make clear decisions' },
      water: { ko: '지혜롭게 흐름을 타세요', en: 'Ride the flow wisely' },
    },
    late: {
      // 7-9년차
      wood: { ko: '경험을 나누고 전수하세요', en: 'Share and pass on experience' },
      fire: { ko: '후배들에게 영감을 주세요', en: 'Inspire juniors' },
      earth: { ko: '쌓아온 것을 정리하세요', en: "Organize what you've built" },
      metal: { ko: '완성도를 높이고 마무리하세요', en: 'Perfect and complete' },
      water: { ko: '다음 단계를 차분히 준비하세요', en: 'Calmly prepare next stage' },
    },
  }

  const stagePhase = daeunProgress < 3 ? 'early' : daeunProgress < 7 ? 'mid' : 'late'
  const yongsinAdvice = yongsinElement ? stageYongsinAdvice[stagePhase][yongsinElement] : null

  const currentStage = {
    emoji: '🦋',
    title: isKo ? '지금 인생 단계' : 'Life Stage Now',
    subtitle: currentStageInfo[isKo ? 'ko' : 'en'],
    message: isKo
      ? `${age}세, ${currentStageInfo.ko}입니다.\n\n` +
        (yongsinAdvice
          ? `💡 이 단계에서는: ${yongsinAdvice.ko}\n${yongsinElement ? elementTraits[yongsinElement]?.ko : ''} 에너지를 채우면서 나아가면 더 순조롭게 흐름을 탈 수 있어요.`
          : daeunProgress < 3
            ? '지금은 준비하고 배우는 시기예요. 조급해하지 마세요.'
            : daeunProgress < 7
              ? '가장 활발하게 활동하는 시기예요. 적극적으로 도전하세요.'
              : '경험을 정리하고 다음 단계를 준비하세요.')
      : `Age ${age}, ${currentStageInfo.en}.\n\n` +
        (yongsinAdvice
          ? `💡 At this stage: ${yongsinAdvice.en}\nEnhancing your ${yongsinElement ? elementTraits[yongsinElement]?.en : ''} energy will help you flow more smoothly.`
          : daeunProgress < 3
            ? "Time to prepare and learn. Don't rush."
            : daeunProgress < 7
              ? 'Most active period. Challenge yourself.'
              : 'Organize experiences and prepare for next stage.'),
  }

  return {
    today,
    thisMonth,
    currentStage,
  }
}
