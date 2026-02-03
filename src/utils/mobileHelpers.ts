/**
 * Mobile Helper Utilities
 * 모바일 환경을 위한 유틸리티 함수들
 */

/**
 * 키보드가 입력 필드를 가리지 않도록 스크롤
 * @param element - 스크롤할 요소
 * @param offset - 추가 오프셋 (기본: 20px)
 */
export function scrollIntoViewIfNeeded(element: HTMLElement, offset = 20): void {
  if (!element) return

  // 모바일 환경 확인
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  if (!isMobile) return

  setTimeout(() => {
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.visualViewport?.height || window.innerHeight

    // 요소가 뷰포트 밖에 있거나 하단에 너무 가까우면 스크롤
    if (rect.bottom > viewportHeight - offset || rect.top < 0) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, 300) // 키보드 애니메이션 대기
}

/**
 * iOS 키보드 높이 감지 및 처리
 * @param callback - 키보드 높이 변경 시 실행될 콜백
 * @returns cleanup 함수
 */
export function watchKeyboardHeight(callback: (height: number) => void): () => void {
  if (!window.visualViewport) {
    return () => {}
  }

  const handleResize = () => {
    const vh = window.visualViewport?.height || window.innerHeight
    const wh = window.innerHeight
    const keyboardHeight = Math.max(0, wh - vh)
    callback(keyboardHeight)
  }

  window.visualViewport.addEventListener('resize', handleResize)
  window.visualViewport.addEventListener('scroll', handleResize)

  return () => {
    window.visualViewport?.removeEventListener('resize', handleResize)
    window.visualViewport?.removeEventListener('scroll', handleResize)
  }
}

/**
 * 네이티브 공유 API 사용 가능 여부 확인
 */
export function isNativeShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share
}

/**
 * 네이티브 공유 실행
 * @param data - 공유할 데이터
 * @returns 성공 여부
 */
export async function nativeShare(data: {
  title?: string
  text?: string
  url?: string
}): Promise<boolean> {
  if (!isNativeShareAvailable()) {
    return false
  }

  try {
    await navigator.share(data)
    return true
  } catch (err) {
    // 사용자가 취소한 경우는 에러가 아님
    if ((err as Error).name === 'AbortError') {
      return false
    }
    console.error('Share failed:', err)
    return false
  }
}

/**
 * 클립보드에 복사
 * @param text - 복사할 텍스트
 * @returns 성공 여부
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    return successful
  } catch (err) {
    console.error('Copy failed:', err)
    return false
  }
}

/**
 * 햅틱 피드백 트리거
 * @param intensity - 진동 강도
 */
export function triggerHaptic(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (!('vibrate' in navigator)) return

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 50,
  }

  navigator.vibrate(patterns[intensity])
}

/**
 * 햅틱 피드백 - 성공 패턴
 */
export function hapticSuccess(): void {
  if (!('vibrate' in navigator)) return
  navigator.vibrate([10, 50, 10])
}

/**
 * 햅틱 피드백 - 에러 패턴
 */
export function hapticError(): void {
  if (!('vibrate' in navigator)) return
  navigator.vibrate([50, 100, 50])
}

/**
 * 햅틱 피드백 - 경고 패턴
 */
export function hapticWarning(): void {
  if (!('vibrate' in navigator)) return
  navigator.vibrate([30, 50, 30, 50, 30])
}

/**
 * Safe Area Insets 가져오기
 */
export function getSafeAreaInsets(): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const style = getComputedStyle(document.documentElement)

  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  }
}

/**
 * 모바일 디바이스 타입 감지
 */
export function getMobileDeviceType(): 'ios' | 'android' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent

  if (/iPad|Tablet/i.test(ua)) {
    return 'tablet'
  }

  if (/iPhone|iPod/i.test(ua)) {
    return 'ios'
  }

  if (/Android/i.test(ua)) {
    return 'android'
  }

  return 'desktop'
}

/**
 * iOS 여부 확인
 */
export function isIOS(): boolean {
  return getMobileDeviceType() === 'ios'
}

/**
 * Android 여부 확인
 */
