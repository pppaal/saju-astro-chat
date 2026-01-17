# backend_ai/app/tarot/layers_data.py
"""
Tarot Multi-Layer Interpretation Data
=====================================
Tier 5: 다층 해석 관련 상수
- 해석 레이어 정의
- 메이저 아르카나 다층 해석
"""

# 해석 레이어 정의
INTERPRETATION_LAYERS = {
    'surface': {
        'korean': '표면적 의미',
        'description': '카드가 직접적으로 보여주는 상황과 사건',
        'prompt_template': "이 카드가 현재 상황에서 직접적으로 보여주는 것은 무엇인가요?",
    },
    'psychological': {
        'korean': '심리적 의미',
        'description': '내면의 감정, 생각, 무의식적 패턴',
        'prompt_template': "이 카드가 당신의 내면 심리와 감정에 대해 말하는 것은?",
    },
    'shadow': {
        'korean': '그림자 작업',
        'description': '억압된 측면, 두려움, 성장 기회',
        'prompt_template': "이 카드가 보여주는 당신이 피하고 있는 것, 직면해야 할 것은?",
    },
    'spiritual': {
        'korean': '영적/카르마적 의미',
        'description': '영혼의 교훈, 전생의 패턴, 영적 성장',
        'prompt_template': "이 카드가 당신의 영혼 여정에서 가르치는 교훈은?",
    },
    'action': {
        'korean': '실천적 조언',
        'description': '구체적인 행동 지침과 다음 단계',
        'prompt_template': "이 카드의 메시지를 바탕으로 취할 수 있는 구체적 행동은?",
    },
}

