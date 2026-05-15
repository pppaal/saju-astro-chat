import type { InterpretationRule } from './types'

/**
 * 초기 해석 룰 셋 (~25개).
 *
 * AI(claude)가 자연스러운 명리·점성 톤으로 작성. 사람 검수 권장.
 * 룰 추가/수정은 이 파일 또는 향후 Prisma `InterpretationRule` 테이블에서.
 *
 * 템플릿 변수: {daeunGanji} {primaryYongsin} {natalDayMaster} ...
 *   matcher가 fillTemplate()에서 변수 치환.
 */
export const RULES: InterpretationRule[] = [

  // ═══════════════════════════════════════════════════════════
  // 大運 narrative (5종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'daeun-inseong-weak',
    scope: 'monthly',
    section: 'daeun',
    priority: 95,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정인', '편인'],
    },
    template:
      `이 10년은 **든든히 받쳐주는 큰 흐름**입니다. ` +
      `학습·전문성·내실을 다지기에 가장 좋은 시기 — 무리해서 ` +
      `밖으로 나가기보다 안으로 깊어지는 방향이 결과적으로 더 멀리 갑니다.`,
    authorNote: '대운 인성 + 신약 — 쉬운 톤',
    themes: ['study', 'spirituality'],
  },
  {
    id: 'daeun-inseong-strong',
    scope: 'monthly',
    section: 'daeun',
    priority: 90,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정인', '편인'],
    },
    template:
      `이 10년은 **너무 받쳐주는 흐름**이라 오히려 정체될 수 있는 ` +
      `시기입니다. 생각이 깊어지고 결정이 느려지기 쉬워요. ` +
      `머리에 있는 것을 행동으로 옮기는 게 이 10년의 과제.`,
    themes: ['personality'],
  },
  {
    id: 'daeun-jaeseong',
    scope: 'monthly',
    section: 'daeun',
    priority: 92,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정재', '편재'],
    },
    template:
      `이 10년은 **돈·자원·구체적 성취가 전면에 나오는 시기**입니다. ` +
      `현실적 결과를 만들기 좋은 흐름이에요. 시스템과 구조를 ` +
      `단단히 만들면 이 시기의 결과가 평생 토대가 됩니다.`,
    themes: ['money', 'business'],
  },
  {
    id: 'daeun-gwanseong',
    scope: 'monthly',
    section: 'daeun',
    priority: 90,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정관', '편관'],
    },
    template:
      `이 10년은 **사회적 위치·책임·공식 평가가 핵심 주제**로 떠오릅니다. ` +
      `승진·자리 잡기·중요한 책임이 들어올 수 있는 시기. ` +
      `자기 자리를 사회에서 명확히 정의하는 10년입니다.`,
    themes: ['career', 'reputation'],
  },
  {
    id: 'daeun-sigsang',
    scope: 'monthly',
    section: 'daeun',
    priority: 88,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['식신', '상관'],
    },
    template:
      `이 10년은 **표현·창작·자기 목소리가 강하게 작동**하는 시기입니다. ` +
      `머리에 있던 것을 세상에 내놓는 10년 — 콘텐츠·작품·` +
      `새로운 시도가 결과로 나오기 쉬워요.`,
    themes: ['creativity', 'children'],
  },

  // ═══════════════════════════════════════════════════════════
  // 歲運 (그 해) narrative (3종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'seun-yongsin-active',
    scope: 'monthly',
    section: 'seun',
    priority: 85,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      signalKinds: ['pillar-sibsin'],
      minPolarity: 2,
    },
    template:
      `올해는 **본명을 우호적으로 받쳐주는 한 해**입니다. ` +
      `큰 결정·새 시도가 평소보다 매끄럽게 흘러요. ` +
      `특히 봄·초여름에 운의 정점이 형성됩니다.`,
    themes: ['career', 'money', 'study'],
  },
  {
    id: 'seun-kibsin',
    scope: 'monthly',
    section: 'seun',
    priority: 85,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      signalKinds: ['pillar-sibsin'],
      maxPolarity: -1,
    },
    template:
      `올해는 **부담이 들어오는 한 해**입니다. 새로 벌이기보다 ` +
      `정리·점검·기존 자산 지키기로 방향 전환하는 게 유리. ` +
      `큰 결정은 길일을 골라서 하세요.`,
    themes: ['crisis'],
  },
  {
    id: 'seun-pyungin',
    scope: 'monthly',
    section: 'seun',
    priority: 70,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      signalKinds: ['pillar-sibsin'],
      minPolarity: 0,
      maxPolarity: 1,
    },
    template:
      `올해는 **큰 변동 없이 착실히 다져가는 한 해**입니다. ` +
      `새 도약보다 작년 결과 정리하고 다음 도약 기반 만들기 좋아요.`,
    themes: ['personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 月運 (이번 달) narrative (3종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'wolun-yongsin',
    scope: 'monthly',
    section: 'wolun',
    priority: 80,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      signalKinds: ['pillar-sibsin'],
      minPolarity: 2,
    },
    template:
      `이번 달은 **본명을 우호적으로 받쳐주는 한 달**입니다. ` +
      `의사결정·관계·실행이 평소보다 매끄러워요. ` +
      `미뤄둔 일을 처리하기 좋습니다.`,
    themes: ['career', 'money'],
  },
  {
    id: 'wolun-kibsin',
    scope: 'monthly',
    section: 'wolun',
    priority: 80,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      signalKinds: ['pillar-sibsin'],
      maxPolarity: -1,
    },
    template:
      `이번 달은 **부담이 들어오는 한 달**입니다. 기운이 ` +
      `분산되는 시기 — 큰 결정은 보류, 일상 루틴 유지에 집중하세요. ` +
      `길일을 골라 중요한 일정을 배치하세요.`,
    themes: ['crisis'],
  },
  {
    id: 'wolun-yukhap',
    scope: 'monthly',
    section: 'wolun',
    priority: 75,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      signalKinds: ['hyeongchung'],
      minPolarity: 2,
    },
    template:
      `이번 달은 **사람·기회·자원이 자연스럽게 모이는 흐름**입니다. ` +
      `인맥 활용·협업·새로운 관계 시작이 우호적이에요.`,
    themes: ['social', 'love'],
  },

  // ═══════════════════════════════════════════════════════════
  // 외행성 트랜짓 narrative (4종 — Jupiter / Saturn / Uranus / Neptune)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'transit-jupiter-exalt',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      signalSource: 'astro',
      planet: ['Jupiter'],
      dignity: ['exaltation'],
    },
    template:
      `**확장·성장의 에너지가 가장 강한 시기**입니다. ` +
      `새 분야·해외·교육 영역에서 좋은 진전이 기대돼요. ` +
      `이 흐름은 {duration} 동안 지속됩니다.`,
    themes: ['business', 'travel', 'study'],
  },
  {
    id: 'transit-saturn-fall',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      signalSource: 'astro',
      planet: ['Saturn'],
      dignity: ['fall'],
    },
    template:
      `**책임감·공식 관계에서 어려움이 자주 드러나는 시기**입니다. ` +
      `약속 어그러짐·계약 지연이 잦아요. 큰 약속·공식 절차는 ` +
      `길일로 미루기를 권합니다.`,
    themes: ['career', 'legal'],
  },
  {
    id: 'transit-jupiter-trine-natal',
    scope: 'monthly',
    section: 'transit',
    priority: 72,
    conditions: {
      signalSource: 'astro',
      planet: ['Jupiter'],
      signalKinds: ['transit'],
      minPolarity: 2,
    },
    template:
      `**평소보다 도움이 잘 들어오고 결정이 매끄러운 시기**입니다. ` +
      `행운이 자연스러운 흐름. 정점은 {duration}.`,
    themes: ['career', 'money'],
  },
  {
    id: 'transit-uranus-square',
    scope: 'monthly',
    section: 'transit',
    priority: 75,
    conditions: {
      signalSource: 'astro',
      planet: ['Uranus'],
      maxPolarity: -1,
    },
    template:
      `**예측 불가한 변동·갑작스러운 사건이 가능한 시기**입니다. ` +
      `안정을 붙들기보다 변화를 정직하게 받아들이는 게 ` +
      `더 빠른 통과를 만들어요.`,
    themes: ['crisis', 'personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 매칭 패턴 narrative (3종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'pattern-wealth-golden',
    scope: 'monthly',
    section: 'pattern',
    priority: 85,
    conditions: {
      patternId: ['wealth-golden-week'],
    },
    template:
      `이번 달 **재물 흐름이 두텁게 들어오는 날이 {count}번** 있습니다. ` +
      `큰 결정·계약·투자를 그 날에 배치하면 효과 최대.`,
    themes: ['money', 'business'],
  },
  {
    id: 'pattern-noble-fortune',
    scope: 'monthly',
    section: 'pattern',
    priority: 82,
    conditions: {
      patternId: ['noble-fortune'],
    },
    template:
      `이번 달 **도움 받기 좋은 날이 {count}번** 있습니다. ` +
      `부탁·만남·조언 구하기에 우호적. 평소 거리 두었던 인맥에 ` +
      `먼저 연락해 보세요.`,
    themes: ['career', 'social'],
  },
  {
    id: 'pattern-shadow-cluster',
    scope: 'monthly',
    section: 'pattern',
    priority: 88,
    conditions: {
      patternId: ['shadow-cluster'],
    },
    template:
      `이번 달 **신중해야 할 날이 {count}번** 있습니다. ` +
      `큰 결정·계약·이동은 길일({luckyDates})로 배치하세요. ` +
      `신중일에는 중요 약속 피하고 일상 유지에 집중.`,
    themes: ['crisis'],
  },

  // ═══════════════════════════════════════════════════════════
  // 테마별 forecast (6종 — 재물·연애·직업·건강·학업·이동)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'theme-money-lucky',
    scope: 'monthly',
    section: 'theme-money',
    priority: 60,
    conditions: {
      signalSource: 'saju',
      sibsin: ['정재', '편재'],
      minPolarity: 2,
    },
    template:
      `💰 **재물** — 안정적 수입·기존 자산 정리·소규모 투자 모두 ` +
      `우호적인 흐름. 큰 베팅은 길일을 골라서.`,
    themes: ['money'],
  },
  {
    id: 'theme-love-active',
    scope: 'monthly',
    section: 'theme-love',
    priority: 60,
    conditions: {
      shinsalName: ['도화', '도화살', '홍염', '홍염살'],
    },
    template:
      `❤️ **연애** — 인연·만남·관계 진전이 자연스러운 흐름. ` +
      `평소 어울리지 않는 곳에서 새 사람이 등장할 수 있어요.`,
    themes: ['love'],
  },
  {
    id: 'theme-career-gwanseong',
    scope: 'monthly',
    section: 'theme-career',
    priority: 60,
    conditions: {
      sibsin: ['정관', '편관'],
      minPolarity: 2,
    },
    template:
      `💼 **직업** — 승진·공식 평가·새 책임 부여가 들어올 수 있는 ` +
      `시기. 단정한 처신과 약속 지키기가 핵심이에요.`,
    themes: ['career'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신살 narrative (3종 — 자주 발동)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-cheoneul',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: {
      shinsalName: ['천을귀인'],
    },
    template:
      `🌟 **도움 받기 좋은 날**이 이번 달에 들어 있어요. ` +
      `어려운 부탁·결정적 조언이 필요한 일은 그 날에.`,
    themes: ['career', 'crisis'],
  },
  {
    id: 'shinsal-yeokma',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: {
      shinsalName: ['역마', '역마살'],
    },
    template:
      `✈️ **이동·환경 변화 에너지**가 강해지는 시기. ` +
      `여행·이직·이사 등 미뤄둔 이동 계획이 있다면 이때.`,
    themes: ['travel'],
  },
]

/** 룰 매핑 — id로 빠른 조회 */
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]))
