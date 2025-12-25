import { findPlanetSign } from '../utils';

export function getChironInsight(astro: any, lang: string): { title: string; message: string; emoji: string } | null {
  const isKo = lang === "ko";
  const chiron = astro?.extraPoints?.chiron;
  if (!chiron?.sign) return null;

  const chironMessages: Record<string, { ko: string; en: string; emoji: string }> = {
    aries: {
      ko: "자신감을 되찾는 것이 치유의 열쇠예요. '나도 할 수 있어'라고 말해보세요.",
      en: "Regaining confidence is key to healing. Try saying 'I can do this'.",
      emoji: "💪"
    },
    taurus: {
      ko: "물질적 안정에 대한 불안을 내려놓으세요. 당신은 이미 충분해요.",
      en: "Let go of material security anxiety. You're already enough.",
      emoji: "🌱"
    },
    gemini: {
      ko: "말로 상처받았다면, 말로 치유할 수 있어요. 진솔한 대화를 시도하세요.",
      en: "If words hurt you, words can heal. Try honest conversation.",
      emoji: "💬"
    },
    cancer: {
      ko: "가족 관계의 상처를 인정하는 것부터 시작하세요. 울어도 괜찮아요.",
      en: "Start by acknowledging family wounds. It's okay to cry.",
      emoji: "🏠"
    },
    leo: {
      ko: "인정받지 못한 아픔이 있나요? 스스로를 먼저 인정해주세요.",
      en: "Feeling unrecognized? Acknowledge yourself first.",
      emoji: "👑"
    },
    virgo: {
      ko: "완벽하지 않아도 괜찮아요. 작은 실수는 당신의 가치를 떨어뜨리지 않아요.",
      en: "Imperfection is okay. Small mistakes don't diminish your worth.",
      emoji: "🌸"
    },
    libra: {
      ko: "관계에서 당신만 희생하지 마세요. '나도 중요해'라고 말할 권리가 있어요.",
      en: "Don't sacrifice only yourself in relationships. You matter too.",
      emoji: "⚖️"
    },
    scorpio: {
      ko: "과거의 배신을 용서하세요. 그 무게에서 자유로워질 자격이 있어요.",
      en: "Forgive past betrayals. You deserve freedom from that weight.",
      emoji: "🦋"
    },
    sagittarius: {
      ko: "신념이 흔들린 적 있나요? 새로운 의미를 찾는 여정을 시작하세요.",
      en: "Faith shaken? Begin the journey to find new meaning.",
      emoji: "🏹"
    },
    capricorn: {
      ko: "성공에 대한 강박을 내려놓으세요. 쉬어도 당신의 가치는 변하지 않아요.",
      en: "Let go of success obsession. Resting doesn't change your value.",
      emoji: "🏔️"
    },
    aquarius: {
      ko: "외로움을 인정하세요. 특별하다는 건 혼자라는 뜻이 아니에요.",
      en: "Acknowledge loneliness. Being special doesn't mean being alone.",
      emoji: "🌌"
    },
    pisces: {
      ko: "경계를 세워도 괜찮아요. 모든 사람을 구원할 필요는 없어요.",
      en: "Setting boundaries is okay. You don't need to save everyone.",
      emoji: "🌊"
    }
  };

  const sign = chiron.sign.toLowerCase();
  const msg = chironMessages[sign];
  if (!msg) return null;

  return {
    title: isKo ? "치유 포인트 (Chiron)" : "Healing Point (Chiron)",
    message: isKo ? msg.ko : msg.en,
    emoji: msg.emoji
  };
}
