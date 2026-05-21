// Plain-language one-line interpretation for the destiny chart header —
// combines 동양(saju essence) + 서양(astro big-three) so users get the gist
// before the detailed charts.

type AnyObj = Record<string, unknown>

const STEM_READING: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
}
const STEM_IMAGE: Record<string, string> = {
  甲: '큰 나무', 乙: '유연한 풀', 丙: '태양', 丁: '촛불·등불', 戊: '넓은 산',
  己: '기름진 밭', 庚: '큰 바위', 辛: '빛나는 보석', 壬: '큰 바다', 癸: '이슬·비',
}
const STEM_IMAGE_EN: Record<string, string> = {
  甲: 'a tall tree', 乙: 'a supple vine', 丙: 'the sun', 丁: 'a candle flame', 戊: 'a broad mountain',
  己: 'fertile soil', 庚: 'raw ore', 辛: 'a polished gem', 壬: 'a vast sea', 癸: 'dew & rain',
}
const TRAIT_KO: Record<string, string> = { 목: '창의력', 화: '추진력', 토: '안정성', 금: '결단력', 수: '유연성' }
const TRAIT_EN: Record<string, string> = { 목: 'creativity', 화: 'drive', 토: 'stability', 금: 'decisiveness', 수: 'flexibility' }
const ELEM_EN: Record<string, string> = { 목: 'Wood', 화: 'Fire', 토: 'Earth', 금: 'Metal', 수: 'Water' }
const EL_FROM_KEY: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수', 목: '목', 화: '화', 토: '토', 금: '금', 수: '수' }

function dominant(saju: AnyObj): string | null {
  const fe = saju.fiveElements as Record<string, number> | undefined
  if (!fe || typeof fe !== 'object') return null
  let best: string | null = null
  let bestV = -1
  for (const [k, v] of Object.entries(fe)) {
    const el = EL_FROM_KEY[k]
    if (el && typeof v === 'number' && v > bestV) { bestV = v; best = el }
  }
  return best
}

export function sajuInterpretation(saju: unknown, isKo: boolean): string {
  if (!saju || typeof saju !== 'object') return ''
  const s = saju as AnyObj
  const dayPillar = (s.dayPillar ?? (s.pillars as AnyObj | undefined)?.day) as
    | { heavenlyStem?: { name?: string; element?: string } }
    | undefined
  const stem = dayPillar?.heavenlyStem?.name
  if (!stem) return ''
  const el = dayPillar?.heavenlyStem?.element
  const dom = dominant(s)
  if (isKo) {
    const me = `${STEM_IMAGE[stem] ?? ''}(${STEM_READING[stem] ?? stem}${el ?? ''})`.replace('()', '')
    const strong = dom ? ` 가장 강한 기운은 ${TRAIT_KO[dom] ?? ''}(${dom})이에요.` : ''
    return `본질은 ${me} 같은 사람이에요.${strong}`
  }
  const me = `${STEM_IMAGE_EN[stem] ?? stem}`
  const strong = dom ? ` Your strongest force is ${TRAIT_EN[dom] ?? ''} (${ELEM_EN[dom] ?? dom}).` : ''
  return `At the core you're like ${me}.${strong}`
}

const SIGN_KO = ['양자리', '황소', '쌍둥이', '게', '사자', '처녀', '천칭', '전갈', '궁수', '염소', '물병', '물고기']
const SIGN_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const SIGN_KW_KO = ['추진·도전', '안정·감각', '호기심·소통', '감성·보호', '자신감·표현', '분석·완벽', '균형·관계', '깊이·집중', '자유·확장', '목표·인내', '독창·개방', '공감·상상']
const SIGN_KW_EN = ['drive', 'steadiness', 'curiosity', 'nurture', 'confidence', 'precision', 'balance', 'depth', 'freedom', 'ambition', 'originality', 'empathy']

function signIndexOf(lon?: number): number | null {
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null
  return Math.floor((((lon % 360) + 360) % 360) / 30)
}

export function astroInterpretation(astro: unknown, isKo: boolean): string {
  if (!astro || typeof astro !== 'object') return ''
  const a = astro as AnyObj
  const planets = Array.isArray(a.planets) ? (a.planets as Array<{ name?: string; longitude?: number }>) : []
  const lonOf = (name: string) => planets.find((p) => p.name === name)?.longitude
  const sun = signIndexOf(lonOf('Sun'))
  const moon = signIndexOf(lonOf('Moon'))
  const asc = signIndexOf((a.ascendant as { longitude?: number } | undefined)?.longitude)
  const parts: string[] = []
  if (isKo) {
    if (sun !== null) parts.push(`핵심 자아는 ${SIGN_KO[sun]}(${SIGN_KW_KO[sun]})`)
    if (asc !== null) parts.push(`첫인상은 ${SIGN_KO[asc]}(${SIGN_KW_KO[asc]})`)
    if (moon !== null) parts.push(`마음은 ${SIGN_KO[moon]}(${SIGN_KW_KO[moon]})`)
    return parts.length ? `${parts.join(', ')}예요.` : ''
  }
  if (sun !== null) parts.push(`core self ${SIGN_EN[sun]} (${SIGN_KW_EN[sun]})`)
  if (asc !== null) parts.push(`first impression ${SIGN_EN[asc]} (${SIGN_KW_EN[asc]})`)
  if (moon !== null) parts.push(`heart ${SIGN_EN[moon]} (${SIGN_KW_EN[moon]})`)
  return parts.length ? `${parts.join(', ')}.` : ''
}
