import { findPlanetSign } from '../utils';

export function getLilithInsight(astro: any, lang: string): { title: string; message: string; emoji: string } | null {
  const isKo = lang === "ko";
  const lilith = astro?.extraPoints?.lilith;
  if (!lilith?.sign) return null;

  const sign = lilith.sign.toLowerCase();
  const lilithMessages: Record<string, { ko: string; en: string }> = {
    aries: {
      ko: "독립과 자유에 대한 강한 욕구가 있어요. '나답게 살고 싶다'는 마음을 억누르지 마세요.",
      en: "Strong desire for independence and freedom. Don't suppress your wish to 'live as myself'."
    },
    taurus: {
      ko: "관능적 즐거움과 물질적 풍요에 대한 깊은 갈망이 있어요. 죄책감 없이 누려도 괜찮아요.",
      en: "Deep longing for sensual pleasure and material abundance. It's okay to enjoy without guilt."
    },
    gemini: {
      ko: "금기된 지식, 비밀스러운 것에 매력을 느껴요. 호기심을 억압하지 마세요.",
      en: "Attracted to forbidden knowledge and secrets. Don't suppress your curiosity."
    },
    cancer: {
      ko: "깊은 정서적 연결과 무조건적 사랑에 대한 갈망이 있어요. 의존을 두려워하지 마세요.",
      en: "Longing for deep emotional connection and unconditional love. Don't fear dependency."
    },
    leo: {
      ko: "주목받고 특별해지고 싶은 욕구가 강해요. 그 욕구는 나쁜 게 아니에요.",
      en: "Strong desire to be noticed and special. That desire isn't bad."
    },
    virgo: {
      ko: "완벽함에 대한 집착이 있어요. 때로는 불완전함이 더 아름다울 수 있어요.",
      en: "Obsession with perfection. Sometimes imperfection can be more beautiful."
    },
    libra: {
      ko: "관계 속에서 자아를 잃는 두려움이 있어요. 혼자여도 괜찮다는 걸 기억하세요.",
      en: "Fear of losing yourself in relationships. Remember it's okay to be alone."
    },
    scorpio: {
      ko: "권력과 통제에 대한 은밀한 욕구가 있어요. 이 에너지를 긍정적으로 쓸 수 있어요.",
      en: "Hidden desire for power and control. You can use this energy positively."
    },
    sagittarius: {
      ko: "속박 없는 자유, 제한 없는 탐험을 갈망해요. 책임을 버리고 떠나고 싶은 마음.",
      en: "Craving freedom without constraints, exploration without limits. The wish to leave responsibilities behind."
    },
    capricorn: {
      ko: "성공과 인정에 대한 강렬한 야망이 있어요. 그 야망을 인정하세요.",
      en: "Intense ambition for success and recognition. Acknowledge that ambition."
    },
    aquarius: {
      ko: "세상의 틀을 깨고 싶은 반항심이 있어요. 그 혁명적 에너지를 받아들이세요.",
      en: "Rebellious spirit wanting to break the world's mold. Embrace that revolutionary energy."
    },
    pisces: {
      ko: "현실에서 도피하고 싶은 욕구가 있어요. 때로는 꿈꾸는 것도 필요해요.",
      en: "Desire to escape reality. Sometimes dreaming is necessary too."
    }
  };

  const msg = lilithMessages[sign];
  if (!msg) return null;

  return {
    title: isKo ? "숨겨진 욕망 (Lilith)" : "Hidden Desires (Lilith)",
    message: isKo ? msg.ko : msg.en,
    emoji: "🌒"
  };
}
