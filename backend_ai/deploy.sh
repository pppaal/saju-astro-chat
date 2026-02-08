#!/bin/bash
# Fly.io 자동 배포 스크립트

set -e  # 에러 발생 시 중단

echo "🚀 Backend AI - Fly.io 자동 배포 시작"
echo ""

# 현재 디렉토리 확인
if [ ! -f "fly.toml" ]; then
    echo "❌ 에러: fly.toml 파일을 찾을 수 없습니다."
    echo "   backend_ai 디렉토리에서 실행하세요."
    exit 1
fi

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  경고: .env 파일이 없습니다."
    echo "   환경변수를 수동으로 설정해야 합니다."
else
    echo "✅ .env 파일 발견"
fi

echo ""
echo "📋 배포 전 체크리스트:"
echo ""

# Fly CLI 설치 확인
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI가 설치되지 않았습니다."
    echo ""
    echo "설치 방법:"
    echo "  macOS/Linux: curl -L https://fly.io/install.sh | sh"
    echo "  Windows: iwr https://fly.io/install.ps1 -useb | iex"
    exit 1
fi
echo "✅ Fly CLI 설치됨"

# 로그인 확인
if ! fly auth whoami &> /dev/null; then
    echo "⚠️  Fly.io 로그인 필요"
    fly auth login
fi
echo "✅ Fly.io 로그인됨"

echo ""
echo "🔑 환경변수 설정 (선택사항)"
echo ""
echo "환경변수를 자동으로 설정하시겠습니까? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    if [ -f ".env" ]; then
        echo "📤 .env 파일에서 환경변수 가져오는 중..."

        # .env 파일에서 주요 변수만 추출
        while IFS='=' read -r key value; do
            # 주석과 빈 줄 건너뛰기
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue

            # 앞뒤 공백 제거
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs)

            # 값이 있는 경우만 설정
            if [ -n "$value" ]; then
                echo "  Setting: $key"
                fly secrets set "$key=$value" 2>/dev/null || echo "    ⚠️  Failed to set $key"
            fi
        done < .env

        echo "✅ 환경변수 설정 완료"
    else
        echo "❌ .env 파일을 찾을 수 없습니다."
        echo "   수동으로 환경변수를 설정하세요:"
        echo ""
        echo "   fly secrets set OPENAI_API_KEY=\"...\""
        echo "   fly secrets set UPSTASH_REDIS_REST_URL=\"...\""
        echo "   fly secrets set UPSTASH_REDIS_REST_TOKEN=\"...\""
        echo ""
        echo "계속하시겠습니까? (y/n)"
        read -r cont
        if [[ ! "$cont" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo "⏭️  환경변수 설정 건너뛰기"
    echo ""
    echo "⚠️  배포 후 다음 명령어로 환경변수를 설정하세요:"
    echo "   fly secrets set OPENAI_API_KEY=\"...\""
    echo "   fly secrets set UPSTASH_REDIS_REST_URL=\"...\""
    echo "   fly secrets set UPSTASH_REDIS_REST_TOKEN=\"...\""
fi

echo ""
echo "🏗️  빌드 및 배포 시작..."
echo ""

# 배포 실행
fly deploy --ha=false --vm-size shared-cpu-2x

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📊 배포 확인:"
echo ""

# 앱 상태 확인
fly status

echo ""
echo "🔗 앱 URL: https://backend-ai.fly.dev"
echo ""
echo "📋 다음 단계:"
echo "1. 헬스 체크: curl https://backend-ai.fly.dev/health"
echo "2. 로그 확인: fly logs -f"
echo "3. 프론트엔드 .env.local 업데이트:"
echo "   AI_BACKEND_URL=https://backend-ai.fly.dev"
echo ""
echo "🎉 배포 성공!"
