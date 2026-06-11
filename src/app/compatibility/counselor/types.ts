// 궁합 상담사 화면 공용 타입 — page.tsx 분해(채팅 영역/모달 묶음/어댑터 훅)로
// 여러 파일이 같은 모양을 쓰게 되어 한 곳으로 추출.

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  /** Stream cut mid-response → bubble shows a "다시 시도" retry button. */
  incomplete?: boolean
}

export type PersonData = {
  name: string
  date: string
  time: string
  city: string
  latitude?: number
  longitude?: number
  timeZone?: string
  relation?: string
  /** 대운 순/역행이 음양남녀에 따라 갈리므로 빠지면 잘못 계산됨. */
  gender?: 'M' | 'F' | 'Male' | 'Female'
}
