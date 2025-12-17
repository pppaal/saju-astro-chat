// src/lib/destiny-matrix/interpretation-guide.ts
// Destiny Fusion Matrix™ - 해석 가이드
// 사용자가 매트릭스를 이해하고 새로운 해석을 도출할 수 있도록 돕는 가이드

export const INTERPRETATION_GUIDE = {
  // 기본 개념 설명
  basics: {
    title: '기본 개념',
    titleEn: 'Basic Concepts',
    sections: {
      interactionLevels: {
        title: '상호작용 5단계',
        titleEn: 'Five Interaction Levels',
        description: '사주와 점성의 요소가 만났을 때 발생하는 상호작용의 강도',
        descriptionEn: 'Intensity of interaction when saju and astrology elements meet',
        levels: [
          {
            level: 'extreme',
            score: '9-10',
            color: 'purple',
            icon: '💥',
            meaning: '극강 - 폭발적 시너지, 운명적 연결',
            meaningEn: 'Extreme - Explosive synergy, fated connection',
            interpretation: '이 조합은 인생에서 강력한 영향을 미칩니다. 적극 활용하세요.',
            interpretationEn: 'This combination has a powerful impact on life. Use it actively.',
          },
          {
            level: 'amplify',
            score: '7-8',
            color: 'green',
            icon: '🚀',
            meaning: '증폭 - 긍정적 강화, 시너지 효과',
            meaningEn: 'Amplify - Positive reinforcement, synergy effect',
            interpretation: '좋은 에너지가 증폭됩니다. 이 방향으로 노력하면 성과가 배가됩니다.',
            interpretationEn: 'Good energy is amplified. Efforts in this direction will double results.',
          },
          {
            level: 'balance',
            score: '5-6',
            color: 'blue',
            icon: '⚖️',
            meaning: '균형 - 안정적, 중립적 상태',
            meaningEn: 'Balance - Stable, neutral state',
            interpretation: '안정적인 에너지입니다. 급격한 변화보다 꾸준한 노력이 좋습니다.',
            interpretationEn: 'Stable energy. Steady effort is better than sudden change.',
          },
          {
            level: 'clash',
            score: '3-4',
            color: 'yellow',
            icon: '⚡',
            meaning: '충돌 - 긴장, 주의 필요',
            meaningEn: 'Clash - Tension, caution needed',
            interpretation: '긴장이 있는 에너지입니다. 인식하고 조절하면 성장의 기회가 됩니다.',
            interpretationEn: 'Tense energy. Awareness and adjustment can become growth opportunity.',
          },
          {
            level: 'conflict',
            score: '1-2',
            color: 'red',
            icon: '❌',
            meaning: '상극 - 회피 권장, 조심 필요',
            meaningEn: 'Conflict - Avoidance recommended, caution required',
            interpretation: '도전적인 에너지입니다. 이 영역에서는 신중하게 행동하세요.',
            interpretationEn: 'Challenging energy. Act carefully in this area.',
          },
        ],
      },
      crossReference: {
        title: '교차 해석 방법',
        titleEn: 'Cross-Reference Method',
        steps: [
          {
            step: 1,
            title: '자신의 사주 요소 파악',
            titleEn: 'Identify Your Saju Elements',
            description: '일간 오행, 십신 분포, 십이운성, 신살 등 사주 구성 요소를 파악합니다.',
            descriptionEn: 'Identify saju components like day master element, sibsin distribution, twelve stages, shinsal.',
          },
          {
            step: 2,
            title: '자신의 점성 요소 파악',
            titleEn: 'Identify Your Astrology Elements',
            description: '행성 배치, 하우스 위치, 주요 애스펙트, 현재 트랜짓을 파악합니다.',
            descriptionEn: 'Identify planet placements, house positions, major aspects, current transits.',
          },
          {
            step: 3,
            title: '매트릭스에서 교차점 찾기',
            titleEn: 'Find Intersection in Matrix',
            description: '해당하는 행(사주)과 열(점성)이 만나는 셀의 값을 확인합니다.',
            descriptionEn: 'Check the cell value where your row (saju) and column (astrology) meet.',
          },
          {
            step: 4,
            title: '복합 해석',
            titleEn: 'Combined Interpretation',
            description: '여러 레이어의 결과를 종합하여 전체적인 그림을 파악합니다.',
            descriptionEn: 'Combine results from multiple layers to understand the full picture.',
          },
        ],
      },
    },
  },

  // 레이어별 해석 가이드
  layerGuides: {
    layer1: {
      title: 'Layer 1: 기운핵심격자 (오행↔원소)',
      titleEn: 'Layer 1: Element Core Grid (Five Elements↔Western Elements)',
      purpose: '사주의 오행과 점성의 4원소가 어떻게 상호작용하는지 보여줍니다.',
      purposeEn: 'Shows how saju five elements interact with western four elements.',
      interpretation: {
        question: '나의 기본 에너지와 우주 에너지가 어떻게 조화되는가?',
        questionEn: 'How does my basic energy harmonize with cosmic energy?',
        examples: [
          {
            case: '목(木) + Fire = 🚀증폭',
            meaning: '목의 성장 에너지와 불의 열정이 만나 폭발적 성장 가능',
            meaningEn: 'Wood growth energy meets fire passion for explosive growth potential',
          },
          {
            case: '수(水) + Fire = ❌상극',
            meaning: '물과 불의 충돌, 감정과 행동 사이의 갈등 주의',
            meaningEn: 'Water and fire clash, watch for conflicts between emotion and action',
          },
        ],
      },
    },
    layer2: {
      title: 'Layer 2: 십신-행성 매트릭스',
      titleEn: 'Layer 2: Sibsin-Planet Matrix',
      purpose: '십신의 역할과 행성의 에너지가 어떻게 결합되는지 보여줍니다.',
      purposeEn: 'Shows how sibsin roles combine with planet energies.',
      interpretation: {
        question: '나의 대인관계 패턴과 행성 에너지가 어떻게 작용하는가?',
        questionEn: 'How do my relationship patterns work with planetary energy?',
        examples: [
          {
            case: '식신 + Venus = 🎨예술',
            meaning: '창조적 표현력이 금성의 아름다움과 만나 예술적 재능 발현',
            meaningEn: 'Creative expression meets Venus beauty for artistic talent',
          },
          {
            case: '편관 + Saturn = 🔒구속',
            meaning: '권위에 대한 긴장이 토성의 제한과 만나 압박감 증가',
            meaningEn: 'Authority tension meets Saturn restriction for increased pressure',
          },
        ],
      },
    },
    layer3: {
      title: 'Layer 3: 십신-하우스 매트릭스',
      titleEn: 'Layer 3: Sibsin-House Matrix',
      purpose: '십신이 12개 생활 영역에서 어떻게 작용하는지 보여줍니다.',
      purposeEn: 'Shows how sibsin operates in 12 life areas.',
      interpretation: {
        question: '특정 생활 영역에서 내 십신이 어떻게 발현되는가?',
        questionEn: 'How does my sibsin manifest in specific life areas?',
        examples: [
          {
            case: '정재 + 7하우스 = 💍결혼재물',
            meaning: '안정적 재물 에너지가 파트너십 영역에서 결혼운으로 발현',
            meaningEn: 'Stable wealth energy manifests as marriage fortune in partnership area',
          },
          {
            case: '겁재 + 2하우스 = 💥재산손실',
            meaning: '경쟁/충동 에너지가 재물 영역에서 손실 위험으로 작용',
            meaningEn: 'Competition/impulse energy acts as loss risk in wealth area',
          },
        ],
      },
    },
    layer4: {
      title: 'Layer 4: 타이밍 오버레이 매트릭스',
      titleEn: 'Layer 4: Timing Overlay Matrix',
      purpose: '사주의 운(대운/세운)과 점성 트랜짓이 언제 교차하는지 보여줍니다.',
      purposeEn: 'Shows when saju luck cycles and astrological transits intersect.',
      interpretation: {
        question: '지금 내 운과 우주 사이클이 어떤 상태인가?',
        questionEn: 'What is the current state of my luck and cosmic cycles?',
        examples: [
          {
            case: '대운전환 + Saturn Return = 🔱대전환',
            meaning: '10년 대운 전환과 29년 토성회귀가 만나면 인생 대전환점',
            meaningEn: 'When 10-year daeun transition meets 29-year Saturn return, major life turning point',
          },
          {
            case: '화 세운 + Jupiter Return = 🚀도약',
            meaning: '불 에너지 해와 목성회귀가 만나 도약의 기회',
            meaningEn: 'Fire energy year meets Jupiter return for leap opportunity',
          },
        ],
      },
    },
    layer5: {
      title: 'Layer 5: 형충회합-애스펙트 매트릭스',
      titleEn: 'Layer 5: Relations-Aspects Matrix',
      purpose: '사주의 지지 관계와 점성 애스펙트가 어떻게 상호작용하는지 보여줍니다.',
      purposeEn: 'Shows how saju branch relations interact with astrological aspects.',
      interpretation: {
        question: '사주의 합/충과 점성 각도가 함께 작용할 때 어떤 일이 일어나는가?',
        questionEn: 'What happens when saju combinations/clashes work with astrological aspects?',
        examples: [
          {
            case: '삼합 + Trine = 🌟최상조화',
            meaning: '사주 삼합과 트라인 각도가 만나면 최상의 조화와 행운',
            meaningEn: 'Saju triple combination meets trine for best harmony and fortune',
          },
          {
            case: '충 + Square = ☠️파괴위험',
            meaning: '사주 충과 스퀘어가 만나면 극심한 충돌, 주의 필요',
            meaningEn: 'Saju clash meets square for severe collision, caution needed',
          },
        ],
      },
    },
    layer6: {
      title: 'Layer 6: 십이운성-하우스 매트릭스',
      titleEn: 'Layer 6: TwelveStage-House Matrix',
      purpose: '십이운성의 생명력이 12하우스 각 영역에서 어떻게 발현되는지 보여줍니다.',
      purposeEn: 'Shows how twelve stage life force manifests in each house.',
      interpretation: {
        question: '내 에너지 레벨이 각 생활 영역에서 어떻게 작용하는가?',
        questionEn: 'How does my energy level work in each life area?',
        examples: [
          {
            case: '왕지 + 10하우스 = 👑커리어전성',
            meaning: '최고 에너지 상태가 직업 영역에서 커리어 전성기 형성',
            meaningEn: 'Peak energy state forms career prime in profession area',
          },
          {
            case: '절 + 7하우스 = 💔관계공백',
            meaning: '에너지 단절 상태가 관계 영역에서 인연 공백으로 작용',
            meaningEn: 'Energy cutoff state acts as relationship void in partnership area',
          },
        ],
      },
    },
    layer7: {
      title: 'Layer 7: 고급분석 매트릭스',
      titleEn: 'Layer 7: Advanced Analysis Matrix',
      purpose: '격국/용신과 프로그레션/리턴의 고급 분석을 보여줍니다.',
      purposeEn: 'Shows advanced analysis of geokguk/yongsin with progressions/returns.',
      interpretation: {
        question: '내 사주 구조와 점성 심화 기법이 어떻게 연결되는가?',
        questionEn: 'How does my saju structure connect with advanced astrology techniques?',
        examples: [
          {
            case: '신강격 + Solar Return = 🏆성취해',
            meaning: '강한 일간이 솔라 리턴에서 성취의 해를 만남',
            meaningEn: 'Strong day master meets achievement year in solar return',
          },
          {
            case: '용신목 + Draconic = 🌲생명영혼',
            meaning: '목 용신이 드라코닉 차트에서 생명과 성장의 영혼 목적 발현',
            meaningEn: 'Wood yongsin manifests life and growth soul purpose in draconic chart',
          },
        ],
      },
    },
    layer8: {
      title: 'Layer 8: 신살-행성 매트릭스',
      titleEn: 'Layer 8: Shinsal-Planet Matrix',
      purpose: '37개 신살과 10개 행성의 상호작용을 보여줍니다.',
      purposeEn: 'Shows interactions between 37 shinsal and 10 planets.',
      interpretation: {
        question: '나의 특별한 기운(신살)이 행성 에너지와 어떻게 결합하는가?',
        questionEn: 'How does my special energy (shinsal) combine with planetary energy?',
        examples: [
          {
            case: '천을귀인 + Jupiter = 🎯대길귀인',
            meaning: '최고 귀인과 목성의 확장이 만나 최상의 행운',
            meaningEn: 'Top noble meets Jupiter expansion for best fortune',
          },
          {
            case: '도화 + Venus = 🌹도화극강',
            meaning: '연애/매력 살과 금성이 만나 강력한 이성 매력',
            meaningEn: 'Romance/charm kill meets Venus for powerful romantic charm',
          },
        ],
      },
    },
    layer9: {
      title: 'Layer 9: 소행성-하우스 매트릭스',
      titleEn: 'Layer 9: Asteroid-House Matrix',
      purpose: '4대 소행성(세레스/팔라스/주노/베스타)이 12하우스에서 어떻게 작용하는지 보여줍니다.',
      purposeEn: 'Shows how four major asteroids work in 12 houses.',
      interpretation: {
        question: '양육/전략/결혼/헌신의 에너지가 각 생활 영역에서 어떻게 발현되는가?',
        questionEn: 'How do nurturing/strategy/marriage/dedication energies manifest in each life area?',
        examples: [
          {
            case: 'Juno + 7하우스 = 💒주노본궁',
            meaning: '결혼 소행성이 파트너십 하우스에서 최강의 결혼운',
            meaningEn: 'Marriage asteroid in partnership house for strongest marriage fortune',
          },
          {
            case: 'Ceres + 4하우스 = 🏠세레스본궁',
            meaning: '양육 소행성이 가정 하우스에서 최강의 가정/어머니 에너지',
            meaningEn: 'Nurturing asteroid in home house for strongest home/mother energy',
          },
        ],
      },
    },
    layer10: {
      title: 'Layer 10: 엑스트라포인트-오행/십신 매트릭스',
      titleEn: 'Layer 10: Extra Points-Element/Sibsin Matrix',
      purpose: '카이론/릴리스/행운점/버텍스/노드가 사주 요소와 어떻게 연결되는지 보여줍니다.',
      purposeEn: 'Shows how Chiron/Lilith/POF/Vertex/Nodes connect with saju elements.',
      interpretation: {
        question: '상처/그림자/행운/운명의 포인트가 내 사주와 어떻게 연결되는가?',
        questionEn: 'How do wound/shadow/fortune/fate points connect with my saju?',
        examples: [
          {
            case: 'Chiron + 수 = 💧감정치유',
            meaning: '상처 치유자가 수 에너지와 만나 감정적 치유 능력 발현',
            meaningEn: 'Wounded healer meets water energy for emotional healing ability',
          },
          {
            case: 'North Node + 정관 = 🎖️명예성장',
            meaning: '운명 방향이 정관과 만나 명예와 책임을 통한 성장',
            meaningEn: 'Destiny direction meets proper authority for growth through honor and duty',
          },
        ],
      },
    },
  },

  // 새로운 해석 도출 가이드
  newInterpretations: {
    title: '새로운 해석 도출하기',
    titleEn: 'Deriving New Interpretations',
    methods: [
      {
        method: '다중 레이어 교차 분석',
        methodEn: 'Multi-Layer Cross Analysis',
        description: '여러 레이어에서 같은 패턴이 반복되면 강력한 특징으로 해석',
        descriptionEn: 'If same pattern repeats across layers, interpret as strong characteristic',
        example: '예: 식신+Venus(L2), 식신+5H(L3), 화개+Venus(L8) 모두 예술 관련 → 강력한 예술적 재능',
        exampleEn: 'Ex: Siksin+Venus(L2), Siksin+5H(L3), Hwagae+Venus(L8) all art-related → Strong artistic talent',
      },
      {
        method: '타이밍 중첩 분석',
        methodEn: 'Timing Overlap Analysis',
        description: '사주 운과 점성 트랜짓이 동시에 활성화될 때 중요 시점',
        descriptionEn: 'Important timing when saju luck and astro transits activate simultaneously',
        example: '예: 대운전환 + Saturn Return + 년살 = 인생의 중대 전환점, 특별히 주의 필요',
        exampleEn: 'Ex: Daeun transition + Saturn Return + Year Kill = Major life turning, special caution needed',
      },
      {
        method: '보완 에너지 찾기',
        methodEn: 'Finding Complementary Energy',
        description: '부족하거나 충돌하는 에너지의 보완점을 다른 레이어에서 탐색',
        descriptionEn: 'Search for complements to lacking or clashing energy in other layers',
        example: '예: 수+화 충돌(L1)이지만 월덕귀인+Moon 조화(L8)로 감정 안정 보완',
        exampleEn: 'Ex: Water+Fire clash(L1) but Woldeok Noble+Moon harmony(L8) complements emotional stability',
      },
      {
        method: '성장 방향 도출',
        methodEn: 'Deriving Growth Direction',
        description: 'North Node와 용신의 조합에서 영혼의 성장 방향 파악',
        descriptionEn: 'Understand soul growth direction from North Node and yongsin combination',
        example: '예: North Node + 용신화 = 열정과 행동을 통한 성장이 이번 생의 목적',
        exampleEn: 'Ex: North Node + Fire Yongsin = Growth through passion and action is this life\'s purpose',
      },
    ],
  },
};

