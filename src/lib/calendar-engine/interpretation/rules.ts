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
      `이 10년은 **든든히 받쳐주는 큰 흐름**이에요. ` +
      `학습·전문성·내실을 다지기에 가장 좋은 시기 — 무리해서 ` +
      `밖으로 나가기보다 안으로 깊어지는 방향이 결과적으로 더 멀리 가요.`,
    authorNote: '대운 인성 + 신약 — 쉬운 톤',
    themes: ['career', 'growth'],
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
      `시기예요. 생각이 깊어지고 결정이 느려지기 쉬워요. ` +
      `머리에 있는 것을 행동으로 옮기는 게 이 10년의 과제.`,
    themes: ['growth'],
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
      `이 10년은 **돈·자원·구체적 성취가 전면에 나오는 시기**예요. ` +
      `현실적 결과를 만들기 좋은 흐름이에요. 시스템과 구조를 ` +
      `단단히 만들면 이 시기의 결과가 평생 토대가 돼요.`,
    themes: ['money'],
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
      `이 10년은 **사회적 위치·책임·공식 평가가 핵심 주제**로 떠올라요. ` +
      `승진·자리 잡기·중요한 책임이 들어올 수 있는 시기. ` +
      `자기 자리를 사회에서 명확히 정의하는 10년이에요.`,
    themes: ['career'],
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
      `이 10년은 **표현·창작·자기 목소리가 강하게 작동**하는 시기예요. ` +
      `머리에 있던 것을 세상에 내놓는 10년 — 콘텐츠·작품·` +
      `새로운 시도가 결과로 나오기 쉬워요.`,
    themes: ['growth', 'love'],
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
      `**{yearGanji}** 세운 — 올해는 본명을 우호적으로 받쳐주는 ` +
      `한 해예요. 큰 결정과 새 시도가 평소보다 매끄럽게 흘러요. ` +
      `봄과 초여름이 운의 정점이에요. {yearGanjiText}`,
    themes: ['career', 'money'],
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
      `올해는 **부담이 들어오는 한 해**예요. 새로 벌이기보다 ` +
      `정리·점검·기존 자산 지키기로 방향 전환하는 게 유리. ` +
      `큰 결정은 길일을 골라서 하세요.`,
    themes: ['health'],
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
      `올해는 **큰 변동 없이 착실히 다져가는 한 해**예요. ` +
      `새 도약보다 작년 결과 정리하고 다음 도약 기반 만들기 좋아요.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 月運 (이번 달) narrative (3종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'wolun-yongsin',
    scope: 'monthly',
    section: 'wolun',
    // priority 80 → 65: 매월 같은 텍스트만 떠서 사용자가 "매달 똑같다"
    // 느낌. sibsin 분기 룰(jaeseong-positive·gwanseong-positive 등 priority
    // 76-78)이 먼저 fire하게 generic yongsin은 fallback으로 미룸.
    priority: 65,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      signalKinds: ['pillar-sibsin'],
      minPolarity: 2,
    },
    template:
      `**{monthGanji}** 월 — 본명을 우호적으로 받쳐주는 한 달이에요. ` +
      `의사결정·관계·실행이 평소보다 매끄러워요. ` +
      `미뤄둔 일을 처리하기 좋아요. {monthGanjiText}`,
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
      `이번 달은 **부담이 들어오는 한 달**이에요. 기운이 ` +
      `분산되는 시기 — 큰 결정은 보류, 일상 루틴 유지에 집중하세요. ` +
      `길일을 골라 중요한 일정을 배치하세요.`,
    themes: ['health'],
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
      `이번 달은 **사람·기회·자원이 자연스럽게 모이는 흐름**이에요. ` +
      `인맥 활용·협업·새로운 관계 시작이 우호적이에요.`,
    themes: ['growth', 'love'],
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
      `**확장·성장의 에너지가 가장 강한 시기**예요. ` +
      `새 분야·해외·교육 영역에서 좋은 진전이 기대돼요. ` +
      `이 흐름은 {duration} 동안 이어져요.`,
    themes: ['money', 'growth', 'career'],
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
      `**책임감·공식 관계에서 어려움이 자주 드러나는 시기**예요. ` +
      `약속 어그러짐·계약 지연이 잦아요. 큰 약속·공식 절차는 ` +
      `길일로 미루기를 권해요.`,
    themes: ['career'],
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
      `**평소보다 도움이 잘 들어오고 결정이 매끄러운 시기**예요. ` +
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
      `**예측 불가한 변동·갑작스러운 사건이 가능한 시기**예요. ` +
      `안정을 붙들기보다 변화를 정직하게 받아들이는 게 ` +
      `더 빠른 통과를 만들어요.`,
    themes: ['health', 'growth'],
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
      `이번 달 **재물 흐름이 두텁게 들어오는 날이 {count}번** 있어요. ` +
      `큰 결정·계약·투자를 그 날에 배치하면 효과 최대예요.`,
    themes: ['money'],
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
      `이번 달 **도움 받기 좋은 날이 {count}번** 있어요. ` +
      `부탁·만남·조언 구하기에 우호적. 평소 거리 두었던 인맥에 ` +
      `먼저 연락해 보세요.`,
    themes: ['career', 'growth'],
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
      `이번 달 **신중해야 할 날이 {count}번** 있어요. ` +
      `큰 결정·계약·이동은 길일({luckyDates})로 배치하세요. ` +
      `신중일에는 중요 약속 피하고 일상 유지에 집중해주세요.`,
    themes: ['health'],
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
      shinsalName: ['도화', '홍염살'],
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
      `어려운 부탁·결정적 조언이 필요한 일은 그 날에 잡으세요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-yeokma',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: {
      shinsalName: ['역마'],
    },
    template:
      `✈️ **이동·환경 변화 에너지**가 강해지는 시기. ` +
      `여행·이직·이사 등 미뤄둔 이동 계획이 있다면 지금이 적기예요.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신살 추가 (8종)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-hwagae',
    scope: 'monthly',
    section: 'shinsal',
    priority: 45,
    conditions: { shinsalName: ['화개'] },
    template:
      `🕯 **화개** 발동 — 내면 깊어지기·예술·종교·연구에 ` +
      `우호적인 시기. 혼자만의 시간이 결과로 이어져요.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'shinsal-mungchang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['문창'] },
    template:
      `📚 **문창** 발동 — 학습·시험·집필·발표에 강력한 보조. ` +
      `시험 준비·논문·콘텐츠 제작 모두 지금이 좋아요.`,
    themes: ['career'],
  },
  {
    id: 'shinsal-dohwa',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['도화'] },
    template:
      `🌸 **도화** 발동 — 매력·끌림·인기 에너지가 강해져요. ` +
      `소개·미팅·자기 표현이 잘 통하는 시기예요.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'shinsal-yangin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['양인'] },
    template:
      `⚔️ **양인** 발동 — 강력한 추진력. 단, 충돌·다툼 주의. ` +
      `결단력 필요한 일에 좋고, 인내가 필요한 일은 조심해주세요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-baekho',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['백호'] },
    template:
      `🔥 **백호** 발동 — 극단적 변동·사고 가능성. 운전·외출· ` +
      `위험한 작업은 신중하게 가주세요. 큰 결정은 길일로 잡아주세요.`,
    themes: ['health'],
  },
  {
    id: 'shinsal-gongmang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 38,
    conditions: { shinsalName: ['공망'] },
    template:
      `🌫 **공망** 발동 — 결과 안 보이는 시기. 새 시작보다 ` +
      `정리·복기·내면 작업이 더 효과적이에요.`,
    themes: ['growth', 'health'],
  },
  {
    id: 'shinsal-cheondeok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['천덕귀인', '월덕귀인'] },
    template:
      `🛡 **천덕·월덕** 발동 — 건강·가정·정서 영역에서 보호받는 ` +
      `시기. 회복·치유에 자연스러운 흐름이에요.`,
    themes: ['health', 'love'],
  },
  {
    id: 'shinsal-jangseong',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['장성'] },
    template:
      `🎖 **장성** 발동 — 리더십·명예·공적 자리. 발표·발의· ` +
      `대표 역할이 들어올 수 있는 시기예요.`,
    themes: ['career'],
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
      `이번 달은 **재물·자원이 활성화되는 흐름**이에요. ` +
      `수입 확보·자산 정리·계약에 좋은 한 달이에요.`,
    themes: ['money'],
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
    themes: ['career'],
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
    themes: ['growth', 'career'],
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
    themes: ['career', 'growth'],
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
      `거리 조절이 핵심이에요.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신강·신약 × 십신 월운 분기 (8종) — 매달 다른 narrative 보장.
  // 매월 月支의 sibsin은 다른데 옛 wolun 룰들은 minPolarity 1+만 매칭해
  // 신약+관성 같은 부정 케이스를 못 잡아서 모든 달이 같은 fallback 룰
  // (계절 룰) fire되던 문제 해소.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'wolun-gwanseong-weak',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정관', '편관'],
    },
    template:
      `**{monthGanji}** 월 — 책임이나 외부 압박이 평소보다 무거워지는 흐름이에요. ` +
      `완벽 다 하려 하지 말고 가장 중요한 한 건에만 집중해주세요. {monthGanjiText}`,
    themes: ['career', 'health'],
  },
  {
    id: 'wolun-jaeseong-weak',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정재', '편재'],
    },
    template:
      `**{monthGanji}** 월 — 돈은 보이는데 챙기기 힘든 흐름이에요. 큰 투자보다 ` +
      `현금흐름 안정과 건강 관리를 우선해주세요. {monthGanjiText}`,
    themes: ['money', 'health'],
  },
  {
    id: 'wolun-inseong-weak',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정인', '편인'],
    },
    template:
      `**{monthGanji}** 월 — 받쳐주는 큰 힘이 들어오는 흐름이에요. 학습이나 자격증, ` +
      `전문성 다지기에 가장 좋고 멘토·선배의 조언이 잘 통해요. {monthGanjiText}`,
    themes: ['career', 'love'],
  },
  {
    id: 'wolun-bigeop-weak',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['비견', '겁재'],
    },
    template:
      `**{monthGanji}** 월 — 친구·동료·협업이 도움이 되는 흐름이에요. 혼자 ` +
      `짊어지지 말고 함께 가는 사람과 나눠 보세요. {monthGanjiText}`,
    themes: ['growth', 'love'],
  },
  {
    id: 'wolun-gwanseong-strong',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정관', '편관'],
    },
    template:
      `**{monthGanji}** 월 — 책임·자리·평가가 들어오는 흐름이에요. 평소 쌓아둔 ` +
      `능력이 결과로 나오기 좋고, 승진이나 새 책임 부여가 자연스러워요. {monthGanjiText}`,
    themes: ['career', 'money'],
  },
  {
    id: 'wolun-jaeseong-strong',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정재', '편재'],
    },
    template:
      `**{monthGanji}** 월 — 실행력과 돈 흐름이 맞물려 가는 흐름이에요. 작은 ` +
      `투자나 자산 정리, 새 거래 시작에 가장 좋은 시기예요. {monthGanjiText}`,
    themes: ['money', 'career'],
  },
  {
    id: 'wolun-inseong-strong',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정인', '편인'],
    },
    template:
      `**{monthGanji}** 월 — 머리와 자료가 가득 차는데 행동이 약해지는 흐름이에요. ` +
      `짧은 실행 단위로 끊고 시작을 가볍게 만들면 잘 풀려요. {monthGanjiText}`,
    themes: ['career', 'growth'],
  },
  {
    id: 'wolun-siksang-strong',
    scope: 'monthly',
    section: 'wolun',
    priority: 82,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['식신', '상관'],
    },
    template:
      `**{monthGanji}** 월 — 표현과 아이디어 흐름이 강해지는 시기예요. 새 콘텐츠나 ` +
      `창작, 기획이 잘 풀리고 안 쓰던 SNS·블로그를 다시 손보면 운이 따라요. {monthGanjiText}`,
    themes: ['growth', 'career'],
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
      `**Jupiter가 자기 자리(${'{sign}'})에 머무는 시기**예요. ` +
      `확장·신뢰·기회의 흐름이 안정적이며, 평소보다 일이 ` +
      `잘 풀리는 한 달이에요.`,
    themes: ['money', 'career'],
  },
  {
    id: 'transit-saturn-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: { signalSource: 'astro', planet: ['Saturn'], dignity: ['domicile'] },
    template:
      `**Saturn이 자기 자리(${'{sign}'})에 머무는 시기**예요. ` +
      `책임·구조·장기 계획에 우호적. 인내가 결과를 만드는 흐름이에요.`,
    themes: ['career'],
  },
  {
    id: 'transit-saturn-detriment',
    scope: 'monthly',
    section: 'transit',
    priority: 76,
    conditions: { signalSource: 'astro', planet: ['Saturn'], dignity: ['detriment'] },
    template:
      `**Saturn 디트리먼트** — 공식 절차·책임·약속에서 어긋남이 ` +
      `자주 드러나는 시기. 중요한 약속은 길일로 잡아주세요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'transit-mars-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 72,
    conditions: { signalSource: 'astro', planet: ['Mars'], dignity: ['domicile'] },
    template:
      `**Mars가 자기 자리(${'{sign}'})에 머무는 시기** — 행동력· ` +
      `추진력이 강해져요. 미뤘던 일·결단이 필요한 일을 처리하기 좋아요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'transit-mars-fall',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: { signalSource: 'astro', planet: ['Mars'], dignity: ['fall'] },
    template:
      `**Mars 폴** — 행동력 둔화·의욕 저하의 시기. 큰 도전보다 ` +
      `회복·휴식·기존 일 정리가 효율적이에요.`,
    themes: ['health'],
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
    themes: ['love', 'growth'],
  },
  {
    id: 'transit-mercury-domicile',
    scope: 'monthly',
    section: 'transit',
    priority: 68,
    conditions: { signalSource: 'astro', planet: ['Mercury'], dignity: ['domicile', 'exaltation'] },
    template:
      `**Mercury가 강한 자리(${'{sign}'})에 머무는 시기** — 소통· ` +
      `학습·이동·문서 작업이 매끄러운 흐름이에요.`,
    themes: ['career', 'growth'],
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
    themes: ['career', 'growth'],
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
      `기존 자산 지키기에 집중해주세요.`,
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
      `❤️ **연애** — 진척 더딘 시기. 새 관계보다 기존 관계 ` + `다지기에 집중하는 게 효율적이에요.`,
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
      shinsalName: ['천덕귀인', '월덕귀인'],
    },
    template:
      `⚡ **건강** — 회복·치유에 우호적인 흐름. 미뤘던 건강 ` +
      `관리·검진·식습관 개선에 좋은 시기예요.`,
    themes: ['health'],
  },
  {
    id: 'theme-study-positive',
    scope: 'monthly',
    section: 'theme-career',
    priority: 56,
    conditions: {
      signalSource: 'saju',
      sibsin: ['정인', '편인'],
      minPolarity: 1,
    },
    template:
      `📚 **학업** — 학습·시험·자격증·전문성 다지기 시기. ` + `깊이 있는 공부가 잘 들어와요.`,
    themes: ['career'],
  },
  {
    id: 'theme-travel-positive',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 56,
    conditions: {
      shinsalName: ['역마'],
    },
    template:
      `✈️ **이동** — 여행·이직·이사 등 환경 변화에 우호적. ` +
      `평소 미뤘던 이동 계획 실행에 좋은 시기예요.`,
    themes: ['growth'],
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
      `있어요. 명리 다섯 시간축(대운·세운·월운·일진·시진)과 점성의 ` +
      `5층 흐름이 모두 같은 방향으로 가는 드문 순간 — 동서양 두 ` +
      `시스템이 동시에 같은 답을 주는 시기예요. 큰 결정·새 시작· ` +
      `계약·고백에 가장 좋은 날이에요.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'pattern-saju-five-layer',
    scope: 'monthly',
    section: 'pattern',
    priority: 92,
    conditions: { patternId: ['saju-five-layer'] },
    template:
      `이번 달 **사주 5층 정렬일이 {count}번** 있어요. ` +
      `대운부터 시진까지 명리적 흐름이 모두 같은 방향 — 본명의 ` +
      `리듬이 가장 자연스럽게 흘러가는 날들. 사주적으로 결정이 ` +
      `매끄러운 시기예요.`,
    themes: ['growth'],
  },
  {
    id: 'pattern-astro-five-layer',
    scope: 'monthly',
    section: 'pattern',
    priority: 90,
    conditions: { patternId: ['astro-five-layer'] },
    template:
      `이번 달 **점성 5층 정렬일이 {count}번** 있어요. ` +
      `행성 챕터·세운 흐름·월간 트랜짓·일진 어스펙트·행성시까지 모두 ` +
      `같은 방향. 외부 환경·타이밍이 받쳐주는 시기 — 새 만남·` +
      `이동·확장에 우호적이에요.`,
    themes: ['money', 'growth'],
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
      `이번 달 **인연이 가까이 오는 날이 {count}번** 있어요. ` +
      `소개·모임·연락 시도가 우호적인 날이에요.`,
    themes: ['love'],
  },
  {
    id: 'pattern-life-shift',
    scope: 'monthly',
    section: 'pattern',
    priority: 84,
    conditions: { patternId: ['life-chapter-shift'] },
    template:
      `이번 달 **인생 큰 흐름 전환점이 들어와요.** 큰 그림을 다시 ` +
      `그리기 좋은 시기 — 작은 일에 매이지 말고 방향성을 점검해주세요.`,
    themes: ['growth'],
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
      `이 10년은 **재성 흐름이 강하지만 본인이 신약**한 시기예요. ` +
      `현실적 성취 욕구가 크지만, 무리한 확장보다 자기 회복과 ` +
      `구조 다지기를 우선해야 결과가 따라와요.`,
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
      `이 10년은 **사회적 압박이 큰 시기**예요. 책임이 무겁게 ` +
      `들어오지만 본인이 신약해서 부담될 수 있어요. ` +
      `힘 분배·우선순위 조절이 핵심이에요.`,
    themes: ['career', 'health'],
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
      `이 10년은 **비겁(동료·경쟁자) 흐름**이 큰 시기예요. ` +
      `신약자에게 도움 — 동료·친구·인맥이 자원이 돼요. ` +
      `혼자 짊어지지 말고 협업으로 가주세요.`,
    themes: ['growth'],
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
      `이 10년은 **표현 욕구가 크지만 신약**한 시기예요. ` +
      `창작·발휘는 좋지만 에너지 소진 주의. 결과보다 과정의 ` +
      `즐거움에 비중을 두세요.`,
    themes: ['growth', 'health'],
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
      `본명은 **신강** — 자기 주장과 추진력이 자연스러운 사주예요. ` +
      `식상·재성·관성 운에 결과가 잘 나오는 타입이에요.`,
    themes: ['growth'],
  },
  {
    id: 'natal-strength-weak',
    scope: 'monthly',
    section: 'natal',
    priority: 65,
    conditions: { natalStrength: ['weak'] },
    template:
      `본명은 **신약** — 인성·비겁의 도움이 들어올 때 결과가 따라와요. ` +
      `무리한 확장보다 협력·정리·내실 다지기가 어울리는 시기에 ` +
      `이 사주는 빛나요.`,
    themes: ['growth'],
  },
  {
    id: 'natal-yongsin-fire',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['화'] },
    template:
      `본명 용신은 **화(火)** — 표현·열정·확장의 에너지가 ` +
      `흐름의 핵심. 火 활성기에 가장 활발해져요.`,
    themes: ['growth', 'career'],
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
    themes: ['career', 'growth'],
  },
  {
    id: 'natal-yongsin-metal',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['금'] },
    template:
      `본명 용신은 **금(金)** — 결단·정리·실행의 에너지가 ` +
      `핵심. 金 활성기(가을)에 결과가 모아져요.`,
    themes: ['career'],
  },
  {
    id: 'natal-yongsin-water',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['수'] },
    template:
      `본명 용신은 **수(水)** — 지혜·연구·축적의 에너지가 ` +
      `핵심. 水 활성기(겨울)에 깊이가 만들어져요.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'natal-yongsin-earth',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['토'] },
    template:
      `본명 용신은 **토(土)** — 안정·중재·축적의 에너지가 ` +
      `핵심. 土 활성기에 관계·재산·뿌리가 단단해져요.`,
    themes: ['love', 'growth'],
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
      `테마가 평생 흐름의 무대를 만들어요.`,
    themes: ['growth'],
  },
  {
    id: 'astro-profection-house',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: { signalSource: 'astro', signalKinds: ['profection'] },
    template:
      `**Profection (연주술)** — 올해 활성 하우스가 사회·관계·일상의 ` +
      `어느 영역을 비추는지 보여줘요. 그 하우스의 ` +
      `Lord of Year가 1년 흐름을 이끄는 주도자예요.`,
    themes: ['career', 'growth'],
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
      `이후 30년 토대를 만들어요.`,
    themes: ['career', 'health'],
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
      `12년 주기 회귀. 새 시작·외부 진출에 우호적이에요.`,
    themes: ['money', 'growth'],
  },
  {
    id: 'astro-eclipse-solar',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: { signalSource: 'astro', signalKinds: ['eclipse'] },
    template:
      `**일식·월식 영향권** — ±2주 동안 변화·발견·재구성의 ` +
      `에너지. 평소 보이지 않던 것이 드러나는 시기예요.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'astro-solar-return',
    scope: 'monthly',
    section: 'transit',
    priority: 72,
    conditions: { signalSource: 'astro', signalKinds: ['solar-return'] },
    template:
      `**Solar Return** (태양 회귀) — 새 1년 사이클 시작. ` +
      `이 차트의 ASC·MC sign이 한 해 전체 톤을 만들어요.`,
    themes: ['growth'],
  },
  {
    id: 'astro-lunar-return',
    scope: 'monthly',
    section: 'transit',
    priority: 60,
    conditions: { signalSource: 'astro', signalKinds: ['lunar-return'] },
    template:
      `**Lunar Return** (달 회귀) — 한 달 정서 사이클 시작. ` +
      `이번 달 정서·관계·일상 톤이 이 차트에 담겨요.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'astro-progressed-moon',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: { signalSource: 'astro', signalKinds: ['progressed-moon'] },
    template:
      `**진행 달 어스펙트** — 28년 정서 사이클에서 본명에 ` +
      `걸리는 시기. 정서·내면 변화가 자연스럽게 일어나요.`,
    themes: ['love', 'growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 신살 narrative 확장 (12종 추가)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'shinsal-cheonui',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['천의성'] },
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
      `숨은 자원이 들어오는 시기. 부탁받지 않은 도움이 와요.`,
    themes: ['career', 'money'],
  },
  {
    id: 'shinsal-hakdang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 47,
    conditions: { shinsalName: ['학당귀인'] },
    template:
      `🎓 **학당귀인** 발동 — 학문·자격·시험·연구에 보호 ` +
      `들어오는 시기. 큰 시험·논문·발표에 우호적이에요.`,
    themes: ['career'],
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
      `리더십이 잘 통하는 시기. 단, 과강은 주의해주세요.`,
    themes: ['career'],
  },
  {
    id: 'shinsal-wonjin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['원진'] },
    template:
      `⚡ **원진** 발동 — 가까운 사람과의 미묘한 갈등·오해 가능. ` +
      `중요한 대화는 조심스럽게 가주세요.`,
    themes: ['love', 'health'],
  },
  {
    id: 'shinsal-hyeonchim',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['현침'] },
    template:
      `📌 **현침** 발동 — 정밀·예리한 일에 좋음. 의료·기술· ` +
      `분석 영역. 단, 사람 관계는 부드럽게 가주세요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-gwigwan',
    scope: 'monthly',
    section: 'shinsal',
    priority: 43,
    conditions: { shinsalName: ['귀문관'] },
    template:
      `🌑 **귀문** 발동 — 정신적 예민함·직관·꿈이 활성. ` +
      `명상·내적 작업에 좋고, 큰 결정은 신중히 가주세요.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'shinsal-tianmun',
    scope: 'monthly',
    section: 'shinsal',
    priority: 44,
    conditions: { shinsalName: ['천문성'] },
    template:
      `🔮 **천문성** 발동 — 영적 통찰·고차원 학문·신비주의 ` +
      `영역에 우호적. 깊은 공부와 명상에 적합한 시기예요.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'shinsal-geumyeo',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['금여성'] },
    template: `💎 **금여성** 발동 — 재물·결혼 운에 우호적. 안정적 ` + `풍요를 만드는 시기예요.`,
    themes: ['money', 'love'],
  },
  {
    id: 'shinsal-mungok',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['문곡'] },
    template:
      `📖 **문곡** 발동 — 학문·문장·창작에 강한 보조. ` + `글·작품·발표가 잘 풀리는 시기예요.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'shinsal-taegeuk',
    scope: 'monthly',
    section: 'shinsal',
    priority: 49,
    conditions: { shinsalName: ['태극귀인'] },
    template:
      `☯️ **태극귀인** 발동 — 영성·종교·깨달음 영역에서 ` + `보호받는 시기. 내적 균형이 잡혀요.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 테마 forecast 확장 (15종 추가 — 영역별 길/평/흉)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'theme-business-positive',
    scope: 'monthly',
    section: 'theme-money',
    priority: 58,
    conditions: {
      signalSource: 'astro',
      planet: ['Jupiter'],
      minPolarity: 2,
    },
    template:
      `🏢 **사업·창업** — Jupiter 활성으로 확장 기회 강함. ` +
      `새 분야 진출·외부 협업에 우호적이에요.`,
    themes: ['money'],
  },
  {
    id: 'theme-business-warning',
    scope: 'monthly',
    section: 'theme-money',
    priority: 56,
    conditions: {
      signalSource: 'astro',
      planet: ['Saturn'],
      maxPolarity: -1,
    },
    template:
      `🏢 **사업·창업** — Saturn 영향으로 진행 지연·구조 ` +
      `재정비 필요한 시기. 새 시작보다 기존을 정리하는 편이 좋아요.`,
    themes: ['money'],
  },
  {
    id: 'theme-reputation-positive',
    scope: 'monthly',
    section: 'theme-career',
    priority: 56,
    conditions: {
      shinsalName: ['장성'],
    },
    template:
      `🎖 **명예·평판** — 장성 활성. 공식 자리·대표 역할· ` +
      `발의에 우호적. 이름이 드러나는 시기예요.`,
    themes: ['career'],
  },
  {
    id: 'theme-family-warning',
    scope: 'monthly',
    section: 'theme-love',
    priority: 55,
    conditions: {
      signalSource: 'saju',
      shinsalName: ['원진', '귀문관'],
    },
    template: `👨‍👩‍👧 **가족·관계** — 미묘한 긴장 가능. 평소보다 부드러운 ` + `소통이 필요한 시기예요.`,
    themes: ['love'],
  },
  {
    id: 'theme-spirituality-positive',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 54,
    conditions: {
      signalSource: 'saju',
      shinsalName: ['화개', '천문성'],
    },
    template: `🧘 **영성·내면** — 화개·천문 활성으로 명상·종교·` + `깊은 공부에 우호적인 시기예요.`,
    themes: ['growth'],
  },
  {
    id: 'theme-legal-warning',
    scope: 'monthly',
    section: 'theme-career',
    priority: 55,
    conditions: {
      signalSource: 'astro',
      planet: ['Saturn'],
      maxPolarity: -1,
    },
    template:
      `⚖️ **법무·계약** — 공식 절차·서류 지연 가능. ` +
      `중요한 계약은 길일을 골라서 진행해주세요. 작은 약속도 명확하게 정해주세요.`,
    themes: ['career'],
  },
  {
    id: 'theme-creativity-positive',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 55,
    conditions: {
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
      minPolarity: 1,
    },
    template: `🎨 **창의·표현** — 식상 활성으로 작품·콘텐츠·` + `발표가 잘 풀리는 시기예요.`,
    themes: ['growth'],
  },
  {
    id: 'theme-children-positive',
    scope: 'monthly',
    section: 'theme-love',
    priority: 50,
    conditions: {
      signalSource: 'saju',
      sibsin: ['식신'],
      minPolarity: 1,
    },
    template: `👶 **자녀** — 식신 활성. 자녀 관련 기쁨·소식· ` + `임신·교육 진전에 우호적이에요.`,
    themes: ['love'],
  },
  {
    id: 'theme-social-positive',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 50,
    conditions: {
      signalSource: 'saju',
      sibsin: ['비견', '겁재'],
    },
    template:
      `🤝 **인맥·동료** — 비겁 활성으로 동료·친구·네트워크 ` + `에너지가 강해지는 시기예요.`,
    themes: ['growth'],
  },
  {
    id: 'theme-karma-active',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 50,
    conditions: {
      signalSource: 'astro',
      planet: ['NorthNode', 'SouthNode'],
    },
    template:
      `🔮 **카르마** — 노드 트랜짓 활성. 인생 방향·과거 ` +
      `청산·새 챕터 진입의 신호가 들어오는 시기예요.`,
    themes: ['growth'],
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
      `필요한 오행이 들어와요. 그 오행이 강한 날들이 ` +
      `이번 달의 진짜 길일.`,
    themes: ['growth'],
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
      `결과가 나와요.`,
    themes: ['growth'],
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
      `날·받쳐주는 날·중립인 날이 매일 다르게 흘러가요. ` +
      `상생 받는 날을 골라 결정하면 자연스러워요.`,
    themes: ['growth'],
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
      `**{monthGanji}** 월 — 봄 흐름이 본명 용신(목)에 우호적인 시기로 들어가요. ` +
      `새 시작·진출·확장에 좋은 한 달이에요. {monthGanjiText}`,
    themes: ['career', 'growth'],
  },
  {
    id: 'wolun-summer-fire',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['화'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `**{monthGanji}** 월 — 여름 흐름이 본명 용신(화)에 우호적이에요. ` +
      `자기 표현·대외 활동·인맥 확장이 잘 통하는 한 달이에요. {monthGanjiText}`,
    themes: ['career', 'growth'],
  },
  {
    id: 'wolun-autumn-metal',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['금'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `**{monthGanji}** 월 — 가을 흐름이 본명 용신(금)에 우호적이에요. ` +
      `결단·정리·결과 만들기에 좋은 한 달이에요. {monthGanjiText}`,
    themes: ['career'],
  },
  {
    id: 'wolun-winter-water',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['수'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `**{monthGanji}** 월 — 겨울 흐름이 본명 용신(수)에 우호적이에요. ` +
      `연구·학습·내실 다지기·계획에 좋은 한 달이에요. {monthGanjiText}`,
    themes: ['career', 'growth'],
  },

  // ═════════════════════════════════════════════════════════════
  // 도메인 × 본명 컨텍스트 분기 — 같은 도메인 안 다른 톤
  // matcher의 5도메인 통합에 풍부도를 더하는 보조 룰들.
  // 같은 section에 추가 매칭되면 도메인 단락에 자연 연결사로 합쳐짐.
  // ═════════════════════════════════════════════════════════════

  // ── 돈·자산 분기 ──
  {
    id: 'theme-money-strong-with-wealth',
    scope: 'monthly',
    section: 'theme-money',
    priority: 55,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      sibsin: ['정재', '편재'],
      minPolarity: 1,
    },
    template:
      `본인이 신강한데 재성도 강하게 들어와 — 벌이는 좋지만 지출도 ` +
      `같이 커지는 시기. 큰 매입 전에 한 박자 쉬어주세요.`,
    themes: ['money'],
  },
  {
    id: 'theme-money-weak-with-food',
    scope: 'monthly',
    section: 'theme-money',
    priority: 54,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
    },
    template:
      `식상이 재성으로 흘러가는 구조 — 무리하지 않은 안정적 수입 ` +
      `흐름. 본업 다지기·꾸준한 작은 베팅에 좋아요.`,
    themes: ['money'],
  },
  {
    id: 'theme-money-officer-real-estate',
    scope: 'monthly',
    section: 'theme-money',
    priority: 53,
    conditions: {
      signalSource: 'saju',
      sibsin: ['정관', '편관'],
      minPolarity: 1,
    },
    template:
      `관성 활성으로 부동산·계약·공식 자산 강세. 명의·서류 정리, ` +
      `구조화된 자산 형성에 우호적인 흐름이에요.`,
    themes: ['money', 'career'],
  },

  // ── 일·커리어 분기 ──
  {
    id: 'theme-career-strong-officer',
    scope: 'monthly',
    section: 'theme-career',
    priority: 55,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      sibsin: ['정관', '편관'],
      minPolarity: 1,
    },
    template:
      `본인 힘이 충분한데 관성도 강 — 공식 자리·승진·새 책임 ` +
      `다 받아낼 수 있는 시기. 적극적인 도전 가능.`,
    themes: ['career'],
  },
  {
    id: 'theme-career-weak-officer',
    scope: 'monthly',
    section: 'theme-career',
    priority: 54,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      sibsin: ['정관', '편관'],
      minPolarity: 1,
    },
    template:
      `책임이 한꺼번에 몰리는데 본인 그릇이 작은 흐름이에요. 가장 중요한 ` +
      `한 건에만 집중하고 나머지는 위임하는 편이 좋아요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'theme-career-strong-food',
    scope: 'monthly',
    section: 'theme-money',
    priority: 53,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
      minPolarity: 1,
    },
    template:
      `식상 활성 + 본인 힘 충분 — 표현·기획·창업·외주 일에 강한 ` +
      `시기. 새 분야 진출에 우호적이에요.`,
    themes: ['money', 'growth'],
  },
  {
    id: 'theme-career-bigeop-partner',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 52,
    conditions: {
      signalSource: 'saju',
      sibsin: ['비견', '겁재'],
      minPolarity: 1,
    },
    template:
      `비겁 활성 — 동료·파트너십·공동 사업 흐름. 같이 일하는 ` +
      `사람들과 호흡이 잘 맞는 시기예요.`,
    themes: ['growth', 'money'],
  },

  // ── 관계 분기 ──
  {
    id: 'theme-love-strong-food',
    scope: 'monthly',
    section: 'theme-love',
    priority: 55,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
    },
    template:
      `식상 + 본인 힘 충분 — 매력·표현이 자연스럽게 발산되는 시기. ` +
      `새로운 만남에 적극 나서볼 만해요.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'theme-family-weak-officer',
    scope: 'monthly',
    section: 'theme-love',
    priority: 53,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      sibsin: ['정관', '편관'],
    },
    template:
      `가족이나 윗사람과의 관계에서 책임감이 무거워지는 시기예요. ` +
      `완벽하려 애쓰지 말고 도움이 필요한 부분은 솔직하게 말해보세요.`,
    themes: ['love'],
  },

  // ── 몸·내면 분기 ──
  {
    id: 'theme-health-weak-officer',
    scope: 'monthly',
    section: 'theme-health',
    priority: 55,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      sibsin: ['정관', '편관'],
    },
    template:
      `체력이 따라가지 못하는데 외부 부담이 큰 시기예요. 일이나 관계에 ` +
      `과부하가 걸리기 쉬우니 휴식 우선순위를 올려주세요.`,
    themes: ['health'],
  },
  {
    id: 'theme-study-strong-print',
    scope: 'monthly',
    section: 'theme-career',
    priority: 54,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      sibsin: ['정인', '편인'],
    },
    template:
      `인성 + 본인 힘 충분 — 학업·연구·자기성장에 깊이 들어가기 ` +
      `좋은 시기. 자격증·전문 분야 다지기에 우호적이에요.`,
    themes: ['career', 'growth'],
  },

  // ── 표현·창작 분기 ──
  {
    id: 'theme-creativity-food-active',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 55,
    conditions: {
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
      minPolarity: 1,
    },
    template:
      `식상 활성 — 표현·창작·아이디어 발산이 잘 들어오는 시기. ` +
      `글·영상·기획 같은 결과물 만들기 우호적이에요.`,
    themes: ['growth', 'money'],
  },
  {
    id: 'theme-children-food-active',
    scope: 'monthly',
    section: 'theme-love',
    priority: 53,
    conditions: {
      signalSource: 'saju',
      sibsin: ['식신', '상관'],
      minPolarity: 1,
    },
    template:
      `식상 활성 — 자녀·후배·새 작품과의 시간이 잘 흐르는 시기. ` +
      `돌봄·교육·전수에 우호적이에요.`,
    themes: ['love'],
  },
  {
    id: 'theme-karma-spiritual-deep',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 52,
    conditions: {
      signalSource: 'saju',
      shinsalName: ['화개', '천문성', '문곡'],
    },
    template:
      `화개·천문 활성 — 카르마·인연·깊은 흐름을 정리할 시기. ` +
      `명상·기록·내면 작업이 의외로 큰 변화를 만들어요.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 보강: theme-health (3개 → 8개) — 4대 theme 평형 맞춤
  // ═══════════════════════════════════════════════════════════
  {
    id: 'theme-health-fire-yongsin-overload',
    scope: 'monthly',
    section: 'theme-health',
    priority: 56,
    conditions: {
      yongsin: ['수'], // 수가 용신인 사주 = 화가 과한 사주
      signalSource: 'saju',
      sibsin: ['편관', '정관'],
      maxPolarity: -1,
    },
    template:
      `화(火) 기운이 과한 결에 관성 압박까지 걸리는 흐름이에요. 화상이나 ` +
      `염증, 심혈관, 불면에 유의해야 하는 시기라 매운 음식과 과로를 ` +
      `자제하고, 차가운 물·휴식·녹지 산책으로 식혀주세요.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-water-yongsin-cold',
    scope: 'monthly',
    section: 'theme-health',
    priority: 55,
    conditions: {
      yongsin: ['화'], // 화가 용신 = 수가 약하거나 차가운 결
      signalSource: 'saju',
      maxPolarity: -1,
    },
    template:
      `수(水)가 약하고 차가운 결이 강해지는 흐름이에요. 신장·요통·우울감· ` +
      `하체 냉증에 유의하면서 따뜻한 물을 자주 마시고, 허리와 하체 보온, ` +
      `충분한 수면을 챙겨주세요.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-mars-tension',
    scope: 'monthly',
    section: 'theme-health',
    priority: 54,
    conditions: {
      signalSource: 'astro',
      planet: ['Mars'],
      maxPolarity: -1,
    },
    template:
      `Mars가 긴장 신호로 들어와요. 사고·부상·짜증 위험이 올라가는 시기라 ` +
      `운동·운전·날카로운 도구 사용 시 한 박자 천천히 가주세요. 화내는 ` +
      `타이밍도 한 박자 늦춰보세요.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-recovery-window',
    scope: 'monthly',
    section: 'theme-health',
    priority: 57,
    conditions: {
      signalSource: 'astro',
      planet: ['Jupiter', 'Venus'],
      minPolarity: 1,
    },
    template:
      `Jupiter와 Venus가 우호적으로 들어와요. 회복과 치유에 가장 좋은 시기라 ` +
      `미뤄둔 건강검진·치과·수술 일정 잡기 좋고, 새 운동 루틴 시작도 ` +
      `잘 자리잡아요.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-shinsal-warning',
    scope: 'monthly',
    section: 'theme-health',
    priority: 53,
    conditions: {
      shinsalName: ['백호', '현침', '귀문관'],
    },
    template:
      `흉살(백호·현침·귀문 등)이 작용하는 시기예요. 갑작스러운 증상이나 ` +
      `소화기, 신경 예민함에 유의하면서 무리한 일정을 줄이고 매운 음식과 ` +
      `자극적인 음료는 피해주세요.`,
    themes: ['health'],
  },

  // ═══════════════════════════════════════════════════════════
  // 보강: 歲運 (3개 → 6개) — 연운 narrative 확충
  // ═══════════════════════════════════════════════════════════
  {
    id: 'seun-jaeseong',
    scope: 'monthly',
    section: 'seun',
    priority: 75,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정재', '편재'],
    },
    template:
      `**{yearGanji}** 세운 — 재성이 들어오는 해예요. 돈·실물·실제 ` +
      `결과가 눈에 보이는 흐름이라 작년에 뿌린 씨앗이 현금흐름으로 ` +
      `돌아오기 좋은 시기예요. {yearGanjiText}`,
    themes: ['money'],
  },
  {
    id: 'seun-gwansal-weak',
    scope: 'monthly',
    section: 'seun',
    priority: 72,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정관', '편관'],
    },
    template:
      `책임과 압박이 한꺼번에 몰리기 쉬운 해예요. 무리하게 짊어지지 말고 ` +
      `우선순위를 줄여서 가주세요. 이런 해엔 휴식이 곧 전략이에요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'seun-siksang',
    scope: 'monthly',
    section: 'seun',
    priority: 70,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['식신', '상관'],
    },
    template:
      `표현과 아이디어 흐름이 강해지는 해예요. 새 콘텐츠나 창작, 기획이 ` +
      `잘 풀려서 안 쓰던 SNS·블로그·포트폴리오를 다시 손보면 운이 따라와요.`,
    themes: ['growth', 'career'],
  },

  // ═══════════════════════════════════════════════════════════
  // 보강: 歲運 (yearly) 추가 — 12지지·신살·신강신약 케이스 확충.
  // 사용자가 "올해 운세" 가장 많이 묻기에 24개로 풍부하게.
  // 톤: ~해요 / ~좋아요 / ~잘 풀려요 친근체로 통일.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'seun-bijeon-geopjae',
    scope: 'monthly',
    section: 'seun',
    priority: 73,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['비견', '겁재'],
    },
    template:
      `올해는 같이 가는 사람과 자주 부딪히는 해예요. 동료·동업·경쟁이 ` +
      `함께 움직이는 흐름이라 협력은 잘 풀리지만, 돈과 역할 분배는 ` +
      `처음부터 명확하게 합의해두는 편이 좋아요.`,
    themes: ['growth', 'money'],
  },
  {
    id: 'seun-inseong-strong',
    scope: 'monthly',
    section: 'seun',
    priority: 71,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정인', '편인'],
    },
    template:
      `머리와 자료는 가득 차는데 행동으로 옮기는 게 약해지는 해예요. ` +
      `짧은 실행 단위로 끊어 가고, 시작 자체를 가볍게 만들면 잘 풀려요.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'seun-inseong-weak',
    scope: 'monthly',
    section: 'seun',
    priority: 76,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정인', '편인'],
    },
    template:
      `받쳐주는 큰 힘이 들어오는 해예요. 학습·자격증·전문성 다지기에 ` +
      `가장 좋고, 멘토나 선배 조언을 적극 받으면 운이 잘 풀려요.`,
    themes: ['career', 'love'],
  },
  {
    id: 'seun-jaeseong-weak',
    scope: 'monthly',
    section: 'seun',
    priority: 74,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정재', '편재'],
    },
    template:
      `돈은 보이는데 챙기기 힘든 해예요. 큰 투자보다 현금흐름 안정과 ` +
      `건강 관리를 우선해주세요. 무리하면 손실이 따라올 수 있어요.`,
    themes: ['money', 'health'],
  },
  {
    id: 'seun-jaeseong-strong',
    scope: 'monthly',
    section: 'seun',
    priority: 78,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정재', '편재'],
    },
    template:
      `실행력과 돈 흐름이 맞물려 가는 해예요. 작은 사업이나 투자, 자산 ` +
      `정리 같은 큰 결정을 내리기에 가장 좋은 시기예요.`,
    themes: ['money', 'career'],
  },
  {
    id: 'seun-shinsal-samhap',
    scope: 'monthly',
    section: 'seun',
    priority: 77,
    conditions: {
      shinsalName: ['천을귀인'],
      // 삼합·육합은 hyeongchung extractor가 별도 emit하는 신호라 같이
      // 매칭하려면 separate 룰 필요. 여기는 천을귀인 단독으로 가용.
    },
    template:
      `천을귀인이 작용하는 해예요. 1년에 몇 번 안 오는 우호적인 ` +
      `흐름이라 계약·결혼·이직·창업 같은 중요한 시작을 잡아두면 결과가 ` +
      `잘 풀려요.`,
    themes: ['career', 'love', 'money'],
  },
  {
    id: 'seun-shinsal-yangin',
    scope: 'monthly',
    section: 'seun',
    priority: 69,
    conditions: {
      shinsalName: ['양인', '괴강'],
    },
    template:
      `양인이나 괴강이 작용하는 해예요. 추진력은 강해지지만 충돌도 ` +
      `함께 늘어나니, 결단은 빠르게 가더라도 사람을 대할 때는 한 박자 ` +
      `천천히 가주세요.`,
    themes: ['career', 'health'],
  },
  {
    id: 'seun-shinsal-yeokma',
    scope: 'monthly',
    section: 'seun',
    priority: 68,
    conditions: {
      shinsalName: ['역마', '지살'],
    },
    template:
      `역마나 지살이 작용하는 해예요. 이동·이사·해외·환경 변화가 ` +
      `자연스럽게 따라오니, 한곳에 자리잡으려 애쓰기보다 흐름을 타는 ` +
      `편이 맞아요.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'seun-shinsal-dohwa',
    scope: 'monthly',
    section: 'seun',
    priority: 67,
    conditions: {
      shinsalName: ['도화', '홍염살'],
    },
    template:
      `도화나 홍염이 작용하는 해예요. 매력·인기·인연 흐름이 강해져서 ` +
      `연애나 인지도, 노출은 잘 풀리지만 가벼운 인연도 함께 늘어나니 ` +
      `선택은 신중하게 가주세요.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'seun-shinsal-baekho',
    scope: 'monthly',
    section: 'seun',
    priority: 66,
    conditions: {
      shinsalName: ['백호', '현침'],
    },
    template:
      `백호나 현침이 작용하는 해예요. 갑작스러운 변화나 사고, 건강 신호에 ` +
      `유의해야 하는 흐름이라 안전·검진·휴식 우선순위를 올리고 위험한 ` +
      `활동은 미루는 편이 안전해요.`,
    themes: ['health'],
  },
  {
    id: 'seun-shinsal-mangsin',
    scope: 'monthly',
    section: 'seun',
    priority: 65,
    conditions: {
      shinsalName: ['망신', '재살'],
    },
    template:
      `망신이나 재살이 작용하는 해예요. 평판·법·계약 분쟁이 생기기 쉬워서 ` +
      `SNS 글이나 구두 약속, 서류 한 줄도 꼼꼼하게 챙겨주세요. 충동적인 ` +
      `발언이 가장 큰 리스크예요.`,
    themes: ['career'],
  },
  {
    id: 'seun-shinsal-cheondeok',
    scope: 'monthly',
    section: 'seun',
    priority: 79,
    conditions: {
      shinsalName: ['천덕귀인', '월덕귀인'],
    },
    template:
      `천덕이나 월덕이 작용하는 해예요. 위기를 누군가가 막아주거나 ` +
      `우호적인 해결이 나오는 흐름이라, 평소 어려웠던 협상·치료·관계 ` +
      `회복을 시도해보기 좋아요.`,
    themes: ['health', 'love', 'career'],
  },
  {
    id: 'seun-shinsal-munchang',
    scope: 'monthly',
    section: 'seun',
    priority: 68,
    conditions: {
      shinsalName: ['문창', '학당귀인'],
    },
    template:
      `문창이나 학당이 작용하는 해예요. 학업·시험·자격증·연구 흐름이 ` +
      `가장 잘 풀리는 때라, 오래 미뤘던 공부나 자격증 도전을 시작하기에 ` +
      `가장 좋아요.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'seun-shinsal-cheonui',
    scope: 'monthly',
    section: 'seun',
    priority: 67,
    conditions: {
      shinsalName: ['천의성'], // 활인성은 천의성과 혼동, 별도 신살 아님
    },
    template:
      `천의성이 작용하는 해예요. 치유·돌봄·의료·상담 분야가 잘 풀려서 ` +
      `미뤘던 치료, 심리상담, 검진을 시작하면 효과가 좋고 남을 돕는 ` +
      `일도 운이 잘 따라요.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'seun-element-conflict',
    scope: 'monthly',
    section: 'seun',
    priority: 64,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      signalKinds: ['hyeongchung', 'tonggeun-shift'], // 실제 엔진 emit kind
      maxPolarity: -1,
    },
    template:
      `본명과 부딪히는 결의 해예요. 큰 변동이나 이별, 정리가 자연스럽게 ` +
      `나오는 시기라 거스르기보다 흐름을 받아들이는 편이 잘 풀려요.`,
    themes: ['growth', 'health'],
  },
  {
    id: 'seun-gwansal-strong',
    scope: 'monthly',
    section: 'seun',
    priority: 76,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'saju',
      signalLayer: ['yearly'],
      sibsin: ['정관', '편관'],
    },
    template:
      `책임·자리·직위가 들어오는 해예요. 평소 쌓아둔 능력이 결과로 ` +
      `나오기 좋고, 승진·이직·창업도 자리를 잘 잡아요.`,
    themes: ['career', 'money'],
  },
  {
    id: 'seun-noble-protection',
    scope: 'monthly',
    section: 'seun',
    priority: 80,
    conditions: {
      shinsalName: ['암록', '태극귀인'],
    },
    template:
      `암록이나 태극귀인이 작용하는 해예요. 보이지 않는 도움이 들어와서 ` +
      `평소 도와줬던 사람이나 오래된 인연이 결정적인 순간에 등장해요. ` +
      `자존심 세우지 말고 필요할 때 도움을 요청하세요.`,
    themes: ['love', 'money', 'career'],
  },
  {
    id: 'seun-baseline-neutral',
    scope: 'monthly',
    section: 'seun',
    priority: 60,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['yearly'],
      signalKinds: ['pillar-sibsin'],
      minPolarity: -1,
      maxPolarity: 1,
    },
    template:
      `큰 흥망 없이 평이하게 흘러가는 해예요. 새 일을 벌이기보다 이미 ` +
      `시작한 것을 안정시키고, 다음 해 도약을 위한 자료를 쌓아두는 ` +
      `시기로 가주세요.`,
    themes: ['growth'],
  },

  // ═══════════════════════════════════════════════════════════
  // 5층 × 5테마 매트릭스 균등화 — 약했던 8개 칸 보강 (총 +19 룰).
  // 大運×love / 月運×love·money·health / 본명×love·money·health 보강.
  // ═══════════════════════════════════════════════════════════

  // ─── 大運 × love (1 → 4) ───
  {
    id: 'daeun-love-jaeseong',
    scope: 'monthly',
    section: 'daeun',
    priority: 88,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['정재', '편재'],
    },
    template:
      `이 10년은 재성이 들어오는 결이라 결혼·연애·동거 같은 관계 사건이 ` +
      `자연스럽게 자리잡혀요. 인연이 결과로 이어지기 좋은 큰 시기예요.`,
    themes: ['love', 'money'],
  },
  {
    id: 'daeun-love-dohwa-hongyeom',
    scope: 'monthly',
    section: 'daeun',
    priority: 86,
    conditions: {
      signalLayer: ['decadal'],
      shinsalName: ['도화', '홍염살'],
    },
    template:
      `이 10년은 매력·인기·인연이 강해지는 큰 흐름이에요. 평소보다 사람이 ` +
      `잘 모이고, 첫인상이 좋게 작용해 새 인연이 자주 생겨요.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'daeun-love-bijeon-geopjae',
    scope: 'monthly',
    section: 'daeun',
    priority: 80,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['decadal'],
      sibsin: ['비견', '겁재'],
    },
    template:
      `이 10년은 친구·동료·동업 인연이 자주 들어오는 결이에요. 깊은 ` +
      `연인보다 옆에서 같이 가는 사람이 인생을 바꾸는 시기예요.`,
    themes: ['love', 'growth'],
  },

  // ─── 月運 × love (1 → 4) ───
  {
    id: 'wolun-love-jaeseong',
    scope: 'monthly',
    section: 'wolun',
    priority: 68,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정재', '편재'],
    },
    template:
      `이번 달은 인연 만나기 좋은 흐름이에요. 새 만남이나 친밀한 관계의 ` +
      `진전, 데이트·소개팅 결과가 평소보다 잘 따라와요.`,
    themes: ['love'],
  },
  {
    id: 'wolun-love-dohwa',
    scope: 'monthly',
    section: 'wolun',
    priority: 66,
    conditions: {
      // 신살(도화/홍염)은 daily layer로 emit되므로 signalLayer 조건 안 둠.
      // wolun 카테고리에서 노출되지만 매칭은 일진 단위.
      shinsalName: ['도화', '홍염살'],
    },
    template:
      `요즘 며칠씩 매력·끌림이 강해지는 흐름이에요. 외출·소개·SNS ` +
      `활동이 자연스럽게 인연으로 이어지기 좋아요.`,
    themes: ['love'],
  },
  {
    id: 'wolun-love-siksang',
    scope: 'monthly',
    section: 'wolun',
    priority: 64,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['식신', '상관'],
    },
    template:
      `이번 달은 표현·다정함이 자연스러워지는 결이에요. 마음을 전하거나 ` +
      `오해를 풀기 좋고, 자녀나 어린 사람과의 관계도 부드러워져요.`,
    themes: ['love', 'growth'],
  },

  // ─── 月運 × money (2 → 4) ───
  {
    id: 'wolun-money-jeongjae',
    scope: 'monthly',
    section: 'wolun',
    priority: 70,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['정재'],
    },
    template:
      `이번 달은 안정적인 수입과 정기적인 돈 흐름이 좋은 시기예요. ` +
      `월급·임대료·정기수입 같은 고정 돈줄을 점검·정리하기 좋아요.`,
    themes: ['money'],
  },
  {
    id: 'wolun-money-pyeonjae',
    scope: 'monthly',
    section: 'wolun',
    priority: 69,
    conditions: {
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['편재'],
    },
    template:
      `이번 달은 큰 돈·부수입·새 기회가 들어올 수 있는 흐름이에요. ` +
      `평소에 안 보이던 부수입원·투자 기회를 살펴보기 좋아요.`,
    themes: ['money'],
  },

  // ─── 月運 × health (1 → 4) ───
  {
    id: 'wolun-health-baekho-hyeonchim',
    scope: 'monthly',
    section: 'wolun',
    priority: 62,
    conditions: {
      // 신살은 daily layer만 emit. wolun 노출이지만 일진 단위 매칭.
      shinsalName: ['백호', '현침'],
    },
    template:
      `요즘 며칠씩 갑작스러운 증상이나 사고 위험에 유의해야 하는 흐름이에요. ` +
      `위험한 활동을 미루고, 운전·기계 작업·날카로운 도구 사용 시 ` +
      `한 박자 천천히 가주세요.`,
    themes: ['health'],
  },
  {
    id: 'wolun-health-cheondeok',
    scope: 'monthly',
    section: 'wolun',
    priority: 65,
    conditions: {
      // 신살은 daily layer만 emit. wolun 노출이지만 일진 단위 매칭.
      shinsalName: ['천덕귀인', '월덕귀인', '천의성'],
    },
    template:
      `요즘 회복과 치유에 가장 좋은 흐름이 들어와요. 미뤘던 건강검진· ` +
      `치과·심리상담을 시작하면 효과가 좋고, 새 운동 루틴도 자리잡아요.`,
    themes: ['health'],
  },
  {
    id: 'wolun-health-siksang-recovery',
    scope: 'monthly',
    section: 'wolun',
    priority: 60,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'saju',
      signalLayer: ['monthly'],
      sibsin: ['식신', '상관'],
    },
    template:
      `이번 달은 식상이 받쳐주는 흐름이라 컨디션 회복과 식욕·소화에 우호적이에요. ` +
      `식습관·수면 리듬을 다시 잡기에 가장 좋은 시기예요.`,
    themes: ['health'],
  },

  // ─── 본명 × love (2 → 4) ───
  {
    id: 'natal-love-dohwa-on-day',
    scope: 'monthly',
    section: 'natal',
    priority: 50,
    conditions: {
      shinsalName: ['도화'],
    },
    template:
      `본명에 도화가 자리잡은 사주예요. 매력과 인연 끌림이 평생 강한 ` +
      `결이라, 어디서든 사람이 잘 따르고 첫인상으로 기억되기 쉬워요.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'natal-love-jaeseong-balance',
    scope: 'monthly',
    section: 'natal',
    priority: 48,
    conditions: {
      signalSource: 'saju',
      sibsin: ['정재', '편재'],
      natalStrength: ['strong'],
    },
    template:
      `재성을 충분히 다룰 수 있는 신강 사주예요. 결혼과 가정을 안정적으로 ` +
      `꾸리는 결이라 관계를 길게 가져가는 데 강점이 있어요.`,
    themes: ['love', 'money'],
  },

  // ─── 본명 × money (2 → 4) ───
  {
    id: 'natal-money-jaeseong-rich',
    scope: 'monthly',
    section: 'natal',
    priority: 49,
    conditions: {
      signalSource: 'saju',
      sibsin: ['정재', '편재'],
      natalStrength: ['strong'],
    },
    template:
      `재성을 감당할 힘이 있는 본명이에요. 큰 돈을 다루는 일이나 자기 ` +
      `사업, 자산 운용에 강점이 있어 평생 풍요로운 결이에요.`,
    themes: ['money', 'career'],
  },
  {
    id: 'natal-money-bigeop-share',
    scope: 'monthly',
    section: 'natal',
    priority: 46,
    conditions: {
      signalSource: 'saju',
      sibsin: ['비견', '겁재'],
    },
    template:
      `본명에 비견·겁재가 강한 사주예요. 혼자 모으기보다 함께 벌고 나누는 ` +
      `결이라, 동업·공동투자·팀 단위 수익이 잘 맞아요.`,
    themes: ['money', 'growth'],
  },

  // ─── 본명 × health (1 → 4) ───
  {
    id: 'natal-health-fire-overload',
    scope: 'monthly',
    section: 'natal',
    priority: 50,
    conditions: {
      yongsin: ['수'], // 수가 용신 = 화 과한 사주
      signalSource: 'saju',
    },
    template:
      `본명에 화 기운이 강한 결이에요. 평소에 심혈관·염증·불면을 평생 ` +
      `유의해야 하고, 매운 음식과 과로를 자제하는 습관이 건강을 지켜줘요.`,
    themes: ['health'],
  },
  {
    id: 'natal-health-water-weak',
    scope: 'monthly',
    section: 'natal',
    priority: 48,
    conditions: {
      yongsin: ['화'], // 화가 용신 = 수 약함 또는 차가운 결
      signalSource: 'saju',
    },
    template:
      `본명에 수 기운이 약하거나 차가운 결이에요. 평생 신장·요통·하체 ` +
      `냉증·우울감에 유의해야 하고, 따뜻한 음식과 하체 보온이 ` +
      `체질에 큰 도움이 돼요.`,
    themes: ['health'],
  },
  {
    id: 'natal-health-yangin-gwaegang',
    scope: 'monthly',
    section: 'natal',
    priority: 47,
    conditions: {
      shinsalName: ['양인', '괴강', '백호'],
    },
    template:
      `본명에 양인·괴강·백호가 있는 사주예요. 추진력이 강한 결인 만큼 ` +
      `사고·부상·수술 같은 갑작스러운 신호에도 평생 유의해야 해요.`,
    themes: ['health', 'career'],
  },
]

/** 룰 매핑 — id로 빠른 조회 */
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]))
