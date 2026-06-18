'use client'

/**
 * 궁합 공유 카드 데이터 빌더 — 서버 리포트(CompatReport)에서 공유 카드가 그릴
 * "결과"만 추린다. 점수 산식·문구는 엔진 SSOT 값을 표시만 한다.
 *
 * v7(바이럴+직관): ① 커플 유형을 tone×오행관계 2축으로 다양하게(정체성 훅,
 * 수집·비교 욕구) ② 전문용어 풀이(상생/상극/비화 → 평이한 말, 오행 한 단어 vibe)
 * ③ 구체 내용(핵심·강점/조심·별자리) ④ 명식 셀.
 */

import type { CompatReport, CompatBandScores } from '@/lib/compatibility/compatReport'
import { compatTier } from '@/components/report/atoms/ScoreBreakdown'
import type { CompatShareCardData, CompatShareElement, CompatCoupleTone } from './CompatShareCard'

type RelGroup = 'generate' | 'controls' | 'same' | 'none'

function relGroupOf(
  relation: 'same' | 'aControlsB' | 'bControlsA' | 'generate' | undefined
): RelGroup {
  if (relation === 'generate') return 'generate'
  if (relation === 'aControlsB' || relation === 'bControlsA') return 'controls'
  if (relation === 'same') return 'same'
  return 'none'
}

// 커플 유형 — tone(끌림/마찰/혼합/잔잔) × 오행관계(생/극/비화). MBTI 식 "OO형"
// 으로 수집·비교·공유 욕구를 자극. 16personalities 의 정체성 훅을 궁합에 적용.
const COUPLE_TYPE: Record<CompatCoupleTone, Record<RelGroup, { ko: string; en: string }>> = {
  aligned: {
    generate: { ko: '서로를 채워주는 보완형', en: 'The Completers' },
    controls: { ko: '끌리면서 길들이는 자석형', en: 'The Magnets' },
    same: { ko: '닮은 결로 통하는 소울형', en: 'The Soulmates' },
    none: { ko: '운명처럼 끌리는 인연형', en: 'The Destined' },
  },
  tension: {
    generate: { ko: '티격태격 그래도 단짝형', en: 'The Bickering Besties' },
    controls: { ko: '부딪히며 단단해지는 단련형', en: 'The Forged' },
    same: { ko: '닮아서 더 부딪히는 라이벌형', en: 'The Rivals' },
    none: { ko: '마찰 속에 깊어지는 애증형', en: 'The Slow Burn' },
  },
  mixed: {
    generate: { ko: '겉바속촉 반전 보완형', en: 'The Surprise Fit' },
    controls: { ko: '밀당의 고수 입체형', en: 'The Push & Pull' },
    same: { ko: '겉과 속이 다른 반전형', en: 'The Two-Sided' },
    none: { ko: '겉과 속이 다른 반전형', en: 'The Two-Sided' },
  },
  neutral: {
    generate: { ko: '잔잔히 채워주는 평온형', en: 'The Calm Pair' },
    controls: { ko: '적당한 긴장의 균형형', en: 'The Balanced' },
    same: { ko: '닮은 듯 편안한 동반자형', en: 'The Companions' },
    none: { ko: '은은하게 오래가는 동반자형', en: 'The Steady' },
  },
}

// 일간 오행(한글) → 한자 + 명식 셀 색(SajuChart 라이트 테마) + 평이한 한 단어 vibe.
const ELEMENT_META: Record<
  string,
  { hanja: string; textColor: string; bgColor: string; ko: string; en: string }
> = {
  목: { hanja: '木', textColor: '#047857', bgColor: '#ecfdf5', ko: '성장', en: 'Growth' },
  화: { hanja: '火', textColor: '#be123c', bgColor: '#fff1f2', ko: '열정', en: 'Passion' },
  토: { hanja: '土', textColor: '#b45309', bgColor: '#fffbeb', ko: '안정', en: 'Ground' },
  금: { hanja: '金', textColor: '#334155', bgColor: '#f1f5f9', ko: '결단', en: 'Resolve' },
  수: { hanja: '水', textColor: '#0369a1', bgColor: '#f0f9ff', ko: '지혜', en: 'Wisdom' },
}

// 밴드별 라벨 — 강점(높을 때)/조심(낮을 때).
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

// 오행 관계 — 전문용어(상생/상극/비화) 대신 평이한 말. (카드는 툴팁이 없어 자명해야 함.)
function relationWord(rel: RelGroup, isKo: boolean): string | undefined {
  if (rel === 'none') return undefined
  if (isKo) {
    return rel === 'generate' ? '서로 북돋움' : rel === 'controls' ? '밀고 당김' : '닮은 기운'
  }
  return rel === 'generate' ? 'lifts each other' : rel === 'controls' ? 'push & pull' : 'alike'
}

function truncate(text: string, max: number): string {
  const t = (text || '').trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

function toElement(
  stem: string | undefined,
  el: string | undefined,
  isKo: boolean
): CompatShareElement | null {
  if (!el) return null
  const meta = ELEMENT_META[el]
  if (!meta) return null
  return {
    stem: stem ?? '',
    el: meta.hanja,
    vibe: isKo ? meta.ko : meta.en,
    textColor: meta.textColor,
    bgColor: meta.bgColor,
  }
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
  return {
    strength: isKo ? BAND_STRENGTH[sorted[0][0]].ko : BAND_STRENGTH[sorted[0][0]].en,
    caution: isKo
      ? BAND_CAUTION[sorted[sorted.length - 1][0]].ko
      : BAND_CAUTION[sorted[sorted.length - 1][0]].en,
  }
}

// 배우자성 한 줄 — 일주(배우자궁) 우선(한국어만 — 십성 라벨이 한국어).
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

// 결정적 시너스트리 한 줄 — 행성명(금성/화성) 대신 "뜻"으로: "사랑 ↔ 끌림 · 조화".
function signalLine(report: CompatReport): string | undefined {
  const a0 = report.synView?.aspects?.[0]
  if (!a0) return undefined
  return `${a0.aRole} ↔ ${a0.bRole} · ${a0.label}`
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
  const rel = relGroupOf(report.dayMaster?.relation)

  const spouse = spouseLine(report, labelA, labelB, isKo)
  const signal = signalLine(report)
  const headline = spouse
    ? truncate(spouse, 64)
    : signal
      ? truncate(signal, 40)
      : truncate(report.crossVerdict?.text ?? '', 64)
  const signalRow = spouse && signal ? truncate(signal, 40) : undefined

  const { strength, caution } = strengthCaution(band, isKo)

  const dm = report.dayMaster
  const a = toElement(dm?.aStem, dm?.aEl, isKo)
  const b = toElement(dm?.bStem, dm?.bEl, isKo)
  const elements = a && b ? { a, b, relation: relationWord(rel, isKo) } : null

  const bothDefault = labelA === 'A' && labelB === 'B'
  const title = bothDefault
    ? isKo
      ? '우리 궁합'
      : 'Our Match'
    : `${truncate(labelA, 8)} ♥ ${truncate(labelB, 8)}`

  const ct = COUPLE_TYPE[tone][rel]

  return {
    title,
    coupleType: isKo ? ct.ko : ct.en,
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
