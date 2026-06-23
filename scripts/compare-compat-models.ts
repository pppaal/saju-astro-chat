/**
 * scripts/compare-compat-models.ts
 *
 * Sonnet vs Haiku A/B 비교 하니스 — 궁합 상담사(compatibility/counselor)용.
 * 프로덕션 라우트의 컨텍스트 조립을 그대로 재현한다:
 *   - systemPrompt = buildCompatibilityCounselorPrompt(lang) + relationToneBlock
 *   - cachedUserContext = 두 사람의 사주/점성 synastry + composite (실제 엔진/포매터)
 *   - userPrompt = caller + 질문
 * 같은 두 사람·같은 질문을 두 모델에 보내고 출력 + 토큰 + 비용을 나란히 본다.
 *
 * 왜: llm-policy.ts 에서 compatibility.counselor 를 Sonnet→Haiku 로 내릴지
 * 결정하려면, synastry 깊이가 필요한 이 채널에서 Haiku 품질을 눈으로 봐야 한다.
 *
 * 실행:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/compare-compat-models.ts
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/compare-compat-models.ts --lang en
 *
 * 참고: route.ts 의 personalShinsalBlock 은 라우트 로컬(private) 함수라 생략.
 * 나머지 주요 블록(사주/점성 synastry, composite)은 동일 포매터로 재현.
 */

import { buildCompatibilityCounselorPrompt } from '../src/lib/prompts/compatibilityCounselorPrompt'
import {
  buildRelationToneBlock,
  getRelation,
} from '../src/lib/compatibility/counselor/relationConfig'
import { collectCompatSajuFacts } from '../src/lib/compatibility/compatSajuFacts'
import { collectCompatAstroFacts } from '../src/lib/compatibility/compatAstroFacts'
import { formatSajuSynastry } from '../src/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '../src/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '../src/lib/compatibility/compositeChartFormatter'
import { koStructuralLabels } from '../src/lib/llm/koStructuralLabels'

const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-5-20250929'
const PRICING: Record<string, { input: number; output: number }> = {
  [HAIKU]: { input: 1, output: 5 },
  [SONNET]: { input: 3, output: 15 },
}

const lang: 'ko' | 'en' = process.argv.includes('--lang') ? 'en' : 'ko'

