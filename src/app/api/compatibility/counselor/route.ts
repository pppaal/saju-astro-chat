import { NextRequest, NextResponse } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'
import type { Relation } from '../types'

// Inlined from the now-deleted routeSupportCommon (which served the
// retired results/narrative-stream flow). The counselor route is the
// only remaining caller. Keep in lockstep with Relation in ../types and
// the <select> in src/app/compatibility/components/form/PersonCard.tsx.
function relationLabel(locale: 'ko' | 'en', relation?: Relation, note?: string): string {
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
import { formatSajuSynastry } from '@/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

// Guest free trial — 2 turns of compatibility counselor before login wall
const GUEST_COMPAT_TURN_LIMIT = 2
const GUEST_COMPAT_TURN_COOKIE = 'guest_compat_counselor_turns'
const GUEST_COMPAT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const GUEST_COMPAT_RATE_LIMIT = { limit: 12, windowSeconds: 60 } as const

function readGuestCompatTurns(req: NextRequest): number {
  const raw = req.cookies.get(GUEST_COMPAT_TURN_COOKIE)?.value
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function buildGuestCompatTurnCookie(next: number): string {
  const parts = [
    `${GUEST_COMPAT_TURN_COOKIE}=${next}`,
    'Path=/',
    `Max-Age=${GUEST_COMPAT_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    'HttpOnly',
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

import {
  clampMessages,
  stringifyForPrompt,
  prunePromptContext,
  countObjectKeys,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  collectMissingSajuKeys,
  collectMissingAstroKeys,
  mergeSajuContext,
  mergeAstroContext,
  getAgeFromBirthDate,
} from './routeSupport'

// 개별(self) 신살 — 각자 타고난 신살은 extras.shinsal에 이미 계산돼 있으나
// self 블록이 voided라 궁합 프롬프트엔 안 들어가던 신호. 단, 전부 쏟으면
// 다시 노이즈가 되므로 *관계 해석에 유효한 특수 신살만* 화이트리스트로
// 큐레이션 + 짧은 뜻을 붙인다. 12신살(자리)은 synastry [12신살] cross가
// 다루고, 재능·재물·건강·삼재 신살은 궁합과 무관하므로 전부 제외.
const PILLAR_KO: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
const PERSONAL_SHINSAL_KEEP: Record<string, string> = {
  도화: '매력·이성 끌림',
  홍염살: '색기·끌림(외도 주의)',
  백호: '강렬·격정',
  괴강: '강한 카리스마·고집',
  양인: '날카로움·과격',
  귀문관: '집착·예민',
  원진: '미묘한 반감',
  고신: '고독 기질',
  금여성: '배우자 복·기품',
  천덕귀인: '보호·덕',
  월덕귀인: '보호·덕',
}

function formatPersonalShinsal(label: string, shinsal: unknown): string | null {
  if (!Array.isArray(shinsal) || shinsal.length === 0) return null
  const byKind = new Map<string, Set<string>>()
  for (const raw of shinsal) {
    const h = raw as { kind?: string; pillars?: string[] }
    if (!h?.kind || !(h.kind in PERSONAL_SHINSAL_KEEP)) continue
    const set = byKind.get(h.kind) ?? new Set<string>()
    for (const p of h.pillars ?? []) set.add(PILLAR_KO[p] ?? p)
    byKind.set(h.kind, set)
  }
  if (byKind.size === 0) return null
  const parts = [...byKind.entries()].map(([kind, ps]) => {
    const loc = [...ps].join('·')
    return `${kind}(${loc ? `${loc}, ` : ''}${PERSONAL_SHINSAL_KEEP[kind]})`
  })
  return `${label}: ${parts.join(' · ')}`
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: prefer authenticated guard (with credits) but fall
    // back to guest guard so first-time visitors can sample 2 turns before
    // the login wall — same pattern as destiny-map/chat-stream.
    const authedGuardOptions = createAuthenticatedGuard({
      route: 'compatibility-counselor',
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'compatibility',
      creditAmount: 1,
    })

    const guestGuardOptions: MiddlewareOptions = {
      route: 'compatibility-counselor-guest',
      rateLimit: {
        limit: GUEST_COMPAT_RATE_LIMIT.limit,
        windowSeconds: GUEST_COMPAT_RATE_LIMIT.windowSeconds,
      },
    }

    let prefersAuthedGuard = false
    try {
      const session = await getServerSession(authOptions)
      prefersAuthedGuard = Boolean(session?.user)
    } catch {
      prefersAuthedGuard = false
    }

    let initialized = await initializeApiContext(
      req,
      prefersAuthedGuard ? authedGuardOptions : guestGuardOptions
    )
    if (prefersAuthedGuard && initialized.error && initialized.error.status === 401) {
      initialized = await initializeApiContext(req, guestGuardOptions)
    }

    const { context, error } = initialized
    if (error) {
      return error
    }

    const isGuestMode = !context.userId

    // Guest free-trial gate
    let guestTurnsUsed = 0
    if (isGuestMode) {
      guestTurnsUsed = readGuestCompatTurns(req)
      if (guestTurnsUsed >= GUEST_COMPAT_TURN_LIMIT) {
        return createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message:
            '궁합 상담 무료 체험 2회를 모두 사용했어요. 로그인하면 가입 보너스 2 크레딧으로 계속 이용할 수 있어요.',
          locale: extractLocale(req),
          route: 'compatibility/counselor',
          headers: { 'X-Guest-Limit-Reached': '1' },
        })
      }
    }

    const rawBody = await req.json()
    const validationResult = compatibilityCounselorRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[compatibility/counselor] validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const {
      persons,
      person1Saju = null,
      person2Saju = null,
      person1Astro = null,
      person2Astro = null,
      fullContext,
      lang = context.locale,
      messages = [],
      cvText,
    } = validationResult.data

    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    if (lastUser && containsForbidden(lastUser.content)) {
      return createFallbackSSEStream({
        content: safetyMessage(lang),
        done: true,
      })
    }

    // Build raw saju + astro contexts. We hand the LLM raw chart tables
    // (saju pillars, natal planets/houses/aspects) and let it do its
    // own picking — previously we also fed it fusion scores, extended
    // saju/astro compatibility analyses, and a 9-layer couple matrix,
    // but those structured outputs were bleeding into the model's
    // response template and effectively duplicating work the LLM does
    // better itself.
    const person1Seed = buildPersonSeed((persons?.[0] as Record<string, unknown>) || null)
    const person2Seed = buildPersonSeed((persons?.[1] as Record<string, unknown>) || null)
    const now = new Date()
    const autoPerson1Saju = await buildAutoSajuContext(person1Seed, now)
    const autoPerson2Saju = await buildAutoSajuContext(person2Seed, now)
    const autoPerson1Astro = await buildAutoAstroContext(person1Seed, now)
    const autoPerson2Astro = await buildAutoAstroContext(person2Seed, now)
    const effectivePerson1Saju = mergeSajuContext(person1Saju, autoPerson1Saju)
    const effectivePerson2Saju = mergeSajuContext(person2Saju, autoPerson2Saju)
    const effectivePerson1Astro = mergeAstroContext(person1Astro, autoPerson1Astro)
    const effectivePerson2Astro = mergeAstroContext(person2Astro, autoPerson2Astro)
    const strictCompleteness =
      process.env.NODE_ENV !== 'test' && process.env.COMPATIBILITY_COUNSELOR_STRICT === 'true'
    const completenessMissing = [
      ...collectMissingSajuKeys('person1', effectivePerson1Saju),
      ...collectMissingSajuKeys('person2', effectivePerson2Saju),
      ...collectMissingAstroKeys('person1', effectivePerson1Astro),
      ...collectMissingAstroKeys('person2', effectivePerson2Astro),
    ]
    if (strictCompleteness && completenessMissing.length > 0) {
      logger.error('[compatibility/counselor] strict completeness failed', {
        missing: completenessMissing,
      })
      return createFallbackSSEStream({
        content:
          lang === 'ko'
            ? `필수 데이터 누락으로 리포트 생성을 중단했습니다. 누락: ${completenessMissing.join(', ')}`
            : `Report generation stopped due to missing required data: ${completenessMissing.join(', ')}`,
        done: true,
      })
    }
    if (!strictCompleteness && completenessMissing.length > 0) {
      logger.warn('[compatibility/counselor] continuing with partial context', {
        missing: completenessMissing,
      })
    }
    const p1Age = getAgeFromBirthDate(persons?.[0]?.date)
    const p2Age = getAgeFromBirthDate(persons?.[1]?.date)
    const timingDetails = {
      person1: extractTimingDetails(effectivePerson1Saju, p1Age, now),
      person2: extractTimingDetails(effectivePerson2Saju, p2Age, now),
    }

    // Raw chart context. Previously this was a pruned JSON dump of the
    // saju + natal objects (~25k chars even after PR #197's prunes).
    // 99% of the bytes were JSON quotes, brackets, and repeated key
    // names ("heavenlyStem", "earthlyBranch", "sibsin"...) that say
    // nothing to the model — the actual signal per character was tiny.
    //
    // Replaced with a flat, pipe-separated table form. Same info,
    // ~5× less tokens. The model reads pipes fine; we don't need a
    // visual table on the wire.
    //
    // If the caller supplies a pre-baked fullContext (legacy clients),
    // we still serialize that as JSON because we can't guarantee its
    // shape.
    const resolvedFullContext =
      fullContext ||
      ({
        persons,
        person1Saju: effectivePerson1Saju,
        person2Saju: effectivePerson2Saju,
        person1Astro: effectivePerson1Astro,
        person2Astro: effectivePerson2Astro,
      } as Record<string, unknown>)
    // Surface time-unknown flags as a header so the LLM can see which
    // sides should skip time-pillar / 일진 / ASC / MC / hour-dependent
    // signals. Without this the model just sees `time: 00:00` and
    // treats it as a real midnight birth.
    const personA = persons[0] as { timeUnknown?: boolean } | undefined
    const personB = persons[1] as { timeUnknown?: boolean } | undefined
    const unknownNotices: string[] = []
    if (personA?.timeUnknown) unknownNotices.push('# A 시간 미상.')
    if (personB?.timeUnknown) unknownNotices.push('# B 시간 미상.')

    // legacy fullContext 입력(있을 때)만 raw JSON으로 직렬화. self 블록이
    // 각 사람 raw + cross 다 cover하므로 fullContext가 없으면 fullContextText는
    // 빈 string — cached의 == 전체 raw 컨텍스트 == 섹션 자체가 생략됨.
    const fullContextText = fullContext
      ? stringifyForPrompt(prunePromptContext(resolvedFullContext))
      : [...unknownNotices].filter(Boolean).join('\n')
    const contextTrace = {
      currentDateIso: new Date().toISOString().slice(0, 10),
      hasDaeun: Boolean(timingDetails.person1.hasDaeun) || Boolean(timingDetails.person2.hasDaeun),
      hasSaeun: Boolean(timingDetails.person1.hasSaeun) || Boolean(timingDetails.person2.hasSaeun),
      hasWolun: Boolean(timingDetails.person1.hasWolun) || Boolean(timingDetails.person2.hasWolun),
      hasIlun: Boolean(timingDetails.person1.hasIlun) || Boolean(timingDetails.person2.hasIlun),
      timingCoverage: {
        person1: (timingDetails.person1.counts as Record<string, number>) || {},
        person2: (timingDetails.person2.counts as Record<string, number>) || {},
      },
      autoEnrichment: {
        person1: {
          hasSeed: !!person1Seed,
          hasAutoSaju: !!autoPerson1Saju,
          hasAutoAstro: !!autoPerson1Astro,
        },
        person2: {
          hasSeed: !!person2Seed,
          hasAutoSaju: !!autoPerson2Saju,
          hasAutoAstro: !!autoPerson2Astro,
        },
      },
      person1SajuKeys: countObjectKeys(effectivePerson1Saju),
      person2SajuKeys: countObjectKeys(effectivePerson2Saju),
      person1AstroKeys: countObjectKeys(effectivePerson1Astro),
      person2AstroKeys: countObjectKeys(effectivePerson2Astro),
      fullContextKeys: countObjectKeys(resolvedFullContext),
      strictCompleteness,
      missingFields: completenessMissing,
    }
    // contextTrace는 prompt에서 빠졌으므로 server-side 디버깅 용도로만 남긴다.
    logger.debug('[compatibility/counselor] context trace', { contextTrace })

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
    const priorTurns =
      lastUserIdxInDialog >= 0
        ? dialogTurns
            .slice(0, lastUserIdxInDialog)
            .map((m) => ({ role: m.role, content: guardText(m.content, 400) }))
        : []
    const rawUserQuestion = lastUser ? guardText(lastUser.content, 600) : ''
    // Prepend the user's attached file (if any) as XML-tagged context on the
    // current turn — same approach as the destiny counselor (realtime route).
    const attachmentText = typeof cvText === 'string' ? cvText.trim().slice(0, 8000) : ''
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
          const name = p.name || ''
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
            age != null
              ? normalizedLang === 'ko'
                ? ` (만 ${age}세 / 한국 ${age + 1}세)`
                : ` (age ${age})`
              : ''
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
    const systemPrompt =
      counselorLang === 'ko'
        ? [
            '아래 == 참여자 정보 == 블록의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다.',
            '',
            '말투: 다정하고 공감 능력 있는 따뜻한 멘토. 자연스러운 경어체 (해요체 기본, 필요시 합쇼체 섞기). 분석가 톤·진단서 X.',
            '',
            '규칙:',
            '- 중요도: == 시너스트리 == 의 [CRITICAL] 을 답의 중심으로, [참고] 는 가볍게 다루거나 생략.',
            '- 두 사람의 관계 역학에 답한다. 한 명만 분석하지 말 것.',
            '- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.',
            '- 두 데이터가 같은 방향을 가리킬 때 (예: A 사주 목 기운 강함 + A 점성 목성 확장기) 하나의 비유/스토리로 엮는다. 양쪽 따로 나열 X.',
            '- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.',
            '- [Meta] 의 birthTimeUnknown=true 면 그쪽 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true 면 그쪽 위치 의존 결론 금지.',
            '- AI/모델/상담사 정체 노출 금지.',
            '',
            '★ jargon 기본 금지 — 평소엔 raw 텍스트 그대로 인용 X:',
            '  - 한자 (甲乙丙... / 寅卯辰... / 未丑충 / 卯戌합 등) 출력 X',
            '  - 용어 (일간, 십성, 대운, 천을귀인, 트랜짓, 어스펙트, 하우스, 합·충·형·해, Conjunction·Square·Trine 등) 출력 X',
            '  - 데이터를 일상 한국어로 *완전 번역*해서 답:',
            '    · "未丑충" → "감정·생활 패턴이 부딪힘"',
            '    · "A 일간 辛 ↔ B 일간 甲, 금극목" → "A가 B를 정리·다듬는 결, B는 그게 따끔하게 느낄 수 있음"',
            '    · "Moon Conjunction Mars" → "감정과 욕망이 같은 결로 끌림"',
            '    · "천을귀인 발화" → "서로 보호해주는 흐름"',
            '',
            '★ 예외 — 사용자가 *직접 그 용어로 물으면* 답해도 됨:',
            '  - "A 일간 뭐야?" / "우리 Sun synastry 어때?" / "Moon square Mars는?" 같이',
            '    용어로 직접 물으면 그 용어 그대로 짧게 답. 회피하지 말 것.',
            '  - 일상어로 물었으면 (예: "우리 잘 맞아?") 답도 일상어로.',
            '',
            '답변 마지막에 *반드시* 다음 줄 정확한 형식으로 추가 (사용자에게 안 보이고 자동으로 후속 질문 버튼으로 렌더됨):',
            '||FOLLOWUP||["방금 답변 흐름의 자연스러운 후속 질문 1", "조금 다른 각도의 후속 질문 2"]',
            '  - 정확히 2개. JSON 문자열 배열. 각 25자 이내.',
            '  - "더 자세히", "구체적으로 설명해줘" 같은 generic 금지 — 방금 한 답변의 *내용* hook 으로.',
            '  - 두 사람 관계 맥락에서 다음 turn 이 자연스럽게 이어지도록.',
          ].join('\n')
        : [
            'Answer the user directly from the saju and astrology data in the == 참여자 정보 == block.',
            '',
            'Tone: warm, empathetic mentor. Conversational, not analytical or clinical.',
            '',
            'Rules:',
            '- Weighting: center the answer on the == 시너스트리 == [CRITICAL] lines; treat [참고] lightly or skip.',
            '- Answer about the relationship dynamic. Never analyze only one person.',
            '- Fuse saju and astrology in one flow. No system-split.',
            '- When the two systems point the same way for one side (e.g. A saju wood-growth + A Jupiter expansion), weave them into one metaphor/story, not parallel listings.',
            '- No markdown headers (##) or numbered lists. Plain prose paragraphs.',
            "- If [Meta] has birthTimeUnknown=true for a side: do not cite that side's hour pillar / 일진 / ASC / MC / houses. If birthCityUnknown=true: skip that side's place-dependent claims.",
            "- Never reveal you're an AI / model / counselor system.",
            '- Default to plain natural language (avoid jargon like day master, ten gods, daeun, transit, aspect, house). Use the data as evidence but translate it.',
            '- Exception: if the user asks *directly using a term* ("what\'s A\'s Sun sign?", "how about our Moon square?"), use the term and answer briefly. Don\'t dodge.',
            '',
            'At the very end of every reply, append *exactly* this line (auto-stripped + rendered as follow-up buttons; never shown to the user):',
            '||FOLLOWUP||["short follow-up tied to what you just said", "different angle follow-up"]',
            '  - Exactly 2 items. JSON string array. Each under 25 chars.',
            '  - No generic "tell me more" / "explain" — hook off the *content* of your reply.',
            '  - Bridge from the relationship context so the next turn flows naturally.',
          ].join('\n')

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
    try {
      const aP = (
        effectivePerson1Saju as {
          pillars?: Record<
            string,
            { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
          >
        } | null
      )?.pillars
      const bP = (
        effectivePerson2Saju as {
          pillars?: Record<
            string,
            { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
          >
        } | null
      )?.pillars
      if (aP && bP) {
        const toPair = (
          p: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } } | undefined
        ) => ({
          stem: p?.heavenlyStem?.name ?? '',
          branch: p?.earthlyBranch?.name ?? '',
        })
        const aDae = (
          effectivePerson1Saju as {
            daeWoon?: {
              current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number }
            } | null
          } | null
        )?.daeWoon?.current
        const bDae = (
          effectivePerson2Saju as {
            daeWoon?: {
              current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number }
            } | null
          } | null
        )?.daeWoon?.current
        sajuSynastryBlock = formatSajuSynastry({
          pillarsA: [toPair(aP.year), toPair(aP.month), toPair(aP.day), toPair(aP.time)],
          pillarsB: [toPair(bP.year), toPair(bP.month), toPair(bP.day), toPair(bP.time)],
          currentDaeunA: aDae
            ? { stem: aDae.heavenlyStem ?? '', branch: aDae.earthlyBranch ?? '', age: aDae.age }
            : null,
          currentDaeunB: bDae
            ? { stem: bDae.heavenlyStem ?? '', branch: bDae.earthlyBranch ?? '', age: bDae.age }
            : null,
          nameA: (persons?.[0] as { name?: string } | undefined)?.name ?? null,
          nameB: (persons?.[1] as { name?: string } | undefined)?.name ?? null,
        })
      }
    } catch (err) {
      logger.warn('[compat counselor] saju synastry failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
    if (person1Seed && person2Seed && process.env.NODE_ENV !== 'test') {
      try {
        const [Y1, M1, D1] = person1Seed.date.split('-').map(Number)
        const [h1, mi1] = person1Seed.time.split(':').map(Number)
        const [Y2, M2, D2] = person2Seed.date.split('-').map(Number)
        const [h2, mi2] = person2Seed.time.split(':').map(Number)
        if ([Y1, M1, D1, h1, mi1, Y2, M2, D2, h2, mi2].every(Number.isFinite)) {
          const [natalA, natalB] = await Promise.all([
            calculateNatalChart({
              year: Y1,
              month: M1,
              date: D1,
              hour: h1,
              minute: mi1,
              latitude: person1Seed.latitude,
              longitude: person1Seed.longitude,
              timeZone: person1Seed.timeZone,
            }),
            calculateNatalChart({
              year: Y2,
              month: M2,
              date: D2,
              hour: h2,
              minute: mi2,
              latitude: person2Seed.latitude,
              longitude: person2Seed.longitude,
              timeZone: person2Seed.timeZone,
            }),
          ])
          astroSynastryBlock = formatAstroSynastry({
            chartA: toChart(natalA),
            chartB: toChart(natalB),
            latA: person1Seed.latitude,
            lonA: person1Seed.longitude,
            latB: person2Seed.latitude,
            lonB: person2Seed.longitude,
            nameA: (persons?.[0] as { name?: string } | undefined)?.name ?? null,
            nameB: (persons?.[1] as { name?: string } | undefined)?.name ?? null,
          })
        }
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
      metaLines.push(
        `[Meta] ${label}: birthTimeUnknown=${timeUnknown}, birthCityUnknown=${cityUnknown}, location=${seed.latitude.toFixed(4)},${seed.longitude.toFixed(4)}, timezone=${seed.timeZone}`
      )
    })
    const metaBlock = metaLines.join('\n')

    // 개별 신살 — 각자 타고난 self 신살(백호·괴강·양인·도화 등)을 1인 1줄로.
    const personalShinsalLines = [
      formatPersonalShinsal(
        (persons?.[0] as { name?: string } | undefined)?.name
          ? `A(${(persons[0] as { name?: string }).name})`
          : 'A',
        (effectivePerson1Saju as { extras?: { shinsal?: unknown } } | null)?.extras?.shinsal
      ),
      formatPersonalShinsal(
        (persons?.[1] as { name?: string } | undefined)?.name
          ? `B(${(persons[1] as { name?: string }).name})`
          : 'B',
        (effectivePerson2Saju as { extras?: { shinsal?: unknown } } | null)?.extras?.shinsal
      ),
    ].filter(Boolean)
    const personalShinsalBlock = personalShinsalLines.length
      ? `[개별 신살 — 각자 타고난 것 (self)]\n${personalShinsalLines.join('\n')}`
      : ''

    const cachedUserContext = [
      `== 참여자 정보 ==`,
      personsInfo,
      metaBlock,
      personalShinsalBlock ? `\n${personalShinsalBlock}` : '',
      sajuSynastryBlock ? `\n${sajuSynastryBlock}` : '',
      astroSynastryBlock ? `\n${astroSynastryBlock}` : '',
      // legacy fullContext 또는 시간 미상 안내
      fullContextText ? `\n${fullContextText}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    // 궁합은 오로지 교차(synastry + 세운 cross). 1인 개별 타이밍
    // (formatTimingForPrompt 의 각자 세운/월운/일진·트랜짓·리턴)은 "두 사람이
    // 어떻게 얽히나"가 아니라 개인 운세라 궁합 철학과 안 맞고 토큰만 먹어 제거.
    // 관계 시기는 cached 의 사주 synastry 안 세운 cross 가 담당.
    void evidenceGuide
    const userPrompt = userQuestion

    try {
      return await streamClaudeAsSSE({
        systemPrompt,
        cachedUserContext,
        userPrompt,
        priorTurns,
        maxTokens: 3500,
        temperature: 0.7,
        timeoutMs: 80000,
        label: 'compatibility-counselor',
        // Mid-stream failures (empty completion / backend error) surface
        // inside the SSE body, not as a thrown error, so the catch below
        // never sees them. Refund the consumed credit here too. Guests
        // aren't credit-charged → refundCreditsOnError is absent → no-op.
        onFailure: context?.refundCreditsOnError
          ? async () => {
              try {
                await context?.refundCreditsOnError?.(
                  'compatibility-counselor stream delivered no content',
                  { route: 'compatibility-counselor' }
                )
              } catch (err) {
                logger.warn('[Compatibility Counselor] stream-failure refund failed', {
                  error: err instanceof Error ? err.message : String(err),
                })
              }
            }
          : undefined,
        additionalHeaders: {
          'X-Guest-Mode': isGuestMode ? '1' : '0',
          ...(isGuestMode
            ? {
                'Set-Cookie': buildGuestCompatTurnCookie(guestTurnsUsed + 1),
                'X-Guest-Turns-Remaining': String(
                  Math.max(0, GUEST_COMPAT_TURN_LIMIT - (guestTurnsUsed + 1))
                ),
              }
            : {}),
        },
      })
    } catch (claudeErr) {
      logger.error('[Compatibility Counselor] Claude error:', {
        error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
      })

      // Refund credit if Claude failed (authed users only)
      if (context?.refundCreditsOnError) {
        await context.refundCreditsOnError(
          `Claude error: ${claudeErr instanceof Error ? claudeErr.message : 'unknown'}`,
          { route: 'compatibility-counselor' }
        )
      }

      const fallback =
        lang === 'ko'
          ? 'AI \uC11C\uBC84 \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
      })
    }
  } catch (error) {
    logger.error('[Compatibility Counselor] Error:', { error: error })
    // We've been chasing a recurring generic "오류가 발생했습니다" on the
    // client and have no signal beyond "something threw inside the
    // route." Surface a *short* error tag (name + first 120 chars of
    // message) so the next failure shows up directly in the chat
    // bubble — no stack trace, no internals. Remove once stable.
    const errName = error instanceof Error ? error.name : 'UnknownError'
    const errMsg =
      error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
    return NextResponse.json(
      { error: 'Internal server error', errorTag: `${errName}: ${errMsg}` },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
