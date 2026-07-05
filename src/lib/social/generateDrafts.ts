// src/lib/social/generateDrafts.ts
//
// 매일 버티컬(타로·사주·점성·궁합·캘린더)별 소셜 초안 생성 — 소재는 전부
// 날짜 시드의 결정론(타로 카드 추첨, 사주 일진은 실제 엔진 계산)이고, Claude 는
// 그 소재를 플랫폼별(Instagram/Threads/YouTube) 카피로 푼다. "판단은 엔진,
// 언어만 LLM" 이라는 제품 철학이 소셜 콘텐츠에도 그대로 적용된다.
//
// CTA 링크는 버티컬별 무료 진입점 — 소셜에서 들어온 사람이 로그인 없이 바로
// 써보게 한다. 발행은 어드민 승인 후.

import { createHash, randomUUID } from 'crypto'
import { tarotDeck } from '@/lib/tarot/data'
import { TAROT_REVERSED_BYTE_THRESHOLD } from '@/lib/tarot/reversedProbability'
import type { Card } from '@/lib/tarot/tarot.types'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { STEMS, BRANCHES } from '@/lib/saju/constants'
import { callClaude, extractJsonObject, isClaudeAvailable } from '@/lib/llm/claude'
import { siteBaseUrl } from '@/lib/tarot/shareLink'
import { logger } from '@/lib/logger'
import {
  SOCIAL_CATEGORIES,
  type SocialCategory,
  type SocialPostDraft,
  type SocialVariant,
  type SocialPlatform,
} from './types'

// KST 기준 "오늘" — 데일리 타로와 동일.
export function todayKeyKST(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

// 날짜+카테고리 시드 해시 — 같은 날 같은 소재(결정론).
function seedHash(date: string, category: string): Buffer {
  return createHash('sha256').update(`social:${category}:${date}`).digest()
}

/* ===================== 카테고리별 소재 (결정론) ===================== */

interface Subject {
  /** 어드민 카드에 표시되는 소재명 (ko/en 공통 키는 ko 기준). */
  nameKo: string
  nameEn: string
  /** 프롬프트에 넘길 키워드/디테일. */
  keywordsKo: string[]
  keywordsEn: string[]
  /** 타로만 이미지 있음. */
  image?: string
  isReversed?: boolean
}

// 타로 — 기존 "오늘의 카드" 추첨 그대로 (데일리 타로와 같은 덱/역방향 확률).
// 시드는 구버전과 동일한 'social:${date}' 를 유지 — 같은 날 재생성해도 카드가
// 바뀌지 않도록 (소재 드리프트 방지).
function tarotSubject(date: string): Subject {
  const legacy = createHash('sha256').update(`social:${date}`).digest()
  const idx = legacy.readUInt32BE(0) % tarotDeck.length
  const isReversed = legacy[4] < TAROT_REVERSED_BYTE_THRESHOLD
  const card: Card = tarotDeck[idx]
  const meaning = isReversed ? card.reversed : card.upright
  return {
    nameKo: `${card.nameKo || card.name}${isReversed ? ' (역방향)' : ' (정방향)'}`,
    nameEn: `${card.name}${isReversed ? ' (reversed)' : ' (upright)'}`,
    keywordsKo: meaning.keywordsKo || meaning.keywords || [],
    keywordsEn: meaning.keywords || [],
    image: card.image,
    isReversed,
  }
}

// 사주 — 실제 엔진의 일진(日辰) 계산. 오늘의 간지 + 오행/음양.
const STEM_HANGUL = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const BRANCH_HANGUL = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const BRANCH_ANIMAL_KO = [
  '쥐',
  '소',
  '호랑이',
  '토끼',
  '용',
  '뱀',
  '말',
  '양',
  '원숭이',
  '닭',
  '개',
  '돼지',
]
const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}

function sajuSubject(date: string): Subject {
  const [y, m, d] = date.split('-').map(Number)
  const { stemIndex, branchIndex } = computeDayPillarIndices(y, m, d)
  const stem = STEMS[stemIndex]
  const branch = BRANCHES[branchIndex]
  const ganzhiKo = `${STEM_HANGUL[stemIndex]}${BRANCH_HANGUL[branchIndex]}`
  const ganzhiHanja = `${stem.name}${branch.name}`
  const animal = BRANCH_ANIMAL_KO[branchIndex]
  return {
    nameKo: `오늘의 일진 ${ganzhiKo}일 (${ganzhiHanja})`,
    nameEn: `Day pillar ${ganzhiHanja}`,
    keywordsKo: [
      `일간 ${STEM_HANGUL[stemIndex]} (${stem.element}·${stem.yin_yang})`,
      `일지 ${BRANCH_HANGUL[branchIndex]} (${branch.element}·${animal}띠 기운)`,
      `${stem.element} 기운의 하루`,
    ],
    keywordsEn: [
      `day stem ${stem.name} (${ELEMENT_EN[stem.element]})`,
      `day branch ${branch.name} (${ELEMENT_EN[branch.element]})`,
    ],
  }
}

