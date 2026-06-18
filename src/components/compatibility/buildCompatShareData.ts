'use client'

/**
 * 궁합 공유 카드 데이터 빌더 — 서버 리포트(CompatReport)에서 공유 카드가 그릴
 * "결과"만 추린다. 점수 산식·문구는 엔진 SSOT 값을 표시만 한다.
 *
 * v6(리포트 카드): 두루뭉술한 한 줄 대신 엔진이 콕 집은 구체 내용을 올린다 —
 * ① 핵심(배우자성 또는 결정적 시너스트리) ② 강점/조심(밴드 최고/최저)
 * ③ 별자리 신호. + 명식 셀(천간·오행) + 커플 유형 + 등급.
 */

import type { CompatReport, CompatBandScores } from '@/lib/compatibility/compatReport'
import { compatTier } from '@/components/report/atoms/ScoreBreakdown'
import type { CompatShareCardData, CompatShareElement, CompatCoupleTone } from './CompatShareCard'

const COUPLE_TYPE: Record<CompatCoupleTone, { ko: string; en: string }> = {
  aligned: { ko: '운명적으로 끌리는 사이', en: 'Destined Pull' },
  tension: { ko: '부딪히며 깊어지는 사이', en: 'Forged in Fire' },
  mixed: { ko: '겉과 속이 다른 입체 커플', en: 'Layered Match' },
  neutral: { ko: '은은하게 오래가는 사이', en: 'Quiet & Lasting' },
}

// 일간 오행(한글) → 한자 + 명식 셀 색(SajuChart 라이트 테마와 동일 오행 색).
const ELEMENT_META: Record<string, { hanja: string; textColor: string; bgColor: string }> = {
  목: { hanja: '木', textColor: '#047857', bgColor: '#ecfdf5' },
  화: { hanja: '火', textColor: '#be123c', bgColor: '#fff1f2' },
  토: { hanja: '土', textColor: '#b45309', bgColor: '#fffbeb' },
  금: { hanja: '金', textColor: '#334155', bgColor: '#f1f5f9' },
  수: { hanja: '水', textColor: '#0369a1', bgColor: '#f0f9ff' },
}

// 밴드별 라벨 — 강점(높을 때)/조심(낮을 때)로 의미가 뒤집히는 chung·tension 포함.
const BAND_STRENGTH: Record<keyof CompatBandScores, { ko: string; en: string }> = {
  eastern_hap: { ko: '사주 합', en: 'Saju union' },
  eastern_chung: { ko: '충 없이 안정', en: 'No clash' },
  elements_match: { ko: '오행 보완', en: 'Element match' },
  synastry_harmonic: { ko: '별자리 조화', en: 'Star harmony' },
  synastry_tension: { ko: '긴장 없이 편안', en: 'Easy, no tension' },
}
const BAND_CAUTION: Record<keyof CompatBandScores, { ko: string; en: string }> = {
  eastern_hap: { ko: '끌림이 약함', en: 'Weak pull' },
  eastern_chung: { ko: '충돌 신호', en: 'Clash signal' },
  elements_match: { ko: '오행 보완 부족', en: 'Low element match' },
  synastry_harmonic: { ko: '조화가 약함', en: 'Low harmony' },
  synastry_tension: { ko: '별자리 긴장', en: 'Star tension' },
}

function relationWord(
  relation: 'same' | 'aControlsB' | 'bControlsA' | 'generate' | undefined,
  isKo: boolean
): string | undefined {
  if (!relation) return undefined
  if (isKo) return relation === 'same' ? '비화' : relation === 'generate' ? '상생' : '상극'
  return relation === 'same' ? 'same' : relation === 'generate' ? 'generates' : 'tempers'
}

function truncate(text: string, max: number): string {
  const t = (text || '').trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

function toElement(stem: string | undefined, el: string | undefined): CompatShareElement | null {
  if (!el) return null
  const meta = ELEMENT_META[el]
  if (!meta) return null
  return { stem: stem ?? '', el: meta.hanja, textColor: meta.textColor, bgColor: meta.bgColor }
}

// 강점/조심 — 밴드 최고/최저(둘 다 "높을수록 좋음"으로 정규화된 값).
function strengthCaution(
  band: CompatBandScores,
  isKo: boolean
): { strength?: string; caution?: string } {
  const entries = Object.entries(band).filter(([, v]) => typeof v === 'number') as Array<
    [keyof CompatBandScores, number]
  >
  if (entries.length < 2) return {}
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const top = sorted[0][0]
  const bottom = sorted[sorted.length - 1][0]
  return {
    strength: isKo ? BAND_STRENGTH[top].ko : BAND_STRENGTH[top].en,
    caution: isKo ? BAND_CAUTION[bottom].ko : BAND_CAUTION[bottom].en,
  }
}

// 배우자성 한 줄 — 일주(배우자궁)에 뜬 배우자성이 있으면 콕 집어 말한다(한국어만 —
// 십성 라벨이 한국어라 EN 에는 새지 않게 시너스트리 신호로 대체).
function spouseLine(
  report: CompatReport,
  labelA: string,
  labelB: string,
  isKo: boolean
): string | undefined {
  if (!isKo) return undefined
  const sp = report.spouseStars.find((s) => s.isDayPillar) ?? report.spouseStars[0]
  if (!sp) return undefined
  const feeling = sp.role.match(/\(([^)]+)\)/)?.[1] ?? sp.role
  const who = sp.from === 'A' ? labelA : labelB
  const other = sp.from === 'A' ? labelB : labelA
  const seat = sp.isDayPillar ? ' — 그것도 배우자 자리에 떴어요' : ''
  return `${who}에게 ${other}, ‘${feeling}’의 짝${seat}`
}

// 결정적 시너스트리 한 줄 — 가장 강한 어스펙트. "금성 ↔ 화성 · 트라인".
function signalLine(report: CompatReport): string | undefined {
  const a0 = report.synView?.aspects?.[0]
  if (!a0) return undefined
  return `${a0.a} ↔ ${a0.b} · ${a0.label}`
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
  const total = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  const tone: CompatCoupleTone = report.crossVerdict?.tone ?? 'neutral'

  const spouse = spouseLine(report, labelA, labelB, isKo)
  const signal = signalLine(report)
  // 핵심 = 배우자성(가장 구체) 우선, 없으면 시너스트리, 그것도 없으면 종합 한 줄.
  const headline = spouse
    ? truncate(spouse, 64)
    : signal
      ? truncate(signal, 40)
      : truncate(report.crossVerdict?.text ?? '', 64)
  // 별자리 줄 — 핵심이 배우자성일 때만 별도로(중복 회피).
  const signalRow = spouse && signal ? truncate(signal, 40) : undefined

  const { strength, caution } = strengthCaution(band, isKo)

  const dm = report.dayMaster
  const a = toElement(dm?.aStem, dm?.aEl)
  const b = toElement(dm?.bStem, dm?.bEl)
  const elements = a && b ? { a, b, relation: relationWord(dm?.relation, isKo) } : null

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
    headline,
    signal: signalRow,
    strength,
    caution,
    elements,
    isKo,
  }
}
