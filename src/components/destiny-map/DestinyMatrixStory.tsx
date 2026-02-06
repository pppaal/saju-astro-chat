"use client";

import { memo, useState, useEffect, useMemo, useCallback } from "react";

import type { FiveElement } from "@/lib/Saju/types";
import { STEM_TO_ELEMENT, ELEMENT_KO_TO_EN as ELEMENT_EN } from "@/lib/Saju/constants";
import { getBackendUrl } from "@/lib/backend-url";
import type { SajuData, AstroData, ShinsalItem, PlanetData } from "./fun-insights/types";
import { logger } from "@/lib/logger";

// Import extracted data files
import { STEM_INFO, ZODIAC_INFO, TWELVE_STAGE, SHINSAL_INFO, PLANET_SIGNS } from "./data";

interface Props {
  saju?: SajuData;
  astro?: AstroData;
  lang?: string;
  className?: string;
  useAI?: boolean; // AI 생성 스토리 사용 여부
}

// AI 백엔드 URL
const AI_BACKEND_URL = getBackendUrl();

// 오행 조합 - Element cross analysis
function getElementCross(saju: FiveElement, astro: string, lang: string): string {
  const isKo = lang === "ko";
  const map: Record<string, Record<string, { ko: string; en: string }>> = {
    "목": {
      "fire": { ko: "나무가 불을 만나 더욱 빛나요! 성장과 열정의 시너지.", en: "Wood meets fire and shines brighter! Synergy of growth and passion." },
      "earth": { ko: "나무가 흙에 뿌리내려 안정적으로 성장해요.", en: "Wood roots in earth for stable growth." },
      "air": { ko: "나무가 바람을 만나 씨앗이 멀리 퍼져요.", en: "Wood meets wind, seeds spread far." },
      "water": { ko: "나무가 물을 만나 무럭무럭 자라요!", en: "Wood meets water and grows vigorously!" }
    },
    "화": {
      "fire": { ko: "불이 불을 만나 폭발적으로 타올라요!", en: "Fire meets fire and burns explosively!" },
      "earth": { ko: "불이 흙을 만나 단단한 결과물을 만들어요.", en: "Fire meets earth creating solid results." },
      "air": { ko: "불이 바람을 만나 더 크게 타올라요!", en: "Fire meets wind and burns greater!" },
      "water": { ko: "불과 물의 긴장이 증기처럼 새 에너지를 만들어요.", en: "Fire and water tension creates new energy like steam." }
    },
    "토": {
      "fire": { ko: "흙이 불을 만나 더욱 단단해져요.", en: "Earth meets fire and hardens." },
      "earth": { ko: "흙이 흙을 만나 더욱 견고한 기반이 돼요.", en: "Earth meets earth for stronger foundation." },
      "air": { ko: "흙과 바람이 만나 새로운 가능성이 열려요.", en: "Earth meets wind opening new possibilities." },
      "water": { ko: "흙이 물을 만나 비옥해져요.", en: "Earth meets water becoming fertile." }
    },
    "금": {
      "fire": { ko: "금이 불을 만나 새로운 형태로 태어나요.", en: "Metal meets fire and is reborn in new form." },
      "earth": { ko: "금이 흙에서 나와 가치 있는 결과를 만들어요.", en: "Metal from earth creating valuable results." },
      "air": { ko: "금이 바람에 아름다운 소리를 내요.", en: "Metal rings beautifully in the wind." },
      "water": { ko: "금이 물을 만나 더욱 맑게 빛나요.", en: "Metal meets water shining clearer." }
    },
    "수": {
      "fire": { ko: "물과 불이 만나 증기처럼 새 에너지를 만들어요.", en: "Water and fire create new energy like steam." },
      "earth": { ko: "물이 흙을 적셔 생명이 자라요.", en: "Water moistens earth, life grows." },
      "air": { ko: "물이 증발해 구름이 되듯 감성이 아이디어로 승화해요.", en: "Like water evaporating to clouds, emotions sublimate to ideas." },
      "water": { ko: "물이 물을 만나 더 깊어져요.", en: "Water meets water and deepens." }
    }
  };
  const result = map[saju]?.[astro];
  return result ? (isKo ? result.ko : result.en) : (isKo ? "동양과 서양의 에너지가 만나 독특한 조합을 만들어요." : "Eastern and Western energies create a unique combination.");
}