export function isAndroid(): boolean {
  return getMobileDeviceType() === 'android'
}

/**
 * 네트워크 속도 감지 (Network Information API)
 */
export function getNetworkSpeed(): 'slow' | 'medium' | 'fast' | 'unknown' {
  if (!('connection' in navigator)) {
    return 'unknown'
  }

  const connection = (navigator as any).connection
  const effectiveType = connection?.effectiveType

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow'
    case '3g':
      return 'medium'
    case '4g':
    case '5g':
      return 'fast'
    default:
      return 'unknown'
  }
}

/**
 * 배터리 절약 모드 여부 확인
 */
export async function isBatterySaverMode(): Promise<boolean> {
  if (!('getBattery' in navigator)) {
    return false
  }

  try {
    const battery = await (navigator as any).getBattery()
    // 배터리가 20% 이하이거나 충전 중이 아니면 절약 모드로 간주
    return battery.level < 0.2 && !battery.charging
  } catch {
    return false
  }
}

/**
 * Reduced Motion 설정 확인
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 다크 모드 선호도 확인
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 고대비 모드 확인 (접근성)
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches
}

/**
 * 터치 디바이스 여부 확인
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

/**
 * 뷰포트 크기 가져오기 (키보드 고려)
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.visualViewport?.width || window.innerWidth,
    height: window.visualViewport?.height || window.innerHeight,
  }
}

/**
 * 폼 필드 자동 스크롤 설정
 * @param formElement - 폼 요소
 */
export function setupFormAutoScroll(formElement: HTMLFormElement): () => void {
  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      scrollIntoViewIfNeeded(target)
    }
  }

  formElement.addEventListener('focusin', handleFocus)

  return () => {
    formElement.removeEventListener('focusin', handleFocus)
  }
}

/**
 * Body 스크롤 잠금/해제
 */
export const bodyScrollLock = {
  lock(): void {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
  },

  unlock(): void {
    const scrollY = document.body.style.top
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    window.scrollTo(0, parseInt(scrollY || '0') * -1)
  },
}

/**
 * 방향 변경 감지
 */
export function watchOrientation(
  callback: (orientation: 'portrait' | 'landscape') => void
): () => void {
  const handleOrientationChange = () => {
    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    callback(orientation)
  }

  window.addEventListener('resize', handleOrientationChange)
  window.addEventListener('orientationchange', handleOrientationChange)

  // 초기 호출
  handleOrientationChange()

  return () => {
    window.removeEventListener('resize', handleOrientationChange)
    window.removeEventListener('orientationchange', handleOrientationChange)
  }
}

/**
 * 입력 필드 포커스 시 자동으로 최상단으로 스크롤 (iOS 대응)
 */
export function preventIOSInputZoom(): void {
  if (!isIOS()) return

  // iOS에서 font-size가 16px 미만인 input을 찾아서 조정
  const style = document.createElement('style')
  style.textContent = `
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="search"],
    input[type="tel"],
    input[type="url"],
    input[type="number"],
    textarea,
    select {
      font-size: 16px !important;
    }
  `
  document.head.appendChild(style)
}

/**
 * 모바일 전용 CSS 클래스 토글
 */
export function toggleMobileClass(): void {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const deviceType = getMobileDeviceType()

  document.documentElement.classList.toggle('is-mobile', isMobile)
  document.documentElement.classList.toggle('is-ios', deviceType === 'ios')
  document.documentElement.classList.toggle('is-android', deviceType === 'android')
  document.documentElement.classList.toggle('is-tablet', deviceType === 'tablet')
  document.documentElement.classList.toggle('is-touch', isTouchDevice())
}

/**
 * 초기화 함수 - 앱 시작 시 호출
 */
export function initMobileOptimizations(): void {
  toggleMobileClass()
  preventIOSInputZoom()

  // Reduced motion 감지
  if (prefersReducedMotion()) {
    document.documentElement.classList.add('reduce-motion')
  }

  // High contrast 감지
  if (prefersHighContrast()) {
    document.documentElement.classList.add('high-contrast')
  }
}
