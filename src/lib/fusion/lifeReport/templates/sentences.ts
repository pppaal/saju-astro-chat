// src/lib/fusion/lifeReport/templates/sentences.ts
// Re-usable bilingual sentence fragments. Pure functions only.

import { SIGN_KO } from '@/lib/astrology/signLabels'

export type Lang = 'ko' | 'en'

export function sajuStrength(count: number, lang: Lang): string {
  if (count >= 3) return lang === 'ko' ? '매우 강하게' : 'very strongly'
  if (count >= 2) return lang === 'ko' ? '강하게' : 'strongly'
  if (count >= 1) return lang === 'ko' ? '잔잔히' : 'modestly'
  return lang === 'ko' ? '거의 보이지 않게' : 'barely visible'
}

export function aspectQuality(type: string, lang: Lang): string {
  if (type === 'trine' || type === 'sextile')
    return lang === 'ko' ? '조화롭게 흐르고' : 'flows harmoniously'
  if (type === 'square')
    return lang === 'ko' ? '긴장과 자극을 만들고' : 'creates productive tension'
  if (type === 'opposition')
    return lang === 'ko' ? '양극을 마주 보게 하고' : 'forces a confrontation of poles'
  if (type === 'conjunction')
    return lang === 'ko' ? '한 점으로 응축되고' : 'concentrates into one point'
  // ── Minor aspects — naturalized (no jargon/한자/약자 0).
  if (type === 'quincunx')
    return lang === 'ko' ? '어색한 각도로 만나고' : 'meets at an awkward angle'
  if (type === 'semisextile')
    return lang === 'ko' ? '은근한 자극을 주고받고' : 'exchanges a quiet nudge'
  if (type === 'quintile' || type === 'biquintile')
    return lang === 'ko' ? '창의적 식으로 이어지고' : 'connects in a creative grain'
  return lang === 'ko' ? '미묘한 면을 만들고' : 'forms a subtle resonance'
}

