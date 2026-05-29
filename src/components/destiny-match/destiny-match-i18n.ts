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

  // Report
  profileDetails: string
  report: string
  reportTitle: string
  reportBody: (otherName: string) => string
  reportCategoryLabel: string
  reportCategoryInappropriate: string
  reportCategorySpam: string
  reportCategoryFake: string
  reportCategoryHarassment: string
  reportCategoryOther: string
  reportDescriptionLabel: string
  reportDescriptionPlaceholder: string
  reportSubmit: string
  reportCancel: string
  reportSubmitting: string
  reportSuccess: string
  reportError: string
  reportAlready: string
}

export const REPORT_CATEGORIES = [
  'inappropriate',
  'spam',
  'fake',
  'harassment',
  'other',
] as const

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export function reportCategoryLabel(copy: DMCopy, category: ReportCategory): string {
  switch (category) {
    case 'inappropriate':
      return copy.reportCategoryInappropriate
    case 'spam':
      return copy.reportCategorySpam
    case 'fake':
      return copy.reportCategoryFake
    case 'harassment':
      return copy.reportCategoryHarassment
    case 'other':
      return copy.reportCategoryOther
  }
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

  profileDetails: '프로필 자세히',
  report: '신고',
  reportTitle: '사용자 신고',
  reportBody: (otherName) => `${otherName}님을 신고하는 이유를 선택해주세요.`,
  reportCategoryLabel: '신고 사유',
  reportCategoryInappropriate: '부적절한 콘텐츠',
  reportCategorySpam: '스팸 / 광고',
  reportCategoryFake: '가짜 프로필',
  reportCategoryHarassment: '괴롭힘 / 위협',
  reportCategoryOther: '기타',
  reportDescriptionLabel: '상세 설명 (선택)',
  reportDescriptionPlaceholder: '구체적인 내용을 적어주세요.',
  reportSubmit: '신고하기',
  reportCancel: '취소',
  reportSubmitting: '제출 중…',
  reportSuccess: '신고가 접수되었습니다.',
  reportError: '신고에 실패했어요. 잠시 후 다시 시도해주세요.',
  reportAlready: '이미 신고한 사용자입니다. 24시간 후 다시 시도해주세요.',
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

  profileDetails: 'View profile',
  report: 'Report',
  reportTitle: 'Report user',
  reportBody: (otherName) => `Tell us why you're reporting ${otherName}.`,
  reportCategoryLabel: 'Reason',
  reportCategoryInappropriate: 'Inappropriate content',
  reportCategorySpam: 'Spam / ads',
  reportCategoryFake: 'Fake profile',
  reportCategoryHarassment: 'Harassment / threats',
  reportCategoryOther: 'Other',
  reportDescriptionLabel: 'Details (optional)',
  reportDescriptionPlaceholder: 'Add any specifics that help us review.',
  reportSubmit: 'Submit report',
  reportCancel: 'Cancel',
  reportSubmitting: 'Submitting…',
  reportSuccess: 'Your report has been submitted.',
  reportError: 'Could not submit the report. Please try again later.',
  reportAlready: 'You already reported this user. Try again in 24 hours.',
}

export const DM_I18N: Record<DMLang, DMCopy> = { ko, en }

export function pickDMCopy(locale: string): DMCopy {
  return locale === 'ko' ? ko : en
}
