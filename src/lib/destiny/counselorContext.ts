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
const skA = (s: string, l: Locale) => (l === 'ko' ? SIGN_KO_A[s] ?? s : s)
const ASP_FULL: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: '컨정션', en: 'Conjunction' }, opposition: { ko: '어포지션', en: 'Opposition' },
  trine: { ko: '트라인', en: 'Trine' }, square: { ko: '스퀘어', en: 'Square' }, sextile: { ko: '섹스타일', en: 'Sextile' },
}
const MAJOR_TYPES = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile'])
// gloss maps so the saju section is legible (not bare 명리 codes)
const SIBSIN_G: Record<string, string> = {
  비견: '자립·경쟁', 겁재: '경쟁·소비', 식신: '표현·여유', 상관: '재능·표현',
  편재: '유동적 재물·활동', 정재: '안정적 재물·성실', 편관: '압박·도전', 정관: '책임·명예',
  편인: '직관·비주류 학습', 정인: '배움·보호·수용',
}
const UNSEONG_G: Record<string, string> = {
  장생: '시작·성장', 목욕: '미숙·시행착오', 관대: '자리잡는 독립', 건록: '왕성·자립', 임관: '왕성·자립',
  제왕: '기운 절정', 왕지: '기운 절정', 쇠: '절정 지나 안정', 병: '약해짐·예민', 사: '기운 다함',
  묘: '갈무리·내향', 절: '바닥·전환점', 태: '새 기운 잉태', 양: '자라나는 준비',
}
const SINSAL12_G: Record<string, string> = {
  겁살: '빼앗김·돌발', 재살: '송사·구속', 천살: '윗사람·천재', 지살: '이동·터전',
  연살: '매력·이성', 도화: '매력·이성', 월살: '위축', 망신: '구설·노출', 망신살: '구설·노출',
  장성: '리더십·주도', 장성살: '리더십·주도', 반안: '출세·안정', 반안살: '출세·안정',
  역마: '이동·해외', 역마살: '이동·해외', 육해: '질병·방해', 육해살: '질병·방해', 화개: '예술·종교·고독', 화개살: '예술·종교·고독',
}
// English saju term maps (EN locale renders the saju side in English too).
const SIBSIN_EN: Record<string, string> = {
  비견: 'Peer', 겁재: 'Rival', 식신: 'Output', 상관: 'Hurting Officer', 편재: 'Indirect Wealth',
  정재: 'Direct Wealth', 편관: 'Seven Killings', 정관: 'Direct Officer', 편인: 'Indirect Resource', 정인: 'Direct Resource', 일간: 'Self',
}
const ELEM_EN: Record<string, string> = { 목: 'Wood', 화: 'Fire', 토: 'Earth', 금: 'Metal', 수: 'Water' }
const UNSEONG_EN: Record<string, string> = {
  장생: 'Growth', 목욕: 'Bath', 관대: 'Maturity', 건록: 'Prime', 임관: 'Prime', 제왕: 'Peak', 왕지: 'Peak',
  쇠: 'Decline', 병: 'Weakening', 사: 'Dormant', 묘: 'Storage', 절: 'Severance', 태: 'Conception', 양: 'Nurture',
}
const SINSAL12_EN: Record<string, string> = {
  지살: 'Travel', 망신: 'Exposure', 장성: 'Commander', 반안: 'Advancement', 역마: 'Horse(move)', 화개: 'Flower Canopy',
  겁살: 'Robbery', 재살: 'Prison', 천살: 'Heaven', 월살: 'Moon', 연살: 'Peach', 육해: 'Harm', 도화: 'Peach',
}
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
const rk = (k: string, locale: Locale) => (locale === 'en' ? RELKIND_EN[k] ?? k : k)
const sibEN = (s?: string) => (s ? SIBSIN_EN[s] ?? s : '-')
// translate a Korean relation/element detail string to English (keeps Hanja).
function enDetail(s: string): string {
  return s
    .replace(/지지삼합/g, 'Branch trine').replace(/지지방합/g, 'Branch dir.combine').replace(/지지육합/g, 'Branch union')
    .replace(/지지충/g, 'Branch clash').replace(/지지형/g, 'Branch punishment').replace(/지지파/g, 'Branch break').replace(/지지해/g, 'Branch harm')
    .replace(/천간합/g, 'Stem combine').replace(/천간충/g, 'Stem clash')
    .replace(/삼합/g, 'trine').replace(/방합/g, 'directional combine').replace(/육합/g, 'union')
    .replace(/합화/g, 'combine→').replace(/합/g, 'combine').replace(/충/g, 'clash').replace(/형/g, 'punishment')
    .replace(/파/g, 'break').replace(/해/g, 'harm').replace(/원진/g, 'resentment').replace(/공망/g, 'Void')
    .replace(/완성/g, '(complete)').replace(/부분/g, '(partial)').replace(/운\s/g, 'luck ').replace(/운$/g, 'luck')
    .replace(/목/g, 'Wood').replace(/화/g, 'Fire').replace(/토/g, 'Earth').replace(/금/g, 'Metal').replace(/수/g, 'Water')
    .replace(/ ↔ 년/g, ' ↔ Y').replace(/ ↔ 월/g, ' ↔ M').replace(/ ↔ 일/g, ' ↔ D').replace(/ ↔ 시/g, ' ↔ H')
}
const gl = (term: string | undefined, koGloss: Record<string, string>, enMap: Record<string, string>, locale: Locale): string => {
  if (!term || term === '-') return term ?? '-'
  if (locale === 'en') return enMap[term] ?? term
  if (term === '일간') return term
  return koGloss[term] ? `${term}(${koGloss[term]})` : term
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

// compress the engine's 용신 reasoning free-text: drop filler, collapse the
// "한습하여 화(火)가 조후용신" climate phrasing to "한습 → 火 필요", strip the
// (식상)/(인성)/(병)/(약) parentheticals and the hangul-before-hanja dup.
function compressReason(s: string): string {
  return s
    .replace(/월 출생으로 /g, '월 ')
    .replace(/(한습|조열|온화)하여 /g, '$1 → ')
    .replace(/충돌하여 /g, '충돌 → ')
    .replace(/과다\(병\)하여 /g, '과다 → ')
    .replace(/([가-힣])\(([一-鿿])\)가 \S*?용신/g, '$2 필요')
    .replace(/([가-힣])\(([一-鿿])\)으?로/g, '$2로')
    .replace(/\(식상\)|\(인성\)|\(약\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// EN 용신 근거 — 엔진의 한국어 자유서술을 번역하는 대신 구조화 필드로 생성
// (yongsinType + 오행 + 강약). KO는 compressReason로 원문 압축.
function reasonEn(
  y: { yongsinType?: string; primaryYongsin?: string; kibsin?: string; daymasterStrength?: string },
  monthBranch: string,
): string {
  const el = (e?: string) => (e ? ELEM_EN[e] ?? e : '')
  const p = el(y.primaryYongsin)
  switch (y.yongsinType) {
    case '조후용신': {
      const warm = y.primaryYongsin === '화' || y.primaryYongsin === '목'
      return `${monthBranch} month ${warm ? 'cold/damp' : 'hot/dry'} → ${p} needed`
    }
    case '병약용신':
      return `${el(y.kibsin)} excess → balance with ${p}`
    case '통관용신':
      return `clashing elements → ${p} mediates`
    case '억부용신':
      return /약/.test(y.daymasterStrength ?? '') ? `self weak → reinforce with ${p}` : `self strong → drain with ${p}`
    default:
      return `${p} is the key element`
  }
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
      '- legend: [detriment]=weak, [domicile]=strong, [no tag]=neutral / (tr)=current transit / orb 0-2°=strong, 3-4°=mid, 5-6°=weak / ↗=building, ↘=fading',
      '- weave saju and astrology into one flow, but never mix the two systems’ terms in a single sentence.',
      '- do not output Hanja, technical terms, house numbers, or degree figures. Translate to plain language only.',
      '- [Minor points] are supplementary only.',
      '- tone: warm mentor + firm conclusions. Speak gently but never hedge ("maybe", "in some cases").',
      '- weigh good/bad by the chart, not by politeness.',
      '- for life/death, medical, legal, or major decisions: point to the chart signal but make clear the decision is theirs.',
      '- greetings/small talk: reply briefly then ask what they want to know. Do not dump unsolicited analysis.',
    ].join('\n')
  }
  return [
    '## 읽기 규칙',
    '- 약자: [불리]=detriment(약), [강함]=domicile(강), [무표기]=중립 / (트)=현재 트랜짓 / 오차 0-2°=강, 3-4°=중, 5-6°=약 / ↗=강해지는 중, ↘=약해지는 중',
    '- 사주·점성을 자연스럽게 엮어 한 흐름으로 답한다. 단, 두 체계의 용어를 한 문장 안에 직접 섞지 않는다.',
    '- 한자·명리용어(정인/편재 등)·하우스 번호·각도 수치는 출력 금지. 의미만 일상어로 푼다.',
    '- [보조점]은 보조 신호로만.',
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
    if (locale === 'en') astro = astro.replace(/^== 점성 ==/m, '== Astro ==')
    // enrich: A/S markers on natal aspects + minor points (from raw chart)
    try {
      const chart = toChart(natal)
      const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
      const asps = findNatalAspects(chart)
        .filter((a) => MAJOR_TYPES.has(a.type) && a.orb <= 6)
        .sort((a, b) => a.orb - b.orb).slice(0, 12)
      if (asps.length) {
        const head = L(`[본명 각 · 오차≤6° · ↗적용/↘분리]`, `[Natal aspects · orb<=6° · ↗applying/↘separating]`)
        const lines = asps.map((a) => `${pkA(a.from.name, locale)} ${aspG(a.type, locale)} ${pkA(a.to.name, locale)} (${locale === 'en' ? 'orb ' : ''}${a.orb.toFixed(1)}°)${a.applying ? ' ↗' : ' ↘'}`)
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
          const mb = L('[보조점]', '[Minor points]') + '\n' + ml.join('\n') + '\n\n'
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
        `[프로펙션 ${kAge}세]\n활성 하우스: ${prof.activatedHouse}하우스 (${HOUSE_THEME_KO[prof.activatedHouse]})\n올해의 지배성: ${lordKo}${lordResKo}`,
        `[Profection age ${kAge}]\nactivated house: ${prof.activatedHouse} (${HOUSE_THEME_EN[prof.activatedHouse]})\nLord of the Year: ${prof.lordOfYear}${lordResEn}`,
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
  const strLab = locale === 'en' ? (STRENGTH_EN[strengthLabel] ?? strengthLabel) : strengthLabel
  const strLv = strengthLevel ? `(${locale === 'en' ? (STRENGTH_EN[strengthLevel] ?? strengthLevel) : strengthLevel})` : ''
  out.push(L(`일간: ${dm.name}(${yinyang}${dmEl}) | ${strLab}${strLv}`, `day_master: ${dm.name}(${yinyang}${dmEl}) | ${strLab}${strLv}`))
  const fe = saju.fiveElements
  out.push(`${L('오행', 'elements')}: 木${fe.wood} 火${fe.fire} 土${fe.earth} 金${fe.metal} 水${fe.water}`)
  out.push('')

  out.push(L('기둥:', 'pillars:'))
  const lab: Record<string, string> = locale === 'en' ? { year: 'Y', month: 'M', day: 'D', time: 'H' } : { year: '년', month: '월', day: '일', time: '시' }
  // KO glosses each 십성 only on first appearance across the pillars block
  // (재등장은 의미 풀이 생략). EN always shows the term (it is the value).
  const seenSib = new Set<string>()
  const glOnce = (term?: string): string => {
    if (!term || term === '-') return term ?? '-'
    if (locale === 'en') return SIBSIN_EN[term] ?? term
    if (term === '일간' || !SIBSIN_G[term] || seenSib.has(term)) return term
    seenSib.add(term)
    return `${term}(${SIBSIN_G[term]})`
  }
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const st = P[k].heavenlyStem, br = P[k].earthlyBranch
    const stemSib = k === 'day' ? (locale === 'en' ? 'Self' : '일간') : glOnce(st.sibsin)
    out.push(`  ${lab[k]} ${st.name}${br.name} | ${stemSib}/${glOnce(br.sibsin)}`)
  }
  out.push('')

  out.push(L('지장간:', 'hidden_stems:'))
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const jg = P[k].jijanggan
    const stems = [jg?.chogi?.name, jg?.junggi?.name, jg?.jeonggi?.name].filter(Boolean) as string[]
    if (stems.length) out.push(`  ${P[k].earthlyBranch.name}: ${stems.map((s) => `${s}${locale === 'en' ? `(${sibEN(sibsinOf(day, s))})` : sibsinOf(day, s)}`).join('·')}`)
  }
  out.push('')

  if (geok) {
    const geokEn = `${SIBSIN_EN[geok.replace(/격$/, '')] ?? geok.replace(/격$/, '')} structure`
    out.push(`${L('격국', 'geokguk')}: ${locale === 'en' ? geokEn : geok}`)
  }
  if (y?.primaryYongsin) {
    const ge = (e?: string) => (e ? (locale === 'en' ? (ELEM_EN[e] ?? e) : e) : '')
    const yt = y.yongsinType ? ` [${locale === 'en' ? (YTYPE_EN[y.yongsinType] ?? y.yongsinType) : y.yongsinType}]` : ''
    // 구신(仇)은 "기신을 돕는 오행"이라 기신이 표시될 때만 함께 보여준다
    // (조후/병약 등에서 기신이 용신과 같아 필터되면 仇만 외톨이로 남던 문제).
    out.push(`${L('용신', 'yongsin')}: ${ge(y.primaryYongsin)}${yt}${y.secondaryYongsin ? ` | ${L('喜', 'fav')}:${ge(y.secondaryYongsin)}` : ''}${y.kibsin ? ` | ${L('忌', 'foe')}:${ge(y.kibsin)}` : ''}${y.kibsin && y.gusin ? ` | ${L('仇', 'rival')}:${ge(y.gusin)}` : ''}`)
    if (y.reasoning) out.push(locale === 'ko' ? `용신근거: ${compressReason(y.reasoning)}` : `yongsin_reason: ${reasonEn(y, P.month.earthlyBranch.name)}`)
  }
  if (gwansalHonjap) out.push(L('참고: 官殺混雜 (정관+편관 동존)', 'note: Officer-Killings Mix (Direct Officer + Seven Killings)'))
  out.push('')

  // branches that join a 합/삼합/육합 → a 공망 there is partly released
  const combinedBranches = new Set<string>()
  for (const r of rel) {
    if (/삼합|육합|방합|합화/.test(r.kind) && r.detail) for (const ch of r.detail.match(/[子丑寅卯辰巳午未申酉戌亥]/g) ?? []) combinedBranches.add(ch)
  }
  const shown = rel.filter((r) => r.kind !== '지지파') // 파 = weakest/contested, drop
  if (shown.length) {
    out.push(L('합충형:', 'internal_combos:'))
    const PLAB: Record<string, string> = locale === 'en' ? { year: 'Y', month: 'M', day: 'D', time: 'H' } : { year: '년', month: '월', day: '일', time: '시' }
    // group identical relations (same kind+detail) so a 충/합 hitting two pillar
    // pairs becomes one line with merged tags, not a duplicate.
    const groups = new Map<string, { base: string; tags: string[]; note: string; clash: boolean }>()
    for (const r of shown) {
      let base = r.detail && r.detail.includes(r.kind) ? r.detail : `${r.kind}${r.detail ? ` ${r.detail}` : ''}`
      // drop the redundant relation word the engine repeats in the detail:
      // "지지삼합 …·… 삼합(목)" → "지지삼합 …·… → 목", "지지육합 …-… 육합" → "…"
      base = base
        .replace(/(?:삼합|육합|방합)\(([목화토금수])\)/, '→ $1')
        .replace(/합화([목화토금수])/, '→ $1')
        .replace(/\s+(?:삼합|육합|방합|충|형|파|해|원진)\s*$/, '')
      if (locale === 'en') base = enDetail(base)
      const clash = /충|형|파|해|원진/.test(r.kind)
      const tag = Array.isArray(r.pillars) && r.pillars.length ? r.pillars.map((p) => PLAB[p] ?? p).join(clash ? '↔' : '·') : ''
      let note = ''
      if (r.kind === '공망') {
        const b = r.detail?.match(/[子丑寅卯辰巳午未申酉戌亥]/)?.[0]
        if (b && combinedBranches.has(b)) note = locale === 'ko' ? ' — 합/삼합 동시 참여로 작용 일부 회복' : ' — partly restored (joins union/trine)'
      }
      const g = groups.get(base) ?? { base, tags: [], note, clash }
      if (tag) g.tags.push(tag)
      g.note ||= note
      groups.set(base, g)
    }
    for (const g of groups.values()) {
      const pos = g.tags.length ? ` [${g.tags.join(g.clash ? ', ' : ' / ')}]` : ''
      out.push(`  ${g.base}${pos}${g.note}`)
    }
    out.push('')
  }

  if (saju.shinsal?.length) out.push(`${L('신살', 'sinsal')}: ${saju.shinsal.join(' · ')}`)
  try {
    const st = getTwelveStagesForPillars(P as never)
    out.push(`${locale === 'en' ? '12-stages' : '12운성'}: ${(['year', 'month', 'day', 'time'] as const).map((k) => `${P[k].earthlyBranch.name}${gl(st[k], UNSEONG_G, UNSEONG_EN, locale)}`).join(' / ')}`)
  } catch { /* */ }
  try {
    const ss = getTwelveShinsalSingleByPillar(P as never)
    out.push(`${locale === 'en' ? '12-sinsal' : '12신살'}: ${(['year', 'month', 'day', 'time'] as const).map((k) => {
      const raw = (ss[k] || '-').replace(/살살$/, '살')
      const bare = raw.replace(/살$/, '')
      const term = locale === 'en' ? (SINSAL12_EN[raw] ?? SINSAL12_EN[bare] ?? raw)
        : (SINSAL12_G[raw] ? `${raw}(${SINSAL12_G[raw]})` : raw)
      return `${P[k].earthlyBranch.name}${term}`
    }).join(' / ')}`)
  } catch { /* */ }
  // 길신 — 천을귀인만 (화개는 12신살에 이미 나오므로 중복 제거). gloss 생략.
  try {
    const PLAB2: Record<string, string> = locale === 'en' ? { year: 'Y', month: 'M', day: 'D', time: 'H' } : { year: '년', month: '월', day: '일', time: '시' }
    const cheon = CHEONEUL[day] ?? []
    const cheonLab = locale === 'en' ? GILSIN_EN['천을귀인'] : '천을귀인'
    const hits: string[] = []
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      const b = P[k].earthlyBranch.name
      if (cheon.includes(b)) hits.push(`${cheonLab}(${b}) [${PLAB2[k]}]`)
    }
    if (hits.length) out.push(`${locale === 'en' ? 'key-sinsal' : '주요신살'}: ${hits.join(' / ')}`)
  } catch { /* */ }

  // current
  const cur = saju.daeWoon?.current
  if (cur || current?.seun || current?.wolun || current?.iljin) {
    out.push('', L('## 사주_현재', '## SAJU_CURRENT'))
    const PLBL = (k: string) => (locale === 'en' ? PERIOD_EN[k] ?? k : k)
    const sib1 = (s: string) => (locale === 'en' ? sibEN(s) : (s || '-'))
    if (cur) out.push(`${PLBL('대운')} ${cur.age ?? '?'}: ${cur.heavenlyStem ?? ''}${cur.earthlyBranch ?? ''} | ${sib1(cur.sibsin?.cheon ?? '')}/${sib1(cur.sibsin?.ji ?? '')}`)
    const periods: Array<[string, { stem: string; branch: string } | null | undefined]> = [['세운', current?.seun], ['월운', current?.wolun], ['일진', current?.iljin]]
    const sibPair = (v: { stem: string; branch: string }) => {
      const s = sibsinOf(day, v.stem), b = sibsinOf(day, BRANCH_MAINQI[v.branch] ?? '')
      const honjap = (s === '정관' || s === '편관') && (b === '정관' || b === '편관') && s !== b
      const hj = honjap ? (locale === 'en' ? '=Officer-Killings Mix' : '=관살혼잡') : ''
      return `${v.stem}${v.branch}${s || b ? ` (${sib1(s)}/${sib1(b)}${hj})` : ''}`
    }
    // 세운은 십성·관살혼잡 유지(가장 중요), 월운/일진은 간지만 (시벤 생략)
    const pline = periods.filter(([, v]) => v).map(([k, v]) =>
      k === '세운' ? `${PLBL(k)} ${sibPair(v!)}` : `${PLBL(k)} ${v!.stem}${v!.branch}`
    ).join(' / ')
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
      const elT = locale === 'en' ? (ELEM_EN[el] ?? el) : el
      if (cnt <= 1) return locale === 'en' ? ` (combine→${elT}, weak ${elT} branches → transformation may not complete)` : ` (합${el}, 단 지지${el}약→化미완 가능)`
      return locale === 'en' ? ` (combine→${elT})` : ` (합화${el})`
    }
    const sp = locale === 'en' ? ' ' : '' // KO attaches 세운丙/일未 without space
    const arrow = (s: string) => locale === 'en'
      ? s.replace(/ - year/g, ' ↔ Y').replace(/ - month/g, ' ↔ M').replace(/ - day/g, ' ↔ D').replace(/ - time/g, ' ↔ H').replace(/^운 /, 'luck ')
      : s.replace(/ - year/g, ' ↔ 년').replace(/ - month/g, ' ↔ 월').replace(/ - day/g, ' ↔ 일').replace(/ - time/g, ' ↔ 시')
    const PMAP: Record<string, string> = locale === 'en' ? { 년: 'Y', 월: 'M', 일: 'D', 시: 'H' } : { 년: '년', 월: '월', 일: '일', 시: '시' }
    // 형(刑): engine이 운-본명 형을 안 잡으므로 직접 계산해 보강. pfx = 세운/월운/일진/대운
    const hyeongTag = (a: string, b: string) => (locale === 'en' ? `(${a}${b}刑 / ${BRANCH_PY[a] ?? a}-${BRANCH_PY[b] ?? b} Punishment)` : `(${a}${b}刑)`)
    const hyeongOf = (branch: string | undefined, pfx: string): string[] =>
      branch ? natalBr.filter(([, nb]) => hyeongPair(branch, nb)).map(([lab, nb]) => `${rk('지지형', locale)} ${pfx}${sp}${branch} ↔ ${(locale === 'en' ? (PMAP[lab] ?? lab) : lab)}${sp}${nb} ${hyeongTag(branch, nb)}`) : []
    const crossLines: string[] = []
    const periodBranch: Record<string, string | undefined> = { 세운: current?.seun?.branch, 월운: current?.wolun?.branch, 일진: current?.iljin?.branch, 대운: cur?.earthlyBranch ?? undefined }
    for (const [k, src] of [['세운', 'seun'], ['월운', 'wolun'], ['일진', 'iljin'], ['대운', 'daeun']] as const) {
      const pfx = PLBL(k) // 운 → 구체 시기명 (세운/월운/일진/대운)
      // group same relation hitting two natal pillars → one line (token save)
      const grp = new Map<string, { line: string; pills: string[] }>()
      const plain: string[] = []
      for (const r of relsBy(src)) {
        const d = arrow(r.relation.detail || '')
        const note = r.relation.kind === '천간합' ? hwaNote(r.relation.detail || '') : ''
        const m = d.match(/^(?:운|luck) (\S+) ↔ (Y|M|D|H|년|월|일|시) (\S+)$/)
        if (m) {
          const key = `${r.relation.kind}|${m[1]}|${m[3]}|${note}`
          const g = grp.get(key) ?? { line: `${rk(r.relation.kind, locale)} ${pfx}${sp}${m[1]} ↔ @${sp}${m[3]}${note}`, pills: [] }
          g.pills.push(m[2]); grp.set(key, g)
        } else plain.push((d ? `${rk(r.relation.kind, locale)} ${d.replace(/^(?:운|luck) /, pfx + sp)}` : rk(r.relation.kind, locale)) + note)
      }
      const parts2: string[] = [...plain, ...[...grp.values()].map((g) => g.line.replace('@', g.pills.join('·')))]
      parts2.push(...hyeongOf(periodBranch[k], pfx))
      if (parts2.length) crossLines.push(`  ${PLBL(k)}: ${parts2.join(' / ')}`)
    }
    if (crossLines.length) { out.push('', L('현재교차 (운↔본명 합/충/형):', 'current_cross (luck↔natal):')); out.push(...crossLines) }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
