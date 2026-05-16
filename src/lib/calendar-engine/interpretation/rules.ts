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

  // ═══════════════════════════════════════════════════════════
  // 신살 추가 (8종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-hwagae',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['화개', '화개살'] },
    template:
      `🕯 **화개** 발동 — 내면 깊어지기·예술·종교·연구에 ` +
      `우호적인 시기. 혼자만의 시간이 결과로 이어집니다.`,
    themes: ['spirituality', 'study'],
  },
  {
    id: 'shinsal-mungchang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['문창', '문창귀인'] },
    template:
      `📚 **문창** 발동 — 학습·시험·집필·발표에 강력한 보조. ` +
      `시험 준비·논문·콘텐츠 제작 모두 이때.`,
    themes: ['study', 'reputation'],
  },
  {
    id: 'shinsal-dohwa',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['도화', '도화살'] },
    template:
      `🌸 **도화** 발동 — 매력·끌림·인기 에너지가 강해집니다. ` +
      `소개·미팅·자기 표현이 잘 통하는 시기.`,
    themes: ['love', 'creativity'],
  },
  {
    id: 'shinsal-yangin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['양인', '양인살'] },
    template:
      `⚔️ **양인** 발동 — 강력한 추진력. 단, 충돌·다툼 주의. ` +
      `결단력 필요한 일에 좋고, 인내가 필요한 일은 조심.`,
    themes: ['career', 'crisis'],
  },
  {
    id: 'shinsal-baekho',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['백호', '백호살'] },
    template:
      `🔥 **백호** 발동 — 극단적 변동·사고 가능성. 운전·외출· ` +
      `위험 작업 신중. 큰 결정은 길일로.`,
    themes: ['crisis', 'health'],
  },
  {
    id: 'shinsal-gongmang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 38,
    conditions: { shinsalName: ['공망'] },
    template:
      `🌫 **공망** 발동 — 결과 안 보이는 시기. 새 시작보다 ` +
      `정리·복기·내면 작업이 더 효과적.`,
    themes: ['spirituality', 'crisis'],
  },
  {
    id: 'shinsal-cheondeok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['천덕', '천덕귀인', '월덕', '월덕귀인'] },
    template:
      `🛡 **천덕·월덕** 발동 — 건강·가정·정서 영역에서 보호받는 ` +
      `시기. 회복·치유에 자연스러운 흐름.`,
    themes: ['health', 'family'],
  },
  {
    id: 'shinsal-jangseong',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['장성', '장성살'] },
    template:
      `🎖 **장성** 발동 — 리더십·명예·공적 자리. 발표·발의· ` +
      `대표 역할이 들어올 수 있는 시기.`,
    themes: ['career', 'reputation'],
  },

  // ═══════════════════════════════════════════════════════════
  // 月運 추가 (12종 — 십신별 길/흉 조합)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'wolun-jaeseong-positive',
    scope: 'monthly',
    section: 'wolun',
    priority: 78,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정재', '편재'],
      minPolarity: 1,
    },
    template:
      `이번 달은 **재물·자원이 활성화되는 흐름**입니다. ` +
      `수입 확보·자산 정리·계약에 좋은 한 달.`,
    themes: ['money', 'business'],
  },
  {
    id: 'wolun-gwanseong-positive',
    scope: 'monthly',
    section: 'wolun',
    priority: 78,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정관', '편관'],
      minPolarity: 1,
    },
    template:
      `이번 달은 **사회적 평가·책임·공식 자리**가 핵심 주제. ` +
      `승진·발탁·중요 책임 부여가 들어올 수 있어요.`,
    themes: ['career', 'reputation'],
  },
  {
    id: 'wolun-sigsang-positive',
    scope: 'monthly',
    section: 'wolun',
    priority: 76,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['식신', '상관'],
      minPolarity: 1,
    },
    template:
      `이번 달은 **표현·창작·자기 목소리**가 활성화되는 흐름. ` +
      `콘텐츠·발표·새로운 시도가 결과로 이어지기 좋아요.`,
    themes: ['creativity', 'study'],
  },
  {
    id: 'wolun-inseong-positive',
    scope: 'monthly',
    section: 'wolun',
    priority: 76,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정인', '편인'],
      minPolarity: 1,
    },
    template:
      `이번 달은 **학습·정리·내실 다지기**에 우호적인 흐름. ` +
      `자격증·시험·전문성 강화·독서·정리에 좋아요.`,
    themes: ['study', 'spirituality'],
  },
  {
    id: 'wolun-bigeop',
    scope: 'monthly',
    section: 'wolun',
    priority: 70,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['비견', '겁재'],
    },
    template:
      `이번 달은 **인맥·동료·협업**의 영향이 큰 흐름. ` +
      `좋은 인연이 들어오기도, 경쟁·갈등이 생기기도 — 사람과의 ` +
      `거리 조절이 핵심.`,
    themes: ['social', 'personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 외행성 dignity 추가 (8종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'transit-jupiter-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 76,
    conditions: { signalSource: 'astro', planet: ['Jupiter'], dignity: ['domicile'] },
    template:
      `**Jupiter가 자기 자리(${'{sign}'})에 머무는 시기**입니다. ` +
      `확장·신뢰·기회의 흐름이 안정적이며, 평소보다 일이 ` +
      `잘 풀리는 한 달.`,
    themes: ['business', 'reputation'],
  },
  {
    id: 'transit-saturn-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: { signalSource: 'astro', planet: ['Saturn'], dignity: ['domicile'] },
    template:
      `**Saturn이 자기 자리(${'{sign}'})에 머무는 시기**입니다. ` +
      `책임·구조·장기 계획에 우호적. 인내가 결과를 만드는 흐름.`,
    themes: ['career', 'legal'],
  },
  {
    id: 'transit-saturn-detriment',
    scope: 'monthly',
    section: 'transit',
    priority: 76,
    conditions: { signalSource: 'astro', planet: ['Saturn'], dignity: ['detriment'] },
    template:
      `**Saturn 디트리먼트** — 공식 절차·책임·약속에서 어긋남이 ` +
      `자주 드러나는 시기. 중요 약속은 길일로.`,
    themes: ['career', 'crisis'],
  },
  {
    id: 'transit-mars-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 72,
    conditions: { signalSource: 'astro', planet: ['Mars'], dignity: ['domicile'] },
    template:
      `**Mars가 자기 자리(${'{sign}'})에 머무는 시기** — 행동력· ` +
      `추진력이 강해집니다. 미뤘던 일·결단이 필요한 일을 처리할 때.`,
    themes: ['career', 'crisis'],
  },
  {
    id: 'transit-mars-fall',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: { signalSource: 'astro', planet: ['Mars'], dignity: ['fall'] },
    template:
      `**Mars 폴** — 행동력 둔화·의욕 저하의 시기. 큰 도전보다 ` +
      `회복·휴식·기존 일 정리가 효율적.`,
    themes: ['crisis', 'health'],
  },
  {
    id: 'transit-venus-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: { signalSource: 'astro', planet: ['Venus'], dignity: ['domicile', 'exaltation'] },
    template:
      `**Venus가 자기 자리(${'{sign}'})에 머무는 시기** — 관계· ` +
      `미적 감각·재정 흐름이 우호적. 데이트·예술·소비에 좋아요.`,
    themes: ['love', 'creativity'],
  },
  {
    id: 'transit-mercury-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 68,
    conditions: { signalSource: 'astro', planet: ['Mercury'], dignity: ['domicile', 'exaltation'] },
    template:
      `**Mercury가 강한 자리(${'{sign}'})에 머무는 시기** — 소통· ` +
      `학습·이동·문서 작업이 매끄러운 흐름.`,
    themes: ['study', 'travel'],
  },
  {
    id: 'transit-sun-exalt',
    scope: 'monthly',
    section: 'transit',
    priority: 72,
    conditions: { signalSource: 'astro', planet: ['Sun'], dignity: ['exaltation'] },
    template:
      `**Sun 엑잘테이션** — 자기 표현·리더십·중요한 발의에 ` +
      `우호적인 시기. 자신을 드러낼 일에 좋아요.`,
    themes: ['reputation', 'personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 테마 forecast 추가 (12종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'theme-money-warning',
    scope: 'monthly',
    section: 'theme-money',
    priority: 58,
    conditions: {
      signalSource: 'saju',
      sibsin: ['겁재'],
      maxPolarity: -1,
    },
    template:
      `💰 **재물** — 분탈·낭비 주의 시기. 큰 베팅·신규 투자 보류, ` +
      `기존 자산 지키기에 집중.`,
    themes: ['money'],
  },
  {
    id: 'theme-love-warning',
    scope: 'monthly',
    section: 'theme-love',
    priority: 58,
    conditions: {
      signalSource: 'saju',
      shinsalName: ['공망'],
    },
    template:
      `❤️ **연애** — 진척 더딘 시기. 새 관계보다 기존 관계 ` +
      `다지기에 집중하는 게 효율적.`,
    themes: ['love'],
  },
  {
    id: 'theme-health-warning',
    scope: 'monthly',
    section: 'theme-health',
    priority: 58,
    conditions: {
      signalSource: 'astro',
      planet: ['Saturn', 'Mars'],
      maxPolarity: -1,
    },
    template:
      `⚡ **건강** — 무리·과로 주의. 충분한 휴식·규칙적 운동· ` +
      `건강검진 권장. 작은 신호 놓치지 마세요.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-positive',
    scope: 'monthly',
    section: 'theme-health',
    priority: 56,
    conditions: {
      shinsalName: ['천덕', '천덕귀인', '월덕', '월덕귀인'],
    },
    template:
      `⚡ **건강** — 회복·치유에 우호적인 흐름. 미뤘던 건강 ` +
      `관리·검진·식습관 개선에 좋은 시기.`,
    themes: ['health'],
  },
  {
    id: 'theme-study-positive',
    scope: 'monthly',
    section: 'theme-study',
    priority: 56,
    conditions: {
      signalSource: 'saju',
      sibsin: ['정인', '편인'],
      minPolarity: 1,
    },
    template:
      `📚 **학업** — 학습·시험·자격증·전문성 다지기 시기. ` +
      `깊이 있는 공부가 잘 들어옵니다.`,
    themes: ['study'],
  },
  {
    id: 'theme-travel-positive',
    scope: 'monthly',
    section: 'theme-travel',
    priority: 56,
    conditions: {
      shinsalName: ['역마', '역마살'],
    },
    template:
      `✈️ **이동** — 여행·이직·이사 등 환경 변화에 우호적. ` +
      `평소 미뤘던 이동 계획 실행에 좋은 시기.`,
    themes: ['travel'],
  },

  // ═══════════════════════════════════════════════════════════
  // 5층 정렬 narrative (3종 — 사주×점성 동시 / 사주만 / 점성만)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'pattern-five-layer-both',
    scope: 'monthly',
    section: 'pattern',
    priority: 99,
    conditions: { patternId: ['five-layer-resonance'] },
    template:
      `이번 달 **사주·점성이 동시에 5층 정렬되는 날이 {count}번** ` +
      `있습니다. 명리 다섯 시간축(대운·세운·월운·일진·시진)과 점성의 ` +
      `5층 흐름이 모두 같은 방향으로 가는 드문 순간 — 동서양 두 ` +
      `시스템이 동시에 같은 답을 주는 시기입니다. 큰 결정·새 시작· ` +
      `계약·고백에 가장 좋은 날들.`,
    themes: ['personality', 'career'],
  },
  {
    id: 'pattern-saju-five-layer',
    scope: 'monthly',
    section: 'pattern',
    priority: 92,
    conditions: { patternId: ['saju-five-layer'] },
    template:
      `이번 달 **사주 5층 정렬일이 {count}번** 있습니다. ` +
      `대운부터 시진까지 명리적 흐름이 모두 같은 방향 — 본명의 ` +
      `리듬이 가장 자연스럽게 흘러가는 날들. 사주적으로 결정이 ` +
      `매끄러운 시기입니다.`,
    themes: ['personality'],
  },
  {
    id: 'pattern-astro-five-layer',
    scope: 'monthly',
    section: 'pattern',
    priority: 90,
    conditions: { patternId: ['astro-five-layer'] },
    template:
      `이번 달 **점성 5층 정렬일이 {count}번** 있습니다. ` +
      `행성 챕터·세운 흐름·월간 트랜짓·일진 어스펙트·행성시까지 모두 ` +
      `같은 방향. 외부 환경·타이밍이 받쳐주는 시기 — 새 만남·` +
      `이동·확장에 우호적입니다.`,
    themes: ['business', 'travel'],
  },

  // ═══════════════════════════════════════════════════════════
  // 매칭 패턴 narrative 추가 (3종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'pattern-romance-month',
    scope: 'monthly',
    section: 'pattern',
    priority: 80,
    conditions: { patternId: ['romance-trigger'] },
    template:
      `이번 달 **인연이 가까이 오는 날이 {count}번** 있습니다. ` +
      `소개·모임·연락 시도가 우호적인 날들.`,
    themes: ['love'],
  },
  {
    id: 'pattern-life-shift',
    scope: 'monthly',
    section: 'pattern',
    priority: 84,
    conditions: { patternId: ['life-chapter-shift'] },
    template:
      `이번 달 **인생 큰 흐름 전환점 {count}회**. 큰 그림을 다시 ` +
      `그리기 좋은 시기 — 작은 일에 매이지 말고 방향성 점검.`,
    themes: ['personality', 'spirituality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 大運 narrative 추가 (4종 — 강약 변형)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'daeun-jaeseong-weak',
    scope: 'monthly',
    section: 'daeun',
    priority: 90,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정재', '편재'],
    },
    template:
      `이 10년은 **재성 흐름이 강하지만 본인이 신약**한 시기입니다. ` +
      `현실적 성취 욕구가 크지만, 무리한 확장보다 자기 회복과 ` +
      `구조 다지기를 우선해야 결과가 따라옵니다.`,
    themes: ['money', 'health'],
  },
  {
    id: 'daeun-gwanseong-weak',
    scope: 'monthly',
    section: 'daeun',
    priority: 90,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정관', '편관'],
    },
    template:
      `이 10년은 **사회적 압박이 큰 시기**입니다. 책임이 무겁게 ` +
      `들어오지만 본인이 신약해서 부담될 수 있어요. ` +
      `힘 분배·우선순위 조절이 핵심입니다.`,
    themes: ['career', 'crisis'],
  },
  {
    id: 'daeun-bigeop-weak',
    scope: 'monthly',
    section: 'daeun',
    priority: 88,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['비견', '겁재'],
    },
    template:
      `이 10년은 **비겁(동료·경쟁자) 흐름**이 큰 시기입니다. ` +
      `신약자에게 도움 — 동료·친구·인맥이 자원이 됩니다. ` +
      `혼자 짊어지지 말고 협업으로.`,
    themes: ['social'],
  },
  {
    id: 'daeun-sigsang-weak',
    scope: 'monthly',
    section: 'daeun',
    priority: 86,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['식신', '상관'],
    },
    template:
      `이 10년은 **표현 욕구가 크지만 신약**한 시기입니다. ` +
      `창작·발휘는 좋지만 에너지 소진 주의. 결과보다 과정의 ` +
      `즐거움에 비중을 두세요.`,
    themes: ['creativity', 'health'],
  },

  // ═══════════════════════════════════════════════════════════
  // 본명 컨텍스트 — 일주 archetype, 격국, 강약 narrative (10종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'natal-strength-strong',
    scope: 'monthly',
    section: 'natal',
    priority: 65,
    conditions: { natalStrength: ['strong'] },
    template:
      `본명은 **신강** — 자기 주장과 추진력이 자연스러운 사주입니다. ` +
      `식상·재성·관성 운에 결과가 잘 나오는 타입.`,
    themes: ['personality'],
  },
  {
    id: 'natal-strength-weak',
    scope: 'monthly',
    section: 'natal',
    priority: 65,
    conditions: { natalStrength: ['weak'] },
    template:
      `본명은 **신약** — 인성·비겁의 도움이 들어올 때 결과가 따라옵니다. ` +
      `무리한 확장보다 협력·정리·내실 다지기가 어울리는 시기에 ` +
      `이 사주는 빛납니다.`,
    themes: ['personality'],
  },
  {
    id: 'natal-yongsin-fire',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['화'] },
    template:
      `본명 용신은 **화(火)** — 표현·열정·확장의 에너지가 ` +
      `흐름의 핵심. 火 활성기에 가장 활발해집니다.`,
    themes: ['creativity', 'reputation'],
  },
  {
    id: 'natal-yongsin-wood',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['목'] },
    template:
      `본명 용신은 **목(木)** — 성장·시작·학습의 에너지가 ` +
      `흐름의 핵심. 木 활성기(봄·초여름)에 큰 결과.`,
    themes: ['study', 'creativity'],
  },
  {
    id: 'natal-yongsin-metal',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['금'] },
    template:
      `본명 용신은 **금(金)** — 결단·정리·실행의 에너지가 ` +
      `핵심. 金 활성기(가을)에 결과가 모아짐.`,
    themes: ['career', 'legal'],
  },
  {
    id: 'natal-yongsin-water',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['수'] },
    template:
      `본명 용신은 **수(水)** — 지혜·연구·축적의 에너지가 ` +
      `핵심. 水 활성기(겨울)에 깊이가 만들어집니다.`,
    themes: ['study', 'spirituality'],
  },
  {
    id: 'natal-yongsin-earth',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['토'] },
    template:
      `본명 용신은 **토(土)** — 안정·중재·축적의 에너지가 ` +
      `핵심. 土 활성기에 관계·재산·뿌리가 단단해집니다.`,
    themes: ['family', 'social'],
  },

  // ═══════════════════════════════════════════════════════════
  // 점성 정통 narrative (8종 — ZR / Profection / Lifecycle)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'astro-zr-chapter',
    scope: 'monthly',
    section: 'transit',
    priority: 80,
    conditions: { signalSource: 'astro', signalKinds: ['zodiacal-releasing'] },
    template:
      `점성 **ZR(Zodiacal Releasing) 챕터** 진행 중. 헬레니즘 ` +
      `점성에서 인생의 큰 챕터를 표시하는 시기로, 이 챕터의 ` +
      `테마가 평생 흐름의 무대를 만듭니다.`,
    themes: ['personality', 'spirituality'],
  },
  {
    id: 'astro-profection-house',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: { signalSource: 'astro', signalKinds: ['profection'] },
    template:
      `**Profection (연주술)** — 올해 활성 하우스가 사회·관계·일상의 ` +
      `어느 영역을 비추는지 보여줍니다. 그 하우스의 ` +
      `Lord of Year가 1년 흐름의 주도자.`,
    themes: ['career', 'personality'],
  },
  {
    id: 'astro-lifecycle-saturn-return',
    scope: 'monthly',
    section: 'transit',
    priority: 85,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      maxPolarity: -1,
    },
    template:
      `**Saturn Return** 진행 — 인생의 큰 통과의례 시기. 책임·구조· ` +
      `현실의 무게가 강해지는 2~3년. 도망보다 정면 통과가 ` +
      `이후 30년 토대를 만듭니다.`,
    themes: ['career', 'crisis'],
  },
  {
    id: 'astro-lifecycle-jupiter-return',
    scope: 'monthly',
    section: 'transit',
    priority: 75,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      minPolarity: 1,
    },
    template:
      `**Jupiter Return** 진행 — 확장·낙관·기회가 다시 들어오는 ` +
      `12년 주기 회귀. 새 시작·외부 진출에 우호적입니다.`,
    themes: ['business', 'travel'],
  },
  {
    id: 'astro-eclipse-solar',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: { signalSource: 'astro', signalKinds: ['eclipse'] },
    template:
      `**일식·월식 영향권** — ±2주 동안 변화·발견·재구성의 ` +
      `에너지. 평소 보이지 않던 것이 드러나는 시기입니다.`,
    themes: ['crisis', 'personality'],
  },
  {
    id: 'astro-solar-return',
    scope: 'monthly',
    section: 'transit',
    priority: 72,
    conditions: { signalSource: 'astro', signalKinds: ['solar-return'] },
    template:
      `**Solar Return** (태양 회귀) — 새 1년 사이클 시작. ` +
      `이 차트의 ASC·MC sign이 한 해 전체 톤을 만듭니다.`,
    themes: ['personality'],
  },
  {
    id: 'astro-lunar-return',
    scope: 'monthly',
    section: 'transit',
    priority: 60,
    conditions: { signalSource: 'astro', signalKinds: ['lunar-return'] },
    template:
      `**Lunar Return** (달 회귀) — 한 달 정서 사이클 시작. ` +
      `이번 달 정서·관계·일상 톤이 이 차트에 담깁니다.`,
    themes: ['family', 'personality'],
  },
  {
    id: 'astro-progressed-moon',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: { signalSource: 'astro', signalKinds: ['progressed-moon'] },
    template:
      `**진행 달 어스펙트** — 28년 정서 사이클에서 본명에 ` +
      `걸리는 시기. 정서·내면 변화가 자연스럽게 일어납니다.`,
    themes: ['family', 'personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신살 narrative 확장 (12종 추가)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-cheonui',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['천의', '천의성'] },
    template:
      `🩺 **천의성** 발동 — 의약·치유·건강 영역에 도움이 들어오는 ` +
      `시기. 건강 점검·치료 시작에 좋아요.`,
    themes: ['health'],
  },
  {
    id: 'shinsal-amlock',
    scope: 'monthly',
    section: 'shinsal',
    priority: 47,
    conditions: { shinsalName: ['암록'] },
    template:
      `🤝 **암록** 발동 — 보이지 않는 도움·뒤에서 챙겨주는 사람· ` +
      `숨은 자원이 들어오는 시기. 부탁받지 않은 도움이 옵니다.`,
    themes: ['career', 'money'],
  },
  {
    id: 'shinsal-hakdang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 47,
    conditions: { shinsalName: ['학당', '학당귀인'] },
    template:
      `🎓 **학당귀인** 발동 — 학문·자격·시험·연구에 보호 ` +
      `들어오는 시기. 큰 시험·논문·발표에 우호적입니다.`,
    themes: ['study'],
  },
  {
    id: 'shinsal-geollok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['건록'] },
    template:
      `💼 **건록** 발동 — 자기 자리·소속·기반이 단단해지는 ` +
      `시기. 자리 잡기·소속 안정에 좋아요.`,
    themes: ['career', 'money'],
  },
  {
    id: 'shinsal-jewang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['제왕'] },
    template:
      `👑 **제왕** 발동 — 절정의 에너지. 자기 표현·발의·` +
      `리더십이 잘 통하는 시기. 단, 과강 주의.`,
    themes: ['career', 'reputation'],
  },
  {
    id: 'shinsal-wonjin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['원진'] },
    template:
      `⚡ **원진** 발동 — 가까운 사람과의 미묘한 갈등·오해 가능. ` +
      `중요한 대화는 조심스럽게.`,
    themes: ['family', 'crisis'],
  },
  {
    id: 'shinsal-hyeonchim',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['현침', '현침살'] },
    template:
      `📌 **현침** 발동 — 정밀·예리한 일에 좋음. 의료·기술· ` +
      `분석 영역. 단, 사람 관계는 부드럽게.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-gwigwan',
    scope: 'monthly',
    section: 'shinsal',
    priority: 43,
    conditions: { shinsalName: ['귀문', '귀문관', '귀문관살'] },
    template:
      `🌑 **귀문** 발동 — 정신적 예민함·직관·꿈이 활성. ` +
      `명상·내적 작업에 좋고, 큰 결정은 신중히.`,
    themes: ['health', 'spirituality'],
  },
  {
    id: 'shinsal-tianmun',
    scope: 'monthly',
    section: 'shinsal',
    priority: 44,
    conditions: { shinsalName: ['천문', '천문성'] },
    template:
      `🔮 **천문성** 발동 — 영적 통찰·고차원 학문·신비주의 ` +
      `영역에 우호적. 깊은 공부와 명상에 적합한 시기.`,
    themes: ['spirituality', 'study'],
  },
  {
    id: 'shinsal-geumyeo',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['금여', '금여성'] },
    template:
      `💎 **금여성** 발동 — 재물·결혼 운에 우호적. 안정적 ` +
      `풍요를 만드는 시기.`,
    themes: ['money', 'love'],
  },
  {
    id: 'shinsal-mungok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['문곡'] },
    template:
      `📖 **문곡** 발동 — 학문·문장·창작에 강한 보조. ` +
      `글·작품·발표가 잘 풀리는 시기.`,
    themes: ['study', 'creativity'],
  },
  {
    id: 'shinsal-taegeuk',
    scope: 'monthly',
    section: 'shinsal',
    priority: 49,
    conditions: { shinsalName: ['태극', '태극귀인'] },
    template:
      `☯️ **태극귀인** 발동 — 영성·종교·깨달음 영역에서 ` +
      `보호받는 시기. 내적 균형이 잡힙니다.`,
    themes: ['spirituality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 테마 forecast 확장 (15종 추가 — 영역별 길/평/흉)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'theme-business-positive',
    scope: 'monthly',
    section: 'theme-business',
    priority: 58,
    conditions: {
      signalSource: 'astro',
      planet: ['Jupiter'],
      minPolarity: 2,
    },
    template:
      `🏢 **사업·창업** — Jupiter 활성으로 확장 기회 강함. ` +
      `새 분야 진출·외부 협업에 우호적.`,
    themes: ['business'],
  },
  {
    id: 'theme-business-warning',
    scope: 'monthly',
    section: 'theme-business',
    priority: 56,
    conditions: {
      signalSource: 'astro',
      planet: ['Saturn'],
      maxPolarity: -1,
    },
    template:
      `🏢 **사업·창업** — Saturn 영향으로 진행 지연·구조 ` +
      `재정비 필요한 시기. 새 시작보다 기존 정리.`,
    themes: ['business'],
  },
  {
    id: 'theme-reputation-positive',
    scope: 'monthly',
    section: 'theme-reputation',
    priority: 56,
    conditions: {
      shinsalName: ['장성', '장성살'],
    },
    template:
      `🎖 **명예·평판** — 장성 활성. 공식 자리·대표 역할· ` +
      `발의에 우호적. 이름이 드러나는 시기.`,
    themes: ['reputation'],
  },
  {
    id: 'theme-family-warning',
    scope: 'monthly',
    section: 'theme-family',
    priority: 55,
    conditions: {
      signalSource: 'saju',
      shinsalName: ['원진', '귀문관', '귀문'],
    },
    template:
      `👨‍👩‍👧 **가족·관계** — 미묘한 긴장 가능. 평소보다 부드러운 ` +
      `소통이 필요한 시기.`,
    themes: ['family'],
  },
  {
    id: 'theme-spirituality-positive',
    scope: 'monthly',
    section: 'theme-spirituality',
    priority: 54,
    conditions: {
      signalSource: 'saju',
      shinsalName: ['화개', '화개살', '천문성'],
    },
    template:
      `🧘 **영성·내면** — 화개·천문 활성으로 명상·종교·` +
      `깊은 공부에 우호적인 시기.`,
    themes: ['spirituality'],
  },
  {
    id: 'theme-legal-warning',
    scope: 'monthly',
    section: 'theme-legal',
    priority: 55,
    conditions: {
      signalSource: 'astro',
      planet: ['Saturn'],
      maxPolarity: -1,
    },
    template:
      `⚖️ **법무·계약** — 공식 절차·서류 지연 가능. ` +
      `중요 계약은 길일 골라서. 작은 약속도 명확히.`,
    themes: ['legal'],
  },
  {
    id: 'theme-creativity-positive',
    scope: 'monthly',
    section: 'theme-creativity',
    priority: 55,
    conditions: {
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
      minPolarity: 1,
    },
    template:
      `🎨 **창의·표현** — 식상 활성으로 작품·콘텐츠·` +
      `발표가 잘 풀리는 시기.`,
    themes: ['creativity'],
  },
  {
    id: 'theme-children-positive',
    scope: 'monthly',
    section: 'theme-children',
    priority: 50,
    conditions: {
      signalSource: 'saju',
      sibsin: ['식신'],
      minPolarity: 1,
    },
    template:
      `👶 **자녀** — 식신 활성. 자녀 관련 기쁨·소식· ` +
      `임신·교육 진전에 우호적.`,
    themes: ['children'],
  },
  {
    id: 'theme-social-positive',
    scope: 'monthly',
    section: 'theme-social',
    priority: 50,
    conditions: {
      signalSource: 'saju',
      sibsin: ['비견', '겁재'],
    },
    template:
      `🤝 **인맥·동료** — 비겁 활성으로 동료·친구·네트워크 ` +
      `에너지가 강해지는 시기.`,
    themes: ['social'],
  },
  {
    id: 'theme-karma-active',
    scope: 'monthly',
    section: 'theme-karma',
    priority: 50,
    conditions: {
      signalSource: 'astro',
      planet: ['NorthNode', 'SouthNode'],
    },
    template:
      `🔮 **카르마** — 노드 트랜짓 활성. 인생 방향·과거 ` +
      `청산·새 챕터 진입의 신호가 들어오는 시기.`,
    themes: ['karma', 'spirituality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 조후용신 narrative (5종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'johu-fire-needed',
    scope: 'monthly',
    section: 'natal',
    priority: 62,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['pillar-sibsin'],
    },
    template:
      `이 달 **조후용신** — 본명 일간과 月支의 기후 균형에 ` +
      `필요한 오행이 들어옵니다. 그 오행이 강한 날들이 ` +
      `이번 달의 진짜 길일.`,
    themes: ['personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 사주 패턴 / 격국 narrative (5종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'saju-pattern-special',
    scope: 'monthly',
    section: 'pattern',
    priority: 68,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['saju-pattern'],
      minPolarity: 2,
    },
    template:
      `이 사주는 **특수 격국**을 형성하고 있어요. 일반 사주와 다른 ` +
      `규칙으로 흐르며, 그 격국이 활성화되는 시기에 진짜 ` +
      `결과가 나옵니다.`,
    themes: ['personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 오행 흐름 narrative (5종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'element-flow-receive',
    scope: 'monthly',
    section: 'wolun',
    priority: 65,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['pillar-sibsin'],
    },
    template:
      `오늘 **일진 오행 흐름** — 본명에 도움이 들어오는 ` +
      `날·받쳐주는 날·중립인 날이 매일 다르게 흘러갑니다. ` +
      `상생 받는 날을 골라 결정하면 자연스럽습니다.`,
    themes: ['personality'],
  },

  // ═══════════════════════════════════════════════════════════
  // 月運 추가 — 12 절기월 × 본명 매칭 핵심 케이스 (10종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'wolun-spring-wood',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['목'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `봄 月運은 본명 용신(목)에 우호적인 시기로 들어갑니다. ` +
      `새 시작·진출·확장에 좋은 한 달.`,
    themes: ['study', 'creativity'],
  },
  {
    id: 'wolun-summer-fire',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['화'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `여름 月運은 본명 용신(화)에 우호적입니다. 자기 표현· ` +
      `대외 활동·인맥 확장이 잘 통하는 한 달.`,
    themes: ['reputation', 'creativity'],
  },
  {
    id: 'wolun-autumn-metal',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['금'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `가을 月運은 본명 용신(금)에 우호적입니다. 결단·정리· ` +
      `결과 만들기에 좋은 한 달.`,
    themes: ['career', 'legal'],
  },
  {
    id: 'wolun-winter-water',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['수'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `겨울 月運은 본명 용신(수)에 우호적입니다. 연구·학습· ` +
      `내실 다지기·계획에 좋은 한 달.`,
    themes: ['study', 'spirituality'],
  },
]

/** 룰 매핑 — id로 빠른 조회 */
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]))
