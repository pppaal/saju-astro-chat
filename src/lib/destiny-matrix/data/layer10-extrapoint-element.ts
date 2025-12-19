// src/lib/destiny-matrix/data/layer10-extrapoint-element.ts
/**
 * ============================================================================
 * Destiny Fusion Matrix™ - Layer 10: ExtraPoint-Element Matrix (엑스트라포인트)
 * ============================================================================
 * © 2024 All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, distribution, or reverse engineering is prohibited.
 * ============================================================================
 */

import type { InteractionCode, ExtraPointName } from '../types';
import type { FiveElement, SibsinKind } from '../../Saju/types';

const c = (
  level: InteractionCode['level'],
  score: number,
  icon: string,
  colorCode: InteractionCode['colorCode'],
  keyword: string,
  keywordEn: string
): InteractionCode => ({
  level,
  score,
  icon,
  colorCode,
  keyword,
  keywordEn,
});

// 엑스트라포인트-오행 교차 매트릭스
export const EXTRAPOINT_ELEMENT_MATRIX: Record<ExtraPointName, Record<FiveElement, InteractionCode>> = {
  // Chiron (카이론) - 상처받은 치유자, 상처와 치유
  Chiron: {
    '목': c('amplify', 7, '🌱', 'green', '성장상처', 'Growth wound'),
    '화': c('clash', 5, '🔥', 'yellow', '열정상처', 'Passion wound'),
    '토': c('amplify', 8, '🏥', 'green', '안정치유', 'Stable healing'),
    '금': c('clash', 4, '✂️', 'yellow', '단절상처', 'Severance wound'),
    '수': c('extreme', 9, '💧', 'purple', '감정치유', 'Emotional healing'),
  },

  // Lilith (릴리스) - 어둠의 달, 억압된 본능, 그림자
  Lilith: {
    '목': c('clash', 5, '🌑', 'yellow', '성장그림자', 'Growth shadow'),
    '화': c('extreme', 9, '🔥', 'purple', '열정그림자', 'Passion shadow'),
    '토': c('clash', 4, '🏚️', 'yellow', '안정그림자', 'Stable shadow'),
    '금': c('extreme', 8, '⚔️', 'purple', '결단그림자', 'Decision shadow'),
    '수': c('extreme', 9, '🌊', 'purple', '무의식그림자', 'Unconscious shadow'),
  },

  // Part of Fortune (행운점) - 물질적 행운과 성공의 지점
  PartOfFortune: {
    '목': c('extreme', 9, '🍀', 'purple', '성장행운', 'Growth fortune'),
    '화': c('amplify', 8, '🌟', 'green', '열정행운', 'Passion fortune'),
    '토': c('extreme', 10, '💰', 'purple', '안정행운', 'Stable fortune'),
    '금': c('extreme', 9, '💎', 'purple', '결실행운', 'Harvest fortune'),
    '수': c('amplify', 8, '🌊', 'green', '흐름행운', 'Flow fortune'),
  },

  // Vertex (버텍스) - 운명적 만남의 지점
  Vertex: {
    '목': c('amplify', 8, '🌱', 'green', '성장인연', 'Growth fate'),
    '화': c('extreme', 9, '💫', 'purple', '열정인연', 'Passion fate'),
    '토': c('amplify', 7, '🏠', 'green', '안정인연', 'Stable fate'),
    '금': c('amplify', 7, '💍', 'green', '결속인연', 'Bond fate'),
    '수': c('extreme', 9, '🌀', 'purple', '운명인연', 'Destiny fate'),
  },

  // North Node (북쪽 노드) - 카르마적 성장 방향
  NorthNode: {
    '목': c('extreme', 10, '🚀', 'purple', '성장운명', 'Growth destiny'),
    '화': c('extreme', 9, '🔥', 'purple', '열정운명', 'Passion destiny'),
    '토': c('amplify', 8, '🏔️', 'green', '안정운명', 'Stable destiny'),
    '금': c('amplify', 7, '⚔️', 'green', '결단운명', 'Decision destiny'),
    '수': c('amplify', 8, '🌊', 'green', '지혜운명', 'Wisdom destiny'),
  },

  // South Node (남쪽 노드) - 전생의 카르마, 과거 패턴
  SouthNode: {
    '목': c('clash', 5, '🌳', 'yellow', '과거성장', 'Past growth'),
    '화': c('clash', 5, '🔥', 'yellow', '과거열정', 'Past passion'),
    '토': c('balance', 6, '🏛️', 'blue', '과거안정', 'Past stability'),
    '금': c('clash', 4, '⚔️', 'yellow', '과거결단', 'Past decision'),
    '수': c('clash', 5, '🌊', 'yellow', '과거지혜', 'Past wisdom'),
  },
};

