import { sanitizeUserFacingNarrative, sentenceKey } from './reportNarrativeSanitizer'
import { formatNarrativeParagraphs } from './reportNarrativeFormatting'

export function getReportDomainLabel(domain: string, lang: 'ko' | 'en'): string {
  const koLabels: Record<string, string> = {
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    move: '이동',
    personality: '성향',
    spirituality: '장기 방향',
    timing: '타이밍',
  }
  const enLabels: Record<string, string> = {
    career: 'career',
    relationship: 'relationships',
    wealth: 'wealth',
    health: 'health',
    move: 'movement',
    personality: 'personality',
    spirituality: 'direction',
    timing: 'timing',
  }
  return lang === 'ko' ? koLabels[domain] || domain : enLabels[domain] || domain
}

export function localizeReportNarrativeText(text: string | undefined | null, lang: 'ko' | 'en'): string {
  const value = String(text || '').trim()
  if (!value || lang !== 'ko') return value
  return value
    .replace(/배경 구조축/g, '삶의 배경 흐름')
    .replace(/전면 행동축/g, '지금 먼저 움직여야 할 영역')
    .replace(/행동축/g, '실제 행동 방향')
    .replace(/중심축/g, '중심 흐름')
    .replace(/리스크축/g, '가장 조심해야 할 변수')
    .replace(/\bpersonality\b/gi, '성향')
    .replace(/\bcareer\b/gi, '커리어')
    .replace(/\brelationship\b/gi, '관계')
    .replace(/\bwealth\b/gi, '재정')
    .replace(/\bhealth\b/gi, '건강')
    .replace(/\bmove\b/gi, '이동')
    .replace(/\bspirituality\b/gi, '장기 방향')
    .replace(/\bnow\b/gi, '지금')
    .replace(/\bweek\b/gi, '주 단위')
    .replace(/\bfortnight\b/gi, '2주 단위')
    .replace(/\bmonth\b/gi, '월 단위')
    .replace(/\bseason\b/gi, '분기 단위')
    .replace(/\bcaution\b/gi, '주의 신호')
    .replace(/\bdowngrade pressure\b/gi, '하향 조정 압력')
    .replace(/\bgeokguk strength\b/gi, '격국 응집력')
    .replace(/\bdebt restructure\b/gi, '부채 재정리')
    .replace(/\bliquidity defense\b/gi, '유동성 방어')
    .replace(/\bexpense spike\b/gi, '지출 급증 대응')
    .replace(/\bmap full debt stack\b/gi, '전체 부채 구조를 다시 정리하기')
    .replace(/\bwealth volatility pattern\b/gi, '재정 변동성 흐름')
    .replace(/\bcareer expansion pattern\b/gi, '커리어 확장 흐름')
    .replace(/\brelationship tension pattern\b/gi, '관계 긴장 흐름')
    .replace(/\brelationship activation pattern\b/gi, '관계 활성화 흐름')
    .replace(/\bcontract negotiation\b/gi, '조건 협상')
    .replace(/\bspecialist track\b/gi, '전문화 트랙')
    .replace(/\bpromotion review\b/gi, '승진 검토')
    .replace(/\bcommute restructure\b/gi, '?? ?? ???')
    .replace(/\broute recheck\b/gi, '?? ???')
    .replace(/\bbasecamp reset\b/gi, '?? ?? ???')
    .replace(/\blease decision review\b/gi, '?? ?? ???')
    .replace(/\bhousing search\b/gi, '??? ??')
    .replace(/\brelocation\b/gi, '??')
    .replace(/\bList promotion criteria\b/gi, '승진 판단 기준을 정리하기')
    .replace(/\bList leverage points\b/gi, '협상 포인트를 정리하기')
    .replace(/\bName your narrow edge\b/gi, '자신의 전문 포지션을 명확히 하기')
    .replace(/\bExpansion without role clarity can create delivery strain\.?\b/gi, '역할과 범위가 불분명하면 실행 부담이 커질 수 있습니다')
    .replace(/커리어은/g, '커리어는')
    .replace(/관계은/g, '관계는')
    .replace(/재정은/g, '재정은')
    .replace(/건강은/g, '건강은')
    .replace(/패턴 패턴/g, '패턴')
    .replace(/\bopportunity leverage\b/gi, '기회 활용')
    .replace(/\bmoney expansion\b/gi, '재정 확장')
    .replace(/\brecovery delay\b/gi, '회복 지연')
    .replace(/\broutine\b/gi, '루틴')
    .replace(/\bhealth pressure\b/gi, '건강 압력')
    .replace(/\brelationship pressure\b/gi, '관계 압력')
    .replace(/\bcareer pressure\b/gi, '커리어 압력')
    .replace(/\bmove pressure\b/gi, '이동 압력')
    .replace(/\bcashflow\b/gi, '현금흐름')
    .replace(
      /\b\w+\s+stayed secondary because total support remained below the winner\b/gi,
      '최종 지지가 승자축보다 약해 보조축에 머물렀습니다'
    )
    .replace(
      /([가-힣]+)\s+stayed secondary because total support remained below the winner/gi,
      '$1은 최종 지지가 승자축보다 약해 보조축에 머물렀습니다'
    )
    .replace(/밀는/g, '미는')
    .replace(/중단는/g, '중단은')
    .replace(/커리어은/g, '커리어는')
    .replace(/관계은/g, '관계는')
    .replace(/타이밍와/g, '타이밍과')
    .replace(/장기 방향와/g, '장기 방향과')
    .replace(/편이 맞습니다\.입니다\./g, '편이 맞습니다.')
    .replace(/트랜짓가/g, '트랜짓이')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getTimingWindowLabel(
  window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+',
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    const labels = {
      now: '지금',
      '1-3m': '1~3개월',
      '3-6m': '3~6개월',
      '6-12m': '6~12개월',
      '12m+': '1년 이후',
    }
    return labels[window]
  }
  const labels = {
    now: 'now',
    '1-3m': '1-3 months',
    '3-6m': '3-6 months',
    '6-12m': '6-12 months',
    '12m+': '12+ months',
  }
  return labels[window]
}

