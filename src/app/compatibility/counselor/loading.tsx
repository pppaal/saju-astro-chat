import CounselorLoading from '@/components/branding/CounselorLoading'

// 궁합 상담사 라우트 전환 로더 — 페이지 본체(isInitializing)와 동일한 따뜻한
// 화이트 톤으로 통일. 이전엔 기본 BrandSplash(딥스페이스 보라)가 떠서, 흰
// 페이지로 들어가기 전 보라 로딩창이 깜빡이며 톤이 끊겼다.
export default function Loading() {
  return <CounselorLoading />
}
