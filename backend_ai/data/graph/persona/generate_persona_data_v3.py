#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Persona Data Generator V3 - 수량 + 품질 결합
V1의 대량 생성 + V2의 풍부한 의미 사전
"""

import json
import csv
import os
import sys
import random
import hashlib
from itertools import product

# Windows 인코딩 문제 해결
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# =====================================================================
# 풍부한 의미 사전 (V2에서 가져옴 + 확장)
# =====================================================================

PLANET_MEANINGS = {
    "Sun": {
        "essence": "핵심 정체성",
        "korean": "태양",
        "jung": "의식의 중심, 자기(Self)를 향한 여정의 출발점",
        "stoic": "이성의 불꽃, 덕의 원천",
        "shadow": "자기중심적 맹목",
        "light": "창조적 표현, 리더십",
        "action": "빛나다",
        "element": "fire",
        "keywords": ["정체성", "생명력", "의지", "창조성", "자아"]
    },
    "Moon": {
        "essence": "감정과 본능",
        "korean": "달",
        "jung": "무의식의 바다, 아니마의 거울",
        "stoic": "감정의 파도를 관찰하라",
        "shadow": "감정적 폭풍, 과거 집착",
        "light": "직관, 양육, 공감",
        "action": "느끼다",
        "element": "water",
        "keywords": ["감정", "본능", "어머니", "안전", "기억"]
    },
    "Mercury": {
        "essence": "사고와 소통",
        "korean": "수성",
        "jung": "헤르메스, 의식과 무의식의 메신저",
        "stoic": "이성적 분별력, 진리 탐구",
        "shadow": "과잉 분석, 피상적 지식",
        "light": "명료한 사고, 연결력",
        "action": "분석하다",
        "element": "air",
        "keywords": ["소통", "지성", "학습", "언어", "연결"]
    },
    "Venus": {
        "essence": "사랑과 가치",
        "korean": "금성",
        "jung": "아니마의 매혹, 관계를 통한 자기 발견",
        "stoic": "내적 덕의 아름다움에 집중하라",
        "shadow": "탐닉, 소유욕",
        "light": "조화, 예술성, 사랑",
        "action": "사랑하다",
        "element": "earth",
        "keywords": ["사랑", "아름다움", "가치", "관계", "쾌락"]
    },
    "Mars": {
        "essence": "행동과 욕망",
        "korean": "화성",
        "jung": "그림자의 공격적 에너지, 통합해야 할 전사",
        "stoic": "용기의 원천, 두려움 속 올바른 행동",
        "shadow": "맹목적 분노, 파괴적 충동",
        "light": "용기, 추진력, 열정",
        "action": "행동하다",
        "element": "fire",
        "keywords": ["행동", "욕망", "투쟁", "용기", "에너지"]
    },
    "Jupiter": {
        "essence": "확장과 지혜",
        "korean": "목성",
        "jung": "현자 원형의 관대함, 의미 추구",
        "stoic": "진정한 풍요는 만족에 있다",
        "shadow": "과잉, 방탕, 자만",
        "light": "낙관, 성장, 지혜",
        "action": "확장하다",
        "element": "fire",
        "keywords": ["확장", "행운", "철학", "성장", "관대"]
    },
    "Saturn": {
        "essence": "제한과 책임",
        "korean": "토성",
        "jung": "노인 원형, 개성화의 시련과 관문",
        "stoic": "메멘토 모리, 한계 속 자유",
        "shadow": "경직, 냉소, 과도한 자기비판",
        "light": "인내, 지혜, 성숙",
        "action": "제한하다",
        "element": "earth",
        "keywords": ["책임", "시간", "구조", "시련", "성숙"]
    },
    "Uranus": {
        "essence": "혁신과 자유",
        "korean": "천왕성",
        "jung": "집단무의식에서 튀어나온 번갯불",
        "stoic": "운명의 예측불가성을 받아들이라",
        "shadow": "혼란, 무질서한 반항",
        "light": "독창성, 통찰, 해방",
        "action": "깨뜨리다",
        "element": "air",
        "keywords": ["혁명", "자유", "독창성", "깨달음", "변화"]
    },
    "Neptune": {
        "essence": "초월과 영성",
        "korean": "해왕성",
        "jung": "집단무의식의 바다, 신비로운 합일",
        "stoic": "환상에 빠지지 말라, 연민은 덕이다",
        "shadow": "자기기만, 현실도피",
        "light": "영감, 연민, 예술",
        "action": "초월하다",
        "element": "water",
        "keywords": ["영성", "환상", "예술", "연민", "초월"]
    },
    "Pluto": {
        "essence": "변환과 재탄생",
        "korean": "명왕성",
        "jung": "그림자의 심연, 죽음을 통한 재탄생",
        "stoic": "변화를 두려워하지 말라",
        "shadow": "집착, 조종, 파괴적 권력욕",
        "light": "변환, 치유, 재생",
        "action": "변환하다",
        "element": "water",
        "keywords": ["변환", "죽음", "재탄생", "권력", "심층"]
    }
}

SIGN_MEANINGS = {
    "Aries": {
        "essence": "시작과 용기",
        "korean": "양자리",
        "energy": "불의 첫 불꽃",
        "shadow": "성급함, 충동",
        "light": "용기, 주도성",
        "lesson": "용기와 무모함의 차이",
        "element": "fire",
        "modality": "cardinal",
        "keywords": ["시작", "용기", "주도", "독립", "경쟁"]
    },
    "Taurus": {
        "essence": "안정과 감각",
        "korean": "황소자리",
        "energy": "땅의 풍요",
        "shadow": "완고함, 물질주의",
        "light": "인내, 감각적 즐거움",
        "lesson": "소유가 아닌 존재에서 가치를 찾아라",
        "element": "earth",
        "modality": "fixed",
        "keywords": ["안정", "가치", "감각", "인내", "풍요"]
    },
    "Gemini": {
        "essence": "소통과 다양성",
        "korean": "쌍둥이자리",
        "energy": "바람의 가벼움",
        "shadow": "피상성, 집중력 부족",
        "light": "호기심, 적응력",
        "lesson": "깊이와 넓이의 균형",
        "element": "air",
        "modality": "mutable",
        "keywords": ["소통", "호기심", "다양성", "연결", "지성"]
    },
    "Cancer": {
        "essence": "보호와 양육",
        "korean": "게자리",
        "energy": "물의 품",
        "shadow": "과잉보호, 감정적 조종",
        "light": "돌봄, 직관",
        "lesson": "진정한 돌봄은 상대를 자유롭게 한다",
        "element": "water",
        "modality": "cardinal",
        "keywords": ["가정", "감정", "보호", "양육", "뿌리"]
    },
    "Leo": {
        "essence": "창조와 표현",
        "korean": "사자자리",
        "energy": "불의 심장",
        "shadow": "오만, 관심 갈망",
        "light": "창조성, 관대함",
        "lesson": "진정한 왕은 섬기는 자다",
        "element": "fire",
        "modality": "fixed",
        "keywords": ["창조", "표현", "자신감", "리더십", "기쁨"]
    },
    "Virgo": {
        "essence": "분석과 봉사",
        "korean": "처녀자리",
        "energy": "땅의 정교함",
        "shadow": "비판주의, 완벽주의",
        "light": "분석력, 치유",
        "lesson": "불완전함 속에서 온전함을 보라",
        "element": "earth",
        "modality": "mutable",
        "keywords": ["분석", "봉사", "건강", "완벽", "실용"]
    },
    "Libra": {
        "essence": "균형과 관계",
        "korean": "천칭자리",
        "energy": "바람의 균형",
        "shadow": "우유부단, 갈등회피",
        "light": "조화, 정의감",
        "lesson": "자신 안에서 먼저 균형을 찾아라",
        "element": "air",
        "modality": "cardinal",
        "keywords": ["균형", "관계", "조화", "정의", "아름다움"]
    },
    "Scorpio": {
        "essence": "변환과 심층",
        "korean": "전갈자리",
        "energy": "물의 심연",
        "shadow": "집착, 복수심",
        "light": "통찰, 재생력",
        "lesson": "놓아줄 때 진정한 힘이 온다",
        "element": "water",
        "modality": "fixed",
        "keywords": ["변환", "심층", "열정", "비밀", "재생"]
    },
    "Sagittarius": {
        "essence": "탐험과 지혜",
        "korean": "궁수자리",
        "energy": "불의 화살",
        "shadow": "무책임, 독선",
        "light": "낙관, 철학적 사고",
        "lesson": "지혜는 겸손에서 시작된다",
        "element": "fire",
        "modality": "mutable",
        "keywords": ["탐험", "자유", "철학", "모험", "의미"]
    },
    "Capricorn": {
        "essence": "성취와 책임",
        "korean": "염소자리",
        "energy": "땅의 정상",
        "shadow": "냉혹함, 야망 집착",
        "light": "인내, 리더십",
        "lesson": "정상에서도 겸손을 잃지 말라",
        "element": "earth",
        "modality": "cardinal",
        "keywords": ["성취", "책임", "구조", "권위", "인내"]
    },
    "Aquarius": {
        "essence": "혁신과 인류애",
        "korean": "물병자리",
        "energy": "바람의 번갯불",
        "shadow": "냉담, 비인간적 이상",
        "light": "독창성, 박애",
        "lesson": "인류를 사랑하되 개인도 보라",
        "element": "air",
        "modality": "fixed",
        "keywords": ["혁신", "인류애", "독창성", "미래", "자유"]
    },
    "Pisces": {
        "essence": "초월과 연민",
        "korean": "물고기자리",
        "energy": "물의 바다",
        "shadow": "현실도피, 순교자 콤플렉스",
        "light": "영성, 예술성",
        "lesson": "세상에 발을 딛고 하늘을 보라",
        "element": "water",
        "modality": "mutable",
        "keywords": ["초월", "연민", "상상", "영성", "합일"]
    }
}

HOUSE_MEANINGS = {
    1: {"domain": "자아와 정체성", "jung": "페르소나와 진정한 자아의 교차점", "stoic": "당신이 통제할 수 있는 핵심", "question": "나는 누구인가?", "life_area": "외모, 첫인상, 자기표현"},
    2: {"domain": "가치와 자원", "jung": "가치 있게 여기는 것이 나를 형성한다", "stoic": "물질에 대한 건강한 무관심", "question": "무엇이 가치있는가?", "life_area": "돈, 소유물, 자존감"},
    3: {"domain": "소통과 학습", "jung": "언어를 통한 의식화", "stoic": "말하기 전에 생각하라", "question": "어떻게 소통하는가?", "life_area": "형제, 이웃, 단기여행"},
    4: {"domain": "가정과 뿌리", "jung": "개인 무의식의 깊은 층", "stoic": "어디서 왔든 덕을 향해 나아가라", "question": "나의 뿌리는?", "life_area": "가족, 어머니, 내면의 기반"},
    5: {"domain": "창조와 기쁨", "jung": "내면의 아이, 창조적 자기표현", "stoic": "쾌락은 덕의 부산물이어야", "question": "무엇이 나를 살아있게 하는가?", "life_area": "자녀, 연애, 취미"},
    6: {"domain": "일상과 봉사", "jung": "반복을 통한 변환", "stoic": "매일의 작은 실천이 위대함을 만든다", "question": "어떻게 매일을 살 것인가?", "life_area": "건강, 직장, 일상루틴"},
    7: {"domain": "파트너십", "jung": "투사의 무대, 아니마/아니무스 발현", "stoic": "타인의 행동은 통제할 수 없다", "question": "타인에게서 무엇을 배우는가?", "life_area": "결혼, 계약, 열린 적"},
    8: {"domain": "변환과 심층", "jung": "그림자와의 직면, 죽음과 재탄생", "stoic": "메멘토 모리, 집착을 놓아라", "question": "무엇을 죽이고 살릴 것인가?", "life_area": "공유자원, 유산, 섹슈얼리티"},
    9: {"domain": "철학과 의미", "jung": "현자 원형, 집단무의식과의 연결", "stoic": "지혜를 사랑하라", "question": "삶의 의미는?", "life_area": "장거리여행, 고등교육, 종교"},
    10: {"domain": "커리어와 업적", "jung": "사회적 페르소나, 세상에서의 역할", "stoic": "명예는 덕의 그림자일 뿐", "question": "세상에 무엇을 남길 것인가?", "life_area": "직업, 명성, 아버지"},
    11: {"domain": "공동체와 희망", "jung": "집단과의 관계, 더 큰 전체", "stoic": "인류에 대한 봉사는 덕이다", "question": "어떤 미래를 꿈꾸는가?", "life_area": "친구, 그룹, 이상"},
    12: {"domain": "무의식과 초월", "jung": "집단무의식의 바다, 자기로의 귀환", "stoic": "고독 속에서 자신을 마주하라", "question": "숨겨진 나는 누구인가?", "life_area": "고립, 영성, 숨겨진 적"}
}

ARCHETYPE_MEANINGS = {
    "Hero": {"essence": "도전을 통한 성장", "light": "용기, 결단력", "shadow": "무모함, 구원자 콤플렉스", "integration": "진정한 영웅은 자신의 그림자를 먼저 정복한다", "keywords": ["여정", "시련", "승리", "변환"]},
    "Mother": {"essence": "양육과 보호", "light": "무조건적 사랑, 연민", "shadow": "질식시키는 사랑, 지배", "integration": "자유를 주는 사랑", "keywords": ["돌봄", "포옹", "생명", "보호"]},
    "Father": {"essence": "보호와 인도", "light": "지혜로운 인도, 구조 제공", "shadow": "권위주의, 감정 부재", "integration": "부드러움을 가진 강함", "keywords": ["권위", "질서", "보호", "가르침"]},
    "Wise Old Man": {"essence": "지혜와 안내", "light": "깊은 지혜, 인도", "shadow": "현학, 감정 회피", "integration": "머리와 가슴의 통합", "keywords": ["지혜", "멘토", "통찰", "인내"]},
    "Trickster": {"essence": "규칙 파괴, 변화 촉매", "light": "창의성, 유머", "shadow": "기만, 책임 회피", "integration": "지혜로운 장난", "keywords": ["유머", "변화", "경계", "창의"]},
    "Anima": {"essence": "남성 안의 여성성", "light": "감수성, 직관", "shadow": "변덕, 감정 조종", "integration": "여성적 지혜의 통합", "keywords": ["영혼", "직관", "관계", "창조"]},
    "Animus": {"essence": "여성 안의 남성성", "light": "논리, 결단력", "shadow": "무감각, 독단", "integration": "남성적 힘의 통합", "keywords": ["정신", "논리", "독립", "결단"]},
    "Shadow": {"essence": "억압된 자아", "light": "통합 시 막대한 에너지", "shadow": "투사, 자기혐오", "integration": "그림자를 포용할 때 진정한 힘", "keywords": ["어둠", "억압", "에너지", "거울"]},
    "Self": {"essence": "전체성, 진정한 나", "light": "균형, 온전함", "shadow": "팽창, 현실과 단절", "integration": "겸손한 전체성", "keywords": ["중심", "통합", "완성", "목표"]},
    "Persona": {"essence": "사회적 가면", "light": "적응력, 사회성", "shadow": "진정한 자아 상실", "integration": "가면과 자아의 균형", "keywords": ["가면", "역할", "적응", "외면"]},
    "Child": {"essence": "순수와 가능성", "light": "창조성, 기쁨", "shadow": "미성숙, 책임 회피", "integration": "성인 안의 살아있는 아이", "keywords": ["순수", "경이", "가능성", "놀이"]},
    "Maiden": {"essence": "새로운 시작", "light": "순수, 희망", "shadow": "순진함, 성장 거부", "integration": "경험을 통한 성숙", "keywords": ["처녀", "봄", "시작", "개방"]}
}

STOIC_VIRTUES = {
    "Wisdom": {"essence": "올바른 판단", "marcus": "명료하게 생각하라", "epictetus": "판단이 당신을 혼란스럽게 한다", "seneca": "예와 아니오를 올바른 순간에", "practice": "이것은 내 통제 안에 있는가?"},
    "Courage": {"essence": "두려움 속 올바른 행동", "marcus": "우주가 필요로 하는 일을 하라", "epictetus": "죽음이 두렵다면 아직 시작하지 않은 것", "seneca": "어려움이 성격을 만든다", "practice": "불편한 일을 매일 하나씩"},
    "Temperance": {"essence": "욕망의 조절", "marcus": "쾌락이 아닌 덕을 추구하라", "epictetus": "참된 부는 적게 원하는 것", "seneca": "멈출 줄 아는 것이 중요하다", "practice": "원하는 것과 필요한 것을 구분하라"},
    "Justice": {"essence": "타인에 대한 올바름", "marcus": "우리는 서로를 위해 태어났다", "epictetus": "당신의 업무에 집중하라", "seneca": "선행은 받는 것이 아니라 하는 것", "practice": "오늘 누군가를 위해 무엇을 할 수 있는가?"}
}

STOIC_PRACTICES = {
    "Memento Mori": {"essence": "죽음을 기억하라", "how": "매일 아침 '오늘이 마지막이라면?'", "benefit": "우선순위가 명확해진다"},
    "Amor Fati": {"essence": "운명을 사랑하라", "how": "역경에서 성장 기회를 찾아라", "benefit": "고통이 성장으로 변환"},
    "Premeditatio Malorum": {"essence": "역경을 미리 명상하라", "how": "아침에 어떤 어려움이 올지 생각하라", "benefit": "예상치 못한 일에 흔들리지 않음"},
    "Negative Visualization": {"essence": "상실을 상상하라", "how": "사랑하는 것을 잃은 상황을 상상하라", "benefit": "현재에 대한 감사"},
    "View from Above": {"essence": "높은 곳에서 보라", "how": "100년 후 이것이 중요할까?", "benefit": "객관적 판단"},
    "Dichotomy of Control": {"essence": "통제 가능/불가능을 구분하라", "how": "매 상황에서 통제 여부를 물어라", "benefit": "평정심"}
}

ASPECTS = ["conjunction", "opposition", "trine", "square", "sextile", "quincunx"]
ASPECT_MEANINGS = {
    "conjunction": {"korean": "합", "nature": "융합", "energy": "강력한 결합"},
    "opposition": {"korean": "충", "nature": "대립", "energy": "팽팽한 긴장"},
    "trine": {"korean": "삼합", "nature": "조화", "energy": "자연스러운 흐름"},
    "square": {"korean": "형", "nature": "도전", "energy": "성장을 강요하는 마찰"},
    "sextile": {"korean": "육합", "nature": "기회", "energy": "활용하면 열리는 문"},
    "quincunx": {"korean": "불합", "nature": "조정 필요", "energy": "의식적 통합 필요"}
}

WUXING = {
    "木": {"english": "Wood", "nature": "성장, 확장", "virtue": "인(仁)", "emotion": "분노/결단"},
    "火": {"english": "Fire", "nature": "열정, 변환", "virtue": "예(禮)", "emotion": "기쁨/조급"},
    "土": {"english": "Earth", "nature": "안정, 중심", "virtue": "신(信)", "emotion": "사려/걱정"},
    "金": {"english": "Metal", "nature": "결단, 정제", "virtue": "의(義)", "emotion": "슬픔/용기"},
    "水": {"english": "Water", "nature": "지혜, 흐름", "virtue": "지(智)", "emotion": "두려움/지혜"}
}

SIPSIN = {
    "比肩": {"nature": "동료, 자존심", "positive": "독립심, 자기주장", "negative": "고집, 경쟁심"},
    "劫財": {"nature": "경쟁, 추진력", "positive": "결단력, 행동력", "negative": "무모함, 손재"},
    "食神": {"nature": "표현, 즐거움", "positive": "창의성, 낙천성", "negative": "나태, 향락"},
    "傷官": {"nature": "재능, 반항", "positive": "예술성, 독창성", "negative": "비판, 불만"},
    "偏財": {"nature": "유동자산, 인맥", "positive": "사교성, 융통성", "negative": "낭비, 불안정"},
    "正財": {"nature": "안정재산, 성실", "positive": "근면, 신용", "negative": "인색, 소심"},
    "七殺": {"nature": "권력, 도전", "positive": "리더십, 결단력", "negative": "폭력성, 독선"},
    "正官": {"nature": "명예, 질서", "positive": "책임감, 정직", "negative": "경직, 억압"},
    "偏印": {"nature": "비정통지식, 영감", "positive": "통찰력, 창의력", "negative": "고독, 편견"},
    "正印": {"nature": "학문, 보호", "positive": "지혜, 인자함", "negative": "의존, 게으름"}
}

# =====================================================================
# 다양한 템플릿 (품질 유지를 위한 핵심)
# =====================================================================

JUNG_TEMPLATES = [
    # 깊이 있는 분석형
    lambda p, s, h, a: f"당신의 {p['korean']}({PLANET_MEANINGS[p['name']]['essence']})이 {s['korean']}({s['essence']})의 에너지와 함께 {h}하우스({HOUSE_MEANINGS[h]['domain']})에서 {a} 원형을 활성화합니다. {ARCHETYPE_MEANINGS[a]['essence']} - 이것이 당신 내면에서 울리는 원형적 테마입니다. Jung은 이 배치가 '{ARCHETYPE_MEANINGS[a]['light']}'의 잠재력과 '{ARCHETYPE_MEANINGS[a]['shadow']}'의 그림자를 동시에 품고 있다고 보았을 것입니다.",

    # 질문 중심형
    lambda p, s, h, a: f"{p['korean']}이 {s['korean']} 에너지로 {h}하우스에서 {a} 원형을 자극합니다. Jung이 당신에게 묻습니다: '{HOUSE_MEANINGS[h]['question']}' 그리고 {a} 원형은 덧붙입니다: '{ARCHETYPE_MEANINGS[a]['integration']}' {s['lesson']} - 이것이 {s['korean']}가 가르치는 교훈입니다.",

    # 그림자 작업 중심형
    lambda p, s, h, a: f"{h}하우스({HOUSE_MEANINGS[h]['life_area']})에서 {p['korean']}이 {a} 원형과 공명합니다. 빛의 측면: {ARCHETYPE_MEANINGS[a]['light']}. 그림자 측면: {ARCHETYPE_MEANINGS[a]['shadow']}. {s['korean']}의 성향({s['shadow']})이 그림자를 강화할 수 있으니 주의하세요. 통합의 길: {ARCHETYPE_MEANINGS[a]['integration']}.",

    # 실천 가이드형
    lambda p, s, h, a: f"무의식에서 {a} 원형이 {p['korean']}의 언어로, {s['korean']}의 스타일로 {h}하우스의 무대에서 연기합니다. '{HOUSE_MEANINGS[h]['jung']}' - 이 영역에서 당신의 과제는 {ARCHETYPE_MEANINGS[a]['keywords'][0]}과 {ARCHETYPE_MEANINGS[a]['keywords'][1]}을 통합하는 것입니다. {p['korean']}의 에너지({PLANET_MEANINGS[p['name']]['action']})를 의식적으로 활용하세요.",

    # 개성화 여정형
    lambda p, s, h, a: f"개성화(Individuation) 여정에서 {p['korean']}-{s['korean']}-{h}하우스-{a}의 조합은 중요한 이정표입니다. '{ARCHETYPE_MEANINGS[a]['essence']}'의 에너지가 '{HOUSE_MEANINGS[h]['domain']}' 영역에서 당신을 부릅니다. {s['light']}를 살리고 {s['shadow']}를 경계하세요. Jung: '그림자를 의식으로 가져올 때 우리는 더 온전해진다.'"
]

STOIC_TEMPLATES = [
    # Marcus Aurelius 스타일
    lambda v, p, h: f"Marcus Aurelius가 당신에게 말합니다: '{STOIC_VIRTUES[v]['marcus']}' {p['korean']}이 {h}하우스({HOUSE_MEANINGS[h]['domain']})에서 {v}(덕)을 요청합니다. {STOIC_VIRTUES[v]['essence']}를 이 영역에서 실천하세요. {HOUSE_MEANINGS[h]['stoic']} 실천법: {STOIC_VIRTUES[v]['practice']}",

    # Epictetus 스타일
    lambda v, p, h: f"Epictetus의 가르침: '{STOIC_VIRTUES[v]['epictetus']}' 당신의 {p['korean']}({PLANET_MEANINGS[p['name']]['essence']})이 {h}하우스에서 {v}를 배울 기회를 제공합니다. '{HOUSE_MEANINGS[h]['life_area']}' 영역에서 {STOIC_VIRTUES[v]['essence']}를 연습하세요. 핵심 질문: {HOUSE_MEANINGS[h]['question']}",

    # Seneca 스타일
    lambda v, p, h: f"Seneca가 편지를 씁니다: '{STOIC_VIRTUES[v]['seneca']}' {h}하우스({HOUSE_MEANINGS[h]['domain']})에서 {p['korean']}이 {v}(덕)의 훈련장을 만들었습니다. {p['korean']}의 그림자({PLANET_MEANINGS[p['name']]['shadow']})를 경계하고, 빛({PLANET_MEANINGS[p['name']]['light']})을 향해 나아가세요.",

    # 실천 중심형
    lambda v, p, h: f"{v}({STOIC_VIRTUES[v]['essence']})을 {h}하우스({HOUSE_MEANINGS[h]['life_area']})에서 실천하세요. {p['korean']}({PLANET_MEANINGS[p['name']]['action']})의 에너지를 활용하되, 스토아의 원칙을 기억하세요: {HOUSE_MEANINGS[h]['stoic']}. 오늘의 과제: {STOIC_VIRTUES[v]['practice']}",

    # 통제 이분법 중심형
    lambda v, p, h: f"{h}하우스에서 {p['korean']}이 {v}를 요청합니다. Epictetus: '우리 통제 하에 있는 것과 없는 것을 구분하라.' '{HOUSE_MEANINGS[h]['domain']}'에서 당신이 통제할 수 있는 것은 당신의 반응과 판단입니다. {STOIC_VIRTUES[v]['essence']}를 통해 내면의 평정을 찾으세요."
]

# =====================================================================
# 텍스트 생성 함수
# =====================================================================

def get_deterministic_template(items, seed_str):
    """일관된 템플릿 선택 (같은 조합은 항상 같은 템플릿)"""
    hash_val = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    return items[hash_val % len(items)]

def generate_jung_text(planet, sign, house, archetype):
    """Jung 해석 텍스트 생성"""
    p = {"name": planet, "korean": PLANET_MEANINGS[planet]["korean"]}
    s = SIGN_MEANINGS[sign]
    a = archetype

    seed = f"{planet}-{sign}-{house}-{archetype}"
    template = get_deterministic_template(JUNG_TEMPLATES, seed)
    return template(p, s, house, a)

def generate_stoic_text(virtue, planet, house):
    """Stoic 해석 텍스트 생성"""
    p = {"name": planet, "korean": PLANET_MEANINGS[planet]["korean"]}

    seed = f"{virtue}-{planet}-{house}"
    template = get_deterministic_template(STOIC_TEMPLATES, seed)
    return template(virtue, p, house)

def generate_shadow_text(planet1, planet2, aspect):
    """그림자 작업 텍스트 생성"""
    p1, p2 = PLANET_MEANINGS[planet1], PLANET_MEANINGS[planet2]
    asp = ASPECT_MEANINGS[aspect]

    if aspect in ["opposition", "square"]:
        return (f"{planet1}({p1['essence']})과 {planet2}({p2['essence']})의 {asp['korean']}({aspect})이 "
                f"그림자 작업을 요청합니다. {asp['energy']}의 긴장이 느껴집니다. "
                f"{p1['shadow']}와 {p2['shadow']}가 서로를 자극합니다. "
                f"Jung: '그림자와의 대면이 개성화의 핵심이다.' 이 에너지를 억압하지 말고 통합하세요.")
    else:
        return (f"{planet1}({p1['essence']})과 {planet2}({p2['essence']})가 {asp['korean']}({aspect})으로 "
                f"연결됩니다. {asp['energy']}. {p1['light']}과 {p2['light']}이 조화를 이룰 수 있습니다. "
                f"이 에너지를 의식적으로 활용하면 성장의 기회가 됩니다.")

def generate_cross_culture_text(archetype_or_virtue, eastern_element, eastern_type):
    """동서양 융합 텍스트 생성"""
    if eastern_type == "wuxing":
        wx = WUXING[eastern_element]
        return (f"{archetype_or_virtue} 원형이 {eastern_element}({wx['english']}) 오행과 만났습니다. "
                f"동양의 {wx['nature']}과 서양의 '{ARCHETYPE_MEANINGS[archetype_or_virtue]['essence']}'이 공명합니다. "
                f"{eastern_element}의 덕({wx['virtue']})을 통해 {archetype_or_virtue}를 표현하세요.")
    else:  # sipsin
        ss = SIPSIN[eastern_element]
        return (f"사주의 {eastern_element}과 {archetype_or_virtue} 원형이 만났습니다. "
                f"{ss['nature']}의 에너지가 '{ARCHETYPE_MEANINGS[archetype_or_virtue]['essence']}'와 결합합니다. "
                f"긍정적 측면({ss['positive']})을 살리고 부정적 측면({ss['negative']})을 경계하세요.")

def generate_stoic_practice_text(practice, house):
    """스토아 실천법 텍스트 생성"""
    pr = STOIC_PRACTICES[practice]
    h = HOUSE_MEANINGS[house]
    return (f"'{practice}' 실천을 {house}하우스({h['domain']})에 적용하세요. "
            f"{pr['essence']}. 방법: {pr['how']}. "
            f"이 영역({h['life_area']})에서 {h['stoic']}. 효과: {pr['benefit']}.")

# =====================================================================
# 대량 룰 생성 (V1 수량 + V2 품질)
# =====================================================================

def generate_jung_rules_v3():
    """Jung 룰 대량 생성 (고품질)"""
    rules = {
        "meta": {
            "persona": "The Analyst (분석관)",
            "philosophy": "Carl Jung - Analytical Psychology",
            "tone": "깊이 있는 심리 분석, 원형과 무의식 탐구, 문학적 통찰",
            "generated": "auto_v3_quality_quantity",
            "count": 0
        }
    }

    rule_id = 1
    planets = list(PLANET_MEANINGS.keys())
    signs = list(SIGN_MEANINGS.keys())
    houses = list(HOUSE_MEANINGS.keys())
    archetypes = list(ARCHETYPE_MEANINGS.keys())

    # 1. 행성 × 사인 × 하우스 × 원형 (전체 조합)
    print("[Jung V3] 행성-사인-하우스-원형 조합 생성 중...")
    for planet, sign, house, archetype in product(planets, signs, houses, archetypes):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [planet.lower(), sign.lower(), f"house {house}", archetype.lower()],
            "text": generate_jung_text(planet, sign, house, archetype),
            "weight": 4,
            "archetype": archetype,
            "planet": planet,
            "sign": sign,
            "house": house
        }
        rule_id += 1

    # 2. 그림자 작업 (행성 측면)
    print("[Jung V3] 그림자 작업 해석 생성 중...")
    for planet1, planet2, aspect in product(planets, planets, ASPECTS):
        if planet1 >= planet2:
            continue
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [planet1.lower(), planet2.lower(), aspect],
            "text": generate_shadow_text(planet1, planet2, aspect),
            "weight": 5 if aspect in ["opposition", "square"] else 3,
            "process": "Shadow Work"
        }
        rule_id += 1

    # 3. 원형 × 오행 융합
    print("[Jung V3] 원형-오행 융합 해석 생성 중...")
    for archetype, wuxing in product(archetypes, WUXING.keys()):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [archetype.lower(), wuxing, WUXING[wuxing]["english"].lower()],
            "text": generate_cross_culture_text(archetype, wuxing, "wuxing"),
            "weight": 4,
            "cross_culture": True
        }
        rule_id += 1

    # 4. 원형 × 십신 융합
    print("[Jung V3] 원형-십신 융합 해석 생성 중...")
    for archetype, sipsin in product(archetypes, SIPSIN.keys()):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [archetype.lower(), sipsin],
            "text": generate_cross_culture_text(archetype, sipsin, "sipsin"),
            "weight": 4,
            "cross_culture": True
        }
        rule_id += 1

    rules["meta"]["count"] = rule_id - 1
    print(f"[Jung V3] 총 {rule_id - 1}개 룰 생성 완료!")
    return rules


def generate_stoic_rules_v3():
    """Stoic 룰 대량 생성 (고품질)"""
    rules = {
        "meta": {
            "persona": "The Strategist (전략가)",
            "philosophy": "Stoicism - Marcus Aurelius, Epictetus, Seneca",
            "tone": "실용적 지혜, 고전 인용, 일상 실천 가이드",
            "generated": "auto_v3_quality_quantity",
            "count": 0
        }
    }

    rule_id = 1
    planets = list(PLANET_MEANINGS.keys())
    houses = list(HOUSE_MEANINGS.keys())
    virtues = list(STOIC_VIRTUES.keys())
    practices = list(STOIC_PRACTICES.keys())

    # 1. 덕목 × 행성 × 하우스
    print("[Stoic V3] 덕목-행성-하우스 해석 생성 중...")
    for virtue, planet, house in product(virtues, planets, houses):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [virtue.lower(), planet.lower(), f"house {house}"],
            "text": generate_stoic_text(virtue, planet, house),
            "weight": 4,
            "virtue": virtue,
            "planet": planet,
            "house": house
        }
        rule_id += 1

    # 2. 실천법 × 하우스
    print("[Stoic V3] 실천법-하우스 해석 생성 중...")
    for practice, house in product(practices, houses):
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [practice.lower().replace(" ", "_"), f"house {house}"],
            "text": generate_stoic_practice_text(practice, house),
            "weight": 4,
            "practice": practice,
            "house": house
        }
        rule_id += 1

    # 3. 통제 이분법 상세
    print("[Stoic V3] 통제 이분법 해석 생성 중...")
    controllable_houses = {1, 3, 5, 6}
    for planet, house in product(planets, houses):
        p = PLANET_MEANINGS[planet]
        h = HOUSE_MEANINGS[house]
        is_controllable = house in controllable_houses

        key = f"rule_{rule_id}"
        if is_controllable:
            text = (f"{p['korean']}이 {house}하우스에서 당신의 통제 영역을 밝힙니다. "
                    f"Epictetus: '우리 의견, 욕구, 행동만이 우리 통제 하에 있다.' "
                    f"'{h['domain']}' 영역에서 {p['action']}하세요 - 이것은 당신 손에 달려 있습니다.")
        else:
            text = (f"{p['korean']}이 {house}하우스에서 통제 불가능한 영역의 영향을 보여줍니다. "
                    f"'{h['domain']}'의 결과는 당신 통제 밖입니다. "
                    f"Marcus Aurelius: '방해물이 곧 길이다.' 결과가 아니라 반응에 집중하세요.")

        rules[key] = {
            "when": ["dichotomy_of_control", planet.lower(), f"house {house}"],
            "text": text,
            "weight": 5,
            "controllable": is_controllable
        }
        rule_id += 1

    # 4. 덕목 × 오행 융합
    print("[Stoic V3] 덕목-오행 융합 해석 생성 중...")
    for virtue, wuxing in product(virtues, WUXING.keys()):
        wx = WUXING[wuxing]
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [virtue.lower(), wuxing, wx["english"].lower()],
            "text": (f"{virtue}(덕)이 {wuxing}({wx['english']}) 오행과 만났습니다. "
                    f"동양의 {wx['virtue']}과 서양의 '{STOIC_VIRTUES[virtue]['essence']}'이 공명합니다. "
                    f"{wx['nature']}의 에너지를 {virtue} 실천에 활용하세요."),
            "weight": 4,
            "cross_culture": True
        }
        rule_id += 1

    # 5. 덕목 × 십신 융합
    print("[Stoic V3] 덕목-십신 융합 해석 생성 중...")
    for virtue, sipsin in product(virtues, SIPSIN.keys()):
        ss = SIPSIN[sipsin]
        key = f"rule_{rule_id}"
        rules[key] = {
            "when": [virtue.lower(), sipsin],
            "text": (f"사주의 {sipsin}이 스토아의 {virtue}와 만났습니다. "
                    f"{ss['nature']}의 에너지를 '{STOIC_VIRTUES[virtue]['essence']}'로 승화시키세요. "
                    f"{ss['positive']}를 살리고, {ss['negative']}를 경계하며 덕을 실천하세요."),
            "weight": 4,
            "cross_culture": True
        }
        rule_id += 1

    rules["meta"]["count"] = rule_id - 1
    print(f"[Stoic V3] 총 {rule_id - 1}개 룰 생성 완료!")
    return rules


def generate_nodes_v3():
    """노드 생성"""
    jung_nodes = []
    stoic_nodes = []

    # Jung 노드
    for archetype in ARCHETYPE_MEANINGS.keys():
        for variant in ["positive", "negative", "integrated"]:
            jung_nodes.append({
                "id": f"{archetype.lower().replace(' ', '_')}_{variant}",
                "label": f"{archetype} ({variant})",
                "name": f"{archetype} - {variant.capitalize()}",
                "desc": f"{archetype} 원형의 {variant} 측면",
                "category": "jung_archetype",
                "element": "air"
            })

    # Stoic 노드
    for virtue in STOIC_VIRTUES.keys():
        for planet in PLANET_MEANINGS.keys():
            stoic_nodes.append({
                "id": f"{virtue.lower()}_{planet.lower()}",
                "label": f"{virtue} through {planet}",
                "name": f"{virtue} - {PLANET_MEANINGS[planet]['korean']}",
                "desc": f"{PLANET_MEANINGS[planet]['korean']}을 통해 실천하는 {virtue}",
                "category": "stoic_virtue",
                "element": "earth"
            })

    return jung_nodes, stoic_nodes


# =====================================================================
# 메인 실행
# =====================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Persona Data Generator V3 - 수량 + 품질 결합")
    print("=" * 70)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    rules_dir = os.path.join(script_dir, "..", "rules", "persona")
    nodes_dir = os.path.join(script_dir, "nodes")

    os.makedirs(rules_dir, exist_ok=True)
    os.makedirs(nodes_dir, exist_ok=True)

    # 데이터 생성
    print("\n" + "=" * 70)
    print("[JUNG V3] 고품질 대량 데이터 생성 중...")
    print("=" * 70)
    jung_rules = generate_jung_rules_v3()

    print("\n" + "=" * 70)
    print("[STOIC V3] 고품질 대량 데이터 생성 중...")
    print("=" * 70)
    stoic_rules = generate_stoic_rules_v3()

    print("\n[NODES] 노드 생성 중...")
    jung_nodes, stoic_nodes = generate_nodes_v3()

    # 파일 저장
    print("\n" + "=" * 70)
    print("[SAVE] 파일 저장 중...")
    print("=" * 70)

    def save_json(data, filename):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 저장 완료: {filename}")

    def save_csv(data, filename):
        if not data:
            return
        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        print(f"✅ 저장 완료: {filename}")

    save_json(jung_rules, os.path.join(rules_dir, "analyst_jung_v3.json"))
    save_json(stoic_rules, os.path.join(rules_dir, "strategist_stoic_v3.json"))
    save_csv(jung_nodes, os.path.join(nodes_dir, "nodes_persona_jung_v3.csv"))
    save_csv(stoic_nodes, os.path.join(nodes_dir, "nodes_persona_stoic_v3.csv"))

    # 통계
    print("\n" + "=" * 70)
    print("[STATS] 생성 통계")
    print("=" * 70)
    print(f"Jung V3 Rules:   {jung_rules['meta']['count']:,}개")
    print(f"Stoic V3 Rules:  {stoic_rules['meta']['count']:,}개")
    print(f"Jung Nodes:      {len(jung_nodes):,}개")
    print(f"Stoic Nodes:     {len(stoic_nodes):,}개")
    print("-" * 70)
    total = jung_rules['meta']['count'] + stoic_rules['meta']['count'] + len(jung_nodes) + len(stoic_nodes)
    print(f"총 데이터:       {total:,}개")
    print("=" * 70)
    print("[OK] V3 고품질 대량 데이터 생성 완료!")

    # 샘플 출력
    print("\n" + "=" * 70)
    print("[SAMPLE] Jung V3 해석 샘플들")
    print("=" * 70)
    for i in range(1, 4):
        print(f"\n--- Rule {i} ---")
        print(jung_rules[f"rule_{i}"]["text"])

    print("\n" + "=" * 70)
    print("[SAMPLE] Stoic V3 해석 샘플들")
    print("=" * 70)
    for i in range(1, 4):
        print(f"\n--- Rule {i} ---")
        print(stoic_rules[f"rule_{i}"]["text"])