// 엑스트라포인트-십신 교차 매트릭스
export const EXTRAPOINT_SIBSIN_MATRIX: Record<ExtraPointName, Partial<Record<SibsinKind, InteractionCode>>> = {
  Chiron: {
    '비견': c('amplify', 7, '🤝', 'green', '동류치유', 'Peer healing'),
    '겁재': c('clash', 4, '😰', 'yellow', '경쟁상처', 'Competition wound'),
    '식신': c('extreme', 9, '🎨', 'purple', '표현치유', 'Expression healing'),
    '상관': c('clash', 5, '💔', 'yellow', '반항상처', 'Rebellion wound'),
    '편재': c('amplify', 7, '💰', 'green', '재물치유', 'Wealth healing'),
    '정재': c('amplify', 8, '🏠', 'green', '안정치유', 'Stability healing'),
    '편관': c('clash', 4, '⚔️', 'yellow', '권위상처', 'Authority wound'),
    '정관': c('amplify', 7, '🎖️', 'green', '명예치유', 'Honor healing'),
    '편인': c('extreme', 9, '🔮', 'purple', '영적치유', 'Spiritual healing'),
    '정인': c('extreme', 9, '🤱', 'purple', '양육치유', 'Nurturing healing'),
  },
  Lilith: {
    '비견': c('clash', 5, '🌑', 'yellow', '자아그림자', 'Self shadow'),
    '겁재': c('extreme', 8, '😈', 'purple', '충동그림자', 'Impulse shadow'),
    '식신': c('amplify', 7, '🎭', 'green', '표현그림자', 'Expression shadow'),
    '상관': c('extreme', 9, '💥', 'purple', '반항그림자', 'Rebellion shadow'),
    '편재': c('clash', 5, '💸', 'yellow', '탐욕그림자', 'Greed shadow'),
    '정재': c('clash', 4, '🔒', 'yellow', '집착그림자', 'Obsession shadow'),
    '편관': c('extreme', 9, '⚔️', 'purple', '권력그림자', 'Power shadow'),
    '정관': c('clash', 4, '🎭', 'yellow', '위선그림자', 'Hypocrisy shadow'),
    '편인': c('extreme', 9, '🌀', 'purple', '무의식그림자', 'Unconscious shadow'),
    '정인': c('clash', 5, '😢', 'yellow', '의존그림자', 'Dependence shadow'),
  },
  PartOfFortune: {
    '비견': c('amplify', 8, '🤝', 'green', '동반행운', 'Companion fortune'),
    '겁재': c('clash', 4, '🎲', 'yellow', '경쟁행운', 'Competition fortune'),
    '식신': c('extreme', 9, '🎨', 'purple', '창작행운', 'Creative fortune'),
    '상관': c('clash', 5, '📢', 'yellow', '표현행운', 'Expression fortune'),
    '편재': c('extreme', 10, '💰', 'purple', '투자행운', 'Investment fortune'),
    '정재': c('extreme', 10, '🏦', 'purple', '저축행운', 'Savings fortune'),
    '편관': c('amplify', 7, '🏛️', 'green', '권력행운', 'Power fortune'),
    '정관': c('extreme', 9, '🎖️', 'purple', '명예행운', 'Honor fortune'),
    '편인': c('amplify', 7, '🔮', 'green', '영적행운', 'Spiritual fortune'),
    '정인': c('amplify', 8, '📚', 'green', '학문행운', 'Academic fortune'),
  },
  Vertex: {
    '비견': c('amplify', 8, '🤝', 'green', '동료인연', 'Colleague fate'),
    '겁재': c('clash', 5, '⚔️', 'yellow', '경쟁인연', 'Competition fate'),
    '식신': c('amplify', 8, '🎨', 'green', '창작인연', 'Creative fate'),
    '상관': c('clash', 5, '💬', 'yellow', '소통인연', 'Communication fate'),
    '편재': c('amplify', 7, '💼', 'green', '사업인연', 'Business fate'),
    '정재': c('extreme', 9, '💕', 'purple', '결혼인연', 'Marriage fate'),
    '편관': c('clash', 5, '👔', 'yellow', '상사인연', 'Boss fate'),
    '정관': c('extreme', 9, '💍', 'purple', '배우자인연', 'Spouse fate'),
    '편인': c('amplify', 8, '🎓', 'green', '스승인연', 'Teacher fate'),
    '정인': c('extreme', 9, '🤱', 'purple', '보호자인연', 'Guardian fate'),
  },
  NorthNode: {
    '비견': c('amplify', 8, '🚀', 'green', '자립성장', 'Independence growth'),
    '겁재': c('clash', 5, '⚡', 'yellow', '경쟁성장', 'Competition growth'),
    '식신': c('extreme', 9, '🎨', 'purple', '창작성장', 'Creative growth'),
    '상관': c('amplify', 7, '📢', 'green', '표현성장', 'Expression growth'),
    '편재': c('amplify', 8, '💰', 'green', '재물성장', 'Wealth growth'),
    '정재': c('amplify', 8, '🏠', 'green', '안정성장', 'Stability growth'),
    '편관': c('clash', 5, '⚔️', 'yellow', '권력성장', 'Power growth'),
    '정관': c('extreme', 9, '🎖️', 'purple', '명예성장', 'Honor growth'),
    '편인': c('extreme', 9, '🔮', 'purple', '영적성장', 'Spiritual growth'),
    '정인': c('amplify', 8, '📚', 'green', '학문성장', 'Academic growth'),
  },
  SouthNode: {
    '비견': c('clash', 4, '🔄', 'yellow', '자아반복', 'Self repetition'),
    '겁재': c('conflict', 3, '⚠️', 'red', '충동반복', 'Impulse repetition'),
    '식신': c('balance', 6, '🎭', 'blue', '표현반복', 'Expression repetition'),
    '상관': c('clash', 4, '💬', 'yellow', '반항반복', 'Rebellion repetition'),
    '편재': c('clash', 4, '💸', 'yellow', '낭비반복', 'Waste repetition'),
    '정재': c('balance', 6, '🏠', 'blue', '안정반복', 'Stability repetition'),
    '편관': c('clash', 4, '⚔️', 'yellow', '권력반복', 'Power repetition'),
    '정관': c('balance', 6, '🎖️', 'blue', '명예반복', 'Honor repetition'),
    '편인': c('clash', 4, '🌀', 'yellow', '고립반복', 'Isolation repetition'),
    '정인': c('clash', 4, '😢', 'yellow', '의존반복', 'Dependence repetition'),
  },
};

