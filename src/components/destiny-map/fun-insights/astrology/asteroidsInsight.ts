export function getAsteroidsInsight(astro: any, lang: string): { title: string; insights: { name: string; message: string }[]; emoji: string } | null {
  const isKo = lang === "ko";
  const asteroids = astro?.asteroids;
  if (!asteroids || typeof asteroids !== 'object') return null;

  const insights: { name: string; message: string }[] = [];

  // Juno (결혼, 파트너십)
  if (asteroids.juno?.sign) {
    const sign = asteroids.juno.sign.toLowerCase();
    insights.push({
      name: isKo ? "주노 (이상적 파트너)" : "Juno (Ideal Partner)",
      message: isKo
        ? `${sign} 자리에서 파트너에게 ${sign === 'aries' ? '열정과 주도성' : sign === 'taurus' ? '안정과 충실함' : sign === 'gemini' ? '지적 교감' : sign === 'cancer' ? '정서적 유대' : '특별한 자질'}을 원해요.`
        : `In ${sign}, you seek ${sign === 'aries' ? 'passion and initiative' : sign === 'taurus' ? 'stability and loyalty' : sign === 'gemini' ? 'intellectual connection' : sign === 'cancer' ? 'emotional bond' : 'special qualities'} in partners.`
    });
  }

  // Ceres (양육, 돌봄)
  if (asteroids.ceres?.sign) {
    insights.push({
      name: isKo ? "세레스 (돌봄 방식)" : "Ceres (Nurturing Style)",
      message: isKo
        ? "타인을 돌보고 양육하는 특별한 능력이 있어요. 이 에너지로 주변을 따뜻하게 만들어요."
        : "You have a special ability to care for and nurture others. This energy warms your surroundings."
    });
  }

  // Pallas (지혜, 전략)
  if (asteroids.pallas?.sign) {
    insights.push({
      name: isKo ? "팔라스 (지혜)" : "Pallas (Wisdom)",
      message: isKo
        ? "패턴을 보고 전략을 세우는 능력이 뛰어나요. 복잡한 문제를 창의적으로 해결해요."
        : "Excellent at seeing patterns and forming strategies. You solve complex problems creatively."
    });
  }

  // Vesta (헌신, 집중)
  if (asteroids.vesta?.sign) {
    insights.push({
      name: isKo ? "베스타 (헌신)" : "Vesta (Devotion)",
      message: isKo
        ? "중요한 일에 깊이 몰입하는 능력이 있어요. 한 가지에 집중하면 놀라운 성과를 내요."
        : "Ability to deeply immerse in important matters. When focused, you achieve amazing results."
    });
  }

  if (insights.length === 0) return null;

  return {
    title: isKo ? "소행성이 보여주는 특성" : "Asteroid Characteristics",
    insights: insights.slice(0, 4), // 최대 4개
    emoji: "☄️"
  };
}
