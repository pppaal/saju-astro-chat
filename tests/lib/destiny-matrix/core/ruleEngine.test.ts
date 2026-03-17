import { describe, expect, it } from 'vitest'
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { compileFeatureTokens } from '@/lib/destiny-matrix/core/tokenCompiler'
import { buildActivationEngine } from '@/lib/destiny-matrix/core/activationEngine'
import { buildRuleEngine } from '@/lib/destiny-matrix/core/ruleEngine'

function createInput(): MatrixCalculationInput {
  return {
    dayMasterElement: '금' as any,
    pillarElements: ['목', '화', '토', '금'] as any,
    sibsinDistribution: { 편재: 2, 정관: 1 } as any,
    twelveStages: { 제왕: 1, 병: 1 } as any,
    relations: [{ kind: 'clash', detail: 'wonjin', note: 'tension' }] as any,
    geokguk: 'jeonggwan' as any,
    yongsin: '화' as any,
    currentDaeunElement: '수' as any,
    currentSaeunElement: '화' as any,
    currentWolunElement: '목' as any,
    currentIljinElement: '금' as any,
    currentIljinDate: '2026-03-15',
    shinsalList: ['화개', '도화', '역마', '백호', '공망', '괴강'] as any,
    dominantWesternElement: 'air',
    planetHouses: { Moon: 7, Venus: 5, Saturn: 12, Jupiter: 10, Mercury: 10, Neptune: 12 } as any,
    planetSigns: { Moon: 'Gemini', Venus: 'Pisces', Saturn: 'Pisces', Jupiter: 'Sagittarius', Mercury: 'Aquarius', Neptune: 'Pisces' } as any,
    aspects: [
      { planet1: 'Moon', planet2: 'Saturn', type: 'square' as any },
      { planet1: 'Venus', planet2: 'Saturn', type: 'square' as any },
    ],
    activeTransits: ['mercuryRetrograde'],
    asteroidHouses: { Juno: 7, Ceres: 6, Pallas: 10, Vesta: 10 } as any,
    extraPointSigns: { Chiron: 'Cancer', Lilith: 'Scorpio', Vertex: 'Libra' } as any,
    advancedAstroSignals: {
      eclipses: true,
      progressions: true,
      draconic: true,
      fixedStars: [
        { star: 'Regulus', planet: 'Sun' },
        { star: 'Spica', planet: 'Venus' },
        { star: 'Algol', planet: 'Mars' },
      ],
      midpoints: {
        all: [{ id: 'Venus/Mars' }, { id: 'Sun/Jupiter' }, { id: 'Sun/Moon' }, { id: 'Mercury/Saturn' }, { id: 'Moon/Saturn' }],
      },
      asteroids: { Juno: { aspect: 'trine' }, Pallas: { aspect: 'conjunction' } },
      extraPoints: { Vertex: { aspect: 'conjunction' }, PartOfFortune: { sign: 'Taurus' } },
    },
    sajuSnapshot: {
      unse: { daeun: '수', saeun: '화' },
      advancedAnalysis: { geokguk: '정관격' },
    } as any,
    astrologySnapshot: {
      natalAspects: [{ id: 'Moon/Saturn square' }],
      transits: [{ id: 'Mercury retrograde' }],
      advancedAstroSignals: { eclipses: true },
    } as any,
    crossSnapshot: {
      crossAgreement: 0.32,
      crossEvidence: ['career', 'relationship'],
      category: 'career',
      source: 'relationship',
      astroTimingIndex: { annual: 0.7 },
    } as any,
    lang: 'ko',
  }
}

