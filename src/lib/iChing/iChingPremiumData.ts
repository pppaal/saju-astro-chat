/**
 * I Ching Premium Data - 64괘 프리미엄 해석 데이터
 * 더 풍부한 해석을 위한 core_meaning, themes 포함
 */

export interface HexagramThemes {
  career: { ko: string; en: string };
  love: { ko: string; en: string };
  health: { ko: string; en: string };
  wealth: { ko: string; en: string };
  timing: { ko: string; en: string };
}

export interface LuckyInfo {
  colors: { ko: string[]; en: string[] };
  numbers: number[];
  direction: { ko: string; en: string };
}

export interface PremiumHexagramData {
  number: number;
  name_ko: string;
  name_hanja: string;
  trigram_upper: string;
  trigram_lower: string;
  element: string;
  core_meaning: { ko: string; en: string };
  themes: HexagramThemes;
  lucky?: LuckyInfo;
}

// 팔괘(8 Trigrams) 정보
export interface TrigramInfo {
  symbol: string;
  name_ko: string;
  name_en: string;
  meaning_ko: string;
  meaning_en: string;
  element: string;
}

export const TRIGRAM_INFO: Record<string, TrigramInfo> = {
  heaven: { symbol: '☰', name_ko: '건(乾)', name_en: 'Heaven', meaning_ko: '하늘, 창조, 강건함', meaning_en: 'Sky, creation, strength', element: '금(Metal)' },
  earth: { symbol: '☷', name_ko: '곤(坤)', name_en: 'Earth', meaning_ko: '땅, 수용, 유순함', meaning_en: 'Earth, receptivity, gentleness', element: '토(Earth)' },
  thunder: { symbol: '☳', name_ko: '진(震)', name_en: 'Thunder', meaning_ko: '우레, 움직임, 시작', meaning_en: 'Thunder, movement, beginning', element: '목(Wood)' },
  water: { symbol: '☵', name_ko: '감(坎)', name_en: 'Water', meaning_ko: '물, 위험, 지혜', meaning_en: 'Water, danger, wisdom', element: '수(Water)' },
  mountain: { symbol: '☶', name_ko: '간(艮)', name_en: 'Mountain', meaning_ko: '산, 멈춤, 명상', meaning_en: 'Mountain, stillness, meditation', element: '토(Earth)' },
  wind: { symbol: '☴', name_ko: '손(巽)', name_en: 'Wind', meaning_ko: '바람, 침투, 유연함', meaning_en: 'Wind, penetration, flexibility', element: '목(Wood)' },
  fire: { symbol: '☲', name_ko: '리(離)', name_en: 'Fire', meaning_ko: '불, 밝음, 집착', meaning_en: 'Fire, brightness, attachment', element: '화(Fire)' },
  lake: { symbol: '☱', name_ko: '태(兌)', name_en: 'Lake', meaning_ko: '연못, 기쁨, 소통', meaning_en: 'Lake, joy, communication', element: '금(Metal)' },
};

