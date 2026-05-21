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
import { formatAstroSelf } from '@/lib/destiny/astroSelfFormatter'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'

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
      '- saju and astrology are separate systems: read each section on its own; integrate only as shared themes at the end.',
      "- never mix vocabulary across systems (e.g. \"yongsin activates Mars\" is wrong).",
      '- orb weight: 0-2°=strong / 3-4°=mid / 5-6°=weak. On natal aspects ↗=applying (building), ↘=separating (fading).',
      '- dignity = how well the planet functions in that sign. [Minor points] are supplementary only.',
      '- tone: direct. No hedging ("maybe", "in some cases"). State evidence, then conclusion.',
      '- weigh good/bad by the chart, not by politeness.',
    ].join('\n')
  }
  return [
    '## 읽기 규칙',
    '- 사주와 점성은 별개 체계: 각 섹션을 따로 읽고, 공통 테마만 마지막에 통합한다.',
    '- 두 체계 용어를 섞지 말 것 (예: "용신이 화성을 활성화" ✗).',
    '- orb 가중치: 0-2°=강 / 3-4°=중 / 5-6°=약. 본명 각의 ↗=강해지는 중(applying), ↘=약해지는 중(separating).',
    '- 디그니티 = 행성이 그 사인에서 얼마나 잘 작동하는지. [보조점]은 보조 신호로만.',
    '- 톤: 단정적으로. "아마/경우에 따라" 같은 회피 표현 금지. 근거를 먼저 대고 결론을 말한다.',
    '- 좋고 나쁨은 예의가 아니라 차트 근거대로 균형 있게 짚는다.',
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

  if (rel.length) {
    out.push('internal_combos:')
    const PLAB: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
    for (const r of rel) {
      const base = r.detail && r.detail.includes(r.kind) ? r.detail : `${r.kind}${r.detail ? ` ${r.detail}` : ''}`
      const pos = Array.isArray(r.pillars) && r.pillars.length ? ` [${r.pillars.map((p) => PLAB[p] ?? p).join('·')}]` : ''
      out.push(`  ${base}${pos}`)
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

  // current
  const cur = saju.daeWoon?.current
  if (cur || current?.seun || current?.wolun || current?.iljin) {
    out.push('', L('## 사주_현재', '## SAJU_CURRENT'))
    if (cur) out.push(`대운 ${cur.age ?? '?'}: ${cur.heavenlyStem ?? ''}${cur.earthlyBranch ?? ''} | ${cur.sibsin?.cheon ?? ''}/${cur.sibsin?.ji ?? ''}`)
    const periods: Array<[string, { stem: string; branch: string } | null | undefined]> = [['세운', current?.seun], ['월운', current?.wolun], ['일진', current?.iljin]]
    const pline = periods.filter(([, v]) => v).map(([k, v]) => `${k}: ${v!.stem}${v!.branch}`).join(' / ')
    if (pline) out.push(pline)
    const relsBy = (src: string) => (current?.relations ?? []).filter((r) => r.source === src)
    const crossLines: string[] = []
    for (const [k, src] of [['세운', 'seun'], ['월운', 'wolun'], ['일진', 'iljin'], ['대운', 'daeun']] as const) {
      const rs = relsBy(src)
      if (rs.length) crossLines.push(`  ${k}: ${rs.map((r) => (r.relation.detail || r.relation.kind).replace(/ - year/g, ' ↔ 년').replace(/ - month/g, ' ↔ 월').replace(/ - day/g, ' ↔ 일').replace(/ - time/g, ' ↔ 시')).join(' / ')}`)
    }
    if (crossLines.length) { out.push(L('current_cross (운↔본명 합/충):', 'current_cross (luck↔natal):')); out.push(...crossLines) }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
