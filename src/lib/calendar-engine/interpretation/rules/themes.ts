import type { InterpretationRule } from '../types'

export const RULES_THEMES: InterpretationRule[] = [
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

]
