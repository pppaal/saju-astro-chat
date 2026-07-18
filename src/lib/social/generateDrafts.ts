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
import { cardSlug } from '@/lib/tarot/cardPages'
import { TAROT_REVERSED_BYTE_THRESHOLD } from '@/lib/tarot/reversedProbability'
import type { Card } from '@/lib/tarot/tarot.types'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { STEMS, BRANCHES } from '@/lib/saju/constants'
import { computeAllZodiacDaily } from '@/lib/fortune/zodiacDaily'
import { callClaude, extractJsonObject, isClaudeAvailable } from '@/lib/llm/claude'
import { siteBaseUrl } from '@/lib/tarot/shareLink'
import { socialCardImageUrl } from './cardImageUrl'
import { ensureDailyBackgrounds } from './aiImage'
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
  /** 카드 배경 글리프(한자/간지) — 버티컬 정체성을 시각화하는 워터마크. */
  glyph?: string
  /** 소재별 딥링크 — 있으면 카테고리 기본 CTA(ctaPathFor)보다 우선.
   *  예: 타로 = 그날 카드의 의미 사전 페이지, 띠운세 = /fortune. */
  ctaPath?: string
}

// 오행(한글) → 한자. 카드 글리프·강조에 쓴다.
const ELEMENT_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

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
    // 그날 카드의 의미 사전 페이지로 딥링크 — 포스트 주제와 착지 페이지가
    // 정확히 일치해 이탈이 적고, 사전 페이지의 무료 데일리 훅으로 이어진다.
    ctaPath: `/tarot/cards/${cardSlug(card.name)}`,
  }
}

