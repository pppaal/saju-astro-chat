'use client'

/**
 * 궁합 공유 카드 데이터 빌더 — 서버 리포트(CompatReport)에서 공유 카드가 그릴
 * "결과"만 추린다. 점수 산식·종합 문구는 모두 서버/엔진 SSOT 에서 온 값을
 * 표시만 한다(여기서 다시 판단하지 않는다).
 *
 * v2(점수 중심): 막대 나열 대신 ① 큰 궁합 점수 ② 커플 유형 이름(바이럴 훅)
 * ③ 두 사람 일간 오행 ④ 종합 한 줄. "우리 몇 점?"으로 공유되게.
 */

import type { CompatReport } from '@/lib/compatibility/compatReport'
import { verdictText } from '@/components/report/atoms/ScoreBreakdown'
import type { CompatShareCardData, CompatShareElement, CompatCoupleTone } from './CompatShareCard'

// 동·서 교차 tone → 공유용 "커플 유형" 이름(+이모지). 16personalities 식 정체성
// 훅 — 사람들이 공유하는 건 점수보다 "우린 OO형"이라는 라벨이다.
const COUPLE_TYPE: Record<CompatCoupleTone, { ko: string; en: string; emoji: string }> = {
  aligned: { ko: '운명적으로 끌리는 사이', en: 'Destined Pull', emoji: '✨' },
  tension: { ko: '부딪히며 깊어지는 사이', en: 'Forged in Fire', emoji: '🔥' },
  mixed: { ko: '겉과 속이 다른 입체 커플', en: 'Layered Match', emoji: '🌗' },
  neutral: { ko: '은은하게 오래가는 사이', en: 'Quiet & Lasting', emoji: '🌙' },
}

// 일간 오행(한글 한 글자) → 이모지 + 색 + 영문 라벨.
const ELEMENT_META: Record<string, { ko: string; en: string; emoji: string; color: string }> = {
  목: { ko: '목', en: 'Wood', emoji: '🌳', color: '#6fbf8a' },
  화: { ko: '화', en: 'Fire', emoji: '🔥', color: '#ec7b70' },
  토: { ko: '토', en: 'Earth', emoji: '⛰️', color: '#d2ad62' },
  금: { ko: '금', en: 'Metal', emoji: '🔆', color: '#d4d9e2' },
  수: { ko: '수', en: 'Water', emoji: '💧', color: '#69a8e0' },
}

function toElement(el: string | undefined, isKo: boolean): CompatShareElement | null {
  if (!el) return null
  const meta = ELEMENT_META[el]
  if (!meta) return null
  return { label: isKo ? meta.ko : meta.en, emoji: meta.emoji, color: meta.color }
}

export function buildCompatShareData(
  report: CompatReport,
  labelA: string,
  labelB: string,
  isKo: boolean
): CompatShareCardData {
  const band = report.band ?? {}
  const vals = Object.values(band).filter((v): v is number => typeof v === 'number')
  const score = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0

  const tone: CompatCoupleTone = report.crossVerdict?.tone ?? 'neutral'
  const typeMeta = COUPLE_TYPE[tone]

  // 히어로 한 줄 — 동·서 교차 종합이 있으면 그걸(이미 다듬어진 카피, 실명 없음),
  // 없으면 밴드 평균 기반 verdict 라벨로 폴백.
  const keyMessage = report.crossVerdict?.text || verdictText(score, isKo ? 'ko' : 'en')

  // 두 사람 일간 오행 — 시각적 정체성. dayMaster 없으면 생략.
  const dm = report.dayMaster
  const a = toElement(dm?.aEl, isKo)
  const b = toElement(dm?.bEl, isKo)
  const elements = a && b ? { a, b } : null

  // 사용자가 이름을 안 넣어 A/B 기본값이면 중립 제목으로.
  const bothDefault = labelA === 'A' && labelB === 'B'
  const title = bothDefault ? (isKo ? '우리 궁합' : 'Our Match') : `${labelA} ♥ ${labelB}`

  return {
    title,
    score,
    coupleType: { name: isKo ? typeMeta.ko : typeMeta.en, emoji: typeMeta.emoji },
    keyMessage,
    elements,
    isKo,
  }
}