// 한글 천간 → 한자 변환
const STEM_KO_TO_HANJA: Record<string, string> = {
  "갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊",
  "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸",
  "갑목": "甲", "을목": "乙", "병화": "丙", "정화": "丁", "무토": "戊",
  "기토": "己", "경금": "庚", "신금": "辛", "임수": "壬", "계수": "癸",
};

// 메인 스토리 생성
function generateFullStory(saju: SajuData | undefined, astro: AstroData | undefined, lang: string): string {
  const isKo = lang === "ko";
  const L = (obj: { ko: string; en: string } | undefined) => obj ? (isKo ? obj.ko : obj.en) : "";

  const dayMasterRaw = saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || "甲";
  // 한글이면 한자로 변환
  const dayMasterKey = STEM_KO_TO_HANJA[dayMasterRaw] || dayMasterRaw;
  const sajuElement = STEM_TO_ELEMENT[dayMasterRaw] || "목";
  const stem = STEM_INFO[dayMasterKey] || STEM_INFO["甲"];

  const elements = saju?.elements || saju?.fiveElements || {};
  const balance = { 목: elements.wood || elements.목 || 0, 화: elements.fire || elements.화 || 0, 토: elements.earth || elements.토 || 0, 금: elements.metal || elements.금 || 0, 수: elements.water || elements.수 || 0 };
  const sorted = Object.entries(balance).sort(([,a], [,b]) => b - a);
  const strongest = sorted[0], weakest = sorted[sorted.length - 1];

  const stage = saju?.twelveStage || saju?.twelveStages?.day || "";
  const stageInfo = TWELVE_STAGE[stage];

  const shinsals = saju?.shinsal || saju?.specialStars || [];
  const shinsalList: string[] = Array.isArray(shinsals) ? shinsals.map((s: ShinsalItem | string) => {
    if (typeof s === 'string') {return s;}
    return s?.name || s?.kind || null;
  }).filter((s): s is string => s !== null && s !== undefined) : [];

  const planetsRaw = astro?.planets || [];
  const planets = Array.isArray(planetsRaw) ? planetsRaw : [];
  const getPlanet = (n: string) => planets.find((p: PlanetData) => p?.name?.toLowerCase() === n);
  const sun = getPlanet("sun"), moon = getPlanet("moon"), mercury = getPlanet("mercury"), venus = getPlanet("venus"), mars = getPlanet("mars"), jupiter = getPlanet("jupiter");

  const sunSign = sun?.sign?.toLowerCase() || "aries", moonSign = moon?.sign?.toLowerCase() || "cancer";
  const sunZ = ZODIAC_INFO[sunSign] || ZODIAC_INFO.aries, moonZ = ZODIAC_INFO[moonSign] || ZODIAC_INFO.cancer;
  const mercuryZ = mercury?.sign?.toLowerCase() ? ZODIAC_INFO[mercury.sign.toLowerCase()] : null;
  const venusZ = venus?.sign?.toLowerCase() ? ZODIAC_INFO[venus.sign.toLowerCase()] : null;
  const marsZ = mars?.sign?.toLowerCase() ? ZODIAC_INFO[mars.sign.toLowerCase()] : null;
  const jupiterZ = jupiter?.sign?.toLowerCase() ? ZODIAC_INFO[jupiter.sign.toLowerCase()] : null;
  const ascZ = astro?.ascendant?.sign?.toLowerCase() ? ZODIAC_INFO[astro.ascendant.sign.toLowerCase()] : null;

  const stemName = isKo ? stem.ko : stem.en;
  const sunZName = isKo ? sunZ.ko : sunZ.en, moonZName = isKo ? moonZ.ko : moonZ.en;
  const elementName = isKo ? sajuElement : ELEMENT_EN[sajuElement];
  const strongestName = isKo ? strongest[0] : ELEMENT_EN[strongest[0]], weakestName = isKo ? weakest[0] : ELEMENT_EN[weakest[0]];

  const t = {
    title: isKo ? "당신만을 위한 운명 분석서" : "Your Personal Destiny Analysis",
    intro: isKo ? "이 분석은 사주(동양의 지혜)와 점성술(서양의 지혜)을 교차 분석한 결과입니다. 세상에 오직 당신만을 위해 존재합니다. 이 글을 읽으며 소름이 돋는다면, 그것은 우연이 아니에요." : "This analysis cross-references Saju (Eastern wisdom) and Astrology (Western wisdom). It exists only for you. If you get chills while reading this, it's no coincidence.",
    ch1: isKo ? "제1장: 당신의 본질" : "Chapter 1: Your Essence",
    ch2: isKo ? `제2장: 태양 ${sunZName}` : `Chapter 2: Sun in ${sunZName}`,
    ch3: isKo ? `제3장: 달 ${moonZName}` : `Chapter 3: Moon in ${moonZName}`,
    ch4: isKo ? "제4장: 오행 에너지" : "Chapter 4: Five Elements",
    ch5: isKo ? "제5장: 십이운성" : "Chapter 5: Twelve Stages",
    ch6: isKo ? "제6장: 연애와 관계" : "Chapter 6: Love & Relationships",
    ch7: isKo ? "제7장: 사고방식" : "Chapter 7: Thinking",
    ch8: isKo ? "제8장: 행동력" : "Chapter 8: Action",
    ch9: isKo ? "제9장: 행운" : "Chapter 9: Fortune",
    ch10: isKo ? "제10장: 직업과 인생 패턴" : "Chapter 10: Career & Life Pattern",
    ch11: isKo ? "제11장: 신살 - 특별한 별" : "Chapter 11: Special Stars",
    chChildhood: isKo ? "제12장: 어린 시절의 당신" : "Chapter 12: Your Childhood",
    chShadow: isKo ? "제13장: 그림자 자아" : "Chapter 13: Shadow Self",
    chCrisis: isKo ? "제14장: 위기 대처법" : "Chapter 14: Crisis Response",
    chHealing: isKo ? "제15장: 치유의 길" : "Chapter 15: Path to Healing",
    chFinal: isKo ? "마지막 장: 당신의 운명적 소명" : "Final Chapter: Your Destiny Call",
    dayMaster: isKo ? "일간(日干)" : "Day Master",
    strength: isKo ? "강점" : "Strengths",
    weakness: isKo ? "주의점" : "Points to Watch",
    hidden: isKo ? "숨겨진 당신" : "Hidden Self",
    eastWest: isKo ? "동서양 에너지의 만남" : "Where East Meets West",
    strongestEl: isKo ? "가장 강한 기운" : "Strongest Element",
    weakestEl: isKo ? "보완 필요" : "Needs Balance",
    loveStyle: isKo ? "연애 스타일" : "Love Style",
    career: isKo ? "적성" : "Aptitude",
    lifePattern: isKo ? "인생 패턴" : "Life Pattern",
    remember: isKo ? "기억하세요" : "Remember",
    unique: isKo ? "세상에 단 하나뿐인 조합입니다. 그 자체로 충분히 특별해요." : "You are a one-of-a-kind combination. Special just as you are."
  };

  const strongDesc: Record<string, { ko: string; en: string }> = {
    "목": { ko: "성장, 창의성, 새로운 시작의 에너지가 넘쳐요.", en: "Overflowing with growth, creativity, and new beginning energy." },
    "화": { ko: "열정, 표현력, 사교성의 에너지가 넘쳐요.", en: "Overflowing with passion, expressiveness, and sociability." },
    "토": { ko: "안정, 신뢰, 포용의 에너지가 넘쳐요.", en: "Overflowing with stability, trust, and embracing nature." },
    "금": { ko: "정의, 결단, 세련됨의 에너지가 넘쳐요.", en: "Overflowing with justice, decisiveness, and refinement." },
    "수": { ko: "지혜, 직관, 적응력의 에너지가 넘쳐요.", en: "Overflowing with wisdom, intuition, and adaptability." }
  };

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ${t.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${t.intro}


◈ ${t.ch1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${t.dayMaster}: ${stemName}
${L(stem.nature)}

${L(stem.personality)}

▸ ${t.strength}: ${L(stem.strength)}
▸ ${t.weakness}: ${L(stem.weakness)}
▸ ${t.hidden}: ${L(stem.secretSelf)}


◈ ${t.ch2}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(sunZ.personality)}

▸ ${t.strength}: ${L(sunZ.strength)}
▸ ${L(sunZ.lifeTheme)}

❖ ${t.eastWest} ❖
${stemName} (${elementName}) + ${sunZName} (${sunZ.element})
${getElementCross(sajuElement, sunZ.element, lang)}


◈ ${t.ch3}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(moonZ.personality)}

${getElementCross(sajuElement, moonZ.element, lang)}
${ascZ ? `\n▸ ${isKo ? "첫인상" : "First Impression"}: ${isKo ? ascZ.ko : ascZ.en}` : ""}


◈ ${t.ch4}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wood ████${"░".repeat(5 - Math.min(balance.목, 5))} ${balance.목}
Fire ████${"░".repeat(5 - Math.min(balance.화, 5))} ${balance.화}
Earth ████${"░".repeat(5 - Math.min(balance.토, 5))} ${balance.토}
Metal ████${"░".repeat(5 - Math.min(balance.금, 5))} ${balance.금}
Water ████${"░".repeat(5 - Math.min(balance.수, 5))} ${balance.수}

▸ ${t.strongestEl}: ${strongestName} - ${L(strongDesc[strongest[0]])}
▸ ${t.weakestEl}: ${weakestName}


◈ ${t.ch5}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${stageInfo ? `${L(stageInfo.name)}: ${L(stageInfo.meaning)}\n💡 ${L(stageInfo.lifeAdvice)}` : (isKo ? "독특한 인생 리듬을 가지고 있어요." : "You have a unique life rhythm.")}


◈ ${t.ch6}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ ${stemName}: ${L(stem.loveStyle)}
${venusZ ? `▸ Venus ${isKo ? venusZ.ko : venusZ.en}: ${L(PLANET_SIGNS.venus[venusZ.element])}` : ""}
▸ Moon ${moonZName}: ${L(moonZ.loveStyle)}


◈ ${t.ch7}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mercuryZ ? `Mercury ${isKo ? mercuryZ.ko : mercuryZ.en}: ${L(PLANET_SIGNS.mercury[mercuryZ.element])}` : ""}


