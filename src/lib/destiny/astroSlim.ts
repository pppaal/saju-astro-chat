/**
 * Slim the astrology self-block (formatAstroSelf) down to the "current" timing
 * signals only — transits, eclipses, solar return, secondary progression — in
 * the compact v2 format. Natal positions / aspects / profection are built
 * separately in counselorContext (directly from the chart). Only filters /
 * drops / reformats — never alters a computed number.
 */

import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'

export type SlimLocale = 'ko' | 'en'

// 10행성 + 앵글(ASC/Asc/MC) 은 캘린더 엔진 공용 정본(PLANET_KO) 재사용.
// Node(북교점) 는 이 소비처 고유 키라 spread 후 추가.
const PLANET_KO: Record<string, string> = {
  ...PLANET_KO_BASE,
  Node: '북교점',
}
const SIGN_KO: Record<string, string> = {
  Aries: '양',
  Taurus: '황소',
  Gemini: '쌍둥이',
  Cancer: '게',
  Leo: '사자',
  Virgo: '처녀',
  Libra: '천칭',
  Scorpio: '전갈',
  Sagittarius: '사수',
  Capricorn: '염소',
  Aquarius: '물병',
  Pisces: '물고기',
}
// aspect → 한국어 뜻 (깨진 □ 박스 + LLM 디코드 오역 방지; 궁합과 동일 정책)
const ASP_SYM: Record<string, string> = {
  conjunction: '[결합]',
  opposition: '[대립]',
  trine: '[조화]',
  square: '[긴장]',
  sextile: '[협력]',
}
// EN locale 은 영어 관계어로 — 한국어 라벨이 영어 응답에 새지 않게.
const ASP_EN: Record<string, string> = {
  conjunction: '[conjunction]',
  opposition: '[opposition]',
  trine: '[trine]',
  square: '[square]',
  sextile: '[sextile]',
}

const MAJOR = /(?<![A-Za-z])(?:Conjunction|Opposition|Trine|Square|Sextile)(?![a-z])/
const ORB = /Orb:\s*(\d+)°(\d+)'/
const TRN =
  /^([A-Za-z]+) \(transit\) in [A-Za-z]+ (Conjunction|Opposition|Trine|Square|Sextile) natal ([A-Za-z]+) in /
