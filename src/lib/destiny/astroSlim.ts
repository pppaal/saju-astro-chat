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

import { dignityOf } from '@/lib/astrology/foundation/dignities'

export type SlimLocale = 'ko' | 'en'

// essential dignity → how the planet "operates" in that sign (디그니티)
const DIGNITY_KO: Record<string, string> = {
  domicile: '강함', exaltation: '고양', detriment: '불리', fall: '쇠약',
}
const DIGNITY_EN: Record<string, string> = {
  domicile: 'domicile', exaltation: 'exalted', detriment: 'detriment', fall: 'fall',
}

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
const DROP = ['Fixed Stars', 'Lunar Return', '현재 시점 행성 신호']

const pko = (p: string, l: SlimLocale) => (l === 'ko' ? PLANET_KO[p] ?? p : p)
const sko = (s: string, l: SlimLocale) => (l === 'ko' ? SIGN_KO[s] ?? s : s)
// aspect name only — gloss dropped (the model knows aspects; the legend in
// the reading rules carries any nuance). 16+ lines saved.
const ako = (a: string, l: SlimLocale) => (l !== 'ko' ? a : ASP_KO[a] ?? a)

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

const ZODIAC = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
const ANGLE_ASPECTS: Array<{ deg: number; name: string; orb: number }> = [
  { deg: 0, name: 'Conjunction', orb: 6 }, { deg: 60, name: 'Sextile', orb: 4 },
  { deg: 90, name: 'Square', orb: 5 }, { deg: 120, name: 'Trine', orb: 5 }, { deg: 180, name: 'Opposition', orb: 6 },
]
/** aspects from each planet to ASC/MC, computed from longitudes (the engine's
 * natal-aspect list omits angles, but a 1st-house stellium conjunct ASC is core
 * to character). Sorted by orb. */
