import type { InterpretationRule } from '../types'

export const RULES_PATTERNS: InterpretationRule[] = [
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

]
