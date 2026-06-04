export function normalizeUserFacingGuidance(
  text: string | undefined | null,
  lang: 'ko' | 'en'
): string {
  const value = String(text || '').trim()
  if (!value) return ''

  if (lang === 'en') {
    return value
      .replace(/\bRecheck the route\b/gi, 'Compare route options')
      .replace(/\brecheck points?\b/gi, 'checkpoints')
      .replace(/\brecheck condition(s)?\b/gi, 'check conditions')
      .replace(/\b24h recheck slot\b/gi, '24h review slot')
      .replace(/\brecheck slot\b/gi, 'review slot')
      .replace(/\brecheck\b/gi, 'double-check')
      .replace(/\bverify scope\/deadline\/ownership\b/gi, 'review scope, deadline, and ownership')
      .replace(/\bstaged commitment\b/gi, 'phased commitment')
      .replace(/\bstaged verification\b/gi, 'phased review')
      .replace(/\bpace tuning\b/gi, 'pace spacing')
      .replace(/\bslow down\b/gi, 'avoid rushing')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return value
    .replace(/경로 재확인 우선/g, '경로 비교 우선')
    .replace(/재확인 포인트/g, '확인 기준')
    .replace(/재확인 조건/g, '확인 기준')
    .replace(/재확인 지점/g, '확인 지점')
    .replace(/재확인 슬롯/g, '점검 슬롯')
    .replace(/재확인 창/g, '점검 창')
    .replace(/재검토 슬롯/g, '다시 검토할 슬롯')
    .replace(/재확인 순서/g, '확인 순서')
    .replace(/재확인 단계/g, '확인 단계')
    .replace(/재확인 루틴/g, '확인 루틴')
    .replace(/재확인 1건/g, '확인 1건')
    .replace(/한 줄 요약 재확인/g, '한 줄 요약 확인')
    .replace(/재확인 후 진행하세요/g, '한 번 더 확인한 뒤 진행하세요')
    .replace(/재확인이 필요합니다/g, '한 번 더 확인하는 편이 안전합니다')
    .replace(/재확인을 끼워 넣는 편이 낫습니다/g, '중간 점검을 끼워 넣는 편이 낫습니다')
    .replace(/검증/g, '점검')
    .replace(/단계적 검증/g, '단계적 점검')
    .replace(/검증 루틴/g, '점검 루틴')
    .replace(/검증 필요/g, '점검 필요')
    .replace(/검증하세요/g, '점검하세요')
    .replace(/속도 조절/g, '간격 조정')
    .replace(/조건 확인/g, '조건 점검')
    .replace(/확정보다/g, '서둘러 확정하기보다')
    .replace(/\s+/g, ' ')
    .trim()
}
