import type { ChatMessage } from '@/lib/api'
import type { Relation } from '@/lib/compatibility/relationTypes'
import { logger } from '@/lib/logger'
import { buildEvidenceGroundingGuide } from '@/lib/prompts/evidenceGroundingGuide'
import { buildCompatibilityCounselorPrompt } from '@/lib/prompts/compatibilityCounselorPrompt'
import { sanitizeForXmlTagBoundary, sanitizePriorTurns } from '@/lib/llm/promptSafety'
import { guardText } from '@/lib/textGuards'
import { getRelation, buildRelationToneBlock } from '@/lib/compatibility/counselor/relationConfig'
import { formatSajuSynastry } from '@/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '@/lib/compatibility/compositeChartFormatter'
import { collectCompatSajuFacts } from '@/lib/compatibility/compatSajuFacts'
import { collectCompatAstroFacts } from '@/lib/compatibility/compatAstroFacts'
import {
  buildPersonSeed,
  getAgeFromBirthDate,
} from '@/app/api/compatibility/counselor/routeSupport'

// Inlined from the now-deleted routeSupportCommon (which served the
// retired results/narrative-stream flow). The counselor route is the
// only remaining caller. Keep in lockstep with Relation in
// src/app/api/compatibility/types and the <select> in
// src/app/compatibility/components/form/PersonCard.tsx.
function relationLabel(locale: 'ko' | 'en', relation?: Relation, note?: string): string {
  if (!relation) return locale === 'ko' ? '관계' : 'related'
  const opt = getRelation(relation)
  if (opt.key === 'other') return note?.trim() || (locale === 'ko' ? '기타' : 'other')
  return locale === 'ko' ? opt.labelKo : opt.labelEn
}

// 개별(self) 신살 — 각자 타고난 신살은 extras.shinsal에 이미 계산돼 있으나
// self 블록이 voided라 궁합 프롬프트엔 안 들어가던 신호. 단, 전부 쏟으면
// 다시 노이즈가 되므로 *관계 해석에 유효한 특수 신살만* 화이트리스트로
// 큐레이션 + 짧은 뜻을 붙인다. 12신살(자리)은 synastry [12신살] cross가,
// 도화·홍염살·백호·괴강·천을귀인은 sajuSynastryFormatter 의 신살 cross
// 블록이 양방향 deterministic 으로 다루므로 self 중복 제거 — 여기엔
// 오직 *cross 가 없는* personality-only 신살만 남긴다.
const PILLAR_KO: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
const PERSONAL_SHINSAL_KEEP: Record<string, string> = {
  양인: '날카로움·과격',
  귀문관: '집착·예민',
  원진: '미묘한 반감',
  고신: '고독 기질',
  금여성: '배우자 복·기품',
  천덕귀인: '보호·덕',
  월덕귀인: '보호·덕',
}
// EN: 한국어 신살명은 영어 사용자에게 의미 없으니 음역 + 영어 뜻 (영어 응답 누수 방지).
const PILLAR_EN: Record<string, string> = { year: 'Y', month: 'M', day: 'D', time: 'H' }
const PERSONAL_SHINSAL_KEEP_EN: Record<string, { name: string; mean: string }> = {
  양인: { name: 'Yangin', mean: 'sharp, aggressive' },
  귀문관: { name: 'Gwimun', mean: 'obsessive, sensitive' },
  원진: { name: 'Wonjin', mean: 'subtle aversion' },
  고신: { name: 'Gosin', mean: 'solitary streak' },
  금여성: { name: 'Geumyeo', mean: 'spouse fortune, grace' },
  천덕귀인: { name: 'Cheondeok', mean: 'protection, virtue' },
  월덕귀인: { name: 'Woldeok', mean: 'protection, virtue' },
}

