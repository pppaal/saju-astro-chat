import { describe, expect, it } from 'vitest'
import {
  analyzeCounselorQuestion,
  buildCounselingStructureGuide,
  describeFocusDomain,
  inferCounselorFocusDomain,
  mapFocusDomainToLayerDomain,
  mapFocusDomainToTheme,
} from '@/app/api/destiny-map/chat-stream/lib/focusDomain'

describe('focusDomain helpers', () => {
  it('infers relationship focus from reconciliation-style questions', () => {
    expect(
      inferCounselorFocusDomain({
        lastUserMessage: '재회 가능성 있을까? 그 사람이 다시 연락할지 궁금해',
        theme: 'chat',
      })
    ).toBe('relationship')
  })

  it('infers career focus from work questions', () => {
    expect(
      inferCounselorFocusDomain({
        lastUserMessage: 'Should I leave my company and move jobs this year?',
        theme: 'chat',
      })
    ).toBe('career')
  })

  it('falls back to personality when the message is broad', () => {
    expect(
      inferCounselorFocusDomain({
        lastUserMessage: '요즘 제 흐름이 어떤지 전체적으로 보고 싶어요',
        theme: 'chat',
      })
    ).toBe('personality')
  })

  it('maps inferred domains to prompt and layer keys consistently', () => {
    expect(mapFocusDomainToTheme('relationship')).toBe('love')
    expect(mapFocusDomainToLayerDomain('wealth')).toBe('money')
    expect(mapFocusDomainToLayerDomain('personality')).toBeNull()
    expect(describeFocusDomain('health', 'en')).toContain('health')
  })

  it('captures multi-intent decision questions with timing pressure', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '연애도 걱정인데 이번 달에 이직까지 해야 할지 너무 불안해',
      theme: 'chat',
    })

    expect(analysis.primaryDomain).toBe('career')
    expect(analysis.secondaryDomains).toContain('relationship')
    expect(analysis.emotionalTone).toBe('anxious')
    expect(analysis.isDecisionQuestion).toBe(true)
    expect(analysis.needsTimingGuidance).toBe(true)
    expect(analysis.confidence).toBe('high')
  })

  it('builds a counseling structure guide that matches the inferred frame', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: 'Should I quit now or wait until next quarter?',
      theme: 'chat',
    })

    expect(buildCounselingStructureGuide(analysis, 'en')).toContain('move now or wait')
  })
})
