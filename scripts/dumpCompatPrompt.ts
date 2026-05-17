/**
 * Dump the actual prompt that the compat counselor route sends to Claude,
 * for the user-specified couple. Mirrors the build pipeline in
 *   src/app/api/compatibility/counselor/route.ts
 * but prints every block instead of streaming to the LLM.
 *
 * Run: npx tsx scripts/dumpCompatPrompt.ts
 */

import {
  clampMessages,
  stringifyForPrompt,
  prunePromptContext,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  mergeSajuContext,
  mergeAstroContext,
  buildSajuProfile,
  buildAstroProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
  formatFusionForPrompt,
  formatExtendedSajuForPrompt,
  formatExtendedAstroForPrompt,
  formatTimingForPrompt,
  scoreLabel,
} from '../src/app/api/compatibility/counselor/routeSupport'
import {
  calculateFusionCompatibility,
  type FusionCompatibilityResult,
} from '../src/lib/compatibility/compatibilityFusion'
import { performExtendedSajuAnalysis } from '../src/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '../src/lib/compatibility/astrology/comprehensive'
import { buildEvidenceGroundingGuide } from '../src/lib/prompts/fortuneWithIcp'
// routeSupportCommon은 PR #231에서 dead로 제거됨. production route는 inline
// relationLabel을 갖고 있으니 dump script도 동일하게 inline로 미러.
function relationLabel(locale: 'ko' | 'en', relation?: string, note?: string): string {
  const isKo = locale === 'ko'
  if (relation === 'lover') return isKo ? '연인' : 'lover'
  if (relation === 'spouse') return isKo ? '배우자' : 'spouse'
  if (relation === 'family') return isKo ? '가족' : 'family'
  if (relation === 'sibling') return isKo ? '형제자매' : 'sibling'
  if (relation === 'friend') return isKo ? '친구' : 'friend'
  if (relation === 'colleague') return isKo ? '동료' : 'colleague'
  if (relation === 'other') return note?.trim() || (isKo ? '기타' : 'other')
  return isKo ? '관계' : 'related'
}
import type { Relation } from '../src/app/api/compatibility/types'
import {
  formatSajuAsTable,
  formatAstroAsTable,
  formatSajuExtras,
} from '../src/lib/compatibility/sajuTableFormatter'

const lang: 'ko' | 'en' = 'ko'
const normalizedLang: 'ko' | 'en' = lang

const persons = [
  {
    name: '남',
    date: '1995-02-09',
    time: '06:40',
    gender: 'M',
    city: 'Seoul, KR',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    name: '여',
    date: '1991-02-03',
    time: '00:35',
    gender: 'F',
    city: 'Seoul, KR',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
    relation: 'lover' as const,
    relationNote: '',
  },
]

const userQuestion = '우리 둘 궁합 어때?'
const messages = [{ role: 'user' as const, content: userQuestion }]

