import type { InterpretationRule } from '../types'

export const RULES_ASTRO: InterpretationRule[] = [
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

]
