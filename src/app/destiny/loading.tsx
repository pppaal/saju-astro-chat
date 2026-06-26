import DestinyShellSkeleton from '@/components/calendar/DestinyShellSkeleton'

// 인생 흐름(인생·10년·1년)은 1년 풀빌드(Swiss Ephemeris)라 cold 진입이 느릴 수
// 있어, 셸 결을 미리 잡는 스켈레톤을 Suspense fallback 으로 보여준다.
export default function Loading() {
  return <DestinyShellSkeleton />
}
