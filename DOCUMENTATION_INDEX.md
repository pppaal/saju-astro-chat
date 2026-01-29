# 📚 DestinyPal 문서 가이드

**최종 정리일**: 2026-01-29

---

## 🚀 빠른 시작

### 당신의 역할에 맞는 문서를 선택하세요

| 역할 | 시작 문서 | 소요 시간 |
|------|----------|----------|
| 👨‍💼 창업자/CEO | [UNICORN_ANALYSIS/START_HERE.txt](UNICORN_ANALYSIS/START_HERE.txt) | 2분 |
| 💰 투자자 | [UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md](UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md) | 5분 |
| 👨‍💻 개발자 | [README.md](README.md) → [UTILITY_GUIDE.md](UTILITY_GUIDE.md) | 15분 |
| 📈 마케터 | [UNICORN_ANALYSIS/13_ACTION_CHECKLIST.md](UNICORN_ANALYSIS/13_ACTION_CHECKLIST.md) | 10분 |
| 🎨 디자이너 | [docs/content/tarot-midjourney-prompts.md](docs/content/tarot-midjourney-prompts.md) | 20분 |

---

## 📁 문서 구조 (간략)

```
프로젝트 루트/
│
├── 📄 README.md                  ⭐ 프로젝트 소개 및 시작 가이드
├── 📄 DEPLOYMENT.md              ⭐ 배포 가이드
├── 📄 UTILITY_GUIDE.md           ⭐ 유틸리티 함수 가이드
│
├── 🦄 UNICORN_ANALYSIS/          ⭐⭐⭐ 유니콘 분석 패키지 (필독!)
│   ├── START_HERE.txt            → 2분 시작 가이드
│   ├── 00_QUICK_START.md         → 핵심 요약
│   ├── 01_EXECUTIVE_SUMMARY.md   → 경영진 요약 (5분)
│   ├── 13_ACTION_CHECKLIST.md    → 6개월 실행 계획
│   ├── PROJECT_UNICORN_ANALYSIS.md          → 전체 분석 (30분)
│   └── PROJECT_UNICORN_ANALYSIS_DETAILED.md → 상세 분석 (100+ 페이지)
│
└── 📁 docs/                      기타 문서 (118개)
    ├── API.md                    API 문서
    ├── ARCHITECTURE.md           아키텍처 설명
    ├── README.md                 문서 센터 인덱스
    │
    ├── 📁 technical/             기술 문서
    │   └── DEEP_TECHNICAL_ANALYSIS.md
    │
    ├── 📁 content/               콘텐츠 가이드
    │   └── tarot-midjourney-prompts.md
    │
    └── 📁 archive/               완료된 작업 (100+ 파일)
        ├── 리팩토링 기록
        ├── 마이그레이션 로그
        ├── 테스트 커버리지 보고서
        └── 과거 평가 문서
```

---

## ⭐ 필수 문서 (Top 5)

### 1️⃣ README.md
**대상**: 모든 개발자
**내용**: 프로젝트 소개, 설치, 실행 방법
**읽는 시간**: 10분

### 2️⃣ UNICORN_ANALYSIS/ (전체 폴더)
**대상**: 창업자, 투자자, 경영진
**내용**: 유니콘 달성 가능성 분석 (65-75%)
**읽는 시간**: 5분 ~ 2시간 (문서별)

**핵심 평가**:
- **총점**: 4.59/5.0 (A+)
- **유니콘 확률**: 65-75%
- **5년 목표**: $1B 밸류에이션

### 3️⃣ DEPLOYMENT.md
**대상**: DevOps, 개발자
**내용**: Vercel 배포 가이드
**읽는 시간**: 5분

### 4️⃣ UTILITY_GUIDE.md
**대상**: 개발자
**내용**: 프로젝트 유틸리티 함수 가이드
**읽는 시간**: 15분

### 5️⃣ docs/README.md
**대상**: 모두
**내용**: 전체 문서 네비게이션
**읽는 시간**: 3분

---

## 🎯 상황별 문서 찾기

### 상황 1: "프로젝트가 유니콘 될 수 있나요?"
**읽을 문서**:
1. [UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md](UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md) (5분)
2. [UNICORN_ANALYSIS/PROJECT_UNICORN_ANALYSIS.md](UNICORN_ANALYSIS/PROJECT_UNICORN_ANALYSIS.md) (30분)

**답변**: **65-75% 확률로 가능**. 조건: Destiny Match 바이럴화.

---

### 상황 2: "지금 당장 뭘 해야 하죠?"
**읽을 문서**:
1. [UNICORN_ANALYSIS/00_QUICK_START.md](UNICORN_ANALYSIS/00_QUICK_START.md) (2분)
2. [UNICORN_ANALYSIS/13_ACTION_CHECKLIST.md](UNICORN_ANALYSIS/13_ACTION_CHECKLIST.md) (10분)

