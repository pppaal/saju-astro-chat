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
  dayMasterRoot,
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
  甲: 'Yang Wood',
  乙: 'Yin Wood',
  丙: 'Yang Fire',
  丁: 'Yin Fire',
  戊: 'Yang Earth',
  己: 'Yin Earth',
  庚: 'Yang Metal',
  辛: 'Yin Metal',
  壬: 'Yang Water',
  癸: 'Yin Water',
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
  const rootSummary = dayMasterRoot(saju)
  if (rootSummary) sajuUsed.push('tonggeun.dayMasterRoot')

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
  const stemLabelEn = STEM_LABEL_EN[dayStem] || dayStem || 'core nature'
  const strengthKo = STRENGTH_LABEL_KO[strength] || ''
  const strengthEn = STRENGTH_LABEL_EN[strength] || ''
  const geokgukKo = geokguk ? ` 인생 패턴은 ${geokgukFlavorKo(geokguk)}이에요.` : ''
  const geokgukEn = geokguk ? ` The shape of your life runs as ${geokgukFlavorEn(geokguk)}.` : ''
  const jongKo = jongType ? ' 한 방향으로 강하게 흐르는 성향도 함께 있어요.' : ''
  const jongEn = jongType ? ' A single-direction current also runs strongly through you.' : ''

  // 통근 — 일간이 어디에 뿌리내리는지 한 줄 추가. 모든 레벨(strong/moderate/
  // weak/none)에서 phrase가 자연 한국어로 짧게 표현돼 헤드라인에 무게가
  // 부담되지 않아 그대로 노출.
  const rootKo = rootSummary ? ` ${rootSummary.phraseKo}` : ''
  const rootEn = rootSummary ? ` ${rootSummary.phraseEn}` : ''
  // S1: 본명 핵심 — 일간 + 격국 + (선택적) 종격/통근. 길어지지 않도록 통근은
  // 'none' 인 경우에만 헤드라인에 노출하고, 충분히 강한 통근은 본문에 맡긴다.
  const rootKoSlim = rootSummary && rootSummary.level === 'none' ? ` ${rootSummary.phraseKo}` : ''
  const rootEnSlim = rootSummary && rootSummary.level === 'none' ? ` ${rootSummary.phraseEn}` : ''
  const s1ko =
    `당신은 사주로는 ${strengthKo ? strengthKo + ' ' : ''}${stemLabelKo} 일주로 태어난 사람이에요.` +
    `${geokgukKo}${jongKo}${rootKoSlim}`
  const s1en = `You were born with a ${strengthEn ? strengthEn + ' ' : ''}${stemLabelEn} core.${geokgukEn}${jongEn}${rootEnSlim}`
  // mark rootSummary as used regardless (signal hook), keeps Korean rootKo
  // / rootEn variables alive for callers that want the full phrase.
  void rootKo
  void rootEn

  // ─ Sentence 2 — astrology identity (자연스러운 분리 문장)
  // "별" 단어를 한 문장 안에서 최대 1회로 제한 — 자아=태양, 감정=달은
  // 본문에서 별 라벨 없이 바로 톤만 풀어쓰고, 첫인상은 ASC로 잇는다.
  const sunPart = sun ? `자아는 ${signLabel(sun.sign, 'ko')}에서 빛나고` : ''
  const moonPart = moon ? `감정은 ${signLabel(moon.sign, 'ko')}의 분위기로 흐르며` : ''
  const ascPart = asc ? `세상에 비치는 첫인상은 ${signLabel(asc.sign, 'ko')}의 느낌이에요` : ''
  const skyParts = [sunPart, moonPart, ascPart].filter(Boolean).join(', ')

  const sunPartEn = sun
    ? `your Sun shines in ${signLabel(sun.sign, 'en')}${sun.house ? `'s ${ordinalShort(sun.house)} house` : ''}`
    : ''
  const moonPartEn = moon
    ? `your Moon flows through ${signLabel(moon.sign, 'en')}${moon.house ? `'s ${ordinalShort(moon.house)} house` : ''}`
    : ''
  const ascPartEn = asc ? `the world first reads you as ${signLabel(asc.sign, 'en')} rising` : ''
  const skyPartsEn = [sunPartEn, moonPartEn, ascPartEn].filter(Boolean).join(' · ')

  const s2ko = skyParts ? `별자리로 보면 ${skyParts}.` : ''
  const s2en = skyPartsEn ? `Looking at the chart, ${skyPartsEn}.` : ''

  // ─ Sentence 3 — fusion theme (짧게, iljuChar raw 제거)
  const domEl = el?.dominant
  const domModality = mod?.dominant
  const lackEl = el?.lacking
  const balanceFlavorKo = domEl ? `${ELEMENT_FLAVOR_KO[domEl]} 기운이 가장 강해요.` : ''
  const balanceFlavorEn = domEl ? `${ELEMENT_FLAVOR_EN[domEl]} anchors your chart` : ''
  // 모달리티 + 인생 이끄는 별 + 지배 원소를 한 문장으로 묶어 헤드라인이
  // 4–5 문장 길이를 유지하도록 함. 별도의 balanceFlavor 줄을 분리하지 않고
  // 한 문장에 통합해 짧고 또렷한 결로.
  const modPlanetKo = (() => {
    const modPart = domModality ? modalityKo(domModality) : ''
    const planetPart = dom ? `${planetLabel(dom, 'ko')}이 인생을 이끌어요` : ''
    const elPart = domEl ? `${ELEMENT_FLAVOR_KO[domEl]} 기운이 가장 강하고` : ''
    if (elPart && modPart && planetPart) return `${elPart}, ${modPart}, ${planetPart}.`
    if (elPart && planetPart) return `${elPart}, ${planetPart}.`
    if (elPart && modPart) return `${elPart}, ${modalityStandaloneKo(domModality!)}.`
    if (modPart && planetPart) return `${modPart}, ${planetPart}.`
    if (modPart) return `${modalityStandaloneKo(domModality!)}.`
    if (planetPart) return `${planetPart}.`
    if (elPart) return `${balanceFlavorKo}`
    return ''
  })()
  const modFlavorEn = domModality ? `, with ${modalityFlavorEn(domModality)}` : ''
  const domPlanetEn = dom ? `, led by ${planetLabel(dom, 'en')}` : ''
  const lackKo = lackEl ? ` 단 ${ELEMENT_FLAVOR_KO[lackEl]} 기운은 살짝 비어 있어요.` : ''
  const lackEn = lackEl ? `, with little ${ELEMENT_FLAVOR_EN[lackEl]} energy` : ''

  // iljuCharacter는 한국어 텍스트라 영어 narrative에는 노출하지 않음.
  void iljuChar
  // balanceFlavorKo 는 이제 modPlanetKo 안에 흡수돼 별도 노출하지 않음.
  void balanceFlavorKo

  const s3ko = paragraphJoin([modPlanetKo, lackKo])
  const s3en = paragraphJoin([balanceFlavorEn + modFlavorEn + domPlanetEn + lackEn + '.'])

  return {
    ko: paragraphJoin([s1ko, s2ko, s3ko]),
    en: paragraphJoin([s1en, s2en, s3en]),
    signals: { saju: sajuUsed, astro: astroUsed },
  }
}

