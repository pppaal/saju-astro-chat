/**
 * 원국(natal) 교차 평가기 — 공개 진입점(배럴).
 *
 * 사주의 고정 정체성과 점성의 고정 정체성을 "같은 대응 지식"(오행 생극 +
 * 17 A급 십신/신살↔행성 매핑 + essential dignity)으로 교차해 도메인별 판정을 낸다.
 * 사용자에게 보이는 reason 문구는 전문용어 없이 일상어로 쓴다. DB·네트워크 의존 없음.
 *
 * 구현은 세 모듈로 분리:
 *  - natalCrossShared:     원소 정규화/관계·라벨·매핑·행성 결 헬퍼(공통 leaf)
 *  - natalCrossVerdict:    오행 관계 → 판정 문구(reason) 생성
 *  - natalCrossEvaluators: 도메인별 평가기(evalIdentity 등 23종)
 * 이 파일은 그 셋을 재노출하고, 도메인 판정들을 모으는 synthesize 만 직접 보유한다.
 */

import { type SajuElement } from '@/lib/saju/elementBridge'
import {
  EL_KO,
  EL_EN,
  type CrossTone,
  type CrossVerdict,
  type NatalSynthesis,
} from './natalCrossShared'

export * from './natalCrossShared'
export * from './natalCrossVerdict'
export * from './natalCrossEvaluators'

// ── 종합 ──────────────────────────────────────────────────────────────────

