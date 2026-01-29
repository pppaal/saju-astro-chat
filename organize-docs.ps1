# DestinyPal 문서 정리 스크립트
# 실행: powershell -ExecutionPolicy Bypass -File organize-docs.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DestinyPal 문서 정리 시작" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Get-Location

# 1. docs 폴더 구조 생성
Write-Host "[1/5] 폴더 구조 생성..." -ForegroundColor Yellow
$folders = @(
    "docs/guides",           # 가이드 문서
    "docs/technical",        # 기술 문서
    "docs/content",          # 콘텐츠 가이드
    "docs/archive/old",      # 오래된 문서
    "docs/github"            # GitHub 관련
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}
Write-Host "  ✓ 폴더 생성 완료" -ForegroundColor Green

# 2. 루트 레벨 정리
Write-Host "[2/5] 루트 레벨 정리..." -ForegroundColor Yellow

# SECURITY_FIXES_APPLIED.md는 아카이브로
if (Test-Path "SECURITY_FIXES_APPLIED.md") {
    Move-Item -Path "SECURITY_FIXES_APPLIED.md" -Destination "docs/archive/" -Force -ErrorAction SilentlyContinue
}

Write-Host "  ✓ 루트 정리 완료" -ForegroundColor Green

# 3. docs 폴더 내 문서 정리
Write-Host "[3/5] docs 폴더 정리..." -ForegroundColor Yellow

# 가이드 문서 이동
$guideFiles = @(
    "E2E_TESTING_GUIDE.md",
    "EXECUTION_GUIDE.md",
    "REFACTORING_GUIDE.md",
    "REDIS_CACHE_GUIDE.md",
    "ENVIRONMENT_CHECKLIST.md"
)

foreach ($file in $guideFiles) {
    $path = Join-Path "docs" $file
    if (Test-Path $path) {
        Move-Item -Path $path -Destination "docs/guides/" -Force -ErrorAction SilentlyContinue
    }
}

# 기술 문서 정리 (technical 폴더)
$techFiles = @(
    "ARCHITECTURE.md",
    "BUNDLE_OPTIMIZATION.md",
    "LAZY_LOADING_MIGRATION.md",
    "PERFORMANCE_OPTIMIZATION.md",
    "PERFORMANCE_TESTING.md",
    "SECURITY_BEST_PRACTICES.md",
    "SECURITY_HARDENING.md",
    "TRACING.md"
)

foreach ($file in $techFiles) {
    $path = Join-Path "docs" $file
    if (Test-Path $path) {
        Move-Item -Path $path -Destination "docs/technical/" -Force -ErrorAction SilentlyContinue
    }
}

# CI/CD 문서 정리
$cicdFiles = @(
    "CI_CD_PIPELINE.md",
    "CI_CD_QUICK_REFERENCE.md",
    "GITHUB_ACTIONS_SETUP.md"
)

foreach ($file in $cicdFiles) {
    $path = Join-Path "docs" $file
    if (Test-Path $path) {
        Move-Item -Path $path -Destination "docs/github/" -Force -ErrorAction SilentlyContinue
    }
}

# 중복/오래된 문서 아카이브로 이동
$oldFiles = @(
    "CRITICAL_REFACTORING_PLAN.md"
)

foreach ($file in $oldFiles) {
    $path = Join-Path "docs" $file
    if (Test-Path $path) {
        Move-Item -Path $path -Destination "docs/archive/old/" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "  ✓ docs 폴더 정리 완료" -ForegroundColor Green

# 4. GitHub 폴더 정리
Write-Host "[4/5] GitHub 폴더 정리..." -ForegroundColor Yellow

if (Test-Path ".github/CICD_CHECKLIST.md") {
    Copy-Item -Path ".github/CICD_CHECKLIST.md" -Destination "docs/github/" -Force -ErrorAction SilentlyContinue
}

if (Test-Path ".github/workflows/README.md") {
    Copy-Item -Path ".github/workflows/README.md" -Destination "docs/github/WORKFLOWS.md" -Force -ErrorAction SilentlyContinue
}

Write-Host "  ✓ GitHub 폴더 정리 완료" -ForegroundColor Green

# 5. 문서 인덱스 생성
Write-Host "[5/5] 문서 인덱스 생성..." -ForegroundColor Yellow

$indexContent = @"
# DestinyPal 문서 구조

**정리 완료**: $(Get-Date -Format "yyyy-MM-dd HH:mm")

---

## 📁 문서 구조

``````
루트/
├── README.md                     ⭐ 프로젝트 소개
├── DEPLOYMENT.md                 ⭐ 배포 가이드
├── UTILITY_GUIDE.md              ⭐ 유틸리티 가이드
├── DOCUMENTATION_INDEX.md        ⭐ 전체 문서 네비게이션
│
├── 🦄 UNICORN_ANALYSIS/          ⭐⭐⭐ 유니콘 분석 (필독!)
│   ├── START_HERE.txt
│   ├── 00_QUICK_START.md
│   ├── 01_EXECUTIVE_SUMMARY.md
│   ├── 13_ACTION_CHECKLIST.md
│   └── PROJECT_UNICORN_ANALYSIS*.md
│
└── 📁 docs/
    ├── README.md                 문서 센터
    ├── API.md                    API 문서
    │
    ├── 📁 guides/                가이드 문서
    │   ├── E2E_TESTING_GUIDE.md
    │   ├── EXECUTION_GUIDE.md
    │   ├── REFACTORING_GUIDE.md
    │   ├── REDIS_CACHE_GUIDE.md
    │   └── ENVIRONMENT_CHECKLIST.md
    │
    ├── 📁 technical/             기술 문서
    │   ├── ARCHITECTURE.md
    │   ├── BUNDLE_OPTIMIZATION.md
    │   ├── PERFORMANCE_OPTIMIZATION.md
    │   ├── SECURITY_BEST_PRACTICES.md
    │   ├── DEEP_TECHNICAL_ANALYSIS.md
    │   └── ...
    │
    ├── 📁 github/                CI/CD & GitHub
    │   ├── CI_CD_PIPELINE.md
    │   ├── GITHUB_ACTIONS_SETUP.md
    │   ├── CICD_CHECKLIST.md
    │   └── WORKFLOWS.md
    │
    ├── 📁 content/               콘텐츠
    │   └── tarot-midjourney-prompts.md
    │
    └── 📁 archive/               아카이브
        ├── 완료된 작업
        ├── 마이그레이션 기록
        └── 📁 old/ (오래된 문서)
``````

---

## 🎯 역할별 시작 문서

| 역할 | 문서 |
|------|------|
| 창업자 | UNICORN_ANALYSIS/START_HERE.txt |
| 투자자 | UNICORN_ANALYSIS/01_EXECUTIVE_SUMMARY.md |
| 개발자 | README.md → UTILITY_GUIDE.md |
| DevOps | DEPLOYMENT.md → docs/github/ |
| 디자이너 | docs/content/ |

---

**자동 생성**: organize-docs.ps1
"@

Set-Content -Path "docs/STRUCTURE.md" -Value $indexContent -Encoding UTF8
Write-Host "  ✓ 인덱스 생성 완료" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 문서 정리 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 문서를 확인하세요:" -ForegroundColor Yellow
Write-Host "  1. DOCUMENTATION_INDEX.md (전체 네비게이션)" -ForegroundColor White
Write-Host "  2. docs/STRUCTURE.md (정리된 구조)" -ForegroundColor White
Write-Host "  3. docs/README.md (문서 센터)" -ForegroundColor White
Write-Host ""
