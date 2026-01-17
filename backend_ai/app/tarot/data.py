# backend_ai/app/tarot/data.py
"""
Tarot Data
==========
테마별 카드 점수 및 시너지 데이터
"""

# 테마별 카드 점수 (-5 ~ +5, 0은 중립)
CARD_THEME_SCORES = {
    'love': {
        # 매우 긍정 (+4~+5)
        'The Lovers': 5, 'Two of Cups': 5, 'Ten of Cups': 5,
        'The Empress': 4, 'Ace of Cups': 4, 'Knight of Cups': 4,
        'The Sun': 4, 'The Star': 4,
        # 긍정 (+2~+3)
        'Three of Cups': 3, 'Six of Cups': 3, 'Nine of Cups': 3,
        'Queen of Cups': 3, 'King of Cups': 3, 'Page of Cups': 2,
        'Four of Wands': 3, 'The World': 3, 'Temperance': 2,
        'Strength': 2, 'The Emperor': 2, 'The Hierophant': 2,
        # 약간 부정 (-1~-2)
        'Five of Cups': -2, 'Seven of Cups': -1, 'Eight of Cups': -2,
        'Five of Wands': -1, 'Seven of Swords': -2,
        # 부정 (-3~-4)
        'Three of Swords': -4, 'Ten of Swords': -3, 'The Tower': -3,
        'Five of Pentacles': -2, 'Nine of Swords': -2,
        # 매우 부정 (-5)
        'The Devil': -4,
    },
    'career': {
        # 매우 긍정
        'The Chariot': 5, 'Ace of Pentacles': 5, 'Ten of Pentacles': 5,
        'Three of Wands': 4, 'Six of Wands': 4, 'King of Pentacles': 4,
        'The Emperor': 4, 'The World': 4, 'Wheel of Fortune': 4,
        # 긍정
        'Eight of Pentacles': 3, 'Nine of Pentacles': 3, 'The Magician': 3,
        'Ace of Wands': 3, 'Three of Pentacles': 3, 'Page of Pentacles': 2,
        'Knight of Wands': 2, 'Queen of Pentacles': 3, 'The Sun': 3,
        # 부정
        'Five of Pentacles': -3, 'Ten of Wands': -2, 'Four of Pentacles': -1,
        'Seven of Pentacles': -1, 'Eight of Cups': -2,
        'The Tower': -3, 'Death': -2,
        # 매우 부정
        'Ten of Swords': -4, 'The Devil': -3,
    },
    'money': {
        # 매우 긍정
        'Ace of Pentacles': 5, 'Ten of Pentacles': 5, 'Nine of Pentacles': 5,
        'King of Pentacles': 4, 'Queen of Pentacles': 4,
        'Wheel of Fortune': 4, 'The Empress': 4,
        # 긍정
        'Six of Pentacles': 3, 'Four of Pentacles': 2, 'Three of Pentacles': 3,
        'Eight of Pentacles': 3, 'The Sun': 3, 'The World': 3,
        'The Emperor': 2, 'The Magician': 2,
        # 부정
        'Five of Pentacles': -5, 'Seven of Pentacles': -1,
        'The Tower': -3, 'Death': -2, 'Ten of Swords': -3,
        # 매우 부정
        'The Devil': -3,
    },
    'health': {
        # 매우 긍정
        'The Sun': 5, 'The Star': 5, 'Temperance': 4,
        'Strength': 4, 'Nine of Pentacles': 4, 'Ace of Cups': 3,
        'The World': 3, 'Six of Wands': 3,
        # 긍정
        'Four of Swords': 2, 'The Empress': 3, 'Queen of Pentacles': 2,
        'Ace of Wands': 2, 'Ten of Cups': 2, 'The Hermit': 1,
        # 부정
        'Nine of Swords': -3, 'Ten of Swords': -4, 'Five of Pentacles': -3,
        'The Tower': -3, 'Three of Swords': -2, 'Eight of Cups': -2,
        # 매우 부정
        'Death': -2, 'The Devil': -4,
    },
    'spiritual': {
        # 매우 긍정
        'The High Priestess': 5, 'The Hermit': 5, 'The Star': 5,
        'The Moon': 4, 'Judgement': 4, 'The World': 4,
        'Temperance': 4, 'The Hanged Man': 3,
        # 긍정
        'Ace of Cups': 3, 'The Magician': 3, 'The Fool': 3,
        'Four of Cups': 2, 'Seven of Cups': 2, 'Queen of Cups': 2,
        'Death': 3, 'The Tower': 2,
        # 부정
        'The Devil': -3, 'Seven of Swords': -2,
        'Five of Pentacles': -1, 'King of Pentacles': -1,
    },
}

