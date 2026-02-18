'use client'

/**
 * useTarotInterpretation Hook
 * 타로 해석 가져오기 및 저장 로직 (스트리밍 지원)
 */

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { Spread, DrawnCard, DeckStyle, getCardImagePath } from '@/lib/Tarot/tarot.types'
import { getStoredBirthDate, fetchAndSyncUserProfile } from '@/lib/userProfile'
import { saveReading, formatReadingForSave } from '@/lib/Tarot/tarot-storage'
import { apiFetch } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import type { InterpretationResult, ReadingResponse } from '../types'
import type { TarotPersonalizationOptions } from './useTarotGame'

interface UseTarotInterpretationParams {
  categoryName: string | undefined
  spreadId: string | undefined
  userTopic: string
  selectedDeckStyle: DeckStyle
  personalizationOptions: TarotPersonalizationOptions
}

interface UseTarotInterpretationReturn {
  isSaved: boolean
  saveMessage: string
  fetchInterpretation: (result: ReadingResponse) => Promise<InterpretationResult | null>
  handleSaveReading: (
    readingResult: ReadingResponse | null,
    spreadInfo: Spread | null,
    interpretation: InterpretationResult | null
  ) => Promise<void>
}

/**
 * SSE 스트림에서 JSON 텍스트를 누적 수집하여 파싱
 */
async function consumeSSEStream(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let accumulated = ''
  let lineBuffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    lineBuffer += decoder.decode(value, { stream: true })
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            accumulated += parsed.content
          }
        } catch {
          // 불완전한 청크 무시
        }
      }
    }
  }

  lineBuffer += decoder.decode()
  if (lineBuffer.startsWith('data: ')) {
    const data = lineBuffer.slice(6)
    if (data && data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          accumulated += parsed.content
        }
      } catch {
        // 무시 가능한 마지막 청크
      }
    }
  }

  return accumulated
}

/**
 * 스트리밍 JSON 응답을 InterpretationResult로 변환
 */
