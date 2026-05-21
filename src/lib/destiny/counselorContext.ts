/**
 * Destiny counselor context layer — builds the LLM-facing context DIRECTLY
 * from the raw saju/astro engine (not by post-processing rendered text).
 * Raw engine calc is untouched; this only reads from it. KO/EN via locale.
 *
 * Increment ①: SAJU section.
 */
import { calculateSajuData } from '@/lib/saju/saju'
import { determineYongsin } from '@/lib/saju/yongsin'
import { determineGeokguk } from '@/lib/saju/geokguk'
import { calculateStrengthScore } from '@/lib/saju/strengthScore'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateProfection } from '@/lib/astrology/foundation/profections'
import { dignityOf } from '@/lib/astrology/foundation/dignities'
import { formatAstroSelf } from '@/lib/destiny/astroSelfFormatter'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'

const HOUSE_THEME_KO: Record<number, string> = {
  1: '자아·몸', 2: '재물·소유', 3: '소통·이동', 4: '가정·뿌리', 5: '연애·창작', 6: '일·건강',
  7: '관계·파트너', 8: '위기·변형', 9: '해외·학문·확장', 10: '직업·명예', 11: '인맥·소망', 12: '내면·고독',
}
const HOUSE_THEME_EN: Record<number, string> = {
  1: 'self·body', 2: 'wealth·assets', 3: 'communication·travel', 4: 'home·roots', 5: 'romance·creativity', 6: 'work·health',
  7: 'partnership', 8: 'crisis·transformation', 9: 'travel·study·expansion', 10: 'career·status', 11: 'network·hopes', 12: 'inner·solitude',
}

export type Locale = 'ko' | 'en'

const PLANET_KO_A: Record<string, string> = {
  Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성', Jupiter: '목성',
  Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성', Node: '노드',
  'True Node': '노드', 'North Node': '노드', Ascendant: '상승점', MC: '중천점',
}
const SIGN_KO_A: Record<string, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리', Leo: '사자자리', Virgo: '처녀자리',
  Libra: '천칭자리', Scorpio: '전갈자리', Sagittarius: '궁수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}
const MAJOR_TYPES = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile'])
// English saju term maps (EN locale renders the saju side in English too).
const SIBSIN_EN: Record<string, string> = {
  비견: 'Peer', 겁재: 'Rival', 식신: 'Output', 상관: 'Hurting Officer', 편재: 'Indirect Wealth',
  정재: 'Direct Wealth', 편관: 'Seven Killings', 정관: 'Direct Officer', 편인: 'Indirect Resource', 정인: 'Direct Resource', 일간: 'Self',
}
const ELEM_EN: Record<string, string> = { 목: 'Wood', 화: 'Fire', 토: 'Earth', 금: 'Metal', 수: 'Water' }
const STRENGTH_EN: Record<string, string> = { 신강: 'strong', 신약: 'weak', 극강: 'very strong', 강: 'strong', 중강: 'mod. strong', 중약: 'mod. weak', 약: 'weak', 극약: 'very weak' }
const YTYPE_EN: Record<string, string> = { 조후용신: 'Climatic', 병약용신: 'Remedial', 억부용신: 'Balancing', 통관용신: 'Mediating', 전왕용신: 'Dominant' }
const PERIOD_EN: Record<string, string> = { 대운: 'Decade', 세운: 'Annual', 월운: 'Monthly', 일진: 'Daily' }
const GILSIN_EN: Record<string, string> = { 천을귀인: 'Nobleman', 화개: 'Flower Canopy', 공망: 'Void' }
// branch romanization (pinyin) for English 刑/punishment labels
const BRANCH_PY: Record<string, string> = { 子: 'Zi', 丑: 'Chou', 寅: 'Yin', 卯: 'Mao', 辰: 'Chen', 巳: 'Si', 午: 'Wu', 未: 'Wei', 申: 'Shen', 酉: 'You', 戌: 'Xu', 亥: 'Hai' }
const RELKIND_EN: Record<string, string> = {
  천간합: 'Stem combine', 천간충: 'Stem clash', 지지육합: 'Branch union', 지지삼합: 'Branch trine',
  지지방합: 'Branch dir.combine', 지지충: 'Branch clash', 지지형: 'Branch punishment', 지지파: 'Branch break', 지지해: 'Branch harm', 원진: 'Resentment', 공망: 'Void',
}
const sibEN = (s?: string) => (s ? SIBSIN_EN[s] ?? s : '-')
const pkA = (n: string, l: Locale) => (l === 'ko' ? PLANET_KO_A[n] ?? n : n)