# 카드 쌍 시너지 (강화/약화 관계)
CARD_SYNERGIES = {
    # 강화 쌍 (함께 나오면 서로 의미 증폭)
    'reinforcing': [
        # 사랑 강화
        (['The Lovers', 'Two of Cups'], '운명적 만남', 'love', 2.0),
        (['The Empress', 'Ace of Cups'], '풍요로운 사랑의 시작', 'love', 1.8),
        (['Ten of Cups', 'Four of Wands'], '완벽한 가정의 행복', 'love', 1.8),
        (['Knight of Cups', 'Ace of Cups'], '로맨틱한 제안', 'love', 1.5),
        (['The Sun', 'The Lovers'], '축복받은 사랑', 'love', 1.8),
        # 커리어 강화
        (['The Chariot', 'Ace of Wands'], '새 사업의 승리', 'career', 2.0),
        (['The Emperor', 'King of Pentacles'], '사업 성공과 리더십', 'career', 1.8),
        (['Three of Wands', 'Eight of Pentacles'], '노력이 확장으로', 'career', 1.5),
        (['The World', 'Ten of Pentacles'], '완전한 성취', 'career', 2.0),
        # 재물 강화
        (['Ace of Pentacles', 'Nine of Pentacles'], '재정적 성공', 'money', 2.0),
        (['Wheel of Fortune', 'Ace of Pentacles'], '횡재', 'money', 1.8),
        (['Six of Pentacles', 'Ten of Pentacles'], '나눔이 복으로', 'money', 1.5),
        # 영적 강화
        (['The High Priestess', 'The Moon'], '직관 극대화', 'spiritual', 2.0),
        (['The Hermit', 'The Star'], '고독 속 깨달음', 'spiritual', 1.8),
        (['Judgement', 'The World'], '영적 완성', 'spiritual', 2.0),
    ],
    # 약화/경고 쌍 (함께 나오면 주의 필요)
    'conflicting': [
        (['Three of Swords', 'Ten of Swords'], '고통스러운 종말', 'love', -2.0),
        (['The Tower', 'Ten of Swords'], '완전한 붕괴', 'all', -2.0),
        (['The Devil', 'Seven of Swords'], '속임과 중독', 'all', -1.8),
        (['Five of Pentacles', 'Ten of Swords'], '경제적 어려움 극한', 'money', -2.0),
        (['Nine of Swords', 'The Moon'], '불안과 환상', 'health', -1.5),
        (['The Tower', 'Three of Swords'], '충격적 이별', 'love', -2.0),
        (['Five of Cups', 'Eight of Cups'], '떠나야 할 때', 'love', -1.5),
    ],
    # 변환 쌍 (하나가 다른 하나를 변화시킴)
    'transforming': [
        (['Death', 'The Star'], '끝에서 희망으로', 'all', 1.0),
        (['The Tower', 'The Sun'], '파괴 후 재건', 'all', 1.0),
        (['The Devil', 'Strength'], '속박에서 자유로', 'all', 1.0),
        (['Five of Cups', 'Six of Cups'], '슬픔에서 추억으로', 'love', 0.8),
        (['Ten of Swords', 'Ace of Swords'], '끝에서 새 시작으로', 'career', 1.0),
        (['The Hanged Man', 'The World'], '희생이 성취로', 'all', 1.2),
    ],
}
