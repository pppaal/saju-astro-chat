import { redirect } from 'next/navigation'

/**
 * /destiny-map 진입 시 바로 상담 페이지로 redirect.
 *
 * 옛 entry 는 marketing landing (Hero + feature pills + "Start report" CTA) 였는데
 * 사용자가 "운명상담사 → 상담 페이지 바로 안 들어감" 피드백. 메뉴 클릭 → 상담
 * 페이지 1-hop 으로 통일.
 *
 * SEO: 정작 hero copy / disclaimers 가 콘텐츠 가치가 작아서 단순 redirect.
 * 필요 시 별도 `/about/destiny-map` 같은 marketing path 로 분리.
 */
export default function DestinyMapPage() {
  redirect('/destiny-map/counselor')
}
