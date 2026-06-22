// src/lib/social/generateDrafts.ts
//
// 매일 "오늘의 카드" 소셜 초안 생성 — 결정론적 추첨(날짜 시드)으로 카드를 뽑고
// Claude 로 플랫폼별(Instagram/Threads/YouTube) 카피를 만든다. 데일리 타로와
// 같은 덱/역방향 확률을 써 제품과 결이 맞는다.
//
// CTA 링크는 무료 퍼널 허브(/free) — 소셜에서 들어온 사람이 로그인 없이 바로
// 무료 도구를 쓰게 한다. 발행은 어드민 승인 후(어댑터는 키 확보 뒤 연결).

import { createHash, randomUUID } from 'crypto'
import { tarotDeck } from '@/lib/tarot/data'
import { TAROT_REVERSED_BYTE_THRESHOLD } from '@/lib/tarot/reversedProbability'
import type { Card } from '@/lib/tarot/tarot.types'
import { callClaude, extractJsonObject, isClaudeAvailable } from '@/lib/llm/claude'
import { siteBaseUrl } from '@/lib/tarot/shareLink'
import { logger } from '@/lib/logger'
import type { SocialPostDraft, SocialVariant, SocialPlatform } from './types'

// KST 기준 "오늘" — 데일리 타로와 동일.
export function todayKeyKST(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

// 날짜의 순수 함수 — 같은 날은 항상 같은 카드(소셜 콘텐츠가 데일리 타로와
// 일관되게 흔들리지 않도록 결정론적). 데일리 타로 drawDaily 와 같은 산식이되
// 시드는 날짜만(전 사용자 공통 "오늘의 한 장").
function drawCardOfDay(date: string): { card: Card; isReversed: boolean } {
  const h = createHash('sha256').update(`social:${date}`).digest()
  const idx = h.readUInt32BE(0) % tarotDeck.length
  const isReversed = h[4] < TAROT_REVERSED_BYTE_THRESHOLD
  return { card: tarotDeck[idx], isReversed }
}

function buildPrompt(
  locale: 'ko' | 'en',
  cardName: string,
  isReversed: boolean,
  keywords: string[],
  ctaUrl: string
): { systemPrompt: string; userPrompt: string } {
  const orientation = isReversed
    ? locale === 'ko'
      ? '역방향'
      : 'reversed'
    : locale === 'ko'
      ? '정방향'
      : 'upright'
  const kw = keywords.slice(0, 6).join(', ')

  if (locale === 'ko') {
    return {
      systemPrompt: [
        '너는 사주·타로 브랜드 DestinyPal 의 소셜 콘텐츠 작가다. "오늘의 카드" 한 장으로',
        '인스타그램·쓰레드·유튜브 Shorts 용 게시물 초안을 만든다.',
        '규칙:',
        '- 따뜻한 해요체 존댓말. 반말 금지. 저주·공포 조장 금지(양면이 있되 희망을 남긴다).',
        '- 후크는 스크롤을 멈추게 하는 한 줄. 구체적 디테일 1개 + 살짝 양면의 여운.',
        '- 플랫폼 톤: 인스타=감성·짧게, 쓰레드=대화체·살짝 길게(질문 던지기), 유튜브=Shorts 대본(15~25초, 오프닝 훅→본문→CTA).',
        `- 모든 글 끝에 CTA 로 무료 링크를 자연스럽게: ${ctaUrl} (로그인 없이 무료).`,
        '- 해시태그는 한국어 운세/타로 태그 위주 5~8개(과하지 않게).',
        '반드시 아래 JSON 만 출력:',
        '{"hook":"공통 후크 한 줄",',
        '"instagram":{"caption":"감성 캡션(2~4문장)","hashtags":["#사주","#타로"]},',
        '"threads":{"caption":"대화체 글(질문 1개 포함)","hashtags":["#오늘의타로"]},',
        '"youtube":{"caption":"Shorts 제목","script":"15~25초 대본 (훅→본문→CTA)","hashtags":["#Shorts","#타로"]}}',
      ].join('\n'),
      userPrompt: [
        `오늘의 카드: ${cardName} (${orientation})`,
        kw ? `키워드: ${kw}` : '',
        '이 한 장으로 위 JSON 을 채워라. 각 플랫폼 톤을 분명히 다르게.',
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  return {
    systemPrompt: [
      'You are the social content writer for DestinyPal (Saju & tarot brand). From a single',
      '"card of the day", produce post drafts for Instagram, Threads, and YouTube Shorts.',
      'Rules:',
      '- Warm and encouraging. No doom or fear-mongering (acknowledge both sides, leave hope).',
      '- The hook is one scroll-stopping line: one concrete detail + a slight two-sided twist.',
      '- Platform tone: Instagram = aesthetic & short, Threads = conversational & a bit longer (ask a question), YouTube = a Shorts script (15-25s, hook -> body -> CTA).',
      `- End each with a natural CTA to the free link: ${ctaUrl} (free, no sign-up).`,
      '- 5-8 relevant tarot/astrology hashtags (not spammy).',
      'Output ONLY this JSON:',
      '{"hook":"shared one-line hook",',
      '"instagram":{"caption":"aesthetic caption (2-4 sentences)","hashtags":["#tarot"]},',
      '"threads":{"caption":"conversational post (include 1 question)","hashtags":["#tarot"]},',
      '"youtube":{"caption":"Shorts title","script":"15-25s script (hook->body->CTA)","hashtags":["#Shorts","#tarot"]}}',
    ].join('\n'),
    userPrompt: [
      `Card of the day: ${cardName} (${orientation})`,
      kw ? `Keywords: ${kw}` : '',
      'Fill the JSON above from this single card. Make each platform tone clearly different.',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

interface ParsedCopy {
  hook?: string
  instagram?: { caption?: string; hashtags?: unknown }
  threads?: { caption?: string; hashtags?: unknown }
  youtube?: { caption?: string; script?: string; hashtags?: unknown }
}

function cleanHashtags(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((t) => String(t).trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .slice(0, 8)
}

// 한 로케일의 초안 1건(플랫폼 3종 variant) 생성. Claude 실패/없음이면 null.
async function generateForLocale(
  date: string,
  locale: 'ko' | 'en'
): Promise<SocialPostDraft | null> {
  const { card, isReversed } = drawCardOfDay(date)
  const meaning = isReversed ? card.reversed : card.upright
  const keywords =
    locale === 'ko' ? meaning.keywordsKo || meaning.keywords || [] : meaning.keywords || []
  const cardName = locale === 'ko' ? card.nameKo || card.name : card.name
  const ctaUrl = `${siteBaseUrl()}/free`

  const { systemPrompt, userPrompt } = buildPrompt(locale, cardName, isReversed, keywords, ctaUrl)

  let parsed: ParsedCopy | null = null
  try {
    const { text } = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 900,
      temperature: 0.85,
      timeoutMs: 30000,
      label: 'social-drafts',
    })
    parsed = extractJsonObject<ParsedCopy>(text)
  } catch (error) {
    logger.error('[social/generate] Claude call failed', { locale, date, error })
    return null
  }
  if (!parsed) return null

  const mk = (
    platform: SocialPlatform,
    caption: string | undefined,
    hashtags: unknown,
    script?: string
  ): SocialVariant => ({
    platform,
    caption: (caption || '').trim(),
    hashtags: cleanHashtags(hashtags),
    ...(script ? { script: script.trim() } : {}),
  })

  const variants: SocialVariant[] = [
    mk('instagram', parsed.instagram?.caption, parsed.instagram?.hashtags),
    mk('threads', parsed.threads?.caption, parsed.threads?.hashtags),
    mk('youtube', parsed.youtube?.caption, parsed.youtube?.hashtags, parsed.youtube?.script),
  ]

  // 캡션이 하나도 안 나오면 쓸모없는 초안 — 저장하지 않는다.
  if (variants.every((v) => v.caption === '')) return null

  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    date,
    locale,
    cardName,
    cardImage: card.image,
    isReversed,
    hook: (parsed.hook || '').trim(),
    variants,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 하루치 초안 생성 — ko + en 각 1건(플랫폼 3종). Claude 없으면 빈 배열.
 * 저장은 호출부(draftStore.ensureDrafts/saveDrafts)가 담당.
 */
export async function generateDailyDrafts(
  date: string = todayKeyKST(),
  locales: Array<'ko' | 'en'> = ['ko', 'en']
): Promise<SocialPostDraft[]> {
  if (!isClaudeAvailable()) {
    logger.warn('[social/generate] Claude unavailable — skipping draft generation')
    return []
  }
  const results = await Promise.all(locales.map((loc) => generateForLocale(date, loc)))
  return results.filter((d): d is SocialPostDraft => d !== null)
}
