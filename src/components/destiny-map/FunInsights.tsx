"use client";

import { useMemo } from "react";
import {
  extractSajuProfile,
  extractAstroProfile,
  calculateMonthlyImportantDates,
  type ImportantDate,
} from "@/lib/destiny-map/destinyCalendar";

// Import data
import {
  elementTraits,
  dayMasterData,
  zodiacData,
  elementKeyMap,
  tianGanMap,
  elementRelations,
  astroToSaju,
  monthElements
} from "./fun-insights/data";

// Import helper utilities
import { findPlanetSign } from "./fun-insights/utils";

// Import analyzers
import {
  getSibsinDistribution,
  getSibsinAnalysis,
  getCrossAnalysis,
  getHealthAnalysis,
  getTimeBasedFortune,
  getStrengthsAndWeaknesses,
  getCurrentFlowAnalysis,
  getCurrentTimingAnalysis
} from "./fun-insights/analyzers";

// Import astrology insights
import {
  getChironInsight,
  getPartOfFortuneInsight,
  getVertexInsight,
  getDraconicInsight,
  getHarmonicsInsight,
  getLilithInsight,
  getAsteroidsInsight,
  getFixedStarsInsight,
  getEclipsesInsight
} from "./fun-insights/astrology";

// Import generators
import {
  getRecommendedDates,
  getSimpleRecommendedDates,
  getLuckyItems
} from "./fun-insights/generators";

interface Props {
  saju?: any;
  astro?: any;
  lang?: string;
  theme?: string;
  className?: string;
}

