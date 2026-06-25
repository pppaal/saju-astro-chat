import DestinyShellSkeleton from '@/components/calendar/DestinyShellSkeleton'

// 운흐름 캘린더(월/일)는 서버 컴포넌트가 Swiss Ephemeris + 사주/점성 빌드를
// 동기로 수행해 cold 진입이 느릴 수 있다. 흰 깜빡임 대신 셸 결을 미리 잡는
// 스켈레톤을 Suspense fallback 으로 보여 흐름을 끊지 않는다.
export default function Loading() {
  return <DestinyShellSkeleton />
}
