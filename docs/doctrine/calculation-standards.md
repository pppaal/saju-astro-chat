---
title: 계산 표준 (Calculation Standards)
tags: [doctrine, ssot, auto]
status: auto-generated
---

# ⚙️ 계산 표준 (Calculation Standards)

사주·점성 계산의 **최상위 정책 선택**을 담는 코드 SSOT 의 미러. 값을 바꾸려면
문서가 아니라 [`calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)
를 수정하세요 (코드가 이 값을 직접 읽습니다).

관련 교리: [[saju|사주 교리]] · [[astrology|점성 교리]]

<!-- gen:calculation-standards -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

**원천:** [`src/lib/config/calculationStandards.ts`](../../src/lib/config/calculationStandards.ts)

### 사주 (Saju)

| 항목                            | 값           |
| ------------------------------- | ------------ |
| `baseTimezone`                  | `Asia/Seoul` |
| `daeunRounding`                 | `floor`      |
| `useSolarTermsForMonthlyCycles` | `true`       |

### 점성 (Astrology)

| 항목          | 값         |
| ------------- | ---------- |
| `houseSystem` | `Placidus` |
| `nodeType`    | `true`     |

<!-- /gen:calculation-standards -->