export function getWesternElementLabel(element: string | undefined, lang: 'ko' | 'en'): string {
  if (!element) return lang === 'ko' ? '미상' : 'unknown'
  const normalized = String(element).trim().toLowerCase()
  const koLabels: Record<string, string> = {
    fire: '불',
    earth: '흙',
    air: '바람',
    water: '물',
    불: '불',
    흙: '흙',
    바람: '바람',
    물: '물',
  }
  const enLabels: Record<string, string> = {
    fire: 'fire',
    earth: 'earth',
    air: 'air',
    water: 'water',
    불: 'fire',
    흙: 'earth',
    바람: 'air',
    물: 'water',
  }
  return lang === 'ko'
    ? koLabels[normalized] || String(element)
    : enLabels[normalized] || String(element)
}

export function getElementByStemName(stem: string): string | undefined {
  const mapping: Record<string, string> = {
    갑: '목',
    을: '목',
    병: '화',
    정: '화',
    무: '토',
    기: '토',
    경: '금',
    신: '금',
    임: '수',
    계: '수',
    甲: '목',
    乙: '목',
    丙: '화',
    丁: '화',
    戊: '토',
    己: '토',
    庚: '금',
    辛: '금',
    壬: '수',
    癸: '수',
  }
  return mapping[stem]
}