function modalityFlavorEn(m: 'cardinal' | 'fixed' | 'mutable'): string {
  if (m === 'cardinal') return 'a rhythm of starting things'
  if (m === 'fixed') return 'a rhythm of holding steady'
  return 'a rhythm of flowing change'
}

function modalityKo(m: 'cardinal' | 'fixed' | 'mutable'): string {
  if (m === 'cardinal') return '새로운 일을 시작하는 스타일로'
  if (m === 'fixed') return '한 분야를 오래 파는 스타일로'
  return '상황에 따라 유연하게 바뀌는 스타일로'
}

function modalityStandaloneKo(m: 'cardinal' | 'fixed' | 'mutable'): string {
  if (m === 'cardinal') return '새로운 일을 시작하는 스타일이에요'
  if (m === 'fixed') return '한 분야를 오래 파는 스타일이에요'
  return '상황에 따라 유연하게 바뀌는 스타일이에요'
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

// 격국 → 자연 영어 (raw 사주 용어 제거).
function geokgukFlavorEn(g: string): string {
  if (!g) return 'its own native shape'
  if (g.includes('편관'))
    return 'a pressure-as-fuel pattern, where challenge and responsibility press in as weight'
  if (g.includes('정관')) return 'a steady-authority pattern, settling into role and responsibility'
  if (g.includes('편재')) return 'an opportunistic-resource pattern, with a quick eye for openings'
  if (g.includes('정재')) return 'a steady-resource pattern, building wealth slowly and surely'
  if (g.includes('식신')) return 'an easeful-expression pattern, creating with relaxed grace'
  if (g.includes('상관')) return 'a free-talent pattern, releasing skill without strict form'
  if (g.includes('편인')) return 'an unconventional-wisdom pattern, with a singular intuition'
  if (g.includes('정인')) return 'an orthodox-wisdom pattern, flowing through learning and care'
  if (g.includes('비견') || g.includes('겁재'))
    return 'a peer-driven pattern, walking forward together with equals'
  return 'its own native shape'
}

// English "1st / 2nd / 3rd ..." short ordinal used inline in narrative.
function ordinalShort(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function paragraphJoin(parts: string[]): string {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

// Re-export for tests / parameter type consumers
export type { Headline } from '../types'
