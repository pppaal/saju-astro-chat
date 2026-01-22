# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

from openai import OpenAI

client = OpenAI(api_key='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')

base_context = '''당신은 Destiny Fusion Matrix 전문가입니다.

사주 데이터:
- 일간: 갑목 (나무)
- 일진: 계묘일 (수생목)
- 격국: 식신격 (창의력)
- 십신: 식신 2개, 정관 2개
- 대운: 경오 (금극목, 시련기)
- 세운: 병오년 (목생화, 표현력)
- 도화살, 역마살, 문창귀인

점성술 데이터:
- 태양: 황소자리 (안정)
- 달: 물병자리 (독립)
- 상승궁: 쌍둥이자리 (소통)
- MC: 물고기자리 (창의)
- 금성-목성 트라인 (인간관계)
- 화성-태양 섹스타일 (행동력)
'''

sections = [
    {
        'name': '1부: 오늘의 본질',
        'prompt': f'''{base_context}

**1부: 오늘의 본질 (2026년 1월 21일)**

이 섹션만 최소 1000자 이상 작성하세요.

내용:
- 오늘을 한마디로 표현
- 일간 갑목과 일진 계묘일의 관계 (수생목)
- 태양 황소자리와 달 물병자리의 조화와 갈등
- 대운 경오의 금극목이 주는 시련과 성장
- 세운 병오년의 목생화가 표현력을 폭발시키는 이유
- 도화살+금성의 매력, 역마살+달의 변화, 문창귀인+수성의 언어 재능
- 이 모든 것이 융합되어 오늘이 어떤 날인지

친구에게 말하듯 자연스럽게, 깊이있게 작성하세요.

CRITICAL: This section MUST be at least 1000 Korean characters. Do not summarize.
'''
    },
    {
        'name': '2부: 시간대별 에너지',
        'prompt': f'''{base_context}

**2부: 시간대별 에너지 흐름**

이 섹션만 최소 1200자 이상 작성하세요.

각 시간대별로 상세히:
- 새벽 3-6시: 수생목 에너지, 꿈과 무의식
- 아침 6-9시: 목극토의 주도권, 첫 만남의 영향
- 오전 9-12시: 식신격 창의력 폭발, 중요한 결정
- 점심 12-3시: 화성-태양 행동력, 에너지 관리
- 오후 3-6시: 금성-목성 트라인, 인간관계 기회
- 저녁 6-9시: 문창귀인의 예술적 감수성
- 밤 9-12시: 달 물병자리의 독립성과 성찰

각 시간대마다 사주와 점성술을 교차 분석하세요.

CRITICAL: This section MUST be at least 1200 Korean characters. Be very detailed.
'''
    },
    {
        'name': '3부: 기회와 도전',
        'prompt': f'''{base_context}

**3부: 기회와 도전**

이 섹션만 최소 1400자 이상 작성하세요.

**기회 포인트 (700자 이상):**
1. 식신+수성 소통력: 프레젠테이션/협상에서 활용법, 구체적 전략
2. 도화살+금성-목성: 인간관계 매력, 새로운 만남, 네트워킹 방법
3. 월운 목극토+화성: 주도권과 행동력, 새 프로젝트 시작 타이밍

**주의할 점 (700자 이상):**
1. 목 과다: 오행 불균형, 충동적 행동, 균형 맞추는 법
2. 대운 금극목: 외부 압박과 시련, 성장 기회로 만드는 심리 전략
3. 화성 에너지: 갈등 위험, 자기주장과 배려의 균형, 감정 조절

CRITICAL: This section MUST be at least 1400 Korean characters total. Be very specific and detailed.
'''
    },
    {
        'name': '4부: 영역별 분석',
        'prompt': f'''{base_context}

**4부: 영역별 심층 분석**

이 섹션만 최소 2000자 이상 작성하세요.

**Career (500자 이상):**
직장에서 벌어질 일, 상사/동료 관계, 프로젝트 흐름, 회의 대처법
식신격+MC 물고기자리의 창의성, 정관+10하우스의 신뢰 구축
월운 목극토로 주도권 잡는 커뮤니케이션 전략

**Love (500자 이상):**
솔로: 만날 장소/타입, 도화살+금성의 직진형 매력, 첫 대화법
커플: 관계 흐름, 달 물병자리의 독립성 vs 친밀감 조율, 대화 주제
감정 흐름과 상대방이 나를 보는 시선

**Wealth (500자 이상):**
수익 가능성, 금성-목성 트라인의 재물운 경로
충동구매 위험, 화성의 소비 욕구 통제법
투자 결정 시 주의사항, 대운 경오에서의 재테크 전략
재물 관리법, 저축과 투자 비율

**Health (500자 이상):**
오늘 컨디션, 목 35% 과다+화 20%의 영향
조심할 신체 부위 (심장, 간, 눈)
운동 시간과 종류, 오행 밸런스 맞추는 운동
식사 관리 (토 15% 부족, 소화기관), 스트레스 관리법

CRITICAL: This section MUST be at least 2000 Korean characters total. Each subsection must be 500+ characters.
'''
    },
    {
        'name': '5부: 실천 가이드',
        'prompt': f'''{base_context}

**5부: 실천 가이드와 핵심 메시지**

이 섹션만 최소 1000자 이상 작성하세요.

**시간대별 행동 지침:**
- 아침: 명상, 스트레칭, 목표 설정, 식사, 마음가짐
- 오전: 업무 시작, 우선순위, 소통 타이밍, 회의 준비
- 점심: 에너지 관리, 휴식과 활동 균형, 네트워킹
- 저녁: 하루 마무리, 가족/친구 시간, 취미, 내일 준비

각 행동에 대해 "왜 그렇게 해야 하는지" 사주와 점성술의 근거 제시

**핵심 메시지 (300자 이상):**
오늘이 인생에서 가지는 의미
작은 하루지만 큰 변화의 시작점
어떤 깨달음을 얻을 수 있는지
마음을 울리는 희망과 용기의 메시지

CRITICAL: This section MUST be at least 1000 Korean characters. Be inspiring and deeply meaningful.
'''
    }
]

print("=" * 80)
print("🌟 멀티파트 7000자급 리포트 생성 중...")
print("=" * 80)
print()

full_report = ""
total_chars = 0
total_tokens = 0

for i, section in enumerate(sections, 1):
    print(f"[{i}/5] {section['name']} 생성 중...")

    response = client.chat.completions.create(
        model='gpt-4o',
        messages=[{'role': 'user', 'content': section['prompt']}],
        max_tokens=3000,
        temperature=0.9
    )

    result = response.choices[0].message.content
    section_chars = len(result)
    section_tokens = response.usage.total_tokens

    print(f"  ✓ {section_chars}자 생성 (토큰: {section_tokens})")
    print()

    full_report += result + "\n\n"
    total_chars += section_chars
    total_tokens += section_tokens

print("=" * 80)
print("📄 전체 리포트:")
print("=" * 80)
print()
print(full_report)
print()
print("=" * 80)
print(f"📊 총 글자 수: {total_chars}자")
print(f"💰 총 토큰 사용: {total_tokens}")
print("=" * 80)
