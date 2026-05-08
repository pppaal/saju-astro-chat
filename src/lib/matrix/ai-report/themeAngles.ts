/**
 * Theme Angles
 *
 * Step 3 of the multi-period reports. Renders a theme (career / love / etc.)
 * as N "angles" — short prose paragraphs that interpret the same engine
 * signal pool from different lenses (essence, strength, weakness, timing,
 * people, money vs meaning, recovery, next action).
 *
 * Each angle is rendered three times — once per ReportPeriodScope —
 * with different prose templates. Same signal pool, different lens,
 * different period flavor → 24 distinct paragraphs per theme that all
 * tie back to the same chart.
 *
 * MVP: Career theme only. Other themes will reuse the same Angle
 * machinery (just different angle definitions + signal selectors).
 */

import type { ActivationContext } from './signalActivation'
import { activationFor } from './signalActivation'
import type { NormalizedSignal } from './signalSynthesizer'
import type { ReportPeriodScope } from './periodSignalContext'
import { humanizeAstroBasis, humanizeKeyword, humanizeSajuBasis } from './signalLanguage'

// ============================================
// Public types
// ============================================

export interface AngleRenderInput {
  signals: NormalizedSignal[]
  ctx: ActivationContext
}

export type AngleRender = (input: AngleRenderInput) => string

export interface Angle {
  key: string
  label: string
  /**
   * Selects the most relevant signals for this angle. Should already
   * apply activation ranking — the renderer trusts the order.
   */
  selectSignals(signals: NormalizedSignal[], ctx: ActivationContext): NormalizedSignal[]
  /**
   * One renderer per period scope. Each must return a 1-3 sentence Korean
   * paragraph. Renderers should reference at least one selected signal
   * and at least one piece of period context (pillar / transit) when the
   * period is yearly or monthly so prose is genuinely different per
   * period.
   */
  render: Record<ReportPeriodScope, AngleRender>
}

export interface RenderedAngle {
  angle: string
  label: string
  prose: string
  /** Signals the renderer used (for evidence display under the prose). */
  evidence: Array<Pick<NormalizedSignal, 'id' | 'keyword' | 'sajuBasis' | 'astroBasis' | 'polarity'>>
}

// ============================================
// Helpers shared by angle renderers
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

// ============================================
// Career angles (8 angles × 3 periods = 24 paragraphs)
// ============================================

const careerEssence: Angle = {
  key: 'essence',
  label: '본질',
  selectSignals(signals, ctx) {
    const candidates = signals.filter(
      (s) => s.layer <= 3 && (s.domainHints?.includes('career') || hasFamily(s, 'identity_drive'))
    )
    return rankByActivation(candidates, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const top = signals[0]
      const support = signals[1]
      const elements = humanizeKeyword(top?.keyword) || '판을 정리하는 능력'
      const detail = shortBasis(top) || '본명 사주 깊은 자리'
      const supportKw = humanizeKeyword(support?.keyword) || '기준선'
      return `너는 커리어에서 ${elements} 기반의 사람이야. 근거: ${detail}. 일을 늘리는 것보다 ${supportKw} 먼저 잡는 데서 강점이 나오고, 평생 이 패턴은 잘 안 바뀌어.`
    },
    yearly: ({ signals, ctx }) => {
      const top = signals[0]
      const seun = pillarOf(ctx.seun)
      const elements = humanizeKeyword(top?.keyword) || '구조 짜는 본능'
      return `올해 너의 커리어 본질은 평소 ${elements} 위에 세운 ${seun || '丙午'}의 압력이 얹혀. ${seun ? `${seun} 영향으로 결정 속도가 평소보다 빨라지는 해` : '결정 속도가 빨라지는 해'} — 본질은 그대로지만 표현이 더 적극적으로 바뀜.`
    },
    monthly: ({ signals, ctx }) => {
      const top = signals[0]
      const wolun = pillarOf(ctx.wolun)
      const elements = humanizeKeyword(top?.keyword) || '구조 본능'
      return `이번 달 너의 커리어 본질은 ${elements} — 월운 ${wolun || '甲午'} 기운이 얹혀서 ${wolun?.includes('午') ? '발표·기획·표현 쪽' : '실행·정리 쪽'}으로 좁혀짐. 짧은 구간이라 본질을 살짝 ${wolun ? '비틀어 쓰는 달' : '집중적으로 쓰는 달'}.`
    },
  },
}

