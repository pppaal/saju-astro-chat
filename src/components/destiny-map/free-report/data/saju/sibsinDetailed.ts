/**
 * 십신(十神) 10종 상세 해석.
 * 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인.
 *
 * 기존 SIBSIN_LOVE_TRAITS / SIBSIN_MARRIAGE_TRAITS 는 비겁·식상·재성·관성·인성의
 * 5대분류 기준. 본 파일은 raw 사주 계산이 산출하는 10정종(正/偏) 구분을 그대로
 * 받아 6개 도메인(성격·연애·직업·재물·건강·카르마)에 대응하는 해석을 제공한다.
 */

import type { BilingualText, SibsinType } from '../../types/core';

export interface SibsinDetailedEntry {
  hanja: string;
  category: '비겁' | '식상' | '재성' | '관성' | '인성';
  meaning: BilingualText;
  personality: BilingualText;
  love: BilingualText;
  career: BilingualText;
  wealth: BilingualText;
  health: BilingualText;
  karma: BilingualText;
}

export const SIBSIN_DETAILED: Partial<Record<SibsinType, SibsinDetailedEntry>> = {
  비견: {
    hanja: '比肩',
    category: '비겁',
    meaning: { ko: '나와 같은 오행·음양 — 동료·동등자', en: 'Same element & polarity — peer / equal' },
    personality: {
      ko: '자아가 단단하고 독립적이며, 자기 페이스를 지키는 사람이에요.',
      en: 'Solid self, independent, holds own pace.',
    },
    love: {
      ko: '대등한 파트너십을 원하며, 의존이나 간섭은 견디지 못해요.',
      en: 'Wants an equal partnership; cannot stand dependence or interference.',
    },
    career: {
      ko: '동업·전문직·1인 사업에 강하고, 자기 이름으로 일할 때 빛나요.',
      en: 'Excels in partnerships, professions, solo work — shines under own name.',
    },
    wealth: {
      ko: '동료와 함께 버는 흐름이지만, 친구와 돈이 얽히면 다툼이 생기기 쉬워요.',
      en: 'Earns alongside peers; mixing money with friends easily breeds conflict.',
    },
    health: {
      ko: '과로·번아웃·자기 한계 무시에 주의해요.',
      en: 'Watch overwork, burnout, and ignoring own limits.',
    },
    karma: {
      ko: '평생 과제는 협력과 양보 — 혼자만의 길에서 벗어나는 연습이에요.',
      en: 'Life lesson: cooperation and yielding — practice stepping off the solo path.',
    },
  },
  겁재: {
    hanja: '劫財',
    category: '비겁',
    meaning: { ko: '나와 같은 오행·다른 음양 — 경쟁자·형제', en: 'Same element, opposite polarity — rival / sibling' },
    personality: {
      ko: '승부욕과 직진성이 강해 무엇이든 끝장을 보려는 기질이에요.',
      en: 'Strong competitive drive — pushes everything to the finish line.',
    },
    love: {
      ko: '강렬한 끌림과 빠른 진행, 그러나 충돌도 잦은 격정형 연애예요.',
      en: 'Intense pull and fast pace — but frequent clashes; passionate love.',
    },
    career: {
      ko: '스포츠·영업·창업·투쟁이 따르는 영역에서 자기 한계를 깨요.',
      en: 'Sports, sales, founding, combative arenas — breaks own ceilings.',
    },
    wealth: {
      ko: '큰 수입·큰 지출의 사이클이 반복되니 통장 분리·자동 저축이 필수예요.',
      en: 'Big income / big spending cycles — separate accounts and autosave are essential.',
    },
    health: {
      ko: '간장·신경 긴장·외상 사고 주의가 필요해요.',
      en: 'Watch liver, nerve tension, and accidents.',
    },
    karma: {
      ko: '욕망을 직시하고 나눔으로 돌리는 연습이 평생 과제예요.',
      en: 'Lifelong task: face desire, learn to channel it into sharing.',
    },
  },
  식신: {
    hanja: '食神',
    category: '식상',
    meaning: { ko: '내가 생하는 오행·같은 음양 — 표현·즐거움·자녀', en: 'Element I generate, same polarity — expression / joy / offspring' },
    personality: {
      ko: '느긋하고 따뜻하며, 즐기는 법을 아는 향유형이에요.',
      en: 'Easygoing, warm — knows how to enjoy life.',
    },
    love: {
      ko: '편안하고 자연스러운 연애를 추구하며, 함께 맛있는 것을 나누는 사람이에요.',
      en: 'Pursues comfortable, natural love — shares good food and ease.',
    },
    career: {
      ko: '요리·콘텐츠·교육·디자인 등 결과물이 즐거움을 주는 영역에 맞아요.',
      en: 'Fits cooking, content, education, design — fields whose outputs bring joy.',
    },
    wealth: {
      ko: '꾸준한 부의 흐름이지만, 한 번에 큰 도박은 어울리지 않아요.',
      en: 'Steady wealth flow — big gambles do not suit.',
    },
    health: {
      ko: '소화기·체중·당분 섭취 관리가 필요해요.',
      en: 'Watch digestion, weight, and sugar intake.',
    },
    karma: {
      ko: '재능을 안에 가두지 않고 세상에 풀어내는 것이 사명이에요.',
      en: 'Mission: do not lock talent inside — release it into the world.',
    },
  },
  상관: {
    hanja: '傷官',
    category: '식상',
    meaning: { ko: '내가 생하는 오행·다른 음양 — 비판·반항·창조', en: 'Element I generate, opposite polarity — critique / rebellion / creation' },
    personality: {
      ko: '재기 발랄하고 비판력이 날카로우며, 권위에 잘 굽히지 않아요.',
      en: 'Witty, sharply critical — does not bow easily to authority.',
    },
    love: {
      ko: '매력적이고 자극적이지만, 잔소리가 잦으면 관계가 빠르게 식어요.',
      en: 'Magnetic and stimulating — frequent nagging cools the bond fast.',
    },
    career: {
      ko: '예술·언론·기획·연구·법조 등 비판력을 무기로 쓰는 일에 강해요.',
      en: 'Strong in art, journalism, planning, research, law — fields wielding critique.',
    },
    wealth: {
      ko: '재능 기반 수입이 폭발할 수 있지만, 충동 소비를 조심해야 해요.',
      en: 'Talent-based income can spike — but watch impulse spending.',
    },
    health: {
      ko: '갑상선·구강·말로 인한 스트레스 주의가 필요해요.',
      en: 'Watch thyroid, mouth, and stress from speech.',
    },
    karma: {
      ko: '말과 표현을 어떻게 쓸 것인가가 평생의 시험대예요.',
      en: 'Lifelong test: how you wield words and expression.',
    },
  },
  편재: {
    hanja: '偏財',
    category: '재성',
    meaning: { ko: '내가 극하는 오행·다른 음양 — 유동·기회재', en: 'Element I control, opposite polarity — fluid / opportunity wealth' },
    personality: {
      ko: '사교적이고 활달하며, 기회를 잘 잡는 호쾌형이에요.',
      en: 'Social, lively — catches opportunities boldly.',
    },
    love: {
      ko: '여러 사람과 잘 어울리고 매력 발산이 자연스러우며 연애 스펙트럼이 넓어요.',
      en: 'Mingles easily, charms naturally — wide love spectrum.',
    },
    career: {
      ko: '영업·무역·부동산·투자·서비스 등 흐름 있는 분야에 강해요.',
      en: 'Strong in sales, trade, real estate, investment, service — flow-rich fields.',
    },
    wealth: {
      ko: '한 방의 큰 수입과 빠른 회전이 특징, 분산 투자가 핵심이에요.',
      en: 'Big windfalls and fast turnover — diversification is key.',
    },
    health: {
      ko: '과음·과식·간 부담을 조심해야 해요.',
      en: 'Watch overdrinking, overeating, and liver strain.',
    },
    karma: {
      ko: '재물을 흘려보내며 인연을 만드는 연습이 인생 과제예요.',
      en: 'Lesson: let wealth flow through you, build bonds with it.',
    },
  },
  정재: {
    hanja: '正財',
    category: '재성',
    meaning: { ko: '내가 극하는 오행·같은 음양 — 정착재·배우자(남)', en: 'Element I control, same polarity — fixed wealth / spouse (for men)' },
    personality: {
      ko: '성실하고 책임감 있으며, 자기 노동의 가치를 아는 정직형이에요.',
      en: 'Diligent, responsible — knows the value of own labor.',
    },
    love: {
      ko: '안정적이고 책임지는 연애를 추구하며 약속을 잘 지켜요.',
      en: 'Pursues stable, responsible love — keeps promises.',
    },
    career: {
      ko: '회계·금융·관리·전문직처럼 꾸준함이 자산인 분야에 맞아요.',
      en: 'Fits accounting, finance, management, professions — steadiness is the asset.',
    },
    wealth: {
      ko: '정기 수입·저축·부동산 등 차곡차곡 쌓는 부에 강해요.',
      en: 'Strong in regular income, savings, real estate — wealth that piles up.',
    },
    health: {
      ko: '과로·만성 피로 누적을 관리해야 해요.',
      en: 'Manage overwork and accumulated chronic fatigue.',
    },
    karma: {
      ko: '책임을 짊어진 만큼 자기 자신도 돌보는 균형 연습이에요.',
      en: 'Practice: carry responsibility AND tend to yourself in balance.',
    },
  },
  편관: {
    hanja: '偏官',
    category: '관성',
    meaning: { ko: '나를 극하는 오행·같은 음양 — 칠살·권력·압박', en: 'Element controlling me, same polarity — power / pressure (Seven Killings)' },
    personality: {
      ko: '카리스마·결단력·강한 통제력을 가진 야망가형이에요.',
      en: 'Charismatic, decisive, strong control — ambitious type.',
    },
    love: {
      ko: '강렬하고 주도적이며, 약한 모습을 보이기 어려워해요.',
      en: 'Intense and leading — has trouble showing weakness.',
    },
    career: {
      ko: '군경·법조·정치·대형 프로젝트 리더 등 압박을 견디는 자리에 맞아요.',
      en: 'Fits military, law, politics, big-project leadership — pressure-bearing roles.',
    },
    wealth: {
      ko: '권한·직위가 부를 만드는 흐름이에요.',
      en: 'Authority and position generate wealth.',
    },
    health: {
      ko: '심혈관·고혈압·스트레스성 두통 주의가 필요해요.',
      en: 'Watch cardiovascular, hypertension, and stress headaches.',
    },
    karma: {
      ko: '힘을 가졌을 때 함부로 휘두르지 않는 것이 평생 시험이에요.',
      en: 'Lifelong test: when you have power, wield it carefully.',
    },
  },
  정관: {
    hanja: '正官',
    category: '관성',
    meaning: { ko: '나를 극하는 오행·다른 음양 — 정도·명예·배우자(여)', en: 'Element controlling me, opposite polarity — right path / honor / spouse (for women)' },
    personality: {
      ko: '품격 있고 공정하며, 사회적 명예를 중요시하는 모범형이에요.',
      en: 'Dignified, fair — values social honor; an exemplar.',
    },
    love: {
      ko: '진중하고 격을 갖춘 연애를 하며 결혼관이 분명해요.',
      en: 'Earnest, well-mannered love — clear marriage values.',
    },
    career: {
      ko: '공직·관리직·교육·법조 등 신뢰가 자산인 영역에 어울려요.',
      en: 'Fits public service, management, education, law — trust-as-asset domains.',
    },
    wealth: {
      ko: '명예와 함께 따라오는 안정적 부의 흐름이에요.',
      en: 'Stable wealth follows honor.',
    },
    health: {
      ko: '과긴장·완벽주의로 인한 위장 부담을 조심해야 해요.',
      en: 'Watch stomach strain from over-tension and perfectionism.',
    },
    karma: {
      ko: '규범 안에서 살되 자기 본심을 잃지 않는 것이 과제예요.',
      en: 'Lesson: live within norms but do not lose your true heart.',
    },
  },
  편인: {
    hanja: '偏印',
    category: '인성',
    meaning: { ko: '나를 생하는 오행·같은 음양 — 비주류 지식·직관', en: 'Element generating me, same polarity — alt knowledge / intuition' },
    personality: {
      ko: '예리한 직관과 독특한 시야를 가진 비주류 지성형이에요.',
      en: 'Sharp intuition, unique view — non-mainstream intellect.',
    },
    love: {
      ko: '독특한 끌림에 약하고, 영적이고 신비로운 관계를 원해요.',
      en: 'Weak for unusual attractions — wants spiritual, mysterious bonds.',
    },
    career: {
      ko: '연구·예술·심리·종교·테크 등 깊이 파고드는 일에 강해요.',
      en: 'Strong in research, art, psychology, religion, tech — deep-diving work.',
    },
    wealth: {
      ko: '지식·정보·창의성에서 부가 나오는 후순환 흐름이에요.',
      en: 'Wealth comes from knowledge, info, creativity — late-cycle flow.',
    },
    health: {
      ko: '불면·신경 예민·소화 부담을 관리해야 해요.',
      en: 'Manage insomnia, nerve sensitivity, and digestive load.',
    },
    karma: {
      ko: '머릿속 세계와 현실 세계 사이의 다리를 놓는 것이 과제예요.',
      en: 'Task: bridge the inner world and outer reality.',
    },
  },
  정인: {
    hanja: '正印',
    category: '인성',
    meaning: { ko: '나를 생하는 오행·다른 음양 — 정통 지식·어머니', en: 'Element generating me, opposite polarity — orthodox knowledge / mother' },
    personality: {
      ko: '온화하고 학문적이며, 사람을 품을 줄 아는 보호자형이에요.',
      en: 'Gentle and scholarly — a protector who can embrace people.',
    },
    love: {
      ko: '돌봐주는 연애를 하며 정신적 교감이 깊어야 마음을 줘요.',
      en: 'Caring love — needs deep mental rapport before opening heart.',
    },
    career: {
      ko: '교육·연구·의료·상담·문헌 분야가 천직이에요.',
      en: 'Calling: education, research, medicine, counseling, literature.',
    },
    wealth: {
      ko: '지위와 신뢰가 쌓이며 따라오는 부의 흐름이에요.',
      en: 'Wealth that follows accumulated standing and trust.',
    },
    health: {
      ko: '소화·신장·갑상선·정신적 과부하 관리가 필요해요.',
      en: 'Watch digestion, kidneys, thyroid, and mental overload.',
    },
    karma: {
      ko: '받은 사랑을 다음 세대에 흘려보내는 것이 사명이에요.',
      en: 'Mission: pass on the love received to the next generation.',
    },
  },
};