// 64괘 프리미엄 데이터
export const PREMIUM_HEXAGRAM_DATA: Record<number, PremiumHexagramData> = {
  1: {
    number: 1, name_ko: '건괘(乾卦) - 하늘', name_hanja: '乾為天', trigram_upper: 'heaven', trigram_lower: 'heaven', element: 'metal',
    core_meaning: { ko: '순수한 양(陽)의 기운. 창조적 힘, 리더십, 강건함을 상징합니다. 하늘이 쉬지 않고 움직이듯, 끊임없는 자기 발전과 성장을 의미합니다.', en: 'Pure yang energy. Symbolizes creative power, leadership, and strength.' },
    themes: {
      career: { ko: '리더십을 발휘할 때입니다. 새로운 프로젝트 시작이나 승진 기회가 있습니다.', en: 'Time to exercise leadership.' },
      love: { ko: '적극적으로 다가가면 좋은 인연을 만납니다. 주도적이되 상대 존중이 필요합니다.', en: 'Active approach leads to good relationships.' },
      health: { ko: '에너지가 넘치지만 과로 주의. 심장, 머리 관련 건강에 신경 쓰세요.', en: 'High energy but beware of overwork.' },
      wealth: { ko: '재정적으로 좋은 흐름. 투자나 사업에서 이익 가능하나 탐욕 경계.', en: 'Favorable financial flow.' },
      timing: { ko: '봄과 여름에 특히 좋습니다. 오전 시간대 활동 권장.', en: 'Especially favorable in spring and summer.' },
    },
  },
  2: {
    number: 2, name_ko: '곤괘(坤卦) - 땅', name_hanja: '坤為地', trigram_upper: 'earth', trigram_lower: 'earth', element: 'earth',
    core_meaning: { ko: '순수한 음(陰)의 기운. 수용성, 온유함, 지구력을 상징합니다. 땅이 만물을 품듯, 겸손하게 받아들이는 덕.', en: 'Pure yin energy. Symbolizes receptivity, gentleness, and endurance.' },
    themes: {
      career: { ko: '주도하기보다 지원하는 역할이 좋습니다. 팀워크 중시, 인내심 필요.', en: 'Supportive role better than leading.' },
      love: { ko: '상대방을 받아들이고 이해하는 것이 중요합니다. 헌신이 보상받는 시기.', en: 'Accepting and understanding partner is important.' },
      health: { ko: '소화기 계통에 신경 쓰세요. 충분한 휴식과 규칙적 식사 중요.', en: 'Pay attention to digestive system.' },
      wealth: { ko: '보수적 재정 관리 권장. 저축과 안정적 수입에 집중.', en: 'Conservative financial management recommended.' },
      timing: { ko: '가을과 겨울에 특히 좋습니다. 오후 시간대 활동 권장.', en: 'Especially favorable in autumn and winter.' },
    },
  },
  3: {
    number: 3, name_ko: '준괘(屯卦) - 어려운 시작', name_hanja: '水雷屯', trigram_upper: 'water', trigram_lower: 'thunder', element: 'water',
    core_meaning: { ko: '새싹이 땅을 뚫고 나오는 어려움. 시작은 힘들지만 인내하면 성장합니다.', en: 'Difficulty of a sprout breaking through earth.' },
    themes: {
      career: { ko: '초기 어려움이 있지만 포기하지 마세요. 멘토나 조력자를 구하세요.', en: 'Initial difficulties exist but don\'t give up.' },
      love: { ko: '시작이 어색하고 힘들 수 있습니다. 서두르지 말고 천천히 관계를 발전시키세요.', en: 'Beginning may be awkward.' },
      health: { ko: '새로운 건강 루틴 시작시 어려움 예상. 꾸준함이 중요합니다.', en: 'Difficulties when starting new health routines.' },
      wealth: { ko: '재정적 시작이 힘들 수 있습니다. 소규모로 시작해 점진적으로 확장.', en: 'Financial start may be difficult.' },
      timing: { ko: '봄에 해당. 새로운 시작의 시기이나 인내 필요.', en: 'Corresponds to spring.' },
    },
  },
  4: {
    number: 4, name_ko: '몽괘(蒙卦) - 어리석음', name_hanja: '山水蒙', trigram_upper: 'mountain', trigram_lower: 'water', element: 'earth',
    core_meaning: { ko: '어린아이의 무지함. 배움의 필요성을 나타냅니다. 겸손하게 가르침을 구하면 발전합니다.', en: 'Youthful ignorance. Indicates need for learning.' },
    themes: {
      career: { ko: '배움의 자세가 필요합니다. 선배나 전문가의 조언을 구하세요.', en: 'Learning attitude needed.' },
      love: { ko: '관계에서 배울 점이 많습니다. 상대방에게 열린 마음을 가지세요.', en: 'Much to learn in relationships.' },
      health: { ko: '건강 지식을 쌓으세요. 전문가 상담이 도움됩니다.', en: 'Build health knowledge.' },
      wealth: { ko: '재정 교육이 필요합니다. 투자 전 충분히 공부하세요.', en: 'Financial education needed.' },
      timing: { ko: '학습과 준비의 시기. 성급한 행동은 피하세요.', en: 'Time for learning and preparation.' },
    },
  },
  5: {
    number: 5, name_ko: '수괘(需卦) - 기다림', name_hanja: '水天需', trigram_upper: 'water', trigram_lower: 'heaven', element: 'water',
    core_meaning: { ko: '때를 기다리는 지혜. 조급함을 버리고 적절한 시기를 기다리면 성공합니다.', en: 'Wisdom of waiting. Abandoning impatience leads to success.' },
    themes: {
      career: { ko: '지금은 기다리는 시기입니다. 준비하면서 기회를 노리세요.', en: 'Now is time for waiting.' },
      love: { ko: '조급하게 굴지 마세요. 자연스럽게 발전하도록 기다리세요.', en: 'Don\'t be impatient.' },
      health: { ko: '회복 기간입니다. 무리하지 말고 충분히 쉬세요.', en: 'Recovery period.' },
      wealth: { ko: '투자 시기가 아닙니다. 관망하며 자금을 축적하세요.', en: 'Not time for investment.' },
      timing: { ko: '인내의 시기. 서두르면 실패, 기다리면 성공.', en: 'Time for patience.' },
    },
  },
  6: {
    number: 6, name_ko: '송괘(訟卦) - 다툼', name_hanja: '天水訟', trigram_upper: 'heaven', trigram_lower: 'water', element: 'metal',
    core_meaning: { ko: '갈등과 분쟁의 상황. 끝까지 다투면 손해를 봅니다. 중재자를 찾고 타협하세요.', en: 'Situation of conflict and dispute.' },
    themes: {
      career: { ko: '직장에서 갈등이 있을 수 있습니다. 대립보다 타협을 선택하세요.', en: 'Conflicts may arise at work.' },
      love: { ko: '관계에 마찰이 있습니다. 양보와 이해로 해결하세요.', en: 'Friction in relationships.' },
      health: { ko: '스트레스로 인한 건강 문제 주의. 마음의 평화를 찾으세요.', en: 'Watch for stress-related health issues.' },
      wealth: { ko: '소송이나 분쟁은 피하세요. 재정적 손실 위험이 있습니다.', en: 'Avoid lawsuits or disputes.' },
      timing: { ko: '분쟁을 피해야 할 시기. 무리한 추진은 후회를 부릅니다.', en: 'Time to avoid disputes.' },
    },
  },
  7: {
    number: 7, name_ko: '사괘(師卦) - 군대', name_hanja: '地水師', trigram_upper: 'earth', trigram_lower: 'water', element: 'earth',
    core_meaning: { ko: '조직과 규율의 힘. 많은 사람을 이끌어 목표를 달성합니다.', en: 'Power of organization and discipline.' },
    themes: {
      career: { ko: '팀을 이끌거나 대규모 프로젝트 관리에 적합합니다.', en: 'Suitable for leading teams.' },
      love: { ko: '관계에서 리더십이 필요합니다. 책임감 있게 행동하세요.', en: 'Leadership needed in relationships.' },
      health: { ko: '규칙적인 생활과 운동이 중요합니다.', en: 'Regular lifestyle and exercise important.' },
      wealth: { ko: '조직적인 재정 관리가 필요합니다.', en: 'Organized financial management needed.' },
      timing: { ko: '조직적 행동이 필요한 시기. 혼자보다 함께가 좋습니다.', en: 'Time for organized action.' },
    },
  },
  8: {
    number: 8, name_ko: '비괘(比卦) - 친밀함', name_hanja: '水地比', trigram_upper: 'water', trigram_lower: 'earth', element: 'water',
    core_meaning: { ko: '친밀함과 연대. 서로 도우며 함께 나아가는 것이 좋습니다.', en: 'Intimacy and solidarity.' },
    themes: {
      career: { ko: '협력과 네트워킹이 중요합니다. 좋은 파트너를 찾으세요.', en: 'Cooperation and networking important.' },
      love: { ko: '깊은 유대감을 형성하기 좋은 시기입니다.', en: 'Good time to form deep bonds.' },
      health: { ko: '함께 운동하거나 건강 관리하면 좋습니다.', en: 'Exercising together is beneficial.' },
      wealth: { ko: '공동 투자나 파트너십이 유리합니다.', en: 'Joint investment or partnership favorable.' },
      timing: { ko: '연대의 시기. 혼자보다 함께가 좋습니다.', en: 'Time for solidarity.' },
    },
  },
  9: {
    number: 9, name_ko: '소축괘(小畜卦) - 작은 축적', name_hanja: '風天小畜', trigram_upper: 'wind', trigram_lower: 'heaven', element: 'wood',
    core_meaning: { ko: '작은 것을 쌓아가는 시기. 큰 것을 얻기 전에 작은 것부터 축적하세요.', en: 'Time of small accumulation.' },
    themes: {
      career: { ko: '작은 성과들을 쌓아가세요. 큰 도약 전 준비 단계입니다.', en: 'Build small achievements.' },
      love: { ko: '작은 배려와 관심이 관계를 키웁니다.', en: 'Small considerations nurture relationship.' },
      health: { ko: '작은 건강 습관부터 시작하세요.', en: 'Start with small health habits.' },
      wealth: { ko: '소액부터 꾸준히 저축하세요.', en: 'Save steadily from small amounts.' },
      timing: { ko: '축적의 시기. 조급하지 않게 차근차근.', en: 'Time for accumulation.' },
    },
  },
  10: {
    number: 10, name_ko: '이괘(履卦) - 밟음', name_hanja: '天澤履', trigram_upper: 'heaven', trigram_lower: 'lake', element: 'metal',
    core_meaning: { ko: '신중하게 행동하는 것. 호랑이 꼬리를 밟아도 조심하면 물리지 않습니다.', en: 'Acting carefully. Even treading on tiger\'s tail, if careful, won\'t be bitten.' },
    themes: {
      career: { ko: '신중하게 행동하세요. 예의 바른 처신이 성공을 부릅니다.', en: 'Act carefully.' },
      love: { ko: '상대를 존중하며 조심스럽게 다가가세요.', en: 'Approach respectfully and carefully.' },
      health: { ko: '무리한 운동은 피하고 안전하게.', en: 'Avoid excessive exercise, stay safe.' },
      wealth: { ko: '위험한 투자는 피하세요. 안전한 선택을.', en: 'Avoid risky investments.' },
      timing: { ko: '신중함이 필요한 시기. 급하게 움직이지 마세요.', en: 'Time requiring caution.' },
    },
  },
  11: {
    number: 11, name_ko: '태괘(泰卦) - 평화', name_hanja: '地天泰', trigram_upper: 'earth', trigram_lower: 'heaven', element: 'earth',
    core_meaning: { ko: '하늘과 땅이 소통하는 평화로운 시기. 모든 것이 순조롭게 흘러갑니다.', en: 'Peaceful time when heaven and earth communicate.' },
    themes: {
      career: { ko: '모든 것이 순조롭습니다. 새로운 시작에 좋은 시기.', en: 'Everything goes smoothly.' },
      love: { ko: '관계가 조화롭고 평화롭습니다.', en: 'Relationship harmonious and peaceful.' },
      health: { ko: '건강 상태가 좋습니다. 이 컨디션을 유지하세요.', en: 'Health condition is good.' },
      wealth: { ko: '재정적으로 안정적입니다. 투자에 좋은 시기.', en: 'Financially stable.' },
      timing: { ko: '평화의 시기. 이 기회를 잘 활용하세요.', en: 'Time of peace.' },
    },
  },
  12: {
    number: 12, name_ko: '비괘(否卦) - 막힘', name_hanja: '天地否', trigram_upper: 'heaven', trigram_lower: 'earth', element: 'metal',
    core_meaning: { ko: '하늘과 땅이 소통하지 않는 막힌 시기. 때를 기다리면 지나갑니다.', en: 'Blocked time when heaven and earth don\'t communicate.' },
    themes: {
      career: { ko: '정체와 막힘이 있습니다. 때를 기다리며 내실을 다지세요.', en: 'Stagnation and blockage exist.' },
      love: { ko: '소통에 어려움이 있습니다. 인내심을 가지세요.', en: 'Communication difficulties exist.' },
      health: { ko: '기운이 막혀 있을 수 있습니다. 가벼운 운동으로 순환시키세요.', en: 'Energy may be blocked.' },
      wealth: { ko: '재정적 막힘이 있습니다. 큰 투자는 피하세요.', en: 'Financial blockage exists.' },
      timing: { ko: '막힘의 시기. 버티면 지나갑니다.', en: 'Time of blockage.' },
    },
  },
  13: {
    number: 13, name_ko: '동인괘(同人卦) - 화합', name_hanja: '天火同人', trigram_upper: 'heaven', trigram_lower: 'fire', element: 'metal',
    core_meaning: { ko: '뜻을 같이하는 사람들과의 화합. 공동의 목표를 위해 힘을 모으면 큰 일을 이룹니다.', en: 'Harmony with like-minded people.' },
    themes: {
      career: { ko: '팀워크가 중요합니다. 같은 목표를 가진 사람들과 협력하세요.', en: 'Teamwork is important.' },
      love: { ko: '가치관이 맞는 사람과의 인연이 좋습니다.', en: 'Connection with someone sharing values.' },
      health: { ko: '그룹 활동이나 동호회 활동이 건강에 좋습니다.', en: 'Group activities benefit health.' },
      wealth: { ko: '공동 사업이나 투자가 유리합니다.', en: 'Joint business or investment favorable.' },
      timing: { ko: '화합의 시기. 함께하면 강해집니다.', en: 'Time for harmony.' },
    },
  },
  14: {
    number: 14, name_ko: '대유괘(大有卦) - 큰 소유', name_hanja: '火天大有', trigram_upper: 'fire', trigram_lower: 'heaven', element: 'fire',
    core_meaning: { ko: '크게 가지는 풍요의 시기. 성공과 번영이 함께합니다.', en: 'Time of great possession and abundance.' },
    themes: {
      career: { ko: '큰 성과를 거둡니다. 성공을 겸손하게 받아들이세요.', en: 'Achieving great results.' },
      love: { ko: '풍요로운 관계를 누립니다. 나눔이 사랑을 키웁니다.', en: 'Enjoying abundant relationship.' },
      health: { ko: '활력이 넘칩니다. 과식과 과로만 주의하세요.', en: 'Full of vitality.' },
      wealth: { ko: '재물 운이 좋습니다. 탐욕을 경계하세요.', en: 'Good fortune with wealth.' },
      timing: { ko: '풍요의 시기. 감사하며 나누세요.', en: 'Time of abundance.' },
    },
  },
  15: {
    number: 15, name_ko: '겸괘(謙卦) - 겸손', name_hanja: '地山謙', trigram_upper: 'earth', trigram_lower: 'mountain', element: 'earth',
    core_meaning: { ko: '산이 땅 아래에 있는 겸손함. 낮은 자세가 오히려 높임을 받습니다.', en: 'Humility of mountain beneath earth.' },
    themes: {
      career: { ko: '겸손한 태도가 인정받습니다. 자랑하지 말고 실력으로 보여주세요.', en: 'Humble attitude is recognized.' },
      love: { ko: '겸손하게 다가가면 상대의 마음을 얻습니다.', en: 'Humble approach wins hearts.' },
      health: { ko: '무리하지 않는 것이 좋습니다.', en: 'Don\'t overdo it.' },
      wealth: { ko: '욕심 부리지 않으면 자연스레 들어옵니다.', en: 'Without greed, wealth comes naturally.' },
      timing: { ko: '겸손의 시기. 낮추면 높아집니다.', en: 'Time for humility.' },
    },
  },
  16: {
    number: 16, name_ko: '예괘(豫卦) - 기쁨', name_hanja: '雷地豫', trigram_upper: 'thunder', trigram_lower: 'earth', element: 'wood',
    core_meaning: { ko: '기쁨과 열정의 시기. 준비가 되어 있으면 행동할 때입니다.', en: 'Time of joy and enthusiasm.' },
    themes: {
      career: { ko: '열정적으로 임하면 성과가 납니다.', en: 'Enthusiasm brings results.' },
      love: { ko: '즐겁고 활기찬 관계를 누리세요.', en: 'Enjoy joyful and lively relationship.' },
      health: { ko: '기분 좋게 운동하면 효과가 좋습니다.', en: 'Exercising in good mood is effective.' },
      wealth: { ko: '즐기면서 돈을 벌 수 있는 기회가 있습니다.', en: 'Opportunity to earn while enjoying.' },
      timing: { ko: '행동의 시기. 준비된 것을 실행하세요.', en: 'Time for action.' },
    },
  },
  17: {
    number: 17, name_ko: '수괘(隨卦) - 따름', name_hanja: '澤雷隨', trigram_upper: 'lake', trigram_lower: 'thunder', element: 'metal',
    core_meaning: { ko: '때와 상황을 따르는 지혜. 억지로 앞서가지 말고 흐름에 순응하세요.', en: 'Wisdom of following time and situation.' },
    themes: {
      career: { ko: '상사나 선배를 따르는 것이 좋습니다.', en: 'Following superiors is good.' },
      love: { ko: '상대방의 의견을 존중하고 따르세요.', en: 'Respect and follow partner\'s opinion.' },
      health: { ko: '몸의 신호를 따르세요.', en: 'Follow body\'s signals.' },
      wealth: { ko: '트렌드를 따르는 투자가 유리합니다.', en: 'Following trends is favorable.' },
      timing: { ko: '순응의 시기. 흐름을 거스르지 마세요.', en: 'Time for conformity.' },
    },
  },
  18: {
    number: 18, name_ko: '고괘(蠱卦) - 부패/정비', name_hanja: '山風蠱', trigram_upper: 'mountain', trigram_lower: 'wind', element: 'earth',
    core_meaning: { ko: '썩은 것을 바로잡는 시기. 문제를 직시하고 개혁해야 합니다.', en: 'Time to correct decay.' },
    themes: {
      career: { ko: '잘못된 것을 바로잡을 때입니다.', en: 'Time to correct wrongs.' },
      love: { ko: '관계의 문제를 직시하고 해결하세요.', en: 'Face and solve relationship problems.' },
      health: { ko: '나쁜 습관을 고칠 때입니다.', en: 'Time to fix bad habits.' },
      wealth: { ko: '재정 상태를 점검하고 정리하세요.', en: 'Check and organize finances.' },
      timing: { ko: '개혁의 시기. 문제를 회피하지 마세요.', en: 'Time for reform.' },
    },
  },
  19: {
    number: 19, name_ko: '임괘(臨卦) - 다가옴', name_hanja: '地澤臨', trigram_upper: 'earth', trigram_lower: 'lake', element: 'earth',
    core_meaning: { ko: '좋은 일이 다가오는 시기. 적극적으로 임하면 성과를 거둡니다.', en: 'Good things approaching.' },
    themes: {
      career: { ko: '좋은 기회가 다가옵니다. 적극적으로 임하세요.', en: 'Good opportunities approaching.' },
      love: { ko: '새로운 만남이나 관계 발전의 시기입니다.', en: 'Time for new encounters.' },
      health: { ko: '건강이 회복되고 있습니다.', en: 'Health is recovering.' },
      wealth: { ko: '재물운이 상승합니다.', en: 'Fortune with wealth rising.' },
      timing: { ko: '상승의 시기. 기회를 잡으세요.', en: 'Time of rise.' },
    },
  },
  20: {
    number: 20, name_ko: '관괘(觀卦) - 관찰', name_hanja: '風地觀', trigram_upper: 'wind', trigram_lower: 'earth', element: 'wood',
    core_meaning: { ko: '높은 곳에서 내려다보는 관조. 행동하기 전에 상황을 잘 살펴야 합니다.', en: 'Contemplation from high place.' },
    themes: {
      career: { ko: '상황을 잘 관찰하세요. 성급한 행동은 금물.', en: 'Observe the situation well.' },
      love: { ko: '상대방을 잘 관찰하고 이해하세요.', en: 'Observe and understand partner.' },
      health: { ko: '몸 상태를 잘 살피세요.', en: 'Pay attention to body condition.' },
      wealth: { ko: '시장을 관망하세요. 투자 결정은 신중히.', en: 'Watch the market.' },
      timing: { ko: '관찰의 시기. 행동보다 관조.', en: 'Time for observation.' },
    },
  },
  21: {
    number: 21, name_ko: '서합괘(噬嗑卦) - 씹어서 합함', name_hanja: '火雷噬嗑', trigram_upper: 'fire', trigram_lower: 'thunder', element: 'fire',
    core_meaning: { ko: '장애물을 제거하고 결합하는 것. 문제를 직접 해결해야 합니다.', en: 'Removing obstacles and joining.' },
    themes: {
      career: { ko: '문제를 직접 해결하세요. 결단이 필요합니다.', en: 'Solve problems directly.' },
      love: { ko: '관계의 장애물을 제거하세요.', en: 'Remove obstacles in relationship.' },
      health: { ko: '건강 문제가 있다면 치료받으세요.', en: 'Get treatment if health problems.' },
      wealth: { ko: '빚이나 문제를 정리하세요.', en: 'Clear debts or problems.' },
      timing: { ko: '해결의 시기. 문제를 미루지 마세요.', en: 'Time for resolution.' },
    },
  },
  22: {
    number: 22, name_ko: '비괘(賁卦) - 꾸밈', name_hanja: '山火賁', trigram_upper: 'mountain', trigram_lower: 'fire', element: 'earth',
    core_meaning: { ko: '아름답게 꾸미는 것. 외면의 아름다움도 중요하지만 내면이 더 중요합니다.', en: 'Adorning beautifully.' },
    themes: {
      career: { ko: '프레젠테이션과 이미지 관리가 중요합니다.', en: 'Presentation and image management important.' },
      love: { ko: '외모와 매너에 신경 쓰면 좋은 인상을 줍니다.', en: 'Attention to appearance impresses.' },
      health: { ko: '외모 관리와 함께 내면 건강도 챙기세요.', en: 'Care for inner health with appearance.' },
      wealth: { ko: '작은 것에서 아름다움을 찾으세요.', en: 'Find beauty in small things.' },
      timing: { ko: '꾸밈의 시기. 형식도 중요합니다.', en: 'Time for adornment.' },
    },
  },
  23: {
    number: 23, name_ko: '박괘(剝卦) - 벗겨짐', name_hanja: '山地剝', trigram_upper: 'mountain', trigram_lower: 'earth', element: 'earth',
    core_meaning: { ko: '무너지고 벗겨지는 시기. 어려운 때이지만 때를 기다리면 다시 일어납니다.', en: 'Time of crumbling and peeling.' },
    themes: {
      career: { ko: '어려운 시기입니다. 내실을 다지며 버티세요.', en: 'Difficult time. Build inner strength.' },
      love: { ko: '관계가 흔들릴 수 있습니다.', en: 'Relationship may shake.' },
      health: { ko: '체력이 떨어질 수 있습니다. 충분히 쉬세요.', en: 'Stamina may drop.' },
      wealth: { ko: '손실이 있을 수 있습니다. 지출을 줄이세요.', en: 'Losses may occur.' },
      timing: { ko: '쇠퇴의 시기. 버티면 지나갑니다.', en: 'Time of decline.' },
    },
  },
  24: {
    number: 24, name_ko: '복괘(復卦) - 돌아옴', name_hanja: '地雷復', trigram_upper: 'earth', trigram_lower: 'thunder', element: 'earth',
    core_meaning: { ko: '양의 기운이 돌아오는 회복의 시기. 어둠 끝에 빛이 보입니다.', en: 'Time of recovery when yang energy returns.' },
    themes: {
      career: { ko: '새로운 시작의 기회입니다. 작게 시작하세요.', en: 'Opportunity for new beginning.' },
      love: { ko: '헤어졌던 인연이 돌아올 수 있습니다.', en: 'Lost connections may return.' },
      health: { ko: '건강이 회복되기 시작합니다.', en: 'Health begins to recover.' },
      wealth: { ko: '재정이 회복될 조짐입니다.', en: 'Signs of financial recovery.' },
      timing: { ko: '회복의 시기. 희망을 가지세요.', en: 'Time of recovery.' },
    },
  },
  25: {
    number: 25, name_ko: '무망괘(無妄卦) - 무망', name_hanja: '天雷無妄', trigram_upper: 'heaven', trigram_lower: 'thunder', element: 'metal',
    core_meaning: { ko: '순수하고 거짓이 없는 상태. 진실하게 행동하면 하늘이 돕습니다.', en: 'Pure and truthful state.' },
    themes: {
      career: { ko: '정직하게 일하세요. 속임수는 역효과입니다.', en: 'Work honestly.' },
      love: { ko: '진심으로 다가가세요. 가식은 금물.', en: 'Approach with sincerity.' },
      health: { ko: '자연스러운 방법으로 건강을 관리하세요.', en: 'Manage health naturally.' },
      wealth: { ko: '정당한 방법으로만 돈을 벌어야 합니다.', en: 'Earn only through rightful means.' },
      timing: { ko: '진실의 시기. 거짓은 드러납니다.', en: 'Time of truth.' },
    },
  },
  26: {
    number: 26, name_ko: '대축괘(大畜卦) - 큰 축적', name_hanja: '山天大畜', trigram_upper: 'mountain', trigram_lower: 'heaven', element: 'earth',
    core_meaning: { ko: '크게 쌓고 기르는 시기. 재능과 자원을 축적하세요.', en: 'Time of great accumulation.' },
    themes: {
      career: { ko: '실력과 경험을 쌓으세요. 큰 기회가 올 것입니다.', en: 'Build skills and experience.' },
      love: { ko: '관계를 깊이 있게 발전시키세요.', en: 'Develop relationship deeply.' },
      health: { ko: '체력을 키우세요. 장기적으로 투자하세요.', en: 'Build stamina.' },
      wealth: { ko: '재물을 축적하기 좋은 시기입니다.', en: 'Good time to accumulate wealth.' },
      timing: { ko: '축적의 시기. 준비해서 기다리세요.', en: 'Time for accumulation.' },
    },
  },
  27: {
    number: 27, name_ko: '이괘(頤卦) - 턱/기름', name_hanja: '山雷頤', trigram_upper: 'mountain', trigram_lower: 'thunder', element: 'earth',
    core_meaning: { ko: '먹고 기르는 것에 관한 괘. 무엇을 섭취하느냐가 중요합니다.', en: 'Hexagram about nourishment.' },
    themes: {
      career: { ko: '좋은 지식과 경험을 쌓으세요.', en: 'Build good knowledge and experience.' },
      love: { ko: '서로를 정서적으로 잘 기르세요.', en: 'Nourish each other emotionally.' },
      health: { ko: '먹는 것에 특히 신경 쓰세요. 건강한 식단이 중요.', en: 'Pay attention to eating.' },
      wealth: { ko: '수입원을 잘 관리하세요.', en: 'Manage income sources well.' },
      timing: { ko: '기름의 시기. 좋은 것으로 채우세요.', en: 'Time for nourishment.' },
    },
  },
  28: {
    number: 28, name_ko: '대과괘(大過卦) - 큰 지나침', name_hanja: '澤風大過', trigram_upper: 'lake', trigram_lower: 'wind', element: 'metal',
    core_meaning: { ko: '과한 상태, 한계를 넘는 것. 위태로운 상황이지만 과감한 행동이 필요할 때도 있습니다.', en: 'Excessive state, exceeding limits.' },
    themes: {
      career: { ko: '과감한 결단이 필요합니다.', en: 'Bold decision needed.' },
      love: { ko: '관계가 극적인 변화를 맞을 수 있습니다.', en: 'Relationship may face dramatic change.' },
      health: { ko: '과로나 과식을 피하세요. 균형이 중요.', en: 'Avoid overwork or overeating.' },
      wealth: { ko: '큰 위험에는 큰 보상이 있을 수 있습니다.', en: 'Big risks may have big rewards.' },
      timing: { ko: '비상의 시기. 보통과 다른 행동이 필요.', en: 'Time of emergency.' },
    },
  },
  29: {
    number: 29, name_ko: '감괘(坎卦) - 물, 위험', name_hanja: '坎為水', trigram_upper: 'water', trigram_lower: 'water', element: 'water',
    core_meaning: { ko: '거듭되는 위험과 어려움. 물처럼 유연하게 대처하세요.', en: 'Repeated danger and difficulty.' },
    themes: {
      career: { ko: '어려움이 있지만 포기하지 마세요.', en: 'Difficulties exist but don\'t give up.' },
      love: { ko: '관계에 위기가 있을 수 있습니다.', en: 'Crisis may exist in relationship.' },
      health: { ko: '신장, 비뇨기 계통에 주의하세요.', en: 'Watch kidney and urinary system.' },
      wealth: { ko: '재정적 어려움이 있습니다. 조심하세요.', en: 'Financial difficulties exist.' },
      timing: { ko: '위험의 시기. 신중하게 행동하세요.', en: 'Time of danger.' },
    },
  },
  30: {
    number: 30, name_ko: '리괘(離卦) - 불, 붙음', name_hanja: '離為火', trigram_upper: 'fire', trigram_lower: 'fire', element: 'fire',
    core_meaning: { ko: '밝음과 명확함의 괘. 불처럼 빛을 발하되, 타오르면 꺼집니다.', en: 'Hexagram of brightness and clarity.' },
    themes: {
      career: { ko: '재능이 빛을 발합니다. 주목받을 수 있습니다.', en: 'Talent shines.' },
      love: { ko: '열정적인 관계가 가능합니다. 과열 주의.', en: 'Passionate relationship possible.' },
      health: { ko: '심장, 눈 건강에 신경 쓰세요.', en: 'Watch heart and eye health.' },
      wealth: { ko: '빠른 성과가 있을 수 있습니다.', en: 'Quick results may occur.' },
      timing: { ko: '빛남의 시기. 적당히 드러내세요.', en: 'Time to shine.' },
    },
  },
  31: {
    number: 31, name_ko: '함괘(咸卦) - 감응', name_hanja: '澤山咸', trigram_upper: 'lake', trigram_lower: 'mountain', element: 'metal',
    core_meaning: { ko: '서로 감응하고 교류하는 것. 마음이 통하면 무엇이든 이룰 수 있습니다.', en: 'Mutual sensing and exchange.' },
    themes: {
      career: { ko: '소통이 잘 됩니다. 인연을 만들기 좋은 시기.', en: 'Communication goes well.' },
      love: { ko: '서로에게 끌리는 좋은 인연을 만날 수 있습니다.', en: 'May meet good connection.' },
      health: { ko: '정서적 교류가 건강에 도움이 됩니다.', en: 'Emotional exchange helps health.' },
      wealth: { ko: '좋은 사업 파트너를 만날 수 있습니다.', en: 'May meet good business partner.' },
      timing: { ko: '감응의 시기. 마음을 열면 통합니다.', en: 'Time of response.' },
    },
  },
  32: {
    number: 32, name_ko: '항괘(恒卦) - 항구함', name_hanja: '雷風恒', trigram_upper: 'thunder', trigram_lower: 'wind', element: 'wood',
    core_meaning: { ko: '변하지 않는 꾸준함. 중심을 잡고 흔들리지 않으면 성공합니다.', en: 'Unchanging steadfastness.' },
    themes: {
      career: { ko: '꾸준히 하던 일을 계속하세요.', en: 'Continue what you\'ve been doing.' },
      love: { ko: '안정적인 관계를 유지하세요.', en: 'Maintain stable relationship.' },
      health: { ko: '규칙적인 생활을 유지하세요.', en: 'Maintain regular lifestyle.' },
      wealth: { ko: '꾸준한 저축과 투자가 좋습니다.', en: 'Steady saving and investment good.' },
      timing: { ko: '항구함의 시기. 변하지 말고 버티세요.', en: 'Time for constancy.' },
    },
  },
  33: {
    number: 33, name_ko: '둔괘(遯卦) - 물러남', name_hanja: '天山遯', trigram_upper: 'heaven', trigram_lower: 'mountain', element: 'metal',
    core_meaning: { ko: '물러나는 것이 지혜로운 때. 무리하게 버티지 말고 한 발 물러서세요.', en: 'Time when retreating is wise.' },
    themes: {
      career: { ko: '지금은 물러날 때입니다.', en: 'Now is time to retreat.' },
      love: { ko: '공간을 주세요. 집착은 역효과입니다.', en: 'Give space.' },
      health: { ko: '무리하지 말고 쉬세요.', en: 'Don\'t overdo, rest.' },
      wealth: { ko: '손실을 최소화하세요.', en: 'Minimize losses.' },
      timing: { ko: '물러남의 시기. 전략적 후퇴.', en: 'Time for retreat.' },
    },
  },
  34: {
    number: 34, name_ko: '대장괘(大壯卦) - 큰 힘', name_hanja: '雷天大壯', trigram_upper: 'thunder', trigram_lower: 'heaven', element: 'wood',
    core_meaning: { ko: '힘이 크게 강한 때. 힘이 있지만 함부로 쓰면 안 됩니다.', en: 'Time of great strength.' },
    themes: {
      career: { ko: '힘이 있습니다. 하지만 겸손하게 쓰세요.', en: 'You have power. Use humbly.' },
      love: { ko: '강하게 밀어붙이지 마세요.', en: 'Don\'t push hard.' },
      health: { ko: '체력이 좋습니다. 과신하지 마세요.', en: 'Stamina is good.' },
      wealth: { ko: '힘이 있지만 신중하게 투자하세요.', en: 'Have power but invest carefully.' },
      timing: { ko: '강함의 시기. 힘을 바르게 쓰세요.', en: 'Time of strength.' },
    },
  },
  35: {
    number: 35, name_ko: '진괘(晉卦) - 나아감', name_hanja: '火地晉', trigram_upper: 'fire', trigram_lower: 'earth', element: 'fire',
    core_meaning: { ko: '해가 땅 위로 떠오르듯 밝게 나아가는 때. 승진과 발전의 기회가 있습니다.', en: 'Time of bright advancement.' },
    themes: {
      career: { ko: '승진이나 발전의 기회가 있습니다.', en: 'Opportunities for promotion.' },
      love: { ko: '관계가 발전합니다.', en: 'Relationship develops.' },
      health: { ko: '건강이 좋아집니다.', en: 'Health improves.' },
      wealth: { ko: '재정 상태가 좋아집니다.', en: 'Financial state improves.' },
      timing: { ko: '전진의 시기. 적극적으로 나아가세요.', en: 'Time to advance.' },
    },
  },
  36: {
    number: 36, name_ko: '명이괘(明夷卦) - 밝음이 상함', name_hanja: '地火明夷', trigram_upper: 'earth', trigram_lower: 'fire', element: 'earth',
    core_meaning: { ko: '밝음이 땅 아래로 가라앉음. 어려운 시기에 재능을 숨기고 인내하세요.', en: 'Light sinks below earth.' },
    themes: {
      career: { ko: '재능을 드러내지 말고 때를 기다리세요.', en: 'Don\'t reveal talent, wait.' },
      love: { ko: '관계에서 어려움이 있을 수 있습니다.', en: 'Difficulties may be in relationship.' },
      health: { ko: '활력이 저하될 수 있습니다.', en: 'Vitality may decrease.' },
      wealth: { ko: '재정적 어려움이 있을 수 있습니다.', en: 'Financial difficulties possible.' },
      timing: { ko: '어둠의 시기. 빛을 감추고 기다리세요.', en: 'Time of darkness.' },
    },
  },
  37: {
    number: 37, name_ko: '가인괘(家人卦) - 집안 사람', name_hanja: '風火家人', trigram_upper: 'wind', trigram_lower: 'fire', element: 'wood',
    core_meaning: { ko: '가정의 화목. 가정에서의 역할과 질서가 중요합니다.', en: 'Family harmony.' },
    themes: {
      career: { ko: '가족 같은 팀워크가 중요합니다.', en: 'Family-like teamwork important.' },
      love: { ko: '가정을 이루기 좋은 시기입니다.', en: 'Good time to build family.' },
      health: { ko: '가족의 건강에도 신경 쓰세요.', en: 'Care for family health too.' },
      wealth: { ko: '가계 재정 관리가 중요합니다.', en: 'Household financial management important.' },
      timing: { ko: '가정에 집중할 시기.', en: 'Time to focus on family.' },
    },
  },
  38: {
    number: 38, name_ko: '규괘(睽卦) - 어긋남', name_hanja: '火澤睽', trigram_upper: 'fire', trigram_lower: 'lake', element: 'fire',
    core_meaning: { ko: '대립과 다름. 다른 것도 화합할 수 있습니다.', en: 'Opposition and difference.' },
    themes: {
      career: { ko: '의견 차이가 있지만 조화를 찾으세요.', en: 'Differences exist but find harmony.' },
      love: { ko: '다름을 인정하고 이해하세요.', en: 'Accept and understand differences.' },
      health: { ko: '몸과 마음의 균형을 찾으세요.', en: 'Find balance.' },
      wealth: { ko: '다양한 투자 포트폴리오가 좋습니다.', en: 'Diverse investment portfolio good.' },
      timing: { ko: '대립의 시기. 화합을 모색하세요.', en: 'Time of opposition.' },
    },
  },
  39: {
    number: 39, name_ko: '건괘(蹇卦) - 절름발이', name_hanja: '水山蹇', trigram_upper: 'water', trigram_lower: 'mountain', element: 'water',
    core_meaning: { ko: '앞길이 막혀 있음. 물러서서 도움을 구하세요.', en: 'Path blocked ahead.' },
    themes: {
      career: { ko: '장애물이 있습니다. 우회하거나 도움을 구하세요.', en: 'Obstacles exist.' },
      love: { ko: '관계에 어려움이 있습니다.', en: 'Difficulties in relationship.' },
      health: { ko: '건강에 문제가 있을 수 있습니다.', en: 'Health problems may occur.' },
      wealth: { ko: '재정적 어려움에 대비하세요.', en: 'Prepare for financial difficulties.' },
      timing: { ko: '장애의 시기. 전문가의 도움을 구하세요.', en: 'Time of obstruction.' },
    },
  },
  40: {
    number: 40, name_ko: '해괘(解卦) - 풀림', name_hanja: '雷水解', trigram_upper: 'thunder', trigram_lower: 'water', element: 'wood',
    core_meaning: { ko: '어려움이 풀림. 봄비가 내린 후의 해방감.', en: 'Difficulties resolved.' },
    themes: {
      career: { ko: '막혔던 일이 풀립니다.', en: 'Blocked matters resolve.' },
      love: { ko: '오해가 풀리고 관계가 회복됩니다.', en: 'Misunderstanding clears.' },
      health: { ko: '병이 낫고 건강이 회복됩니다.', en: 'Illness heals.' },
      wealth: { ko: '재정적 문제가 해결됩니다.', en: 'Financial problems resolve.' },
      timing: { ko: '해결의 시기. 빨리 처리하세요.', en: 'Time for resolution.' },
    },
  },
  41: {
    number: 41, name_ko: '손괘(損卦) - 덜어냄', name_hanja: '山澤損', trigram_upper: 'mountain', trigram_lower: 'lake', element: 'earth',
    core_meaning: { ko: '덜어냄으로써 더함. 줄이는 것이 오히려 이득이 됩니다.', en: 'Gain through decrease.' },
    themes: {
      career: { ko: '불필요한 것을 줄이세요.', en: 'Reduce unnecessary things.' },
      love: { ko: '과도한 기대를 줄이세요.', en: 'Reduce excessive expectations.' },
      health: { ko: '과식, 과음을 줄이세요.', en: 'Reduce overeating, overdrinking.' },
      wealth: { ko: '지출을 줄이는 것이 이익입니다.', en: 'Reducing spending is profitable.' },
      timing: { ko: '절제의 시기. 줄이는 것이 더하는 것.', en: 'Time for moderation.' },
    },
  },
  42: {
    number: 42, name_ko: '익괘(益卦) - 더함', name_hanja: '風雷益', trigram_upper: 'wind', trigram_lower: 'thunder', element: 'wood',
    core_meaning: { ko: '더해짐. 위에서 아래로 베푸니 모두가 이익.', en: 'Increase. Giving from above benefits all.' },
    themes: {
      career: { ko: '발전과 성장의 좋은 시기입니다.', en: 'Good time for development.' },
      love: { ko: '관계가 더욱 좋아집니다.', en: 'Relationship improves further.' },
      health: { ko: '건강이 좋아집니다.', en: 'Health improves.' },
      wealth: { ko: '재물이 늘어납니다.', en: 'Wealth increases.' },
      timing: { ko: '증가의 시기. 적극적으로 움직이세요.', en: 'Time of increase.' },
    },
  },
  43: {
    number: 43, name_ko: '쾌괘(夬卦) - 결단', name_hanja: '澤天夬', trigram_upper: 'lake', trigram_lower: 'heaven', element: 'metal',
    core_meaning: { ko: '결단하여 돌파함. 과감하게 나쁜 것을 제거하세요.', en: 'Decisive breakthrough.' },
    themes: {
      career: { ko: '과감한 결단이 필요합니다.', en: 'Bold decision needed.' },
      love: { ko: '불건전한 관계를 정리하세요.', en: 'Clean up unhealthy relationships.' },
      health: { ko: '나쁜 습관을 끊으세요.', en: 'Break bad habits.' },
      wealth: { ko: '손실을 과감히 처리하세요.', en: 'Boldly handle losses.' },
      timing: { ko: '결단의 시기. 우유부단하면 안 됩니다.', en: 'Time for decision.' },
    },
  },
  44: {
    number: 44, name_ko: '구괘(姤卦) - 만남', name_hanja: '天風姤', trigram_upper: 'heaven', trigram_lower: 'wind', element: 'metal',
    core_meaning: { ko: '만남. 뜻밖의 만남에 주의하세요.', en: 'Meeting. Be careful of unexpected encounters.' },
    themes: {
      career: { ko: '예상치 못한 만남이나 기회가 올 수 있습니다.', en: 'Unexpected meeting may come.' },
      love: { ko: '새로운 만남이 있을 수 있으나 신중하세요.', en: 'New meeting possible but be cautious.' },
      health: { ko: '갑작스러운 건강 문제에 주의하세요.', en: 'Watch for sudden health issues.' },
      wealth: { ko: '예상치 못한 지출이 있을 수 있습니다.', en: 'Unexpected expenses possible.' },
      timing: { ko: '만남의 시기. 신중하게 대처하세요.', en: 'Time of meeting.' },
    },
  },
  45: {
    number: 45, name_ko: '췌괘(萃卦) - 모임', name_hanja: '澤地萃', trigram_upper: 'lake', trigram_lower: 'earth', element: 'metal',
    core_meaning: { ko: '모임. 사람들이 모여 큰 힘을 이룹니다.', en: 'Gathering. People gather to form great strength.' },
    themes: {
      career: { ko: '팀을 모으고 조직하세요.', en: 'Gather and organize team.' },
      love: { ko: '함께하는 시간이 중요합니다.', en: 'Time together important.' },
      health: { ko: '그룹 운동이나 모임 활동이 좋습니다.', en: 'Group activities good.' },
      wealth: { ko: '자금을 모으기 좋은 시기입니다.', en: 'Good time to gather funds.' },
      timing: { ko: '모임의 시기. 함께하세요.', en: 'Time of gathering.' },
    },
  },
  46: {
    number: 46, name_ko: '승괘(升卦) - 올라감', name_hanja: '地風升', trigram_upper: 'earth', trigram_lower: 'wind', element: 'earth',
    core_meaning: { ko: '점점 올라감. 꾸준히 노력하면 높이 오릅니다.', en: 'Gradually rising.' },
    themes: {
      career: { ko: '점진적인 승진과 발전이 있습니다.', en: 'Gradual promotion and development.' },
      love: { ko: '관계가 점점 좋아집니다.', en: 'Relationship gradually improves.' },
      health: { ko: '건강이 점점 회복됩니다.', en: 'Health gradually recovers.' },
      wealth: { ko: '재물이 점점 늘어납니다.', en: 'Wealth gradually increases.' },
      timing: { ko: '상승의 시기. 꾸준히 나아가세요.', en: 'Time of rising.' },
    },
  },
  47: {
    number: 47, name_ko: '곤괘(困卦) - 곤궁', name_hanja: '澤水困', trigram_upper: 'lake', trigram_lower: 'water', element: 'metal',
    core_meaning: { ko: '궁핍과 곤란. 어려운 시기이나 뜻을 잃지 마세요. 못에 물이 없는 형상으로, 자원이 고갈된 상태를 의미하지만 군자는 목숨을 걸고서라도 뜻을 이룹니다.', en: 'Exhaustion and hardship. Difficult time but don\'t lose purpose.' },
    themes: {
      career: { ko: '어려운 시기입니다. 포기하지 말고 인내하세요. 지금은 때를 기다리며 내실을 다지는 것이 중요합니다.', en: 'Difficult time. Don\'t give up, be patient.' },
      love: { ko: '관계가 힘들 수 있습니다. 서로의 어려움을 이해하고 함께 버텨야 합니다.', en: 'Relationship may be difficult.' },
      health: { ko: '체력이 떨어집니다. 무리하지 말고 충분히 쉬면서 회복하세요.', en: 'Stamina drops. Rest and recover.' },
      wealth: { ko: '재정적 어려움이 있습니다. 허리띠를 조이고 불필요한 지출을 줄이세요.', en: 'Financial difficulties exist.' },
      timing: { ko: '곤란의 시기. 힘들지만 버티면 반드시 지나갑니다. 어둠 끝에 빛이 있습니다.', en: 'Time of hardship. Endure and it will pass.' },
    },
  },
  48: {
    number: 48, name_ko: '정괘(井卦) - 우물', name_hanja: '水風井', trigram_upper: 'water', trigram_lower: 'wind', element: 'water',
    core_meaning: { ko: '우물. 변하지 않는 원천. 근본에 충실하세요.', en: 'The well. Unchanging source.' },
    themes: {
      career: { ko: '기본에 충실하세요. 근본이 중요합니다.', en: 'Be true to basics.' },
      love: { ko: '변치 않는 사랑이 중요합니다.', en: 'Unchanging love important.' },
      health: { ko: '기초 건강 관리가 중요합니다.', en: 'Basic health management important.' },
      wealth: { ko: '안정적인 수입원이 중요합니다.', en: 'Stable income source important.' },
      timing: { ko: '근본의 시기. 기본에 집중하세요.', en: 'Time for fundamentals.' },
    },
  },
  49: {
    number: 49, name_ko: '혁괘(革卦) - 변혁', name_hanja: '澤火革', trigram_upper: 'lake', trigram_lower: 'fire', element: 'metal',
    core_meaning: { ko: '변혁. 때가 되면 바꿔야 합니다.', en: 'Revolution. When time comes, must change.' },
    themes: {
      career: { ko: '변화가 필요합니다. 과감하게 혁신하세요.', en: 'Change needed.' },
      love: { ko: '관계를 새롭게 할 때입니다.', en: 'Time to renew relationship.' },
      health: { ko: '생활 습관을 바꾸세요.', en: 'Change lifestyle habits.' },
      wealth: { ko: '재정 구조를 혁신하세요.', en: 'Innovate financial structure.' },
      timing: { ko: '변혁의 시기. 변화를 두려워하지 마세요.', en: 'Time for revolution.' },
    },
  },
  50: {
    number: 50, name_ko: '정괘(鼎卦) - 솥', name_hanja: '火風鼎', trigram_upper: 'fire', trigram_lower: 'wind', element: 'fire',
    core_meaning: { ko: '솥. 새로운 것을 만들어냄. 창조와 양육.', en: 'The cauldron. Creating new things.' },
    themes: {
      career: { ko: '새로운 것을 창조하기 좋은 시기입니다.', en: 'Good time to create something new.' },
      love: { ko: '관계를 발전시키세요.', en: 'Develop the relationship.' },
      health: { ko: '영양 관리에 신경 쓰세요.', en: 'Pay attention to nutrition.' },
      wealth: { ko: '새로운 수입원을 만드세요.', en: 'Create new income sources.' },
      timing: { ko: '창조의 시기. 새로운 것을 시작하세요.', en: 'Time for creation.' },
    },
  },
  51: {
    number: 51, name_ko: '진괘(震卦) - 우레', name_hanja: '震為雷', trigram_upper: 'thunder', trigram_lower: 'thunder', element: 'wood',
    core_meaning: { ko: '우레. 충격과 각성. 놀라지만 결국 웃습니다.', en: 'Thunder. Shock and awakening.' },
    themes: {
      career: { ko: '갑작스러운 변화가 있을 수 있습니다.', en: 'Sudden changes may occur.' },
      love: { ko: '관계에 충격이 있을 수 있습니다.', en: 'Shock may be in relationship.' },
      health: { ko: '갑작스러운 건강 문제에 주의하세요.', en: 'Watch for sudden health issues.' },
      wealth: { ko: '갑작스러운 재정 변화에 대비하세요.', en: 'Prepare for sudden financial changes.' },
      timing: { ko: '각성의 시기. 긴장을 유지하세요.', en: 'Time of awakening.' },
    },
  },
  52: {
    number: 52, name_ko: '간괘(艮卦) - 산, 그침', name_hanja: '艮為山', trigram_upper: 'mountain', trigram_lower: 'mountain', element: 'earth',
    core_meaning: { ko: '산처럼 멈춤. 때로는 멈추는 것이 지혜입니다.', en: 'Stillness like mountain.' },
    themes: {
      career: { ko: '지금은 움직이지 마세요. 멈추는 것이 좋습니다.', en: 'Don\'t move now.' },
      love: { ko: '관계에서 한 발 물러서세요.', en: 'Step back in relationship.' },
      health: { ko: '명상과 휴식이 필요합니다.', en: 'Meditation and rest needed.' },
      wealth: { ko: '투자를 멈추고 관망하세요.', en: 'Stop investing and watch.' },
      timing: { ko: '멈춤의 시기. 움직이지 않는 것이 지혜.', en: 'Time for stillness.' },
    },
  },
  53: {
    number: 53, name_ko: '점괘(漸卦) - 점진', name_hanja: '風山漸', trigram_upper: 'wind', trigram_lower: 'mountain', element: 'wood',
    core_meaning: { ko: '점진적 발전. 조금씩 나아가면 성공합니다.', en: 'Gradual development.' },
    themes: {
      career: { ko: '점진적으로 발전합니다. 서두르지 마세요.', en: 'Developing gradually.' },
      love: { ko: '관계가 천천히 발전합니다.', en: 'Relationship develops slowly.' },
      health: { ko: '건강이 서서히 회복됩니다.', en: 'Health gradually recovers.' },
      wealth: { ko: '재물이 조금씩 늘어납니다.', en: 'Wealth increases bit by bit.' },
      timing: { ko: '점진의 시기. 조급함은 금물.', en: 'Time for gradual progress.' },
    },
  },
  54: {
    number: 54, name_ko: '귀매괘(歸妹卦) - 시집가는 처녀', name_hanja: '雷澤歸妹', trigram_upper: 'thunder', trigram_lower: 'lake', element: 'wood',
    core_meaning: { ko: '시집가는 여자. 부수적인 위치에서 최선을 다함.', en: 'Marrying maiden.' },
    themes: {
      career: { ko: '주연보다 조연의 역할이 좋습니다.', en: 'Supporting role better than lead.' },
      love: { ko: '관계에서 양보가 필요합니다.', en: 'Concession needed in relationship.' },
      health: { ko: '무리하지 말고 보조적인 치료를 받으세요.', en: 'Don\'t overdo.' },
      wealth: { ko: '작은 이익에 만족하세요.', en: 'Be satisfied with small profits.' },
      timing: { ko: '겸손의 시기. 욕심을 줄이세요.', en: 'Time for humility.' },
    },
  },
  55: {
    number: 55, name_ko: '풍괘(豊卦) - 풍요', name_hanja: '雷火豊', trigram_upper: 'thunder', trigram_lower: 'fire', element: 'wood',
    core_meaning: { ko: '풍요로움. 정점에 이르렀으니 오래가지 않습니다.', en: 'Abundance. Peak reached.' },
    themes: {
      career: { ko: '최고의 시기입니다. 그러나 영원하지 않습니다.', en: 'Peak time. But not eternal.' },
      love: { ko: '사랑이 풍요롭습니다.', en: 'Love is abundant.' },
      health: { ko: '건강이 좋습니다.', en: 'Health is good.' },
      wealth: { ko: '재물이 풍족합니다.', en: 'Wealth is abundant.' },
      timing: { ko: '절정의 시기. 슬프지 말고 정오의 태양처럼.', en: 'Peak time.' },
    },
  },
  56: {
    number: 56, name_ko: '여괘(旅卦) - 나그네', name_hanja: '火山旅', trigram_upper: 'fire', trigram_lower: 'mountain', element: 'fire',
    core_meaning: { ko: '나그네. 낯선 곳에서 겸손하게 처신하세요.', en: 'The wanderer.' },
    themes: {
      career: { ko: '새로운 환경에 적응해야 합니다.', en: 'Must adapt to new environment.' },
      love: { ko: '불안정한 관계일 수 있습니다.', en: 'Relationship may be unstable.' },
      health: { ko: '여행 중 건강에 주의하세요.', en: 'Watch health during travel.' },
      wealth: { ko: '이동 중 재물 관리에 주의하세요.', en: 'Watch finances during movement.' },
      timing: { ko: '이동의 시기. 정착보다 유동적.', en: 'Time of movement.' },
    },
  },
  57: {
    number: 57, name_ko: '손괘(巽卦) - 바람', name_hanja: '巽為風', trigram_upper: 'wind', trigram_lower: 'wind', element: 'wood',
    core_meaning: { ko: '바람처럼 부드러움. 은근하게 스며들어 영향을 미칩니다.', en: 'Gentle like wind.' },
    themes: {
      career: { ko: '부드럽게 침투하세요.', en: 'Penetrate gently.' },
      love: { ko: '부드러운 접근이 효과적입니다.', en: 'Gentle approach is effective.' },
      health: { ko: '호흡과 기의 흐름에 신경 쓰세요.', en: 'Pay attention to breathing.' },
      wealth: { ko: '서서히 침투하는 전략이 좋습니다.', en: 'Gradual penetration strategy good.' },
      timing: { ko: '침투의 시기. 부드럽게 스며드세요.', en: 'Time for penetration.' },
    },
  },
  58: {
    number: 58, name_ko: '태괘(兌卦) - 기쁨', name_hanja: '兌為澤', trigram_upper: 'lake', trigram_lower: 'lake', element: 'metal',
    core_meaning: { ko: '기쁨과 즐거움. 서로 소통하며 기쁨을 나눕니다.', en: 'Joy and pleasure.' },
    themes: {
      career: { ko: '즐겁게 일하면 성과가 납니다.', en: 'Enjoying work brings results.' },
      love: { ko: '즐거운 관계를 누리세요.', en: 'Enjoy joyful relationship.' },
      health: { ko: '웃음이 건강에 좋습니다.', en: 'Laughter is good for health.' },
      wealth: { ko: '즐기면서 돈을 벌 수 있습니다.', en: 'Can earn while enjoying.' },
      timing: { ko: '기쁨의 시기. 즐거움을 나누세요.', en: 'Time of joy.' },
    },
  },
  59: {
    number: 59, name_ko: '환괘(渙卦) - 흩어짐', name_hanja: '風水渙', trigram_upper: 'wind', trigram_lower: 'water', element: 'wood',
    core_meaning: { ko: '흩어짐. 막힌 것을 풀어 흩어뜨리세요.', en: 'Dispersal.' },
    themes: {
      career: { ko: '경직된 것을 풀어주세요.', en: 'Release what is rigid.' },
      love: { ko: '응어리진 감정을 풀어주세요.', en: 'Release pent-up emotions.' },
      health: { ko: '막힌 기운을 풀어주세요.', en: 'Release blocked energy.' },
      wealth: { ko: '정체된 자금을 움직이세요.', en: 'Move stagnant funds.' },
      timing: { ko: '흩어짐의 시기. 막힌 것을 풀어주세요.', en: 'Time for dispersal.' },
    },
  },
  60: {
    number: 60, name_ko: '절괘(節卦) - 절제', name_hanja: '水澤節', trigram_upper: 'water', trigram_lower: 'lake', element: 'water',
    core_meaning: { ko: '절제. 적당히 제한하는 것이 필요합니다.', en: 'Restraint.' },
    themes: {
      career: { ko: '적당히 절제하세요.', en: 'Restrain appropriately.' },
      love: { ko: '지나친 집착은 피하세요.', en: 'Avoid excessive attachment.' },
      health: { ko: '절제된 생활이 건강에 좋습니다.', en: 'Restrained lifestyle good for health.' },
      wealth: { ko: '지출을 절제하세요.', en: 'Restrain spending.' },
      timing: { ko: '절제의 시기. 적당함이 중요합니다.', en: 'Time for restraint.' },
    },
  },
  61: {
    number: 61, name_ko: '중부괘(中孚卦) - 중심의 믿음', name_hanja: '風澤中孚', trigram_upper: 'wind', trigram_lower: 'lake', element: 'wood',
    core_meaning: { ko: '중심의 믿음. 진심이 통하면 무엇이든 이룹니다.', en: 'Inner truth.' },
    themes: {
      career: { ko: '진심으로 임하면 인정받습니다.', en: 'Sincere work is recognized.' },
      love: { ko: '진심이 통하는 관계를 만드세요.', en: 'Build relationship where sincerity connects.' },
      health: { ko: '마음의 평화가 건강의 기본입니다.', en: 'Peace of mind is basis of health.' },
      wealth: { ko: '신뢰가 재물을 부릅니다.', en: 'Trust attracts wealth.' },
      timing: { ko: '믿음의 시기. 진심으로 소통하세요.', en: 'Time for trust.' },
    },
  },
  62: {
    number: 62, name_ko: '소과괘(小過卦) - 작은 지나침', name_hanja: '雷山小過', trigram_upper: 'thunder', trigram_lower: 'mountain', element: 'wood',
    core_meaning: { ko: '작은 것은 지나쳐도 됨. 큰 것은 안 됩니다.', en: 'Small excesses okay. Big ones not.' },
    themes: {
      career: { ko: '작은 일에 집중하세요.', en: 'Focus on small things.' },
      love: { ko: '작은 배려가 관계를 키웁니다.', en: 'Small considerations nurture relationship.' },
      health: { ko: '작은 건강 습관이 중요합니다.', en: 'Small health habits important.' },
      wealth: { ko: '작은 저축이 큰 자산이 됩니다.', en: 'Small savings become big assets.' },
      timing: { ko: '작은 것의 시기. 겸손하게 행동하세요.', en: 'Time for small things.' },
    },
  },
  63: {
    number: 63, name_ko: '기제괘(旣濟卦) - 이미 건넘', name_hanja: '水火旣濟', trigram_upper: 'water', trigram_lower: 'fire', element: 'water',
    core_meaning: { ko: '모든 효가 정위에 있어 완성. 그러나 완성은 쇠퇴의 시작이기도 합니다.', en: 'Completion. But completion is also beginning of decline.' },
    themes: {
      career: { ko: '목표가 완성되었습니다. 다음을 준비하세요.', en: 'Goal achieved. Prepare for next.' },
      love: { ko: '관계가 안정기에 접어들었습니다.', en: 'Relationship entered stable phase.' },
      health: { ko: '건강이 안정적입니다.', en: 'Health is stable.' },
      wealth: { ko: '재정이 안정되어 있습니다.', en: 'Finances are stable.' },
      timing: { ko: '정점에 도달. 다음 단계를 준비하세요.', en: 'Peak reached.' },
    },
  },
  64: {
    number: 64, name_ko: '미제괘(未濟卦) - 아직 건너지 못함', name_hanja: '火水未濟', trigram_upper: 'fire', trigram_lower: 'water', element: 'fire',
    core_meaning: { ko: '모든 효가 부정위에 있어 미완성. 그러나 미완성은 무한한 가능성. 끝은 새로운 시작.', en: 'Incomplete. But incompletion holds infinite possibility.' },
    themes: {
      career: { ko: '아직 완성되지 않았지만 가능성이 있습니다.', en: 'Not complete yet but has potential.' },
      love: { ko: '관계가 형성 중입니다. 서두르지 마세요.', en: 'Relationship forming.' },
      health: { ko: '회복 중입니다. 꾸준한 노력이 필요합니다.', en: 'Recovering.' },
      wealth: { ko: '아직 성과가 나오지 않았지만 기다리세요.', en: 'Results not yet but wait.' },
      timing: { ko: '과도기입니다. 새로운 사이클이 시작되려 합니다.', en: 'Transitional period.' },
    },
  },
};

