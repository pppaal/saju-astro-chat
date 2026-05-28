/**
 * System prompt 의 "근거 게이트" + "검증 체크리스트" — counselor route 가
 * compatibility 응답을 위한 가드레일로 LLM 에 prepend.
 *
 * 이전 fortuneWithIcp.ts 안에 묻혀있던 함수. ICP 모듈 제거 시 이 함수만
 * (ICP 의존성 없음) 살아남기 위해 분리.
 */

export function buildEvidenceGroundingGuide(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '[근거 게이트]',
      '- 각 핵심 섹션은 최소 1개 이상 명시 근거를 포함한다.',
      '- 답변 전체 기준 최소 3개 근거 사용: 사주 1 + 점성 1 + 메트릭스/타이밍 1.',
      '- 근거가 약하면 강한 단정과 비가역 행동 권유를 금지한다.',
      '- 커뮤니케이션/문서 리스크가 보이면 서명/확정/발송/결제 즉시 실행을 금지한다.',
      '',
      '[검증 체크리스트]',
      '- recommendation과 caution은 서로 모순되면 안 된다.',
      '- 같은 문장을 재사용하지 않는다.',
      '- 실행 가이드는 검증 가능한 체크포인트 2개 이상 포함한다.',
    ].join('\n')
  }

  return [
    '[Evidence Gate]',
    '- Every core section must include at least one explicit evidence item.',
    '- Use at least 3 evidence points overall: saju 1 + astrology 1 + matrix/timing 1.',
    '- If evidence is weak, avoid strong claims and irreversible action recommendations.',
    '- If communication/document risk exists, block immediate sign/finalize/send/pay actions.',
    '',
    '[Validation Checklist]',
    '- Recommendations must not contradict cautions.',
    '- Do not reuse the same sentence twice.',
    '- Execution guidance must include at least 2 verifiable checkpoints.',
  ].join('\n')
}
