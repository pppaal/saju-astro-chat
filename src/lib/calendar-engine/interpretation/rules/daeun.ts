import type { InterpretationRule } from '../types'

export const RULES_DAEUN: InterpretationRule[] = [
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

]
