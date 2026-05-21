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
    templateEn:
      `This 10-year arc is a **steady, supportive current**. ` +
      `It is the best time to build learning, expertise, and inner depth — ` +
      `going inward rather than pushing outward will take you further in the end.`,
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
    templateEn:
      `This 10-year arc is **so supportive it can actually stall you**. ` +
      `Thinking gets deeper and decisions get slower. ` +
      `Turning what is in your head into action is the assignment of this decade.`,
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
    templateEn:
      `This 10-year arc puts **money, resources, and concrete wins front and centre**. ` +
      `It is a great current for producing real-world results. Build solid ` +
      `systems and structures now and the results of this decade become a lifelong foundation.`,
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
      `이 10년은 **사회적 위치·책임·공식 평가가 중심**에 떠올라요. ` +
      `승진·자리 잡기·중요한 책임이 들어올 수 있는 시기. ` +
      `자기 자리를 사회에서 명확히 정의하는 10년이에요.`,
    templateEn:
      `In this 10-year arc, **social position, responsibility, and formal recognition** rise to the foreground. ` +
      `Promotions, settling into a role, and important duties can land in this period. ` +
      `It is the decade for defining clearly where you stand in the world.`,
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
    templateEn:
      `This 10-year arc is when **expression, creation, and your own voice run strong**. ` +
      `It is the decade for putting what is in your head out into the world — content, work, ` +
      `and new experiments tend to turn into actual results.`,
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
      `**{yearGanji}** 올해 흐름 — 올해는 당신을 우호적으로 받쳐주는 ` +
      `한 해예요. 큰 결정과 새 시도가 평소보다 매끄럽게 흘러요. ` +
      `봄과 초여름이 운의 정점이에요. {yearGanjiText}`,
    templateEn:
      `**{yearGanjiEn}** year — this is a year that supports your chart in a friendly way. ` +
      `Big decisions and new attempts flow more smoothly than usual. ` +
      `Spring and early summer are the peak of the wave. {yearGanjiTextEn}`,
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
    templateEn:
      `This is **a year when pressure rolls in**. Rather than starting new things, ` +
      `it is better to shift toward tidying up, reviewing, and protecting what you already have. ` +
      `Save big decisions for an auspicious day.`,
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
    templateEn:
      `This is **a steady year of consolidation with no big swings**. ` +
      `Rather than a fresh leap, it is good for tidying up last year's results and laying the base for the next one.`,
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
      `**{monthGanji}** 월 — 당신을 우호적으로 받쳐주는 한 달이에요. ` +
      `의사결정·관계·실행이 평소보다 매끄러워요. ` +
      `미뤄둔 일을 처리하기 좋아요. {monthGanjiText}`,
    templateEn:
      `**{monthGanjiEn}** month — a month that supports your chart in a friendly way. ` +
      `Decisions, relationships, and execution flow more smoothly than usual. ` +
      `Good for clearing things you have been putting off. {monthGanjiTextEn}`,
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
    templateEn:
      `This is **a month when pressure rolls in**. Your energy gets scattered — ` +
      `hold off on big decisions and focus on keeping your daily routines steady. ` +
      `Pick auspicious days for any important plans.`,
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
    templateEn:
      `This month is a **current where people, chances, and resources gather naturally**. ` +
      `Leaning on your network, collaborating, and starting new relationships all work in your favour.`,
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
    templateEn:
      `This is the **peak window for expansion and growth energy**. ` +
      `Expect good progress in new fields, overseas work, or learning. ` +
      `The current runs for {duration}.`,
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
    templateEn:
      `This is **a time when responsibility and formal relationships keep snagging**. ` +
      `Broken plans and contract delays are frequent. For big commitments and official paperwork, ` +
      `wait for an auspicious day.`,
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
    templateEn:
      `**Help arrives more easily than usual and decisions flow smoothly**. ` +
      `Luck moves with you naturally. The peak is {duration}.`,
    themes: ['career', 'money'],
  },
  {
    id: 'transit-uranus-square',
    scope: 'monthly',
    section: 'transit',
    priority: 75,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Uranus'],
      maxPolarity: -1,
    },
    template:
      `**예측 불가한 변동·갑작스러운 사건이 가능한 시기**예요. ` +
      `안정을 붙들기보다 변화를 정직하게 받아들이는 게 ` +
      `더 빠른 통과를 만들어요.`,
    templateEn:
      `**Unpredictable shifts and sudden events are possible**. ` +
      `Rather than clinging to stability, honestly accepting change ` +
      `gets you through faster.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'transit-neptune-harmonious',
    scope: 'monthly',
    section: 'transit',
    priority: 73,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Neptune'],
      minPolarity: 2,
    },
    template:
      `**영감·직관·감수성이 평소보다 깊게 열리는 시기**예요. ` +
      `예술·치유·영적 작업, 누군가를 향한 연민이 자연스럽게 흘러요. ` +
      `다만 경계가 흐려지기 쉬우니 큰 계약·돈 약속은 또렷할 때 ` +
      `다시 확인하세요. 흐름은 {duration} 동안 이어져요.`,
    templateEn:
      `**Inspiration, intuition, and sensitivity open up more deeply than usual**. ` +
      `Art, healing, spiritual work, and compassion for others flow naturally. ` +
      `Just note that boundaries blur easily — re-check big contracts or money ` +
      `promises when your head is clear. The current runs for {duration}.`,
    themes: ['growth', 'love'],
  },
  {
    id: 'transit-neptune-hard',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Neptune'],
      maxPolarity: -1,
    },
    template:
      `**안개가 낀 듯 방향이 흐려지기 쉬운 시기**예요. ` +
      `피로·혼란·이상화가 판단을 흔들 수 있어요. 과장된 약속이나 ` +
      `'너무 좋은' 제안은 한 박자 늦춰 확인하고, 큰 결정은 또렷한 ` +
      `날로 미루는 게 안전해요. 흐름은 {duration} 동안 이어져요.`,
    templateEn:
      `**Direction blurs as if fog has rolled in**. ` +
      `Fatigue, confusion, and idealisation can sway judgement. Slow down before ` +
      `trusting inflated promises or "too good to be true" offers, and push big ` +
      `decisions to a clearer day. The current runs for {duration}.`,
    themes: ['health', 'money'],
  },
  {
    id: 'transit-pluto-harmonious',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Pluto'],
      minPolarity: 2,
    },
    template:
      `**깊은 재구성과 진짜 영향력이 자라는 시기**예요. ` +
      `표면을 정리하고 핵심을 다시 세우는 힘이 강해져요. 한 가지에 ` +
      `집중하면 보통 때보다 훨씬 멀리 갈 수 있어요. 흐름은 {duration} 동안 이어져요.`,
    templateEn:
      `**Deep restructuring and real influence are growing**. ` +
      `The power to clear the surface and rebuild from the core intensifies. ` +
      `Focus on one thing and you can go much further than usual. ` +
      `The current runs for {duration}.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'transit-pluto-hard',
    scope: 'monthly',
    section: 'transit',
    priority: 75,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Pluto'],
      maxPolarity: -1,
    },
    template:
      `**힘겨루기·통제·집착이 드러나기 쉬운 시기**예요. ` +
      `붙잡으려 할수록 더 조여드는 흐름 — 끝낼 것을 끝내고 놓아줄 때 ` +
      `오히려 더 큰 힘이 돌아와요. 흐름은 {duration} 동안 이어져요.`,
    templateEn:
      `**Power struggles, control, and obsession surface more easily**. ` +
      `The harder you grip, the tighter it binds — ending what is over and ` +
      `letting go is what brings real power back. The current runs for {duration}.`,
    themes: ['love', 'health'],
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
    templateEn:
      `This month there are **{count} days when wealth and resources flow runs thick**. ` +
      `Line up big decisions, contracts, and investments on those days for maximum effect.`,
    themes: ['money'],
  },
  {
    id: 'pattern-gwan-in-flow',
    scope: 'monthly',
    section: 'pattern',
    priority: 84,
    conditions: {
      patternId: ['gwan-in-flow'],
    },
    template:
      `**관인상생(官印相生)** 흐름이 들어왔어요 — 윗선의 인정과 받쳐주는 ` +
      `후원이 함께 움직여요. 승진·자격·결재·공식 절차에 우호적이라, ` +
      `기관·윗사람에게 정식으로 제안하기 좋은 달이에요.`,
    templateEn:
      `An **"authority-meets-support" (官印相生)** current is in play — recognition from ` +
      `above and backing that supports you move together. Favourable for promotion, ` +
      `credentials, approvals, and official steps — a good month to make formal proposals.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'pattern-siksang-wealth',
    scope: 'monthly',
    section: 'pattern',
    priority: 83,
    conditions: {
      patternId: ['siksang-wealth'],
    },
    template:
      `**식상생재(食傷生財)** 흐름 — 재능과 표현이 곧장 수익으로 ` +
      `이어지는 달이에요. 콘텐츠·영업·창작·사이드 프로젝트를 ` +
      `'만들고 파는' 행동까지 밀고 가면 결과가 따라와요.`,
    templateEn:
      `A **"talent-into-income" (食傷生財)** current — what you make and express turns ` +
      `straight into earnings this month. Push content, sales, creative work, and side ` +
      `projects all the way to "make it and sell it," and results follow.`,
    themes: ['money', 'career'],
  },
  {
    id: 'pattern-wealth-to-status',
    scope: 'monthly',
    section: 'pattern',
    priority: 83,
    conditions: {
      patternId: ['wealth-to-status'],
    },
    template:
      `**재생관(財生官)** 흐름 — 성과가 직책·신뢰·평판으로 환산되는 ` +
      `달이에요. 실적을 또렷이 가시화해 계약·직책·공식 인정으로 ` +
      `연결하면, 들인 것이 입지로 돌아와요.`,
    templateEn:
      `A **"results-into-standing" (財生官)** current — achievements convert into title, ` +
      `trust, and reputation this month. Make your results visible and tie them to ` +
      `contracts, roles, or formal recognition, and what you invested returns as standing.`,
    themes: ['career', 'money'],
  },
  {
    id: 'pattern-wealth-rivalry',
    scope: 'monthly',
    section: 'pattern',
    priority: 86,
    conditions: {
      patternId: ['wealth-rivalry'],
    },
    template:
      `**군겁쟁재(群劫爭財)** 주의 — 경쟁·분탈로 돈이 새기 쉬운 달이에요. ` +
      `동업·금전 대여·공동 지출은 신중히, 내 몫을 분명히 하고 큰 ` +
      `지출은 또렷한 날로 미루는 게 안전해요.`,
    templateEn:
      `Caution for **"rivalry over wealth" (群劫爭財)** — money leaks easily through ` +
      `competition and splitting this month. Be careful with partnerships, lending, and ` +
      `shared spending; make your share clear and push big outlays to a clearer day.`,
    themes: ['money'],
  },
  {
    id: 'pattern-output-vs-authority',
    scope: 'monthly',
    section: 'pattern',
    priority: 85,
    conditions: {
      patternId: ['output-vs-authority'],
    },
    template:
      `**상관견관(傷官見官)** 주의 — 자유로운 표현이 규칙·윗선과 ` +
      `부딪히기 쉬운 달이에요. 상사·계약·법규와의 마찰, 감정적 ` +
      `직언·SNS 설화를 조심하고 공식 절차는 또렷하게 처리하세요.`,
    templateEn:
      `Caution for **"expression clashes with authority" (傷官見官)** — free expression ` +
      `bumps against rules and those above you this month. Watch for friction with bosses, ` +
      `contracts, and regulations, mind blunt remarks and social-media slips, and handle ` +
      `official steps carefully.`,
    themes: ['career'],
  },
  {
    id: 'pattern-siksin-controls-pressure',
    scope: 'monthly',
    section: 'pattern',
    priority: 83,
    conditions: {
      patternId: ['siksin-controls-pressure'],
    },
    template:
      `**식신제살(食神制殺)** 흐름 — 버겁던 압박·경쟁을 실력과 ` +
      `꾸준함으로 눌러 돌파하는 달이에요. 잔재주보다 정공법, ` +
      `매일의 루틴이 큰 부담을 이겨내요.`,
    templateEn:
      `A **"skill tames pressure" (食神制殺)** current — you push through daunting pressure ` +
      `and competition with steady competence this month. Straight methods over shortcuts; ` +
      `a daily routine is what beats the bigger load.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'pattern-expression-with-restraint',
    scope: 'monthly',
    section: 'pattern',
    priority: 82,
    conditions: {
      patternId: ['expression-with-restraint'],
    },
    template:
      `**상관패인(傷官佩印)** 흐름 — 톡톡 튀는 재능에 절제와 깊이가 ` +
      `더해지는 달이에요. 창작·기획·발표를 공부로 다듬으면 ` +
      `완성도가 한 단계 올라가요.`,
    templateEn:
      `An **"talent tempered by depth" (傷官佩印)** current — sparkling ideas gain restraint ` +
      `and depth this month. Refine creative work, planning, and presentations with study, ` +
      `and the finish quality jumps a level.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'pattern-authority-mixed',
    scope: 'monthly',
    section: 'pattern',
    priority: 84,
    conditions: {
      patternId: ['authority-mixed'],
    },
    template:
      `**관살혼잡(官殺混雜)** 주의 — 권위·기준 신호가 뒤섞여 결정이 ` +
      `산만해지기 쉬운 달이에요. 여러 윗선·요청이 충돌하면, 라인을 ` +
      `한 곳으로 정리하고 곁가지는 잠시 보류하세요.`,
    templateEn:
      `Caution for **"mixed authority" (官殺混雜)** — signals of authority and standards ` +
      `get tangled, scattering decisions this month. When several superiors or requests ` +
      `collide, consolidate to one line and shelve the side branches for now.`,
    themes: ['career'],
  },
  {
    id: 'pattern-wealth-erodes-resource',
    scope: 'monthly',
    section: 'pattern',
    priority: 84,
    conditions: {
      patternId: ['wealth-erodes-resource'],
    },
    template:
      `**탐재괴인(貪財壞印)** 주의 — 눈앞의 이익을 좇다 신뢰·명예·` +
      `배움을 갉아먹기 쉬운 달이에요. 단기 이득을 위해 원칙·평판을 ` +
      `내주는 선택은 길게 봐 손해. 신뢰를 택하세요.`,
    templateEn:
      `Caution for **"greed erodes integrity" (貪財壞印)** — chasing quick gains can eat ` +
      `into trust, reputation, and learning this month. Trading principles or standing for ` +
      `short-term profit costs more in the long run — choose trust.`,
    themes: ['growth', 'money'],
  },
  {
    id: 'pattern-energy-into-output',
    scope: 'monthly',
    section: 'pattern',
    priority: 81,
    conditions: {
      patternId: ['energy-into-output'],
    },
    template:
      `**토수(吐秀)** 흐름 — 넘치는 기운이 결과물로 시원하게 터져 ` +
      `나오는 달이에요. 협업·발표·창작·운동처럼 에너지를 밖으로 ` +
      `쏟는 활동에 우호적이에요.`,
    templateEn:
      `An **"energy bursts into output" (吐秀)** current — abundant drive pours out as ` +
      `tangible results this month. Favourable for collaboration, presenting, creating, ` +
      `and exercise — anything that channels energy outward.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'pattern-support-reinforcement',
    scope: 'monthly',
    section: 'pattern',
    priority: 80,
    conditions: {
      patternId: ['support-reinforcement'],
    },
    template:
      `**인비방조(印比幇助)** 흐름 — 후원과 동료가 기운을 받쳐주는 ` +
      `달이에요. 혼자 다 떠안기보다 도움·협력·휴식을 적극 쓰면 ` +
      `좋아요. 재충전과 기초 다지기에 우호적.`,
    templateEn:
      `A **"support reinforces you" (印比幇助)** current — backing and allies prop up your ` +
      `energy this month. Lean on help, cooperation, and rest rather than carrying it all ` +
      `alone. Favourable for recharging and shoring up foundations.`,
    themes: ['health', 'growth'],
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
    templateEn:
      `This month there are **{count} days that are great for receiving help**. ` +
      `Favourable for asking, meeting, and seeking advice. Reach out first to people ` +
      `you have kept some distance from.`,
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
      `주의해야 할 날에는 중요 약속 피하고 일상 유지에 집중해주세요.`,
    templateEn:
      `This month there are **{count} days to handle with care**. ` +
      `Schedule big decisions, contracts, and moves on auspicious days ({luckyDates}). ` +
      `On caution days, avoid important commitments and focus on keeping your routine steady.`,
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
    templateEn:
      `💰 **Money** — steady income, tidying up existing assets, and small investments ` +
      `all run in your favour. Save big bets for an auspicious day.`,
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
    templateEn:
      `❤️ **Love** — connection, meetings, and relationship progress flow naturally. ` +
      `Someone new may show up in a place you do not usually go.`,
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
    templateEn:
      `💼 **Career** — promotions, formal reviews, and new responsibilities may land. ` +
      `Composed conduct and keeping your word are the key.`,
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
      `🌟 **도움 받기 좋은 날** — {shinsalDates} 에 자리잡고 있어요. ` +
      `어려운 부탁·결정적 조언이 필요한 일은 이 날들에 맞춰 잡으세요.`,
    templateEn:
      `🌟 **Good days for receiving help** — they fall on {shinsalDates}. ` +
      `Schedule hard asks and anything that needs decisive advice for these dates.`,
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
    templateEn:
      `✈️ **Movement and environment-change energy** is running strong. ` +
      `If you have travel, a job switch, or a move on the back burner, now is the time.`,
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
      `🕯 **예술·고독의 별** 발동 — 내면 깊어지기·예술·종교·연구에 ` +
      `우호적인 시기. 혼자만의 시간이 결과로 이어져요.`,
    templateEn:
      `🕯 **The art-and-solitude star** is active — favourable for going inward, art, faith, and research. ` +
      `Time alone turns into real results.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'shinsal-mungchang',
    scope: 'monthly',
    section: 'shinsal',
    priority: 50,
    conditions: { shinsalName: ['문창'] },
    template:
      `📚 **학문의 별** 발동 — 학습·시험·집필·발표에 강력한 보조. ` +
      `시험 준비·논문·콘텐츠 제작 모두 지금이 좋아요.`,
    templateEn:
      `📚 **The literary star** is active — a strong boost for learning, exams, writing, and presentations. ` +
      `Exam prep, papers, and content creation all run well now.`,
    themes: ['career'],
  },
  {
    id: 'shinsal-dohwa',
    scope: 'monthly',
    section: 'shinsal',
    priority: 48,
    conditions: { shinsalName: ['도화'] },
    template:
      `🌸 **매력·끌림의 별** 발동 — 매력·끌림·인기 에너지가 강해져요. ` +
      `소개·미팅·자기 표현이 잘 통하는 시기예요.`,
    templateEn:
      `🌸 **The charm-and-attraction star** is active — charm, attraction, and popularity energy run strong. ` +
      `Introductions, meetings, and self-expression all land well.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'shinsal-yangin',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['양인'] },
    template:
      `⚔️ **강한 의지의 별** 발동 — 강력한 추진력. 단, 충돌·다툼 주의. ` +
      `결단력 필요한 일에 좋고, 인내가 필요한 일은 조심해주세요.`,
    templateEn:
      `⚔️ **The strong-will star** is active — powerful drive. Watch out for clashes and fights though. ` +
      `Good for anything that needs decisiveness; be careful with anything that needs patience.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-baekho',
    scope: 'monthly',
    section: 'shinsal',
    priority: 42,
    conditions: { shinsalName: ['백호'] },
    template:
      `🔥 **격동·전환의 별** 발동 — 극단적 변동·사고 가능성. 운전·외출· ` +
      `위험한 작업은 신중하게 가주세요. 큰 결정은 길일로 잡아주세요.`,
    templateEn:
      `🔥 **The upheaval star** is active — extreme swings and accidents are possible. ` +
      `Take it slow with driving, going out, and risky work. Save big decisions for an auspicious day.`,
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
    templateEn:
      `🌫 **Gongmang** is active — a time when results stay hidden. Rather than starting new things, ` +
      `tidying up, reviewing, and inner work all land better.`,
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
    templateEn:
      `🛡 **Cheondeok and Woldeok** are active — you are protected in health, family, and emotional areas. ` +
      `It is a natural current for recovery and healing.`,
    themes: ['health', 'love'],
  },
  {
    id: 'shinsal-jangseong',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['장성'] },
    template:
      `🎖 **명예·자리의 별** 발동 — 리더십·명예·공적 자리. 발표·발의·` +
      `대표 역할이 들어올 수 있는 시기예요.`,
    templateEn:
      `🎖 **The honour-and-position star** is active — leadership, recognition, and public-facing roles. ` +
      `Presentations, proposals, and representative positions may land in this period.`,
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
    templateEn:
      `This month is a **current where wealth and resources activate**. ` +
      `Good for securing income, organising assets, and signing contracts.`,
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
      `이번 달은 **사회적 평가·책임·공식 자리**가 중심에 떠올라요. ` +
      `승진·발탁·중요 책임 부여가 들어올 수 있어요.`,
    templateEn:
      `This month, **social recognition, responsibility, and formal positions** are the core theme. ` +
      `Promotions, being chosen, and important duties may land.`,
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
    templateEn:
      `This month is a current where **expression, creation, and your own voice** activate. ` +
      `Content, presentations, and new experiments tend to lead to real results.`,
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
    templateEn:
      `This month favours **learning, tidying, and building inner depth**. ` +
      `Good for certifications, exams, sharpening expertise, reading, and organising.`,
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
    templateEn:
      `This month, **network, peers, and collaboration** have a big influence. ` +
      `Good connections can land, and competition or friction too — managing your distance ` +
      `with people is the key.`,
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
    templateEn:
      `**{monthGanjiEn}** month — responsibility and outside pressure run heavier than usual. ` +
      `Do not try to be perfect on everything; focus on the single most important thing. {monthGanjiTextEn}`,
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
    templateEn:
      `**{monthGanjiEn}** month — money is visible but hard to actually hold on to. Rather than big investments, ` +
      `prioritise steady cash flow and looking after your health. {monthGanjiTextEn}`,
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
    templateEn:
      `**{monthGanjiEn}** month — a current where strong support flows in. It is the best time for learning, ` +
      `certifications, or sharpening expertise, and advice from mentors and elders lands well. {monthGanjiTextEn}`,
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
    templateEn:
      `**{monthGanjiEn}** month — a current where friends, peers, and collaboration help. Do not carry it alone — ` +
      `share the load with the people walking alongside you. {monthGanjiTextEn}`,
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
    templateEn:
      `**{monthGanjiEn}** month — a current where responsibility, position, and evaluation flow in. The ability ` +
      `you have been building turns into results, and promotions or new duties land naturally. {monthGanjiTextEn}`,
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
    templateEn:
      `**{monthGanjiEn}** month — execution power and cash flow lock into the same gear. It is the best time for ` +
      `small investments, organising assets, or starting new deals. {monthGanjiTextEn}`,
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
    templateEn:
      `**{monthGanjiEn}** month — your head and notes fill up but action weakens. Break things into short ` +
      `execution units and make the starting step light — that is how it flows. {monthGanjiTextEn}`,
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
      `**{monthGanji}** 월이에요. 표현과 아이디어가 살아나는 시기 — 새 콘텐츠나 ` +
      `창작, 기획이 잘 풀리고 안 쓰던 SNS·블로그를 다시 손보면 운이 따라와요. {monthGanjiText}`,
    templateEn:
      `**{monthGanjiEn}** month — expression and idea flow run strong. New content, creation, ` +
      `and planning all click; dusting off an unused social account or blog brings luck along. {monthGanjiTextEn}`,
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
    templateEn:
      `**Jupiter is sitting in its own home (${'{sign}'})**. ` +
      `Expansion, trust, and opportunity flow steadily, and the month runs ` +
      `more smoothly than usual.`,
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
    templateEn:
      `**Saturn is sitting in its own home (${'{sign}'})**. ` +
      `Favourable for responsibility, structure, and long-term plans. Patience is what turns into results.`,
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
    templateEn:
      `**Saturn in detriment** — official procedures, responsibilities, and commitments ` +
      `keep going sideways. Save important commitments for an auspicious day.`,
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
    templateEn:
      `**Mars is sitting in its own home (${'{sign}'})** — your action and drive ` +
      `run strong. Good for handling things you put off and anything that needs a decision.`,
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
    templateEn:
      `**Mars in fall** — action slows and motivation dips. Rather than big challenges, ` +
      `recovery, rest, and tidying up existing work are more efficient.`,
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
    templateEn:
      `**Venus is sitting in its own home (${'{sign}'})** — relationships, ` +
      `aesthetic sense, and finances all run in your favour. Good for dates, art, and spending.`,
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
    templateEn:
      `**Mercury is sitting in a strong sign (${'{sign}'})** — communication, ` +
      `learning, movement, and paperwork all flow smoothly.`,
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
    templateEn:
      `**Sun in exaltation** — favourable for self-expression, leadership, and big ` +
      `proposals. Good for anything where you put yourself out there.`,
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
    templateEn:
      `💰 **Money** — watch for losses and overspending. Hold off on big bets and new investments, ` +
      `and focus on protecting what you already have.`,
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
    templateEn:
      `❤️ **Love** — progress is slow. Rather than new relationships, ` +
      `it is more efficient to focus on deepening the ones you already have.`,
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
      `⚡ **건강** — 무리·과로 주의. 충분한 휴식·규칙적 운동·` +
      `건강검진 권장. 작은 신호 놓치지 마세요.`,
    templateEn:
      `⚡ **Health** — watch for pushing too hard and overwork. Get enough rest, exercise regularly, ` +
      `and book a check-up. Do not ignore the small signals.`,
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
    templateEn:
      `⚡ **Health** — a current favourable to recovery and healing. A good time for ` +
      `the health care, screenings, and diet changes you have been putting off.`,
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
    templateEn:
      `📚 **Study** — a time for learning, exams, certifications, and sharpening expertise. ` +
      `Deep study lands well.`,
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
    templateEn:
      `✈️ **Movement** — favourable for environment changes like travel, job switches, and moves. ` +
      `A good time to act on the move plans you have been putting off.`,
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
    templateEn:
      `This month there are **{count} days when connection moves close to you**. ` +
      `Favourable days for introductions, gatherings, and reaching out.`,
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
    templateEn:
      `This month, **a big life turning point comes in.** A good time to redraw the big picture — ` +
      `do not get caught up in small things; check your direction.`,
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
      `이 10년은 **재물의 별 흐름이 강하지만 본인 기운이 약한** 시기예요. ` +
      `현실적 성취 욕구가 크지만, 무리한 확장보다 자기 회복과 ` +
      `구조 다지기를 우선해야 결과가 따라와요.`,
    templateEn:
      `This decade has **strong wealth and resources flow but you are weak in chart strength**. ` +
      `The hunger for real-world results is big, but rather than over-expanding, prioritise self-recovery ` +
      `and shoring up your structure — that is what makes results follow.`,
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
      `들어오지만 본인 기운이 약해서 부담될 수 있어요. ` +
      `힘 분배·우선순위 조절이 핵심이에요.`,
    templateEn:
      `This decade carries **heavy social pressure**. Responsibility lands hard, ` +
      `but because your chart strength is weak it can become a burden. ` +
      `Pacing your energy and adjusting priorities is the key.`,
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
      `이 10년은 **형제·동료의 별(동료·경쟁자) 흐름**이 큰 시기예요. ` +
      `본인 기운이 약한 사람에게 도움 — 동료·친구·인맥이 자원이 돼요. ` +
      `혼자 짊어지지 말고 협업으로 가주세요.`,
    templateEn:
      `This decade is shaped by a strong **peers and rivals current**. ` +
      `For a weak chart this is help — peers, friends, and network become your resources. ` +
      `Do not carry it alone; go with collaboration.`,
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
      `이 10년은 **표현 욕구가 크지만 본인 기운이 약한** 시기예요. ` +
      `창작·발휘는 좋지만 에너지 소진 주의. 결과보다 과정의 ` +
      `즐거움에 비중을 두세요.`,
    templateEn:
      `This decade has **strong urge to express yourself but weak chart strength**. ` +
      `Creating and putting yourself out there is good, but watch for burnout. Weight the joy of the process ` +
      `over the result.`,
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
      `당신은 **기운이 강한 사주** — 자기 주장과 추진력이 자연스러워요. ` +
      `표현·창작·재물·책임·자리 운에 결과가 잘 나오는 타입이에요.`,
    templateEn:
      `Your chart is **strong** — self-assertion and drive come naturally. ` +
      `Results show up best in creative output, financial gain, and roles of responsibility.`,
    themes: ['growth'],
  },
  {
    id: 'natal-strength-weak',
    scope: 'monthly',
    section: 'natal',
    priority: 65,
    conditions: { natalStrength: ['weak'] },
    template:
      `당신은 **기운이 잔잔한 사주** — 배움·돌봄·형제·동료의 도움이 들어올 때 결과가 따라와요. ` +
      `무리한 확장보다 협력·정리·내실 다지기가 어울리는 시기에 ` +
      `이 사주는 빛나요.`,
    templateEn:
      `Your chart is **weak** — results come when learning, care, and peers and rivals lend support. ` +
      `Rather than over-expanding, this chart shines in periods suited to collaboration, tidying up, ` +
      `and building inner depth.`,
    themes: ['growth'],
  },
  {
    id: 'natal-yongsin-fire',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['화'] },
    template:
      `당신을 살리는 핵심 기운은 **불 기운** — 표현·열정·확장의 에너지가 ` +
      `흐름의 핵심. 불 기운이 강해지는 시기에 가장 활발해져요.`,
    templateEn:
      `The element that brings you most alive is **Fire** — expression, passion, and expansion energy ` +
      `are at the core of your flow. You come most alive when Fire is active.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'natal-yongsin-wood',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['목'] },
    template:
      `당신을 살리는 핵심 기운은 **나무 기운** — 성장·시작·학습의 에너지가 ` +
      `흐름의 핵심. 나무 기운이 강해지는 시기(봄·초여름)에 큰 결과.`,
    templateEn:
      `The element that brings you most alive is **Wood** — growth, beginnings, and learning energy ` +
      `are at the core. Big results when Wood is active (spring and early summer).`,
    themes: ['career', 'growth'],
  },
  {
    id: 'natal-yongsin-metal',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['금'] },
    template:
      `당신을 살리는 핵심 기운은 **금속 기운** — 결단·정리·실행의 에너지가 ` +
      `핵심. 금속 기운이 강해지는 시기(가을)에 결과가 모아져요.`,
    templateEn:
      `The element that brings you most alive is **Metal** — decisiveness, tidying up, and execution energy ` +
      `are at the core. Results gather when Metal is active (autumn).`,
    themes: ['career'],
  },
  {
    id: 'natal-yongsin-water',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['수'] },
    template:
      `당신을 살리는 핵심 기운은 **물 기운** — 지혜·연구·축적의 에너지가 ` +
      `핵심. 물 기운이 강해지는 시기(겨울)에 깊이가 만들어져요.`,
    templateEn:
      `The element that brings you most alive is **Water** — wisdom, research, and accumulation energy ` +
      `are at the core. Depth is built when Water is active (winter).`,
    themes: ['career', 'growth'],
  },
  {
    id: 'natal-yongsin-earth',
    scope: 'monthly',
    section: 'natal',
    priority: 60,
    conditions: { yongsin: ['토'] },
    template:
      `당신을 살리는 핵심 기운은 **흙 기운** — 안정·중재·축적의 에너지가 ` +
      `핵심. 흙 기운이 강해지는 시기에 관계·재산·뿌리가 단단해져요.`,
    templateEn:
      `The element that brings you most alive is **Earth** — stability, mediation, and accumulation energy ` +
      `are at the core. When Earth is active, your relationships, finances, and roots get sturdier.`,
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
    templateEn:
      `A **Zodiacal Releasing (ZR) chapter** is running. In Hellenistic astrology ` +
      `this marks one of the big chapters of life, and the theme of this chapter ` +
      `sets the stage for your lifelong flow.`,
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
    templateEn:
      `**Profection** — this year's active house lights up which area of life ` +
      `(society, relationships, daily life) is in focus. The Lord of Year ` +
      `for that house is the driver of the year's flow.`,
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
      planet: ['Saturn'],
      maxPolarity: -1,
    },
    template:
      `**Saturn Return** 진행 — 인생의 큰 통과의례 시기. 책임·구조·` +
      `현실의 무게가 강해지는 2~3년. 도망보다 정면 통과가 ` +
      `이후 30년 토대를 만들어요.`,
    templateEn:
      `**Saturn Return** is in progress — one of life's great rites of passage. ` +
      `A 2-3 year window where responsibility, structure, and the weight of reality intensify. ` +
      `Going through it head-on rather than running builds the foundation for the next 30 years.`,
    themes: ['career', 'health'],
  },
  {
    id: 'astro-lifecycle-pluto-square',
    scope: 'monthly',
    section: 'transit',
    priority: 86,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      planet: ['Pluto'],
      maxPolarity: -1,
    },
    template:
      `**Pluto Square Pluto** 진행 — 중년의 깊은 변환기예요. ` +
      `더 이상 맞지 않는 정체성·관계·일이 뿌리째 흔들려요. 억지로 ` +
      `붙들기보다, 무엇이 진짜 내 것인지 가려내고 나머지를 놓아주는 ` +
      `2~3년. 통과하면 훨씬 단단한 '나'로 다시 서요.`,
    templateEn:
      `**Pluto Square Pluto** is in progress — a deep midlife transformation. ` +
      `Identities, relationships, and work that no longer fit get shaken to the root. ` +
      `These 2-3 years are for sorting what is truly yours and releasing the rest, ` +
      `rather than forcing things to stay. Come through it and you stand as a far solider self.`,
    themes: ['growth', 'career', 'health'],
  },
  {
    id: 'astro-lifecycle-uranus-opposition',
    scope: 'monthly',
    section: 'transit',
    priority: 84,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      planet: ['Uranus'],
      maxPolarity: -1,
    },
    template:
      `**Uranus Opposition** 진행 — 흔히 말하는 '중년의 각성' 시기예요. ` +
      `눌러둔 자유·진짜 하고 싶던 것이 강하게 올라와요. 충동적으로 ` +
      `다 엎기보다, 정말 답답했던 한 곳을 정직하게 바꾸면 이후가 ` +
      `훨씬 가벼워져요.`,
    templateEn:
      `**Uranus Opposition** is in progress — the classic "midlife awakening." ` +
      `Suppressed freedom and what you truly wanted rise up strongly. Rather than ` +
      `impulsively overturning everything, honestly changing the one place that felt ` +
      `most stifling makes the years ahead far lighter.`,
    themes: ['growth', 'love'],
  },
  {
    id: 'astro-lifecycle-neptune-square',
    scope: 'monthly',
    section: 'transit',
    priority: 83,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      planet: ['Neptune'],
      maxPolarity: -1,
    },
    template:
      `**Neptune Square Neptune** 진행 — 그동안 믿어온 것에 안개가 ` +
      `끼는 시기예요. 의미·방향이 흐려지고 환멸이 올 수 있어요. ` +
      `이건 길을 잃은 게 아니라 더 깊은 의미를 찾으라는 신호 — ` +
      `조용히 내면을 돌보는 시간이 약이 돼요.`,
    templateEn:
      `**Neptune Square Neptune** is in progress — fog settles over what you ` +
      `once believed. Meaning and direction blur, and disillusionment can come. ` +
      `This is not losing your way but a call to find deeper meaning — quietly ` +
      `tending your inner life is the medicine.`,
    themes: ['growth', 'health'],
  },
  {
    id: 'astro-lifecycle-chiron-return',
    scope: 'monthly',
    section: 'transit',
    priority: 80,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      planet: ['Chiron'],
    },
    template:
      `**Chiron Return** 진행 — 오래된 상처를 다시 마주하고 ` +
      `매듭짓는 시기예요(약 50세). 같은 자리에서 아팠던 일이 ` +
      `한 번 더 떠오를 수 있지만, 이번엔 그걸 지혜로 바꿔 ` +
      `누군가를 도울 힘으로 만들 수 있어요.`,
    templateEn:
      `**Chiron Return** is in progress — a time (around age 50) to face an old ` +
      `wound once more and finally close it. The same sore spot may resurface, but ` +
      `this time you can turn it into wisdom and the power to help someone else.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'astro-lifecycle-jupiter-return',
    scope: 'monthly',
    section: 'transit',
    priority: 75,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['lifecycle'],
      planet: ['Jupiter'],
      minPolarity: 1,
    },
    template:
      `**Jupiter Return** 진행 — 확장·낙관·기회가 다시 들어오는 ` +
      `12년 주기 회귀. 새 시작·외부 진출에 우호적이에요.`,
    templateEn:
      `**Jupiter Return** is in progress — the 12-year return where expansion, optimism, ` +
      `and opportunity come back around. Favourable for new beginnings and stepping outward.`,
    themes: ['money', 'growth'],
  },
  {
    id: 'flow-angle-contact',
    scope: 'monthly',
    section: 'flow',
    priority: 82,
    conditions: { signalSource: 'astro', signalKinds: ['angle-contact'] },
    template: `{flowLine}`,
    templateEn: `{flowLineEn}`,
    themes: ['growth'],
  },
  {
    id: 'flow-house-slow',
    scope: 'monthly',
    section: 'flow',
    priority: 74,
    conditions: {
      signalSource: 'astro',
      signalKinds: ['house-transit'],
      planet: ['Saturn', 'Uranus', 'Neptune', 'Pluto'],
    },
    template: `{flowLine}`,
    templateEn: `{flowLineEn}`,
    themes: ['growth'],
  },
  {
    id: 'flow-house-jupiter',
    scope: 'monthly',
    section: 'flow',
    priority: 68,
    conditions: { signalSource: 'astro', signalKinds: ['house-transit'], planet: ['Jupiter'] },
    template: `{flowLine}`,
    templateEn: `{flowLineEn}`,
    themes: ['growth'],
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
    templateEn:
      `**Eclipse window** — for ±2 weeks the energy is one of change, discovery, ` +
      `and rearrangement. What is usually hidden comes to light.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'timing-void-of-course-moon',
    scope: 'monthly',
    section: 'timing',
    priority: 60,
    conditions: { signalSource: 'astro', signalKinds: ['void-of-course'] },
    template:
      `이번 달엔 **달이 잠시 힘을 잃는 '공전(空轉)' 구간**이 {vocDatesCount}번 있어요 ` +
      `({vocDates}). 그 시간대엔 새 시작·계약·중요한 연락·큰 구매 결정이 흐지부지되기 ` +
      `쉬워요. 급하지 않다면 한 박자 미루고, 마무리·정리·휴식·연습처럼 ‘이미 하던 일’에 ` +
      `쓰면 잘 맞아요.`,
    templateEn:
      `This month the **Moon goes "void of course"** {vocDatesCount} times ({vocDates}). ` +
      `During those windows new starts, contracts, important messages, and big purchase ` +
      `decisions tend to fizzle out. If it is not urgent, wait a beat — these hours suit ` +
      `wrapping up, tidying, rest, and practising things you are already doing.`,
    themes: [],
  },

  // ═══════════════════════════════════════════════════════════
  // 일진(오늘) — scope:'daily'. 짧고 액션 중심 (모바일 "오늘 어때?").
  // section 'today' (cap 4). 일진 십신은 매일 1개라 baseline, 그날 신살/충은
  // 있을 때만 더 얹힘. signalLayer:['daily'] 로 그날 신호만 매칭.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'today-siksang',
    scope: 'daily',
    section: 'today',
    priority: 56,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], sibsin: ['식신', '상관'] },
    template: `오늘은 **표현·실행**의 결 — 만든 걸 내보내고, 말·콘텐츠·영업이 잘 먹혀요.`,
    templateEn: `Today leans toward **expression & doing** — ship what you made; talking, content, and sales land well.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'today-jae',
    scope: 'daily',
    section: 'today',
    priority: 57,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], sibsin: ['정재', '편재'] },
    template: `오늘은 **돈·실리 감각**이 좋은 결 — 거래·정산·실속 챙기는 일에 ㄱ.`,
    templateEn: `Today your **money & practicality sense** is sharp — good for deals, settling accounts, securing value.`,
    themes: ['money'],
  },
  {
    id: 'today-gwan',
    scope: 'daily',
    section: 'today',
    priority: 56,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], sibsin: ['정관', '편관'] },
    template: `오늘은 **책임·공식 일**에 집중 좋은 결 — 보고·결재·약속 처리에 ㄱ.`,
    templateEn: `Today suits **responsibility & official matters** — reports, approvals, keeping commitments.`,
    themes: ['career'],
  },
  {
    id: 'today-in',
    scope: 'daily',
    section: 'today',
    priority: 55,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], sibsin: ['정인', '편인'] },
    template: `오늘은 **배우고 받아들이는** 결 — 무리한 추진보다 공부·정리·재충전이 맞아요.`,
    templateEn: `Today is for **learning & taking in** — study, organising, and recharging fit better than pushing hard.`,
    themes: ['growth', 'health'],
  },
  {
    id: 'today-bigyeop',
    scope: 'daily',
    section: 'today',
    priority: 55,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], sibsin: ['비견', '겁재'] },
    template: `오늘은 **추진력·자기주장**이 올라오는 결 — 밀어붙이기 좋되 고집·지출은 한 박자 점검.`,
    templateEn: `Today **drive & self-assertion** rise — good to push, but check stubbornness and spending a beat.`,
    themes: ['growth'],
  },
  {
    id: 'today-cheoneul',
    scope: 'daily',
    section: 'today',
    priority: 68,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], shinsalName: ['천을귀인'] },
    template: `오늘은 **귀인의 날** — 부탁·면담·중요한 연락에 우호적. 미뤘던 사람에게 먼저 ㄱ.`,
    templateEn: `Today is a **"helper" day** — favourable for asking, meetings, key messages. Reach out first to someone you'd put off.`,
    themes: ['career', 'health'],
  },
  {
    id: 'today-dohwa',
    scope: 'daily',
    section: 'today',
    priority: 66,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], shinsalName: ['도화', '홍염살'] },
    template: `오늘은 **매력·인연의 날** — 만남·소개 자리·연락 시도에 좋은 결.`,
    templateEn: `Today is a **charm & connection day** — good for meetups, introductions, reaching out.`,
    themes: ['love'],
  },
  {
    id: 'today-yeokma',
    scope: 'daily',
    section: 'today',
    priority: 64,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], shinsalName: ['역마', '지살'] },
    template: `오늘은 **이동·변화의 날** — 출장·여행·새 시도·자리 옮기기에 우호적.`,
    templateEn: `Today is a **movement & change day** — good for travel, trips, new attempts, switching things up.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'today-hwagae',
    scope: 'daily',
    section: 'today',
    priority: 62,
    conditions: { signalSource: 'saju', signalLayer: ['daily'], shinsalName: ['화개', '천문성'] },
    template: `오늘은 **사색·창작·혼자 시간**에 좋은 결 — 깊이 파고드는 작업이 잘 돼요.`,
    templateEn: `Today suits **reflection, creativity, and solo time** — deep, focused work flows.`,
    themes: ['growth'],
  },
  {
    id: 'today-chung',
    scope: 'daily',
    section: 'today',
    priority: 67,
    conditions: { signalSource: 'saju', signalKinds: ['hyeongchung'], maxPolarity: -1 },
    template: `오늘은 **부딪힘 주의** — 큰 결정·충돌·무리한 강행은 피하고 한 박자 쉬어가기.`,
    templateEn: `Today, **watch for friction** — avoid big decisions, clashes, and forcing things; take a beat.`,
    themes: ['health'],
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
    templateEn:
      `**Solar Return** — a new yearly cycle begins. ` +
      `The ASC and MC signs of this chart set the tone for the whole year.`,
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
    templateEn:
      `**Lunar Return** — a one-month emotional cycle begins. ` +
      `The tone of this month's feelings, relationships, and daily life is carried in this chart.`,
    themes: ['love', 'growth'],
  },
  {
    id: 'astro-progressed-moon',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: { signalSource: 'astro', signalKinds: ['progressed-moon'] },
    template:
      `**진행 달 흐름의 결** — 28년 정서 사이클에서 당신에게 ` +
      `걸리는 시기. 정서·내면 변화가 자연스럽게 일어나요.`,
    templateEn:
      `**Progressed Moon phase** — a stretch of the 28-year emotional cycle ` +
      `that lands on your chart. Emotional and inner shifts happen naturally.`,
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
    templateEn:
      `🩺 **Cheonuiseong** is active — help flows into medicine, healing, and health areas. ` +
      `Good for check-ups and starting treatment.`,
    themes: ['health'],
  },
  {
    id: 'shinsal-amlock',
    scope: 'monthly',
    section: 'shinsal',
    priority: 47,
    conditions: { shinsalName: ['암록'] },
    template:
      `🤝 **보이지 않는 도움의 별** 발동 — 보이지 않는 도움·뒤에서 챙겨주는 사람· ` +
      `숨은 자원이 들어오는 시기. 부탁받지 않은 도움이 와요.`,
    templateEn:
      `🤝 **A hidden-support star** is active — unseen help, people looking out for you from behind the scenes, ` +
      `and hidden resources flow in. Help arrives without you having to ask.`,
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
    templateEn:
      `🎓 **Hakdang Guin** is active — protection flows into study, qualifications, exams, and research. ` +
      `Favourable for big exams, papers, and presentations.`,
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
    templateEn:
      `💼 **Geollok** is active — your position, belonging, and base get sturdier. ` +
      `Good for settling into a place and stabilising where you belong.`,
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
    templateEn:
      `👑 **Jewang** is active — peak energy. Self-expression, proposals, and leadership ` +
      `all land well. Just watch out for overdoing it.`,
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
    templateEn:
      `⚡ **Wonjin** is active — subtle conflict and misunderstanding with people close to you are possible. ` +
      `Handle important conversations gently.`,
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
    templateEn:
      `📌 **Hyeonchim** is active — good for precise, sharp work. Medical, technical, ` +
      `and analytical fields. Just go gently with people.`,
    themes: ['career', 'health'],
  },
  {
    id: 'shinsal-gwigwan',
    scope: 'monthly',
    section: 'shinsal',
    priority: 43,
    conditions: { shinsalName: ['귀문관'] },
    template:
      `🌑 **귀문** 발동 — 정신적 예민함·직관·꿈이 켜져 있어요. ` +
      `명상·내적 작업에 좋고, 큰 결정은 신중히 가주세요.`,
    templateEn:
      `🌑 **Gwimun** is active — mental sensitivity, intuition, and dreams light up. ` +
      `Good for meditation and inner work; handle big decisions carefully.`,
    themes: ['health', 'growth'],
  },
  {
    id: 'shinsal-tianmun',
    scope: 'monthly',
    section: 'shinsal',
    priority: 44,
    conditions: { shinsalName: ['천문성'] },
    template:
      `🔮 **하늘 지혜의 별** 발동 — 영적 통찰·깊은 학문·신비로운 ` +
      `분야에 우호적. 깊은 공부와 명상에 잘 맞는 시기예요.`,
    templateEn:
      `🔮 **The heaven-wisdom star** is active — favourable for spiritual insight, deep learning, ` +
      `and mystical fields. A fitting time for deep study and meditation.`,
    themes: ['growth', 'career'],
  },
  {
    id: 'shinsal-geumyeo',
    scope: 'monthly',
    section: 'shinsal',
    priority: 46,
    conditions: { shinsalName: ['금여성'] },
    template: `💎 **금여성** 발동 — 재물·결혼 운에 우호적. 안정적 ` + `풍요를 만드는 시기예요.`,
    templateEn:
      `💎 **Geumyeoseong** is active — favourable for wealth and marriage luck. ` +
      `A time that builds steady abundance.`,
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
    templateEn:
      `📖 **Mungok** is active — a strong boost for study, writing, and creation. ` +
      `Articles, work, and presentations all click.`,
    themes: ['career', 'growth'],
  },
  {
    id: 'shinsal-taegeuk',
    scope: 'monthly',
    section: 'shinsal',
    priority: 49,
    conditions: { shinsalName: ['태극귀인'] },
    template:
      `☯️ **행운의 도움 별** 발동 — 영성·종교·깨달음 영역에서 ` +
      `보호받는 시기. 내적 균형이 잡혀요.`,
    templateEn:
      `☯️ **A guiding star** is active — you are protected in spirituality, religion, ` +
      `and realisation. Inner balance comes into place.`,
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
    templateEn:
      `🏢 **Business and startups** — Jupiter is active and expansion chances run strong. ` +
      `Favourable for stepping into new fields and outside collaboration.`,
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
    templateEn:
      `🏢 **Business and startups** — Saturn's influence brings delays and a need to ` +
      `restructure. Rather than starting new, it is better to tidy up what you already have.`,
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
      `🎖 **명예·평판** — 명예·자리의 별이 켜져 있어요. 공식 자리·대표 역할·` +
      `발의에 우호적이라 이름이 드러나는 시기예요.`,
    templateEn:
      `🎖 **Reputation** — the honour-and-position star is shining. Favourable for official positions, representative roles, ` +
      `and proposals. Your name comes into view.`,
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
    templateEn:
      `👨‍👩‍👧 **Family and relationships** — subtle tension is possible. ` +
      `Softer communication than usual is needed.`,
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
    template:
      `🧘 **영성·내면** — 예술·고독의 별과 하늘 지혜의 별이 켜져, 명상·종교·` +
      `깊은 공부에 우호적인 시기예요.`,
    templateEn:
      `🧘 **Spirituality and inner life** — the art-and-solitude star and the heaven-wisdom star are active, ` +
      `making it a favourable time for meditation, religion, and deep study.`,
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
    templateEn:
      `⚖️ **Legal and contracts** — official procedures and paperwork may stall. ` +
      `Schedule important contracts on auspicious days. Spell out even small commitments clearly.`,
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
    template:
      `🎨 **창의·표현** — 표현·창작의 별이 켜져서 작품·콘텐츠·` + `발표가 잘 풀리는 시기예요.`,
    templateEn:
      `🎨 **Creativity and expression** — creative expression is alive, ` +
      `and work, content, and presentations all land well.`,
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
    template:
      `👶 **자녀** — 표현·창작의 별이 켜져 있어요. 자녀 관련 기쁨·소식· ` +
      `임신·교육 진전에 우호적이에요.`,
    templateEn:
      `👶 **Children** — creative expression is alive. Favourable for joy and news around children, ` +
      `pregnancy, and educational progress.`,
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
      `🤝 **인맥·동료** — 형제·동료의 별이 켜져서 동료·친구·네트워크 ` +
      `에너지가 강해지는 시기예요.`,
    templateEn:
      `🤝 **Network and peers** — peers and rivals is active, so peers, friends, ` +
      `and network energy run strong.`,
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
    templateEn:
      `🔮 **Karma** — a node transit is active. Signals about life direction, ` +
      `clearing the past, and stepping into a new chapter come through.`,
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
      `이 달 **계절 균형 기운** — 당신의 타고난 중심 기운과 태어난 달의 기후 균형에 ` +
      `필요한 오행이 들어와요. 그 오행이 강한 날들이 ` +
      `이번 달의 진짜 길일.`,
    templateEn:
      `This month's **seasonal balancing element** — the element needed for the climate balance ` +
      `between your core energy and the season comes in. The days when that element runs strong ` +
      `are this month's true auspicious days.`,
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
    templateEn:
      `Your chart forms a **special pattern**. It runs on different rules than an ordinary chart, ` +
      `and the real results show up when that pattern is activated.`,
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
      `오늘 **일진 오행 흐름** — 당신에게 도움이 들어오는 ` +
      `날·받쳐주는 날·중립인 날이 매일 다르게 흘러가요. ` +
      `상생 받는 날을 골라 결정하면 자연스러워요.`,
    templateEn:
      `Today's **daily element flow** — days that help your chart, support it, ` +
      `or stay neutral all shift from day to day. Picking a day where the elements support yours ` +
      `makes decisions feel natural.`,
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
      `**{monthGanji}** 월 — 봄 흐름이 당신을 살리는 기운(나무)에 우호적인 시기로 들어가요. ` +
      `새 시작·진출·확장에 좋은 한 달이에요. {monthGanjiText}`,
    templateEn:
      `**{monthGanjiEn}** month — the spring current moves into a stretch that favours the element that supports you (Wood). ` +
      `A great month for new beginnings, stepping out, and expansion. {monthGanjiTextEn}`,
    themes: ['career', 'growth'],
  },
  {
    id: 'wolun-summer-fire',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['화'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `**{monthGanji}** 월 — 여름 흐름이 당신을 살리는 기운(불)에 우호적이에요. ` +
      `자기 표현·대외 활동·인맥 확장이 잘 통하는 한 달이에요. {monthGanjiText}`,
    templateEn:
      `**{monthGanjiEn}** month — the summer current favours the element that supports you (Fire). ` +
      `Self-expression, outward activity, and expanding your network all land well. {monthGanjiTextEn}`,
    themes: ['career', 'growth'],
  },
  {
    id: 'wolun-autumn-metal',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['금'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `**{monthGanji}** 월 — 가을 흐름이 당신을 살리는 기운(금속)에 우호적이에요. ` +
      `결단·정리·결과 만들기에 좋은 한 달이에요. {monthGanjiText}`,
    templateEn:
      `**{monthGanjiEn}** month — the autumn current favours the element that supports you (Metal). ` +
      `A great month for decisions, tidying up, and producing results. {monthGanjiTextEn}`,
    themes: ['career'],
  },
  {
    id: 'wolun-winter-water',
    scope: 'monthly',
    section: 'wolun',
    priority: 72,
    conditions: { yongsin: ['수'], signalSource: 'saju', signalLayer: ['monthly'] },
    template:
      `**{monthGanji}** 월 — 겨울 흐름이 당신을 살리는 기운(물)에 우호적이에요. ` +
      `연구·학습·내실 다지기·계획에 좋은 한 달이에요. {monthGanjiText}`,
    templateEn:
      `**{monthGanjiEn}** month — the winter current favours the element that supports you (Water). ` +
      `A great month for research, learning, building inner depth, and planning. {monthGanjiTextEn}`,
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
      `표현·창작의 별이 켜져 있어요 — 표현·창작·아이디어 발산이 잘 들어오는 결이라 ` +
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
      `돌봄·교육·전수에 우호적인 결이에요.`,
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
      `불 기운이 과한 결에 책임·자리 압박까지 걸리는 흐름이에요. 화상이나 ` +
      `염증, 심혈관, 불면에 유의해야 하는 시기라 매운 음식과 과로를 ` +
      `자제하고, 차가운 물·휴식·녹지 산책으로 식혀주세요.`,
    templateEn:
      `Your Fire energy is excessive and responsibility and standing pressure is layered on top. ` +
      `Watch for burns, inflammation, cardiovascular issues, and insomnia — cut back on spicy food ` +
      `and overwork, and cool yourself with cold water, rest, and walks in greenery.`,
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
      `물 기운이 약하고 차가운 결이 강해지는 흐름이에요. 신장·요통·우울감· ` +
      `하체 냉증에 유의하면서 따뜻한 물을 자주 마시고, 허리와 하체 보온, ` +
      `충분한 수면을 챙겨주세요.`,
    templateEn:
      `Water is weak and the cold grain in your chart strengthens. Watch for kidney issues, lower-back ` +
      `pain, low mood, and a chilly lower body — drink warm water often, keep your back and legs warm, ` +
      `and make sure you get enough sleep.`,
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
    templateEn:
      `Mars comes in as a tension signal. The risk of accidents, injuries, and irritation rises — ` +
      `take it a beat slower with workouts, driving, and sharp tools. Hold off a beat before reacting in anger too.`,
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
    templateEn:
      `Jupiter and Venus come in friendly. The best time for recovery and healing — book the check-ups, ` +
      `dental visits, and surgeries you have been putting off, and a new workout routine will stick well too.`,
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
      `흉살(격동·전환의 별·현침·귀문 등)이 작용하는 시기예요. 갑작스러운 증상이나 ` +
      `소화기, 신경 예민함에 유의하면서 무리한 일정을 줄이고 매운 음식과 ` +
      `자극적인 음료는 피해주세요.`,
    templateEn:
      `Harsh shinsal (the upheaval star, Hyeonchim, Gwimun, and the like) are at work. Watch for sudden symptoms, ` +
      `digestive issues, and a sensitive nervous system — trim back any overloaded schedule and ` +
      `avoid spicy food and stimulating drinks.`,
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
      `**{yearGanji}** 올해 흐름 — 재물의 별이 들어오는 해예요. 돈·실물·실제 ` +
      `결과가 눈에 보이는 흐름이라 작년에 뿌린 씨앗이 현금흐름으로 ` +
      `돌아오기 좋은 시기예요. {yearGanjiText}`,
    templateEn:
      `**{yearGanjiEn}** year — wealth and resources flows in. Money, tangibles, and real-world results ` +
      `become visible — the seeds you planted last year come back as cash flow this year. {yearGanjiTextEn}`,
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
    templateEn:
      `Responsibility and pressure tend to pile up at once this year. Do not carry too much — ` +
      `trim your priorities. In a year like this, rest is the strategy.`,
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
    templateEn:
      `Expression and idea flow run strong this year. New content, creation, and planning all click — ` +
      `dust off your unused social accounts, blog, or portfolio and luck follows along.`,
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
    templateEn:
      `This is a year where you bump into the people walking with you a lot. Peers, partners, and ` +
      `competition all move together — collaboration flows, but agree on money and role splits clearly ` +
      `from the start.`,
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
    templateEn:
      `Your head and notes fill up but moving into action gets weaker this year. Break things into ` +
      `short execution units and make the starting step itself light — that is how it flows.`,
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
    templateEn:
      `A year when strong support flows in. The best time for learning, certifications, and ` +
      `sharpening expertise — actively take in advice from mentors and elders and luck moves with you.`,
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
    templateEn:
      `Money is visible but hard to hold on to this year. Rather than big investments, prioritise ` +
      `steady cash flow and looking after your health. Pushing too hard can bring losses.`,
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
    templateEn:
      `Execution power and cash flow lock into the same gear this year. The best time for big decisions ` +
      `like a small venture, an investment, or organising your assets.`,
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
      `귀한 도움의 별이 작용하는 해예요. 1년에 몇 번 안 오는 우호적인 ` +
      `흐름이라 계약·결혼·이직·창업 같은 중요한 시작을 잡아두면 결과가 ` +
      `잘 풀려요.`,
    templateEn:
      `A benefactor star is at work this year. It is one of those friendly currents that only comes a few ` +
      `times — lock in important beginnings like contracts, marriage, job changes, or starting a venture ` +
      `and the results tend to come through.`,
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
      `강한 의지의 별이 작용하는 해예요. 추진력은 강해지지만 충돌도 ` +
      `함께 늘어나니, 결단은 빠르게 가더라도 사람을 대할 때는 한 박자 ` +
      `천천히 가주세요.`,
    templateEn:
      `The strong-will star is at work this year. Your drive runs stronger but clashes grow alongside it — ` +
      `move fast on decisions but take a beat slower when dealing with people.`,
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
      `이동·변화의 별이나 지살이 작용하는 해예요. 이동·이사·해외·환경 변화가 ` +
      `자연스럽게 따라오니, 한곳에 자리잡으려 애쓰기보다 흐름을 타는 ` +
      `편이 맞아요.`,
    templateEn:
      `The movement star or Jisal is at work this year. Movement, moving house, going abroad, and environment ` +
      `changes follow naturally — rather than forcing yourself to settle in one place, ride the current.`,
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
      `매력·끌림의 별이나 홍염이 작용하는 해예요. 매력·인기·인연 흐름이 강해져서 ` +
      `연애나 인지도, 노출은 잘 풀리지만 가벼운 인연도 함께 늘어나니 ` +
      `선택은 신중하게 가주세요.`,
    templateEn:
      `The charm-and-attraction star or Hongyeom is at work this year. Charm, popularity, and connection energy run strong — ` +
      `love, visibility, and exposure all click, but casual ties pile up too. Be careful with your choices.`,
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
      `격동·전환의 별이나 현침이 작용하는 해예요. 갑작스러운 변화나 사고, 건강 신호에 ` +
      `유의해야 하는 흐름이라 안전·검진·휴식 우선순위를 올리고 위험한 ` +
      `활동은 미루는 편이 안전해요.`,
    templateEn:
      `The upheaval star or Hyeonchim is at work this year. Watch for sudden changes, accidents, and health signals — ` +
      `bump safety, check-ups, and rest higher on your priority list and put off risky activity.`,
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
    templateEn:
      `Mangsin or Jaesal is at work this year. Reputation, legal, and contract disputes come up easily — ` +
      `be careful with social posts, verbal promises, and every line of paperwork. Impulsive words are the ` +
      `biggest risk.`,
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
    templateEn:
      `Cheondeok or Woldeok is at work this year. Someone steps in to block a crisis or a friendly ` +
      `resolution emerges — a great time to try the negotiation, treatment, or relationship repair ` +
      `that has been hard before.`,
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
      `학문의 별이나 학당이 작용하는 해예요. 학업·시험·자격증·연구 흐름이 ` +
      `가장 잘 풀리는 때라, 오래 미뤘던 공부나 자격증 도전을 시작하기에 ` +
      `가장 좋아요.`,
    templateEn:
      `The literary star or Hakdang is at work this year. The currents around study, exams, certifications, and ` +
      `research run best — the best time to start the studying or certification you have been putting off.`,
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
    templateEn:
      `Cheonuiseong is at work this year. Healing, caretaking, medicine, and counselling all flow well — ` +
      `starting the treatment, therapy, or check-up you have been putting off works, and helping others ` +
      `brings luck along too.`,
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
      `당신과 부딪히는 결의 해예요. 큰 변동이나 이별, 정리가 자연스럽게 ` +
      `나오는 시기라 거스르기보다 흐름을 받아들이는 편이 잘 풀려요.`,
    templateEn:
      `A year that clashes with your chart. Big changes, partings, and clearings come naturally — ` +
      `it goes better when you accept the current rather than push against it.`,
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
    templateEn:
      `Responsibility, position, and title flow in this year. The ability you have been building turns ` +
      `into results, and promotions, job changes, and new ventures all settle in well.`,
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
      `보이지 않는 도움이 깃든 해예요. 평소 챙겨주던 사람이나 오래된 인연이 ` +
      `결정적인 순간에 손을 내밀어요. ` +
      `자존심 세우지 말고 필요할 때 도움을 요청하세요.`,
    templateEn:
      `A hidden-support star or a guiding star is at work this year. Unseen help flows in — people you have helped before ` +
      `or old connections show up at decisive moments. Drop the pride and ask for help when you need it.`,
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
    templateEn:
      `A flat year with no big ups or downs. Rather than starting something new, stabilise what you have ` +
      `already begun and stockpile the material for next year's leap.`,
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
      `이 10년은 재물의 별이 들어오는 결이라 결혼·연애·동거 같은 관계 사건이 ` +
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
      `이 10년은 친구·동료·동업 인연이 자주 들어오는 결이에요. 깊은 ` +
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
      `이번 달은 표현·다정함이 자연스러워지는 결이에요. 마음을 전하거나 ` +
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
      `결이라, 어디서든 사람이 잘 따르고 첫인상으로 기억되기 쉬워요.`,
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
      `꾸리는 결이라 관계를 길게 가져가는 데 강점이 있어요.`,
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
      `사업, 자산 운용에 강점이 있어 평생 풍요로운 결이에요.`,
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
      `결이라, 동업·공동투자·팀 단위 수익이 잘 맞아요.`,
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
      `당신에게 불 기운이 강한 결이에요. 평소에 심혈관·염증·불면을 평생 ` +
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
      `당신에게 물 기운이 약하거나 차가운 결이에요. 평생 신장·요통·하체 ` +
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
      `⚡ **건강** — 긴장·스트레스가 간·신경·눈에 먼저 쌓이는 결이에요. ` +
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

/** 룰 매핑 — id로 빠른 조회 */
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]))
