@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           🚀 Backend AI - Fly.io 자동 배포                     ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📍 현재 위치: %CD%
echo.

REM Fly CLI 경로 찾기
set FLY_PATH=
where fly >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set FLY_PATH=fly
    goto :found_fly
)

if exist "C:\Users\%USERNAME%\.fly\bin\fly.exe" (
    set FLY_PATH=C:\Users\%USERNAME%\.fly\bin\fly.exe
    goto :found_fly
)

echo ❌ Fly CLI를 찾을 수 없습니다.
echo.
echo 📥 Fly CLI 설치가 필요합니다.
echo    PowerShell에서 실행: iwr https://fly.io/install.ps1 -useb ^| iex
echo.
pause
exit /b 1

:found_fly
echo ✅ Fly CLI 발견: %FLY_PATH%
echo.

REM 로그인 확인
echo 🔐 Fly.io 로그인 확인 중...
"%FLY_PATH%" auth whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  로그인이 필요합니다. 브라우저가 열립니다...
    "%FLY_PATH%" auth login
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 로그인 실패
        pause
        exit /b 1
    )
)
echo ✅ 로그인 확인됨
echo.

REM 환경변수 설정
echo 🔑 환경변수 설정 중...
echo.
if exist "fly-secrets.txt" (
    echo 📤 fly-secrets.txt 파일에서 환경변수 가져오는 중...
    "%FLY_PATH%" secrets import < fly-secrets.txt
    if %ERRORLEVEL% EQU 0 (
        echo ✅ 환경변수 설정 완료
    ) else (
        echo ⚠️  환경변수 설정 중 일부 오류 발생 (계속 진행)
    )
) else if exist ".env" (
    echo 📤 .env 파일에서 환경변수 가져오는 중...
    "%FLY_PATH%" secrets import < .env
    if %ERRORLEVEL% EQU 0 (
        echo ✅ 환경변수 설정 완료
    ) else (
        echo ⚠️  환경변수 설정 중 일부 오류 발생 (계속 진행)
    )
) else (
    echo ⚠️  환경변수 파일을 찾을 수 없습니다.
    echo.
    set /p continue="계속하시겠습니까? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)
echo.

REM 배포 실행
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   🏗️  배포 시작                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ⏱️  예상 소요 시간: 3-5분
echo 📊 빌드 로그가 표시됩니다...
echo.

"%FLY_PATH%" deploy --ha=false --vm-size shared-cpu-2x

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ╔════════════════════════════════════════════════════════════════╗
    echo ║                   ❌ 배포 실패                                  ║
    echo ╚════════════════════════════════════════════════════════════════╝
    echo.
    echo 🔍 로그 확인: %FLY_PATH% logs
    echo 📖 가이드 참고: README_DEPLOY.md
    echo.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   ✅ 배포 성공!                                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM 상태 확인
echo 📊 앱 상태 확인 중...
"%FLY_PATH%" status
echo.

REM 헬스 체크
echo 🔍 헬스 체크 중...
timeout /t 5 /nobreak >nul
curl -s https://backend-ai.fly.dev/health 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 헬스 체크 성공!
) else (
    echo.
    echo ⚠️  서버 시작 중... 잠시 후 다시 확인하세요.
    echo    확인: curl https://backend-ai.fly.dev/health
)
echo.

echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   🎉 배포 완료!                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🔗 백엔드 URL: https://backend-ai.fly.dev
echo.
echo 📋 다음 단계:
echo.
echo   1. 헬스 체크:
echo      curl https://backend-ai.fly.dev/health
echo.
echo   2. 로그 확인:
echo      %FLY_PATH% logs -f
echo.
echo   3. 프론트엔드 .env.local 업데이트:
echo      AI_BACKEND_URL=https://backend-ai.fly.dev
echo.
echo   4. 프론트엔드 배포:
echo      vercel --prod
echo.
echo 💡 팁: 로그 실시간 보기 - %FLY_PATH% logs -f
echo.
pause
