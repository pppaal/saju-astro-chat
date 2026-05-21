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
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { formatAstroSelf } from '@/lib/destiny/astroSelfFormatter'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'

export type Locale = 'ko' | 'en'

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

function buildInstructions(locale: Locale): string {
  if (locale === 'en') {
    return [
      '## READING RULES',
      '- saju and astrology are separate systems: read each section on its own; integrate only as shared themes at the end.',
      "- never mix vocabulary across systems (e.g. \"yongsin activates Mars\" is wrong).",
      '- orb weight: 0-2°=strong / 3-4°=mid / 5-6°=weak.',
      '- dignity = how well the planet functions in that sign.',
      '- a value marked inferred may be overridden if other evidence conflicts.',
    ].join('\n')
  }
  return [
    '## 읽기 규칙',
    '- 사주와 점성은 별개 체계: 각 섹션을 따로 읽고, 공통 테마만 마지막에 통합한다.',
    '- 두 체계 용어를 섞지 말 것 (예: "용신이 화성을 활성화" ✗).',
    '- orb 가중치: 0-2°=강 / 3-4°=중 / 5-6°=약.',
    '- 디그니티 = 행성이 그 사인에서 얼마나 잘 작동하는지.',
    '- inferred로 표시된 값은 다른 근거와 충돌하면 재판단 가능.',
  ].join('\n')
}

/** Full counselor context: SAJU (raw) + ASTRO/CURRENT (raw→refined) + rules. */
export async function buildDestinyContext(birth: DestinyBirth, now: Date, locale: Locale = 'ko'): Promise<string> {
  const saju = buildSajuSection(birth, locale)
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
  } catch { /* astro optional */ }
  return [saju, astro, buildInstructions(locale)].filter(Boolean).join('\n\n').trim() + '\n'
}

export function buildSajuSection(birth: DestinyBirth, locale: Locale = 'ko'): string {
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
    const stemSib = k === 'day' ? '일간' : (st.sibsin ?? '-') // day stem = the reference itself
    out.push(`  ${lab[k]} ${st.name}${br.name} | ${stemSib}/${br.sibsin ?? '-'}`)
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
    out.push(`yongsin: ${ELEM[y.primaryYongsin] ?? y.primaryYongsin}(${y.yongsinType ?? ''})${y.secondaryYongsin ? ` | 喜:${ELEM[y.secondaryYongsin] ?? y.secondaryYongsin}` : ''}${y.kibsin ? ` | 忌:${ELEM[y.kibsin] ?? y.kibsin}` : ''}${y.gusin ? ` | 仇:${ELEM[y.gusin] ?? y.gusin}` : ''}`)
    if (y.reasoning) out.push(`yongsin_reason: ${y.reasoning}`)
  }
  if (gwansalHonjap) out.push(L('note: 官殺混雜 (정관+편관 동존)', 'note: 官殺混雜 (both 정관+편관 present)'))
  out.push('')

  if (rel.length) {
    out.push('internal_combos:')
    for (const r of rel) {
      const line = r.detail && r.detail.includes(r.kind) ? r.detail : `${r.kind}${r.detail ? ` ${r.detail}` : ''}`
      out.push(`  ${line}`)
    }
    out.push('')
  }

  if (saju.shinsal?.length) out.push(`sinsal: ${saju.shinsal.join(' · ')}`)

  // current
  const cur = saju.daeWoon?.current
  if (cur) {
    out.push('', L('## 사주_현재', '## SAJU_CURRENT'))
    out.push(`대운 ${cur.age ?? '?'}: ${cur.heavenlyStem ?? ''}${cur.earthlyBranch ?? ''} | ${cur.sibsin?.cheon ?? ''}/${cur.sibsin?.ji ?? ''}`)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