/**
 * 괘 번호로 프리미엄 데이터 가져오기
 */
export function getPremiumHexagramData(hexagramNumber: number): PremiumHexagramData | null {
  return PREMIUM_HEXAGRAM_DATA[hexagramNumber] || null;
}

/**
 * 팔괘 정보 가져오기
 */
export function getTrigramInfo(trigramKey: string): TrigramInfo | null {
  return TRIGRAM_INFO[trigramKey] || null;
}

/**
 * 오행별 행운 정보
 */
const ELEMENT_LUCKY_INFO: Record<string, LuckyInfo> = {
  metal: {
    colors: { ko: ['흰색', '금색', '은색'], en: ['White', 'Gold', 'Silver'] },
    numbers: [4, 9],
    direction: { ko: '서쪽', en: 'West' }
  },
  wood: {
    colors: { ko: ['초록색', '청색'], en: ['Green', 'Blue'] },
    numbers: [3, 8],
    direction: { ko: '동쪽', en: 'East' }
  },
  water: {
    colors: { ko: ['검정색', '남색'], en: ['Black', 'Navy'] },
    numbers: [1, 6],
    direction: { ko: '북쪽', en: 'North' }
  },
  fire: {
    colors: { ko: ['빨강색', '보라색', '주황색'], en: ['Red', 'Purple', 'Orange'] },
    numbers: [2, 7],
    direction: { ko: '남쪽', en: 'South' }
  },
  earth: {
    colors: { ko: ['노란색', '갈색', '베이지'], en: ['Yellow', 'Brown', 'Beige'] },
    numbers: [5, 10],
    direction: { ko: '중앙', en: 'Center' }
  }
};

