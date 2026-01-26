# Premium Notifications System

프리미엄 기능 알림 시스템 - 크레딧 관리, 프로모션, 운세 캘린더 안내

## 📋 개요

사용자의 크레딧 상태를 모니터링하고, 적절한 시점에 프리미엄 업그레이드를 유도하는 알림 시스템입니다.

## 🎯 주요 기능

### 1. 크레딧 부족 알림 (Credit Low Notification)

- **발송 조건**: 남은 크레딧이 5개 미만일 때
- **발송 시간**: 저녁 8시 (20:00)
- **타겟**: 모든 사용자
- **목적**: 크레딧 구매 또는 플랜 업그레이드 유도

```typescript
// 사용 예시
import { generateCreditLowNotification } from '@/lib/notifications/premiumNotifications';

const notification = generateCreditLowNotification(
  {
    plan: 'free',
    remaining: 3,
    total: 7,
    bonusCredits: 0,
    percentUsed: 57,
  },
  '홍길동',
  'ko'
);
```

### 2. 크레딧 완전 소진 알림 (Credit Depleted Notification)

- **발송 조건**: 크레딧이 0개일 때
- **발송 시간**: 낮 12시 (12:00)
- **타겟**: 모든 사용자
- **목적**: 즉각적인 플랜 업그레이드 유도

```typescript
import { generateCreditDepletedNotification } from '@/lib/notifications/premiumNotifications';

const notification = generateCreditDepletedNotification('홍길동', 'ko');
```

### 3. 운세 캘린더 프리미엄 안내 (Calendar Premium Notification)

- **발송 조건**: Free 플랜 사용자, 매주 토요일
- **발송 시간**: 오전 10시 (10:00)
- **타겟**: Free 플랜 사용자 (구독 없음)
- **목적**: 운세 캘린더 프리미엄 기능 소개

```typescript
import { generateCalendarPremiumNotification } from '@/lib/notifications/premiumNotifications';

const notification = generateCalendarPremiumNotification('홍길동', 'ko');
```

### 4. 특별 할인 프로모션 알림 (Promotion Notification)

- **발송 조건**: 활성화된 프로모션이 있을 때
- **발송 시간**: 저녁 7시 (19:00)
- **타겟**: 모든 사용자
- **목적**: 특별 할인 이벤트 안내

```typescript
import { generatePromotionNotification } from '@/lib/notifications/premiumNotifications';

const notification = generatePromotionNotification(
  {
    title: '연말 특가 세일',
    discount: 30,
    endDate: new Date('2026-12-31'),
  },
  'ko'
);
```

### 5. 신규 기능 출시 알림 (New Feature Notification)

- **발송 조건**: 새로운 기능이 출시되었을 때
- **발송 시간**: 오전 11시 (11:00)
- **타겟**: 모든 사용자
- **목적**: 신규 기능 홍보

```typescript
import { generateNewFeatureNotification } from '@/lib/notifications/premiumNotifications';

const notification = generateNewFeatureNotification(
  {
    name: '타로 AI 채팅',
    description: '타로 카드와 실시간 대화하며 운세를 확인하세요!',
    url: '/tarot/chat',
  },
  'ko'
);
```

## 🔄 통합 알림 생성

모든 프리미엄 알림을 한 번에 생성하는 헬퍼 함수:

```typescript
import { generatePremiumNotifications } from '@/lib/notifications/premiumNotifications';

const notifications = generatePremiumNotifications({
  creditStatus: {
    plan: 'free',
    remaining: 2,
    total: 7,
    bonusCredits: 0,
    percentUsed: 71,
  },
  hasActiveSubscription: false,
  userName: '홍길동',
  locale: 'ko',
});

// notifications 배열에 조건에 맞는 알림들이 포함됨
```

## 📅 운세 캘린더 프리미엄 체크

운세 캘린더 접근 권한 확인 및 데이터 필터링:

```typescript
import {
  checkCalendarAccess,
  filterCalendarDataForFree,
  getCalendarUpgradePrompt,
} from '@/lib/notifications/calendarPremiumCheck';

// 접근 권한 확인
const accessInfo = checkCalendarAccess('free', false);
// { hasAccess: false, plan: 'free', reason: 'free_plan' }

// Free 플랜용 데이터 필터링 (7일치만)
const previewData = filterCalendarDataForFree(allCalendarDates);

// 업그레이드 유도 문구
const prompt = getCalendarUpgradePrompt('ko');
// {
//   message: '7일만 보이나요? 프리미엄으로 업그레이드하고 1년 운세 캘린더를 확인하세요!',
//   cta: '지금 업그레이드'
// }
```

