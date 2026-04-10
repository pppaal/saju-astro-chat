import { describe, expect, it } from 'vitest'
import {
  analyzeCounselorQuestion,
  buildCounselingStructureGuide,
  describeQuestionAnalysis,
} from '@/app/api/destiny-map/chat-stream/lib/focusDomain'

describe('focusDomain frame contracts', () => {
  it('uses timing-first framing for explicit timing questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '언제 움직여야 하고 이번 달 안에 결정해도 되는지 알고 싶어요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('timing_window')
    expect(analysis.needsTimingGuidance).toBe(true)
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain('지금 움직일지 보류할지')
    expect(describeQuestionAnalysis(analysis, 'ko')).toContain('타이밍 판단')
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
      lastUserMessage: '재회하고 싶은데 다시 연락해도 되는지, 지금은 어떤 거리감이 맞는지 궁금해요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('relationship_repair')
    expect(analysis.primaryDomain).toBe('relationship')
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain('현재 거리감 -> 막히는 이유')
  })

  it('uses relationship commitment framing for spouse and marriage questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage:
        'Will this relationship turn into marriage and what kind of spouse is likely to stay long term?',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('relationship_commitment')
    expect(analysis.primaryDomain).toBe('relationship')
    expect(buildCounselingStructureGuide(analysis, 'en')).toContain(
      'partner pattern -> commitment conditions'
    )
  })

  it('uses health-recovery framing for burnout and recovery questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '요즘 번아웃이 심한데 수면과 회복 리듬을 어떻게 다시 잡아야 할까요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('health_recovery')
    expect(analysis.primaryDomain).toBe('health')
    expect(buildCounselingStructureGuide(analysis, 'en')).toContain(
      'present condition -> overload signs'
    )
  })

  it('uses move lease framing for rent and contract questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage:
        'Should I renew the lease, renegotiate the deposit, or move out this summer?',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('move_lease')
    expect(buildCounselingStructureGuide(analysis, 'en')).toContain(
      'lease conditions -> cost and deposit pressure'
    )
  })

  it('uses move relocation framing for relocation and base questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage:
        '이사할지 말지 고민인데, 어디를 거점으로 잡아야 일과 회복이 같이 나아질지 보고 싶어요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('move_relocation')
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain(
      '현재 거점 -> 일과 회복에 미치는 영향'
    )
  })

  it('uses identity reflection for broad self-understanding questions', () => {
    const analysis = analyzeCounselorQuestion({
      lastUserMessage: '저는 어떤 사람이고 앞으로 어떤 방향으로 살아야 하는지 알고 싶어요',
      theme: 'chat',
    })

    expect(analysis.frame).toBe('identity_reflection')
    expect(analysis.primaryDomain).toBe('personality')
    expect(buildCounselingStructureGuide(analysis, 'ko')).toContain('기본 구조 -> 반복 패턴')
  })
})
