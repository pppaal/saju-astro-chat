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
]