// 간단 해석 함수
export function getQuickInterpretation(
  level: 'extreme' | 'amplify' | 'balance' | 'clash' | 'conflict',
  context: 'career' | 'love' | 'health' | 'wealth' | 'general'
): string {
  const interpretations: Record<typeof level, Record<typeof context, string>> = {
    extreme: {
      career: '이 분야에서 폭발적인 성과가 가능합니다. 적극적으로 기회를 잡으세요.',
      love: '운명적인 연애/결혼 에너지입니다. 중요한 만남이 예상됩니다.',
      health: '에너지가 매우 강합니다. 과도한 활동은 주의하세요.',
      wealth: '큰 재물 기회가 있습니다. 투자에 적합한 시기입니다.',
      general: '인생의 중요한 전환점입니다. 큰 변화를 준비하세요.',
    },
    amplify: {
      career: '직업적 성장이 기대됩니다. 새로운 도전을 고려해보세요.',
      love: '좋은 연애 에너지입니다. 관계가 발전할 수 있습니다.',
      health: '건강 에너지가 좋습니다. 새로운 운동을 시작하기 좋은 때입니다.',
      wealth: '재물이 증가하는 시기입니다. 부업이나 투자를 고려하세요.',
      general: '전반적으로 상승 에너지입니다. 적극적으로 행동하세요.',
    },
    balance: {
      career: '안정적인 직업 흐름입니다. 현 상태를 유지하며 준비하세요.',
      love: '평화로운 관계 시기입니다. 깊이 있는 소통을 해보세요.',
      health: '건강이 안정적입니다. 현재 루틴을 유지하세요.',
      wealth: '재물이 안정적입니다. 저축을 늘리기 좋은 때입니다.',
      general: '큰 변화 없이 안정적인 시기입니다. 내실을 다지세요.',
    },
    clash: {
      career: '직업적 긴장이 있습니다. 갈등 상황을 지혜롭게 대처하세요.',
      love: '관계에 긴장이 있을 수 있습니다. 대화로 풀어가세요.',
      health: '건강에 주의가 필요합니다. 무리하지 마세요.',
      wealth: '재물 변동이 있을 수 있습니다. 보수적 접근이 좋습니다.',
      general: '도전적인 시기입니다. 인내와 지혜가 필요합니다.',
    },
    conflict: {
      career: '직업 영역에서 어려움이 예상됩니다. 신중하게 판단하세요.',
      love: '관계에 위기가 올 수 있습니다. 서로를 이해하려 노력하세요.',
      health: '건강 관리가 필요합니다. 전문가 상담을 고려하세요.',
      wealth: '재물 손실 위험이 있습니다. 투자를 피하고 절약하세요.',
      general: '어려운 시기입니다. 큰 결정은 미루고 안정을 찾으세요.',
    },
  };

  return interpretations[level][context];
}
