#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Persona Data Generator V2 - 고품질 문학적 버전
Jung & Stoic with rich, expert-level interpretations
"""

import json
import csv
import os
import sys
import random
from itertools import product

# Windows 인코딩 문제 해결
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# =====================================================================
# 풍부한 의미 사전 (각 요소의 고유한 의미)
# =====================================================================

PLANET_MEANINGS = {
    "Sun": {
        "essence": "핵심 정체성, 생명력, 의식적 자아",
        "jung": "의식의 중심, 에고의 빛, 자기(Self)를 향한 여정의 출발점",
        "stoic": "이성의 불꽃, 내면의 태양, 덕의 원천",
        "shadow": "과대망상, 자기중심적 맹목, 빛의 그림자",
        "action": "빛나다, 이끌다, 창조하다"
    },
    "Moon": {
        "essence": "감정, 무의식, 내면의 욕구, 본능",
        "jung": "무의식의 바다, 아니마/아니무스의 거울, 꿈의 문지기",
        "stoic": "변덕스러운 것에 대한 관조, 감정의 파도를 관찰하라",
        "shadow": "감정적 폭풍, 과거에 대한 집착, 유아적 의존",
        "action": "느끼다, 반응하다, 보살피다"
    },
    "Mercury": {
        "essence": "사고, 소통, 분석, 연결",
        "jung": "헤르메스 원형, 의식과 무의식을 오가는 메신저",
        "stoic": "이성적 분별력, 로고스의 도구, 진리를 향한 탐구",
        "shadow": "과잉 분석, 피상적 지식, 속임수의 유혹",
        "action": "분석하다, 전달하다, 연결하다"
    },
    "Venus": {
        "essence": "사랑, 아름다움, 가치, 조화",
        "jung": "아니마의 매혹적 측면, 관계를 통한 자기 발견",
        "stoic": "외적 아름다움에 현혹되지 말라, 내적 덕의 아름다움",
        "shadow": "탐닉, 허영, 소유욕으로 변질된 사랑",
        "action": "사랑하다, 조화를 이루다, 창조하다"
    },
    "Mars": {
        "essence": "행동, 의지, 욕망, 투쟁",
        "jung": "그림자의 공격적 에너지, 통합되어야 할 전사",
        "stoic": "용기(Courage)의 원천, 두려움 속에서도 올바르게 행동하라",
        "shadow": "맹목적 분노, 파괴적 충동, 무모한 공격성",
        "action": "행동하다, 싸우다, 추진하다"
    },
    "Jupiter": {
        "essence": "확장, 성장, 지혜, 행운",
        "jung": "현자(Wise Old Man) 원형의 관대함, 의미에 대한 추구",
        "stoic": "과욕을 경계하라, 진정한 풍요는 만족에 있다",
        "shadow": "과잉 낙관, 방탕, 자만심",
        "action": "확장하다, 가르치다, 축복하다"
    },
    "Saturn": {
        "essence": "제한, 책임, 시간, 구조",
        "jung": "노인/아버지 원형, 개성화의 시련, 성숙을 위한 관문",
        "stoic": "메멘토 모리(Memento Mori), 한계 속 자유, 의무의 숭고함",
        "shadow": "경직, 냉소, 과도한 자기비판",
        "action": "제한하다, 가르치다, 성숙시키다"
    },
    "Uranus": {
        "essence": "혁신, 자유, 통찰, 깨달음",
        "jung": "집단무의식에서 튀어나온 번갯불, 갑작스러운 깨달음",
        "stoic": "운명의 예측불가성을 받아들이라, 유연함이 지혜다",
        "shadow": "혼란을 위한 혼란, 무질서한 반항",
        "action": "깨뜨리다, 혁신하다, 깨어나다"
    },
    "Neptune": {
        "essence": "초월, 환상, 영성, 연민",
        "jung": "집단무의식의 바다, 신비로운 합일 경험",
        "stoic": "환상에 빠지지 말라, 그러나 연민은 덕이다",
        "shadow": "자기기만, 현실도피, 중독",
        "action": "초월하다, 녹아들다, 상상하다"
    },
    "Pluto": {
        "essence": "변환, 죽음과 재탄생, 심층 심리, 권력",
        "jung": "그림자의 심연, 죽음을 통한 재탄생, 가장 깊은 변환",
        "stoic": "메멘토 모리의 심화, 변화를 두려워하지 말라",
        "shadow": "집착, 조종, 파괴적 권력욕",
        "action": "변환하다, 재탄생하다, 파헤치다"
    }
}

SIGN_MEANINGS = {
    "Aries": {
        "essence": "시작, 용기, 주도성, 본능적 행동",
        "energy": "불의 첫 번째 불꽃, 탄생의 충동",
        "shadow": "성급함, 자기중심성, 충동적 공격",
        "lesson": "용기와 무모함의 차이를 배우라"
    },
    "Taurus": {
        "essence": "안정, 감각, 가치, 인내",
        "energy": "땅의 풍요, 굳건한 뿌리",
        "shadow": "완고함, 물질주의, 변화에 대한 저항",
        "lesson": "진정한 가치는 소유가 아닌 존재에 있다"
    },
    "Gemini": {
        "essence": "소통, 다양성, 호기심, 연결",
        "energy": "바람의 가벼움, 무한한 연결의 그물망",
        "shadow": "피상성, 집중력 부족, 이중성",
        "lesson": "깊이와 넓이의 균형을 찾아라"
    },
    "Cancer": {
        "essence": "보호, 양육, 감정, 뿌리",
        "energy": "물의 품, 어머니의 포옹",
        "shadow": "과잉보호, 과거 집착, 감정적 조종",
        "lesson": "진정한 돌봄은 상대를 자유롭게 한다"
    },
    "Leo": {
        "essence": "창조, 표현, 자신감, 관대함",
        "energy": "불의 심장, 왕의 위엄",
        "shadow": "오만, 관심 갈망, 지배욕",
        "lesson": "진정한 왕은 섬기는 자다"
    },
    "Virgo": {
        "essence": "분석, 봉사, 완벽, 치유",
        "energy": "땅의 정교함, 장인의 손길",
        "shadow": "비판주의, 강박적 완벽주의, 자기비하",
        "lesson": "불완전함 속에서 온전함을 보라"
    },
    "Libra": {
        "essence": "균형, 관계, 조화, 정의",
        "energy": "바람의 균형, 저울의 지혜",
        "shadow": "우유부단, 갈등회피, 타인의존",
        "lesson": "자신 안에서 먼저 균형을 찾아라"
    },
    "Scorpio": {
        "essence": "변환, 심층, 강렬, 재탄생",
        "energy": "물의 심연, 죽음과 부활의 신비",
        "shadow": "집착, 복수심, 조종욕",
        "lesson": "손에서 놓을 때 진정한 힘이 온다"
    },
    "Sagittarius": {
        "essence": "탐험, 지혜, 자유, 의미 추구",
        "energy": "불의 화살, 수평선 너머를 향한 갈망",
        "shadow": "무책임, 과장, 독선",
        "lesson": "지혜는 겸손에서 시작된다"
    },
    "Capricorn": {
        "essence": "성취, 책임, 구조, 권위",
        "energy": "땅의 정상, 산을 오르는 염소",
        "shadow": "냉혹함, 야망에 대한 집착, 감정 억압",
        "lesson": "정상에서도 겸손을 잃지 말라"
    },
    "Aquarius": {
        "essence": "혁신, 인류애, 독창성, 미래",
        "energy": "바람의 번갯불, 시대를 앞서가는 비전",
        "shadow": "냉담, 고립, 비인간적 이상주의",
        "lesson": "인류를 사랑하되 개인도 보라"
    },
    "Pisces": {
        "essence": "초월, 연민, 상상, 합일",
        "energy": "물의 바다, 경계 없는 영혼",
        "shadow": "현실도피, 순교자 콤플렉스, 자기희생",
        "lesson": "세상에 발을 딛고 하늘을 보라"
    }
}

HOUSE_MEANINGS = {
    1: {
        "domain": "자아, 정체성, 외모, 첫인상",
        "jung": "페르소나(가면)와 진정한 자아의 교차점",
        "stoic": "당신이 통제할 수 있는 핵심 영역",
        "question": "나는 누구인가?"
    },
    2: {
        "domain": "가치, 재산, 자원, 자존감",
        "jung": "내가 가치있게 여기는 것이 나를 형성한다",
        "stoic": "물질에 대한 건강한 무관심을 배우라",
        "question": "무엇이 진정 가치있는가?"
    },
    3: {
        "domain": "소통, 학습, 형제자매, 가까운 환경",
        "jung": "언어를 통한 의식화 과정",
        "stoic": "말하기 전에 생각하라",
        "question": "어떻게 세상과 소통하는가?"
    },
    4: {
        "domain": "가정, 뿌리, 내면의 기반, 어머니",
        "jung": "개인 무의식의 가장 깊은 층, 가족 콤플렉스",
        "stoic": "어디에서 왔든 덕을 향해 나아갈 수 있다",
        "question": "나의 뿌리는 무엇인가?"
    },
    5: {
        "domain": "창조, 자녀, 연애, 기쁨",
        "jung": "내면의 아이, 창조적 자기표현",
        "stoic": "쾌락은 덕의 부산물이어야 한다",
        "question": "무엇이 나를 살아있게 하는가?"
    },
    6: {
        "domain": "일상, 건강, 봉사, 의무",
        "jung": "반복을 통한 변환, 몸과 마음의 연결",
        "stoic": "매일의 작은 실천이 위대함을 만든다",
        "question": "어떻게 매일을 살 것인가?"
    },
    7: {
        "domain": "파트너십, 결혼, 타자, 열린 적",
        "jung": "투사(Projection)의 무대, 아니마/아니무스의 발현",
        "stoic": "타인의 행동은 통제할 수 없다",
        "question": "타인을 통해 무엇을 배우는가?"
    },
    8: {
        "domain": "변환, 공유자원, 죽음, 섹슈얼리티",
        "jung": "그림자와의 직면, 죽음과 재탄생의 과정",
        "stoic": "메멘토 모리, 집착을 놓아라",
        "question": "무엇을 죽이고 무엇을 되살릴 것인가?"
    },
    9: {
        "domain": "철학, 여행, 고등교육, 의미",
        "jung": "현자 원형, 집단무의식과의 연결",
        "stoic": "지혜를 사랑하라(Philo-sophia)",
        "question": "삶의 의미는 무엇인가?"
    },
    10: {
        "domain": "커리어, 공적 이미지, 업적, 아버지",
        "jung": "사회적 페르소나, 세상에서의 역할",
        "stoic": "명예는 덕의 그림자일 뿐",
        "question": "세상에 무엇을 남길 것인가?"
    },
    11: {
        "domain": "친구, 커뮤니티, 희망, 미래 비전",
        "jung": "집단과의 관계, 더 큰 전체의 일부",
        "stoic": "인류에 대한 봉사는 덕이다",
        "question": "어떤 미래를 꿈꾸는가?"
    },
    12: {
        "domain": "무의식, 고립, 초월, 숨겨진 적",
        "jung": "집단무의식의 바다, 자기(Self)로의 귀환",
        "stoic": "고독 속에서 자신을 마주하라",
        "question": "숨겨진 나는 누구인가?"
    }
}

ARCHETYPE_MEANINGS = {
    "Hero": {
        "essence": "도전을 통한 성장, 괴물을 물리치고 보물을 얻는 자",
        "light": "용기, 결단력, 희생정신, 성취",
        "shadow": "무모함, 구원자 콤플렉스, 패배에 대한 두려움",
        "integration": "진정한 영웅은 자신의 그림자를 먼저 정복한다",
        "quotes": ["영웅의 여정은 자기 자신으로의 귀환이다 - Jung"]
    },
    "Mother": {
        "essence": "양육과 보호, 생명을 주고 기르는 자",
        "light": "무조건적 사랑, 연민, 보살핌, 풍요",
        "shadow": "질식시키는 사랑, 지배, 의존 조장",
        "integration": "자유를 주는 사랑, 분리를 허용하는 돌봄",
        "quotes": ["어머니 원형은 모든 양육적 힘의 근원이다 - Jung"]
    },
    "Father": {
        "essence": "보호와 인도, 법과 질서, 권위",
        "light": "지혜로운 인도, 보호, 구조 제공, 가르침",
        "shadow": "권위주의, 엄격함, 감정 부재, 지배",
        "integration": "부드러움을 가진 강함, 자율성을 키우는 권위",
        "quotes": ["아버지는 세상으로 나가는 길을 보여준다 - Jung"]
    },
    "Wise Old Man": {
        "essence": "지혜와 통찰, 안내자와 멘토",
        "light": "깊은 지혜, 인도, 초월적 관점, 인내",
        "shadow": "현학적 태도, 감정 회피, 독선",
        "integration": "머리와 가슴의 통합, 살아있는 지혜",
        "quotes": ["현자는 답을 주지 않고 질문을 던진다 - Jung"]
    },
    "Trickster": {
        "essence": "규칙 파괴, 변화의 촉매, 경계를 넘는 자",
        "light": "창의성, 유머, 유연성, 변화 촉진",
        "shadow": "기만, 혼란 조장, 책임 회피",
        "integration": "지혜로운 장난, 건강한 규범 도전",
        "quotes": ["트릭스터는 새로운 가능성의 문을 연다 - Jung"]
    },
    "Anima": {
        "essence": "남성 안의 여성적 측면, 영혼의 안내자",
        "light": "감수성, 직관, 관계성, 창조성",
        "shadow": "변덕, 나약함, 감정적 조종",
        "integration": "여성적 지혜의 통합, 온전한 인격",
        "quotes": ["아니마는 무의식으로 향하는 길의 안내자다 - Jung"]
    },
    "Animus": {
        "essence": "여성 안의 남성적 측면, 정신의 안내자",
        "light": "논리, 자기주장, 독립성, 결단력",
        "shadow": "무감각, 공격성, 독단",
        "integration": "남성적 힘의 통합, 온전한 인격",
        "quotes": ["아니무스는 의미와 정신을 향한 교량이다 - Jung"]
    },
    "Shadow": {
        "essence": "억압된 자아, 빛의 이면, 숨겨진 힘",
        "light": "통합 시 막대한 에너지와 창조성의 원천",
        "shadow": "투사, 자기혐오, 타인에 대한 적대",
        "integration": "그림자를 인정하고 포용할 때 진정한 힘이 온다",
        "quotes": ["그림자는 금광이다, 두려워 말고 파내라 - Jung"]
    },
    "Self": {
        "essence": "전체성, 의식과 무의식의 통합, 진정한 나",
        "light": "균형, 온전함, 내적 평화, 자기실현",
        "shadow": "팽창(inflation), 신격화, 현실과의 단절",
        "integration": "개성화의 완성, 겸손한 전체성",
        "quotes": ["자기(Self)는 심리적 삶의 목표이자 중심이다 - Jung"]
    },
    "Persona": {
        "essence": "사회적 가면, 외부 세계와의 인터페이스",
        "light": "적응력, 사회성, 역할 수행 능력",
        "shadow": "진정한 자아의 상실, 가면에 동일시",
        "integration": "가면과 진정한 자아 사이의 균형",
        "quotes": ["페르소나는 필요하지만 전부가 아니다 - Jung"]
    },
    "Child": {
        "essence": "순수, 가능성, 새로운 시작, 경이로움",
        "light": "창조성, 호기심, 기쁨, 무한한 잠재력",
        "shadow": "미성숙, 의존, 책임 회피",
        "integration": "성인 안의 살아있는 아이, 지혜로운 순수",
        "quotes": ["내면의 아이는 미래 자기(Self)의 씨앗이다 - Jung"]
    },
    "Maiden": {
        "essence": "순수, 새로운 시작, 여성적 잠재력",
        "light": "순수, 희망, 새로운 가능성, 개방성",
        "shadow": "순진함, 희생자 역할, 성장 거부",
        "integration": "경험을 통한 성숙, 지혜를 가진 순수",
        "quotes": ["처녀 원형은 새로운 탄생의 약속이다 - Jung"]
    }
}

STOIC_VIRTUE_MEANINGS = {
    "Wisdom": {
        "essence": "올바른 판단, 진리 추구, 현실 직시",
        "marcus": "명료하게 생각하라. 일어난 일을 있는 그대로 보라.",
        "epictetus": "당신을 혼란스럽게 하는 것은 사건 자체가 아니라 그에 대한 판단이다.",
        "seneca": "지혜란 '예'와 '아니오'를 올바른 순간에 말하는 것이다.",
        "practice": "매 상황에서 '이것은 내 통제 안에 있는가?'를 먼저 물어라"
    },
    "Courage": {
        "essence": "두려움 속에서 올바르게 행동함, 진정한 용기",
        "marcus": "우주가 필요로 하는 일을 하라, 두려움에도 불구하고.",
        "epictetus": "죽음이 두렵다면 아직 철학을 시작하지 않은 것이다.",
        "seneca": "어려움은 성격을 드러내지 않는다. 성격을 만든다.",
        "practice": "불편한 일을 매일 하나씩 하라"
    },
    "Temperance": {
        "essence": "욕망의 조절, 균형, 자기 통제",
        "marcus": "쾌락을 추구하지 말고 덕을 추구하라.",
        "epictetus": "참된 부는 적게 원하는 것이다.",
        "seneca": "멈출 줄 아는 것이 시작하는 것만큼 중요하다.",
        "practice": "당신이 '원하는' 것과 '필요한' 것을 구분하라"
    },
    "Justice": {
        "essence": "타인에 대한 올바름, 공정함, 봉사",
        "marcus": "우리는 서로를 위해 태어났다. 협력하거나 갈등하거나.",
        "epictetus": "남의 업무에 신경 쓰지 말고 당신의 업무에 집중하라.",
        "seneca": "선행은 받는 것이 아니라 하는 것이다.",
        "practice": "오늘 누군가를 위해 무엇을 할 수 있는가?"
    }
}

STOIC_PRACTICE_MEANINGS = {
    "Memento Mori": {
        "essence": "죽음을 기억하라, 시간의 유한성",
        "how": "매일 아침 '오늘이 마지막 날이라면?'이라고 물어라",
        "benefit": "삶의 우선순위가 명확해지고, 사소한 것에 시간을 낭비하지 않게 된다"
    },
    "Amor Fati": {
        "essence": "운명을 사랑하라, 일어나는 모든 일을 받아들여라",
        "how": "역경이 닥쳤을 때 '이것이 나를 어떻게 성장시킬 수 있는가?'를 물어라",
        "benefit": "고통이 성장의 기회로 변환된다"
    },
    "Premeditatio Malorum": {
        "essence": "역경을 미리 명상하라, 최악에 대비하라",
        "how": "아침에 '오늘 어떤 어려움이 올 수 있는가?'를 생각하라",
        "benefit": "예상치 못한 일에 흔들리지 않게 된다"
    },
    "Negative Visualization": {
        "essence": "상실을 상상하라, 감사가 깊어진다",
        "how": "사랑하는 것을 잃은 상황을 잠시 상상하라",
        "benefit": "현재의 축복에 대한 감사가 깊어진다"
    },
    "View from Above": {
        "essence": "높은 곳에서 보라, 우주적 관점을 가져라",
        "how": "문제를 우주의 관점에서 보라 - 100년 후 이것이 중요할까?",
        "benefit": "감정적 거리가 생기고 객관적 판단이 가능해진다"
    },
    "Dichotomy of Control": {
        "essence": "통제 가능한 것과 불가능한 것을 구분하라",
        "how": "매 상황에서 '이것은 내 통제 안에 있는가?'를 물어라",
        "benefit": "에너지가 효율적으로 사용되고 평정심이 생긴다"
    }
}

# =====================================================================
# 풍부한 텍스트 생성 함수
# =====================================================================

def generate_rich_jung_text(planet, sign, house, archetype):
    """풍부한 Jung 해석 생성"""
    p = PLANET_MEANINGS[planet]
    s = SIGN_MEANINGS[sign]
    h = HOUSE_MEANINGS[house]
    a = ARCHETYPE_MEANINGS[archetype]

    templates = [
        f"당신의 {planet}이 {sign}자리 {house}하우스에서 {archetype} 원형과 공명합니다. "
        f"{p['jung']}의 에너지가 {s['energy']}와 만나, {h['domain']} 영역에서 '{a['essence']}'의 주제를 불러일으킵니다. "
        f"Jung은 이 배치가 '{a['light']}'의 잠재력과 '{a['shadow']}'의 도전을 동시에 품고 있다고 보았을 것입니다. "
        f"핵심 질문: {h['question']} 그리고 {archetype}는 당신에게 묻습니다 - '{a['integration']}'",

        f"{planet}({p['essence']})이 {sign}({s['essence']})의 옷을 입고 {house}하우스('{h['domain']}')에서 {archetype} 원형을 활성화합니다. "
        f"{a['quotes'][0]} 이 배치에서 당신의 과제는 {a['light']}를 살리면서 {a['shadow']}의 함정을 피하는 것입니다. "
        f"{s['lesson']} 이것이 당신의 개성화(Individuation) 여정의 핵심 주제입니다.",

        f"무의식의 깊은 곳에서 {archetype}가 {planet}의 언어로, {sign}의 스타일로 {house}하우스의 무대에서 자신을 드러내고 있습니다. "
        f"'{h['jung']}' - 이것이 당신의 심리적 지형입니다. {a['essence']} - 이것이 그 지형에서 작동하는 원형적 힘입니다. "
        f"그림자 측면({a['shadow']})을 인식하고 빛의 측면({a['light']})으로 통합할 때, 진정한 자기(Self)에 한 걸음 다가섭니다."
    ]

    return random.choice(templates)


def generate_rich_stoic_text(virtue, planet, house):
    """풍부한 Stoic 해석 생성"""
    v = STOIC_VIRTUE_MEANINGS[virtue]
    p = PLANET_MEANINGS[planet]
    h = HOUSE_MEANINGS[house]

    templates = [
        f"{planet}이 {house}하우스에서 {virtue}(덕)을 당신에게 요청합니다. "
        f"'{v['marcus']}' - Marcus Aurelius의 말입니다. "
        f"이 영역({h['domain']})에서 당신은 {v['essence']}를 실천하도록 부름받았습니다. "
        f"기억하세요: {h['stoic']}. 실천법: {v['practice']}",

        f"{house}하우스('{h['domain']}')에서 {planet}({p['essence']})이 {virtue}의 훈련장을 만들었습니다. "
        f"Epictetus는 말했습니다: '{v['epictetus']}' "
        f"이 영역에서 매일 {v['essence']}를 연습하세요. "
        f"핵심 질문: {h['question']} 스토아의 대답: {v['practice']}",

        f"Seneca가 당신에게 편지를 씁니다: '{v['seneca']}' "
        f"당신의 {planet}이 {house}하우스에서 {virtue}를 배울 기회를 제공합니다. "
        f"'{h['domain']}'의 영역에서 {p['stoic']}. "
        f"이것이 스토아 철학자로서 당신의 과제입니다."
    ]

    return random.choice(templates)


def generate_rich_shadow_text(planet1, planet2, aspect):
    """풍부한 그림자 작업 해석 생성"""
    p1 = PLANET_MEANINGS[planet1]
    p2 = PLANET_MEANINGS[planet2]

    aspect_meanings = {
        "opposition": ("대립", "정반대의 힘이 당신 안에서 팽팽한 긴장을 만듭니다", "이 대극을 통합할 때 놀라운 에너지가 해방됩니다"),
        "square": ("갈등", "불편한 마찰이 성장을 강요합니다", "이 긴장을 창조적으로 해결하는 것이 과제입니다"),
        "quincunx": ("조정 필요", "서로 이해할 수 없는 에너지가 만났습니다", "의식적인 조정과 통합이 필요합니다"),
        "trine": ("조화", "자연스러운 흐름이 있습니다", "너무 쉬워서 무의식적으로 지나칠 수 있으니 의식적으로 활용하세요"),
        "sextile": ("기회", "적극적으로 활용하면 열리는 문입니다", "기회는 행동할 때만 실현됩니다"),
        "conjunction": ("융합", "두 에너지가 하나로 녹아들었습니다", "분리하기 어렵지만 강력한 힘입니다"),
        "semisextile": ("미묘한 연결", "거의 눈에 띄지 않는 연결이 있습니다", "미묘하지만 지속적으로 작동합니다"),
        "semisquare": ("작은 마찰", "미세한 자극이 있습니다", "무시하면 쌓이고, 다루면 성장합니다"),
        "sesquisquare": ("숨겨진 긴장", "표면 아래 불편함이 있습니다", "인식하고 다루어야 해결됩니다")
    }

    meaning, tension, resolution = aspect_meanings.get(aspect, ("관계", "두 에너지가 상호작용합니다", "의식적 통합이 필요합니다"))

    return (
        f"{planet1}({p1['essence']})과 {planet2}({p2['essence']})이 {aspect}({meaning})을 형성합니다. "
        f"{tension}. {planet1}의 그림자({p1['shadow']})와 {planet2}의 그림자({p2['shadow']})가 서로를 자극합니다. "
        f"Jung은 '그림자와의 대면이 개성화의 핵심'이라 했습니다. {resolution}. "
        f"억압하지 말고, 투사하지 말고, 직면하고 통합하세요."
    )


# =====================================================================
# 고품질 룰 생성
# =====================================================================

def generate_jung_rules_v2():
    """고품질 Jung 룰 생성"""
    rules = {
        "meta": {
            "persona": "The Analyst (분석관)",
            "philosophy": "Carl Jung - Analytical Psychology",
            "tone": "깊이 있는 심리 분석, 원형과 무의식 탐구, 문학적 통찰",
            "generated": "auto_v2_high_quality",
            "count": 0
        }
    }

    rule_id = 1

    # 1. 행성 × 사인 × 하우스 × 원형 (샘플링으로 품질 유지)
    print("[Jung V2] 고품질 행성-사인-하우스-원형 조합 생성 중...")
    # 모든 조합 대신, 주요 조합만 생성 (품질 유지)
    for planet in PLANET_MEANINGS.keys():
        for sign in list(SIGN_MEANINGS.keys())[:6]:  # 6개 사인만
            for house in [1, 4, 7, 10]:  # 앵귤러 하우스만
                for archetype in list(ARCHETYPE_MEANINGS.keys())[:6]:  # 6개 원형만
                    key = f"rule_{rule_id}"
                    rules[key] = {
                        "when": [planet.lower(), sign.lower(), f"house {house}", archetype.lower()],
                        "text": generate_rich_jung_text(planet, sign, house, archetype),
                        "weight": 4,
                        "archetype": archetype,
                        "planet": planet,
                        "sign": sign,
                        "house": house
                    }
                    rule_id += 1

    # 2. 그림자 작업 (주요 측면만)
    print("[Jung V2] 고품질 그림자 작업 해석 생성 중...")
    for planet1 in list(PLANET_MEANINGS.keys())[:7]:
        for planet2 in list(PLANET_MEANINGS.keys())[:7]:
            if planet1 >= planet2:
                continue
            for aspect in ["conjunction", "opposition", "trine", "square", "sextile"]:
                key = f"rule_{rule_id}"
                rules[key] = {
                    "when": [planet1.lower(), planet2.lower(), aspect],
                    "text": generate_rich_shadow_text(planet1, planet2, aspect),
                    "weight": 5 if aspect in ["opposition", "square"] else 3,
                    "process": "Shadow Work"
                }
                rule_id += 1

    # 3. 개성화 과정 해석
    print("[Jung V2] 개성화 과정 해석 생성 중...")
    individuation_stages = [
        ("Confrontation with Persona", "페르소나와의 대면", "사회적 가면 뒤의 진정한 자아를 찾는 단계"),
        ("Encounter with Shadow", "그림자와의 만남", "억압된 자아와 직면하는 용기 있는 단계"),
        ("Integration of Anima/Animus", "아니마/아니무스 통합", "내면의 이성을 인정하고 통합하는 단계"),
        ("Emergence of Self", "자기(Self)의 출현", "전체성을 향한 여정의 정점")
    ]

    for stage_en, stage_kr, stage_desc in individuation_stages:
        for house in HOUSE_MEANINGS.keys():
            h = HOUSE_MEANINGS[house]
            key = f"rule_{rule_id}"
            rules[key] = {
                "when": [stage_en.lower().replace(" ", "_"), f"house {house}"],
                "text": f"개성화 여정의 '{stage_kr}' 단계가 {house}하우스('{h['domain']}')에서 진행됩니다. "
                        f"{stage_desc}. {h['jung']}. "
                        f"이 영역에서 당신은 '{h['question']}'라는 근본적 질문과 마주합니다. "
                        f"Jung은 개성화를 '진정한 자기 자신이 되는 평생의 여정'이라 정의했습니다.",
                "weight": 5,
                "process": stage_en,
                "house": house
            }
            rule_id += 1

    rules["meta"]["count"] = rule_id - 1
    print(f"[Jung V2] 총 {rule_id - 1}개 고품질 룰 생성 완료!")
    return rules


def generate_stoic_rules_v2():
    """고품질 Stoic 룰 생성"""
    rules = {
        "meta": {
            "persona": "The Strategist (전략가)",
            "philosophy": "Stoicism - Marcus Aurelius, Epictetus, Seneca",
            "tone": "실용적 지혜, 고전 인용, 일상 실천 가이드",
            "generated": "auto_v2_high_quality",
            "count": 0
        }
    }

    rule_id = 1

    # 1. 덕목 × 행성 × 하우스
    print("[Stoic V2] 고품질 덕목-행성-하우스 해석 생성 중...")
    for virtue in STOIC_VIRTUE_MEANINGS.keys():
        for planet in list(PLANET_MEANINGS.keys())[:7]:
            for house in HOUSE_MEANINGS.keys():
                key = f"rule_{rule_id}"
                rules[key] = {
                    "when": [virtue.lower(), planet.lower(), f"house {house}"],
                    "text": generate_rich_stoic_text(virtue, planet, house),
                    "weight": 4,
                    "virtue": virtue,
                    "planet": planet,
                    "house": house
                }
                rule_id += 1

    # 2. 스토아 실천법 해석
    print("[Stoic V2] 스토아 실천법 해석 생성 중...")
    for practice_name, practice in STOIC_PRACTICE_MEANINGS.items():
        for house in HOUSE_MEANINGS.keys():
            h = HOUSE_MEANINGS[house]
            key = f"rule_{rule_id}"
            rules[key] = {
                "when": [practice_name.lower().replace(" ", "_"), f"house {house}"],
                "text": f"'{practice_name}' 실천을 {house}하우스('{h['domain']}')에 적용하세요. "
                        f"{practice['essence']}. 방법: {practice['how']}. "
                        f"이 영역에서 {h['stoic']}. "
                        f"효과: {practice['benefit']}",
                "weight": 4,
                "practice": practice_name,
                "house": house
            }
            rule_id += 1

    # 3. 통제 이분법 상세
    print("[Stoic V2] 통제 이분법 상세 해석 생성 중...")
    controllable_houses = {1, 3, 5, 6}  # 주로 자기 통제 영역
    for planet in PLANET_MEANINGS.keys():
        p = PLANET_MEANINGS[planet]
        for house in HOUSE_MEANINGS.keys():
            h = HOUSE_MEANINGS[house]
            is_controllable = house in controllable_houses

            key = f"rule_{rule_id}"
            if is_controllable:
                text = (
                    f"{planet}({p['essence']})이 {house}하우스에서 당신의 통제 영역을 밝힙니다. "
                    f"Epictetus는 말했습니다: '우리의 의견, 욕구, 행동만이 우리 통제 하에 있다.' "
                    f"'{h['domain']}' 영역에서 {p['action']}하세요 - 이것은 당신 손에 달려 있습니다. "
                    f"{h['stoic']}"
                )
            else:
                text = (
                    f"{planet}({p['essence']})이 {house}하우스에서 통제 불가능한 영역의 영향을 보여줍니다. "
                    f"'{h['domain']}'의 결과는 당신 통제 밖입니다. "
                    f"Marcus Aurelius: '방해물이 곧 길이다.' "
                    f"결과가 아니라 당신의 반응({p['action']})에 집중하세요. {h['stoic']}"
                )

            rules[key] = {
                "when": ["dichotomy_of_control", planet.lower(), f"house {house}"],
                "text": text,
                "weight": 5,
                "controllable": is_controllable
            }
            rule_id += 1

    rules["meta"]["count"] = rule_id - 1
    print(f"[Stoic V2] 총 {rule_id - 1}개 고품질 룰 생성 완료!")
    return rules


# =====================================================================
# 메인 실행
# =====================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Persona Data Generator V2 - 고품질 문학적 버전")
    print("=" * 70)

    # 경로 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    rules_dir = os.path.join(script_dir, "..", "rules", "persona")

    os.makedirs(rules_dir, exist_ok=True)

    # 고품질 데이터 생성
    print("\n" + "=" * 70)
    print("[JUNG V2] 고품질 데이터 생성 중...")
    print("=" * 70)
    jung_rules = generate_jung_rules_v2()

    print("\n" + "=" * 70)
    print("[STOIC V2] 고품질 데이터 생성 중...")
    print("=" * 70)
    stoic_rules = generate_stoic_rules_v2()

    # 파일 저장
    print("\n" + "=" * 70)
    print("[SAVE] 파일 저장 중...")
    print("=" * 70)

    def save_json(data, filename):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 저장 완료: {filename}")

    save_json(jung_rules, os.path.join(rules_dir, "analyst_jung_v2.json"))
    save_json(stoic_rules, os.path.join(rules_dir, "strategist_stoic_v2.json"))

    # 통계 출력
    print("\n" + "=" * 70)
    print("[STATS] 생성 통계")
    print("=" * 70)
    print(f"Jung V2 Rules:   {jung_rules['meta']['count']:,}개")
    print(f"Stoic V2 Rules:  {stoic_rules['meta']['count']:,}개")
    print("-" * 70)
    print(f"총 Rules:        {jung_rules['meta']['count'] + stoic_rules['meta']['count']:,}개")
    print("=" * 70)
    print("[OK] 고품질 데이터 생성 완료!")

    # 샘플 출력
    print("\n" + "=" * 70)
    print("[SAMPLE] Jung 해석 샘플")
    print("=" * 70)
    print(jung_rules["rule_1"]["text"])
    print("\n" + "=" * 70)
    print("[SAMPLE] Stoic 해석 샘플")
    print("=" * 70)
    print(stoic_rules["rule_1"]["text"])
