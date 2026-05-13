'use client'

/**
 * useTarotInterpretation Hook
 * 타로 해석 가져오기 및 저장 로직 (스트리밍 지원)
 */

import { useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'
import { Spread, DrawnCard, DeckStyle } from '@/lib/tarot/tarot.types'
import { buildTarotSaveRequest, flattenTarotGuidance } from '@/lib/tarot/tarot-save-request'
import { getStoredBirthDate, fetchAndSyncUserProfile } from '@/lib/userProfile'
import { saveReading, formatReadingForSave } from '@/lib/tarot/tarot-storage'
import { apiFetch, type ApiFetchOptions } from '@/lib/api'
import { tarotLogger } from '@/lib/logger'
import type { InterpretationResult, ReadingResponse } from '../types'
import type { TarotPersonalizationOptions } from './useTarotGame'

interface UseTarotInterpretationParams {
  categoryName: string | undefined
  spreadId: string | undefined
  userTopic: string
  questionAnalysis: TarotQuestionAnalysisSnapshot | null
  selectedDeckStyle: DeckStyle
  personalizationOptions: TarotPersonalizationOptions
}

export interface FetchInterpretationOptions {
  // 스트리밍 중간 진행 상황을 받아서 UI 에 progressive 하게 반영하기 위한 콜백.
  // overall_message 가 토큰 단위로 누적될 때마다 호출된다.
  onProgress?: (snapshot: InterpretationResult) => void
}

interface UseTarotInterpretationReturn {
  isSaved: boolean
  saveMessage: string
  fetchInterpretation: (
    result: ReadingResponse,
    options?: FetchInterpretationOptions
  ) => Promise<InterpretationResult | null>
  handleSaveReading: (
    readingResult: ReadingResponse | null,
    spreadInfo: Spread | null,
    interpretation: InterpretationResult | null
  ) => Promise<void>
}

// The server route can legitimately spend much longer on backend_rag/GPT fallback.
// Do not abort early on the client and force a local fallback while AI is still working.
const PRIMARY_INTERPRET_TIMEOUT_MS = 70000
const STREAM_INTERPRET_TIMEOUT_MS = 35000

class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'RequestTimeoutError'
  }
}

async function apiFetchWithTimeout(
  url: string,
  init: ApiFetchOptions,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const externalSignal = init.signal

  const onExternalAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  timeoutId = setTimeout(() => {
    timedOut = true
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }, timeoutMs)

  try {
    return await apiFetch(url, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut) {
      throw new RequestTimeoutError(timeoutMs)
    }
    throw error
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort)
    }
  }
}

/**
 * SSE 스트림에서 JSON 텍스트를 누적 수집하여 파싱
 */
async function consumeSSEStream(
  response: Response,
  onChunk?: (accumulated: string) => void
): Promise<string> {
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

    let changed = false
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            accumulated += parsed.content
            changed = true
          }
        } catch {
          // 불완전한 청크 무시
        }
      }
    }
    if (changed && onChunk) onChunk(accumulated)
  }

  lineBuffer += decoder.decode()
  if (lineBuffer.startsWith('data: ')) {
    const data = lineBuffer.slice(6)
    if (data && data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          accumulated += parsed.content
          onChunk?.(accumulated)
        }
      } catch {
        // 무시 가능한 마지막 청크
      }
    }
  }

  return accumulated
}

/**
 * 부분 JSON 안의 "overall": "..." 값을 progressive 하게 뽑아낸다.
 * 종료 따옴표가 아직 안 왔어도 현재까지의 텍스트는 그대로 보여줄 수 있게.
 */
