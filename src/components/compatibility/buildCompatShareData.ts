'use client'

/**
 * 궁합 공유 카드 데이터 빌더 — 서버 리포트(CompatReport)에서 공유 카드가 그릴
 * "결과"만 추린다. 점수 산식·종합 문구는 모두 서버/엔진 SSOT 에서 온 값을
 * 표시만 한다(여기서 다시 판단하지 않는다).
 */

import type { CompatReport } from '@/lib/compatibility/compatReport'
import { verdictText } from '@/components/report/atoms/ScoreBreakdown'
import type { CompatShareCardData, CompatShareScore } from './CompatShareCard'

// ScoreBreakdown 의 밴드 라벨/색조와 동일하게 유지(같은 5개 카테고리).
const BAND_META: Array<{
  key: keyof NonNullable<CompatReport['band']>
  ko: string
  en: string
  tone: 'harmony' | 'tension'
}> = [
  { key: 'eastern_hap', ko: '사주 합', en: 'Saju Union', tone: 'harmony' },
  { key: 'eastern_chung', ko: '사주 충', en: 'Saju Clash', tone: 'tension' },
  { key: 'elements_match', ko: '오행 보완', en: 'Element Match', tone: 'harmony' },
  { key: 'synastry_harmonic', ko: '시너 조화', en: 'Synastry Harmony', tone: 'harmony' },
  { key: 'synastry_tension', ko: '시너 긴장', en: 'Synastry Tension', tone: 'tension' },
]

export function buildCompatShareData(
  report: CompatReport,
  labelA: string,
  labelB: string,
  isKo: boolean
): CompatShareCardData {
  const band = report.band ?? {}
  const scores: CompatShareScore[] = BAND_META.filter((m) => typeof band[m.key] === 'number').map(
    (m) => ({ label: isKo ? m.ko : m.en, value: band[m.key] as number, tone: m.tone })
  )

  // 히어로 한 줄 — 동·서 교차 종합이 있으면 그걸(이미 다듬어진 카피, 실명 없음),
  // 없으면 밴드 평균 기반 verdict 라벨로 폴백.
  const vals = scores.map((s) => s.value)
  const total = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  const keyMessage = report.crossVerdict?.text || verdictText(total, isKo ? 'ko' : 'en')

  // 사용자가 이름을 안 넣어 A/B 기본값이면 중립 제목으로.
  const bothDefault = labelA === 'A' && labelB === 'B'
  const title = bothDefault ? (isKo ? '우리 궁합' : 'Our Compatibility') : `${labelA} ♥ ${labelB}`

  return { title, keyMessage, scores, isKo }
}
