'use client'

// Quick couple-tarot: 채팅창에서 한 번 클릭으로 5장 관계 크로스를 펼치고
// 두 사람의 사주·점성 맥락을 함께 LLM 에 보내서 해석을 받아온다.
// 결과 텍스트는 일반 어시스턴트 메시지로 chat 에 inline 표시.

import { tarotDeck } from '@/lib/tarot/data'
import { tarotThemes } from '@/lib/tarot/tarot-spreads-data'
import { apiFetch } from '@/lib/api'

type PersonData = {
  name: string
  date: string
  time: string
  city: string
}

interface QuickCoupleTarotInput {
  persons: PersonData[]
  person1Saju: Record<string, unknown> | null
  person2Saju: Record<string, unknown> | null
  person1Astro: Record<string, unknown> | null
  person2Astro: Record<string, unknown> | null
  language: 'ko' | 'en'
  onChunk?: (markdown: string) => void
}

interface QuickCoupleTarotResult {
  markdown: string
}

// 카드 78장에서 N장 추출, 정/역 50% 결정.
function drawRandomCards(count: number) {
  const shuffled = [...tarotDeck].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map((card) => ({
    card,
    isReversed: Math.random() < 0.5,
  }))
}

// 두 사람의 사주 데이터를 짧은 텍스트로 압축 (LLM 에 cross 컨텍스트로 전달).
function compactPersonSaju(
  name: string,
  saju: Record<string, unknown> | null,
  isKorean: boolean
): string {
  if (!saju) return ''
  const root = (saju.data as Record<string, unknown> | undefined) || saju
  const dayMaster = (root.dayMaster as string) || ''
  const dayElement = (root.dayMasterElement as string) || ''
  const pillars = (root.pillars as Record<string, { stem?: string; branch?: string }>) || {}
  const pillarStr = ['year', 'month', 'day', 'time']
    .map((k) => {
      const p = pillars[k]
      return p?.stem && p?.branch ? `${p.stem}${p.branch}` : ''
    })
    .filter(Boolean)
    .join('·')
  return isKorean
    ? `${name}: 일간 ${dayMaster}(${dayElement})${pillarStr ? `, 4기둥 ${pillarStr}` : ''}`
    : `${name}: day master ${dayMaster}(${dayElement})${pillarStr ? `, pillars ${pillarStr}` : ''}`
}

function compactPersonAstro(
  name: string,
  astro: Record<string, unknown> | null,
  isKorean: boolean
): string {
  if (!astro) return ''
  const root = (astro.data as Record<string, unknown> | undefined) || astro
  const planets = (root.planets as Array<Record<string, unknown>>) || []
  const sun = planets.find((p) => p.name === 'Sun')
  const moon = planets.find((p) => p.name === 'Moon')
  const asc = (root.ascendant as Record<string, unknown> | undefined) || null
  const sunSign = sun ? String(sun.sign || '') : ''
  const moonSign = moon ? String(moon.sign || '') : ''
  const ascSign = asc ? String(asc.sign || '') : ''
  const parts = [sunSign && `태양 ${sunSign}`, moonSign && `달 ${moonSign}`, ascSign && `ASC ${ascSign}`].filter(
    Boolean
  )
  if (parts.length === 0) return ''
  return isKorean ? `${name}: ${parts.join(' · ')}` : `${name}: ${parts.join(' · ')}`
}

