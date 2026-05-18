// src/lib/fusion/lifeReport/sections/headline.ts
// "한 줄 정의" — fuses the most identifying signals (day master, geokguk,
// Sun, Moon, ASC, dominant planet, themes) into a 2–3 sentence headline.
//
// Absorbs:
//   • saju/comprehensiveReport.ts → day master + ilju summary
//   • astrology/synthesis.ts      → element/modality/dominant planet
//   • saju/orthodoxInterpretation → ilju archetype phrasing

import type { BuilderInput, Headline } from '../types'
import {
  dayElement,
  dayBranch,
  geokgukType,
  dayStrength,
  jonggeokType,
  isJonggeok,
} from '../signals/sajuSignals'
import {
  elementBalance,
  modalityBalance,
  dominantPlanet,
  findPlanet,
} from '../signals/astroSynthesis'
import { planetLabel, signLabel } from '../templates/sentences'

// 일간 한자 → 한글 라벨
const STEM_LABEL: Record<string, string> = {
  甲: '갑목(甲木)',
  乙: '을목(乙木)',
  丙: '병화(丙火)',
  丁: '정화(丁火)',
  戊: '무토(戊土)',
  己: '기토(己土)',
  庚: '경금(庚金)',
  辛: '신금(辛金)',
  壬: '임수(壬水)',
  癸: '계수(癸水)',
}

const STEM_LABEL_EN: Record<string, string> = {
  甲: 'Yang Wood (甲)',
  乙: 'Yin Wood (乙)',
  丙: 'Yang Fire (丙)',
  丁: 'Yin Fire (丁)',
  戊: 'Yang Earth (戊)',
  己: 'Yin Earth (己)',
  庚: 'Yang Metal (庚)',
  辛: 'Yin Metal (辛)',
  壬: 'Yang Water (壬)',
  癸: 'Yin Water (癸)',
}

const STRENGTH_LABEL_KO: Record<string, string> = {
  verystrong: '매우 강한',
  strong: '강한',
  balanced: '균형 잡힌',
  weak: '여린',
  veryweak: '매우 여린',
}
const STRENGTH_LABEL_EN: Record<string, string> = {
  verystrong: 'very strong',
  strong: 'strong',
  balanced: 'balanced',
  weak: 'tender',
  veryweak: 'very tender',
}

const ELEMENT_FLAVOR_KO: Record<string, string> = {
  fire: '불(화)',
  earth: '흙(토)',
  air: '바람(풍)',
  water: '물(수)',
}
const ELEMENT_FLAVOR_EN: Record<string, string> = {
  fire: 'Fire',
  earth: 'Earth',
  air: 'Air',
  water: 'Water',
}

