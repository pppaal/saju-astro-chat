import type { InterpretationRule } from '../types'

export const RULES_WOLUN: InterpretationRule[] = [
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

]
