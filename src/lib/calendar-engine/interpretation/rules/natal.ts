import type { InterpretationRule } from '../types'

export const RULES_NATAL: InterpretationRule[] = [
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

]