export function houseLabel(house: number, lang: Lang): string {
  // 한국어는 약자(예: 10H, 12집) 대신 영역 의미로 풀어서 자연스럽게.
  if (lang === 'ko') {
    const map: Record<number, string> = {
      1: '정체성 영역',
      2: '돈을 다루는 영역',
      3: '학습 영역',
      4: '가정 영역',
      5: '창조 영역',
      6: '일상 영역',
      7: '관계 영역',
      8: '심층 영역',
      9: '확장 영역',
      10: '사회 무대',
      11: '친구 영역',
      12: '내면 영역',
    }
    return map[house] || `${house}번째 영역`
  }
  return `${ordinal(house)} house`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function signLabel(sign: string | undefined, lang: Lang): string {
  if (!sign) return lang === 'ko' ? '하늘' : 'the sky'
  return lang === 'ko' ? (SIGN_KO[sign] ?? sign) : sign
}

export function planetLabel(planet: string, lang: Lang): string {
  if (lang === 'en') return planet
  const KO: Record<string, string> = {
    Sun: '태양',
    Moon: '달',
    Mercury: '수성',
    Venus: '금성',
    Mars: '화성',
    Jupiter: '목성',
    Saturn: '토성',
    Uranus: '천왕성',
    Neptune: '해왕성',
    Pluto: '명왕성',
    Chiron: '키론',
    Ascendant: '첫인상',
    MC: '사회적 정점',
    'True Node': '북쪽 교점',
    'North Node': '북쪽 교점',
    'Mean Node': '북쪽 교점',
    'South Node': '남쪽 교점',
    Lilith: '릴리스',
    Vertex: '운명점',
  }
  return KO[planet] ?? planet
}

/** Translate FE element to localized natural label. */
export function elementLabel(el: string, lang: Lang): string {
  if (lang === 'ko') {
    const KO: Record<string, string> = {
      목: '목(나무)',
      화: '화(불)',
      토: '토(흙)',
      금: '금(쇠)',
      수: '수(물)',
      wood: '목(나무)',
      fire: '화(불)',
      earth: '토(흙)',
      metal: '금(쇠)',
      water: '수(물)',
    }
    return KO[el] ?? el
  }
  const EN: Record<string, string> = {
    목: 'Wood',
    화: 'Fire',
    토: 'Earth',
    금: 'Metal',
    수: 'Water',
    wood: 'Wood',
    fire: 'Fire',
    earth: 'Earth',
    metal: 'Metal',
    water: 'Water',
  }
  return EN[el] ?? el
}

/** Korean particle helper — pick 은/는 or 이/가 based on last syllable. */
export function eunNeun(word: string): string {
  if (!word) return '는'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '는'
  const final = (last - 0xac00) % 28
  return final === 0 ? '는' : '은'
}
export function iGa(word: string): string {
  if (!word) return '가'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '가'
  const final = (last - 0xac00) % 28
  return final === 0 ? '가' : '이'
}

/** Korean object particle helper — pick 을/를 based on last syllable. */
export function eulReul(word: string): string {
  if (!word) return '를'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '를'
  const final = (last - 0xac00) % 28
  return final === 0 ? '를' : '을'
}

/** Korean connective particle helper — pick 과/와 based on last syllable. */
export function gwaWa(word: string): string {
  if (!word) return '와'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '와'
  const final = (last - 0xac00) % 28
  return final === 0 ? '와' : '과'
}

/** Join an array of strings with comma + final "and"/"및". */
export function joinList(items: string[], lang: Lang): string {
  const xs = items.filter(Boolean)
  if (xs.length === 0) return ''
  if (xs.length === 1) return xs[0]
  const head = xs.slice(0, -1).join(', ')
  const tail = xs[xs.length - 1]
  return lang === 'ko' ? `${head}와 ${tail}` : `${head} and ${tail}`
}

// 한 문단 안에서 같은 종결구가 반복되면(느낌/모습/스타일이에요·잘 맞아요) 2번째부터
// 동의 표현으로 돌려가며 단조로움을 줄인다. 입력 순서 기반이라 결정론적.
const SENT_ENDINGS = ['느낌이에요.', '모습이에요.', '스타일이에요.']
const SENT_RE = /(?:느낌|모습|스타일)이에요\.?$/
const JAL_RE = /잘 맞아요\.?$/
const JAL_ALTS = ['잘 어울려요.', '잘 맞는 편이에요.']
export function varyRepeatedEndings(parts: string[]): string[] {
  let sent = 0
  let jal = 0
  return parts.map((p) => {
    if (!p) return p
    const t = p.trim()
    if (SENT_RE.test(t)) {
      sent += 1
      return sent >= 2 ? t.replace(SENT_RE, SENT_ENDINGS[(sent - 1) % SENT_ENDINGS.length]) : p
    }
    if (JAL_RE.test(t)) {
      jal += 1
      return jal >= 2 ? t.replace(JAL_RE, JAL_ALTS[(jal - 2) % JAL_ALTS.length]) : p
    }
    return p
  })
}

/** Build a paragraph from sentence-fragments, joining w/ proper spacing. */
export function paragraph(parts: string[]): string {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

// 교차규칙 narrative 는 "기술적 근거 — 실제 의미" 구조로 적혀 있다(예:
// "사주 정재격 + 점성 Saturn 2궁 — 천천히 쌓는 재물 결"). 사용자 리포트엔
// em-dash 뒤 '의미'만 노출하고, 혹시 남는 원시 용어(영문 행성명·점성 약어·
// 고전 한자어)는 자연스러운 한국어로 치환한다. 근거 절이 없으면 원문 유지.
const FRAGMENT_JARGON: Array<[RegExp, string]> = [
  [/\bSun\b/g, '태양'],
  [/\bMoon\b/g, '달'],
  [/\bMercury\b/g, '수성'],
  [/\bVenus\b/g, '금성'],
  [/\bMars\b/g, '화성'],
  [/\bJupiter\b/g, '목성'],
  [/\bSaturn\b/g, '토성'],
  [/\bUranus\b/g, '천왕성'],
  [/\bNeptune\b/g, '해왕성'],
  [/\bPluto\b/g, '명왕성'],
  [/\b(?:ASC|Ascendant)\b/g, '상승궁'],
  [/\bstellium\b/gi, '밀집'],
  [/\bdignit(?:y|ied)\b/gi, '제 자리'],
  [/\bexaltation\b/gi, '고양'],
  [/\bdomicile\b/gi, '본거지'],
  [/\bangular\b/gi, '중심축'],
  [/\bHellenistic\b/gi, '서양 고전'],
  [/\bchapter\b/gi, '전환'],
  [/\bfire\b/gi, '불'],
  [/\bwater\b/gi, '물'],
  [/\bair\b/gi, '공기'],
  [/\bearth\b/gi, '흙'],
  [/재성 운에 형통/g, '재물의 시기에 크게 풀림'],
  [/관성 운에 형통/g, '직책·책임의 시기에 크게 풀림'],
  [/형통하는/g, '크게 풀리는'],
  [/형통/g, '크게 풀림'],
]
export function naturalizeFragment(text: string): string {
  if (!text) return ''
  let s = text.trim()
  const dash = s.indexOf('—')
  if (dash >= 0) {
    const meaning = s.slice(dash + 1).trim()
    if (meaning) s = meaning
  }
  for (const [re, rep] of FRAGMENT_JARGON) s = s.replace(re, rep)
  return s.trim()
}

// 단독 명사 "결"(타고난 기질·성향 뜻)은 문체가 예스러워 일상어 "성향"으로 바꾼다.
// 합성어(결단·결합·결혼·결과·결산·해결·연결…)는 절대 건드리면 안 되므로
// 부정 lookbehind (?<![가-힣]) 로 앞 글자가 한글이면(=합성어 꼬리) 제외하고,
// 뒤에는 조사/문장부호만 오는 경우로 한정한다.
export function plainifyKo(s: string): string {
  if (typeof s !== 'string' || !s.includes('결')) return s
  return s
    .replace(/특수 결/g, '특별한 성향')
    .replace(/(?<![가-힣])결이에요/g, '성향이에요')
    .replace(/(?<![가-힣])결이라/g, '성향이라')
    .replace(/(?<![가-힣])결입니다/g, '성향입니다')
    .replace(/(?<![가-힣])결로(?=[\s.,)])/g, '성향으로')
    .replace(/(?<![가-힣])결의(?=[\s.,)])/g, '성향의')
    .replace(/(?<![가-힣])결이(?=[\s.,)])/g, '성향이')
    .replace(/(?<![가-힣])결은(?=[\s.,)])/g, '성향은')
    .replace(/(?<![가-힣])결을(?=[\s.,)])/g, '성향을')
    .replace(/(?<![가-힣])결도(?=[\s.,)])/g, '성향도')
    .replace(/(?<![가-힣])결(?=[.,)])/g, '성향')
    .replace(/(?<![가-힣])결(?= )/g, '성향')
}
