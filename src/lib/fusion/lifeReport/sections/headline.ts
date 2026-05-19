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

// 일간 한자 → 한글 라벨 (한자 표기는 빼고 자연스러운 한글 음만)
const STEM_LABEL: Record<string, string> = {
  甲: '갑목',
  乙: '을목',
  丙: '병화',
  丁: '정화',
  戊: '무토',
  己: '기토',
  庚: '경금',
  辛: '신금',
  壬: '임수',
  癸: '계수',
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
  verystrong: '내면이 매우 단단한',
  strong: '심지가 단단한',
  balanced: '균형이 잘 잡힌',
  weak: '섬세하고 여린',
  veryweak: '아주 섬세한',
}
const STRENGTH_LABEL_EN: Record<string, string> = {
  verystrong: 'very strong',
  strong: 'strong',
  balanced: 'balanced',
  weak: 'tender',
  veryweak: 'very tender',
}

const ELEMENT_FLAVOR_KO: Record<string, string> = {
  fire: '뜨겁고 빛나는 불',
  earth: '단단히 받치는 흙',
  air: '가볍게 흐르는 바람',
  water: '깊이 흐르는 물',
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

  // ─ Sentence 1 — saju identity (짧고 단단하게)
  const stemLabelKo = STEM_LABEL[dayStem] || dayStem || '본성'
  const stemLabelEn = STEM_LABEL_EN[dayStem] || dayStem || 'day master'
  const strengthKo = STRENGTH_LABEL_KO[strength] || ''
  const strengthEn = STRENGTH_LABEL_EN[strength] || ''
  const geokgukKo = geokguk ? ` 삶의 큰 흐름은 ${geokgukFlavorKo(geokguk)}이에요.` : ''
  const geokgukEn = geokguk ? `, ${geokguk} pattern` : ''
  const jongKo = jongType ? ' 한 방향으로 강하게 흐르는 성향도 함께 있어요.' : ''
  const jongEn = jongType ? ` (running as a single-direction ${jongType} chart)` : ''

  const s1ko =
    `당신은 ${strengthKo ? strengthKo + ' ' : ''}${stemLabelKo} 성향을 타고난 사람이에요.` +
    `${geokgukKo}${jongKo}`
  const s1en =
    `You carry a ${strengthEn ? strengthEn + ' ' : ''}${stemLabelEn}${geokgukEn}${jongEn}` +
    `${ilju ? `, an ${ilju} day-pillar` : ''}.`

  // ─ Sentence 2 — astrology identity (자연스러운 분리 문장)
  const sunPart = sun
    ? `자아의 별인 태양은 ${signLabel(sun.sign, 'ko')}에서 빛나고`
    : ''
  const moonPart = moon
    ? `감정의 달은 ${signLabel(moon.sign, 'ko')}의 톤으로 흐르고`
    : ''
  const ascPart = asc
    ? `세상에 비치는 첫인상은 ${signLabel(asc.sign, 'ko')}의 색감이에요`
    : ''
  const skyParts = [sunPart, moonPart, ascPart].filter(Boolean).join(', ')

  const sunPartEn = sun
    ? `Sun in ${signLabel(sun.sign, 'en')}${sun.house ? ` (${sun.house}H)` : ''}`
    : ''
  const moonPartEn = moon
    ? `Moon in ${signLabel(moon.sign, 'en')}${moon.house ? ` (${moon.house}H)` : ''}`
    : ''
  const ascPartEn = asc ? `${signLabel(asc.sign, 'en')} rising` : ''
  const skyPartsEn = [sunPartEn, moonPartEn, ascPartEn].filter(Boolean).join(' · ')

  const s2ko = skyParts
    ? `별로 보면, ${skyParts}.`
    : ''
  const s2en = skyPartsEn
    ? `Astrologically, you are shaped by ${skyPartsEn}.`
    : ''

  // ─ Sentence 3 — fusion theme (짧게, iljuChar raw 제거)
  const domEl = el?.dominant
  const domModality = mod?.dominant
  const lackEl = el?.lacking
  const balanceFlavorKo = domEl
    ? `${ELEMENT_FLAVOR_KO[domEl]} 기운이 삶의 무게중심을 잡아요.`
    : ''
  const balanceFlavorEn = domEl
    ? `${ELEMENT_FLAVOR_EN[domEl]} carries the centre of gravity`
    : ''
  const modFlavorKo = domModality
    ? ` ${modalityKo(domModality)}.`
    : ''
  const modFlavorEn = domModality
    ? `, with a ${domModality} cadence`
    : ''
  const domPlanetKo = dom ? ` ${planetLabel(dom, 'ko')}이 인생을 이끄는 별이에요.` : ''
  const domPlanetEn = dom ? `, led by ${planetLabel(dom, 'en')}` : ''
  const lackKo = lackEl ? ` ${ELEMENT_FLAVOR_KO[lackEl]} 기운은 살짝 비어 있어요.` : ''
  const lackEn = lackEl ? `, while ${ELEMENT_FLAVOR_EN[lackEl]} stays unfilled` : ''

  // 한자 raw iljuCharacter는 영어에만 짧게 유지, 한국어에선 자연 어색해 제거
  const iljuCharShortEn = iljuChar ? `In one line: '${shortenEn(iljuChar)}'.` : ''

  const s3ko = paragraphJoin([
    balanceFlavorKo,
    modFlavorKo,
    domPlanetKo,
    lackKo,
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
  if (m === 'cardinal') return '새로 시작을 여는 리듬이에요'
  if (m === 'fixed') return '한 자리에서 깊이 다지는 리듬이에요'
  return '유연하게 변하는 리듬이에요'
}

// 격국을 자연어 의미로 풀어쓰는 헬퍼
function geokgukFlavorKo(g: string): string {
  if (!g) return '본연의 모양'
  if (g.includes('편관')) return '도전과 책임이 무게로 다가오는 모양'
  if (g.includes('정관')) return '책임감으로 자리 잡는 모양'
  if (g.includes('편재')) return '기회를 잡는 감각이 빛나는 모양'
  if (g.includes('정재')) return '꾸준히 자원을 쌓아가는 모양'
  if (g.includes('식신')) return '여유롭게 표현하고 창조하는 모양'
  if (g.includes('상관')) return '재능을 자유롭게 발산하는 모양'
  if (g.includes('편인')) return '독특한 직관과 비주류 지혜의 모양'
  if (g.includes('정인')) return '배움과 돌봄으로 흐르는 길'
  if (g.includes('비견') || g.includes('겁재')) return '동료와 함께 가는 길'
  return '본연의 모양'
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
