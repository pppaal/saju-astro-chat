---
title: 프로젝트 상태판 (Health Dashboard)
tags: [reference, health, auto]
status: auto-generated
---

# ⚙️ 프로젝트 상태판 (Health Dashboard)

코드에서 끌어온 실지표 현황. `npm run docs:sync` 로 갱신 (보안 수치는
`npm run audit:api` 가 먼저 갱신해야 최신). Obsidian 에서 이 노트만 열면
프로젝트 인벤토리 + 보안 신호가 한 장에 보입니다.

<!-- gen:health-dashboard -->
<!-- 이 표는 자동 생성됩니다. 직접 수정하지 마세요 — `npm run docs:sync`. -->

### 📦 인벤토리 (코드 기준)

| 지표          | 값                       |
| ------------- | ------------------------ |
| 활성 서비스   | 3개 ([[services-index]]) |
| API 라우트    | 70개 ([[api-routes]])    |
| 테스트 파일   | 448개                    |
| 타로 덱       | 78장 (Major 22/Minor 56) |
| 하우스 시스템 | `Placidus`               |
| 사주 기준 TZ  | `Asia/Seoul`             |

### 🔐 보안 ([[API_AUDIT_REPORT]] 기준)

- Total Next.js API routes: 71
- Uses middleware/guards: 65 (91.5%)
- Has validation signals: 45 (63.4%)
- Rate limited (guard or option): 61 (85.9%)
- Credit consumption configured: 7 (9.9%)
- Requires auth: 40 (56.3%)
- Requires token: 16 (22.5%)
- skipCsrf enabled: 2 (2.8%)

> 코드 품질 점수(테스트 통과율·버그·커버리지)는 이 표로 안 나옴 —
> 별도 에이전트 감사 필요. 여기는 "인벤토리 + 보안 신호" 현황판.

<!-- /gen:health-dashboard -->

## 연결

- 서비스 전체: [[services-index]] · 라우트: [[api-routes]] · 보안 상세: [[API_AUDIT_REPORT]]
- 계산 노선: [[calculation-standards]]
