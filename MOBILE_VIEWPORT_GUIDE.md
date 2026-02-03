# 모바일 Viewport 및 PWA 설정 가이드

## 📱 HTML Head 필수 메타 태그

다음 메타 태그들이 `app/layout.tsx` 또는 HTML head에 포함되어 있는지 확인하세요.

### 1. Viewport 메타 태그 (필수)

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover"
/>
```

**설명**:

- `width=device-width`: 화면 너비를 기기 너비에 맞춤
- `initial-scale=1`: 초기 줌 레벨 1.0 (100%)
- `maximum-scale=5`: 최대 5배까지 줌 허용 (접근성)
- `user-scalable=yes`: 사용자 줌 허용 (접근성 필수)
- `viewport-fit=cover`: iPhone 노치/Dynamic Island 영역까지 확장

### 2. iOS Web App 메타 태그

```html
<!-- iOS Web App 모드 활성화 -->
<meta name="apple-mobile-web-app-capable" content="yes" />

<!-- iOS 상태바 스타일 -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- iOS 앱 타이틀 -->
<meta name="apple-mobile-web-app-title" content="사주 점성술" />
```

### 3. PWA 필수 메타 태그

```html
<!-- PWA 앱 이름 -->
<meta name="application-name" content="사주 점성술" />

<!-- 테마 컬러 (주소창 색상) -->
<meta name="theme-color" content="#0d1225" />
<meta name="msapplication-navbutton-color" content="#0d1225" />
<meta name="apple-mobile-web-app-status-bar-style" content="#0d1225" />

<!-- 타일 색상 (Windows) -->
<meta name="msapplication-TileColor" content="#0d1225" />
```

### 4. 터치 아이콘

```html
<!-- iOS 홈 스크린 아이콘 -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- 일반 파비콘 -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

<!-- Android 홈 스크린 아이콘 -->
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
```

### 5. Manifest 파일

```html
<link rel="manifest" href="/manifest.json" />
```

---

## 📄 manifest.json 설정

`public/manifest.json` 파일에 다음 내용이 포함되어야 합니다:

```json
{
  "name": "사주 점성술 채팅",
  "short_name": "사주점성술",
  "description": "AI 기반 사주, 타로, 운세 상담 서비스",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1225",
  "theme_color": "#0d1225",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["lifestyle", "entertainment", "personalization"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "640x1136",
      "type": "image/png",
      "platform": "narrow"
    },
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1920x1080",
      "type": "image/png",
      "platform": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "사주 보기",
      "short_name": "사주",
      "description": "내 사주 운세 확인하기",
      "url": "/saju",
      "icons": [{ "src": "/icons/saju-96.png", "sizes": "96x96" }]
    },
    {
      "name": "타로 카드",
      "short_name": "타로",
      "description": "타로 카드 상담",
      "url": "/tarot",
      "icons": [{ "src": "/icons/tarot-96.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## 🎨 필요한 아이콘 파일들

다음 아이콘 파일들을 `public/` 디렉토리에 생성해야 합니다:

### 필수 아이콘

- `/favicon.ico` - 32x32 또는 16x16
- `/favicon-16x16.png` - 16x16
- `/favicon-32x32.png` - 32x32
- `/apple-touch-icon.png` - 180x180 (iOS)
- `/android-chrome-192x192.png` - 192x192
- `/android-chrome-512x512.png` - 512x512

### 옵션 아이콘

- `/safari-pinned-tab.svg` - SVG (Safari)
- `/mstile-150x150.png` - 150x150 (Windows)

### 아이콘 생성 팁

1. **온라인 도구 사용**: [RealFaviconGenerator](https://realfavicongenerator.net/)
2. **디자인 권장사항**:
   - 단순하고 인식하기 쉬운 디자인
   - 배경은 테마 색상 (#0d1225)과 대비되는 색
   - 텍스트보다는 심볼/아이콘 사용

---

## 🔧 Next.js에서 설정하기

### app/layout.tsx 예시

```tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0d1225',
}

export const metadata: Metadata = {
  title: '사주 점성술 채팅',
  description: 'AI 기반 사주, 타로, 운세 상담 서비스',
  applicationName: '사주점성술',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '사주점성술',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}
```

---

## ✅ 체크리스트

### 필수 설정

- [ ] Viewport 메타 태그 추가 (viewport-fit=cover 포함)
- [ ] 테마 색상 메타 태그 추가
- [ ] manifest.json 파일 생성
- [ ] 파비콘 아이콘 생성 (최소 3개: 16x16, 32x32, 180x180)
- [ ] PWA 아이콘 생성 (192x192, 512x512)

### 권장 설정

- [ ] iOS Web App 메타 태그 추가
- [ ] manifest.json에 shortcuts 추가
- [ ] PWA 스크린샷 추가
- [ ] Service Worker 등록 (오프라인 지원)

### 테스트

- [ ] iOS Safari에서 "홈 화면에 추가" 테스트
- [ ] Android Chrome에서 "홈 화면에 추가" 테스트
- [ ] iPhone 노치/Dynamic Island 영역 확인
- [ ] 다양한 화면 크기에서 viewport 동작 확인
- [ ] Chrome DevTools Lighthouse로 PWA 점수 확인

---

## 🧪 테스트 방법

### 1. iOS 테스트

1. Safari에서 사이트 열기
2. 공유 버튼 → "홈 화면에 추가"
3. 앱 아이콘과 스플래시 스크린 확인
4. 노치 영역에 컨텐츠가 가려지지 않는지 확인

### 2. Android 테스트

1. Chrome에서 사이트 열기
2. 메뉴 → "앱 설치" 또는 자동 프롬프트 대기
3. 설치 후 아이콘과 테마 색상 확인

### 3. PWA 점수 확인

```bash
# Chrome DevTools에서
1. F12 → Lighthouse 탭
2. "Progressive Web App" 체크
3. "Analyze page load" 실행
4. 90점 이상 목표
```

---

## 📚 참고 자료

- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [MDN - Viewport Meta Tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
- [Apple - Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Next.js - Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

---

## 🚀 빠른 시작

1. **아이콘 생성**:

   ```bash
   # RealFaviconGenerator 사용 (https://realfavicongenerator.net/)
   # 로고 이미지 업로드 → 모든 플랫폼 아이콘 자동 생성
   ```

2. **layout.tsx 업데이트**:

   ```tsx
   // viewport 및 metadata 설정 추가
   ```

3. **manifest.json 생성**:

   ```bash
   # public/manifest.json 파일 생성
   ```

4. **테스트**:
   ```bash
   npm run dev
   # iOS Safari 및 Android Chrome에서 확인
   ```

---

**작성일**: 2026-02-02
**업데이트**: 모바일 UX 최적화 프로젝트의 일환