◈ ${t.ch8}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${marsZ ? `Mars ${isKo ? marsZ.ko : marsZ.en}: ${L(PLANET_SIGNS.mars[marsZ.element])}` : ""}


◈ ${t.ch9}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${jupiterZ ? `Jupiter ${isKo ? jupiterZ.ko : jupiterZ.en}: ${L(PLANET_SIGNS.jupiter[jupiterZ.element])}` : ""}


◈ ${t.ch10}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ ${t.career}: ${L(stem.careerFit)}
▸ ${t.lifePattern}: ${L(stem.lifePattern)}


◈ ${t.ch11}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${shinsalList.length > 0 ? shinsalList.map((s: string) => {
  const info = SHINSAL_INFO[s];
  return info ? `▸ ${isKo ? info.ko : info.en}: ${L(info.meaning)}\n  💡 ${L(info.advice)}` : `▸ ${s}`;
}).join("\n\n") : (isKo ? "특별한 신살 없음. 자유롭게 길을 개척하세요." : "No special stars. Forge your own path freely.")}


◈ ${t.chChildhood}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.childhood)}

${isKo ? "이 시절의 경험이 지금의 당신을 만들었어요. 그때의 작은 아이에게 '괜찮아, 잘 해낼 거야'라고 말해주세요." : "These early experiences shaped who you are now. Tell that little child from back then, 'It's okay, you'll do great.'"}