// 엑스트라 포인트 정보
export const EXTRAPOINT_INFO: Record<ExtraPointName, {
  ko: string;
  en: string;
  symbol: string;
  theme: string;
  themeEn: string;
  sajuConnection: string;
}> = {
  Chiron: {
    ko: '카이론',
    en: 'Chiron',
    symbol: '⚷',
    theme: '상처받은 치유자 - 우리의 깊은 상처와 그것을 통한 치유 능력',
    themeEn: 'Wounded Healer - Our deep wounds and healing ability through them',
    sajuConnection: '편인/정인과 연결 - 정신적 상처와 지혜',
  },
  Lilith: {
    ko: '릴리스 (흑월)',
    en: 'Lilith (Black Moon)',
    symbol: '⚸',
    theme: '억압된 본능과 그림자 - 숨겨진 욕망과 거부당한 측면',
    themeEn: 'Repressed instincts and shadow - Hidden desires and rejected aspects',
    sajuConnection: '상관/겁재와 연결 - 반항과 충동',
  },
  PartOfFortune: {
    ko: '행운점',
    en: 'Part of Fortune',
    symbol: '⊕',
    theme: '물질적 행운과 성공 - 세상에서의 행복과 번영의 지점',
    themeEn: 'Material fortune and success - Point of happiness and prosperity',
    sajuConnection: '정재/편재와 연결 - 재물과 성공',
  },
  Vertex: {
    ko: '버텍스',
    en: 'Vertex',
    symbol: 'Vx',
    theme: '운명적 만남 - 카르마적 관계와 전환점',
    themeEn: 'Fated encounters - Karmic relationships and turning points',
    sajuConnection: '정관/정재와 연결 - 인연과 결합',
  },
  NorthNode: {
    ko: '북쪽 노드 (라후)',
    en: 'North Node (Rahu)',
    symbol: '☊',
    theme: '영혼의 성장 방향 - 이번 생의 카르마적 목표',
    themeEn: 'Soul growth direction - Karmic goal of this life',
    sajuConnection: '용신과 연결 - 필요한 성장 방향',
  },
  SouthNode: {
    ko: '남쪽 노드 (케투)',
    en: 'South Node (Ketu)',
    symbol: '☋',
    theme: '전생의 패턴 - 익숙하지만 벗어나야 할 것들',
    themeEn: 'Past life patterns - Familiar but need to move beyond',
    sajuConnection: '기신과 연결 - 버려야 할 패턴',
  },
};
