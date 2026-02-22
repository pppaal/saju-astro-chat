import type { ChatMessage } from '@/lib/api'

export interface TarotFallbackCard {
  position: string
  name: string
  isReversed?: boolean
  is_reversed?: boolean
  meaning: string
  keywords?: string[]
}

export interface TarotFallbackContext {
  spread_title: string
  category: string
  cards: TarotFallbackCard[]
  overall_message: string
  guidance: string
}

type SupportedLanguage = 'ko' | 'en'
type FallbackIntent = 'general' | 'love' | 'career' | 'money' | 'moreCards'

const MAX_SUMMARY_LENGTH = 180
const MAX_MEANING_LENGTH = 120
const MAX_EVIDENCE_CARDS = 2

function clipText(value: string | undefined, maxLength: number): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function getLastUserMessage(messages: ChatMessage[]): string {
  const latest = [...messages].reverse().find((item) => item.role === 'user')
  return (latest?.content || '').trim()
}

function detectIntent(question: string): FallbackIntent {
  const lower = question.toLowerCase()

  if (
    /more card|draw more|another card|additional card|extra card/.test(lower) ||
    /더 뽑|추가 카드|다시 뽑/.test(question)
  ) {
    return 'moreCards'
  }

  if (/love|relationship|partner|romance/.test(lower) || /연애|사랑|관계|썸/.test(question)) {
    return 'love'
  }

  if (/career|job|work|promotion|interview/.test(lower) || /직장|커리어|이직|승진|면접/.test(question)) {
    return 'career'
  }

  if (/money|finance|income|investment|debt/.test(lower) || /돈|재정|수입|투자|빚/.test(question)) {
    return 'money'
  }

  return 'general'
}

function getOrientationLabel(card: TarotFallbackCard, isKorean: boolean): string {
  const reversed = card.is_reversed ?? card.isReversed ?? false
  if (isKorean) return reversed ? '역위' : '정위'
  return reversed ? 'reversed' : 'upright'
}

function getCoreLabel(intent: FallbackIntent, isKorean: boolean): string {
  if (isKorean) {
    switch (intent) {
      case 'love':
        return '연애 리딩 핵심'
      case 'career':
        return '커리어 리딩 핵심'
      case 'money':
        return '재정 리딩 핵심'
      case 'moreCards':
        return '추가 카드 리딩 핵심'
      default:
        return '리딩 핵심'
    }
  }

  switch (intent) {
    case 'love':
      return 'Core for your love question'
    case 'career':
      return 'Core for your career question'
    case 'money':
      return 'Core for your money question'
    case 'moreCards':
      return 'Core for your additional-card request'
    default:
      return 'Core'
  }
}

function buildCoreLine(
  context: TarotFallbackContext,
  intent: FallbackIntent,
  isKorean: boolean
): string {
  const summary = clipText(context.overall_message, MAX_SUMMARY_LENGTH)
  const guidance = clipText(context.guidance, MAX_SUMMARY_LENGTH)

  if (intent === 'moreCards') {
    if (isKorean) {
      return `핵심: 이미 ${context.cards.length}장의 카드를 뽑았습니다. 추가 카드는 새 리딩에서 뽑을 수 있어요.`
    }
    return `Core: You have already drawn ${context.cards.length} cards. To draw more cards, start a new reading.`
  }

  if (summary && guidance) {
    return isKorean
      ? `${getCoreLabel(intent, true)}: ${summary} / ${guidance}`
      : `${getCoreLabel(intent, false)}: ${summary} / ${guidance}`
  }

  if (summary) {
    return isKorean
      ? `${getCoreLabel(intent, true)}: ${summary}`
      : `${getCoreLabel(intent, false)}: ${summary}`
  }

  if (guidance) {
    return isKorean
      ? `${getCoreLabel(intent, true)}: ${guidance}`
      : `${getCoreLabel(intent, false)}: ${guidance}`
  }

  return isKorean
    ? `${getCoreLabel(intent, true)}: 현재 카드 흐름을 기준으로 현실적인 다음 행동을 정리할게요.`
    : `${getCoreLabel(intent, false)}: I will map practical next steps from your current card spread.`
}

function buildEvidenceLines(context: TarotFallbackContext, isKorean: boolean): string[] {
  if (!context.cards.length) {
    return isKorean
      ? ['- 카드 정보가 없어 일반 가이드로 안내합니다.']
      : ['- Card details are unavailable, so this is a general fallback guide.']
  }

  return context.cards.slice(0, MAX_EVIDENCE_CARDS).map((card, index) => {
    const position = card.position || (isKorean ? `카드 ${index + 1}` : `Card ${index + 1}`)
    const meaning = clipText(card.meaning, MAX_MEANING_LENGTH)
    const orientation = getOrientationLabel(card, isKorean)
    return isKorean
      ? `- [${position}] ${card.name} (${orientation}): ${meaning || '현재 상황의 방향성을 확인해 주세요.'}`
      : `- [${position}] ${card.name} (${orientation}): ${meaning || 'Review this card for directional context.'}`
  })
}

