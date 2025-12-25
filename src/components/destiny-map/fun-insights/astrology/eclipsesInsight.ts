export function getEclipsesInsight(astro: any, lang: string): { title: string; message: string; emoji: string } | null {
  const isKo = lang === "ko";
  const eclipses = astro?.eclipses;
  if (!eclipses) return null;

  let message = "";
  if (typeof eclipses === 'string') {
    message = eclipses;
  } else if (typeof eclipses === 'object' && eclipses.nextImpact) {
    message = isKo
      ? `다가오는 일식/월식이 당신의 차트에 영향을 줄 거예요. 중요한 변화나 전환점이 될 수 있어요.`
      : `Upcoming eclipses will affect your chart. This could be an important change or turning point.`;
  }

  if (!message) return null;

  return {
    title: isKo ? "일식/월식 영향" : "Eclipse Influence",
    message,
    emoji: "🌑"
  };
}