**답변**: Week 1-2에 **Mixpanel 통합 + AI 비용 최적화**.

---

### 상황 3: "코드를 수정하고 싶은데 어디서 시작하죠?"
**읽을 문서**:
1. [README.md](README.md) - 프로젝트 구조 (10분)
2. [UTILITY_GUIDE.md](UTILITY_GUIDE.md) - 유틸리티 함수 (15분)
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - 아키텍처 (20분)

**답변**: `src/` 폴더부터 시작, `lib/` 유틸리티 참고.

---

### 상황 4: "투자자에게 피칭하려는데 자료 있나요?"
**읽을 문서**:
1. [UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md](UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md) (5분)

**답변**: 이 문서를 기반으로 피칭덱 작성 가능. 추가 지원 필요 시 요청.

---

### 상황 5: "배포는 어떻게 하나요?"
**읽을 문서**:
1. [DEPLOYMENT.md](DEPLOYMENT.md) (5분)

**답변**: Vercel 자동 배포. `git push` → 자동 빌드/배포.

---

## 📊 문서 통계

### 전체
- **총 문서 수**: 122개 (루트 3 + UNICORN 6 + docs 113)
- **총 크기**: ~2MB
- **언어**: 한국어, 영어

### 카테고리별
| 카테고리 | 개수 | 위치 |
|----------|------|------|
| 프로젝트 핵심 | 3 | 루트 |
| 유니콘 분석 | 6 | `/UNICORN_ANALYSIS/` |
| 기술 문서 | 2 | `/docs/technical/` |
| 콘텐츠 가이드 | 1 | `/docs/content/` |
| 아카이브 | 100+ | `/docs/archive/` |
| 기타 | 10+ | `/docs/` |

---

## 🔍 문서 검색 가이드

### 키워드별 문서 찾기

#### "유니콘" "투자" "밸류에이션"
→ [UNICORN_ANALYSIS/](UNICORN_ANALYSIS/)

#### "배포" "Vercel" "환경변수"
→ [DEPLOYMENT.md](DEPLOYMENT.md)

#### "API" "엔드포인트" "라우트"
→ [docs/API.md](docs/API.md)

#### "유틸리티" "헬퍼" "함수"
→ [UTILITY_GUIDE.md](UTILITY_GUIDE.md)

#### "아키텍처" "구조" "설계"
→ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

#### "타로" "Midjourney" "이미지"
→ [docs/content/tarot-midjourney-prompts.md](docs/content/tarot-midjourney-prompts.md)

#### "리팩토링" "마이그레이션" "과거 작업"
→ [docs/archive/](docs/archive/)

---

## 🗂️ 문서 유지보수 가이드

### 새 문서 추가 시

**규칙**:
1. **기술 문서** → `/docs/technical/`
2. **비즈니스/전략** → `/UNICORN_ANALYSIS/`
3. **콘텐츠 가이드** → `/docs/content/`
4. **완료된 작업** → `/docs/archive/`
5. **프로젝트 핵심** → 루트 (신중히)

### 문서 이름 규칙
- 대문자 + 언더스코어: `MY_DOCUMENT.md`
- 명확한 이름: ❌ `doc.md` ✅ `API_GUIDE.md`
- 날짜 포함 (선택): `REPORT_2026-01-29.md`

### 문서 업데이트 시
- 파일 상단에 "최종 업데이트: YYYY-MM-DD" 추가
- 변경 사항 요약 (선택)
- 이 인덱스 파일도 업데이트

---

## 📞 도움이 필요하신가요?

### 문서 관련 질문
- **찾는 문서가 없어요**: [docs/README.md](docs/README.md) 확인
- **새 문서를 만들고 싶어요**: 위 "유지보수 가이드" 참조
- **문서가 너무 많아요**: 이 파일의 "필수 문서 Top 5" 참조

### 기술 지원
- **코드 질문**: [README.md](README.md) → Issues
- **배포 문제**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **유틸리티 사용법**: [UTILITY_GUIDE.md](UTILITY_GUIDE.md)

### 비즈니스 지원
- **투자 유치**: [UNICORN_ANALYSIS/](UNICORN_ANALYSIS/)
- **성장 전략**: [UNICORN_ANALYSIS/13_ACTION_CHECKLIST.md](UNICORN_ANALYSIS/13_ACTION_CHECKLIST.md)

---

## 🎉 축하합니다!

이제 DestinyPal의 모든 문서에 대한 지도를 갖게 되었습니다.

**다음 단계**:
1. 당신의 역할에 맞는 "빠른 시작" 문서 읽기 (상단 표 참조)
2. 필요한 문서 북마크
3. 작업 시작! 🚀

---

**최종 정리**: 2026-01-29
**정리자**: Claude Sonnet 4.5
**문서 버전**: 1.0
