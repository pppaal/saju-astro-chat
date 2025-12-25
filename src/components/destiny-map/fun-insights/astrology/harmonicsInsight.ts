export function getHarmonicsInsight(astro: any, lang: string): { title: string; talents: string[]; emoji: string } | null {
  const isKo = lang === "ko";
  const harmonics = astro?.harmonics?.profile;
  if (!harmonics || !Array.isArray(harmonics)) return null;

  const talents: string[] = [];

  // 하모닉별 재능 해석
  harmonics.forEach((h: any) => {
    if (!h.harmonic || !h.emphasis) return;

    const harmonicTalents: Record<number, { ko: string; en: string }> = {
      4: { ko: "구조를 만드는 재능 (조직, 시스템)", en: "Building structures (organization, systems)" },
      5: { ko: "창의적 표현 재능 (예술, 혁신)", en: "Creative expression (art, innovation)" },
      7: { ko: "영적 통찰 재능 (직관, 치유)", en: "Spiritual insight (intuition, healing)" },
      9: { ko: "완성과 마무리 재능 (완벽, 통합)", en: "Completion & perfection (mastery, integration)" }
    };

    const talent = harmonicTalents[h.harmonic];
    if (talent) {
      talents.push(isKo ? talent.ko : talent.en);
    }
  });

  if (talents.length === 0) return null;

  return {
    title: isKo ? "숨겨진 재능" : "Hidden Talents",
    talents,
    emoji: "💎"
  };
}