const careerStrength: Angle = {
  key: 'strength',
  label: '강점',
  selectSignals(signals, ctx) {
    const candidates = signals.filter(
      (s) => s.polarity === 'strength' && (s.domainHints?.includes('career') || hasFamily(s, 'career_growth', 'identity_drive', 'support_bridge'))
    )
    return rankByActivation(candidates, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const kws = keywordsOf(signals, 2)
      const basis = shortBasis(signals[0])
      return `너의 평생 커리어 강점은 ${kws || '구조와 지속력'}이야. ${basis ? `근거: ${basis}.` : ''} 결정적인 순간 흔들림이 적어 — 큰 판일수록 너가 더 또렷해져.`
    },
    yearly: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const seun = pillarOf(ctx.seun)
      const basis = shortBasis(signals[0])
      return `올해는 평소 강점(${kws || '구조'})에 세운 ${seun || '丙午'}이 추가 부스터. ${basis ? `핵심 자리는 ${basis} — 여기가 특히 활성화돼서,` : '평소 약했던 표현력까지 같이 살아나서,'} 외부에 너 이름이 더 잘 알려질 해야.`
    },
    monthly: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const wolun = pillarOf(ctx.wolun)
      const topKw = humanizeKeyword(signals[0]?.keyword) || '핵심 강점'
      return `이번 달은 강점이 ${kws || '발표력·기획력'}으로 좁혀짐. 월운 ${wolun || '甲午'}이 ${topKw} 쪽을 자극해서, 발표·제안·협상 쪽이 평소보다 잘 통하는 구간.`
    },
  },
}

const careerWeakness: Angle = {
  key: 'weakness',
  label: '약점',
  selectSignals(signals, ctx) {
    const candidates = signals.filter(
      (s) => s.polarity === 'caution' && (s.domainHints?.includes('career') || hasFamily(s, 'career_guardrail', 'identity_guardrail'))
    )
    return rankByActivation(candidates, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const kws = keywordsOf(signals, 2)
      const basis = shortBasis(signals[0])
      return `같은 강점이 너를 다치게 하는 순간은 ${kws || '결정 직후 인간관계 갈라짐'}이야. ${basis ? `(근거: ${basis})` : ''} 결정 한 번에 사람 한 줄이 끊어지는 패턴이 평생 반복돼. 결정 후 24시간 안에 한 번은 사람한테 confirm 들어가야 균형.`
    },
    yearly: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const seun = pillarOf(ctx.seun)
      return `올해 가장 조심해야 할 약점은 ${kws || '과속 결정'}. 세운 ${seun || '丙午'} 압력이 평소 약점을 1.5배 증폭하는 해 — 평소엔 안 나오던 실수가 나올 수 있어. 큰 결정은 한 번 더 자고 답하는 습관 들이는 1년.`
    },
    monthly: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const wolun = pillarOf(ctx.wolun)
      return `이번 달 약점은 ${kws || '서두르는 결정'}. 월운 ${wolun || '甲午'} 흐름에서 평소보다 ${wolun?.includes('午') ? '말이 먼저 나가서' : '결정이 먼저 나가서'} 사람 관계 잡음이 생기기 쉬움. 한 박자만 늦춰.`
    },
  },
}

