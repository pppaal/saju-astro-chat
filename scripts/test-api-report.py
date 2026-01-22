# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

import requests
import json

# API 엔드포인트
url = "http://localhost:3000/api/destiny-matrix/ai-report"

# 요청 데이터
payload = {
    "dayMasterElement": "목",
    "name": "테스트 사용자",
    "birthDate": "1990-05-15",
    "period": "daily",
    "targetDate": "2026-01-21",
    "lang": "ko",
    "format": "json"
}

print("=" * 80)
print("🌟 AI Daily Report API 테스트")
print("=" * 80)
print(f"\n요청 데이터:")
print(json.dumps(payload, indent=2, ensure_ascii=False))
print("\n" + "=" * 80)
print("API 호출 중...")
print("=" * 80)

try:
    response = requests.post(url, json=payload, timeout=180)

    print(f"\n상태 코드: {response.status_code}")

    if response.status_code == 200:
        data = response.json()

        if data.get('success'):
            report = data.get('report', {})
            sections = report.get('sections', {})

            print("\n✅ 리포트 생성 성공!")
            print(f"크레딧 사용: {data.get('creditsUsed', 0)}")
            print(f"남은 크레딧: {data.get('remainingCredits', 0)}")
            print(f"리포트 타입: {data.get('reportType', 'unknown')}")
            print(f"리포트 ID: {report.get('id', 'N/A')}")

            print("\n" + "=" * 80)
            print("📄 생성된 리포트 내용:")
            print("=" * 80)

            # 각 섹션 출력
            for section_name, content in sections.items():
                print(f"\n### {section_name.upper()}")
                print("-" * 80)
                if isinstance(content, dict):
                    for key, value in content.items():
                        print(f"\n**{key}:**")
                        print(value)
                else:
                    print(content)
                print("-" * 80)

            # 전체 글자수 계산
            total_chars = 0
            for content in sections.values():
                if isinstance(content, dict):
                    for value in content.values():
                        if isinstance(value, str):
                            total_chars += len(value)
                elif isinstance(content, str):
                    total_chars += len(content)

            print("\n" + "=" * 80)
            print(f"📊 총 글자 수: {total_chars}자")
            print("=" * 80)

        else:
            print(f"\n❌ 실패: {data.get('error', {}).get('message', 'Unknown error')}")
    else:
        print(f"\n❌ HTTP 오류: {response.status_code}")
        print(response.text)

except requests.exceptions.Timeout:
    print("\n⏱️ 타임아웃: API 응답 시간 초과")
except Exception as e:
    print(f"\n❌ 오류: {str(e)}")
