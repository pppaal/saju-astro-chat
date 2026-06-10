import CounselorLoading from '@/components/branding/CounselorLoading'

// 캘린더(운흐름 5-tier)는 운명상담사에서 진입한다. 서버 컴포넌트가 Swiss
// Ephemeris + 사주/점성 빌드를 동기로 수행해 cold 진입이 느릴 수 있으므로,
// 상담사와 동일한 연속 로더(가운데 도는 DP 로고)를 보여 흐름을 끊지 않는다.
export default function Loading() {
  return <CounselorLoading />
}