function formatPersonalShinsal(
  label: string,
  shinsal: unknown,
  lang: 'ko' | 'en' = 'ko'
): string | null {
  if (!Array.isArray(shinsal) || shinsal.length === 0) return null
  const en = lang === 'en'
  const byKind = new Map<string, Set<string>>()
  for (const raw of shinsal) {
    const h = raw as { kind?: string; pillars?: string[] }
    if (!h?.kind || !(h.kind in PERSONAL_SHINSAL_KEEP)) continue
    const set = byKind.get(h.kind) ?? new Set<string>()
    for (const p of h.pillars ?? []) set.add((en ? PILLAR_EN[p] : PILLAR_KO[p]) ?? p)
    byKind.set(h.kind, set)
  }
  if (byKind.size === 0) return null
  const parts = [...byKind.entries()].map(([kind, ps]) => {
    const loc = [...ps].join('·')
    if (en) {
      const e = PERSONAL_SHINSAL_KEEP_EN[kind]
      const nm = e ? e.name : kind
      const mn = e ? e.mean : ''
      return `${nm}(${loc ? `${loc}, ` : ''}${mn})`
    }
    return `${kind}(${loc ? `${loc}, ` : ''}${PERSONAL_SHINSAL_KEEP[kind]})`
  })
  return `${label}: ${parts.join(' · ')}`
}

export interface CompatibilityCounselorContext {
  systemPrompt: string
  cachedUserContext: string
  userPrompt: string
  priorTurns: { role: 'user' | 'assistant'; content: string }[]
}

export interface BuildCompatibilityCounselorContextInput {
  /** Validated persons array (2–4 entries) from the request body. */
  persons: Array<Record<string, unknown>>
  /** Resolved answer language (already collapsed to ko/en in the route). */
  lang: 'ko' | 'en'
  /** Conversation history, already clamped to the last N turns. */
  trimmedHistory: ChatMessage[]
  /** Optional attached file text (e.g. CV) for the current turn. */
  cvText?: string
  /** Caller display name, resolved server-side (DB) by the route. */
  callerName: string | null
}

/**
 * Assemble the system/user prompts and prior turns for the compatibility
 * counselor stream. Extracted from the route handler so the route stays a thin
 * orchestrator (middleware → validate → safety → credits → build → stream).
 *
 * Pure-ish: no `req`/`context`/DB access — every IO concern (auth, credits,
 * caller-name lookup) stays in the route and is passed in. The astro facts
 * collector is skipped under `NODE_ENV==='test'` to match the route's prior
 * behavior (unit tests don't exercise the Swiss Ephemeris path).
 */
