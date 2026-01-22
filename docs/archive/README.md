# Archived Documentation

이 폴더에는 프로젝트 개발 과정에서 생성된 히스토리 문서들이 보관되어 있습니다.

## 보관 이유

- **중복 제거**: 여러 버전의 동일한 문서들 (COVERAGE_V1, V2, V3 등)
- **과거 상태 기록**: 특정 시점의 프로젝트 상태 (WEEK1, PHASE1 등)
- **완료된 작업**: 이미 구현 완료된 기능의 계획 문서
- **통합됨**: 내용이 다른 문서에 통합된 경우

## 보관된 문서 카테고리

### Coverage Reports (커버리지 리포트)
- `COVERAGE_*.md` - 테스트 커버리지 증가 과정 기록

### Phase Reports (단계별 진행 보고)
- `PHASE_*.md`, `WEEK_*.md`, `LAYER*.md` - 개발 단계별 진행 상황

### Feature-Specific (특정 기능 문서)
- `TAROT_*.md` - 타로 기능 개선
- `DESTINY_*.md` - 운명 지도 개선
- `CALENDAR_*.md` - 캘린더 기능
- `ASTROLOGY_*.md` - 점성술 기능

### Refactoring (리팩토링 문서)
- `REFACTORING_*.md` - 코드 리팩토링 계획 및 진행

### Testing & Deployment (테스트 및 배포)
- `E2E_*.md` - E2E 테스트 관련
- `TEST_*.md` - 테스트 관련
- `DEPLOYMENT_*.md` - 배포 관련
- `CICD_*.md` - CI/CD 파이프라인 (`.github/` 폴더로 통합됨)

### Performance & Optimization (성능 최적화)
- `PERFORMANCE_*.md` - 성능 최적화 과정
- `RAG_*.md` - RAG 성능 개선
- `REDIS_*.md` - Redis 마이그레이션

### Other Archives (기타)
- `IMPLEMENTATION_*.md` - 구현 요약
- `FINAL_*.md` - 최종 검증 보고서
- `VERIFICATION_*.md` - 검증 리포트
- `PROJECT_STATUS_*.md` - 특정 날짜의 프로젝트 상태

## 현재 유효한 문서 (루트 및 docs/)

**루트:**
- `README.md` - 프로젝트 소개 및 빠른 시작
- `PROJECT_CHECKLIST.md` - 전체 구현 체크리스트 (최신!)

**docs/ 폴더:**
- `ARCHITECTURE.md` - 시스템 아키텍처
- `API.md` - API 엔드포인트 문서
- `EXECUTION_GUIDE.md` - 실행 가이드
- `ENVIRONMENT_CHECKLIST.md` - 환경변수 체크리스트
- `SECURITY_HARDENING.md` - 보안 강화 가이드
- `PERFORMANCE_OPTIMIZATION.md` - 성능 최적화
- `PERFORMANCE_TESTING.md` - 성능 테스트
- `REDIS_CACHE_GUIDE.md` - Redis 캐시 사용법
- `TRACING.md` - Distributed tracing 가이드
- `CI_CD_PIPELINE.md` - CI/CD 파이프라인
- `CI_CD_QUICK_REFERENCE.md` - CI/CD 빠른 참조
- `E2E_TESTING_GUIDE.md` - E2E 테스트 가이드
- `GITHUB_ACTIONS_SETUP.md` - GitHub Actions 설정

**tests/ 폴더:**
- `tests/load/README.md` - Load testing 가이드

## 문서 찾기

특정 시점의 상태를 찾으려면 날짜 또는 버전으로 검색하세요:

```bash
# 2026년 1월 13일 상태
grep -l "2026-01-13" *.md

# Coverage 관련
ls COVERAGE_*.md

# 특정 기능
ls TAROT_*.md DESTINY_*.md
```

## 정리 정책

- **6개월 이상 미참조**: 삭제 고려
- **통합된 문서**: 원본 보존, 중복 삭제
- **마일스톤 문서**: 영구 보관 (WEEK1, PHASE1 등)

---

**Last Updated**: 2026-01-22
**Archive Size**: ~100 documents