/** 도메인 판정들을 모아 전체 정체성 한 문장 생성. */
export function synthesize(
  verdicts: CrossVerdict[],
  sharedElement?: SajuElement,
  elementCounts?: Record<string, number>
): NatalSynthesis | null {
  if (verdicts.length === 0) return null
  let resonant = 0
  let complement = 0
  let tension = 0
  for (const v of verdicts) {
    // 공망/카르마(결핍 축)는 '같은 얘길 해요'(resonant) 톤이라도 강점 수렴이 아니라
    // 평생 숙제라, '잘 맞아요' 집계에서 제외한다(막대·라벨이 결핍을 강점으로 오인 방지).
    if (v.karmaAxis) continue
    if (v.tone === 'resonant') resonant++
    else if (v.tone === 'complement') complement++
    else if (v.tone === 'tension') tension++
  }
  let tone: CrossTone = 'neutral'
  if (resonant >= complement && resonant >= tension && resonant > 0) tone = 'resonant'
  else if (complement >= tension && complement > 0) tone = 'complement'
  else if (tension > 0) tone = 'tension'

  // resonant 가 우세로 잡혀도 complement 와 비등하면 "강하게 수렴"은 과장이다
  // (보완=서로 다름이라 수렴이 아님). 명확한 다수일 때만 strong-converge 라벨.
  const total = resonant + complement + tension
  const resonantClear =
    tone === 'resonant' &&
    resonant > complement &&
    resonant - complement >= Math.max(2, Math.round(total * 0.15))

  const labelKo =
    tone === 'resonant'
      ? resonantClear
        ? '사주와 별자리가 한 방향으로 강하게 모이는'
        : '사주와 별자리가 대체로 같은 방향이면서 폭도 넓은'
      : tone === 'complement'
        ? '사주와 별자리가 서로 부족을 채워주는'
        : tone === 'tension'
          ? '사주와 별자리가 서로 당기며 단련시키는'
          : '뚜렷한 쏠림 없이 고른'
  const labelEn =
    tone === 'resonant'
      ? resonantClear
        ? 'strongly converging'
        : 'many-sided yet aligned'
      : tone === 'complement'
        ? 'mutually complementary'
        : tone === 'tension'
          ? 'creatively tense'
          : 'evenly balanced'

  const axisKo = sharedElement ? ` 가장 두드러진 기운은 ${EL_KO[sharedElement]}이에요.` : ''
  const axisEn = sharedElement ? ` The strongest thread is ${EL_EN[sharedElement]}.` : ''

  // 톤별 해석 한 단락 — 전체 패턴이 삶에서 어떻게 작동하는지.
  const elabKo =
    tone === 'resonant'
      ? resonantClear
        ? ' 동양(사주)과 서양(별자리)이 대체로 같은 방향을 가리켜, 자기 색이 또렷하고 추진력이 강점이에요. 다만 한쪽으로 쏠리기 쉬우니, 가끔 반대 결도 의식하면 균형이 좋아져요.'
        : ' 한 방향으로 통하는 축이 많으면서도, 서로 보완하는 축도 그만큼 있어요 — 자기 색은 또렷하되 상황 따라 여러 모습을 꺼내 쓰는 폭이 함께 있는 사람이에요.'
      : tone === 'complement'
        ? ' 두 시스템이 서로 다른 얘기를 하지만, 그게 오히려 빈자리를 메워줘요. 겉과 속, 타고난 결과 드러나는 모습이 달라 상황마다 여러 모습을 꺼내 쓰는 폭넓은 사람이에요.'
        : tone === 'tension'
          ? ' 사주와 별자리가 서로 당기는 자리가 많아, 안에서 두 결의 갈등을 느낄 때가 있어요. 하지만 그 긴장이 깊이와 성장의 동력이 됩니다 — 한쪽을 누르기보다 둘을 번갈아 쓰는 리듬을 만들면 강점이 돼요.'
          : ' 어느 한쪽으로 크게 쏠리지 않아 균형 감각이 좋아요. 상황에 따라 다른 면을 자연스럽게 꺼내 쓰는 유연함이 있어요.'
  const elabEn =
    tone === 'resonant'
      ? resonantClear
        ? ' East (Saju) and West (astrology) mostly point the same way, so your sense of self is clear and your drive is a strength. Just watch for one-sidedness — touch the opposite grain now and then.'
        : ' Many axes line up in one direction, yet just as many complement each other — your sense of self is clear, but you also carry the range to show different sides as the situation calls.'
      : tone === 'complement'
        ? ' The two systems say different things, yet they fill each other’s gaps. Inner and outer differ, giving you a wide range to draw on depending on the situation.'
        : tone === 'tension'
          ? ' Saju and astrology pull against each other in several places, so you may feel inner friction — but that tension fuels depth and growth. Alternate between the two rather than suppressing one.'
          : ' No strong lean either way gives you good balance, and you can switch between different sides as the situation calls.'

  // 오행 정확 분포 한 줄 — 같은 톤·유형이어도 사람마다 기운의 두께·빈자리가
  // 달라 종합이 개인화된다(범주가 아닌 실제 개수 기반).
  let distKo = ''
  let distEn = ''
  if (elementCounts) {
    const els: SajuElement[] = ['wood', 'fire', 'earth', 'metal', 'water']
    const pairs = els.map((e) => [e, elementCounts[e] ?? 0] as const)
    const dom = pairs.reduce((a, b) => (b[1] > a[1] ? b : a))
    const lacking = pairs.filter(([, n]) => n === 0).map(([e]) => e)
    distKo =
      ` 오행으로 보면 ${EL_KO[dom[0]]} 기운이 ${dom[1]}개로 가장 두텁고` +
      (lacking.length
        ? `, ${lacking.map((e) => EL_KO[e]).join('·')} 기운은 비어 있어요 — 그 결은 타고나기보다 의식적으로 채워가는 평생 과제예요.`
        : `, 다섯 기운이 비교적 고르게 퍼져 균형감이 좋은 편이에요.`)
    distEn =
      ` By element, ${EL_EN[dom[0]]} is thickest at ${dom[1]}` +
      (lacking.length
        ? `, while ${lacking.map((e) => EL_EN[e]).join(' and ')} ${lacking.length > 1 ? 'are' : 'is'} empty — a grain you build deliberately rather than inherit, a lifelong task.`
        : `, with all five fairly evenly spread — a well-balanced makeup.`)
  }

  return {
    tone,
    text: {
      ko: `잘 맞는 게 ${resonant}개, 서로 채워주는 게 ${complement}개, 부딪히는 게 ${tension}개 — ${labelKo} 사람이에요.${axisKo}${elabKo}${distKo}`,
      en: `${resonant} aligned · ${complement} complementary · ${tension} in tension — a ${labelEn} identity.${axisEn}${elabEn}${distEn}`,
    },
  }
}