/**
 * 괘의 행운 정보 가져오기
 */
export function getLuckyInfo(hexagramNumber: number): LuckyInfo | null {
  const data = PREMIUM_HEXAGRAM_DATA[hexagramNumber];
  if (!data) return null;

  // lucky가 직접 정의되어 있으면 사용
  if (data.lucky) return data.lucky;

  // element 기반으로 행운 정보 반환
  return ELEMENT_LUCKY_INFO[data.element] || null;
}

/**
 * 64괘 binary 매핑 (번호 → binary)
 */
const HEXAGRAM_BINARY: Record<number, string> = {
  1: '111111', 2: '000000', 3: '010001', 4: '100010', 5: '010111',
  6: '111010', 7: '000010', 8: '010000', 9: '110111', 10: '111011',
  11: '000111', 12: '111000', 13: '111101', 14: '101111', 15: '000100',
  16: '001000', 17: '011001', 18: '100110', 19: '000011', 20: '110000',
  21: '101001', 22: '100101', 23: '100000', 24: '000001', 25: '111001',
  26: '100111', 27: '100001', 28: '011110', 29: '010010', 30: '101101',
  31: '011100', 32: '001110', 33: '111100', 34: '001111', 35: '101000',
  36: '000101', 37: '110101', 38: '101011', 39: '010100', 40: '001010',
  41: '100011', 42: '110001', 43: '011111', 44: '111110', 45: '011000',
  46: '000110', 47: '011010', 48: '010110', 49: '011101', 50: '101110',
  51: '001001', 52: '100100', 53: '110100', 54: '001011', 55: '001101',
  56: '101100', 57: '110110', 58: '011011', 59: '110010', 60: '010011',
  61: '110011', 62: '001100', 63: '010101', 64: '101010'
};

