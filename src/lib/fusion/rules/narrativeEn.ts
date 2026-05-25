// English narratives for cross-rule confirm/conflict fragments, keyed by rule id.
//
// The rule definitions themselves carry only Korean narrative (written as
// "기술적 근거 — 실제 의미"). The free report's domain builders surface the top
// confirm/conflict per domain; for the English report we look up a clean,
// evidence-free English sentence here by rule id. Kept in one file so the rule
// definitions stay untouched and EN copy is editable in a single place.
//
// Only rules that can surface in the report (non-timing layer, domains
// money/career/love/family/health) need an entry. `conflict` is only needed
// for rules whose Korean narrative also defines a conflict line.

export interface RuleNarrativeEn {
  confirm: string
  conflict?: string
}

export const RULE_NARRATIVE_EN: Record<string, RuleNarrativeEn> = {
  // ── money ──────────────────────────────────────────────
  'money.state.earth-anchor': { confirm: 'a steady, slow-building kind of financial stability.' },
  'money.state.wealth-emphasis': {
    confirm: 'the money domain stays active across your whole life.',
  },
  'money.relation.gain-flow': { confirm: 'resources and wealth tend to flow in naturally.' },
  'money.state.fortune-lot': {
    confirm: 'a lifelong place for wealth is clearly drawn in your chart.',
  },
  'money.state.classical-siksin-saengjae': {
    confirm: 'expression and creation convert directly into wealth for you.',
  },
  'money.state.classical-jongjae': {
    confirm:
      'a special pattern with wealth and assets at the center of life — it opens up most in seasons of money.',
  },
  'money.state.steady-accumulator': {
    confirm: 'a slow, steady wealth pattern — long accumulation suits you more than short swings.',
  },
  'money.state.dynamic-mover': {
    confirm:
      'you move through big swings, outside assets, investment and brokerage — seizing opportunity suits you more than conservative holding.',
    conflict: 'balancing investment boldness with safe assets is a lifelong task.',
  },
  'money.state.expression-to-wealth': {
    confirm: 'your expression, creation and talent convert directly into wealth.',
  },
  'money.state.inherited-resources': {
    confirm: 'assets or a foundation passed down from family are one axis of your life.',
  },
  'money.state.partnership-wealth': {
    confirm: 'building assets through partnership, marriage or alliance is your grain.',
  },
  'money.state.outflow-pattern': {
    confirm: 'as much comes in, as much goes out — a spending-control system matters for life.',
  },
  'money.state.hidden-wealth': {
    confirm:
      'latent assets and opportunities not visible on the surface are built into your life, to be found and used at the right time.',
  },
  'money.state.creative-wealth': {
    confirm: 'assets formed through creation, copyright and content are your grain.',
  },

  // ── career ─────────────────────────────────────────────
  'career.state.metal-discipline': {
    confirm:
      'analysis, decisiveness and refinement — strong potential for results in areas of responsibility.',
  },
  'career.state.officer-emphasis': {
    confirm: 'achievement within a structure of responsibility is your natural grain.',
  },
  'career.relation.authority-friction': {
    confirm: 'friction with authority and systems is structurally embedded for you.',
  },
  'career.state.yeokma-mercury-emphasis': {
    confirm: 'movement, travel and adapting to change are your strengths.',
  },
  'career.state.geokguk-formal-vs-mc': { confirm: 'an established, orthodox path is your road.' },
  'career.state.stellium-tenth-vs-officer': {
    confirm: 'career and public role are a central stage of your life.',
  },
  'career.state.classical-bugwi-ssang': {
    confirm: 'honor and wealth can coexist as a lifelong pattern.',
  },
  'career.state.classical-gwanin': {
    confirm: 'learning and honor connect naturally for you, as a lifelong pattern.',
  },
  'career.state.classical-sarin': {
    confirm: 'a power pattern that handles great pressure with wisdom.',
  },
  'career.state.classical-yangin-hapsal': {
    confirm: 'a lifelong pattern for decisive, authority-wielding work.',
  },
  'career.state.spirit-lot-vocation': {
    confirm: 'your lifelong vocation and calling point the same direction in both systems.',
  },
  'career.state.classical-jongah': {
    confirm: 'a special pattern with creation, expression and children at its lifelong center.',
  },
  'career.state.classical-jongsal': {
    confirm:
      'a special pattern in power, office and heavy responsibility — it opens up most in seasons of duty.',
  },
  'career.state.classical-yangin-hapsal-fine': {
    confirm:
      'a lifelong pattern that stands out in decisive, authority-driven fields — thriving more in power and structure than in conventional employment.',
  },
  'career.state.archetype.public-servant': {
    confirm:
      'a lifelong aptitude for public service, administration and management — steady within an orthodox hierarchy.',
  },
  'career.state.archetype.judiciary': {
    confirm: 'a lifelong pattern for law, justice and adjudication.',
  },
  'career.state.archetype.military': {
    confirm: 'an aptitude for decisive action and physical fields — surgery, military, police.',
  },
  'career.state.archetype.researcher': {
    confirm: 'a lifelong pattern for study, research and education.',
  },
  'career.state.archetype.creator': {
    confirm: 'a lifelong aptitude for creation, content and the arts.',
  },
  'career.state.archetype.merchant': {
    confirm: 'you work best in fields of movement, exchange and distribution.',
  },
  'career.state.archetype.entrepreneur': {
    confirm: 'independence, self-employment and founding things is your grain.',
  },
  'career.state.archetype.caregiver': { confirm: 'a grain for medicine, nursing and care.' },
  'career.state.archetype.communicator': {
    confirm: 'a lifelong grain for media, education and conveying ideas.',
  },
  'career.state.archetype.spiritual': {
    confirm: 'a grain for spirituality, religion and healing.',
  },
  'career.state.archetype.finance': {
    confirm: 'a grain for finance, accounting and asset management.',
  },
  'career.state.archetype.analyst': { confirm: 'a grain for analysis, logic and technical work.' },
  'career.state.archetype.performer': {
    confirm: 'a grain for entertainment, the stage and self-expression.',
  },
  'career.state.archetype.reformer': {
    confirm: 'a grain for transformation, psychotherapy, research and depth work.',
    conflict: 'a split between going deep and keeping surface stability.',
  },
  'career.state.yangin-hapsal-military': {
    confirm:
      'a precise pattern for decisive, physical fields — military, surgery, combat, firefighting, rescue.',
  },
  'career.state.yangin-hapsal-political': {
    confirm: 'a precise pattern for politics, high power, CEO roles and decisive leadership.',
  },
  'career.state.yangin-hapsal-judicial': {
    confirm:
      'a field of wielding decisive force within orthodoxy — law, prosecution, adjudication, enforcement.',
  },
  'career.state.siksin-jesal-active-leader': {
    confirm:
      'a grain that handles pressure through active expression — content, media, sports coaching, teaching.',
  },
  'career.state.benefactor-support': {
    confirm:
      'in decisive moments, help from mentors and benefactors tends to arrive — your path opens most when you accept support rather than carrying everything alone.',
  },

  // ── love ───────────────────────────────────────────────
  'love.state.spouse-palace-emphasis': {
    confirm: 'relationships are a central theme of your whole life.',
  },
  'love.relation.partner-conflict': {
    confirm: 'a structural friction point sits embedded within your relationships.',
  },
  'love.relation.bond-formation': { confirm: 'forming bonds and union comes naturally to you.' },
  'love.state.dohwa-venus-emphasis': {
    confirm: 'charm, popularity and ease in starting relationships are part of your nature.',
  },
  'love.state.stellium-seventh-vs-spouse': {
    confirm: 'relationships are the main theme of your life.',
  },
  'love.state.spouse-presence': { confirm: 'your partnership is a central stage of your life.' },
  // id-prefixed family.* but tagged to the love domain
  'family.state.gongmang-spouse': {
    confirm:
      'an "elusive" quality in the relationship domain — meeting late, or a more spiritual, idealized kind of union.',
    conflict: 'outward relationships look active while inner security stays hard to grasp.',
  },
  'love.state.spouse-element-match': {
    confirm: 'a partner who supports you is built into your whole life.',
  },
  'love.state.early-marriage': {
    confirm: 'a pattern where stable union is possible relatively early.',
  },
  'love.state.late-marriage': {
    confirm: 'union comes later, or asks for a conscious choice of timing — but it carries depth.',
    conflict: 'outer and inner expectations about when to marry can collide.',
  },
  'love.state.romantic-magnetism': {
    confirm: 'a strong lifelong magnetism in relationships — and you tend to hold the choice.',
  },
  'love.state.partnership-orientation': {
    confirm:
      'you prefer to build as a pair — synergy with a partner is your grain more than going solo.',
  },
  'love.state.independence-in-love': {
    confirm:
      'even in deep relationships, keeping a zone of independence and freedom matters to you.',
    conflict: 'calibrating closeness and distance is a lifelong task.',
  },
  'love.state.idealization-pattern': {
    confirm:
      'a pattern of idealizing the other — deep love is possible, but seeing reality comes late.',
    conflict:
      'the deeper the fantasy, the bigger the letdown — inspiration and self-deception, both sides.',
  },
  'love.state.power-dynamics': {
    confirm: 'deep, intense relationships — themes of power, dependence and renewal run lifelong.',
    conflict: 'if one side overwhelms, separation; if balanced, depth.',
  },
  'love.state.communication-bond': {
    confirm: 'deep bonds built through conversation and understanding are your grain.',
  },
  'love.state.graced-affection': {
    confirm:
      'benefics support your Venus and lucky stars back you up — grace and help flow naturally into your relationships; being blessed with good people is one of your life assets.',
  },

  // ── family ─────────────────────────────────────────────
  'family.state.parental-palace': {
    confirm: 'home and roots weigh heavily in your sense of identity.',
  },
  'family.state.children-palace': {
    confirm: 'children and creative expression form one axis of your life.',
  },
  'family.state.scholar-emphasis': {
    confirm: 'learning, tradition and protection are lifelong resources for you.',
  },
  'family.relation.root-tension': {
    confirm: 'a structural tension lies latent in your family-of-origin and emotional base.',
  },
  'family.relation.flow': {
    confirm: 'emotional and domestic resources circulate well for you.',
  },
  'family.state.fourth-house-stellium': {
    confirm: 'home and your emotional foundation sit at the center of your life.',
  },
  'family.state.maternal-influence': {
    confirm:
      'the influence of your mother, or a mother-like protector, runs deep through your life.',
  },
  'family.state.classical-jonggang': {
    confirm: 'a special pattern that thrives through learning, authority and orthodox paths.',
  },
  'family.state.strong-mother-line': {
    confirm:
      'emotional support, resources and protection from your mother or maternal line are the base of your lifelong grain.',
  },
  'family.state.strong-father-line': {
    confirm:
      'authority, backing and structure from your father or paternal line are the base of your grain.',
  },
  'family.state.early-independence': {
    confirm: 'a pattern of leaving home early or creating emotional distance.',
    conflict: 'balancing distance and responsibility is a lifelong task.',
  },
  'family.state.children-emphasis': {
    confirm: 'children, the next generation and creation form a clear axis of your life.',
  },
  'family.state.delayed-children': {
    confirm:
      'having children comes later or as a conscious choice — but the depth of parenting runs deep.',
    conflict: 'timing and circumstance can fall out of step with your own readiness.',
  },
  'family.state.sibling-rivalry': {
    confirm:
      'a latent lifelong pattern of competition with siblings or peers — conscious distance helps.',
  },
  'family.state.elder-care': {
    confirm:
      'caring for parents or elders enters as one axis of life — reward and burden together.',
    conflict:
      'the deeper the responsibility, the more securing your own time becomes the key task.',
  },
  'family.state.adopted-or-step': {
    confirm:
      'a possibility of non-typical family structures — adoption, remarriage, cohabitation, separation — many forms of union.',
    conflict: 'the more you define it yourself, the deeper the stability.',
  },
  'family.state.home-builder': {
    confirm: 'a grain for building home and foundation steadily — settling down is your way.',
  },
  'family.state.ancestral-heritage': {
    confirm:
      'heritage, tradition and ancestry form a lasting foundation for who you are — the more you honor your roots, the steadier you stand.',
  },

  // ── health ─────────────────────────────────────────────
  'health.state.balanced-elements': {
    confirm: 'a well-balanced constitution gives you good resilience and recovery.',
  },
  'health.state.fire-water-imbalance': {
    confirm: 'balancing heat-cold and immunity asks for conscious care.',
  },
  'health.state.weak-vitality': {
    confirm:
      'your reserves of stamina and quick energy run shallow — rest and recovery routines matter for life.',
  },
  'health.state.digestive-emphasis': {
    confirm:
      'digestion, metabolism and daily routine are the key to your health — managed well, they become an asset.',
    conflict: 'your activity and recovery levels can fall out of sync.',
  },
  'health.state.wood-fire-liver-heat': {
    confirm:
      'an Eastern-medicine pattern of liver-heat, headaches and pent-up anger stays latent for life — emotional release and rest matter.',
  },
  'health.state.fire-earth-skin-heat': {
    confirm:
      'an Eastern-medicine pattern of skin and digestive load; when self-expression flows well, outward release brings balance.',
    conflict: 'balancing the outward and the inward is the key to your health.',
  },
  'health.state.earth-water-digestive': {
    confirm:
      'an Eastern-medicine pattern of weakened digestion — warm food and regular meals matter for life.',
  },
  'health.state.metal-fire-respiratory': {
    confirm:
      'an Eastern-medicine pattern of lung-heat and respiratory load — breathing exercise and clean air matter.',
  },
  'health.state.water-earth-kidney': {
    confirm:
      'an Eastern-medicine pattern of kidney, bladder and bone load — hydration, rest and warmth come first.',
  },
  'health.state.chronic-foundation': {
    confirm:
      'a lifelong undercurrent in chronic conditions — long-term management and prevention matter more than quick fixes.',
  },
  'health.state.psychosomatic': {
    confirm:
      'emotion and the unconscious affect your body directly — caring for the mind is caring for the body.',
    conflict: 'stress goes to the body, or the body’s state sways the emotions.',
  },
  'health.state.wood-metal-tension': {
    confirm:
      'muscles, nerves and the liver-gallbladder line tend to stiffen under pressure — stretching and unwinding routines are lifelong medicine.',
  },
  'health.state.earth-wood-stomach': {
    confirm:
      'stress tends to land in the stomach — eating slowly and keeping the mind light is the key.',
  },
  'health.state.excess-vitality': {
    confirm:
      'a high-energy constitution — used well it is vigorous, but overwork, inflammation and burnout are lifelong watch-points.',
    conflict:
      'balancing surplus drive with real rest is a lifelong task — learning to stop is what keeps the body going long.',
  },

  // ── children ───────────────────────────────────────────
  'children.state.bright-creative-bond': {
    confirm:
      'children and the next generation connect through a bright, creative bond — time spent making and playing together deepens the tie.',
  },
  'children.state.devoted-careful': {
    confirm: 'children may come later or fewer, but the bond runs deep with devotion.',
    conflict: 'longing and caution sit together — balancing timing and readiness is the task.',
  },

  // ── wisdom ─────────────────────────────────────────────
  'wisdom.state.scholar-path': {
    confirm:
      'learning, research and teaching become a lifelong asset — the deeper you dig, the more the path opens.',
  },
  'wisdom.state.intuitive-insight': {
    confirm:
      'beyond raw data you grasp things through intuition and insight — an unusual angle of understanding is your strength.',
  },

  // ── creativity ─────────────────────────────────────────
  'creativity.state.expressive-gift': {
    confirm:
      'a clear gift for expression and creation — the more you put your work out, the more it shines.',
  },
  'creativity.state.solitary-art': {
    confirm: 'solitary depth is what gives your work its distinctive color.',
    conflict:
      'between immersion and isolation — keeping one channel open to the world brings balance.',
  },

  // ── spirituality ───────────────────────────────────────
  'spirituality.state.mystic-bent': {
    confirm:
      'a spiritual, mystical leaning is a lifelong theme — solitary reflection becomes your path.',
  },
  'spirituality.state.empty-gate': {
    confirm: 'an unfillable emptiness becomes, unexpectedly, a doorway into the spiritual.',
    conflict: 'peace and void sit together — filling that space with reflection is the task.',
  },
}
