import { redirect } from 'next/navigation'

// /tarot/couple — 출시 전 임시 hide. destiny-match 와 함께 나중에 출시 예정.
// (커플 타로는 매칭된 파트너가 있어야 동작하는데 destiny-match 자체가 아직
//  hide 라 진입점이 없다.)
//
// UI(파트너/스프레드/질문 선택 + 로컬 드래프트 + 크레딧 선제 안내)와 백엔드
// (/api/tarot/couple-reading) 는 그대로 두어 출시 시 복구는 이 파일을 git
// 히스토리의 클라이언트 컴포넌트로 되돌리기만 하면 된다.
//
// 지금은 URL 을 직접 쳐도 타로 홈으로 보낸다.
export default function CoupleTarotPage(): never {
  redirect('/tarot')
}