export function hasBatchim(text: string | undefined): boolean {
  if (!text) return false
  const last = text.trim().charCodeAt(text.trim().length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}

export function withSubjectParticle(text: string | undefined): string {
  if (!text) return ''
  return `${text}${hasBatchim(text) ? '이' : '가'}`
}

export function localizePlanetName(
  planet: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  lang: 'ko' | 'en'
): string {
  if (lang !== 'ko') return planet
  const labels: Record<string, string> = {
    Sun: '태양',
    Moon: '달',
    Mercury: '수성',
    Venus: '금성',
    Mars: '화성',
    Jupiter: '목성',
    Saturn: '토성',
  }
  return labels[planet] || planet
}

export function localizeSignName(sign: string | undefined, lang: 'ko' | 'en'): string {
  if (!sign) return ''
  if (lang !== 'ko') return sign
  const labels: Record<string, string> = {
    Aries: '양자리',
    Taurus: '황소자리',
    Gemini: '쌍둥이자리',
    Cancer: '게자리',
    Leo: '사자자리',
    Virgo: '처녀자리',
    Libra: '천칭자리',
    Scorpio: '전갈자리',
    Sagittarius: '사수자리',
    Capricorn: '염소자리',
    Aquarius: '물병자리',
    Pisces: '물고기자리',
  }
  return labels[String(sign)] || String(sign)
}

export function replaceReportDomainTokens(text: string, lang: 'ko' | 'en'): string {
  const value = String(text || '')
  if (!value || lang !== 'ko') return value
  return value
    .replace(/\bcareer\b/gi, '커리어')
    .replace(/\brelationships?\b/gi, '관계')
    .replace(/\bwealth\b/gi, '재정')
    .replace(/\bhealth\b/gi, '건강')
    .replace(/\bmove(?:ment)?\b/gi, '이동')
    .replace(/\bpersonality\b/gi, '성향')
    .replace(/\bspirituality\b/gi, '장기 방향')
    .replace(/\btiming\b/gi, '타이밍')
}

export function normalizeNarrativeCoreText(value: string | undefined | null, lang: 'ko' | 'en'): string {
  const cleaned = sanitizeUserFacingNarrative(
    replaceReportDomainTokens(String(value || ''), lang)
      .replace(/commit_now/gi, lang === 'ko' ? '즉시 확정' : 'immediate commitment')
      .replace(/staged_commit/gi, lang === 'ko' ? '단계 실행' : 'staged execution')
      .replace(/\bverify\b/gi, lang === 'ko' ? '확인' : 'review')
      .replace(/\bprepare\b/gi, lang === 'ko' ? '준비 우선' : 'prepare first')
      .replace(/\bexecute\b/gi, lang === 'ko' ? '실행' : 'execute')
      .replace(/\bTransit\s+saturnReturn\b/gi, lang === 'ko' ? '책임 압력 신호' : 'responsibility pressure')
      .replace(/\bTransit\s+jupiterReturn\b/gi, lang === 'ko' ? '확장 신호' : 'expansion signal')
      .replace(/\bTransit\s+nodeReturn\b/gi, lang === 'ko' ? '방향 전환 신호' : 'direction-shift signal')
      .replace(/\bTransit\s+mercuryRetrograde\b/gi, lang === 'ko' ? '소통 재검토 신호' : 'communication review signal')
      .replace(/\bTransit\s+marsRetrograde\b/gi, lang === 'ko' ? '마찰 재검토 신호' : 'friction review signal')
      .replace(/\bTransit\s+venusRetrograde\b/gi, lang === 'ko' ? '관계 재검토 신호' : 'relationship review signal')
      .replace(/\bsaturnReturn\b/gi, lang === 'ko' ? '책임 압력 신호' : 'responsibility pressure')
      .replace(/\bjupiterReturn\b/gi, lang === 'ko' ? '확장 신호' : 'expansion signal')
      .replace(/\bnodeReturn\b/gi, lang === 'ko' ? '방향 전환 신호' : 'direction-shift signal')
      .replace(/\bmercuryRetrograde\b/gi, lang === 'ko' ? '소통 재검토 신호' : 'communication review signal')
      .replace(/\bmarsRetrograde\b/gi, lang === 'ko' ? '마찰 재검토 신호' : 'friction review signal')
      .replace(/\bvenusRetrograde\b/gi, lang === 'ko' ? '관계 재검토 신호' : 'relationship review signal')
      .replace(/\bsolarReturn\b/gi, lang === 'ko' ? '연간 초점 강조' : 'annual emphasis')
      .replace(/\blunarReturn\b/gi, lang === 'ko' ? '감정 파동 신호' : 'emotional pulse signal')
      .replace(/\bprogressions?\b/gi, lang === 'ko' ? '장기 전개 흐름' : 'long-arc development')
      .replace(/\bmoney expansion action\b/gi, lang === 'ko' ? '재정 확장은 조건 검증부터 진행하세요' : 'expand finances only after condition checks')
      .replace(/\bopportunity leverage\b/gi, lang === 'ko' ? '기회 활용' : 'opportunity leverage')
      .replace(/\bmoney expansion\b/gi, lang === 'ko' ? '재정 확장' : 'money expansion')
      .replace(/\brecovery delay\b/gi, lang === 'ko' ? '회복 지연' : 'recovery delay')
      .replace(/\broutine\b/gi, lang === 'ko' ? '루틴' : 'routine')
      .replace(/\bhealth pressure\b/gi, lang === 'ko' ? '건강 압력' : 'health pressure')
      .replace(/\brelationship pressure\b/gi, lang === 'ko' ? '관계 압력' : 'relationship pressure')
      .replace(/\brelationship caution\b/gi, lang === 'ko' ? '관계에서는 속도보다 기준 확인이 먼저입니다' : 'relationship pace should stay behind clear standards')
      .replace(/기본 구조에서 검토와 정밀 조정 성향이 강합니다\./g, lang === 'ko' ? '기본적으로 세밀하게 확인하고 조정하는 성향이 강합니다.' : 'The baseline favors careful review and fine adjustment.')
      .replace(/양 성향이 강해 역할과 존재감이 앞에 서는 구조입니다\./g, lang === 'ko' ? '밖으로 드러나는 역할과 존재감이 중요한 사람입니다.' : 'Visible role and presence matter strongly here.')
      .replace(/관계에서는 안정화 국면이며,?/g, lang === 'ko' ? '관계는 지금 속도보다 안정화가 우선이며, ' : 'Relationships prioritize stabilization right now, ')
      .replace(/확장 신호가 우세하여 실행력을 올리기 좋은 구간입니다\./g, lang === 'ko' ? '조건만 맞으면 실행력을 높이기 좋은 구간입니다.' : 'This is a good phase to raise execution strength if conditions line up.')
      .replace(/전체 패턴을 실행 가능한 전략으로 압축합니다\./g, lang === 'ko' ? '지금은 흐름을 실제 전략으로 옮기는 힘이 중요합니다.' : 'The key now is turning the pattern into an executable strategy.')
      .replace(/현실적인 분기점은\s*쪽으로 열려 있습니다\./g, lang === 'ko' ? '현실적인 분기점은 여러 갈래로 열려 있습니다.' : 'The realistic turning point opens through several paths.')
      .replace(/따라서 앞으로는\s*같은 경로를 비교하면서 움직이는 편이 맞습니다\./g, lang === 'ko' ? '따라서 앞으로는 몇 가지 현실적인 경로를 비교하면서 움직이는 편이 맞습니다.' : 'It is better to compare a few realistic paths before moving.')
      .replace(/지금:\s*합의 강함,\s*충돌 낮음,\s*촉발 선행\s*\/\s*1~3개월:\s*합의 강함,\s*충돌 낮음,\s*거의 동시\s*\/\s*3~6개월:\s*합의 강함,\s*충돌 낮음,\s*촉발 선행/gi, lang === 'ko' ? '가까운 시기부터 중기까지는 전반적으로 합의도가 높고, 충돌은 낮은 편입니다.' : 'From the near term into the mid term, alignment stays high while conflict remains low.')
      .replace(/검증/g, '확인')
      .replace(/레이어\s*0/gi, lang === 'ko' ? '핵심 흐름' : 'core flow')
      .replace(/활성 신호\s+책임 압력 신호/gi, lang === 'ko' ? '책임 압력 신호' : 'responsibility pressure')
      .replace(/활성 신호\s+확장 신호/gi, lang === 'ko' ? '확장 신호' : 'expansion signal')
      .replace(/활성 신호\s+방향 전환 신호/gi, lang === 'ko' ? '방향 전환 신호' : 'direction-shift signal')
      .replace(/활성 신호\s+소통 재검토 신호/gi, lang === 'ko' ? '소통 재검토 신호' : 'communication review signal')
      .replace(/변동성 패턴\s+패턴/gi, lang === 'ko' ? '변동성 패턴' : 'volatility pattern')
      .replace(/확장 자원 레이어:/g, lang === 'ko' ? '외부 기회와 지원 흐름을 보면' : 'Looking at external opportunity and support,')
      .replace(/십성 역할 레이어:/g, lang === 'ko' ? '행동 습관을 보면' : 'Looking at behavioral patterns,')
      .replace(/충돌 패턴 레이어:/g, lang === 'ko' ? '엇갈리는 지점을 보면' : 'Looking at the tension phase,')
      .replace(/국면 전환 레이어:/g, lang === 'ko' ? '흐름이 바뀌는 지점을 보면' : 'Looking at the transition,')
      .replace(/인생 챕터 흐름:\s*LIFE\s*\([^)]*\)/g, lang === 'ko' ? '인생 전체 흐름을 보면' : 'Across the life arc,')
      .replace(/실행 타이밍 전략:/g, '')
      .replace(/즉시 확정 액션이 차단됩니다\./g, lang === 'ko' ? '성급한 확정은 지금 맞지 않습니다.' : 'Immediate commitment is not suitable right now.')
      .replace(/인생 총운 한 줄 로그라인:/g, lang === 'ko' ? '이 해석의 출발점은' : 'The starting point is')
      .replace(/격국 신호/g, lang === 'ko' ? '사주의 기본 구조' : 'the saju base structure')
      .replace(/긴장 애스펙트/g, lang === 'ko' ? '주의 신호' : 'tension signals')
      .replace(/긴장 신호/g, lang === 'ko' ? '주의 신호' : 'caution signals')
      .replace(/커리어 엔진\(역할 아키타입\):/g, lang === 'ko' ? '잘 맞는 역할을 보면' : 'Role fit:')
      .replace(/성향 엔진\(강점\):/g, lang === 'ko' ? '타고난 강점을 보면' : 'Strengths:')
      .replace(/그림자 패턴\(리스크\):/g, lang === 'ko' ? '반복해서 조심할 패턴을 보면' : 'Risk patterns:')
      .replace(/머니 스타일:/g, lang === 'ko' ? '돈이 움직이는 방식을 보면' : 'Money style:')
      .replace(/경고 신호:/g, lang === 'ko' ? '특히 조심할 흐름은' : 'Caution signals:')
      .replace(/근거 흐름은/gi, lang === 'ko' ? '이번 해석의 중심에는' : 'Grounding centers on')
      .replace(/Relation\s+/gi, lang === 'ko' ? '관계 ' : 'relationship ')
      .replace(/astro progressions/gi, lang === 'ko' ? '점성 진행 흐름' : 'astro progressions')
      .replace(/saju snapshot/gi, lang === 'ko' ? '사주 구조' : 'saju structure')
      .replace(/\bunse\b/gi, lang === 'ko' ? '운 흐름' : 'cycle flow')
      .replace(/Relation\s+three-branch harmony/gi, lang === 'ko' ? '지지삼합' : 'relationship three-branch harmony')
      .replace(/relationship three-branch harmony/gi, lang === 'ko' ? '지지삼합' : 'relationship three-branch harmony')
      .replace(/대운\s*금/gi, lang === 'ko' ? '대운 금' : 'Daeun metal')
      .replace(/대운\s*목/gi, lang === 'ko' ? '대운 목' : 'Daeun wood')
      .replace(/대운\s*수/gi, lang === 'ko' ? '대운 수' : 'Daeun water')
      .replace(/대운\s*화/gi, lang === 'ko' ? '대운 화' : 'Daeun fire')
      .replace(/대운\s*토/gi, lang === 'ko' ? '대운 토' : 'Daeun earth')
      .replace(/\bDaeun\b/gi, lang === 'ko' ? '대운' : 'Daeun')
      .replace(/숨은 지원 흐름/gi, lang === 'ko' ? '숨은 지원 흐름' : 'hidden support')
      .replace(/학습 가속 흐름/gi, lang === 'ko' ? '학습 가속 흐름' : 'learning acceleration')
      .replace(/자산 축적 흐름/gi, lang === 'ko' ? '자산 축적 흐름' : 'asset accumulation')
      .replace(/이동·변화 경계 구간/gi, lang === 'ko' ? '이동·변화 경계 구간' : 'movement guardrail window')
      .replace(/대운/gi, lang === 'ko' ? '대운' : 'Daeun')
      .replace(/세운/gi, lang === 'ko' ? '세운' : 'annual cycle')
      .replace(/월운/gi, lang === 'ko' ? '월운' : 'monthly cycle')
      .replace(/일운/gi, lang === 'ko' ? '일운' : 'daily cycle')
      .replace(/양육/gi, lang === 'ko' ? '양육' : 'nurturing mode')
      .replace(/귀인조력/gi, lang === 'ko' ? '귀인 조력' : 'noble support')
      .replace(/커리어정점/gi, lang === 'ko' ? '커리어 정점' : 'career peak')
      .replace(/극강시너지/gi, lang === 'ko' ? '극강시너지' : 'strong synergy')
      .replace(/극심충돌/gi, lang === 'ko' ? '극심충돌' : 'hard clash')
      .replace(/횡재/gi, lang === 'ko' ? '횡재' : 'windfall signal')
      .replace(/임관/gi, lang === 'ko' ? '임관' : 'authority maturity stage')
      .replace(/최상조화/gi, lang === 'ko' ? '흐름 정렬' : 'peak harmony')
      .replace(/Shinsal\s+천을귀인/gi, lang === 'ko' ? '귀인의 도움 신호' : 'noble support')
      .replace(/천을귀인/gi, lang === 'ko' ? '귀인의 도움 신호' : 'noble support')
      .replace(/지지삼합/gi, lang === 'ko' ? '지지삼합' : 'three-branch harmony')
      .replace(/자산 축적 흐름/gi, lang === 'ko' ? '자산 축적 흐름' : 'asset accumulation')
      .replace(new RegExp('\u00eb\u0152\u20ac\u00ec\u0161\u00b4', 'gi'), 'Daeun')
      .replace(new RegExp('\u00ec\u201e\u00b8\u00ec\u0161\u00b4', 'gi'), 'annual cycle')
      .replace(new RegExp('\u00ec\u203a\u201d\u00ec\u0161\u00b4', 'gi'), 'monthly cycle')
      .replace(new RegExp('\u00ec\u009d\u00bc\u00ec\u0161\u00b4', 'gi'), 'daily cycle')
      .replace(new RegExp('\u00eb\u00b0\u201d\u00eb\u017e\u0152', 'gi'), 'air')
      .replace(
        new RegExp(
          '\u00ec\u017e\u0090\u00ec\u201a\u00b0\u0020\u00ec\u00b6\u2022\u00ec\u0081\u0020\u00ed\u009d\u0090\u00eb\u00a6\u201e',
          'gi'
        ),
        'asset accumulation'
      )
      .replace(
        new RegExp('\u00ec\u00a7\u20ac\u00ec\u00a7\u20ac\u00ec\u201a\u00bc\u00ed\u2022\u00a9', 'gi'),
        'three-branch harmony'
      )
      .replace(
        new RegExp('\u00ec\u00b5\u0153\u00ec\u0192\u0081\u00ec\u00a1\u00b0\u00ed\u2122\u201d', 'gi'),
        'peak harmony'
      )
      .replace(
        new RegExp('\u00ec\u00b2\u0153\u00ec\u009d\u201e\u00ea\u00b7\u20ac\u00ec\u009d\u00b8', 'gi'),
        'noble support'
      )
      .replace(new RegExp('\u00ed\u0161\u00a1\u00ec\u017e\u00ac', 'gi'), 'windfall signal')
      .replace(new RegExp('\u00ec\u017e\u201e\u00ea\u00b4\u20ac', 'gi'), 'authority maturity stage')
      .replace(/Daeun\s*금/gi, 'Daeun metal')
      .replace(/Daeun\s*목/gi, 'Daeun wood')
      .replace(/Daeun\s*수/gi, 'Daeun water')
      .replace(/Daeun\s*화/gi, 'Daeun fire')
      .replace(/Daeun\s*토/gi, 'Daeun earth')
      .replace(/dominant western element\s+바람/gi, 'dominant western element air')
      .replace(/바람/gi, lang === 'ko' ? '바람' : 'air')
      .replace(/frame\s+([a-z]+)\s+frame/gi, '$1 frame')
      .replace(/day master\s+금/gi, 'day master metal')
      .replace(/day master\s+목/gi, 'day master wood')
      .replace(/day master\s+수/gi, 'day master water')
      .replace(/day master\s+화/gi, 'day master fire')
      .replace(/day master\s+토/gi, 'day master earth')
      .replace(/useful element\s+금/gi, 'useful element metal')
      .replace(/useful element\s+목/gi, 'useful element wood')
      .replace(/useful element\s+수/gi, 'useful element water')
      .replace(/useful element\s+화/gi, 'useful element fire')
      .replace(/useful element\s+토/gi, 'useful element earth')
      .trim()
  )
  const ENGINE_NOISE_REGEX =
    /(패턴 근거|시나리오 확률|타이밍 적합도|현재 모드는|resolvedmode|crossagreement|blockedby|signalid|claimid|anchorid|^career\s|^relationship\s|^wealth\s|^health\s|commit_now|staged_commit)/i
  if (ENGINE_NOISE_REGEX.test(cleaned)) return ''
  return cleaned || ''
}

