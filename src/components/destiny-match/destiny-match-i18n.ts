// Destiny Match — KO/EN copy. destiny-map/chat-i18n.ts 와 같은 패턴.
// 페이지 단일 dict 라 nested locale JSON 에 끼지 않고 별도 파일 유지.

export type DMLang = 'ko' | 'en'

export interface DMCopy {
  pageTitle: string
  loading: string
  errorTitle: string
  errorRetry: string

  profileGateTitle: string
  profileGateBody: string
  profileGateCta: string

  emptyTitle: string
  emptyBody: string
  emptyBack: string

  // Card content
  age: (n: number) => string
  km: (n: number) => string
  compatibility: string

  // Action buttons (aria-label)
  pass: string
  superLike: string
  like: string

  // Super like exhausted toast
  superLikeExhausted: string

  // Match modal
  matchTitle: string
  matchBody: (otherName: string) => string
  matchSendMessage: string
  matchKeepSwiping: string
}

const ko: DMCopy = {
  pageTitle: '운명의 매칭',
  loading: '운명의 상대를 찾는 중…',
  errorTitle: '잠시 끊겼어요',
  errorRetry: '다시 시도',

  profileGateTitle: '먼저 매칭 프로필을 만들어주세요',
  profileGateBody: '사진과 자기소개를 등록하면 운명의 상대를 추천해드릴 수 있어요.',
  profileGateCta: '프로필 만들기',

  emptyTitle: '오늘은 여기까지!',
  emptyBody: '내일 다시 새로운 운명의 상대들이 도착해요. 잠시 후 다시 와주세요.',
  emptyBack: '운명 지도로 돌아가기',

  age: (n) => `${n}세`,
  km: (n) => `${n}km`,
  compatibility: '궁합',

  pass: '패스',
  superLike: '슈퍼 라이크',
  like: '좋아요',

  superLikeExhausted: '오늘의 슈퍼 라이크를 모두 사용했어요.',

  matchTitle: '운명이 만났어요!',
  matchBody: (otherName) => `${otherName}님과 서로 좋아요를 보냈어요`,
  matchSendMessage: '메시지 보내기',
  matchKeepSwiping: '계속 둘러보기',
}

const en: DMCopy = {
  pageTitle: 'Destiny Match',
  loading: 'Finding your destined match…',
  errorTitle: 'Connection hiccup',
  errorRetry: 'Try again',

  profileGateTitle: 'Create your match profile first',
  profileGateBody: 'Add a photo and a short bio so we can suggest your destined matches.',
  profileGateCta: 'Create profile',

  emptyTitle: "That's everyone for now!",
  emptyBody: 'New destined matches arrive tomorrow. Come back in a bit.',
  emptyBack: 'Back to Destiny Map',

  age: (n) => `${n}`,
  km: (n) => `${n} km away`,
  compatibility: 'Compatibility',

  pass: 'Pass',
  superLike: 'Super Like',
  like: 'Like',

  superLikeExhausted: "You've used all of today's super likes.",

  matchTitle: "It's a match!",
  matchBody: (otherName) => `You and ${otherName} liked each other`,
  matchSendMessage: 'Send a message',
  matchKeepSwiping: 'Keep swiping',
}

export const DM_I18N: Record<DMLang, DMCopy> = { ko, en }

export function pickDMCopy(locale: string): DMCopy {
  return locale === 'ko' ? ko : en
}
