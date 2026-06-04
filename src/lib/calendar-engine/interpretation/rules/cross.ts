import type { InterpretationRule } from '../types'

export const RULES_CROSS: InterpretationRule[] = [
  // ═══════════════════════════════════════════════════════════
  // Cross-axis (사주 본명 × 점성 transit) narrative.
  //
  // 사주 본명 컨텍스트(natalStrength / yongsin)와 점성 트랜짓 신호를 같은
  // conditions 블록에 결합. 매처는 natal 조건을 먼저 검사하고, 그 다음 astro
  // 신호 매칭 — 두 축이 동시에 발동했을 때만 fire. 그래서 같은 토성 트랜짓
  // 이라도 신약·신강 사용자에게 다른 톤이 나가요.
  //
  // 스키마 한계 메모: signalMatches 는 단일 신호에 대한 조건 매칭이라
  // sibsin 과 planet 을 한 조건 블록에서 동시 요구할 수 없음 (한 신호는
  // saju 또는 astro 중 하나만). 그래서 "Mercury × 식상 강" 같은 크로스는
  // natalStrength × planet 형태로 대체. yongsin × planet 은 정상 동작.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'cross-saturn-weak',
    scope: 'monthly',
    section: 'transit',
    priority: 80,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Saturn'],
    },
    template:
      `**신약 일간에 토성 트랜짓**이 겹치는 시기 — 책임·기대·공식 절차의 ` +
      `무게가 평소보다 두 배로 얹혀요. 다 끌어안으려다 체력부터 깎이기 ` +
      `쉬우니, 가장 중요한 한 줄만 남기고 나머지는 미루거나 거절하세요. ` +
      `흐름은 {duration}.`,
    templateEn:
      `**Saturn transit landing on a weak day master** — responsibility, expectation, ` +
      `and official paperwork weigh about twice as much as usual. Trying to carry it all ` +
      `drains your body first, so keep only the single most important line and defer or ` +
      `decline the rest. The current runs for {duration}.`,
    themes: ['career', 'health'],
    authorNote: 'cross-axis: 신약 + 토성 트랜짓 → 책임 압력 가중',
  },
  {
    id: 'cross-saturn-strong',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Saturn'],
    },
    template:
      `**신강 일간에 토성 트랜짓**이 겹치는 시기 — 강한 추진력에 구조와 ` +
      `절제가 더해지는 흐름이에요. 평소 벌려놓기만 하던 일을 정리하고, ` +
      `루틴·시스템·장기 계약을 단단히 만들기 가장 좋은 때. 토성이 무거운 ` +
      `게 아니라 당신을 다듬어주는 시기예요. 흐름은 {duration}.`,
    templateEn:
      `**Saturn transit landing on a strong day master** — discipline and structure ` +
      `arrive to season your already-strong drive. The best window for closing out things ` +
      `you have been spreading thin and locking in routines, systems, and long-term ` +
      `commitments. Saturn is not weighing you down; it is shaping you. The current runs for {duration}.`,
    themes: ['career', 'growth'],
    authorNote: 'cross-axis: 신강 + 토성 트랜짓 → 정리·구조화의 시기',
  },
  {
    id: 'cross-saturn-yongsin-earth',
    scope: 'monthly',
    section: 'transit',
    priority: 76,
    conditions: {
      yongsin: ['토'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Saturn'],
    },
    template:
      `**용신이 토(土)인 당신에게 토성이 들어오는 시기** — 토성이 당신의 ` +
      `용신을 단련하는 흐름이에요. 안정·중재·축적의 결이 외부 환경에서도 ` +
      `함께 강화되니, 자리 잡기·계약·자산·관계의 뿌리를 다지는 일이 ` +
      `평소보다 깊게 박혀요. 흐름은 {duration}.`,
    templateEn:
      `**Saturn transit on an Earth-yongsin chart** — Saturn is tempering your core ` +
      `element. Stability, mediation, and accumulation get reinforced by the outside ` +
      `environment too, so settling in, signing, building assets, and rooting relationships ` +
      `take hold more deeply than usual. The current runs for {duration}.`,
    themes: ['career', 'money'],
    authorNote: 'cross-axis: 토 용신 + 토성 트랜짓 → 용신 단련',
  },
  {
    id: 'cross-jupiter-yongsin-wood',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      yongsin: ['목'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Jupiter'],
    },
    template:
      `**용신이 목(木)인 당신에게 목성 트랜짓**이 들어오는 시기 — 당신을 ` +
      `살리는 핵심 기운과 확장의 별이 같은 방향으로 흘러요. 새 시도·해외· ` +
      `학습·창업·진로 확장이 평소보다 두 배 매끄럽게 풀리는 호기. ` +
      `미뤘던 큰 한 발을 떼기에 이만한 때가 드물어요. 흐름은 {duration}.`,
    templateEn:
      `**Jupiter transit on a Wood-yongsin chart** — your core nourishing element and the ` +
      `planet of expansion run in the same direction. New attempts, overseas moves, learning, ` +
      `launching something, or expanding your path flow about twice as smoothly as usual. ` +
      `A rare window for taking the big step you have been deferring. The current runs for {duration}.`,
    themes: ['growth', 'career', 'money'],
    authorNote: 'cross-axis: 목 용신 + 목성 트랜짓 → 용신 강화·확장 호기',
  },
  {
    id: 'cross-jupiter-yongsin-metal',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: {
      yongsin: ['금'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Jupiter'],
    },
    template:
      `**용신이 금(金)인 당신에게 목성 트랜짓** — 결단·정리가 핵심인 당신 ` +
      `사주에 확장 에너지가 들어오는 시기예요. 기회는 많이 보여도 다 잡으면 ` +
      `초점이 흩어지기 쉬워요. '벌리기'보다 '쳐내기'에 무게를 두고, 한 가지에 ` +
      `집중해서 키워야 진짜 결과로 남아요. 흐름은 {duration}.`,
    templateEn:
      `**Jupiter transit on a Metal-yongsin chart** — expansion energy lands on a chart ` +
      `whose core is decisiveness and pruning. Lots of opportunities will appear, but ` +
      `grabbing them all scatters focus. Lean toward cutting back rather than spreading out — ` +
      `concentrate on one thing and let it grow. The current runs for {duration}.`,
    themes: ['growth', 'career'],
    authorNote: 'cross-axis: 금 용신 + 목성 트랜짓 → 과잉 확장 주의',
  },
  {
    id: 'cross-mars-yongsin-fire',
    scope: 'monthly',
    section: 'transit',
    priority: 76,
    conditions: {
      yongsin: ['화'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Mars'],
    },
    template:
      `**용신이 화(火)인 당신에게 화성 트랜짓** — 가라앉아 있던 추진력과 ` +
      `열정이 다시 살아나는 시기예요. 미뤘던 결단·발표·운동·도전이 손에 ` +
      `붙고, 표현하는 일이 평소보다 시원하게 터져요. 단, 분노만은 한 박자 ` +
      `늦춰 표현하세요. 흐름은 {duration}.`,
    templateEn:
      `**Mars transit on a Fire-yongsin chart** — drive and warmth that had dimmed ` +
      `come back online. Decisions, presentations, exercise, and challenges you put off ` +
      `click into your hands, and self-expression bursts out more freely than usual. ` +
      `Just give anger a beat before you let it speak. The current runs for {duration}.`,
    themes: ['career', 'growth', 'health'],
    authorNote: 'cross-axis: 화 용신 + 화성 트랜짓 → 추진력 회복',
  },
  {
    id: 'cross-mars-yongsin-water',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: {
      yongsin: ['수'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Mars'],
    },
    template:
      `**용신이 수(水)인 당신에게 화성 트랜짓** — 본래 깊고 차분한 결에 ` +
      `갑작스러운 열기와 충동이 끼어드는 시기예요. 욱해서 던진 말, 즉흥 ` +
      `계약, 무리한 운동이 그 어느 때보다 후회로 돌아오기 쉬우니, 결정과 ` +
      `발화 사이에 24시간을 두세요. 흐름은 {duration}.`,
    templateEn:
      `**Mars transit on a Water-yongsin chart** — sudden heat and impulse cut into a ` +
      `chart whose natural register is deep and calm. Words snapped in anger, on-the-spot ` +
      `contracts, and pushed-too-hard workouts come back as regret more easily than usual — ` +
      `put a 24-hour gap between deciding and speaking. The current runs for {duration}.`,
    themes: ['health', 'love'],
    authorNote: 'cross-axis: 수 용신 + 화성 트랜짓 → 충동·열기 과잉',
  },
  {
    id: 'cross-mercury-weak',
    scope: 'monthly',
    section: 'transit',
    priority: 68,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Mercury'],
    },
    template:
      `**신약 일간에 수성 트랜짓** — 정보·연락·문서가 한꺼번에 몰리는 ` +
      `시기예요. 받는 만큼 다 처리하려 하면 머리가 먼저 지쳐요. 들어오는 ` +
      `메시지의 절반은 '나중에 답해도 되는 것'이라고 가정하고 우선순위를 ` +
      `좁히세요. 흐름은 {duration}.`,
    templateEn:
      `**Mercury transit on a weak day master** — information, messages, and paperwork ` +
      `pile up all at once. Try to process everything that comes in and your head burns ` +
      `out first. Assume half of what lands can wait until later, and narrow your priorities. ` +
      `The current runs for {duration}.`,
    themes: ['career', 'health'],
    authorNote: 'cross-axis: 신약 + 수성 트랜짓 → 정보·생각 과부하 (Mercury×식상 대체)',
  },
  {
    id: 'cross-mercury-strong',
    scope: 'monthly',
    section: 'transit',
    priority: 68,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Mercury'],
    },
    template:
      `**신강 일간에 수성 트랜짓** — 협상·서류·논리 게임에서 평소보다 한 ` +
      `수 앞이 보이는 시기예요. 계약 검토, 면담, 발표, 글쓰기에서 당신 ` +
      `톤이 잘 박혀요. 너무 밀어붙이면 상대를 압도해 관계가 상하니, ` +
      `이긴 자리에서 한 발 물러나는 여유가 효과를 키워요. 흐름은 {duration}.`,
    templateEn:
      `**Mercury transit on a strong day master** — you can see a move ahead in ` +
      `negotiations, paperwork, and any logic game. Contract review, interviews, ` +
      `presentations, and writing all carry your tone well. Push too hard and you ` +
      `overwhelm the other side and the relationship pays — stepping back from a position ` +
      `already won amplifies the result. The current runs for {duration}.`,
    themes: ['career', 'money'],
    authorNote: 'cross-axis: 신강 + 수성 트랜짓 → 협상·서류 우위 (Mercury×관성 대체)',
  },
  {
    id: 'cross-venus-strong',
    scope: 'monthly',
    section: 'transit',
    priority: 70,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Venus'],
    },
    template:
      `**신강 일간에 금성 트랜짓** — 사교·연애·미적 감각·소비 욕구가 ` +
      `한꺼번에 살아나는 시기예요. 자신을 드러내는 일, 옷·공간·관계 ` +
      `정리, 새 만남에 우호적. 단, 들떠서 결정한 큰 지출은 다음 달까지 ` +
      `못 가는 경우가 잦아요. 흐름은 {duration}.`,
    templateEn:
      `**Venus transit on a strong day master** — your social side, romance, aesthetic ` +
      `sense, and the urge to spend all light up together. Favourable for putting yourself ` +
      `forward, refreshing clothes/space/relationships, and new meetings. Just note that ` +
      `big purchases decided in that lit-up state often do not survive into next month. ` +
      `The current runs for {duration}.`,
    themes: ['love', 'money', 'growth'],
    authorNote: 'cross-axis: 신강 + 금성 트랜짓 → 사교·연애·미 활성 (Venus×재성 대체)',
  },
  {
    id: 'cross-venus-weak',
    scope: 'monthly',
    section: 'transit',
    priority: 68,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Venus'],
    },
    template:
      `**신약 일간에 금성 트랜짓** — 관계를 새로 벌이기보다 이미 가진 ` +
      `인연·취향·공간을 정성껏 돌보기 좋은 시기예요. 미뤘던 통화, ` +
      `오래된 사람과의 식사, 집을 한 칸 더 예쁘게 만드는 작은 작업에서 ` +
      `평소보다 큰 위안이 돌아와요. 흐름은 {duration}.`,
    templateEn:
      `**Venus transit on a weak day master** — better for tending the connections, ` +
      `tastes, and spaces you already have than for spinning up new ones. The call you ` +
      `put off, a meal with someone from way back, and small touches that make a room ` +
      `prettier all return more comfort than usual. The current runs for {duration}.`,
    themes: ['love', 'health'],
    authorNote: 'cross-axis: 신약 + 금성 트랜짓 → 관계 회복·미적 휴식 (Venus×인성 대체)',
  },
  {
    id: 'cross-pluto-weak',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      natalStrength: ['weak'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Pluto'],
    },
    template:
      `**신약 일간에 명왕성 트랜짓** — 변환의 압력이 평소보다 한 단계 ` +
      `깊게 들어오는 시기예요. 정체성·핵심 관계·일의 의미가 뿌리부터 ` +
      `흔들릴 수 있어요. 다 바꾸려 하지 말고, 진짜 끝난 한 곳만 ` +
      `정직하게 놓아주세요. 회복엔 충분한 잠과 사람 적게 만나는 시간이 ` +
      `약이에요. 흐름은 {duration}.`,
    templateEn:
      `**Pluto transit on a weak day master** — the pressure of transformation lands a ` +
      `notch deeper than usual. Identity, core relationships, and the meaning of your ` +
      `work can shake at the root. Do not try to rebuild everything — honestly release ` +
      `the one thing that is genuinely over. Sleep and time around fewer people are the ` +
      `medicine for recovery. The current runs for {duration}.`,
    themes: ['health', 'growth'],
    authorNote: 'cross-axis: 신약 + 명왕성 트랜짓 → 변환 압력 가중',
  },
  {
    id: 'cross-uranus-strong',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: {
      natalStrength: ['strong'],
      signalSource: 'astro',
      signalKinds: ['transit'],
      planet: ['Uranus'],
    },
    template:
      `**신강 일간에 천왕성 트랜짓** — 외부에서 떠밀려 깨지는 게 아니라 ` +
      `당신이 먼저 깨고 나가는 자기 주도 변혁의 호기예요. 오래 답답했던 ` +
      `한 구조(직장·관계·생활 패턴)를 정면으로 바꿔보세요. 강한 기운에 ` +
      `천왕성의 추진력까지 얹히는 시기 — 이때 안 하면 다시 12년이에요. ` +
      `흐름은 {duration}.`,
    templateEn:
      `**Uranus transit on a strong day master** — not change forced on you from outside, ` +
      `but a self-led break-out window. Confront one structure (job, relationship, ` +
      `life pattern) that has felt stuck for a long time and change it head-on. Your ` +
      `already-strong energy plus Uranus's push lands here — miss it and it is another ` +
      `12 years. The current runs for {duration}.`,
    themes: ['growth', 'career'],
    authorNote: 'cross-axis: 신강 + 천왕성 트랜짓 → 자기 주도 변혁 호기',
  },
]
