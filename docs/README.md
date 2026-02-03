# 📚 DestinyPal Documentation Hub

> 🌟 **[← 전체 프로젝트 개요 보기 (../OVERVIEW.md)](../OVERVIEW.md)** - 한눈에 모든 정보를!

Welcome to the DestinyPal documentation center. This is your central hub for all technical documentation.

## 🗂️ Documentation Structure

### 📖 Main Documents

| Document                                             | Description                                 | Status       |
| ---------------------------------------------------- | ------------------------------------------- | ------------ |
| [../OVERVIEW.md](../OVERVIEW.md)                     | **Complete project overview** (Start here!) | 🌟 Essential |
| [CREDIT_ERROR_MESSAGES.md](CREDIT_ERROR_MESSAGES.md) | Credit system error message improvements    | ✅ Complete  |
| [AI_COST_MONITORING.md](AI_COST_MONITORING.md)       | AI cost monitoring guide                    | ✅ Complete  |

### 📁 Documentation by Category

#### Architecture & Design

- **Main Reference**: [../README.md](../README.md) - Architecture section
- **API Design**: [../src/lib/api/README.md](../src/lib/api/README.md)
- **AI Backend**: [../backend_ai/APP_PY_REFACTORING_COMPLETE.md](../backend_ai/APP_PY_REFACTORING_COMPLETE.md)

#### AI & Monitoring

- **AI Cost Guide**: [AI_COST_MONITORING.md](AI_COST_MONITORING.md) - OpenAI usage tracking
- **Metrics**: Admin dashboard, Prometheus integration

#### API Documentation

- **Error Handling**: [../src/lib/api/ERROR_RESPONSE_GUIDE.md](../src/lib/api/ERROR_RESPONSE_GUIDE.md)
- **API Policy**: [../src/lib/api/API_POLICY.md](../src/lib/api/API_POLICY.md)
- **Usage Examples**: [../src/lib/api/USAGE_EXAMPLES.md](../src/lib/api/USAGE_EXAMPLES.md)

#### Performance

- **Performance Tests**: [../tests/performance/README.md](../tests/performance/README.md)
- **Baseline Tracking**: [../tests/performance/BASELINE_TRACKING.md](../tests/performance/BASELINE_TRACKING.md)

#### Testing

- **E2E Tests**: [../e2e/README.md](../e2e/README.md)
- **Critical Flows**: [../e2e/critical-flows/](../e2e/critical-flows/)
- **Test Strategy**: [../tests/README.md](../tests/README.md)

#### Security

- **Security Audit**: [../tests/integration/security.test.ts](../tests/integration/security.test.ts)
- **RBAC System**: [../prisma/migrations/20260122_add_admin_rbac_and_audit_log/README.md](../prisma/migrations/20260122_add_admin_rbac_and_audit_log/README.md)

#### CI/CD

- **GitHub Actions**: [../.github/workflows/](../.github/workflows/)
- **PR Template**: [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)

#### Database

- **Schema**: [../prisma/schema.prisma](../prisma/schema.prisma)
- **Migrations**: [../prisma/migrations/](../prisma/migrations/)

---

## 🚀 Quick Start Guides

### For Developers