const ELEM: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const STEM_INFO: Record<string, { el: string; yang: boolean }> = {
  甲: { el: '목', yang: true }, 乙: { el: '목', yang: false }, 丙: { el: '화', yang: true }, 丁: { el: '화', yang: false },
  戊: { el: '토', yang: true }, 己: { el: '토', yang: false }, 庚: { el: '금', yang: true }, 辛: { el: '금', yang: false },
  壬: { el: '수', yang: true }, 癸: { el: '수', yang: false },
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const BRANCH_MAINQI: Record<string, string> = { 子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬' }
const CHEONEUL: Record<string, string[]> = { 甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 辛: ['寅', '午'], 壬: ['巳', '卯'], 癸: ['巳', '卯'] }
const HWAGAE_OF: Record<string, string> = { 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 巳: '丑', 酉: '丑', 丑: '丑', 亥: '未', 卯: '未', 未: '未' }
// astro aspect symbols (v2 compact format)
const ASP_SYM: Record<string, string> = { conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍' }
// 형(刑): 丑戌未·寅巳申 삼형, 子卯 상형, 자형(辰午酉亥)
const HYEONG_SETS = [['丑', '戌', '未'], ['寅', '巳', '申'], ['子', '卯']]
const SELF_HYEONG = new Set(['辰', '午', '酉', '亥'])
const hyeongPair = (a: string, b: string) => (a === b ? SELF_HYEONG.has(a) : HYEONG_SETS.some((s) => s.includes(a) && s.includes(b)))
// 천간합 → 化 element (hangul) + fiveElements key
const STEM_HAP_EL: Record<string, string> = {}
for (const [a, b, el] of [['甲', '己', '토'], ['乙', '庚', '금'], ['丙', '辛', '수'], ['丁', '壬', '목'], ['戊', '癸', '화']]) STEM_HAP_EL[[a, b].sort().join('')] = el
const EL2KEY: Record<string, string> = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }
function sibsinOf(day: string, other: string): string {
  const d = STEM_INFO[day], o = STEM_INFO[other]
  if (!d || !o) return ''
  const same = d.yang === o.yang
  if (o.el === d.el) return same ? '비견' : '겁재'
  if (GEN[d.el] === o.el) return same ? '식신' : '상관'
  if (GEN[o.el] === d.el) return same ? '편인' : '정인'
  if (CTRL[d.el] === o.el) return same ? '편재' : '정재'
  if (CTRL[o.el] === d.el) return same ? '편관' : '정관'
  return ''
}

export interface DestinyBirth {
  birthDate: string; birthTime: string; gender: 'male' | 'female'
  timezone?: string; latitude?: number; longitude?: number
  birthTimeUnknown?: boolean; birthCityUnknown?: boolean
}

export interface CurrentPeriod {
  seun?: { stem: string; branch: string } | null
  wolun?: { stem: string; branch: string } | null
  iljin?: { stem: string; branch: string } | null
  relations?: Array<{ source: string; relation: { kind: string; detail?: string; pillars?: string[] } }>
}

function buildInstructions(locale: Locale): string {
  if (locale === 'en') {
    return [
      '## RULES',
      '- output: no Hanja / jargon / house numbers / degree figures — plain language',
      '- never mix saju & astrology terms in one sentence',
      '- tone: warm mentor + firm. no hedging ("maybe")',
      '- weigh good/bad by the chart, balanced',
      '- greetings/small talk brief; no unsolicited analysis',
      '- life/death · medical · legal: signal only, the decision is theirs',
      '- astro symbols: ☌conjunction ⚹sextile □square △trine ☍opposition / R retrograde / (t)current transit / [detriment]=weak [domicile]=strong',
    ].join('\n')
  }
  return [
    '## 규칙',
    '- 출력: 한자·명리용어·하우스 번호·각도 수치 X. 일상어로',
    '- 사주·점성 한 문장에 직접 섞지 말 것',
    '- 톤: 따뜻한 멘토 + 단정. "아마" 회피 금지',
    '- 좋고 나쁨 차트 근거대로 균형',
    '- 인사·잡담 짧게, 묻지 않은 해석 X',
    '- 생사·의료·법률은 신호만, 결정은 본인 몫',
    '- 점성 기호: ☌결합 ⚹협력 □긴장 △조화 ☍대립 / R역행 / (t)현재트랜짓 / [detriment]약 [domicile]강',
  ].join('\n')
}

/** Full counselor context: header + SAJU + ASTRO (natal + now) + rules. */
export async function buildDestinyContext(birth: DestinyBirth, now: Date, locale: Locale = 'ko', current?: CurrentPeriod): Promise<string> {
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
  const year = now.getFullYear()
  const saju = buildSajuSection(birth, locale, current, year)

  // top header: # date time coords gender / age / today  (age = 만 나이)
  const [by, bm, bd] = birth.birthDate.split('-').map(Number)
  let age = year - by
  if (now.getMonth() + 1 < bm || (now.getMonth() + 1 === bm && now.getDate() < bd)) age--
  const lat = birth.latitude ?? 37.5665
  const lon = birth.longitude ?? 126.978
  const tz = birth.timezone ?? 'Asia/Seoul'
  const gH = birth.gender === 'female' ? '女' : '男'
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const locTag = birth.birthCityUnknown ? '?' : `${lat.toFixed(2)},${lon.toFixed(2)}`
  const timeTag = birth.birthTimeUnknown ? '??:??' : (birth.birthTime || '')
  const header = `# ${birth.birthDate} ${timeTag} ${locTag} ${gH} / ${age}${L('세', 'y')} / ${today}`

  let astroNatal = ''   // ## 점성 (static natal chart)
  let astroTiming = ''  // moves under ## 타이밍 (transits/eclipses/SR/progression/profection)
  try {
    const [Y, M, D] = birth.birthDate.split('-').map(Number)
    const [h, mi] = (birth.birthTime || '12:00').split(':').map(Number)
    const natal = await calculateNatalChart({ year: Y, month: M, date: D, hour: h, minute: mi, latitude: lat, longitude: lon, timeZone: tz })
    const chart = toChart(natal)
    const sgn = (s: string) => (locale === 'ko' ? (SIGN_KO_A[s] ?? s).replace(/자리$/, '') : s)
    const pl = (n: string) => (n === 'Ascendant' ? 'ASC' : n === 'MC' ? 'MC' : pkA(n, locale))

    // positions (sign·house·dignity); dignity tag is English in both locales
    const posLines: string[] = []
    for (const p of natal.planets) {
      const dg = dignityOf(p.name, p.sign)
      const dgTag = dg && dg !== 'peregrine' ? ` [${dg}]` : ''
      posLines.push(`  ${pl(p.name)} ${sgn(p.sign)} H${p.house}${p.retrograde ? ' R' : ''}${dgTag}`)
    }
    posLines.push(`  ASC ${sgn(natal.ascendant.sign)}`, `  MC ${sgn(natal.mc.sign)}`)

    // aspects: planet-planet (engine) + planet→ASC/MC, banded by orb, symbols
    const aspects: Array<{ from: string; to: string; type: string; orb: number }> = []
    for (const a of findNatalAspects(chart)) if (MAJOR_TYPES.has(a.type) && a.orb < 5) aspects.push({ from: a.from.name, to: a.to.name, type: a.type, orb: a.orb })
    const ANG: Array<{ deg: number; t: string }> = [{ deg: 0, t: 'conjunction' }, { deg: 60, t: 'sextile' }, { deg: 90, t: 'square' }, { deg: 120, t: 'trine' }, { deg: 180, t: 'opposition' }]
    for (const ang of [natal.ascendant, natal.mc]) for (const p of natal.planets) {
      let dd = Math.abs(ang.longitude - p.longitude); if (dd > 180) dd = 360 - dd
      for (const a of ANG) { const orb = Math.abs(dd - a.deg); if (orb < 5) { aspects.push({ from: p.name, to: ang.name, type: a.t, orb }); break } }
    }
    const fmtAsp = (a: { from: string; to: string; type: string; orb: number }) => `  ${pl(a.from)} ${ASP_SYM[a.type] ?? a.type} ${pl(a.to)} ${a.orb.toFixed(1)}°`
    const strong = aspects.filter((a) => a.orb <= 2).sort((x, y) => x.orb - y.orb).map(fmtAsp)
    const mid = aspects.filter((a) => a.orb > 2 && a.orb < 5).sort((x, y) => x.orb - y.orb).map(fmtAsp)

    // current (transits / eclipses / solar return / progression) via astroSlim v2
    const block = await formatAstroSelf({
      chart, latitude: lat, longitude: lon, timeZone: tz, now,
      natalInput: { year: Y, month: M, date: D, hour: h, minute: mi, latitude: lat, longitude: lon, timeZone: tz },
      skipAngles: birth.birthCityUnknown,
    })
    const cur = slimAstroSelf(block, { locale, year }).trim()

    // profection (Korean-age convention) — compact one-liner
    const kAge = year - by + 1
    const prof = calculateProfection(chart, kAge)
    const lp = chart.planets.find((p) => p.name === prof.lordOfYear) as { sign?: string; house?: number } | undefined
    const lordRes = lp?.sign ? ` (${sgn(lp.sign)}${lp.house ? ` H${lp.house}` : ''})` : ''
    const profLine = L(
      `프로펙션 ${kAge}세: H${prof.activatedHouse} 활성 (${HOUSE_THEME_KO[prof.activatedHouse]}), Lord ${pkA(prof.lordOfYear, 'ko')}${lordRes}`,
      `Profection age ${kAge}: H${prof.activatedHouse} active (${HOUSE_THEME_EN[prof.activatedHouse]}), Lord ${prof.lordOfYear}${lordRes}`,
    )

    astroNatal = [
      L('## 점성', '## ASTRO'), '',
      L('행성 (사인·하우스·디그니티):', 'planets (sign·house·dignity):'), ...posLines, '',
      ...(strong.length ? [L('본명 강한각 (0-2°):', 'natal strong (0-2°):'), ...strong] : []),
      ...(mid.length ? [L('본명 중간각 (2-5°):', 'natal mid (2-5°):'), ...mid] : []),
    ].join('\n')
    astroTiming = [cur, profLine].filter(Boolean).join('\n')
  } catch { /* astro optional */ }

  // unified ## 타이밍 — saju (대운/세운/교차) + astro (트랜짓/일월식/솔라리턴/진행/프로펙션)
  const timingBody = [saju.timing, astroTiming].filter(Boolean).join('\n')
  const timing = timingBody ? `${L(`## 타이밍 (${today})`, `## TIMING (${today})`)}\n\n${timingBody}` : ''

  return [header, saju.natal, astroNatal, timing, buildInstructions(locale)].filter(Boolean).join('\n\n').trim() + '\n'
}

export function buildSajuSection(birth: DestinyBirth, locale: Locale = 'ko', current?: CurrentPeriod, year?: number): { natal: string; timing: string } {
  const tz = birth.timezone ?? 'Asia/Seoul'
  const saju = calculateSajuData(birth.birthDate, birth.birthTime, birth.gender, 'solar', tz) as unknown as {
    pillars: Record<'year' | 'month' | 'day' | 'time', {
      heavenlyStem: { name: string; sibsin?: string }
      earthlyBranch: { name: string; sibsin?: string }
      jijanggan?: { chogi?: { name: string }; junggi?: { name: string }; jeonggi?: { name: string } }
    }>
    dayMaster: { name: string; element?: string; yin_yang?: string }
    fiveElements: Record<string, number>
    daeWoon?: {
      current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number; sibsin?: { cheon?: string; ji?: string } } | null
      list?: Array<{ age?: number; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon?: string; ji?: string } }>
    }
    shinsal?: string[]
  }
  const P = saju.pillars
  const day = P.day.heavenlyStem.name
  const simple = {
    year: { stem: P.year.heavenlyStem.name, branch: P.year.earthlyBranch.name },
    month: { stem: P.month.heavenlyStem.name, branch: P.month.earthlyBranch.name },
    day: { stem: P.day.heavenlyStem.name, branch: P.day.earthlyBranch.name },
    time: { stem: P.time.heavenlyStem.name, branch: P.time.earthlyBranch.name },
  }

  let strengthLabel = ''
  try {
    const s = calculateStrengthScore(saju.pillars as never)
    strengthLabel = ['극강', '강', '중강'].includes(s.level) ? '신강' : '신약'
  } catch { /* */ }

  let geok = ''
  try { geok = determineGeokguk(simple as never).primary } catch { /* */ }
  const y = (() => { try { return determineYongsin(simple as never) } catch { return null } })()

  const rel = (() => {
    try {
      return analyzeRelations(toAnalyzeInputFromSaju(P as never, day))
    } catch { return [] as Array<{ kind: string; detail?: string; pillars?: string[] }> }
  })()

  // 관살혼잡: 정관 AND 편관 both present across stems+branches sibsin
  const allSibsin = (['year', 'month', 'day', 'time'] as const).flatMap((k) => [P[k].heavenlyStem.sibsin, P[k].earthlyBranch.sibsin])
  const gwansalHonjap = allSibsin.includes('정관') && allSibsin.includes('편관')

  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
  const plab: Record<string, string> = locale === 'en' ? { year: 'Y', month: 'M', day: 'D', time: 'H' } : { year: '년', month: '월', day: '일', time: '시' }
  const PMAP: Record<string, string> = locale === 'en' ? { 년: 'Y', 월: 'M', 일: 'D', 시: 'H' } : { 년: '년', 월: '월', 일: '일', 시: '시' }
  const out: string[] = []
  out.push(L('## 사주', '## SAJU'), '')

  // day master: stem(yin/yang+element) strength rootedness(통근)
  const dm = saju.dayMaster
  const dmElDisp = dm.element ? (locale === 'en' ? (ELEM_EN[dm.element] ?? dm.element) : dm.element) : ''
  const yinyang = dm.yin_yang === '음' ? L('음', 'yin') : L('양', 'yang')
  const strLab = locale === 'en' ? (STRENGTH_EN[strengthLabel] ?? strengthLabel) : strengthLabel
  // 통근: a branch hidden-stem shares the day master's element (비겁 root)
  const dayElRoot = STEM_INFO[day]?.el
  const rooted = (['year', 'month', 'day', 'time'] as const).some((k) => {
    const jg = P[k].jijanggan
    return [jg?.chogi?.name, jg?.junggi?.name, jg?.jeonggi?.name].some((s) => !!s && STEM_INFO[s]?.el === dayElRoot)
  })
  const rootLab = locale === 'en' ? (rooted ? 'rooted' : 'rootless') : (rooted ? '유근' : '무근')
  out.push(`${L('일간', 'day_master')}: ${dm.name}(${yinyang}${dmElDisp}) ${strLab} ${rootLab}`)
  const fe = saju.fiveElements
  out.push(`${L('오행', 'elements')}: 木${fe.wood} 火${fe.fire} 土${fe.earth} 金${fe.metal} 水${fe.water}`)

  // 용신 (engine-honest; hanja elements KO / English EN; 仇 only when 忌 present)
  if (y?.primaryYongsin) {
    const ge = (e?: string) => (e ? (locale === 'en' ? (ELEM_EN[e] ?? e) : (ELEM[e] ?? e)) : '')
    const ytAbbr = y.yongsinType ? (locale === 'en' ? (YTYPE_EN[y.yongsinType] ?? y.yongsinType) : y.yongsinType.replace(/용신$/, '')) : ''
    const extras = [
      y.secondaryYongsin ? `${L('喜', 'fav')}:${ge(y.secondaryYongsin)}` : '',
      y.kibsin ? `${L('忌', 'foe')}:${ge(y.kibsin)}` : '',
      (y.kibsin && y.gusin) ? `${L('仇', 'rival')}:${ge(y.gusin)}` : '',
    ].filter(Boolean).join(' ')
    out.push(`${L('용신', 'yongsin')}: ${ge(y.primaryYongsin)}${ytAbbr ? `(${ytAbbr})` : ''}${extras ? ` | ${extras}` : ''}`)
  }
  if (geok) {
    const geokEn = `${SIBSIN_EN[geok.replace(/격$/, '')] ?? geok.replace(/격$/, '')} structure`
    out.push(`${L('격국', 'geokguk')}: ${locale === 'en' ? geokEn : geok}`)
  }
  if (gwansalHonjap) out.push(L('참고: 官殺混雜 (정관+편관 동존)', 'note: Officer-Killings Mix (Direct Officer + Seven Killings)'))
  out.push('')

  // 기둥 (bare 십성, no gloss / no pipe)
  out.push(L('기둥:', 'pillars:'))
  const bareSib = (t?: string) => ((!t || t === '-') ? (t ?? '-') : (locale === 'en' ? (SIBSIN_EN[t] ?? t) : t))
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const st = P[k].heavenlyStem, br = P[k].earthlyBranch
    const ss = k === 'day' ? (locale === 'en' ? 'Self' : '일간') : bareSib(st.sibsin)
    out.push(`  ${plab[k]} ${st.name}${br.name} ${ss}/${bareSib(br.sibsin)}`)
  }
  out.push('')

  // 지장간 (stems only)
  out.push(L('지장간:', 'hidden_stems:'))
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const jg = P[k].jijanggan
    const stems = [jg?.chogi?.name, jg?.junggi?.name, jg?.jeonggi?.name].filter(Boolean) as string[]
    if (stems.length) out.push(`  ${P[k].earthlyBranch.name}: ${stems.join('·')}`)
  }
  out.push('')

  // 합충: 공망 → combine(삼합/육합/방합/합) → clash(충/형/해/원진)
  const BRANCH_RE = /[子丑寅卯辰巳午未申酉戌亥]/g
  const combineRels = rel.filter((r) => /삼합|육합|방합|합화/.test(r.kind))
  const combinedBranches = new Set<string>()
  for (const r of combineRels) for (const ch of (r.detail || '').match(BRANCH_RE) ?? []) combinedBranches.add(ch)
  const parseRel = (kind: string, detail: string) => {
    const m = (detail || '').match(/^(.+?)\s*(삼합|육합|방합|합화|충|형|파|해|원진|합)(?:\(?([목화토금수])\)?)?/)
    const entities = (m ? m[1] : (detail || '')).replace(/·/g, '').trim()
    const word = m ? m[2] : kind.replace(/^(지지|천간)/, '')
    const el = m ? (m[3] ?? '') : ''
    return { entities, word, el }
  }
  const shown = rel.filter((r) => r.kind !== '지지파')
  if (shown.length) {
    out.push(L('합충:', 'combos:'))
    const gong: string[] = [], combos: string[] = []
    const clashGroups = new Map<string, { entities: string; word: string; tags: string[] }>()
    for (const r of shown) {
      if (r.kind === '공망') {
        const vb = (r.detail || '').match(/[子丑寅卯辰巳午未申酉戌亥]/)?.[0] || ''
        const pill = Array.isArray(r.pillars) && r.pillars.length ? r.pillars.map((p) => plab[p] ?? p).join('·') : ''
        let note = ''
        if (vb && combinedBranches.has(vb)) {
          if (locale === 'ko') {
            const toks = combineRels.filter((cr) => (cr.detail || '').includes(vb)).map((cr) => {
              const pr = parseRel(cr.kind, cr.detail || '')
              return `${pr.entities.replace(/-/g, '')}${pr.word === '육합' ? '합' : pr.word}`
            })
            note = ` — ${toks.join('·')} 동시참여로 회복`
          } else note = ' — partly restored (joins union/trine)'
        }
        gong.push(`  ${L('공망', 'Void')} ${vb}[${pill}]${note}`)
        continue
      }
      const pr = parseRel(r.kind, r.detail || '')
      const wordDisp = locale === 'en' ? (RELKIND_EN[r.kind] ?? pr.word) : pr.word
      if (/충|형|파|해|원진/.test(pr.word)) {
        const key = `${pr.entities}|${pr.word}`
        const tag = Array.isArray(r.pillars) && r.pillars.length ? r.pillars.map((p) => plab[p] ?? p).join('↔') : ''
        const g = clashGroups.get(key) ?? { entities: pr.entities, word: wordDisp, tags: [] }
        if (tag) g.tags.push(tag)
        clashGroups.set(key, g)
      } else {
        const elDisp = pr.el ? (locale === 'en' ? (ELEM_EN[pr.el] ?? pr.el) : (ELEM[pr.el] ?? pr.el)) : ''
        combos.push(`  ${pr.entities} ${wordDisp}${elDisp ? ` → ${elDisp}` : ''}`)
      }
    }
    out.push(...gong, ...combos)
    for (const g of clashGroups.values()) out.push(`  ${g.entities} ${g.word}${g.tags.length ? ` [${g.tags.join(', ')}]` : ''}`)
    out.push('')
  }

  // 신살 — 천을귀인 + 화개
  try {
    const cheon = CHEONEUL[day] ?? []
    const hwagae = HWAGAE_OF[P.day.earthlyBranch.name]
    const cheonLab = locale === 'en' ? GILSIN_EN['천을귀인'] : '천을귀인'
    const hwagaeLab = locale === 'en' ? GILSIN_EN['화개'] : '화개'
    const hits: string[] = []
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      if (cheon.includes(P[k].earthlyBranch.name)) hits.push(`${cheonLab} ${P[k].earthlyBranch.name}[${plab[k]}]`)
    }
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      if (P[k].earthlyBranch.name === hwagae) hits.push(`${hwagaeLab} ${P[k].earthlyBranch.name}[${plab[k]}]`)
    }
    if (hits.length) out.push(`${L('신살', 'sinsal')}: ${hits.join(' / ')}`)
  } catch { /* */ }

  // ── timing (대운 흐름 + 세운 + 교차) — returned separately for the ## 타이밍 block
  const timing: string[] = []
  const cur = saju.daeWoon?.current
  const dlist = saju.daeWoon?.list ?? []
  const sib1 = (s?: string) => (locale === 'en' ? sibEN(s) : (s || '-'))
  // 대운 흐름 (full timeline, current marked with its 십성) — prevents the LLM
  // from inventing past/future 대운 ages it can't see.
  if (dlist.length) {
    const tl = dlist.map((d) => {
      const gz = `${d.age ?? '?'}${d.heavenlyStem ?? ''}${d.earthlyBranch ?? ''}`
      return cur && d.age === cur.age ? `${gz}(${L('현재 ', 'now ')}${sib1(d.sibsin?.cheon)}/${sib1(d.sibsin?.ji)})` : gz
    })
    timing.push(`${L('대운', 'daeun')}: ${tl.join(' / ')}`)
  } else if (cur) {
    timing.push(`${L('대운', 'daeun')} ${cur.age ?? '?'}: ${cur.heavenlyStem ?? ''}${cur.earthlyBranch ?? ''} ${sib1(cur.sibsin?.cheon)}/${sib1(cur.sibsin?.ji)}`)
  }
  if (current?.seun) {
    const v = current.seun
    const s = sibsinOf(day, v.stem), b = sibsinOf(day, BRANCH_MAINQI[v.branch] ?? '')
    const honjap = (s === '정관' || s === '편관') && (b === '정관' || b === '편관') && s !== b
    const hj = honjap ? (locale === 'en' ? ' = Officer-Killings Mix' : ' = 관살혼잡') : ''
    const pair = (s || b) ? ` (${sib1(s)}/${sib1(b)}${hj})` : ''
    timing.push(`${L('세운', 'Annual')} ${year ?? ''} ${v.stem}${v.branch}${pair}`.replace(/\s{2,}/g, ' '))
  }
  // 교차 — 대운·세운, flat, kind-after
  {
    const relsBy = (src: string) => (current?.relations ?? []).filter((r) => r.source === src)
    const natalBr: Array<[string, string]> = [['년', P.year.earthlyBranch.name], ['월', P.month.earthlyBranch.name], ['일', P.day.earthlyBranch.name], ['시', P.time.earthlyBranch.name]]
    const sp = locale === 'en' ? ' ' : ''
    const arrow = (s: string) => locale === 'en'
      ? s.replace(/ - year/g, ' ↔ Y').replace(/ - month/g, ' ↔ M').replace(/ - day/g, ' ↔ D').replace(/ - time/g, ' ↔ H')
      : s.replace(/ - year/g, ' ↔ 년').replace(/ - month/g, ' ↔ 월').replace(/ - day/g, ' ↔ 일').replace(/ - time/g, ' ↔ 시')
    const hwaNote = (detail: string): string => {
      const stems = (detail.match(/[甲乙丙丁戊己庚辛壬癸]/g) ?? []).slice(0, 2)
      if (stems.length < 2) return ''
      const el = STEM_HAP_EL[stems.sort().join('')]
      if (!el) return ''
      const cnt = (fe as Record<string, number>)[EL2KEY[el]] ?? 0
      const H = locale === 'en' ? (ELEM_EN[el] ?? el) : (ELEM[el] ?? el)
      if (cnt <= 1) return locale === 'en' ? ` (combine→${H}, may not complete)` : ` (合${H}, 化미완 가능)`
      return locale === 'en' ? ` (combine→${H})` : ` (合化${H})`
    }
    const shortK = (kind: string) => (locale === 'en' ? (RELKIND_EN[kind] ?? kind) : kind.replace(/^(지지|천간)/, ''))
    const hyeongTag = (a: string, b: string) => (locale === 'en' ? `(${a}${b}刑 / ${BRANCH_PY[a] ?? a}-${BRANCH_PY[b] ?? b} Punishment)` : `(${a}${b}刑)`)
    const crossLines: string[] = []
    const pBranch: Record<string, string | undefined> = { 대운: cur?.earthlyBranch ?? undefined, 세운: current?.seun?.branch }
    for (const [k, src] of [['대운', 'daeun'], ['세운', 'seun']] as const) {
      const pfx = locale === 'en' ? (PERIOD_EN[k] ?? k) : k
      const br = pBranch[k]
      if (br) for (const [lab, nb] of natalBr) if (hyeongPair(br, nb)) {
        crossLines.push(`  ${pfx}${sp}${br} ↔ ${(locale === 'en' ? (PMAP[lab] ?? lab) : lab)}${sp}${nb} ${shortK('지지형')} ${hyeongTag(br, nb)}`)
      }
      const grp = new Map<string, { luck: string; nat: string; word: string; note: string; pills: string[] }>()
      for (const r of relsBy(src)) {
        const d = arrow(r.relation.detail || '')
        const note = r.relation.kind === '천간합' ? hwaNote(r.relation.detail || '') : ''
        const m = d.match(/^(?:운|luck) (\S+) ↔ (Y|M|D|H|년|월|일|시) (\S+)$/)
        if (!m) continue
        const key = `${r.relation.kind}|${m[1]}|${m[3]}|${note}`
        const g = grp.get(key) ?? { luck: m[1], nat: m[3], word: shortK(r.relation.kind), note, pills: [] }
        g.pills.push(m[2]); grp.set(key, g)
      }
      for (const g of grp.values()) crossLines.push(`  ${pfx}${sp}${g.luck} ↔ ${g.pills.join('·')}${sp}${g.nat} ${g.word}${g.note}`)
    }
    if (crossLines.length) { timing.push(L('교차:', 'cross:')); timing.push(...crossLines) }
  }

  return {
    natal: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
    timing: timing.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  }
}