◈ ${t.chShadow}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.shadowSelf)}

${isKo ? "그림자는 적이 아니에요. 인정하고 포용할 때, 그것은 당신의 힘이 됩니다." : "The shadow is not your enemy. When you acknowledge and embrace it, it becomes your strength."}


◈ ${t.chCrisis}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.crisis)}

${isKo ? "힘든 순간에 이 문장을 기억하세요: '이것도 지나갈 것이다.'" : "In difficult moments, remember this: 'This too shall pass.'"}


◈ ${t.chHealing}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${L(stem.healing)}

${isKo ? "자신을 돌보는 것은 이기적인 게 아니에요. 가득 찬 컵만이 다른 사람에게 줄 수 있어요." : "Taking care of yourself isn't selfish. Only a full cup can give to others."}


◈ ${t.chFinal}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${stemName} + ${sunZName} + ${moonZName}

${L(stem.destinyCall)}

${isKo ? `당신은 ${stemName}의 본질과 ${sunZName}의 빛, ${moonZName}의 감성을 가지고 이 세상에 태어났어요. 이 조합은 우주에서 단 하나뿐이에요.` : `You were born into this world with the essence of ${stemName}, the light of ${sunZName}, and the sensitivity of ${moonZName}. This combination is the only one in the universe.`}

★ ${t.remember} ★
${t.unique}

