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
      `당신은 현재 **{daeunGanji} 대운**에 머물러 있습니다. ` +
      `{daeunGanji}이(가) 본명에 인성(印星)으로 작용하는 시기 — 신약한 ` +
      `{natalDayMaster}일간에게 가장 큰 보호와 도움이 들어옵니다. ` +
      `이 10년은 학습·자격증·전문성 다지기·내실 강화의 황금기. ` +
      `무리한 행동력 발휘보다 안으로 깊어지는 방향이 결과적으로 더 멀리 갑니다.`,
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
      `**{daeunGanji} 대운**에 인성이 강하게 들어와 있습니다. 다만 ` +
      `본명 {natalDayMaster}이(가) 이미 신강이라 인성 과강 — 게으름·` +
      `과도한 사색·결정 미루기를 경계해야 할 시기입니다. ` +
      `내적 깊이를 외적 실행으로 옮기는 다리가 이 10년의 과제입니다.`,
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
      `**{daeunGanji} 대운** — 재성(財星) 활성기. 현실적 자원·돈· ` +
      `구체적 성취가 전면에 나오는 10년입니다. 정재 흐름은 안정적 축적을, ` +
      `편재 흐름은 큰 기회와 변동을 함께 가져옵니다. ` +
      `구조와 시스템을 단단히 만들면 이 시기의 보상이 평생 토대가 됩니다.`,
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
      `**{daeunGanji} 대운** — 관성(官星) 작용기. 사회적 위치· ` +
      `책임·공식 평가가 핵심 주제로 떠오릅니다. 정관은 정통 경로의 ` +
      `상승, 편관은 시련과 도전을 통한 성장. ` +
      `이 10년은 자기 자리를 사회에서 명확히 정의하는 시기입니다.`,
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
      `**{daeunGanji} 대운** — 식상(食傷) 발휘기. 표현·창작·자기 목소리· ` +
      `자녀·새로운 시도가 강하게 작동합니다. 식신은 안정된 결과물을, ` +
      `상관은 기존 질서에 대한 도전과 혁신을 가져옵니다. ` +
      `머리에 있던 것을 세상에 내놓는 10년.`,
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
      `올해 **{yearGanji} 세운**은 본명에 우호적인 흐름. ` +
      `{yearSibsin}이(가) 작용하며 {primaryYongsin} 기운이 ` +
      `든든히 받쳐주고 있어, 큰 결정을 시도하기 좋은 한 해입니다. ` +
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
      `올해 **{yearGanji} 세운**은 본명에 부담이 들어오는 해입니다. ` +
      `{yearSibsin}이(가) 작용해 기운을 분탈·약화시키는 시기 — ` +
      `새로 벌이기보다 정리·점검·기존 자산 지키기로 방향 전환을 ` +
      `권합니다. 큰 결정은 길일을 골라서.`,
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
      `올해 **{yearGanji} 세운**은 평운(平運) — 큰 변동 없이 ` +
      `착실히 다져가는 흐름입니다. 새로운 도약보다는 작년의 결과를 ` +
      `정리하고 다음 도약을 위한 기반 만들기에 좋은 한 해.`,
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
      `이번 달 **{monthGanji} 월운**은 본명을 우호적으로 받쳐줍니다. ` +
      `용신({primaryYongsin}) 기운이 활성화되어 의사결정·관계·실행 ` +
      `모두 평소보다 매끄러운 시기입니다. 미뤄둔 일을 처리하기 좋은 한 달.`,
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
      `이번 달 **{monthGanji} 월운**은 본명에 부담이 들어옵니다. ` +
      `{monthSibsin} 작용으로 기운이 분산되는 시기 — 큰 결정은 ` +
      `보류하고 일상 루틴 유지에 집중하는 게 유리합니다. ` +
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
      `이번 달은 **{ganji} 합** 작용이 큽니다. 사람·기회· ` +
      `자원이 자연스럽게 모이는 흐름. 인맥 활용·협업·새로운 ` +
      `관계 시작이 우호적인 한 달입니다.`,
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
      `**Jupiter가 {sign}에서 엑잘테이션** — 확장·성장·기회의 ` +
      `에너지가 가장 강하게 발현되는 시기입니다. 새 분야 진입· ` +
      `해외·교육·종교·법 영역에서 우호적 진전이 기대됩니다. ` +
      `이 트랜짓은 {duration} 동안 지속.`,
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
      `**Saturn이 {sign}에서 폴(Fall)** — 책임감·구조화·공식 ` +
      `관계에서 어려움이 자주 드러납니다. 약속 어그러짐·계약 ` +
      `지연·관료적 절차 막힘이 잦은 시기. 큰 약속·공식 절차는 ` +
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
      `**Jupiter 트라인** 작용이 강하게 들어와 있습니다. ` +
      `평소보다 도움이 잘 들어오고 결정이 매끄러우며 ` +
      `행운이 자연스러운 시기. 정점은 {duration}.`,
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
      `**Uranus 충돌각** 작용 — 예측 불가한 변동·갑작스러운 ` +
      `사건·기존 구조의 균열이 가능합니다. 이 시기는 안정을 ` +
      `붙들기보다 변화를 정직하게 받아들이는 자세가 ` +
      `더 빠른 통과를 만듭니다.`,
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
      `이번 달 **재물 황금주간 {count}회** 검출. 재성 활성 + 길성 ` +
      `트랜짓 + 용신 정렬이 동시에 들어오는 드문 조합입니다. ` +
      `투자·계약·큰 결정을 이 구간에 배치하면 시간 효율 최대.`,
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
      `**귀인 강림** 패턴이 {count}회 활성. 도움 요청·관계 회복· ` +
      `중요한 만남에 특히 우호적입니다. 평소 거리 두었던 인맥에 ` +
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
      `이번 달 **흉살 집중일 {count}회**. 큰 결정·계약·이동은 ` +
      `길일({luckyDates})로 배치하는 게 유리합니다. 흉일에는 ` +
      `중요 약속을 피하고 일상 루틴 유지에 집중하세요.`,
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
      `💰 **재물** — {sibsin} 활성. 안정적 수입·기존 자산 정리· ` +
      `소규모 투자 모두 우호적. 큰 베팅은 길일을 골라.`,
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
      `❤️ **연애** — 도화 활성. 인연·만남·관계 진전이 자연스러운 ` +
      `시기. 평소 어울리지 않는 곳에서 새로운 사람이 등장할 수 있음.`,
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
      `💼 **직업** — 관성 활성. 승진·공식 평가·새 책임 부여가 ` +
      `들어올 수 있는 시기. 단정한 처신과 약속 지키기가 핵심.`,
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
      `🌟 **천을귀인** 발동일이 이번 달에 들어 있습니다 — ` +
      `위기에서 도움을 받을 운, 또는 결정적 조언을 얻을 운. ` +
      `어려운 부탁은 이 날에 시도하세요.`,
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
      `✈️ **역마** 발동 — 이동·여행·환경 변화·이직 등 자리를 ` +
      `옮기는 에너지가 강해집니다. 미뤄둔 이동 계획이 있다면 ` +
      `이 시기에.`,
    themes: ['travel'],
  },
]

/** 룰 매핑 — id로 빠른 조회 */
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]))