# 각 메이저 아르카나의 다층 해석 베이스
MAJOR_ARCANA_LAYERS = {
    'The Fool': {
        'surface': '새로운 시작, 여행, 예상치 못한 기회',
        'psychological': '내면 아이의 회복, 과거 트라우마에서 자유로워짐',
        'shadow': '무모함, 책임 회피, 성장 거부',
        'spiritual': '영혼의 새로운 사이클 시작, 카르마 청산 완료',
        'action': '두려움 없이 첫 발을 내딛으세요. 완벽할 필요 없습니다.',
    },
    'The Magician': {
        'surface': '새 프로젝트 시작, 기술과 재능 활용',
        'psychological': '자기효능감, 능력에 대한 확신',
        'shadow': '조작, 사기, 재능 남용',
        'spiritual': '현실 창조의 힘, 의도와 현현의 법칙',
        'action': '가진 도구를 사용하세요. 지금 시작할 모든 것이 있습니다.',
    },
    'The High Priestess': {
        'surface': '비밀이 드러남, 직관적 통찰',
        'psychological': '무의식과의 연결, 꿈과 상징의 중요성',
        'shadow': '지나친 수동성, 비밀 유지의 부담',
        'spiritual': '내면 지혜와의 연결, 신성한 여성성',
        'action': '조용히 기다리며 내면의 목소리를 들으세요.',
    },
    'The Empress': {
        'surface': '풍요, 임신/출산, 창조적 프로젝트 완성',
        'psychological': '자기돌봄, 양육 받고자 하는 욕구',
        'shadow': '과잉보호, 의존성, 탐닉',
        'spiritual': '대지 어머니와의 연결, 자연의 순환',
        'action': '자신을 사랑하세요. 창조적 충동을 따르세요.',
    },
    'The Emperor': {
        'surface': '구조화, 리더십, 권위자와의 만남',
        'psychological': '내면의 아버지, 자기훈육',
        'shadow': '지배욕, 융통성 부족, 권위주의',
        'spiritual': '신성한 남성성, 보호의 원형',
        'action': '명확한 경계를 세우세요. 계획을 따르세요.',
    },
    'The Hierophant': {
        'surface': '전통적 가르침, 결혼, 공식적 의식',
        'psychological': '신념 체계 검토, 소속감 욕구',
        'shadow': '맹목적 순응, 교조주의, 위선',
        'spiritual': '영적 스승을 만남, 전통 지혜의 가치',
        'action': '신뢰할 수 있는 조언자를 찾으세요. 전통에서 배우세요.',
    },
    'The Lovers': {
        'surface': '연애, 파트너십, 중요한 선택',
        'psychological': '자아 통합, 내면의 남성성/여성성 균형',
        'shadow': '우유부단, 타인에게 책임 전가',
        'spiritual': '영혼의 짝, 신성한 결합',
        'action': '마음이 이끄는 대로 선택하세요. 진정성 있게.',
    },
    'The Chariot': {
        'surface': '승리, 여행, 장애물 극복',
        'psychological': '의지력과 결단력, 감정 통제',
        'shadow': '공격성, 강박적 통제',
        'spiritual': '영적 전사의 여정, 에고 극복',
        'action': '명확한 목표를 정하고 전진하세요. 멈추지 마세요.',
    },
    'Strength': {
        'surface': '인내로 상황 극복, 건강 회복',
        'psychological': '내면의 야수 길들이기, 본능과 화해',
        'shadow': '분노 억압, 자기 희생',
        'spiritual': '사랑의 힘, 부드러운 승리',
        'action': '힘이 아닌 사랑으로 접근하세요. 인내하세요.',
    },
    'The Hermit': {
        'surface': '혼자만의 시간, 조언자 역할',
        'psychological': '내면 탐구, 자기성찰의 필요',
        'shadow': '고립, 타인 거부, 우울',
        'spiritual': '내면의 빛을 따름, 영적 안내자',
        'action': '잠시 물러나 생각하세요. 지혜를 구하세요.',
    },
    'Wheel of Fortune': {
        'surface': '운명의 변화, 행운, 새로운 사이클',
        'psychological': '변화 수용, 통제 욕구 내려놓기',
        'shadow': '운명 탓하기, 책임 회피',
        'spiritual': '카르마의 수레바퀴, 인과의 법칙',
        'action': '변화에 저항하지 마세요. 기회를 잡으세요.',
    },
    'Justice': {
        'surface': '법적 문제, 공정한 결과, 계약',
        'psychological': '자기 정직, 양심의 소리',
        'shadow': '가혹한 자기 비판, 복수심',
        'spiritual': '카르마 균형, 우주적 정의',
        'action': '정직하게 행동하세요. 결과를 받아들이세요.',
    },
    'The Hanged Man': {
        'surface': '지연, 희생, 새로운 관점 필요',
        'psychological': '항복의 필요, 에고 내려놓기',
        'shadow': '순교자 콤플렉스, 수동적 공격성',
        'spiritual': '영적 입문, 깨달음 전 어둠',
        'action': '기다리세요. 다른 각도에서 보세요.',
    },
    'Death': {
        'surface': '끝, 변환, 오래된 것 떠나보내기',
        'psychological': '자아의 죽음과 재탄생',
        'shadow': '변화 거부, 과거에 집착',
        'spiritual': '영적 재탄생, 피닉스',
        'action': '놓아주세요. 끝은 시작입니다.',
    },
    'Temperance': {
        'surface': '균형, 치유, 조화로운 관계',
        'psychological': '내면 조화, 극단 피하기',
        'shadow': '과한 타협, 자기 부정',
        'spiritual': '연금술적 통합, 영혼의 균형',
        'action': '중용을 지키세요. 천천히 섞어가세요.',
    },
    'The Devil': {
        'surface': '중독, 속박, 물질주의',
        'psychological': '그림자 직면, 억압된 욕망',
        'shadow': '죄책감 회피, 탓하기',
        'spiritual': '어둠 속 빛 찾기, 탐욕 초월',
        'action': '당신을 묶는 것이 무엇인지 보세요. 선택할 수 있습니다.',
    },
    'The Tower': {
        'surface': '갑작스러운 변화, 붕괴, 충격적 진실',
        'psychological': '방어기제 무너짐, 진실 직면',
        'shadow': '혼란 조장, 파괴적 행동',
        'spiritual': '에고 탑의 붕괴, 영적 각성',
        'action': '저항하지 마세요. 무너짐이 해방입니다.',
    },
    'The Star': {
        'surface': '희망, 영감, 치유',
        'psychological': '상처 후 회복, 자기 가치 회복',
        'shadow': '비현실적 희망, 현실 도피',
        'spiritual': '우주와의 연결, 신성한 인도',
        'action': '희망을 품으세요. 치유가 진행 중입니다.',
    },
    'The Moon': {
        'surface': '환상, 두려움, 숨겨진 것',
        'psychological': '무의식의 부상, 꿈의 메시지',
        'shadow': '환상에 빠짐, 자기기만',
        'spiritual': '직관의 심화, 어둠 속 인도',
        'action': '두려움을 인정하세요. 직관을 믿으세요.',
    },
    'The Sun': {
        'surface': '성공, 기쁨, 활력',
        'psychological': '내면 아이의 기쁨, 자기 수용',
        'shadow': '과대망상, 현실 외면',
        'spiritual': '영적 빛, 진정한 자아 발현',
        'action': '기쁨을 누리세요. 빛나도 괜찮습니다.',
    },
    'Judgement': {
        'surface': '각성, 소명 발견, 과거 청산',
        'psychological': '자기 용서, 과거 통합',
        'shadow': '자기 비난, 타인 심판',
        'spiritual': '영혼의 부름, 더 높은 목적',
        'action': '과거를 용서하세요. 새롭게 일어나세요.',
    },
    'The World': {
        'surface': '완성, 여행, 목표 달성',
        'psychological': '자아 통합, 온전함',
        'shadow': '완료 두려움, 새 시작 거부',
        'spiritual': '한 사이클 완성, 우주적 춤',
        'action': '축하하세요. 그리고 다음을 준비하세요.',
    },
}