function angleAspects(bodies: Array<{ name: string; lon: number }>, l: SlimLocale): string[] {
  const angles = bodies.filter((b) => b.name === 'Ascendant' || b.name === 'MC')
  const planets = bodies.filter((b) => b.name !== 'Ascendant' && b.name !== 'MC')
  const hits: Array<{ orb: number; line: string }> = []
  for (const a of angles) {
    for (const p of planets) {
      let d = Math.abs(a.lon - p.lon)
      if (d > 180) d = 360 - d
      for (const asp of ANGLE_ASPECTS) {
        const orb = Math.abs(d - asp.deg)
        if (orb <= asp.orb) {
          hits.push({ orb, line: `${pko(p.name, l)} ${ako(asp.name, l)} ${pko(a.name, l)} (${orb.toFixed(1)}°)` })
          break
        }
      }
    }
  }
  return hits.sort((x, y) => x.orb - y.orb).map((h) => h.line)
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
  out = out.replace(/natal/g, '본명').replace(/\borb\b/gi, '오차')
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
        ? `[본명 각 · 오차≤${NATAL_LIMIT | 0}°]`
        : `[Natal aspects · orb<=${NATAL_LIMIT | 0}°]`
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
          ? `${pko(m[1], l)}(트) ${ako(m[2], l)} ${pko(m[3], l)} (${orbStr(b)})`
          : `${m[1]} (tr) ${m[2]} ${m[3]} (orb ${orbStr(b)})`)
      const dm = /\d{4}-\d{2}-\d{2}/.exec(header)
      const date = dm ? dm[0] : ''
      const head = l === 'ko'
        ? `[현재 트랜짓 → 본명, ${date} · 오차≤${TRANSIT_LIMIT | 0}°]`
        : `[Current transits → natal, ${date} · orb<=${TRANSIT_LIMIT | 0}°]`
      out.push(head, ...kept, '')
      i = j; continue
    }

    if (name.includes('Solar Return')) {
      const sr: string[] = []
      // Asc (the year's persona)
      const asc = body.find((b) => b.startsWith('Asc:'))
      const am = asc?.match(/Asc:\s*([A-Za-z]+)\s*(\d+)/)
      if (am) sr.push(l === 'ko' ? `상승점 ${sko(am[1], l)} ${am[2]}°` : `Asc ${am[1]} ${am[2]}°`)
      // Sun (the year's core)
      const sun = body.find((b) => b.startsWith('Sun '))
      const sm = sun && POS.exec(sun.replace(/(\d+)°\d+'/, '$1°'))
      if (sm) {
        const house = sm[4] ? (l === 'ko' ? ` ${sm[4]}하우스` : `, House ${sm[4]}`) : ''
        sr.push(l === 'ko' ? `태양 ${sko(sm[2], l)}${house}` : `Sun ${sm[2]}${house}`)
      }
      // stacked house (≥3 planets sharing a house = the year's emphasis)
      const byHouse: Record<string, string[]> = {}
      for (const b of body) {
        const pm = b.match(/^([A-Za-z]+) in [A-Za-z]+ \d+°(?:\d+')?, House (\d+)/)
        if (pm) (byHouse[pm[2]] ||= []).push(pm[1])
      }
      let topH = '', topN = 0
      for (const [h, ps] of Object.entries(byHouse)) if (ps.length > topN) { topN = ps.length; topH = h }
      if (topN >= 3) {
        const ps = byHouse[topH].map((p) => pko(p, l)).join('·')
        sr.push(l === 'ko' ? `몰림: ${topH}하우스 (${ps})` : `Stellium: House ${topH} (${ps})`)
      }
      // SR Saturn house — the year's responsibility/test area
      const sat = body.find((b) => b.startsWith('Saturn '))
      const stm = sat && POS.exec(sat.replace(/(\d+)°\d+'/, '$1°'))
      if (stm && stm[4]) {
        sr.push(l === 'ko' ? `토성 ${sko(stm[2], l)} ${stm[4]}하우스` : `Saturn ${stm[2]}, House ${stm[4]}`)
      }
      out.push(l === 'ko' ? '[솔라리턴]' : '[Solar Return]')
      if (sr.length) out.push(sr.join(' / '))
      out.push('')
      i = j; continue
    }

    if (name.includes('Secondary Progression')) {
      const sp: string[] = []
      for (const b of body) {
        const m = b.match(/^Progressed (Sun|Moon):\s*([A-Za-z]+)\s*(\d+)/)
        if (!m) continue
        const ko = m[1] === 'Sun' ? '진행 태양' : '진행 달'
        sp.push(l === 'ko' ? `${ko}: ${sko(m[2], l)} ${m[3]}°` : `Progressed ${m[1]}: ${m[2]} ${m[3]}°`)
      }
      out.push(l === 'ko' ? '[2차 진행]' : '[Secondary Progression]')
      if (sp.length) out.push(sp.join(' / '))
      out.push('')
      i = j; continue
    }

    if (name.includes('Upcoming Eclipses')) {
      // group every aspect of the SAME eclipse (date+sign+deg) onto one line:
      // "일식 DATE Sign Deg° → TargetA aspectA (오차 x°, House) / TargetB aspectB (오차 y°)"
      const ECL = /^(일식|월식)\s+(\d{4}-\d{2}-\d{2})\s+([A-Za-z]+)\s+(\d+)°\s+(\w+)\s+([A-Za-z]+)\s+\(House\s*(\d+),\s*orb\s*([\d.]+)/
      const groups = new Map<string, { head: string; items: Array<{ n: number; orb: string; body: string; asp: string; house: string }> }>()
      for (const b of body) {
        if (!b.includes(`${year}-`)) continue
        const m = ECL.exec(b)
        if (!m) continue
        const [, kind, date, sign, deg, asp, tgt, house, orb] = m
        const kindL = l === 'ko' ? kind : kind === '일식' ? 'SolarEcl' : 'LunarEcl'
        const aspL = l === 'ko' ? ASP_LC_KO[asp.toLowerCase()] ?? asp : asp
        const key = `${kind}|${date}|${sign}|${deg}`
        const head = `${kindL} ${date} ${sko(sign, l)} ${deg}°`
        const g = groups.get(key) ?? { head, items: [] }
        g.items.push({ n: parseFloat(orb), orb, body: pko(tgt, l), asp: aspL, house })
        groups.set(key, g)
      }
      if (groups.size) {
        const lines = [...groups.values()].map((g) => {
          g.items.sort((a, b) => a.n - b.n)
          const items = g.items.map((it, idx) => {
            const ht = idx === 0 ? (l === 'ko' ? `, ${it.house}하우스` : `, House ${it.house}`) : ''
            return l === 'ko' ? `${it.body} ${it.asp} (오차 ${it.orb}°${ht})` : `${it.body} ${it.asp} (orb ${it.orb}°${ht})`
          })
          return `${g.head} → ${items.join(' / ')}`
        })
        out.push(l === 'ko' ? `[올해 일·월식 (${year})]` : `[Eclipses (${year})]`, ...lines, '')
      }
      i = j; continue
    }

    if (name.includes('행성·angle in 사인') || name.includes('행성 in 사인')) {
      out.push(l === 'ko' ? '[행성 위치]' : '[Positions]')
      const bodies: Array<{ name: string; lon: number }> = []
      for (const b of body) {
        const m = POS.exec(b)
        if (m) {
          const house = m[4] ? (l === 'ko' ? `, ${m[4]}하우스` : `, House ${m[4]}`) : ''
          const retro = m[5] ? (l === 'ko' ? ' 역행' : ' R') : ''
          const planet = pko(m[1], l) // planet meaning label dropped (model knows planets) — token save
          // essential dignity — only show when notable (skip peregrine/angles)
          const digKo = (l === 'ko' ? DIGNITY_KO : DIGNITY_EN)[dignityOf(m[1], m[2])]
          const dig = digKo ? ` [${digKo}]` : ''
          out.push(`${planet} ${sko(m[2], l)} ${m[3]}°${house}${retro}${dig}`)
          const zi = ZODIAC.indexOf(m[2])
          if (zi >= 0) bodies.push({ name: m[1], lon: zi * 30 + Number(m[3]) })
        } else if (b.trim()) {
          out.push(kz(b, l))
        }
      }
      out.push('')
      // ASC/MC aspects — the engine's natal-aspect list omits angles, but a
      // 1st-house stellium conjunct ASC is core to character. Compute here.
      const angleLines = angleAspects(bodies, l)
      if (angleLines.length) {
        out.push(l === 'ko' ? '[상승점·중천점 각]' : '[ASC/MC aspects]', ...angleLines, '')
      }
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