// 점성 — 오늘의 스포트라이트 별자리 + 테마 (날짜 시드 추첨).
const ZODIAC = [
  { ko: '양자리', en: 'Aries' },
  { ko: '황소자리', en: 'Taurus' },
  { ko: '쌍둥이자리', en: 'Gemini' },
  { ko: '게자리', en: 'Cancer' },
  { ko: '사자자리', en: 'Leo' },
  { ko: '처녀자리', en: 'Virgo' },
  { ko: '천칭자리', en: 'Libra' },
  { ko: '전갈자리', en: 'Scorpio' },
  { ko: '사수자리', en: 'Sagittarius' },
  { ko: '염소자리', en: 'Capricorn' },
  { ko: '물병자리', en: 'Aquarius' },
  { ko: '물고기자리', en: 'Pisces' },
]
const ASTRO_THEMES = [
  { ko: '관계 운', en: 'relationships' },
  { ko: '일과 커리어', en: 'work & career' },
  { ko: '돈의 흐름', en: 'money flow' },
  { ko: '컨디션과 회복', en: 'energy & recovery' },
  { ko: '결정의 타이밍', en: 'timing a decision' },
]

function astrologySubject(date: string): Subject {
  const h = seedHash(date, 'astrology')
  const sign = ZODIAC[h.readUInt32BE(0) % ZODIAC.length]
  const theme = ASTRO_THEMES[h.readUInt32BE(4) % ASTRO_THEMES.length]
  return {
    nameKo: `오늘의 별자리 스포트라이트: ${sign.ko}`,
    nameEn: `Sign spotlight: ${sign.en}`,
    keywordsKo: [sign.ko, theme.ko, '출생차트', '트랜짓'],
    keywordsEn: [sign.en, theme.en, 'natal chart', 'transits'],
  }
}

// 궁합 — 오행/기질 조합 테마 (날짜 시드 추첨).
const COMPAT_THEMES = [
  {
    ko: '불(화)과 물(수)이 만나면 — 정반대 끌림의 정체',
    en: 'Fire meets Water — opposite attraction',
  },
  { ko: '목(木) 기운 커플 — 함께 자라는 관계의 조건', en: 'Two Wood energies — growing together' },
  {
    ko: '말은 잘 통하는데 자꾸 어긋나는 사이의 사주적 이유',
    en: 'Great talk, constant friction — the chart reason',
  },
  { ko: '연애 궁합과 결혼 궁합이 다른 이유', en: 'Dating chemistry vs marriage compatibility' },
  { ko: '싸울 때 스타일로 보는 오행 궁합', en: 'How you fight, by five elements' },
  { ko: '친구로는 최고, 연인으로는 글쎄? — 궁합의 두 얼굴', en: 'Best friends, tricky lovers' },
  {
    ko: '기념일마다 싸우는 커플의 시간 궁합',
    en: 'Why anniversaries spark fights — timing compatibility',
  },
  { ko: '첫인상 끌림은 일지(日支)가 결정한다?', en: 'First-sight chemistry and the day branch' },
]

function compatibilitySubject(date: string): Subject {
  const h = seedHash(date, 'compatibility')
  const theme = COMPAT_THEMES[h.readUInt32BE(0) % COMPAT_THEMES.length]
  return {
    nameKo: theme.ko,
    nameEn: theme.en,
    keywordsKo: ['궁합', '사주 커플 분석', '오행 상성'],
    keywordsEn: ['compatibility', 'synastry', 'five elements'],
  }
}

// 캘린더 — 운흐름 타이밍 테마 (요일감 + 날짜 시드 추첨).
const CALENDAR_THEMES = [
  {
    ko: '중요한 결정, 아무 날에나 하지 마세요 — 타이밍의 운',
    en: 'Big decisions deserve the right day',
  },
  {
    ko: '이번 주 에너지가 꺾이는 날과 올라오는 날',
    en: 'This week: your dip day and your peak day',
  },
  { ko: '계약·서명하기 좋은 날은 따로 있다', en: 'There is a better day to sign' },
  { ko: '고백/대화를 미뤄야 하는 날의 신호', en: 'Signals to postpone the big talk' },
  {
    ko: '월말마다 지치는 이유 — 운의 리듬 읽기',
    en: 'Why month-ends drain you — reading your rhythm',
  },
  { ko: '오늘 밀어붙일까, 하루 쉬어갈까', en: 'Push today or rest today?' },
]