export function buildReportCoreLine(value: string | undefined | null, lang: 'ko' | 'en'): string {
  const cleaned = normalizeNarrativeCoreText(value, lang)
  if (!cleaned) return ''
  return formatNarrativeParagraphs(cleaned, lang)
}

export function collectCleanNarrativeLines(
  lines: Array<string | undefined | null>,
  lang: 'ko' | 'en'
): string[] {
  return [...new Set(lines.map((item) => buildReportCoreLine(item, lang)).filter(Boolean))]
}

export function isSameNarrative(a: string | undefined | null, b: string | undefined | null): boolean {
  const left = sentenceKey(String(a || ''))
  const right = sentenceKey(String(b || ''))
  return Boolean(left) && left === right
}

export function distinctNarrative(
  candidate: string | undefined | null,
  blocked: Array<string | undefined | null>
): string {
  const value = String(candidate || '').trim()
  if (!value) return ''
  return blocked.some((item) => isSameNarrative(value, item)) ? '' : value
}

export function getElementLabel(element: string | undefined, lang: 'ko' | 'en'): string {
  const normalized = normalizeElementKey(element)
  const map: Record<string, { ko: string; en: string }> = {
    wood: { ko: '목', en: 'wood' },
    fire: { ko: '화', en: 'fire' },
    earth: { ko: '토', en: 'earth' },
    metal: { ko: '금', en: 'metal' },
    water: { ko: '수', en: 'water' },
  }
  return map[normalized]?.[lang] || String(element || '')
}

