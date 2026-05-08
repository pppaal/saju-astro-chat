/**
 * Theme Angles — Extra Themes
 *
 * Step 3.6 — extends the 8-angle × 3-period model to the remaining
 * five themes (love / wealth / health / family / move). Each theme
 * follows the same Angle[] contract as Career so the renderer
 * (ThemeAnglesSection) and tests stay shared.
 *
 * Tone parity with Career: short Korean paragraphs, evidence woven via
 * humanizeKeyword / shortBasis helpers, period-specific pillar reference
 * (세운 in yearly, 월운 in monthly) so prose is genuinely different per
 * scope.
 */

import type { Angle } from './themeAngles'
import { activationFor, type ActivationContext } from './signalActivation'
import type { NormalizedSignal } from './signalSynthesizer'
import { humanizeAstroBasis, humanizeKeyword, humanizeSajuBasis } from './signalLanguage'

// ============================================
// Helpers (mirrored from themeAngles to keep the two files independent)
// ============================================

function rankByActivation(
  signals: NormalizedSignal[],
  ctx: ActivationContext
): NormalizedSignal[] {
  return signals
    .map((signal) => ({ signal, level: activationFor(signal, ctx).level }))
    .sort((a, b) => b.level - a.level)
    .map((entry) => entry.signal)
}

function joinList(items: string[], sep = ', '): string {
  return items.filter(Boolean).join(sep)
}

function pillarOf(ref?: { pillar?: string }): string {
  return (ref?.pillar || '').trim()
}

function shortBasis(signal: NormalizedSignal | undefined): string {
  if (!signal) return ''
  const saju = humanizeSajuBasis(signal.sajuBasis)
  const astro = humanizeAstroBasis(signal.astroBasis)
  if (saju && astro) return `${saju} × ${astro}`
  return saju || astro
}

function keywordsOf(signals: NormalizedSignal[], n = 2): string {
  return joinList(
    signals
      .slice(0, n)
      .map((s) => humanizeKeyword(s.keyword))
      .filter(Boolean)
  )
}

function hasFamily(signal: NormalizedSignal, ...families: string[]): boolean {
  return families.includes(signal.family)
}

function hasDomain(signal: NormalizedSignal, domain: string): boolean {
  return Array.isArray(signal.domainHints) && signal.domainHints.includes(domain as never)
}

// ============================================
// Love (연애) — 8 angles
// ============================================

