/**
 * 근거 사다리(evidence ladder) — 한 시점의 근거를 *시간층별 지배신호 1개*로 세운다.
 *
 * 왜: 예전 화면은 (1) 점수·사유·톤이 서로 다른 layer 모집단을 봐서 어긋나고,
 * (2) 전문어가 든 사유를 drop-on-doubt 로 통째로 버려 사용자가 보는 "왜"가
 * 합성 문장으로 떨어졌다(docs/운흐름.md §0.5.0·§5.1, 근거 리서치 D2·D3).
 *
 * 이 deriver 는 그 대신 **10년 → 올해 → 이달 → 오늘** 4개 시간층 각각에서
 * 가장 무거운 신호 1개를 세우고, 각 칸을 "쉬운 결론(본문) + 용어(칩)" 2단으로
 * 낸다. 점수·근거·톤이 같은 사다리를 함께 읽게 하려는 표시용 산출물.
 *
 * 순수 함수. LLM 0번. 사주 pillar-sibsin 이 4층 backbone(용신 대비 polarity),
 * 점성 신호는 같은 층에 있으면 칩 하나로 합류한다.
 */

import type { ActiveSignal, SignalLayer } from '../types'
import { STATIC_NATAL_KINDS } from '../signalTaxonomy'
import { sibsinArea, sibsinAreaEn, sibsinGloss } from './plainLanguage'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { PLANET_KO } from '../data/planetNames'

export type LadderScale = 'decadal' | 'yearly' | 'monthly' | 'daily'
export type Lang = 'ko' | 'en'

export interface EvidenceChip {
  /** 짧은 용어 라벨 — '정재', '금성 △ 금성' 등. */
  text: string
  source: 'saju' | 'astro'
}

export interface EvidenceRung {
  scale: LadderScale
  /** 시간대 라벨 — '10년'/'올해'/'이달'/'오늘'. */
  scaleLabel: string
  /** 전문어 없는 결론 한 줄. */
  conclusion: string
  /** 방향(부호) — 색·톤용. 지배신호 polarity. */
  polarity: number
  /** 용어 칩 — 결론의 출처를 살려 보여준다(버리지 않고 접기). */
  chips: EvidenceChip[]
}

const SCALE_ORDER: LadderScale[] = ['decadal', 'yearly', 'monthly', 'daily']

const SCALE_LABEL: Record<Lang, Record<LadderScale, string>> = {
  ko: { decadal: '10년', yearly: '올해', monthly: '이달', daily: '오늘' },
  en: { decadal: '10-yr', yearly: 'This year', monthly: 'This month', daily: 'Today' },
}

/** 각 사다리 scale 이 어느 신호 layer 를 담는가. (hourly/instant 는 daily 로 접음.) */
const SCALE_LAYERS: Record<LadderScale, SignalLayer[]> = {
  decadal: ['decadal'],
  yearly: ['yearly'],
  monthly: ['monthly'],
  daily: ['daily', 'hourly', 'instant'],
}

const impact = (s: ActiveSignal): number => Math.abs(s.polarity) * s.weight

/**
 * *정통 십신 기둥*(대운/세운/월운/일진 간지의 십신)만 골라 십신명을 준다.
 * 'pillar-sibsin' kind 는 12운성 전이·기신/구신·조후 라인까지 함께 emit 하므로
 * (name 이 '甲申 (비견)' 처럼 `간지 (십신)` 정형인 것만 backbone), 그렇지 않은
 * 파생 라인은 backbone 에서 제외한다. 없으면 undefined.
 */
function primarySibsin(s: ActiveSignal): string | undefined {
  if (s.kind !== 'pillar-sibsin') return undefined
  // '간지 (십신)' 정형만 — evidence.sibsin 은 12운성 전이 라인 등 파생에도 붙어
  // 있어(예 '일진 금 동일 (비겁)') 신뢰 못 함. name 은 stripEvidence 에도 보존됨.
  const m = s.name.match(/^[^\s()]+\s*\(([^)]+)\)\s*$/)
  return m ? m[1].trim() : undefined
}

/** 지배신호 선택 — 같은 layer 후보 중 impact 최대(동점이면 weight, 그래도 id). */
function pickDominant(cands: ActiveSignal[]): ActiveSignal | undefined {
  let best: ActiveSignal | undefined
  for (const s of cands) {
    if (
      !best ||
      impact(s) > impact(best) ||
      // 전순서(total order) tie-break — impact 동점→weight, weight 동점→id.
      // 옛 `weight> || id<` 는 (낮은 weight·낮은 id) 후보가 순서 따라 이겨 결정성이
      // 깨졌다(감사).
      (impact(s) === impact(best) &&
        (s.weight > best.weight || (s.weight === best.weight && s.id < best.id)))
    ) {
      best = s
    }
  }
  return best
}

