import { redirect } from 'next/navigation'

// /destiny-match — 출시 전 임시 hide. 사용자: "우리 화면에서 가려 일단".
//
// UI(SwipeScreen, SwipeCard, MatchModal 등) 와 backend(API, Prisma, 궁합
// 엔진) 는 PR #885 로 main 에 들어가 있고 그대로 두어 출시 시 복구 1 줄.
// 출시 준비되면 아래를 다음으로 교체:
//
//   'use client'
//   import { SwipeScreen } from '@/components/destiny-match/SwipeScreen'
//   // ...로그인 가드 + <SwipeScreen />
//
// 지금은 사용자가 URL 을 직접 쳐도 메인으로 보낸다.
export default function DestinyMatchPage(): never {
  redirect('/')
}