export async function buildCompatibilityCounselorContext(
  input: BuildCompatibilityCounselorContextInput
): Promise<CompatibilityCounselorContext> {
  const { persons, lang, trimmedHistory, cvText, callerName } = input

  const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')

  // Build raw saju + astro contexts. We hand the LLM raw chart tables
  // (saju pillars, natal planets/houses/aspects) and let it do its
  // own picking — previously we also fed it fusion scores, extended
  // saju/astro compatibility analyses, and a 9-layer couple matrix,
  // but those structured outputs were bleeding into the model's
  // response template and effectively duplicating work the LLM does
  // better itself.
  const person1Seed = buildPersonSeed((persons?.[0] as Record<string, unknown>) || null)
  const person2Seed = buildPersonSeed((persons?.[1] as Record<string, unknown>) || null)

  // 시간 미상 헤더는 살린다 — A/B 둘 다 시간 모를 때 LLM 이 자정 폴백
  // 으로 그럴듯한 ASC/MC 를 만들지 않게 막는다.
  const personA = persons[0] as { timeUnknown?: boolean } | undefined
  const personB = persons[1] as { timeUnknown?: boolean } | undefined
  const unknownNotices: string[] = []
  if (personA?.timeUnknown)
    unknownNotices.push(lang === 'en' ? '# A birth time unknown.' : '# A 시간 미상.')
  if (personB?.timeUnknown)
    unknownNotices.push(lang === 'en' ? '# B birth time unknown.' : '# B 시간 미상.')
  const timeUnknownNotices = unknownNotices.join('\n')

  // 진짜 multi-turn — assistant 답변을 LLM이 자기 발화로 정확히
  // 인식하게. 예전엔 Q:/A: 한 덩어리 string으로 박아서 직전 답 톤이
  // 다음 답에 묻어 나왔다.
  const dialogTurns = trimmedHistory.filter(
    (m): m is { role: 'user' | 'assistant'; content: string } =>
      m.role === 'user' || m.role === 'assistant'
  )
  // 마지막 user 턴까지만 prior, 마지막 user 턴 자체는 userPrompt로.
  const lastUserIdxInDialog = (() => {
    for (let i = dialogTurns.length - 1; i >= 0; i--) {
      if (dialogTurns[i].role === 'user') return i
    }
    return -1
  })()
  // Sanitize prior turns from the client — drops forged 'system' roles,
  // caps length, and strips `<`/`>` to prevent fake tag-close injection.
  // See src/lib/llm/promptSafety.ts. We still apply guardText on the
  // remaining valid turns to keep the existing 400-char cap behavior
  // (sanitizePriorTurns' own 8000-char cap is the upper bound).
  const priorTurns =
    lastUserIdxInDialog >= 0
      ? sanitizePriorTurns(
          dialogTurns
            .slice(0, lastUserIdxInDialog)
            .map((m) => ({ role: m.role, content: guardText(m.content, 400) }))
        )
      : []
  // sanitizeForXmlTagBoundary replaces `<`/`>` with full-width chars so
  // attacker text in the question can't break out of the adjacent
  // <attached_file> wrapper or fake a new tag.
  const rawUserQuestion = lastUser
    ? sanitizeForXmlTagBoundary(guardText(lastUser.content, 600))
    : ''
  // Prepend the user's attached file (if any) as XML-tagged context on the
  // current turn — same approach as the destiny counselor (realtime route).
  const attachmentText =
    typeof cvText === 'string' ? sanitizeForXmlTagBoundary(cvText.trim().slice(0, 8000)) : ''
  const userQuestion = attachmentText
    ? `<attached_file>\n${attachmentText}\n</attached_file>\n\n${rawUserQuestion}`
    : rawUserQuestion

  // Format persons info. 라벨을 A/B로 통일해 커플 매트릭스의 "A의 갑목 일간
  // ↔ B의 기토 일간" 같은 prose 셀과 매핑이 즉시 명확하다. 이름이 있으면
  // 함께 표기해 응답에서 자연어로 부르기 쉽게 한다.
  const normalizedLang = lang === 'ko' ? 'ko' : 'en'
  const personsInfo = persons
    .map(
      (
        p: {
          name?: string
          date?: string
          time?: string
          relation?: string
          relationNote?: string
        },
        i: number
      ) => {
        const label = i === 0 ? 'A' : i === 1 ? 'B' : `P${i + 1}`
        // T2 fix: partner name 은 클라 입력 (zod 120 chars 임의 문자열). 다른
        // free-text 필드 (userQuestion, cvText, prior turns) 는 모두
        // sanitizeForXmlTagBoundary 거치는데 name 만 raw 로 prompt 에 삽입돼
        // prompt injection 가능했다.
        const name = p.name ? sanitizeForXmlTagBoundary(p.name).slice(0, 120) : ''
        const head = name ? `${label} (${name})` : label
        // Show the current age inline. Without this the LLM has to
        // derive "what age is this person now" from the birth year
        // and the current date — and it kept getting confused
        // between current age and the daeun stage start age (e.g.
        // 32세 대운 시작 vs 만 35세 현재) in earlier production
        // turns. Korean age = ageYears + 1 (one for the year of
        // birth, conventional 만 vs 한국나이 offset).
        const age = p.date ? getAgeFromBirthDate(p.date) : null
        const ageNote =
          age != null ? (normalizedLang === 'ko' ? ` (만 ${age}세)` : ` (age ${age})`) : ''
        // Person 1 is always the anchor — no relation suffix. For
        // everyone else, pipe through relationLabel so the LLM
        // sees "연인 / 배우자 / 가족 / 형제자매 / 친구 / 동료 / 기타"
        // in Korean (or the English equivalent) instead of the raw
        // English enum key. relationLabel falls back to the freeform
        // relationNote when the user picked "other".
        const rel =
          i > 0
            ? ` - ${relationLabel(normalizedLang, p.relation as Relation | undefined, p.relationNote)}`
            : ''
        return `${head}: ${p.date} ${p.time}${ageNote}${rel}`
      }
    )
    .join('\n')

  const evidenceGuide = buildEvidenceGroundingGuide(normalizedLang)

  // System prompt — minimal. The previous build pulled in the full
  // counselorVoiceBase (identity + listening protocol + 16 signature
  // sentences + absolute rules + anti-patterns + length guide) plus
  // compat domain rules plus citation rules — ~3k tokens of stage
  // direction that the model treated as scripture. Two side effects:
  //   1. answers got copy-pasted from the "한계 인정" signature
  //      block ("그 부분은 차트에 안 잡혀요…") even when the chart
  //      *could* speak to the question.
  //   2. every turn paid the full prompt cost.
  // User asked for raw-data-in, direct-answer-out. We keep only the
  // four hard safety/format guards. Tone is whatever the data
  // suggests; the model is no longer told *how* to sound.
  const counselorLang: 'ko' | 'en' = lang === 'ko' ? 'ko' : 'en'
  // 관계 유형별 상담 톤 — 사용자가 폼에서 고른 관계(연인/썸/부부/예비부부/
  // 헤어진사이/친구/가족/형제자매/동료/비즈니스/기타)에 맞춰 한 줄 디렉티브를
  // 시스템 프롬프트에 주입한다. 친구 페어에 결혼 얘기, 동료 페어에 로맨스 같은
  // 미스매치를 막는다. 상대(persons[1]) 기준 — anchor(persons[0])는 본인.
  const counterpart = persons[1] as { relation?: string; relationNote?: string } | undefined
  const relationToneBlock = buildRelationToneBlock(
    counterpart?.relation,
    counselorLang,
    counterpart?.relationNote
  )
  const systemPrompt = buildCompatibilityCounselorPrompt(counselorLang) + relationToneBlock

  // User prompt를 두 블록으로 분할 — multi-turn caching:
  //  - cachedUserContext: 두 사람의 차트와 분석 (테마·세션 무관, 진짜 안정)
  //  - userPrompt: 테마·시기 흐름·가이드·이력·질문 (테마 바뀌면 변동)
  //
  // 테마/품질가이드/시기 흐름(wolun/ilun이 테마 의존)을 변동 블록으로 옮겨
  // 같은 페어로 테마만 바꿔도 캐시 prefix가 hit하도록 한다.
  // cached에는 raw 차트만 둔다. 매트릭스/종합/사주심화/점성심화 등
  // 우리 엔진이 만든 2차 분석 텍스트는 더 이상 계산하지 않는다:
  //   1. 토큰 ~60% 감축 (12,400 → ~5,000자)
  //   2. 모델이 우리 점수/등급을 그대로 받아쓰는 환각 차단
  //   3. raw에서 직접 추론하게 함
  //   4. 호출당 계산 비용 절감 (cross-rules / 9-layer matrix 패스 스킵)
  // ── Synastry (두 사람 사이 cross 신호) ──────────────────────
  // 각자 natal/사주 raw만 주면 LLM이 *두 사람 관계*를 매번 직접 추론해야
  // 함. cross 신호(천간합·지지충·천을귀인 발동·점성 aspect orb·house
  // overlay)를 라인 단위로 미리 제공하면 정통 깊이 ↑↑ 토큰 ~5K 추가지만
  // cached prefix라 prompt caching이 cover.
  let sajuSynastryBlock = ''
  let astroSynastryBlock = ''
  let compositeChartBlock = ''
  // ── 재료 준비실 (사주편) ──
  // 옛 코드는 raw `effectivePerson*Saju` 를 두 번 캐스트해 (pillars + daeWoon)
  // formatSajuSynastry / formatPersonalShinsal 입력으로 변형했다.
  // Phase A (2026-06-06): collectCompatSajuFacts 가 두 사람치 정제 facts
  // 한 번에 만들어, 라우트는 facts 의 평탄 필드만 읽음. raw shape 변경에
  // formatter 두 개가 더 이상 묶이지 않음.
  const compatSaju =
    person1Seed && person2Seed
      ? collectCompatSajuFacts(
          {
            birthDate: person1Seed.date,
            birthTime: person1Seed.time,
            gender: person1Seed.gender,
            timezone: person1Seed.timeZone,
            longitude: person1Seed.longitude,
          },
          {
            birthDate: person2Seed.date,
            birthTime: person2Seed.time,
            gender: person2Seed.gender,
            timezone: person2Seed.timeZone,
            longitude: person2Seed.longitude,
          }
        )
      : null
  try {
    if (compatSaju) {
      sajuSynastryBlock = formatSajuSynastry({
        pillarsA: compatSaju.a.synastryPillars,
        pillarsB: compatSaju.b.synastryPillars,
        currentDaeunA: compatSaju.a.currentDaeun,
        currentDaeunB: compatSaju.b.currentDaeun,
        nameA: (persons?.[0] as { name?: string } | undefined)?.name ?? null,
        nameB: (persons?.[1] as { name?: string } | undefined)?.name ?? null,
        lang,
      })
    }
  } catch (err) {
    logger.warn('[compat counselor] saju synastry failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }
  // ── 재료 준비실 (점성편) ──
  // 옛 코드는 라우트 안에서 시각 파싱 + calculateNatalChart × 2 + toChart
  // × 2 를 직접 했다. Phase B (2026-06-06): collectCompatAstroFacts 가
  // 두 사람치 chart 페어 한 번에 만들어, formatter 둘 다 평탄 필드만 읽음.
  const compatAstro =
    person1Seed && person2Seed && process.env.NODE_ENV !== 'test'
      ? await collectCompatAstroFacts(
          {
            birthDate: person1Seed.date,
            birthTime: person1Seed.time,
            latitude: person1Seed.latitude,
            longitude: person1Seed.longitude,
            timezone: person1Seed.timeZone,
          },
          {
            birthDate: person2Seed.date,
            birthTime: person2Seed.time,
            latitude: person2Seed.latitude,
            longitude: person2Seed.longitude,
            timezone: person2Seed.timeZone,
          }
        )
      : null
  if (compatAstro) {
    try {
      const nA = (persons?.[0] as { name?: string } | undefined)?.name ?? null
      const nB = (persons?.[1] as { name?: string } | undefined)?.name ?? null
      astroSynastryBlock = formatAstroSynastry({
        chartA: compatAstro.a.chart,
        chartB: compatAstro.b.chart,
        latA: compatAstro.a.latitude,
        lonA: compatAstro.a.longitude,
        latB: compatAstro.b.latitude,
        lonB: compatAstro.b.longitude,
        nameA: nA,
        nameB: nB,
        lang,
      })
      // Composite chart — 두 차트의 entity 톤 (관계 자체). synastry 가
      // "서로에게 어떻게 반응하나" 면 composite 은 "둘이 같이 만드는 분위기".
      compositeChartBlock = formatCompositeChart({
        lang,
        chartA: compatAstro.a.chart,
        chartB: compatAstro.b.chart,
        nameA: nA,
        nameB: nB,
      })
    } catch (err) {
      logger.warn('[compat counselor] astro synastry failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // [Meta] 라인 — A/B 각자의 birthTimeUnknown / birthCityUnknown
  // 플래그 + location/timezone. system prompt 의 "[Meta] 의 ...=true
  // 면 인용 금지" 룰이 concrete 값에 매칭되게.
  const metaLines: string[] = []
  ;[person1Seed, person2Seed].forEach((seed, i) => {
    if (!seed) return
    const label = i === 0 ? 'A' : 'B'
    const raw = persons?.[i] as { time?: string; birthTimeUnknown?: boolean } | undefined
    const timeUnknown = !!raw?.birthTimeUnknown || !raw?.time || raw.time === '00:00'
    const cityUnknown = !!seed.source?.usedDefaultLocation
    // location/timezone 은 LLM 한테 직접 의미 없음 (이미 사주/점성 계산이
    // 적용된 결과만 전달). unknown 플래그만 가드 룰 위해 명시.
    metaLines.push(`[Meta] ${label}: timeUnknown=${timeUnknown}, cityUnknown=${cityUnknown}`)
  })
  const metaBlock = metaLines.join('\n')

  // 개별 신살 — 각자 타고난 self 신살 중 *cross 없는* personality 신살
  // (양인·귀문관·원진·고신·금여성·천덕/월덕귀인) 만 1인 1줄로. 도화·홍염·
  // 백호·괴강·천을귀인 은 sajuSynastryFormatter 가 양방향 cross 처리해
  // 중복 제거.
  // T2 fix: name 을 sanitize 후 prompt 에 삽입.
  const safeNameOf = (idx: number): string => {
    const raw = (persons?.[idx] as { name?: string } | undefined)?.name
    return raw ? sanitizeForXmlTagBoundary(raw).slice(0, 120) : ''
  }
  const personalShinsalLines = [
    formatPersonalShinsal(safeNameOf(0) ? `A(${safeNameOf(0)})` : 'A', compatSaju?.a.shinsal, lang),
    formatPersonalShinsal(safeNameOf(1) ? `B(${safeNameOf(1)})` : 'B', compatSaju?.b.shinsal, lang),
  ].filter(Boolean)
  const personalShinsalBlock = personalShinsalLines.length
    ? `${lang === 'en' ? '[Personal sinsal (self)]' : '[개별 신살 (self)]'}\n${personalShinsalLines.join('\n')}`
    : ''

  // 각 블록은 빈 string 일 수 있어 filter(Boolean) 으로 거름. join('\n')
  // 만으로 블록 사이 한 줄 띄움 (이전엔 prefix \n 추가해 빈 라인 중복).
  const cachedUserContext = [
    lang === 'en' ? `== Participants ==` : `== 참여자 정보 ==`,
    personsInfo,
    metaBlock,
    personalShinsalBlock,
    sajuSynastryBlock,
    astroSynastryBlock,
    compositeChartBlock,
    timeUnknownNotices,
  ]
    .filter(Boolean)
    .join('\n')

  // 궁합은 오로지 교차(synastry + 세운 cross). 1인 개별 타이밍 (세운/
  // 월운/일진·트랜짓·리턴) 은 "두 사람이 어떻게 얽히나"가 아니라 개인 운세라
  // 궁합 철학과 안 맞고 토큰만 먹어 제거. 관계 시기는 cached 의 사주
  // synastry 안 세운 cross 가 담당.
  void evidenceGuide
  // 호출자 이름은 cachedUserContext 밖에서 주입 — 이전엔 callerLine
  // 이 cached prefix 안에 들어가서 (a) 유저 간 prompt-cache 공유 불가,
  // (b) 이름 변경시 다음 세션 캐시 무효화. 이제 휘발성 userPrompt
  // prefix 라 차트 데이터만으로 캐시 안정.
  const callerLine = callerName
    ? lang === 'ko'
      ? `[호출자(질문자)] ${callerName} — 한국어로 답할 때 '${callerName}님'으로 호명한다.\n\n`
      : `[Caller] ${callerName} — address as 'Hi ${callerName},' naturally.\n\n`
    : ''
  const userPrompt = `${callerLine}${userQuestion}`

  return { systemPrompt, cachedUserContext, userPrompt, priorTurns }
}