type Person = {
  name: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

type Fixture = {
  label: string
  relation: string
  question: string
  a: Person
  b: Person
}

const SEOUL = { latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul' }

const FIXTURES: Fixture[] = [
  {
    label: '연인 (진지한 관계 질문)',
    relation: 'lover',
    question:
      lang === 'ko'
        ? '사귄 지 1년 됐는데 요즘 자주 부딪혀요. 이 사람이랑 계속 가도 될까요?'
        : "We've dated a year but clash a lot lately. Should I stay with this person?",
    a: { name: '지민', date: '1993-04-12', time: '07:30', gender: 'female', ...SEOUL },
    b: { name: '현우', date: '1991-11-03', time: '14:10', gender: 'male', ...SEOUL },
  },
  {
    label: '동료 (가벼운 협업 질문)',
    relation: 'colleague',
    question:
      lang === 'ko'
        ? '새 팀 동료랑 합이 어때요? 같이 프로젝트 잘 굴러갈까요?'
        : 'How well do I mesh with my new teammate? Will the project run smoothly?',
    a: { name: '지민', date: '1993-04-12', time: '07:30', gender: 'female', ...SEOUL },
    b: { name: '태경', date: '1988-07-21', time: '09:00', gender: 'male', ...SEOUL },
  },
]

async function buildContext(fx: Fixture): Promise<{ systemPrompt: string; userPrompt: string }> {
  const sajuSeed = (p: Person) => ({
    birthDate: p.date,
    birthTime: p.time,
    gender: p.gender,
    timezone: p.timeZone,
    longitude: p.longitude,
  })
  const astroSeed = (p: Person) => ({
    birthDate: p.date,
    birthTime: p.time,
    latitude: p.latitude,
    longitude: p.longitude,
    timezone: p.timeZone,
  })

  const compatSaju = collectCompatSajuFacts(sajuSeed(fx.a), sajuSeed(fx.b))
  const compatAstro = await collectCompatAstroFacts(astroSeed(fx.a), astroSeed(fx.b))

  const sajuSynastryBlock = formatSajuSynastry({
    pillarsA: compatSaju.a.synastryPillars,
    pillarsB: compatSaju.b.synastryPillars,
    currentDaeunA: compatSaju.a.currentDaeun,
    currentDaeunB: compatSaju.b.currentDaeun,
    nameA: fx.a.name,
    nameB: fx.b.name,
    timeUnknownA: false,
    timeUnknownB: false,
    lang,
  })
  const astroSynastryBlock = formatAstroSynastry({
    chartA: compatAstro.a.chart,
    chartB: compatAstro.b.chart,
    latA: compatAstro.a.latitude,
    lonA: compatAstro.a.longitude,
    latB: compatAstro.b.latitude,
    lonB: compatAstro.b.longitude,
    nameA: fx.a.name,
    nameB: fx.b.name,
    timeUnknownA: false,
    timeUnknownB: false,
    lang,
  })
  const compositeChartBlock = formatCompositeChart({
    lang,
    chartA: compatAstro.a.chart,
    chartB: compatAstro.b.chart,
    nameA: fx.a.name,
    nameB: fx.b.name,
    timeUnknownA: false,
    timeUnknownB: false,
  })

  const relOpt = getRelation(fx.relation)
  const relLabel = lang === 'ko' ? relOpt.labelKo : relOpt.labelEn
  const personsInfo = [
    lang === 'ko'
      ? `A (${fx.a.name}): ${fx.a.date} ${fx.a.time}`
      : `A (${fx.a.name}): ${fx.a.date} ${fx.a.time}`,
    lang === 'ko'
      ? `B (${fx.b.name}): ${fx.b.date} ${fx.b.time} - ${relLabel}`
      : `B (${fx.b.name}): ${fx.b.date} ${fx.b.time} - ${fx.relation}`,
  ].join('\n')

  const cachedUserContextRaw = [
    lang === 'en' ? `== Participants ==` : `== 참여자 정보 ==`,
    personsInfo,
    sajuSynastryBlock,
    astroSynastryBlock,
    compositeChartBlock,
  ]
    .filter(Boolean)
    .join('\n')
  const cachedUserContext =
    lang === 'ko' ? koStructuralLabels(cachedUserContextRaw) : cachedUserContextRaw

  const systemPrompt =
    buildCompatibilityCounselorPrompt(lang) + buildRelationToneBlock(fx.relation, lang)
  const callerLine =
    lang === 'ko'
      ? `[호출자(질문자)] ${fx.a.name} — 한국어로 답할 때 '${fx.a.name}님'으로 호명한다.\n\n`
      : `[Caller] ${fx.a.name} — address as 'Hi ${fx.a.name},' naturally.\n\n`
  // 라우트는 cachedUserContext 를 별도 cache block 으로, userPrompt 를 동적 블록으로
  // 보낸다. 하니스에선 둘을 합쳐 한 user 메시지로 전송(품질 비교엔 동일).
  const userPrompt = `${cachedUserContext}\n\n${callerLine}${fx.question}`
  return { systemPrompt, userPrompt }
}

async function callModel(model: string, systemPrompt: string, userPrompt: string) {
  const t0 = Date.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      temperature: 0.7,
      system: [{ type: 'text', text: systemPrompt }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`${model} → ${res.status} ${await res.text()}`)
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>
    usage: { input_tokens: number; output_tokens: number }
  }
  const text = data.content.map((b) => b.text ?? '').join('')
  const { input_tokens: inTok, output_tokens: outTok } = data.usage
  const p = PRICING[model]
  const usd = (inTok * p.input + outTok * p.output) / 1_000_000
  return { text, inTok, outTok, usd, ms: Date.now() - t0 }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY 가 없습니다. ANTHROPIC_API_KEY=sk-... npx tsx scripts/compare-compat-models.ts'
    )
    process.exit(1)
  }
  const costRows: string[] = []
  for (const fx of FIXTURES) {
    const { systemPrompt, userPrompt } = await buildContext(fx)
    console.log('\n' + '='.repeat(78))
    console.log(`FIXTURE: ${fx.label}  |  "${fx.question}"`)
    console.log(`  (system ${systemPrompt.length}자 · context+질문 ${userPrompt.length}자)`)
    console.log('='.repeat(78))
    for (const model of [SONNET, HAIKU]) {
      const tag = model === SONNET ? 'SONNET 4.5' : 'HAIKU 4.5 '
      try {
        const r = await callModel(model, systemPrompt, userPrompt)
        console.log(
          `\n── ${tag} ──  (${r.inTok} in / ${r.outTok} out tok · $${r.usd.toFixed(5)} · ${r.ms}ms)`
        )
        console.log(r.text)
        costRows.push(`${fx.label.padEnd(26)} ${tag}  $${r.usd.toFixed(5)}  (${r.outTok} out)`)
      } catch (e) {
        console.error(`\n── ${tag} ── ERROR:`, e instanceof Error ? e.message : e)
      }
    }
  }
  console.log('\n' + '='.repeat(78))
  console.log('비용 요약 (per turn, prompt-cache 미적용 raw)')
  console.log('='.repeat(78))
  costRows.forEach((r) => console.log('  ' + r))
}

void main()