function calendarSubject(date: string): Subject {
  const h = seedHash(date, 'calendar')
  const theme = CALENDAR_THEMES[h.readUInt32BE(0) % CALENDAR_THEMES.length]
  return {
    nameKo: theme.ko,
    nameEn: theme.en,
    keywordsKo: ['운세 캘린더', '타이밍', '대운·세운 흐름'],
    keywordsEn: ['fortune calendar', 'timing', 'luck cycles'],
  }
}

function subjectFor(category: SocialCategory, date: string): Subject {
  switch (category) {
    case 'tarot':
      return tarotSubject(date)
    case 'saju':
      return sajuSubject(date)
    case 'astrology':
      return astrologySubject(date)
    case 'compatibility':
      return compatibilitySubject(date)
    case 'calendar':
      return calendarSubject(date)
  }
}

// 버티컬별 무료 진입점 — 소셜 유입이 로그인 없이 바로 체험하는 URL.
function ctaPathFor(category: SocialCategory): string {
  switch (category) {
    case 'compatibility':
      return '/compatibility/free'
    case 'calendar':
      return '/calendar'
    default:
      return '/free'
  }
}

// 카테고리별 작가 지시 한 줄 — 소재를 어떤 각도로 풀지.
const CATEGORY_ANGLE_KO: Record<SocialCategory, string> = {
  tarot: '오늘의 카드 한 장이 건네는 메시지를 일상 장면 1개에 연결해라.',
  saju: '오늘의 일진(간지)의 기운을 "오늘 하루를 어떻게 쓰면 좋은지"로 풀어라. 미신처럼 단정하지 말고 리듬/컨디션 조언 톤.',
  astrology:
    '해당 별자리 독자가 "어 내 얘기네" 하고 멈추게, 구체적 상황 1개를 짚어라. 다른 별자리 독자도 재미있게.',
  compatibility:
    '연애/관계 공감 소재로 풀되, 이분법 단정 대신 "이런 조합은 이런 식으로 부딪히고 이렇게 풀린다"는 통찰을 담아라.',
  calendar:
    '"언제 하느냐"가 결과를 바꾼다는 타이밍 감각을 자극해라. 오늘/이번 주에 적용할 수 있는 행동 1개.',
}

const CATEGORY_ANGLE_EN: Record<SocialCategory, string> = {
  tarot: 'Tie the card of the day to one concrete everyday scene.',
  saju: 'Turn the day pillar energy into practical "how to use today" rhythm advice — no superstition, no doom.',
  astrology:
    'Make readers of that sign stop scrolling with one specific relatable situation; keep it fun for others too.',
  compatibility:
    'Relationship-relatable, but insightful: how this pairing clashes and how it resolves — no binary verdicts.',
  calendar:
    'Evoke the sense that WHEN you act changes outcomes; give one action applicable today or this week.',
}

// 카테고리별 해시태그 힌트.
const CATEGORY_TAGS_KO: Record<SocialCategory, string> = {
  tarot: '#타로 #오늘의타로 #타로카드 등',
  saju: '#사주 #오늘의운세 #일진 #사주팔자 등',
  astrology: '#별자리 #점성술 #별자리운세 등',
  compatibility: '#궁합 #연애운 #커플 #사주궁합 등',
  calendar: '#운세 #오늘의운세 #타이밍 #운세캘린더 등',
}

/* ===================== 프롬프트 ===================== */

