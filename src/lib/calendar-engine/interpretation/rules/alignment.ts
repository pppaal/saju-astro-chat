import type { InterpretationRule } from '../types'

export const RULES_ALIGNMENT: InterpretationRule[] = [
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
      `있어요. 사주의 다섯 시간축(10년 흐름·올해 흐름·이번 달 흐름·하루 흐름·시간 흐름)과 점성의 ` +
      `5층 흐름이 모두 같은 방향으로 가는 드문 순간 — 동서양 두 ` +
      `시스템이 동시에 같은 답을 주는 시기예요. 큰 결정·새 시작· ` +
      `계약·고백에 가장 좋은 날이에요.`,
    templateEn:
      `This month there are **{count} days when saju and astrology align across all 5 layers**. ` +
      `The five time-axes of saju (decade, year, month, day, hour) and the 5-layer flow of astrology ` +
      `all point the same way — a rare moment when the Eastern and Western systems give the same answer. ` +
      `These are the best days for big decisions, new beginnings, contracts, and confessions.`,
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
      `10년 흐름부터 시간 흐름까지 사주 흐름이 모두 같은 방향 — 당신의 ` +
      `리듬이 가장 자연스럽게 흘러가는 날들. 사주적으로 결정이 ` +
      `매끄러운 시기예요.`,
    templateEn:
      `This month there are **{count} days when all 5 saju layers align**. ` +
      `From the decade down to the hour, every layer points the same way — these are the days ` +
      `your chart's rhythm flows most naturally. Decisions move smoothly from a saju standpoint.`,
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
      `행성 챕터·올해 흐름·월간 트랜짓·하루 흐름의 결·행성시까지 모두 ` +
      `같은 방향. 외부 환경·타이밍이 받쳐주는 시기 — 새 만남·` +
      `이동·확장에 우호적이에요.`,
    templateEn:
      `This month there are **{count} days when all 5 astrology layers align**. ` +
      `Planetary chapter, yearly flow, monthly transits, daily alignments, and planetary hours all point the same way. ` +
      `External environment and timing back you up — favourable for new meetings, moves, and expansion.`,
    themes: ['money', 'growth'],
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
      `본인 기운이 강한데 재물의 별도 강하게 들어와 — 벌이는 좋지만 지출도 ` +
      `같이 커지는 시기. 큰 매입 전에 한 박자 쉬어주세요.`,
    templateEn:
      `Your chart is strong and wealth and resources comes in strong too — earning is good, ` +
      `but spending grows along with it. Take a beat before any big purchase.`,
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
      `표현·창작이 재물로 흘러가는 구조 — 무리하지 않은 안정적 수입 ` +
      `흐름. 본업 다지기·꾸준한 작은 베팅에 좋아요.`,
    templateEn:
      `Creative expression is flowing into wealth and resources — a steady income current ` +
      `without overreach. Good for shoring up your day job and small, consistent bets.`,
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
      `책임·자리의 별이 켜져서 부동산·계약·공식 자산이 강해지는 흐름이에요. 명의·서류 정리, ` +
      `구조화된 자산 형성에 우호적이에요.`,
    templateEn:
      `Responsibility and standing is active, so real estate, contracts, and formal assets run strong. ` +
      `Favourable for sorting titles and paperwork and building structured wealth.`,
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
      `본인 힘이 충분한데 책임·자리도 강 — 공식 자리·승진·새 책임 ` +
      `다 받아낼 수 있는 시기. 적극적인 도전 가능.`,
    templateEn:
      `You have enough strength and responsibility and standing is strong too — you can take on ` +
      `official positions, promotions, and new duties. An active push is on the table.`,
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
    templateEn:
      `Responsibility piles up all at once while your capacity stays small. Focus only on ` +
      `the single most important thing and delegate the rest.`,
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
      `표현·창작의 별이 켜져 있고 본인 힘도 충분해요 — 표현·기획·창업·외주 일에 강한 ` +
      `시기로 새 분야 진출에 우호적이에요.`,
    templateEn:
      `Creative expression is active and you have enough strength — a strong time for ` +
      `expression, planning, starting ventures, and freelance work. Favourable for entering new fields.`,
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
      `형제·동료의 별이 켜져 있어요 — 동료·파트너십·공동 사업이 잘 흐르고, ` +
      `같이 일하는 사람들과 호흡이 잘 맞는 시기예요.`,
    templateEn:
      `Peers and rivals is active — a current of peers, partnerships, and shared ventures. ` +
      `The people you work with are in rhythm with you.`,
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
      `표현·창작 + 본인 힘 충분 — 매력·표현이 자연스럽게 발산되는 시기. ` +
      `새로운 만남에 적극 나서볼 만해요.`,
    templateEn:
      `Creative expression plus enough chart strength — charm and expression flow out naturally. ` +
      `It is worth being active about new meetings.`,
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
    templateEn:
      `Responsibility gets heavier in your relationships with family or elders. ` +
      `Do not try to be perfect — be honest about where you need help.`,
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
    templateEn:
      `Your stamina cannot keep up while outside demands are big. ` +
      `It is easy to overload on work or relationships, so push rest higher on your priority list.`,
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
      `배움·돌봄 + 본인 힘 충분 — 학업·연구·자기성장에 깊이 들어가기 ` +
      `좋은 시기. 자격증·전문 분야 다지기에 우호적이에요.`,
    templateEn:
      `Learning, care, and enough personal strength — a good time to go deep into study, ` +
      `research, and self-growth. Favourable for certifications and shoring up specialty fields.`,
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
      `표현·창작의 별이 켜져 있어요 — 표현·창작·아이디어 발산이 잘 들어오는 편이라 ` +
      `글·영상·기획 같은 결과물 만들기에 우호적이에요.`,
    templateEn:
      `Creative expression is active — expression, creation, and idea flow all land well. ` +
      `Favourable for producing writing, video, or planning work.`,
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
      `표현·창작의 별이 켜져 있어요 — 자녀·후배·새 작품과의 시간이 잘 흐르고, ` +
      `돌봄·교육·전수에 우호적인 편이에요.`,
    templateEn:
      `Creative expression is active — time with children, juniors, and new work flows well. ` +
      `Favourable for caretaking, teaching, and passing things on.`,
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
      `예술·고독의 별과 하늘 지혜의 별이 켜져 — 묵은 인연·깊은 흐름을 정리할 시기. ` +
      `명상·기록·내면 작업이 의외로 큰 변화를 만들어요.`,
    templateEn:
      `The art-and-solitude star and the heaven-wisdom star are active — a time to clear old ties and deep currents. ` +
      `Meditation, journaling, and inner work make surprisingly big shifts.`,
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
      `이 10년은 재물의 별이 들어오는 편이라 결혼·연애·동거 같은 관계 사건이 ` +
      `자연스럽게 자리잡혀요. 인연이 결과로 이어지기 좋은 큰 시기예요.`,
    templateEn:
      `This decade carries the wealth and resources current, so relationship events like marriage, ` +
      `partnership, or moving in together settle in naturally. A big stretch where connection turns into results.`,
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
    templateEn:
      `This decade is a big current where charm, popularity, and connection run strong. People gather ` +
      `more easily than usual and your first impression works in your favour, so new connections come often.`,
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
      `이 10년은 친구·동료·동업 인연이 자주 들어오는 편이에요. 깊은 ` +
      `연인보다 옆에서 같이 가는 사람이 인생을 바꾸는 시기예요.`,
    templateEn:
      `This decade is shaped by friends, peers, and partnership ties showing up often. The people walking ` +
      `beside you, more than a deep romantic partner, are the ones who change your life.`,
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
    templateEn:
      `This month is a good current for meeting connections. New meetings, progress in close relationships, ` +
      `and results from dates or set-ups all follow more easily than usual.`,
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
    templateEn:
      `Charm and attraction run stronger for a few days at a time recently. Going out, introductions, ` +
      `and social-media activity all turn into connections naturally.`,
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
      `이번 달은 표현·다정함이 자연스러워지는 편이에요. 마음을 전하거나 ` +
      `오해를 풀기 좋고, 자녀나 어린 사람과의 관계도 부드러워져요.`,
    templateEn:
      `This month, expressing yourself and being warm come naturally. Good for putting your feelings ` +
      `into words or clearing up misunderstandings, and your relationships with children or younger ` +
      `people soften too.`,
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
    templateEn:
      `This month is a good time for steady income and regular cash flow. ` +
      `A great window to review and tidy up fixed income streams like salary, rent, or recurring revenue.`,
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
    templateEn:
      `This month is a current where big money, side income, and new chances can come in. ` +
      `A good time to look into side income sources and investment chances you usually do not notice.`,
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
    templateEn:
      `For a few days at a time recently, watch for sudden symptoms or accident risk. ` +
      `Put off risky activity, and take a beat slower with driving, machinery, and sharp tools.`,
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
    templateEn:
      `The best current for recovery and healing is coming in lately. Starting the check-up, dental visit, ` +
      `or therapy you have been putting off works well, and a new workout routine will stick too.`,
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
      `이번 달은 표현·창작이 받쳐주는 흐름이라 컨디션 회복과 식욕·소화에 우호적이에요. ` +
      `식습관·수면 리듬을 다시 잡기에 가장 좋은 시기예요.`,
    templateEn:
      `Creative expression backs you up this month, so your condition recovers and appetite and digestion ` +
      `run well. The best time to reset eating habits and sleep rhythm.`,
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
      `당신에게 매력·끌림의 별이 자리잡은 사주예요. 매력과 인연 끌림이 평생 강한 ` +
      `편이라, 어디서든 사람이 잘 따르고 첫인상으로 기억되기 쉬워요.`,
    templateEn:
      `Your chart has the charm-and-attraction star built in. Charm and the pull of connection run strong for life — ` +
      `people gravitate to you wherever you are, and your first impression sticks.`,
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
      `재물의 별을 충분히 다룰 수 있는 본인 기운이 강한 사주예요. 결혼과 가정을 안정적으로 ` +
      `꾸리는 편이라 관계를 길게 가져가는 데 강점이 있어요.`,
    templateEn:
      `Your chart is strong enough to handle wealth and resources. You build marriage and home life ` +
      `steadily — your strength is in carrying relationships for the long haul.`,
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
      `재물의 별을 감당할 힘이 있는 사주예요. 큰 돈을 다루는 일이나 자기 ` +
      `사업, 자산 운용에 강점이 있어 평생 풍요로운 편이에요.`,
    templateEn:
      `Your chart has the strength to carry wealth and resources. You have an edge in handling big money, ` +
      `running your own business, and managing assets — a chart that stays abundant for life.`,
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
      `당신에게 형제·동료·경쟁의 기운이 강한 사주예요. 혼자 모으기보다 함께 벌고 나누는 ` +
      `편이라, 동업·공동투자·팀 단위 수익이 잘 맞아요.`,
    templateEn:
      `Peers and rivals run strong in your chart. Rather than saving alone, you earn and share together — ` +
      `partnerships, joint investments, and team-based income suit you well.`,
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
      `당신에게 불 기운이 강한 편이에요. 평소에 심혈관·염증·불면을 평생 ` +
      `유의해야 하고, 매운 음식과 과로를 자제하는 습관이 건강을 지켜줘요.`,
    templateEn:
      `Fire runs strong in your chart. Watch for cardiovascular issues, inflammation, and insomnia ` +
      `for life — the habit of going easy on spicy food and overwork is what protects your health.`,
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
      `당신에게 물 기운이 약하거나 차가운 편이에요. 평생 신장·요통·하체 ` +
      `냉증·우울감에 유의해야 하고, 따뜻한 음식과 하체 보온이 ` +
      `체질에 큰 도움이 돼요.`,
    templateEn:
      `Water is weak or runs cold in your chart. Watch for kidney issues, lower-back pain, a chilly lower ` +
      `body, and low mood throughout life — warm food and keeping your legs warm help your constitution a lot.`,
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
      `당신에게 강한 의지의 별·격동·전환의 별이 있는 사주예요. 추진력이 강한 결인 만큼 ` +
      `사고·부상·수술 같은 갑작스러운 신호에도 평생 유의해야 해요.`,
    templateEn:
      `Your chart carries the strong-will star or the upheaval star. The drive runs strong — and the trade-off is that ` +
      `you have to watch for sudden signals like accidents, injuries, and surgery throughout life.`,
    themes: ['health', 'career'],
  },

  // ═══════════════════════════════════════════════════════════
  // 도메인 변별 확대 (v2) — 기존에 안 잡히던 조건 조합으로
  // 도메인당 룰 다양성 ↑. 같은 사주라도 달마다 다른 룰이 fire 되게.
  // ═══════════════════════════════════════════════════════════

  // ── 돈·자산 (theme-money) 추가 ──
  {
    id: 'theme-money-print-support',
    scope: 'monthly',
    section: 'theme-money',
    priority: 53,
    conditions: { signalSource: 'saju', sibsin: ['정인', '편인'], minPolarity: 1 },
    template:
      `💰 **재물** — 직접 버는 돈보다 도움·지원·계약·문서로 들어오는 돈이 ` +
      `유리한 흐름. 보증·서류·자격을 챙기면 자산이 안정돼요.`,
    templateEn:
      `💰 **Money** — money that arrives through support, contracts, and paperwork flows more easily ` +
      `than money you chase directly. Keeping documents and credentials in order steadies your assets.`,
    themes: ['money'],
  },
  {
    id: 'theme-money-venus-flow',
    scope: 'monthly',
    section: 'theme-money',
    priority: 52,
    conditions: { signalSource: 'astro', planet: ['Venus'], minPolarity: 1 },
    template:
      `💸 **재물** — 사람·취향·아름다움과 엮인 돈이 잘 풀리는 흐름. ` +
      `협업, 좋아하는 일, 보기 좋은 결과물에 돈이 따라와요.`,
    templateEn:
      `💸 **Money** — money tied to people, taste, and beauty flows well. ` +
      `Collaboration, work you enjoy, and well-crafted results bring income along with them.`,
    themes: ['money'],
  },
  {
    id: 'theme-money-peer-cooperative',
    scope: 'monthly',
    section: 'theme-money',
    priority: 51,
    conditions: { signalSource: 'saju', sibsin: ['비견', '겁재'], minPolarity: 1 },
    template:
      `💰 **재물** — 혼자보다 함께 벌 때 더 커지는 흐름. 동업·공동 투자· ` +
      `나눠 받는 구조가 유리하고, 단독 큰 베팅은 한 박자 늦춰주세요.`,
    templateEn:
      `💰 **Money** — earnings grow more when shared than when chased alone. Partnerships, joint ` +
      `investment, and split structures work in your favour; hold off on solo big bets for now.`,
    themes: ['money'],
  },

  // ── 연애·관계 (theme-love) 추가 ──
  {
    id: 'theme-love-venus-warm',
    scope: 'monthly',
    section: 'theme-love',
    priority: 53,
    conditions: { signalSource: 'astro', planet: ['Venus'], minPolarity: 1 },
    template:
      `❤️ **연애** — 끌림과 다정함이 살아나는 흐름. 표현을 미루지 말고 ` +
      `먼저 다가가면 사이가 한 뼘 가까워져요.`,
    templateEn:
      `❤️ **Love** — attraction and warmth come alive. Don't put off saying what you feel — ` +
      `reaching out first closes the distance noticeably.`,
    themes: ['love'],
  },
  {
    id: 'theme-love-commitment',
    scope: 'monthly',
    section: 'theme-love',
    priority: 52,
    conditions: { signalSource: 'saju', sibsin: ['정관', '편관'], minPolarity: 1 },
    template:
      `❤️ **연애** — 가벼운 만남보다 진지한 약속·관계 정의가 어울리는 흐름. ` +
      `책임을 나눌 상대와의 진전에 좋은 시기예요.`,
    templateEn:
      `❤️ **Love** — this stretch favours serious commitment and defining the relationship over ` +
      `casual dating. A good window to move forward with someone you can share responsibility with.`,
    themes: ['love'],
  },
  {
    id: 'theme-love-moon-emotion',
    scope: 'monthly',
    section: 'theme-love',
    priority: 51,
    conditions: { signalSource: 'astro', planet: ['Moon'], maxPolarity: -1 },
    template:
      `❤️ **연애** — 감정 기복이 커지기 쉬운 흐름. 서운함을 쌓기보다 ` +
      `그때그때 부드럽게 말로 풀면 오해가 줄어요.`,
    templateEn:
      `❤️ **Love** — moods swing more easily now. Rather than letting little hurts pile up, ` +
      `airing them gently as they come keeps misunderstandings small.`,
    themes: ['love'],
  },

  // ── 일·커리어 (theme-career) 추가 ──
  {
    id: 'theme-career-output-shine',
    scope: 'monthly',
    section: 'theme-career',
    priority: 53,
    conditions: { signalSource: 'saju', sibsin: ['식신', '상관'], minPolarity: 1 },
    template:
      `🎯 **일·커리어** — 정해진 틀을 지키기보다 본인 색을 드러내는 일에서 ` +
      `결과가 나오는 흐름. 기획·발표·새 시도가 잘 통해요.`,
    templateEn:
      `🎯 **Work & Career** — results come from showing your own colour rather than keeping to a fixed mould. ` +
      `Planning, presenting, and new attempts all land well.`,
    themes: ['career'],
  },
  {
    id: 'theme-career-sun-visibility',
    scope: 'monthly',
    section: 'theme-career',
    priority: 52,
    conditions: { signalSource: 'astro', planet: ['Sun'], minPolarity: 1 },
    template:
      `🎯 **일·커리어** — 드러나는 자리에서 빛나는 흐름. 발표·대표·리드 역할을 ` +
      `맡으면 평소보다 인정이 빨리 따라와요.`,
    templateEn:
      `🎯 **Work & Career** — you shine in visible roles now. Taking the lead, presenting, or representing ` +
      `brings recognition faster than usual.`,
    themes: ['career'],
  },
  {
    id: 'theme-career-mars-drive',
    scope: 'monthly',
    section: 'theme-career',
    priority: 51,
    conditions: { signalSource: 'astro', planet: ['Mars'], minPolarity: 1 },
    template:
      `🎯 **일·커리어** — 추진력이 붙는 흐름. 미뤄둔 일을 밀어붙이기 좋지만, ` +
      `급하게 부딪히기보다 한 번에 하나씩 끝내는 게 효율적이에요.`,
    templateEn:
      `🎯 **Work & Career** — drive picks up. A good time to push stalled tasks forward — but finishing ` +
      `one thing at a time beats charging at everything at once.`,
    themes: ['career'],
  },

  // ── 몸·내면 (theme-health) 추가 ──
  {
    id: 'theme-health-wood-nerves',
    scope: 'monthly',
    section: 'theme-health',
    priority: 50,
    conditions: { yongsin: ['목'], signalSource: 'saju', maxPolarity: -1 },
    template:
      `⚡ **건강** — 긴장·스트레스가 간·신경·눈에 먼저 쌓이는 편이에요. ` +
      `가벼운 산책과 충분한 수면, 화 다스리기가 가장 잘 듣는 보강이에요.`,
    templateEn:
      `⚡ **Health** — tension and stress settle first in your liver, nerves, and eyes. ` +
      `Light walks, enough sleep, and keeping your temper cool are the repairs that work best.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-earth-digest',
    scope: 'monthly',
    section: 'theme-health',
    priority: 50,
    conditions: { yongsin: ['토'], signalSource: 'saju', maxPolarity: -1 },
    template:
      `⚡ **건강** — 소화·위장·생각 과부하가 약점이 되기 쉬운 흐름. ` +
      `규칙적인 식사와 생각 끊고 쉬는 시간이 몸을 받쳐줘요.`,
    templateEn:
      `⚡ **Health** — digestion, the stomach, and an overloaded mind are the weak points now. ` +
      `Regular meals and time to switch your thoughts off support the body.`,
    themes: ['health'],
  },
  {
    id: 'theme-health-food-vitality',
    scope: 'monthly',
    section: 'theme-health',
    priority: 49,
    conditions: { signalSource: 'saju', sibsin: ['식신'], minPolarity: 1 },
    template:
      `🌿 **건강** — 기운과 입맛이 살아나는 회복 흐름. 미뤄둔 운동 루틴을 ` +
      `다시 시작하기 좋고, 잘 먹고 잘 자는 기본이 큰 효과를 내요.`,
    templateEn:
      `🌿 **Health** — energy and appetite come back in a recovery stretch. A good time to restart a ` +
      `workout routine you let slide; eating and sleeping well pay off more than usual.`,
    themes: ['health'],
  },

  // ── 자기·성장 (theme-growth) 추가 ──
  {
    id: 'theme-growth-print-study',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 53,
    conditions: { signalSource: 'saju', sibsin: ['정인', '편인'], minPolarity: 1 },
    template:
      `📚 **자기·성장** — 배우고 깊이 파고드는 일에 운이 붙는 흐름. ` +
      `자격증·전문 공부·읽기·정리에 들이는 시간이 그대로 자산이 돼요.`,
    templateEn:
      `📚 **Self & Growth** — luck gathers around learning and going deep. Time spent on ` +
      `certifications, focused study, reading, and organising turns straight into an asset.`,
    themes: ['growth'],
  },
  {
    id: 'theme-growth-mercury-learning',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 52,
    conditions: { signalSource: 'astro', planet: ['Mercury'], minPolarity: 1 },
    template:
      `📚 **자기·성장** — 생각·말·글이 잘 통하는 흐름. 새 분야 학습, 글쓰기, ` +
      `대화로 풀어가는 일이 평소보다 빠르게 손에 잡혀요.`,
    templateEn:
      `📚 **Self & Growth** — thinking, speaking, and writing flow well. Learning a new field, writing, ` +
      `and anything you work out through conversation come together faster than usual.`,
    themes: ['growth'],
  },
  {
    id: 'theme-growth-uranus-breakthrough',
    scope: 'monthly',
    section: 'theme-growth',
    priority: 51,
    conditions: { signalSource: 'astro', planet: ['Uranus'], minPolarity: 1 },
    template:
      `✨ **자기·성장** — 익숙한 틀을 깨는 변화가 어울리는 흐름. 갑자기 떠오른 ` +
      `아이디어나 새로운 방식이 의외로 잘 풀리니, 한 번 시도해보세요.`,
    templateEn:
      `✨ **Self & Growth** — a stretch that suits breaking out of the familiar mould. A sudden idea or ` +
      `a new way of doing things works surprisingly well — give it a try.`,
    themes: ['growth'],
  },
]