export async function runQuickCoupleTarot(
  input: QuickCoupleTarotInput
): Promise<QuickCoupleTarotResult> {
  const { persons, person1Saju, person2Saju, person1Astro, person2Astro, language, onChunk } = input
  const isKorean = language === 'ko'

  // 5장 크로스 — 정통 스프레드로 두 사람의 관계 결을 풀어냄
  const generalTheme = tarotThemes.find((t) => t.id === 'general-insight')
  const spread = generalTheme?.spreads.find((s) => s.id === 'general-cross')
  if (!spread) {
    throw new Error('general-cross spread not found')
  }

  const drawn = drawRandomCards(spread.cardCount)
  const cardsPayload = drawn.map((dc, i) => {
    const pos = spread.positions[i]
    const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
    return {
      name: dc.card.name,
      nameKo: dc.card.nameKo,
      isReversed: dc.isReversed,
      position: pos?.title || `Card ${i + 1}`,
      positionKo: pos?.titleKo,
      positionMeaning: pos?.meaning,
      positionMeaningKo: pos?.meaningKo,
      keywords: (meaning?.keywords || []).slice(0, 8),
      keywordsKo: (meaning?.keywordsKo || []).slice(0, 8),
    }
  })

  const p1 = persons[0]
  const p2 = persons[1]
  const sajuLines = [
    compactPersonSaju(p1?.name || 'A', person1Saju, isKorean),
    compactPersonSaju(p2?.name || 'B', person2Saju, isKorean),
  ].filter(Boolean)
  const astroLines = [
    compactPersonAstro(p1?.name || 'A', person1Astro, isKorean),
    compactPersonAstro(p2?.name || 'B', person2Astro, isKorean),
  ].filter(Boolean)

  const sajuContext =
    sajuLines.length > 0
      ? isKorean
        ? `두 사람의 사주\n${sajuLines.join('\n')}`
        : `Two saju charts\n${sajuLines.join('\n')}`
      : undefined
  const astroContext =
    astroLines.length > 0
      ? isKorean
        ? `두 사람의 본명 차트\n${astroLines.join('\n')}`
        : `Two natal charts\n${astroLines.join('\n')}`
      : undefined

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
      includeAstrology: true,
      includeSaju: true,
      sajuContext,
      astroContext,
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
    const header = isKorean
      ? `🎴 **관계 크로스 — 둘 궁합 5장**\n\n${drawn
          .map((dc, i) => {
            const pos = isKorean ? spread.positions[i]?.titleKo || spread.positions[i]?.title : spread.positions[i]?.title
            const name = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name
            const tag = dc.isReversed ? (isKorean ? ' (역방향)' : ' (reversed)') : ''
            return `${i + 1}. [${pos}] ${name}${tag}`
          })
          .join('\n')}\n\n---\n\n`
      : `🎴 **Relationship Cross — Couple (5 cards)**\n\n${drawn
          .map((dc, i) => {
            const pos = spread.positions[i]?.title
            const tag = dc.isReversed ? ' (reversed)' : ''
            return `${i + 1}. [${pos}] ${dc.card.name}${tag}`
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
  const cardsParsed = Array.isArray(parsed?.cards) ? (parsed!.cards as Array<Record<string, unknown>>) : []
  const advice = (parsed?.advice as string) || ''

  const perCardSection = drawn
    .map((dc, i) => {
      const pos = spread.positions[i]
      const posLabel = isKorean ? pos?.titleKo || pos?.title : pos?.title
      const cardName = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name
      const tag = dc.isReversed ? (isKorean ? ' (역방향)' : ' (reversed)') : ''
      const interp = (cardsParsed[i]?.interpretation as string) || ''
      const tip = (cardsParsed[i]?.actionTip as string) || ''
      return `**${i + 1}. ${posLabel} — ${cardName}${tag}**\n${interp}${tip ? `\n💡 ${tip}` : ''}`
    })
    .join('\n\n')

  const finalMarkdown = isKorean
    ? `🎴 **관계 크로스 — 둘 궁합 5장**\n\n${overall ? `${overall}\n\n---\n\n` : ''}${perCardSection}${advice ? `\n\n---\n\n📌 ${advice}` : ''}`
    : `🎴 **Relationship Cross — Couple (5 cards)**\n\n${overall ? `${overall}\n\n---\n\n` : ''}${perCardSection}${advice ? `\n\n---\n\n📌 ${advice}` : ''}`

  return { markdown: finalMarkdown }
}
