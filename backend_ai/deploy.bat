@echo off
REM Fly.io 자동 배포 스크립트 (Windows)

echo 🚀 Backend AI - Fly.io 자동 배포 시작
echo.

REM 현재 디렉토리 확인
if not exist "fly.toml" (
    echo ❌ 에러: fly.toml 파일을 찾을 수 없습니다.
    echo    backend_ai 디렉토리에서 실행하세요.
    exit /b 1
)

REM .env 파일 확인
if not exist ".env" (
    echo ⚠️  경고: .env 파일이 없습니다.
    echo    환경변수를 수동으로 설정해야 합니다.
) else (
    echo ✅ .env 파일 발견
)

echo.
echo 📋 배포 전 체크리스트:
echo.

REM Fly CLI 설치 확인
where fly >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Fly CLI가 설치되지 않았습니다.
    echo.
    echo 설치 방법:
    echo   PowerShell에서: iwr https://fly.io/install.ps1 -useb ^| iex
    exit /b 1
)
echo ✅ Fly CLI 설치됨

REM 로그인 확인
fly auth whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Fly.io 로그인 필요
    fly auth login
)
echo ✅ Fly.io 로그인됨

echo.
echo 🔑 환경변수 설정 (선택사항)
echo.
set /p setup_env="환경변수를 자동으로 설정하시겠습니까? (y/n): "

if /i "%setup_env%"=="y" (
    if exist ".env" (
        echo 📤 .env 파일에서 환경변수 가져오는 중...

        REM 주요 환경변수 설정
        for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
            set line=%%a
            set value=%%b

            REM 주석과 빈 줄 건너뛰기
            if not "!line:~0,1!"=="#" (
                if not "!line!"=="" (
                    if not "!value!"=="" (
                        echo   Setting: %%a
                        fly secrets set "%%a=%%b" 2>nul || echo     ⚠️  Failed to set %%a
                    )
                )
            )
        )

        echo ✅ 환경변수 설정 완료
    ) else (
        echo ❌ .env 파일을 찾을 수 없습니다.
        echo    수동으로 환경변수를 설정하세요:
        echo.
        echo    fly secrets set OPENAI_API_KEY="..."
        echo    fly secrets set UPSTASH_REDIS_REST_URL="..."
        echo    fly secrets set UPSTASH_REDIS_REST_TOKEN="..."
        echo.
        set /p cont="계속하시겠습니까? (y/n): "
        if /i not "%cont%"=="y" exit /b 1
    )
) else (
    echo ⏭️  환경변수 설정 건너뛰기
    echo.
    echo ⚠️  배포 후 다음 명령어로 환경변수를 설정하세요:
    echo    fly secrets set OPENAI_API_KEY="..."
    echo    fly secrets set UPSTASH_REDIS_REST_URL="..."
    echo    fly secrets set UPSTASH_REDIS_REST_TOKEN="..."
)

echo.
echo 🏗️  빌드 및 배포 시작...
echo.

REM 배포 실행
fly deploy --ha=false --vm-size shared-cpu-2x

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 배포 실패!
    echo    로그를 확인하세요: fly logs
    exit /b 1
)

echo.
echo ✅ 배포 완료!
echo.
echo 📊 배포 확인:
echo.

REM 앱 상태 확인
fly status

echo.
echo 🔗 앱 URL: https://backend-ai.fly.dev
echo.
echo 📋 다음 단계:
echo 1. 헬스 체크: curl https://backend-ai.fly.dev/health
echo 2. 로그 확인: fly logs -f
echo 3. 프론트엔드 .env.local 업데이트:
echo    AI_BACKEND_URL=https://backend-ai.fly.dev
echo.
echo 🎉 배포 성공!

pause
