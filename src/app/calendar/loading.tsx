import V9Skeleton from '@/components/v9/V9Skeleton'

// 운세 달력(월·일)은 서버 컴포넌트가 Swiss Ephemeris + 사주/점성 빌드를 마친 뒤 그린다 —
// cold 진입의 기다림 동안 종이 뼈대(상단 바 · 폴리오 · 제목 · 블록)를 Suspense fallback 으로.
// layout(V9Root) 안에서 렌더되므로 토큰을 그대로 쓴다.
export default function Loading() {
  return <V9Skeleton variant="page" />
}