// 띠운세 — /fortune 데일리 엔진(일진 × 띠 합충)을 그대로 소재로 쓴다.
// 오늘 가장 잘 풀리는 띠(합)와 조심할 띠(충)를 콕 집으면 독자가 자기/친구
// 띠를 찾게 되고, 태그·공유로 번진다. 판정은 엔진(결정론), 카피만 Claude.
function zodiacSubject(date: string): Subject {
  // KST 정오 — 날짜 경계 이슈 없이 해당 달력일의 일진을 가리킨다.
  const all = computeAllZodiacDaily(new Date(`${date}T12:00:00+09:00`))
  const best = [...all].sort((a, b) => b.grade - a.grade)[0]
  const worst = [...all].sort((a, b) => a.grade - b.grade)[0]
  const day = all[0]
  return {
    nameKo: `${best.animal.ko} 맑음 · ${worst.animal.ko} 주의 (${day.dayGanzhi.ko})`,
    nameEn: `${best.animal.en} rising · ${worst.animal.en} caution (${day.dayGanzhi.hanja})`,
    keywordsKo: [
      `오늘 일진 ${day.dayGanzhi.ko}(${day.dayGanzhi.hanja})`,
      `${best.animal.ko} ${best.gradeLabel.ko}: ${best.message.ko}`,
      `${best.animal.ko} 조언: ${best.advice.ko}`,
      `${worst.animal.ko} ${worst.gradeLabel.ko}: ${worst.message.ko}`,
      `${worst.animal.ko} 조언: ${worst.advice.ko}`,
    ],
    keywordsEn: [
      `Day pillar ${day.dayGanzhi.hanja}`,
      `${best.animal.en} (${best.gradeLabel.en}): ${best.message.en}`,
      `${best.animal.en} advice: ${best.advice.en}`,
      `${worst.animal.en} (${worst.gradeLabel.en}): ${worst.message.en}`,
      `${worst.animal.en} advice: ${worst.advice.en}`,
    ],
    glyph: day.dayGanzhi.hanja.slice(1), // 일진 지지 한자 — 띠 정체성 워터마크
    ctaPath: '/fortune',
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
// 지지 → 영어 띠 동물. "Water-Snake day (癸巳)" 처럼 영어 독자용 일진 명칭에 쓴다.
const BRANCH_ANIMAL_EN = [
  'Rat',
  'Ox',
  'Tiger',
  'Rabbit',
  'Dragon',
  'Snake',
  'Horse',
  'Goat',
  'Monkey',
  'Rooster',
  'Dog',
  'Pig',
]

function sajuSubject(date: string): Subject {
  const [y, m, d] = date.split('-').map(Number)
  const { stemIndex, branchIndex } = computeDayPillarIndices(y, m, d)
  const stem = STEMS[stemIndex]
  const branch = BRANCHES[branchIndex]
  const ganzhiKo = `${STEM_HANGUL[stemIndex]}${BRANCH_HANGUL[branchIndex]}`
  const ganzhiHanja = `${stem.name}${branch.name}`
  const animal = BRANCH_ANIMAL_KO[branchIndex]
  const dayNameEn = `${ELEMENT_EN[stem.element]}-${BRANCH_ANIMAL_EN[branchIndex]} day (${ganzhiHanja})`
  return {
    nameKo: `오늘의 일진 ${ganzhiKo}일 (${ganzhiHanja})`,
    nameEn: dayNameEn,
    glyph: ganzhiHanja,
    keywordsKo: [
      `일간 ${STEM_HANGUL[stemIndex]} (${stem.element}·${stem.yin_yang})`,
      `일지 ${BRANCH_HANGUL[branchIndex]} (${branch.element}·${animal}띠 기운)`,
      `${stem.element} 기운의 하루`,
    ],
    keywordsEn: [
      // 영어 독자용 완성 명칭을 그대로 공급 — 모델이 한자만 보고 직접 지어내면
      // 한자 오프닝/오역이 난다. 카피에는 이 이름을 쓰고 한자는 괄호 1회.
      dayNameEn,
      `day stem ${stem.name} (${ELEMENT_EN[stem.element]})`,
      `day branch ${branch.name} (${ELEMENT_EN[branch.element]}, ${BRANCH_ANIMAL_EN[branchIndex]} energy)`,
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
  // JDN 순환 — 별자리는 12일 주기(jdn%12), 테마는 5일 주기(jdn%5)로 각각 매일 돈다.
  // 12·5 는 서로소라 (별자리×테마) 조합은 60일 동안 겹치지 않는다.
  // (예전엔 테마가 floor(jdn/12) 라 12일 내리 같은 테마가 떠서 피드가 "돈 얘기만" 반복됐다)
  const [y, m, d] = date.split('-').map(Number)
  const { jdn } = computeDayPillarIndices(y, m, d)
  const sign = ZODIAC[jdn % ZODIAC.length]
  const theme = ASTRO_THEMES[jdn % ASTRO_THEMES.length]
  return {
    nameKo: `오늘의 별자리 스포트라이트: ${sign.ko}`,
    nameEn: `Sign spotlight: ${sign.en}`,
    glyph: '星',
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
  {
    ko: '금(金) 기운 애인의 사랑 표현법 — 무뚝뚝이 아니라 단단함',
    en: 'How Metal partners show love',
  },
  { ko: '토(土) 기운 파트너 — 느린 대신 안 떠나는 사람', en: 'Earth partners: slow but steady' },
  {
    ko: '연상연하 궁합, 나이차보다 중요한 한 가지',
    en: 'Age-gap couples: what matters more than years',
  },
  {
    ko: '권태기가 빨리 오는 조합 vs 오래 가는 조합',
    en: 'Pairings that burn out vs pairings that last',
  },
  { ko: '헤어졌다 다시 만나는 커플의 사주 공통점', en: 'Charts of on-again off-again couples' },
  { ko: '결혼 시기 궁합 — 언제 만났느냐가 반이다', en: 'Marriage timing: when you met matters' },
  { ko: '돈 문제로 싸우는 커플의 오행 조합', en: 'Money fights, by element pairing' },
  { ko: '표현이 서툰 커플을 위한 오행별 사랑의 언어', en: 'Love languages, by five elements' },
  { ko: '장거리 연애를 버티는 사주 조합', en: 'Pairings that survive long distance' },
  {
    ko: '부모님이 반대하는 궁합, 진짜 나쁜 걸까?',
    en: 'When families disapprove — is the match bad?',
  },
  { ko: '친구에서 연인이 되는 조합의 특징', en: 'Friends-to-lovers pairings' },
  { ko: '일 궁합과 연애 궁합은 다르다 — 동업 커플 주의보', en: 'Work chemistry vs love chemistry' },
  { ko: '질투가 많은 조합, 신뢰가 쌓이는 조합', en: 'Jealous pairings vs trusting pairings' },
  { ko: '말다툼 후 화해가 빠른 커플의 비밀', en: 'Couples who make up fast — the chart reason' },
  { ko: '서로의 운을 끌어올리는 상생 커플', en: "Couples who raise each other's luck" },
  {
    ko: '띠 궁합은 미신일까 과학일까 — 지지 육합 이야기',
    en: 'Zodiac-animal matching: myth or method?',
  },
]

function compatibilitySubject(date: string): Subject {
  // JDN 순환 — 24일 동안 같은 소재가 두 번 나오지 않는다.
  const [y, m, d] = date.split('-').map(Number)
  const { jdn } = computeDayPillarIndices(y, m, d)
  const theme = COMPAT_THEMES[jdn % COMPAT_THEMES.length]
  return {
    nameKo: theme.ko,
    nameEn: theme.en,
    glyph: '緣',
    keywordsKo: ['궁합', '사주 커플 분석', '오행 상성'],
    keywordsEn: ['compatibility', 'synastry', 'five elements'],
  }
}

// 캘린더 — 실제 일진 오행(엔진 계산)을 "오늘의 타이밍"으로 푼다. 사주
// 카테고리와 같은 60갑자 소스지만, 각도가 다르다: 사주=기운 해설,
// 캘린더=행동 타이밍("오늘 뭘 하기 좋은 날인가"). 앵글 12개 × 오행 5 = 매일 조합이 달라짐.
const ELEMENT_TIMING_KO: Record<string, string> = {
  목: '시작·기획·새 대화에 유리한',
  화: '발표·홍보·밀어붙이기에 유리한',
  토: '정리·계약 검토·기반 다지기에 유리한',
  금: '결단·마무리·끊어내기에 유리한',
  수: '조사·공부·소통 준비에 유리한',
}
const CALENDAR_ANGLES = [
  { ko: '중요한 결정을 내리기 좋은가', en: 'a day for big decisions?' },
  { ko: '계약·서명 타이밍', en: 'signing & contracts timing' },
  { ko: '고백·솔직한 대화 타이밍', en: 'timing the honest talk' },
  { ko: '쉬어가야 하는 신호', en: 'signals to rest' },
  { ko: '돈 쓰기 vs 아끼기', en: 'spend or save today' },
  { ko: '새 일 시작하기', en: 'starting something new' },
  { ko: '관계 회복의 타이밍', en: 'mending a relationship' },
  { ko: '이직·면접 같은 승부수', en: 'bold career moves' },
  { ko: '건강 리듬 점검', en: 'checking your energy rhythm' },
  { ko: '미뤄둔 일 처리하기', en: 'clearing the backlog' },
  { ko: '만남과 약속 잡기', en: 'scheduling meetings & dates' },
  { ko: '한 주 계획 세우기', en: 'planning the week ahead' },
]

function calendarSubject(date: string): Subject {
  const [y, m, d] = date.split('-').map(Number)
  const { jdn, stemIndex, branchIndex } = computeDayPillarIndices(y, m, d)
  const stem = STEMS[stemIndex]
  const ganzhiKo = `${STEM_HANGUL[stemIndex]}${BRANCH_HANGUL[branchIndex]}`
  const angle = CALENDAR_ANGLES[jdn % CALENDAR_ANGLES.length]
  const timing = ELEMENT_TIMING_KO[stem.element] || ''
  const calDayNameEn = `${ELEMENT_EN[stem.element]}-${BRANCH_ANIMAL_EN[branchIndex]} day`
  return {
    nameKo: `오늘(${ganzhiKo}일)은 ${angle.ko}? — ${stem.element}(${ELEMENT_EN[stem.element]}) 기운`,
    // 카드 제목이 그대로 노출되므로 영어 독자가 읽을 수 있는 이름으로
    // ("Today (壬辰): …" 처럼 한자가 제목에 박히던 것 교체).
    nameEn: `${calDayNameEn}: ${angle.en}`,
    glyph: ELEMENT_HANJA[stem.element] || '運',
    keywordsKo: [
      `오늘은 ${stem.element} 기운이 ${timing} 날`,
      `일진 ${ganzhiKo}`,
      '운세 캘린더로 나에게 맞는 날 확인',
    ],
    keywordsEn: [
      `${calDayNameEn} (${stem.name}${BRANCHES[branchIndex].name})`,
      `${ELEMENT_EN[stem.element]} day energy`,
      'personal fortune calendar',
    ],
  }
}

// 테스트/드라이런 seam — 프롬트·소재 조립을 LLM 호출 없이 검증할 수 있게 export.
export function subjectFor(category: SocialCategory, date: string): Subject {
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
    case 'zodiac':
      return zodiacSubject(date)
  }
}

// 버티컬별 무료 진입점 — 소셜 유입이 로그인 없이 바로 체험하는 URL.
function ctaPathFor(category: SocialCategory): string {
  switch (category) {
    case 'compatibility':
      return '/compatibility/free'
    case 'calendar':
      return '/calendar'
    case 'zodiac':
      return '/fortune'
    default:
      return '/free'
  }
}

// 카테고리별 작가 지시 한 줄 — 소재를 어떤 각도로 풀지.
const CATEGORY_ANGLE_KO: Record<SocialCategory, string> = {
  tarot:
    '카드를 "요새 이런 사람" 캐릭터로 세워라 — 카드 이름을 제목처럼 앞세우지 말고, 딱 집히는 행동/상황 1개로 열고 카드는 그 정체를 밝히는 근거로 뒤에 붙여라(예: 펜타클 시종 = 강의만 저장해두고 시작은 안 하는 사람). 두루뭉술한 덕담·바넘 금지, "어 내 얘긴데" 소리 나오게.',
  saju: '오늘의 일진(간지) 기운을 "오늘 왜 유독 이런 컨디션/기분인지" 짚어 "아 그래서 오늘 이랬구나" 싶게 풀어라. 미신처럼 단정 금지, 리듬/컨디션 조언 톤. 오늘 같은 하루 보낸 사람이 "내 얘기네" 하고 저장·공유하게.',
  astrology:
    '해당 별자리 독자가 "어 내 얘기네" 하고 멈추게, 구체적 상황 1개를 짚어라. 다른 별자리 독자도 재미있게.',
  compatibility:
    '연애/관계 공감 소재로 풀되, 이분법 단정 대신 "이런 조합은 이런 식으로 부딪히고 이렇게 풀린다"는 통찰을 담아라.',
  calendar:
    '"오늘은 이걸 하기 좋은 날 / 이건 미루는 게 나은 날"을 딱 하나 짚어 스크린샷하고 싶게 만들어라. 오늘·이번 주 바로 쓸 행동 1개. "오늘 이거 하려던 사람 잠깐!" 같은 가벼운 타이밍 알림 톤(겁주지 말 것).',
  zodiac:
    '오늘 가장 잘 풀리는 띠 하나와 조심할 띠 하나를 콕 집어라 — 독자가 자기 띠부터 찾고, 해당 띠 친구를 태그하게. "말띠 오늘 미뤄둔 부탁 꺼내기 좋은 날" 처럼 행동 1개로 구체화. 단정 대신 흐름 표현, 겁주지 말 것. 나머지 띠는 링크에서 확인하게 궁금증만 남겨라.',
}

const CATEGORY_ANGLE_EN: Record<SocialCategory, string> = {
  tarot:
    'Cast the card as a "that person who…" character — do not lead with the card name like a headline; open with one sharp behavior/scene and reveal the card as the reason (e.g. Page of Pentacles = keeps saving courses but never starting). No vague fortune-cookie/Barnum lines; make readers go "that is literally me."',
  saju: 'Turn the day pillar energy into a "so THAT is why today felt like this" read — practical rhythm/energy advice, no superstition, no doom. Make people who had the same kind of day go "this is me" and save/share it.',
  astrology:
    'Make readers of that sign stop scrolling with one specific relatable situation; keep it fun for others too.',
  compatibility:
    'Relationship-relatable, but insightful: how this pairing clashes and how it resolves — no binary verdicts.',
  calendar:
    'Pin one thing that is "a good day to do X / better to hold off on Y" so it is screenshot-worthy. One action for today or this week. A light timing-alert tone ("about to do this today? hold on —"), never scary.',
  zodiac:
    'Call out today\'s luckiest zodiac animal and the one that should take care — make readers hunt for their own sign and tag a friend born in that year. Anchor each with ONE concrete action ("born in a Horse year? today\'s the day to ask that favor"). Flow language, never doom; leave the other signs as a curiosity gap for the link.',
}

// 카테고리별 해시태그 힌트 — *실제로 검색량 있는 기존 태그*만 나열한다.
// 모델이 태그를 지어내는 걸(#moneylove 같은 검색 0 합성어) 막는 anchor.
const CATEGORY_TAGS_KO: Record<SocialCategory, string> = {
  tarot: '#타로 #오늘의타로 #타로카드 #타로리딩 등',
  saju: '#사주 #오늘의운세 #일진 #사주팔자 #운세 등',
  astrology: '#별자리 #점성술 #별자리운세 #오늘의운세 등',
  compatibility: '#궁합 #연애운 #사주궁합 #연애 #커플 등',
  calendar: '#운세 #오늘의운세 #운세캘린더 #타이밍 등',
  zodiac: '#띠별운세 #오늘의운세 #12간지 #일진 등',
}
const CATEGORY_TAGS_EN: Record<SocialCategory, string> = {
  tarot: '#tarot #dailytarot #tarotreading #tarotcards etc.',
  saju: '#koreanastrology #saju #astrology #dailyhoroscope etc.',
  astrology: '#astrology #horoscope #zodiacsigns #dailyhoroscope etc.',
  compatibility:
    '#zodiaccompatibility #astrologycompatibility #relationships #koreanastrology etc.',
  calendar: '#astrology #dailyhoroscope #horoscope #koreanastrology etc.',
  zodiac: '#chinesezodiac #zodiacsigns #dailyhoroscope #koreanastrology etc.',
}

/* ===================== 프롬프트 ===================== */

export function buildPrompt(
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
        '- 저주·공포 조장 금지(양면이 있되 희망을 남긴다). 놀림·명령·비난 금지.',
        '- 후크는 스크롤을 멈추게 하는 한 줄. 구체적 디테일 1개 + 살짝 양면의 여운. *공백 포함 50자 이내의 완결된 문장* — 카드 이미지에 그대로 박혀서 길면 중간에 잘린다("…"로 끝나는 카드는 실패작).',
        `- 콘텐츠 각도: ${CATEGORY_ANGLE_KO[category]}`,
        '- 인스타 톤(중요): 광고 카피 말투·클리셰("반전은요?", "~의 비밀", "지금 확인해보세요") 금지. 첫 문장이 전부다 — 피드에선 첫 줄까지만 보이니, 구체적 행동/상황 1개로 열어 "더보기"를 누르게 하라. 따뜻한 해요체 2~4문장, 1~2문장마다 줄바꿈. 소재의 간지/카드명/오행을 그대로 써서 "어떻게 알았지" 느낌을 준다. 마지막은 저장하고 싶어지는 실용 한 줄 또는 가벼운 질문 1개.',
        '- 쓰레드 톤(중요): 브랜드 광고 말투 절대 금지. *반말 구어체*로, 친구한테 톡 보내듯 툭 던진다(ㅋㅋ·물음표·이모지 자연스럽게). 인스타(해요체)와 확실히 다르게.',
        '  · *저격/팩폭 훅*으로 시작해 스크롤을 멈춘다 — "지금 딱 한 명 떠올랐지?", "이거 보고 찔렸으면 조용히 하트." 처럼 콕 집어라. 단 조롱·저주·인신공격은 금지(찔리되 기분 나쁘지 않게).',
        '  · 1~2문장마다 줄바꿈해 리듬을 만든다(문단 덩어리 금지).',
        '  · 소재의 구체 수치/간지/카드명/오행을 그대로 써서 "이거 어떻게 알았지" 느낌을 준다.',
        '  · 본문에 URL/링크 절대 금지 — 링크가 있으면 도달이 눌린다. "프사 링크"로만 유도.',
        '  · 다 읽고 "이거 ○○한테 보내야겠다" 싶게, 특정한 사람이 떠오르는 한 줄을 꼭 넣어라(공유 트리거).',
        '  · 마지막에 반말 참여 유도 1개(예: "넌 불이야 물이야? 댓글 ㄱㄱ").',
        '  · 캡션은 해시태그 제외 420자 이내로 짧게(줄바꿈 포함). 길면 스크롤에서 진다.',
        '- 유튜브 톤: Shorts 대본(15~25초, 오프닝 훅→본문→CTA).',
        `- CTA: 유튜브 대본에만 "${ctaUrl} (로그인 없이 무료)". 인스타·쓰레드 본문엔 URL 금지 — 인스타 캡션 링크는 클릭이 안 돼 스팸처럼 보일 뿐이다. 둘 다 "프로필 링크에서 무료로" 식으로만 유도.`,
        `- 해시태그(인스타 5~8개): 사람들이 *실제로 검색하는 기존 태그만*. 지어낸 합성 태그 금지, 이 포스트 주제와 무관한 태그 금지(예: 궁합 포스트에 #타로). 대형 태그 2~3개 + 카테고리 태그 2~3개: ${CATEGORY_TAGS_KO[category]}. 특정 별자리/띠를 다루면 그 태그(#사수자리 #말띠)도 포함. 쓰레드는 0~1개만(도배는 스팸), 유튜브 #Shorts.`,
        '반드시 아래 JSON 만 출력:',
        '{"hook":"공통 후크 한 줄",',
        '"instagram":{"caption":"감성 캡션(2~4문장)","hashtags":["#태그"]},',
        '"threads":{"caption":"반말 저격 구어체(공유 트리거 + 참여 질문 1개)","hashtags":["#태그"]},',
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
      '- Warm and encouraging. No doom or fear-mongering (acknowledge both sides, leave hope). No mockery, no commands.',
      '- The hook is one scroll-stopping line: one concrete detail + a slight two-sided twist. *A complete sentence within 60 characters* — it is printed verbatim on the card image, and anything longer gets chopped mid-thought (a card ending in "…" is a failed card).',
      `- Content angle: ${CATEGORY_ANGLE_EN[category]}`,
      '- English-first naming: write the day pillar as its element-animal English name with the hanja in parentheses at most once — "Water-Snake day (癸巳)" — and NEVER open the post with raw hanja (western readers cannot read it). Zodiac animals: "Ox-year people" / "born in an Ox year" — never "ox people"/"pig people" (reads wrong in English).',
      '- Instagram tone (important): NOT brand-ad copy — ban clichés ("The plot twist?", "Here\'s the secret", "Ready to find out?"). The first line is everything (the feed truncates after it): open with one concrete behavior/scene that makes people tap "more". 2-4 short sentences, line break every 1-2 sentences. Use the concrete detail (day pillar, card name, element, sign) verbatim so it reads "how did it know". End with one save-worthy practical line or one light question.',
      '- Threads tone (important): NOT brand-ad voice. Lowercase, blunt, a little savage — Co-Star style. Call the reader out.',
      '  - Open with a spiky call-out hook that stops the scroll ("you already know who you just thought of.", "if this stung, just quietly like and keep scrolling."). Called-out but never cruel — no mockery or doom.',
      '  - Break lines every 1-2 sentences for rhythm (no dense paragraphs).',
      '  - Use the concrete detail (day pillar, card name, element) so it reads "how did it know," not generic.',
      '  - Never put a URL/link in the Threads body — links suppress reach. Nudge to "link in bio" instead.',
      '  - Toolkit — pick ONE of these per post, not both (using every trick daily makes the feed read templated): a share-trigger line ("send this to the friend who…") OR a closing question ("fire or water?"). Vary the post skeleton day to day.',
      '  - Ban the word "literally". At most ONE staccato fragment ("hold. that. order.") per post — stacking them reads like parody.',
      '  - Keep the Threads caption under 420 chars (excluding hashtags); short posts win.',
      '  - Frame it as "Korean astrology" (rides the K-wave; instantly graspable to western readers who don\'t know "Saju") crossed with their familiar zodiac — lean into "your western sign says X, your Korean chart says Y" when it fits.',
      '- YouTube: a Shorts script (15-25s, hook -> body -> CTA).',
      `- CTA: only the YouTube script may include "${ctaUrl} (free, no sign-up)". NO URL in Instagram or Threads bodies — IG caption links aren't clickable and read as spam. Nudge both to "link in bio" instead.`,
      `- Hashtags (Instagram 5-8): only real tags people actually search — NEVER invent compound tags (#moneylove) and NEVER add tags unrelated to this post's topic (#tarot on a compatibility post). Mix 2-3 big tags + 2-3 category tags: ${CATEGORY_TAGS_EN[category]}. Always include #koreanastrology (brand). If a specific sign/animal is featured, add its own tag (#taurus, #yearofthehorse). Threads 0-1 only (tag-stuffing reads as spam), YouTube #Shorts.`,
      'Output ONLY this JSON:',
      '{"hook":"shared one-line hook",',
      '"instagram":{"caption":"caption (2-4 sentences)","hashtags":["#tag1","#tag2"]},',
      '"threads":{"caption":"blunt lowercase call-out (share trigger + 1 question)","hashtags":["#tag"]},',
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
  locale: 'ko' | 'en',
  bg?: string
): Promise<SocialPostDraft | null> {
  const subject = subjectFor(category, date)
  const ctaUrl = `${siteBaseUrl()}${subject.ctaPath ?? ctaPathFor(category)}`
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
    // 타로는 카드 아트를 그대로, 나머지 버티컬은 후크를 박은 브랜디드 카드를
    // 서버사이드 생성해 싣는다 → 전 발행 비주얼화 + Instagram(이미지 필수) 오픈.
    cardImage:
      subject.image ||
      socialCardImageUrl({
        category,
        title: locale === 'ko' ? subject.nameKo : subject.nameEn,
        hook: (parsed.hook || '').trim() || (locale === 'ko' ? subject.nameKo : subject.nameEn),
        locale,
        glyph: subject.glyph,
        bg,
      }),
    isReversed: subject.isReversed ?? false,
    hook: (parsed.hook || '').trim(),
    variants,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 하루치 초안 생성 — 카테고리별 EN 1건씩(기본). Claude 없으면 빈 배열.
 * 저장은 호출부(draftStore.ensureDrafts/saveDrafts)가 담당.
 *
 * EN 전용이 기본이다 — 한 계정에 ko/en 이 섞여 나가면 피드 정체성이 흐려지고,
 * 글로벌 확장(K-wave "Korean astrology" 포지셔닝)은 영어가 맞다. ko 파이프라인
 * 코드는 남겨둔다(명시적으로 locales=['ko'] 를 넘기면 여전히 동작).
 */
export async function generateDailyDrafts(
  date: string = todayKeyKST(),
  locales: Array<'ko' | 'en'> = ['en'],
  categories: readonly SocialCategory[] = SOCIAL_CATEGORIES
): Promise<SocialPostDraft[]> {
  if (!isClaudeAvailable()) {
    logger.warn('[social/generate] Claude unavailable — skipping draft generation')
    return []
  }
  // AI 배경 먼저 일괄 확보(카테고리당 1장, ko/en 공유·타로 제외) — 미설정/실패는
  // 빈 맵이라 기존 그라데이션 카드로 그대로 진행된다.
  const backgrounds = await ensureDailyBackgrounds(date, categories)
  const jobs: Array<Promise<SocialPostDraft | null>> = []
  for (const category of categories) {
    for (const loc of locales) {
      jobs.push(generateOne(date, category, loc, backgrounds[category]))
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