## 🔔 푸시 알림 발송

프리미엄 알림은 자동으로 푸시 알림 스케줄러에 통합되어 있습니다.

### 자동 발송 (Cron)

```bash
# Vercel Cron이 매 시간마다 자동 실행
# GET /api/cron/notifications
```

스케줄러는 다음을 자동으로 처리합니다:
1. 사용자별 크레딧 상태 체크
2. 운세 알림과 프리미엄 알림 생성
3. 해당 시간에 맞는 알림만 필터링하여 발송

### 수동 발송 (관리자)

```typescript
import { sendPushNotification } from '@/lib/notifications/pushService';

// 특정 사용자에게 크레딧 부족 알림 발송
const result = await sendPushNotification(userId, notification);
```

## 📊 알림 발송 시간표

| 알림 타입 | 발송 시간 | 발송 조건 | 빈도 |
|----------|---------|----------|-----|
| 일일 운세 | 07:00 | 항상 | 매일 |
| 행운의 시간 | 피크 시간 -1h | 행운 시간대 있을 때 | 매일 |
| 주의 시간 | 주의 시간 -1h | 주의 시간대 있을 때 | 매일 |
| 캘린더 프리미엄 | 10:00 | Free 플랜, 토요일 | 주 1회 |
| 신규 기능 | 11:00 | 새 기능 출시 시 | 1회 |
| 크레딧 소진 | 12:00 | 크레딧 0개 | 필요시 |
| 프로모션 | 19:00 | 활성 프로모션 있을 때 | 필요시 |
| 크레딧 부족 | 20:00 | 크레딧 < 5개 | 매일 |

## 🌍 다국어 지원

모든 알림은 한국어(ko)와 영어(en)를 지원합니다.

번역 파일 위치:
- `src/i18n/locales/ko/features.json` - 한국어
- `src/i18n/locales/en/features.json` - 영어

번역 키 경로: `premiumNotifications.*`

## 🧪 테스트

```typescript
// 알림 미리보기 (발송하지 않음)
import { previewUserNotifications } from '@/lib/notifications/pushService';

const preview = await previewUserNotifications(userId);
console.log('오늘의 알림:', preview);

// 테스트 알림 발송
import { sendTestNotification } from '@/lib/notifications/pushService';

const result = await sendTestNotification(userId);
console.log('발송 결과:', result);
```

## 🔐 환경 변수

프로모션 활성화를 위한 환경 변수 (선택사항):

```env
# .env.local
ACTIVE_PROMOTION='{"title":"연말 특가 세일","discount":30,"endDate":"2026-12-31T23:59:59.999Z"}'
```

## 📦 파일 구조

```
src/lib/notifications/
├── dailyTransitNotifications.ts     # 운세 알림 타입 정의
├── premiumNotifications.ts          # 프리미엄 알림 생성 로직
├── calendarPremiumCheck.ts          # 운세 캘린더 프리미엄 체크
├── pushService.ts                   # 푸시 알림 발송 서비스 (통합)
└── README.md                        # 이 문서
```

## 🚀 배포 체크리스트

- [ ] VAPID 키 설정 (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- [ ] Cron Secret 설정 (`CRON_SECRET`)
- [ ] Vercel Cron 설정 확인 (`vercel.json`)
- [ ] 푸시 알림 권한 요청 플로우 테스트
- [ ] 다국어 번역 확인
- [ ] 크레딧 시스템 연동 테스트
- [ ] 프로모션 환경 변수 설정 (필요시)

## 📝 향후 개선 사항

- [ ] 알림 발송 이력 저장 (중복 발송 방지)
- [ ] 사용자별 알림 설정 (알림 끄기/켜기)
- [ ] A/B 테스트를 위한 메시지 변형
- [ ] 알림 클릭률 추적
- [ ] 프로모션 DB 모델 추가 (환경 변수 대신)
- [ ] 사용자 타임존 기반 발송 시간 조정
- [ ] Rich Notification (이미지, 버튼 등)

## 🐛 문제 해결

### 알림이 발송되지 않을 때

1. VAPID 키가 올바르게 설정되었는지 확인
2. 사용자가 푸시 알림 권한을 허용했는지 확인
3. PushSubscription이 활성화되어 있는지 확인
4. Cron Job이 정상적으로 실행되는지 확인 (Vercel 대시보드)

### 크레딧 알림이 반복 발송될 때

현재는 매일 조건이 충족되면 발송됩니다. 중복 발송 방지를 위해서는 알림 이력 테이블을 추가해야 합니다.

## 📞 문의

문제가 있거나 개선 제안이 있으시면 이슈를 생성해주세요.
