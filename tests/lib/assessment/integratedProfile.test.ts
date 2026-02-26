import {
  INTEGRATED_PROFILE_IDS,
  computeIcpDimensions,
  computeIntegratedProfileId,
} from '@/lib/assessment/integratedProfile'

const personaDecisionPrimary = {
  axes: {
    energy: { score: 55 },
    cognition: { score: 58 },
    decision: { score: 84 },
    rhythm: { score: 52 },
  },
  typeCode: 'RSLA',
}

const personaEnergyPrimary = {
  axes: {
    energy: { score: 28 },
    cognition: { score: 48 },
    decision: { score: 53 },
    rhythm: { score: 50 },
  },
  typeCode: 'GSHF',
}

describe('computeIntegratedProfileId', () => {
  it('maps assertive ICP pattern + decision-primary personality to D_A deterministically', () => {
    const icpAnswers = {
      ag_02: '5',
      re_04: '3',
      wa_03: '3',
      ag_04: '2',
      bo_02: '5',
      re_01: '3',
      wa_04: '2',
      bo_03: '5',
    }

    const icpDims = computeIcpDimensions(icpAnswers)
    const profileId = computeIntegratedProfileId(personaDecisionPrimary, icpDims)

    expect(profileId).toBe('D_A')
    expect(INTEGRATED_PROFILE_IDS).toContain(profileId)
  })

  it('maps attuned ICP pattern + decision-primary personality to D_T deterministically', () => {
    const icpAnswers = {
      ag_02: '2',
      re_04: '2',
      wa_03: '5',
      ag_04: '4',
      bo_02: '3',
      re_01: '3',
      wa_04: '4',
      bo_03: '3',
    }

    const icpDims = computeIcpDimensions(icpAnswers)
    const profileId = computeIntegratedProfileId(personaDecisionPrimary, icpDims)

    expect(profileId).toBe('D_T')
    expect(INTEGRATED_PROFILE_IDS).toContain(profileId)
  })

  it('maps processing ICP pattern + energy-primary personality to E_P deterministically', () => {
    const icpAnswers = {
      ag_02: '3',
      re_04: '5',
      wa_03: '3',
      ag_04: '3',
      bo_02: '3',
      re_01: '2',
      wa_04: '3',
      bo_03: '3',
    }

    const icpDims = computeIcpDimensions(icpAnswers)
    const profileId = computeIntegratedProfileId(personaEnergyPrimary, icpDims)

    expect(profileId).toBe('E_P')
    expect(INTEGRATED_PROFILE_IDS).toContain(profileId)
  })
})