/**
 * Binary에서 괘 번호 찾기
 */
function findHexagramByBinary(binary: string): number | null {
  for (const [num, bin] of Object.entries(HEXAGRAM_BINARY)) {
    if (bin === binary) return parseInt(num);
  }
  return null;
}

/**
 * 호괘(互卦) 계산 - 2,3,4효로 하괘, 3,4,5효로 상괘 구성
 * binary 형식: binary[0]=6효(상), binary[5]=1효(하)
 */
export function calculateNuclearHexagram(hexagramNumber: number): { number: number; name_ko: string; name_en: string } | null {
  const binary = HEXAGRAM_BINARY[hexagramNumber];
  if (!binary) return null;

  // binary[0]=6효, binary[1]=5효, binary[2]=4효, binary[3]=3효, binary[4]=2효, binary[5]=1효
  // 하괘(2,3,4효): 4효=binary[2], 3효=binary[3], 2효=binary[4]
  // 상괘(3,4,5효): 5효=binary[1], 4효=binary[2], 3효=binary[3]
  const lowerNuclear = binary[2] + binary[3] + binary[4];
  const upperNuclear = binary[1] + binary[2] + binary[3];
  const nuclearBinary = upperNuclear + lowerNuclear;

  const nuclearNumber = findHexagramByBinary(nuclearBinary);
  if (!nuclearNumber) return null;

  const nuclearData = PREMIUM_HEXAGRAM_DATA[nuclearNumber];
  return {
    number: nuclearNumber,
    name_ko: nuclearData?.name_ko || `제${nuclearNumber}괘`,
    name_en: `Hexagram ${nuclearNumber}`
  };
}

