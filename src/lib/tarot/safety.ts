// src/lib/tarot/safety.ts
//
// 위험 질문(자살·자해 등) 감지 + 위기 응답 페이로드 생성.
// 타로 라우트의 안전 가드 단일 출처:
//   - questionEngineV2: 추천 단계에서 차단
//   - /api/tarot/interpret-stream: 해석 직전 추가 가드 (추천 우회 케이스)
//
// 기능적으로 두 경로 모두 이 모듈을 거쳐야 안전 키워드 보강이 한 곳에서 끝난다.

export const DANGEROUS_KEYWORDS = [
  '자살',
  '죽고 싶',
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '목숨',
  '생을 마감',
  '세상 떠나',
  '사라지고 싶',
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
]

export function isDangerousQuestion(q: string): boolean {
  const n = (q || '').toLowerCase()
  return DANGEROUS_KEYWORDS.some((kw) => n.includes(kw.toLowerCase()))
}

export interface CrisisPayloadInput {
  language: 'ko' | 'en'
  cardCount: number
}

export interface CrisisPayloadCard {
  position: string
  interpretation: string
}

export interface CrisisPayload {
  overall: string
  cards: CrisisPayloadCard[]
  advice: string
}

// interpret-stream 의 정상 응답 schema { overall, cards[], advice } 형태에 맞춰
// 위기 메시지를 끼워 넣는다. 클라이언트는 평소처럼 렌더하므로 추가 핸들링 불필요.
export function buildCrisisPayload(input: CrisisPayloadInput): CrisisPayload {
  const isKo = input.language === 'ko'
  const overall = isKo
    ? '먼저 지금 마음을 알아챈 것 자체가 중요한 신호예요. 많이 힘드시다면 카드보다 먼저 1393(자살예방상담전화, 24시간 무료)으로 연락해 주세요. 지금 한 통이 카드 어떤 풀이보다 도움이 됩니다.'
    : 'Noticing this feeling already matters. If it is heavy right now, please reach out before pulling cards — US 988, KR 1393 (24/7, free). One call right now matters more than any reading.'
  const advice = isKo
    ? '오늘은 카드 대신 전화 한 통을 권할게요. 1393에 짧게라도 연결해 보세요.'
    : 'Today, please call instead of drawing. Even a short call to 988 (US) or 1393 (KR) matters.'
  const cardInterp = isKo
    ? '오늘 카드는 잠시 멈추라는 신호로 봅니다. 지금 도와줄 수 있는 사람에게 먼저 연결해 보세요.'
    : 'This card reads as a pause signal. Reach out to someone who can help right now.'
  const positionLabel = isKo ? '쉼' : 'Pause'
  const cards = Array.from({ length: Math.max(1, input.cardCount) }, () => ({
    position: positionLabel,
    interpretation: cardInterp,
  }))
  return { overall, cards, advice }
}
