export const zodiacData: Record<string, {
  ko: string; en: string; emoji: string; element: string;
  trait: { ko: string; en: string };
}> = {
  aries: { ko: "양자리", en: "Aries", emoji: "♈", element: "fire",
    trait: { ko: "용감하고 선구적", en: "Brave and pioneering" } },
  taurus: { ko: "황소자리", en: "Taurus", emoji: "♉", element: "earth",
    trait: { ko: "안정적이고 감각적", en: "Stable and sensual" } },
  gemini: { ko: "쌍둥이자리", en: "Gemini", emoji: "♊", element: "air",
    trait: { ko: "다재다능하고 소통적", en: "Versatile and communicative" } },
  cancer: { ko: "게자리", en: "Cancer", emoji: "♋", element: "water",
    trait: { ko: "감성적이고 보호적", en: "Emotional and protective" } },
  leo: { ko: "사자자리", en: "Leo", emoji: "♌", element: "fire",
    trait: { ko: "자신감 있고 창조적", en: "Confident and creative" } },
  virgo: { ko: "처녀자리", en: "Virgo", emoji: "♍", element: "earth",
    trait: { ko: "분석적이고 실용적", en: "Analytical and practical" } },
  libra: { ko: "천칭자리", en: "Libra", emoji: "♎", element: "air",
    trait: { ko: "조화롭고 외교적", en: "Harmonious and diplomatic" } },
  scorpio: { ko: "전갈자리", en: "Scorpio", emoji: "♏", element: "water",
    trait: { ko: "강렬하고 통찰력 있는", en: "Intense and insightful" } },
  sagittarius: { ko: "궁수자리", en: "Sagittarius", emoji: "♐", element: "fire",
    trait: { ko: "낙관적이고 모험적", en: "Optimistic and adventurous" } },
  capricorn: { ko: "염소자리", en: "Capricorn", emoji: "♑", element: "earth",
    trait: { ko: "야심차고 책임감 있는", en: "Ambitious and responsible" } },
  aquarius: { ko: "물병자리", en: "Aquarius", emoji: "♒", element: "air",
    trait: { ko: "독창적이고 인도주의적", en: "Original and humanitarian" } },
  pisces: { ko: "물고기자리", en: "Pisces", emoji: "♓", element: "water",
    trait: { ko: "직관적이고 공감적", en: "Intuitive and empathetic" } },
};
