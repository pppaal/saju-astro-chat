/**
 * 운명상담사 빈 채팅 hero 문구 풀.
 *
 * 시간대(사용자 기기 tz 기준) × 언어로 분기. 이름이 있으면 {name}-템플릿도
 * 후보에 포함되어 자연스럽게 호명. 매 방문마다 같은 시간대 안에서도 다른
 * 문구가 나오게 랜덤 픽 — LLM 없이 "사람·시간대마다 다른 인사" 효과.
 *
 * 토픽({topic}) 개인화는 raw 도메인 코드(love/career 등)를 사람이 읽을
 * 라벨로 매핑하는 작업이 필요해 v1에선 제외. 차후 라벨 매퍼 추가 시 합류.
 */

type Lang = 'ko' | 'en'
type Bucket = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'

// 사용자 로컬 시각(시 단위)을 6개 버킷으로.
function bucketForHour(h: number): Bucket {
  if (h < 6) return 'dawn'
  if (h < 11) return 'morning'
  if (h < 14) return 'noon'
  if (h < 18) return 'afternoon'
  if (h < 22) return 'evening'
  return 'night'
}

function localHour(tz?: string): number {
  try {
    const effectiveTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: effectiveTz,
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
    // "24" 가 나올 수 있으므로 mod 24.
    const h = parseInt(formatted, 10)
    return Number.isFinite(h) ? h % 24 : new Date().getHours()
  } catch {
    return new Date().getHours()
  }
}

const POOL: Record<Lang, Record<Bucket, string[]>> = {
  ko: {
    dawn: [
      '잠 못 드는 밤이네요.',
      '고요한 시간이에요.',
      '이런 시간에 무슨 일이세요?',
      '마음에 뭔가 있어서 깨어 있는 거예요?',
      '{name}님, 깨어 있으셨네요.',
      '{name}님, 새벽이에요. 괜찮으세요?',
    ],
    morning: [
      '좋은 아침이에요.',
      '오늘 하루 어떻게 시작해볼까요?',
      '잠은 잘 주무셨어요?',
      '아침에 무슨 생각이 드세요?',
      '{name}님, 좋은 아침이에요.',
      '{name}님, 오늘 어떤 하루가 될 것 같아요?',
    ],
    noon: [
      '점심은 드셨어요?',
      '한낮의 흐름이에요.',
      '오늘 어떤 게 궁금하세요?',
      '오전 어떻게 보냈어요?',
      '{name}님, 잠깐 쉬어가요.',
    ],
    afternoon: [
      '오후네요.',
      '한숨 돌리는 시간이에요.',
      '지금 마음이 어때요?',
      '오늘 뭐가 제일 마음에 남아요?',
      '{name}님, 오후도 잘 보내고 계세요?',
    ],
    evening: [
      '저녁이네요. 오늘은 어땠어요?',
      '퇴근하셨어요?',
      '하루를 정리할 시간이에요.',
      '오늘 하루 중 떠오르는 장면 있어요?',
      '{name}님, 오늘 수고했어요.',
      '{name}님, 저녁이에요. 한숨 돌렸어요?',
    ],
    night: [
      '오늘 하루 수고했어요.',
      '잠들기 전에 뭐가 마음에 남았어요?',
      '조용한 밤이에요.',
      '이불 속에서 떠오르는 생각 있어요?',
      '{name}님, 오늘도 잘 마무리하세요.',
    ],
  },
  en: {
    dawn: [
      'Up at this hour?',
      'A quiet hour.',
      'Something on your mind tonight?',
      '{name}, still awake?',
      '{name}, are you alright at this hour?',
    ],
    morning: [
      'Good morning.',
      "How's the day starting?",
      'Sleep well?',
      'What kind of day do you want this to be?',
      '{name}, good morning.',
      "{name}, how's the morning treating you?",
    ],
    noon: [
      'Midday already.',
      'Had lunch?',
      "What's on your mind today?",
      "{name}, take a breath.",
    ],
    afternoon: [
      'Afternoon.',
      "How's it going so far?",
      "What's sitting with you right now?",
      "{name}, hope you're easing through.",
    ],
    evening: [
      'Evening. How was today?',
      'Off work?',
      'Time to put the day down.',
      'Anything from today still lingering?',
      '{name}, you made it through.',
    ],
    night: [
      'Long day. How are you?',
      'Anything sticking with you?',
      'A quiet night.',
      '{name}, wind it down gently.',
    ],
  },
}

const FALLBACK: Record<Lang, string> = {
  ko: '오늘 어떤 게 궁금하세요?',
  en: "What's on your mind today?",
}

export interface PickGreetingInput {
  lang: Lang
  /** 사용자 이름. 있으면 {name}-템플릿도 후보에 포함. */
  name?: string
  /** 사용자 기기 시간대(IANA). 없으면 브라우저 기본/Asia/Seoul. */
  tz?: string
  /** 테스트용 결정적 시드. 생략 시 Math.random(). */
  seed?: number
}

/**
 * 시간대 + (옵션) 이름 → 풀에서 한 문구 픽 후 치환.
 * 같은 입력에 대해 매번 다른 결과가 나옴(랜덤). 결정성이 필요하면 seed 주입.
 */
export function pickGreeting(input: PickGreetingInput): string {
  const hour = localHour(input.tz)
  const bucket = bucketForHour(hour)
  const pool = POOL[input.lang]?.[bucket] ?? []
  const hasName = Boolean(input.name && input.name.trim())
  const eligible = pool.filter((t) => (t.includes('{name}') ? hasName : true))
  if (eligible.length === 0) return FALLBACK[input.lang]
  const idx =
    typeof input.seed === 'number'
      ? ((input.seed % eligible.length) + eligible.length) % eligible.length
      : Math.floor(Math.random() * eligible.length)
  const template = eligible[idx] ?? eligible[0]
  return template.replace(/\{name\}/g, (input.name ?? '').trim())
}
