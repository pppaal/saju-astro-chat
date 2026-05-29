/**
 * PWA (Progressive Web App) 표준화 모드 감지.
 *
 * Android Chrome / Safari 가 "홈 화면에 추가" 로 설치된 후 standalone
 * 모드로 떠 있을 때 true. 일반 모바일 브라우저 탭은 false.
 *
 * 왜 필요한가:
 *   PWA standalone 모드에서 OAuth (Google 로그인) 흐름이 깨질 수 있다.
 *   - 외부 브라우저가 OAuth 페이지를 띄우면 callback 시 PWA 로 돌아오지
 *     못함 → 사용자가 PWA 안에서 "로그인 안 됨" 상태로 멈춤
 *   - 일부 브라우저는 Custom Tabs 로 처리해 정상이지만, 보장 X
 *
 * 사용처:
 *   - GoogleLoginPanel / CreditDepletedModal — PWA 사용자에게 "브라우저
 *     에서 열어 주세요" 경고 + URL 복사 버튼 제공
 *
 * Browser-only. SSR 중엔 false 반환 (hydration mismatch 방지).
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  // Modern detection — display-mode media query (Chrome / Safari / FF).
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari "Add to Home Screen" — legacy property, only true in standalone.
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return false
}