// 점성 kind → 짧은 칩 라벨. 결론은 사주가 이끌고, 점성은 칩 하나로 합류.
const ASTRO_KIND_CHIP: Record<Lang, Record<string, string>> = {
  ko: {
    profection: '프로펙션',
    'zodiacal-releasing': 'ZR 챕터',
    'solar-return': '솔라리턴',
    'lunar-return': '루나리턴',
    progression: '진행',
    'progressed-moon': '진행 달',
    lifecycle: '행성 마디',
    'moon-phase': '달 위상',
    'void-of-course': '보이드',
    'fixed-star': '항성',
    'arabic-part': '아라빅 파트',
    'house-transit': '하우스 트랜짓',
    'angle-contact': '앵글 접촉',
    dignity: '품위',
    eclipse: '식(蝕)',
    electional: '택일',
    'solar-arc': '솔라아크',
  },
  en: {
    profection: 'profection',
    'zodiacal-releasing': 'ZR',
    'solar-return': 'solar return',
    'lunar-return': 'lunar return',
    progression: 'progression',
    'progressed-moon': 'prog. Moon',
    lifecycle: 'planet phase',
    'moon-phase': 'moon phase',
    'void-of-course': 'void',
    'fixed-star': 'fixed star',
    'arabic-part': 'arabic part',
    'house-transit': 'house transit',
    'angle-contact': 'angle contact',
    dignity: 'dignity',
    eclipse: 'eclipse',
    electional: 'electional',
    'solar-arc': 'solar arc',
  },
}

const ASPECT_MARK: Record<string, string> = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '✶',
  quincunx: '⚻',
  semisextile: '⚺',
}

// PLANET_KO 는 10행성+ASC/MC 만. 트랜짓 natal point 로 자주 오는 교점·소천체·각도점을
// 보강해 KO 칩에 'True Node'/'Chiron' 같은 영문이 새지 않게 한다(감사).
const POINT_KO_EXTRA: Record<string, string> = {
  'True Node': '북교점',
  'North Node': '북교점',
  'South Node': '남교점',
  Node: '교점',
  Chiron: '카이런',
  Lilith: '릴리스',
  Descendant: '하강점',
  DC: '하강점',
  IC: '천저점',
  Vertex: '버텍스',
}
const planetKoOr = (name: string, lang: Lang): string =>
  lang === 'ko' ? (PLANET_KO[name] ?? POINT_KO_EXTRA[name] ?? name) : name

/** 점성 지배신호 → 짧은 칩 라벨. transit 은 '금성 △ 금성', 그 외는 kind 라벨. */
function astroChipText(s: ActiveSignal, lang: Lang): string {
  if (s.kind === 'transit') {
    const planets = s.evidence?.planets
    const mark = ASPECT_MARK[s.evidence?.aspectType ?? ''] ?? '·'
    if (planets && planets.length >= 2) {
      return `${planetKoOr(planets[0], lang)} ${mark} ${planetKoOr(planets[1], lang)}`
    }
    // evidence 없으면 name('Venus △ Venus')의 영문 행성/포인트 토큰만 한글로.
    // 긴 키부터(‘True Node’ 가 ‘Node’ 보다 먼저) 치환해 부분겹침 방지.
    let t = s.name
    if (lang === 'ko') {
      const map: Array<[string, string]> = [
        ...Object.entries(PLANET_KO),
        ...Object.entries(POINT_KO_EXTRA),
      ].sort((a, b) => b[0].length - a[0].length)
      for (const [en, ko] of map) {
        t = t.replace(new RegExp(`\\b${en}\\b`, 'g'), ko)
      }
    }
    return t
  }
  return ASTRO_KIND_CHIP[lang][s.kind] ?? s.kind
}

// 사주 결론 템플릿 — 전문어 0, 방향(부호)·시간층별. area/gloss 는 SIBSIN_DOMAIN.
function sajuConclusion(sibsin: string, scale: LadderScale, polarity: number, lang: Lang): string {
  const area = lang === 'ko' ? sibsinArea(sibsin) : sibsinAreaEn(sibsin)
  const gloss = sibsinGloss(sibsin) // ko 전용 — en 은 area 로 대체
  if (lang === 'ko') {
    const vivid = gloss || area
    if (polarity > 0) {
      const tail: Record<LadderScale, string> = {
        decadal: '큰 흐름으로 받쳐주는 10년',
        yearly: '올해의 무게중심',
        monthly: '이달 순조로운 결',
        daily: '오늘 받쳐주는 기운',
      }
      return `${vivid} — ${tail[scale]}`
    }
    if (polarity < 0) {
      const tail: Record<LadderScale, string> = {
        decadal: '긴 호흡의 시험대가 되는 10년',
        yearly: '올해 눌리기 쉬운 축',
        monthly: '이달 삐걱이는 결',
        daily: '오늘 조심할 지점',
      }
      return `${area} 쪽에 마찰 — ${tail[scale]}`
    }
    return `${vivid} — ${SCALE_LABEL.ko[scale]}의 바탕 기운`
  }
  // en
  if (polarity > 0) {
    const tail: Record<LadderScale, string> = {
      decadal: 'the throughline of this 10-yr stretch',
      yearly: "this year's center of gravity",
      monthly: 'flowing smoothly this month',
      daily: 'a supporting current today',
    }
    return `${area} — ${tail[scale]}`
  }
  if (polarity < 0) {
    const tail: Record<LadderScale, string> = {
      decadal: 'a long-haul test over this 10-yr stretch',
      yearly: 'an axis that gets pressed this year',
      monthly: 'a rough patch this month',
      daily: 'a spot to watch today',
    }
    return `friction around ${area} — ${tail[scale]}`
  }
  return `${area} — the baseline note of ${SCALE_LABEL.en[scale].toLowerCase()}`
}

