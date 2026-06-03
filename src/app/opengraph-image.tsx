import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-image'

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'DestinyPal — AI Saju, Astrology, Tarot & Compatibility'

// 루트 기본 OG 카드 — 홈(= 레퍼럴 /?ref= 링크) 및 자체 OG 가 없는 모든 라우트의
// 링크 미리보기. 카톡/와츠앱/슬랙/트위터 등 모든 공유 채널이 이 이미지를 읽는다.
// (tarot/compatibility/destiny-counselor 는 각자 opengraph-image 로 override.)
export default function OgImage() {
  return generateOgImage({
    title: 'Your Destiny, Powered by AI',
    subtitle: 'AI Saju · Astrology · Tarot · Compatibility',
    emoji: '🔮',
  })
}
