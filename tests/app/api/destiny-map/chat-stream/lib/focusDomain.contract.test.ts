import { describe, expect, it } from 'vitest'
import {
  analyzeCounselorQuestion,
  buildCounselingStructureGuide,
  describeQuestionAnalysis,
} from '@/app/api/destiny-map/chat-stream/lib/focusDomain'

describe('focusDomain frame contracts', () => {
  it('uses timing-first framing for explicit timing questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '취업은 언제 열리고 이번 여름에 옮겨도 되는지 알고 싶어요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('timing_window')
    expect(analysis.needsTimingGuidance).toBe(true)
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain('지금 해도 되는지')
    expect(describeQuestionAnalysis(analysis, 'ko')).toContain('타이밍 판단형')
  })

  it('uses decision-first framing for career choice questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: 'Should I quit now or wait until next quarter for a better offer?',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('career_decision')
    expect(analysis.isDecisionQuestion).toBe(true)
    expect(buildCounselingStructureGuide(analysis, 'en')).toContain(
      'main options -> risk comparison'
    )
    expect(describeQuestionAnalysis(analysis, 'en')).toContain('career decision')
  })

  it('uses relationship-repair framing for reconciliation questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '재회가 될지, 다시 연락이 올지 관계 흐름을 보고 싶어요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('relationship_repair')
    expect(analysis.primaryDomain).toBe('relationship')
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain('현재 거리감 -> 막힌 이유')
  })

  it('uses health-recovery framing for burnout and recovery questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '요즘 번아웃이 심하고 잠이 깨는데 어떻게 회복해야 할까요?',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('health_recovery')
    expect(analysis.primaryDomain).toBe('health')
    expect(buildCounselingStructureGuide(analysis, 'en')).toContain(
      'present condition -> overload signs'
    )
  })

  it('uses identity reflection for broad self-understanding questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '나는 어떤 사람이고 앞으로 어떤 방향으로 살아야 할까?',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('identity_reflection')
    expect(analysis.primaryDomain).toBe('personality')
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain('핵심 성향 -> 반복 패턴')
  })
})
