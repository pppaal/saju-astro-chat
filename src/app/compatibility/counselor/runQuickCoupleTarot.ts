'use client'

// Quick couple-tarot: 채팅창에서 한 번 클릭으로 5장 관계 크로스를 펼치고
// 두 사람의 사주·점성 맥락을 함께 LLM 에 보내서 해석을 받아온다.
// 결과 텍스트는 일반 어시스턴트 메시지로 chat 에 inline 표시.

import { tarotDeck } from '@/lib/tarot/data'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import { apiFetch } from '@/lib/api'
import { shuffle } from '@/lib/utils/array'

type PersonData = {
  name: string
  date: string
  time: string
  city: string
}

interface QuickCoupleTarotInput {
  persons: PersonData[]
  language: 'ko' | 'en'
  onChunk?: (markdown: string) => void
}

interface QuickCoupleTarotResult {
  markdown: string
}

// 카드 78장에서 N장 추출. 역방향 30% (50% 는 부정적 카드 비중 과해
// 부담된다는 피드백 반영 — /api/tarot/route.ts 와 동일).
function drawRandomCards(count: number) {
  // Fisher-Yates via lib/utils/array — the previous
  // `.sort(() => Math.random() - 0.5)` is biased by the engine sort
  // algorithm; on V8 the first card was over-represented.
  const shuffled = shuffle(tarotDeck)
  return shuffled.slice(0, count).map((card) => ({
    card,
    isReversed: Math.random() < 0.3,
  }))
}

export async function runQuickCoupleTarot(
  input: QuickCoupleTarotInput
): Promise<QuickCoupleTarotResult> {
  const { persons, language, onChunk } = input
  const isKorean = language === 'ko'

  // 5장 크로스 — 정통 스프레드로 두 사람의 관계 결을 풀어냄
  const generalTheme = tarotThemes.find((t) => t.id === 'general-insight')
  const spread = generalTheme?.spreads.find((s) => s.id === 'general-cross')
  if (!spread) {
    throw new Error('general-cross spread not found')
  }

  const drawn = drawRandomCards(spread.cardCount)
  // position / positionKo 는 더 이상 안 보낸다 — LLM 이 두 사람 관계
  // 맥락에 맞춰 직접 명명한다.
  const cardsPayload = drawn.map((dc) => {
    const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
    return {
      name: dc.card.name,
      nameKo: dc.card.nameKo,
      isReversed: dc.isReversed,
      keywords: (meaning?.keywords || []).slice(0, 8),
      keywordsKo: (meaning?.keywordsKo || []).slice(0, 8),
    }
  })

  const p1 = persons[0]
  const p2 = persons[1]

  const userQuestion = isKorean
    ? `${p1?.name || 'A'}와 ${p2?.name || 'B'} 두 사람의 관계 — 지금 어떤 결인지, 어디로 갈지 짚어줘.`
    : `Couple reading for ${p1?.name || 'A'} and ${p2?.name || 'B'} — current dynamic and direction.`

  const response = await apiFetch('/api/tarot/interpret-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: 'general-insight',
      spreadId: 'general-cross',
      spreadTitle: isKorean ? '관계 크로스 — 둘 궁합' : 'Relationship Cross — Couple',
      cards: cardsPayload,
      userQuestion,
      language,
    }),
  })

  if (!response.ok) {
    throw new Error(`Quick couple tarot HTTP ${response.status}`)
  }

  // SSE 수신: data: { content: "..." } 누적 → 최종 JSON 파싱
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let accumulated = ''
  let buf = ''
  // 누적 텍스트에서 overall + cards 부분을 progressive 하게 뽑아내 onChunk 로 흘려보냄.
  const extractOverall = (text: string): string => {
    const idx = text.indexOf('"overall"')
    if (idx < 0) return ''
    const colon = text.indexOf(':', idx)
    if (colon < 0) return ''
    const open = text.indexOf('"', colon + 1)
    if (open < 0) return ''
    let i = open + 1
    let out = ''
    while (i < text.length) {
      const ch = text[i]
      if (ch === '\\') {
        const next = text[i + 1]
        if (next === 'n') out += '\n'
        else if (next === '"') out += '"'
        else if (next === '\\') out += '\\'
        else if (next === undefined) break
        else out += next
        i += 2
        continue
      }
      if (ch === '"') return out
      out += ch
      i += 1
    }
    return out
  }
  const formatProgressive = (overall: string): string => {
    // 자리(position) 라벨은 LLM 응답 안에서 명명되므로 헤더 카드 목록은
    // 카드명만 번호 매겨 표시.
    const header = isKorean
      ? `🎴 **관계 크로스 — 둘 궁합 5장**\n\n${drawn
          .map((dc, i) => {
            const name = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name
            const tag = dc.isReversed ? ' (역방향)' : ''
            return `${i + 1}. ${name}${tag}`
          })
          .join('\n')}\n\n---\n\n`
      : `🎴 **Relationship Cross — Couple (5 cards)**\n\n${drawn
          .map((dc, i) => {
            const tag = dc.isReversed ? ' (reversed)' : ''
            return `${i + 1}. ${dc.card.name}${tag}`
          })
          .join('\n')}\n\n---\n\n`
    return header + overall
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const ev = JSON.parse(data) as { content?: string }
        if (ev.content) {
          accumulated += ev.content
          if (onChunk) {
            const partialOverall = extractOverall(accumulated)
            if (partialOverall) {
              onChunk(formatProgressive(partialOverall))
            }
          }
        }
      } catch {
        // ignore partial chunks
      }
    }
  }

  // 최종 파싱
  let parsed: Record<string, unknown> | null = null
  try {
    const match = accumulated.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0]) as Record<string, unknown>
  } catch {
    parsed = null
  }

  const overall = (parsed?.overall as string) || ''
  const cardsParsed = Array.isArray(parsed?.cards)
    ? (parsed!.cards as Array<Record<string, unknown>>)
    : []
  const advice = (parsed?.advice as string) || ''

  const perCardSection = drawn
    .map((dc, i) => {
      // 자리명(position)은 LLM 이 관계 맥락에 맞춰 직접 명명해 응답에 담아 보낸다.
      // 옛 코드는 spread.positions[i] 를 참조했는데 동적 스프레드의 positions 가
      // 빈 배열이라 "undefined — 카드명" 으로 새던 버그를 LLM position 으로 대체.
      const posLabel = (cardsParsed[i]?.position as string) || ''
      const cardName = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name
      const tag = dc.isReversed ? (isKorean ? ' (역방향)' : ' (reversed)') : ''
      const interp = (cardsParsed[i]?.interpretation as string) || ''
      const heading = posLabel ? `${posLabel} — ${cardName}${tag}` : `${cardName}${tag}`
      return `**${i + 1}. ${heading}**\n${interp}`
    })
    .join('\n\n')

  const finalMarkdown = isKorean
    ? `🎴 **관계 크로스 — 둘 궁합 5장**\n\n${overall ? `${overall}\n\n---\n\n` : ''}${perCardSection}${advice ? `\n\n---\n\n📌 ${advice}` : ''}`
    : `🎴 **Relationship Cross — Couple (5 cards)**\n\n${overall ? `${overall}\n\n---\n\n` : ''}${perCardSection}${advice ? `\n\n---\n\n📌 ${advice}` : ''}`

  return { markdown: finalMarkdown }
}