function buildPrompt(
  locale: 'ko' | 'en',
  category: SocialCategory,
  subject: Subject,
  ctaUrl: string
): { systemPrompt: string; userPrompt: string } {
  if (locale === 'ko') {
    return {
      systemPrompt: [
        '너는 사주·타로 브랜드 DestinyPal 의 소셜 콘텐츠 작가다. 주어진 오늘의 소재로',
        '인스타그램·쓰레드·유튜브 Shorts 용 게시물 초안을 만든다.',
        '규칙:',
        '- 따뜻한 해요체 존댓말. 반말 금지. 저주·공포 조장 금지(양면이 있되 희망을 남긴다).',
        '- 후크는 스크롤을 멈추게 하는 한 줄. 구체적 디테일 1개 + 살짝 양면의 여운.',
        `- 콘텐츠 각도: ${CATEGORY_ANGLE_KO[category]}`,
        '- 플랫폼 톤: 인스타=감성·짧게, 쓰레드=대화체·살짝 길게(질문 던지기), 유튜브=Shorts 대본(15~25초, 오프닝 훅→본문→CTA).',
        `- 모든 글 끝에 CTA 로 무료 링크를 자연스럽게: ${ctaUrl} (로그인 없이 무료).`,
        `- 해시태그는 5~8개(과하지 않게): ${CATEGORY_TAGS_KO[category]}`,
        '반드시 아래 JSON 만 출력:',
        '{"hook":"공통 후크 한 줄",',
        '"instagram":{"caption":"감성 캡션(2~4문장)","hashtags":["#태그"]},',
        '"threads":{"caption":"대화체 글(질문 1개 포함)","hashtags":["#태그"]},',
        '"youtube":{"caption":"Shorts 제목","script":"15~25초 대본 (훅→본문→CTA)","hashtags":["#Shorts"]}}',
      ].join('\n'),
      userPrompt: [
        `오늘의 소재: ${subject.nameKo}`,
        subject.keywordsKo.length ? `디테일: ${subject.keywordsKo.slice(0, 6).join(', ')}` : '',
        '이 소재로 위 JSON 을 채워라. 각 플랫폼 톤을 분명히 다르게.',
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  return {
    systemPrompt: [
      'You are the social content writer for DestinyPal (Saju & tarot brand). From the given',
      'topic of the day, produce post drafts for Instagram, Threads, and YouTube Shorts.',
      'Rules:',
      '- Warm and encouraging. No doom or fear-mongering (acknowledge both sides, leave hope).',
      '- The hook is one scroll-stopping line: one concrete detail + a slight two-sided twist.',
      `- Content angle: ${CATEGORY_ANGLE_EN[category]}`,
      '- Platform tone: Instagram = aesthetic & short, Threads = conversational & a bit longer (ask a question), YouTube = a Shorts script (15-25s, hook -> body -> CTA).',
      `- End each with a natural CTA to the free link: ${ctaUrl} (free, no sign-up).`,
      '- 5-8 relevant hashtags (not spammy).',
      'Output ONLY this JSON:',
      '{"hook":"shared one-line hook",',
      '"instagram":{"caption":"aesthetic caption (2-4 sentences)","hashtags":["#tarot"]},',
      '"threads":{"caption":"conversational post (include 1 question)","hashtags":["#tarot"]},',
      '"youtube":{"caption":"Shorts title","script":"15-25s script (hook->body->CTA)","hashtags":["#Shorts"]}}',
    ].join('\n'),
    userPrompt: [
      `Topic of the day: ${subject.nameEn}`,
      subject.keywordsEn.length ? `Details: ${subject.keywordsEn.slice(0, 6).join(', ')}` : '',
      'Fill the JSON above from this topic. Make each platform tone clearly different.',
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

// 한 (카테고리 × 로케일) 초안 1건(플랫폼 3종 variant) 생성. Claude 실패면 null.
async function generateOne(
  date: string,
  category: SocialCategory,
  locale: 'ko' | 'en'
): Promise<SocialPostDraft | null> {
  const subject = subjectFor(category, date)
  const ctaUrl = `${siteBaseUrl()}${ctaPathFor(category)}`
  const { systemPrompt, userPrompt } = buildPrompt(locale, category, subject, ctaUrl)

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
    logger.error('[social/generate] Claude call failed', { category, locale, date, error })
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
    category,
    cardName: locale === 'ko' ? subject.nameKo : subject.nameEn,
    cardImage: subject.image || '',
    isReversed: subject.isReversed ?? false,
    hook: (parsed.hook || '').trim(),
    variants,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 하루치 초안 생성 — (카테고리 5종 × ko/en) 최대 10건. Claude 없으면 빈 배열.
 * 저장은 호출부(draftStore.ensureDrafts/saveDrafts)가 담당.
 */
export async function generateDailyDrafts(
  date: string = todayKeyKST(),
  locales: Array<'ko' | 'en'> = ['ko', 'en'],
  categories: readonly SocialCategory[] = SOCIAL_CATEGORIES
): Promise<SocialPostDraft[]> {
  if (!isClaudeAvailable()) {
    logger.warn('[social/generate] Claude unavailable — skipping draft generation')
    return []
  }
  const jobs: Array<Promise<SocialPostDraft | null>> = []
  for (const category of categories) {
    for (const loc of locales) {
      jobs.push(generateOne(date, category, loc))
    }
  }
  const results = await Promise.all(jobs)
  const drafts = results.filter((d): d is SocialPostDraft => d !== null)
  logger.info('[social/generate] generated', {
    date,
    requested: jobs.length,
    created: drafts.length,
  })
  return drafts
}
