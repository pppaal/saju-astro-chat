import type { InterpretationRule } from '../types'

export const RULES_SEUN: InterpretationRule[] = [
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

]