function generateReport(saju: any, astro: any, lang: string, _theme: string): string {
  const isKo = lang === "ko";

  const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem;
  const dayMasterName = rawDayMasterName ? (tianGanMap[rawDayMasterName] || rawDayMasterName) : null;
  const dayMasterInfo = dayMasterName ? dayMasterData[dayMasterName] : null;
  const dayElement = dayMasterInfo?.element;

  const sunSign = findPlanetSign(astro, "sun");
  const moonSign = findPlanetSign(astro, "moon");
  const sunData = sunSign ? zodiacData[sunSign] : null;
  const moonData = moonSign ? zodiacData[moonSign] : null;

  const fiveElements = saju?.fiveElements || {};
  const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  if (!dayMasterInfo) {
    return isKo ? "사주 데이터를 분석 중입니다..." : "Analyzing Saju data...";
  }

  const report = isKo
    ? `【동양 × 서양 운세 융합 분석】

${dayMasterInfo.hanja}${dayMasterInfo.ko.replace('갑목', '금')}(${dayElement ? elementTraits[dayElement]?.ko : ""}) 일간을 가진 당신은 ${dayMasterInfo.personality.ko}입니다.

${sunData && moonData
  ? `태양 ${sunData.ko}(${sunData.trait.ko})와 달 ${moonData.ko}(${moonData.trait.ko})의 조합으로, 외적으로는 ${sunData.trait.ko} 모습을, 내면에서는 ${moonData.trait.ko} 감성을 지닙니다.`
  : sunData
  ? `태양 ${sunData.ko}의 영향으로 ${sunData.trait.ko} 성향이 드러납니다.`
  : ""}

【오행 밸런스】
${strongest ? `강점: ${elementTraits[strongest[0]]?.ko}(${strongest[1]}%) - ${strongest[0] === "wood" ? "성장과 발전" : strongest[0] === "fire" ? "열정과 표현" : strongest[0] === "earth" ? "안정과 신뢰" : strongest[0] === "metal" ? "결단과 실행" : "지혜와 유연함"}의 에너지가 풍부합니다.` : ""}
${weakest ? `보완점: ${elementTraits[weakest[0]]?.ko}(${weakest[1]}%) - 이 기운을 보완하면 더 균형 잡힌 삶을 살 수 있습니다.` : ""}

${dayMasterInfo.strength.ko}이 장점이며, ${dayMasterInfo.weakness.ko}은 주의가 필요합니다.`

    : `【Eastern × Western Fortune Analysis】

As ${dayMasterInfo.en} (${dayElement ? elementTraits[dayElement]?.en : ""}), you are ${dayMasterInfo.personality.en}.

${sunData && moonData
  ? `With Sun in ${sunData.en} (${sunData.trait.en}) and Moon in ${moonData.en} (${moonData.trait.en}), you show ${sunData.trait.en} externally while feeling ${moonData.trait.en} internally.`
  : sunData
  ? `Sun in ${sunData.en} influences your ${sunData.trait.en} tendencies.`
  : ""}

【Five Elements Balance】
${strongest ? `Strength: ${elementTraits[strongest[0]]?.en} (${strongest[1]}%) - Rich in ${strongest[0] === "wood" ? "growth" : strongest[0] === "fire" ? "passion" : strongest[0] === "earth" ? "stability" : strongest[0] === "metal" ? "decisiveness" : "wisdom"} energy.` : ""}
${weakest ? `To improve: ${elementTraits[weakest[0]]?.en} (${weakest[1]}%) - Boosting this brings better balance.` : ""}

Your strengths are ${dayMasterInfo.strength.en}, while ${dayMasterInfo.weakness.en} needs attention.`;

  return report;
}

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function FunInsights({ saju, astro, lang = "ko", theme = "", className = "" }: Props) {
  const isKo = lang === "ko";

  const hasFiveElements = Boolean(saju?.fiveElements && Object.keys(saju.fiveElements).length > 0);
  const hasValidAstro = Boolean(findPlanetSign(astro, "sun"));

  const data = useMemo(() => {
    if (!hasFiveElements && !hasValidAstro) {
      return null;
    }

    const rawDayMasterName = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "갑";
    const dayMasterName = tianGanMap[rawDayMasterName] || rawDayMasterName;
    const dayMasterInfo = dayMasterData[dayMasterName] || dayMasterData["갑"];
    const dayElement = dayMasterInfo.element;

    const fiveElements = saju?.fiveElements || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
    const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));

    const sunSign = findPlanetSign(astro, "sun");
    const moonSign = findPlanetSign(astro, "moon");
    const ascSign = astro?.ascendant?.sign?.toLowerCase() || null;

    return {
      dayMasterName,
      dayMasterInfo,
      dayElement,
      fiveElements,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      sunSign,
      moonSign,
      ascSign,
      crossAnalysis: getCrossAnalysis(saju, astro, lang),
      dates: getRecommendedDates(saju, astro, lang),
      luckyItems: getLuckyItems(saju, lang),
      sibsinAnalysis: getSibsinAnalysis(saju, lang),
      healthAnalysis: getHealthAnalysis(saju, lang),
      report: generateReport(saju, astro, lang, theme),
      // 🔥 새로운 고급 분석 추가
      chironInsight: getChironInsight(astro, lang),
      currentFlow: getCurrentFlowAnalysis(saju, lang),
    };
  }, [saju, astro, lang, theme, hasFiveElements, hasValidAstro]);


  // 운명 서사 생성을 위한 추가 데이터 - 더 깊은 스토리텔링
  const destinyNarrative = useMemo(() => {
    if (!data) {
      return null;
    }

    const dayEl = data.dayElement;
    const strongEl = data.strongest[0];

    // 일간별 인생 주제 - 더 구체적이고 감성적인 메시지 (확장)
    const lifeThemes: Record<string, { ko: string; en: string; koDetail: string; enDetail: string }> = {
      "갑": {
        ko: "내 방식대로 세상을 바꾸는 것",
        en: "Changing the world your own way",
        koDetail: "당신은 숲에서 가장 높이 솟은 나무예요. 곧고 정직하며, 한번 뿌리를 내리면 어떤 바람에도 흔들리지 않아요. 세상은 당신에게 '좀 유연해져라'고 말하지만, 사실 당신의 그 곧음이 바로 당신의 힘이에요. 어린 시절부터 남들보다 일찍 철이 들었고, 책임감 때문에 자신을 희생한 적도 많았을 거예요. 하지만 그런 경험들이 지금의 당신을 만들었어요. 당신은 리더가 될 운명이에요. 앞에 서서 길을 보여주고, 사람들이 따라올 수 있게 해주는 것. 그게 당신이 이 세상에 온 이유예요.",
        enDetail: "You are the tallest tree in the forest. Upright and honest, once you take root, no wind can shake you. The world tells you to 'be more flexible,' but your straightness is actually your power. You matured faster than others, sacrificing yourself for responsibility. Those experiences made you who you are. You're destined to lead—showing the way and letting others follow."
      },
      "을": {
        ko: "어디서든 뿌리내리는 강한 생명력",
        en: "Thriving wherever you're planted",
        koDetail: "당신은 덩굴처럼 어디든 뻗어나가는 생명력을 가졌어요. 남들은 '흔들린다'고 하지만, 당신은 '적응한다'고 말해요. 그게 당신의 방식이에요. 세상의 모든 장애물을 우회해서 결국 원하는 곳에 도달하는 것. 연약해 보이지만 그 안에는 강인한 생존 본능이 숨어 있어요. 어린 시절부터 분위기를 읽는 법을 배웠고, 갈등을 피하는 역할을 자주 했을 거예요. 그래서 지금도 사람들 사이에서 다리가 되어주고, 연결하는 일을 잘해요. 당신의 유연함은 약점이 아니라 최고의 무기예요.",
        enDetail: "You have the vitality of a vine that extends anywhere. Others call it 'wavering,' but you call it 'adapting.' That's your way—navigating around every obstacle to reach where you want. You look delicate, but inside is strong survival instinct. You learned early to read the room and often played peacemaker. That's why you're great at being a bridge between people. Your flexibility isn't weakness—it's your greatest weapon."
      },
      "병": {
        ko: "존재만으로 사람들에게 빛이 되는 것",
        en: "Being a light just by existing",
        koDetail: "당신은 태양이에요. 어디를 가든 분위기를 밝게 만들고, 사람들에게 에너지를 줘요. 당신이 방에 들어오면 뭔가 달라져요. 그 존재감, 그 열정, 그 카리스마. 사람들은 무의식적으로 당신에게 끌려요. 하지만 태양도 지는 밤이 있듯이, 당신도 가끔은 에너지가 바닥날 때가 있어요. 밝은 모습 뒤에서 '나에게 에너지를 주는 사람은 누구지?'라고 외로워할 때가 있죠. 괜찮아요. 구름 뒤에서도 태양은 여전히 빛나고 있어요. 세상을 밝히는 것, 그게 당신이 태어난 이유예요.",
        enDetail: "You are the sun. Wherever you go, you brighten the atmosphere and give energy to people. When you enter a room, something changes. That presence, that passion, that charisma—people are drawn to you unconsciously. But just as the sun sets, sometimes your energy runs low. Behind your bright exterior, you sometimes wonder 'Who gives energy to me?' It's okay. Even behind clouds, the sun still shines. Illuminating the world—that's why you were born."
      },
      "정": {
        ko: "작은 불꽃으로 큰 감동을 만드는 것",
        en: "Creating big moments from small sparks",
        koDetail: "당신은 촛불이에요. 태양처럼 온 세상을 비추진 못하지만, 가까이 있는 사람에게 따뜻한 빛과 온기를 전해요. 섬세하고 배려심이 깊어서 다른 사람들이 놓치는 작은 것들을 알아채요. 누군가의 말투가 평소와 다르다는 것, 표정이 조금 어둡다는 것... 당신은 다 느껴요. 그래서 사람들은 당신 곁에서 이상하게 마음이 편해지고, 자기 이야기를 하고 싶어져요. 밤하늘의 별처럼, 어둠이 짙어질수록 당신의 빛은 더 잘 보여요. 한 사람을 밝히는 것, 그것이 세상을 바꾸는 거예요.",
        enDetail: "You are a candle. You can't illuminate the whole world like the sun, but you bring warm light and heat to those close to you. Delicate and considerate, you notice small things others miss—a slightly different tone, a darker expression. People feel strangely at ease near you, wanting to share their stories. Like stars in the night sky, your light shows better as darkness deepens. Lighting up one person—that's how you change the world."
      },
      "무": {
        ko: "모두가 기댈 수 있는 산이 되는 것",
        en: "Being the mountain everyone can rely on",
        koDetail: "당신은 산이에요. 묵직하고 듬직한 존재감을 가지고 있어요. 한번 마음먹으면 쉽게 변하지 않는 굳건함이 있죠. 당신이 '내가 할게'라고 말하면, 사람들은 안심해요. 산이 그 자리에 있듯이, 당신의 존재 자체가 주변 사람들에게 안정감을 줘요. 어린 시절부터 믿음직한 아이였을 거예요. 일찍부터 책임감을 가지고, 가정의 기둥 역할을 했을 수도 있어요. 하지만 가끔은 '약해도 괜찮다'고 자신에게 허락해주세요. 산도 지진에는 흔들려요. 변하지 않는 존재로 있어주는 것, 그게 당신의 사명이에요.",
        enDetail: "You are a mountain. You have a solid, dependable presence. Once you set your mind, you have unwavering determination. When you say 'I'll handle it,' people feel relieved. Like a mountain standing in its place, your very existence gives stability to those around you. You were probably reliable since childhood, taking on responsibility and being the family pillar. But sometimes permit yourself to 'be weak.' Even mountains shake in earthquakes. Being the unchanging presence—that's your mission."
      },
      "기": {
        ko: "관계의 중심에서 화합을 이끄는 것",
        en: "Bringing harmony to every relationship",
        koDetail: "당신은 정원의 흙이에요. 겉으로는 평범해 보이지만, 모든 것을 품고 자라게 하는 놀라운 생명력이 있어요. 누구나 당신에게 쉽게 다가올 수 있어요. 당신 옆에 있으면 왠지 마음이 편해지고, 자신의 이야기를 하고 싶어져요. 어린 시절부터 돌봄을 주거나 받는 역할을 했을 거예요. 친구들의 고민 상담 역할을 맡거나, 갈등을 중재하는 일을 많이 했을 거예요. 남들을 챙기느라 자신의 욕구는 뒷전으로 미루는 경향이 있어요. '나도 받아도 괜찮아'라고 자신에게 허락해주세요. 다른 사람들이 성장하도록 돕는 것, 그게 당신이 이 세상에 온 이유예요.",
        enDetail: "You are garden soil. You may seem ordinary outside, but you have amazing life force that nurtures everything. Anyone can easily approach you. Being near you makes people feel at ease and want to share their stories. You've played a caregiving role since childhood—counseling friends or mediating conflicts. You tend to put others first and neglect your own needs. Permit yourself to 'receive too.' Helping others grow—that's why you came to this world."
      },
      "경": {
        ko: "망설임 없이 길을 개척하는 것",
        en: "Blazing trails without hesitation",
        koDetail: "당신은 날카로운 검이에요. 옳고 그름을 명확히 하고 불의를 참지 못해요. 카리스마 있고 결단력 있으며, 한번 결심하면 끝까지 밀어붙이는 추진력이 있어요. 당신의 눈빛 하나로 주변이 조용해질 때가 있어요. 어린 시절, 불공정한 상황에 분노한 기억이 있을 거예요. 왜 세상이 이렇게 불공평한지, 왜 정의가 실현되지 않는지 화가 났죠. 그 분노가 지금의 당신을 만들었어요. 강해 보이는 외면과 달리 내면은 의외로 여리고 섬세해요. 하지만 그걸 아무에게도 보여주지 않아요. 불의와 싸우고 약한 사람들을 보호하는 것, 그게 당신의 사명이에요.",
        enDetail: "You are a sharp sword. You distinguish right from wrong clearly and can't tolerate injustice. Charismatic and decisive, you push through once decided. A single look from you can silence a room. You remember being angered by unfair situations in childhood—frustrated by the world's unfairness and justice not being served. That anger made who you are. Despite your strong exterior, you're surprisingly delicate inside, but you never show anyone. Fighting injustice and protecting the weak—that's your mission."
      },
      "신": {
        ko: "평범함 속에서 특별함을 찾는 것",
        en: "Finding the extraordinary in ordinary",
        koDetail: "당신은 다이아몬드예요. 세련되고 빛나는 존재감을 가지고 있어요. 미적 감각이 뛰어나고, 디테일에 강하며, 무엇이든 아름답게 만드는 능력이 있어요. 사람들은 당신의 취향을 신뢰하고, 당신의 추천을 따라요. 하지만 그 안목이 때로는 당신 자신에게 가장 가혹하게 적용돼요. 거울을 볼 때마다 부족한 점만 보이고, 완벽하지 않은 것에 대한 두려움이 당신을 옭아매요. 다른 사람들이 보지 못하는 것을 보는 능력, 그것이 당신을 특별하게 만들어요. '그냥 있는 그대로도 괜찮아'라고 스스로에게 말해주세요. 금이 간 도자기도 아름다워요.",
        enDetail: "You are a diamond. You have a refined, radiant presence. Excellent aesthetic sense, attention to detail, ability to beautify anything. People trust your taste and follow your recommendations. But that same eye is often harshest on yourself. Every mirror shows only flaws, and fear of imperfection binds you. The ability to see what others can't—that makes you special. Tell yourself 'It's okay just as it is.' Cracked pottery is beautiful too."
      },
      "임": {
        ko: "깊이로 세상을 품는 것",
        en: "Embracing the world through depth",
        koDetail: "당신은 깊은 바다예요. 겉으로는 잔잔해 보이지만, 그 아래에는 상상할 수 없는 깊이가 있어요. 지혜롭고 포용력 있으며, 강한 직관을 가지고 있어요. 남들이 보지 못하는 것을 보고, 느끼지 못하는 것을 느껴요. 어린 시절부터 혼자만의 세계가 있었을 거예요. 책이나 상상 속에서 시간을 보내며, '왜 다들 이 정도밖에 생각 안 하지?'라고 느꼈을 수도 있어요. 그 깊이가 때로는 외로움이 되기도 해요. 하지만 그 깊이야말로 당신의 가장 큰 선물이에요. 세상을 깊이로 품고, 통찰로 사람들을 이끄는 것. 그게 당신이 이 세상에 온 이유예요.",
        enDetail: "You are the deep ocean. Calm on the surface, but unimaginable depth lies beneath. Wise, embracing, with strong intuition. You see what others can't, feel what others miss. Since childhood, you had your own world, spending time in books or imagination, wondering 'Why doesn't everyone think deeper?' That depth sometimes becomes loneliness. But that very depth is your greatest gift. Embracing the world through depth and leading people through insight—that's why you came to this world."
      },
      "계": {
        ko: "순수한 영감으로 세상에 울림을 주는 것",
        en: "Touching hearts with pure inspiration",
        koDetail: "당신은 맑은 시냇물이에요. 순수하고 깨끗하며, 흐르는 곳마다 생명을 줘요. 섬세하고 창의적이며, 강한 영적 감수성을 가지고 있어요. 다른 사람들이 못 느끼는 에너지를 느끼고, 못 보는 아름다움을 봐요. 어린 시절부터 감수성이 남달랐을 거예요. 다른 아이들이 뛰어노는 동안 당신은 하늘을 보며 생각에 잠겨 있었을 수도 있어요. 예민하다는 말을 많이 들었겠지만, 그 예민함이 바로 당신의 창의성의 원천이에요. 순수한 영감으로 세상을 감동시키는 것, 그게 당신이 태어난 이유예요.",
        enDetail: "You are a clear stream. Pure and clean, bringing life wherever you flow. Delicate, creative, with strong spiritual sensitivity. You feel energy others can't, see beauty others miss. Since childhood, your sensitivity was exceptional. While other kids played, you were lost in thought watching the sky. You've been called 'too sensitive,' but that sensitivity is the source of your creativity. Touching the world with pure inspiration—that's why you were born."
      },
    };

    // 감정 운명 - 더 공감 가는 표현 (확장)
    const emotionPatterns: Record<string, { ko: string; en: string; koDetail: string; enDetail: string }> = {
      wood: {
        ko: "답답하면 견딜 수가 없어요. 뭔가 시작하거나 움직여야 마음이 풀리는 타입.",
        en: "You can't stand feeling stuck. Starting something new is how you release stress.",
        koDetail: "당신의 감정은 새싹과 같아요. 움직이고, 자라고, 뻗어나가야 해요. 가만히 있으라고 하면 오히려 스트레스를 받아요. 답답한 상황에서는 무조건 뭔가를 시작하거나 몸을 움직여야 해요. 러닝, 등산, 새로운 프로젝트... 뭐든 상관없어요. 핵심은 '정체되지 않는 것'이에요. 화가 나면 참지 말고 바로 표현하는 게 나아요. 속으로 삭이면 오히려 더 커져요. 하지만 그 표현이 공격적이지 않게 조심하세요. '나는 이게 불편해'라고 담담하게 말하는 연습을 해보세요. 분노를 성장의 에너지로 바꾸는 법을 배우면, 당신은 무적이 돼요.",
        enDetail: "Your emotions are like sprouts—they need to move, grow, extend. Being told to 'just wait' actually stresses you more. In frustrating situations, you must start something or move your body. Running, hiking, new projects... anything works. The key is 'not being stagnant.' When angry, express it immediately rather than holding it in. Suppressing makes it bigger. Just be careful not to be aggressive. Practice saying 'This makes me uncomfortable' calmly. When you learn to turn anger into growth energy, you become unstoppable."
      },
      fire: {
        ko: "감정이 화끈하게 올라와요. 기쁘면 온몸으로 기뻐하고, 화나면 확 터질 수 있어요.",
        en: "Emotions hit you all at once. Joy is felt with your whole body.",
        koDetail: "당신의 감정은 불꽃이에요. 확 타오르고, 환하게 빛나고, 그리고 스르르 사라져요. 뒤끝이 없다는 건 당신의 큰 장점이에요. 어제 싸웠어도 오늘은 아무렇지 않게 대할 수 있어요. 하지만 그 순간의 감정이 너무 강해서 말실수를 하거나, 상대방에게 상처를 줄 수 있어요. 특히 자존심이 건드려졌을 때 조심하세요. '내가 무시당했다'는 느낌이 들면 이성적 판단이 어려워져요. 화가 나면 10초만 기다려보세요. 그 10초가 관계를 살릴 수 있어요. 당신의 열정은 세상을 따뜻하게 만들어요. 그 불꽃을 잘 다루는 법만 배우면 돼요.",
        enDetail: "Your emotions are flames—they ignite quickly, shine brightly, then softly fade. Having no grudges is your great strength. You can fight yesterday and act normal today. But that intense moment can lead to saying things you regret or hurting others. Be especially careful when your pride is touched. When you feel 'disrespected,' rational judgment becomes difficult. When angry, just wait 10 seconds. Those 10 seconds can save relationships. Your passion warms the world. You just need to learn to handle that flame."
      },
      earth: {
        ko: "웬만해선 흔들리지 않아요. 하지만 진짜 상처받으면 오래 가요.",
        en: "You don't shake easily. But when truly hurt, it lasts.",
        koDetail: "당신의 감정은 대지와 같아요. 안정적이고 묵직해요. 웬만한 일에는 흔들리지 않죠. 사람들은 당신의 그 차분함에 안심해요. 하지만 한번 무너지면 회복하는 데 시간이 오래 걸려요. 특히 신뢰가 깨졌을 때... 그건 당신에게 가장 큰 상처예요. '어떻게 그럴 수 있어?'라는 배신감이 마음속에서 쉽게 지워지지 않아요. 감정을 억누르지 마세요. '나 지금 많이 힘들어'라고 표현하는 게 필요해요. 혼자 다 감당하려 하지 말고, 가까운 사람에게 기대는 연습을 하세요. 당신이 모든 것을 지탱할 필요는 없어요. 때로는 무너져도 괜찮아요.",
        enDetail: "Your emotions are like the earth—stable and solid. Ordinary things don't shake you. People feel secure in your calmness. But once you crumble, recovery takes long. Especially when trust breaks—that's your deepest wound. The betrayal of 'How could they?' doesn't easily fade from your heart. Don't suppress emotions. You need to express 'I'm really struggling right now.' Don't try to handle everything alone; practice leaning on close ones. You don't need to support everything. It's okay to crumble sometimes."
      },
      metal: {
        ko: "밖에선 '쿨'해 보여도 속은 예민해요. 완벽하지 않으면 자책해요.",
        en: "You look 'cool' outside, but you're sensitive inside.",
        koDetail: "당신의 감정은 금속과 같아요. 겉은 차갑고 단단해 보이지만, 속은 의외로 섬세해요. 완벽하지 않으면 스스로를 자책하고, 작은 실수에도 오래 마음에 담아둬요. '왜 그랬을까' '더 잘할 수 있었는데'... 이런 생각이 반복돼요. 남들은 당신이 아무렇지 않은 줄 알지만, 실은 밤에 혼자 그 일을 곱씹고 있어요. 비판에 특히 민감해요. 누군가가 당신의 일에 '이건 좀 아닌 것 같아'라고 하면, 머릿속에서 그 말이 계속 맴돌아요. 스스로에게 너무 가혹하지 마세요. '완벽하지 않아도 괜찮아'라고 매일 자신에게 말해주세요.",
        enDetail: "Your emotions are like metal—cold and hard on the outside, but surprisingly delicate inside. When imperfect, you blame yourself, holding onto small mistakes for a long time. 'Why did I do that?' 'I could have done better'... these thoughts repeat. Others think you're fine, but you're actually replaying it alone at night. You're especially sensitive to criticism. When someone says 'This doesn't seem right,' that phrase keeps circling in your head. Don't be too harsh on yourself. Tell yourself daily 'It's okay not to be perfect.'"
      },
      water: {
        ko: "남들이 모르는 감정의 심연이 있어요. 혼자만의 시간이 꼭 필요해요.",
        en: "You have emotional depths others don't see. Alone time is essential.",
        koDetail: "당신의 감정은 깊은 바다와 같아요. 표면은 잔잔해 보이지만, 그 아래에는 복잡하고 깊은 감정의 흐름이 있어요. 남들은 당신이 무슨 생각을 하는지 잘 몰라요. 왜냐하면 당신은 쉽게 속을 보여주지 않거든요. 혼자만의 시간이 꼭 필요해요. 그 시간에 감정을 정리하고, 자신을 충전해요. 사람들과 너무 오래 있으면 에너지가 빠져요. 말하지 않아도 상대방의 감정을 읽어요. 그래서 다른 사람의 부정적 에너지에 영향받기 쉬워요. 자신과 타인의 감정 사이에 건강한 경계를 만드는 것이 중요해요. '그 사람의 문제는 내 문제가 아니야'라고 자신에게 말해주세요.",
        enDetail: "Your emotions are like the deep sea. The surface looks calm, but beneath are complex, deep emotional currents. Others don't know what you're thinking because you don't easily show your inner self. Alone time is essential—that's when you process emotions and recharge. Too much time with people drains you. You read others' emotions without words, making you susceptible to their negative energy. Creating healthy boundaries between your emotions and others' is crucial. Tell yourself 'Their problems are not my problems.'"
      },
    };

    // 관계 운명 패턴 - 더 현실적인 표현 (확장)
    const relationshipStyle: Record<string, { ko: string; en: string; koDetail: string; enDetail: string }> = {
      wood: {
        ko: "같이 성장하는 관계여야 해요. 정체된 관계는 숨이 막혀요.",
        en: "Relationships must grow together. Stagnant ones suffocate you.",
        koDetail: "당신에게 사랑은 '함께 성장하는 것'이에요. 어제보다 오늘 더 나은 우리가 되는 것. 상대방이 발전하지 않거나, 관계가 제자리인 것 같으면 답답해져요. '우리 이대로 괜찮은 거야?'라는 생각이 자꾸 들어요. 연애 초기에는 열정적으로 빠지지만, 관계가 익숙해지면서 권태기가 올 수 있어요. 그때 '새로운 것'을 함께 시작해보세요. 여행, 취미, 운동... 뭐든요. 함께 도전하고 성장하는 경험이 관계에 활력을 줘요. 주의할 점은, 상대방의 성장 속도가 당신과 다를 수 있다는 거예요. 조급하게 '왜 안 바뀌어?'라고 하면 상대방이 부담을 느껴요. 기다림도 사랑이에요.",
        enDetail: "For you, love is 'growing together.' Becoming better today than yesterday. When your partner isn't developing or the relationship seems stuck, you feel suffocated. 'Are we really okay like this?' keeps crossing your mind. You fall passionately early, but boredom can come as things get familiar. That's when you should start 'something new' together—travel, hobbies, exercise. Challenging and growing together revitalizes relationships. Be careful: your partner's growth pace may differ. Impatiently asking 'Why won't you change?' creates pressure. Patience is also love."
      },
      fire: {
        ko: "사랑할 때 온 마음을 쏟아요. 인정받고 싶고, 특별하게 대접받고 싶어요.",
        en: "You pour your whole heart into love. You want to feel special.",
        koDetail: "당신의 사랑은 한 편의 영화 같아요. 로맨틱하고, 열정적이고, 드라마틱해요. 사랑에 빠지면 온 세상에 알리고 싶고, 상대방에게 모든 것을 해주고 싶어요. 그만큼 상대방에게도 '특별한 대접'을 기대해요. 기념일을 잊어버리거나, 당신의 노력을 당연하게 여기면 상처받아요. '나 이렇게 열심히 하는데 왜 몰라줘?'라는 마음이 들어요. 자존심 싸움이 가장 큰 위험이에요. '내가 왜 먼저 사과해?'라는 생각이 들면 관계가 꼬여요. 열정이 식으면 관계도 급격히 식을 수 있어요. 일상의 작은 불꽃도 소중히 해주세요. 드라마틱한 순간만이 사랑이 아니에요.",
        enDetail: "Your love is like a movie—romantic, passionate, dramatic. When in love, you want to tell the world and do everything for your partner. You equally expect 'special treatment' in return. Forgotten anniversaries or your efforts being taken for granted hurt you. 'I'm trying so hard, why don't they see?' Pride fights are the biggest danger. 'Why should I apologize first?' thinking tangles relationships. When passion cools, relationships can cool rapidly. Cherish small daily sparks too. Dramatic moments aren't the only form of love."
      },
      earth: {
        ko: "한번 마음 주면 오래 가요. 대신 그만큼 배신에 약해요.",
        en: "Once you commit, you stay long. But betrayal hits you hard.",
        koDetail: "당신의 사랑은 대지와 같아요. 한번 마음을 주면 쉽게 변하지 않아요. 묵묵히 상대방을 지지하고, 행동으로 사랑을 보여줘요. '사랑해'라고 말하는 대신 맛있는 밥을 차려주거나, 필요한 것을 사다 줘요. 하지만 그만큼 배신에 약해요. 신뢰가 깨지면 회복이 정말 어려워요. '어떻게 그럴 수 있어?'라는 생각이 오래 가고, 용서해도 마음 한 구석에 상처가 남아요. 새로운 관계를 시작하는 것도 조심스러워요. '또 상처받으면 어쩌지?'라는 두려움이 있어요. 하지만 그 신중함 때문에, 당신과 함께하는 관계는 정말 깊고 오래가요. 믿음이 사랑의 전부라는 것을 당신은 알아요.",
        enDetail: "Your love is like the earth. Once you commit, you don't easily change. You silently support your partner, showing love through actions—cooking meals instead of saying 'I love you,' buying what's needed. But you're equally vulnerable to betrayal. When trust breaks, recovery is really hard. 'How could they?' lingers long; even when forgiven, a wound remains in your heart. Starting new relationships is cautious too—fear of 'What if I'm hurt again?' But that caution makes your relationships truly deep and lasting. You know trust is everything in love."
      },
      metal: {
        ko: "기준이 높아서 쉽게 마음을 안 열어요. 하지만 진심이 통하면 누구보다 깊이 빠져요.",
        en: "High standards make you slow to open up. Once sincere, you fall deep.",
        koDetail: "당신은 사랑에서도 기준이 높아요. 아무에게나 마음을 열지 않아요. 첫 만남에서 상대방의 옷차림, 말투, 매너 하나하나가 다 체크돼요. '저 사람 정말 괜찮은 걸까?'라는 의심이 쉽게 사라지지 않아요. 하지만 일단 마음을 주면, 정말 깊이 빠져요. 상대방을 위해 완벽한 서프라이즈를 준비하고, 기념일 하나 놓치지 않아요. 문제는 상대방에게도 그만큼을 기대하게 된다는 거예요. '나는 이렇게 했는데 왜 너는...'이라는 생각이 들면 실망해요. 완벽한 사람은 없다는 것을 기억하세요. 당신 포함해서요. 상대방의 불완전함을 사랑하는 것도 사랑이에요.",
        enDetail: "You have high standards in love too. You don't open up to just anyone. On first meeting, you check everything—clothes, speech, manners. 'Are they really good enough?' doesn't easily fade. But once you give your heart, you fall truly deep. You prepare perfect surprises, never missing anniversaries. The problem is expecting the same from your partner. 'I did this, so why don't you...' leads to disappointment. Remember no one is perfect—including you. Loving your partner's imperfections is also love."
      },
      water: {
        ko: "영혼의 연결을 원해요. 피상적인 관계는 공허해요.",
        en: "You want soul connections. Surface relationships feel empty.",
        koDetail: "당신은 사랑에서 '영혼의 연결'을 원해요. 말하지 않아도 통하는, 눈빛만 봐도 알 수 있는 그런 깊은 교감. 피상적인 만남, 가벼운 관계는 공허하게 느껴져요. 상대방의 표면적인 매력보다 내면의 깊이에 끌려요. '이 사람은 나를 진짜로 이해할 수 있을까?'가 가장 중요한 질문이에요. 문제는 그런 깊은 연결을 찾기가 쉽지 않다는 거예요. 많은 사람을 만나도 '이 사람 아니야'라는 느낌이 들어서 관계가 깊어지기 전에 끝나버려요. 때로는 완벽한 영혼의 연결을 기다리기보다, 현재의 관계에서 깊이를 만들어가는 것도 방법이에요. 깊이는 찾는 것이 아니라 함께 만드는 거예요.",
        enDetail: "You want 'soul connection' in love. Deep communion where you understand without words, knowing just by looking. Surface meetings and light relationships feel empty. You're drawn to inner depth over surface charm. 'Can this person truly understand me?' is your most important question. The problem is finding such deep connections isn't easy. Even meeting many people, 'This isn't the one' feeling ends relationships before they deepen. Sometimes rather than waiting for perfect soul connection, building depth in current relationships works. Depth isn't found—it's created together."
      },
    };

    // 커리어 운명 - 더 와닿는 표현 (확장)
    const careerDestiny: Record<string, { ko: string; en: string; koDetail: string; enDetail: string }> = {
      wood: {
        ko: "0에서 1을 만드는 일이 어울려요. 새로운 시작이 있는 곳에서 빛나요.",
        en: "You shine when creating something from nothing. New beginnings are yours.",
        koDetail: "당신은 개척자예요. 이미 있는 것을 유지하는 건 답답해요. 새로운 것을 시작하고, 없던 것을 만들어내고, 길이 없는 곳에 길을 만드는 것. 그게 당신의 일이에요. 스타트업, 신규 프로젝트, 해외 진출... 뭐든 '처음'이라는 단어가 붙으면 눈이 반짝여요. 반복적인 업무, 정해진 틀 안에서의 일은 에너지를 빼앗아가요. 성장의 기회가 보이지 않는 조직에서는 버티기 어려워요. 커리어 팁: 당신에게 필요한 건 '자유도'예요. 어느 정도 재량권이 있는 역할을 찾으세요. 그리고 인생에서 최소 한 번은 직접 무언가를 시작해보세요. 창업이든, 프로젝트든, 커뮤니티든. 그때 당신의 진가가 나타날 거예요.",
        enDetail: "You're a pioneer. Maintaining what exists is stifling. Starting new things, creating what didn't exist, making paths where there were none—that's your work. Startups, new projects, overseas expansion... your eyes sparkle at anything with 'first' attached. Repetitive work within fixed frameworks drains your energy. Organizations without visible growth opportunities are hard to endure. Career tip: You need 'freedom.' Find roles with some autonomy. And at least once in life, start something yourself—business, project, community. That's when your true worth appears."
      },
      fire: {
        ko: "무대가 필요해요. 사람들 앞에서 영향력을 발휘할 때 진가가 나와요.",
        en: "You need a stage. You shine when you're visible and impactful.",
        koDetail: "당신에게는 무대가 필요해요. 숨어서 일하면 에너지가 빠져요. 사람들 앞에서, 주목받으면서, 영향력을 발휘할 때 진가가 나타나요. 프레젠테이션, 강연, 방송, 영업... 이런 일에서 다른 사람보다 훨씬 빛나요. 뒤에서 묵묵히 지원하는 역할보다는 앞에 서서 이끄는 역할이 맞아요. 인정받지 못한다고 느끼면 의욕이 뚝 떨어져요. '내가 이렇게 열심히 하는데 왜 몰라주지?'라는 생각이 들면 번아웃 신호예요. 커리어 팁: 당신의 존재감을 드러낼 수 있는 위치를 찾으세요. 그리고 인정과 피드백을 자주 받을 수 있는 환경을 만드세요. 당신의 에너지는 '반응'을 먹고 자라요.",
        enDetail: "You need a stage. Working in the shadows drains you. In front of people, receiving attention, wielding influence—that's when your true worth appears. Presentations, lectures, broadcasting, sales... you shine far more than others in these roles. Leading from the front suits you better than silently supporting from behind. When you feel unrecognized, motivation drops immediately. 'I'm working so hard, why don't they see?' is a burnout signal. Career tip: Find positions where you can show your presence. Create environments where you receive frequent recognition and feedback. Your energy grows on 'reactions.'"
      },
      earth: {
        ko: "단단한 것을 쌓는 일이 어울려요. 묵직하게 가치를 만들 때 성공해요.",
        en: "Building something solid suits you. Success comes from steady value creation.",
        koDetail: "당신은 건축가예요. 빠르게 달리기보다 묵직하게 쌓아가는 것. 당장 결과가 안 보여도 꾸준히 가치를 만들어가는 것. 그게 당신의 방식이에요. 단기간에 성과를 내야 하는 환경보다, 시간을 두고 성장할 수 있는 환경이 맞아요. 부동산, 건축, 금융, 농업, 제조업... 뭔가를 '쌓는' 일이 어울려요. 조직에서도 안정적이고 신뢰받는 역할을 하게 돼요. 사람들은 당신에게 중요한 일을 맡겨요. 커리어 팁: 조급하게 비교하지 마세요. 토끼와 거북이 경주에서 당신은 거북이예요. 결국 이기는 건 당신이에요. 꾸준함이 당신의 가장 큰 무기라는 것을 기억하세요.",
        enDetail: "You're an architect. Steadily building rather than running fast. Creating value consistently even when results aren't immediately visible. That's your way. Environments requiring short-term results don't suit you—ones allowing time for growth do. Real estate, architecture, finance, agriculture, manufacturing... 'building' work suits you. In organizations, you take stable, trusted roles. People entrust important matters to you. Career tip: Don't compare impatiently. In the tortoise and hare race, you're the tortoise. You win in the end. Remember consistency is your greatest weapon."
      },
      metal: {
        ko: "전문가의 길이 어울려요. 끝까지 파고들어 정점을 찍을 때 빛나요.",
        en: "The expert path suits you. You shine when you reach the peak of mastery.",
        koDetail: "당신은 장인이에요. 대충은 못해요. 무엇을 하든 끝까지 파고들어야 해요. '이 정도면 됐지'라는 말은 당신의 사전에 없어요. 그래서 전문가의 길이 어울려요. 한 분야를 깊이 파서 정점을 찍을 때 진가가 나타나요. 의사, 변호사, 엔지니어, 디자이너, 연구원... 전문성이 인정받는 분야에서 빛나요. 여러 가지를 동시에 하는 것보다 하나에 집중하는 것이 맞아요. 커리어 팁: 당신의 완벽주의가 때로는 발목을 잡을 수 있어요. '완벽하지 않아도 일단 내보내기'를 연습하세요. 80%의 완성도로 빨리 피드백 받는 것이 100%를 기다리다 기회를 놓치는 것보다 나아요.",
        enDetail: "You're a craftsman. You can't do things halfway. Whatever you do, you must dig deep. 'Good enough' isn't in your vocabulary. That's why the expert path suits you. Digging deep in one field to reach the peak shows your true worth. Doctor, lawyer, engineer, designer, researcher... fields where expertise is recognized are where you shine. Focusing on one thing rather than multitasking suits you. Career tip: Your perfectionism can sometimes hold you back. Practice 'shipping even when imperfect.' Getting feedback quickly at 80% completion beats waiting for 100% and missing opportunities."
      },
      water: {
        ko: "깊이가 필요한 일이 어울려요. 남들이 못 보는 것을 보는 통찰력이 무기예요.",
        en: "Work requiring depth suits you. Your weapon is insight—seeing what others miss.",
        koDetail: "당신은 현자예요. 남들이 못 보는 것을 보고, 못 느끼는 것을 느껴요. 표면적인 일보다 깊이가 필요한 일이 어울려요. 연구, 분석, 전략, 상담, 심리, 철학... 생각하는 힘이 필요한 분야에서 빛나요. 팀에서 '왜?'라는 질문을 던지는 사람이 당신이에요. 남들이 당연하게 여기는 것에 질문을 던지고, 새로운 관점을 제시해요. 직관이 강해서 '느낌'으로 결정할 때 정확할 때가 많아요. 커리어 팁: 당신의 통찰력을 살릴 수 있는 역할을 찾으세요. 실행보다는 기획, 운영보다는 전략이 맞아요. 그리고 혼자 생각할 시간을 확보하세요. 그 시간이 당신의 가장 생산적인 시간이에요.",
        enDetail: "You're a sage. You see what others can't, feel what others miss. Work requiring depth suits you better than surface-level tasks. Research, analysis, strategy, counseling, psychology, philosophy... fields needing thinking power are where you shine. You're the one asking 'why?' in teams. You question what others take for granted and offer new perspectives. Strong intuition makes 'gut feeling' decisions often accurate. Career tip: Find roles that leverage your insight. Planning over execution, strategy over operations suits you. And secure alone thinking time. That's your most productive time."
      },
    };

    return {
      lifeTheme: lifeThemes[data.dayMasterName] || lifeThemes["갑"],
      emotionPattern: emotionPatterns[strongEl],
      relationshipStyle: relationshipStyle[dayEl],
      careerDestiny: careerDestiny[strongEl],
    };
  }, [data]);

  // 운명이 풀리는 선택 5가지 - 더 실용적이고 와닿는 조언
  const destinyChoices = useMemo(() => {
    if (!data) {
      return [];
    }

    const weakEl = data.weakest[0];

    const choices: { emoji: string; title: string; ko: string; detail: string }[] = [
      {
        emoji: "🎯",
        title: isKo ? "남들이 뭐라 하든 내 방식대로" : "My way, regardless",
        ko: `눈치 보느라 에너지 낭비하지 마세요. 결국 당신답게 살 때 길이 열려요.`,
        detail: isKo
          ? `사람들이 '이렇게 해야 돼', '그건 좀 이상한데'라고 말할 때마다 신경 쓰느라 정작 본인이 원하는 게 뭔지 모를 때가 많아요. 다른 사람 기준에 맞추려다가 에너지만 빠지고 아무것도 못 해요. 결정할 때 '남들이 뭐라 할까?'보다 '내가 진짜 원하는 게 뭐지?'를 먼저 물어보세요.`
          : `People often say 'you should do it this way' or 'that's weird', and caring about it prevents you from knowing what you really want. Trying to meet others' standards drains energy without achieving anything. When deciding, ask 'what do I really want?' before 'what will others say?'`
      },
      {
        emoji: "💬",
        title: isKo ? "감정이 복잡할 땐 일단 써보세요" : "Write when emotions tangle",
        ko: `머릿속에만 두면 더 꼬여요. 말이든 글이든 밖으로 꺼내야 정리돼요.`,
        detail: isKo
          ? `화나거나 답답할 때 혼자 생각만 하면 똑같은 생각이 계속 돌아요. 그럴 때 노트에 막 써보세요. 형식 없이 '진짜 화난다', '왜 이렇게 서러운지 모르겠다' 이렇게요. 쓰다 보면 '아, 내가 이것 때문에 힘들었구나'가 보여요. 믿는 사람한테 말하는 것도 좋아요. 그냥 들어주는 사람만 있어도 마음이 가벼워져요.`
          : `When angry or frustrated, thinking alone just loops the same thoughts. That's when you should write in a notebook—no format, just 'I'm really angry' or 'I don't know why I'm so hurt'. Writing reveals 'ah, this is what was bothering me'. Talking to someone you trust helps too. Just having someone listen lightens your heart.`
      },
      {
        emoji: "💕",
        title: isKo ? "사랑에서 이기려고 하지 마세요" : "Don't try to win in love",
        ko: `힘겨루기는 둘 다 지치게 해요. 규칙과 경계가 오히려 관계를 편하게 해요.`,
        detail: isKo
          ? `싸우면 '내가 맞다'는 걸 증명하려고 해요. 그런데 이기면 뭐해요? 상대방은 상처받고 관계만 나빠져요. 중요한 건 '누가 맞나'가 아니라 '우리 어떻게 할까'예요. 규칙 정하세요. '밤 11시 넘으면 싸우지 말자', '화났을 때 욕하지 말자'. 이런 작은 약속이 관계를 지켜요.`
          : `When fighting, you try to prove 'I'm right'. But what if you win? Your partner gets hurt and the relationship worsens. What matters isn't 'who's right' but 'what should we do'. Set rules—'no fighting past 11pm', 'no cursing when angry'. These small promises protect relationships.`
      },
      {
        emoji: "📈",
        title: isKo ? "커리어는 시스템이 답이에요" : "Systems are the answer",
        ko: `열심히만 하면 번아웃. 구조를 만들면 운도 따라와요.`,
        detail: isKo
          ? `매일 야근하고 주말에도 일하면 처음엔 잘 되는 것 같아요. 그런데 6개월 지나면 지쳐서 아무것도 못 해요. 시스템을 만드세요. '월요일 오전엔 기획, 오후엔 실행', '금요일은 정리의 날'. 루틴을 만들면 덜 피곤하고 더 많이 해요. 체크리스트, 템플릿, 자동화... 반복되는 건 구조로 만들어두세요.`
          : `Working late daily and on weekends seems productive at first. But 6 months later, you're exhausted and can't do anything. Build systems—'Monday mornings for planning, afternoons for execution', 'Friday is organization day'. Routines make you less tired and more productive. Checklists, templates, automation... structure what repeats.`
      },
      {
        emoji: elementTraits[weakEl]?.emoji || "🌊",
        title: isKo ? `${elementTraits[weakEl]?.ko} 기운 보충하세요` : `Add ${elementTraits[weakEl]?.en} energy`,
        ko: `이 에너지를 일상에 더하면 놀랍게 균형이 잡혀요.`,
        detail: isKo
          ? weakEl === "wood" ? `나무 기운 부족이에요. 새로운 시작, 성장, 활력이 필요해요. 아침에 스트레칭하거나, 식물 키우거나, 새로운 프로젝트 시작해보세요. 초록색 옷이나 소품도 도움 돼요.` :
            weakEl === "fire" ? `불 기운 부족이에요. 열정, 표현, 밝은 에너지가 필요해요. 사람들 만나서 수다 떨거나, 좋아하는 음악 크게 틀거나, 빨간색/주황색 아이템 쓰세요.` :
            weakEl === "earth" ? `흙 기운 부족이에요. 안정, 신뢰, 든든함이 필요해요. 규칙적인 식사, 충분한 수면, 정리 정돈이 도움 돼요. 노란색/갈색 소품을 주변에 두세요.` :
            weakEl === "metal" ? `쇠 기운 부족이에요. 결단, 정리, 분명함이 필요해요. 필요 없는 거 버리고, 할 일 목록 만들고, 운동으로 몸 단련하세요. 흰색/금색 아이템 좋아요.` :
            `물 기운 부족이에요. 유연함, 직관, 쉼이 필요해요. 물 많이 마시고, 목욕하고, 혼자만의 시간 가지세요. 검정색/파란색 소품 추천해요.`
          : weakEl === "wood" ? `Low on Wood energy. You need new beginnings, growth, vitality. Try morning stretches, growing plants, starting new projects. Green clothes/items help.` :
            weakEl === "fire" ? `Low on Fire energy. You need passion, expression, bright energy. Meet people and chat, play favorite music loud, use red/orange items.` :
            weakEl === "earth" ? `Low on Earth energy. You need stability, trust, solidity. Regular meals, sufficient sleep, organizing help. Keep yellow/brown items nearby.` :
            weakEl === "metal" ? `Low on Metal energy. You need decisiveness, clarity, definition. Throw away unnecessary things, make to-do lists, train your body with exercise. White/gold items work.` :
            `Low on Water energy. You need flexibility, intuition, rest. Drink lots of water, take baths, have alone time. Black/blue items recommended.`
      },
    ];

    return choices;
  }, [data]);

  if (!data) {
    return null;
  }

  // ?? ?? ?? ? ???
  const totalElements = Object.values(data.fiveElements).reduce((a, b) => (a as number) + (b as number), 0) as number;
  const normalizedElements = Object.entries(data.fiveElements).map(([el, val]) => ({
    element: el,
    value: totalElements > 0 ? Math.round(((val as number) / totalElements) * 100) : 20,
    raw: val as number,
  })).sort((a, b) => b.value - a.value);

  const sunData = data.sunSign ? zodiacData[data.sunSign] : null;
  const moonData = data.moonSign ? zodiacData[data.moonSign] : null;

  return (
    <div className={`mt-8 space-y-6 ${className}`}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 운명의 한 줄 요약 - 히어로 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900/40 to-slate-900 border border-purple-500/30 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* 운명 한 줄 */}
        <div className="relative mb-6">
          <p className="text-xl md:text-2xl text-gray-100 leading-relaxed font-medium">
            {isKo ? (
              <>
                &quot;<span className="text-amber-400">{data.dayMasterInfo.personality.ko}</span>이 세상에 드러내되,{" "}
                <span className="text-purple-400">{sunData?.ko || "알 수 없음"}</span>의 외면과{" "}
                <span className="text-blue-400">{moonData?.ko || "알 수 없음"}</span>의 내면으로{" "}
                <span className="text-emerald-400">&apos;{destinyNarrative?.lifeTheme?.ko || "나만의 길"}&apos;</span>을 이루는 운명.&quot;
              </>
            ) : (
              <>
                &quot;A <span className="text-amber-400">{data.dayMasterInfo.personality.en}</span> showing to the world,{" "}
                with <span className="text-purple-400">{sunData?.en || "Unknown"}</span> exterior and{" "}
                <span className="text-blue-400">{moonData?.en || "Unknown"}</span> interior,{" "}
                walking the path of <span className="text-emerald-400">&apos;{destinyNarrative?.lifeTheme?.en || "your own way"}&apos;</span>.&quot;
              </>
            )}
          </p>
        </div>

        {/* 핵심 프로필 뱃지 */}
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
            <span className="text-lg">{data.dayMasterInfo.animal}</span>
            <span className="text-amber-300 font-medium">
              {isKo
                ? (data.dayMasterName === "신" ? "보석 같은 사람" :
                   data.dayMasterName === "갑" ? "리더 같은 사람" :
                   data.dayMasterName === "을" ? "유연한 사람" :
                   data.dayMasterName === "병" ? "밝은 사람" :
                   data.dayMasterName === "정" ? "따뜻한 사람" :
                   data.dayMasterName === "무" ? "든든한 사람" :
                   data.dayMasterName === "기" ? "포용적인 사람" :
                   data.dayMasterName === "경" ? "시원시원한 사람" :
                   data.dayMasterName === "임" ? "깊은 사람" :
                   data.dayMasterName === "계" ? "순수한 사람" : "특별한 사람")
                : (data.dayMasterName === "신" ? "Gem-like" :
                   data.dayMasterName === "갑" ? "Leader" :
                   data.dayMasterName === "을" ? "Flexible" :
                   data.dayMasterName === "병" ? "Bright" :
                   data.dayMasterName === "정" ? "Warm" :
                   data.dayMasterName === "무" ? "Solid" :
                   data.dayMasterName === "기" ? "Nurturing" :
                   data.dayMasterName === "경" ? "Decisive" :
                   data.dayMasterName === "임" ? "Deep" :
                   data.dayMasterName === "계" ? "Pure" : "Special")}
            </span>
          </div>
          {sunData && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30">
              <span className="text-lg">{sunData.emoji}</span>
              <span className="text-purple-300 font-medium">{isKo ? `겉모습: ${sunData.ko}` : `Outer: ${sunData.en}`}</span>
            </div>
          )}
          {moonData && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
              <span className="text-lg">🌙</span>
              <span className="text-blue-300 font-medium">{isKo ? `속마음: ${moonData.ko}` : `Inner: ${moonData.en}`}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: elementTraits[data.strongest[0]]?.bgColor, border: `1px solid ${elementTraits[data.strongest[0]]?.color}` }}>
            <span className="text-lg">{elementTraits[data.strongest[0]]?.emoji}</span>
            <span className="font-medium" style={{ color: elementTraits[data.strongest[0]]?.color }}>
              {isKo ? `많은 쪽: ${elementTraits[data.strongest[0]]?.ko}` : `Strong: ${elementTraits[data.strongest[0]]?.en}`}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: elementTraits[data.weakest[0]]?.bgColor, border: `1px solid ${elementTraits[data.weakest[0]]?.color}` }}>
            <span className="text-lg">{elementTraits[data.weakest[0]]?.emoji}</span>
            <span className="font-medium" style={{ color: elementTraits[data.weakest[0]]?.color }}>
              {isKo ? `부족한 쪽: ${elementTraits[data.weakest[0]]?.ko}` : `Weak: ${elementTraits[data.weakest[0]]?.en}`}
            </span>
          </div>
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 강점과 약점 - 사주+점성 통합 분석 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const analysis = getStrengthsAndWeaknesses(saju, astro, lang);
        if (!analysis) return null;

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/50 p-6 mb-8">
            {/* 강점 섹션 */}
            {analysis.strengths.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💪</span>
                  <h3 className="text-lg font-bold text-green-300">{isKo ? "최고의 강점" : "Top Strengths"}</h3>
                </div>
                <div className="space-y-3">
                  {analysis.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <div className="flex-1">
                        <p className="text-gray-200 text-sm leading-relaxed">{strength.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 약점 섹션 */}
            {analysis.weaknesses.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🎯</span>
                  <h3 className="text-lg font-bold text-amber-300">{isKo ? "보완할 점" : "Areas to Improve"}</h3>
                </div>
                <div className="space-y-3">
                  {analysis.weaknesses.map((weakness, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-amber-400 mt-0.5">!</span>
                        <div className="flex-1">
                          <p className="text-gray-200 text-sm leading-relaxed">{weakness.text}</p>
                        </div>
                      </div>
                      <div className="ml-6 mt-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 text-sm">💡</span>
                          <p className="text-gray-300 text-xs leading-relaxed">{weakness.advice}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1) 나는 어떤 사람인가 - 간단하고 구체적으로 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const dmName = data.dayMasterName || "";
        const getDayMasterStory = (dm: string) => {
          const stories: Record<string, { title: string; story: string; core: string; advice: string }> = {
            "갑": {
              title: isKo ? "당당하고 뚝심 있는 사람" : "Confident and Tenacious Person",
              story: isKo
                ? "한번 정한 건 끝까지 밀고 나가요. 주변에서 '믿음직스럽다'는 소리를 자주 들어요. 자존심이 강해서 남 앞에서 약한 모습 잘 안 보이죠. 리더 역할이 잘 맞고, 책임감도 강해요. 고집스럽다는 얘기도 들을 수 있지만, 그만큼 신념이 확실한 거예요."
                : "Once you decide something, you push through to the end. People often say you're dependable. Strong pride means you rarely show weakness. Leadership suits you, and you're very responsible. Some may call you stubborn, but that just means your convictions are clear.",
              core: isKo ? "추진력, 책임감, 리더십" : "Drive, responsibility, leadership",
              advice: isKo ? "가끔은 다른 사람 말도 들어보세요. 내 방식만 고집하면 외로워질 수 있어요." : "Listen to others sometimes. Insisting only on your way can get lonely."
            },
            "을": {
              title: isKo ? "부드럽지만 끈질긴 사람" : "Soft but Persistent Person",
              story: isKo
                ? "부딪치기보다는 돌아가는 걸 택해요. 환경에 잘 적응하고, 사람 사이에서 중재를 잘해요. 예민한 편이라 분위기를 빨리 읽어요. 남들한테는 잘 맞춰주는데, 정작 본인 의견은 잘 안 내죠. 부드러워 보이지만, 속으로는 포기 안 하는 성격이에요."
                : "You choose to go around rather than confront. You adapt well and mediate between people. Quite sensitive, you read atmospheres quickly. You accommodate others well but rarely voice your own opinions. You seem soft, but inside you never give up.",
              core: isKo ? "적응력, 중재 능력, 끈기" : "Adaptability, mediation, persistence",
              advice: isKo ? "남한테만 맞추지 말고, 내 의견도 말하세요. 안 그러면 나중에 후회해요." : "Don't just accommodate others—state your opinions. Otherwise you'll regret it later."
            },
            "병": {
              title: isKo ? "밝고 열정적인 사람" : "Bright and Passionate Person",
              story: isKo
                ? "어디를 가든 눈에 띄어요. 말을 재밌게 잘하고, 사람들 시선을 끌죠. 좋으면 확 좋아하고, 싫으면 티 나요. 솔직해서 속마음 감추는 거 못해요. 에너지가 넘쳐서 가만히 있는 걸 못 견뎌요. 열정적이지만 한 가지에 오래 집중하긴 힘들어요."
                : "You stand out wherever you go. You talk entertainingly and draw attention. When you like something, it shows; when you don't, it shows too. So honest you can't hide your feelings. Overflowing with energy, you can't stand staying still. Passionate but hard to focus long on one thing.",
              core: isKo ? "표현력, 열정, 친화력" : "Expressiveness, passion, sociability",
              advice: isKo ? "한꺼번에 여러 가지 하지 말고, 하나씩 끝내보세요. 그게 더 멋있어요." : "Don't do many things at once—finish one at a time. That's cooler."
            },
            "정": {
              title: isKo ? "섬세하고 따뜻한 사람" : "Delicate and Warm Person",
              story: isKo
                ? "감정이 풍부하고 예민해요. 남들이 못 보는 작은 것까지 신경 쓰고, 디테일에 강해요. 겉으로는 차분해 보이지만 속으로는 생각이 많아요. 예술적 감각이 있고, 로맨틱한 걸 좋아해요. 서운한 것도 잘 참는데, 그러다가 한번에 터질 때가 있어요."
                : "Rich and sensitive emotions. You notice small things others miss and are strong with details. You look calm outside but think a lot inside. You have artistic sense and like romantic things. You endure hurt feelings well, but sometimes explode all at once.",
              core: isKo ? "세심함, 감수성, 예술성" : "Attentiveness, sensitivity, artistry",
              advice: isKo ? "서운한 거 쌓아두지 말고, 바로바로 말하세요. 안 그러면 나중에 폭발해요." : "Don't accumulate hurt—say it right away. Otherwise you'll explode later."
            },
            "무": {
              title: isKo ? "든든하고 믿음직한 사람" : "Reliable and Trustworthy Person",
              story: isKo
                ? "주변에서 '네가 있으니까 든든하다'는 말을 많이 들어요. 책임감이 강해서 맡은 일은 꼭 해내요. 말은 별로 없는데, 행동으로 다 보여줘요. 안정적인 걸 좋아하고, 급하게 변하는 거 싫어해요. 다 혼자 떠안으려다가 지칠 수 있어요."
                : "People often say 'I feel secure with you around.' Strong sense of responsibility—you always complete what you take on. You don't talk much but show everything through actions. You like stability and dislike rapid change. You may get exhausted trying to shoulder everything alone.",
              core: isKo ? "안정감, 신뢰, 책임감" : "Stability, trust, responsibility",
              advice: isKo ? "다 혼자 하려고 하지 마세요. 도움 받는 것도 능력이에요." : "Don't try to do everything alone. Accepting help is also a skill."
            },
            "기": {
              title: isKo ? "꼼꼼하고 현실적인 사람" : "Meticulous and Realistic Person",
              story: isKo
                ? "걱정이 많아요. 미리미리 준비하고, 계획 세우는 거 좋아해요. 남 챙기는 걸 좋아하고, 실용적이에요. 허황된 것보다 확실한 걸 택해요. 다른 사람이 걱정되면 밤새 생각해요. 현실적이라 냉정해 보일 수 있지만, 속은 따뜻해요."
                : "You worry a lot. You prepare in advance and like planning. You like taking care of others and are practical. You choose certainty over fantasy. When worried about someone, you think about it all night. You seem cold for being realistic, but you're warm inside.",
              core: isKo ? "계획성, 실용성, 배려심" : "Planning, practicality, consideration",
              advice: isKo ? "걱정만 하지 말고, 실행하세요. 생각만 하면 더 불안해져요." : "Don't just worry—act. Only thinking makes you more anxious."
            },
            "경": {
              title: isKo ? "시원시원하고 의리 있는 사람" : "Straightforward and Loyal Person",
              story: isKo
                ? "흑백이 확실해요. 옳고 그름에 민감하고, 불의를 못 참아요. 한번 정하면 바로 실행하고, 뒤돌아보지 않아요. 차가워 보이지만 한번 마음 준 사람한테는 끝까지 의리 지켜요. 감정을 빨리 정리하는 편인데, 그러다 보니 남들은 '냉정하다'고 느낄 수 있어요."
                : "Black and white are clear. Sensitive to right and wrong, you can't stand injustice. Once decided, you act immediately without looking back. You seem cold, but you're loyal to the end to those you've given your heart to. You process emotions quickly, which can make others feel you're cold.",
              core: isKo ? "결단력, 정의감, 의리" : "Decisiveness, justice, loyalty",
              advice: isKo ? "감정도 좀 느껴보세요. 너무 빨리 자르면 나중에 후회할 수 있어요." : "Feel emotions a bit. Cutting too quickly may lead to regrets later."
            },
            "신": {
              title: isKo ? "섬세하고 완벽주의인 사람" : "Delicate and Perfectionist Person",
              story: isKo
                ? "'그냥'이란 게 없어요. 디테일에 집착하고, 완벽하게 하려고 해요. 예술적 감각이 뛰어나서 아름다운 것들을 알아보고, 평범한 것도 특별하게 만드는 능력이 있어요. 겉으로는 냉정해 보이지만 속으로는 열정이 많고 감정도 풍부해요. 비판받는 걸 예민하게 받아들이고, 자존심도 강한 편이에요. 사람들이 당신의 안목과 취향을 신뢰하고 따르는데, 정작 본인은 자신에게 가장 가혹한 비평가예요. 거울을 볼 때마다 단점만 보이고, 완벽하지 못하다는 두려움에 시작조차 못할 때가 많아요."
                : "Nothing is 'just anything' to you. You obsess over details and try to be perfect. Excellent artistic sense lets you recognize beautiful things and make ordinary things extraordinary. You look calm outside but have lots of passion and rich emotions inside. You're sensitive to criticism and have strong pride. People trust and follow your eye and taste, but you're your own harshest critic. Every mirror shows only flaws, and fear of imperfection often stops you from even starting.",
              core: isKo ? "완벽주의, 미적 감각, 섬세함" : "Perfectionism, aesthetic sense, delicacy",
              advice: isKo ? "완벽하려고 너무 애쓰지 마세요. 70%만 해도 충분히 잘한 거예요. 금이 간 도자기도 아름답듯이, '있는 그대로도 괜찮아'라고 스스로에게 말해주세요." : "Don't try too hard to be perfect. Even 70% is good enough. Like cracked pottery is beautiful, tell yourself 'It's okay just as it is.'"
            },
            "임": {
              title: isKo ? "넓고 깊은 마음을 가진 사람" : "Person with Wide and Deep Heart",
              story: isKo
                ? "포용력이 넓어요. 남의 얘기를 잘 들어주고, 판단하지 않아요. 지혜롭고 통찰력이 있어서 문제의 핵심을 파악해요. 자유를 사랑하고, 얽매이는 거 싫어해요. 차분해 보이지만 속으로는 생각이 깊어요. 가끔은 혼자 있는 시간이 꼭 필요해요."
                : "Wide embrace. You listen well to others without judging. Wise and insightful, you grasp the core of problems. You love freedom and hate being tied down. You look calm but think deeply inside. Sometimes you absolutely need alone time.",
              core: isKo ? "포용력, 통찰력, 자유로움" : "Embrace, insight, freedom",
              advice: isKo ? "혼자만의 시간도 좋지만, 가끔은 속마음도 나누세요. 혼자 다 품으면 힘들어요." : "Alone time is good, but share your heart sometimes. Keeping everything inside is hard."
            },
            "계": {
              title: isKo ? "조용하지만 깊은 사람" : "Quiet but Deep Person",
              story: isKo
                ? "직관이 뛰어나요. 말 안 해도 분위기로 느껴요. 감성이 풍부하고 예민해서, 남들이 신경 안 쓰는 것도 캐치해요. 겉으로는 조용한데 속으로는 생각이 복잡해요. 치유하는 에너지가 있어서, 당신이 있으면 사람들이 편안해해요."
                : "Excellent intuition. You sense atmosphere without words. Rich emotions and sensitivity let you catch what others don't notice. Quiet outside, complex thoughts inside. You have healing energy—people feel comfortable with you.",
              core: isKo ? "직관, 감수성, 치유력" : "Intuition, sensitivity, healing",
              advice: isKo ? "남 챙기는 것도 좋은데, 본인 마음도 좀 챙기세요. 당신도 쉬어야 해요." : "Taking care of others is good, but care for yourself too. You need rest."
            }
          };
          return stories[dm] || {
            title: isKo ? "독특한 매력을 가진 사람" : "Person with Unique Charm",
            story: isKo ? "당신만의 특별한 매력이 있어요. 주변 사람들이 그걸 느끼고 있어요." : "You have your own special charm. People around you feel it.",
            core: isKo ? "당신만의 강점" : "Your unique strengths",
            advice: isKo ? "있는 그대로의 당신이 좋아요." : "You're good just as you are."
          };
        };
        const dmStory = getDayMasterStory(dmName);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🌟</span>
              <h3 className="text-lg font-bold text-amber-300">{isKo ? "나는 어떤 사람인가" : "Who Am I"}</h3>
            </div>

            <div className="space-y-4">
              {/* 기본 성격 */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-300 font-bold mb-3 text-base">{dmStory.title}</p>
                <p className="text-gray-200 text-sm leading-relaxed mb-3">{dmStory.story}</p>
                <div className="flex flex-wrap gap-2">
                  {dmStory.core.split(", ").map((c, i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                      {c.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* 강점과 주의점 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-300 font-bold text-sm mb-2">✓ {isKo ? "이런 점이 좋아요" : "Your Strengths"}</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{isKo ? data.dayMasterInfo.strength.ko : data.dayMasterInfo.strength.en}</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <p className="text-orange-300 font-bold text-sm mb-2">⚡ {isKo ? "조심하면 더 좋아요" : "Watch Out For"}</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{isKo ? data.dayMasterInfo.weakness.ko : data.dayMasterInfo.weakness.en}</p>
                </div>
              </div>

              {/* 조언 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">💫</span>
                  <span className="text-amber-200 leading-relaxed">{dmStory.advice}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2) 내 마음은 어떻게 움직이나 - 확장된 스토리텔링 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const dmName = data.dayMasterName || "";
        const getEmotionStory = (dm: string) => {
          const stories: Record<string, { pattern: string; trigger: string; healing: string; warning: string }> = {
            "갑": {
              pattern: isKo ? "감정을 깊이 느끼지만 겉으로 잘 드러내지 않아요. 자존심이 강해서 '괜찮아'라고 말하지만, 속으로는 많이 생각해요." : "You feel deeply but don't show it. Strong pride makes you say 'I'm fine' while thinking a lot inside.",
              trigger: isKo ? "무시당했다고 느낄 때, 내 노력이 인정받지 못할 때 마음이 크게 흔들려요." : "Being ignored or efforts unrecognized deeply shakes you.",
              healing: isKo ? "혼자만의 시간에 생각을 정리하세요. 자연 속에서 걷거나 운동하면 마음이 가벼워져요." : "Organize thoughts alone. Walking in nature or exercising lightens your heart.",
              warning: isKo ? "속앓이하지 마세요. 가끔은 약한 모습을 보여도 괜찮아요." : "Don't suffer silently. It's okay to show vulnerability sometimes."
            },
            "을": {
              pattern: isKo ? "감정이 섬세하고 예민해요. 상대방의 기분을 빠르게 읽고, 분위기에 따라 감정이 영향받아요." : "Emotions are delicate and sensitive. You read others' moods quickly and are influenced by atmosphere.",
              trigger: isKo ? "갈등 상황, 누군가의 차가운 반응, 예상치 못한 변화에 불안해질 수 있어요." : "Conflict, cold responses, unexpected changes can cause anxiety.",
              healing: isKo ? "믿을 수 있는 사람과 이야기 나누세요. 당신의 감정을 말로 표현하는 것 자체가 치유예요." : "Talk with someone trustworthy. Expressing feelings verbally is healing itself.",
              warning: isKo ? "남의 감정에 너무 맞추다 보면 정작 자신을 잃어버려요. 내 감정도 중요해요." : "Over-adjusting to others' feelings, you may lose yourself. Your emotions matter too."
            },
            "병": {
              pattern: isKo ? "감정 표현이 직접적이에요. 좋으면 확 좋아하고, 싫으면 티가 나요. 솔직해서 오해도 잘 풀려요." : "Emotional expression is direct. When happy, it shows; when upset, it shows. Honesty resolves misunderstandings.",
              trigger: isKo ? "무관심, 배신, 신뢰가 깨지는 상황에서 크게 상처받아요." : "Indifference, betrayal, broken trust deeply hurts you.",
              healing: isKo ? "에너지를 발산하세요. 운동, 취미, 친구들과의 시간... 활동적으로 움직이면 감정이 정리돼요." : "Release energy. Exercise, hobbies, time with friends... active movement organizes emotions.",
              warning: isKo ? "화가 날 때 바로 말하지 마세요. 하루만 기다렸다 말해도 결과가 달라요." : "Don't speak immediately when angry. Waiting a day changes outcomes."
            },
            "정": {
              pattern: isKo ? "감정을 내면 깊이 담아두는 타입이에요. 겉으로는 차분해 보이지만 속은 복잡해요." : "You keep emotions deep inside. Calm outside, complex inside.",
              trigger: isKo ? "서운한 감정, '나만 이렇게 노력하나'라는 생각이 들 때 힘들어요." : "Feeling slighted, thinking 'am I the only one trying' is hard.",
              healing: isKo ? "글로 쓰거나 예술적으로 표현해보세요. 말로 못하는 감정도 다른 방식으로 풀 수 있어요." : "Write or express artistically. Emotions words can't express can be released differently.",
              warning: isKo ? "너무 오래 담아두면 폭발해요. 작은 것도 바로바로 표현하는 연습을 하세요." : "Keeping too long leads to explosion. Practice expressing small things immediately."
            },
            "무": {
              pattern: isKo ? "감정이 느리게 움직이지만 한번 느끼면 깊어요. 쉽게 흔들리지 않지만, 한번 상처받으면 오래가요." : "Emotions move slowly but deeply. Not easily shaken, but wounds last long.",
              trigger: isKo ? "신뢰가 깨질 때, 책임감이 과해질 때, 혼자 다 짊어져야 할 때 지쳐요." : "Broken trust, excessive responsibility, carrying everything alone exhausts you.",
              healing: isKo ? "안정적인 환경에서 쉬세요. 익숙한 공간, 편한 사람과 함께하면 회복이 빨라요." : "Rest in stable environment. Familiar spaces and comfortable people speed recovery.",
              warning: isKo ? "다 괜찮은 척하지 마세요. 산도 지진이 일어날 수 있어요." : "Don't pretend everything's fine. Even mountains can have earthquakes."
            },
            "기": {
              pattern: isKo ? "걱정이 많은 타입이에요. 미래를 대비하려다 보니 머릿속이 복잡해질 때가 많아요." : "You worry a lot. Preparing for the future often makes your mind complex.",
              trigger: isKo ? "불확실한 상황, 통제할 수 없는 일, 남이 걱정될 때 불안해져요." : "Uncertainty, uncontrollable situations, worrying about others causes anxiety.",
              healing: isKo ? "현재에 집중하세요. 지금 할 수 있는 것에만 에너지를 쓰면 마음이 편해져요." : "Focus on the present. Using energy only on what you can do now brings peace.",
              warning: isKo ? "남 걱정하느라 정작 자신은 챙기지 못해요. 자기 마음도 중요해요." : "Worrying about others, you neglect yourself. Your heart matters too."
            },
            "경": {
              pattern: isKo ? "감정을 빨리 처리해요. 상처받아도 '이러면 안 돼'라고 생각하며 정리하려 해요." : "You process emotions quickly. Even hurt, you think 'I shouldn't be like this' and try to organize.",
              trigger: isKo ? "불의를 볼 때, 내 기준이 무너질 때, 누군가에게 실망했을 때 힘들어요." : "Seeing injustice, broken standards, disappointment in someone is hard.",
              healing: isKo ? "잠시 멈추고 감정을 인정하세요. '화가 난다', '슬프다'라고 말해주세요." : "Pause and acknowledge emotions. Say 'I'm angry', 'I'm sad'.",
              warning: isKo ? "감정을 너무 빨리 잘라내면 나중에 더 크게 터져요. 느끼는 시간을 주세요." : "Cutting emotions too quickly leads to bigger explosions later. Give time to feel."
            },
            "신": {
              pattern: isKo ? "감정이 매우 섬세해요. 작은 말 한마디에도 밤새 생각하고, 상대방 표정 하나로 의미를 찾아요. '저 말이 무슨 뜻일까', '혹시 내가 실수했나' 이런 생각이 계속 돌아요. 겉으로는 냉정해 보여도 속으로는 감정의 롤러코스터를 타고 있어요." : "Emotions are very delicate. A single word keeps you thinking all night, one expression makes you search for meaning. 'What did that mean', 'Did I make a mistake' keeps circling. You look calm outside but ride emotional rollercoasters inside.",
              trigger: isKo ? "누군가 당신의 일을 비판할 때, '이 정도면 됐지'라고 생각했는데 '아직 부족해'라는 말을 들을 때, 완벽하게 준비했는데 실수가 생겼을 때... 이럴 때 정말 힘들어요. 특히 '너 왜 이렇게 예민해?'라는 말은 칼같이 꽂혀요." : "When someone criticizes your work, when you thought 'this should be enough' but hear 'still not enough', when you prepared perfectly but mistakes happen... these really hurt. Especially 'why are you so sensitive?' cuts like a knife.",
              healing: isKo ? "아름다운 것을 보세요. 좋은 음악 들으면서 산책하거나, 미술관 가거나, 예쁜 카페에 앉아서 멍 때리기. 감각적인 경험이 마음을 달래요. 혼자 좋아하는 걸 하는 시간이 약이에요. 쇼핑도 의외로 도움이 돼요(지갑은 조심)." : "See beautiful things. Walk while listening to good music, visit art museums, zone out at pretty cafes. Sensory experiences soothe your heart. Time doing what you love alone is medicine. Shopping unexpectedly helps too (watch your wallet).",
              warning: isKo ? "스스로에게 너무 엄격하지 마세요. 70점도 훌륭한 거예요. 100점 아니라고 자책하지 마세요. 완벽하지 않아도 사랑받을 자격이 있어요. '이 정도면 괜찮네'라고 말하는 연습을 해보세요." : "Don't be too harsh on yourself. 70 points is great too. Don't blame yourself for not being 100. You deserve love even imperfect. Practice saying 'this is good enough'."
            },
            "임": {
              pattern: isKo ? "감정의 폭이 넓어요. 깊이 사색하기도 하고, 갑자기 활발해지기도 해요. 바다처럼 변화무쌍해요." : "Wide emotional range. Deep contemplation or sudden liveliness. Ever-changing like the ocean.",
              trigger: isKo ? "자유가 제한될 때, 얽매인다고 느낄 때, 이해받지 못할 때 힘들어요." : "Limited freedom, feeling bound, not being understood is hard.",
              healing: isKo ? "혼자만의 시간이 꼭 필요해요. 아무도 신경 쓰지 않아도 되는 시간에 재충전해요." : "Alone time is essential. Recharge when you don't have to care about anyone.",
              warning: isKo ? "너무 혼자 있으면 생각이 깊어져서 빠져나오기 어려워요. 가끔은 나와서 사람을 만나세요." : "Too much alone time deepens thoughts making it hard to escape. Sometimes come out and meet people."
            },
            "계": {
              pattern: isKo ? "감정이 물처럼 흘러요. 주변의 감정을 스펀지처럼 흡수하기도 하고, 직관적으로 느끼는 게 많아요." : "Emotions flow like water. You absorb surrounding emotions like a sponge and intuitively feel much.",
              trigger: isKo ? "부정적인 환경, 감정적인 사람들 사이에 있을 때 금방 지쳐요." : "Negative environments, being among emotional people quickly exhausts you.",
              healing: isKo ? "물가에 가세요. 바다, 강, 목욕... 물과 가까이 하면 마음이 정화돼요." : "Go near water. Sea, river, bath... being close to water purifies your heart.",
              warning: isKo ? "남의 감정을 내 것처럼 느끼지 마세요. 경계를 지키는 것도 자기 사랑이에요." : "Don't feel others' emotions as your own. Setting boundaries is self-love too."
            }
          };
          return stories[dm] || {
            pattern: isKo ? "당신만의 독특한 감정 패턴이 있어요." : "You have your unique emotional pattern.",
            trigger: isKo ? "스트레스 상황에서 마음이 흔들릴 수 있어요." : "Your heart may waver in stressful situations.",
            healing: isKo ? "자신만의 방법으로 감정을 다스려보세요." : "Find your own way to manage emotions.",
            warning: isKo ? "감정을 너무 오래 담아두지 마세요." : "Don't keep emotions inside too long."
          };
        };
        const emotionStory = getEmotionStory(dmName);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-blue-900/20 border border-blue-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💙</span>
              <h3 className="text-lg font-bold text-blue-300">{isKo ? "내 마음은 어떻게 움직이나" : "How My Heart Works"}</h3>
            </div>

            <div className="space-y-4">
              {/* 감정 패턴 */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-300 font-bold mb-2 text-sm">🌊 {isKo ? "당신의 감정 패턴" : "Your Emotion Pattern"}</p>
                <p className="text-gray-200 text-sm leading-relaxed">{emotionStory.pattern}</p>
              </div>

              {/* 감정 트리거 */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold mb-2 text-sm">⚡ {isKo ? "마음이 흔들리는 순간" : "When Your Heart Wavers"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{emotionStory.trigger}</p>
              </div>

              {/* 내면 성향 */}
              {moonData && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-indigo-300 font-bold mb-2 text-sm">🌙 {isKo ? `속마음은 이래요` : `Your Inner Self`}</p>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {isKo
                      ? `겉으로는 괜찮아 보여도, 가족 문제나 정서적 안정이 흔들리면 마음이 크게 요동쳐요. 혼자만의 시간에 충전하고, 안전한 공간에서 감정을 정리하는 것이 당신에게 꼭 필요해요.`
                      : `Even when you seem fine, family issues or emotional instability greatly affects you. Recharging alone and processing emotions in safe spaces is essential for you.`}
                  </p>
                </div>
              )}

              {/* 치유 방법 */}
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-300 font-bold mb-2 text-sm">💚 {isKo ? "마음을 회복하는 법" : "How to Heal Your Heart"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{emotionStory.healing}</p>
              </div>

              {/* 주의 포인트 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <span className="text-amber-200 leading-relaxed">{emotionStory.warning}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3) 나는 사랑에서 어떤 사람인가 - 확장된 스토리텔링 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const dmName = data.dayMasterName || "";
        const getLoveStory = (dm: string) => {
          const stories: Record<string, { style: string; attract: string; danger: string; ideal: string; advice: string }> = {
            "갑": {
              style: isKo ? "리드하는 사랑을 해요. 좋아하면 적극적으로 다가가고, 상대를 보호하려 해요. 다만 '내가 더 해줬다'는 생각이 들면 서운해지기 쉬워요." : "You lead in love. When interested, you approach actively and try to protect. But thinking 'I did more' easily makes you upset.",
              attract: isKo ? "당당하고 자기 길을 가는 사람에게 끌려요. 의지되지만 너무 의존적이지 않은 파트너가 좋아요." : "You're drawn to confident people with their own path. Someone dependable but not too dependent.",
              danger: isKo ? "고집 부리다가 상대방이 지칠 수 있어요. '내가 맞다'보다 '우리가 어떻게'를 생각해보세요." : "Stubbornness can exhaust your partner. Think 'how can we' instead of 'I'm right'.",
              ideal: isKo ? "당신의 에너지를 이해하면서도 자기 세계가 있는 사람" : "Someone who understands your energy but has their own world",
              advice: isKo ? "사랑에서도 가끔은 양보하세요. 이기는 것보다 함께하는 게 중요해요." : "Sometimes yield in love too. Being together matters more than winning."
            },
            "을": {
              style: isKo ? "상대에게 맞춰가는 사랑을 해요. 분위기를 읽고 원하는 걸 해주죠. 그런데 너무 맞추다 보면 정작 자신이 뭘 원하는지 모를 때가 있어요." : "You adapt to your partner. Reading moods, doing what they want. But over-adapting, you may forget what you want.",
              attract: isKo ? "당신을 리드해주면서도 의견을 존중하는 사람에게 끌려요. 안정감 주는 타입이 좋아요." : "You're drawn to those who lead yet respect your opinions. Stable types are good.",
              danger: isKo ? "'눈치보다가 폭발'하는 패턴을 조심하세요. 작은 것도 바로 말하는 게 나아요." : "Watch the 'read mood then explode' pattern. Speaking up about small things is better.",
              ideal: isKo ? "당신의 섬세함을 알아주고, 안전한 공간을 만들어주는 사람" : "Someone who recognizes your delicacy and creates safe space",
              advice: isKo ? "'내가 원하는 건 이거야'라고 말하는 연습을 하세요. 당신의 바람도 중요해요." : "Practice saying 'what I want is this'. Your wishes matter too."
            },
            "병": {
              style: isKo ? "뜨겁게 사랑해요. 좋아하면 온 세상에 티가 나고, 표현도 직접적이에요. 그만큼 실망하면 확 식을 수도 있어요." : "You love passionately. When interested, the whole world knows. But disappointment can cool you quickly.",
              attract: isKo ? "밝고 에너지 넘치는 사람, 또는 반대로 조용하지만 깊은 사람에게 끌려요." : "Bright, energetic people, or conversely, quiet but deep people attract you.",
              danger: isKo ? "열정이 식으면 관계도 식어요. '설렘 ≠ 사랑'이라는 걸 기억하세요." : "When passion cools, relationships cool. Remember 'excitement ≠ love'.",
              ideal: isKo ? "당신의 열정을 받아주고, 가끔은 휴식도 함께하는 사람" : "Someone who receives your passion and sometimes rests with you",
              advice: isKo ? "평범한 일상도 사랑이에요. 매일 불꽃놀이일 필요는 없어요." : "Ordinary daily life is also love. It doesn't need to be fireworks every day."
            },
            "정": {
              style: isKo ? "은근하지만 깊게 사랑해요. 겉으로는 표현을 잘 안 해도 속으로는 많이 생각해요. 한번 마음 주면 오래가요." : "You love subtly but deeply. Not expressing much outside, but thinking a lot inside. Once given, your heart lasts long.",
              attract: isKo ? "당신의 내면을 읽어주는 섬세한 사람, 말 없이도 통하는 사람에게 끌려요." : "You're drawn to delicate people who read your inner self, who communicate without words.",
              danger: isKo ? "표현 안 하면 상대방이 몰라요. '알아줬으면'보다 '말해야 아는구나'를 기억하세요." : "Without expression, partners won't know. Remember 'I need to tell' instead of 'I wish they knew'.",
              ideal: isKo ? "말없이도 편한, 당신의 조용함을 이해하는 사람" : "Someone comfortable in silence, who understands your quietness",
              advice: isKo ? "감정을 표현하세요. 당신의 따뜻함은 말해야 전해져요." : "Express emotions. Your warmth only reaches through words."
            },
            "무": {
              style: isKo ? "든든하게 지켜주는 사랑을 해요. 말보다 행동으로 보여주고, 오래 함께하려 해요. 변화보다 안정을 추구해요." : "You love by firmly protecting. Showing through actions more than words, wanting to stay together long. Seeking stability over change.",
              attract: isKo ? "안정적이고 믿음직한 사람, 또는 당신을 편하게 하는 가벼운 타입에게 끌려요." : "Stable, trustworthy people, or light types who make you comfortable attract you.",
              danger: isKo ? "변화를 싫어해서 관계가 무뎌질 수 있어요. 가끔은 새로운 시도도 필요해요." : "Disliking change, relationships can dull. Sometimes new attempts are needed.",
              ideal: isKo ? "당신의 안정감을 믿고, 함께 천천히 가는 사람" : "Someone who trusts your stability and goes slowly together",
              advice: isKo ? "사랑도 관리가 필요해요. 익숙함에 빠지지 않게 가끔은 이벤트를 해보세요." : "Love needs management too. Try events sometimes to avoid falling into familiarity."
            },
            "기": {
              style: isKo ? "현실적으로 사랑해요. 로맨스보다 실질적인 도움을 주고, 미래를 함께 계획해요. 안정적인 관계를 원해요." : "You love practically. Giving practical help over romance, planning future together. Wanting stable relationships.",
              attract: isKo ? "성실하고 믿을 수 있는 사람, 현실적인 계획이 맞는 사람에게 끌려요." : "You're drawn to sincere, reliable people whose practical plans match.",
              danger: isKo ? "너무 현실적이면 재미가 없어질 수 있어요. 가끔은 감성적인 표현도 필요해요." : "Too practical can become boring. Sometimes emotional expression is needed.",
              ideal: isKo ? "함께 미래를 그리고, 일상을 나눌 수 있는 사람" : "Someone to draw the future with and share daily life",
              advice: isKo ? "로맨스도 필요해요. 계획 없는 데이트도 해보세요. 즉흥도 사랑이에요." : "Romance is needed too. Try unplanned dates. Spontaneity is also love."
            },
            "경": {
              style: isKo ? "정직하게 사랑해요. 좋으면 좋다, 싫으면 싫다고 말해요. 약속을 중요시하고, 배신은 절대 용납 못 해요." : "You love honestly. Saying like when you like, dislike when you don't. Valuing promises, never tolerating betrayal.",
              attract: isKo ? "원칙 있고 정직한 사람, 자기 기준이 분명한 사람에게 끌려요." : "You're drawn to principled, honest people with clear standards.",
              danger: isKo ? "융통성 없으면 상대가 답답해할 수 있어요. '맞다 틀리다'보다 '다르다'를 인정해보세요." : "Inflexibility can frustrate partners. Try acknowledging 'different' instead of 'right or wrong'.",
              ideal: isKo ? "당신의 정직함을 존중하고, 신뢰를 지키는 사람" : "Someone who respects your honesty and keeps trust",
              advice: isKo ? "사랑엔 예외도 있어요. 원칙보다 마음이 앞설 때도 괜찮아요." : "Love has exceptions. It's okay when heart comes before principles sometimes."
            },
            "신": {
              style: isKo ? "완벽하게 사랑하려 해요. 디테일까지 신경 쓰고, 기념일도 절대 놓치지 않으며, 선물 하나도 의미 있게 골라요. 상대방이 좋아할 만한 레스토랑, 데이트 코스까지 완벽하게 준비하죠. 그만큼 상대에게도 기대가 높아서, 노력이 보이지 않으면 실망하고, 사소한 약속도 어기면 상처받아요. 사랑받는 것보다 '특별하게' 사랑받고 싶어해요." : "You try to love perfectly. Caring about every detail, never missing anniversaries, choosing meaningful gifts. Planning perfect restaurants and date courses your partner will love. Equally high expectations mean disappointment when effort isn't shown, and even small broken promises hurt. You want to be loved 'specially', not just loved.",
              attract: isKo ? "세련되고 감각적인 사람, 당신의 노력과 섬세함을 알아주는 사람, 미적 감각이 맞는 사람에게 끌려요. 무신경하거나 대충대충 하는 사람은 못 참아요." : "You're drawn to refined, sensible people who recognize your effort and delicacy, those with matching aesthetic sense. You can't stand careless or half-hearted people.",
              danger: isKo ? "이상이 너무 높으면 실망이 커요. 완벽한 사람은 없다는 걸 받아들이세요. '이 정도면 충분해'라는 기준을 낮추는 연습이 필요해요. 상대방도 당신의 기준을 맞추려다 지칠 수 있어요." : "Too high ideals lead to big disappointment. Accept that no one is perfect. Practice lowering your 'this is enough' standard. Partners can get exhausted trying to meet your standards.",
              ideal: isKo ? "당신의 섬세함과 완벽주의를 이해해주고, 같이 아름다움을 추구하면서도 '불완전함도 괜찮아'라고 말해줄 수 있는 사람" : "Someone who understands your delicacy and perfectionism, pursues beauty together, yet can say 'imperfection is okay too'",
              advice: isKo ? "불완전해도 괜찮아요. 완벽한 관계보다 편한 관계가 오래가요. 70점짜리 사랑도 충분히 아름다워요. 상대방의 작은 실수는 눈감아주는 여유를 가져보세요." : "Imperfect is okay. Comfortable relationships last longer than perfect ones. Even 70-point love is beautiful enough. Try having grace to overlook partner's small mistakes."
            },
            "임": {
              style: isKo ? "자유롭게 사랑해요. 얽매이는 걸 싫어하고, 서로의 공간을 존중해요. 깊이 사랑하지만 표현은 조용히 해요." : "You love freely. Disliking being bound, respecting each other's space. Loving deeply but expressing quietly.",
              attract: isKo ? "자유로운 영혼, 지적인 대화가 되는 사람, 당신을 이해하는 사람에게 끌려요." : "Free spirits, intellectual conversationalists, people who understand you attract you.",
              danger: isKo ? "너무 자유로우면 상대가 외로워해요. 가끔은 '확실한 표현'도 필요해요." : "Too much freedom can make partners lonely. Sometimes 'clear expression' is needed.",
              ideal: isKo ? "당신의 자유를 존중하면서도 깊은 유대를 나누는 사람" : "Someone who respects your freedom while sharing deep bonds",
              advice: isKo ? "사랑해도 얽매이는 게 아니에요. 연결되어 있으면서도 자유로울 수 있어요." : "Loving isn't being bound. You can be connected and free at the same time."
            },
            "계": {
              style: isKo ? "직관적으로 사랑해요. 느낌으로 '이 사람이다' 알고, 말 없이도 감정이 통해요. 그만큼 감정에 휩쓸리기도 해요." : "You love intuitively. Knowing 'this is the one' by feeling, emotions connecting without words. Equally swept by emotions.",
              attract: isKo ? "감성적이고 깊은 사람, 당신의 직관을 믿어주는 사람에게 끌려요." : "You're drawn to emotional, deep people who trust your intuition.",
              danger: isKo ? "감정에 빠지면 객관성을 잃어요. 가끔은 한 발 물러서 보세요." : "Falling into emotions loses objectivity. Sometimes step back.",
              ideal: isKo ? "당신의 감성을 이해하고, 같이 깊어질 수 있는 사람" : "Someone who understands your emotions and can deepen together",
              advice: isKo ? "직감도 중요하지만 현실도 봐야 해요. 느낌만으로 결정하지 마세요." : "Intuition matters but reality too. Don't decide by feeling alone."
            }
          };
          return stories[dm] || {
            style: isKo ? "당신만의 특별한 사랑 방식이 있어요." : "You have your special way of loving.",
            attract: isKo ? "진심을 알아주는 사람에게 끌려요." : "You're drawn to those who recognize sincerity.",
            danger: isKo ? "과도한 기대는 실망을 낳을 수 있어요." : "Excessive expectations can lead to disappointment.",
            ideal: isKo ? "서로를 이해하고 존중하는 사람" : "Someone who understands and respects each other",
            advice: isKo ? "있는 그대로의 모습을 보여주세요." : "Show yourself as you are."
          };
        };
        const loveStory = getLoveStory(dmName);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💕</span>
              <h3 className="text-lg font-bold text-pink-300">{isKo ? "나는 사랑에서 어떤 사람인가" : "How I Love"}</h3>
            </div>

            <div className="space-y-4">
              {/* 연애 스타일 */}
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <p className="text-pink-300 font-bold mb-2 text-sm">💗 {isKo ? "당신의 사랑 스타일" : "Your Love Style"}</p>
                <p className="text-gray-200 text-sm leading-relaxed">{loveStory.style}</p>
              </div>

              {/* 끌리는 타입 */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold mb-2 text-sm">✨ {isKo ? "끌리는 사람" : "Who Attracts You"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveStory.attract}</p>
              </div>

              {/* 이상적인 파트너 */}
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold mb-2 text-sm">💜 {isKo ? "이상적인 파트너" : "Ideal Partner"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveStory.ideal}</p>
              </div>

              {/* 연애 주의사항 */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 font-bold mb-2 text-sm">⚡ {isKo ? "연애 위험 신호" : "Love Danger Signs"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveStory.danger}</p>
              </div>

              {/* 조언 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">💫</span>
                  <span className="text-pink-200 leading-relaxed">{loveStory.advice}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4) 나는 어떤 일에서 빛나나 - 확장된 스토리텔링 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const dmName = data.dayMasterName || "";
        const getCareerStory = (dm: string) => {
          const stories: Record<string, { workStyle: string; strength: string; environment: string; avoid: string; growth: string }> = {
            "갑": {
              workStyle: isKo ? "선두에서 이끄는 일이 어울려요. '내가 정한다'는 권한이 있을 때 최고의 퍼포먼스를 내요. 새로운 것을 시작하거나, 조직을 세우거나, 방향을 제시하는 역할에서 빛나요." : "Leading from the front suits you. Best performance when you have authority to decide. You shine in starting new things, building organizations, or setting direction.",
              strength: isKo ? "추진력, 결단력, 비전 제시" : "Drive, decisiveness, vision",
              environment: isKo ? "자율성이 보장되는 환경, 도전적인 목표가 있는 곳" : "Environments with autonomy, places with challenging goals",
              avoid: isKo ? "지시만 받는 일, 변화 없는 반복 작업, 정치가 많은 조직" : "Just taking orders, unchanging repetitive work, highly political organizations",
              growth: isKo ? "팀원들의 의견도 들어보세요. 혼자 다 하려다 지칠 수 있어요. 함께 가면 더 멀리 가요." : "Listen to team members' opinions too. Trying to do everything alone exhausts you. Together you go further."
            },
            "을": {
              workStyle: isKo ? "사람을 연결하고 조율하는 일이 어울려요. 갈등 상황에서 중재하거나, 고객을 상대하거나, 팀워크가 중요한 일에서 빛나요. 혼자 하기보다 협업할 때 시너지가 나요." : "Connecting and coordinating people suits you. You shine in mediating conflicts, dealing with customers, or teamwork-focused roles. Better synergy in collaboration than alone.",
              strength: isKo ? "협상력, 유연한 대처, 관계 구축" : "Negotiation, flexible response, relationship building",
              environment: isKo ? "팀 분위기가 좋은 곳, 네트워킹이 중요한 분야" : "Places with good team atmosphere, fields where networking matters",
              avoid: isKo ? "극도의 경쟁 환경, 혼자 고립되는 일, 갈등이 많은 조직" : "Extreme competition, isolated work, conflict-heavy organizations",
              growth: isKo ? "자기 주장도 필요해요. 다 맞춰주다 보면 정작 자신의 커리어가 흐릿해질 수 있어요." : "Self-assertion is also needed. Always accommodating can blur your own career path."
            },
            "병": {
              workStyle: isKo ? "무대 위에서 빛나는 일이 어울려요. 발표, 홍보, 마케팅, 엔터테인먼트... 사람들 앞에 나설수록 에너지가 나요. 열정을 쏟을 수 있는 일에서 최고의 성과를 내요." : "Shining on stage suits you. Presentations, PR, marketing, entertainment... more energy when in front of people. Best results when you can pour passion into work.",
              strength: isKo ? "카리스마, 표현력, 열정" : "Charisma, expressiveness, passion",
              environment: isKo ? "창의성을 인정받는 곳, 성과가 눈에 보이는 일" : "Places that recognize creativity, work with visible results",
              avoid: isKo ? "조용히 뒤에서 일하는 것, 성과가 안 보이는 일, 규칙에만 따르는 일" : "Working quietly behind scenes, work without visible results, just following rules",
              growth: isKo ? "열정이 식지 않게 관리하세요. 번아웃되면 다 멈춰요. 쉬는 것도 일의 일부예요." : "Manage to keep passion alive. Burnout stops everything. Rest is part of work."
            },
            "정": {
              workStyle: isKo ? "섬세함이 필요한 일에서 빛나요. 디테일을 다루는 일, 예술적 감각이 필요한 일, 교육이나 상담처럼 깊이 있는 대화가 필요한 분야에서 실력을 발휘해요." : "You shine in work requiring delicacy. Handling details, artistic sense, or fields needing deep conversation like education or counseling let you show your skills.",
              strength: isKo ? "섬세함, 집중력, 공감 능력" : "Delicacy, concentration, empathy",
              environment: isKo ? "조용하고 집중할 수 있는 곳, 퀄리티를 인정받는 분야" : "Quiet, focused places, fields that recognize quality",
              avoid: isKo ? "소음 많은 환경, 대충해도 되는 일, 감정 없는 기계적 업무" : "Noisy environments, work that can be done roughly, emotionless mechanical tasks",
              growth: isKo ? "완벽주의 때문에 느려질 수 있어요. 80%로도 충분할 때가 있어요. 속도와 질의 균형을 잡으세요." : "Perfectionism can slow you down. 80% is enough sometimes. Balance speed and quality."
            },
            "무": {
              workStyle: isKo ? "안정적으로 굴러가게 하는 일이 어울려요. 시스템을 관리하거나, 조직의 근간이 되거나, 오래 쌓인 전문성이 필요한 분야에서 빛나요. 묵묵히 해온 것들이 인정받을 때 성취감을 느껴요." : "Making things run stably suits you. Managing systems, being the organization's foundation, or fields needing long-accumulated expertise let you shine. Achievement comes when steady work gets recognized.",
              strength: isKo ? "신뢰성, 꾸준함, 관리 능력" : "Reliability, consistency, management",
              environment: isKo ? "안정적인 조직, 장기적 비전이 있는 곳" : "Stable organizations, places with long-term vision",
              avoid: isKo ? "급변하는 스타트업, 매일 새로운 게 필요한 일, 기반 없이 시작하는 프로젝트" : "Rapidly changing startups, work needing newness daily, projects starting without foundation",
              growth: isKo ? "변화도 받아들이세요. 안정만 추구하면 성장이 멈출 수 있어요. 가끔은 새로운 도전도 필요해요." : "Accept change too. Only pursuing stability can stop growth. Sometimes new challenges are needed."
            },
            "기": {
              workStyle: isKo ? "현실을 잘 아는 일이 어울려요. 자원을 관리하거나, 사업을 운영하거나, 실질적인 가치를 만드는 분야에서 빛나요. '되겠어?'를 '된다'로 만드는 실행력이 강점이에요." : "Work that knows reality suits you. Managing resources, running businesses, or fields creating practical value let you shine. Your execution power turns 'will it work?' into 'it works'.",
              strength: isKo ? "실용성, 자원 관리, 실행력" : "Practicality, resource management, execution",
              environment: isKo ? "성과가 숫자로 나오는 곳, 현실적인 목표가 있는 조직" : "Places where results show in numbers, organizations with realistic goals",
              avoid: isKo ? "꿈만 있고 계획 없는 일, 추상적인 업무, 성과 없이 끌어가는 프로젝트" : "Dreams without plans, abstract work, projects dragging without results",
              growth: isKo ? "비전도 필요해요. 현실만 보면 큰 그림을 놓칠 수 있어요. 가끔은 상상력도 펼쳐보세요." : "Vision is also needed. Only seeing reality can miss the big picture. Sometimes let imagination fly."
            },
            "경": {
              workStyle: isKo ? "정의를 실현하는 일이 어울려요. 잘못을 바로잡거나, 결정을 내리거나, 조직을 정비하는 역할에서 빛나요. 기준을 세우고 그것을 지키는 일에서 보람을 느껴요." : "Work realizing justice suits you. Correcting wrongs, making decisions, or organizing roles let you shine. You find fulfillment in setting standards and keeping them.",
              strength: isKo ? "결단력, 정직함, 추진력" : "Decisiveness, honesty, drive",
              environment: isKo ? "명확한 룰이 있는 곳, 실력으로 인정받는 분야" : "Places with clear rules, fields recognized by skill",
              avoid: isKo ? "정치가 많은 조직, 기준 없이 흔들리는 환경, 불공정한 시스템" : "Highly political organizations, environments wavering without standards, unfair systems",
              growth: isKo ? "유연함도 강점이 될 수 있어요. 너무 칼같으면 사람들이 부담스러워해요. 여유도 필요해요." : "Flexibility can also be strength. Too rigid makes people uncomfortable. Some leeway is needed."
            },
            "신": {
              workStyle: isKo ? "아름다움을 추구하는 일이 어울려요. 디자인, 예술, 컨설팅, 고급 서비스... 퀄리티가 중요한 분야에서 빛나요. 디테일에 대한 집착이 차별화를 만들어냅니다. 대충 만든 것과 정성 들여 만든 것의 차이를 알아보고, 고객 경험의 사소한 부분까지 신경 쓰는 능력이 있어요. 프리미엄 시장에서 당신의 안목은 곧 경쟁력이 됩니다." : "Work pursuing beauty suits you. Design, art, consulting, premium services... you shine in fields where quality matters. Obsession with details creates differentiation. You can tell what's made carelessly from what's made with care, and have ability to care for subtle parts of customer experience. Your eye becomes competitiveness in premium markets.",
              strength: isKo ? "심미안, 디테일, 완성도. 클라리티를 인정하는 것, 프리미엄 시장" : "Aesthetic sense, detail, completion. Recognizing quality, premium markets",
              environment: isKo ? "퀄리티를 인정하는 곳, 프리미엄 시장, 세련된 브랜드, 장인정신이 살아있는 분야. '좋은 것'의 가치를 아는 고객들과 일할 때 가장 행복해요." : "Places recognizing quality, premium markets, refined brands, fields where craftsmanship lives. Happiest when working with clients who know the value of 'good things'.",
              avoid: isKo ? "싸고 빠르게만 하는 일, 디테일이 무시되는 환경, 대량 생산 라인, '대충 해도 돼' 라는 분위기. 퀄리티보다 속도를 강요하는 곳에서는 당신의 재능이 낭비돼요." : "Just cheap and fast work, environments ignoring details, mass production lines, 'good enough' atmosphere. Your talent is wasted where speed is forced over quality.",
              growth: isKo ? "완벽하지 않아도 시작하세요. 100%를 기다리다 아무것도 못 할 수 있어요. 실행하면서 다듬으세요. 디테일은 무시되는 게 아니라 '무엇이 정말 중요한 디테일인지' 우선순위를 정하는 것이 중요해요. 대량 생산 환경은 피하세요." : "Start even if not perfect. Waiting for 100% can mean doing nothing. Refine while executing. Details aren't to be ignored—what matters is prioritizing 'which details truly matter'. Avoid mass production environments."
            },
            "임": {
              workStyle: isKo ? "지식을 다루는 일이 어울려요. 연구, 기획, 전략, 컨설팅... 생각하고 분석하는 일에서 빛나요. 큰 그림을 보면서 방향을 제시하는 역할이 잘 맞아요." : "Work handling knowledge suits you. Research, planning, strategy, consulting... you shine in thinking and analyzing. Roles showing direction while seeing the big picture fit you.",
              strength: isKo ? "통찰력, 전략적 사고, 포용력" : "Insight, strategic thinking, embrace",
              environment: isKo ? "자유롭게 생각할 수 있는 곳, 지적 자극이 있는 환경" : "Places where you can think freely, intellectually stimulating environments",
              avoid: isKo ? "규칙에만 묶이는 일, 단순 반복, 자유 없는 환경" : "Work bound only by rules, simple repetition, environments without freedom",
              growth: isKo ? "생각만 하면 안 돼요. 실행으로 옮겨야 결과가 나와요. 계획 세우고 움직이세요." : "Just thinking isn't enough. Execution brings results. Plan and move."
            },
            "계": {
              workStyle: isKo ? "보이지 않는 것을 다루는 일이 어울려요. 심리, 영성, 예술, 치유... 직관과 감성이 필요한 분야에서 빛나요. 사람의 마음을 읽고 도와주는 일에서 보람을 느껴요." : "Work handling the invisible suits you. Psychology, spirituality, art, healing... you shine in fields needing intuition and emotion. Helping by reading people's hearts brings fulfillment.",
              strength: isKo ? "직관력, 공감 능력, 창의성" : "Intuition, empathy, creativity",
              environment: isKo ? "감성이 통하는 곳, 깊이가 필요한 분야" : "Places where emotions connect, fields needing depth",
              avoid: isKo ? "숫자만 따지는 일, 감정 없는 환경, 표면적인 업무" : "Work counting only numbers, emotionless environments, superficial tasks",
              growth: isKo ? "현실도 챙기세요. 꿈만 있으면 실현이 어려워요. 현실적인 계획도 함께 세워요." : "Take care of reality too. Only dreams are hard to realize. Make realistic plans together."
            }
          };
          return stories[dm] || {
            workStyle: isKo ? "당신만의 특별한 일하는 방식이 있어요." : "You have your special way of working.",
            strength: isKo ? "당신만의 강점" : "Your unique strengths",
            environment: isKo ? "당신에게 맞는 환경을 찾으세요" : "Find an environment that suits you",
            avoid: isKo ? "맞지 않는 환경은 피하세요" : "Avoid unsuitable environments",
            growth: isKo ? "꾸준히 성장하세요" : "Keep growing steadily"
          };
        };
        const careerStory = getCareerStory(dmName);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💼</span>
              <h3 className="text-lg font-bold text-emerald-300">{isKo ? "나는 어떤 일에서 빛나나" : "Where I Shine at Work"}</h3>
            </div>

            <div className="space-y-4">
              {/* 일하는 스타일 */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-300 font-bold mb-2 text-sm">🌟 {isKo ? "당신의 일하는 스타일" : "Your Work Style"}</p>
                <p className="text-gray-200 text-sm leading-relaxed">{careerStory.workStyle}</p>
              </div>

              {/* 핵심 강점 */}
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-300 font-bold mb-2 text-sm">💪 {isKo ? "일에서의 핵심 강점" : "Core Work Strengths"}</p>
                <div className="flex flex-wrap gap-2">
                  {careerStory.strength.split(", ").map((s, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm">
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* 추천 직업 */}
              <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <p className="text-teal-300 font-bold mb-3 text-sm">🎯 {isKo ? "당신에게 어울리는 분야" : "Fields That Suit You"}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(isKo ? data.dayMasterInfo.career.ko : data.dayMasterInfo.career.en).slice(0, 4).map((career, idx) => (
                    <div key={idx} className="px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-center">
                      <span className="text-teal-300 text-sm font-medium">{career}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 맞는 환경 */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-300 font-bold mb-2 text-sm">🏢 {isKo ? "맞는 환경" : "Suitable Environment"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerStory.environment}</p>
              </div>

              {/* 피해야 할 것 */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 font-bold mb-2 text-sm">⚡ {isKo ? "피해야 할 환경" : "Environments to Avoid"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{careerStory.avoid}</p>
              </div>

              {/* 성장 조언 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">💫</span>
                  <span className="text-emerald-200 leading-relaxed">{careerStory.growth}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5) 내 에너지 균형은 어떤가 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚖️</span>
          <h3 className="text-lg font-bold text-purple-300">{isKo ? "내 에너지 균형은 어떤가" : "My Energy Balance"}</h3>
        </div>

        {/* 오행 바 차트 */}
        <div className="space-y-3 mb-4">
          {normalizedElements.map(({ element, value }) => {
            const t = elementTraits[element];
            const isStrong = element === data.strongest[0];
            const isWeak = element === data.weakest[0];
            return (
              <div key={element} className="flex items-center gap-3">
                <span className="w-8 text-xl text-center flex-shrink-0">{t?.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${isStrong ? 'text-green-400' : isWeak ? 'text-amber-400' : 'text-gray-300'}`}>
                      {isKo ? t?.ko : t?.en}
                      {isStrong && <span className="ml-2 text-xs">{isKo ? "강점" : "strong"}</span>}
                      {isWeak && <span className="ml-2 text-xs">{isKo ? "보완" : "boost"}</span>}
                    </span>
                    <span className="text-sm font-bold" style={{ color: t?.color }}>{value}%</span>
                  </div>
                  <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${value}%`,
                        backgroundColor: t?.color,
                        boxShadow: `0 0 8px ${t?.color}`
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 보완 팁 */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 font-bold mb-2 flex items-center gap-2">
            <span>{elementTraits[data.weakest[0]]?.emoji}</span>
            {isKo ? `이걸로 균형 맞추세요` : `Balance with these`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {data.luckyItems.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <span className="text-lg">{item.item.split(" ")[0]}</span>
                <span className="text-gray-300 text-xs">{item.item.replace(/^[^\s]+\s/, "")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 6) 이렇게 살면 운이 풀려요 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">✨</span>
          <h3 className="text-lg font-bold text-indigo-300">{isKo ? '이렇게 살면 운이 풀려요' : 'Live This Way & Luck Follows'}</h3>
        </div>

        <div className="space-y-4">
          {destinyChoices.map((choice, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-gradient-to-r from-white/5 to-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl flex-shrink-0">{choice.emoji}</span>
                <div className="flex-1">
                  <p className="text-indigo-300 font-bold text-base mb-1">{choice.title}</p>
                  <p className="text-gray-300 text-sm mb-2">{choice.ko}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed pl-11">{choice.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 7) 나의 운명 스타일 - 격국 또는 일간 기반 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const geok = saju?.advancedAnalysis?.geokguk;
        const geokName = geok?.name || geok?.type || "";

        // 격국별 상세 해석
        const getGeokgukMeaning = (name: string): { title: string; desc: string; emoji: string; advice: string } | null => {
          const n = name.toLowerCase();
          if (n.includes("식신") || n.includes("sikshin") || n.includes("food")) return {
            title: isKo ? "창작형 운명" : "Creative Destiny",
            emoji: "🎨",
            desc: isKo
              ? "당신은 무언가를 '만들어내는' 사람이에요. 요리, 글쓰기, 디자인, 예술... 창작 활동을 할 때 가장 행복하고, 그때 돈도 따라와요. 남이 시키는 일보다 내가 만드는 일에서 빛나요."
              : "You're someone who 'creates.' Cooking, writing, design, art... you're happiest when creating, and that's when money follows. You shine in work you create, not work others assign.",
            advice: isKo
              ? "매일 뭔가를 만들어보세요. 글이든, 음식이든, 작은 것이든. 그게 당신의 운을 여는 열쇠예요."
              : "Create something every day. Writing, food, anything small. That's the key to opening your fortune."
          };
          if (n.includes("상관") || n.includes("sangwan") || n.includes("hurting")) return {
            title: isKo ? "표현형 운명" : "Expressive Destiny",
            emoji: "🎤",
            desc: isKo
              ? "당신은 말과 표현의 천재예요. 생각을 말로, 글로, 행동으로 표현할 때 에너지가 폭발해요. 강의, 방송, 영업, 마케팅... 소통하는 일에서 두각을 나타내요. 조용히 있으면 오히려 답답해져요."
              : "You're a genius of expression. When you express thoughts through words, writing, or action, your energy explodes. Lectures, broadcasting, sales, marketing... you excel in communication roles.",
            advice: isKo
              ? "숨지 마세요. 당신의 생각과 의견을 세상에 드러낼수록 기회가 찾아와요."
              : "Don't hide. The more you show your thoughts and opinions to the world, the more opportunities come."
          };
          if (n.includes("정재") || n.includes("jeongjae") || n.includes("direct wealth")) return {
            title: isKo ? "안정 재물형 운명" : "Steady Wealth Destiny",
            emoji: "🏦",
            desc: isKo
              ? "당신은 '차곡차곡' 쌓아가는 타입이에요. 한방에 대박보다는 꾸준히 모을 때 부가 늘어나요. 월급, 적금, 부동산... 안정적인 재테크가 잘 맞아요. 급하게 투자하면 오히려 손해 볼 수 있어요."
              : "You're the 'steady accumulation' type. Rather than jackpots, wealth grows when you consistently save. Salary, savings, real estate... stable investments suit you. Rushing into investments can lead to losses.",
            advice: isKo
              ? "조급해하지 마세요. 거북이가 토끼를 이기는 경주예요. 꾸준함이 당신의 무기예요."
              : "Don't be impatient. It's the race where the tortoise beats the hare. Consistency is your weapon."
          };
          if (n.includes("편재") || n.includes("pyeonjae") || n.includes("indirect wealth")) return {
            title: isKo ? "투자형 운명" : "Investor Destiny",
            emoji: "📈",
            desc: isKo
              ? "당신은 기회를 보는 눈이 있어요. 남들이 못 보는 가능성을 알아채고, 과감하게 베팅할 줄 알아요. 사업, 투자, 무역... 큰 판에서 한방이 있는 타입이에요. 대신 리스크 관리가 중요해요."
              : "You have eyes for opportunity. You spot possibilities others miss and know how to bet boldly. Business, investment, trade... you can hit big on the large stage. But risk management is crucial.",
            advice: isKo
              ? "직감을 믿되, 한 바구니에 다 담지 마세요. 분산 투자가 안전해요."
              : "Trust your instincts, but don't put all eggs in one basket. Diversification is safer."
          };
          if (n.includes("정관") || n.includes("jeonggwan") || n.includes("direct officer")) return {
            title: isKo ? "조직형 운명" : "Organizational Destiny",
            emoji: "👔",
            desc: isKo
              ? "당신은 조직 안에서 성장하는 타입이에요. 체계적인 환경에서 단계별로 올라갈 때 빛나요. 공무원, 대기업, 전문직... 안정적이고 명확한 커리어 패스가 있는 곳이 잘 맞아요. 승진과 인정이 큰 동기부여가 돼요."
              : "You thrive within organizations. You shine when climbing step by step in systematic environments. Civil service, corporations, professions... places with stable, clear career paths suit you.",
            advice: isKo
              ? "조직의 규칙을 잘 활용하세요. 당신의 성실함과 책임감이 결국 인정받아요."
              : "Use organizational rules well. Your diligence and responsibility will be recognized."
          };
          if (n.includes("편관") || n.includes("pyeongwan") || n.includes("seven") || n.includes("indirect officer")) return {
            title: isKo ? "도전형 운명" : "Challenger Destiny",
            emoji: "⚔️",
            desc: isKo
              ? "당신은 압박과 경쟁 속에서 빛나는 타입이에요. 편한 환경에서는 오히려 게을러져요. 도전, 위기, 경쟁... 이런 상황이 당신의 잠재력을 끌어내요. 스타트업, 영업, 스포츠 등 치열한 분야가 잘 맞아요."
              : "You shine under pressure and competition. You get lazy in comfortable environments. Challenges, crises, competition... these situations draw out your potential. Startups, sales, sports suit you.",
            advice: isKo
              ? "안전한 길보다 도전적인 길을 택하세요. 역경이 당신을 성장시켜요."
              : "Choose challenging paths over safe ones. Adversity makes you grow."
          };
          if (n.includes("정인") || n.includes("jeongin") || n.includes("direct resource")) return {
            title: isKo ? "학습형 운명" : "Scholar Destiny",
            emoji: "📚",
            desc: isKo
              ? "당신은 배움으로 운을 여는 타입이에요. 자격증, 학위, 전문 지식... 공부한 것이 곧 돈이 돼요. 평생 배우는 사람이고, 그 지식을 나눌 때 더 큰 보상이 와요. 선생님, 전문가, 컨설턴트가 잘 맞아요."
              : "You unlock fortune through learning. Certifications, degrees, expertise... what you study becomes money. You're a lifelong learner, and sharing knowledge brings greater rewards.",
            advice: isKo
              ? "항상 공부하세요. 당신이 배운 것이 결국 당신의 가치가 돼요."
              : "Always study. What you learn ultimately becomes your value."
          };
          if (n.includes("편인") || n.includes("pyeonin") || n.includes("indirect resource")) return {
            title: isKo ? "직관형 운명" : "Intuitive Destiny",
            emoji: "🔮",
            desc: isKo
              ? "당신은 남들과 다른 시각을 가진 사람이에요. 평범한 길이 아닌 독특한 방법으로 성공해요. 창의적인 분야, 예술, 심리, 철학, 영성... 비주류 같지만 사실 선구자인 거예요. 남들 따라가면 오히려 망해요."
              : "You have a different perspective from others. You succeed through unique methods, not conventional paths. Creative fields, art, psychology, philosophy, spirituality... seemingly alternative but actually pioneering.",
            advice: isKo
              ? "남들 눈치 보지 마세요. 당신의 '이상함'이 바로 당신의 강점이에요."
              : "Don't worry about others' opinions. Your 'weirdness' is your strength."
          };
          if (n.includes("비견") || n.includes("bigyeon") || n.includes("friend") || n.includes("companion")) return {
            title: isKo ? "독립형 운명" : "Independent Destiny",
            emoji: "🚀",
            desc: isKo
              ? "당신은 혼자 힘으로 해내는 사람이에요. 남에게 의지하기보다 스스로 개척하는 게 맞아요. 프리랜서, 1인 기업, 자영업... 내 재량으로 일할 때 최고의 성과를 내요. 조직에서는 자유도가 있어야 버틸 수 있어요."
              : "You're someone who does things on your own. Pioneering yourself suits you better than relying on others. Freelance, solo business, self-employment... you perform best with your own discretion.",
            advice: isKo
              ? "언젠가는 당신만의 것을 시작하세요. 그때 진짜 행복해질 거예요."
              : "Someday start something of your own. That's when you'll find true happiness."
          };
          if (n.includes("겁재") || n.includes("geopjae") || n.includes("rob")) return {
            title: isKo ? "협력형 운명" : "Partnership Destiny",
            emoji: "🤝",
            desc: isKo
              ? "당신은 파트너와 함께할 때 시너지가 나는 타입이에요. 혼자보다 둘이, 둘보다 팀이 더 강해요. 동업, 합작, 팀 프로젝트... 협력할 때 1+1=3이 되는 사람이에요. 대신 파트너 선택이 정말 중요해요."
              : "You create synergy with partners. Two is stronger than one, team stronger than two. Joint ventures, collaborations, team projects... you're someone where 1+1=3. Partner selection is crucial though.",
            advice: isKo
              ? "좋은 파트너를 만나세요. 그게 당신 운명의 절반을 결정해요."
              : "Find good partners. That determines half your destiny."
          };
          return null;
        };

        // 격국 데이터가 있으면 사용, 없으면 일간 기반 폴백
        const meaning = getGeokgukMeaning(geokName);

        // 일간(dayMaster) 기반 폴백 해석
        const getDayMasterStyle = (): { title: string; desc: string; emoji: string; advice: string } => {
          const dm = data.dayMasterName;
          const styles: Record<string, { title: string; desc: string; emoji: string; advice: string }> = {
            "갑": {
              title: isKo ? "개척자형 운명" : "Pioneer Destiny",
              emoji: "🌲",
              desc: isKo
                ? "당신은 새로운 길을 만드는 사람이에요. 남들이 안 가는 길, 아무도 시도하지 않은 것에 끌려요. 리더로서 앞장서고, 뒤따르는 사람들을 이끄는 게 당신의 역할이에요. 창업, 신사업, 혁신적인 분야가 잘 맞아요."
                : "You're someone who creates new paths. You're drawn to roads others don't take, things no one has tried. Leading from the front and guiding followers is your role.",
              advice: isKo
                ? "두려워하지 마세요. 길이 없으면 만들면 돼요. 그게 당신의 운명이에요."
                : "Don't be afraid. If there's no path, create one. That's your destiny."
            },
            "을": {
              title: isKo ? "적응자형 운명" : "Adapter Destiny",
              emoji: "🌿",
              desc: isKo
                ? "당신은 어디서든 살아남는 사람이에요. 환경이 바뀌어도 유연하게 적응하고, 결국 원하는 곳에 도달해요. 네트워킹, 중재, 연결... 사람과 사람을 잇는 일에서 빛나요."
                : "You're someone who survives anywhere. Even when environments change, you adapt flexibly and eventually reach where you want. Networking, mediation, connection... you shine in bridging people.",
              advice: isKo
                ? "유연함은 약점이 아니에요. 거센 바람에 부러지는 건 딱딱한 나무예요."
                : "Flexibility isn't weakness. It's the stiff tree that breaks in strong wind."
            },
            "병": {
              title: isKo ? "영향력형 운명" : "Influencer Destiny",
              emoji: "☀️",
              desc: isKo
                ? "당신은 존재만으로 주변을 밝히는 사람이에요. 사람들이 자연스럽게 당신에게 끌리고, 당신의 에너지를 원해요. 리더십, 엔터테인먼트, 마케팅... 영향력을 발휘하는 일이 천직이에요."
                : "You brighten your surroundings just by existing. People are naturally drawn to you and want your energy. Leadership, entertainment, marketing... wielding influence is your calling.",
              advice: isKo
                ? "숨지 마세요. 세상은 당신의 빛을 필요로 해요."
                : "Don't hide. The world needs your light."
            },
            "정": {
              title: isKo ? "감성가형 운명" : "Empath Destiny",
              emoji: "🕯️",
              desc: isKo
                ? "당신은 따뜻함으로 사람을 녹이는 사람이에요. 섬세하고 배려심이 깊어서, 가까이 있는 사람들을 깊이 감동시켜요. 상담, 예술, 서비스... 마음을 다루는 일에서 빛나요."
                : "You melt people with warmth. Delicate and considerate, you deeply move those close to you. Counseling, art, service... you shine in work that handles hearts.",
              advice: isKo
                ? "작은 것도 소중해요. 한 사람을 밝히는 것이 세상을 바꾸는 거예요."
                : "Small things matter. Lighting up one person changes the world."
            },
            "무": {
              title: isKo ? "기반형 운명" : "Foundation Destiny",
              emoji: "🏔️",
              desc: isKo
                ? "당신은 모든 것의 기반이 되는 사람이에요. 주변 사람들이 당신에게 기대고, 의지해요. 안정적이고 신뢰감 있는 역할... 부동산, 금융, 경영 등 기반을 다루는 일이 잘 맞아요."
                : "You're the foundation of everything. People around you lean on and rely on you. Stable, trustworthy roles... real estate, finance, management suit you.",
              advice: isKo
                ? "모두를 지탱하느라 지치지 마세요. 당신도 쉬어도 돼요."
                : "Don't exhaust yourself supporting everyone. You can rest too."
            },
            "기": {
              title: isKo ? "육성자형 운명" : "Nurturer Destiny",
              emoji: "🌾",
              desc: isKo
                ? "당신은 다른 사람을 키우는 사람이에요. 씨앗을 심고 가꾸듯, 사람과 프로젝트를 성장시켜요. 교육, HR, 코칭... 누군가를 발전시키는 일에서 보람을 느껴요."
                : "You're someone who grows others. Like planting and tending seeds, you help people and projects flourish. Education, HR, coaching... you find fulfillment in developing others.",
              advice: isKo
                ? "남을 챙기느라 자신을 잊지 마세요. 당신도 성장할 자격이 있어요."
                : "Don't forget yourself while caring for others. You deserve to grow too."
            },
            "경": {
              title: isKo ? "결단자형 운명" : "Decisive Destiny",
              emoji: "⚔️",
              desc: isKo
                ? "당신은 결단으로 길을 여는 사람이에요. 망설이지 않고 잘라내고, 밀어붙여요. 정의감이 강하고 불의를 참지 못해요. 법조, 군인, 경영자... 결단이 필요한 자리가 맞아요."
                : "You open paths through decisions. You cut and push without hesitation. Strong sense of justice, can't tolerate wrong. Law, military, executive... positions needing decisiveness suit you.",
              advice: isKo
                ? "부드러움도 힘이에요. 칼로 자르지 못하는 것도 있어요."
                : "Gentleness is also strength. Some things can't be cut with a blade."
            },
            "신": {
              title: isKo ? "심미가형 운명" : "Aesthete Destiny",
              emoji: "💎",
              desc: isKo
                ? "당신은 아름다움을 알아보는 사람이에요. 남들이 '그냥 괜찮네'라고 지나치는 것에서 특별함을 발견해요. 옷 하나를 골라도 디테일을 보고, 공간을 꾸밀 때도 색감과 균형을 생각해요. 투박한 걸 세련되게, 평범한 걸 특별하게 만드는 재능이 있어요. 디자인, 패션, 주얼리, 인테리어, 브랜딩... 미적 감각이 필요한 모든 분야에서 빛나요. 남들이 '왜 저렇게 신경 써?'라고 할 때 당신은 '디테일이 중요한데'라고 생각해요."
                : "You recognize beauty. You find specialness in things others pass by saying 'it's fine'. Choosing clothes, you see details; decorating spaces, you think of colors and balance. You have the talent to make crude things refined, ordinary things special. Design, fashion, jewelry, interior, branding... you shine in all fields needing aesthetic sense. When others ask 'why care so much?', you think 'details matter'.",
              advice: isKo
                ? "완벽함을 추구하되, 불완전함도 사랑하세요. 금이 간 도자기도 아름다워요. 70% 완성도에서 내놓는 연습을 하세요. 완벽하게 만들려다가 아예 시작 못 하는 것보다, 불완전해도 세상에 내놓는 게 나아요."
                : "Pursue perfection, but love imperfection too. Cracked pottery is beautiful. Practice releasing at 70% completion. Better to release imperfectly than never start trying to be perfect."
            },
            "임": {
              title: isKo ? "전략가형 운명" : "Strategist Destiny",
              emoji: "🌊",
              desc: isKo
                ? "당신은 깊이로 승부하는 사람이에요. 표면이 아닌 본질을 꿰뚫고, 장기적인 전략을 세워요. 연구, 분석, 투자, 컨설팅... 깊은 생각이 필요한 일에서 빛나요."
                : "You win through depth. You pierce to essence, not surface, and build long-term strategies. Research, analysis, investment, consulting... work needing deep thinking is where you shine.",
              advice: isKo
                ? "가끔은 생각하지 말고 느껴보세요. 직관도 당신의 무기예요."
                : "Sometimes feel instead of think. Intuition is also your weapon."
            },
            "계": {
              title: isKo ? "창조자형 운명" : "Creator Destiny",
              emoji: "💧",
              desc: isKo
                ? "당신은 영감으로 사는 사람이에요. 순수하고 맑은 감성으로 세상을 느끼고, 그것을 창작물로 표현해요. 예술, 음악, 글... 영혼을 담은 작업에서 진가를 발휘해요."
                : "You live by inspiration. You feel the world with pure, clear sensitivity and express it through creation. Art, music, writing... you show your worth in soulful work.",
              advice: isKo
                ? "세상이 거칠어도 당신의 순수함을 지키세요. 그게 당신의 힘이에요."
                : "Keep your purity even if the world is rough. That's your power."
            }
          };
          return styles[dm] || styles["갑"];
        };

        const finalMeaning = meaning || getDayMasterStyle();

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{finalMeaning.emoji}</span>
              <h3 className="text-lg font-bold text-violet-300">{isKo ? "나의 운명 스타일" : "My Destiny Style"}</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-300 font-bold text-base mb-2">{finalMeaning.title}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{finalMeaning.desc}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs flex items-start gap-2">
                  <span>💡</span>
                  <span className="text-gray-300">{finalMeaning.advice}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 8) 나를 도와주는 에너지 - 용신 또는 약한 오행 기반 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const yong = saju?.advancedAnalysis?.yongsin;
        const yongElement = yong?.element || yong?.name || "";
        // 용신이 없으면 가장 약한 오행 사용
        const weakestElement = data.weakest[0];

        // 오행별 상세 해석
        const getElementAdvice = (el: string): { element: string; elementEn: string; emoji: string; desc: string; advice: string; items: string[] } => {
          const e = el.toLowerCase();
          if (e === "wood" || e.includes("목")) return {
            element: "나무 기운 (木)",
            elementEn: "Wood Energy",
            emoji: "🌳",
            desc: isKo
              ? "나무는 성장과 시작의 에너지예요. 새싹이 땅을 뚫고 올라오듯, 어려움을 뚫고 성장하는 힘이에요. 봄의 기운, 아침의 활력, 새로운 시작의 설렘... 이게 당신에게 필요해요."
              : "Wood is the energy of growth and beginnings. Like a sprout breaking through soil, it's the power to grow through difficulties. Spring's energy, morning vitality, excitement of new starts... this is what you need.",
            advice: isKo
              ? "정체되어 있으면 답답해져요. 뭔가 새로운 걸 시작하세요. 작은 것이라도 괜찮아요."
              : "Stagnation makes you frustrated. Start something new. Even small things are fine.",
            items: isKo
              ? ["🌿 초록색 옷/소품 착용", "🌱 식물 키우기 (생명력)", "🏃 아침 운동/산책", "📚 새로운 것 배우기"]
              : ["🌿 Wear green clothes/items", "🌱 Grow plants (vitality)", "🏃 Morning exercise/walk", "📚 Learn something new"]
          };
          if (e === "fire" || e.includes("화")) return {
            element: "불 기운 (火)",
            elementEn: "Fire Energy",
            emoji: "🔥",
            desc: isKo
              ? "불은 열정과 표현의 에너지예요. 어둠을 밝히고, 차가운 것을 따뜻하게 하고, 존재감을 드러내는 힘이에요. 태양의 카리스마, 열정의 불꽃... 이게 당신에게 필요해요."
              : "Fire is the energy of passion and expression. It illuminates darkness, warms the cold, and reveals presence. Solar charisma, flames of passion... this is what you need.",
            advice: isKo
              ? "숨어있지 마세요. 당신을 드러내고, 사람들과 교류하세요. 그게 운을 열어요."
              : "Don't hide. Show yourself and interact with people. That opens your fortune.",
            items: isKo
              ? ["❤️ 빨간색/분홍색 착용", "🕯️ 따뜻한 조명/캔들", "👥 사교 모임 참여", "🎭 자기 표현 활동"]
              : ["❤️ Wear red/pink", "🕯️ Warm lighting/candles", "👥 Social gatherings", "🎭 Self-expression activities"]
          };
          if (e === "earth" || e.includes("토")) return {
            element: "흙 기운 (土)",
            elementEn: "Earth Energy",
            emoji: "🏔️",
            desc: isKo
              ? "흙은 안정과 신뢰의 에너지예요. 모든 것을 품고, 지탱하고, 중심을 잡아주는 힘이에요. 산의 묵직함, 대지의 포용력... 이게 당신에게 필요해요."
              : "Earth is the energy of stability and trust. It embraces everything, supports, and holds center. Mountain's weight, earth's embrace... this is what you need.",
            advice: isKo
              ? "급하게 가지 마세요. 기반을 다지고, 천천히 쌓아가세요. 조급함이 적이에요."
              : "Don't rush. Build your foundation and accumulate slowly. Impatience is your enemy.",
            items: isKo
              ? ["🟤 베이지/갈색/황토색", "🏠 집 꾸미기/정리", "🍲 집에서 요리해 먹기", "🧘 명상/그라운딩"]
              : ["🟤 Beige/brown/ochre colors", "🏠 Organize/decorate home", "🍲 Cook at home", "🧘 Meditation/grounding"]
          };
          if (e === "metal" || e.includes("금")) return {
            element: "쇠 기운 (金)",
            elementEn: "Metal Energy",
            emoji: "⚔️",
            desc: isKo
              ? "쇠는 결단과 정리의 에너지예요. 불필요한 것을 잘라내고, 본질만 남기고, 명확하게 만드는 힘이에요. 칼날의 예리함, 보석의 빛남... 이게 당신에게 필요해요."
              : "Metal is the energy of decision and organization. It cuts away the unnecessary, leaves only essence, and clarifies. Blade's sharpness, gem's brilliance... this is what you need.",
            advice: isKo
              ? "미루지 마세요. 결정하고, 정리하고, 끝내세요. 명확해지면 운이 따라와요."
              : "Don't procrastinate. Decide, organize, finish. Clarity brings fortune.",
            items: isKo
              ? ["⚪ 흰색/은색/금색", "⌚ 메탈 액세서리", "🧹 불필요한 것 버리기", "✂️ 관계/물건 정리"]
              : ["⚪ White/silver/gold", "⌚ Metal accessories", "🧹 Discard unnecessary", "✂️ Organize relationships/things"]
          };
          if (e === "water" || e.includes("수")) return {
            element: "물 기운 (水)",
            elementEn: "Water Energy",
            emoji: "💧",
            desc: isKo
              ? "물은 지혜와 유연함의 에너지예요. 어떤 그릇에도 담기고, 막히면 돌아가고, 깊이를 더해가는 힘이에요. 바다의 깊이, 시냇물의 청명함... 이게 당신에게 필요해요."
              : "Water is the energy of wisdom and flexibility. It fills any vessel, flows around obstacles, and adds depth. Ocean's depth, stream's clarity... this is what you need.",
            advice: isKo
              ? "유연해지세요. 고집부리지 말고 흐름을 타세요. 깊이 생각하는 시간도 필요해요."
              : "Be flexible. Don't be stubborn, go with the flow. Deep thinking time is also needed.",
            items: isKo
              ? ["💙 파란색/검정색", "💧 물 많이 마시기", "🛁 목욕/수영/물 근처", "📖 독서/명상/사색"]
              : ["💙 Blue/black colors", "💧 Drink lots of water", "🛁 Bath/swim/near water", "📖 Reading/meditation/contemplation"]
          };
          // 기본값 (약한 오행 기반)
          return {
            element: isKo ? `${elementTraits[weakestElement]?.ko || "균형"} 기운` : `${elementTraits[weakestElement]?.en || "Balance"} Energy`,
            elementEn: `${elementTraits[weakestElement]?.en || "Balance"} Energy`,
            emoji: elementTraits[weakestElement]?.emoji || "⚖️",
            desc: isKo
              ? "당신의 오행 중 가장 부족한 에너지를 채우면 전체적인 균형이 잡혀요. 이 기운을 일상에 더하면 놀랍게 삶이 편안해져요."
              : "Filling your weakest element energy brings overall balance. Adding this to daily life surprisingly makes life easier.",
            advice: isKo
              ? "일상에서 이 에너지를 의식적으로 채워보세요."
              : "Consciously fill this energy in your daily life.",
            items: isKo
              ? ["⚖️ 균형 잡힌 생활 습관"]
              : ["⚖️ Balanced lifestyle habits"]
          };
        };

        // 용신이 있으면 용신 사용, 없으면 약한 오행 사용
        const targetElement = yongElement || weakestElement;
        const advice = getElementAdvice(targetElement);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{advice.emoji}</span>
              <h3 className="text-lg font-bold text-cyan-300">{isKo ? "나를 도와주는 에너지" : "Energy That Helps Me"}</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-cyan-300 font-bold text-base mb-2">{isKo ? advice.element : advice.elementEn}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">{advice.desc}</p>
                <p className="text-cyan-200 text-sm font-medium">{advice.advice}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {advice.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 9) 운의 흐름 체크 - 형충회합을 쉽게 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {saju?.advancedAnalysis?.hyungChungHoeHap && (() => {
        const hchh = saju.advancedAnalysis.hyungChungHoeHap;
        const conflicts = hchh?.chung || hchh?.conflicts || [];
        const harmonies = hchh?.hap || hchh?.harmony || [];

        const hasConflicts = Array.isArray(conflicts) && conflicts.length > 0;
        const hasHarmonies = Array.isArray(harmonies) && harmonies.length > 0;

        if (!hasConflicts && !hasHarmonies) return null;

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-rose-900/20 border border-rose-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🔄</span>
              <h3 className="text-lg font-bold text-rose-300">{isKo ? "운의 흐름 체크" : "Fortune Flow Check"}</h3>
            </div>

            <div className="space-y-3">
              {hasConflicts && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-rose-300 font-bold text-sm mb-2">⚡ 주의할 타이밍</p>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {isKo
                      ? "가끔 일이 꼬이거나 갑자기 변화가 오는 시기가 있어요. 이때는 큰 결정을 미루고, 갈등 상황에서 한 발 물러서면 오히려 좋은 결과가 와요."
                      : "Sometimes things get tangled or sudden changes come. At these times, delay big decisions and step back from conflicts - you'll get better results."}
                  </p>
                </div>
              )}

              {hasHarmonies && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-green-300 font-bold text-sm mb-2">✨ 좋은 타이밍</p>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {isKo
                      ? "자연스럽게 일이 풀리고 기회가 오는 시기가 있어요. 평소보다 적극적으로 움직이면 좋은 인연과 기회를 잡을 수 있어요."
                      : "There are times when things naturally work out and opportunities come. Move more actively than usual to catch good connections and chances."}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 10) 내 안의 에너지 분포 - 십신을 쉽게 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {data.sibsinAnalysis && data.sibsinAnalysis.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-teal-900/20 border border-teal-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🧬</span>
            <h3 className="text-lg font-bold text-teal-300">{isKo ? "내 안의 에너지 분포" : "My Inner Energy Mix"}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.sibsinAnalysis.slice(0, 4).map((item, idx) => {
              // 카테고리별 쉬운 설명
              const getSimpleDesc = (cat: string): string => {
                if (cat.includes("비겁") || cat.includes("Peers")) return isKo ? "독립심과 자존감이 강해요" : "Strong independence and self-esteem";
                if (cat.includes("식상") || cat.includes("Expression")) return isKo ? "창의력과 표현력이 뛰어나요" : "Great creativity and expression";
                if (cat.includes("재성") || cat.includes("Wealth")) return isKo ? "재물 감각과 실용성이 있어요" : "Good with money and practical";
                if (cat.includes("관성") || cat.includes("Status")) return isKo ? "조직력과 책임감이 강해요" : "Strong organization and responsibility";
                if (cat.includes("인성") || cat.includes("Knowledge")) return isKo ? "학습 능력과 사고력이 좋아요" : "Good learning and thinking ability";
                return item.description;
              };

              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xl flex-shrink-0">{item.emoji}</span>
                  <div>
                    <p className="text-teal-300 font-medium text-sm">{item.category.split("(")[0].trim()}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{getSimpleDesc(item.category)}</p>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: Math.min(item.count, 5) }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-teal-400" />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400">
              {isKo
                ? "💡 점이 많은 에너지가 강점이에요. 이 분야에서 능력을 발휘하면 운이 풀려요."
                : "💡 Areas with more dots are your strengths. Using these abilities opens up your fortune."}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 11) 건강 체크 포인트 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const dmName = data.dayMasterName || "";
        // 일간별 건강 포인트
        const getHealthStory = (dm: string) => {
          const stories: Record<string, { focus: string; warning: string; lifestyle: string; stress: string }> = {
            "갑": {
              focus: isKo ? "간, 담낭, 눈, 근육, 신경계" : "Liver, gallbladder, eyes, muscles, nervous system",
              warning: isKo ? "스트레스를 받으면 간에 무리가 와요. 화를 참으면 몸에 쌓여요. 눈의 피로, 근육 경직에도 주의하세요." : "Stress burdens your liver. Holding anger accumulates in your body. Watch for eye fatigue and muscle stiffness.",
              lifestyle: isKo ? "규칙적인 운동으로 에너지를 발산하세요. 녹색 채소, 신맛 나는 음식이 도움돼요. 충분한 수면이 간 회복에 필수예요." : "Release energy through regular exercise. Green vegetables and sour foods help. Sufficient sleep is essential for liver recovery.",
              stress: isKo ? "화가 나면 바로 풀어야 해요. 운동, 산책, 글쓰기... 속에 담아두면 몸이 아파요." : "Release anger immediately. Exercise, walking, writing... keeping it inside makes your body sick."
            },
            "을": {
              focus: isKo ? "간, 담낭, 목, 어깨, 신경" : "Liver, gallbladder, neck, shoulders, nerves",
              warning: isKo ? "목과 어깨에 긴장이 쌓여요. 섬세한 성격 때문에 신경이 예민해지기 쉬워요. 과로하면 금방 지쳐요." : "Tension accumulates in neck and shoulders. Sensitive personality makes nerves easily strained. You tire quickly when overworked.",
              lifestyle: isKo ? "스트레칭과 요가가 잘 맞아요. 목욕으로 긴장을 풀고, 자연 속에서 충전하세요. 무리하지 말고 쉬엄쉬엄 가세요." : "Stretching and yoga suit you well. Relax tension with baths and recharge in nature. Don't overdo it, pace yourself.",
              stress: isKo ? "눈치 보느라 지치지 마세요. 내 감정도 중요하니까요. 가끔은 'NO'라고 말해도 괜찮아요." : "Don't exhaust yourself reading moods. Your emotions matter too. It's okay to say 'NO' sometimes."
            },
            "병": {
              focus: isKo ? "심장, 소장, 혈압, 눈, 혀" : "Heart, small intestine, blood pressure, eyes, tongue",
              warning: isKo ? "열정이 과하면 심장에 무리가 와요. 화를 내면 혈압이 올라가요. 과로와 수면 부족에 특히 주의하세요." : "Excessive passion burdens the heart. Anger raises blood pressure. Especially watch overwork and sleep deprivation.",
              lifestyle: isKo ? "정기적인 휴식이 필수예요. 심장 건강을 위해 유산소 운동을 하고, 쓴맛 나는 음식(커피, 녹차)을 적당히 드세요." : "Regular rest is essential. Do cardio for heart health, and have bitter foods (coffee, green tea) in moderation.",
              stress: isKo ? "흥분하면 심장이 힘들어요. 차분해지는 연습, 심호흡, 명상이 도움돼요." : "Excitement strains your heart. Practice calming down, deep breathing, and meditation."
            },
            "정": {
              focus: isKo ? "심장, 소장, 눈, 혈액순환" : "Heart, small intestine, eyes, blood circulation",
              warning: isKo ? "감정을 안으로 삼키면 심장이 답답해져요. 혼자 끙끙 앓으면 순환이 안 돼요. 불면증에도 주의하세요." : "Swallowing emotions makes your heart stuffy. Suffering alone blocks circulation. Also watch for insomnia.",
              lifestyle: isKo ? "감정을 표현하는 게 건강에 좋아요. 따뜻한 차, 족욕, 반신욕으로 순환을 돕고, 일찍 자고 일찍 일어나세요." : "Expressing emotions is good for health. Help circulation with warm tea, foot baths, half-baths, and keep early sleep schedules.",
              stress: isKo ? "속앓이하지 마세요. 일기를 쓰거나 믿을 사람에게 털어놓으세요. 표현이 치유예요." : "Don't suffer silently. Write a diary or confide in trusted people. Expression is healing."
            },
            "무": {
              focus: isKo ? "위장, 비장, 소화기, 입술, 근육" : "Stomach, spleen, digestive system, lips, muscles",
              warning: isKo ? "걱정하면 위장이 아파요. 불규칙한 식사와 과식에 주의하세요. 당뇨와 비만에도 신경 써야 해요." : "Worry hurts your stomach. Watch irregular meals and overeating. Also be mindful of diabetes and obesity.",
              lifestyle: isKo ? "규칙적인 식사가 가장 중요해요. 황색 음식(호박, 고구마, 옥수수)이 좋아요. 단 음식은 적당히만 드세요." : "Regular meals are most important. Yellow foods (pumpkin, sweet potato, corn) are good. Eat sweet foods in moderation.",
              stress: isKo ? "걱정이 많으면 소화가 안 돼요. 한 번에 하나씩만 생각하세요. 지금 할 수 없는 건 내려놓으세요." : "Too much worry prevents digestion. Think about one thing at a time. Let go of what you can't do now."
            },
            "기": {
              focus: isKo ? "위장, 비장, 피부, 소화기" : "Stomach, spleen, skin, digestive system",
              warning: isKo ? "과로하면 소화력이 떨어져요. 스트레스가 위장과 피부로 나타나요. 과식과 야식을 피하세요." : "Overwork reduces digestive power. Stress shows in stomach and skin. Avoid overeating and late-night eating.",
              lifestyle: isKo ? "잘 먹는 것보다 잘 쉬는 게 중요해요. 자연식, 제철 음식이 좋고, 일과 휴식의 균형을 맞추세요." : "Resting well is more important than eating well. Natural, seasonal foods are good. Balance work and rest.",
              stress: isKo ? "남 걱정하느라 자신을 돌보지 못해요. 내 몸과 마음도 챙기세요. 가끔은 이기적이어도 괜찮아요." : "Worrying about others, you neglect yourself. Take care of your body and mind too. It's okay to be selfish sometimes."
            },
            "경": {
              focus: isKo ? "폐, 대장, 피부, 코, 호흡기" : "Lungs, large intestine, skin, nose, respiratory system",
              warning: isKo ? "슬픔을 삼키면 폐가 힘들어요. 건조한 환경, 미세먼지에 주의하세요. 피부 트러블과 변비에도 신경 쓰세요." : "Swallowing sadness burdens lungs. Watch dry environments and fine dust. Also care for skin troubles and constipation.",
              lifestyle: isKo ? "깊은 호흡 연습이 도움돼요. 흰색 음식(배, 무, 도라지)이 폐에 좋아요. 수분 섭취를 충분히 하세요." : "Deep breathing practice helps. White foods (pear, radish, bellflower root) are good for lungs. Drink plenty of water.",
              stress: isKo ? "감정을 억누르면 호흡이 얕아져요. 울고 싶을 땐 우세요. 그게 폐 건강에 좋아요." : "Suppressing emotions shallows breathing. Cry when you want to. That's good for lung health."
            },
            "신": {
              focus: isKo ? "폐, 대장, 피부, 호흡기, 치아" : "Lungs, large intestine, skin, respiratory, teeth",
              warning: isKo ? "예민한 성격이 피부와 호흡기에 직접적인 영향을 줘요. 스트레스받으면 피부가 가장 먼저 반응하고(아토피, 두드러기, 여드름), 숨이 얕아지면서 만성 피로가 찾아와요. 알레르기 체질이라면 계절 변화, 미세먼지, 꽃가루에 특히 민감하게 반응해요. 완벽주의 성향 때문에 긴장을 놓지 못하면 턱관절 문제, 이갈이, 치아 손상까지 올 수 있어요. 대장이 예민해서 스트레스가 변비나 과민성대장으로 나타나기도 해요. 환절기마다 감기, 비염, 기관지염에 걸리기 쉽고, 목소리가 쉽게 쉬어요." : "Sensitive personality directly affects skin and respiratory system. When stressed, skin reacts first (atopic dermatitis, hives, acne) and shallow breathing leads to chronic fatigue. If allergic, especially sensitive to seasonal changes, fine dust, pollen. Perfectionism can cause jaw problems, teeth grinding, tooth damage from constant tension. Sensitive intestines show stress as constipation or IBS. Prone to colds, rhinitis, bronchitis every season change, voice easily gets hoarse.",
              lifestyle: isKo ? "밤 11시 전 수면이 피부 재생의 핵심이에요. 자기 전 스마트폰 보는 습관을 끊고, 숙면을 취하세요. 매운 음식과 자극적인 음식은 피부와 대장을 자극하니 적당히 드세요. 실내 습도 50-60%로 유지하면 피부 건조와 호흡기 트러블을 예방할 수 있어요. 공기청정기로 깨끗한 환경을 만들고, 먼지 쌓이지 않게 자주 청소하세요. 흰색 음식(배, 무, 도라지, 은행)은 폐를 보호해주고, 프로바이오틱스는 예민한 대장에 도움돼요. 아침 공복에 따뜻한 물 한 잔으로 장 운동을 시작하세요. 하루 1.5L 이상 물 마시기, 유산소 운동으로 폐활량 키우기도 중요해요." : "Sleep before 11 PM is key to skin regeneration. Stop phone before bed, get deep sleep. Spicy and stimulating foods irritate skin and intestines, eat moderately. Maintain 50-60% humidity to prevent dry skin and respiratory troubles. Create clean environment with air purifier, clean often to prevent dust. White foods (pear, radish, bellflower root, ginkgo) protect lungs, probiotics help sensitive intestines. Start bowel movement with warm water on empty stomach. Drink 1.5L+ water daily, build lung capacity with cardio.",
              stress: isKo ? "완벽하려고 애쓰면 몸 전체가 긴장 상태로 굳어요. 어깨와 목이 뻐근하고, 호흡이 얕아지면서 산소 공급이 부족해져요. 자기 전 5분만이라도 복식호흡 연습을 하세요. 코로 천천히 들이마시고 배를 부풀린 다음, 입으로 길게 내쉬는 호흡이 자율신경을 안정시켜요. '70%만 해도 괜찮다'는 마음가짐을 연습하세요. 완벽하지 않아도 충분히 잘하고 있어요. 피부 관리에 집착하지 말고, 스트레스 관리에 집중하세요. 스트레스가 줄면 피부도 자연스럽게 좋아져요. 명상, 요가, 가벼운 산책으로 긴장을 풀고, 혼자만의 시간을 규칙적으로 가지세요." : "Striving for perfection stiffens entire body in tension. Shoulders and neck stiffen, shallow breathing reduces oxygen supply. Practice diaphragmatic breathing for just 5 minutes before bed. Slowly inhale through nose expanding belly, then exhale long through mouth to stabilize autonomic nerves. Practice mindset that '70% is good enough.' You're doing well even if not perfect. Don't obsess over skincare, focus on stress management. When stress reduces, skin naturally improves. Release tension with meditation, yoga, light walks, and regularly have alone time."
            },
            "임": {
              focus: isKo ? "신장, 방광, 귀, 뼈, 생식기" : "Kidneys, bladder, ears, bones, reproductive system",
              warning: isKo ? "물을 적게 마시면 신장에 무리가 와요. 과로와 수면 부족이 뼈와 관절에 영향을 줘요. 허리 건강에도 주의하세요." : "Drinking little water burdens kidneys. Overwork and sleep deprivation affect bones and joints. Also watch your lower back.",
              lifestyle: isKo ? "물을 충분히 마시세요. 검은색 음식(검은콩, 검은깨, 해조류)이 신장에 좋아요. 과로를 피하고 충분히 쉬세요." : "Drink plenty of water. Black foods (black beans, black sesame, seaweed) are good for kidneys. Avoid overwork and rest enough.",
              stress: isKo ? "생각이 많으면 잠을 못 자요. 잠 못 자면 신장이 지쳐요. 머릿속을 비우는 연습을 하세요." : "Too many thoughts prevent sleep. Poor sleep exhausts kidneys. Practice emptying your mind."
            },
            "계": {
              focus: isKo ? "신장, 방광, 혈액, 림프, 귀" : "Kidneys, bladder, blood, lymph, ears",
              warning: isKo ? "감정을 너무 흡수하면 에너지가 고갈돼요. 수분 부족과 추위에 약해요. 면역력이 떨어지기 쉬워요." : "Absorbing too many emotions depletes energy. Vulnerable to dehydration and cold. Immunity easily drops.",
              lifestyle: isKo ? "따뜻하게 지내세요. 온수를 자주 마시고, 찬 음식은 피하세요. 명상과 수면이 회복에 중요해요." : "Stay warm. Drink warm water often and avoid cold foods. Meditation and sleep are important for recovery.",
              stress: isKo ? "남의 감정까지 다 느끼면 지쳐요. 경계를 지키세요. 내 에너지를 보호하는 것도 건강이에요." : "Feeling everyone's emotions exhausts you. Keep boundaries. Protecting your energy is also health."
            }
          };
          return stories[dm] || {
            focus: isKo ? "전반적인 건강 관리" : "Overall health management",
            warning: isKo ? "스트레스와 과로에 주의하세요" : "Watch for stress and overwork",
            lifestyle: isKo ? "규칙적인 생활이 중요해요" : "Regular lifestyle is important",
            stress: isKo ? "적절한 휴식을 취하세요" : "Take proper rest"
          };
        };
        const healthStory = getHealthStory(dmName);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-red-900/20 border border-red-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💪</span>
              <h3 className="text-lg font-bold text-red-300">{isKo ? "건강 체크 포인트" : "Health Check Points"}</h3>
            </div>

            <div className="space-y-4">
              {/* 주의해야 할 부위 */}
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-300 font-bold mb-2 text-sm">🎯 {isKo ? "관리가 필요한 부위" : "Areas Needing Care"}</p>
                <p className="text-gray-200 text-sm leading-relaxed">{healthStory.focus}</p>
              </div>

              {/* 건강 경고 */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 font-bold mb-2 text-sm">⚠️ {isKo ? "이럴 때 조심하세요" : "Watch Out For This"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{healthStory.warning}</p>
              </div>

              {/* 오행 기반 건강 분석 (있으면) */}
              {data.healthAnalysis && data.healthAnalysis.length > 0 && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-purple-300 font-bold mb-3 text-sm">🔮 {isKo ? "오행 불균형에 따른 주의점" : "Element Imbalance Effects"}</p>
                  <div className="space-y-2">
                    {data.healthAnalysis.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">{item.emoji}</span>
                        <div>
                          <span className="text-purple-300 text-sm font-medium">{item.organ}:</span>
                          <span className="text-gray-300 text-sm ml-1">{item.advice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 건강한 생활 팁 */}
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-300 font-bold mb-2 text-sm">💚 {isKo ? "건강하게 사는 법" : "Healthy Living Tips"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{healthStory.lifestyle}</p>
              </div>

              {/* 스트레스 관리 */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <p className="text-sm flex items-start gap-3">
                  <span className="text-xl">🧘</span>
                  <span className="text-blue-200 leading-relaxed">{healthStory.stress}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 🔥 NEW: 치유 포인트 (Chiron) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {data.chironInsight && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-indigo-900/30 border border-pink-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{data.chironInsight.emoji}</span>
            <h3 className="text-xl font-bold text-pink-300">{data.chironInsight.title}</h3>
          </div>
          <p className="text-gray-200 leading-relaxed text-base">
            {data.chironInsight.message}
          </p>
          <div className="mt-4 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <p className="text-sm text-pink-200">
              {isKo ? "💝 치유는 약점을 인정하는 것에서 시작됩니다. 당신의 상처는 다른 사람을 도울 수 있는 선물이 될 거예요." : "💝 Healing begins with acknowledging weakness. Your wounds can become gifts to help others."}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 🔥 NEW: 지금 내 흐름 (대운 + 세운) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {data.currentFlow && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/30 via-cyan-900/30 to-teal-900/30 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{data.currentFlow.emoji}</span>
            <h3 className="text-xl font-bold text-blue-300">{data.currentFlow.title}</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <pre className="text-cyan-200 text-sm whitespace-pre-line font-mono">
                {data.currentFlow.flow}
              </pre>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">💡</span>
              <span className="text-cyan-200 leading-relaxed">{data.currentFlow.advice}</span>
            </p>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 12) 나의 에너지 강도 - 신강신약을 쉽게 + 일간별 상세 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {saju?.advancedAnalysis?.extended?.strength && (() => {
        const strength = saju.advancedAnalysis.extended.strength;
        const level = strength.level || strength.type || "";
        const dmName = data.dayMasterName || "";
        const score = strength.total || strength.score || 50;

        // 일간별 신강/신약 상세 해석
        const getStrengthByDm = (dm: string, isStrong: boolean): {
          title: string;
          emoji: string;
          desc: string;
          work: string;
          love: string;
          advice: string;
        } => {
          const strongStories: Record<string, { title: string; emoji: string; desc: string; work: string; love: string; advice: string }> = {
            "갑": {
              title: isKo ? "우뚝 선 큰 나무" : "Towering Great Tree",
              emoji: "🌲",
              desc: isKo ? "당신은 에너지가 넘치는 리더형이에요. 혼자서도 우뚝 설 수 있는 힘이 있고, 주변을 이끄는 카리스마가 있어요. 남에게 의지하기보다 스스로 길을 개척하는 타입이에요." : "You're an energetic leader type. You have the power to stand tall alone and charisma to lead others. You prefer pioneering your own path rather than relying on others.",
              work: isKo ? "창업, 리더 역할, 새로운 분야 개척이 잘 맞아요. 조직에서도 자율권이 있어야 빛나요." : "Startups, leadership roles, pioneering new fields suit you. Even in organizations, you need autonomy to shine.",
              love: isKo ? "주도적인 연애를 해요. 보호하고 이끌고 싶어하지만, 가끔은 상대 의견도 들어주세요." : "You take the lead in relationships. You want to protect and guide, but sometimes listen to your partner too.",
              advice: isKo ? "고집이 지나치면 외로워져요. 가끔은 굽히는 것도 지혜예요." : "Too much stubbornness leads to loneliness. Sometimes bending is wisdom."
            },
            "을": {
              title: isKo ? "끈기 있는 덩굴" : "Persistent Vine",
              emoji: "🌿",
              desc: isKo ? "당신은 부드럽지만 강한 생존력을 가졌어요. 어떤 환경에서도 자신의 자리를 찾아 뿌리내리는 능력이 있어요. 유연하면서도 목표를 향해 꾸준히 나아가요." : "You're soft but have strong survival skills. You can find your place and root down in any environment. Flexible yet steadily moving toward goals.",
              work: isKo ? "네트워킹, 중재, 협상이 잘 맞아요. 사람과 사람을 연결하는 일에서 빛나요." : "Networking, mediation, negotiation suit you. You shine in connecting people.",
              love: isKo ? "배려심이 깊고 헌신적이에요. 하지만 너무 맞추기만 하면 지쳐요. 당신의 의견도 말해요." : "You're considerate and devoted. But don't just accommodate - speak your mind too.",
              advice: isKo ? "유연함은 강점이지만, 중심은 잃지 마세요. 당신도 원하는 게 있어요." : "Flexibility is strength, but don't lose your center. You have wants too."
            },
            "병": {
              title: isKo ? "뜨거운 태양" : "Blazing Sun",
              emoji: "☀️",
              desc: isKo ? "당신은 에너지가 폭발하는 타입이에요. 존재만으로 주변을 밝히고, 사람들이 자연스럽게 끌려와요. 열정이 넘치고 적극적으로 표현해요." : "You're an explosive energy type. You brighten surroundings just by existing, naturally attracting people. Overflowing with passion and active expression.",
              work: isKo ? "무대, 발표, 영업, 마케팅... 사람들 앞에 서는 일이 천직이에요. 숨어있으면 답답해져요." : "Stage, presentations, sales, marketing... standing before people is your calling. Hiding frustrates you.",
              love: isKo ? "열정적이고 표현이 풍부해요. 연애할 때 화끈해요. 하지만 불처럼 빨리 타오르면 빨리 식을 수도 있어요." : "Passionate with rich expression. Hot in romance. But like fire, burning fast may cool fast.",
              advice: isKo ? "에너지 조절이 필요해요. 너무 태우면 번아웃 와요. 쉬는 것도 실력이에요." : "Energy management needed. Burning too much leads to burnout. Resting is also a skill."
            },
            "정": {
              title: isKo ? "따뜻한 촛불" : "Warm Candlelight",
              emoji: "🕯️",
              desc: isKo ? "당신은 섬세하면서도 에너지가 있어요. 큰 불꽃은 아니지만, 가까이 있는 사람들을 따뜻하게 밝혀요. 집중력이 좋고 한 곳에 깊이 파고드는 힘이 있어요." : "You're delicate yet have energy. Not a big flame, but you warmly illuminate those close. Good concentration and power to dig deep in one place.",
              work: isKo ? "전문 분야, 장인 정신이 필요한 일이 잘 맞아요. 대중적인 것보다 깊이 있는 분야가 어울려요." : "Specialized fields and craftsmanship suit you. Depth suits you better than mass appeal.",
              love: isKo ? "로맨틱하고 섬세해요. 상대를 깊이 이해하려 해요. 하지만 혼자 삭히지 말고 표현하세요." : "Romantic and delicate. You try to deeply understand your partner. But express yourself, don't bottle up.",
              advice: isKo ? "작은 것에 집착하지 마세요. 당신의 따뜻함은 충분히 가치 있어요." : "Don't obsess over small things. Your warmth is valuable enough."
            },
            "무": {
              title: isKo ? "우뚝 솟은 산" : "Towering Mountain",
              emoji: "🏔️",
              desc: isKo ? "당신은 산처럼 묵직하고 안정적인 에너지를 가졌어요. 쉽게 흔들리지 않고, 주변 사람들에게 신뢰감을 줘요. 오래 버티는 지구력이 강점이에요." : "You have heavy, stable energy like a mountain. Not easily shaken, you give others trust. Endurance is your strength.",
              work: isKo ? "장기 프로젝트, 부동산, 경영, 관리직이 잘 맞아요. 급변하는 분야보다 안정적인 분야가 어울려요." : "Long-term projects, real estate, management suit you. Stable fields suit you better than rapidly changing ones.",
              love: isKo ? "믿음직스럽고 든든해요. 상대가 기댈 수 있는 존재예요. 하지만 감정 표현도 해주세요." : "Reliable and dependable. Someone your partner can lean on. But express emotions too.",
              advice: isKo ? "변화를 두려워하지 마세요. 산도 계절에 따라 옷을 바꿔요." : "Don't fear change. Even mountains change with seasons."
            },
            "기": {
              title: isKo ? "비옥한 대지" : "Fertile Earth",
              emoji: "🌾",
              desc: isKo ? "당신은 포용력 있고 실용적인 에너지를 가졌어요. 주변 사람들을 품고 키우는 힘이 있어요. 실속 있게 결과를 만들어내는 능력이 뛰어나요." : "You have embracing, practical energy. Power to embrace and grow those around you. Excellent at creating practical results.",
              work: isKo ? "HR, 교육, 농업, 요식업, 실용적인 사업이 잘 맞아요. 사람을 키우는 일에서 보람을 느껴요." : "HR, education, agriculture, food business, practical ventures suit you. You find fulfillment in developing people.",
              love: isKo ? "포용력 있고 희생적이에요. 상대를 편하게 해줘요. 하지만 너무 희생만 하면 지쳐요." : "Embracing and sacrificing. You make your partner comfortable. But too much sacrifice exhausts you.",
              advice: isKo ? "자신을 먼저 챙기세요. 당신이 건강해야 남도 품을 수 있어요." : "Take care of yourself first. You can only embrace others when you're healthy."
            },
            "경": {
              title: isKo ? "날카로운 검" : "Sharp Blade",
              emoji: "⚔️",
              desc: isKo ? "당신은 결단력 있고 추진력이 강한 에너지를 가졌어요. 망설이지 않고 결정하고, 밀어붙이는 힘이 있어요. 정의감이 강하고 불의를 참지 못해요." : "You have decisive, driven energy. Power to decide without hesitation and push through. Strong sense of justice, can't tolerate wrong.",
              work: isKo ? "법조, 군인, 외과의사, 경영자... 결단이 필요한 자리가 잘 맞아요. 우유부단한 환경은 안 맞아요." : "Law, military, surgeon, executive... positions needing decisiveness suit you. Indecisive environments don't.",
              love: isKo ? "직선적이고 솔직해요. 좋으면 좋다, 싫으면 싫다. 하지만 가끔은 부드럽게 말해도 돼요." : "Straightforward and honest. Like means like, dislike means dislike. But sometimes speak gently.",
              advice: isKo ? "칼도 가끔은 집어넣어야 해요. 모든 것을 자르면 상처만 남아요." : "Even swords should sometimes be sheathed. Cutting everything only leaves wounds."
            },
            "신": {
              title: isKo ? "빛나는 보석" : "Sparkling Gem",
              emoji: "💎",
              desc: isKo ? "당신은 세련되고 완벽주의적인 에너지를 가졌어요. 남들이 못 보는 디테일을 알아채고, 빛내는 능력이 있어요. 미적 감각이 뛰어나요." : "You have refined, perfectionist energy. Ability to notice details others miss and make them shine. Excellent aesthetic sense.",
              work: isKo ? "디자인, 패션, 주얼리, 뷰티, 금융... 섬세함이 필요한 분야가 잘 맞아요." : "Design, fashion, jewelry, beauty, finance... fields needing delicacy suit you.",
              love: isKo ? "까다롭지만 깊은 애정을 줘요. 완벽한 상대를 원하지만, 완벽한 사람은 없어요." : "Picky but give deep affection. You want a perfect partner, but no one is perfect.",
              advice: isKo ? "불완전함도 아름다워요. 금이 간 도자기에도 미학이 있어요." : "Imperfection is also beautiful. Even cracked pottery has aesthetics."
            },
            "임": {
              title: isKo ? "깊은 바다" : "Deep Ocean",
              emoji: "🌊",
              desc: isKo ? "당신은 깊이 있고 지혜로운 에너지를 가졌어요. 표면 아래에 거대한 힘을 숨기고 있어요. 직관력이 뛰어나고, 장기적인 안목이 있어요." : "You have deep, wise energy. Hiding tremendous power beneath the surface. Excellent intuition and long-term vision.",
              work: isKo ? "연구, 분석, 투자, 전략 기획... 깊은 사고가 필요한 분야가 잘 맞아요." : "Research, analysis, investment, strategic planning... fields needing deep thinking suit you.",
              love: isKo ? "깊이 있는 사랑을 해요. 겉으로 표현은 안 해도 마음은 깊어요. 가끔은 표현도 해주세요." : "You love deeply. May not express outwardly but heart is deep. Express sometimes too.",
              advice: isKo ? "혼자 생각하지 말고 나누세요. 바다도 강과 만나야 살아있어요." : "Don't think alone, share. Even oceans need to meet rivers to stay alive."
            },
            "계": {
              title: isKo ? "맑은 샘물" : "Clear Spring",
              emoji: "💧",
              desc: isKo ? "당신은 순수하고 영감 넘치는 에너지를 가졌어요. 감성이 풍부하고 직관력이 뛰어나요. 창의적인 아이디어가 샘물처럼 솟아나요." : "You have pure, inspirational energy. Rich in emotion with excellent intuition. Creative ideas spring up like water.",
              work: isKo ? "예술, 음악, 글쓰기, 심리상담... 영혼을 다루는 분야가 잘 맞아요." : "Art, music, writing, counseling... fields handling souls suit you.",
              love: isKo ? "순수하고 감성적인 사랑을 해요. 로맨틱하지만 상처받기 쉬워요. 자신을 보호하세요." : "Pure, emotional love. Romantic but easily hurt. Protect yourself.",
              advice: isKo ? "맑음을 유지하되, 세상 물정도 알아야 해요. 순수함과 지혜는 함께 갈 수 있어요." : "Stay clear, but know the world too. Purity and wisdom can go together."
            }
          };

          const weakStories: Record<string, { title: string; emoji: string; desc: string; work: string; love: string; advice: string }> = {
            "갑": {
              title: isKo ? "자라나는 새싹" : "Growing Sprout",
              emoji: "🌱",
              desc: isKo ? "당신은 성장하는 중인 나무예요. 아직 우뚝 서진 않았지만, 성장 잠재력이 커요. 주변의 도움을 받으면서 뿌리를 내리는 시기예요." : "You're a tree still growing. Not standing tall yet, but great growth potential. Time to root down while receiving help.",
              work: isKo ? "멘토나 조직의 도움을 받으세요. 혼자보다 함께 성장하는 게 지금은 더 나아요." : "Get help from mentors or organizations. Growing together is better than alone now.",
              love: isKo ? "받는 것도 괜찮아요. 항상 주려고만 하지 말고, 상대의 도움도 받아보세요." : "Receiving is okay. Don't just give, accept your partner's help too.",
              advice: isKo ? "지금은 준비 시간이에요. 조급해하지 말고 실력을 쌓으세요. 때가 오면 우뚝 서게 될 거예요." : "This is preparation time. Don't rush, build skills. When the time comes, you'll stand tall."
            },
            "을": {
              title: isKo ? "바람에 흔들리는 풀" : "Grass Swaying in Wind",
              emoji: "🌿",
              desc: isKo ? "당신은 유연하지만 중심을 잡아야 하는 시기예요. 환경에 따라 흔들릴 수 있지만, 그게 오히려 강점이 될 수 있어요." : "You're flexible but need to find your center. May sway with environment, but that can be a strength.",
              work: isKo ? "큰 결정은 혼자 하지 마세요. 신뢰할 수 있는 파트너나 조직과 함께하면 안정돼요." : "Don't make big decisions alone. Partnering with trustworthy people or organizations brings stability.",
              love: isKo ? "너무 맞추기만 하면 지쳐요. 당신의 의견도 중요해요. 함께 결정하세요." : "Just accommodating exhausts you. Your opinion matters too. Decide together.",
              advice: isKo ? "유연함을 유지하되, 핵심 가치관은 지키세요. 그게 당신의 줄기가 돼요." : "Stay flexible, but keep core values. That becomes your stem."
            },
            "병": {
              title: isKo ? "구름 뒤의 태양" : "Sun Behind Clouds",
              emoji: "🌤️",
              desc: isKo ? "당신의 빛이 아직 완전히 드러나지 않았어요. 에너지는 있는데 표현이 막혀있을 수 있어요. 자신감을 키우면 빛이 터져 나와요." : "Your light isn't fully revealed yet. Energy exists but expression may be blocked. Building confidence will unleash your light.",
              work: isKo ? "작은 무대부터 시작하세요. SNS, 소모임, 발표... 조금씩 드러내면 자신감이 커져요." : "Start with small stages. SNS, small gatherings, presentations... revealing bit by bit builds confidence.",
              love: isKo ? "표현하고 싶은데 못하고 있을 수 있어요. 조금씩 마음을 열어보세요." : "You may want to express but can't. Open your heart little by little.",
              advice: isKo ? "당신은 빛날 수 있어요. 구름은 지나가요. 기다리지만 말고 구름을 밀어내세요." : "You can shine. Clouds pass. Don't just wait - push the clouds away."
            },
            "정": {
              title: isKo ? "꺼질 듯한 촛불" : "Flickering Candle",
              emoji: "🕯️",
              desc: isKo ? "당신의 불꽃이 약해져 있을 수 있어요. 에너지가 고갈되었거나, 환경이 안 맞을 수 있어요. 재충전이 필요한 시기예요." : "Your flame may be weakened. Energy depleted or environment may not fit. Time for recharging.",
              work: isKo ? "무리하지 마세요. 할 수 있는 것부터 하나씩. 완벽하려고 하면 더 지쳐요." : "Don't overdo it. One thing at a time. Trying to be perfect exhausts you more.",
              love: isKo ? "혼자 삭히지 마세요. 힘들면 힘들다고 말해도 돼요. 상대도 도와주고 싶어해요." : "Don't bottle up alone. It's okay to say you're struggling. Your partner wants to help too.",
              advice: isKo ? "쉬는 것도 일이에요. 촛불도 심지를 다듬어야 오래 타요." : "Resting is also work. Candles need trimmed wicks to burn long."
            },
            "무": {
              title: isKo ? "흔들리는 바위" : "Shaking Rock",
              emoji: "🪨",
              desc: isKo ? "당신의 기반이 흔들리고 있을 수 있어요. 안정감을 찾아야 하는 시기예요. 급하게 움직이기보다 중심을 잡으세요." : "Your foundation may be shaking. Time to find stability. Find your center rather than moving hastily.",
              work: isKo ? "큰 변화는 피하세요. 지금은 있는 것을 지키고 다지는 게 중요해요." : "Avoid big changes. Now it's important to protect and strengthen what you have.",
              love: isKo ? "불안하면 솔직히 말하세요. 혼자 버티려고 하면 더 힘들어져요." : "If anxious, speak honestly. Trying to endure alone makes it harder.",
              advice: isKo ? "흔들려도 괜찮아요. 산도 지진을 겪어요. 중요한 건 다시 자리잡는 거예요." : "It's okay to shake. Even mountains experience earthquakes. What matters is settling again."
            },
            "기": {
              title: isKo ? "마른 땅" : "Dry Land",
              emoji: "🏜️",
              desc: isKo ? "당신이 남에게 주기만 하고 받지 못해서 고갈되었을 수 있어요. 자신을 먼저 채워야 남도 채울 수 있어요." : "You may be depleted from only giving without receiving. Fill yourself first to fill others.",
              work: isKo ? "너무 많이 짊어지지 마세요. 도움을 요청해도 돼요. 혼자 다 할 필요 없어요." : "Don't carry too much. It's okay to ask for help. You don't need to do everything alone.",
              love: isKo ? "받는 것도 사랑이에요. 항상 챙겨주기만 하지 말고, 챙김도 받으세요." : "Receiving is also love. Don't just care for others - be cared for too.",
              advice: isKo ? "비가 내리면 다시 비옥해져요. 지금은 충전의 시간이에요." : "Rain will make it fertile again. Now is recharging time."
            },
            "경": {
              title: isKo ? "녹슨 검" : "Rusted Sword",
              emoji: "🗡️",
              desc: isKo ? "당신의 날카로움이 무뎌졌을 수 있어요. 결단력이 떨어지거나, 환경이 결정을 막고 있을 수 있어요." : "Your sharpness may have dulled. Decisiveness decreased, or environment may be blocking decisions.",
              work: isKo ? "작은 결정부터 연습하세요. 점심 뭐 먹을지, 뭘 먼저 할지... 결단 근육을 키우세요." : "Practice with small decisions. What to eat for lunch, what to do first... build decision muscles.",
              love: isKo ? "명확하게 말하세요. 애매하면 오해가 생겨요. 싫으면 싫다고 해도 돼요." : "Speak clearly. Ambiguity causes misunderstanding. It's okay to say no when you mean no.",
              advice: isKo ? "검도 갈면 다시 빛나요. 자신감을 회복하면 결단력도 돌아와요." : "Swords shine again when sharpened. Recovering confidence brings back decisiveness."
            },
            "신": {
              title: isKo ? "원석" : "Raw Gemstone",
              emoji: "💠",
              desc: isKo ? "당신의 가치가 아직 드러나지 않았어요. 세공되지 않은 보석처럼, 다듬으면 빛날 준비가 되어 있어요." : "Your value isn't revealed yet. Like an uncut gem, ready to shine once polished.",
              work: isKo ? "기술을 갈고닦으세요. 배움에 투자하면 나중에 빛이 나요." : "Hone your skills. Investing in learning will shine later.",
              love: isKo ? "있는 그대로도 괜찮아요. 완벽해지려고 너무 애쓰지 마세요." : "You're fine as you are. Don't try too hard to be perfect.",
              advice: isKo ? "원석도 보석이에요. 세공 과정을 즐기세요. 그게 성장이에요." : "Raw gems are still gems. Enjoy the polishing process. That's growth."
            },
            "임": {
              title: isKo ? "고인 물" : "Stagnant Water",
              emoji: "🌫️",
              desc: isKo ? "당신의 에너지가 흐르지 못하고 고여있을 수 있어요. 생각이 많아 멈춰있거나, 방향을 잃었을 수 있어요." : "Your energy may be stagnant. Stuck with too many thoughts, or lost direction.",
              work: isKo ? "일단 움직이세요. 완벽한 계획보다 작은 행동이 물꼬를 터요." : "Just move. Small action opens the flow better than perfect planning.",
              love: isKo ? "혼자 고민하지 말고 대화하세요. 말하면 풀리는 것들이 있어요." : "Don't worry alone - talk. Some things untangle when spoken.",
              advice: isKo ? "물은 흘러야 맑아요. 작은 것이라도 흘려보내세요." : "Water clears by flowing. Let even small things flow."
            },
            "계": {
              title: isKo ? "마른 샘" : "Dried Spring",
              emoji: "🏔️",
              desc: isKo ? "당신의 영감이 마른 상태일 수 있어요. 감성이 메말랐거나, 에너지가 고갈되었을 수 있어요." : "Your inspiration may be dried up. Emotions parched or energy depleted.",
              work: isKo ? "억지로 짜내지 마세요. 충전이 먼저예요. 쉬면서 영감을 채우세요." : "Don't force it out. Recharge first. Rest and fill up on inspiration.",
              love: isKo ? "감정적으로 지쳤을 수 있어요. 상대에게 솔직히 말하고 쉬는 시간을 가지세요." : "You may be emotionally exhausted. Tell your partner honestly and take rest time.",
              advice: isKo ? "비가 오면 다시 차요. 마음을 열고 세상의 자극을 받아들이세요." : "Springs refill when it rains. Open your heart and accept world's stimulation."
            }
          };

          const stories = isStrong ? strongStories : weakStories;
          return stories[dm] || stories["갑"];
        };

        const isStrong = level.toLowerCase().includes("강") || level.toLowerCase().includes("strong");
        const isWeak = level.toLowerCase().includes("약") || level.toLowerCase().includes("weak");
        const meaning = isStrong || isWeak
          ? getStrengthByDm(dmName, isStrong)
          : {
              title: isKo ? "균형 잡힌 에너지" : "Balanced Energy",
              emoji: "⚖️",
              desc: isKo ? "당신은 강함과 부드러움이 적절히 섞여 있어요. 상황에 따라 리더가 되기도 하고, 서포터가 되기도 해요. 이 균형이 당신의 강점이에요." : "You have a good mix of strength and gentleness. Leader or supporter depending on situation. This balance is your strength.",
              work: isKo ? "다양한 역할을 소화할 수 있어요. 상황에 맞게 조절하세요." : "You can handle various roles. Adjust to situations.",
              love: isKo ? "주기도 하고 받기도 해요. 균형 잡힌 관계가 가능해요." : "You give and receive. Balanced relationships are possible.",
              advice: isKo ? "이 균형을 유지하세요. 어느 한쪽으로 치우치지 마세요." : "Maintain this balance. Don't lean too much to one side."
            };

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-sky-900/20 border border-sky-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{meaning.emoji}</span>
              <h3 className="text-lg font-bold text-sky-300">{isKo ? "나의 에너지 강도" : "My Energy Strength"}</h3>
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-300">
                {score}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <p className="text-sky-300 font-bold text-base mb-2">{meaning.title}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{meaning.desc}</p>
              </div>

              {/* 분야별 상세 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-blue-400 font-bold text-xs mb-1">💼 {isKo ? "일/커리어" : "Work"}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{meaning.work}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-pink-400 font-bold text-xs mb-1">💕 {isKo ? "연애/관계" : "Love"}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{meaning.love}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs flex items-start gap-2">
                  <span>💡</span>
                  <span className="text-gray-300">{meaning.advice}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 13) 나의 뿌리 에너지 - 통근을 쉽게 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {saju?.advancedAnalysis?.tonggeun && (() => {
        const tg = saju.advancedAnalysis.tonggeun;
        const rawScore = tg.score || tg.totalScore || 0;
        // 점수 정규화: 0-200 범위를 30-95로 변환
        // rawScore가 0이면 30, 200이면 95
        const score = Math.round(30 + (rawScore / 200) * 65);
        const hasRoot = score > 60;

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-lime-900/20 border border-lime-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🌱</span>
              <h3 className="text-lg font-bold text-lime-300">{isKo ? "나의 뿌리 에너지" : "My Root Energy"}</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-lime-500/10 border border-lime-500/20">
                <p className="text-lime-300 font-bold text-base mb-2">
                  {hasRoot
                    ? (isKo ? "뿌리가 튼튼해요 🌳" : "Strong roots 🌳")
                    : (isKo ? "뿌리를 더 키워보세요 🌱" : "Grow your roots 🌱")}
                </p>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {hasRoot
                    ? (isKo
                        ? "당신은 기반이 탄탄해요. 어려운 상황에서도 쉽게 흔들리지 않고, 자기 자리를 지킬 수 있는 힘이 있어요. 이 안정감이 다른 사람들에게도 신뢰를 줘요."
                        : "You have a solid foundation. Even in tough situations, you don't easily waver and have the strength to hold your ground. This stability gives others confidence in you too.")
                    : (isKo
                        ? `지금은 기반을 다지는 시기예요 (통근도 ${score}%). 뿌리가 약하면 환경에 쉽게 흔들리고, 자신감이 부족할 수 있어요. 한 가지에 집중해서 전문성을 쌓고, 안정적인 환경(직장, 관계, 공간)을 만들어보세요. 조급해하지 말고 천천히 뿌리를 내리면 운이 따라와요.`
                        : `Now is the time to build your foundation (root strength ${score}%). Weak roots mean you're easily swayed by circumstances and may lack confidence. Focus on one thing to build expertise, and create a stable environment (job, relationships, space). Don't rush—slowly put down roots and luck will follow.`)}
                </p>
                {!hasRoot && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-lime-500/20">
                    <p className="text-lime-400 font-bold text-xs mb-2">{isKo ? "🌱 뿌리를 키우는 방법" : "🌱 How to Grow Roots"}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">• {isKo ? "한 분야에 최소 3년 이상 집중하기 (이직/전공 바꾸기 자제)" : "Focus on one field for at least 3 years (avoid job/major changes)"}</p>
                      <p className="text-xs text-gray-400">• {isKo ? "안정적인 거주지 마련하기 (자주 이사 피하기)" : "Secure stable housing (avoid frequent moves)"}</p>
                      <p className="text-xs text-gray-400">• {isKo ? "장기적 관계 유지하기 (친구, 멘토, 커뮤니티)" : "Maintain long-term relationships (friends, mentors, community)"}</p>
                      <p className="text-xs text-gray-400">• {isKo ? "저축/재테크로 경제적 안정성 확보하기" : "Build financial stability through saving/investing"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 뿌리 강도 바 */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{isKo ? "뿌리 강도" : "Root Strength"}</span>
                  <span className="text-xs font-bold text-lime-400">{score}%</span>
                </div>
                <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-600 to-lime-400 transition-all duration-700"
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 14) 올해 운세 - 세운을 쉽게 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {saju?.unse?.annual && Array.isArray(saju.unse.annual) && saju.unse.annual.length > 0 && (() => {
        const currentYear = new Date().getFullYear();
        const thisYearUnse = saju.unse.annual.find((a: any) => a.year === currentYear) || saju.unse.annual[0];

        if (!thisYearUnse) return null;

        const ganji = thisYearUnse.ganji || `${thisYearUnse.stem?.name || ""}${thisYearUnse.branch?.name || ""}`;

        // 천간에서 오행 추출하는 함수
        const getStemElement = (gj: string): string => {
          if (!gj) return "";
          const firstChar = gj.charAt(0);
          // 천간 → 오행 매핑
          const stemToElement: Record<string, string> = {
            "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
            "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
            "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
            "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
            "壬": "water", "癸": "water", "임": "water", "계": "water",
          };
          return stemToElement[firstChar] || "";
        };

        const element = thisYearUnse.stem?.element || thisYearUnse.element || getStemElement(ganji);

        // 오행별 연운 상세 해석
        const getYearFortune = (el: string): { theme: string; desc: string; advice: string; emoji: string } => {
          const e = el.toLowerCase();
          if (e.includes("목") || e === "wood") return {
            theme: isKo ? "성장과 시작의 해 🌱" : "Year of Growth & Beginnings 🌱",
            desc: isKo
              ? "올해는 새싹이 땅을 뚫고 올라오는 해예요. 무언가를 시작하기에 최적의 타이밍이에요."
              : "This year is like a sprout breaking through soil. Perfect timing to start something.",
            advice: isKo
              ? "새로운 것을 시작하세요. 배움, 프로젝트, 관계... 뭐든 좋아요! 멈춰있으면 오히려 답답해지는 해예요. 도전하세요!"
              : "Start something new. Learning, projects, relationships... anything! Staying still will frustrate you this year. Take on challenges!",
            emoji: "🌱"
          };
          if (e.includes("화") || e === "fire") return {
            theme: isKo ? "열정과 표현의 해 🔥" : "Year of Passion & Expression 🔥",
            desc: isKo
              ? "올해는 당신이 빛나는 해예요. 존재감을 드러내고 적극적으로 움직일 때 기회가 와요."
              : "This year is when you shine. Opportunities come when you show presence and move actively.",
            advice: isKo
              ? "숨지 말고 드러내세요! 자기 PR, 네트워킹, 발표... 밖으로 나갈수록 기회가 와요. 열정이 운을 끌어당기는 해예요."
              : "Don't hide—show yourself! Self-PR, networking, presentations... more outside = more opportunities. Passion attracts luck this year.",
            emoji: "🔥"
          };
          if (e.includes("토") || e === "earth") return {
            theme: isKo ? "안정과 기반의 해 🏔️" : "Year of Stability & Foundation 🏔️",
            desc: isKo
              ? "올해는 기반을 다지는 해예요. 화려하진 않지만 단단해지는 시간이에요."
              : "This year is for building foundation. Not flashy, but you become solid.",
            advice: isKo
              ? "급하게 가지 마세요. 기반을 다지고, 관계를 정리하고, 내실을 채우세요. 조용하지만 나중에 큰 힘이 되는 해예요."
              : "Don't rush. Build foundation, organize relationships, strengthen your core. Quiet now, but powerful later.",
            emoji: "🏔️"
          };
          if (e.includes("금") || e === "metal") return {
            theme: isKo ? "결실과 정리의 해 ⚔️" : "Year of Harvest & Organization ⚔️",
            desc: isKo
              ? "올해는 수확의 해예요. 지금까지 쌓아온 것들이 결과로 나타나요."
              : "This year is harvest time. What you've built shows results.",
            advice: isKo
              ? "지금까지 한 것들이 결실을 맺어요. 마무리, 수확, 정산의 시기예요. 불필요한 것은 과감히 버리고 본질에 집중하세요."
              : "Your past efforts bear fruit. Time for finishing, harvesting, settling. Boldly let go of unnecessary things and focus on essence.",
            emoji: "⚔️"
          };
          if (e.includes("수") || e === "water") return {
            theme: isKo ? "준비와 지혜의 해 💧" : "Year of Preparation & Wisdom 💧",
            desc: isKo
              ? "올해는 물처럼 깊어지는 해예요. 겉으로 드러나진 않지만 내면이 성장해요."
              : "This year you deepen like water. Not visible outside, but inner growth happens.",
            advice: isKo
              ? "겉으로 드러나진 않지만 내면이 깊어지는 해예요. 공부, 계획, 성찰... 다음 도약을 위한 준비 시기예요. 조급해하지 마세요."
              : "Inner depth grows though not visible. Study, plan, reflect... preparation time for next leap. Don't be impatient.",
            emoji: "💧"
          };
          // 일간 오행 기반 폴백
          const dayEl = data.dayElement;
          return {
            theme: isKo ? "변화와 적응의 해 🔄" : "Year of Change & Adaptation 🔄",
            desc: isKo
              ? `당신의 ${elementTraits[dayEl]?.ko || ""} 에너지와 올해의 기운이 만나 새로운 변화가 시작되는 해입니다. 과거의 방식을 고집하기보다, 새로운 환경과 상황에 맞춰 유연하게 대응하는 것이 중요합니다.`
              : `Your ${elementTraits[dayEl]?.en || ""} energy meets this year's energy, starting new changes. Instead of sticking to old ways, it's important to flexibly respond to new environments and situations.`,
            advice: isKo
              ? "올해는 변화의 흐름을 받아들이는 것이 핵심입니다. 완벽한 계획을 세우기보다 상황에 맞춰 유연하게 대응하세요. 새로운 사람, 새로운 환경, 새로운 방식을 두려워하지 마세요. 적응력이 당신의 가장 큰 무기가 되는 해입니다. 실패를 두려워하지 말고 시도하세요!"
              : "The key this year is accepting the flow of change. Rather than making perfect plans, respond flexibly to situations. Don't fear new people, new environments, new methods. Adaptability becomes your greatest weapon this year. Don't fear failure—just try!",
            emoji: "🔄"
          };
        };

        const fortune = getYearFortune(element);

        // 일간과 세운의 관계 분석
        const dmName = data.dayMasterName || "";
        const getYearRelation = (dm: string, yearEl: string): { relation: string; impact: string; focus: string; caution: string } => {
          const el = yearEl.toLowerCase();
          const dmElements: Record<string, string> = {
            "갑": "wood", "을": "wood", "병": "fire", "정": "fire",
            "무": "earth", "기": "earth", "경": "metal", "신": "metal",
            "임": "water", "계": "water"
          };
          const myEl = dmElements[dm] || "";

          // 오행 관계 분석
          if (myEl === el || (myEl === "wood" && el.includes("wood")) || (myEl === "fire" && el.includes("fire")) ||
              (myEl === "earth" && el.includes("earth")) || (myEl === "metal" && el.includes("metal")) ||
              (myEl === "water" && el.includes("water"))) {
            return {
              relation: isKo ? "비겁(동료)의 해" : "Year of Peers",
              impact: isKo ? "같은 에너지가 만나는 해예요. 경쟁도 있지만 동료와 함께 성장할 수 있어요." : "Same energy meets. Competition exists, but you can grow with peers.",
              focus: isKo ? "협력과 경쟁의 균형, 자기 영역 지키기" : "Balance cooperation and competition, protect your territory",
              caution: isKo ? "과도한 경쟁심, 지나친 고집" : "Excessive competitiveness, too much stubbornness"
            };
          }

          // 생조/설기/극 관계
          const relations: Record<string, { relation: string; impact: string; focus: string; caution: string }> = {
            "wood-fire": {
              relation: isKo ? "식상(표현)의 해" : "Year of Expression",
              impact: isKo ? "당신의 아이디어가 꽃피는 해예요. 창작, 표현, 자녀운이 좋아요." : "Your ideas bloom this year. Creativity, expression, and children luck improve.",
              focus: isKo ? "새로운 시도, 창의적 표현, 재능 발휘" : "New attempts, creative expression, talent display",
              caution: isKo ? "에너지 과소비, 말실수" : "Energy overuse, verbal mistakes"
            },
            "fire-earth": {
              relation: isKo ? "식상(표현)의 해" : "Year of Expression",
              impact: isKo ? "열정이 결과물로 이어지는 해예요. 무언가를 만들어내기 좋아요." : "Passion leads to results. Good year to create something.",
              focus: isKo ? "프로젝트 완성, 작품 활동" : "Complete projects, creative work",
              caution: isKo ? "과욕, 무리한 확장" : "Greed, overexpansion"
            },
            "earth-metal": {
              relation: isKo ? "식상(표현)의 해" : "Year of Expression",
              impact: isKo ? "노력이 빛을 발하는 해예요. 준비한 것들이 결실을 맺어요." : "Your efforts shine. Preparations bear fruit.",
              focus: isKo ? "완성도 높이기, 마무리" : "Improve quality, finish well",
              caution: isKo ? "완벽주의에 매몰" : "Getting stuck in perfectionism"
            },
            "metal-water": {
              relation: isKo ? "식상(표현)의 해" : "Year of Expression",
              impact: isKo ? "지혜가 깊어지고 통찰력이 생기는 해예요." : "Wisdom deepens and insights emerge.",
              focus: isKo ? "공부, 연구, 내면 탐구" : "Study, research, inner exploration",
              caution: isKo ? "생각만 많고 행동이 없는 것" : "Too much thinking, no action"
            },
            "water-wood": {
              relation: isKo ? "식상(표현)의 해" : "Year of Expression",
              impact: isKo ? "숨겨진 아이디어가 싹트는 해예요. 새로운 시작의 기운이 넘쳐요." : "Hidden ideas sprout. Energy for new beginnings overflows.",
              focus: isKo ? "계획 실행, 도전" : "Execute plans, take challenges",
              caution: isKo ? "산만함, 집중력 분산" : "Scattered focus, distraction"
            },
            "wood-earth": {
              relation: isKo ? "재성(재물)의 해" : "Year of Wealth",
              impact: isKo ? "돈과 관련된 움직임이 많은 해예요. 투자, 사업 기회가 와요." : "Many money-related movements. Investment and business opportunities come.",
              focus: isKo ? "재테크, 사업 확장, 실질적 이익" : "Finance, business expansion, real profits",
              caution: isKo ? "무리한 투자, 과소비" : "Reckless investment, overspending"
            },
            "fire-metal": {
              relation: isKo ? "재성(재물)의 해" : "Year of Wealth",
              impact: isKo ? "열정이 돈으로 이어질 수 있는 해예요. 적극적 재테크가 좋아요." : "Passion can lead to money. Active financial management is good.",
              focus: isKo ? "수익 창출, 부업" : "Generate income, side business",
              caution: isKo ? "급한 투자, 불확실한 기회" : "Hasty investment, uncertain opportunities"
            },
            "earth-water": {
              relation: isKo ? "재성(재물)의 해" : "Year of Wealth",
              impact: isKo ? "안정적인 수입 기반을 만들 수 있는 해예요." : "A year to build stable income base.",
              focus: isKo ? "저축, 부동산, 장기 투자" : "Savings, real estate, long-term investment",
              caution: isKo ? "보수적 과잉, 기회 놓침" : "Being too conservative, missing chances"
            },
            "metal-wood": {
              relation: isKo ? "재성(재물)의 해" : "Year of Wealth",
              impact: isKo ? "새로운 수입원이 생기는 해예요. 적극적으로 움직이면 돈이 따라와요." : "New income sources emerge. Money follows active movement.",
              focus: isKo ? "새 사업, 이직" : "New business, job change",
              caution: isKo ? "과도한 욕심, 무모한 확장" : "Excessive greed, reckless expansion"
            },
            "water-fire": {
              relation: isKo ? "재성(재물)의 해" : "Year of Wealth",
              impact: isKo ? "직관적 투자가 빛을 발하는 해예요. 감각을 믿으세요." : "Intuitive investment shines. Trust your senses.",
              focus: isKo ? "창의적 수익, 예술/콘텐츠" : "Creative income, art/content",
              caution: isKo ? "감정적 소비, 충동 투자" : "Emotional spending, impulsive investment"
            },
            "wood-metal": {
              relation: isKo ? "관성(시험)의 해" : "Year of Tests",
              impact: isKo ? "시험대에 오르는 해예요. 직장, 사회적 위치와 관련된 변화가 와요." : "A year of tests. Changes related to work and social position come.",
              focus: isKo ? "실력 증명, 승진, 이직 준비" : "Prove skills, promotion, job change prep",
              caution: isKo ? "과도한 스트레스, 건강 관리" : "Excessive stress, health care"
            },
            "fire-water": {
              relation: isKo ? "관성(시험)의 해" : "Year of Tests",
              impact: isKo ? "열정이 시험받는 해예요. 감정 조절이 중요해요." : "Passion is tested. Emotional control is important.",
              focus: isKo ? "인내, 실력 향상" : "Patience, skill improvement",
              caution: isKo ? "급한 결정, 감정적 대응" : "Hasty decisions, emotional reactions"
            },
            "earth-wood": {
              relation: isKo ? "관성(시험)의 해" : "Year of Tests",
              impact: isKo ? "변화의 바람이 부는 해예요. 익숙한 것들이 흔들릴 수 있어요." : "Winds of change blow. Familiar things may shake.",
              focus: isKo ? "유연한 대응, 변화 수용" : "Flexible response, accept change",
              caution: isKo ? "고집, 변화 거부" : "Stubbornness, rejecting change"
            },
            "metal-fire": {
              relation: isKo ? "관성(시험)의 해" : "Year of Tests",
              impact: isKo ? "자존심이 시험받는 해예요. 겸손이 무기가 돼요." : "Pride is tested. Humility becomes a weapon.",
              focus: isKo ? "협력, 타협" : "Cooperation, compromise",
              caution: isKo ? "충돌, 갈등" : "Conflicts, disputes"
            },
            "water-earth": {
              relation: isKo ? "관성(시험)의 해" : "Year of Tests",
              impact: isKo ? "막히는 느낌이 있을 수 있어요. 인내가 필요한 시기예요." : "May feel blocked. A time requiring patience.",
              focus: isKo ? "내실 다지기, 준비" : "Strengthen foundation, prepare",
              caution: isKo ? "우울함, 자기 의심" : "Depression, self-doubt"
            },
            "fire-wood": {
              relation: isKo ? "인성(도움)의 해" : "Year of Support",
              impact: isKo ? "귀인이 나타나는 해예요. 도움을 받기 좋고 배움이 깊어져요." : "Helpful people appear. Good to receive help, learning deepens.",
              focus: isKo ? "공부, 자격증, 멘토 찾기" : "Study, certifications, find mentors",
              caution: isKo ? "의존, 게으름" : "Dependence, laziness"
            },
            "earth-fire": {
              relation: isKo ? "인성(도움)의 해" : "Year of Support",
              impact: isKo ? "따뜻한 지원을 받는 해예요. 부모님이나 윗사람의 도움이 와요." : "Receive warm support. Help from parents or seniors comes.",
              focus: isKo ? "관계 강화, 조언 구하기" : "Strengthen relationships, seek advice",
              caution: isKo ? "수동적 태도" : "Passive attitude"
            },
            "metal-earth": {
              relation: isKo ? "인성(도움)의 해" : "Year of Support",
              impact: isKo ? "안정적인 후원이 있는 해예요. 조직의 지원을 받아요." : "Stable sponsorship year. Receive organizational support.",
              focus: isKo ? "조직 내 성장, 신뢰 쌓기" : "Growth within organization, build trust",
              caution: isKo ? "창의성 부족, 틀에 갇힘" : "Lack of creativity, boxed in"
            },
            "water-metal": {
              relation: isKo ? "인성(도움)의 해" : "Year of Support",
              impact: isKo ? "지혜로운 조언을 얻는 해예요. 배움이 깊어지고 통찰이 생겨요." : "Gain wise advice. Learning deepens, insights emerge.",
              focus: isKo ? "독서, 연구, 상담" : "Reading, research, counseling",
              caution: isKo ? "실천 부족" : "Lack of action"
            },
            "wood-water": {
              relation: isKo ? "인성(도움)의 해" : "Year of Support",
              impact: isKo ? "영감과 아이디어가 넘치는 해예요. 창의적 도움을 받아요." : "Overflowing inspiration and ideas. Receive creative help.",
              focus: isKo ? "창작, 기획, 브레인스토밍" : "Creation, planning, brainstorming",
              caution: isKo ? "실행력 부족, 몽상" : "Lack of execution, daydreaming"
            }
          };

          const key = `${myEl}-${el.includes("wood") ? "wood" : el.includes("fire") ? "fire" : el.includes("earth") ? "earth" : el.includes("metal") ? "metal" : "water"}`;
          return relations[key] || {
            relation: isKo ? "변화의 해" : "Year of Change",
            impact: isKo ? "새로운 에너지가 들어오는 해예요." : "New energy enters this year.",
            focus: isKo ? "유연하게 대응하기" : "Respond flexibly",
            caution: isKo ? "과도한 변화" : "Excessive change"
          };
        };

        const yearRelation = getYearRelation(dmName, element);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{fortune.emoji}</span>
              <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? `${currentYear}년 운세` : `${currentYear} Fortune`}</h3>
              {ganji && <span className="text-sm text-gray-400">({ganji})</span>}
            </div>

            <div className="space-y-3">
              {/* 올해 테마 */}
              <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                <p className="text-fuchsia-300 font-bold text-base mb-2">{fortune.theme}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">{fortune.desc}</p>
                <p className="text-fuchsia-200 text-sm">{fortune.advice}</p>
              </div>

              {/* 나와의 관계 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-fuchsia-400 font-bold text-sm mb-2">📌 {yearRelation.relation}</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">{yearRelation.impact}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-fuchsia-500/10">
                    <span className="text-fuchsia-300 font-medium">{isKo ? "집중할 것" : "Focus"}</span>
                    <p className="text-gray-400 mt-1">{yearRelation.focus}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <span className="text-red-300 font-medium">{isKo ? "주의할 것" : "Caution"}</span>
                    <p className="text-gray-400 mt-1">{yearRelation.caution}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 15) 이번 달 운세 - 월운을 쉽게 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {saju?.unse?.monthly && Array.isArray(saju.unse.monthly) && saju.unse.monthly.length > 0 && (() => {
        const currentMonth = new Date().getMonth() + 1;
        const thisMonthUnse = saju.unse.monthly.find((m: any) => m.month === currentMonth) || saju.unse.monthly[0];

        if (!thisMonthUnse) return null;

        const ganji = thisMonthUnse.ganji || `${thisMonthUnse.stem?.name || ""}${thisMonthUnse.branch?.name || ""}`;

        // 천간에서 오행 추출하는 함수
        const getStemElement = (gj: string): string => {
          if (!gj) return "";
          const firstChar = gj.charAt(0);
          const stemToElement: Record<string, string> = {
            "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
            "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
            "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
            "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
            "壬": "water", "癸": "water", "임": "water", "계": "water",
          };
          return stemToElement[firstChar] || "";
        };

        const element = thisMonthUnse.stem?.element || thisMonthUnse.element || getStemElement(ganji);

        // 오행별 월운 해석
        const getMonthFortune = (el: string): { theme: string; advice: string; emoji: string } => {
          const e = el.toLowerCase();
          if (e.includes("목") || e.includes("wood")) return {
            theme: isKo ? "활동적인 달" : "Active Month",
            advice: isKo
              ? "움직이세요! 새로운 만남, 시작, 도전이 좋아요. 집에만 있으면 아까운 달이에요."
              : "Get moving! New meetings, beginnings, challenges are good. Staying home would be a waste this month.",
            emoji: "🌿"
          };
          if (e.includes("화") || e.includes("fire")) return {
            theme: isKo ? "주목받는 달" : "Spotlight Month",
            advice: isKo
              ? "사람들 앞에 서세요. 발표, 미팅, 데이트... 당신의 매력이 빛나는 달이에요."
              : "Step in front of people. Presentations, meetings, dates... your charm shines this month.",
            emoji: "✨"
          };
          if (e.includes("토") || e.includes("earth")) return {
            theme: isKo ? "안정의 달" : "Stable Month",
            advice: isKo
              ? "무리하지 마세요. 기존 것을 유지하고 다지는 게 좋아요. 급한 결정은 피하세요."
              : "Don't overdo it. Maintain and strengthen what you have. Avoid hasty decisions.",
            emoji: "🏠"
          };
          if (e.includes("금") || e.includes("metal")) return {
            theme: isKo ? "정리의 달" : "Organizing Month",
            advice: isKo
              ? "결단이 필요해요. 미루던 일을 끝내고, 안 맞는 관계는 정리하세요. 깔끔해지면 새 에너지가 와요."
              : "Decisions are needed. Finish delayed tasks, organize incompatible relationships. Clarity brings new energy.",
            emoji: "✂️"
          };
          if (e.includes("수") || e.includes("water")) return {
            theme: isKo ? "충전의 달" : "Recharging Month",
            advice: isKo
              ? "쉬어가세요. 무리하게 밀어붙이기보다 재충전하는 게 나아요. 생각을 정리하기 좋은 때예요."
              : "Take a break. Recharging is better than pushing hard. Good time to organize your thoughts.",
            emoji: "🌙"
          };
          return {
            theme: isKo ? "흐름을 타는 달" : "Flow Month",
            advice: isKo ? "자연스럽게 흘러가세요." : "Go with the natural flow.",
            emoji: "🌊"
          };
        };

        const fortune = getMonthFortune(element);
        const monthNames = isKo
          ? ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
          : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // 월운 상세 해석 (일간별)
        const dmName = data.dayMasterName || "";
        const getMonthDetail = (_dm: string, el: string): { work: string; love: string; money: string; health: string } => {
          const e = el.toLowerCase();

          // 기본 월운 해석 (오행별)
          const monthDetails: Record<string, { work: string; love: string; money: string; health: string }> = {
            "wood": {
              work: isKo ? "새 프로젝트나 도전이 잘 풀려요. 적극적으로 제안하세요." : "New projects and challenges go well. Propose actively.",
              love: isKo ? "새로운 만남이 기대돼요. 먼저 다가가보세요." : "New encounters await. Approach first.",
              money: isKo ? "투자보다는 활동에 집중하세요. 돈은 따라와요." : "Focus on activity over investment. Money follows.",
              health: isKo ? "운동하기 좋은 달이에요. 밖으로 나가세요." : "Great month for exercise. Go outside."
            },
            "fire": {
              work: isKo ? "발표나 미팅이 잘 돼요. 당신을 어필하세요." : "Presentations and meetings go well. Show yourself.",
              love: isKo ? "분위기가 화끈해요. 적극적인 표현이 통해요." : "The mood is hot. Active expression works.",
              money: isKo ? "소비 욕구가 커져요. 계획적으로 쓰세요." : "Spending desire increases. Spend with a plan.",
              health: isKo ? "심장과 혈압 관리하세요. 화를 참지 마세요." : "Manage heart and blood pressure. Don't hold anger."
            },
            "earth": {
              work: isKo ? "기존 업무를 안정적으로 처리하세요. 새 시작은 다음 달에." : "Handle existing work stably. New starts next month.",
              love: isKo ? "편안한 만남이 좋아요. 진지한 대화를 나눠보세요." : "Comfortable meetings are good. Have sincere talks.",
              money: isKo ? "저축하기 좋은 달이에요. 무리한 지출은 피하세요." : "Good month for saving. Avoid excessive spending.",
              health: isKo ? "소화기 관리하세요. 규칙적인 식사가 중요해요." : "Manage digestion. Regular meals are important."
            },
            "metal": {
              work: isKo ? "결정을 내려야 할 때예요. 미루지 마세요." : "Time to make decisions. Don't delay.",
              love: isKo ? "관계를 정리할 시기예요. 명확히 하세요." : "Time to organize relationships. Be clear.",
              money: isKo ? "불필요한 지출을 정리하세요. 정산의 시기예요." : "Organize unnecessary spending. Time for settling.",
              health: isKo ? "호흡기와 피부를 관리하세요." : "Manage respiratory and skin health."
            },
            "water": {
              work: isKo ? "아이디어를 정리하고 계획을 세우세요." : "Organize ideas and make plans.",
              love: isKo ? "깊은 대화가 관계를 발전시켜요." : "Deep conversation develops relationships.",
              money: isKo ? "재정 상태를 점검하세요. 큰 결정은 미루세요." : "Check financial status. Delay big decisions.",
              health: isKo ? "충분히 쉬세요. 수면이 중요한 달이에요." : "Rest well. Sleep is important this month."
            }
          };

          const elKey = e.includes("wood") ? "wood" : e.includes("fire") ? "fire" : e.includes("earth") ? "earth" : e.includes("metal") ? "metal" : "water";
          return monthDetails[elKey] || monthDetails["earth"];
        };

        const monthDetail = getMonthDetail(dmName, element);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{fortune.emoji}</span>
              <h3 className="text-lg font-bold text-emerald-300">
                {isKo ? `${monthNames[currentMonth - 1]} 운세` : `${monthNames[currentMonth - 1]} Fortune`}
              </h3>
              {ganji && <span className="text-sm text-gray-400">({ganji})</span>}
            </div>

            <div className="space-y-3">
              {/* 이달의 테마 */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-300 font-bold text-base mb-2">{fortune.theme}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{fortune.advice}</p>
              </div>

              {/* 분야별 월운 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1">
                    <span>💼</span> {isKo ? "일/학업" : "Work"}
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">{monthDetail.work}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-pink-400 font-bold text-xs mb-1 flex items-center gap-1">
                    <span>💕</span> {isKo ? "연애/관계" : "Love"}
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">{monthDetail.love}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-yellow-400 font-bold text-xs mb-1 flex items-center gap-1">
                    <span>💰</span> {isKo ? "재물" : "Money"}
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">{monthDetail.money}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-red-400 font-bold text-xs mb-1 flex items-center gap-1">
                    <span>❤️‍🩹</span> {isKo ? "건강" : "Health"}
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">{monthDetail.health}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 16) 오늘의 운세 - 일진을 쉽게 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {saju?.unse?.iljin && Array.isArray(saju.unse.iljin) && saju.unse.iljin.length > 0 && (() => {
        const today = new Date();
        const todayDate = today.getDate();
        const todayIljin = saju.unse.iljin.find((i: any) => i.day === todayDate) || saju.unse.iljin[0];

        if (!todayIljin) return null;

        const ganji = todayIljin.ganji || `${todayIljin.stem?.name || ""}${todayIljin.branch?.name || ""}`;

        // 천간에서 오행 추출하는 함수
        const getStemElement = (gj: string): string => {
          if (!gj) return "";
          const firstChar = gj.charAt(0);
          const stemToElement: Record<string, string> = {
            "甲": "wood", "乙": "wood", "갑": "wood", "을": "wood",
            "丙": "fire", "丁": "fire", "병": "fire", "정": "fire",
            "戊": "earth", "己": "earth", "무": "earth", "기": "earth",
            "庚": "metal", "辛": "metal", "경": "metal", "신": "metal",
            "壬": "water", "癸": "water", "임": "water", "계": "water",
          };
          return stemToElement[firstChar] || "";
        };

        const element = todayIljin.stem?.element || todayIljin.element || getStemElement(ganji);

        // 오행별 일진 해석
        const getDayFortune = (el: string): { mood: string; tip: string; emoji: string } => {
          const e = el.toLowerCase();
          if (e.includes("목") || e.includes("wood")) return {
            mood: isKo ? "활기찬 하루 - 성장과 확장의 기운" : "Energetic Day - Growth & Expansion Energy",
            tip: isKo ? "새로운 일을 시작하기 좋은 날이에요. 아이디어가 떠오르고 창의력이 샘솟아요. 미팅, 프레젠테이션, 새 프로젝트 시작에 적극적으로 나서보세요. 머뭇거리지 말고 도전하면 좋은 결과가 따라올 거예요. 사람들과의 협력도 잘 풀리는 날입니다." : "Good day to start new things. Ideas flow and creativity springs. Be proactive in meetings, presentations, new projects. Don't hesitate to challenge. Collaboration works well today.",
            emoji: "🌳"
          };
          if (e.includes("화") || e.includes("fire")) return {
            mood: isKo ? "열정적인 하루 - 표현과 소통의 기운" : "Passionate Day - Expression & Communication Energy",
            tip: isKo ? "당신의 매력이 가장 빛나는 날이에요. 사람들 앞에서 말하고, 자신을 표현하고, 적극적으로 소통하세요. 중요한 발표나 면접, 데이트에 좋아요. 감정이 고조되기 쉬우니 흥분해서 충동적인 결정을 내리지 않도록 주의하세요. 에너지가 넘치는 만큼 과음이나 과로도 조심하세요." : "Your charm shines brightest today. Speak publicly, express yourself, communicate actively. Great for important presentations, interviews, dates. Watch for emotional highs leading to impulsive decisions. Be careful of overdrinking or overworking.",
            emoji: "🔥"
          };
          if (e.includes("토") || e.includes("earth")) return {
            mood: isKo ? "안정적인 하루 - 신뢰와 포용의 기운" : "Stable Day - Trust & Embrace Energy",
            tip: isKo ? "서두르지 말고 차근차근 진행하세요. 급한 결정보다는 신중한 판단이 좋아요. 중요한 계약, 약속, 금융 거래에 적합한 날입니다. 가족이나 오랜 친구와 따뜻한 시간을 보내면 마음이 편안해져요. 변화보다는 현재 상태를 유지하고 강화하는 것이 유리해요." : "Don't rush, proceed step by step. Prudent judgment over hasty decisions. Good day for important contracts, promises, financial transactions. Spending warm time with family or old friends brings peace. Maintaining and strengthening current state is better than change.",
            emoji: "🏔️"
          };
          if (e.includes("금") || e.includes("metal")) return {
            mood: isKo ? "결단의 하루 - 정리와 마무리의 기운" : "Decision Day - Organization & Completion Energy",
            tip: isKo ? "미루던 결정을 내리기 좋은 날이에요. 머리가 명확해지고 판단력이 예리해져요. 불필요한 것들을 과감하게 정리하세요 - 물건, 인간관계, 나쁜 습관 모두 포함입니다. 마무리 작업, 청소, 정리에도 좋아요. 너무 냉정하거나 날카로운 말로 사람에게 상처 주지 않도록 주의하세요." : "Good day to make delayed decisions. Mind becomes clear and judgment sharp. Boldly organize unnecessary things - objects, relationships, bad habits all included. Great for finishing work, cleaning, organizing. Be careful not to hurt people with too cold or sharp words.",
            emoji: "⚔️"
          };
          if (e.includes("수") || e.includes("water")) return {
            mood: isKo ? "직관의 하루 - 지혜와 통찰의 기운" : "Intuition Day - Wisdom & Insight Energy",
            tip: isKo ? "느낌을 믿으세요. 논리보다 직관이 답을 줄 거예요. 명상, 독서, 조용한 사색의 시간을 가지면 영감이 떠올라요. 깊은 대화나 상담, 비밀스러운 이야기를 나누기 좋아요. 감정이 예민해질 수 있으니 과음하거나 감정에 휩쓸려 중요한 결정을 내리지 마세요. 일찍 자고 꿈을 기억해보세요." : "Trust your feelings. Intuition will give answers over logic. Meditation, reading, quiet contemplation brings inspiration. Good for deep conversations, counseling, secret talks. Emotions can be sensitive, so avoid overdrinking or making important decisions while emotional. Sleep early and remember your dreams.",
            emoji: "💧"
          };
          return {
            mood: isKo ? "평온한 하루 - 균형과 조화의 기운" : "Peaceful Day - Balance & Harmony Energy",
            tip: isKo ? "자연스럽게 흘러가세요. 억지로 밀어붙이지 말고, 흐름을 타세요. 큰 일보다는 일상의 작은 행복에 집중하면 좋아요. 휴식, 재충전, 자기관리의 시간으로 활용하세요." : "Go with the flow. Don't force things, ride the current. Focus on small daily happiness rather than big events. Use time for rest, recharge, self-care.",
            emoji: "☯️"
          };
        };

        const fortune = getDayFortune(element);

        // 일진 상세 해석 (일간과의 관계)
        const dmName = data.dayMasterName || "";
        const getDayDetail = (_dm: string, el: string): {
          relation: string;
          morning: string;
          afternoon: string;
          evening: string;
          luckyTime: string;
          avoid: string;
        } => {
          const e = el.toLowerCase();

          const dayDetails: Record<string, {
            relation: string;
            morning: string;
            afternoon: string;
            evening: string;
            luckyTime: string;
            avoid: string;
          }> = {
            "wood": {
              relation: isKo ? "성장과 시작의 에너지 - 나무가 뿌리 내리고 가지를 뻗듯, 새로운 것을 시작하고 확장하는 힘이 강해요" : "Growth & Beginning Energy - Like a tree taking root and spreading branches, strong power to start and expand new things",
              morning: isKo ? "이른 아침(7-9시)이 가장 좋아요. 머리가 맑고 아이디어가 샘솟는 시간이에요. 중요한 프로젝트를 시작하거나, 새로운 계획을 세우거나, 창의적인 작업을 하세요. 운동이나 산책으로 하루를 열면 에너지가 배가 돼요." : "Early morning (7-9 AM) is best. Mind is clear and ideas spring. Start important projects, make new plans, do creative work. Opening the day with exercise or walks doubles your energy.",
              afternoon: isKo ? "활동적으로 움직이세요. 사람들을 만나고, 미팅하고, 협력하세요. 새로운 사람과의 네트워킹, 팀 회의, 브레인스토밍에 최적의 시간이에요. 움직일수록 운이 따라와요." : "Move actively. Meet people, have meetings, collaborate. Optimal time for networking with new people, team meetings, brainstorming. The more you move, the more luck follows.",
              evening: isKo ? "내일을 위한 계획을 세워보세요. 다이어리 쓰기, 목표 설정, 배울 것 찾기 등 성장을 위한 준비를 하면 좋아요. 책이나 강의로 자기계발하는 것도 추천해요." : "Make plans for tomorrow. Good for writing diary, setting goals, finding things to learn. Recommended to self-improve through books or lectures.",
              luckyTime: isKo ? "오전 7-9시 (묘시) - 명운의 시간" : "7-9 AM - Fortune Time",
              avoid: isKo ? "우유부단하게 결정을 미루거나, 변화를 두려워하는 것. 오늘은 과감하게 시작하세요!" : "Indecisively delaying decisions or fearing change. Today, start boldly!"
            },
            "fire": {
              relation: isKo ? "열정과 표현의 에너지 - 태양이 하늘 높이 떠오르듯, 자신을 드러내고 빛나는 힘이 강해요" : "Passion & Expression Energy - Like the sun rising high in the sky, strong power to reveal and shine yourself",
              morning: isKo ? "아침부터 사람들과 소통하세요. SNS 포스팅, 이메일 답장, 전화 통화 등으로 에너지를 발산하세요. 긍정적인 말과 밝은 표정이 행운을 불러와요." : "Communicate with people from morning. Release energy through SNS posting, email replies, phone calls. Positive words and bright expressions bring luck.",
              afternoon: isKo ? "낮 12시 전후가 최고의 시간이에요. 당신의 매력과 카리스마가 최고조에 달해요. 중요한 발표, 면접, 프레젠테이션, 데이트를 이 시간에 잡으세요. 사람들이 당신에게 집중하고, 당신의 말에 설득당할 거예요." : "Around noon is the best time. Your charm and charisma peak. Schedule important presentations, interviews, pitches, dates at this time. People will focus on you and be persuaded by your words.",
              evening: isKo ? "에너지가 과해서 흥분 상태가 될 수 있어요. 저녁엔 진정하고 쿨다운하세요. 과음하거나 감정적으로 싸우지 마세요. 가벼운 운동이나 명상으로 열기를 식히는 게 좋아요." : "Energy can be excessive leading to excitement. Calm down and cool down in evening. Don't overdrink or fight emotionally. Good to cool off with light exercise or meditation.",
              luckyTime: isKo ? "오전 11시-오후 1시 (오시) - 명운의 시간" : "11 AM - 1 PM - Fortune Time",
              avoid: isKo ? "다툼, 말싸움, 충동적인 결정, 과음. 에너지가 넘치는 만큼 조절이 필요해요." : "Arguments, verbal fights, impulsive decisions, overdrinking. Need control as energy overflows."
            },
            "earth": {
              relation: isKo ? "안정과 신뢰의 에너지 - 대지가 모든 것을 받아주듯, 든든하고 믿음직스러운 힘이 강해요" : "Stability & Trust Energy - Like earth accepting everything, strong reliable and trustworthy power",
              morning: isKo ? "천천히, 여유롭게 하루를 시작하세요. 아침 식사를 잘 챙기고, 몸과 마음을 준비하세요. 급하게 서두르면 오히려 일이 꼬여요. 느긋하게 가는 게 오늘의 전략이에요." : "Start the day slowly, leisurely. Have a good breakfast, prepare body and mind. Rushing makes things go wrong. Going easy is today's strategy.",
              afternoon: isKo ? "오후는 묵묵히 일하기 좋은 시간이에요. 꾸준함이 빛을 발해요. 중요한 계약, 금융 거래, 서류 작업, 장기 프로젝트 진행에 좋아요. 신뢰를 쌓는 일에 집중하세요." : "Afternoon is good for working silently. Persistence shines. Good for important contracts, financial transactions, paperwork, long-term project progress. Focus on building trust.",
              evening: isKo ? "가족이나 오랜 친구들과 따뜻한 시간을 보내세요. 집에서 편안한 저녁 식사, 옛 추억 이야기, 함께 TV 보기 등 평범한 행복이 가득한 시간이 될 거예요. 안정감을 느끼세요." : "Spend warm time with family or old friends. Comfortable home dinner, old memory stories, watching TV together - time full of ordinary happiness. Feel stability.",
              luckyTime: isKo ? "오후 1-3시, 저녁 7-9시 (미시, 술시) - 명운의 시간" : "1-3 PM, 7-9 PM - Fortune Time",
              avoid: isKo ? "급한 변화, 무리한 도전, 충동적인 투자. 안정적으로 가는 것이 승리예요." : "Sudden changes, excessive challenges, impulsive investments. Going stable is victory."
            },
            "metal": {
              relation: isKo ? "결단과 정리의 에너지 - 칼이 베어내듯, 불필요한 것을 정리하고 명확하게 하는 힘이 강해요" : "Decision & Organization Energy - Like a sword cutting, strong power to organize unnecessary things and clarify",
              morning: isKo ? "오늘 하루 무엇을 할지 명확하게 정리하세요. 우선순위를 정하고, 불필요한 일정은 과감하게 취소하세요. 머리가 맑아서 복잡한 문제도 명쾌하게 해결할 수 있어요." : "Clearly organize what to do today. Set priorities, boldly cancel unnecessary schedules. Mind is clear to solve complex problems decisively.",
              afternoon: isKo ? "오후 3-5시가 최고의 시간이에요. 미루던 결정을 내리고, 마무리 작업을 하고, 정리 정돈을 하세요. 프로젝트 완료, 계약 체결, 서류 마감에 좋아요. 깔끔하게 끝내면 후련함을 느낄 거예요." : "3-5 PM is the best time. Make delayed decisions, finish work, organize. Good for project completion, contract signing, document deadlines. Completing cleanly brings relief.",
              evening: isKo ? "불필요한 것들을 버리세요. 옷장 정리, 파일 삭제, 안 쓰는 물건 버리기, 독이 되는 관계 정리까지. 덜어낼수록 가벼워지고 새로운 것이 들어올 공간이 생겨요." : "Throw away unnecessary things. Closet organization, file deletion, discarding unused items, organizing toxic relationships. The more you subtract, the lighter you become and space for new things appears.",
              luckyTime: isKo ? "오후 3-5시 (신시) - 명운의 시간" : "3-5 PM - Fortune Time",
              avoid: isKo ? "우유부단하게 질질 끄는 것, 애매하게 남겨두는 것. 오늘은 명확하게 끝내세요!" : "Indecisively dragging things out, leaving things ambiguous. Today, finish clearly!"
            },
            "water": {
              relation: isKo ? "직관과 지혜의 에너지 - 물이 깊은 곳까지 스며들듯, 통찰과 영감을 얻는 힘이 강해요" : "Intuition & Wisdom Energy - Like water seeping deep, strong power to gain insight and inspiration",
              morning: isKo ? "조용한 시간을 가지세요. 명상, 요가, 산책, 일기 쓰기로 하루를 시작하면 좋아요. 논리보다 직관이 답을 줄 거예요. 혼자만의 시간에서 영감이 떠올라요." : "Have quiet time. Good to start day with meditation, yoga, walks, diary writing. Intuition will give answers over logic. Inspiration comes in alone time.",
              afternoon: isKo ? "깊은 대화가 잘 통하는 시간이에요. 상담, 고민 상담, 비밀스러운 이야기를 나누기 좋아요. 사람들의 진심을 알아보는 통찰력이 생겨요. 중요한 결정은 느낌을 믿고 내리세요." : "Time when deep conversations work well. Good for counseling, worry consultation, sharing secret stories. Gain insight to see people's sincerity. Make important decisions trusting your feelings.",
              evening: isKo ? "밤 9-11시가 가장 좋은 시간이에요. 일찍 자리에 누워서 명상하거나 책을 읽으세요. 꿈에서 중요한 힌트를 얻을 수도 있어요. 꿈을 기억해두세요. 감정이 예민해질 수 있으니 과음은 금물이에요." : "9-11 PM is the best time. Lie down early to meditate or read. You might get important hints from dreams. Remember your dreams. Emotions can be sensitive, so no overdrinking.",
              luckyTime: isKo ? "밤 9-11시 (해시) - 명운의 시간" : "9-11 PM - Fortune Time",
              avoid: isKo ? "과음, 감정적 폭발, 논리적 강요. 오늘은 느낌을 존중하세요." : "Overdrinking, emotional outbursts, logical forcing. Today, respect your feelings."
            }
          };

          const elKey = e.includes("wood") ? "wood" : e.includes("fire") ? "fire" : e.includes("earth") ? "earth" : e.includes("metal") ? "metal" : "water";
          return dayDetails[elKey] || dayDetails["earth"];
        };

        const dayDetail = getDayDetail(dmName, element);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{fortune.emoji}</span>
              <h3 className="text-lg font-bold text-indigo-300">{isKo ? "오늘의 운세" : "Today's Fortune"}</h3>
              {ganji && <span className="text-sm text-gray-400">({ganji})</span>}
            </div>

            <div className="space-y-3">
              {/* 오늘의 기운 */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-indigo-300 font-bold text-base mb-1">{fortune.mood}</p>
                <p className="text-indigo-400 text-sm mb-2">{dayDetail.relation}</p>
                <p className="text-gray-300 text-sm">{fortune.tip}</p>
              </div>

              {/* 시간대별 운세 */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                  <span className="text-lg">🌅</span>
                  <div className="flex-1">
                    <p className="text-yellow-300 font-bold text-xs">{isKo ? "오전" : "Morning"}</p>
                    <p className="text-gray-400 text-xs">{dayDetail.morning}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                  <span className="text-lg">☀️</span>
                  <div className="flex-1">
                    <p className="text-orange-300 font-bold text-xs">{isKo ? "오후" : "Afternoon"}</p>
                    <p className="text-gray-400 text-xs">{dayDetail.afternoon}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                  <span className="text-lg">🌙</span>
                  <div className="flex-1">
                    <p className="text-blue-300 font-bold text-xs">{isKo ? "저녁" : "Evening"}</p>
                    <p className="text-gray-400 text-xs">{dayDetail.evening}</p>
                  </div>
                </div>
              </div>

              {/* 행운의 시간 & 주의사항 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-indigo-300 font-bold text-xs mb-1">⏰ {isKo ? "행운의 시간" : "Lucky Time"}</p>
                  <p className="text-white text-xs">{dayDetail.luckyTime}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-300 font-bold text-xs mb-1">⚠️ {isKo ? "피할 것" : "Avoid"}</p>
                  <p className="text-gray-400 text-xs">{dayDetail.avoid}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 17) 종합 운세 점수 - 사주+점성학 통합 오각형 레이더 차트 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const sc = saju?.advancedAnalysis?.score || {};
        const strength = saju?.advancedAnalysis?.extended?.strength || {};
        const geokguk = saju?.advancedAnalysis?.extended?.geokguk || {};
        const yongsinData = saju?.advancedAnalysis?.extended?.yongsin || {};
        const tonggeun = saju?.advancedAnalysis?.tonggeun || {};

        const getNum = (v: any): number => {
          if (typeof v === 'number') return Math.max(0, Math.min(100, v));
          return 0;
        };

        // ============ 사주 점수 계산 (95점 상한 알고리즘) ============
        // 1. 일간 에너지 (신강/신약) - 기본 75점에서 시작
        const strengthTotal = getNum(strength.total) || getNum(strength.score) || 75;
        const sajuEnergy = Math.min(95, Math.round(strengthTotal * 1.1));

        // 2. 오행 균형 - 기본 78점에서 시작 (균형이 있다는 가정)
        const elementScores = saju?.advancedAnalysis?.elementScores || [];
        let sajuBalance = 78;
        if (elementScores.length > 0) {
          const ratios = elementScores.map((e: any) => e.ratio || 0.2);
          const maxRatio = Math.max(...ratios);
          const minRatio = Math.min(...ratios);
          const diff = maxRatio - minRatio;
          // 차이가 크면 감점, 작으면 높은 점수 (최소 55점 보장)
          sajuBalance = Math.min(95, Math.round(Math.max(55, 105 - (diff * 120))));
        } else {
          sajuBalance = Math.min(95, getNum(sc.balance) || getNum(sc.elementBalance) || 78);
        }

        // 3. 격국 순수도 → 잠재력 - 기본 76점
        const sajuPotential = Math.min(95, getNum(geokguk.purity) || getNum(sc.structure) || getNum(sc.geokguk) || 76);

        // 4. 용신 적합도 → 행운력 - 기본 74점
        const sajuLuck = Math.min(95, getNum(yongsinData.fitScore) || getNum(sc.yongsin) || getNum(sc.usefulGod) || 74);

        // 5. 통근 점수 → 안정감 - 기본 70점 (중립)
        const sajuStability = Math.min(95, getNum(tonggeun.score) || getNum(tonggeun.totalScore) || 70);

        // ============ 점성학 점수 계산 ============
        const getPlanetSign = (planetName: string) => findPlanetSign(astro, planetName);
        const sunSign = getPlanetSign("sun");
        const moonSign = getPlanetSign("moon");
        const ascSign = astro?.ascendant?.sign?.toLowerCase() || null;
        const dm = data.dayMasterName || "";

        // 별자리 → 원소 매핑
        const signToElement: Record<string, string> = {
          aries: "fire", leo: "fire", sagittarius: "fire",
          taurus: "earth", virgo: "earth", capricorn: "earth",
          gemini: "air", libra: "air", aquarius: "air",
          cancer: "water", scorpio: "water", pisces: "water"
        };

        // 사주 오행 → 점성학 원소 연결
        const sajuToAstroElement: Record<string, string> = {
          "목": "air", "木": "air",      // 목 = 바람/성장 → air
          "화": "fire", "火": "fire",    // 화 = 불 → fire
          "토": "earth", "土": "earth",  // 토 = 땅 → earth
          "금": "air", "金": "air",      // 금 = 날카로움 → air
          "수": "water", "水": "water",  // 수 = 물 → water
        };

        // 일간 오행 가져오기
        const dmInfo = dayMasterData[dm];
        const dmElement = dmInfo?.element || "";
        const dmAstroElement = sajuToAstroElement[dmElement] || null;

        const sunElement = sunSign ? signToElement[sunSign.toLowerCase()] : null;
        const moonElement = moonSign ? signToElement[moonSign.toLowerCase()] : null;
        const ascElement = ascSign ? signToElement[ascSign.toLowerCase()] : null;

        // ============ 사주-점성학 시너지 계산 ============
        // 1. 태양-달 조화도
        let sunMoonHarmony = 0;
        if (sunElement && moonElement) {
          if (sunElement === moonElement) sunMoonHarmony = 15; // 같은 원소
          else if (
            (sunElement === "fire" && moonElement === "air") ||
            (sunElement === "air" && moonElement === "fire") ||
            (sunElement === "earth" && moonElement === "water") ||
            (sunElement === "water" && moonElement === "earth")
          ) sunMoonHarmony = 10; // 상성 좋음
          else sunMoonHarmony = 5; // 보통
        }

        // 2. 일간-태양 시너지 (사주 오행과 태양 별자리 원소가 맞으면 보너스)
        let dmSunSynergy = 0;
        if (dmAstroElement && sunElement) {
          if (dmAstroElement === sunElement) dmSunSynergy = 15; // 완벽 조화
          else if (
            (dmAstroElement === "fire" && sunElement === "air") ||
            (dmAstroElement === "air" && sunElement === "fire") ||
            (dmAstroElement === "earth" && sunElement === "water") ||
            (dmAstroElement === "water" && sunElement === "earth")
          ) dmSunSynergy = 10;
          else dmSunSynergy = 3;
        }

        // 3. 일간-달 시너지 (감정/내면 조화)
        let dmMoonSynergy = 0;
        if (dmAstroElement && moonElement) {
          if (dmAstroElement === moonElement) dmMoonSynergy = 12;
          else if (
            (dmAstroElement === "fire" && moonElement === "air") ||
            (dmAstroElement === "air" && moonElement === "fire") ||
            (dmAstroElement === "earth" && moonElement === "water") ||
            (dmAstroElement === "water" && moonElement === "earth")
          ) dmMoonSynergy = 8;
          else dmMoonSynergy = 3;
        }

        // 4. 어센던트 영향
        let ascBonus = 0;
        if (ascElement) {
          if (dmAstroElement === ascElement) ascBonus = 12;
          else ascBonus = 6;
        }

        // ============ 통합 5축 점수 (동양 65% + 서양 35%) - 개선된 알고리즘 ============
        // 1. 내면의 힘 (Inner Power) - 사주 신강/신약 + 태양 에너지
        const innerPower = Math.min(100, Math.round(
          sajuEnergy * 0.65 +
          (sunSign ? (25 + dmSunSynergy * 1.0) : sajuEnergy * 0.35)
        ));

        // 2. 조화 (Harmony) - 오행균형 + 태양-달 조화 + 사주-점성 시너지
        const harmony = Math.min(100, Math.round(
          sajuBalance * 0.55 +
          sunMoonHarmony * 1.2 +
          (dmSunSynergy + dmMoonSynergy) * 0.6
        ));

        // 3. 잠재력 (Potential) - 격국 + 어센던트 영향
        const potential = Math.min(100, Math.round(
          sajuPotential * 0.65 +
          ascBonus * 1.2 +
          (ascSign ? 15 : sajuPotential * 0.25)
        ));

        // 4. 행운력 (Fortune) - 용신 적합도 + 전체 시너지
        const totalSynergy = dmSunSynergy + dmMoonSynergy + sunMoonHarmony;
        const fortune = Math.min(100, Math.round(
          sajuLuck * 0.55 +
          Math.min(30, totalSynergy * 1.0) +
          (sunSign && moonSign ? 15 : 8)
        ));

        // 5. 안정감 (Stability) - 통근 + 달 별자리 영향
        const stability = Math.min(100, Math.round(
          sajuStability * 0.65 +
          dmMoonSynergy * 1.2 +
          (moonSign ? 18 : sajuStability * 0.25)
        ));

        // 5개 점수 배열 (자세한 설명 포함!)
        const scores = [
          {
            label: isKo ? "내면의 힘" : "Inner Power",
            value: innerPower,
            color: "#f472b6",
            emoji: "💪",
            desc: isKo ? "자신감과 추진력" : "Confidence & Drive",
            detail: isKo
              ? "일간 에너지(신강/신약)와 태양 별자리의 조화로 계산됩니다. 점수가 높을수록 자신감 있고 목표를 향해 적극적으로 나아가는 힘이 강합니다."
              : "Calculated from Day Master energy and Sun sign harmony. Higher scores indicate stronger confidence and drive toward goals."
          },
          {
            label: isKo ? "조화" : "Harmony",
            value: harmony,
            color: "#60a5fa",
            emoji: "☯️",
            desc: isKo ? "균형과 어울림" : "Balance & Compatibility",
            detail: isKo
              ? "오행 균형, 태양-달 조화, 사주-점성 시너지로 계산됩니다. 점수가 높을수록 내외적 균형이 잘 잡혀있고 주변과 조화롭게 지낼 수 있습니다."
              : "Calculated from Five Elements balance, Sun-Moon harmony, and synergy. Higher scores indicate better internal/external balance and harmonious relationships."
          },
          {
            label: isKo ? "잠재력" : "Potential",
            value: potential,
            color: "#34d399",
            emoji: "🌟",
            desc: isKo ? "숨겨진 가능성" : "Hidden Possibilities",
            detail: isKo
              ? "격국 순수도와 상승 별자리(어센던트)로 계산됩니다. 점수가 높을수록 아직 발휘하지 못한 재능과 가능성이 많습니다."
              : "Calculated from structure purity and Ascendant. Higher scores indicate more untapped talents and possibilities."
          },
          {
            label: isKo ? "행운력" : "Fortune",
            value: fortune,
            color: "#a78bfa",
            emoji: "🍀",
            desc: isKo ? "운이 따르는 정도" : "How luck follows you",
            detail: isKo
              ? "용신 적합도와 동서양 시너지로 계산됩니다. 점수가 높을수록 중요한 순간에 운이 따르고 기회가 잘 옵니다."
              : "Calculated from Useful God fitness and synergy. Higher scores mean luck follows at crucial moments and opportunities come easier."
          },
          {
            label: isKo ? "안정감" : "Stability",
            value: stability,
            color: "#fbbf24",
            emoji: "🏠",
            desc: isKo ? "기반과 든든함" : "Foundation & Security",
            detail: isKo
              ? "통근(뿌리)과 달 별자리로 계산됩니다. 점수가 높을수록 기반이 탄탄하고 쉽게 흔들리지 않는 안정감이 있습니다."
              : "Calculated from root strength and Moon sign. Higher scores indicate solid foundation and stability that's hard to shake."
          },
        ];

        // 종합 점수 계산 (가중 평균)
        const totalScore = Math.round(
          innerPower * 0.25 +
          harmony * 0.20 +
          potential * 0.20 +
          fortune * 0.20 +
          stability * 0.15
        );

        // 점수에 따른 개인화된 메시지
        const getScoreMessage = (score: number) => {
          const dmTraits: Record<string, { strength: string; weakness: string }> = {
            "갑": { strength: "리더십과 추진력", weakness: "너무 앞서가는 것" },
            "을": { strength: "유연함과 적응력", weakness: "결단력 부족" },
            "병": { strength: "열정과 표현력", weakness: "급한 성격" },
            "정": { strength: "섬세함과 배려심", weakness: "내면에 가두는 것" },
            "무": { strength: "신뢰와 안정감", weakness: "변화에 느린 대응" },
            "기": { strength: "포용력과 실용성", weakness: "걱정이 많은 것" },
            "경": { strength: "결단력과 정의감", weakness: "고집" },
            "신": { strength: "섬세함과 완벽주의", weakness: "예민함" },
            "임": { strength: "지혜와 포용력", weakness: "우유부단" },
            "계": { strength: "직관과 감성", weakness: "감정기복" },
          };
          const trait = dmTraits[dm] || { strength: "당신만의 강점", weakness: "보완할 점" };

          // 점성학 정보 추가
          const sunSignKo = sunSign ? getSignKorean(sunSign) : "";
          const moonSignKo = moonSign ? getSignKorean(moonSign) : "";

          if (score >= 75) {
            return {
              ko: `사주와 별자리 모두 좋은 조합이에요! ${trait.strength}이(가) 빛나는 타입이고, ${sunSignKo ? `태양 ${sunSignKo}의 에너지가 더해져` : ""} 강력한 운을 가졌어요. 자신감 있게 나아가세요!`,
              en: `Both your Four Pillars and stars align well! Your ${trait.strength} shines${sunSign ? `, amplified by your ${sunSign} Sun energy` : ""}. Move forward with confidence!`
            };
          }
          if (score >= 55) {
            return {
              ko: `안정적인 운세예요. ${trait.strength}을(를) 살리면서 ${moonSignKo ? `달 ${moonSignKo}의 감성을 활용하면` : "꾸준히 가면"} 좋은 결과가 올 거예요.`,
              en: `Stable fortune. Leverage your ${trait.strength}${moonSign ? ` and your ${moonSign} Moon's intuition` : ""} for good results.`
            };
          }
          if (score >= 40) {
            return {
              ko: `${trait.weakness}을(를) 조금 조심하면 더 좋아져요. 도움되는 색상과 방향을 활용해보세요.`,
              en: `Watch out for ${trait.weakness}. Use helpful colors and directions.`
            };
          }
          return {
            ko: `균형을 잡는 게 중요해요. ${trait.weakness}에 주의하고, 부족한 에너지를 보완해주세요.`,
            en: `Focus on balance. Watch for ${trait.weakness} and supplement lacking energies.`
          };
        };

        // 별자리 한글 이름
        const getSignKorean = (sign: string): string => {
          const map: Record<string, string> = {
            aries: "양자리", taurus: "황소자리", gemini: "쌍둥이자리", cancer: "게자리",
            leo: "사자자리", virgo: "처녀자리", libra: "천칭자리", scorpio: "전갈자리",
            sagittarius: "사수자리", capricorn: "염소자리", aquarius: "물병자리", pisces: "물고기자리"
          };
          return map[sign.toLowerCase()] || sign;
        };

        const scoreMsg = getScoreMessage(totalScore);

        // 점수 레벨 표시
        const getScoreLevel = (score: number) => {
          if (score >= 75) return { ko: "최상", en: "Excellent", color: "text-green-400", bg: "bg-green-500/20" };
          if (score >= 55) return { ko: "양호", en: "Good", color: "text-yellow-400", bg: "bg-yellow-500/20" };
          if (score >= 40) return { ko: "보통", en: "Average", color: "text-orange-400", bg: "bg-orange-500/20" };
          return { ko: "보완필요", en: "Needs Care", color: "text-red-400", bg: "bg-red-500/20" };
        };
        const level = getScoreLevel(totalScore);

        // 오각형 레이더 차트 SVG 계산 (더 큰 사이즈!)
        const centerX = 150;
        const centerY = 150;
        const maxRadius = 110;
        const angleStep = (2 * Math.PI) / 5;
        const startAngle = -Math.PI / 2; // 12시 방향 시작

        // 각 꼭지점 좌표 계산 함수
        const getPoint = (index: number, radius: number) => {
          const angle = startAngle + index * angleStep;
          return {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        };

        // 배경 오각형들 (20%, 40%, 60%, 80%, 100%)
        const backgroundLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

        // 데이터 포인트 (점수에 따른 위치)
        const dataPoints = scores.map((s, i) => getPoint(i, (s.value / 100) * maxRadius));
        const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

        // 강점/약점 찾기
        const maxScore = Math.max(...scores.map(s => s.value));
        const minScore = Math.min(...scores.map(s => s.value));
        const strongPoint = scores.find(s => s.value === maxScore);
        const weakPoint = scores.find(s => s.value === minScore);

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-yellow-900/20 border border-yellow-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎯</span>
              <h3 className="text-lg font-bold text-yellow-300">{isKo ? "종합 운세 점수" : "Overall Fortune Score"}</h3>
              <span className={`ml-auto px-2 py-1 rounded-full text-xs font-bold ${level.color} ${level.bg}`}>
                {isKo ? level.ko : level.en}
              </span>
            </div>

            {/* 동양+서양 운세 시스템 통합 배지 */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="flex justify-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
                  ☯️ {isKo ? "동양 운세 (65%)" : "Eastern Fortune (65%)"}
                </span>
                <span className="text-gray-500">+</span>
                <span className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  ⭐ {isKo ? "서양 운세 (35%)" : "Western Fortune (35%)"}
                </span>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {isKo ? "사주팔자 + 점성술 융합 분석으로 더 정확한 운세를 제공합니다" : "Combined Four Pillars + Astrology analysis for more accurate fortune reading"}
              </p>
            </div>

            {/* 더 큰 오각형 레이더 차트 */}
            <div className="flex flex-col items-center mb-6">
              <svg viewBox="0 0 300 300" className="w-72 h-72 md:w-80 md:h-80">
                {/* 그라데이션 정의 */}
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#f472b6" stopOpacity="0.2" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* 배경 오각형들 */}
                {backgroundLevels.map((lvl, idx) => {
                  const points = Array.from({ length: 5 }, (_, i) => {
                    const p = getPoint(i, maxRadius * lvl);
                    return `${p.x},${p.y}`;
                  }).join(' ');
                  return (
                    <polygon
                      key={idx}
                      points={points}
                      fill="none"
                      stroke={idx === 4 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}
                      strokeWidth={idx === 4 ? "1.5" : "1"}
                    />
                  );
                })}

                {/* 축 선 */}
                {scores.map((_, i) => {
                  const p = getPoint(i, maxRadius);
                  return (
                    <line
                      key={i}
                      x1={centerX}
                      y1={centerY}
                      x2={p.x}
                      y2={p.y}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* 데이터 영역 (그라데이션 적용) */}
                <path
                  d={dataPath}
                  fill="url(#chartGradient)"
                  stroke="#eab308"
                  strokeWidth="2.5"
                  filter="url(#glow)"
                />

                {/* 데이터 포인트 (더 큰 원) */}
                {dataPoints.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="8"
                      fill={scores[i].color}
                      stroke="white"
                      strokeWidth="2"
                      filter="url(#glow)"
                    />
                    <text
                      x={p.x}
                      y={p.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[8px] font-bold fill-white"
                    >
                      {scores[i].value}
                    </text>
                  </g>
                ))}

                {/* 레이블 (이모지 + 텍스트) */}
                {scores.map((s, i) => {
                  const labelPoint = getPoint(i, maxRadius + 30);
                  return (
                    <g key={i}>
                      <text
                        x={labelPoint.x}
                        y={labelPoint.y - 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-sm"
                      >
                        {s.emoji}
                      </text>
                      <text
                        x={labelPoint.x}
                        y={labelPoint.y + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[11px] fill-gray-300 font-medium"
                      >
                        {s.label}
                      </text>
                    </g>
                  );
                })}

                {/* 중앙 총점 (더 크게) */}
                <circle cx={centerX} cy={centerY} r="32" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text
                  x={centerX}
                  y={centerY - 4}
                  textAnchor="middle"
                  className="text-2xl font-bold fill-white"
                >
                  {totalScore}
                </text>
                <text
                  x={centerX}
                  y={centerY + 14}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-400"
                >
                  {isKo ? "종합점수" : "Total"}
                </text>
              </svg>
            </div>

            {/* 세부 점수 카드 (설명 포함) */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {scores.map((s, i) => (
                <div key={i} className="p-2 rounded-xl bg-white/5 text-center border border-white/5 hover:border-white/20 transition-all">
                  <div className="text-lg mb-1">{s.emoji}</div>
                  <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
                  <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* 각 항목 자세한 설명 */}
            <div className="grid grid-cols-1 gap-2 mb-4 text-xs">
              {scores.map((s, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{s.emoji}</span>
                    <span className="font-medium" style={{ color: s.color }}>{s.label}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-gray-300">{s.desc}</span>
                    <span className="ml-auto font-bold text-base" style={{ color: s.color }}>{s.value}{isKo ? "점" : "pt"}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed ml-6">{s.detail}</p>
                </div>
              ))}
            </div>

            {/* 강점/약점 분석 - 확장 버전 */}
            <div className="space-y-4 mb-4">
              {/* 강점 섹션 - 70점 이상 모두 표시 */}
              {(() => {
                const strengths = scores.filter(s => s.value >= 70);
                if (strengths.length > 0) {
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">💪</span>
                        <h4 className="text-green-400 font-bold">{isKo ? "최고의 강점" : "Top Strengths"}</h4>
                        <span className="text-xs text-gray-500">({strengths.length}{isKo ? "개" : " items"})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {strengths.map((s, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{s.emoji}</span>
                                <p className="text-white font-bold">{s.label}</p>
                              </div>
                              <p className="text-green-300 text-xl font-bold">{s.value}{isKo ? "점" : "pts"}</p>
                            </div>
                            <p className="text-green-400 text-xs mb-2">{s.desc}</p>
                            <p className="text-gray-300 text-xs leading-relaxed">
                              {isKo
                                ? `이 부분은 당신의 핵심 강점입니다. ${s.label === "내면의 힘" ? "자신감을 갖고 주도적으로 행동하세요." : s.label === "조화" ? "균형잡힌 당신의 에너지를 활용하세요." : s.label === "잠재력" ? "숨겨진 재능을 발휘할 시간입니다." : s.label === "행운력" ? "기회가 왔을 때 과감하게 도전하세요." : "안정된 기반을 바탕으로 성장하세요."}`
                                : `This is your core strength. ${s.label === "Inner Power" ? "Act with confidence and take the lead." : s.label === "Harmony" ? "Leverage your balanced energy." : s.label === "Potential" ? "Time to unleash hidden talents." : s.label === "Fortune" ? "Seize opportunities boldly." : "Grow on your stable foundation."}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* 약점 섹션 - 60점 미만 모두 표시 (심각도별 구분) */}
              {(() => {
                const criticalWeaknesses = scores.filter(s => s.value < 50);
                const moderateWeaknesses = scores.filter(s => s.value >= 50 && s.value < 60);

                if (criticalWeaknesses.length > 0 || moderateWeaknesses.length > 0) {
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">⚠️</span>
                        <h4 className="text-orange-400 font-bold">{isKo ? "보완이 필요한 부분" : "Areas to Improve"}</h4>
                      </div>

                      {/* 심각한 약점 (50점 미만) */}
                      {criticalWeaknesses.length > 0 && (
                        <div className="mb-3">
                          <p className="text-red-400 text-xs font-medium mb-2">
                            {isKo ? "🔴 우선 보완 필요" : "🔴 Priority Attention"}
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {criticalWeaknesses.map((s, idx) => (
                              <div key={idx} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{s.emoji}</span>
                                    <p className="text-white font-bold">{s.label}</p>
                                  </div>
                                  <p className="text-red-300 text-xl font-bold">{s.value}{isKo ? "점" : "pts"}</p>
                                </div>
                                <p className="text-red-400 text-xs mb-2">{s.desc}</p>
                                <p className="text-gray-300 text-xs leading-relaxed mb-2">
                                  {isKo
                                    ? `이 부분이 약하면 어려움을 겪을 수 있습니다. ${s.label === "내면의 힘" ? "자신감을 키우고 작은 성공 경험을 쌓으세요." : s.label === "조화" ? "오행 균형을 맞추고 갈등을 줄이세요." : s.label === "잠재력" ? "새로운 도전으로 숨은 능력을 깨우세요." : s.label === "행운력" ? "준비를 철저히 하고 기회를 만들어가세요." : "안정된 기반 만들기에 집중하세요."}`
                                    : `Weakness here may cause difficulties. ${s.label === "Inner Power" ? "Build confidence through small wins." : s.label === "Harmony" ? "Balance elements and reduce conflicts." : s.label === "Potential" ? "Awaken hidden abilities with new challenges." : s.label === "Fortune" ? "Prepare thoroughly and create opportunities." : "Focus on building stable foundation."}`}
                                </p>
                                <div className="flex items-start gap-2 p-2 rounded bg-black/20 border border-red-500/20">
                                  <span className="text-xs">💡</span>
                                  <p className="text-xs text-yellow-200">
                                    {isKo
                                      ? `${s.label === "내면의 힘" ? "명상, 운동, 성취 경험으로 내면을 강화하세요." : s.label === "조화" ? "부족한 오행의 색상과 방향을 활용하세요." : s.label === "잠재력" ? "새로운 분야에 도전하고 배움을 멈추지 마세요." : s.label === "행운력" ? "용신에 맞는 시기와 방향을 활용하세요." : "규칙적인 생활과 안정된 관계를 유지하세요."}`
                                      : `${s.label === "Inner Power" ? "Strengthen inner self through meditation, exercise, and achievements." : s.label === "Harmony" ? "Use colors and directions of lacking elements." : s.label === "Potential" ? "Challenge new fields and keep learning." : s.label === "Fortune" ? "Utilize timing and directions aligned with your Useful God." : "Maintain regular lifestyle and stable relationships."}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 보통 약점 (50-60점) */}
                      {moderateWeaknesses.length > 0 && (
                        <div>
                          <p className="text-orange-400 text-xs font-medium mb-2">
                            {isKo ? "🟡 개선 권장" : "🟡 Recommended Improvement"}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {moderateWeaknesses.map((s, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{s.emoji}</span>
                                    <p className="text-white text-sm font-bold">{s.label}</p>
                                  </div>
                                  <p className="text-orange-300 text-lg font-bold">{s.value}{isKo ? "점" : "pts"}</p>
                                </div>
                                <p className="text-orange-400 text-xs mb-1">{s.desc}</p>
                                <p className="text-gray-400 text-xs leading-relaxed">
                                  {isKo
                                    ? `${s.label}을(를) 조금만 신경쓰면 더 좋아질 수 있습니다. 꾸준한 관리가 필요해요.`
                                    : `With some attention to ${s.label}, you can improve. Consistent care is needed.`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* 양호한 부분 (60-69점) */}
              {(() => {
                const goodAreas = scores.filter(s => s.value >= 60 && s.value < 70);
                if (goodAreas.length > 0) {
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">✅</span>
                        <h4 className="text-blue-400 font-bold">{isKo ? "양호한 부분" : "Good Areas"}</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {goodAreas.map((s, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-base">{s.emoji}</span>
                              <p className="text-white text-xs font-medium">{s.label}</p>
                            </div>
                            <p className="text-blue-300 text-lg font-bold">{s.value}{isKo ? "점" : "pts"}</p>
                            <p className="text-gray-400 text-xs">{isKo ? "안정적입니다" : "Stable"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* 동양+서양 운세 시너지 분석 */}
            {(sunSign || moonSign) && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-4">
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔮</span>
                    <span className="text-purple-300 font-bold text-sm">{isKo ? "동양 × 서양 시너지" : "Eastern × Western Synergy"}</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">
                    {isKo ? "사주 일간과 별자리가 서로 얼마나 잘 맞는지 분석합니다" : "Analyzes how well your Day Master aligns with your zodiac signs"}
                  </p>
                </div>
                <div className="space-y-3 text-xs">
                  {/* 일간-태양 시너지 */}
                  {sunSign && dm && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-pink-400">☀️ {isKo ? "태양" : "Sun"} ({sunSign})</span>
                        <span className="text-gray-500">×</span>
                        <span className="text-cyan-400">☯️ {isKo ? "일간" : "Day Master"} ({dm})</span>
                        <span className="text-gray-400">=</span>
                        <span className={dmSunSynergy >= 12 ? "text-green-400" : dmSunSynergy >= 8 ? "text-yellow-400" : "text-gray-400"}>
                          {dmSunSynergy >= 12 ? (isKo ? "완벽 조화!" : "Perfect!") : dmSunSynergy >= 8 ? (isKo ? "좋은 궁합" : "Good match") : (isKo ? "보통" : "Neutral")}
                        </span>
                        <span className="ml-auto text-gray-500">+{dmSunSynergy}pt</span>
                      </div>
                      <p className="text-gray-500 text-xs ml-6">
                        {isKo
                          ? `${dm}(${dmInfo?.element || ""})와 ${sunSign}(${sunElement || ""})의 원소 궁합`
                          : `Element compatibility: ${dm}(${dmInfo?.element || ""}) × ${sunSign}(${sunElement || ""})`}
                      </p>
                    </div>
                  )}
                  {/* 일간-달 시너지 */}
                  {moonSign && dm && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">🌙 {isKo ? "달" : "Moon"} ({moonSign})</span>
                        <span className="text-gray-500">×</span>
                        <span className="text-cyan-400">☯️ {isKo ? "일간" : "Day Master"} ({dm})</span>
                        <span className="text-gray-400">=</span>
                        <span className={dmMoonSynergy >= 10 ? "text-green-400" : dmMoonSynergy >= 6 ? "text-yellow-400" : "text-gray-400"}>
                          {dmMoonSynergy >= 10 ? (isKo ? "감성 조화!" : "Emotional harmony!") : dmMoonSynergy >= 6 ? (isKo ? "안정적" : "Stable") : (isKo ? "보통" : "Neutral")}
                        </span>
                        <span className="ml-auto text-gray-500">+{dmMoonSynergy}pt</span>
                      </div>
                      <p className="text-gray-500 text-xs ml-6">
                        {isKo
                          ? `${dm}(${dmInfo?.element || ""})와 ${moonSign}(${moonElement || ""})의 감정 궁합`
                          : `Emotional compatibility: ${dm}(${dmInfo?.element || ""}) × ${moonSign}(${moonElement || ""})`}
                      </p>
                    </div>
                  )}
                  {/* 태양-달 조화 */}
                  {sunSign && moonSign && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-pink-400">☀️ {sunSign}</span>
                        <span className="text-gray-500">×</span>
                        <span className="text-blue-400">🌙 {moonSign}</span>
                        <span className="text-gray-400">=</span>
                        <span className={sunMoonHarmony >= 12 ? "text-green-400" : sunMoonHarmony >= 8 ? "text-yellow-400" : "text-gray-400"}>
                          {sunMoonHarmony >= 12 ? (isKo ? "완벽한 내면 조화!" : "Perfect inner harmony!") : sunMoonHarmony >= 8 ? (isKo ? "좋은 조화" : "Good harmony") : (isKo ? "보통" : "Average")}
                        </span>
                        <span className="ml-auto text-gray-500">+{sunMoonHarmony}pt</span>
                      </div>
                      <p className="text-gray-500 text-xs ml-6">
                        {isKo
                          ? `${sunSign}(${sunElement})와 ${moonSign}(${moonElement})의 내면 균형`
                          : `Inner balance: ${sunSign}(${sunElement}) × ${moonSign}(${moonElement})`}
                      </p>
                    </div>
                  )}
                </div>
                {/* 시너지 총점 */}
                <div className="mt-3 pt-3 border-t border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300 text-xs">{isKo ? "시너지 총점" : "Total Synergy"}</span>
                    <span className={`font-bold ${totalSynergy >= 30 ? "text-green-400" : totalSynergy >= 20 ? "text-yellow-400" : "text-gray-400"}`}>
                      {totalSynergy >= 30 ? "🌟" : totalSynergy >= 20 ? "⭐" : "○"} {totalSynergy}pt
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {isKo ? (
                        totalSynergy >= 30
                          ? "동양 사주와 서양 점성술이 매우 조화롭습니다. 두 체계가 서로를 강화하며 더 깊은 통찰을 제공합니다."
                          : totalSynergy >= 20
                          ? "사주와 점성술이 적당히 조화롭습니다. 두 체계가 서로 다른 관점을 제공하며 균형을 이룹니다."
                          : totalSynergy >= 10
                          ? "사주와 점성술이 독립적으로 작동합니다. 각 체계가 고유한 통찰을 제공하지만 시너지는 제한적입니다."
                          : "사주와 점성술이 서로 다른 성향을 보입니다. 한 체계가 강한 면을 다른 체계가 보완하는 형태입니다."
                      ) : (
                        totalSynergy >= 30
                          ? "Eastern and Western systems are highly harmonious. Both reinforce each other for deeper insights."
                          : totalSynergy >= 20
                          ? "Moderate harmony between systems. They provide different perspectives that balance each other."
                          : totalSynergy >= 10
                          ? "Systems work independently. Each provides unique insights but synergy is limited."
                          : "Systems show different tendencies. One system complements the strengths of the other."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 개인화된 해석 */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-pink-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✨</span>
                <span className="text-yellow-300 font-bold text-sm">{isKo ? "나의 운세 해석" : "Your Fortune Reading"}</span>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">{isKo ? scoreMsg.ko : scoreMsg.en}</p>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 추천 길일 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {data.dates.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📅</span>
            <h3 className="text-lg font-bold text-amber-300">{isKo ? "중요한 년도 (과거 15년 ~ 미래 15년)" : "Important Years (Past 15 ~ Future 15)"}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.dates.map((d, idx) => {
              const isBadYear = d.type.includes("⚠️") || d.type.includes("조심") || d.type.includes("Cautious");
              const isGoodYear = d.type.includes("✨") || d.type.includes("좋은") || d.type.includes("Good Year");

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isBadYear
                      ? "bg-red-900/20 border-red-500/40"
                      : isGoodYear
                      ? "bg-green-900/20 border-green-500/40"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="text-xl flex-shrink-0">
                    {isBadYear ? "⚠️" : isGoodYear ? "✨" : d.type.includes("🌟") ? "🌟" : d.type.includes("⭐") ? "⭐" : "🔮"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`font-bold text-sm ${
                        isBadYear
                          ? "text-red-400"
                          : isGoodYear
                          ? "text-green-400"
                          : "text-amber-300"
                      }`}>
                        {d.type.replace(/🌟|⭐|🔮|✨|⚠️/g, "").trim()}
                      </span>
                      <span className="text-white font-medium text-sm">{d.date}</span>
                    </div>
                    <p className="text-xs text-gray-400">{d.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 통합 운세 - 년/월/일/성장 단계 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const fortune = getTimeBasedFortune(saju, astro, lang);
        if (!fortune) return null;

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-900/30 border border-indigo-400/40 p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-3xl">⏰</span>
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
                {isKo ? "지금 내 타이밍" : "My Timing Now"}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 올해 */}
              {fortune.year && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/15 to-yellow-500/10 border border-orange-400/30 hover:border-orange-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{fortune.year.emoji}</span>
                    <span className="font-bold text-orange-300 text-base">{fortune.year.title}</span>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed mb-3">{fortune.year.message}</p>
                  <div className="flex items-start gap-2 text-orange-300 text-xs bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                    <span className="text-base mt-0.5">💡</span>
                    <span className="flex-1">{fortune.year.advice}</span>
                  </div>
                </div>
              )}

              {/* 이번 달 */}
              {fortune.month && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{fortune.month.emoji}</span>
                    <span className="font-bold text-purple-300 text-base">{fortune.month.title}</span>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed mb-3">{fortune.month.message}</p>
                  {fortune.month.advice && (
                    <div className="flex items-start gap-2 text-purple-300 text-xs bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                      <span className="text-base mt-0.5">💡</span>
                      <span className="flex-1">{fortune.month.advice}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 오늘 */}
              {fortune.today && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{fortune.today.emoji}</span>
                    <span className="font-bold text-green-300 text-base">{fortune.today.title}</span>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed mb-3">{fortune.today.message}</p>
                  <div className="flex items-start gap-2 text-green-300 text-xs bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                    <span className="text-base mt-0.5">💡</span>
                    <span className="flex-1">{fortune.today.tip}</span>
                  </div>
                </div>
              )}

              {/* 성장 단계 */}
              {fortune.growth && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/10 border border-teal-400/30 hover:border-teal-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{fortune.growth.emoji}</span>
                    <span className="font-bold text-teal-300 text-base">{fortune.growth.title}</span>
                  </div>
                  <p className="text-teal-300 text-sm font-semibold mb-2 bg-teal-500/10 px-3 py-1 rounded-full inline-block">
                    {fortune.growth.stage}
                  </p>
                  <p className="text-gray-200 text-sm leading-relaxed">{fortune.growth.message}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 행운 & 만남 포인트 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const fortuneInsight = getPartOfFortuneInsight(astro, lang);
        const vertexInsight = getVertexInsight(astro, lang);
        if (!fortuneInsight && !vertexInsight) return null;

        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-yellow-900/20 border border-yellow-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✨</span>
              <h3 className="text-lg font-bold text-yellow-300">{isKo ? "행운과 만남" : "Fortune & Encounters"}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 행운 포인트 */}
              {fortuneInsight && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{fortuneInsight.emoji}</span>
                    <span className="font-bold text-yellow-300 text-sm">{isKo ? "행운이 오는 곳" : "Fortune Comes"}</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{fortuneInsight.message}</p>
                </div>
              )}

              {/* 운명적 만남 */}
              {vertexInsight && (
                <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{vertexInsight.emoji}</span>
                    <span className="font-bold text-pink-300 text-sm">{isKo ? "중요한 사람을 만나는 곳" : "Meet Important People"}</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{vertexInsight.message}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 영혼의 목적 (Draconic Chart) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const draconicInsight = getDraconicInsight(astro, lang);
        if (!draconicInsight) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{draconicInsight.emoji}</span>
              <h3 className="text-lg font-bold text-indigo-300">{draconicInsight.title}</h3>
            </div>
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-gray-300 text-sm leading-relaxed">{draconicInsight.message}</p>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 숨겨진 재능 (Harmonics) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const harmonicsInsight = getHarmonicsInsight(astro, lang);
        if (!harmonicsInsight) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{harmonicsInsight.emoji}</span>
              <h3 className="text-lg font-bold text-emerald-300">{harmonicsInsight.title}</h3>
            </div>
            <div className="space-y-2">
              {harmonicsInsight.talents.map((talent, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-400">✦</span>
                  <p className="text-gray-300 text-sm">{talent}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 숨겨진 욕망 (Lilith) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const lilithInsight = getLilithInsight(astro, lang);
        if (!lilithInsight) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{lilithInsight.emoji}</span>
              <h3 className="text-lg font-bold text-violet-300">{lilithInsight.title}</h3>
            </div>
            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <p className="text-gray-300 text-sm leading-relaxed">{lilithInsight.message}</p>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 소행성 특성 (Asteroids) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const asteroidsInsight = getAsteroidsInsight(astro, lang);
        if (!asteroidsInsight) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{asteroidsInsight.emoji}</span>
              <h3 className="text-lg font-bold text-cyan-300">{asteroidsInsight.title}</h3>
            </div>
            <div className="space-y-3">
              {asteroidsInsight.insights.map((insight, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="font-medium text-cyan-300 text-sm mb-1">{insight.name}</div>
                  <p className="text-gray-300 text-sm leading-relaxed">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 항성의 축복 (Fixed Stars) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const starsInsight = getFixedStarsInsight(astro, lang);
        if (!starsInsight) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-yellow-900/20 border border-yellow-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{starsInsight.emoji}</span>
              <h3 className="text-lg font-bold text-yellow-300">{starsInsight.title}</h3>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
              <p className="text-gray-300 text-sm leading-relaxed">{starsInsight.message}</p>
            </div>
            {starsInsight.stars.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {starsInsight.stars.map((star, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-medium">
                    {star}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 일식/월식 영향 (Eclipses) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        const eclipsesInsight = getEclipsesInsight(astro, lang);
        if (!eclipsesInsight) return null;
        return (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/20 border border-gray-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{eclipsesInsight.emoji}</span>
              <h3 className="text-lg font-bold text-gray-300">{eclipsesInsight.title}</h3>
            </div>
            <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
              <p className="text-gray-300 text-sm leading-relaxed">{eclipsesInsight.message}</p>
            </div>
          </div>
        );
      })()}

      {/* 푸터 */}
      <p className="text-center text-xs text-gray-500 mt-6">
        {isKo ? "동양+서양 운세 시스템 통합 분석" : "Eastern + Western fortune analysis combined"}
      </p>
    </div>
  );
}
