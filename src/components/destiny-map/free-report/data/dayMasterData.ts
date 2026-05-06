export const dayMasterData: Record<string, {
  ko: string; en: string; animal: string; element: string; hanja: string;
  personality: { ko: string; en: string };
  strength: { ko: string; en: string };
  weakness: { ko: string; en: string };
  career: { ko: string[]; en: string[] };
  relationship: { ko: string; en: string };
  health: { ko: string; en: string };
}> = {
  "갑": {
    ko: "갑목", en: "Gab Wood", animal: "🦁", element: "wood", hanja: "甲",
    personality: { ko: "큰 나무처럼 듬직하고 정직한 리더형", en: "Honest leader like a mighty tree" },
    strength: { ko: "추진력, 결단력, 책임감", en: "Drive, decisiveness, responsibility" },
    weakness: { ko: "고집, 융통성 부족", en: "Stubbornness, inflexibility" },
    career: { ko: ["경영자", "CEO", "정치인", "창업가"], en: ["Executive", "CEO", "Politician", "Entrepreneur"] },
    relationship: { ko: "주도적이고 보호하려는 성향", en: "Proactive and protective" },
    health: { ko: "간, 담, 눈 건강에 주의", en: "Watch liver, gallbladder, eyes" }
  },
  "을": {
    ko: "을목", en: "Eul Wood", animal: "🦊", element: "wood", hanja: "乙",
    personality: { ko: "덩굴처럼 유연하고 적응력 있는 타입", en: "Flexible and adaptive like a vine" },
    strength: { ko: "적응력, 인내심, 부드러움", en: "Adaptability, patience, gentleness" },
    weakness: { ko: "우유부단, 의존적", en: "Indecisive, dependent" },
    career: { ko: ["디자이너", "예술가", "상담사", "교육자"], en: ["Designer", "Artist", "Counselor", "Educator"] },
    relationship: { ko: "배려심 깊고 헌신적", en: "Caring and devoted" },
    health: { ko: "근육, 신경계 관리 필요", en: "Watch muscles, nervous system" }
  },
  "병": {
    ko: "병화", en: "Byung Fire", animal: "🦅", element: "fire", hanja: "丙",
    personality: { ko: "태양처럼 밝고 열정적인 타입", en: "Bright and passionate like the sun" },
    strength: { ko: "열정, 낙천성, 카리스마", en: "Passion, optimism, charisma" },
    weakness: { ko: "성급함, 산만함", en: "Impatience, scattered focus" },
    career: { ko: ["연예인", "MC", "마케터", "영업"], en: ["Entertainer", "MC", "Marketer", "Sales"] },
    relationship: { ko: "정열적이고 표현이 풍부", en: "Passionate and expressive" },
    health: { ko: "심장, 혈압, 눈 건강 관리", en: "Watch heart, blood pressure, eyes" }
  },
  "정": {
    ko: "정화", en: "Jung Fire", animal: "🦋", element: "fire", hanja: "丁",
    personality: { ko: "촛불처럼 따뜻하고 섬세한 타입", en: "Warm and delicate like candlelight" },
    strength: { ko: "세심함, 예술성, 배려", en: "Attentiveness, artistry, caring" },
    weakness: { ko: "예민함, 걱정 많음", en: "Sensitivity, worry" },
    career: { ko: ["아티스트", "요리사", "심리상담사", "작가"], en: ["Artist", "Chef", "Counselor", "Writer"] },
    relationship: { ko: "감성적이고 로맨틱", en: "Emotional and romantic" },
    health: { ko: "심장, 소장 기능 주의", en: "Watch heart, small intestine" }
  },
  "무": {
    ko: "무토", en: "Mu Earth", animal: "🐻", element: "earth", hanja: "戊",
    personality: { ko: "산처럼 묵직하고 신뢰감 있는 타입", en: "Reliable and steady like a mountain" },
    strength: { ko: "안정감, 포용력, 신뢰", en: "Stability, embrace, trust" },
    weakness: { ko: "고집, 변화 거부", en: "Stubbornness, resistance to change" },
    career: { ko: ["부동산", "건설", "금융", "공무원"], en: ["Real Estate", "Construction", "Finance", "Public Service"] },
    relationship: { ko: "든든하고 믿음직스러움", en: "Reliable and trustworthy" },
    health: { ko: "위장, 비장, 소화기 관리", en: "Watch stomach, spleen, digestion" }
  },
  "기": {
    ko: "기토", en: "Gi Earth", animal: "🐘", element: "earth", hanja: "己",
    personality: { ko: "평야처럼 넓고 포용적인 타입", en: "Broad and nurturing like plains" },
    strength: { ko: "배려심, 중재력, 실용성", en: "Caring, mediation, practicality" },
    weakness: { ko: "우유부단, 자기주장 부족", en: "Indecisive, lack of assertiveness" },
    career: { ko: ["컨설턴트", "HR", "농업", "요식업"], en: ["Consultant", "HR", "Agriculture", "Food Service"] },
    relationship: { ko: "포용력 있고 희생적", en: "Embracing and sacrificial" },
    health: { ko: "당뇨, 비만, 소화기 주의", en: "Watch diabetes, obesity, digestion" }
  },
  "경": {
    ko: "경금", en: "Gyung Metal", animal: "🦈", element: "metal", hanja: "庚",
    personality: { ko: "칼처럼 날카롭고 결단력 있는 타입", en: "Sharp and decisive like a blade" },
    strength: { ko: "결단력, 정의감, 실행력", en: "Decisiveness, justice, execution" },
    weakness: { ko: "냉정함, 타협 어려움", en: "Coldness, difficulty compromising" },
    career: { ko: ["군인", "경찰", "변호사", "외과의사"], en: ["Military", "Police", "Lawyer", "Surgeon"] },
    relationship: { ko: "직선적이고 솔직함", en: "Straightforward and honest" },
    health: { ko: "폐, 대장, 피부 관리", en: "Watch lungs, large intestine, skin" }
  },
  "신": {
    ko: "신금", en: "Shin Metal", animal: "🦚", element: "metal", hanja: "辛",
    personality: { ko: "다이아몬드처럼 단단하면서도 빛나는 사람. 섬세한 감각으로 평범한 것을 특별하게 만드는 재능이 있어요", en: "Hard yet brilliant like a diamond. You have the gift to make ordinary things extraordinary with refined senses" },
    strength: { ko: "심미안, 완벽주의, 매력", en: "Aesthetic sense, perfectionism, charm" },
    weakness: { ko: "까다로움, 비판적", en: "Picky, critical" },
    career: { ko: ["주얼리 디자이너", "금융 전문가", "감정사", "뷰티"], en: ["Jewelry Designer", "Financial Expert", "Appraiser", "Beauty"] },
    relationship: { ko: "까다롭지만 깊은 애정", en: "Picky but deep affection" },
    health: { ko: "호흡기, 피부 알레르기 주의", en: "Watch respiratory & skin allergies" }
  },
  "임": {
    ko: "임수", en: "Im Water", animal: "🐋", element: "water", hanja: "壬",
    personality: { ko: "바다처럼 깊고 지혜로운 타입", en: "Deep and wise like the ocean" },
    strength: { ko: "지혜, 포용력, 직관", en: "Wisdom, embrace, intuition" },
    weakness: { ko: "우울함, 감정 기복", en: "Melancholy, mood swings" },
    career: { ko: ["연구원", "철학자", "무역상", "IT 개발자"], en: ["Researcher", "Philosopher", "Trader", "IT Developer"] },
    relationship: { ko: "깊이 있는 사랑, 신비로움", en: "Deep love, mysterious" },
    health: { ko: "신장, 방광, 생식기 관리", en: "Watch kidneys, bladder, reproductive organs" }
  },
  "계": {
    ko: "계수", en: "Gye Water", animal: "🦢", element: "water", hanja: "癸",
    personality: { ko: "시냇물처럼 맑고 순수한 타입", en: "Pure and clear like a stream" },
    strength: { ko: "순수함, 섬세함, 창의성", en: "Purity, delicacy, creativity" },
    weakness: { ko: "예민함, 소극적", en: "Sensitivity, passiveness" },
    career: { ko: ["예술가", "명상가", "학자", "점술가"], en: ["Artist", "Meditator", "Scholar", "Fortune Teller"] },
    relationship: { ko: "순수하고 감성적", en: "Pure and emotional" },
    health: { ko: "신장, 귀, 뼈 건강 주의", en: "Watch kidneys, ears, bones" }
  },
};
