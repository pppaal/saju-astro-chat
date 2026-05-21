/**
 * Slim + localize the astrology self-block produced by formatAstroSelf,
 * for the realtime destiny counselor only. Compat counselor keeps the
 * raw formatAstroSelf output untouched.
 *
 * What it does (verified value-faithful — only filters / drops / renames,
 * never alters a computed number):
 *  - Natal aspects: major aspects (☌☍△□⚹) within orb ≤6°, orb-sorted, top 10.
 *  - Current transits: same, orb ≤3°, top 10 (kept — yearly timing needs it).
 *  - Drops: Fixed Stars, Lunar Return, Secondary Progression, day-of-week ruler.
 *  - Eclipses: this calendar year only.
 *  - Solar Return: collapse to a one-line "year theme" (Sun sign + house).
 *  - Positions: drop arc-minutes; aspect lines drop the redundant sign
 *    (sign already listed in the positions block); orb shown as decimal.
 *  - locale 'ko' translates planet / sign / aspect names to Korean; 'en'
 *    keeps English. Saju block is never passed here.
 */

export type SlimLocale = 'ko' | 'en'

const PLANET_KO: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
  Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성',
  Pluto: '명왕성', Node: '노드', Ascendant: '상승점', Asc: '상승점', MC: '중천점',
}
const SIGN_KO: Record<string, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '궁수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}
const ASP_KO: Record<string, string> = {
  Conjunction: '컨정션', Opposition: '어포지션', Trine: '트라인', Square: '스퀘어', Sextile: '섹스타일',
}
const ASP_LC_KO: Record<string, string> = {
  conjunction: '컨정션', opposition: '어포지션', trine: '트라인', square: '스퀘어', sextile: '섹스타일',
}