/**
 * 착종괘(錯綜卦) 계산
 */
export function calculateRelatedHexagrams(hexagramNumber: number): {
  inverted: { number: number; name_ko: string; name_en: string } | null;  // 종괘 (뒤집기)
  opposite: { number: number; name_ko: string; name_en: string } | null;  // 착괘 (음양 반전)
} {
  const binary = HEXAGRAM_BINARY[hexagramNumber];
  if (!binary) return { inverted: null, opposite: null };

  // 종괘: 뒤집기 (reverse)
  const invertedBinary = binary.split('').reverse().join('');
  const invertedNumber = findHexagramByBinary(invertedBinary);
  const invertedData = invertedNumber ? PREMIUM_HEXAGRAM_DATA[invertedNumber] : null;

  // 착괘: 음양 반전
  const oppositeBinary = binary.split('').map(b => b === '1' ? '0' : '1').join('');
  const oppositeNumber = findHexagramByBinary(oppositeBinary);
  const oppositeData = oppositeNumber ? PREMIUM_HEXAGRAM_DATA[oppositeNumber] : null;

  return {
    inverted: invertedNumber ? {
      number: invertedNumber,
      name_ko: invertedData?.name_ko || `제${invertedNumber}괘`,
      name_en: `Hexagram ${invertedNumber}`
    } : null,
    opposite: oppositeNumber ? {
      number: oppositeNumber,
      name_ko: oppositeData?.name_ko || `제${oppositeNumber}괘`,
      name_en: `Hexagram ${oppositeNumber}`
    } : null
  };
}