1. **Setup**: Follow [../README.md](../README.md#getting-started)
2. **API Routes**: Check [../src/app/api/](../src/app/api/)
3. **Testing**: Run `npm test` and `npm run test:e2e`

### For Contributors

1. **Code Style**: TypeScript + ESLint + Prettier
2. **PR Process**: Use [PR template](../.github/PULL_REQUEST_TEMPLATE.md)
3. **Testing**: All PRs must pass CI checks

---

## 📊 Project Status

### Recently Completed ✅

- **Credit Error Messages** (2026-02-02)
  - Improved user experience for credit limits
  - Expected 50% reduction in support inquiries
  - [docs/CREDIT_ERROR_MESSAGES.md](CREDIT_ERROR_MESSAGES.md)

### In Progress 🚧

See [../ROADMAP.md](../ROADMAP.md) for current development priorities.

---

## 🔗 External Resources

### Production

- **App**: https://destinypal.com
- **Status**: https://status.destinypal.com (if available)

### Development Tools

- **Vercel Dashboard**: https://vercel.com/your-team/destinypal
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Sentry**: https://sentry.io/destinypal

---

## 📝 Contributing to Docs

When adding documentation:

1. **Location**:
   - Feature-specific docs → `src/[feature]/README.md`
   - API docs → `src/lib/api/`
   - General docs → `docs/`

2. **Format**:
   - Use Markdown
   - Include code examples
   - Add diagrams where helpful

3. **Maintenance**:
   - Update this hub when adding new docs
   - Keep docs in sync with code
   - Archive outdated docs to `docs/archive/`

---

## 🗂️ Archived Documents

### Legacy Documentation (2026-02-01 이전)

**위치**: [archive/](archive/)

**18개의 placeholder 문서** (빈 문서 또는 링크만 포함):

- `API.md`, `ARCHITECTURE.md`, `BUNDLE_OPTIMIZATION.md`
- `CI_CD_PIPELINE.md`, `CI_CD_QUICK_REFERENCE.md`
- `E2E_TESTING_GUIDE.md`, `ENVIRONMENT_CHECKLIST.md`
- `GETTING_STARTED_PERFORMANCE.md`, `GITHUB_ACTIONS_SETUP.md`
- `PERFORMANCE_OPTIMIZATION.md`, `PERFORMANCE_TESTING.md`
- `README_CICD_SECTION.md`, `REDIS_CACHE_GUIDE.md`
- `SECURITY_BEST_PRACTICES.md`, `SECURITY_HARDENING.md`
- `TRACING.md`, `LIFE_PREDICTION_OPTIMIZATION_SUMMARY.md`
- `PITCH_DECK.md`

### Unicorn Analysis Package (2026-01-29)

**위치**: [archive/unicorn-analysis/](archive/unicorn-analysis/)

**17개의 상세 전략 분석 문서** (~10,000줄):

1. `00_QUICK_START.md` - 2분 퀵 가이드
2. `01_EXECUTIVE_SUMMARY.md` - 경영진 요약 (5분)
3. `02_GO_TO_MARKET_STRATEGY.md` - 시장 진출 전략
4. `03_GROWTH_HACKING_PLAYBOOK.md` - 그로스 해킹 플레이북
5. `04_INFLUENCER_MARKETING.md` - 인플루언서 마케팅 가이드
6. `05_INVESTOR_PITCH_DECK_GUIDE.md` - 투자 피칭 가이드
7. `06_FINANCIAL_MODEL.md` - 재무 모델 (3년 예측)
8. `07_VALUATION_ANALYSIS.md` - 밸류에이션 분석
9. `08_AI_COST_OPTIMIZATION.md` - AI 비용 최적화 전략
10. `09_SCALING_INFRASTRUCTURE.md` - 인프라 스케일링 계획
11. `10_TECHNICAL_ROADMAP.md` - 기술 로드맵 (2026-2030)
12. `11_TEAM_BUILDING.md` - 팀 빌딩 전략
13. `12_RISK_MITIGATION.md` - 리스크 관리
14. `13_ACTION_CHECKLIST.md` - 즉시 실행 체크리스트
15. `PROJECT_UNICORN_ANALYSIS.md` - 전체 분석 (30분)
16. `PROJECT_UNICORN_ANALYSIS_DETAILED.md` - 상세 분석 (100+ 페이지)
17. `README.md` - 인덱스

**통합 위치**: 핵심 내용은 [../UNICORN_STRATEGY.md](../UNICORN_STRATEGY.md)에 통합됨

### Feature-Specific Guides

**위치**: [archive/](archive/)

- `DEPLOYMENT_PHOTO_UPLOAD.md` - 사진 업로드 기능 Vercel 배포 가이드 (3.9KB)

---

**Last Updated**: 2026-02-02
**Maintainer**: Development Team
**Document Count**:

- **Active**: 3 essential docs ([OVERVIEW](../OVERVIEW.md), [CREDIT_ERROR_MESSAGES](CREDIT_ERROR_MESSAGES.md), [AI_COST_MONITORING](AI_COST_MONITORING.md))
- **Archived**: 36 docs (18 legacy + 17 unicorn + 1 deployment)
