import CounselorLoading from '@/components/branding/CounselorLoading'

// 메인 ↔ 운명/궁합 상담사가 거의 똑같이 생겨서, 전환 시 같은 연속 로더(가운데
// 도는 DP 로고)를 양방향으로 쓴다. 로딩이 끝나면 로고가 사라지고 도착 페이지가
// 그대로 드러난다 — 별도 로딩 화면이 번쩍이지 않게.
export default function Loading() {
  return <CounselorLoading />
}
