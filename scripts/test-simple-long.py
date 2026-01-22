# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

from openai import OpenAI

client = OpenAI(api_key='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')

prompt = '''당신은 Destiny Fusion Matrix 전문가입니다.
사주와 점성술을 결합하여 운세 리포트를 작성합니다.

데이터:
- 일간: 갑목 (나무)
- 일진: 계묘일 (수생목)
- 격국: 식신격 (창의력)
- 십신: 식신 2개, 정관 2개
- 태양: 황소자리
- 달: 물병자리
- 금성-목성 트라인 (인간관계)

리포트를 **6000자 이상** 작성하세요.

필수 섹션:
1. 오늘의 본질 (800자 이상): 일간과 일진의 관계, 행성 배치 분석
2. 시간대별 흐름 (1000자 이상): 새벽부터 밤까지 상세 분석
3. 기회와 도전 (1200자 이상): 기회 포인트와 주의사항
4. 영역별 분석 (2000자 이상): 커리어/사랑/재물/건강 각 500자씩
5. 실천 가이드 (800자 이상): 아침부터 밤까지 행동 지침

친구에게 말하듯 자연스럽게 작성하세요.
'''

print("=" * 80)
print("🌟 6000자급 리포트 생성 중...")
print("=" * 80)
print()

response = client.chat.completions.create(
    model='gpt-4o',
    messages=[{'role': 'user', 'content': prompt}],
    max_tokens=15000,
    temperature=0.9
)

result = response.choices[0].message.content

print(result)
print()
print("=" * 80)
print(f"📊 글자 수: {len(result)}자")
print(f"💰 토큰 사용: {response.usage.total_tokens}")
print("=" * 80)
