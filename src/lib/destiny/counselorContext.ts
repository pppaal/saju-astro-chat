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
import { getTwelveStagesForPillars, getTwelveShinsalSingleByPillar } from '@/lib/saju/shinsal'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { extendChartWithExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateProfection } from '@/lib/astrology/foundation/profections'
import { formatAstroSelf } from '@/lib/destiny/astroSelfFormatter'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'

const HOUSE_THEME_KO: Record<number, string> = {
  1: '자아·몸', 2: '재물·소유', 3: '소통·이동', 4: '가정·뿌리', 5: '연애·창작', 6: '일·건강',
  7: '관계·파트너', 8: '위기·변형', 9: '해외·학문·확장', 10: '직업·명예', 11: '인맥·소망', 12: '내면·고독',
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
const skA = (s: string, l: Locale) => (l === 'ko' ? SIGN_KO_A[s] ?? s : s)
const ASP_FULL: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: '컨정션(결합)', en: 'Conjunction' }, opposition: { ko: '어포지션(대립)', en: 'Opposition' },
  trine: { ko: '트라인(조화)', en: 'Trine' }, square: { ko: '스퀘어(긴장)', en: 'Square' }, sextile: { ko: '섹스타일(협력)', en: 'Sextile' },
}
const MAJOR_TYPES = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile'])
// gloss maps so the saju section is legible (not bare 명리 codes)
const SIBSIN_G: Record<string, string> = {
  비견: '자립·경쟁', 겁재: '경쟁·소비', 식신: '표현·여유', 상관: '재능·표현',
  편재: '유동적 재물·활동', 정재: '안정적 재물·성실', 편관: '압박·도전', 정관: '책임·명예',
  편인: '직관·비주류 학습', 정인: '배움·보호·수용',
}
const UNSEONG_G: Record<string, string> = {
  장생: '시작·성장', 목욕: '미숙·시행착오', 관대: '자리잡는 독립', 건록: '왕성·자립',
  제왕: '기운 절정', 쇠: '절정 지나 안정', 병: '약해짐·예민', 사: '기운 다함',
  묘: '갈무리·내향', 절: '바닥·전환점', 태: '새 기운 잉태', 양: '자라나는 준비',
}
const SINSAL12_G: Record<string, string> = {
  겁살: '빼앗김·돌발', 재살: '송사·구속', 천살: '윗사람·천재', 지살: '이동·터전',
  연살: '매력·이성', 도화: '매력·이성', 월살: '위축', 망신: '구설·노출', 망신살: '구설·노출',
  장성: '리더십·주도', 장성살: '리더십·주도', 반안: '출세·안정', 반안살: '출세·안정',
  역마: '이동·해외', 역마살: '이동·해외', 육해: '질병·방해', 육해살: '질병·방해', 화개: '예술·종교·고독', 화개살: '예술·종교·고독',
}
const ELEMG: Record<string, string> = { 목: '성장·확장', 화: '열정·표현', 토: '안정·중심', 금: '결단·정제', 수: '지혜·유연' }
const gl = (term: string | undefined, dict: Record<string, string>, locale: Locale): string => {
  if (!term || term === '-' || term === '일간') return term ?? '-'
  const g = dict[term]
  return locale === 'ko' && g ? `${term}(${g})` : term
}
const pkA = (n: string, l: Locale) => (l === 'ko' ? PLANET_KO_A[n] ?? n : n)
const aspG = (t: string, l: Locale) => (ASP_FULL[t] ? (l === 'ko' ? ASP_FULL[t].ko : ASP_FULL[t].en) : t)

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
      '## READING RULES',
      '- weave saju and astrology into one flow, but never mix the two systems’ terms in a single sentence.',
      '- do not output Hanja, technical terms, house numbers, or degree figures. Translate to plain language only.',
      '- orb weight: 0-2°=strong / 3-4°=mid / 5-6°=weak. On natal aspects ↗=applying (building), ↘=separating (fading).',
      '- dignity = how well the planet functions in that sign. [Minor points] are supplementary only.',
      '- tone: warm mentor + firm conclusions. Speak gently but never hedge ("maybe", "in some cases").',
      '- weigh good/bad by the chart, not by politeness.',
      '- for life/death, medical, legal, or major decisions: point to the chart signal but make clear the decision is theirs.',
      '- greetings/small talk: reply briefly then ask what they want to know. Do not dump unsolicited analysis.',
    ].join('\n')
  }
  return [
    '## 읽기 규칙',
    '- 사주·점성을 자연스럽게 엮어 한 흐름으로 답한다. 단, 두 체계의 용어를 한 문장 안에 직접 섞지 않는다.',
    '- 한자·명리용어(정인/편재 등)·하우스 번호·각도 수치는 출력 금지. 의미만 일상어로 푼다.',
    '- orb 가중치: 0-2°=강 / 3-4°=중 / 5-6°=약. 본명 각의 ↗=강해지는 중(applying), ↘=약해지는 중(separating).',
    '- 디그니티 = 행성이 그 사인에서 얼마나 잘 작동하는지. [보조점]은 보조 신호로만.',
    '- 톤: 따뜻한 멘토 어조 + 단정적 결론. 부드럽게 말해도 결론은 흐리지 않는다. "아마/경우에 따라" 회피 금지.',
    '- 좋고 나쁨은 예의가 아니라 차트 근거대로 균형 있게 짚는다.',
    '- 생사·의료·법률·중대 결정은 차트 신호만 짚고 "결정은 본인 몫"임을 분명히 한다.',
    '- 인사·잡담은 짧게 응대 후 무엇이 궁금한지 묻는다. 묻지 않은 해석을 먼저 쏟지 않는다.',
  ].join('\n')
}