const POS = /^([A-Za-z]+) in ([A-Za-z]+) (\d+)°(?:\d+')?(?:, House (\d+))?( R)?$/
const ECL =
  /^(일식|월식)\s+(\d{4})-(\d{2})-(\d{2})\s+([A-Za-z]+)\s+(\d+)°\s+(\w+)\s+([A-Za-z]+)\s+\(House\s*(\d+),\s*orb\s*([\d.]+)/

const TRANSIT_LIMIT = 3.0
const TRANSIT_TOP = 10

const pko = (p: string, l: SlimLocale) =>
  l === 'ko' ? (PLANET_KO[p] ?? p) : p === 'Ascendant' ? 'ASC' : p
const sko = (s: string, l: SlimLocale) => (l === 'ko' ? (SIGN_KO[s] ?? s) : s)
const sym = (a: string, l: SlimLocale) => (l === 'ko' ? ASP_SYM : ASP_EN)[a.toLowerCase()] ?? a

function orbDeg(line: string): number | null {
  const m = ORB.exec(line)
  return m ? Number(m[1]) + Number(m[2]) / 60 : null
}
function orbStr(line: string): string {
  const d = orbDeg(line)
  return d === null ? '' : `${d.toFixed(1)}°`
}
const isHeader = (s: string) => /^\[.*\]$/.test(s)

export function slimAstroSelf(block: string, opts: { locale: SlimLocale; year: number }): string {
  const { locale: l, year } = opts
  const lines = block.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!isHeader(line)) {
      i++
      continue
    }
    const header = line
    let j = i + 1
    const body: string[] = []
    while (j < lines.length && !isHeader(lines[j])) {
      body.push(lines[j])
      j++
    }
    const name = header.replace(/^\[|\]$/g, '')

    // ── Current transits ──────────────────────────────────────────────
    if (name.includes('Current transits')) {
      const kept = body
        .filter((b) => b.trim() && MAJOR.test(b))
        .map((b) => ({ o: orbDeg(b), m: TRN.exec(b), b }))
        .filter(
          (x): x is { o: number; m: RegExpExecArray; b: string } =>
            x.o !== null && x.o <= TRANSIT_LIMIT && !!x.m
        )
        .sort((a, b) => a.o - b.o)
        .slice(0, TRANSIT_TOP)
        .map(({ m, b }) => `  ${pko(m[1], l)}(t) ${sym(m[2], l)} ${pko(m[3], l)} ${orbStr(b)}`)
      if (kept.length) out.push(l === 'ko' ? '강한 트랜짓:' : 'strong transits:', ...kept)
      i = j
      continue
    }

    // ── Eclipses (this year), one line per aspect, grouped by event ────
    if (name.includes('Upcoming Eclipses')) {
      const rows = body
        .map((b) => ECL.exec(b))
        .filter((m): m is RegExpExecArray => !!m && m[2] === String(year))
      if (rows.length) {
        const groups = new Map<
          string,
          Array<{
            md: string
            kind: string
            sign: string
            tgt: string
            asp: string
            house: string
            n: number
            orb: string
          }>
        >()
        for (const m of rows) {
          const [, kind, , mm, dd, sign, , asp, tgt, house, orb] = m
          const key = `${kind}|${mm}-${dd}|${sign}`
          const arr = groups.get(key) ?? []
          arr.push({ md: `${mm}-${dd}`, kind, sign, tgt, asp, house, n: parseFloat(orb), orb })
          groups.set(key, arr)
        }
        out.push(l === 'ko' ? `${year} 일·월식:` : `${year} eclipses:`)
        for (const arr of groups.values()) {
          arr.sort((a, b) => a.n - b.n)
          arr.forEach((it, idx) => {
            const kindL = l === 'ko' ? it.kind : it.kind === '일식' ? 'solar' : 'lunar'
            const tgtRaw = pko(it.tgt, l)
            // 본명 행성/앵글에 일·월식이 떨어지는 형태 — `→ 본명 X` prefix 로
            // 누가 누구를 건드리는지 분명히 (이전 `→ 태양` 단독 표기는 LLM 이
            // "사자 → 태양" 식 sign-to-sign 으로 오인 가능).
            const tgtL = l === 'ko' ? `본명 ${tgtRaw}` : `natal ${tgtRaw}`
            const head = idx === 0 ? `${it.md} ${kindL} ${sko(it.sign, l)} ` : `${it.md} ${kindL} `
            // (H{n}) 는 *일·월식이 떨어지는 본인 하우스* — 본명 행성 자체의
            // 하우스 (예: 본명 달 H4) 와 다를 수 있어 라벨로 구분.
            const houseTag = l === 'ko' ? `식점 H${it.house}` : `eclipse@H${it.house}`
            const tail = idx === 0 ? ` ${it.orb}° (${houseTag})` : ` ${it.orb}°`
            out.push(`  ${head}→ ${tgtL} ${sym(it.asp, l)}${tail}`)
          })
        }
      }
      i = j
      continue
    }

    // ── Solar Return → one line ───────────────────────────────────────
    if (name.includes('Solar Return')) {
      const parts: string[] = []
      const asc = body.find((b) => b.startsWith('Asc:'))?.match(/Asc:\s*([A-Za-z]+)/)
      if (asc) parts.push(`${pko('Ascendant', l)} ${sko(asc[1], l)}`)
      const sun = body.find((b) => b.startsWith('Sun '))
      const sm = sun && POS.exec(sun.replace(/(\d+)°\d+'/, '$1°'))
      if (sm && sm[4]) parts.push(`${pko('Sun', l)} H${sm[4]}`)
      const byHouse: Record<string, string[]> = {}
      for (const b of body) {
        const pm = b.match(/^([A-Za-z]+) in [A-Za-z]+ \d+°(?:\d+')?, House (\d+)/)
        if (pm) (byHouse[pm[2]] ||= []).push(pm[1])
      }
      let topH = '',
        topN = 0
      for (const [hh, ps] of Object.entries(byHouse))
        if (ps.length > topN) {
          topN = ps.length
          topH = hh
        }
      if (topN >= 3)
        parts.push(
          `${l === 'ko' ? '스텔리움' : 'stellium'} H${topH} (${byHouse[topH].map((p) => pko(p, l)).join('·')})`
        )
      const sat = body.find((b) => b.startsWith('Saturn '))
      const stm = sat && POS.exec(sat.replace(/(\d+)°\d+'/, '$1°'))
      if (stm && stm[4]) parts.push(`${pko('Saturn', l)} H${stm[4]}`)
      // SR 은 어느 해의 return 인지 명시 — 매년 바뀌는 signal 이라 year 누락 시
      // LLM 이 "올해/내년" 인지 혼동.
      // 라벨에 "H#=SR차트 하우스" 명시 — natal H1 vs SR H6 같은 동일 행성
      // 다른 H 번호 (SR 차트가 별개라) 가 LLM 한테 모순처럼 보이는 위험 방지.
      if (parts.length)
        out.push(
          `${l === 'ko' ? `${year} 솔라리턴 (SR, H#=SR차트 하우스)` : `${year} solar return (SR, H#=SR-chart house)`}: ${parts.join(', ')}`
        )
      i = j
      continue
    }

    // ── Secondary Progression → one line ──────────────────────────────
    if (name.includes('Secondary Progression')) {
      const parts: string[] = []
      for (const b of body) {
        const m = b.match(/^Progressed (Sun|Moon):\s*([A-Za-z]+)\s*(\d+)/)
        if (m)
          parts.push(
            `${l === 'ko' ? (m[1] === 'Sun' ? '진행 태양' : '진행 달') : `P-${m[1]}`} ${sko(m[2], l)} ${m[3]}°`
          )
      }
      if (parts.length) out.push(`${l === 'ko' ? '2차진행' : 'progression'}: ${parts.join(' / ')}`)
      i = j
      continue
    }

    // everything else (positions, natal aspects, fixed stars, profection…) dropped
    i = j
  }

  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/, '') + '\n'
  )
}