function buildActionSteps(intent: FallbackIntent, isKorean: boolean): string[] {
  if (isKorean) {
    switch (intent) {
      case 'love':
        return [
          '1) 오늘: 감정/요구를 2줄로 정리해 말할 준비를 하세요.',
          '2) 이번 주: 상대와 20분 대화를 잡고, 사실-감정-요청 순서로 말하세요.',
          '3) 다음 7일: 관계에서 반복되는 패턴 1개를 기록하고 수정 행동 1개를 실행하세요.',
        ]
      case 'career':
        return [
          '1) 오늘: 가장 중요한 업무 1개를 30분 단위로 쪼개 첫 블록을 끝내세요.',
          '2) 이번 주: 상사/협업자와 우선순위를 확인하고 완료 기준을 문서로 남기세요.',
          '3) 다음 7일: 성과 근거(수치/결과) 3개를 모아 다음 기회 준비에 쓰세요.',
        ]
      case 'money':
        return [
          '1) 오늘: 지출을 고정/변동으로 나누고 불필요 지출 1개를 즉시 중단하세요.',
          '2) 이번 주: 7일 예산 한도를 정하고 초과 여부를 매일 체크하세요.',
          '3) 다음 7일: 투자/구매 결정은 하루 유예 후 근거 2개 확인 뒤 실행하세요.',
        ]
      case 'moreCards':
        return [
          '1) 오늘: 현재 카드 해석에서 바로 실행 가능한 행동 1개만 선택하세요.',
          '2) 이번 주: 그 행동 결과를 기록하고, 부족하면 새 리딩에서 추가 카드를 뽑으세요.',
          '3) 다음 7일: 같은 질문 반복보다 결과 데이터(행동-결과)를 쌓아 질문 품질을 높이세요.',
        ]
      default:
        return [
          '1) 오늘: 지금 가장 불안한 포인트를 한 문장으로 적어 우선순위를 정하세요.',
          '2) 이번 주: 실행 가능한 행동 1~2개만 정해 완료 여부를 체크하세요.',
          '3) 다음 7일: 결과를 기록하고, 필요하면 질문을 더 구체화해 재질문하세요.',
        ]
    }
  }

  switch (intent) {
    case 'love':
      return [
        '1) Today: write your core feeling and request in two short lines.',
        '2) This week: schedule one 20-minute conversation and use facts-feelings-request order.',
        '3) Within 7 days: track one repeated relationship pattern and test one concrete change.',
      ]
    case 'career':
      return [
        '1) Today: break your top priority into a 30-minute first block and finish it.',
        '2) This week: confirm priority and definition-of-done with your manager or collaborator.',
        '3) Within 7 days: collect three measurable outcomes for your next opportunity.',
      ]
    case 'money':
      return [
        '1) Today: split expenses into fixed/variable and stop one non-essential spend.',
        '2) This week: set a 7-day budget cap and check overrun daily.',
        '3) Within 7 days: delay major buy/invest decisions by one day and verify two facts first.',
      ]
    case 'moreCards':
      return [
        '1) Today: pick one actionable step from your current cards and execute it.',
        '2) This week: record outcome first, then start a new reading if you still need extra cards.',
        '3) Within 7 days: ask a narrower follow-up question based on actual results.',
      ]
    default:
      return [
        '1) Today: define the single biggest blocker in one sentence.',
        '2) This week: commit to one or two actions you can complete end-to-end.',
        '3) Within 7 days: review outcomes and ask a narrower follow-up question if needed.',
      ]
  }
}

function buildFollowupQuestion(intent: FallbackIntent, isKorean: boolean): string {
  if (isKorean) {
    switch (intent) {
      case 'love':
        return '다음 질문: 상대와 대화할 때 가장 먼저 확인해야 할 포인트를 카드 기준으로 더 볼까요?'
      case 'career':
        return '다음 질문: 이번 주 업무에서 가장 중요한 결정 1개를 카드 기준으로 같이 점검할까요?'
      case 'money':
        return '다음 질문: 지출/투자 중 어떤 결정을 먼저 검토할지 카드 기준으로 좁혀볼까요?'
      case 'moreCards':
        return '다음 질문: 현재 카드 중 어느 포지션을 더 깊게 해석해볼까요?'
      default:
        return '다음 질문: 지금 상황에서 우선순위를 어디에 둘지 카드 기준으로 더 구체화할까요?'
    }
  }

  switch (intent) {
    case 'love':
      return 'Next question: should we focus first on communication timing or emotional boundaries?'
    case 'career':
      return 'Next question: which one decision this week should we evaluate first with card evidence?'
    case 'money':
      return 'Next question: do you want to review spending control or investment timing first?'
    case 'moreCards':
      return 'Next question: which current card position should we unpack in more detail first?'
    default:
      return 'Next question: which priority should we validate first using your current card evidence?'
  }
}

export function composeTarotFallbackReply(input: {
  messages: ChatMessage[]
  context: TarotFallbackContext
  language: string
}): string {
  const isKorean = input.language === 'ko'
  const language = (isKorean ? 'ko' : 'en') as SupportedLanguage
  const lastQuestion = getLastUserMessage(input.messages)
  const intent = detectIntent(lastQuestion)

  const lines: string[] = []
  lines.push(buildCoreLine(input.context, intent, isKorean))

  lines.push(isKorean ? '근거 카드:' : 'Card evidence:')
  lines.push(...buildEvidenceLines(input.context, isKorean))

  lines.push(isKorean ? '실행 제안:' : 'Action plan:')
  lines.push(...buildActionSteps(intent, isKorean))

  lines.push(buildFollowupQuestion(intent, isKorean))

  return lines.join('\n')
}
