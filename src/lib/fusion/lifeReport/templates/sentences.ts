// src/lib/fusion/lifeReport/templates/sentences.ts
// Re-usable bilingual sentence fragments. Pure functions only.

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
  return lang === 'ko' ? '미묘한 결을 만들고' : 'forms a subtle resonance'
}

export function houseLabel(house: number, lang: Lang): string {
  if (lang === 'ko') return `${house}집`
  return `${ordinal(house)} house`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function signLabel(sign: string | undefined, lang: Lang): string {
  if (!sign) return lang === 'ko' ? '하늘' : 'the sky'
  const KO: Record<string, string> = {
    Aries: '양자리',
    Taurus: '황소자리',
    Gemini: '쌍둥이자리',
    Cancer: '게자리',
    Leo: '사자자리',
    Virgo: '처녀자리',
    Libra: '천칭자리',
    Scorpio: '전갈자리',
    Sagittarius: '사수자리',
    Capricorn: '염소자리',
    Aquarius: '물병자리',
    Pisces: '물고기자리',
  }
  return lang === 'ko' ? KO[sign] ?? sign : sign
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
    Chiron: '카이런',
    Ascendant: 'ASC',
    MC: 'MC',
  }
  return KO[planet] ?? planet
}

/** Translate FE element ko → en label. */
export function elementLabel(el: string, lang: Lang): string {
  if (lang === 'ko') return el
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

/** Join an array of strings with comma + final "and"/"및". */
export function joinList(items: string[], lang: Lang): string {
  const xs = items.filter(Boolean)
  if (xs.length === 0) return ''
  if (xs.length === 1) return xs[0]
  const head = xs.slice(0, -1).join(', ')
  const tail = xs[xs.length - 1]
  return lang === 'ko' ? `${head}와 ${tail}` : `${head} and ${tail}`
}

/** Build a paragraph from sentence-fragments, joining w/ proper spacing. */
export function paragraph(parts: string[]): string {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}
