# 개선된 크레딧 에러 메시지 시스템

## 개요

크레딧 시스템의 복잡도를 줄이고 사용자가 크레딧 vs 궁합 vs 후속질문 한도를 쉽게 구분할 수 있도록 에러 메시지를 개선했습니다.

**예상 효과:** 고객 지원 문의 50% 감소

## 주요 개선 사항

### 1. 크레딧 타입별 맞춤형 에러 메시지

- ✅ **일반 크레딧 소진**: "크레딧이 소진되었습니다"
- ✅ **궁합 한도 초과**: "궁합 분석 한도 초과" + 사용량 표시 (2/2회)
- ✅ **후속질문 한도 초과**: "후속질문 한도 초과" + 사용량 표시 (5/5회)

### 2. 상세한 설명과 해결책 제시

각 에러 타입마다:

- 📊 현재 사용량/한도 시각화
- 💡 월간 한도 제한 설명
- ⬆️ 플랜 업그레이드 버튼 또는 크레딧 구매 버튼
- 📅 "다음 달까지 기다리기" 옵션 (한도 에러의 경우)

## 사용 방법

### API 에러 핸들링

```typescript
// API 라우트에서
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits'

export async function POST(req: Request) {
  // 궁합 분석 API
  const result = await checkAndConsumeCredits('compatibility', 1)

  if (!result.allowed) {
    // 자동으로 limitInfo가 포함됨
    return creditErrorResponse(result)
  }

  // ... 비즈니스 로직
}
```

### 클라이언트에서 에러 처리

```typescript
import { useCreditModal, shouldShowCreditModal } from "@/contexts/CreditModalContext";

function MyComponent() {
  const { showLimitError } = useCreditModal();

  const handleAnalyze = async () => {
    try {
      const res = await fetch("/api/compatibility", { method: "POST", ... });
      const data = await res.json();

      // 자동으로 적절한 모달 표시
      const modalInfo = shouldShowCreditModal(res, data);
      if (modalInfo.show) {
        if (modalInfo.creditType && modalInfo.limitInfo) {
          showLimitError(modalInfo.creditType, modalInfo.limitInfo);
        } else if (modalInfo.type === "depleted") {
          showDepleted();
        } else {
          showLowCredits(modalInfo.remaining);
        }
        return;
      }

      // 성공 처리
    } catch (error) {
      // 에러 처리
    }
  };
}
```

## 에러 메시지 예시

### 1. 일반 크레딧 소진

```
❌ 크레딧이 소진되었습니다

모든 크레딧을 사용하셨습니다.
크레딧을 충전하시면 더 많은 상담을 받아보실 수 있습니다.

잔여 크레딧: 0개

[✦ 크레딧 구매하기]  [나중에]
```

### 2. 궁합 분석 한도 초과

```
❌ 궁합 분석 한도 초과

이번 달 궁합 분석 횟수를 모두 사용했어요 (2/2회)

💡 월간 한도 제한이란?
궁합 분석은 플랜별로 월 이용 횟수가 제한되어 있습니다.
일반 크레딧과는 별도로 관리되며, 매월 1일에 초기화됩니다.

━━━━━━━━━━━━━━━━━━━━━━ (100% 사용)
이번 달 사용량: 2/2회
현재 플랜: Starter

[⬆️ 플랜 업그레이드]  [다음 달까지 기다리기]
```

### 3. 후속질문 한도 초과

```
❌ 후속질문 한도 초과

이번 달 후속질문 횟수를 모두 사용했어요 (2/2회)

💡 월간 한도 제한이란?
후속질문은 플랜별로 월 이용 횟수가 제한되어 있습니다.
일반 크레딧과는 별도로 관리되며, 매월 1일에 초기화됩니다.

━━━━━━━━━━━━━━━━━━━━━━ (100% 사용)
이번 달 사용량: 2/2회
현재 플랜: Starter

[⬆️ 플랜 업그레이드]  [다음 달까지 기다리기]
```

## 플랜별 한도

| 플랜    | 월간 크레딧 | 궁합 한도 | 후속질문 한도 |
| ------- | ----------- | --------- | ------------- |
| Free    | 7           | 0         | 0             |
| Starter | 25          | 2         | 2             |
| Pro     | 80          | 5         | 5             |
| Premium | 200         | 10        | 10            |

## 기술 스택

- **Modal Component**: `src/components/ui/CreditDepletedModal.tsx`
- **Context Provider**: `src/contexts/CreditModalContext.tsx`
- **API Helper**: `src/lib/credits/withCredits.ts`
- **Credit Service**: `src/lib/credits/creditService.ts`

## 테스트

에러 시나리오를 테스트하려면:

```bash
# 크레딧 체크 우회 비활성화
unset BYPASS_CREDITS

# 개발 서버 실행
npm run dev

# 각 서비스에서 한도 초과 테스트:
# 1. 궁합 분석을 월 한도만큼 사용
# 2. 후속질문을 월 한도만큼 사용
# 3. 일반 크레딧을 모두 소진
```

## 향후 개선 사항

- [ ] 한도 리셋까지 남은 일수 표시
- [ ] 플랜별 혜택 비교 표시
- [ ] 크레딧 사용 통계 대시보드