const MAJOR = /(?<![A-Za-z])(?:Conjunction|Opposition|Trine|Square|Sextile)(?![a-z])/
const ORB = /Orb:\s*(\d+)°(\d+)'/
const NAT = /^([A-Za-z]+) in [A-Za-z]+ (Conjunction|Opposition|Trine|Square|Sextile) ([A-Za-z]+) in /
const TRN = /^([A-Za-z]+) \(transit\) in [A-Za-z]+ (Conjunction|Opposition|Trine|Square|Sextile) natal ([A-Za-z]+) in /
const POS = /^([A-Za-z]+) in ([A-Za-z]+) (\d+)°(?:\d+')?(?:, House (\d+))?( R)?$/

const NATAL_LIMIT = 6.0
const NATAL_TOP = 10
const TRANSIT_LIMIT = 3.0
const TRANSIT_TOP = 10
const DROP = ['Fixed Stars', 'Lunar Return', 'Secondary Progression', '현재 시점 행성 신호']

const pko = (p: string, l: SlimLocale) => (l === 'ko' ? PLANET_KO[p] ?? p : p)
const sko = (s: string, l: SlimLocale) => (l === 'ko' ? SIGN_KO[s] ?? s : s)
const ako = (a: string, l: SlimLocale) => (l === 'ko' ? ASP_KO[a] ?? a : a)

function orbDeg(line: string): number | null {
  const m = ORB.exec(line)
  return m ? Number(m[1]) + Number(m[2]) / 60 : null
}
function orbStr(line: string): string {
  const d = orbDeg(line)
  return d === null ? '' : `${d.toFixed(1)}°`
}
function isHeader(s: string): boolean {
  return /^\[.*\]$/.test(s)
}

/** localize a misc line (eclipses / profection / positions fallback). ko only. */
function kz(s: string, l: SlimLocale): string {
  if (l !== 'ko') return s
  let out = s
  for (const [k, v] of Object.entries(PLANET_KO)) out = out.replace(new RegExp(`\\b${k}\\b`, 'g'), v)
  for (const [k, v] of Object.entries(SIGN_KO)) out = out.replace(new RegExp(`\\b${k}\\b`, 'g'), v)
  for (const [k, v] of Object.entries(ASP_KO)) out = out.replace(new RegExp(`\\b${k}\\b`, 'g'), v)
  for (const [k, v] of Object.entries(ASP_LC_KO)) out = out.replace(new RegExp(`\\b${k}\\b`, 'g'), v)
  out = out.replace(/House (\d+)/g, '$1하우스').replace(/\b(\d+)H\b/g, '$1하우스').replace(/\bhouse\b/g, '하우스')
  out = out.replace(/natal/g, '본명')
  return out
}

function trHeader(h: string, l: SlimLocale): string {
  if (l !== 'ko') return h
  const map: Record<string, string> = {
    'Natal aspects': '본명 각', 'Current transits': '현재 트랜짓',
    'Upcoming Eclipses': '다가오는 일·월식', 'Profection': '프로펙션',
    '행성·angle in 사인 · house': '행성 위치 (사인·하우스)', '행성 in 사인': '행성 위치',
  }
  let out = h
  for (const [k, v] of Object.entries(map)) out = out.replace(k, v)
  return out.replace(/natal/g, '본명').replace(/\bhouse\b/g, '하우스')
}

export function slimAstroSelf(block: string, opts: { locale: SlimLocale; year: number }): string {
  const { locale: l, year } = opts
  const lines = block.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!isHeader(line)) {
      out.push(/[A-Za-z]/.test(line) ? kz(line, l) : line)
      i++
      continue
    }
    // collect block body
    const header = line
    let j = i + 1
    const body: string[] = []
    while (j < lines.length && !isHeader(lines[j])) {
      body.push(lines[j])
      j++
    }
    const name = header.replace(/^\[|\]$/g, '')

    if (DROP.some((d) => name.includes(d))) { i = j; continue }

    if (name.includes('Natal aspects')) {
      const kept = body
        .filter((b) => b.trim() && MAJOR.test(b))
        .map((b) => ({ o: orbDeg(b), m: NAT.exec(b), b }))
        .filter((x): x is { o: number; m: RegExpExecArray; b: string } => x.o !== null && x.o <= NATAL_LIMIT && !!x.m)
        .sort((a, b) => a.o - b.o)
        .slice(0, NATAL_TOP)
        .map(({ m, b }) => `${pko(m[1], l)} ${ako(m[2], l)} ${pko(m[3], l)} (${l === 'en' ? 'orb ' : ''}${orbStr(b)})`)
      const head = l === 'ko'
        ? `[본명 각 · 주요각 orb≤${NATAL_LIMIT | 0}° 상위${kept.length}]`
        : `[Natal aspects · major orb<=${NATAL_LIMIT | 0}° top${kept.length}]`
      out.push(head, ...kept, '')
      i = j; continue
    }

    if (name.includes('Current transits')) {
      const kept = body
        .filter((b) => b.trim() && MAJOR.test(b))
        .map((b) => ({ o: orbDeg(b), m: TRN.exec(b), b }))
        .filter((x): x is { o: number; m: RegExpExecArray; b: string } => x.o !== null && x.o <= TRANSIT_LIMIT && !!x.m)
        .sort((a, b) => a.o - b.o)
        .slice(0, TRANSIT_TOP)
        .map(({ m, b }) => l === 'ko'
          ? `${pko(m[1], l)}(트랜짓) ${ako(m[2], l)} 본명 ${pko(m[3], l)} (${orbStr(b)})`
          : `${m[1]} (transit) ${m[2]} natal ${m[3]} (orb ${orbStr(b)})`)
      const dm = /\d{4}-\d{2}-\d{2}/.exec(header)
      const date = dm ? dm[0] : ''
      const head = l === 'ko'
        ? `[현재 트랜짓 → 본명, ${date} · 주요각 orb≤${TRANSIT_LIMIT | 0}° 상위${kept.length}]`
        : `[Current transits → natal, ${date} · major orb<=${TRANSIT_LIMIT | 0}° top${kept.length}]`
      out.push(head, ...kept, '')
      i = j; continue
    }

    if (name.includes('Solar Return')) {
      const sun = body.find((b) => b.startsWith('Sun '))
      if (sun) {
        const m = POS.exec(sun.replace(/(\d+)°\d+'/, '$1°'))
        if (m) {
          const house = m[4] ? (l === 'ko' ? ` ${m[4]}하우스` : `, House ${m[4]}`) : ''
          out.push(l === 'ko' ? '[올해 테마 (솔라리턴)]' : '[Solar Return — year theme]')
          out.push(l === 'ko' ? `태양 ${sko(m[2], l)}${house}` : `Sun ${m[2]}${house}`)
          out.push('')
        }
      }
      i = j; continue
    }

    if (name.includes('Upcoming Eclipses')) {
      const picked = body.filter((b) => b.trim() && b.includes(`${year}-`))
        .map((b) => l === 'ko' ? kz(b, l) : b.replace(/일식/g, 'SolarEcl').replace(/월식/g, 'LunarEcl'))
      if (picked.length) {
        out.push(l === 'ko' ? `[올해 일·월식 (${year})]` : `[Eclipses (${year})]`, ...picked, '')
      }
      i = j; continue
    }

    if (name.includes('행성·angle in 사인') || name.includes('행성 in 사인')) {
      const withAngle = name.includes('·angle') || name.includes('angle')
      out.push(l === 'ko'
        ? (withAngle ? '[행성 위치 (사인·하우스)]' : '[행성 위치 (사인)]')
        : (withAngle ? '[Positions (sign · house)]' : '[Positions (sign)]'))
      for (const b of body) {
        const m = POS.exec(b)
        if (m) {
          const house = m[4] ? (l === 'ko' ? `, ${m[4]}하우스` : `, House ${m[4]}`) : ''
          const retro = m[5] ? (l === 'ko' ? ' 역행' : ' R') : ''
          out.push(`${pko(m[1], l)} ${sko(m[2], l)} ${m[3]}°${house}${retro}`)
        } else if (b.trim()) {
          out.push(kz(b, l))
        }
      }
      out.push('')
      i = j; continue
    }

    if (name.includes('Profection')) {
      const hm = /(\d+)H/.exec(body.join(' ')) ?? /(\d+)하우스/.exec(body.join(' '))
      const house = hm ? hm[1] : ''
      out.push(l === 'ko' ? '[프로펙션 (올해 활성 하우스)]' : '[Profection (active house this year)]')
      out.push(l === 'ko' ? `활성 하우스: ${house}하우스` : `Active house: ${house}`)
      out.push('')
      i = j; continue
    }

    // default: keep header + body (translate body if ko)
    out.push(trHeader(header, l))
    for (const b of body) out.push(/[A-Za-z]/.test(b) ? kz(b, l) : b)
    i = j
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n'
}