export function buildHeadline(input: BuilderInput): Headline {
  const { saju, astro } = input
  const sajuUsed: string[] = []
  const astroUsed: string[] = []

  // ─ saju side
  const dayStem = saju.pillars.day.stem
  const dayEl = dayElement(saju)
  const dayBr = dayBranch(saju)
  if (dayBr) sajuUsed.push('pillars.day.branch')
  const geokguk = geokgukType(saju)
  const strength = dayStrength(saju)
  const isJong = isJonggeok(saju)
  const jongType = isJong ? jonggeokType(saju) : ''
  const ilju = saju.ultraAdvanced?.iljuDeep?.ilju || ''
  const iljuChar = saju.ultraAdvanced?.iljuDeep?.iljuCharacter || ''
  if (dayStem) sajuUsed.push('pillars.day.stem')
  if (dayEl) sajuUsed.push('pillars.day.element')
  if (geokguk) sajuUsed.push('advanced.geokguk.type')
  if (strength) sajuUsed.push('advanced.strength.level')
  if (jongType) sajuUsed.push('ultraAdvanced.jonggeok.type')
  if (ilju) sajuUsed.push('ultraAdvanced.iljuDeep.ilju')

  // ─ astro side
  const sun = findPlanet(astro, 'Sun')
  const moon = findPlanet(astro, 'Moon')
  const asc = astro.ascendant
  if (sun) astroUsed.push('planets.sun')
  if (moon) astroUsed.push('planets.moon')
  if (asc) astroUsed.push('ascendant')
  const el = elementBalance(astro)
  const mod = modalityBalance(astro)
  if (el) astroUsed.push('synthesis.element.dominant')
  if (mod) astroUsed.push('synthesis.modality.dominant')
  const dom = dominantPlanet(astro)
  if (dom) astroUsed.push('synthesis.dominantPlanet')

  // ─ Sentence 1 — saju identity
  const stemLabelKo = STEM_LABEL[dayStem] || dayStem || '일간'
  const stemLabelEn = STEM_LABEL_EN[dayStem] || dayStem || 'day master'
  const strengthKo = STRENGTH_LABEL_KO[strength] || ''
  const strengthEn = STRENGTH_LABEL_EN[strength] || ''
  const geokgukKo = geokguk ? ` ${geokguk}` : ''
  const geokgukEn = geokguk ? `, ${geokguk} pattern` : ''
  const jongKo = jongType ? `(${jongType}으로 한 방향으로 흐르는 결)` : ''
  const jongEn = jongType ? ` (running as a single-direction ${jongType} chart)` : ''

  const s1ko =
    `당신은 ${strengthKo ? strengthKo + ' ' : ''}${stemLabelKo}${geokgukKo}${jongKo ? ' ' + jongKo : ''}` +
    `${ilju ? `, ${ilju} 일주의 결` : ''}을 가진 사람이에요.`
  const s1en =
    `You carry a ${strengthEn ? strengthEn + ' ' : ''}${stemLabelEn}${geokgukEn}${jongEn}` +
    `${ilju ? `, an ${ilju} day-pillar` : ''}.`

  // ─ Sentence 2 — astrology identity
  const sunPart = sun
    ? `${signLabel(sun.sign, 'ko')} 태양${sun.house ? ` ${sun.house}H` : ''}`
    : ''
  const moonPart = moon
    ? `${signLabel(moon.sign, 'ko')} 달${moon.house ? ` ${moon.house}H` : ''}`
    : ''
  const ascPart = asc ? `${signLabel(asc.sign, 'ko')} ASC` : ''
  const skyParts = [sunPart, moonPart, ascPart].filter(Boolean).join(' · ')

  const sunPartEn = sun
    ? `Sun in ${signLabel(sun.sign, 'en')}${sun.house ? ` (${sun.house}H)` : ''}`
    : ''
  const moonPartEn = moon
    ? `Moon in ${signLabel(moon.sign, 'en')}${moon.house ? ` (${moon.house}H)` : ''}`
    : ''
  const ascPartEn = asc ? `${signLabel(asc.sign, 'en')} rising` : ''
  const skyPartsEn = [sunPartEn, moonPartEn, ascPartEn].filter(Boolean).join(' · ')

  const s2ko = skyParts
    ? `점성으로는 ${skyParts}의 결을 가진 운명이에요.`
    : ''
  const s2en = skyPartsEn
    ? `Astrologically, you are shaped by ${skyPartsEn}.`
    : ''

  // ─ Sentence 3 — fusion theme (dominant element + dominant planet + ilju soul)
  const domEl = el?.dominant
  const domModality = mod?.dominant
  const lackEl = el?.lacking
  const balanceFlavorKo = domEl
    ? `${ELEMENT_FLAVOR_KO[domEl]} 기운이 차트의 무게중심이고`
    : ''
  const balanceFlavorEn = domEl
    ? `${ELEMENT_FLAVOR_EN[domEl]} carries the centre of gravity`
    : ''
  const modFlavorKo = domModality
    ? ` ${modalityKo(domModality)}`
    : ''
  const modFlavorEn = domModality
    ? `, with a ${domModality} cadence`
    : ''
  const domPlanetKo = dom ? `${planetLabel(dom, 'ko')}이 차트를 이끄는 별이에요` : ''
  const domPlanetEn = dom ? `, led by ${planetLabel(dom, 'en')}` : ''
  const lackKo = lackEl ? `, ${ELEMENT_FLAVOR_KO[lackEl]} 결은 비어 있어요` : ''
  const lackEn = lackEl ? `, while ${ELEMENT_FLAVOR_EN[lackEl]} stays unfilled` : ''

  const iljuCharShortKo = iljuChar ? `한 마디로 '${shortenKo(iljuChar)}' 결의 사람이에요.` : ''
  const iljuCharShortEn = iljuChar ? `In one line: '${shortenEn(iljuChar)}'.` : ''

  const s3ko = paragraphJoin([
    balanceFlavorKo + modFlavorKo + (domPlanetKo ? `, ${domPlanetKo}` : '') + lackKo + '.',
    iljuCharShortKo,
  ])
  const s3en = paragraphJoin([
    balanceFlavorEn + modFlavorEn + domPlanetEn + lackEn + '.',
    iljuCharShortEn,
  ])

  return {
    ko: paragraphJoin([s1ko, s2ko, s3ko]),
    en: paragraphJoin([s1en, s2en, s3en]),
    signals: { saju: sajuUsed, astro: astroUsed },
  }
}

function modalityKo(m: 'cardinal' | 'fixed' | 'mutable'): string {
  if (m === 'cardinal') return '시작을 여는 카디널 리듬으로'
  if (m === 'fixed') return '버티며 응축하는 픽스드 리듬으로'
  return '유연하게 변하는 뮤터블 리듬으로'
}

function shortenKo(s: string): string {
  // Drop tail after first period/comma so the headline stays tight.
  const m = s.split(/[\.。,，]/)[0]
  return m.trim().slice(0, 40)
}

function shortenEn(s: string): string {
  const m = s.split(/[\.。,，]/)[0]
  return m.trim().slice(0, 50)
}

function paragraphJoin(parts: string[]): string {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

// Re-export for tests / parameter type consumers
export type { Headline } from '../types'
