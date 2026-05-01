/**
 * 3 서비스 출력 시각화 — Report / Calendar / Counselor 한 profile에서 한 번씩.
 * 실제 사주·점성 데이터 기반.
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
import { analyzeRelations } from '../src/lib/Saju/relations'
import { synthesizeExpertNarrationKo } from '../src/lib/destiny-matrix/ai-report/sajuNarrationBridge'
import { calculateCrossConfidence, estimateSajuSignalStrength, estimateAstroSignalStrength } from '../src/lib/destiny-matrix/ai-report/crossConfidence'
import { formatRecallContextKo } from '../src/lib/ai/personaMemoryRecall'
import { formatDecisionHistoryKo } from '../src/lib/ai/decisionTracker'

const PROFILE = { date: '1990-07-15', time: '14:20', gender: 'female' as const, city: '부산', label: '1990-07-15 14:20 부산 여' }

function buildSajuInput() {
  const s = calculateSajuData(PROFILE.date, PROFILE.time, PROFILE.gender, 'solar', 'Asia/Seoul')
  const pillars = {
    year: { heavenlyStem: s.yearPillar.heavenlyStem.name, earthlyBranch: s.yearPillar.earthlyBranch.name },
    month: { heavenlyStem: s.monthPillar.heavenlyStem.name, earthlyBranch: s.monthPillar.earthlyBranch.name },
    day: { heavenlyStem: s.dayPillar.heavenlyStem.name, earthlyBranch: s.dayPillar.earthlyBranch.name },
    time: { heavenlyStem: s.timePillar.heavenlyStem.name, earthlyBranch: s.timePillar.earthlyBranch.name },
  }
  const relations = analyzeRelations({ pillars, dayMasterStem: s.dayMaster.name })

  const sibsinDist: Record<string, number> = {}
  for (const pl of [s.yearPillar, s.monthPillar, s.dayPillar, s.timePillar]) {
    if (!pl) continue
    const ss = (pl as any).sibsin
    if (ss?.cheon) sibsinDist[ss.cheon] = (sibsinDist[ss.cheon] || 0) + 1
    if (ss?.ji) sibsinDist[ss.ji] = (sibsinDist[ss.ji] || 0) + 1
  }
  const now = new Date()
  const year = now.getFullYear()
  const idx = (year - 4 + 6000) % 60
  const STEMS_EL: Record<number, string> = { 0: '목', 1: '목', 2: '화', 3: '화', 4: '토', 5: '토', 6: '금', 7: '금', 8: '수', 9: '수' }
  const currentSaeunElement = STEMS_EL[idx % 10]
  const daeWoonList = s.daeWoon?.list || []
  const ageNow = year - Number(PROFILE.date.slice(0, 4))
  const currentDaeun: any = daeWoonList.find((d: any) => ageNow >= d.startAge && ageNow < d.startAge + 10)

  return {
    saju: s,
    pillars,
    relations,
    input: {
      dayMasterElement: s.dayMaster.element,
      pillarElements: {
        year: { stem: s.yearPillar?.heavenlyStem?.element, branch: s.yearPillar?.earthlyBranch?.element },
        month: { stem: s.monthPillar?.heavenlyStem?.element, branch: s.monthPillar?.earthlyBranch?.element },
        day: { stem: s.dayPillar?.heavenlyStem?.element, branch: s.dayPillar?.earthlyBranch?.element },
        time: { stem: s.timePillar?.heavenlyStem?.element, branch: s.timePillar?.earthlyBranch?.element },
      },
      sibsinDistribution: sibsinDist,
      twelveStages: {},
      geokguk: '정관격',
      shinsalList: ['천을귀인', '도화', '역마'],
      relations,
      currentDaeunElement: currentDaeun?.heavenlyStem?.element,
      currentSaeunElement,
      currentWolunElement: '화',
      currentIljinElement: '수',
      currentIljinDate: now.toISOString().slice(0, 10),
      dominantWesternElement: 'fire' as const,
      planetSigns: { Sun: 'Cancer', Moon: 'Scorpio', Mercury: 'Cancer', Venus: 'Leo', Mars: 'Taurus', Jupiter: 'Cancer', Saturn: 'Capricorn', Ascendant: 'Libra' },
      planetHouses: { Sun: 10, Moon: 2, Mercury: 9, Venus: 11, Mars: 8, Jupiter: 10, Saturn: 4 },
      aspects: [
        { planet1: 'Sun', planet2: 'Pluto', type: 'opposition' },
        { planet1: 'Moon', planet2: 'Jupiter', type: 'trine' },
      ],
      activeTransits: ['saturn return', 'jupiter on natal MC'],
      asteroidHouses: { Juno: 7, Vesta: 6 },
      extraPointSigns: { Vertex: 'Leo', PartOfFortune: 'Virgo' },
      advancedAstroSignals: { solarReturn: true, lunarReturn: true, eclipses: true },
      sajuSnapshot: { fiveElements: s.fiveElements, pillars: { day: s.dayPillar } },
      lang: 'ko',
      startYearMonth: now.toISOString().slice(0, 7),
    },
  }
}

function header(title: string) {
  console.log('\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  ${title}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

function sub(title: string) {
  console.log(`\n▼ ${title}`)
  console.log('────────────────────────────────────────────────────────────────')
}

const { saju, pillars, input } = buildSajuInput()

console.log('PROFILE:', PROFILE.label)
console.log('사주:', Object.values(pillars).map((p: any) => p.heavenlyStem + p.earthlyBranch).join('/'))
console.log(`일간: ${saju.dayMaster.name} (${saju.dayMaster.element}) | 5행: 목${saju.fiveElements.wood} 화${saju.fiveElements.fire} 토${saju.fiveElements.earth} 금${saju.fiveElements.metal} 수${saju.fiveElements.water}`)

// ═════════════════════════════════════════════════════════════════
// 1. REPORT
// ═════════════════════════════════════════════════════════════════
header('1️⃣  REPORT — synthesizeExpertNarrationKo (LLM 풀이의 결정론 skeleton)')
const report = synthesizeExpertNarrationKo(input as any)
console.log(`총 길이: ${report.length}자`)
const reportBlocks = report.split('\n\n')
console.log(`단락 수: ${reportBlocks.length}개`)

sub('첫 cross 단락 (사주↔점성 만나는 메인)')
console.log(reportBlocks[0])

sub('### 정관격 정통 풀이 (Tier 2C deep KB)')
console.log(reportBlocks.find((b) => b.includes('### 정관격 정통 풀이')) || '(없음)')

sub('### 활성 신살 정통 풀이 (Tier 2C deep KB)')
console.log(reportBlocks.find((b) => b.includes('### 활성 신살 정통 풀이')) || '(없음)')

sub('### 본명 60갑자 동적 해석 (Tier 3 specific 페어)')
console.log(reportBlocks.find((b) => b.includes('### 본명 60갑자 동적 해석')) || '(없음)')

sub('합의 강도 (Tier 2D confidence score)')
console.log(reportBlocks.find((b) => b.includes('합의 강도')) || '(없음)')

// ═════════════════════════════════════════════════════════════════
// 2. CALENDAR
// ═════════════════════════════════════════════════════════════════
header('2️⃣  CALENDAR — 일별 action plan + 폴리싱')
const sajuSig = estimateSajuSignalStrength({ natalElement: saju.dayMaster.element, cycleElement: input.currentSaeunElement, shinsalActive: 3, hasGeokguk: true })
const astroSig = estimateAstroSignalStrength({ activeTransitsCount: 2, tenseAspectsCount: 1, flowAspectsCount: 1, hasAdvancedSignals: true })
const conf = calculateCrossConfidence({ sajuStrength: sajuSig.strength, sajuDirection: sajuSig.direction, astroStrength: astroSig.strength, astroDirection: astroSig.direction }, 'ko')

sub(`오늘 (${new Date().toISOString().slice(0, 10)}) cross signal`)
console.log(`사주 신호 강도: ${(sajuSig.strength * 100).toFixed(0)}% / 방향: ${sajuSig.direction}`)
console.log(`점성 신호 강도: ${(astroSig.strength * 100).toFixed(0)}% / 방향: ${astroSig.direction}`)
console.log(`합의 강도: ${conf.scorePercent}% (${conf.band})`)
console.log(`설명: ${conf.description}`)

sub('일별 짧은 사주↔점성 cross 단락')
const dailyParas = report.split('\n\n').filter((b) => b.includes('이 분에게'))
if (dailyParas.length > 0) console.log(dailyParas[0])
else {
  // fallback — main cross
  console.log(reportBlocks[1] || reportBlocks[0])
}

// ═════════════════════════════════════════════════════════════════
// 3. COUNSELOR
// ═════════════════════════════════════════════════════════════════
header('3️⃣  COUNSELOR — chat-stream context (recall + decision history)')

sub('PersonaMemory recall (Tier 2A) — 사용자 최근 질문·결정 narrative')
const recall = formatRecallContextKo({
  recentQuestions: [
    { text: '이번 분기에 이직해도 될까요?', recordedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { text: '결혼 시기가 언제쯤 풀릴지 궁금해요', recordedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    { text: '투자 시점을 잡고 있는데 조언이 필요해요', recordedAt: new Date(Date.now() - 21 * 86400000).toISOString() },
  ],
  decisionsMentioned: [
    { text: '서울로 이사 가기로 했어요.', recordedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { text: '회사 그만두기로 결정했어요.', recordedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  ],
})
console.log(recall)

sub('Decision Tracker history (Tier 2B) — 학습 데이터로 LLM에 주입')
const decisionBlock = formatDecisionHistoryKo([
  { decisionType: 'career_change', context: '대기업에서 스타트업으로 이직', recommendedAction: null, outcome: 'good', outcomeNote: '예상보다 잘 풀렸어요. 사주 신호가 정확했음.', decidedAt: new Date('2025-09-01'), evaluatedAt: new Date('2026-01-15') },
  { decisionType: 'investment', context: '주식 비중 확대', recommendedAction: null, outcome: 'mixed', outcomeNote: '일부는 잘됐고 일부는 손실', decidedAt: new Date('2025-11-10'), evaluatedAt: new Date('2026-02-20') },
  { decisionType: 'marriage', context: '결혼 진행 중', recommendedAction: null, outcome: 'pending', outcomeNote: null, decidedAt: new Date('2026-03-01'), evaluatedAt: null },
] as any)
console.log(decisionBlock)

sub('이 두 블록이 [🧠 장기 기억] memory 섹션으로 LLM 프롬프트에 자동 주입됨')
console.log(`총 길이: ${(recall.length + decisionBlock.length)}자 (memory 블록 budget 320~700자)`)

console.log('\n')