async function main() {
  // 1) Seeds + auto-built contexts (route.ts:220-230)
  const seed1 = buildPersonSeed(persons[0] as unknown as Record<string, unknown>)
  const seed2 = buildPersonSeed(persons[1] as unknown as Record<string, unknown>)
  const now = new Date()
  const autoSaju1 = await buildAutoSajuContext(seed1, now)
  const autoSaju2 = await buildAutoSajuContext(seed2, now)
  const autoAstro1 = await buildAutoAstroContext(seed1, now)
  const autoAstro2 = await buildAutoAstroContext(seed2, now)
  const eff1Saju = mergeSajuContext(null, autoSaju1)
  const eff2Saju = mergeSajuContext(null, autoSaju2)
  const eff1Astro = mergeAstroContext(null, autoAstro1)
  const eff2Astro = mergeAstroContext(null, autoAstro2)

  const p1Age = getAgeFromBirthDate(persons[0].date)
  const p2Age = getAgeFromBirthDate(persons[1].date)
  const currentYear = now.getFullYear()
  const timingDetails = {
    person1: extractTimingDetails(eff1Saju, p1Age, now),
    person2: extractTimingDetails(eff2Saju, p2Age, now),
  }

  // 2) Profiles + fusion + extended (route.ts:264-290)
  const p1Saju = buildSajuProfile(eff1Saju)
  const p2Saju = buildSajuProfile(eff2Saju)
  const p1Astro = buildAstroProfile(eff1Astro)
  const p2Astro = buildAstroProfile(eff2Astro)
  const p1ExtAstro = buildExtendedAstroProfile(eff1Astro)
  const p2ExtAstro = buildExtendedAstroProfile(eff2Astro)

  let fusionResult: FusionCompatibilityResult | null = null
  let fusionContext = ''
  let extSaju: ReturnType<typeof performExtendedSajuAnalysis> | null = null
  let extAstro: ReturnType<typeof performExtendedAstrologyAnalysis> | null = null
  try {
    if (p1Saju && p2Saju && p1Astro && p2Astro) {
      fusionResult = calculateFusionCompatibility(p1Saju, p1Astro, p2Saju, p2Astro)
      fusionContext = formatFusionForPrompt(fusionResult, lang)
      extSaju = performExtendedSajuAnalysis(p1Saju, p2Saju, p1Age, p2Age, currentYear)
    }
    if (p1ExtAstro && p2ExtAstro) {
      extAstro = performExtendedAstrologyAnalysis(p1ExtAstro, p2ExtAstro, Math.abs(p1Age - p2Age))
    }
  } catch (e) {
    console.error('[fusion error]', e)
  }

  // 3) Couple matrix (route.ts:373+)
  let coupleMatrixContext = ''
  try {
    const [
      { buildCoupleMatrix },
      { calculateSajuData },
      { calculateNatalChart },
      { buildOrthodoxInterpretation },
    ] = await Promise.all([
      import('../src/lib/compatibility/coupleMatrix'),
      import('../src/lib/saju/saju'),
      import('../src/lib/astrology/foundation/astrologyService'),
      import('../src/lib/saju/orthodoxInterpretation'),
    ])
    const buildPerson = async (p: typeof persons[number]) => {
      const tz = p.timeZone || 'Asia/Seoul'
      const gender = p.gender === 'F' ? 'female' : 'male'
      const koreanAge = new Date().getFullYear() - parseInt(p.date.split('-')[0], 10) + 1
      type SajuShape = ReturnType<typeof calculateSajuData> & { orthodoxInterpretation?: unknown }
      const saju: SajuShape = calculateSajuData(p.date, p.time, gender, 'solar', tz) as SajuShape
      saju.orthodoxInterpretation = buildOrthodoxInterpretation(saju, { koreanAge })
      const [Y, M, D] = p.date.split('-').map(Number)
      const [h, mi] = p.time.split(':').map(Number)
      const fresh = await calculateNatalChart({
        year: Y, month: M, date: D, hour: h, minute: mi,
        latitude: p.latitude, longitude: p.longitude, timeZone: tz,
      })
      return { saju, natal: { planets: fresh.planets, ascendant: fresh.ascendant }, koreanAge }
    }
    const [A, B] = await Promise.all([buildPerson(persons[0]), buildPerson(persons[1])])
    const matrix = buildCoupleMatrix(
      { saju: A.saju, natal: A.natal as unknown as Parameters<typeof buildCoupleMatrix>[0]['natal'], koreanAge: A.koreanAge },
      { saju: B.saju, natal: B.natal as unknown as Parameters<typeof buildCoupleMatrix>[0]['natal'], koreanAge: B.koreanAge },
    )
    const s = matrix.summary
    const top = s.topPositiveCells.slice(0, 5).map((c) => `+ ${c.description} [${c.sajuBasis} × ${c.astroBasis}]`).join('\n')
    const bot = s.topCautionCells.slice(0, 5).map((c) => `- ${c.description} [${c.sajuBasis} × ${c.astroBasis}]`).join('\n')
    const layerLabels: Record<number, string> = {
      1: 'L1 오행', 2: 'L2 십성-행성', 3: 'L3 천간합', 4: 'L4 지지합충',
      5: 'L5 어스펙트', 6: 'L6 대운동조', 7: 'L7 대운-네이탈', 8: 'L8 신살-행성', 9: 'L9 격국',
    }
    const layerEntries = Object.entries(matrix.layers) as Array<[string, typeof matrix.layers.L1_element]>
    const perLayer = layerEntries.map(([, cells]) => {
      if (!cells || cells.length === 0) return null
      const pick = [...cells].sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0]
      if (!pick) return null
      const mark = pick.polarity === 'positive' ? '+' : pick.polarity === 'negative' ? '-' : '·'
      const tag = layerLabels[pick.layer] || `L${pick.layer}`
      return `${mark} [${tag}] ${pick.description} [${pick.sajuBasis} × ${pick.astroBasis}]`
    }).filter((line): line is string => Boolean(line)).join('\n')
    const ds = s.domainScores
    coupleMatrixContext = [
      '== 커플 매트릭스 (9 레이어 셀-단위 사주×점성 교차) ==',
      `종합 ${scoreLabel(s.totalScore, 'ko')} (${s.totalScore}) · 신호 겹침 ${scoreLabel(s.overlapStrength * 100, 'ko')} · polarity +${s.polarityBalance.positive}/-${s.polarityBalance.negative}`,
      `도메인: 매력 ${scoreLabel(ds.attraction, 'ko')} · 안정 ${scoreLabel(ds.stability, 'ko')} · 성장 ${scoreLabel(ds.growth, 'ko')} · 갈등견딤 ${scoreLabel(ds.conflict, 'ko')} · 시기동기 ${scoreLabel(ds.timing, 'ko')}`,
      `Drivers: ${s.drivers.join(' / ') || '없음'}`,
      `Cautions: ${s.cautions.join(' / ') || '없음'}`,
      `\n[Top positive cells]\n${top}`,
      `\n[Top caution cells]\n${bot}`,
      `\n[레이어별 대표 셀]\n${perLayer}`,
    ].join('\n')
  } catch (e) {
    console.error('[couple matrix error]', e)
  }

  // 4) personsInfo (route.ts:553-583)
  const personsInfo = persons.map((p, i) => {
    const label = i === 0 ? 'A' : i === 1 ? 'B' : `P${i + 1}`
    const name = p.name || ''
    const head = name ? `${label} (${name})` : label
    const rel = i > 0 ? ` - ${relationLabel(normalizedLang, (p as { relation?: string }).relation as Relation | undefined, (p as { relationNote?: string }).relationNote)}` : ''
    return `${head}: ${p.date} ${p.time}${rel}`
  }).join('\n')

  // 5) fullContext text — same table form route.ts now uses.
  void stringifyForPrompt
  void prunePromptContext
  const fullContextText = [
    formatSajuAsTable(eff1Saju as Parameters<typeof formatSajuAsTable>[0], 'A'),
    ((): string => {
      const e = formatSajuExtras({
        extras: (eff1Saju as { extras?: Parameters<typeof formatSajuExtras>[0]['extras'] })?.extras,
        natalRelations: (eff1Saju as { natalRelations?: Parameters<typeof formatSajuExtras>[0]['natalRelations'] })?.natalRelations,
      })
      return e ? `A의 ${e}` : ''
    })(),
    formatSajuAsTable(eff2Saju as Parameters<typeof formatSajuAsTable>[0], 'B'),
    ((): string => {
      const e = formatSajuExtras({
        extras: (eff2Saju as { extras?: Parameters<typeof formatSajuExtras>[0]['extras'] })?.extras,
        natalRelations: (eff2Saju as { natalRelations?: Parameters<typeof formatSajuExtras>[0]['natalRelations'] })?.natalRelations,
      })
      return e ? `B의 ${e}` : ''
    })(),
    formatAstroAsTable(eff1Astro as Parameters<typeof formatAstroAsTable>[0], 'A'),
    formatAstroAsTable(eff2Astro as Parameters<typeof formatAstroAsTable>[0], 'B'),
  ]
    .filter((block) => !/\(없음\)/.test(block))
    .join('\n\n')

  // 6) build systemPrompt + cached + userPrompt (route.ts:592+ 미러)
  const systemPrompt = [
    '아래 == 참여자 정보 == 블록의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다.',
    '',
    '규칙:',
    '- 두 사람의 관계 역학에 답한다. 한 명만 분석하지 말 것.',
    '- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.',
    '- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.',
    '- AI/모델/상담사 정체 노출 금지.',
    '- 사주·점성 전문 용어(일간, 십성, 대운, 천을귀인, 트랜짓, 어스펙트, 하우스 등)는 최대한 쓰지 말 것. 데이터는 근거로만 읽고, 일상 언어로 자연스럽게 풀어서 답한다. 꼭 필요할 때만 짧은 괄호 설명과 함께 한 번 언급.',
  ].join('\n')

  // production route와 동일: 매트릭스/종합/사주심화/점성심화 4개 분석 블록은 빼고
  // raw 차트만 cached로 보낸다. 변수들은 dump 구조 유지를 위해 build만 해둠.
  void coupleMatrixContext
  void fusionContext
  void extSaju
  void extAstro

  // Synastry — production route와 같은 흐름 (사주 + 점성 cross 라인)
  const { formatSajuSynastry } = await import('../src/lib/compatibility/sajuSynastryFormatter')
  const { formatAstroSynastry } = await import('../src/lib/compatibility/astroSynastryFormatter')
  const { calculateNatalChart, toChart } = await import('../src/lib/astrology/foundation/astrologyService')

  const toPair = (p?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }) => ({
    stem: p?.heavenlyStem?.name ?? '',
    branch: p?.earthlyBranch?.name ?? '',
  })
  const aP = (eff1Saju as { pillars?: Record<string, { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }> } | null)?.pillars
  const bP = (eff2Saju as { pillars?: Record<string, { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }> } | null)?.pillars
  const aDae = (eff1Saju as { daeWoon?: { current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number } } | null } | null)?.daeWoon?.current
  const bDae = (eff2Saju as { daeWoon?: { current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number } } | null } | null)?.daeWoon?.current
  const sajuSyn = aP && bP ? formatSajuSynastry({
    pillarsA: [toPair(aP.year), toPair(aP.month), toPair(aP.day), toPair(aP.time)],
    pillarsB: [toPair(bP.year), toPair(bP.month), toPair(bP.day), toPair(bP.time)],
    currentDaeunA: aDae ? { stem: aDae.heavenlyStem ?? '', branch: aDae.earthlyBranch ?? '', age: aDae.age } : null,
    currentDaeunB: bDae ? { stem: bDae.heavenlyStem ?? '', branch: bDae.earthlyBranch ?? '', age: bDae.age } : null,
  }) : ''

  let astroSyn = ''
  try {
    const [Y1, M1, D1] = persons[0].date.split('-').map(Number)
    const [h1, mi1] = persons[0].time.split(':').map(Number)
    const [Y2, M2, D2] = persons[1].date.split('-').map(Number)
    const [h2, mi2] = persons[1].time.split(':').map(Number)
    const [natalA, natalB] = await Promise.all([
      calculateNatalChart({ year: Y1, month: M1, date: D1, hour: h1, minute: mi1, latitude: persons[0].latitude!, longitude: persons[0].longitude!, timeZone: persons[0].timeZone! }),
      calculateNatalChart({ year: Y2, month: M2, date: D2, hour: h2, minute: mi2, latitude: persons[1].latitude!, longitude: persons[1].longitude!, timeZone: persons[1].timeZone! }),
    ])
    astroSyn = formatAstroSynastry({
      chartA: toChart(natalA), chartB: toChart(natalB),
      latA: persons[0].latitude!, lonA: persons[0].longitude!,
      latB: persons[1].latitude!, lonB: persons[1].longitude!,
    })
  } catch (e) { console.error('[astro syn]', e) }

  const cachedUserContext = [
    `== 참여자 정보 ==`,
    personsInfo,
    sajuSyn ? `\n${sajuSyn}` : '',
    astroSyn ? `\n${astroSyn}` : '',
    fullContextText ? `\n== 전체 raw 컨텍스트 ==\n${fullContextText}` : '',
  ].filter(Boolean).join('\n')

  void buildEvidenceGroundingGuide
  const historyText = ''
  const timingBlock = formatTimingForPrompt(
    timingDetails as { person1: Record<string, unknown>; person2: Record<string, unknown> },
    { person1: eff1Astro as Record<string, unknown> | null, person2: eff2Astro as Record<string, unknown> | null },
    normalizedLang,
  )
  const userPrompt = [
    timingBlock,
    historyText ? `\n== 이전 대화 ==\n${historyText}` : '',
    `\n== 사용자 질문 ==\n${userQuestion}`,
  ].filter(Boolean).join('\n')

  void clampMessages(messages) // satisfies importer used in route

  console.log('================================================================')
  console.log('SYSTEM PROMPT')
  console.log('================================================================')
  console.log(systemPrompt)
  console.log()
  console.log('================================================================')
  console.log('CACHED USER CONTEXT (stable, prefix-cached)')
  console.log('================================================================')
  console.log(cachedUserContext)
  console.log()
  console.log('================================================================')
  console.log('USER PROMPT (variable per turn)')
  console.log('================================================================')
  console.log(userPrompt)
  console.log()
  console.log('================================================================')
  console.log('STATS')
  console.log('================================================================')
  console.log(`system    : ${systemPrompt.length} chars`)
  console.log(`cached    : ${cachedUserContext.length} chars`)
  console.log(`userPrompt: ${userPrompt.length} chars`)
  console.log(`TOTAL     : ${systemPrompt.length + cachedUserContext.length + userPrompt.length} chars`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
