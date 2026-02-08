# Fly.io 자동 배포 스크립트 (PowerShell)
# 사용법: .\deploy.ps1

Write-Host "🚀 Backend AI - Fly.io 자동 배포 시작" -ForegroundColor Green
Write-Host ""

# 현재 디렉토리 확인
if (-not (Test-Path "fly.toml")) {
    Write-Host "❌ 에러: fly.toml 파일을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "   backend_ai 디렉토리에서 실행하세요." -ForegroundColor Yellow
    exit 1
}

# .env 파일 확인
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  경고: .env 파일이 없습니다." -ForegroundColor Yellow
    Write-Host "   환경변수를 수동으로 설정해야 합니다." -ForegroundColor Yellow
} else {
    Write-Host "✅ .env 파일 발견" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 배포 전 체크리스트:" -ForegroundColor Cyan
Write-Host ""

# Fly CLI 설치 확인
$flyPath = Get-Command fly -ErrorAction SilentlyContinue
if (-not $flyPath) {
    Write-Host "❌ Fly CLI가 설치되지 않았습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "설치 방법:" -ForegroundColor Yellow
    Write-Host "  PowerShell에서: iwr https://fly.io/install.ps1 -useb | iex" -ForegroundColor White
    Write-Host ""
    $install = Read-Host "지금 설치하시겠습니까? (y/n)"
    if ($install -eq "y" -or $install -eq "Y") {
        Write-Host "📥 Fly CLI 설치 중..." -ForegroundColor Cyan
        iwr https://fly.io/install.ps1 -useb | iex
        Write-Host "✅ Fly CLI 설치 완료" -ForegroundColor Green
        Write-Host "⚠️  터미널을 재시작한 후 다시 실행하세요." -ForegroundColor Yellow
        exit 0
    } else {
        exit 1
    }
}
Write-Host "✅ Fly CLI 설치됨" -ForegroundColor Green

# 로그인 확인
try {
    $null = fly auth whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
    Write-Host "✅ Fly.io 로그인됨" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Fly.io 로그인 필요" -ForegroundColor Yellow
    fly auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 로그인 실패" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Fly.io 로그인 완료" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔑 환경변수 설정 (선택사항)" -ForegroundColor Cyan
Write-Host ""
$setupEnv = Read-Host "환경변수를 자동으로 설정하시겠습니까? (y/n)"

if ($setupEnv -eq "y" -or $setupEnv -eq "Y") {
    if (Test-Path ".env") {
        Write-Host "📤 .env 파일에서 환경변수 가져오는 중..." -ForegroundColor Cyan

        # .env 파일 읽기
        $envContent = Get-Content ".env" -Raw

        # fly secrets import 사용 (가장 쉬운 방법)
        Write-Host "  Using: fly secrets import < .env" -ForegroundColor Gray
        $envContent | fly secrets import

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 환경변수 설정 완료" -ForegroundColor Green
        } else {
            Write-Host "⚠️  자동 설정 실패, 수동 설정으로 진행..." -ForegroundColor Yellow

            # 수동으로 하나씩 설정
            Get-Content ".env" | ForEach-Object {
                $line = $_.Trim()

                # 주석과 빈 줄 건너뛰기
                if ($line -and -not $line.StartsWith("#")) {
                    $parts = $line -split "=", 2
                    if ($parts.Length -eq 2) {
                        $key = $parts[0].Trim()
                        $value = $parts[1].Trim()

                        if ($value) {
                            Write-Host "  Setting: $key" -ForegroundColor Gray
                            fly secrets set "$key=$value" 2>&1 | Out-Null
                            if ($LASTEXITCODE -ne 0) {
                                Write-Host "    ⚠️  Failed to set $key" -ForegroundColor Yellow
                            }
                        }
                    }
                }
            }
            Write-Host "✅ 환경변수 설정 완료" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ .env 파일을 찾을 수 없습니다." -ForegroundColor Red
        Write-Host "   수동으로 환경변수를 설정하세요:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host '   fly secrets set OPENAI_API_KEY="..."' -ForegroundColor White
        Write-Host '   fly secrets set UPSTASH_REDIS_REST_URL="..."' -ForegroundColor White
        Write-Host '   fly secrets set UPSTASH_REDIS_REST_TOKEN="..."' -ForegroundColor White
        Write-Host ""
        $cont = Read-Host "계속하시겠습니까? (y/n)"
        if ($cont -ne "y" -and $cont -ne "Y") {
            exit 1
        }
    }
} else {
    Write-Host "⏭️  환경변수 설정 건너뛰기" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  배포 후 다음 명령어로 환경변수를 설정하세요:" -ForegroundColor Yellow
    Write-Host '   fly secrets set OPENAI_API_KEY="..."' -ForegroundColor White
    Write-Host '   fly secrets set UPSTASH_REDIS_REST_URL="..."' -ForegroundColor White
    Write-Host '   fly secrets set UPSTASH_REDIS_REST_TOKEN="..."' -ForegroundColor White
}

Write-Host ""
Write-Host "🏗️  빌드 및 배포 시작..." -ForegroundColor Cyan
Write-Host ""

# 배포 실행
fly deploy --ha=false --vm-size shared-cpu-2x

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 배포 실패!" -ForegroundColor Red
    Write-Host "   로그를 확인하세요: fly logs" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ 배포 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 배포 확인:" -ForegroundColor Cyan
Write-Host ""

# 앱 상태 확인
fly status

Write-Host ""
Write-Host "🔗 앱 URL: https://backend-ai.fly.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 다음 단계:" -ForegroundColor Yellow
Write-Host "1. 헬스 체크: curl https://backend-ai.fly.dev/health"
Write-Host "2. 로그 확인: fly logs -f"
Write-Host "3. 프론트엔드 .env.local 업데이트:"
Write-Host "   AI_BACKEND_URL=https://backend-ai.fly.dev"
Write-Host ""
Write-Host "🎉 배포 성공!" -ForegroundColor Green

# 자동으로 헬스 체크
Write-Host ""
Write-Host "🔍 자동 헬스 체크 실행 중..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

try {
    $healthResponse = Invoke-WebRequest -Uri "https://backend-ai.fly.dev/health" -UseBasicParsing -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ 헬스 체크 성공!" -ForegroundColor Green
        Write-Host "   응답: $($healthResponse.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  헬스 체크 대기 중... (서버 시작 중일 수 있습니다)" -ForegroundColor Yellow
    Write-Host "   수동으로 확인: curl https://backend-ai.fly.dev/health" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ 배포가 완료되었습니다!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
