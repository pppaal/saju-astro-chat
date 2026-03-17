import type { SignalDomain } from './signalSynthesizer'
import type { ActivationEngineResult } from './activationEngine'
import type { CompiledFeatureToken } from './tokenCompiler'

export interface DomainRuleResolution {
  domain: SignalDomain
  amplify: string[]
  suppress: string[]
  gate: string[]
  delay: string[]
  convert: string[]
  contradictionPenalty: number
  priorityScore: number
  resolvedMode: 'execute' | 'verify' | 'prepare'
}

export interface RuleEngineResult {
  domains: DomainRuleResolution[]
  globalNotes: string[]
}

function pushUnique(target: string[], ...values: string[]) {
  for (const value of values) {
    if (!target.includes(value)) target.push(value)
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function buildRuleEngine(input: {
  activation: ActivationEngineResult
  tokens?: CompiledFeatureToken[]
}): RuleEngineResult {
  const allTokens = input.tokens || []

  const domains = input.activation.domains.map((domain) => {
    const amplify: string[] = []
    const suppress: string[] = []
    const gate: string[] = []
    const delay: string[] = []
    const convert: string[] = []

    if (domain.dominantAxes.includes('expansion')) pushUnique(amplify, 'expansion')
    if (domain.dominantAxes.includes('deep_work')) pushUnique(amplify, 'deep_work')
    if (domain.dominantAxes.includes('pressure')) pushUnique(suppress, 'overextension')
    if (domain.dominantAxes.includes('verification')) pushUnique(gate, 'commit_now')
    if (domain.dominantAxes.includes('recovery')) pushUnique(delay, 'high_intensity_push')
    if (domain.dominantAxes.includes('retreat') && domain.dominantAxes.includes('bonding')) {
      pushUnique(convert, 'relationship_growth -> selective_distance')
    }
    if (domain.dominantAxes.includes('mobility') && domain.dominantAxes.includes('verification')) {
      pushUnique(convert, 'move_fast -> staged_move')
    }

    const domainTokens = allTokens.filter((token) => token.domainHints.includes(domain.domain))
    const hasToken = (pattern: RegExp) => domainTokens.some((token) => pattern.test(token.id) || pattern.test(token.sourceValue))
    const hasAnyToken = (pattern: RegExp) => allTokens.some((token) => pattern.test(token.id) || pattern.test(token.sourceValue))
    const hasAxis = (axis: string) => domain.dominantAxes.includes(axis)

    const hasSaturnRelationshipGate = hasAnyToken(
      /planet-house:Saturn:(7|8|12)|planet-sign:Saturn:(Pisces|Capricorn|Aquarius)|aspect:(Moon|Venus):Saturn:(square|opposition|quincunx)|aspect:Saturn:(Moon|Venus):(square|opposition|quincunx)/i
    )
    const hasMoonSaturnHardAspect = hasAnyToken(/aspect:(Moon|Saturn):(Saturn|Moon):(square|opposition|quincunx)/i)
    const hasVenusSaturnHardAspect = hasAnyToken(/aspect:(Venus|Saturn):(Saturn|Venus):(square|opposition|quincunx)/i)
    const hasSunJupiterSoftAspect = hasAnyToken(/aspect:(Sun|Jupiter):(Jupiter|Sun):(trine|sextile|conjunction)/i)
    const hasMercuryMarsHardAspect = hasAnyToken(/aspect:(Mercury|Mars):(Mars|Mercury):(square|opposition|quincunx)/i)
    const hasVenusMarsSoftAspect = hasAnyToken(/aspect:(Venus|Mars):(Mars|Venus):(trine|sextile|conjunction)/i)
    const hasNeptuneRetreatResonance = hasAnyToken(
      /planet-house:Neptune:12|planet-sign:Neptune:Pisces|advanced:draconic|advanced:fixedStars|advanced:harmonics/i
    )
    const hasCareerStructureSupport = hasAnyToken(
      /planet-house:(Mercury|Jupiter|Saturn):(6|9|10)|planet-sign:Mercury:(Virgo|Aquarius)|planet-sign:Jupiter:(Sagittarius|Capricorn)|planet-sign:Saturn:(Capricorn|Aquarius|Pisces)/i
    )
    const hasRelationshipAttractionSupport = hasAnyToken(
      /planet-house:(Venus|Moon|Juno):(5|7)|planet-sign:Venus:(Libra|Pisces|Taurus)|asteroid:Juno:7/i
    )
    const hasMovementPressure = hasAnyToken(
      /advanced:eclipses|transit:mercuryRetrograde|transit:marsRetrograde|transit:saturnRetrograde|crossSnapshot:astroTimingIndex/i
    )
    const hasMercury10 = hasAnyToken(/planet-house:Mercury:10\b/i)
    const hasJupiter10 = hasAnyToken(/planet-house:Jupiter:10\b/i)
    const hasSaturn10 = hasAnyToken(/planet-house:Saturn:10\b/i)
    const hasMoon7 = hasAnyToken(/planet-house:Moon:7\b/i)
    const hasVenus7 = hasAnyToken(/planet-house:Venus:7\b/i)
    const hasVenus2 = hasAnyToken(/planet-house:Venus:2\b/i)
    const hasJupiter2 = hasAnyToken(/planet-house:Jupiter:2\b/i)
    const hasSaturn6 = hasAnyToken(/planet-house:Saturn:6\b/i)
    const hasJunoRelationshipFrame = hasAnyToken(/asteroid:Juno:(7|11)\b/i)
    const hasJunoCareerContract = hasAnyToken(/asteroid:Juno:10\b/i)
    const hasCeresRecoveryFrame = hasAnyToken(/asteroid:Ceres:(4|6|7)\b/i)
    const hasCeresResourceFrame = hasAnyToken(/asteroid:Ceres:2\b/i)
    const hasPallasStrategyFrame = hasAnyToken(/asteroid:Pallas:(3|6|10)\b/i)
    const hasVestaDisciplineFrame = hasAnyToken(/asteroid:Vesta:(5|6|10)\b/i)
    const hasRoyalFixedStar = hasAnyToken(/advanced:fixedstars.*(regulus|spica|aldebaran|fomalhaut)|\b(regulus|spica|aldebaran|fomalhaut)\b/i)
    const hasIntenseFixedStar = hasAnyToken(/advanced:fixedstars.*(algol|antares)|\b(algol|antares)\b/i)
    const hasRegulus = hasAnyToken(/advanced:fixedstars.*regulus|\bregulus\b/i)
    const hasSpica = hasAnyToken(/advanced:fixedstars.*spica|\bspica\b/i)
    const hasAldebaran = hasAnyToken(/advanced:fixedstars.*aldebaran|\baldebaran\b/i)
    const hasFomalhaut = hasAnyToken(/advanced:fixedstars.*fomalhaut|\bfomalhaut\b/i)
    const hasAlgol = hasAnyToken(/advanced:fixedstars.*algol|\balgol\b/i)
    const hasAntares = hasAnyToken(/advanced:fixedstars.*antares|\bantares\b/i)
    const hasRelationshipMidpoint = hasAnyToken(
      /advanced:midpoints.*(venus|moon|juno).*(mars|jupiter|vertex|sun)|advanced:midpoints.*(mars|jupiter|vertex|sun).*(venus|moon|juno)|\b(venus|moon|juno)\/(mars|jupiter|vertex|sun)\b|\b(mars|jupiter|vertex|sun)\/(venus|moon|juno)\b/i
    )
    const hasCareerMidpoint = hasAnyToken(
      /advanced:midpoints.*(sun|mercury|jupiter|saturn|mc).*(jupiter|saturn|mc|sun|mercury)|\b(sun|mercury|jupiter|saturn|mc)\/(jupiter|saturn|mc|sun|mercury)\b/i
    )
    const hasSunMoonMidpoint = hasAnyToken(/advanced:midpoints.*sun\/moon|\bsun\/moon\b/i)
    const hasVenusMarsMidpoint = hasAnyToken(/advanced:midpoints.*venus\/mars|\bvenus\/mars\b/i)
    const hasSunJupiterMidpoint = hasAnyToken(/advanced:midpoints.*sun\/jupiter|\bsun\/jupiter\b/i)
    const hasMercurySaturnMidpoint = hasAnyToken(/advanced:midpoints.*mercury\/saturn|\bmercury\/saturn\b/i)
    const hasMoonSaturnMidpoint = hasAnyToken(/advanced:midpoints.*moon\/saturn|\bmoon\/saturn\b/i)
    const hasVenusSaturnMidpoint = hasAnyToken(/advanced:midpoints.*venus\/saturn|\bvenus\/saturn\b/i)
    const hasAdvancedAsteroidSupport = hasAnyToken(/advanced:asteroids.*(juno|ceres|pallas|vesta)|\b(juno|ceres|pallas|vesta)\b/i)
    const hasAdvancedExtraPointSupport = hasAnyToken(/advanced:extrapoints.*(chiron|lilith|vertex|partoffortune)|\b(chiron|lilith|vertex|part of fortune|partoffortune)\b/i)
    const hasGeokgukFrame = allTokens.some((token) => token.sourceKind === 'geokguk')
    const hasJeonggwanFrame = hasAnyToken(/geokguk:(jeonggwan|정관)/i)
    const hasInseongFrame = hasAnyToken(/geokguk:(jeongin|pyeongin|정인|편인)/i)
    const hasSiksangFrame = hasAnyToken(/geokguk:(siksin|sanggwan|식신|상관)/i)
    const hasJaeseongFrame = hasAnyToken(/geokguk:(jeongjae|pyeonjae|정재|편재)/i)
    const hasYongsinFrame = allTokens.some((token) => token.sourceKind === 'yongsin')
    const hasWoodDayMaster = hasAnyToken(/day-master:(목|wood)/i)
    const hasFireDayMaster = hasAnyToken(/day-master:(화|fire)/i)
    const hasEarthDayMaster = hasAnyToken(/day-master:(토|earth)/i)
    const hasMetalDayMaster = hasAnyToken(/day-master:(금|metal)/i)
    const hasWaterDayMaster = hasAnyToken(/day-master:(수|water)/i)
    const hasBigyeon = hasAnyToken(/sibsin:(비견|bigyeon)/i)
    const hasGeopjae = hasAnyToken(/sibsin:(겁재|geopjae)/i)
    const hasSiksin = hasAnyToken(/sibsin:(식신|siksin)/i)
    const hasSanggwan = hasAnyToken(/sibsin:(상관|sanggwan)/i)
    const hasPyeonjae = hasAnyToken(/sibsin:(편재|pyeonjae)/i)
    const hasJeongjae = hasAnyToken(/sibsin:(정재|jeongjae)/i)
    const hasPyeongwan = hasAnyToken(/sibsin:(편관|pyeongwan)/i)
    const hasJeonggwanSibsin = hasAnyToken(/sibsin:(정관|jeonggwan)/i)
    const hasPyeongin = hasAnyToken(/sibsin:(편인|pyeongin)/i)
    const hasJeongin = hasAnyToken(/sibsin:(정인|jeongin)/i)
    const hasFireYongsin = hasAnyToken(/yongsin:(화|fire)/i)
    const hasWaterYongsin = hasAnyToken(/yongsin:(수|water)/i)
    const hasWoodYongsin = hasAnyToken(/yongsin:(목|wood)/i)
    const hasMetalYongsin = hasAnyToken(/yongsin:(금|metal)/i)
    const hasEarthYongsin = hasAnyToken(/yongsin:(토|earth)/i)
    const hasSaturnReturn = hasAnyToken(/transit:saturnReturn/i)
    const hasJupiterReturn = hasAnyToken(/transit:jupiterReturn|transit:nodeReturn/i)
    const hasRetrogradeCluster = hasAnyToken(/transit:(mercuryRetrograde|venusRetrograde|marsRetrograde|jupiterRetrograde|saturnRetrograde)/i)
    const hasEclipseActivation = hasAnyToken(/advanced:eclipses|transit:eclipse/i)
    const hasPeakStage = hasAnyToken(/stage:(제왕|jewang|건록|geonrok|임관|imgwan)/i)
    const hasGrowthStage = hasAnyToken(/stage:(장생|jangsaeng|관대|gwandae)/i)
    const hasExhaustionStage = hasAnyToken(/stage:(병|byeong|쇠|soe|절|jeol|묘|myo)/i)
    const hasHarmonyRelation = hasAnyToken(/relation:.*(harmony|합|yukhap|samhap|banghap)/i)
    const hasClashRelation = hasAnyToken(/relation:.*(clash|충|hyeong|pa|hae|wonjin|tension)/i)
    const hasCrossEvidenceCareer = hasAnyToken(/crossSnapshot:crossevidence.*career|crossSnapshot:category.*career|crossSnapshot:source.*career/i)
    const hasCrossEvidenceRelationship = hasAnyToken(/crossSnapshot:crossevidence.*relationship|crossSnapshot:crossevidence.*love|crossSnapshot:category.*relationship|crossSnapshot:source.*relationship/i)
    const hasCrossEvidenceWealth = hasAnyToken(/crossSnapshot:crossevidence.*wealth|crossSnapshot:crossevidence.*money|crossSnapshot:category.*wealth|crossSnapshot:source.*wealth/i)
    const hasLowCrossAgreement = hasAnyToken(/crossSnapshot:crossagreement=.*(0\.[0-4]|0$)/i)
    const hasSajuUnseFrame = hasAnyToken(/sajuSnapshot:unse|sajuSnapshot:advancedanalysis|sajuSnapshot:daeun|sajuSnapshot:saeun|sajuSnapshot:wolun|sajuSnapshot:iljin/i)
    const hasAstroTransitFrame = hasAnyToken(/astrologySnapshot:transits|astrologySnapshot:advancedastrosignals|astrologySnapshot:eclipse|astrologySnapshot:return|astrologySnapshot:progress/i)
    const hasNatalAspectFrame = hasAnyToken(/astrologySnapshot:natalaspects|astrologySnapshot:aspect|astrologySnapshot:natalchart/i)

    if (hasToken(/shinsal:.*í™”ê°œ|shinsal:.*Ã­â„¢â€ÃªÂ°Å“|shinsal:.*화개/i)) {
      if (domain.domain === 'spirituality' || domain.domain === 'personality') {
        pushUnique(amplify, 'spiritual_focus', 'deep_work')
      }
      if (domain.domain === 'spirituality' && hasNeptuneRetreatResonance) {
        pushUnique(amplify, 'meaning_retreat', 'symbolic_processing')
      }
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'instant_commitment')
        pushUnique(delay, 'emotional_disclosure')
        pushUnique(convert, 'relationship_growth -> selective_distance')
        if (hasSaturnRelationshipGate) {
          pushUnique(gate, 'forced_closeness')
          pushUnique(delay, 'premature_definition')
        }
      }
      if (domain.domain === 'career' && (hasAxis('deep_work') || hasCareerStructureSupport)) {
        pushUnique(amplify, 'research_planning', 'study_specialization', 'craft_refinement')
      }
    }

    if (hasToken(/shinsal:.*ë„í™”|shinsal:.*í™ì—¼|shinsal:.*Ã«Ââ€žÃ­â„¢â€|shinsal:.*Ã­â„¢ÂÃ¬â€”Â¼|shinsal:.*도화|shinsal:.*홍염/i)) {
      if (domain.domain === 'relationship' || domain.domain === 'personality') {
        pushUnique(amplify, 'attraction_visibility')
      }
      if (domain.domain === 'relationship' && hasRelationshipAttractionSupport) {
        pushUnique(amplify, 'mutual_attraction_window')
      }
      if (domain.domain === 'relationship' && (hasAxis('verification') || hasAxis('pressure'))) {
        pushUnique(gate, 'projection_bias', 'idealization_loop')
        pushUnique(delay, 'rapid_attachment')
      }
      if (domain.domain === 'relationship' && hasSaturnRelationshipGate) {
        pushUnique(delay, 'confirmation_before_labeling')
      }
      if (domain.domain === 'relationship' && hasMovementPressure) {
        pushUnique(delay, 'emotionally_loaded_decision')
      }
    }

    if (hasToken(/shinsal:.*ì—­ë§ˆ|shinsal:.*Ã¬â€”Â­Ã«Â§Ë†|shinsal:.*역마/i)) {
      if (domain.domain === 'move' || domain.domain === 'career') {
        pushUnique(amplify, 'movement_window')
      }
      if (domain.domain === 'move' && hasAnyToken(/planet-house:Jupiter:(9|10)|planet-sign:Jupiter:Sagittarius|planet-house:Mercury:9/i)) {
        pushUnique(amplify, 'travel_for_opportunity', 'housing_search_momentum')
      }
      if (domain.domain === 'move' && hasAxis('verification')) {
        pushUnique(gate, 'impulsive_move')
        pushUnique(convert, 'move_fast -> staged_move')
      }
      if (domain.domain === 'move' && hasMovementPressure) {
        pushUnique(delay, 'housing_commitment')
        pushUnique(gate, 'route_assumption')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'mobility_for_role_shift')
      }
    }

    if (hasAnyToken(/shinsal:.*ê³µë§|shinsal:.*ÃªÂ³ÂµÃ«Â§|shinsal:.*공망/i)) {
      pushUnique(delay, 'finalize_terms')
      pushUnique(convert, 'certainty -> recheck')
      if (domain.domain === 'relationship') pushUnique(gate, 'assumption_gap')
      if (domain.domain === 'wealth') pushUnique(gate, 'blind_spot_spending')
      if (domain.domain === 'career') pushUnique(gate, 'blind_spot_commitment')
    }

    if (hasToken(/shinsal:.*ë°±í˜¸|shinsal:.*Ã«Â°Â±Ã­ËœÂ¸|shinsal:.*ì–‘ì¸|shinsal:.*양인|shinsal:.*ÃªÂ´Â´ÃªÂ°â€¢|shinsal:.*괴강|shinsal:.*í˜„ì¹¨|shinsal:.*현침/i)) {
      pushUnique(suppress, 'overconfidence')
      pushUnique(gate, 'reckless_push')
      if (domain.domain === 'health') pushUnique(delay, 'overload', 'inflammation_spike')
      if (domain.domain === 'relationship') pushUnique(gate, 'sharp_wording')
      if (domain.domain === 'career') pushUnique(gate, 'authority_conflict')
      if (domain.domain === 'personality') pushUnique(suppress, 'rigidity_loop')
    }

    if (hasToken(/extra-point:Chiron|extra-point:chiron/i)) {
      if (domain.domain === 'health') {
        pushUnique(amplify, 'healing_routine')
        pushUnique(delay, 'high_intensity_push')
        if (hasSaturnRelationshipGate || hasAnyToken(/aspect:(Moon|Saturn):.*(square|opposition)|planet-house:Moon:(6|12)/i)) {
          pushUnique(amplify, 'recovery_protocol')
        }
      }
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'wound_projection')
        pushUnique(convert, 'bonding -> healing_conversation')
      }
      if (domain.domain === 'career' && (hasAxis('deep_work') || hasCareerStructureSupport)) {
        pushUnique(amplify, 'service_specialization')
      }
    }

    if (hasToken(/extra-point:Lilith|extra-point:lilith/i)) {
      if (domain.domain === 'relationship' || domain.domain === 'personality') {
        pushUnique(amplify, 'boundary_awareness')
        pushUnique(convert, 'bonding -> selective_distance')
      }
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'shadow_reactivity', 'boundary_breach')
      }
      if (domain.domain === 'career' && hasAxis('visibility')) {
        pushUnique(gate, 'reputation_shadow_check')
      }
    }

    if (hasToken(/extra-point:Vertex|extra-point:vertex/i)) {
      if (domain.domain === 'relationship' || domain.domain === 'move') {
        pushUnique(amplify, 'contact_window')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'network_introduction_window')
      }
      if (domain.domain === 'relationship' && hasAxis('verification')) {
        pushUnique(delay, 'premature_labeling')
      }
    }

    if (domain.domain === 'relationship' && hasJunoRelationshipFrame) {
      pushUnique(amplify, 'commitment_frame', 'clarify_expectations')
      if (hasAxis('verification') || hasSaturnRelationshipGate) {
        pushUnique(delay, 'premature_labeling')
      }
    }

    if (domain.domain === 'career' && (hasPallasStrategyFrame || hasJunoCareerContract)) {
      pushUnique(amplify, 'strategy_planning', 'contract_alignment')
      if (hasPallasStrategyFrame) {
        pushUnique(amplify, 'specialist_pattern')
      }
    }

    if (domain.domain === 'health' && (hasCeresRecoveryFrame || hasVestaDisciplineFrame)) {
      pushUnique(amplify, 'nourishment_routine', 'habit_devotion')
      if (hasAxis('pressure')) {
        pushUnique(delay, 'recovery_skipping')
      }
    }

    if (domain.domain === 'wealth' && hasCeresResourceFrame) {
      pushUnique(amplify, 'resource_buffer')
      if (hasAxis('verification')) {
        pushUnique(delay, 'comfort_spending')
      }
    }

    if (domain.domain === 'spirituality' && hasVestaDisciplineFrame) {
      pushUnique(amplify, 'mission_focus', 'ritual_consistency')
    }

    if (hasRoyalFixedStar) {
      if (domain.domain === 'career' || domain.domain === 'personality') {
        pushUnique(amplify, 'recognition_window', 'authority_visibility')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'prestige_timing')
      }
    }

    if (hasRegulus) {
      if (domain.domain === 'career') pushUnique(amplify, 'leadership_spotlight')
      if (domain.domain === 'personality') pushUnique(amplify, 'status_presence')
    }
    if (hasSpica) {
      if (domain.domain === 'career' || domain.domain === 'wealth') {
        pushUnique(amplify, 'talent_reward_window')
      }
    }
    if (hasAldebaran) {
      if (domain.domain === 'career' || domain.domain === 'timing') {
        pushUnique(amplify, 'integrity_test_window')
      }
    }
    if (hasFomalhaut) {
      if (domain.domain === 'spirituality' || domain.domain === 'personality') {
        pushUnique(amplify, 'vision_alignment')
      }
    }

    if (hasIntenseFixedStar) {
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'drama_escalation')
        pushUnique(delay, 'conflict_labeling')
      }
      if (domain.domain === 'career' || domain.domain === 'personality') {
        pushUnique(gate, 'reputation_overreach')
      }
      if (domain.domain === 'health') {
        pushUnique(delay, 'stress_spike')
      }
    }

    if (hasAlgol) {
      if (domain.domain === 'relationship') pushUnique(gate, 'emotional_flood')
      if (domain.domain === 'health') pushUnique(delay, 'nervous_system_overload')
    }
    if (hasAntares) {
      if (domain.domain === 'career') pushUnique(gate, 'ego_competition')
      if (domain.domain === 'relationship') pushUnique(delay, 'revenge_loop')
    }

    if (hasRelationshipMidpoint) {
      if (domain.domain === 'relationship') {
        pushUnique(amplify, 'relational_timing_window', 'bond_definition')
        if (hasAxis('verification')) {
          pushUnique(delay, 'projected_union')
        }
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'contact_timing_precision')
      }
    }

    if (hasSunMoonMidpoint) {
      if (domain.domain === 'relationship' || domain.domain === 'personality') {
        pushUnique(amplify, 'inner_outer_alignment')
      }
    }
    if (hasVenusMarsMidpoint) {
      if (domain.domain === 'relationship') {
        pushUnique(amplify, 'chemistry_window')
        pushUnique(delay, 'passion_overread')
      }
    }

    if (hasCareerMidpoint) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'role_definition', 'career_alignment')
      }
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'structured_gain_window')
      }
    }

    if (hasSunJupiterMidpoint) {
      if (domain.domain === 'career' || domain.domain === 'wealth') {
        pushUnique(amplify, 'expansion_confidence')
      }
    }
    if (hasMercurySaturnMidpoint) {
      if (domain.domain === 'career' || domain.domain === 'timing') {
        pushUnique(amplify, 'precision_planning')
        pushUnique(delay, 'premature_statement')
      }
    }
    if (hasMoonSaturnMidpoint || hasVenusSaturnMidpoint) {
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'cold_bonding')
        pushUnique(delay, 'slow_trust_build')
      }
      if (domain.domain === 'health') {
        pushUnique(delay, 'emotional_fatigue')
      }
    }

    if (hasAdvancedAsteroidSupport) {
      if (domain.domain === 'relationship') {
        pushUnique(amplify, 'bonding_support_grid')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'craft_strategy_grid')
      }
      if (domain.domain === 'health') {
        pushUnique(amplify, 'care_routine_grid')
      }
    }

    if (hasAdvancedExtraPointSupport) {
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'karmic_projection')
      }
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'fortune_window')
      }
      if (domain.domain === 'health') {
        pushUnique(amplify, 'shadow_recovery_check')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'fated_crossroad_window')
      }
    }

    if (hasGeokgukFrame) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'structural_role_signature')
      }
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'resource_buffer')
      }
      if (domain.domain === 'personality') {
        pushUnique(amplify, 'meaning_reorientation')
      }
    }
    if (hasJeonggwanFrame) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'authority_visibility', 'strategy_planning', 'contract_alignment')
      }
      if (domain.domain === 'timing' && hasAxis('verification')) {
        pushUnique(delay, 'premature_statement')
      }
    }
    if (hasInseongFrame) {
      if (domain.domain === 'health') {
        pushUnique(amplify, 'recovery_protocol', 'nourishment_routine')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'service_specialization', 'research_planning')
      }
    }
    if (hasSiksangFrame) {
      if (domain.domain === 'career' || domain.domain === 'personality') {
        pushUnique(amplify, 'craft_refinement', 'recognition_window')
      }
      if (domain.domain === 'relationship' && hasAxis('pressure')) {
        pushUnique(gate, 'sharp_wording')
      }
    }
    if (hasJaeseongFrame) {
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'structured_gain_window', 'expansion_confidence', 'resource_buffer')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'pricing_power')
      }
    }

    if (hasBigyeon) {
      if (domain.domain === 'personality' || domain.domain === 'relationship') {
        pushUnique(amplify, 'status_presence', 'boundary_awareness')
      }
      if (domain.domain === 'wealth') {
        pushUnique(gate, 'shared_resource_blur')
      }
    }
    if (hasGeopjae) {
      if (domain.domain === 'wealth') {
        pushUnique(gate, 'blind_spot_spending', 'resource_competition')
        pushUnique(delay, 'expense_spike')
      }
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'comparison_loop')
      }
    }
    if (hasSiksin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'craft_refinement', 'steady_output')
      }
      if (domain.domain === 'health') {
        pushUnique(amplify, 'nourishment_routine', 'recovery_protocol')
      }
    }
    if (hasSanggwan) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'recognition_window')
        pushUnique(gate, 'premature_statement')
      }
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'sharp_wording')
      }
    }
    if (hasPyeonjae) {
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'fortune_window', 'pricing_power')
        pushUnique(delay, 'volatility_chasing')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'network_leverage')
      }
    }
    if (hasJeongjae) {
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'structured_gain_window', 'resource_buffer')
      }
      if (domain.domain === 'health') {
        pushUnique(amplify, 'habit_devotion')
      }
    }
    if (hasPyeongwan) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'authority_visibility')
        pushUnique(gate, 'authority_conflict')
      }
      if (domain.domain === 'health') {
        pushUnique(delay, 'overload')
      }
    }
    if (hasJeonggwanSibsin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'contract_alignment', 'precision_planning')
      }
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'confirmation_before_labeling')
      }
    }
    if (hasPyeongin) {
      if (domain.domain === 'spirituality' || domain.domain === 'personality') {
        pushUnique(amplify, 'meaning_retreat', 'deep_work')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'research_planning')
      }
    }
    if (hasJeongin) {
      if (domain.domain === 'health') {
        pushUnique(amplify, 'recovery_protocol', 'care_routine_grid')
      }
      if (domain.domain === 'personality') {
        pushUnique(amplify, 'meaning_reorientation')
      }
    }

    if (hasMercury10 && hasJeonggwanSibsin && domain.domain === 'career') {
      pushUnique(amplify, 'precision_planning', 'contract_alignment')
    }
    if ((hasJupiter10 || hasSaturn10) && (hasPyeonjae || hasJeongjae) && domain.domain === 'career') {
      pushUnique(amplify, 'network_leverage', 'authority_visibility')
    }
    if ((hasVenus7 || hasMoon7) && (hasBigyeon || hasJeonggwanSibsin) && domain.domain === 'relationship') {
      pushUnique(amplify, 'commitment_frame', 'clarify_expectations')
    }
    if (hasMoon7 && (hasGeopjae || hasSanggwan) && domain.domain === 'relationship') {
      pushUnique(delay, 'emotionally_loaded_decision', 'comparison_loop')
    }
    if ((hasVenus2 || hasJupiter2) && (hasPyeonjae || hasJeongjae) && domain.domain === 'wealth') {
      pushUnique(amplify, 'pricing_power', 'structured_gain_window')
    }
    if (hasSaturn6 && (hasJeongin || hasPyeongwan) && domain.domain === 'health') {
      pushUnique(amplify, 'recovery_protocol')
      pushUnique(delay, 'overload')
    }

    if (hasMetalDayMaster && hasFireYongsin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'recognition_window', 'precision_planning')
      }
      if (domain.domain === 'wealth' && (hasPyeonjae || hasJeongjae)) {
        pushUnique(amplify, 'pricing_power')
      }
    }
    if (hasWoodDayMaster && hasWaterYongsin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'research_planning', 'study_specialization')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'phase_window')
      }
    }
    if (hasFireDayMaster && hasEarthYongsin) {
      if (domain.domain === 'wealth' || domain.domain === 'health') {
        pushUnique(amplify, 'resource_buffer', 'habit_devotion')
      }
      if (domain.domain === 'relationship' && hasAxis('pressure')) {
        pushUnique(delay, 'emotionally_loaded_decision')
      }
    }
    if (hasEarthDayMaster && hasMetalYongsin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'contract_alignment', 'precision_planning')
      }
      if (domain.domain === 'timing' && hasAxis('verification')) {
        pushUnique(delay, 'finalize_terms')
      }
    }
    if (hasWaterDayMaster && hasWoodYongsin) {
      if (domain.domain === 'career' || domain.domain === 'spirituality') {
        pushUnique(amplify, 'meaning_reorientation', 'deep_work')
      }
      if (domain.domain === 'move') {
        pushUnique(amplify, 'movement_window')
      }
    }

    if (hasMetalDayMaster && hasFireYongsin && hasJeonggwanSibsin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'authority_visibility', 'contract_alignment')
      }
    }
    if (hasMetalDayMaster && hasFireYongsin && hasPyeonjae) {
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'fortune_window', 'pricing_power')
      }
    }
    if (hasWoodDayMaster && hasWaterYongsin && (hasPyeongin || hasJeongin)) {
      if (domain.domain === 'career' || domain.domain === 'spirituality') {
        pushUnique(amplify, 'research_planning', 'meaning_retreat')
      }
    }
    if (hasFireDayMaster && hasEarthYongsin && (hasSiksin || hasJeongjae)) {
      if (domain.domain === 'wealth' || domain.domain === 'health') {
        pushUnique(amplify, 'structured_gain_window', 'nourishment_routine')
      }
    }
    if (hasEarthDayMaster && hasMetalYongsin && (hasPyeongwan || hasJeonggwanSibsin)) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'strategy_planning', 'authority_visibility')
      }
    }
    if (hasWaterDayMaster && hasWoodYongsin && (hasSiksin || hasSanggwan)) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'steady_output', 'craft_refinement')
      }
      if (domain.domain === 'relationship' && hasSanggwan) {
        pushUnique(gate, 'sharp_wording')
      }
    }

    if (hasMetalDayMaster && hasJeonggwanFrame && hasSaturnReturn) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'authority_visibility', 'strategy_planning')
        pushUnique(delay, 'announcement_timing')
      }
      if (domain.domain === 'timing') {
        pushUnique(gate, 'commit_now')
      }
    }
    if (hasWoodDayMaster && hasInseongFrame && hasJupiterReturn) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'study_specialization', 'network_leverage')
      }
      if (domain.domain === 'spirituality') {
        pushUnique(amplify, 'meaning_reorientation')
      }
    }
    if (hasFireDayMaster && hasJaeseongFrame && hasRetrogradeCluster) {
      if (domain.domain === 'wealth') {
        pushUnique(gate, 'blind_spot_spending')
        pushUnique(delay, 'finalize_terms')
      }
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'emotionally_loaded_decision')
      }
    }
    if (hasWaterDayMaster && hasSiksangFrame && hasEclipseActivation) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'craft_refinement')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'transition_window')
        pushUnique(gate, 'commit_now')
      }
    }
    if (hasEarthDayMaster && hasJeonggwanFrame && hasSaturnReturn) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'contract_alignment', 'precision_planning')
      }
      if (domain.domain === 'health') {
        pushUnique(delay, 'overload')
      }
    }

    if (hasMoonSaturnHardAspect && hasSaturnReturn) {
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'forced_closeness', 'cold_bonding')
        pushUnique(delay, 'slow_trust_build')
      }
      if (domain.domain === 'health') {
        pushUnique(delay, 'emotional_fatigue', 'recovery_skipping')
      }
      if (domain.domain === 'timing') {
        pushUnique(gate, 'commit_now')
      }
    }
    if (hasVenusSaturnHardAspect && hasRetrogradeCluster) {
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'confirmation_before_labeling', 'premature_definition')
        pushUnique(gate, 'projection_bias')
      }
      if (domain.domain === 'wealth') {
        pushUnique(delay, 'finalize_terms')
      }
    }
    if (hasSunJupiterSoftAspect && hasJupiterReturn) {
      if (domain.domain === 'career' || domain.domain === 'wealth') {
        pushUnique(amplify, 'expansion_confidence', 'recognition_window')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'phase_window')
      }
    }
    if (hasMercuryMarsHardAspect && hasRetrogradeCluster) {
      if (domain.domain === 'career' || domain.domain === 'relationship') {
        pushUnique(gate, 'premature_statement')
        pushUnique(delay, 'emotionally_loaded_decision')
      }
      if (domain.domain === 'move') {
        pushUnique(gate, 'route_assumption')
      }
    }
    if (hasVenusMarsSoftAspect && hasEclipseActivation) {
      if (domain.domain === 'relationship') {
        pushUnique(amplify, 'chemistry_window', 'contact_window')
        pushUnique(delay, 'emotionally_loaded_decision')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'transition_window')
      }
    }

    if (hasYongsinFrame) {
      if (domain.domain === 'health') {
        pushUnique(amplify, 'recovery_protocol')
      }
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'resource_buffer')
      }
    }
    if (hasFireYongsin) {
      if (domain.domain === 'career' || domain.domain === 'personality') {
        pushUnique(amplify, 'recognition_window', 'status_presence')
      }
      if (domain.domain === 'wealth') pushUnique(amplify, 'expansion_confidence')
    }
    if (hasWaterYongsin) {
      if (domain.domain === 'career' || domain.domain === 'timing') {
        pushUnique(amplify, 'strategy_planning', 'precision_planning')
      }
      if (domain.domain === 'relationship' && hasAxis('verification')) {
        pushUnique(delay, 'emotionally_loaded_decision')
      }
    }
    if (hasWoodYongsin) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'research_planning', 'study_specialization')
      }
      if (domain.domain === 'relationship') {
        pushUnique(amplify, 'bond_definition')
      }
    }
    if (hasMetalYongsin) {
      if (domain.domain === 'career' || domain.domain === 'timing') {
        pushUnique(amplify, 'precision_planning', 'contract_alignment')
      }
    }
    if (hasEarthYongsin) {
      if (domain.domain === 'wealth' || domain.domain === 'health') {
        pushUnique(amplify, 'resource_buffer', 'habit_devotion')
      }
    }

    if (hasPeakStage) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'authority_visibility', 'leadership_spotlight')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'phase_window')
      }
    }
    if (hasGrowthStage) {
      if (domain.domain === 'career' || domain.domain === 'wealth') {
        pushUnique(amplify, 'expansion_confidence')
      }
      if (domain.domain === 'move') {
        pushUnique(amplify, 'movement_window')
      }
    }
    if (hasExhaustionStage) {
      if (domain.domain === 'health') {
        pushUnique(delay, 'overload', 'recovery_skipping')
      }
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'slow_trust_build')
      }
      if (domain.domain === 'timing') {
        pushUnique(gate, 'commit_now')
      }
    }

    if (hasHarmonyRelation) {
      if (domain.domain === 'relationship') {
        pushUnique(amplify, 'bond_definition', 'clarify_expectations')
      }
      if (domain.domain === 'wealth') {
        pushUnique(amplify, 'resource_buffer')
      }
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'phase_window')
      }
    }
    if (hasClashRelation) {
      if (domain.domain === 'relationship') {
        pushUnique(gate, 'projection_bias')
        pushUnique(delay, 'emotionally_loaded_decision')
      }
      if (domain.domain === 'health') {
        pushUnique(delay, 'stress_spike')
      }
      if (domain.domain === 'timing') {
        pushUnique(gate, 'cross_agreement_gap')
      }
    }

    if (hasSajuUnseFrame) {
      if (domain.domain === 'timing') {
        pushUnique(amplify, 'unse_alignment', 'phase_window')
      }
      if (domain.domain === 'career' || domain.domain === 'wealth') {
        pushUnique(amplify, 'cycle_context')
      }
    }

    if (hasAstroTransitFrame) {
      if (domain.domain === 'timing' || domain.domain === 'move') {
        pushUnique(amplify, 'transit_trigger_window')
      }
      if (domain.domain === 'relationship' && hasAxis('verification')) {
        pushUnique(delay, 'transit_overreaction')
      }
    }

    if (hasNatalAspectFrame) {
      if (domain.domain === 'relationship' || domain.domain === 'personality') {
        pushUnique(amplify, 'natal_pattern_memory')
      }
      if (domain.domain === 'career') {
        pushUnique(amplify, 'structural_role_signature')
      }
    }

    if (hasCrossEvidenceCareer && domain.domain === 'career') {
      pushUnique(amplify, 'cross_confirmed_career')
    }
    if (hasCrossEvidenceRelationship && domain.domain === 'relationship') {
      pushUnique(amplify, 'cross_confirmed_relationship')
    }
    if (hasCrossEvidenceWealth && domain.domain === 'wealth') {
      pushUnique(amplify, 'cross_confirmed_wealth')
    }
    if (hasLowCrossAgreement) {
      pushUnique(gate, 'cross_agreement_gap')
      if (domain.domain === 'relationship' || domain.domain === 'wealth') {
        pushUnique(delay, 'cross_signal_commitment')
      }
    }

    if (hasToken(/advanced:eclipses|crossSnapshot:astroTimingIndex/i)) {
      pushUnique(gate, 'commit_now')
      pushUnique(delay, 'irreversible_action')
      if (domain.domain === 'timing' || domain.domain === 'move') {
        pushUnique(amplify, 'transition_window')
      }
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'emotionally_loaded_decision', 'status_change')
      }
      if (domain.domain === 'career') {
        pushUnique(delay, 'announcement_timing')
      }
    }

    if (hasToken(/advanced:progressions|advanced:solarReturn|advanced:lunarReturn/i)) {
      if (domain.domain === 'career') {
        pushUnique(amplify, 'slow_role_shift', 'annual_theme_alignment')
      }
      if (domain.domain === 'relationship' || domain.domain === 'health') {
        pushUnique(amplify, 'emotional_cycle_visibility')
      }
    }

    if (hasToken(/advanced:draconic|advanced:harmonics|advanced:fixedStars|advanced:midpoints|advanced:asteroids|advanced:extraPoints/i)) {
      if (domain.domain === 'spirituality' || domain.domain === 'personality') {
        pushUnique(amplify, 'meaning_reorientation')
      }
      if (domain.domain === 'relationship') {
        pushUnique(delay, 'mixed_motives_check')
      }
      if (domain.domain === 'wealth') {
        pushUnique(gate, 'symbolic_spending')
      }
    }

    let contradictionPenalty =
      (domain.dominantAxes.includes('expansion') && domain.dominantAxes.includes('verification') ? 0.18 : 0) +
      (domain.dominantAxes.includes('bonding') && domain.dominantAxes.includes('retreat') ? 0.14 : 0) +
      (domain.dominantAxes.includes('pressure') && domain.dominantAxes.includes('recovery') ? 0.12 : 0)

    contradictionPenalty += gate.length >= 2 ? 0.08 : 0
    contradictionPenalty += convert.length >= 2 ? 0.06 : 0
    contradictionPenalty += delay.length >= 3 ? 0.05 : 0

    const priorityScore = round2(domain.activationScore - contradictionPenalty)
    const resolvedMode: DomainRuleResolution['resolvedMode'] =
      contradictionPenalty >= 0.24 || domain.dominantAxes.includes('recovery')
        ? 'prepare'
        : gate.length > 0 || contradictionPenalty >= 0.12
          ? 'verify'
          : 'execute'

    return {
      domain: domain.domain,
      amplify,
      suppress,
      gate,
      delay,
      convert,
      contradictionPenalty: round2(contradictionPenalty),
      priorityScore,
      resolvedMode,
    }
  })

  const globalNotes: string[] = []
  if (input.activation.globalTimePressure >= 0.7) {
    globalNotes.push('time_pressure_high')
  }
  if (input.activation.globalVerificationPressure >= 0.5) {
    globalNotes.push('verification_pressure_high')
  }

  return {
    domains,
    globalNotes,
  }
}