export const LOVE_ANGLES: Angle[] = [
  {
    key: 'essence',
    label: '끌림의 본질',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer <= 3 && (hasDomain(s, 'relationship') || hasFamily(s, 'identity_drive', 'relationship_growth')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const top = humanizeKeyword(signals[0]?.keyword) || '안정과 깊이를 모두 원하는 사람'
        const basis = shortBasis(signals[0])
        return `너의 끌림 패턴은 ${top} 기반이야. ${basis ? `근거: ${basis}.` : ''} 한눈에 빠지는 타입이 아니라, 가까이서 일관성을 본 뒤 깊어지는 결.`
      },
      yearly: ({ signals, ctx }) => {
        const seun = pillarOf(ctx.seun)
        const top = humanizeKeyword(signals[0]?.keyword) || '관계 결합 욕구'
        return `올해 너의 끌림 색은 ${top} 위에 세운 ${seun || '丙午'}이 얹혀. 평소보다 표현이 적극적, 새 인연 후보가 1-2명 등장하는 해.`
      },
      monthly: ({ signals, ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 끌림 채널이 ${wolun?.includes('午') ? '대화·표현' : '시선·근거리 접촉'} 쪽으로 좁혀짐. 월운 ${wolun || '甲午'} 기운 — 스쳐가는 인연도 한 번 더 확인해볼 만한 달.`
      },
    },
  },
  {
    key: 'strength',
    label: '관계의 강점',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'strength' && (hasDomain(s, 'relationship') || hasFamily(s, 'relationship_growth', 'support_bridge')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '책임감과 언어화 능력'
        return `평생 관계에서 너의 강점은 ${kws}이야. 약속을 지키고 감정을 말로 옮기는 힘이 길어질수록 진가 발휘.`
      },
      yearly: ({ signals, ctx }) => {
        const kws = keywordsOf(signals, 2) || '관계 회복력'
        const seun = pillarOf(ctx.seun)
        return `올해는 강점이 ${kws} 쪽으로 더 살아나. 세운 ${seun || '丙午'}이 외부 인연 발화를 도와주는 해.`
      },
      monthly: ({ signals, ctx }) => {
        const kws = keywordsOf(signals, 2) || '대화 정리력'
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 강점은 ${kws}. 월운 ${wolun || '甲午'} 영향으로 깊은 대화 한 번이 두 달 분량의 진전을 만들 수 있음.`
      },
    },
  },
  {
    key: 'weakness',
    label: '관계가 깨지는 패턴',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'caution' && (hasDomain(s, 'relationship') || hasFamily(s, 'relationship_guardrail')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '확정 후 갑작스러운 거리감'
        const basis = shortBasis(signals[0])
        return `관계가 깨질 때 패턴은 ${kws}. ${basis ? `(근거: ${basis})` : ''} 평생 반복되는 결이라 미리 알면 회피 가능.`
      },
      yearly: ({ signals, ctx }) => {
        const kws = keywordsOf(signals, 2) || '오해와 의심'
        const seun = pillarOf(ctx.seun)
        return `올해 가장 조심해야 할 패턴은 ${kws}. 세운 ${seun || '丙午'} 압력이 평소 약점을 1.5배 증폭하는 해.`
      },
      monthly: ({ signals, ctx }) => {
        const kws = keywordsOf(signals, 2) || '말 한 번에 식는 분위기'
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 약점은 ${kws}. 월운 ${wolun || '甲午'} 흐름에서 한 박자 빠른 결정이 관계 잡음을 만듦.`
      },
    },
  },
  {
    key: 'timing',
    label: '만남·결혼 시기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer >= 4)
      return rankByActivation(c, ctx).slice(0, 4)
    },
    render: {
      lifetime: ({ ctx }) => {
        const daeun = pillarOf(ctx.daeun)
        return `평생 만남·결혼 시기는 대운 천간이 정관·정재로 들어오는 구간이 가장 진해. 지금 대운(${daeun || '乙亥'}) 끝물 지나면 다음 색에서 결합 압력이 한 번 더 올라옴.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 분기별로 결이 다름. 봄에 새 인연 후보 등장, 여름에 결정 압력 정점, 가을에 안정화. 세운 ${seun || '丙午'} 흐름.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 2-3주차가 진전 골든윈도. 월운 ${wolun || '甲午'} 흐름에서 약속 잡기·고백·확정 같은 행동이 평소보다 잘 통함.`
      },
    },
  },
  {
    key: 'people',
    label: '어떤 타입에 끌리나',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'support_bridge', 'relationship_growth') || /도화|천을귀인|정관|정재/.test(s.sajuBasis || ''))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '안정·신뢰형'
        return `평생 끌리는 타입은 ${kws}. 화려한 첫인상보다 일상에서 일관성 있는 사람이 결국 너 옆에 남음.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 평소 타입에 외향성·표현력이 더해진 사람이 후보로 등장. 세운 ${seun || '丙午'} 영향.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 외부 활동·소개 자리에서 만나는 사람이 주력 후보. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'conflictRecovery',
    label: '갈등과 회복',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'health_recovery', 'relationship_guardrail') || s.polarity === 'balance')
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '거리두기와 재회'
        return `갈등 후 회복 패턴은 ${kws}. 즉각 화해보다 한 번 떨어진 뒤 다시 가까워질 때 더 단단해짐.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 갈등이 빨리 끓어오르고 빨리 식는 해. 세운 ${seun || '丙午'} 화 기운으로 결정도 회복도 평소보다 빠름.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 갈등 발생 시 회복 골든타임은 24-48시간. 월운 ${wolun || '甲午'} 흐름에서 사흘 넘기면 굳어짐.`
      },
    },
  },
  {
    key: 'stability',
    label: '장기 안정 조건',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity !== 'caution' && hasDomain(s, 'relationship'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '명확한 역할 분담'
        return `장기 관계가 안정되는 조건은 ${kws}. 책임 범위·기대치·생활 패턴을 일찍 맞출수록 오래 감.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 안정 vs 확장의 균형이 흔들림. 세운 ${seun || '丙午'}이 새 자극을 던지지만, 기존 관계 점검을 미루면 빈자리가 커짐.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 안정 포인트는 함께 보내는 시간의 질. 월운 ${wolun || '甲午'} 흐름에서 짧은 데이트보다 한 번 깊게.`
      },
    },
  },
  {
    key: 'nextAction',
    label: '다음 행동',
    selectSignals(signals, ctx) {
      return rankByActivation(signals.filter((s) => hasDomain(s, 'relationship')), ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 차원: (1) 감정을 말로 옮기는 연습, (2) 약속·시간 일관성, (3) 갈등 후 거리두기 24시간 룰. 이 3개 지키면 너에게 맞는 사람만 옆에 남음.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 안에: (1) 새 인연 후보 등장 시 3주 관찰 후 확정, (2) 기존 관계 분기별 점검 1회, (3) 결정적 대화 한 번. 세운 ${seun || '丙午'}이 추진력을 보탬.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 주: (1) 미뤄온 약속 한 건 잡기, (2) 갈등 있는 사람과 24시간 안에 한 줄 메시지, (3) 큰 약속은 다음 달로 미루기. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
]

// ============================================
// Wealth (재정) — 8 angles
// ============================================

export const WEALTH_ANGLES: Angle[] = [
  {
    key: 'essence',
    label: '돈 흐름의 본질',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer <= 3 && (hasDomain(s, 'wealth') || /편재|정재|식상/.test(s.sajuBasis || '')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const top = humanizeKeyword(signals[0]?.keyword) || '안정 누적형'
        const basis = shortBasis(signals[0])
        return `너의 돈 흐름은 ${top}. ${basis ? `근거: ${basis}.` : ''} 한 번에 크게 버는 타입보다 안정 자리에서 누적되는 결.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 평소 흐름에 세운 ${seun || '丙午'} 압력 — 새 수입 채널이 한 번 더 등장하지만, 동시에 지출도 같이 늘어나는 해.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 ${wolun?.includes('午') ? '소비 충동이 평소보다 큼' : '예산 점검 효과가 큼'}. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'earning',
    label: '버는 자리',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'strength' && (hasDomain(s, 'wealth') || hasFamily(s, 'career_growth')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '본업 + 부수입 1개'
        return `평생 버는 자리는 ${kws}. 본업에 작은 부수입 하나 깔아두는 구조가 너에게 가장 안정적.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 외부 기회 1-2건 등장. 세운 ${seun || '丙午'}이 횡재성 신호도 약간 보탬.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 2-3주차가 수입 결정 골든윈도. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'leaking',
    label: '새는 자리',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'caution' && (hasDomain(s, 'wealth') || /편재|손실/.test(s.sajuBasis || '')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '큰 결정 직후 충동 지출'
        return `너의 돈이 새는 자리는 ${kws}. 평생 반복되는 패턴이라 자동이체·예산 룰로 막아야 함.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 손실 위험이 평소보다 1.3배. 세운 ${seun || '丙午'} 압력으로 의사결정 속도가 빨라져 검토 단계가 줄어듦.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 새는 구간은 4주차. 월운 ${wolun || '甲午'} 정점 지나고 피로 누적되며 충동 지출 위험.`
      },
    },
  },
  {
    key: 'timing',
    label: '투자 적기 / 손실기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer >= 4)
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ ctx }) => {
        const daeun = pillarOf(ctx.daeun)
        return `평생 투자 적기는 대운 지지가 재성으로 들어오는 구간. 지금 대운(${daeun || '乙亥'}) 흐름에선 안정 자산 비중을 높일 시기.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 상반기 투자 검토, 하반기 실행이 결. 세운 ${seun || '丙午'} 흐름이 4-6월에 결정 압력 정점.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 큰 거래는 1-2주차에 결정, 3-4주차는 점검만. 월운 ${wolun || '甲午'} 정점 지나면 판단력 떨어짐.`
      },
    },
  },
  {
    key: 'partners',
    label: '협력자',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'support_bridge') || /천을귀인|정인/.test(s.sajuBasis || ''))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 돈 결정엔 외부 자문 1명 필수. 단독 결정 비율이 높을수록 손실 비율도 같이 올라가는 결.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 회계·세무·투자 자문 한 명 정착시키기 좋은 해. 세운 ${seun || '丙午'} 영향으로 외부 도움이 자연스럽게 들어옴.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 큰 결정 전엔 자문 한 번. 월운 ${wolun || '甲午'} 흐름에서 자문 없는 결정은 손실 확률 1.5배.`
      },
    },
  },
  {
    key: 'stabilityVsExpansion',
    label: '안정 vs 확장',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'career_growth', 'identity_drive', 'mission_reframing'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const top = humanizeKeyword(signals[0]?.keyword) || '안정 우선'
        return `평생 균형은 ${top} 쪽으로 약간 더 기울어. 무리한 확장보다 안정 위에 단계적 추가가 너에게 맞음.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 확장 충동이 평소보다 큼. 세운 ${seun || '丙午'} 화 기운 — 한 박자 늦춰서 검토하면 후회 줄임.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 확장보다 정리 우선. 월운 ${wolun || '甲午'} 흐름에서 새 카테고리 진입은 다음 달로.`
      },
    },
  },
  {
    key: 'recovery',
    label: '손실 후 회복',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'health_recovery', 'support_bridge'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `손실 후 회복 속도는 평균 6-12개월. 너의 패턴은 한 번에 만회보다 작게 여러 번 회수가 더 빠른 결.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 손실 발생 시 회복 골든윈도는 다음 분기. 세운 ${seun || '丙午'} 화 기운이 회복 속도도 보탬.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 손실은 다음 달 첫 주에 정산. 월운 ${wolun || '甲午'} 정점 지나고 점검만.`
      },
    },
  },
  {
    key: 'nextAction',
    label: '다음 행동',
    selectSignals(signals, ctx) {
      return rankByActivation(signals.filter((s) => hasDomain(s, 'wealth')), ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 차원: (1) 자동이체·예산 룰 1개 정착, (2) 분기별 자문 미팅 1회, (3) 큰 결정은 자문 + 24시간 룰. 이 3개로 평생 손실 절반 줄임.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 안에: (1) 자문 1명 정착, (2) 손실 상한 룰 1개, (3) 신규 카테고리 1개 시범 진입. 세운 ${seun || '丙午'} 추진력.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 주: (1) 큰 거래 결정은 1-2주차, (2) 4주차는 점검만, (3) 충동 지출 한도 미리 설정. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
]

// ============================================
// Health (건강) — 8 angles
// ============================================

export const HEALTH_ANGLES: Angle[] = [
  {
    key: 'tone',
    label: '체력 톤',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer <= 3 && (hasDomain(s, 'health') || /십이운성|용신/.test(s.sajuBasis || '')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const top = humanizeKeyword(signals[0]?.keyword) || '지구력 강한 톤'
        const basis = shortBasis(signals[0])
        return `너의 체력 baseline은 ${top}. ${basis ? `근거: ${basis}.` : ''} 폭발력보다 지속력 위주로 설계된 몸.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 평소 톤에 세운 ${seun || '丙午'} 압력 — 활동량은 늘지만 회복기를 안 잡으면 4분기에 무너짐.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 ${wolun?.includes('午') ? '소비 활동량 정점' : '회복기 적기'}. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'strongAreas',
    label: '강한 부위',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'strength' && hasDomain(s, 'health'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '근지구력·심폐'
        return `평생 너의 강한 부위는 ${kws}. 이 자리는 평소에도 잘 회복되니 적극적으로 부하를 줘도 됨.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 강한 부위에 한 번 더 부하 가능. 세운 ${seun || '丙午'} 화 기운으로 대사 활성도 높음.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 운동 적기는 1-3주차. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'weakAreas',
    label: '약한 부위',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'caution' && hasDomain(s, 'health'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '소화기·수면 패턴'
        return `평생 약한 부위는 ${kws}. 무리하면 가장 먼저 신호 보내는 자리, 미리 케어 루틴 잡아야 함.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 약한 부위가 평소보다 더 예민. 세운 ${seun || '丙午'} 압력으로 환절기·과로기에 신호 빨리 등장.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 약한 부위 신호 등장 시 3-5일 안에 케어. 월운 ${wolun || '甲午'} 흐름에서 미루면 다음 달까지 끌고 감.`
      },
    },
  },
  {
    key: 'stableWindow',
    label: '안정기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'balance' && hasDomain(s, 'health'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 안정기는 봄·가을 환절기 후. 이 구간엔 강도 높은 운동·다이어트·도전 가능.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 안정기는 2분기·4분기. 세운 ${seun || '丙午'} 흐름에서 큰 도전 시점.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 안정기는 2-3주차. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'recoveryWindow',
    label: '회복 필요기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'health_recovery', 'health_guardrail'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 회복 필요기는 분기 끝 1-2주. 이 구간을 미리 비워두는 사람과 안 비우는 사람의 1년 결과가 갈림.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 회복기 우선순위: 4분기. 세운 ${seun || '丙午'} 압력 누적이 그때 폭발.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 회복 포인트는 4주차 첫 1-2일. 월운 ${wolun || '甲午'} 정점 지나고.`
      },
    },
  },
  {
    key: 'movementVsRest',
    label: '운동 vs 휴식',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasDomain(s, 'health') || hasFamily(s, 'health_recovery'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 균형은 운동 60 : 휴식 40. 운동 비율이 높으면 활력, 휴식 비율이 너무 높으면 정체.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 운동 비율 70까지 올려도 됨. 세운 ${seun || '丙午'} 화 기운이 추진력 보탬.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 1-3주 운동, 4주 휴식 분배. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'eatingPattern',
    label: '식습관 패턴',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasDomain(s, 'health'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 식습관 핵심은 일정한 끼니 타이밍 + 7-8시간 수면. 식사 시간이 흔들리면 가장 먼저 약한 부위가 신호.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 외식·약속 빈도가 늘어나는 해. 세운 ${seun || '丙午'} 영향 — 주중 3끼는 집밥 룰로 균형.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 식습관 점검 적기는 2주차. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'nextAction',
    label: '다음 행동',
    selectSignals(signals, ctx) {
      return rankByActivation(signals.filter((s) => hasDomain(s, 'health')), ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 차원: (1) 운동 루틴 1개 고정, (2) 분기 회복 1주 캘린더, (3) 약한 부위 케어 메뉴 정착. 이 3개로 평생 컨디션 균형.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 안에: (1) 운동 강도 1단계 업, (2) 4분기 회복 1주 미리 캘린더 박기, (3) 식습관 점검 분기별 1회. 세운 ${seun || '丙午'} 추진력.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 주: (1) 운동 3회 이상, (2) 4주차 회복일 미리 비우기, (3) 약한 부위 신호 3일 룰. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
]

// ============================================
// Family (가족) — 8 angles
// ============================================

export const FAMILY_ANGLES: Angle[] = [
  {
    key: 'rootPattern',
    label: '뿌리 패턴',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer <= 3 && (/정인|편인|가족/.test(s.sajuBasis || '') || hasDomain(s, 'family')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const top = humanizeKeyword(signals[0]?.keyword) || '돌봄과 책임 우세'
        const basis = shortBasis(signals[0])
        return `너의 가족 뿌리 패턴은 ${top}. ${basis ? `근거: ${basis}.` : ''} 가족 안에서 책임을 짊어지거나 중심 역할을 맡는 결.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 가족 안 역학이 한 번 재조정될 가능성. 세운 ${seun || '丙午'} 영향.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 가족 모임·연락 빈도가 증가. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'parents',
    label: '부모와의 결',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => /정인|편인/.test(s.sajuBasis || ''))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 부모와의 결은 일정 거리 + 정기 연락 패턴이 가장 안정적. 너무 가까우면 갈등, 너무 멀면 죄책감.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 부모 건강·역할 이슈가 한 번 등장 가능. 세운 ${seun || '丙午'} 영향 — 미루지 말고 점검.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 부모 연락 한 번. 월운 ${wolun || '甲午'} 흐름에서 늦으면 다음 달 끌고 감.`
      },
    },
  },
  {
    key: 'siblings',
    label: '형제·배우자 역학',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => /비견|겁재|정재/.test(s.sajuBasis || ''))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 형제·배우자와의 역학은 책임 분담이 핵심. 한쪽이 다 짊어지면 결국 무너짐, 미리 룰 정해두기.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 책임 분담 재조정 적기. 세운 ${seun || '丙午'} 압력으로 한 사람에게 쏠려 있던 부담이 드러남.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 가족 회의 한 번. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'children',
    label: '자녀 흐름',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => /식신|상관/.test(s.sajuBasis || ''))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 자녀와의 결은 너의 표현력에 좌우. 감정·기대를 말로 옮기는 빈도가 자녀 안정도와 직결.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 자녀(또는 후배) 의사소통 빈도 늘리기. 세운 ${seun || '丙午'} 영향.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 자녀와 깊은 대화 1회. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'conflictWindow',
    label: '갈등 시기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'caution' && hasDomain(s, 'family'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 가족 갈등은 명절·중요 결정 시점에 집중. 미리 역할·예산 룰 정해두면 50% 줄임.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 갈등 위험기는 2분기·4분기. 세운 ${seun || '丙午'} 압력 누적기.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 갈등 트리거는 4주차. 월운 ${wolun || '甲午'} 정점 지나고.`
      },
    },
  },
  {
    key: 'reconcileWindow',
    label: '화해 시기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'health_recovery', 'support_bridge'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 화해 골든윈도는 갈등 후 7-14일. 너무 빠른 화해는 표면적, 너무 늦으면 굳어짐.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 화해 적기는 분기 끝. 세운 ${seun || '丙午'} 흐름에서 자연스러운 정리.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 화해 골든타임은 갈등 후 다음 주말. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'careBalance',
    label: '돌봄 균형',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity !== 'caution' && hasDomain(s, 'family'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 돌봄 균형은 너 자신 50 : 가족 50. 자기 돌봄이 무너지면 가족 돌봄도 함께 무너짐.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 자기 돌봄 비중을 평소보다 10 더. 세운 ${seun || '丙午'} 압력에 대비.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 자기 시간 1주에 1회는 확보. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'nextAction',
    label: '다음 행동',
    selectSignals(signals, ctx) {
      return rankByActivation(signals.filter((s) => hasDomain(s, 'family')), ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 차원: (1) 가족 정기 연락 룰 1개, (2) 갈등 7-14일 화해 룰, (3) 자기 돌봄 시간 주 1회. 이 3개가 가족 균형 유지.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 안에: (1) 부모 건강 점검 1회, (2) 책임 분담 재조정 회의 1회, (3) 자녀·후배 깊은 대화 분기별 1회. 세운 ${seun || '丙午'} 추진력.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 주: (1) 부모 안부 한 번, (2) 가족 모임 일정 정리, (3) 자기 시간 1회 확보. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
]

// ============================================
// Move (이동) — 8 angles
// ============================================

export const MOVE_ANGLES: Angle[] = [
  {
    key: 'instinct',
    label: '정착 vs 이동 본능',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer <= 3 && (hasFamily(s, 'movement_window') || /역마|편관/.test(s.sajuBasis || '')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const top = humanizeKeyword(signals[0]?.keyword) || '이동 우세'
        const basis = shortBasis(signals[0])
        return `너의 본능은 ${top}. ${basis ? `근거: ${basis}.` : ''} 한 자리 오래 있으면 답답해지고, 환경 바꾸면 활력 회복.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 이동·여행 욕구가 평소보다 큼. 세운 ${seun || '丙午'} 화 기운.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달은 단기 여행·환경 전환 적기. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'goodEnv',
    label: '잘 맞는 환경',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'strength' && (hasFamily(s, 'movement_window') || hasDomain(s, 'move')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '소통 활발한 도시·물 가까운 곳'
        return `평생 잘 맞는 환경은 ${kws}. 이런 자리에선 컨디션·결정 품질 모두 평균보다 좋음.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 평소 잘 맞던 환경에 한 번 더 머무는 게 결. 세운 ${seun || '丙午'} 흐름에서 무리한 이주는 손실 위험.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 단기 환경 변화 적기는 2-3주차. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'badEnv',
    label: '안 맞는 환경',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity === 'caution' && (hasFamily(s, 'movement_guardrail') || hasDomain(s, 'move')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ signals }) => {
        const kws = keywordsOf(signals, 2) || '폐쇄적 환경·과도한 정적 공간'
        return `평생 안 맞는 환경은 ${kws}. 이런 자리에 오래 있으면 컨디션·집중력 모두 떨어짐.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 안 맞는 환경 진입 위험기 — 분기 단위 점검. 세운 ${seun || '丙午'} 압력으로 무리한 결정 위험.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 환경 점검 적기는 4주차. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'movingWindow',
    label: '이동 적기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.layer >= 4 && (hasDomain(s, 'move') || hasFamily(s, 'movement_window')))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: ({ ctx }) => {
        const daeun = pillarOf(ctx.daeun)
        return `평생 큰 이동(이주·이직·해외)은 대운 천간이 역마성으로 들어오는 구간. 지금 대운(${daeun || '乙亥'}) 흐름 검토.`
      },
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 이동 적기는 상반기 검토, 하반기 실행. 세운 ${seun || '丙午'} 흐름.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 큰 이동 결정은 1-2주차. 월운 ${wolun || '甲午'} 정점 지나면 판단력 떨어짐.`
      },
    },
  },
  {
    key: 'baseStability',
    label: '거점 안정기',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => s.polarity !== 'caution' && hasDomain(s, 'move'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 거점 안정기는 이주 후 12-18개월. 이 구간엔 다른 변동 최소화하고 정착에 집중.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 거점 안정도는 평소보다 약간 낮음. 세운 ${seun || '丙午'} 압력 — 새 변동 추가는 신중.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 거점 점검은 2주차. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'companions',
    label: '동행자',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasFamily(s, 'support_bridge'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 큰 이동엔 동행자 1명 자리가 비어 있으면 안 됨. 단독 이동 비율이 높을수록 정착 속도 느림.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해는 동행자 후보가 자연스럽게 등장. 세운 ${seun || '丙午'} 영향.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 동행자 후보와 첫 대화. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'soloVsFamily',
    label: '단독 vs 가족 동반',
    selectSignals(signals, ctx) {
      const c = signals.filter((s) => hasDomain(s, 'family') || hasDomain(s, 'move'))
      return rankByActivation(c, ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 큰 이동 결정은 가족 동반 비율이 높을수록 정착 안정도 ↑. 단독 이동은 빠르되 회복 시간 더 필요.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 큰 이동 시 가족과 사전 합의 필수. 세운 ${seun || '丙午'} 압력으로 합의 없으면 갈등.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 달 가족 합의 회의 1회. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
  {
    key: 'nextAction',
    label: '다음 행동',
    selectSignals(signals, ctx) {
      return rankByActivation(signals.filter((s) => hasDomain(s, 'move')), ctx).slice(0, 3)
    },
    render: {
      lifetime: () =>
        `평생 차원: (1) 환경 적합도 분기 점검, (2) 이동 결정 전 동행자 합의, (3) 거점 안정 12-18개월 룰. 이 3개가 평생 정착 안정.`,
      yearly: ({ ctx }) => {
        const seun = pillarOf(ctx.seun)
        return `올해 안에: (1) 환경 적합도 1회 점검, (2) 이동 후보지 2-3개 비교, (3) 가족 합의 회의 1회. 세운 ${seun || '丙午'} 추진력.`
      },
      monthly: ({ ctx }) => {
        const wolun = pillarOf(ctx.wolun)
        return `이번 주: (1) 단기 여행 일정 잡기, (2) 거점 점검 한 번, (3) 큰 이동 결정은 다음 분기로. 월운 ${wolun || '甲午'} 흐름.`
      },
    },
  },
]

// ============================================
// Theme map — wired into ThemeAnglesSection
// ============================================

export const THEME_ANGLES_MAP = {
  love: LOVE_ANGLES,
  wealth: WEALTH_ANGLES,
  health: HEALTH_ANGLES,
  family: FAMILY_ANGLES,
  move: MOVE_ANGLES,
} as const
