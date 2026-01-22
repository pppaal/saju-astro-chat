# 🎨 로딩 스켈레톤 사용 가이드

> 사용자가 로딩 중에도 **실제 페이지와 똑같은 모양**을 보여서 답답함을 줄이는 UX 개선 가이드

## 📚 목차
- [왜 로딩 스켈레톤이 중요한가?](#왜-로딩-스켈레톤이-중요한가)
- [사용 가능한 스켈레톤들](#사용-가능한-스켈레톤들)
- [사용 방법](#사용-방법)
- [커스터마이징](#커스터마이징)

---

## 왜 로딩 스켈레톤이 중요한가?

### 🔴 나쁜 예 (일반적인 로딩 화면)
```
화면이 텅 비어있고...
가운데 "로딩 중..." 글자만 빙글빙글 돈다
👉 사용자: "언제 끝나지? 뭐가 나올지도 모르겠네..."
```

### ✅ 좋은 예 (로딩 스켈레톤)
```
실제 페이지 모양 그대로 보이고...
회색 반짝이는 박스들이 서서히 깜빡인다
👉 사용자: "아! 이런 모양으로 나오는구나. 곧 로딩될 것 같네!"
```

**효과:**
- 체감 로딩 시간 **30-40% 단축** (실제로 빨라지진 않지만 덜 답답함)
- 이탈률 감소
- 프로페셔널한 느낌

---

## 사용 가능한 스켈레톤들

### 1️⃣ TarotPageSkeleton - 타로 메인 페이지
```typescript
import { TarotPageSkeleton } from "@/components/ui/TarotPageSkeleton";

export default function Loading() {
  return <TarotPageSkeleton />;
}
```

**어떻게 보일까?**
- 🔮 타로 아이콘
- ✨ 검색창 모양
- 🏷️ 빠른 질문 태그들 (6개)
- 💡 하단 설명 텍스트

**언제 쓸까?**
- `/app/tarot/loading.tsx` ✅ 이미 적용됨

---

### 2️⃣ DestinyMapSkeleton - 사주/운세 입력 페이지
```typescript
import { DestinyMapSkeleton } from "@/components/ui/DestinyMapSkeleton";

export default function Loading() {
  return <DestinyMapSkeleton />;
}
```

**어떻게 보일까?**
- 🌟 사주 아이콘
- 📝 입력 폼 (이름, 성별, 생년월일, 출생시간, 출생지)
- 🔘 제출 버튼 모양
- 💡 하단 힌트

**언제 쓸까?**
- `/app/destiny-map/loading.tsx` ✅ 이미 적용됨
- `/app/saju/loading.tsx` (사주 관련 페이지)

---

### 3️⃣ CalendarSkeleton - 운세 캘린더
```typescript
import { CalendarSkeleton } from "@/components/ui/CalendarSkeleton";

export default function Loading() {
  return <CalendarSkeleton />;
}
```

**어떻게 보일까?**
- 📅 캘린더 아이콘
- ◀️ 2025년 1월 ▶️ (월 네비게이션)
- 📆 요일 헤더 (일/월/화/수/목/금/토)
- 📅 35개 날짜 칸 (5주)
- 🎨 등급 표시 범례

**언제 쓸까?**
- `/app/calendar/loading.tsx` ✅ 이미 적용됨

---

### 4️⃣ ChatSkeleton - 채팅 상담 페이지
```typescript
import { ChatSkeleton } from "@/components/ui/ChatSkeleton";

export default function Loading() {
  return <ChatSkeleton />;
}
```

**어떻게 보일까?**
- 🤖 AI 아바타
- 💬 메시지 버블 3개
- ⌨️ 입력창
- 💬 타이핑 인디케이터 (점 3개 깜빡임)

**언제 쓸까?**
- `/app/tarot/[categoryName]/[spreadId]/loading.tsx` (타로 채팅)
- `/app/destiny-map/counselor/loading.tsx` (운세 상담)
- `/app/compatibility/chat/loading.tsx` (궁합 상담)

---

## 사용 방법

### Step 1: loading.tsx 파일 만들기

Next.js에서는 `loading.tsx` 파일을 만들면 **자동으로** 해당 페이지 로딩 시 표시됩니다!

```
📁 app
  📁 tarot
    📄 page.tsx       ← 실제 페이지
    📄 loading.tsx    ← 로딩 중에 보여질 화면
```

### Step 2: 적절한 스켈레톤 선택

| 페이지 타입 | 사용할 스켈레톤 |
|------------|----------------|
| 🔮 타로 메인 | `TarotPageSkeleton` |
| 🌟 사주/운세 입력 | `DestinyMapSkeleton` |
| 📅 캘린더 | `CalendarSkeleton` |
| 💬 채팅/상담 | `ChatSkeleton` |
| 📋 일반 폼 | `PageLoading variant="form"` |
| 🎴 카드 그리드 | `PageLoading variant="card"` |

### Step 3: loading.tsx에 코드 작성

```typescript
// app/your-page/loading.tsx
import { TarotPageSkeleton } from "@/components/ui/TarotPageSkeleton";

export default function Loading() {
  return <TarotPageSkeleton />;
}
```

끝! 이제 페이지 로딩 시 자동으로 스켈레톤이 보입니다! 🎉

---

## 커스터마이징

### 미니 버전 사용하기

채팅 스켈레톤에는 작은 버전도 있습니다:

```typescript
import { MiniChatSkeleton } from "@/components/ui/ChatSkeleton";

// 모달이나 작은 영역에서 사용
<MiniChatSkeleton />
```

### 타로 카드 뽑기 페이지용

```typescript
import { TarotReadingSkeleton } from "@/components/ui/TarotPageSkeleton";

export default function Loading() {
  return <TarotReadingSkeleton />;
}
```

**어떻게 보일까?**
- ❓ 질문 영역
- 🃏 카드 3장
- 📖 해석 영역

### 사주 결과 페이지용

```typescript
import { DestinyResultSkeleton } from "@/components/ui/DestinyMapSkeleton";

export default function Loading() {
  return <DestinyResultSkeleton />;
}
```

**어떻게 보일까?**
- 📊 사주 팔자 표 (4기둥)
- 📝 해석 섹션들

---

## 🎨 애니메이션 효과

모든 스켈레톤에는 **3가지 애니메이션**이 적용되어 있습니다:

### 1. Shimmer (반짝임)
```css
/* 좌→우로 빛이 지나가는 효과 */
background: linear-gradient(...);
animation: shimmer 1.5s infinite;
```

### 2. Pulse (깜빡임)
```css
/* 투명도가 천천히 변하는 효과 */
animation: pulse 2s infinite;
```

### 3. FadeIn (페이드인)
```css
/* 스켈레톤이 서서히 나타나는 효과 */
animation: fadeIn 0.5s ease-in;
```

---

## 📱 반응형

모든 스켈레톤은 **모바일에서도 완벽**하게 작동합니다:

```css
@media (max-width: 768px) {
  /* 모바일에서는 크기 축소 */
  .container {
    padding: 1rem;
  }

  .calendarGrid {
    gap: 0.25rem; /* 간격 줄이기 */
  }
}
```

---

## ✅ 체크리스트

새로운 페이지를 만들 때 확인하세요:

- [ ] `loading.tsx` 파일을 만들었나요?
- [ ] 적절한 스켈레톤을 선택했나요?
- [ ] 실제 페이지 레이아웃과 비슷한가요?
- [ ] 모바일에서도 확인했나요?

---

## 🎯 성능 팁

### DO ✅
```typescript
// 가볍고 빠른 스켈레톤 사용
<TarotPageSkeleton />
```

### DON'T ❌
```typescript
// 무거운 라이브러리나 복잡한 컴포넌트 사용
<FullPageWithHeavyDependencies />
```

**이유:** 로딩 화면은 **즉시** 보여야 합니다. 무거우면 의미가 없어요!

---

## 🎉 완성!

이제 모든 주요 페이지에 멋진 로딩 스켈레톤이 적용되었습니다!

**적용된 페이지:**
- ✅ 타로 메인 (`/tarot`)
- ✅ 사주/운세 입력 (`/destiny-map`)
- ✅ 운세 캘린더 (`/calendar`)

**추가로 적용하면 좋은 곳:**
- 💬 채팅 상담 페이지들
- 📊 결과 페이지들
- 📝 프로필 페이지

---

## 🙋 Q&A

**Q: 스켈레톤이 너무 오래 보이면 어떡하죠?**
A: 실제 페이지 로딩이 느린 것이니, API 최적화나 캐싱이 필요합니다.

**Q: 색상을 바꾸고 싶어요.**
A: `.module.css` 파일에서 `rgba(255, 255, 255, 0.1)` 값들을 수정하세요.

**Q: 새로운 스켈레톤을 만들고 싶어요.**
A: 기존 스켈레톤 파일들을 복사해서 수정하면 됩니다!

---

Made with 💙 by Claude Code