/** Full counselor context: SAJU (raw) + ASTRO/CURRENT (raw→refined) + rules. */
export async function buildDestinyContext(birth: DestinyBirth, now: Date, locale: Locale = 'ko', current?: CurrentPeriod): Promise<string> {
  const saju = buildSajuSection(birth, locale, current)
  let astro = ''
  try {
    const [Y, M, D] = birth.birthDate.split('-').map(Number)
    const [h, mi] = (birth.birthTime || '12:00').split(':').map(Number)
    const lat = birth.latitude ?? 37.5665
    const lon = birth.longitude ?? 126.978
    const tz = birth.timezone ?? 'Asia/Seoul'
    const natal = await calculateNatalChart({ year: Y, month: M, date: D, hour: h, minute: mi, latitude: lat, longitude: lon, timeZone: tz })
    const block = await formatAstroSelf({
      chart: toChart(natal), latitude: lat, longitude: lon, timeZone: tz, now,
      natalInput: { year: Y, month: M, date: D, hour: h, minute: mi, latitude: lat, longitude: lon, timeZone: tz },
      skipAngles: birth.birthCityUnknown,
    })
    astro = slimAstroSelf(block, { locale, year: now.getFullYear() })
    // enrich: A/S markers on natal aspects + minor points (from raw chart)
    try {
      const chart = toChart(natal)
      const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
      const asps = findNatalAspects(chart)
        .filter((a) => MAJOR_TYPES.has(a.type) && a.orb <= 6)
        .sort((a, b) => a.orb - b.orb).slice(0, 12)
      if (asps.length) {
        const head = L(`[본명 각 · 주요각 orb≤6° 상위${asps.length} · ↗적용/↘분리]`, `[Natal aspects · major orb<=6 top${asps.length} · ↗applying/↘separating]`)
        const lines = asps.map((a) => `${pkA(a.from.name, locale)} ${aspG(a.type, locale)} ${pkA(a.to.name, locale)} (orb ${a.orb.toFixed(1)}°)${a.applying ? ' ↗' : ' ↘'}`)
        astro = astro.replace(/\[(?:본명 각|Natal aspects)[\s\S]*?\n\n/, head + '\n' + lines.join('\n') + '\n\n')
      }
      const ut = (natal as unknown as { meta?: { jdUT?: number }; ut_jd?: number; jdUT?: number })
      const jd = ut.meta?.jdUT ?? ut.ut_jd ?? ut.jdUT
      if (jd != null) {
        const ext = extendChartWithExtraPoints(chart, jd, lat, lon) as unknown as Record<string, { sign?: string; house?: number } | undefined>
        const ml: string[] = []
        const add = (label: string, key: string) => {
          const pt = ext[key]
          if (pt?.sign) ml.push(`${label} ${skA(pt.sign, locale)}${pt.house ? L(` ${pt.house}하우스`, ` H${pt.house}`) : ''}`)
        }
        add(L('키론(상처·치유)', 'Chiron'), 'chiron')
        add(L('릴리스(억눌린 욕망)', 'Lilith'), 'lilith')
        add(L('포춘(타고난 행운점)', 'Part of Fortune'), 'partOfFortune')
        add(L('버텍스(운명적 만남)', 'Vertex'), 'vertex')
        if (ml.length) {
          const mb = L('[보조점 (minor)]', '[Minor points]') + '\n' + ml.join('\n') + '\n\n'
          const idx = astro.search(/\[(?:현재 트랜짓|Current transits)/)
          astro = idx >= 0 ? astro.slice(0, idx) + mb + astro.slice(idx) : astro.trimEnd() + '\n\n' + mb
        }
      }
      // profection — activated house + Lord of the Year (replaces slim's bare one)
      // codebase uses Korean age for profection (now.year - birthYear + 1)
      const kAge = now.getFullYear() - Number(birth.birthDate.split('-')[0]) + 1
      const prof = calculateProfection(chart, kAge)
      const lordKo = PLANET_KO_A[prof.lordOfYear] ?? prof.lordOfYear
      // where the year-lord lives natally (deepens the reading)
      const lp = chart.planets.find((p) => p.name === prof.lordOfYear) as { sign?: string; house?: number } | undefined
      const lordResKo = lp?.sign ? ` (${skA(lp.sign, 'ko')}${lp.house ? ` ${lp.house}하우스` : ''} 거주)` : ''
      const lordResEn = lp?.sign ? ` (in ${lp.sign}${lp.house ? `, H${lp.house}` : ''})` : ''
      const profBlock = L(
        `[프로펙션 ${kAge}세]\n활성 하우스: ${prof.activatedHouse}하우스 (${HOUSE_THEME_KO[prof.activatedHouse]})\n올해의 지배성(Lord of Year): ${lordKo}${lordResKo}`,
        `[Profection age ${kAge}]\nactivated house: ${prof.activatedHouse} (${HOUSE_THEME_KO[prof.activatedHouse]})\nLord of the Year: ${prof.lordOfYear}${lordResEn}`,
      ) + '\n\n'
      astro = astro.replace(/\[(?:프로펙션|Profection)[\s\S]*?\n\n/, profBlock)
      if (!/프로펙션|Profection age/.test(astro)) astro = astro.trimEnd() + '\n\n' + profBlock
    } catch { /* enrichment optional */ }
  } catch { /* astro optional */ }
  return [saju, astro, buildInstructions(locale)].filter(Boolean).join('\n\n').trim() + '\n'
}

export function buildSajuSection(birth: DestinyBirth, locale: Locale = 'ko', current?: CurrentPeriod): string {
  const tz = birth.timezone ?? 'Asia/Seoul'
  const saju = calculateSajuData(birth.birthDate, birth.birthTime, birth.gender, 'solar', tz) as unknown as {
    pillars: Record<'year' | 'month' | 'day' | 'time', {
      heavenlyStem: { name: string; sibsin?: string }
      earthlyBranch: { name: string; sibsin?: string }
      jijanggan?: { chogi?: { name: string }; junggi?: { name: string }; jeonggi?: { name: string } }
    }>
    dayMaster: { name: string; element?: string; yin_yang?: string }
    fiveElements: Record<string, number>
    daeWoon?: { current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number; sibsin?: { cheon?: string; ji?: string } } | null }
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

  let strengthLevel = '', strengthLabel = ''
  try {
    const s = calculateStrengthScore(saju.pillars as never)
    strengthLevel = s.level
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
  const out: string[] = []
  out.push(L('## 사주', '## SAJU'), '')

  // day master line
  const dm = saju.dayMaster
  const dmEl = dm.element ? ELEM[dm.element] ?? dm.element : ''
  const yinyang = dm.yin_yang === '음' ? L('음', 'yin') : L('양', 'yang')
  out.push(`day_master: ${dm.name}(${yinyang}${dmEl}) | strength: ${strengthLabel}${strengthLevel ? `(${strengthLevel})` : ''}`)
  const fe = saju.fiveElements
  out.push(`elements: 木${fe.wood} 火${fe.fire} 土${fe.earth} 金${fe.metal} 水${fe.water}`)
  out.push('')

  out.push('pillars:')
  const lab: Record<string, string> = { year: 'Y', month: 'M', day: 'D', time: 'H' }
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const st = P[k].heavenlyStem, br = P[k].earthlyBranch
    const stemSib = k === 'day' ? '일간' : gl(st.sibsin, SIBSIN_G, locale)
    out.push(`  ${lab[k]} ${st.name}${br.name} | ${stemSib}/${gl(br.sibsin, SIBSIN_G, locale)}`)
  }
  out.push('')

  out.push('hidden_stems:')
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const jg = P[k].jijanggan
    const stems = [jg?.chogi?.name, jg?.junggi?.name, jg?.jeonggi?.name].filter(Boolean) as string[]
    if (stems.length) out.push(`  ${P[k].earthlyBranch.name}: ${stems.map((s) => `${s}${sibsinOf(day, s)}`).join('·')}`)
  }
  out.push('')

  if (geok) out.push(`geokguk: ${geok}`)
  if (y?.primaryYongsin) {
    const ge = (e?: string) => (e ? (locale === 'ko' && ELEMG[e] ? `${e}(${ELEMG[e]})` : (ELEM[e] ?? e)) : '')
    out.push(`yongsin: ${ge(y.primaryYongsin)}${y.yongsinType ? ` [${y.yongsinType}]` : ''}${y.secondaryYongsin ? ` | 喜:${ge(y.secondaryYongsin)}` : ''}${y.kibsin ? ` | 忌:${ge(y.kibsin)}` : ''}${y.gusin ? ` | 仇:${ge(y.gusin)}` : ''}`)
    if (y.reasoning) out.push(`yongsin_reason: ${y.reasoning}`)
  }
  if (gwansalHonjap) out.push(L('note: 官殺混雜 (정관+편관 동존)', 'note: 官殺混雜 (both 정관+편관 present)'))
  out.push('')

  // branches that join a 합/삼합/육합 → a 공망 there is partly released
  const combinedBranches = new Set<string>()
  for (const r of rel) {
    if (/삼합|육합|방합|합화/.test(r.kind) && r.detail) for (const ch of r.detail.match(/[子丑寅卯辰巳午未申酉戌亥]/g) ?? []) combinedBranches.add(ch)
  }
  const shown = rel.filter((r) => r.kind !== '지지파') // 파 = weakest/contested, drop
  if (shown.length) {
    out.push('internal_combos:')
    const PLAB: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
    // group identical relations (same kind+detail) so a 충/합 hitting two pillar
    // pairs becomes one line with merged tags, not a duplicate.
    const groups = new Map<string, { base: string; tags: string[]; note: string }>()
    for (const r of shown) {
      const base = r.detail && r.detail.includes(r.kind) ? r.detail : `${r.kind}${r.detail ? ` ${r.detail}` : ''}`
      const tag = Array.isArray(r.pillars) && r.pillars.length ? r.pillars.map((p) => PLAB[p] ?? p).join('·') : ''
      let note = ''
      if (r.kind === '공망') {
        const b = r.detail?.match(/[子丑寅卯辰巳午未申酉戌亥]/)?.[0]
        if (b && combinedBranches.has(b)) note = locale === 'ko' ? ' — 합/삼합 동시 참여로 작용 일부 회복' : ' — partly released (joins a 합/삼합)'
      }
      const g = groups.get(base) ?? { base, tags: [], note }
      if (tag) g.tags.push(tag)
      g.note ||= note
      groups.set(base, g)
    }
    for (const g of groups.values()) {
      const pos = g.tags.length ? ` [${g.tags.join(' / ')}]` : ''
      out.push(`  ${g.base}${pos}${g.note}`)
    }
    out.push('')
  }

  if (saju.shinsal?.length) out.push(`sinsal: ${saju.shinsal.join(' · ')}`)
  try {
    const st = getTwelveStagesForPillars(P as never)
    out.push(`12운성: ${(['year', 'month', 'day', 'time'] as const).map((k) => `${P[k].earthlyBranch.name}${gl(st[k], UNSEONG_G, locale)}`).join(' / ')}`)
  } catch { /* */ }
  try {
    const ss = getTwelveShinsalSingleByPillar(P as never)
    out.push(`12신살: ${(['year', 'month', 'day', 'time'] as const).map((k) => `${P[k].earthlyBranch.name}${gl((ss[k] || '-').replace(/살살$/, '살'), SINSAL12_G, locale)}`).join(' / ')}`)
  } catch { /* */ }
  // 길신/주요 신살 — 천을귀인(귀인복), 화개(예술·종교·고독)
  try {
    const PLAB2: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
    const dayBranch = P.day.earthlyBranch.name
    const cheon = CHEONEUL[day] ?? []
    const hwagae = HWAGAE_OF[dayBranch]
    const hits: string[] = []
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      const b = P[k].earthlyBranch.name
      if (cheon.includes(b)) hits.push(`천을귀인(${b})${locale === 'ko' ? '(귀인·도움복)' : ''} [${PLAB2[k]}]`)
    }
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      if (P[k].earthlyBranch.name === hwagae) hits.push(`화개(${hwagae})${locale === 'ko' ? '(예술·종교·고독)' : ''} [${PLAB2[k]}]`)
    }
    if (hits.length) out.push(`주요신살: ${hits.join(' / ')}`)
  } catch { /* */ }

  // current
  const cur = saju.daeWoon?.current
  if (cur || current?.seun || current?.wolun || current?.iljin) {
    out.push('', L('## 사주_현재', '## SAJU_CURRENT'))
    if (cur) out.push(`대운 ${cur.age ?? '?'}: ${cur.heavenlyStem ?? ''}${cur.earthlyBranch ?? ''} | ${cur.sibsin?.cheon ?? ''}/${cur.sibsin?.ji ?? ''}`)
    const periods: Array<[string, { stem: string; branch: string } | null | undefined]> = [['세운', current?.seun], ['월운', current?.wolun], ['일진', current?.iljin]]
    const sibPair = (v: { stem: string; branch: string }) => {
      const s = sibsinOf(day, v.stem), b = sibsinOf(day, BRANCH_MAINQI[v.branch] ?? '')
      const honjap = (s === '정관' || s === '편관') && (b === '정관' || b === '편관') && s !== b
      return `${v.stem}${v.branch}${s || b ? ` (${s || '-'}/${b || '-'}${honjap ? ' = 관살혼잡' : ''})` : ''}`
    }
    const pline = periods.filter(([, v]) => v).map(([k, v]) => `${k}: ${sibPair(v!)}`).join(' / ')
    if (pline) out.push(pline)
    const relsBy = (src: string) => (current?.relations ?? []).filter((r) => r.source === src)
    const fe = saju.fiveElements
    const natalBr: Array<[string, string]> = [['년', P.year.earthlyBranch.name], ['월', P.month.earthlyBranch.name], ['일', P.day.earthlyBranch.name], ['시', P.time.earthlyBranch.name]]
    // 化 미완 note: 천간합의 化 오행이 지지에서 약하면 (count ≤1) 化 미완 표시
    const hwaNote = (detail: string): string => {
      const stems = (detail.match(/[甲乙丙丁戊己庚辛壬癸]/g) ?? []).slice(0, 2)
      if (stems.length < 2) return ''
      const el = STEM_HAP_EL[stems.sort().join('')]
      if (!el) return ''
      const cnt = (fe as Record<string, number>)[EL2KEY[el]] ?? 0
      return cnt <= 1 ? ` (合${el}, 단 지지${el} 약→化 미완 가능)` : ` (合化${el})`
    }
    // 형(刑): engine이 운-본명 형을 안 잡으므로 직접 계산해 보강
    const hyeongOf = (branch?: string): string[] =>
      branch ? natalBr.filter(([, nb]) => hyeongPair(branch, nb)).map(([lab, nb]) => `지지형 운 ${branch} ↔ ${lab} ${nb} (${branch}${nb}刑)`) : []
    const crossLines: string[] = []
    const periodBranch: Record<string, string | undefined> = { 세운: current?.seun?.branch, 월운: current?.wolun?.branch, 일진: current?.iljin?.branch, 대운: cur?.earthlyBranch ?? undefined }
    for (const [k, src] of [['세운', 'seun'], ['월운', 'wolun'], ['일진', 'iljin'], ['대운', 'daeun']] as const) {
      // group same relation hitting two natal pillars (운 丙↔일 辛 + 운 丙↔시 辛)
      // into one (운 丙 ↔ 일·시 辛) — token save, no dup.
      const grp = new Map<string, { line: string; pills: string[] }>()
      const plain: string[] = []
      for (const r of relsBy(src)) {
        const d = (r.relation.detail || '').replace(/ - year/g, ' ↔ 년').replace(/ - month/g, ' ↔ 월').replace(/ - day/g, ' ↔ 일').replace(/ - time/g, ' ↔ 시')
        const note = r.relation.kind === '천간합' ? hwaNote(r.relation.detail || '') : ''
        const m = d.match(/^운 (\S+) ↔ (년|월|일|시) (\S+)$/)
        if (m) {
          const key = `${r.relation.kind}|${m[1]}|${m[3]}|${note}`
          const g = grp.get(key) ?? { line: `${r.relation.kind} 운 ${m[1]} ↔ @ ${m[3]}${note}`, pills: [] }
          g.pills.push(m[2]); grp.set(key, g)
        } else plain.push((d ? `${r.relation.kind} ${d}` : r.relation.kind) + note)
      }
      const parts2: string[] = [...plain, ...[...grp.values()].map((g) => g.line.replace('@', g.pills.join('·')))]
      parts2.push(...hyeongOf(periodBranch[k]))
      if (parts2.length) crossLines.push(`  ${k}: ${parts2.join(' / ')}`)
    }
    if (crossLines.length) { out.push(L('current_cross (운↔본명 합/충/형):', 'current_cross (luck↔natal):')); out.push(...crossLines) }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