const careerTiming: Angle = {
  key: 'timing',
  label: '시기 흐름',
  selectSignals(signals, ctx) {
    const candidates = signals.filter((s) => s.layer >= 4)
    return rankByActivation(candidates, ctx).slice(0, 4)
  },
  render: {
    lifetime: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const daeun = pillarOf(ctx.daeun)
      return `평생 커리어 흐름은 10년 단위 대운이 색을 결정해. 지금 대운(${daeun || '乙亥'}) 끝물 지나면 다음 색으로 갈아탐 — 한 번 갈아탈 때마다 ${kws || '강조점'}이 통째로 바뀌니까 5-10년 단위로 자기 정렬 다시 잡아야 함.`
    },
    yearly: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const seun = pillarOf(ctx.seun)
      return `올해 흐름은 분기별로 결이 달라져. 봄(1-3월)은 정리, 여름(4-6월)은 결정 압박 정점, 가을(7-9월)은 수확, 겨울(10-12월)은 다음 1년 준비. 세운 ${seun || '丙午'}은 ${kws || '결정·표현'} 쪽에 무게.`
    },
    monthly: ({ signals, ctx }) => {
      const kws = keywordsOf(signals, 2)
      const wolun = pillarOf(ctx.wolun)
      return `이번 달은 주차별로 결이 다름. 1주는 점검, 2주는 발표·제안 골든윈도, 3주는 외부 반응 수렴, 4주는 다음 달 준비. 월운 ${wolun || '甲午'}이 ${kws || '실행·표현'} 쪽으로 끌어당김.`
    },
  },
}

const careerPeople: Angle = {
  key: 'people',
  label: '사람',
  selectSignals(signals, ctx) {
    const candidates = signals.filter(
      (s) => hasFamily(s, 'support_bridge', 'relationship_growth') || /천을귀인|귀인|현침|문창/.test(s.sajuBasis || '')
    )
    return rankByActivation(candidates, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const kws = keywordsOf(signals, 2) || '귀인 자리'
      return `평생 너 옆엔 5-10살 위 외부 멘토 자리가 비어 있으면 안 돼. 사주에 ${kws} 신호가 박혀 있어서, 결정 순간 도와줄 사람이 자동으로 등장하는 운. 활용 안 하면 손해.`
    },
    yearly: ({ signals, ctx }) => {
      const seun = pillarOf(ctx.seun)
      const kws = keywordsOf(signals, 2)
      return `올해 너를 미는 사람은 평소보다 적극적으로 등장. 세운 ${seun || '丙午'}이 ${kws || '귀인'} 쪽을 자극해서, 외부 미팅·소개·연락이 자연스럽게 들어옴. 1년에 2-3명은 새 인연으로 남을 가능성.`
    },
    monthly: ({ signals, ctx }) => {
      const wolun = pillarOf(ctx.wolun)
      return `이번 달 만나야 할 사람은 외부 멘토 1명. 월운 ${wolun || '甲午'} 구간에 한 번 연락 들어가면, 6월 이후 결정에 큰 도움. 같은 부서 직속 라인은 이번 달은 의도적으로 거리.`
    },
  },
}

const careerMoneyVsMeaning: Angle = {
  key: 'moneyVsMeaning',
  label: '돈 vs 의미',
  selectSignals(signals, ctx) {
    const candidates = signals.filter(
      (s) => hasFamily(s, 'career_growth', 'mission_reframing') || /격국|용신|정관|편관|정재|편재/.test(s.sajuBasis || '')
    )
    return rankByActivation(candidates, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const basis = shortBasis(signals[0]) || '격국 분석'
      return `근거(${basis})로 보면 너는 의미·권위 우선형. 돈만 좇는 결정에 자기 명분이 안 서면 1년 안에 무너지는 패턴. 의미 있는 일 + 60-70% 보상이면 평균보다 오래 버팀.`
    },
    yearly: ({ signals, ctx }) => {
      const seun = pillarOf(ctx.seun)
      const topKw = humanizeKeyword(signals[0]?.keyword) || '명분'
      return `올해는 돈 vs 의미의 균형이 의미 쪽으로 살짝 더 기울어. 세운 ${seun || '丙午'}이 ${topKw} 쪽을 자극해서, 보상보다 "이걸 하면 5년 뒤 이력서에 한 줄로 박을 수 있나"가 결정 기준선이 되는 해.`
    },
    monthly: ({ signals, ctx }) => {
      const wolun = pillarOf(ctx.wolun)
      const topKw = humanizeKeyword(signals[0]?.keyword) || '역할 범위'
      return `이번 달 들어오는 제안은 돈 액수보다 ${topKw}를 먼저 봐. 월운 ${wolun || '甲午'} 영향으로 ${wolun?.includes('午') ? '명분이 흐릿한 제안은 단기 만족만 주고 끝남' : '실리 우선 결정이 더 잘 풀림'}.`
    },
  },
}

