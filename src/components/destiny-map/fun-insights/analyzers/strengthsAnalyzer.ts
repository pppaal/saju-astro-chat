import { elementTraits, elementKeyMap } from '../data';

export function getStrengthsAndWeaknesses(saju: any, astro: any, lang: string): {
  strengths: { text: string; source: string }[];
  weaknesses: { text: string; source: string; advice: string }[];
} | null {
  const isKo = lang === "ko";
  const strengths: { text: string; source: string }[] = [];
  const weaknesses: { text: string; source: string; advice: string }[] = [];

  // 사주 오행 분석
  const fiveElements = saju?.fiveElements;
  if (fiveElements) {
    const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (b as number) - (a as number));
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    if (strongest && typeof strongest[1] === 'number') {
      const element = strongest[0];
      const strengthMap: Record<string, { ko: string; en: string }> = {
        wood: {
          ko: "성장 에너지가 강해요. 새로운 일을 시작하고 발전시키는 힘이 뛰어나며, 창의적인 아이디어로 혁신을 만들어내는 능력이 있습니다. 막히지 않고 계속 앞으로 나아가는 추진력이 있어요.",
          en: "Strong growth energy. You excel at starting and developing new things with creative ideas for innovation. You have the drive to keep moving forward without getting stuck."
        },
        fire: {
          ko: "열정과 추진력이 뛰어나요. 사람들을 자연스럽게 이끌고 동기부여하는 카리스마가 있습니다. 어떤 일이든 열정적으로 임하고, 주변을 밝고 긍정적으로 만드는 에너지가 있어요.",
          en: "Exceptional passion and drive. You have natural charisma to lead and motivate others. You approach everything with enthusiasm and create bright, positive energy around you."
        },
        earth: {
          ko: "안정성과 신뢰감이 강해요. 현실적이고 책임감 있게 일을 마무리하며, 사람들이 당신을 믿고 의지할 수 있습니다. 흔들리지 않는 중심을 가지고 있어 위기 상황에서도 침착함을 유지해요.",
          en: "Strong stability and reliability. You're practical and responsible in completing tasks, making you someone people can trust and depend on. You maintain composure even in crises with your unwavering center."
        },
        metal: {
          ko: "정확성과 집중력이 뛰어나요. 본질을 빠르게 파악하고 논리적으로 구조화하는 분석 능력이 있습니다. 불필요한 것을 과감히 제거하고 핵심에 집중하는 결단력이 있어요.",
          en: "Excellent precision and focus. You have analytical ability to quickly grasp essence and logically structure information. You show decisiveness in removing unnecessary elements and focusing on core matters."
        },
        water: {
          ko: "직관과 적응력이 강해요. 상황의 흐름을 읽고 유연하게 대처하는 지혜가 있으며, 다양한 환경에서 자연스럽게 적응합니다. 보이지 않는 것을 감지하는 예리한 감각이 있어요.",
          en: "Strong intuition and adaptability. You have wisdom to read situations and respond flexibly, adapting naturally to various environments. You possess sharp senses to detect what's invisible."
        }
      };
      const strength = strengthMap[element];
      if (strength) {
        strengths.push({
          text: isKo ? strength.ko : strength.en,
          source: isKo ? "사주" : "Saju"
        });
      }
    }

    if (weakest && typeof weakest[1] === 'number') {
      const element = weakest[0];
      const weaknessMap: Record<string, { ko: { text: string; advice: string }; en: { text: string; advice: string } }> = {
        wood: {
          ko: {
            text: "새로운 시작이나 변화에 부담을 느낄 수 있어요. 계획은 잘 세우지만 막상 첫 발을 내딛기가 어렵거나, 시작했다가도 중간에 포기하는 경향이 있을 수 있습니다.",
            advice: "매일 아침 산책하며 새로운 루트 시도하기, 작은 식물 키우며 성장 관찰하기, 자기계발 서적으로 동기 부여받기를 추천해요."
          },
          en: {
            text: "You may feel burdened by new beginnings or changes. While good at planning, taking the first step can be difficult, or you might give up midway.",
            advice: "Try new morning walk routes daily, grow small plants to observe growth, and get motivated by self-development books."
          }
        },
        fire: {
          ko: {
            text: "열정이나 동기부여가 쉽게 식을 수 있어요. 일에 대한 흥미를 오래 유지하기 어렵거나, 사람들 앞에서 자신감 있게 표현하는 것이 부담스러울 수 있습니다.",
            advice: "매일 30분 운동으로 에너지 충전하기, 적극적으로 사람 만나고 대화하기, 햇빛 쬐며 야외 활동 늘리기를 추천해요."
          },
          en: {
            text: "Your passion and motivation may cool easily. Maintaining interest in tasks for long periods can be challenging, or expressing yourself confidently in front of others may feel burdensome.",
            advice: "Charge energy with 30 min daily exercise, actively meet and talk with people, and increase outdoor activities in sunlight."
          }
        },
        earth: {
          ko: {
            text: "심리적 안정감이 부족하거나 불안해지기 쉬워요. 일관성을 유지하기 어렵거나, 계획 없이 즉흥적으로 행동해서 나중에 후회하는 일이 생길 수 있습니다.",
            advice: "규칙적인 생활 패턴 만들기, 주말 등산으로 땅의 기운 받기, 저녁 명상으로 마음 가라앉히기를 추천해요."
          },
          en: {
            text: "You may lack psychological stability or become anxious easily. Maintaining consistency can be difficult, or acting impulsively without planning may lead to regrets.",
            advice: "Create regular life patterns, receive earth energy through weekend hiking, and calm your mind with evening meditation."
          }
        },
        metal: {
          ko: {
            text: "집중력이 흐트러지거나 우선순위를 정하기 어려워요. 여러 일을 동시에 하다 보면 정작 중요한 것을 놓치거나, 결단력이 부족해 결정을 미루는 경향이 있을 수 있습니다.",
            advice: "책상과 주변 정리정돈하기, 할 일 목록 체계적으로 구조화하기, 호흡 명상으로 정신 집중력 키우기를 추천해요."
          },
          en: {
            text: "Your focus may scatter or prioritizing can be difficult. Juggling multiple tasks simultaneously might cause you to miss what's truly important, or lack of decisiveness may lead to procrastination.",
            advice: "Organize desk and surroundings, systematically structure to-do lists, and build mental focus through breathing meditation."
          }
        },
        water: {
          ko: {
            text: "유연성이 부족하고 고집스러울 수 있어요. 상황 변화에 빠르게 적응하지 못하거나, 타인의 감정을 읽는 것이 어려워 관계에서 오해가 생길 수 있습니다.",
            advice: "충분한 수면과 휴식 취하기, 하루 8잔 이상 물 마시기, 조용한 시간 갖고 내면 성찰하기를 추천해요."
          },
          en: {
            text: "You may lack flexibility and be stubborn. Adapting quickly to changing situations can be difficult, or reading others' emotions may be challenging, leading to misunderstandings in relationships.",
            advice: "Get sufficient sleep and rest, drink 8+ glasses of water daily, and have quiet time for inner reflection."
          }
        }
      };
      const weakness = weaknessMap[element];
      if (weakness) {
        const msg = isKo ? weakness.ko : weakness.en;
        weaknesses.push({
          text: msg.text,
          source: isKo ? "사주" : "Saju",
          advice: msg.advice
        });
      }
    }
  }

  // 점성술 강점 - 좋은 aspect 찾기
  const aspects = astro?.aspects;
  if (Array.isArray(aspects)) {
    const trineOrSextile = aspects.filter((a: any) =>
      (a.aspect === 'Trine' || a.aspect === 'Sextile') && a.orb < 3
    );
    if (trineOrSextile.length > 0) {
      const aspectCount = trineOrSextile.length;
      strengths.push({
        text: isKo
          ? `조화로운 행성 배치(${aspectCount}개)로 재능이 자연스럽게 발휘돼요.`
          : `Harmonious planetary aspects (${aspectCount}) help talents flow naturally.`,
        source: isKo ? "점성술" : "Astrology"
      });
    }
  }

  // 점성술 약점 - 어려운 aspect 찾기
  if (Array.isArray(aspects)) {
    const squareOrOpposition = aspects.filter((a: any) =>
      (a.aspect === 'Square' || a.aspect === 'Opposition') && a.orb < 3
    );
    if (squareOrOpposition.length >= 3) {
      weaknesses.push({
        text: isKo
          ? `긴장 관계 행성들이 있어 내적 갈등을 느낄 수 있어요.`
          : `Tense planetary aspects may create internal conflicts.`,
        source: isKo ? "점성술" : "Astrology",
        advice: isKo
          ? "이 긴장이 오히려 성장의 동력이 될 수 있어요. 갈등을 인정하고 균형을 찾으세요."
          : "This tension can be a catalyst for growth. Acknowledge conflicts and find balance."
      });
    }
  }

  if (strengths.length === 0 && weaknesses.length === 0) return null;

  return { strengths, weaknesses };
}
