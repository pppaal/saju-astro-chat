import { redirect } from 'next/navigation'

// /tarot/couple/[readingId] — 커플 타로 결과 뷰어. 커플 타로 진입(/tarot/couple)
// 이 출시 전 hide 라 함께 가린다. 복구 시 git 히스토리의 클라이언트 컴포넌트로
// 되돌리면 된다. 지금은 직접 URL 진입도 타로 홈으로 보낸다.
export default function CoupleTarotReadingPage(): never {
  redirect('/tarot')
}
