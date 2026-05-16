/**
 * 12지지(地支) 해석 — 자축인묘진사오미신유술해
 * 각 지지의 음양/오행/동물/계절/시간/숨은 천간(지장간)과
 * 성격·연애·직업·건강 도메인별 짧은 해석.
 */

import type { BilingualText, FiveElement } from '../../types/core';

export type EarthlyBranch =
  | '자' | '축' | '인' | '묘' | '진' | '사'
  | '오' | '미' | '신' | '유' | '술' | '해';

export interface EarthlyBranchEntry {
  hanja: string;
  animal: string;
  element: FiveElement;
  yinYang: '양' | '음';
  season: BilingualText;
  hourRange: string;
  hiddenStems: string[];
  personality: BilingualText;
  love: BilingualText;
  career: BilingualText;
  health: BilingualText;
  fortune: BilingualText;
}

export const EARTHLY_BRANCHES: Record<EarthlyBranch, EarthlyBranchEntry> = {
  자: {
    hanja: '子',
    animal: '🐭',
    element: 'water',
    yinYang: '양',
    season: { ko: '한겨울', en: 'midwinter' },
    hourRange: '23:30~01:30',
    hiddenStems: ['계'],
    personality: {
      ko: '지혜롭고 적응력이 뛰어나며, 조용히 깊이 흐르는 통찰을 가진 사람이에요.',
      en: 'Wise and adaptable, with quietly flowing deep insight.',
    },
    love: {
      ko: '겉으론 신중하지만 속은 정열적이고, 한번 마음을 열면 깊게 사랑해요.',
      en: 'Cautious outside but passionate inside; loves deeply once committed.',
    },
    career: {
      ko: '연구·기획·교육·심리 등 정보를 다루는 분야에서 빛나요.',
      en: 'Shines in research, planning, education, and psychology.',
    },
    health: {
      ko: '신장·방광·생식기 계열 관리가 필요해요.',
      en: 'Watch kidneys, bladder, and reproductive system.',
    },
    fortune: {
      ko: '말년 운이 점점 깊어지며 지혜로 부를 일구는 흐름이에요.',
      en: 'Later years deepen — wisdom builds wealth.',
    },
  },
  축: {
    hanja: '丑',
    animal: '🐂',
    element: 'earth',
    yinYang: '음',
    season: { ko: '늦겨울', en: 'late winter' },
    hourRange: '01:30~03:30',
    hiddenStems: ['기', '계', '신'],
    personality: {
      ko: '묵묵하고 성실하며, 한번 정한 길은 끝까지 가는 인내의 사람이에요.',
      en: 'Steady, diligent, and patient — walks the chosen path to the end.',
    },
    love: {
      ko: '말은 적지만 행동으로 사랑을 증명하는 진중한 스타일이에요.',
      en: 'Few words, but proves love through actions.',
    },
    career: {
      ko: '농업·부동산·축산·전통·금융 분야의 장기 축적에 강해요.',
      en: 'Excels in agriculture, real estate, finance — long-term accumulation.',
    },
    health: {
      ko: '비장·위·관절·당뇨 관리가 필요해요.',
      en: 'Watch spleen, stomach, joints, and blood sugar.',
    },
    fortune: {
      ko: '느리지만 흔들리지 않는 부의 축적형 흐름이에요.',
      en: 'Slow but unshakable wealth accumulation.',
    },
  },
  인: {
    hanja: '寅',
    animal: '🐯',
    element: 'wood',
    yinYang: '양',
    season: { ko: '초봄', en: 'early spring' },
    hourRange: '03:30~05:30',
    hiddenStems: ['갑', '병', '무'],
    personality: {
      ko: '진취적이고 용감하며, 세상을 향해 가장 먼저 가지를 뻗는 개척자예요.',
      en: 'Bold and pioneering — the first branch reaching toward the world.',
    },
    love: {
      ko: '직진형 고백, 헌신적 보호, 자기 색이 분명한 연애예요.',
      en: 'Direct confessions, devoted protection, a distinct love color.',
    },
    career: {
      ko: '리더십·창업·공무·교육·정치에서 두각을 보여요.',
      en: 'Stands out in leadership, founding, public service, education, politics.',
    },
    health: {
      ko: '간·근육·신경 긴장 주의가 필요해요.',
      en: 'Watch liver, muscles, and nerve tension.',
    },
    fortune: {
      ko: '청년·중년기 큰 도약 운이 강해요.',
      en: 'Strong leap of fortune in youth and midlife.',
    },
  },
  묘: {
    hanja: '卯',
    animal: '🐰',
    element: 'wood',
    yinYang: '음',
    season: { ko: '한봄', en: 'mid-spring' },
    hourRange: '05:30~07:30',
    hiddenStems: ['을'],
    personality: {
      ko: '부드럽고 예술적이며, 사람과 환경에 섬세하게 반응하는 감성형이에요.',
      en: 'Gentle and artistic — sensitively responds to people and environment.',
    },
    love: {
      ko: '로맨틱하고 분위기를 만들 줄 알며, 정서적 교감을 가장 중시해요.',
      en: 'Romantic, sets the mood, values emotional rapport most.',
    },
    career: {
      ko: '예술·디자인·미용·상담·교육 등 섬세한 손길의 분야에 적합해요.',
      en: 'Suited to art, design, beauty, counseling, education — fields needing delicacy.',
    },
    health: {
      ko: '간·시력·신경 예민함 관리가 필요해요.',
      en: 'Watch liver, eyes, and nerve sensitivity.',
    },
    fortune: {
      ko: '사람을 통한 기회와 인연으로 운이 풀려요.',
      en: 'Luck unlocks through people and relationships.',
    },
  },
  진: {
    hanja: '辰',
    animal: '🐲',
    element: 'earth',
    yinYang: '양',
    season: { ko: '봄과 여름 사이', en: 'spring-to-summer transition' },
    hourRange: '07:30~09:30',
    hiddenStems: ['무', '을', '계'],
    personality: {
      ko: '카리스마와 포용력을 겸비한 큰 그릇, 변화를 두려워하지 않아요.',
      en: 'Charisma and breadth combined — unafraid of change.',
    },
    love: {
      ko: '강한 자존감과 깊은 헌신을 동시에 보이는 입체적 연애를 해요.',
      en: 'Strong self-worth and deep devotion in equal measure.',
    },
    career: {
      ko: '대기업·공기관·연구·종교·창업 어디서든 큰 무대에 어울려요.',
      en: 'Fits big stages — corporations, public sector, research, founding.',
    },
    health: {
      ko: '소화기·피부·자율신경 관리가 필요해요.',
      en: 'Watch digestion, skin, and autonomic nervous system.',
    },
    fortune: {
      ko: '시기마다 운명적 전환점이 자주 오는 변화 강한 흐름이에요.',
      en: 'Fated turning points arrive periodically — change-rich flow.',
    },
  },
  사: {
    hanja: '巳',
    animal: '🐍',
    element: 'fire',
    yinYang: '음',
    season: { ko: '초여름', en: 'early summer' },
    hourRange: '09:30~11:30',
    hiddenStems: ['병', '무', '경'],
    personality: {
      ko: '직관이 날카롭고 신중하며, 본질을 꿰뚫어 보는 지혜형이에요.',
      en: 'Sharp intuition, careful, sees through to the essence.',
    },
    love: {
      ko: '냉정한 듯 따뜻하고, 한 사람에게 깊고 집요하게 끌려요.',
      en: 'Cool yet warm — drawn deeply and persistently to one person.',
    },
    career: {
      ko: '전략·분석·법률·의학·종교 등 본질을 다루는 일에 강해요.',
      en: 'Strong in strategy, analysis, law, medicine, religion.',
    },
    health: {
      ko: '심장·혈관·시력 관리가 필요해요.',
      en: 'Watch heart, blood vessels, and eyesight.',
    },
    fortune: {
      ko: '핵심을 잡는 통찰로 의외의 큰 기회를 만들어요.',
      en: 'Sharp insight creates unexpected big breaks.',
    },
  },
  오: {
    hanja: '午',
    animal: '🐎',
    element: 'fire',
    yinYang: '양',
    season: { ko: '한여름', en: 'midsummer' },
    hourRange: '11:30~13:30',
    hiddenStems: ['정', '기'],
    personality: {
      ko: '밝고 자유로우며, 무대 위에서 빛나는 에너지 넘치는 사람이에요.',
      en: 'Bright and free — energy that shines on stage.',
    },
    love: {
      ko: '열정적이고 표현이 풍부하며, 정체된 연애를 견디지 못해요.',
      en: 'Passionate and expressive — cannot tolerate stagnant love.',
    },
    career: {
      ko: '엔터테인먼트·영업·마케팅·스포츠 등 활동성 강한 분야에 어울려요.',
      en: 'Fits entertainment, sales, marketing, sports — high-activity fields.',
    },
    health: {
      ko: '심장·혈압·과열 주의가 필요해요.',
      en: 'Watch heart, blood pressure, and overheating.',
    },
    fortune: {
      ko: '대중과 무대에서 부를 얻는 흐름이에요.',
      en: 'Wealth flows through audiences and stages.',
    },
  },
  미: {
    hanja: '未',
    animal: '🐑',
    element: 'earth',
    yinYang: '음',
    season: { ko: '늦여름', en: 'late summer' },
    hourRange: '13:30~15:30',
    hiddenStems: ['기', '정', '을'],
    personality: {
      ko: '온화하고 예술적 감각이 뛰어나며, 관계 속에서 평온을 찾는 사람이에요.',
      en: 'Gentle, artistic — finds peace within relationships.',
    },
    love: {
      ko: '배려 깊고 헌신적이며, 가정적인 안정을 원해요.',
      en: 'Caring and devoted — seeks domestic stability.',
    },
    career: {
      ko: '문화·예술·요식·서비스·교육 분야에서 강점을 보여요.',
      en: 'Strong in culture, arts, food, service, education.',
    },
    health: {
      ko: '비장·소화·당뇨 관리가 필요해요.',
      en: 'Watch spleen, digestion, and blood sugar.',
    },
    fortune: {
      ko: '인간관계와 가족 인연을 통해 자산이 안정돼요.',
      en: 'Assets stabilize through people and family bonds.',
    },
  },
  신: {
    hanja: '申',
    animal: '🐒',
    element: 'metal',
    yinYang: '양',
    season: { ko: '초가을', en: 'early autumn' },
    hourRange: '15:30~17:30',
    hiddenStems: ['경', '임', '무'],
    personality: {
      ko: '재치·기획력·실행력 삼박자가 빠른 두뇌형 행동가예요.',
      en: 'Wit, planning, execution — fast-brain doer.',
    },
    love: {
      ko: '대화가 통하는 상대를 좋아하고, 머리로 먼저 사랑해요.',
      en: 'Likes verbal connection — loves with the mind first.',
    },
    career: {
      ko: '비즈니스·금융·IT·미디어·무역 등 다양한 영역에 통해요.',
      en: 'Versatile in business, finance, IT, media, trade.',
    },
    health: {
      ko: '폐·대장·신경계 관리가 필요해요.',
      en: 'Watch lungs, large intestine, and nervous system.',
    },
    fortune: {
      ko: '여러 갈래의 수입원을 만들 수 있는 다재능 흐름이에요.',
      en: 'Multi-talent flow — can build multiple income streams.',
    },
  },
  유: {
    hanja: '酉',
    animal: '🐔',
    element: 'metal',
    yinYang: '음',
    season: { ko: '한가을', en: 'mid-autumn' },
    hourRange: '17:30~19:30',
    hiddenStems: ['신'],
    personality: {
      ko: '정교하고 미적 감각이 뛰어나며, 디테일을 끝까지 다듬는 완벽형이에요.',
      en: 'Refined aesthetic sense — polishes details to perfection.',
    },
    love: {
      ko: '한 사람을 곱게 사랑하며, 약속·예의·격식을 중요시해요.',
      en: 'Loves one person tenderly — values promises, manners, formality.',
    },
    career: {
      ko: '주얼리·뷰티·디자인·감정·회계처럼 정밀함이 자산인 분야에 적합해요.',
      en: 'Suited to jewelry, beauty, design, appraisal, accounting — precision-as-asset fields.',
    },
    health: {
      ko: '호흡기·피부·치아 관리가 필요해요.',
      en: 'Watch respiration, skin, and teeth.',
    },
    fortune: {
      ko: '품격 있는 결과물로 가치를 만드는 흐름이에요.',
      en: 'Creates value through refined, elegant output.',
    },
  },
  술: {
    hanja: '戌',
    animal: '🐕',
    element: 'earth',
    yinYang: '양',
    season: { ko: '늦가을', en: 'late autumn' },
    hourRange: '19:30~21:30',
    hiddenStems: ['무', '신', '정'],
    personality: {
      ko: '의리 있고 책임감 강하며, 옳다고 믿는 길을 끝까지 지키는 사람이에요.',
      en: 'Loyal and responsible — guards the path believed to be right.',
    },
    love: {
      ko: '한번 정한 사람에게는 의리로 끝까지 가는 신실형이에요.',
      en: 'Faithful — sees the chosen one through to the end.',
    },
    career: {
      ko: '공직·군경·법무·보안·교육 분야에서 신뢰가 자산이에요.',
      en: 'Trust is the asset in public service, military, law, security, education.',
    },
    health: {
      ko: '소화기·관절·심혈관 관리가 필요해요.',
      en: 'Watch digestion, joints, and cardiovascular health.',
    },
    fortune: {
      ko: '쌓아온 신용이 중년 이후 큰 자산이 돼요.',
      en: 'Built-up credit becomes a major asset after midlife.',
    },
  },
  해: {
    hanja: '亥',
    animal: '🐗',
    element: 'water',
    yinYang: '음',
    season: { ko: '초겨울', en: 'early winter' },
    hourRange: '21:30~23:30',
    hiddenStems: ['임', '갑'],
    personality: {
      ko: '깊은 상상력과 영적 직관이 발달한 사색형이에요.',
      en: 'Deep imagination and spiritual intuition — a contemplative.',
    },
    love: {
      ko: '말없이 마음을 주며, 영혼이 통하는 깊은 연결을 원해요.',
      en: 'Loves silently — seeks soul-deep connection.',
    },
    career: {
      ko: '문학·예술·치유·종교·연구처럼 깊이를 다루는 일에 적합해요.',
      en: 'Suited to literature, art, healing, religion, research — depth-handling work.',
    },
    health: {
      ko: '신장·생식기·하반신 순환 관리가 필요해요.',
      en: 'Watch kidneys, reproductive system, lower-body circulation.',
    },
    fortune: {
      ko: '말년에 영적·창의적 결실이 빛나는 늦성장 흐름이에요.',
      en: 'Late-bloom flow — spiritual and creative fruit shines in later years.',
    },
  },
};

/** Korean branch to English short form. */
export const BRANCH_EN: Record<EarthlyBranch, string> = {
  자: 'Ja (Rat)', 축: 'Chuk (Ox)', 인: 'In (Tiger)', 묘: 'Myo (Rabbit)',
  진: 'Jin (Dragon)', 사: 'Sa (Snake)', 오: 'O (Horse)', 미: 'Mi (Sheep)',
  신: 'Sin (Monkey)', 유: 'Yu (Rooster)', 술: 'Sul (Dog)', 해: 'Hae (Pig)',
};