describe('buildRuleEngine', () => {
  it('creates domain-specific modulation rules from shinsal/extra points/advanced astro', () => {
    const input = createInput()
    const features = compileFeatureTokens(input)
    const activation = buildActivationEngine({ matrixInput: input, tokens: features.tokens })
    const rules = buildRuleEngine({ activation, tokens: features.tokens })

    const relationship = rules.domains.find((item) => item.domain === 'relationship')
    const move = rules.domains.find((item) => item.domain === 'move')
    const health = rules.domains.find((item) => item.domain === 'health')
    const spirituality = rules.domains.find((item) => item.domain === 'spirituality')

    expect(relationship?.amplify).toContain('attraction_visibility')
    expect(relationship?.amplify).toContain('mutual_attraction_window')
    expect(relationship?.convert).toContain('relationship_growth -> selective_distance')
    expect(relationship?.gate).toContain('instant_commitment')
    expect(relationship?.gate).toContain('shadow_reactivity')
    expect(relationship?.gate).toContain('assumption_gap')
    expect(relationship?.gate).toContain('forced_closeness')
    expect(relationship?.delay).toContain('premature_labeling')
    expect(relationship?.delay).toContain('confirmation_before_labeling')
    expect(relationship?.delay).toContain('emotionally_loaded_decision')
    expect(relationship?.amplify).toContain('commitment_frame')
    expect(relationship?.amplify).toContain('clarify_expectations')
    expect(relationship?.amplify).toContain('relational_timing_window')
    expect(relationship?.amplify).toContain('bond_definition')
    expect(relationship?.amplify).toContain('cross_confirmed_relationship')
    expect(relationship?.amplify).toContain('natal_pattern_memory')
    expect(relationship?.amplify).toContain('inner_outer_alignment')
    expect(relationship?.amplify).toContain('chemistry_window')
    expect(relationship?.gate).toContain('drama_escalation')
    expect(relationship?.gate).toContain('karmic_projection')
    expect(relationship?.gate).toContain('cross_agreement_gap')
    expect(relationship?.gate).toContain('emotional_flood')
    expect(relationship?.gate).toContain('cold_bonding')
    expect(relationship?.delay).toContain('cross_signal_commitment')
    expect(relationship?.delay).toContain('transit_overreaction')
    expect(relationship?.delay).toContain('passion_overread')
    expect(relationship?.delay).toContain('slow_trust_build')

    expect(move?.amplify).toContain('movement_window')
    expect(move?.amplify).toContain('travel_for_opportunity')
    expect(move?.convert).toContain('move_fast -> staged_move')
    expect(move?.gate).toContain('impulsive_move')
    expect(move?.delay).toContain('housing_commitment')
    expect(move?.amplify).toContain('transit_trigger_window')

    expect(health?.amplify).toContain('healing_routine')
    expect(health?.amplify).toContain('recovery_protocol')
    expect(health?.amplify).toContain('nourishment_routine')
    expect(health?.amplify).toContain('habit_devotion')
    expect(health?.delay).toContain('high_intensity_push')
    expect(health?.gate).toContain('reckless_push')
    expect(health?.delay).toContain('inflammation_spike')
    expect(health?.amplify).toContain('shadow_recovery_check')
    expect(health?.delay).toContain('stress_spike')
    expect(health?.delay).toContain('nervous_system_overload')
    expect(health?.delay).toContain('emotional_fatigue')

    expect(spirituality?.amplify).toContain('spiritual_focus')
    expect(spirituality?.amplify).toContain('meaning_retreat')
    expect(spirituality?.amplify).toContain('mission_focus')
    const career = rules.domains.find((item) => item.domain === 'career')
    const wealth = rules.domains.find((item) => item.domain === 'wealth')
    const timing = rules.domains.find((item) => item.domain === 'timing')
    expect(career?.amplify).toContain('recognition_window')
    expect(career?.amplify).toContain('authority_visibility')
    expect(career?.amplify).toContain('role_definition')
    expect(career?.amplify).toContain('career_alignment')
    expect(career?.amplify).toContain('cross_confirmed_career')
    expect(career?.amplify).toContain('cycle_context')
    expect(career?.amplify).toContain('structural_role_signature')
    expect(career?.amplify).toContain('leadership_spotlight')
    expect(career?.amplify).toContain('talent_reward_window')
    expect(career?.amplify).toContain('expansion_confidence')
    expect(career?.amplify).toContain('precision_planning')
    expect(wealth?.amplify).toContain('structured_gain_window')
    expect(wealth?.amplify).toContain('fortune_window')
    expect(wealth?.amplify).toContain('talent_reward_window')
    expect(wealth?.amplify).toContain('expansion_confidence')
    expect(timing?.amplify).toContain('prestige_timing')
    expect(timing?.amplify).toContain('contact_timing_precision')
    expect(timing?.amplify).toContain('fated_crossroad_window')
    expect(timing?.amplify).toContain('unse_alignment')
    expect(timing?.amplify).toContain('phase_window')
    expect(timing?.amplify).toContain('transit_trigger_window')
    expect(timing?.delay).toContain('premature_statement')
    expect(rules.globalNotes).toContain('verification_pressure_high')
  })

  it('adds rule density from geokguk yongsin twelve-stages and relations', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '목' as any,
      pillarElements: ['목', '화', '토', '금'] as any,
      sibsinDistribution: { 정관: 1, 정재: 1 } as any,
      twelveStages: { 제왕: 1, 병: 1 } as any,
      relations: [{ kind: 'harmony', detail: 'samhap' }, { kind: 'clash', detail: 'wonjin', note: 'tension' }] as any,
      geokguk: 'jeonggwan' as any,
      yongsin: '화' as any,
      currentDaeunElement: '화' as any,
      currentSaeunElement: '목' as any,
      currentWolunElement: '금' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'fire',
      planetHouses: { Sun: 10, Saturn: 10, Moon: 7 } as any,
      planetSigns: { Sun: 'Aries', Saturn: 'Capricorn', Moon: 'Cancer' } as any,
      aspects: [],
      activeTransits: [],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const features = compileFeatureTokens(input)
    const activation = buildActivationEngine({ matrixInput: input, tokens: features.tokens })
    const rules = buildRuleEngine({ activation, tokens: features.tokens })

    const career = rules.domains.find((item) => item.domain === 'career')
    const wealth = rules.domains.find((item) => item.domain === 'wealth')
    const personality = rules.domains.find((item) => item.domain === 'personality')
    const relationship = rules.domains.find((item) => item.domain === 'relationship')
    const health = rules.domains.find((item) => item.domain === 'health')
    const timing = rules.domains.find((item) => item.domain === 'timing')

    expect(career?.amplify).toContain('authority_visibility')
    expect(career?.amplify).toContain('strategy_planning')
    expect(wealth?.amplify).toContain('resource_buffer')
    expect(personality?.amplify).toContain('status_presence')
    expect(relationship?.amplify).toContain('bond_definition')
    expect(relationship?.gate).toContain('projection_bias')
    expect(health?.delay).toContain('overload')
    expect(timing?.gate).toContain('commit_now')
    expect(timing?.amplify).toContain('phase_window')
  })

  it('adds sibsin-specific modulation rules by domain', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '금' as any,
      pillarElements: ['목', '화', '토', '금'] as any,
      sibsinDistribution: {
        비견: 1,
        겁재: 1,
        식신: 1,
        상관: 1,
        편재: 1,
        정재: 1,
        편관: 1,
        정관: 1,
        편인: 1,
        정인: 1,
      } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeonggwan' as any,
      yongsin: '토' as any,
      currentDaeunElement: '수' as any,
      currentSaeunElement: '화' as any,
      currentWolunElement: '목' as any,
      currentIljinElement: '금' as any,
      dominantWesternElement: 'air',
      planetHouses: { Sun: 10, Moon: 7, Saturn: 6 } as any,
      planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Saturn: 'Pisces' } as any,
      aspects: [],
      activeTransits: [],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const features = compileFeatureTokens(input)
    const activation = buildActivationEngine({ matrixInput: input, tokens: features.tokens })
    const rules = buildRuleEngine({ activation, tokens: features.tokens })

    const career = rules.domains.find((item) => item.domain === 'career')
    const relationship = rules.domains.find((item) => item.domain === 'relationship')
    const wealth = rules.domains.find((item) => item.domain === 'wealth')
    const health = rules.domains.find((item) => item.domain === 'health')
    const personality = rules.domains.find((item) => item.domain === 'personality')
    const spirituality = rules.domains.find((item) => item.domain === 'spirituality')

    expect(personality?.amplify).toContain('status_presence')
    expect(personality?.amplify).toContain('meaning_reorientation')
    expect(relationship?.amplify).toContain('boundary_awareness')
    expect(relationship?.delay).toContain('comparison_loop')
    expect(relationship?.delay).toContain('confirmation_before_labeling')
    expect(wealth?.gate).toContain('resource_competition')
    expect(wealth?.delay).toContain('expense_spike')
    expect(wealth?.amplify).toContain('fortune_window')
    expect(wealth?.amplify).toContain('structured_gain_window')
    expect(career?.amplify).toContain('steady_output')
    expect(career?.amplify).toContain('network_leverage')
    expect(career?.gate).toContain('authority_conflict')
    expect(career?.amplify).toContain('contract_alignment')
    expect(career?.amplify).toContain('research_planning')
    expect(health?.amplify).toContain('nourishment_routine')
    expect(health?.delay).toContain('overload')
    expect(spirituality?.amplify).toContain('meaning_retreat')
  })

  it('adds cross-context rules from day-master yongsin and sibsin combinations', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '금' as any,
      pillarElements: ['금', '화', '토', '수'] as any,
      sibsinDistribution: {
        정관: 1,
        편재: 1,
      } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeonggwan' as any,
      yongsin: '화' as any,
      currentDaeunElement: '화' as any,
      currentSaeunElement: '금' as any,
      currentWolunElement: '토' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'fire',
      planetHouses: { Sun: 10, Venus: 2, Saturn: 10 } as any,
      planetSigns: { Sun: 'Aries', Venus: 'Taurus', Saturn: 'Capricorn' } as any,
      aspects: [],
      activeTransits: [],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const features = compileFeatureTokens(input)
    const activation = buildActivationEngine({ matrixInput: input, tokens: features.tokens })
    const rules = buildRuleEngine({ activation, tokens: features.tokens })

    const career = rules.domains.find((item) => item.domain === 'career')
    const wealth = rules.domains.find((item) => item.domain === 'wealth')

    expect(career?.amplify).toContain('authority_visibility')
    expect(career?.amplify).toContain('contract_alignment')
    expect(career?.amplify).toContain('precision_planning')
    expect(wealth?.amplify).toContain('fortune_window')
    expect(wealth?.amplify).toContain('pricing_power')
  })

  it('adds cross-context rules from planet houses and sibsin combinations', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '금' as any,
      pillarElements: ['금', '화', '토', '수'] as any,
      sibsinDistribution: {
        정관: 1,
        편재: 1,
        겁재: 1,
        상관: 1,
        정재: 1,
        정인: 1,
      } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeonggwan' as any,
      yongsin: '화' as any,
      currentDaeunElement: '화' as any,
      currentSaeunElement: '금' as any,
      currentWolunElement: '토' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'air',
      planetHouses: { Mercury: 10, Jupiter: 10, Moon: 7, Venus: 2, Saturn: 6 } as any,
      planetSigns: { Mercury: 'Aquarius', Jupiter: 'Sagittarius', Moon: 'Cancer', Venus: 'Taurus', Saturn: 'Pisces' } as any,
      aspects: [],
      activeTransits: [],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const features = compileFeatureTokens(input)
    const activation = buildActivationEngine({ matrixInput: input, tokens: features.tokens })
    const rules = buildRuleEngine({ activation, tokens: features.tokens })

    const career = rules.domains.find((item) => item.domain === 'career')
    const relationship = rules.domains.find((item) => item.domain === 'relationship')
    const wealth = rules.domains.find((item) => item.domain === 'wealth')
    const health = rules.domains.find((item) => item.domain === 'health')

    expect(career?.amplify).toContain('precision_planning')
    expect(career?.amplify).toContain('contract_alignment')
    expect(career?.amplify).toContain('network_leverage')
    expect(career?.amplify).toContain('authority_visibility')
    expect(relationship?.delay).toContain('emotionally_loaded_decision')
    expect(relationship?.delay).toContain('comparison_loop')
    expect(wealth?.amplify).toContain('pricing_power')
    expect(wealth?.amplify).toContain('structured_gain_window')
    expect(health?.amplify).toContain('recovery_protocol')
    expect(health?.delay).toContain('overload')
  })

  it('adds cross-context rules from day-master geokguk and transit combinations', () => {
    const metalSaturnInput: MatrixCalculationInput = {
      dayMasterElement: '금' as any,
      pillarElements: ['금', '화', '토', '수'] as any,
      sibsinDistribution: { 정관: 1 } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeonggwan' as any,
      yongsin: '화' as any,
      currentDaeunElement: '화' as any,
      currentSaeunElement: '금' as any,
      currentWolunElement: '토' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'earth',
      planetHouses: { Saturn: 10 } as any,
      planetSigns: { Saturn: 'Capricorn' } as any,
      aspects: [],
      activeTransits: ['saturnReturn'],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const metalFeatures = compileFeatureTokens(metalSaturnInput)
    const metalActivation = buildActivationEngine({ matrixInput: metalSaturnInput, tokens: metalFeatures.tokens })
    const metalRules = buildRuleEngine({ activation: metalActivation, tokens: metalFeatures.tokens })
    const metalCareer = metalRules.domains.find((item) => item.domain === 'career')
    const metalTiming = metalRules.domains.find((item) => item.domain === 'timing')

    expect(metalCareer?.amplify).toContain('authority_visibility')
    expect(metalCareer?.amplify).toContain('strategy_planning')
    expect(metalCareer?.delay).toContain('announcement_timing')
    expect(metalTiming?.gate).toContain('commit_now')

    const fireRetroInput: MatrixCalculationInput = {
      dayMasterElement: '화' as any,
      pillarElements: ['화', '토', '금', '수'] as any,
      sibsinDistribution: { 정재: 1 } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeongjae' as any,
      yongsin: '토' as any,
      currentDaeunElement: '토' as any,
      currentSaeunElement: '화' as any,
      currentWolunElement: '금' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'fire',
      planetHouses: { Venus: 7 } as any,
      planetSigns: { Venus: 'Leo' } as any,
      aspects: [],
      activeTransits: ['mercuryRetrograde', 'venusRetrograde'],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const fireFeatures = compileFeatureTokens(fireRetroInput)
    const fireActivation = buildActivationEngine({ matrixInput: fireRetroInput, tokens: fireFeatures.tokens })
    const fireRules = buildRuleEngine({ activation: fireActivation, tokens: fireFeatures.tokens })
    const fireWealth = fireRules.domains.find((item) => item.domain === 'wealth')
    const fireRelationship = fireRules.domains.find((item) => item.domain === 'relationship')

    expect(fireWealth?.gate).toContain('blind_spot_spending')
    expect(fireWealth?.delay).toContain('finalize_terms')
    expect(fireRelationship?.delay).toContain('emotionally_loaded_decision')
  })

  it('adds aspect plus transit timing rules', () => {
    const saturnInput: MatrixCalculationInput = {
      dayMasterElement: '금' as any,
      pillarElements: ['금', '수', '토', '목'] as any,
      sibsinDistribution: { 정관: 1 } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeonggwan' as any,
      yongsin: '화' as any,
      currentDaeunElement: '화' as any,
      currentSaeunElement: '금' as any,
      currentWolunElement: '토' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'earth',
      planetHouses: { Moon: 7, Saturn: 6 } as any,
      planetSigns: { Moon: 'Cancer', Saturn: 'Capricorn' } as any,
      aspects: [{ planet1: 'Moon', planet2: 'Saturn', type: 'square' as any }],
      activeTransits: ['saturnReturn'],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const saturnFeatures = compileFeatureTokens(saturnInput)
    const saturnActivation = buildActivationEngine({ matrixInput: saturnInput, tokens: saturnFeatures.tokens })
    const saturnRules = buildRuleEngine({ activation: saturnActivation, tokens: saturnFeatures.tokens })
    const saturnRelationship = saturnRules.domains.find((item) => item.domain === 'relationship')
    const saturnHealth = saturnRules.domains.find((item) => item.domain === 'health')
    const saturnTiming = saturnRules.domains.find((item) => item.domain === 'timing')

    expect(saturnRelationship?.gate).toContain('forced_closeness')
    expect(saturnRelationship?.gate).toContain('cold_bonding')
    expect(saturnRelationship?.delay).toContain('slow_trust_build')
    expect(saturnHealth?.delay).toContain('emotional_fatigue')
    expect(saturnTiming?.gate).toContain('commit_now')

    const jupiterInput: MatrixCalculationInput = {
      dayMasterElement: '목' as any,
      pillarElements: ['목', '수', '토', '화'] as any,
      sibsinDistribution: { 편재: 1 } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'jeongjae' as any,
      yongsin: '수' as any,
      currentDaeunElement: '수' as any,
      currentSaeunElement: '목' as any,
      currentWolunElement: '화' as any,
      currentIljinElement: '금' as any,
      dominantWesternElement: 'fire',
      planetHouses: { Sun: 10, Jupiter: 10 } as any,
      planetSigns: { Sun: 'Leo', Jupiter: 'Sagittarius' } as any,
      aspects: [{ planet1: 'Sun', planet2: 'Jupiter', type: 'trine' as any }],
      activeTransits: ['jupiterReturn'],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const jupiterFeatures = compileFeatureTokens(jupiterInput)
    const jupiterActivation = buildActivationEngine({ matrixInput: jupiterInput, tokens: jupiterFeatures.tokens })
    const jupiterRules = buildRuleEngine({ activation: jupiterActivation, tokens: jupiterFeatures.tokens })
    const jupiterCareer = jupiterRules.domains.find((item) => item.domain === 'career')
    const jupiterTiming = jupiterRules.domains.find((item) => item.domain === 'timing')

    expect(jupiterCareer?.amplify).toContain('expansion_confidence')
    expect(jupiterCareer?.amplify).toContain('recognition_window')
    expect(jupiterTiming?.amplify).toContain('phase_window')

    const retroInput: MatrixCalculationInput = {
      dayMasterElement: '화' as any,
      pillarElements: ['화', '목', '토', '금'] as any,
      sibsinDistribution: { 상관: 1 } as any,
      twelveStages: {},
      relations: [],
      geokguk: 'sanggwan' as any,
      yongsin: '토' as any,
      currentDaeunElement: '토' as any,
      currentSaeunElement: '화' as any,
      currentWolunElement: '금' as any,
      currentIljinElement: '수' as any,
      dominantWesternElement: 'fire',
      planetHouses: { Mercury: 10, Mars: 3 } as any,
      planetSigns: { Mercury: 'Aries', Mars: 'Cancer' } as any,
      aspects: [{ planet1: 'Mercury', planet2: 'Mars', type: 'square' as any }],
      activeTransits: ['mercuryRetrograde'],
      asteroidHouses: {},
      extraPointSigns: {},
      advancedAstroSignals: {},
      lang: 'ko',
    }

    const retroFeatures = compileFeatureTokens(retroInput)
    const retroActivation = buildActivationEngine({ matrixInput: retroInput, tokens: retroFeatures.tokens })
    const retroRules = buildRuleEngine({ activation: retroActivation, tokens: retroFeatures.tokens })
    const retroCareer = retroRules.domains.find((item) => item.domain === 'career')
    const retroMove = retroRules.domains.find((item) => item.domain === 'move')

    expect(retroCareer?.gate).toContain('premature_statement')
    expect(retroCareer?.delay).toContain('emotionally_loaded_decision')
    expect(retroMove?.gate).toContain('route_assumption')
  })
})