/** 점성만 있는 층의 결론 — 행성 흐름 한 줄(폴백). */
function astroConclusion(s: ActiveSignal, scale: LadderScale, lang: Lang): string {
  const label = astroChipText(s, lang)
  return lang === 'ko'
    ? `${label} 흐름이 ${SCALE_LABEL.ko[scale]}의 결을 잡아요`
    : `${label} sets the tone for ${SCALE_LABEL.en[scale].toLowerCase()}`
}

/**
 * 신호 다발 → 근거 사다리. scales 로 어느 층을 담을지 제어(월 카드는 daily 생략).
 * 사주 pillar-sibsin 이 backbone, 같은 층 점성 지배신호는 칩으로 합류.
 */
export function deriveEvidenceLadder(
  signals: ActiveSignal[],
  lang: Lang = 'ko',
  scales: LadderScale[] = SCALE_ORDER
): EvidenceRung[] {
  // 정적 본명(명사) 표지는 흐름 근거가 아니므로 제외 — 점수 파이프라인과 동일 기준.
  const live = signals.filter((s) => !STATIC_NATAL_KINDS.has(s.kind))

  const rungs: EvidenceRung[] = []
  for (const scale of scales) {
    const layers = SCALE_LAYERS[scale]
    const inScale = live.filter((s) => layers.includes(s.layer))
    if (inScale.length === 0) continue

    // 사주 backbone — 그 층 간지의 십신 기둥(정통). 파생 라인(12운성·기신 등)은 제외.
    const sajuPrimary = pickDominant(inScale.filter((s) => primarySibsin(s) !== undefined))
    // 십신 기둥이 없을 때만(희귀) 그 층 사주 지배신호로 폴백.
    const sajuFallback = sajuPrimary
      ? undefined
      : pickDominant(inScale.filter((s) => s.source === 'saju' && s.polarity !== 0))
    const astroDom = pickDominant(inScale.filter((s) => s.source === 'astro' && s.polarity !== 0))

    if (!sajuPrimary && !sajuFallback && !astroDom) continue

    const chips: EvidenceChip[] = []
    let conclusion = ''
    let polarity = 0

    if (sajuPrimary) {
      const sibsin = primarySibsin(sajuPrimary)!
      // 칩은 십신 원어 — EN 은 표준 영문 라벨(SIBSIN_EN), 없으면 원어 폴백.
      chips.push({ text: lang === 'en' ? (SIBSIN_EN[sibsin] ?? sibsin) : sibsin, source: 'saju' })
      // 중립 십신(용신 무관, polarity 0)이 강한 점성 driver 를 가리지 않게 — 그 층에
      // 방향 있는 트랜짓이 있으면 톤·결론을 점성에 양보한다(칩은 유지). 안 그러면
      // 강한 트랜짓이 깔린 층이 "…바탕 기운"(중립)으로 잘못 떴다(감사).
      const yieldToAstro = sajuPrimary.polarity === 0 && !!astroDom && astroDom.polarity !== 0
      if (!yieldToAstro) {
        polarity = sajuPrimary.polarity
        conclusion = sajuConclusion(sibsin, scale, sajuPrimary.polarity, lang)
      }
    } else if (sajuFallback) {
      polarity = sajuFallback.polarity
      const label =
        (lang === 'ko' ? sajuFallback.korean : sajuFallback.english) ?? sajuFallback.name
      chips.push({ text: shortLabel(label), source: 'saju' })
    }

    if (astroDom) {
      chips.push({ text: astroChipText(astroDom, lang), source: 'astro' })
      if (!conclusion) {
        conclusion = astroConclusion(astroDom, scale, lang)
        polarity = astroDom.polarity
      }
    }

    if (!conclusion) continue
    rungs.push({ scale, scaleLabel: SCALE_LABEL[lang][scale], conclusion, polarity, chips })
  }

  return rungs
}

/** 칩용 짧은 라벨 — 선행 마커/레이어 태그/괄호 글로스 제거, 20자 컷. */
function shortLabel(label: string): string {
  const t = label
    .replace(/^[↑↓·▲▼]\s*/, '')
    .replace(/\[[^\]]*\]\s*/g, '')
    .replace(/\s*[(（][^)）]*[)）]/g, '')
    .trim()
  return t.length > 20 ? `${t.slice(0, 19)}…` : t
}
