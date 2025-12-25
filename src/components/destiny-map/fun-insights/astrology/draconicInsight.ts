export function getDraconicInsight(astro: any, lang: string): { title: string; message: string; emoji: string } | null {
  const isKo = lang === "ko";
  const draconic = astro?.draconic?.comparison;
  if (!draconic) return null;

  // comparison에서 주요 차이점 추출
  let message = "";
  if (typeof draconic === 'string') {
    message = draconic;
  } else if (typeof draconic === 'object' && draconic !== null) {
    // 객체인 경우 텍스트 필드 찾기
    if (typeof draconic.summary === 'string') {
      message = draconic.summary;
    } else if (typeof draconic.soulPurpose === 'string') {
      message = draconic.soulPurpose;
    } else if (typeof draconic.soulIdentity === 'string') {
      message = draconic.soulIdentity;
    } else if (typeof draconic.soulNeeds === 'string') {
      message = draconic.soulNeeds;
    } else {
      // 객체의 값들을 문장으로 조합
      const parts: string[] = [];
      if (draconic.soulPurpose && typeof draconic.soulPurpose === 'string') parts.push(draconic.soulPurpose);
      if (draconic.soulIdentity && typeof draconic.soulIdentity === 'string') parts.push(draconic.soulIdentity);
      if (draconic.soulNeeds && typeof draconic.soulNeeds === 'string') parts.push(draconic.soulNeeds);
      if (parts.length > 0) {
        message = parts.join(' ');
      }
    }
  }

  if (!message) {
    return null;
  }

  return {
    title: isKo ? "영혼의 목적" : "Soul Purpose",
    message,
    emoji: "🌟"
  };
}