export function capitalizeFirst(text: string | undefined | null): string {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function containsHangul(text: string | undefined | null): boolean {
  return /[가-힣]/.test(String(text || ''))
}

export function localizeGeokgukLabel(geokguk: string | undefined, lang: 'ko' | 'en'): string {
  const value = String(geokguk || '').trim()
  if (!value || lang === 'ko') return value
  const map: Record<string, string> = {
    정재격: 'jeongjae frame',
    편재격: 'pyeonjae frame',
    정관격: 'jeonggwan frame',
    편관격: 'pyeongwan frame',
    인성격: 'inseong frame',
    재성격: 'jaeseong frame',
    식상격: 'siksang frame',
  }
  return map[value] || value
}

export function sanitizeEvidenceToken(value: string | undefined | null, lang: 'ko' | 'en'): string {
  const token = normalizeNarrativeCoreText(String(value || '').trim(), lang)
  return isMeaningfulEvidenceToken(token) ? token : ''
}

function normalizeElementKey(element: string | undefined): string {
  const raw = String(element || '')
    .trim()
    .toLowerCase()
  const map: Record<string, string> = {
    wood: 'wood',
    목: 'wood',
    木: 'wood',
    fire: 'fire',
    화: 'fire',
    火: 'fire',
    earth: 'earth',
    토: 'earth',
    土: 'earth',
    metal: 'metal',
    금: 'metal',
    金: 'metal',
    water: 'water',
    수: 'water',
    水: 'water',
  }
  return map[raw] || raw
}

function isMeaningfulEvidenceToken(value: string | undefined | null): boolean {
  const token = String(value || '').trim()
  if (!token) return false
  const normalized = token.toLowerCase()
  if (['?', '-', 'unknown', '??', 'none', 'n/a'].includes(normalized)) return false
  if (/^[?\s.-]+$/.test(token)) return false
  return true
}
