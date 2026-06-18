'use client'

/**
 * 궁합 공유 카드 데이터 빌더 — 서버 리포트(CompatReport)에서 공유 카드가 그릴
 * "결과"만 추린다. 점수 산식·종합 문구는 모두 서버/엔진 SSOT 에서 온 값을
 * 표시만 한다(여기서 다시 판단하지 않는다).
 *
 * v3: 가짜 정밀 "N/100" 숫자는 박지 않는다(앱 정책과 동일) — 대신 ① 커플 유형
 * 이름(바이럴 훅) ② 등급 단어(tier) ③ 두 사람 일간 오행 ④ 종합 한 줄.
 * 캡처 안정성을 위해 이모지 대신 오행 색을 카드에서 색 점으로 그린다.
 */

import type { CompatReport } from '@/lib/compatibility/compatReport'
import { compatTier, verdictText } from '@/components/report/atoms/ScoreBreakdown'
import type { CompatShareCardData, CompatShareElement, CompatCoupleTone } from './CompatShareCard'

// 동·서 교차 tone → 공유용 "커플 유형" 이름. 16personalities 식 정체성 훅 —
// 사람들이 공유하는 건 점수보다 "우린 OO형"이라는 라벨이다.
const COUPLE_TYPE: Record<CompatCoupleTone, { ko: string; en: string }> = {
  aligned: { ko: '운명적으로 끌리는 사이', en: 'Destined Pull' },
  tension: { ko: '부딪히며 깊어지는 사이', en: 'Forged in Fire' },
  mixed: { ko: '겉과 속이 다른 입체 커플', en: 'Layered Match' },
  neutral: { ko: '은은하게 오래가는 사이', en: 'Quiet & Lasting' },
}

// 일간 오행(한글 한 글자) → 한자 + 색. (사주 카드라 오행은 한자로 — 火水木金土.
// 이모지는 캡처 불안정 → 카드에서 이 색으로 점을 그린다.)
const ELEMENT_META: Record<string, { hanja: string; en: string; color: string }> = {
  목: { hanja: '木', en: 'Wood', color: '#6fbf8a' },
  화: { hanja: '火', en: 'Fire', color: '#ec7b70' },
  토: { hanja: '土', en: 'Earth', color: '#d2ad62' },
  금: { hanja: '金', en: 'Metal', color: '#cdd3dd' },
  수: { hanja: '水', en: 'Water', color: '#69a8e0' },
}

// 일간 오행 관계(상생/상극/비화) — 한 단어로.
function relationWord(
  relation: 'same' | 'aControlsB' | 'bControlsA' | 'generate' | undefined,
  isKo: boolean
): string | undefined {
  if (!relation) return undefined
  if (isKo) {
    if (relation === 'same') return '비화'
    if (relation === 'generate') return '상생'
    return '상극'
  }
  if (relation === 'same') return 'same'
  if (relation === 'generate') return 'generates'
  return 'tempers'
}

// 공유 카드 한 줄/제목 넘침 방지용 — 1080px 고정 카드라 긴 한글은 잘라준다.
function truncate(text: string, max: number): string {
  const t = (text || '').trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

// 천간(한자) + 오행 한자. 예: 丙 + 火 → "丙火". 영어는 stem 한자 + 영문 오행.
function toElement(
  stem: string | undefined,
  el: string | undefined,
  isKo: boolean
): CompatShareElement | null {
  if (!el) return null
  const meta = ELEMENT_META[el]
  if (!meta) return null
  const s = stem ?? ''
  const label = isKo ? `${s}${meta.hanja}` : `${s} ${meta.en}`
  return { label, color: meta.color }
}

export function buildCompatShareData(
  report: CompatReport,
  labelA: string,
  labelB: string,
  isKo: boolean
): CompatShareCardData {
  const lang = isKo ? 'ko' : 'en'
  const band = report.band ?? {}
  const vals = Object.values(band).filter((v): v is number => typeof v === 'number')
  // 차트(ScoreBreakdown)와 동일한 방식의 총점 — 단, 화면엔 숫자가 아니라 등급
  // 단어로만 표시한다(가짜 정밀 회피 + 카드===차트 일치).
  const total = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0

  const tone: CompatCoupleTone = report.crossVerdict?.tone ?? 'neutral'

  // 히어로 한 줄 — 동·서 교차 종합이 있으면 그걸(이미 다듬어진 카피, 실명 없음),
  // 없으면 verdict 문장으로 폴백. 1080 카드 넘침 방지로 길이 제한.
  const keyMessage = truncate(report.crossVerdict?.text || verdictText(total, lang), 78)

  // 두 사람 일간 천간+오행(한자) + 오행 관계. dayMaster 없으면 생략.
  const dm = report.dayMaster
  const a = toElement(dm?.aStem, dm?.aEl, isKo)
  const b = toElement(dm?.bStem, dm?.bEl, isKo)
  const elements = a && b ? { a, b, relation: relationWord(dm?.relation, isKo) } : null

  // 사용자가 이름을 안 넣어 A/B 기본값이면 중립 제목으로. (이름은 길면 자른다.)
  const bothDefault = labelA === 'A' && labelB === 'B'
  const title = bothDefault
    ? isKo
      ? '우리 궁합'
      : 'Our Match'
    : `${truncate(labelA, 8)} ♥ ${truncate(labelB, 8)}`

  return {
    title,
    coupleType: isKo ? COUPLE_TYPE[tone].ko : COUPLE_TYPE[tone].en,
    tier: compatTier(total, lang),
    fillPct: Math.max(0, Math.min(100, total)),
    keyMessage,
    elements,
    isKo,
  }
}
