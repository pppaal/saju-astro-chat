import V9Skeleton from '@/components/v9/V9Skeleton'

// 인생 흐름은 서버가 본명 + 인생 곡선(외행성 트랜짓)을 계산한 뒤 그린다 — cold 진입의
// 기다림 동안 종이 뼈대(상단 바 · 폴리오 · 제목 · 블록)를 Suspense fallback 으로.
// layout(V9Root) 안에서 렌더되므로 토큰을 그대로 쓴다.
export default function Loading() {
  return <V9Skeleton variant="page" />
}
