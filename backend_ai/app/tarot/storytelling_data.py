# backend_ai/app/tarot/storytelling_data.py
"""
Tarot Storytelling Data
=======================
Tier 6: 스토리텔링 관련 상수
- 서사 구조
- 카드 전이어
"""

# 서사 구조 정의
NARRATIVE_STRUCTURES = {
    'hero_journey': {
        'korean': '영웅의 여정',
        'stages': ['일상', '소명', '문턱', '시련', '심연', '보상', '귀환'],
        'description': '변화와 성장의 고전적 서사',
    },
    'phoenix': {
        'korean': '피닉스 스토리',
        'stages': ['과거의 영광', '몰락', '재의 시간', '불꽃', '재탄생'],
        'description': '파괴와 재생의 서사',
    },
    'love_story': {
        'korean': '사랑 이야기',
        'stages': ['고독', '만남', '장애물', '선택', '결합'],
        'description': '관계와 연결의 서사',
    },
    'discovery': {
        'korean': '발견의 여정',
        'stages': ['의문', '탐색', '미로', '통찰', '지혜'],
        'description': '진실과 깨달음의 서사',
    },
}

# 카드 연결 전이어
CARD_TRANSITIONS = {
    'contrast': ['그러나', '하지만', '반면에', '이와 대조적으로'],
    'consequence': ['그래서', '따라서', '그 결과', '이로 인해'],
    'addition': ['그리고', '더불어', '또한', '게다가'],
    'time': ['그 후', '이어서', '그다음', '마침내'],
    'condition': ['만약', '~한다면', '조건이 맞으면', '때가 되면'],
    'emphasis': ['특히', '무엇보다', '가장 중요한 것은', '핵심은'],
}
