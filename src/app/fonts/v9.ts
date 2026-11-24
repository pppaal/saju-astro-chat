import 'server-only'
import localFont from 'next/font/local'

// v9 "paper" 화면(홈·인생 흐름·캘린더) 전용 폰트. 루트 layout.tsx 와 같은
// next/font/local 셀프호스팅 패턴 — 빌드가 fonts.googleapis.com 에 닿지 않는다.
// 파일은 @fontsource 5.3.0 latin 서브셋(OFL-1.1, 라이선스 원문은 ./OFL-*.txt).
//
// 한글·한자 웹폰트는 싣지 않는다(오너 결정): 한글/한자는 앱 전체와 같은
// 시스템 CJK 스택으로 떨어진다 — tokens.module.css 의 --sans/--hanja 참고.
//
// server-only: 서버 컴포넌트(V9Root, 라우트 layout/page)에서만 import 한다 —
// 클라이언트 번들에 끌려 들어가면 빌드가 실패한다. vitest 에선 next/font/local
// 이 SWC 변환 없이 비어 있으므로 tests/setup.ts 의 전역 목이 대신 응답한다.

export const v9Sans = localFont({
  src: [
    { path: './schibsted-grotesk-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './schibsted-grotesk-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './schibsted-grotesk-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './schibsted-grotesk-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-v9-sans',
})

export const v9Mono = localFont({
  src: [
    { path: './ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './ibm-plex-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-v9-mono',
  preload: false,
})

// 타입 이름·까치 보이스에만 쓰는 이탤릭 한 컷.
export const v9Serif = localFont({
  src: [{ path: './instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' }],
  display: 'swap',
  variable: '--font-v9-serif',
  preload: false,
})

/** v9 루트 요소에 붙이는 next/font 변수 클래스 묶음(--font-v9-sans/mono/serif). */
export const v9FontVars = [v9Sans.variable, v9Mono.variable, v9Serif.variable].join(' ')
