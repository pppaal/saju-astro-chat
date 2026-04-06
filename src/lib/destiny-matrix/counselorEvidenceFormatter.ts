import type { CounselorEvidencePacketLike } from '@/lib/destiny-matrix/counselorEvidenceTypes'

export function formatCounselorEvidencePacket(
  packet: CounselorEvidencePacketLike | null | undefined,
  lang: 'ko' | 'en'
): string {
  if (!packet || !packet.focusDomain) return ''

  const singleSubject = packet.singleSubjectView
  const actionBlock = packet.projections?.action
  const timingBlock = packet.projections?.timing
  const riskBlock = packet.projections?.risk
  const branchBlock = packet.projections?.branches
  const topBranches = (packet.branchSet || []).slice(0, 3)
  const openingWhyLines = (packet.whyStack || []).slice(0, 2)
  const branchCandidates =
    (singleSubject?.branches || []).length > 0
      ? (singleSubject?.branches || []).slice(0, 3).map((branch) => ({
          summary: branch.summary,
          entry: branch.entryConditions,
          abort: branch.abortConditions,
          nextMove: branch.nextMove,
        }))
      : topBranches.map((branch) => ({
          summary: branch.summary,
          entry: branch.entry || [],
          abort: branch.abort || [],
          nextMove: branch.sustain?.[0] || branch.entry?.[0] || '',
        }))
  const actionDetails = [
    ...(actionBlock?.detailLines || []).slice(0, 2),
    ...(actionBlock?.nextMoves || []).slice(0, 2),
  ].filter(Boolean)
  const timingDetails = [
    ...(timingBlock?.detailLines || []).slice(0, 2),
    ...(timingBlock?.counterweights || []).slice(0, 1),
  ].filter(Boolean)
  const riskDetails = [
    ...(riskBlock?.detailLines || []).slice(0, 2),
    ...(riskBlock?.counterweights || []).slice(0, 1),
  ].filter(Boolean)
  const keyEvidence = [
    ...(packet.projections?.structure?.drivers || []).slice(0, 1),
    ...(packet.projections?.evidence?.detailLines || []).slice(0, 2),
    ...(packet.projections?.evidence?.drivers || []).slice(0, 2),
  ]
    .filter(Boolean)
    .slice(0, 4)

  const commonLines = [
    '[Counselor Answer Plan]',
    `answer=${singleSubject?.directAnswer || packet.canonicalBrief?.answerThesis || actionBlock?.summary || 'none'}`,
    `action_focus=${packet.canonicalBrief?.actionFocusDomain || packet.focusDomain || 'none'}`,
    `risk_focus=${packet.riskAxisLabel || 'none'}`,
    `top_decision=${packet.canonicalBrief?.topDecisionLabel || packet.canonicalBrief?.topDecisionAction || 'none'}`,
    `opening_rationale=${singleSubject?.actionAxis.whyThisFirst || openingWhyLines[0] || packet.canonicalBrief?.answerThesis || 'none'}`,
    `next_move=${singleSubject?.nextMove || actionDetails[0] || 'none'}`,
    '',
    '[Current Read]',
    `current_direct=${singleSubject?.directAnswer || actionDetails[0] || 'none'}`,
    `current_why=${singleSubject?.actionAxis.whyThisFirst || actionDetails[1] || openingWhyLines[1] || 'none'}`,
    `current_risk=${singleSubject?.riskAxis.warning || riskDetails[0] || riskBlock?.summary || packet.guardrail || 'none'}`,
    '',
    '[Timing]',
    `window=${singleSubject?.timingState.bestWindow || packet.topTimingWindow?.window || 'none'}`,
    `why_now=${singleSubject?.timingState.whyNow || packet.topTimingWindow?.whyNow || timingBlock?.summary || 'none'}`,
    `why_not_yet=${singleSubject?.timingState.whyNotYet || packet.topTimingWindow?.timingConflictNarrative || 'none'}`,
    ...timingDetails.slice(0, 2).map((line, index) => `timing_${index + 1}=${line}`),
    '',
    '[Branch Options]',
    ...(branchCandidates.length > 0
      ? branchCandidates.flatMap((branch, index) => [
          `branch_${index + 1}=${branch.summary}`,
          ...(branch.entry || []).slice(0, 1).map((line) => `branch_${index + 1}_entry=${line}`),
          ...(branch.abort || []).slice(0, 1).map((line) => `branch_${index + 1}_stop=${line}`),
          ...(branch.nextMove ? [`branch_${index + 1}_next=${branch.nextMove}`] : []),
        ])
      : (branchBlock?.detailLines || [])
          .slice(0, 2)
          .map((line, index) => `branch_${index + 1}=${line}`)),
    '',
    '[Risk Guardrails]',
    `risk=${singleSubject?.riskAxis.warning || riskBlock?.summary || packet.guardrail || 'none'}`,
    ...(singleSubject?.riskAxis.hardStops || [])
      .slice(0, 2)
      .map((line, index) => `hard_stop_${index + 1}=${line}`),
    '',
    '[Evidence Cues]',
    ...(keyEvidence.length > 0
      ? keyEvidence.slice(0, 3).map((line, index) => `evidence_${index + 1}=${line}`)
      : ['evidence_1=none']),
    '',
  ]

  const responseContractKo = [
    '- 첫 문장은 질문에 대한 직접 답으로 시작하고, 둘째 문장 안에서 현재 국면을 단정적으로 정리하세요.',
    '- 첫 두 문장에는 current_direct, current_why, next_move의 핵심을 흡수해 왜 지금 이런 답이 나오는지 바로 이해되게 쓰세요.',
    '- 다음 문단에서는 structure, timing, why_now, why_not_yet를 함께 설명하고 준비도와 촉발 조건의 어긋남이 있으면 분명히 적으세요.',
    '- 그 다음 문단에서는 action과 risk를 같이 다루세요. 지금 할 것, 미룰 것, 서두르면 손해인 이유를 분리해서 적으세요.',
    '- 가능하면 Branch Options를 사용해 2~3개의 현실 경로를 구분하세요. 정답 하나처럼 몰아가지 마세요.',
    '- 마지막 문단에는 Risk Guardrails와 재확인 기준을 넣으세요. 사인, 확정, 송금, 결제 같은 비가역 행동은 성급히 밀지 마세요.',
    '- Direct Answer Seed, Timing, Action, Risk, Branch Options, Evidence Cues를 우선 사용하고 엔진 라벨을 그대로 반복하지 마세요.',
    '- 문체는 상담사처럼 짧고 단정하게 유지하세요. 추상 명사만 늘어놓지 말고 실제 행동 문장으로 마무리하세요.',
    '- 전체 분량은 650~1100자 사이의 자연스러운 한국어 답변으로 맞추세요.',
  ]

  if (lang === 'ko') {
    return [...commonLines, '[Response Contract]', ...responseContractKo].join('\n')
  }

  if (responseContractKo.length < 0) {
    return [
      ...commonLines,
      '[Response Contract]',
      '- 첫 문장은 질문에 대한 직접 답으로 시작하고, 둘째 문장 안에서 현재 국면을 단정적으로 정리하세요.',
      '- 첫 두 문장에는 opening_rationale_1과 opening_rationale_2의 핵심을 흡수해 왜 이런 결론이 나왔는지 바로 이해되게 하세요.',
      '- 그 다음 문단에서는 구조와 타이밍을 함께 설명하고, 준비도와 촉발의 어긋남이 있으면 분명히 적으세요.',
      '- 다음 문단에서는 행동과 리스크를 같이 설명하세요. 지금 할 것, 미룰 것, 서두르면 손해인 이유를 분리해서 적으세요.',
      '- 답변은 한 줄 운세처럼 쓰지 말고 구조, 주기, 촉발, 리스크, 행동, 보정이 함께 보이게 쓰세요.',
      '- 가능한 경우 Branch Options를 사용해 2~3개의 현실 경로를 구분하세요. 정답 하나처럼 몰아가지 마세요.',
      '- 마지막 문단에는 위험 신호와 재확인 기준을 넣으세요. 사인, 확정, 송금, 결제 같은 비가역 행동은 섣불리 밀지 마세요.',
      '- Direct Answer Seed, Timing, Action, Risk, Branch Options, Evidence Cues를 우선 사용하고, 엔진 라벨을 그대로 반복하지 마세요.',
      '- 문체는 상담사처럼 짧고 단정하게 유지하세요. 추상 명사만 늘어놓지 말고 실제 행동 문장으로 마무리하세요.',
      '- 전체 분량은 650~1100자 사이의 자연스러운 한국어 답변으로 맞추세요.',
    ].join('\n')
  }

  return [
    ...commonLines,
    '[Response Contract]',
    '- Open with a direct answer and a declarative read of the current phase.',
    '- In those first two sentences, explicitly absorb opening_rationale_1 and opening_rationale_2 so the user immediately understands why this conclusion is being made.',
    '- In the second paragraph, explain structure and timing together, and explicitly name any readiness/trigger/convergence mismatch.',
    '- In the third paragraph, translate conflict into action: what to do now, what to delay, and why.',
    '- Make the answer reflect structure, cycle, trigger, risk, action, and calibration rather than one flat verdict.',
    '- When possible, do not present a single fixed destiny; use Branch Options to distinguish 2-3 realistic paths.',
    '- End with risk and a recheck checklist; if caution signals exist, do not push irreversible actions (sign/finalize/send/pay) immediately.',
    '- Prefer Direct Answer Seed, Timing, Action, Risk, Branch Options, and Evidence Cues over raw engine labels.',
  ].join('\n')
}


