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

  // ═══════════════════════════════════════════════════════════
  // Cross-activation A등급 매핑 — 사주 × 점성 동시 활성 페어 narrative.
  //
  // cross-activation extractor 가 emit 한 'cross-activation' kind 신호를
  // 직접 매칭. 이미 부모 두 신호가 동시 활성일 때만 emit 되므로 conditions
  // 는 signalKinds + planet/sibsin/shinsalName 만으로 충분 (natalStrength·
  // yongsin 제거 → 신호 자체가 페어 활성을 보장). 룰 텍스트는 mapping
  // 데이터의 meaning 보다 더 풍부한 시기적 권유로 작성.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'cross-jeonggwan-saturn',
    scope: 'monthly',
    section: 'transit',
    priority: 84,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['정관'],
      planet: ['Saturn'],
    },
    template:
      `**정관 × 토성 — 책임의 시기가 사주·점성 두 축에서 같은 방향으로 ` +
      `흘러요.** 공식 절차·약속·구조를 다듬을 호기예요. 미뤘던 계약, ` +
      `자격, 직장 내 정식 자리를 단단히 박기에 평소보다 두 배 매끄러워요. ` +
      `흐름은 {duration}.`,
    templateEn:
      `**Right Officer × Saturn — responsibility runs along both axes in the same ` +
      `direction.** A window to tighten formal procedures, commitments, and structure. ` +
      `Deferred contracts, credentials, and locking in your official seat at work flow ` +
      `about twice as smoothly. The current runs for {duration}.`,
    themes: ['career'],
    authorNote: 'cross-activation A등급: 정관 ↔ Saturn (책임·구조)',
  },
  {
    id: 'cross-pyeongwan-mars',
    scope: 'monthly',
    section: 'transit',
    priority: 84,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['편관'],
      planet: ['Mars'],
    },
    template:
      `**편관 × 화성 — 강제·압박·돌발이 사주·점성 두 축에서 동시에 짙어지는 ` +
      `시기.** 결단은 빠르게, 충돌은 한 박자 늦춰서. 칼·차·운동·언쟁에서 ` +
      `평소보다 한 단계 더 조심하세요. 흐름은 {duration}.`,
    templateEn:
      `**Seven Killings × Mars — pressure, force, and sudden moves thicken on both axes.** ` +
      `Decide fast, but slow any clash by a beat. Take one extra notch of care with blades, ` +
      `vehicles, intense exercise, and arguments. The current runs for {duration}.`,
    themes: ['career', 'health'],
    authorNote: 'cross-activation A등급: 편관 ↔ Mars (압박·돌발)',
  },
  {
    id: 'cross-jeongjae-venus',
    scope: 'monthly',
    section: 'transit',
    priority: 82,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['정재'],
      planet: ['Venus'],
    },
    template:
      `**정재 × 금성 — 안정된 가치·관계·자산의 결이 사주·점성 두 축에서 ` +
      `같은 방향으로 살아나요.** 결혼·약속·구매·정착에 우호. 들떠서가 ` +
      `아니라 차분히 결정한 한 가지가 오래 갑니다. 흐름은 {duration}.`,
    templateEn:
      `**Right Wealth × Venus — stable value, relationships, and assets light up on both ` +
      `axes in the same direction.** Favours marriage, formal commitments, purchases, and ` +
      `settling. The one thing you decide calmly (not in a lit-up rush) is what lasts. The ` +
      `current runs for {duration}.`,
    themes: ['money', 'love'],
    authorNote: 'cross-activation A등급: 정재 ↔ Venus (안정·가치)',
  },
  {
    id: 'cross-pyeonjae-mercury',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['편재'],
      planet: ['Mercury'],
    },
    template:
      `**편재 × 수성 — 동산·상업·기회 포착의 결이 두 축에서 빨라지는 시기.** ` +
      `단타·중개·정보 거래·새 거래선 개척에 우호. 단, 손이 빨라진 만큼 ` +
      `놓치는 디테일도 늘어요 — 큰 계약은 두 번 읽고 사인하세요. 흐름은 {duration}.`,
    templateEn:
      `**Indirect Wealth × Mercury — speed and opportunity in moveable assets, trade, and ` +
      `info-flow accelerate on both axes.** Favours quick trades, brokerage, info deals, and ` +
      `opening new pipelines. Just note the same speed leaks details — read big contracts ` +
      `twice before you sign. The current runs for {duration}.`,
    themes: ['money', 'career'],
    authorNote: 'cross-activation A등급: 편재 ↔ Mercury (동산·상업)',
  },
  {
    id: 'cross-siksin-mercury',
    scope: 'monthly',
    section: 'transit',
    priority: 78,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['식신'],
      planet: ['Mercury'],
    },
    template:
      `**식신 × 수성 — 표현·창의·소통이 두 축에서 같은 방향으로 풀리는 시기.** ` +
      `글·말·작품 산출, 발표, 인터뷰, 콘텐츠 만들기에 결결이 좋아요. ` +
      `머릿속 메모를 밖으로 내보내는 일이라면 평소보다 한 발 더. 흐름은 {duration}.`,
    templateEn:
      `**Eating God × Mercury — expression, creativity, and communication flow open on ` +
      `both axes.** Writing, speaking, creative output, presentations, interviews, and ` +
      `content all come together. Anything that moves a head-note out into the world is ` +
      `worth one extra step. The current runs for {duration}.`,
    themes: ['growth', 'career'],
    authorNote: 'cross-activation A등급: 식신 ↔ Mercury (표현·창의)',
  },
  {
    id: 'cross-jeongin-jupiter',
    scope: 'monthly',
    section: 'transit',
    priority: 82,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['정인'],
      planet: ['Jupiter'],
    },
    template:
      `**정인 × 목성 — 학습·확장·정통의 결이 사주·점성 두 축에서 같은 ` +
      `방향으로 흘러요.** 자격·학위·해외·정식 인장(자격증·면허)·정통 ` +
      `공부에 우호. 미뤘던 큰 배움을 시작하기에 이만한 결이 드물어요. ` +
      `흐름은 {duration}.`,
    templateEn:
      `**Right Print × Jupiter — learning, expansion, and orthodoxy run in the same ` +
      `direction on both axes.** Favours credentials, degrees, overseas moves, official ` +
      `licences, and orthodox study. A rare window for starting the big learning you have ` +
      `been deferring. The current runs for {duration}.`,
    themes: ['growth', 'career'],
    authorNote: 'cross-activation A등급: 정인 ↔ Jupiter (학습·확장)',
  },
  {
    id: 'cross-jeongin-moon',
    scope: 'monthly',
    section: 'transit',
    priority: 74,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['정인'],
      planet: ['Moon'],
    },
    template:
      `**정인 × 달 — 수용·돌봄·어머니의 결이 두 축에서 두 배.** 휴식·치유· ` +
      `가족 챙기기, 잠자리·식사·집안 정돈에 우호. 외부를 향해 더 벌리지 ` +
      `말고, 안쪽을 채우는 일에 시간을 주세요. 흐름은 {duration}.`,
    templateEn:
      `**Right Print × Moon — reception, care, and the maternal note doubled on both axes.** ` +
      `Favours rest, healing, family, sleep, meals, and tending the home. Do not spin up ` +
      `more outward — give time to filling the inside. The current runs for {duration}.`,
    themes: ['health', 'love'],
    authorNote: 'cross-activation A등급: 정인 ↔ Moon (수용·어머니)',
  },
  {
    id: 'cross-bigeon-sun',
    scope: 'monthly',
    section: 'transit',
    priority: 76,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      sibsin: ['비견'],
      planet: ['Sun'],
    },
    template:
      `**비견 × 태양 — 자아·주체성·동료의 결이 두 축에서 살아나는 시기.** ` +
      `본인 이름으로 나서기, 동업·협업·새 팀 합류, 자기 브랜드 만들기에 ` +
      `우호. 단, 같은 결의 사람들과의 경쟁이 동시에 짙어지니 차별점 한 ` +
      `가지는 분명히. 흐름은 {duration}.`,
    templateEn:
      `**Friend × Sun — self, agency, and peer presence light up on both axes.** A window ` +
      `for stepping out under your own name, joining a partnership, a new team, or building ` +
      `a personal brand. Just note competition with similar peers thickens at the same time — ` +
      `keep one differentiator crisp. The current runs for {duration}.`,
    themes: ['career', 'growth'],
    authorNote: 'cross-activation A등급: 비견 ↔ Sun (자아·주체)',
  },
  {
    id: 'cross-dohwa-venus',
    scope: 'monthly',
    section: 'shinsal',
    priority: 80,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      shinsalName: ['도화', '도화살'],
      planet: ['Venus'],
    },
    template:
      `**도화살 × 금성 — 관계·매력·인기 결이 두 축에서 동시에 살아남.** ` +
      `사교·연애·미적 활동·자기 표현에 우호. 끌리는 결이 평소보다 강하니 ` +
      `한 박자 즐기되, 큰 약속(이사·계약)은 다음 달까지 미루는 게 안전. ` +
      `흐름은 {duration}.`,
    templateEn:
      `**Peach-Blossom × Venus — connection, charm, and popularity light up together on ` +
      `both axes.** Favours socials, romance, aesthetic work, and self-presentation. The ` +
      `pull runs hotter than usual — enjoy a beat, but defer big commitments (moving, ` +
      `contracts) to next month for safety. The current runs for {duration}.`,
    themes: ['love', 'growth'],
    authorNote: 'cross-activation A등급: 도화 ↔ Venus (관계·매력)',
  },
  {
    id: 'cross-yeokma-mercury',
    scope: 'monthly',
    section: 'shinsal',
    priority: 76,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      shinsalName: ['역마', '역마살'],
      planet: ['Mercury'],
    },
    template:
      `**역마살 × 수성 — 이동·소통·정보의 결이 두 축에서 두 배.** 출장·여행· ` +
      `교섭·매체 활용·새 도시 답사에 우호. 손에 잡히는 만큼 잡고, 지나친 ` +
      `약속은 다음 도시에서 후회로 돌아와요. 흐름은 {duration}.`,
    templateEn:
      `**Travelling Horse × Mercury — movement, messages, and info-flow doubled on both ` +
      `axes.** Favours travel, negotiation, media work, and scouting a new city. Take what ` +
      `you can actually hold — over-promising returns as regret in the next stop. The ` +
      `current runs for {duration}.`,
    themes: ['career', 'growth'],
    authorNote: 'cross-activation A등급: 역마 ↔ Mercury (이동·소통)',
  },
  {
    id: 'cross-yangin-mars',
    scope: 'monthly',
    section: 'shinsal',
    priority: 80,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      shinsalName: ['양인'],
      planet: ['Mars'],
    },
    template:
      `**양인살 × 화성 — 직진·과열·돌발이 두 축에서 한 시기에 몰리는 결.** ` +
      `칼·차·운동·언쟁·강한 발화에서 평소보다 두 단계 조심. 결단력은 ` +
      `필요한 자리에서만 쓰고, 모서리는 한 박자 늦춰 돌아가세요. 흐름은 ` +
      `{duration}.`,
    templateEn:
      `**Yang-Blade × Mars — straight-line drive, over-heat, and sudden moves pile up on ` +
      `both axes.** Take two extra notches of care with blades, vehicles, intense workouts, ` +
      `arguments, and harsh words. Spend decisiveness where it is actually needed, and ` +
      `round any sharp corner one beat slower. The current runs for {duration}.`,
    themes: ['health', 'career'],
    authorNote: 'cross-activation A등급: 양인 ↔ Mars (직진·과열)',
  },
  {
    id: 'cross-geonrok-jupiter',
    scope: 'monthly',
    section: 'transit',
    priority: 80,
    conditions: {
      signalSource: 'saju',
      signalKinds: ['cross-activation'],
      shinsalName: ['건록'],
      planet: ['Jupiter'],
    },
    template:
      `**건록 × 목성 — 실력·인정·확장이 두 축에서 같은 방향으로 흘러요.** ` +
      `자기 자리를 잡고 키우기에 최적. 미뤘던 승진 신청, 정식 자리 ` +
      `요청, 자기 브랜드 본격 가동에 평소보다 한 단계 더 매끄러워요. ` +
      `흐름은 {duration}.`,
    templateEn:
      `**Established Stipend × Jupiter — competence, recognition, and expansion run ` +
      `together on both axes.** The best window for claiming your own seat and growing ` +
      `it. Deferred promotion requests, asking for the formal title, and seriously ` +
      `running your own brand all flow one notch smoother. The current runs for {duration}.`,
    themes: ['career', 'money'],
    authorNote: 'cross-activation A등급: 건록 ↔ Jupiter (실력·인정)',
  },
]