${isKo ? "당신의 존재 자체가 기적이에요. ✨" : "Your very existence is a miracle. ✨"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

const DestinyMatrixStory = memo(function DestinyMatrixStory({ saju, astro, lang = "ko", className = "", useAI = false }: Props) {
  const isKo = lang === "ko";

  // AI 스트리밍 상태
  const [aiStory, setAiStory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [totalLength, setTotalLength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 정적 스토리 (AI가 아닌 경우)
  const staticStory = useMemo(() => generateFullStory(saju, astro, lang), [saju, astro, lang]);

  // AI 스토리 생성 함수
  const generateAIStory = useCallback(async () => {
    logger.info("[DestinyMatrixStory] generateAIStory called", { saju, astro, lang });

    if (!saju || !astro) {
      logger.warn("[DestinyMatrixStory] Missing data:", { hasSaju: !!saju, hasAstro: !!astro });
      return;
    }

    setIsLoading(true);
    setAiStory("");
    setCurrentChapter(0);
    setError(null);

    try {
      const response = await fetch(`${AI_BACKEND_URL}/api/destiny-story/generate-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saju,
          astro,
          locale: lang
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const isKoLang = lang === "ko";
          throw new Error(isKoLang
            ? "요청이 너무 많습니다. 30초 후 다시 시도해주세요."
            : "Too many requests. Please wait 30 seconds and try again.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {throw new Error("No reader available");}

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {break;}

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setError(data.error);
                break;
              }

              if (data.content) {
                setAiStory(prev => prev + data.content);
              }

              if (data.chapter) {
                setCurrentChapter(data.chapter);
              }

              if (data.status === "done") {
                setTotalLength(data.total_length || 0);
              }
            } catch {
              // JSON parse error, skip
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 스토리 생성 실패");
    } finally {
      setIsLoading(false);
    }
  }, [saju, astro, lang]);

  // AI 모드일 때 자동으로 스토리 생성
  useEffect(() => {
    logger.debug("[DestinyMatrixStory] useEffect check:", {
      useAI,
      hasSaju: !!saju,
      hasAstro: !!astro,
      sajuKeys: saju ? Object.keys(saju) : [],
      astroKeys: astro ? Object.keys(astro) : [],
      aiStoryLen: aiStory.length,
      isLoading
    });

    if (useAI && saju && astro && !aiStory && !isLoading) {
      logger.info("[DestinyMatrixStory] Calling generateAIStory...");
      generateAIStory();
    }
  }, [useAI, saju, astro, aiStory, isLoading, generateAIStory]);

  // 표시할 스토리 선택
  const displayStory = useAI ? aiStory : staticStory;

  if (!useAI && !staticStory) {return null;}

  return (
    <div className={`mt-8 ${className}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        <span className="text-purple-400 text-sm font-medium">
          {isKo ? "당신만을 위한 운명 이야기" : "Your Personal Destiny Story"}
          {useAI && <span className="ml-2 text-xs text-purple-300/70">✨ AI Generated</span>}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      {/* AI 로딩 상태 표시 */}
      {useAI && isLoading && (
        <div className="mb-4 flex items-center gap-3 text-purple-300">
          <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">
            {isKo
              ? `AI가 당신만의 운명 이야기를 작성 중... (챕터 ${currentChapter}/15)`
              : `AI is writing your destiny story... (Chapter ${currentChapter}/15)`
            }
          </span>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
          <button
            onClick={generateAIStory}
            className="ml-4 underline hover:text-red-200"
          >
            {isKo ? "다시 시도" : "Retry"}
          </button>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-900/80 to-purple-900/30 border border-purple-500/20 rounded-2xl p-6 md:p-8">
        {displayStory ? (
          <pre className="text-gray-200 text-base whitespace-pre-wrap font-sans leading-relaxed tracking-wide">
            {displayStory}
          </pre>
        ) : useAI && !isLoading && !error ? (
          <div className="text-center py-8">
            <button
              onClick={generateAIStory}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              {isKo ? "✨ AI 운명 스토리 생성하기" : "✨ Generate AI Destiny Story"}
            </button>
          </div>
        ) : null}
      </div>

      {/* 완료 후 글자 수 표시 */}
      {useAI && totalLength > 0 && !isLoading && (
        <div className="mt-4 text-center text-purple-400/60 text-xs">
          {isKo
            ? `총 ${totalLength.toLocaleString()}자의 운명 분석이 완성되었습니다.`
            : `Your ${totalLength.toLocaleString()} character destiny analysis is complete.`
          }
        </div>
      )}
    </div>
  );
});

export default DestinyMatrixStory;