const careerRecovery: Angle = {
  key: 'recovery',
  label: '회복 패턴',
  selectSignals(signals, ctx) {
    const candidates = signals.filter(
      (s) => hasFamily(s, 'health_recovery', 'support_bridge') || s.polarity === 'balance'
    )
    return rankByActivation(candidates, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const kws = keywordsOf(signals, 2) || '몰입과 휴식'
      return `너의 회복 패턴은 ${kws} 사이클. 한 번 몰입하면 깊게 파고들지만, 회복 루틴 안 잡으면 번아웃 속도도 빠름. 평생 운동·수면·휴식 루틴 1개는 고정해 두는 게 커리어 최대 자산.`
    },
    yearly: ({ signals, ctx }) => {
      const seun = pillarOf(ctx.seun)
      return `올해는 회복기를 분기마다 1주씩 꼭 끼워야 함. 세운 ${seun || '丙午'} 압력이 평소보다 1.5배라서, 회복 안 잡으면 4분기에 무너짐. 분기 끝 1주는 미리 캘린더에 박아두는 1년.`
    },
    monthly: ({ signals, ctx }) => {
      const wolun = pillarOf(ctx.wolun)
      return `이번 달 회복 포인트는 3주차. 월운 ${wolun || '甲午'} 정점 지나고 나서 1-2일은 미리 비워둬. 그 시간 안 비우면 4주차에 결정 품질 떨어짐.`
    },
  },
}

const careerNextAction: Angle = {
  key: 'nextAction',
  label: '다음 행동',
  selectSignals(signals, ctx) {
    return rankByActivation(signals, ctx).slice(0, 3)
  },
  render: {
    lifetime: ({ signals }) => {
      const kws = keywordsOf(signals, 2)
      return `평생 차원에서 너의 next move는 단순함: (1) 기준선을 먼저 적기, (2) 사람한테 confirm, (3) 한 박자 늦게 확정. ${kws ? `${kws} 신호가 흔들릴 때마다 이 3단계 돌리면 회복 빠름.` : ''}`
    },
    yearly: ({ signals, ctx }) => {
      const seun = pillarOf(ctx.seun)
      const kws = keywordsOf(signals, 2)
      return `올해 안에 꼭 해야 할 3가지: (1) 외부 멘토 1명과 분기별 미팅 정착, (2) 5년 이력서 한 줄 기획 — 어떤 한 줄을 남길 건가, (3) 분기 회복 1주 캘린더 고정. 세운 ${seun || '丙午'}이 ${kws || '실행 압력'}으로 같이 밀어줌.`
    },
    monthly: ({ signals, ctx }) => {
      const wolun = pillarOf(ctx.wolun)
      const topKw = humanizeKeyword(signals[0]?.keyword) || '핵심 결정'
      return `이번 주 안에: (1) ${topKw} 점검, (2) 외부 멘토 1명에 연락 들어가기, (3) 큰 결정은 한 박자 미루기. 월운 ${wolun || '甲午'} 정점이 지나면 같은 결정의 색이 달라질 수 있어.`
    },
  },
}

export const CAREER_ANGLES: Angle[] = [
  careerEssence,
  careerStrength,
  careerWeakness,
  careerTiming,
  careerPeople,
  careerMoneyVsMeaning,
  careerRecovery,
  careerNextAction,
]

// ============================================
// Public API
// ============================================

export function renderTheme(
  angles: Angle[],
  signals: NormalizedSignal[],
  ctx: ActivationContext,
  period: ReportPeriodScope
): RenderedAngle[] {
  return angles.map((angle) => {
    const selected = angle.selectSignals(signals, ctx)
    const renderer = angle.render[period]
    const prose = renderer({ signals: selected, ctx })
    return {
      angle: angle.key,
      label: angle.label,
      prose,
      evidence: selected.slice(0, 3).map((s) => ({
        id: s.id,
        keyword: s.keyword,
        sajuBasis: s.sajuBasis,
        astroBasis: s.astroBasis,
        polarity: s.polarity,
      })),
    }
  })
}