function parseStreamedInterpretation(
  jsonText: string,
  cards: DrawnCard[],
  positions: ReadingResponse['spread']['positions'],
  isKorean: boolean
): InterpretationResult {
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found')

  const parsed = JSON.parse(jsonMatch[0])
  const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []
  const hasEnoughCards = parsedCards.length >= cards.length
  const hasInterpretationsForAllCards = cards.every((_, i) => {
    const interpretation = (parsedCards[i] as { interpretation?: unknown } | undefined)
      ?.interpretation
    return typeof interpretation === 'string' && interpretation.trim().length > 0
  })

  if (!hasEnoughCards || !hasInterpretationsForAllCards) {
    throw new Error('Incomplete streamed tarot payload')
  }

  return {
    overall_message: parsed.overall || '',
    card_insights: cards.map((dc, i) => {
      const cardData = parsedCards[i] as { interpretation?: string } | undefined
      return {
        position: positions[i]?.title || `Card ${i + 1}`,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: cardData?.interpretation || '',
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      }
    }),
    guidance:
      parsed.advice || (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
    affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
    combinations: [],
    followup_questions: [],
    fallback: false,
  }
}

export function useTarotInterpretation({
  categoryName,
  spreadId,
  userTopic,
  selectedDeckStyle,
  personalizationOptions,
}: UseTarotInterpretationParams): UseTarotInterpretationReturn {
  const { data: session } = useSession()
  const { translate, language } = useI18n()
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')

  const fetchInterpretation = useCallback(
    async (result: ReadingResponse): Promise<InterpretationResult | null> => {
      const isKorean = (language || 'ko') === 'ko'
      const includeAstrology = personalizationOptions.includeAstrology !== false
      const includeSaju = personalizationOptions.includeSaju !== false

      let birthdate = includeAstrology ? getStoredBirthDate() : undefined
      if (session?.user && includeAstrology) {
        try {
          const syncedProfile = await fetchAndSyncUserProfile()
          birthdate = syncedProfile.birthDate || birthdate
        } catch (profileError) {
          tarotLogger.error(
            'Failed to refresh profile before tarot interpretation',
            profileError instanceof Error ? profileError : undefined
          )
        }
      }

      const cardPayload = result.drawnCards.map((dc, idx) => {
        const meaning = dc.isReversed ? dc.card.reversed : dc.card.upright
        return {
          name: dc.card.name,
          nameKo: dc.card.nameKo,
          isReversed: dc.isReversed,
          position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
          positionKo: result.spread.positions[idx]?.titleKo,
          meaning: meaning.meaning,
          meaningKo: meaning.meaningKo,
          keywords: meaning.keywords,
          keywordsKo: meaning.keywordsKo,
        }
      })

      let sajuContext: string | undefined
      if (session?.user && includeSaju) {
        try {
          const sajuResponse = await apiFetch('/api/me/saju')
          if (sajuResponse.ok) {
            const sajuPayload = (await sajuResponse.json()) as Record<string, unknown>
            const container =
              typeof sajuPayload.data === 'object' && sajuPayload.data
                ? (sajuPayload.data as Record<string, unknown>)
                : sajuPayload
            const hasSaju = container.hasSaju === true
            const saju =
              typeof container.saju === 'object' && container.saju
                ? (container.saju as Record<string, unknown>)
                : null

            if (hasSaju && saju) {
              const dayMaster = (saju.dayMaster as string) || ''
              const dayMasterElement = (saju.dayMasterElement as string) || ''
              const dayMasterYinYang = (saju.dayMasterYinYang as string) || ''

              if (dayMaster || dayMasterElement) {
                sajuContext = isKorean
                  ? `사주 핵심: 일간 ${dayMaster}, 오행 ${dayMasterElement}${dayMasterYinYang ? `, 음양 ${dayMasterYinYang}` : ''}`
                  : `Saju core: Day master ${dayMaster}, element ${dayMasterElement}${dayMasterYinYang ? `, yin-yang ${dayMasterYinYang}` : ''}`
              }
            }
          }
        } catch (sajuError) {
          tarotLogger.error(
            'Failed to load saju context before tarot interpretation',
            sajuError instanceof Error ? sajuError : undefined
          )
        }
      }

      const requestBody = {
        categoryId: categoryName,
        spreadId,
        spreadTitle: result.spread.title,
        cards: cardPayload,
        userQuestion: userTopic,
        language: language || 'ko',
        birthdate: includeAstrology ? birthdate : undefined,
        includeAstrology,
        includeSaju,
        sajuContext,
      }

      const requestNonStreamInterpretation = async (): Promise<InterpretationResult | null> => {
        const response = await apiFetch('/api/tarot/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          return null
        }

        return await response.json()
      }

      const shouldPreferBackendRag = result.drawnCards.length >= 6
      if (shouldPreferBackendRag) {
        try {
          const ragResult = await requestNonStreamInterpretation()
          if (ragResult) {
            return ragResult
          }
        } catch (ragError) {
          tarotLogger.error(
            'Backend RAG interpretation failed, trying stream fallback',
            ragError instanceof Error ? ragError : undefined
          )
        }
      }

      // 1) 스트리밍 엔드포인트 시도
      try {
        const response = await apiFetch('/api/tarot/interpret-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''

          if (contentType.includes('text/event-stream') && response.body) {
            // SSE 스트림 처리
            const jsonText = await consumeSSEStream(response)
            return parseStreamedInterpretation(
              jsonText,
              result.drawnCards,
              result.spread.positions,
              isKorean
            )
          }

          // JSON 응답 (폴백으로 내려온 경우)
          const data = await response.json()
          if (data.overall || data.overall_message) {
            const sourceInsights = Array.isArray(data.card_insights)
              ? (data.card_insights as Record<string, unknown>[])
              : Array.isArray(data.cards)
                ? (data.cards as Record<string, unknown>[])
                : []

            const normalizedInsights = result.drawnCards.map((drawnCard, i) => {
              const ci = sourceInsights[i] || {}
              return {
                position:
                  (ci.position as string) || result.spread.positions[i]?.title || `Card ${i + 1}`,
                card_name: drawnCard.card.name,
                is_reversed: drawnCard.isReversed,
                interpretation: (ci.interpretation as string) || '',
                spirit_animal: null,
                chakra: null,
                element: null,
                shadow: null,
              }
            })

            const hasMissingInsight = normalizedInsights.some(
              (insight) => insight.interpretation.trim().length === 0
            )
            if (hasMissingInsight) {
              throw new Error('Incomplete JSON stream payload')
            }

            return {
              overall_message: data.overall_message || data.overall || '',
              card_insights: normalizedInsights,
              guidance:
                data.guidance ||
                data.advice ||
                (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
              affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
              combinations: [],
              followup_questions: [],
              fallback: false,
            }
          }
        }

        throw new Error('Stream interpretation failed')
      } catch (streamError) {
        tarotLogger.error(
          'Streaming interpretation failed, trying non-stream fallback',
          streamError instanceof Error ? streamError : undefined
        )
      }

      // 2) 비스트리밍 폴백
      try {
        const fallbackResult = await requestNonStreamInterpretation()
        if (fallbackResult) {
          return fallbackResult
        }
      } catch (fallbackError) {
        tarotLogger.error(
          'Non-stream fallback also failed',
          fallbackError instanceof Error ? fallbackError : undefined
        )
      }

      // 3) 최종 폴백
      return {
        overall_message: translate(
          'tarot.results.defaultMessage',
          'The cards have revealed their wisdom to you.'
        ),
        card_insights: result.drawnCards.map((dc, idx) => ({
          position: result.spread.positions[idx]?.title || `Card ${idx + 1}`,
          card_name: dc.card.name,
          is_reversed: dc.isReversed,
          interpretation: '',
        })),
        guidance: translate('tarot.results.defaultGuidance', 'Trust your intuition.'),
        affirmation: '카드의 지혜를 믿으세요.',
        fallback: true,
      }
    },
    [categoryName, spreadId, language, session, translate, userTopic, personalizationOptions]
  )

  const handleSaveReading = useCallback(
    async (
      readingResult: ReadingResponse | null,
      spreadInfo: Spread | null,
      interpretation: InterpretationResult | null
    ) => {
      if (!readingResult || !spreadInfo || isSaved) {
        return
      }

      try {
        const guidance = interpretation?.guidance
        const guidanceText = Array.isArray(guidance)
          ? guidance.map((item) => `${item.title}: ${item.detail}`).join('\n')
          : guidance
        const saveInterpretation = interpretation
          ? {
              overall_message: interpretation.overall_message,
              guidance: guidanceText,
              card_insights: interpretation.card_insights,
            }
          : null

        // Local storage save
        const formattedReading = formatReadingForSave(
          userTopic,
          spreadInfo,
          readingResult.drawnCards,
          saveInterpretation,
          categoryName || '',
          spreadId || '',
          selectedDeckStyle
        )
        saveReading(formattedReading)

        // Server API save
        if (session?.user) {
          await apiFetch('/api/tarot/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: userTopic,
              theme: categoryName,
              spreadId: spreadId,
              spreadTitle:
                language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title,
              cards: readingResult.drawnCards.map((dc, idx) => ({
                cardId: dc.card.id,
                name: language === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
                image: getCardImagePath(dc.card.id, selectedDeckStyle),
                isReversed: dc.isReversed,
                position:
                  language === 'ko'
                    ? readingResult.spread.positions[idx]?.titleKo ||
                      readingResult.spread.positions[idx]?.title ||
                      `카드 ${idx + 1}`
                    : readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
              })),
              overallMessage: interpretation?.overall_message || '',
              cardInsights:
                interpretation?.card_insights?.map((ci) => ({
                  position: ci.position,
                  card_name: ci.card_name,
                  is_reversed: ci.is_reversed,
                  interpretation: ci.interpretation,
                })) || [],
              guidance: guidanceText || '',
              affirmation: interpretation?.affirmation || '',
              source: 'standalone',
              locale: language,
            }),
          })
        }

        setIsSaved(true)
        setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!')
        setTimeout(() => setSaveMessage(''), 3000)
      } catch (error) {
        tarotLogger.error('Failed to save reading', error instanceof Error ? error : undefined)
        setSaveMessage(language === 'ko' ? '저장 실패' : 'Save failed')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    },
    [categoryName, spreadId, selectedDeckStyle, language, isSaved, session, userTopic]
  )

  return {
    isSaved,
    saveMessage,
    fetchInterpretation,
    handleSaveReading,
  }
}