function extractPartialOverall(buffer: string): string | null {
  const idx = buffer.indexOf('"overall"')
  if (idx < 0) return null
  // "overall" 다음의 첫 따옴표 위치
  const colonIdx = buffer.indexOf(':', idx)
  if (colonIdx < 0) return null
  const openQuote = buffer.indexOf('"', colonIdx + 1)
  if (openQuote < 0) return null
  // 닫힘 따옴표까지 — backslash escape 고려
  let i = openQuote + 1
  let out = ''
  while (i < buffer.length) {
    const ch = buffer[i]
    if (ch === '\\') {
      const next = buffer[i + 1]
      if (next === 'n') out += '\n'
      else if (next === 't') out += '\t'
      else if (next === '"') out += '"'
      else if (next === '\\') out += '\\'
      else if (next === '/') out += '/'
      else if (next === undefined) break // 아직 도착 안 함
      else out += next
      i += 2
      continue
    }
    if (ch === '"') return out // 완성됨
    out += ch
    i += 1
  }
  return out // 아직 닫힘 따옴표 안 왔지만 누적된 만큼은 반환
}

/**
 * 부분 JSON 안의 cards[].interpretation 값들을 progressive 하게 뽑아낸다.
 * 카드별 streaming UX 용 — 청크마다 호출되어, 지금까지 도착한 카드 해석들을 배열로 반환.
 * 예: cards 가 아직 첫 카드 일부만 왔으면 ["부분 텍스트"] 반환, 4번째 카드 시작했으면
 * [완성1, 완성2, 완성3, 부분4] 반환.
 */
