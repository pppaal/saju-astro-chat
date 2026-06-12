/**
 * Programmatic SEO — 78장 타로 카드 의미 포스트 생성기.
 *
 * 데이터 SSOT 는 src/lib/tarot/data/* (RawCard) — 여기서는 카드별 산문을
 * 하드코딩하지 않고, 카드 데이터(키워드·의미·조언, ko·en)를 템플릿으로 엮어
 * BlogPost[] 를 파생한다. 영미권 검색("the fool tarot card meaning")이 1차
 * 타깃이므로 슬러그·타이틀은 영어 검색 패턴을 따른다.
 *
 * 순수 함수 — 모듈 초기화 시 서버에서 실행됨(fs/네트워크 금지).
 */
import { tarotDeck } from '@/lib/tarot/data'
import type { BlogPost } from '@/data/blog-posts-sync'

// 날짜는 고정 상수 — new Date() 를 쓰면 sitemap lastModified/JSON-LD 가 매 빌드
// 마다 바뀌어 크롤러 신호를 오염시킨다(sitemap.ts 의 SITE_LAST_MODIFIED 참조).
export const TAROT_POST_DATE = '2026-06-11'

const SUIT_LABELS_EN: Record<string, string> = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pentacles',
}

const SUIT_LABELS_KO: Record<string, string> = {
  wands: '완드',
  cups: '컵',
  swords: '소드',
  pentacles: '펜타클',
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ~200 wpm 기준, 최소 3분
function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(3, Math.ceil(words / 200))
}

// 단어 중간에서 끊기지 않게 ~160자 발췌
function clampExcerpt(text: string, max = 160): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '') + '…'
}

export function generateTarotCardPosts(): BlogPost[] {
  return tarotDeck.map((card) => {
    const isMajor = card.arcana === 'major'
    const suitEn = SUIT_LABELS_EN[card.suit] ?? card.suit
    const suitKo = SUIT_LABELS_KO[card.suit] ?? card.suit

    const introEn = isMajor
      ? `${card.name} is one of the 22 Major Arcana cards in the tarot deck. In a reading, it speaks to themes of ${card.upright.keywords
          .slice(0, 2)
          .map((k) => k.toLowerCase())
          .join(
            ' and '
          )} — and, reversed, to ${card.reversed.keywords[0]?.toLowerCase()}. Here is the full tarot card meaning of ${card.name}, upright and reversed.`
      : `${card.name} is a Minor Arcana card from the Suit of ${suitEn}. In a reading, it speaks to themes of ${card.upright.keywords
          .slice(0, 2)
          .map((k) => k.toLowerCase())
          .join(
            ' and '
          )} — and, reversed, to ${card.reversed.keywords[0]?.toLowerCase()}. Here is the full tarot card meaning of ${card.name}, upright and reversed.`

    const introKo = isMajor
      ? `${card.nameKo} 카드는 타로 덱의 메이저 아르카나 22장 중 하나입니다. 정방향에서는 ${card.upright.keywordsKo
          .slice(0, 2)
          .join(
            ', '
          )}의 주제를, 역방향에서는 ${card.reversed.keywordsKo[0] ?? ''}의 메시지를 전합니다. ${card.nameKo} 타로 카드의 정방향·역방향 의미를 정리했습니다.`
      : `${card.nameKo} 카드는 마이너 아르카나 ${suitKo} 슈트에 속합니다. 정방향에서는 ${card.upright.keywordsKo
          .slice(0, 2)
          .join(
            ', '
          )}의 주제를, 역방향에서는 ${card.reversed.keywordsKo[0] ?? ''}의 메시지를 전합니다. ${card.nameKo} 타로 카드의 정방향·역방향 의미를 정리했습니다.`

    const content = `${introEn}

## ${card.name} Upright Meaning

**Keywords:** ${card.upright.keywords.join(', ')}

${card.upright.meaning}

**Advice:** ${card.upright.advice}

## ${card.name} Reversed Meaning

**Keywords:** ${card.reversed.keywords.join(', ')}

${card.reversed.meaning}

**Advice:** ${card.reversed.advice}

## Get a Personalized Tarot Reading

Want a personalized reading? Draw your own cards and see what ${card.name} means for your question with a [free AI tarot reading](/tarot) on DestinyPal.
`

    const contentKo = `${introKo}

## 정방향 ${card.nameKo} 카드 의미

**키워드:** ${card.upright.keywordsKo.join(', ')}

${card.upright.meaningKo}

**조언:** ${card.upright.adviceKo}

## 역방향 ${card.nameKo} 카드 의미

**키워드:** ${card.reversed.keywordsKo.join(', ')}

${card.reversed.meaningKo}

**조언:** ${card.reversed.adviceKo}

## 나만의 타로 리딩 받기

맞춤형 리딩이 궁금하신가요? [무료 AI 타로 리딩](/tarot)에서 직접 카드를 뽑아 ${card.nameKo} 카드가 당신의 질문에 어떤 메시지를 주는지 확인해 보세요.
`

    return {
      slug: `${toSlug(card.name)}-tarot-card-meaning`,
      title: `${card.name} Tarot Card Meaning: Upright, Reversed & Advice`,
      titleKo: `${card.nameKo} 타로 카드 의미: 정방향·역방향 해석`,
      excerpt: clampExcerpt(
        `${card.name} tarot card meaning explained: upright and reversed keywords, a detailed interpretation, and practical advice for your tarot reading.`
      ),
      excerptKo: clampExcerpt(
        `${card.nameKo} 타로 카드 의미 총정리 — 정방향·역방향 키워드와 상세 해석, 리딩에 바로 쓰는 실전 조언까지 한눈에 확인하세요.`
      ),
      content,
      contentKo,
      category: 'Tarot',
      categoryKo: '타로',
      icon: '🎴',
      date: TAROT_POST_DATE,
      readTime: computeReadTime(content),
    }
  })
}