function extractPartialCardTexts(buffer: string): string[] {
  // "cards" 배열의 시작 인덱스 찾기
  const arrIdx = buffer.indexOf('"cards"')
  if (arrIdx < 0) return []
  const arrOpen = buffer.indexOf('[', arrIdx)
  if (arrOpen < 0) return []

  const results: string[] = []
  // 배열 안에서 각 객체의 "interpretation": "..." 값을 순차적으로 찾는다.
  // 객체 경계는 신경쓰지 않고, 단순히 interpretation 키들을 등장 순서대로 모은다 —
  // cards[i] 순서대로 LLM 이 stream 하니까 안전하다.
  let scanFrom = arrOpen
  while (true) {
    const keyIdx = buffer.indexOf('"interpretation"', scanFrom)
    if (keyIdx < 0) break
    const colonIdx = buffer.indexOf(':', keyIdx)
    if (colonIdx < 0) break
    const openQuote = buffer.indexOf('"', colonIdx + 1)
    if (openQuote < 0) break

    let i = openQuote + 1
    let out = ''
    let closed = false
    while (i < buffer.length) {
      const ch = buffer[i]
      if (ch === '\\') {
        const next = buffer[i + 1]
        if (next === 'n') out += '\n'
        else if (next === 't') out += '\t'
        else if (next === '"') out += '"'
        else if (next === '\\') out += '\\'
        else if (next === '/') out += '/'
        else if (next === undefined) {
          // 아직 도착 안 함 — 이 카드는 부분 텍스트로 마무리
          break
        } else out += next
        i += 2
        continue
      }
      if (ch === '"') {
        closed = true
        i += 1
        break
      }
      out += ch
      i += 1
    }
    results.push(out)
    if (!closed) {
      // 마지막 카드가 아직 진행 중 — 더 찾을 게 없음
      break
    }
    scanFrom = i
  }
  return results
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

  const parsed = JSON.parse(jsonMatch[0]) as {
    overall?: string
    overall_message?: string
    advice?: string
    guidance?: string
    cards?: Array<{
      interpretation?: string
      meaning?: string
      actionTip?: string
      action_tip?: string
    }>
    card_insights?: Array<{
      interpretation?: string
      meaning?: string
      actionTip?: string
      action_tip?: string
    }>
  }
  const parsedCards = Array.isArray(parsed.cards)
    ? parsed.cards
    : Array.isArray(parsed.card_insights)
      ? parsed.card_insights
      : []

  return {
    overall_message: parsed.overall_message || parsed.overall || '',
    card_insights: cards.map((dc, i) => {
      const cardData = parsedCards[i] as
        | {
            interpretation?: string
            meaning?: string
            actionTip?: string
            action_tip?: string
          }
        | undefined
      const fallbackMeaning = dc.isReversed
        ? isKorean
          ? dc.card.reversed.meaningKo || dc.card.reversed.meaning
          : dc.card.reversed.meaning
        : isKorean
          ? dc.card.upright.meaningKo || dc.card.upright.meaning
          : dc.card.upright.meaning
      const actionTip =
        (cardData?.action_tip || cardData?.actionTip || '').trim() || undefined
      return {
        position: positions[i]?.title || `Card ${i + 1}`,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation:
          (cardData?.interpretation || cardData?.meaning || '').trim() || fallbackMeaning || '',
        action_tip: actionTip,
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      }
    }),
    guidance:
      parsed.guidance ||
      parsed.advice ||
      (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
    affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
    combinations: [],
    followup_questions: [],
    fallback: false,
    interpretation_source: 'stream_sse_fallback',
  }
}

function detectFocusKeyword(question: string, isKorean: boolean): string {
  const q = question.toLowerCase()

  if (isKorean) {
    if (/(흐름|전반|전체|방향|큰 ?그림)/.test(q)) return '\uD604\uC7AC \uD750\uB984'
    if (/(연애|사랑|결혼|썸|관계)/.test(q)) return '관계'
    if (/(이직|취업|승진|커리어|직장|면접)/.test(q)) return '커리어'
    if (/(돈|재정|투자|매출|수입|지출)/.test(q)) return '재정'
    if (/(건강|몸|컨디션|휴식|스트레스)/.test(q)) return '건강'
    return '핵심 이슈'
  }

  if (/(overall|general).*(flow|direction)|big picture|current flow/.test(q)) return 'overall flow'
  if (/(love|relationship|marriage|dating)/.test(q)) return 'relationships'
  if (/(career|job|promotion|interview|work)/.test(q)) return 'career'
  if (/(money|finance|income|budget|invest)/.test(q)) return 'finance'
  if (/(health|wellness|stress|rest|energy)/.test(q)) return 'health'
  return 'current flow'
}

function buildPersonalizedFallback(
  result: ReadingResponse,
  userTopic: string,
  isKorean: boolean,
  personalizationOptions: TarotPersonalizationOptions
): InterpretationResult {
  const fallbackCardNames = result.drawnCards
    .map((dc) => (isKorean ? dc.card.nameKo || dc.card.name : dc.card.name))
    .slice(0, 3)
    .join(', ')
  const focus = detectFocusKeyword(userTopic, isKorean)
  const perspectiveHints = [
    personalizationOptions.includeSaju ? (isKorean ? '사주 관점 포함' : 'Saju lens included') : '',
    personalizationOptions.includeAstrology
      ? isKorean
        ? '점성술 관점 포함'
        : 'Astrology lens included'
      : '',
  ].filter(Boolean)

  return {
    overall_message: isKorean
      ? `질문 주제(${focus}) 기준으로 ${fallbackCardNames} 카드가 공통적으로 말하는 방향은 '속도보다 기준 정렬'입니다. 지금은 결론을 서두르기보다 핵심 조건 1개를 정해 실행 가능한 단위로 쪼개는 것이 유리합니다.`
      : `For your ${focus} question, the shared direction from ${fallbackCardNames} is to prioritize clear criteria over speed. Instead of forcing a fast answer, define one key condition and break it into executable steps.`,
    card_insights: result.drawnCards.map((dc, idx) => {
      const positionTitle = result.spread.positions[idx]?.title || `Card ${idx + 1}`
      const cardName = isKorean ? dc.card.nameKo || dc.card.name : dc.card.name

      return {
        position: positionTitle,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: isKorean
          ? dc.isReversed
            ? `${positionTitle}의 ${cardName}(역방향)은 '${focus}'에서 누락된 조건을 먼저 점검하라는 신호입니다. 지금 당장 결정하기보다 체크리스트 3개를 만든 뒤 재판단하세요.`
            : `${positionTitle}의 ${cardName}는 '${focus}'에서 우선순위를 분명히 하라는 신호입니다. 오늘 바로 실행할 1단계 행동을 확정하면 흐름이 좋아집니다.`
          : dc.isReversed
            ? `${cardName} reversed at ${positionTitle} suggests reviewing missing conditions in your ${focus} before committing. Build a 3-item checklist, then decide.`
            : `${cardName} at ${positionTitle} highlights priority clarity for your ${focus}. Lock one immediate next step today to improve momentum.`,
      }
    }),
    guidance: isKorean
      ? [
          {
            title: '오늘 20분 액션',
            detail: `'${focus}' 관련 핵심 조건 1개를 정하고, 20분 내 실행 가능한 행동 1개로 전환하세요.`,
          },
          {
            title: '리스크 차단',
            detail: '결정 전에 실패 시나리오 1개와 대응책 1개를 미리 적어두세요.',
          },
          {
            title: '재확인 포인트',
            detail:
              perspectiveHints.length > 0
                ? `${perspectiveHints.join(', ')} 기준으로 48시간 내 한 번 더 리딩을 비교해보세요.`
                : '48시간 내 같은 질문으로 다시 리딩해 변화 흐름을 비교해보세요.',
          },
        ]
      : [
          {
            title: '20-minute action',
            detail: `Choose one key condition for your ${focus} and convert it into one task you can execute within 20 minutes.`,
          },
          {
            title: 'Risk guardrail',
            detail:
              'Write one failure scenario and one response plan before finalizing your decision.',
          },
          {
            title: 'Re-check point',
            detail:
              perspectiveHints.length > 0
                ? `Re-run and compare within 48 hours with ${perspectiveHints.join(', ')}.`
                : 'Re-run the same question within 48 hours and compare pattern changes.',
          },
        ],
    affirmation: isKorean
      ? '깊은 해석은 작은 실행에서 시작됩니다.'
      : 'Deep clarity starts from one concrete step.',
    fallback: true,
    interpretation_source: 'local_personalized_fallback',
  }
}

export function useTarotInterpretation({
  categoryName,
  spreadId,
  userTopic,
  questionAnalysis,
  selectedDeckStyle,
  personalizationOptions,
}: UseTarotInterpretationParams): UseTarotInterpretationReturn {
  const { data: session } = useSession()
  const { language } = useI18n()
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')

  const fetchInterpretation = useCallback(
    async (
      result: ReadingResponse,
      options?: FetchInterpretationOptions
    ): Promise<InterpretationResult | null> => {
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
          positionMeaning: result.spread.positions[idx]?.meaning,
          positionMeaningKo: result.spread.positions[idx]?.meaningKo,
          // Payload slimming for high-card spreads to reduce timeout pressure.
          keywords: (meaning.keywords || []).slice(0, 8),
          keywordsKo: (meaning.keywordsKo || []).slice(0, 8),
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
              const pillars =
                (saju.pillars as Record<string, { stem?: string; branch?: string }>) || {}
              const formatPillar = (p?: { stem?: string; branch?: string }) =>
                p?.stem && p?.branch ? `${p.stem}${p.branch}` : ''
              const pillarLine = isKorean
                ? [
                    pillars.year && `년주 ${formatPillar(pillars.year)}`,
                    pillars.month && `월주 ${formatPillar(pillars.month)}`,
                    pillars.day && `일주 ${formatPillar(pillars.day)}`,
                    pillars.time && `시주 ${formatPillar(pillars.time)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : [
                    pillars.year && `Year ${formatPillar(pillars.year)}`,
                    pillars.month && `Month ${formatPillar(pillars.month)}`,
                    pillars.day && `Day ${formatPillar(pillars.day)}`,
                    pillars.time && `Hour ${formatPillar(pillars.time)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')

              if (dayMaster || dayMasterElement) {
                // 구조화된 4기둥 cross context — 카드 해석 시 LLM이 일간/오행 외에도
                // 4기둥을 함께 참조하여 입체 weaving 가능.
                const headLine = isKorean
                  ? `사주 핵심: 일간 ${dayMaster}, 오행 ${dayMasterElement}${dayMasterYinYang ? `, 음양 ${dayMasterYinYang}` : ''}`
                  : `Saju core: Day master ${dayMaster}, element ${dayMasterElement}${dayMasterYinYang ? `, yin-yang ${dayMasterYinYang}` : ''}`
                sajuContext = pillarLine ? `${headLine}\n사주 4기둥: ${pillarLine}` : headLine
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

      // ───────────────────────────────────────────────────────────────────
      // Fusion (사주 + 점성 cross) 컨텍스트 — 우리 fusion 엔진이 오늘자 18테마
      // 점수와 트랜짓을 이미 계산하므로, 그 결과를 LLM에 컴팩트하게 넘겨
      // 카드 해석을 *오늘의 사주·점성 흐름*에 자동 cross 시킨다.
      // ───────────────────────────────────────────────────────────────────
      let astroContext: string | undefined
      if (birthdate && (includeSaju || includeAstrology)) {
        try {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const detailResp = await apiFetch(
            `/api/calendar/date-detail?birthDate=${encodeURIComponent(birthdate)}&date=${todayStr}`
          )
          if (detailResp.ok) {
            const detailPayload = (await detailResp.json()) as Record<string, unknown>
            const detail =
              typeof detailPayload.data === 'object' && detailPayload.data
                ? (detailPayload.data as Record<string, unknown>)
                : detailPayload
            const fusion = (detail.fusion as Record<string, unknown> | undefined) || {}
            const transit = (detail.transit as Record<string, unknown> | undefined) || {}
            const natalContext =
              (detail.natalContext as Record<string, unknown> | undefined) || {}
            const yongsin =
              ((natalContext.yongsin as Record<string, unknown> | undefined)?.primary as
                | string
                | undefined) || undefined

            const sajuAxisScore = typeof fusion.sajuAxisScore === 'number' ? fusion.sajuAxisScore : undefined
            const astroAxisScore = typeof fusion.astroAxisScore === 'number' ? fusion.astroAxisScore : undefined
            const domainScores = (fusion.domainScores as Record<string, number> | undefined) || {}
            const topDomains = Object.entries(domainScores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([k, v]) => `${k} ${Math.round(v)}`)
              .join(' · ')

            // sajuContext 풍부화 — 기존 4기둥에 오늘 점수 + 용신 + top 도메인 추가
            if (includeSaju && sajuContext) {
              const extra: string[] = []
              if (sajuAxisScore !== undefined) extra.push(isKorean ? `오늘 사주축 점수: ${sajuAxisScore}` : `Today saju axis: ${sajuAxisScore}`)
              if (yongsin) extra.push(isKorean ? `용신: ${yongsin}` : `Favorable element: ${yongsin}`)
              if (topDomains) extra.push(isKorean ? `오늘 강한 영역: ${topDomains}` : `Top domains today: ${topDomains}`)
              if (extra.length > 0) sajuContext = `${sajuContext}\n${extra.join(' · ')}`
            }

            // astroContext 신규 빌드 — 오늘 점성축 점수 + 트랜짓 요약 + 역행
            if (includeAstrology) {
              const lines: string[] = []
              if (astroAxisScore !== undefined) {
                lines.push(isKorean ? `점성: 오늘 점성축 점수 ${astroAxisScore}` : `Astrology: today's axis ${astroAxisScore}`)
              }
              const aspects = transit.aspects as Array<Record<string, unknown>> | undefined
              if (aspects && aspects.length > 0) {
                const top = aspects
                  .slice(0, 3)
                  .map((a) => {
                    const tp = String(a.transitPlanet || '')
                    const np = String(a.natalPoint || '')
                    const ty = String(a.aspect || '')
                    const orb = typeof a.orb === 'number' ? a.orb.toFixed(1) : ''
                    return `${tp} ${ty} natal ${np}${orb ? ` (orb ${orb}°)` : ''}`
                  })
                  .join(' · ')
                lines.push(isKorean ? `오늘 트랜짓: ${top}` : `Today transits: ${top}`)
              }
              const retros = transit.retrogrades as string[] | undefined
              if (retros && retros.length > 0) {
                lines.push(isKorean ? `역행 행성: ${retros.join(', ')}` : `Retrograde: ${retros.join(', ')}`)
              }
              if (lines.length > 0) astroContext = lines.join('\n')
            }
          }
        } catch (fusionError) {
          tarotLogger.error(
            'Failed to load fusion context before tarot interpretation',
            fusionError instanceof Error ? fusionError : undefined
          )
        }
      }

      // 분석 결과에서 메타데이터 추출 — interpret 단계 재추론 비용 절감
      const questionMeta = questionAnalysis
        ? {
            intent: questionAnalysis.intent,
            subject: questionAnalysis.question_profile?.subject?.label,
            focus: questionAnalysis.question_profile?.focus?.label,
            timeframe: questionAnalysis.question_profile?.timeframe?.label,
            tone: questionAnalysis.question_profile?.tone?.label,
            questionType: questionAnalysis.question_profile?.type?.label,
          }
        : undefined

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
        astroContext,
        questionContext: questionAnalysis || undefined,
        questionMeta,
      }

      const requestNonStreamInterpretation = async (
        timeoutMs: number
      ): Promise<InterpretationResult | null> => {
        const response = await apiFetchWithTimeout(
          '/api/tarot/interpret',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          },
          timeoutMs
        )

        if (!response.ok) {
          return null
        }

        return await response.json()
      }

      // Always prefer backend Hybrid RAG first so every question is interpreted
      // with question-aware tarot context (Evidence + domain rules).
      const shouldPreferBackendRag = true
      if (shouldPreferBackendRag) {
        try {
          const ragResult = await requestNonStreamInterpretation(PRIMARY_INTERPRET_TIMEOUT_MS)
          if (ragResult) {
            return {
              ...ragResult,
              interpretation_source: ragResult.interpretation_source || 'backend_rag',
            }
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
        const response = await apiFetchWithTimeout(
          '/api/tarot/interpret-stream',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          },
          STREAM_INTERPRET_TIMEOUT_MS
        )

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''

          if (contentType.includes('text/event-stream') && response.body) {
            // SSE 스트림 처리 — 청크마다 overall 부분만 progressive 하게 UI 에 흘려보냄.
            const baseSnapshot: InterpretationResult = {
              overall_message: '',
              card_insights: result.drawnCards.map((dc, i) => ({
                position: result.spread.positions[i]?.title || `Card ${i + 1}`,
                card_name: dc.card.name,
                is_reversed: dc.isReversed,
                interpretation: '',
                action_tip: undefined,
                spirit_animal: null,
                chakra: null,
                element: null,
                shadow: null,
              })),
              guidance: '',
              affirmation: '',
              combinations: [],
              followup_questions: [],
              fallback: true,
              interpretation_source: 'stream_sse_fallback',
            }
            const jsonText = await consumeSSEStream(response, (accumulated) => {
              if (!options?.onProgress) return
              const partialOverall = extractPartialOverall(accumulated) || ''
              const partialCards = extractPartialCardTexts(accumulated)
              // 카드별 해석을 baseSnapshot.card_insights 위에 덮어쓴다 — 아직 안 온 카드는 빈 문자열 유지.
              const updatedInsights = baseSnapshot.card_insights.map((ci, i) => {
                const text = partialCards[i]
                if (!text) return ci
                return { ...ci, interpretation: text }
              })
              if (partialOverall.length > 0 || partialCards.length > 0) {
                options.onProgress({
                  ...baseSnapshot,
                  overall_message: partialOverall,
                  card_insights: updatedInsights,
                })
              }
            })
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
              const fallbackInterpretation = drawnCard.isReversed
                ? language === 'ko'
                  ? drawnCard.card.reversed.meaningKo || drawnCard.card.reversed.meaning
                  : drawnCard.card.reversed.meaning
                : language === 'ko'
                  ? drawnCard.card.upright.meaningKo || drawnCard.card.upright.meaning
                  : drawnCard.card.upright.meaning

              const actionTip =
                ((ci.action_tip as string) || (ci.actionTip as string) || '').trim() || undefined
              return {
                position:
                  (ci.position as string) || result.spread.positions[i]?.title || `Card ${i + 1}`,
                card_name: drawnCard.card.name,
                is_reversed: drawnCard.isReversed,
                interpretation:
                  ((ci.interpretation as string) || '').trim() ||
                  fallbackInterpretation ||
                  (language === 'ko'
                    ? '카드 메시지를 읽고 현재 상황과 연결해보세요.'
                    : 'Connect this card message to your current situation.'),
                action_tip: actionTip,
                spirit_animal: null,
                chakra: null,
                element: null,
                shadow: null,
              }
            })

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
              interpretation_source: 'stream_json_fallback',
            }
          }
        }

        throw new Error('Stream interpretation failed')
      } catch (streamError) {
        tarotLogger.error(
          'Streaming interpretation failed, using local fallback',
          streamError instanceof Error ? streamError : undefined
        )
      }

      // 2) Final fallback with personalized renderable copy
      return buildPersonalizedFallback(result, userTopic, isKorean, personalizationOptions)
    },
    [categoryName, spreadId, language, session, userTopic, questionAnalysis, personalizationOptions]
  )

  const handleSaveReading = useCallback(
    async (
      _readingResult: ReadingResponse | null,
      _spreadInfo: Spread | null,
      interpretation: InterpretationResult | null
    ) => {
      if (!_readingResult || !_spreadInfo || isSaved) {
        return
      }

      const readingResult = _readingResult
      const spreadInfo = _spreadInfo

      try {
        const resolvedSpreadId = spreadId || spreadInfo.id

        if (!resolvedSpreadId) {
          throw new Error('Missing spreadId for tarot save request')
        }

        const guidanceText = flattenTarotGuidance(interpretation?.guidance)
        const saveInterpretation = interpretation
          ? {
              overall_message: interpretation.overall_message,
              guidance: guidanceText,
              card_insights: interpretation.card_insights,
            }
          : null

        if (session?.user) {
          const savePayload = buildTarotSaveRequest({
            question: userTopic,
            spreadInfo,
            readingResult,
            interpretation,
            categoryName: categoryName || undefined,
            spreadId: resolvedSpreadId,
            selectedDeckStyle,
            language: language || 'ko',
            questionAnalysis,
          })

          const preferredSaveResponse = await apiFetch('/api/tarot/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savePayload),
          })

          if (!preferredSaveResponse.ok) {
            const errorPayload = (await preferredSaveResponse.json().catch(() => null)) as {
              error?: { message?: string }
              message?: string
            } | null
            const errorMessage =
              errorPayload?.error?.message ||
              errorPayload?.message ||
              `Save failed (${preferredSaveResponse.status})`
            throw new Error(errorMessage)
          }

          setIsSaved(true)
          setSaveMessage(language === 'ko' ? '저장되었습니다!' : 'Saved!')
          setTimeout(() => setSaveMessage(''), 3000)
          return
        } else {
          const formattedReading = formatReadingForSave(
            userTopic,
            spreadInfo,
            readingResult.drawnCards,
            saveInterpretation,
            categoryName || '',
            resolvedSpreadId,
            selectedDeckStyle,
            questionAnalysis
          )
          saveReading(formattedReading)
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
    [
      categoryName,
      spreadId,
      selectedDeckStyle,
      language,
      isSaved,
      session,
      userTopic,
      questionAnalysis,
    ]
  )

  return {
    isSaved,
    saveMessage,
    fetchInterpretation,
    handleSaveReading,
  }
}
