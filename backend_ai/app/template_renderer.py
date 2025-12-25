"""
Lightweight template renderer for destiny-map (no LLM).
Outputs structured JSON that matches Display.tsx expectations.

Display.tsx expects these interfaces:
- ImportantYear: { year: number, age: number, rating: 1-5, title: string, sajuReason: string, astroReason: string }
- CategoryAnalysis: { icon: string, title: string, sajuAnalysis: string, astroAnalysis: string, crossInsight: string }
- KeyInsight: { type: "strength"|"opportunity"|"caution"|"advice", text: string, icon?: string }
"""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


def _get_sibsin_value(sibsin_data, key: str = "cheon", default: str = "") -> str:
    """
    Extract sibsin value from either string or dict format.
    sibsin can be:
    - String: "식신", "비견", etc.
    - Dict: {"cheon": "식신", "ji": "상관"}

    Returns the sibsin value or default if not found.
    """
    if sibsin_data is None:
        return default
    if isinstance(sibsin_data, str):
        # If it's a string, return it directly (only makes sense for "cheon")
        return sibsin_data if key == "cheon" else default
    if isinstance(sibsin_data, dict):
        return sibsin_data.get(key, default)
    return default

# ============================================================
# 일간(日干)별 상세 성격/특성 데이터
# ============================================================
DAY_MASTER_PROFILES = {
    "甲": {
        "name": "갑목",
        "element": "목",
        "personality": "리더십이 강하고 정의감이 넘칩니다. 큰 나무처럼 곧고 당당하며, 주변을 이끄는 힘이 있어요.",
        "strengths": "추진력, 결단력, 정의감, 리더십",
        "weaknesses": "고집, 융통성 부족, 독선적 성향",
        "career_fit": "CEO, 정치인, 변호사, 교육자, 스타트업 창업",
        "love_style": "헌신적이고 보호자 스타일. 연인을 책임지려 하지만 가끔 독단적일 수 있어요.",
        "love_timing": "정관(丁), 편관(丙) 운에서 인연. 30대 초중반에 좋은 만남 가능성.",
        "ideal_partner": "자신을 존중해주면서 부드럽게 조언할 수 있는 상대",
        "health_focus": "간, 담낭, 근육. 스트레스로 인한 간 손상 주의.",
        "wealth_style": "큰 그림을 그리는 투자 선호. 부동산, 대규모 사업 적성.",
    },
    "乙": {
        "name": "을목",
        "element": "목",
        "personality": "유연하고 적응력이 뛰어납니다. 덩굴처럼 어디서든 뿌리내리며 생존력이 강해요.",
        "strengths": "적응력, 유연성, 인내심, 외교력",
        "weaknesses": "우유부단, 의존성, 줏대 부족",
        "career_fit": "예술가, 디자이너, 상담사, 외교관, 마케터",
        "love_style": "다정하고 헌신적. 상대에게 맞추려 하지만 속마음을 잘 표현 못해요.",
        "love_timing": "정관(庚), 편관(辛) 운에서 인연. 20대 후반~30대 초반 결혼운.",
        "ideal_partner": "리드해주면서 자신의 의견도 존중하는 강한 상대",
        "health_focus": "간, 신경계. 스트레스성 두통, 불면증 주의.",
        "wealth_style": "안전한 투자 선호. 적금, 채권, 안정적 수입 추구.",
    },
    "丙": {
        "name": "병화",
        "element": "화",
        "personality": "태양처럼 밝고 에너지가 넘칩니다. 주변을 밝히는 카리스마와 낙천적 성격의 소유자.",
        "strengths": "열정, 카리스마, 낙천성, 표현력",
        "weaknesses": "충동적, 지속력 부족, 감정 기복",
        "career_fit": "연예인, 강연자, 영업, 마케팅, 엔터테인먼트",
        "love_style": "열정적이고 로맨틱. 드라마틱한 연애를 좋아하지만 식으면 빨리 식어요.",
        "love_timing": "정재(辛), 편재(庚) 운에서 인연. 20대 후반 연애운 강함.",
        "ideal_partner": "자신의 열정을 받아주고 함께 즐길 수 있는 활발한 상대",
        "health_focus": "심장, 혈압, 눈. 과로와 흥분으로 인한 심장 문제 주의.",
        "wealth_style": "공격적 투자, 고위험 고수익 선호. 주식, 암호화폐 관심.",
    },
    "丁": {
        "name": "정화",
        "element": "화",
        "personality": "촛불처럼 은은하고 따뜻합니다. 섬세하고 직관력이 뛰어나며 예술적 감각이 있어요.",
        "strengths": "섬세함, 직관력, 예술성, 따뜻함",
        "weaknesses": "예민함, 걱정 많음, 자기의심",
        "career_fit": "작가, 심리상담사, 예술가, 연구원, 종교인",
        "love_style": "깊고 진지한 사랑. 한 사람에게 올인하며 정서적 교감을 중시해요.",
        "love_timing": "정재(庚), 편재(辛) 운에서 인연. 30대에 깊은 인연 만남.",
        "ideal_partner": "정서적으로 안정되고 자신의 감성을 이해해주는 상대",
        "health_focus": "심장, 소장, 혈액순환. 스트레스로 인한 불면증 주의.",
        "wealth_style": "안정 추구하며 예술/창작 분야에서 수입. 투자보다 실력으로 승부.",
    },
    "戊": {
        "name": "무토",
        "element": "토",
        "personality": "산처럼 듬직하고 신뢰감 있습니다. 포용력이 크고 변함없는 중심이 되어요.",
        "strengths": "신뢰감, 포용력, 안정감, 중재력",
        "weaknesses": "둔함, 변화 거부, 고집",
        "career_fit": "부동산, 건설, 금융, 공무원, 중재자",
        "love_style": "느리지만 확실한 사랑. 한번 마음 주면 변치 않는 든든한 파트너.",
        "love_timing": "정재(癸), 편재(壬) 운에서 인연. 30대 중반 이후 안정적 결혼.",
        "ideal_partner": "변화와 활력을 주면서 자신의 안정감을 인정해주는 상대",
        "health_focus": "위장, 비장, 소화기. 과식과 불규칙한 식사 주의.",
        "wealth_style": "부동산, 토지 투자 적성. 장기 투자로 큰 부 축적 가능.",
    },
    "己": {
        "name": "기토",
        "element": "토",
        "personality": "논밭처럼 겸손하고 수용적입니다. 다양한 것을 받아들이고 키워내는 힘이 있어요.",
        "strengths": "수용력, 겸손함, 실용성, 양육력",
        "weaknesses": "자기표현 부족, 우유부단, 자존감 낮음",
        "career_fit": "교육자, 농업, 요식업, 상담사, 인사관리",
        "love_style": "헌신적이고 양육적인 사랑. 상대를 돌보지만 자기 희생이 과할 수 있어요.",
        "love_timing": "정재(壬), 편재(癸) 운에서 인연. 20대 후반~30대 초반 좋은 인연.",
        "ideal_partner": "자신을 인정하고 표현할 수 있게 도와주는 적극적인 상대",
        "health_focus": "위장, 피부. 스트레스성 위염, 피부 트러블 주의.",
        "wealth_style": "꾸준히 모으는 스타일. 저축, 적금, 안정적 투자 선호.",
    },
    "庚": {
        "name": "경금",
        "element": "금",
        "personality": "강철처럼 강하고 결단력 있습니다. 원칙주의자이며 정의롭고 카리스마 있어요.",
        "strengths": "결단력, 용기, 정의감, 실행력",
        "weaknesses": "냉정함, 융통성 없음, 공격적",
        "career_fit": "군인, 경찰, 외과의사, 경영자, 법조인",
        "love_style": "직선적이고 솔직한 사랑. 좋으면 좋다 표현하지만 다정함이 부족할 수 있어요.",
        "love_timing": "정재(乙), 편재(甲) 운에서 인연. 30대 초중반 결혼운 상승.",
        "ideal_partner": "자신의 강함을 부드럽게 중화시켜주는 따뜻한 상대",
        "health_focus": "폐, 대장, 피부. 호흡기 질환, 피부 건조 주의.",
        "wealth_style": "과감한 투자, 사업 확장. 큰 돈 벌기도, 잃기도 하는 타입.",
    },
    "辛": {
        "name": "신금",
        "element": "금",
        "personality": "보석처럼 섬세하고 예리합니다. 완벽주의적이며 미적 감각이 뛰어나요.",
        "strengths": "섬세함, 예리함, 미적 감각, 분석력",
        "weaknesses": "예민함, 까칠함, 자존심 강함",
        "career_fit": "주얼리/패션 디자이너, 금융분석가, 품질관리, 비평가",
        "love_style": "로맨틱하고 이상적인 사랑 추구. 눈이 높고 쉽게 만족하지 않아요.",
        "love_timing": "정재(甲), 편재(乙) 운에서 인연. 20대 후반~30대 초반 인연.",
        "ideal_partner": "자신의 가치를 인정하고 세심하게 배려해주는 성숙한 상대",
        "health_focus": "폐, 피부, 알레르기. 예민한 피부와 호흡기 관리 필요.",
        "wealth_style": "가치 있는 것에 투자. 예술품, 귀금속, 고가 자산 선호.",
    },
    "壬": {
        "name": "임수",
        "element": "수",
        "personality": "바다처럼 깊고 포용력이 있습니다. 지혜롭고 적응력이 뛰어나며 대인관계가 좋아요.",
        "strengths": "지혜, 포용력, 적응력, 소통능력",
        "weaknesses": "변덕, 집중력 부족, 우유부단",
        "career_fit": "무역, 외교, 유통, 미디어, 여행업",
        "love_style": "자유로운 사랑. 구속 싫어하고 다양한 만남을 즐기지만 깊어지면 헌신적.",
        "love_timing": "정재(丁), 편재(丙) 운에서 인연. 다양한 인연 후 30대 중반 정착.",
        "ideal_partner": "자유를 존중하면서 정서적 안정감을 주는 상대",
        "health_focus": "신장, 방광, 생식기. 수분 부족, 냉증 주의.",
        "wealth_style": "유동적 자산 선호. 무역, 유통, 다양한 수입원 추구.",
    },
    "癸": {
        "name": "계수",
        "element": "수",
        "personality": "이슬처럼 맑고 순수합니다. 직관력이 뛰어나고 영적인 감각이 있어요.",
        "strengths": "직관력, 순수함, 영성, 창의성",
        "weaknesses": "수동성, 비현실적, 의존성",
        "career_fit": "예술가, 점술가, 심리상담, 종교, 연구원",
        "love_style": "순수하고 헌신적인 사랑. 영혼의 교감을 중시하며 상대에게 흡수되기 쉬워요.",
        "love_timing": "정재(丙), 편재(丁) 운에서 인연. 20대 후반 로맨틱한 인연.",
        "ideal_partner": "현실적이면서 자신의 감성을 이해해주는 든든한 상대",
        "health_focus": "신장, 방광, 면역계. 냉증, 피로 누적 주의.",
        "wealth_style": "직관적 투자, 영감에 따른 결정. 안정보다 의미 추구.",
    },
}

# ============================================================
# 십신별 특성/운세 의미
# ============================================================
SIBSIN_MEANINGS = {
    "비견": {
        "meaning": "경쟁과 협력의 에너지",
        "career": "동업, 협업 기회. 경쟁자가 많지만 함께 성장 가능.",
        "love": "친구 같은 연인, 동등한 관계. 경쟁심이 연애에 방해될 수 있음.",
        "wealth": "나눠야 할 일이 생김. 공동투자 주의.",
        "timing": "새로운 인맥, 경쟁 상황, 독립 욕구가 강해지는 시기",
    },
    "겁재": {
        "meaning": "강한 추진력과 도전의 에너지",
        "career": "적극적 행동이 필요한 시기. 과감한 도전이 성과로.",
        "love": "강렬한 끌림, 삼각관계 주의. 밀당보다 직진이 유리.",
        "wealth": "과감한 투자 유혹. 도박성 투자 경계, 손재수 주의.",
        "timing": "결단이 필요한 시기, 과감한 행동이 좋은 결과를 만듦",
    },
    "식신": {
        "meaning": "창의성과 표현의 에너지",
        "career": "창작, 기획, 아이디어가 빛나는 시기. 부업 수입 가능.",
        "love": "편안하고 즐거운 연애. 함께 맛집 탐방, 여행이 좋음.",
        "wealth": "자연스러운 수입 증가. 재능으로 돈 버는 기회.",
        "timing": "창의력 폭발, 새로운 취미나 부업 시작하기 좋은 시기",
    },
    "상관": {
        "meaning": "자유와 변화의 에너지",
        "career": "기존 틀을 깨는 혁신. 이직, 전직 욕구. 프리랜서 유리.",
        "love": "자유로운 연애, 기존 관계에 변화. 권위적 상대와 충돌.",
        "wealth": "불안정하지만 큰 기회도. 투기성 수입 가능.",
        "timing": "변화와 혁신의 시기, 구속에서 벗어나고 싶은 욕구",
    },
    "편재": {
        "meaning": "활동적 재물 에너지",
        "career": "영업, 투자, 사업 확장에 유리. 움직여야 돈이 됨.",
        "love": "새로운 만남 많음. 바람기 주의, 가벼운 인연이 될 수 있음.",
        "wealth": "큰 돈이 들어오고 나감. 투자 기회지만 리스크도 큼.",
        "timing": "재물 기회가 많은 시기, 적극적 행동이 수입으로 연결",
    },
    "정재": {
        "meaning": "안정적 재물 에너지",
        "career": "안정적 수입, 승진. 꾸준한 노력이 인정받는 시기.",
        "love": "진지한 만남, 결혼으로 이어질 인연. 가정적인 상대.",
        "wealth": "월급, 이자, 안정적 수입 증가. 저축하기 좋은 시기.",
        "timing": "안정과 축적의 시기, 결혼/내 집 마련 등 정착 기회",
    },
    "편관": {
        "meaning": "도전과 압박의 에너지",
        "career": "승진 기회지만 경쟁 치열. 책임 증가, 스트레스 관리 필요.",
        "love": "강렬한 끌림, 나쁜 남자/여자에게 끌릴 수 있음. 조심!",
        "wealth": "예상치 못한 지출. 법적 문제, 벌금 주의.",
        "timing": "시련이 있지만 성장의 기회, 버티면 인정받는 시기",
    },
    "정관": {
        "meaning": "명예와 책임의 에너지",
        "career": "승진, 취업 성공. 사회적 인정, 책임 있는 위치.",
        "love": "결혼운 상승! 공식적인 관계로 발전. 안정적인 상대.",
        "wealth": "정당한 대가, 월급 인상. 큰 투자보다 안정 추구.",
        "timing": "사회적 인정, 결혼, 승진 등 공식적인 변화의 시기",
    },
    "편인": {
        "meaning": "학습과 변화의 에너지",
        "career": "새로운 분야 학습, 자격증, 이직 준비에 좋은 시기.",
        "love": "비밀 연애, 색다른 만남. 기존 관계에 권태기.",
        "wealth": "불안정하지만 새로운 수입원. 부업, 투잡 가능.",
        "timing": "배움과 변화의 시기, 새로운 것에 도전하기 좋음",
    },
    "정인": {
        "meaning": "지원과 보호의 에너지",
        "career": "귀인의 도움, 멘토 출현. 학업, 자격증 취득 유리.",
        "love": "보살핌 받는 연애. 연상 인연, 소개팅 성사율 높음.",
        "wealth": "부모님 지원, 상속, 선물 등 노력 없이 들어오는 재물.",
        "timing": "도움과 지원이 있는 시기, 배움을 통한 성장",
    },
}

# ============================================================
# Sibsin English translations
# ============================================================
SIBSIN_EN = {
    "비견": "Competitive energy - rivalry and cooperation",
    "겁재": "Bold drive - challenges and ambition",
    "식신": "Creative energy - ideas and expression",
    "상관": "Free spirit - change and innovation",
    "편재": "Active wealth - dynamic income opportunities",
    "정재": "Stable wealth - steady income growth",
    "편관": "Challenge energy - pressure and growth",
    "정관": "Honor and responsibility - recognition time",
    "편인": "Learning energy - new skills and change",
    "정인": "Support energy - mentors and protection",
}

# ============================================================
# 별자리별 특성 데이터
# ============================================================
ZODIAC_PROFILES = {
    "Aries": {"ko": "양자리", "trait": "열정적이고 선구자적", "love": "직진형, 밀당 못함"},
    "Taurus": {"ko": "황소자리", "trait": "안정적이고 감각적", "love": "느리지만 확실한 사랑"},
    "Gemini": {"ko": "쌍둥이자리", "trait": "호기심 많고 소통 중시", "love": "대화가 통해야 사랑"},
    "Cancer": {"ko": "게자리", "trait": "가정적이고 감성적", "love": "헌신적, 모성/부성애"},
    "Leo": {"ko": "사자자리", "trait": "자신감 넘치고 드라마틱", "love": "로맨틱, 대접받고 싶음"},
    "Virgo": {"ko": "처녀자리", "trait": "완벽주의, 분석적", "love": "꼼꼼한 배려, 티 안 나는 사랑"},
    "Libra": {"ko": "천칭자리", "trait": "조화롭고 사교적", "love": "공정한 관계, 밸런스 중시"},
    "Scorpio": {"ko": "전갈자리", "trait": "깊고 강렬한", "love": "올인형, 배신 불가"},
    "Sagittarius": {"ko": "사수자리", "trait": "자유롭고 모험적", "love": "자유로운 사랑, 구속 싫어"},
    "Capricorn": {"ko": "염소자리", "trait": "야망 있고 현실적", "love": "진지하고 책임감 있는 사랑"},
    "Aquarius": {"ko": "물병자리", "trait": "독창적이고 인도주의적", "love": "친구 같은 연인, 독특한 관계"},
    "Pisces": {"ko": "물고기자리", "trait": "감성적이고 직관적", "love": "로맨틱, 희생적 사랑"},
}


def _get_important_years(unse: Dict[str, Any], saju: Dict[str, Any], astro: Dict[str, Any] = None, locale: str = "ko") -> List[Dict[str, Any]]:
    """Extract important years from saju unse data + astro transits.
    Supports ko/en locales.

    Returns format matching Display.tsx ImportantYear interface:
    - year: number (individual year)
    - age: number
    - rating: 1-5
    - title: string
    - sajuReason: string
    - astroReason: string
    """
    years = []
    current_year = datetime.now().year

    # DEBUG logging removed to avoid Windows encoding errors

    # Get birth year for age calculation - try multiple sources
    birth_year = None

    # 1. Try facts.birthDate first (most reliable - comes from frontend input)
    # Also check saju.birthDate directly (in case it's at top level)
    facts = (saju or {}).get("facts", {})
    birth_date = facts.get("birthDate") or facts.get("birth_date") or facts.get("dateOfBirth") or (saju or {}).get("birthDate") or ""
    if birth_date and isinstance(birth_date, str) and len(birth_date) >= 4:
        try:
            # Handle formats: "1990-01-01", "1990/01/01", "19900101"
            birth_year = int(birth_date[:4])
        except (ValueError, TypeError):
            pass

    # 2. Try unse.annual[0].year to infer current age
    if not birth_year:
        annual = (unse or {}).get("annual") or []
        if annual and len(annual) > 0:
            first_annual = annual[0]
            annual_year = first_annual.get("year")
            age = first_annual.get("age")
            if annual_year and age:
                try:
                    birth_year = int(annual_year) - int(age)
                except (ValueError, TypeError):
                    pass

    # 3. Try daeun start year and age
    if not birth_year:
        daeun = (unse or {}).get("daeun") or []
        if daeun and len(daeun) > 0:
            first_daeun = daeun[0]
            start_year = first_daeun.get("startYear") or first_daeun.get("start_year")
            age = first_daeun.get("age") or first_daeun.get("startAge")
            if start_year and age:
                try:
                    birth_year = int(start_year) - int(age)
                except (ValueError, TypeError):
                    pass

    # 4. Default fallback - estimate from current year
    if not birth_year:
        birth_year = current_year - 30  # Default to ~30 years old

    # Daeun (대운) - major luck periods - ALL entries for filtering
    # Data structure: { age, heavenlyStem, earthlyBranch, sibsin: { cheon, ji } }
    daeun = (unse or {}).get("daeun") or []
    user_age = current_year - birth_year if birth_year else 30

    for idx, d in enumerate(daeun):
        age = d.get("age")
        if age is None:
            continue

        year_num = birth_year + int(age) if birth_year else current_year + (idx * 10)
        stem = d.get("heavenlyStem") or d.get("heavenly_stem") or ""
        branch = d.get("earthlyBranch") or d.get("earthly_branch") or ""
        ganji = f"{stem}{branch}"

        sibsin = d.get("sibsin")
        cheon_sibsin = _get_sibsin_value(sibsin, "cheon", "")
        ji_sibsin = _get_sibsin_value(sibsin, "ji", "")

        element = _get_element_from_stem(stem)
        rating = _calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        # Check if this daeun period includes current age
        is_current = age <= user_age < age + 10

        # Get personalized meaning based on sibsin
        meaning = _get_personalized_daeun_meaning(cheon_sibsin, ji_sibsin, element, age, is_current)

        years.append({
            "year": year_num,
            "age": int(age),
            "rating": rating,
            "title": meaning["title"],
            "sajuReason": meaning["saju"],
            "astroReason": meaning["astro"],
        })

    # Annual fortune (세운) - upcoming years with high ratings
    annual = (unse or {}).get("annual") or []
    for a in annual:
        year = a.get("year")
        if not year:
            continue

        year_num = int(year) if isinstance(year, str) else year
        age = year_num - birth_year if birth_year else current_year - 1990

        stem = a.get("heavenlyStem") or a.get("heavenly_stem") or ""
        branch = a.get("earthlyBranch") or a.get("earthly_branch") or ""
        ganji = f"{stem}{branch}"

        sibsin = a.get("sibsin")
        cheon_sibsin = _get_sibsin_value(sibsin, "cheon", "")
        ji_sibsin = _get_sibsin_value(sibsin, "ji", "")

        element = _get_element_from_stem(stem)
        rating = _calculate_rating_from_sibsin(cheon_sibsin, ji_sibsin)

        is_current = year_num == current_year
        meaning = _get_personalized_annual_meaning(cheon_sibsin, ji_sibsin, year_num, is_current)

        years.append({
            "year": year_num,
            "age": age,
            "rating": rating,
            "title": meaning["title"],
            "sajuReason": meaning["saju"],
            "astroReason": meaning["astro"],
        })

    # DEBUG logging removed to avoid Windows encoding errors

    # ========== 새 로직: daeun이 있으면 우선 포함, rating 관계없이 ==========
    # daeun 데이터가 있으면 모두 포함 (rating 필터링 제거)
    has_daeun = bool(daeun)
    has_annual = bool(annual)

    if has_daeun or has_annual:
        # daeun과 annual이 있으면 모두 포함하고 rating으로 정렬
        high_rated = years.copy()
        # Sort by rating (desc) then year (asc)
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))
        # 최대 8개만 유지
        high_rated = high_rated[:8]
    else:
        # 기존 필터링 로직 (daeun/annual 없을 때만)
        high_rated = [y for y in years if y["rating"] >= 4]

        # If not enough high-rated years, include some 3-star ones
        if len(high_rated) < 6:
            medium_rated = [y for y in years if y["rating"] == 3]
            medium_rated.sort(key=lambda x: x["year"])
            high_rated.extend(medium_rated[:6 - len(high_rated)])

        # Sort by rating (desc) then year (asc)
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))

    # ========== FALLBACK: unse 데이터가 전혀 없으면 기본 년도 생성 ==========
    if len(high_rated) < 4 and not has_daeun and not has_annual:
        # 일간 기반으로 향후 10년 운세 생성
        day_master = (saju or {}).get("dayMaster", {})
        dm_name = day_master.get("name") or day_master.get("heavenlyStem") or ""
        dm_element = day_master.get("element") or _get_element_from_stem(dm_name)

        # 오행 상생 관계
        generates = {"목": "화", "화": "토", "토": "금", "금": "수", "수": "목"}
        supports = {"목": "수", "화": "목", "토": "화", "금": "토", "수": "금"}

        # 년도별 천간 (2024-2033)
        year_stems = {
            2024: ("갑", "목"), 2025: ("을", "목"), 2026: ("병", "화"), 2027: ("정", "화"),
            2028: ("무", "토"), 2029: ("기", "토"), 2030: ("경", "금"), 2031: ("신", "금"),
            2032: ("임", "수"), 2033: ("계", "수")
        }

        for year in range(current_year, current_year + 10):
            if year not in year_stems:
                continue
            stem, el = year_stems[year]
            age = year - birth_year

            # 상생/비화 관계에 따른 rating
            rating = 3
            reason = "변화의 기운이 흐르는 해"
            astro_reason = _get_yearly_transit_info(year, astro)

            if el == dm_element:
                rating = 4
                reason = f"같은 {el} 기운으로 힘이 강해지는 해"
            elif dm_element and generates.get(dm_element) == el:
                rating = 3
                reason = f"에너지를 발산하기 좋은 해"
            elif dm_element and supports.get(dm_element) == el:
                rating = 5
                reason = f"{el}이 당신을 생(生)해주는 황금기"

            high_rated.append({
                "year": year,
                "age": age,
                "rating": rating,
                "title": f"{year}년 운세",
                "sajuReason": reason,
                "astroReason": astro_reason,
            })

        # 다시 정렬
        high_rated.sort(key=lambda x: (-x["rating"], x["year"]))

    return high_rated[:8]  # 8개까지 표시


def _calculate_rating(element: str, ten_god: str) -> int:
    """Calculate fortune rating 1-5 based on element and ten god."""
    positive_elements = ["wood", "fire", "목", "화"]
    positive_gods = ["식신", "상관", "정관", "편인", "정재"]

    rating = 3  # Default neutral

    if element and element.lower() in positive_elements:
        rating += 1
    if ten_god and ten_god in positive_gods:
        rating += 1

    # Clamp to 1-5
    return max(1, min(5, rating))


def _calculate_rating_from_sibsin(cheon: str, ji: str) -> int:
    """Calculate fortune rating 1-5 based on sibsin (십신)."""
    positive_sibsin = ["식신", "정재", "정관", "정인"]
    neutral_sibsin = ["비견", "편인", "편재"]
    negative_sibsin = ["상관", "겁재", "편관"]

    rating = 3  # Default neutral

    for sibsin in [cheon, ji]:
        if sibsin in positive_sibsin:
            rating += 0.5
        elif sibsin in negative_sibsin:
            rating -= 0.5

    # Clamp to 1-5
    return max(1, min(5, int(rating + 0.5)))


def _get_element_from_stem(stem: str) -> str:
    """Get element from heavenly stem (천간) name."""
    stem_elements = {
        "갑": "목", "을": "목",
        "병": "화", "정": "화",
        "무": "토", "기": "토",
        "경": "금", "신": "금",
        "임": "수", "계": "수",
        # Hanja versions
        "甲": "목", "乙": "목",
        "丙": "화", "丁": "화",
        "戊": "토", "己": "토",
        "庚": "금", "辛": "금",
        "壬": "수", "癸": "수",
    }
    return stem_elements.get(stem, "")


def _get_daeun_meaning(element: str, sibsin: str) -> str:
    """Generate daeun period meaning based on element and sibsin."""
    element_meanings = {
        "목": "성장과 발전의 시기",
        "화": "활동과 확장의 시기",
        "토": "안정과 축적의 시기",
        "금": "결실과 정리의 시기",
        "수": "지혜와 준비의 시기",
    }
    sibsin_meanings = {
        "식신": "창의력과 표현력이 높아지는 시기",
        "상관": "변화와 도전의 시기",
        "편재": "재물 기회가 많은 시기",
        "정재": "안정적 수입의 시기",
        "편관": "도전과 성장의 시기",
        "정관": "사회적 인정의 시기",
        "편인": "학습과 자기계발의 시기",
        "정인": "지원과 도움이 있는 시기",
        "비견": "경쟁과 협력의 시기",
        "겁재": "적극적 행동의 시기",
    }

    base = element_meanings.get(element, "변화의 시기")
    detail = sibsin_meanings.get(sibsin, "")

    if detail:
        return f"{base}, {detail}"
    return base


def _get_personalized_daeun_meaning(cheon: str, ji: str, element: str, age: int, is_current: bool) -> Dict[str, str]:
    """Generate personalized daeun meaning - 와닿는 메시지로."""
    # 십신별 구체적인 의미
    sibsin_life = {
        "식신": {
            "title": "창작과 향유의 황금기",
            "saju": "당신의 재능이 빛을 발하는 시기예요. 표현력이 극대화되고, 먹고 즐기는 것에서 큰 기쁨을 느낍니다.",
            "astro": "목성의 축복으로 풍요와 행운이 함께합니다",
        },
        "상관": {
            "title": "도전과 혁신의 시기",
            "saju": "기존 틀을 깨고 새로운 길을 개척할 때예요. 반항적이지만 그만큼 창의적인 에너지가 넘칩니다.",
            "astro": "천왕성 트랜짓이 파격적 변화를 예고합니다",
        },
        "편재": {
            "title": "기회와 모험의 시기",
            "saju": "예상치 못한 재물 기회가 찾아와요. 투자, 사업, 부업에서 대박의 가능성이 있습니다.",
            "astro": "금성이 재물궁을 활성화시킵니다",
        },
        "정재": {
            "title": "안정적 성장의 시기",
            "saju": "꾸준히 쌓아온 것들이 결실을 맺어요. 월급, 저축, 부동산 등 안정적인 부의 축적기입니다.",
            "astro": "토성이 재정 기반을 굳건히 합니다",
        },
        "편관": {
            "title": "시련과 성장의 시기",
            "saju": "도전과 압박이 있지만, 이를 극복하면 크게 성장해요. 책임감과 리더십이 강화됩니다.",
            "astro": "명왕성이 내면의 힘을 일깨웁니다",
        },
        "정관": {
            "title": "승진과 인정의 시기",
            "saju": "사회적 지위가 올라가고 인정받는 시기예요. 조직 내 승진, 명예, 자격 취득의 기회입니다.",
            "astro": "태양이 커리어 정점을 비춥니다",
        },
        "편인": {
            "title": "배움과 통찰의 시기",
            "saju": "특별한 지식이나 기술을 습득하는 시기예요. 직관력이 높아지고 영적 성장도 기대됩니다.",
            "astro": "해왕성이 직관과 영감을 높입니다",
        },
        "정인": {
            "title": "보호와 성장의 시기",
            "saju": "귀인의 도움이 있는 시기예요. 학업, 자격증, 부모님의 지원 등 든든한 후원을 받습니다.",
            "astro": "달이 정서적 안정감을 선사합니다",
        },
        "비견": {
            "title": "경쟁과 협력의 시기",
            "saju": "동료나 경쟁자와의 관계가 중요해지는 시기예요. 함께 성장하거나 경쟁에서 이겨야 합니다.",
            "astro": "화성이 경쟁심과 추진력을 높입니다",
        },
        "겁재": {
            "title": "과감한 도전의 시기",
            "saju": "큰 승부를 걸 수 있는 시기예요. 다만 재물 손실 위험도 있으니 신중한 판단이 필요합니다.",
            "astro": "화성과 목성이 대담한 행동을 부추깁니다",
        },
    }

    # 기본 또는 매칭된 데이터
    data = sibsin_life.get(cheon, {
        "title": f"{age}세 10년 운세",
        "saju": f"{element}의 기운이 흐르는 시기입니다",
        "astro": "트랜짓 행성들이 변화를 예고합니다",
    })

    # 현재 대운이면 제목에 표시
    title = data["title"]
    if is_current:
        title = f"🔥 {title} (지금!)"

    return {
        "title": title,
        "saju": data["saju"],
        "astro": data["astro"],
    }


def _get_personalized_annual_meaning(cheon: str, ji: str, year: int, is_current: bool) -> Dict[str, str]:
    """Generate personalized annual meaning - 와닿는 메시지로."""
    sibsin_year = {
        "식신": {
            "title": f"{year}년: 즐거움의 해",
            "saju": "창작, 취미, 맛있는 것을 즐기기 좋은 해예요. 스트레스는 줄이고 행복은 높아집니다.",
            "astro": "목성이 행운을 가져다줍니다",
        },
        "상관": {
            "title": f"{year}년: 혁신의 해",
            "saju": "새로운 시도와 변화가 있는 해예요. 직장을 옮기거나 새 프로젝트를 시작하기 좋습니다.",
            "astro": "천왕성이 변화의 바람을 불어옵니다",
        },
        "편재": {
            "title": f"{year}년: 기회의 해",
            "saju": "뜻밖의 수입이나 투자 기회가 있는 해예요. 사업 확장도 고려해볼 만합니다.",
            "astro": "금성이 재물운을 활성화합니다",
        },
        "정재": {
            "title": f"{year}년: 안정의 해",
            "saju": "꾸준한 노력이 결실을 맺는 해예요. 저축, 부동산, 안정적 수입 증가가 기대됩니다.",
            "astro": "토성이 재정 기반을 강화합니다",
        },
        "편관": {
            "title": f"{year}년: 도전의 해",
            "saju": "어려움이 있지만 극복하면 크게 성장하는 해예요. 자기 단련의 시간입니다.",
            "astro": "명왕성이 변혁을 요구합니다",
        },
        "정관": {
            "title": f"{year}년: 성취의 해",
            "saju": "승진, 합격, 인정을 받는 해예요. 사회적 지위가 올라갑니다.",
            "astro": "태양이 성공을 비춰줍니다",
        },
        "편인": {
            "title": f"{year}년: 학습의 해",
            "saju": "새로운 것을 배우고 성장하는 해예요. 자격증, 공부, 자기계발에 좋습니다.",
            "astro": "해왕성이 영감을 불어넣습니다",
        },
        "정인": {
            "title": f"{year}년: 행운의 해",
            "saju": "귀인의 도움이 있는 해예요. 좋은 사람을 만나고 지원을 받습니다.",
            "astro": "목성이 행운을 선사합니다",
        },
        "비견": {
            "title": f"{year}년: 협력의 해",
            "saju": "함께 일하고 경쟁하는 해예요. 파트너십과 네트워킹이 중요합니다.",
            "astro": "화성이 협업 에너지를 높입니다",
        },
        "겁재": {
            "title": f"{year}년: 모험의 해",
            "saju": "큰 결정을 내릴 수 있는 해예요. 다만 신중함도 필요합니다.",
            "astro": "화성이 대담한 행동을 촉구합니다",
        },
    }

    data = sibsin_year.get(cheon, {
        "title": f"{year}년",
        "saju": "변화의 기운이 흐르는 해입니다",
        "astro": "트랜짓 행성들의 영향이 있습니다",
    })

    title = data["title"]
    if is_current:
        title = f"⭐ {title} (올해)"

    return {
        "title": title,
        "saju": data["saju"],
        "astro": data["astro"],
    }


def _get_element_meaning(element: str) -> str:
    """Get meaning description for element."""
    meanings = {
        "wood": "성장과 새로운 시작",
        "fire": "열정과 확장",
        "earth": "안정과 축적",
        "metal": "결실과 정리",
        "water": "지혜와 유연성",
        "목": "성장과 새로운 시작",
        "화": "열정과 확장",
        "토": "안정과 축적",
        "금": "결실과 정리",
        "수": "지혜와 유연성",
    }
    return meanings.get(element.lower() if element else "", "변화의 시기")


def _get_yearly_transit_info(year: int, astro: Dict[str, Any] = None) -> str:
    """Get yearly transit info for astroReason based on major planetary transits."""
    # Major planetary transits for 2024-2030
    transits = {
        2024: "목성 황소→쌍둥이자리, 토성 물고기자리 - 실용적 확장과 감정적 성숙",
        2025: "토성 양자리 입성(5월), 목성 게자리(7월) - 새 도전과 정서적 풍요",
        2026: "토성 양자리, 목성 게→사자자리 - 자기주도 성장과 자신감 확대",
        2027: "토성 황소자리 입성, 목성 사자자리 - 안정 추구와 창의적 표현",
        2028: "토성 황소자리, 목성 처녀자리 - 현실적 기반과 세부 관리",
        2029: "토성 쌍둥이자리 입성, 목성 천칭자리 - 소통 확장과 관계 조화",
        2030: "토성 쌍둥이자리, 목성 전갈자리 - 지적 성장과 심층 변화",
    }

    # Get user's sun sign for personalized transit
    sun_sign = ""
    if astro:
        planets = astro.get("planets", [])
        sun = next((p for p in planets if p.get("name") == "Sun"), {})
        sun_sign = sun.get("sign", "")

    base_transit = transits.get(year, f"{year}년 주요 행성 트랜짓 영향")

    # Add personalized note if sun sign available
    if sun_sign:
        sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리",
                   "Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리",
                   "Sagittarius":"사수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
        sign_name = sign_ko.get(sun_sign, sun_sign)
        return f"{base_transit} | 태양 {sign_name} 영향"

    return base_transit


def _get_period_advice(element: str, ten_god: str) -> str:
    """Generate advice based on element and ten god."""
    if "재" in (ten_god or ""):
        return "재물 관련 기회를 적극 활용하세요"
    if "관" in (ten_god or ""):
        return "직장/사회적 위치 변화에 주목하세요"
    if "인" in (ten_god or ""):
        return "학습과 자기계발에 좋은 시기입니다"
    if element and element.lower() in ["wood", "목"]:
        return "새로운 도전을 시작하기 좋은 시기입니다"
    if element and element.lower() in ["fire", "화"]:
        return "적극적인 행동이 좋은 결과를 가져옵니다"
    return "변화에 유연하게 대응하세요"


def _get_category_analysis(signals: Dict[str, Any], theme_cross: Dict[str, Any], locale: str = "ko") -> Dict[str, Dict[str, Any]]:
    """Build category analysis from signals. Supports ko/en locales.

    Returns format matching Display.tsx CategoryAnalysis interface:
    - icon: string (emoji)
    - title: string
    - sajuAnalysis: string (detailed saju analysis)
    - astroAnalysis: string (detailed astro analysis)
    - crossInsight: string (combined insight)
    - keywords?: string[]
    """
    categories = {}

    # Map signal keys to display categories with emoji icons
    category_map = {
        "career": {"ko": "커리어", "en": "Career", "icon": "💼"},
        "wealth": {"ko": "재물", "en": "Wealth", "icon": "💰"},
        "love": {"ko": "연애", "en": "Love", "icon": "❤️"},
        "health": {"ko": "건강", "en": "Health", "icon": "🏃"},
    }

    saju_signals = (signals or {}).get("saju", {})
    astro_signals = (signals or {}).get("astro", {})
    astro_meta = astro_signals.get("meta", {})
    saju_meta = saju_signals.get("meta", {})

    for key, meta in category_map.items():
        saju_data = saju_signals.get(key, {})
        astro_data = astro_signals.get(key, {})

        # Build saju analysis text
        saju_analysis = _build_saju_analysis(key, saju_data, saju_meta)

        # Build astro analysis text
        astro_analysis = _build_astro_analysis(key, astro_data, astro_meta)

        # Build cross insight
        cross_insight = _build_cross_insight(key, saju_data, astro_data)

        categories[key] = {
            "icon": meta["icon"],
            "title": meta["ko"],
            "sajuAnalysis": saju_analysis,
            "astroAnalysis": astro_analysis,
            "crossInsight": cross_insight,
        }

    return categories


def _build_saju_analysis(category: str, saju_data: dict, saju_meta: dict) -> str:
    """Build detailed saju analysis text for a category - 한자 없이 구체적으로."""
    parts = []

    # 일간 정보 (한자 제거, 한글로만)
    day_master = saju_meta.get("day_master", "")
    dm_element = saju_meta.get("day_master_element", "")

    # 한자를 한글로 변환
    hanja_to_ko = {
        "甲": "갑목", "乙": "을목", "丙": "병화", "丁": "정화",
        "戊": "무토", "己": "기토", "庚": "경금", "辛": "신금",
        "壬": "임수", "癸": "계수"
    }
    dm_ko = hanja_to_ko.get(day_master, day_master)

    # 오행별 성향
    element_traits = {
        "목": "창의적이고 성장 지향적인",
        "화": "열정적이고 표현력이 뛰어난",
        "토": "안정적이고 신뢰감 있는",
        "금": "결단력 있고 원칙적인",
        "수": "유연하고 지혜로운",
        "wood": "창의적이고 성장 지향적인",
        "fire": "열정적이고 표현력이 뛰어난",
        "earth": "안정적이고 신뢰감 있는",
        "metal": "결단력 있고 원칙적인",
        "water": "유연하고 지혜로운",
    }
    trait = element_traits.get(dm_element, "균형 잡힌")

    if category == "career":
        if saju_data.get("has_officer_sibsin"):
            parts.append(f"{trait} 성향으로 조직에서 인정받기 좋습니다.")
            parts.append("관리직, 공무원, 대기업처럼 체계적인 조직이 잘 맞아요.")
            parts.append("직급과 타이틀이 중요하다면 꾸준히 커리어를 쌓아보세요.")
        else:
            parts.append(f"{trait} 성향이라 자율성이 높은 환경에서 빛납니다.")
            parts.append("스타트업, 프리랜서, 창업 등 유연한 환경이 더 맞을 수 있어요.")
            parts.append("본인만의 전문성을 키워 나만의 무기를 만드세요.")

    elif category == "wealth":
        if saju_data.get("has_wealth_sibsin"):
            parts.append(f"{trait} 성향으로 재물 감각이 뛰어납니다.")
            parts.append("투자나 사업에서 기회를 잘 포착하는 타입이에요.")
            parts.append("다만 과욕은 금물, 리스크 관리도 함께 하세요.")
        else:
            parts.append(f"{trait} 성향으로 전문성을 통해 수입을 만듭니다.")
            parts.append("꾸준한 실력 쌓기가 장기적 재정 안정의 열쇠예요.")
            parts.append("급하게 벌려고 하지 말고, 본업에 집중하세요.")

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        if sinsal_count > 0:
            parts.append(f"{trait} 매력으로 이성에게 관심을 끌기 좋아요.")
            parts.append("만남의 기회가 많은 편이니 좋은 인연을 신중히 선택하세요.")
            parts.append("외모보다 내면을 보는 안목이 중요해요.")
        else:
            parts.append(f"{trait} 성향으로 진지하고 깊은 관계를 추구합니다.")
            parts.append("첫인상보다 시간이 지나면서 매력이 드러나는 타입이에요.")
            parts.append("서두르지 말고 천천히 알아가세요.")

    elif category == "health":
        # 오행별 주의 기관
        element_health = {
            "목": ("간, 담낭, 눈", "스트레스 관리와 충분한 수면이 중요해요"),
            "화": ("심장, 혈관, 소장", "과로를 피하고 심장 건강에 신경 쓰세요"),
            "토": ("위장, 비장, 소화기", "규칙적인 식사와 소화기 관리가 핵심이에요"),
            "금": ("폐, 대장, 피부", "호흡기 건강과 피부 관리에 주의하세요"),
            "수": ("신장, 방광, 생식기", "수분 섭취와 하체 운동이 도움됩니다"),
        }
        el_key = dm_element if dm_element in element_health else "토"
        organs, advice = element_health.get(el_key, ("전반적인 건강", "균형 잡힌 생활이 중요해요"))
        parts.append(f"{trait} 체질이라 {organs} 쪽을 신경 쓰세요.")
        parts.append(advice)

    return " ".join(parts) if parts else "개인 맞춤 분석을 위해 더 많은 정보가 필요합니다."


def _build_astro_analysis(category: str, astro_data: dict, astro_meta: dict) -> str:
    """Build detailed astro analysis text for a category - 구체적인 행성/별자리 정보 포함."""
    parts = []

    # 별자리 한글화
    sign_ko = {
        "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리", "Cancer": "게자리",
        "Leo": "사자자리", "Virgo": "처녀자리", "Libra": "천칭자리", "Scorpio": "전갈자리",
        "Sagittarius": "사수자리", "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
    }

    # MC별 커리어 적성
    mc_careers = {
        "Aries": "리더십, 스포츠, 군/경찰, 스타트업 창업",
        "Taurus": "금융, 부동산, 예술, 요리/식품업",
        "Gemini": "미디어, 마케팅, 교육, 커뮤니케이션",
        "Cancer": "의료, 복지, 요식업, 부동산",
        "Leo": "엔터테인먼트, 경영, 패션, 정치",
        "Virgo": "의료, IT, 편집, 품질관리",
        "Libra": "법률, 외교, 디자인, 예술",
        "Scorpio": "심리학, 수사, 금융, 연구",
        "Sagittarius": "교육, 여행, 출판, 무역",
        "Capricorn": "경영, 정치, 건축, 관리직",
        "Aquarius": "IT, 과학, 사회운동, 방송",
        "Pisces": "예술, 의료, 영성, 사회복지"
    }

    if category == "career":
        mc_sign = astro_data.get("mc_sign", "")
        if mc_sign:
            careers = mc_careers.get(mc_sign, "다양한 분야")
            parts.append(f"{sign_ko.get(mc_sign, mc_sign)} 성향 - {careers} 분야에 적성이 있어요.")
        planets = astro_data.get("planets_in_career_houses", [])
        if planets:
            planet_ko = {"Jupiter": "목성(확장)", "Saturn": "토성(책임)", "Mars": "화성(추진력)", "Sun": "태양(리더십)"}
            planet_names = [planet_ko.get(str(p[0]) if isinstance(p, tuple) else str(p), str(p)) for p in planets[:2]]
            parts.append(f"커리어 영역에 {', '.join(planet_names)}이 있어 성장 가능성이 높아요.")
        if not mc_sign and not planets:
            parts.append("꾸준한 노력과 네트워킹이 성공의 열쇠입니다.")

    elif category == "wealth":
        pof_house = astro_data.get("pof_house", 0)
        pof_meanings = {
            1: "자신의 노력으로 직접 부를 창출",
            2: "안정적인 수입과 저축 능력",
            3: "소통, 글쓰기, 교육을 통한 수입",
            4: "부동산, 가업, 상속 가능성",
            5: "창의력, 투기, 연예 관련 수입",
            6: "서비스업, 건강 관련 직종에서 수입",
            7: "파트너십, 결혼, 계약을 통한 부",
            8: "투자, 상속, 보험 관련 이득",
            9: "해외, 교육, 출판 관련 수입",
            10: "커리어 성공을 통한 고수입",
            11: "네트워크, 단체활동을 통한 이득",
            12: "비밀스러운 수입원, 영적 직업"
        }
        if pof_house:
            meaning = pof_meanings.get(pof_house, "다양한 경로로 부를 축적")
            parts.append(f"행운 포인트 - {meaning}이 유리해요.")
        benefics = astro_data.get("benefics_in_money_houses", [])
        if benefics:
            parts.append("행운의 별이 있어 금전운이 좋은 편이에요.")
        if not pof_house and not benefics:
            parts.append("장기 투자와 꾸준한 저축이 부의 축적에 유리합니다.")

    elif category == "love":
        venus_sign = astro_meta.get("venus_sign", "")
        mars_sign = astro_meta.get("mars_sign", "")

        venus_love = {
            "Aries": "열정적이고 직접적인 사랑 표현",
            "Taurus": "안정적이고 감각적인 사랑",
            "Gemini": "지적 교감과 대화가 중요",
            "Cancer": "헌신적이고 가정적인 사랑",
            "Leo": "드라마틱하고 관대한 사랑",
            "Virgo": "세심하고 실용적인 사랑 표현",
            "Libra": "로맨틱하고 조화로운 관계 추구",
            "Scorpio": "깊고 강렬한 사랑",
            "Sagittarius": "자유롭고 모험적인 사랑",
            "Capricorn": "진지하고 책임감 있는 사랑",
            "Aquarius": "독특하고 우정 같은 사랑",
            "Pisces": "낭만적이고 희생적인 사랑"
        }
        if venus_sign:
            style = venus_love.get(venus_sign, "독특한 방식의 사랑")
            parts.append(f"금성 {sign_ko.get(venus_sign, venus_sign)} - {style}을 원해요.")
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if planets:
            parts.append("관계 영역에 주요 행성이 있어 연애 기회가 많은 편이에요.")
        if not venus_sign and not planets:
            parts.append("진심 어린 소통이 좋은 인연을 만드는 열쇠입니다.")

    elif category == "health":
        asc_sign = astro_meta.get("asc_sign", "")

        # 상승궁별 건강 주의점
        asc_health = {
            "Aries": "두통, 안면부, 급성 질환 주의",
            "Taurus": "목, 갑상선, 과식 주의",
            "Gemini": "호흡기, 신경계, 손 주의",
            "Cancer": "위장, 유방, 감정적 과식 주의",
            "Leo": "심장, 등, 혈압 관리",
            "Virgo": "소화기, 장, 스트레스성 질환",
            "Libra": "신장, 허리, 균형 유지",
            "Scorpio": "생식기, 배설계, 과로 주의",
            "Sagittarius": "간, 허벅지, 과음 주의",
            "Capricorn": "뼈, 관절, 피부 관리",
            "Aquarius": "순환계, 발목, 불규칙한 생활 주의",
            "Pisces": "발, 면역계, 수면 관리"
        }
        if asc_sign:
            health_note = asc_health.get(asc_sign, "전반적인 건강 관리")
            parts.append(f"상승궁 {sign_ko.get(asc_sign, asc_sign)} - {health_note}가 필요해요.")
        malefics = astro_data.get("malefics_in_health_houses", [])
        if malefics:
            parts.append("건강 영역에 긴장성 행성이 있으니 예방 관리가 중요합니다.")
        if not asc_sign:
            parts.append("규칙적인 생활과 적당한 운동이 건강 유지의 핵심이에요.")

    return " ".join(parts) if parts else "개인 맞춤 분석을 위해 더 많은 정보가 필요합니다."


def _build_cross_insight(category: str, saju_data: dict, astro_data: dict) -> str:
    """Build combined cross-system insight - 구체적인 조언으로."""
    if category == "career":
        has_officer = saju_data.get("has_officer_sibsin", False)
        mc_sign = astro_data.get("mc_sign", "")
        if has_officer and mc_sign:
            return "조직 적성이 보여요. 체계적인 조직에서 승진 가능성이 높습니다. 직급과 명예를 중시하는 분위기가 맞아요."
        elif has_officer:
            return "조직 적성이 보여요. 안정적인 회사에서 경력을 쌓는 게 유리합니다. 꾸준함이 당신의 무기예요."
        elif mc_sign:
            return "자신만의 길을 개척해보세요. 다양한 경험이 성장의 밑거름이 됩니다."
        return "자신의 강점을 살린 커리어 전략이 필요해요. 다양한 경험이 도움됩니다. 남들과 다른 나만의 무기를 만드세요."

    elif category == "wealth":
        has_wealth = saju_data.get("has_wealth_sibsin", False)
        pof = astro_data.get("pof_house", 0)
        if has_wealth and pof:
            return "재물 감각이 있고, 금전운이 좋아요. 적극적인 투자도 괜찮지만 분산투자를 권합니다."
        elif has_wealth:
            return "재물 감각이 있어요. 기회가 왔을 때 과감히 잡되, 리스크 관리도 함께하세요. 한방보다는 꾸준한 축적이 낫습니다."
        elif pof:
            return "수입 창출에 집중하면 재정 안정이 빨라져요. 본업에 충실하면서 부수입도 고민해보세요."
        return "꾸준한 저축과 실력 쌓기가 장기적 부의 기반입니다. 급하게 벌려 하지 말고 착실하게 모아가세요."

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if sinsal_count > 0 and planets:
            return "만남의 기회도 많고 매력도 있어요. 좋은 인연을 신중히 선택하는 게 관건입니다. 첫인상보다 내면을 보세요."
        elif sinsal_count > 0:
            return "인연이 많은 편이에요. 진정성 있는 관계에 집중하면 좋은 결과가 있어요. 조급하지 않게 천천히 알아가세요."
        elif planets:
            return "연애 에너지가 활발해요. 자신을 솔직히 표현하면 좋은 만남이 와요. 자연스러운 게 가장 좋아요."
        return "시간을 두고 깊이 알아가는 관계가 오래갑니다. 서두르지 마세요. 인연은 준비된 사람에게 옵니다."

    elif category == "health":
        weak_elements = [k for k, v in (saju_data.get("five_element_flags", {}) or {}).items() if v == "weak"]
        malefics = astro_data.get("malefics_in_health_houses", [])
        if weak_elements and malefics:
            return "건강 관리에 주의가 필요해요. 정기 검진을 권합니다. 예방이 최선의 치료예요."
        elif weak_elements:
            return "체질에 맞는 건강 관리를 해주세요. 예방이 중요합니다. 정기 건강검진을 추천해요."
        elif malefics:
            return "스트레스 관리와 규칙적인 생활이 건강 유지의 핵심이에요. 과로하지 말고 충분히 쉬세요."
        return "전반적으로 양호하지만, 과로를 피하고 균형 잡힌 생활을 유지하세요. 건강할 때 건강을 챙기세요."

    return "동양과 서양의 지혜를 종합해 나에게 맞는 방향을 찾아보세요. 운명은 정해진 것이 아니라 만들어가는 것입니다."


def _get_category_keywords(category: str, saju_data: dict, astro_data: dict) -> List[str]:
    """Generate relevant keywords for the category."""
    base_keywords = {
        "career": ["승진", "이직", "적성", "리더십"],
        "wealth": ["재물", "투자", "저축", "수입"],
        "love": ["인연", "소통", "매력", "관계"],
        "health": ["활력", "균형", "휴식", "운동"],
    }
    return base_keywords.get(category, [])


def _get_key_insights(theme_cross: Dict[str, Any], signals: Dict[str, Any], saju: Dict[str, Any] = None, locale: str = "ko") -> List[Dict[str, Any]]:
    """Extract key insights from cross analysis.

    Returns format matching Display.tsx KeyInsight interface:
    - type: "strength" | "opportunity" | "caution" | "advice"
    - text: string
    - icon?: string
    Supports locales: ko (Korean), en (English)
    """
    insights = []
    seen_texts = set()  # 중복 방지용
    saju = saju or {}
    is_en = locale == "en"

    # 일간 정보 가져오기
    dm, dm_el = _normalize_day_master(saju)
    dm_profile = DAY_MASTER_PROFILES.get(dm, {})

    saju_meta = (signals or {}).get("saju", {}).get("meta", {})
    astro_meta = (signals or {}).get("astro", {}).get("meta", {})

    hanja_to_hangul = {"木": "목", "火": "화", "土": "토", "金": "금", "水": "수"}

    # 오행을 쉬운 말로 설명
    el_simple = {
        "목": "나무",
        "화": "불",
        "토": "흙",
        "금": "금속",
        "수": "물",
    }
    el_simple_en = {
        "목": "Wood",
        "화": "Fire",
        "토": "Earth",
        "금": "Metal",
        "수": "Water",
    }

    # 십신을 쉬운 말로 설명
    sibsin_simple = {
        "비견": "경쟁과 협력",
        "겁재": "도전과 추진",
        "식신": "창의와 표현",
        "상관": "자유와 변화",
        "편재": "활동적 재물운",
        "정재": "안정적 재물운",
        "편관": "도전과 성장",
        "정관": "승진과 인정",
        "편인": "배움과 변화",
        "정인": "도움과 지원",
    }
    sibsin_simple_en = {
        "비견": "Competition & Cooperation",
        "겁재": "Challenge & Drive",
        "식신": "Creativity & Expression",
        "상관": "Freedom & Change",
        "편재": "Active Wealth",
        "정재": "Stable Wealth",
        "편관": "Challenge & Growth",
        "정관": "Promotion & Recognition",
        "편인": "Learning & Change",
        "정인": "Support & Guidance",
    }

    # ========== 1. 당신의 타입 ==========
    if dm and dm_profile:
        if is_en:
            el_name = el_simple_en.get(dm_el, dm_el)
            personality_short_en = {
                "목": "Strong leadership, pursuing growth",
                "화": "Bright and passionate, illuminating surroundings",
                "토": "Dependable and trustworthy, a solid anchor",
                "금": "Decisive and pursuing perfection",
                "수": "Wise and adaptable",
            }
            dm_text = f"You're a '{el_name}' type! {personality_short_en.get(dm_el, 'Unique charm')}"
        else:
            el_name = el_simple.get(dm_el, dm_el)
            personality_short = {
                "목": "리더십이 강하고 성장을 추구해요",
                "화": "밝고 열정적이며 주변을 밝혀요",
                "토": "듬직하고 신뢰감 있는 중심이에요",
                "금": "결단력 있고 완벽을 추구해요",
                "수": "지혜롭고 유연하게 적응해요",
            }
            dm_text = f"당신은 '{el_name}' 타입! {personality_short.get(dm_el, '독특한 매력이 있어요')}"
        if dm_text not in seen_texts:
            insights.append({
                "type": "strength",
                "text": dm_text,
                "icon": "✨"
            })
            seen_texts.add(dm_text)

    # ========== 2. 행운을 부르는 기운 ==========
    advanced = saju.get("advancedAnalysis", {})
    yongsin_data = advanced.get("yongsin", {})
    if isinstance(yongsin_data, dict):
        yongsin = yongsin_data.get("element") or yongsin_data.get("name") or ""
    else:
        yongsin = str(yongsin_data) if yongsin_data else ""
    if not yongsin:
        yongsin = saju_meta.get("yongsin") or saju_meta.get("yong_sin") or ""

    if yongsin:
        yongsin_hangul = hanja_to_hangul.get(yongsin, yongsin)
        if is_en:
            yongsin_name = el_simple_en.get(yongsin_hangul, yongsin_hangul)
            lucky_tip_en = {
                "목": "Green clothes, plants, and east direction bring luck",
                "화": "Red color, south direction, and bright lighting are good",
                "토": "Yellow color, center position, and ceramic items help",
                "금": "White color, west direction, and metal accessories are good",
                "수": "Black/blue colors, north direction, and water-related items are good",
            }
            yongsin_text = f"'{yongsin_name}' energy is your lucky key! {lucky_tip_en.get(yongsin_hangul, '')}"
        else:
            yongsin_name = el_simple.get(yongsin_hangul, yongsin_hangul)
            lucky_tip = {
                "목": "초록색 옷, 식물, 동쪽 방향이 행운을 불러요",
                "화": "빨간색, 남쪽 방향, 밝은 조명이 좋아요",
                "토": "노란색, 중앙, 도자기 소품이 도움돼요",
                "금": "흰색, 서쪽 방향, 금속 액세서리가 좋아요",
                "수": "검정/파랑색, 북쪽 방향, 물 관련 소품이 좋아요",
            }
            yongsin_text = f"'{yongsin_name}' 기운이 행운의 열쇠! {lucky_tip.get(yongsin_hangul, '')}"
        if yongsin_text not in seen_texts:
            insights.append({
                "type": "strength",
                "text": yongsin_text,
                "icon": "🍀"
            })
            seen_texts.add(yongsin_text)

    # ========== 3. 지금 10년 운세 (대운) ==========
    unse = saju.get("unse", {})
    daeun = unse.get("daeun", [])
    if daeun:
        cur_d = daeun[0] if daeun else {}
        d_sibsin = _get_sibsin_value(cur_d.get("sibsin"), "cheon", "")
        d_age = cur_d.get("age", 0)
        if is_en:
            sibsin_meaning = sibsin_simple_en.get(d_sibsin, "Change")
            if d_sibsin:
                daeun_text = f"Your current decade is a time of '{sibsin_meaning}' (from age {d_age})"
        else:
            sibsin_meaning = sibsin_simple.get(d_sibsin, "변화")
            if d_sibsin:
                daeun_text = f"지금 10년은 '{sibsin_meaning}'의 시기예요 ({d_age}세~)"
        if d_sibsin and daeun_text not in seen_texts:
            insights.append({
                "type": "opportunity",
                "text": daeun_text,
                "icon": "🌊"
            })
            seen_texts.add(daeun_text)

    # ========== 4. 올해 운세 ==========
    now = datetime.now()
    annual = unse.get("annual", [])
    cur_annual = next((a for a in annual if a.get("year") == now.year), {})
    if cur_annual:
        a_sibsin = _get_sibsin_value(cur_annual.get("sibsin"), "cheon", "")
        if is_en:
            sibsin_meaning = sibsin_simple_en.get(a_sibsin, "Change")
            annual_tip_en = {
                "비견": "Cooperating with colleagues creates synergy",
                "겁재": "Bold challenges create opportunities",
                "식신": "Creativity shines and good things happen",
                "상관": "Don't fear change, embrace the new",
                "편재": "Active movement brings money",
                "정재": "Steady saving builds wealth",
                "편관": "Challenges bring growth opportunities",
                "정관": "A great year for promotion and recognition",
                "편인": "Try new studies or certifications",
                "정인": "Mentors appear to help you",
            }
            tip = annual_tip_en.get(a_sibsin, "Good energy flows")
            if a_sibsin:
                annual_text = f"{now.year} is a year of '{sibsin_meaning}'! {tip}"
        else:
            sibsin_meaning = sibsin_simple.get(a_sibsin, "변화")
            annual_tip = {
                "비견": "동료와 협력하면 시너지가 나요",
                "겁재": "과감한 도전이 기회를 만들어요",
                "식신": "창의력이 빛나고 맛있는 일이 생겨요",
                "상관": "변화를 두려워 말고 새로움을 즐기세요",
                "편재": "활발히 움직이면 돈이 들어와요",
                "정재": "꾸준히 모으면 재물이 쌓여요",
                "편관": "도전이 있지만 성장의 기회예요",
                "정관": "승진, 합격, 인정받는 좋은 해예요",
                "편인": "새로운 공부나 자격증 도전해보세요",
                "정인": "귀인이 나타나 도움을 받아요",
            }
            tip = annual_tip.get(a_sibsin, "좋은 흐름이에요")
            if a_sibsin:
                annual_text = f"{now.year}년은 '{sibsin_meaning}'의 해! {tip}"
        if a_sibsin and annual_text not in seen_texts:
            insights.append({
                "type": "opportunity",
                "text": annual_text,
                "icon": "⭐"
            })
            seen_texts.add(annual_text)

    # ========== 5. 실천 조언 ==========
    if dm_el:
        if is_en:
            action_advice_en = {
                "목": "Great time to start new challenges. Don't hesitate - take the first step!",
                "화": "Step forward actively and get noticed. Express yourself with confidence!",
                "토": "Consistency is your weapon. Don't rush, build step by step!",
                "금": "Time to organize and decide. Don't delay, finish cleanly!",
                "수": "Trust your intuition. Ride the flow and opportunities will come!",
            }
            advice_text = action_advice_en.get(dm_el, "Pursue a balanced life")
        else:
            action_advice = {
                "목": "새로운 도전을 시작하기 좋은 때예요. 망설이지 말고 첫걸음을 내딛으세요!",
                "화": "적극적으로 나서면 주목받아요. 자신감을 가지고 표현하세요!",
                "토": "꾸준함이 무기예요. 조급해하지 말고 차근차근 쌓아가세요!",
                "금": "정리하고 결단할 때예요. 미루지 말고 깔끔하게 마무리하세요!",
                "수": "직감을 믿으세요. 흐름을 타면 좋은 기회가 찾아옵니다!",
            }
            advice_text = action_advice.get(dm_el, "균형 잡힌 삶을 추구하세요")
        if advice_text not in seen_texts:
            insights.append({
                "type": "advice",
                "text": advice_text,
                "icon": "💪"
            })
            seen_texts.add(advice_text)

    # ========== 6. 주의할 점 ==========
    if dm_profile:
        if is_en:
            weakness_tips_en = {
                "목": "Don't be stubborn - listen to other opinions. Flexibility is the key to success",
                "화": "You'll regret acting on impulse. Pause before deciding. Some coolness is needed",
                "토": "Fearing change means missing opportunities. Try new things too",
                "금": "Chasing perfection is exhausting. 80% is good enough",
                "수": "Being too passive lets opportunities pass. Reach out first. Be brave",
            }
            caution_text = weakness_tips_en.get(dm_el, "Don't overdo it, take breaks")
        else:
            weakness_tips = {
                "목": "고집부리지 말고 다른 의견도 들어보세요. 유연함이 성공의 열쇠예요",
                "화": "흥분하면 후회해요. 한 박자 쉬고 결정하세요. 냉정함도 필요해요",
                "토": "변화를 두려워하면 기회를 놓쳐요. 새로운 것도 시도해보세요",
                "금": "완벽하려다 지쳐요. 적당히도 괜찮아요. 80%면 충분합니다",
                "수": "너무 수동적이면 기회가 지나가요. 먼저 다가가세요. 용기를 내세요",
            }
            caution_text = weakness_tips.get(dm_el, "무리하지 말고 쉬어가세요")
        if caution_text not in seen_texts:
            insights.append({
                "type": "caution",
                "text": caution_text,
                "icon": "⚠️"
            })
            seen_texts.add(caution_text)

    # 최소 3개 보장
    if len(insights) < 3:
        if is_en:
            insights.append({
                "type": "advice",
                "text": "Trust the current flow and keep moving forward!",
                "icon": "🌟"
            })
        else:
            insights.append({
                "type": "advice",
                "text": "지금의 흐름을 믿고 꾸준히 나아가세요!",
                "icon": "🌟"
            })

    return insights[:6]  # Limit to 6 insights


def _get_lucky_elements(signals: Dict[str, Any], saju: Dict[str, Any], locale: str = "ko") -> Dict[str, Any]:
    """Extract lucky elements from analysis. Supports ko/en locales."""
    meta = (signals or {}).get("astro", {}).get("meta", {})
    saju_meta = (signals or {}).get("saju", {}).get("meta", {})

    # Dominant element
    dominant = meta.get("dominant_element") or saju_meta.get("dominant_element") or "wood"

    # Element to color/direction/item mapping (Korean)
    element_map = {
        "wood": {
            "colors": ["초록색", "청색"],
            "directions": ["동쪽"],
            "numbers": [3, 8],
            "items": ["식물", "나무 소품", "녹색 액세서리"]
        },
        "fire": {
            "colors": ["빨간색", "보라색"],
            "directions": ["남쪽"],
            "numbers": [2, 7],
            "items": ["캔들", "붉은 소품", "조명"]
        },
        "earth": {
            "colors": ["노란색", "갈색"],
            "directions": ["중앙"],
            "numbers": [5, 10],
            "items": ["도자기", "크리스탈", "황토 제품"]
        },
        "metal": {
            "colors": ["흰색", "금색"],
            "directions": ["서쪽"],
            "numbers": [4, 9],
            "items": ["금속 액세서리", "은 제품", "시계"]
        },
        "water": {
            "colors": ["검정색", "남색"],
            "directions": ["북쪽"],
            "numbers": [1, 6],
            "items": ["수정", "분수", "파란색 소품"]
        },
        "air": {
            "colors": ["하늘색", "은색"],
            "directions": ["동쪽"],
            "numbers": [3, 7],
            "items": ["바람개비", "깃털 소품", "창가 장식"]
        },
    }

    lucky = element_map.get(dominant.lower() if dominant else "wood", element_map["wood"])

    return {
        "colors": lucky["colors"],
        "directions": lucky["directions"],
        "numbers": lucky["numbers"],
        "items": lucky["items"]
    }


def _get_saju_highlight(saju: Dict[str, Any], locale: str = "ko") -> Optional[Dict[str, str]]:
    """Get main saju highlight. Supports ko/en locales."""
    day_master = (saju or {}).get("dayMaster", {})
    if day_master:
        # Handle both flat { name, element } and nested { heavenlyStem: { name, element } }
        if isinstance(day_master, dict):
            if day_master.get("heavenlyStem"):
                hs = day_master.get("heavenlyStem", {})
                dm_name = hs.get("name", "") if isinstance(hs, dict) else hs
                dm_element = hs.get("element", "") if isinstance(hs, dict) else day_master.get("element", "")
            else:
                dm_name = day_master.get("name", "")
                dm_element = day_master.get("element", "")
        else:
            dm_name = str(day_master)
            dm_element = ""

        if dm_name:
            return {
                "pillar": dm_name,
                "element": dm_element,
                "meaning": f"{dm_element} 성향 - 당신의 본질적 에너지"
            }
    return None


def _get_astro_highlight(astro: Dict[str, Any], signals: Dict[str, Any], locale: str = "ko") -> Optional[Dict[str, str]]:
    """Get main astro highlight."""
    planets = (astro or {}).get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), None)

    if sun:
        return {
            "planet": "Sun",
            "sign": sun.get("sign", ""),
            "meaning": f"태양 {sun.get('sign', '')} - 핵심 정체성과 삶의 목적"
        }
    return None


def _normalize_day_master(saju: Dict) -> tuple:
    """Normalize dayMaster to (name, element) tuple."""
    dm = (saju.get("dayMaster") or {})
    if isinstance(dm, dict):
        if dm.get("heavenlyStem"):
            hs = dm.get("heavenlyStem", {})
            name = hs.get("name", "") if isinstance(hs, dict) else hs
            element = hs.get("element", "") if isinstance(hs, dict) else dm.get("element", "")
        else:
            name = dm.get("name", "")
            element = dm.get("element", "")
    else:
        name = str(dm) if dm else ""
        element = ""
    return name, element


def _get_theme_sections(theme: str, saju: Dict, astro: Dict, locale: str = "ko") -> List[Dict[str, Any]]:
    """Generate theme-specific sections for 9 themes - 구체적이고 재미있는 내용!
    Supports locale: 'ko' (Korean), 'en' (English)
    """
    is_en = locale == "en"
    day_master, day_el = _normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    mc = astro.get("mc", {})
    asc = astro.get("ascendant", {})
    sun_s, moon_s = sun.get("sign", ""), moon.get("sign", "")
    venus_s, mars_s = venus.get("sign", ""), mars.get("sign", "")
    sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리","Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리","Sagittarius":"사수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
    el_ko = {"목":"목(木)","화":"화(火)","토":"토(土)","금":"금(金)","수":"수(水)"}
    now = datetime.now()
    dow = ["월","화","수","목","금","토","일"][now.weekday()]
    unse = saju.get("unse", {})
    daeun = unse.get("daeun", [])
    annual = unse.get("annual", [])

    # 일간 프로필 가져오기
    dm_profile = DAY_MASTER_PROFILES.get(day_master, {})
    zodiac_sun = ZODIAC_PROFILES.get(sun_s, {})
    zodiac_venus = ZODIAC_PROFILES.get(venus_s, {})
    zodiac_moon = ZODIAC_PROFILES.get(moon_s, {})

    # DEBUG logging removed to avoid Windows encoding errors

    # Calculate user age from birthDate in facts
    # birthDate can be in saju.facts.birthDate OR saju.birthDate (direct)
    user_age = 30  # default
    birth_year = None
    facts = saju.get("facts", {})
    birth_date = facts.get("birthDate") or saju.get("birthDate") or ""

    # Also try to infer from first daeun entry if birthDate is missing
    if not birth_date and daeun:
        # First daeun age helps us calculate birth year
        first_daeun_age = daeun[0].get("age", 0)
        # First daeun typically starts at age 1-10
        # We can estimate birth year if we know current age from annual data
        if annual:
            first_annual_year = annual[0].get("year", now.year)
            # Rough estimate: current year is first annual year
            # So user is approximately (first_annual_year - birth_year) years old
            # But we don't know birth year... try estimating from daeun list
            pass

    if birth_date and len(birth_date) >= 4:
        try:
            birth_year = int(birth_date[:4])
            user_age = now.year - birth_year
        except (ValueError, TypeError):
            pass
    else:
        # Fallback: try to infer user_age from daeun ages
        # If we have daeun data, find the most likely current daeun
        # based on reasonable age assumptions (20-60)
        if daeun and len(daeun) >= 3:
            # Pick middle-range daeun as likely current
            mid_idx = min(3, len(daeun) - 1)  # age 33 typically
            estimated_age = daeun[mid_idx].get("age", 30) + 2  # +2 years into the daeun
            user_age = estimated_age

    # Find current daeun by age (each daeun covers 10 years from its start age)
    cur_daeun = {}
    next_daeun = {}
    for i, d in enumerate(daeun):
        d_age = d.get("age", 0)
        if d_age <= user_age < d_age + 10:
            cur_daeun = d
            if i + 1 < len(daeun):
                next_daeun = daeun[i + 1]
            break

    # 현재/내년 세운 가져오기
    cur_annual = next((a for a in annual if a.get("year") == now.year), {})
    next_annual = next((a for a in annual if a.get("year") == now.year + 1), {})

    # 현재 대운 십신 (문자열 또는 객체 형태 모두 지원)
    cur_daeun_sibsin = cur_daeun.get("sibsin", {})
    if isinstance(cur_daeun_sibsin, str):
        # 문자열이면 십신 이름 직접 사용
        cur_cheon = cur_daeun_sibsin
        cur_ji = ""
    else:
        cur_cheon = cur_daeun_sibsin.get("cheon", "") if cur_daeun_sibsin else ""
        cur_ji = cur_daeun_sibsin.get("ji", "") if cur_daeun_sibsin else ""
    sibsin_info = SIBSIN_MEANINGS.get(cur_cheon, {})

    # 세운 십신 (문자열 또는 객체 형태 모두 지원)
    annual_sibsin = cur_annual.get("sibsin", {})
    if isinstance(annual_sibsin, str):
        annual_cheon = annual_sibsin
    else:
        annual_cheon = annual_sibsin.get("cheon", "") if annual_sibsin else ""
    annual_sibsin_info = SIBSIN_MEANINGS.get(annual_cheon, {})

    if theme == "fortune_today":
        # 일진 가져오기
        iljin = unse.get("iljin", [])
        today_iljin = next((i for i in iljin if i.get("day") == now.day and i.get("month") == now.month), {})
        iljin_sibsin = today_iljin.get("sibsin", {})
        if isinstance(iljin_sibsin, str):
            iljin_cheon = iljin_sibsin
        else:
            iljin_cheon = iljin_sibsin.get("cheon", "") if iljin_sibsin else ""
        is_gwiin = today_iljin.get("isCheoneulGwiin", False)

        daily_tip = SIBSIN_MEANINGS.get(iljin_cheon, {}).get("timing", "평온한 하루")
        gwiin_msg = "🌟 천을귀인일! 귀인의 도움이 있는 날" if is_gwiin else ""

        # 구체적인 일진 해석
        iljin_ganji = f"{today_iljin.get('heavenlyStem','')}{today_iljin.get('earthlyBranch','')}"
        iljin_detail = SIBSIN_MEANINGS.get(iljin_cheon, {})

        # 오늘의 구체적 행동 가이드
        today_career = iljin_detail.get("career", "업무에 집중하기 좋은 날")
        today_love = iljin_detail.get("love", "소통이 중요한 날")
        today_wealth = iljin_detail.get("wealth", "지출 관리에 신경 쓰세요")

        # 월운 기반 이번 달 흐름
        monthly = unse.get("monthly", [])
        cur_month = next((m for m in monthly if m.get("month") == now.month and m.get("year") == now.year), {})
        month_cheon = _get_sibsin_value(cur_month.get("sibsin"), "cheon", "")

        # 점성학 달 에너지 (문페이즈 간단 추정)
        moon_day = now.day
        moon_phase = "초승달" if moon_day < 8 else "상현달" if moon_day < 15 else "보름달" if moon_day < 22 else "하현달"
        moon_energy = {
            "초승달": "새로운 시작, 계획 수립",
            "상현달": "적극 실행, 추진력 발휘",
            "보름달": "결실, 완성, 인간관계 활발",
            "하현달": "정리, 휴식, 성찰"
        }

        return [
            {"id":"summary","icon":"☀️","title":"오늘 한줄요약","titleEn":"Summary","content":f"{dow}요일, {iljin_ganji}일 - {iljin_cheon} 에너지가 흐르는 날.\n{gwiin_msg}\n**이번 달 흐름**: {month_cheon}의 달 중 {now.day}일째"},
            {"id":"energy","icon":"⚡","title":"오늘의 에너지","titleEn":"Energy","content":f"**사주**: {daily_tip}\n**점성**: {moon_phase} ({moon_energy.get(moon_phase, '')})\n두 시스템 모두 {'활동적인' if iljin_cheon in ['비견','겁재','식신'] else '신중한'} 에너지를 말하고 있어요!"},
            {"id":"timing","icon":"⏰","title":"좋은 시간대","titleEn":"Best Times","content":f"**오전 9-11시**: {iljin_detail.get('career', '중요 업무 처리')}\n**오후 2-4시**: {iljin_detail.get('love', '소통과 미팅')}\n**저녁 7-9시**: 자기계발, {dm_profile.get('career_fit','').split(',')[0] if dm_profile.get('career_fit') else '관심사'} 관련 활동"},
            {"id":"action","icon":"🎯","title":"오늘 행동 가이드","titleEn":"Action","content":f"**커리어**: {today_career}\n**연애/관계**: {today_love}\n**재물**: {today_wealth}\n\n당신의 강점({dm_profile.get('strengths','').split(',')[0] if dm_profile.get('strengths') else '강점'})을 오늘 특히 발휘하세요!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 오늘은 {iljin_cheon} 에너지 - {iljin_detail.get('meaning', '특별한 날')}\n**점성 분석**: 태양 {sign_ko.get(sun_s,sun_s)}, 달 {sign_ko.get(moon_s,moon_s)} - {zodiac_sun.get('trait','') if zodiac_sun else '당신의 본성'}\n**종합**: 일간 {day_master}({dm_profile.get('element','')})과 오늘 에너지가 {'조화로워요' if iljin_cheon in ['식신','정재','정인'] else '긴장감이 있어요'}"},
            {"id":"reminder","icon":"💫","title":"오늘의 리마인더","titleEn":"Reminder","content":f"⚠️ {dm_profile.get('weaknesses', '과욕').split(',')[0] if dm_profile.get('weaknesses') else '주의점'} 조심!\n✅ {iljin_detail.get('timing', '오늘의 흐름을 타세요')}\n💪 긍정 에너지로 하루를 시작하면 좋은 결과가 따라와요!"}]

    elif theme == "fortune_monthly":
        # 월운 가져오기
        monthly = unse.get("monthly", [])
        cur_month = next((m for m in monthly if m.get("month") == now.month and m.get("year") == now.year), {})
        month_cheon = _get_sibsin_value(cur_month.get("sibsin"), "cheon", "")
        month_info = SIBSIN_MEANINGS.get(month_cheon, {})

        # 다음 달 미리보기
        next_month_data = next((m for m in monthly if m.get("month") == now.month + 1 and m.get("year") == now.year), {})
        next_month_cheon = _get_sibsin_value(next_month_data.get("sibsin"), "cheon", "")

        # 이번 달 간지
        month_ganji = f"{cur_month.get('heavenlyStem','')}{cur_month.get('earthlyBranch','')}"

        # 세운 에너지와 월운 에너지 비교
        year_energy = annual_sibsin_info.get("meaning", "")
        month_energy = month_info.get("meaning", "")

        # 점성학: 태양 별자리 (현재 달 기준)
        sun_trait = zodiac_sun.get("trait", "") if zodiac_sun else ""

        # 구체적인 주간 가이드 (십신 기반)
        week_guide = {
            "식신": {"week1": "새 아이디어 떠올리기", "week2": "창작/기획 본격화", "week3": "협업 진행", "week4": "결과물 완성"},
            "상관": {"week1": "변화 계획 세우기", "week2": "과감한 시도", "week3": "수정 보완", "week4": "새로운 방향 정리"},
            "편재": {"week1": "기회 포착", "week2": "투자 검토", "week3": "수익 실현", "week4": "재정 점검"},
            "정재": {"week1": "예산 수립", "week2": "안정적 수입 관리", "week3": "저축 실행", "week4": "재무 점검"},
            "편관": {"week1": "도전 준비", "week2": "적극 추진", "week3": "난관 극복", "week4": "성과 확인"},
            "정관": {"week1": "계획 정리", "week2": "체계적 실행", "week3": "인정받기", "week4": "책임 완수"},
            "편인": {"week1": "학습 시작", "week2": "정보 수집", "week3": "응용 연습", "week4": "실전 적용"},
            "정인": {"week1": "멘토 만남", "week2": "조언 수용", "week3": "성장 체감", "week4": "감사 표현"},
            "비견": {"week1": "동료 파악", "week2": "협업 시작", "week3": "경쟁/협력", "week4": "성과 나누기"},
            "겁재": {"week1": "목표 설정", "week2": "과감한 도전", "week3": "리스크 관리", "week4": "결과 수용"}
        }
        weeks = week_guide.get(month_cheon, {"week1": "계획 수립", "week2": "적극 실행", "week3": "조율/수정", "week4": "마무리/정리"})

        return [
            {"id":"theme","icon":"🗓️","title":"월간 한줄테마","titleEn":"Theme","content":f"{now.month}월({month_ganji}월)은 **{month_cheon}** 에너지의 달!\n\n💫 {month_info.get('meaning', '변화와 성장의 기회')}\n📊 **세운 흐름**: {annual_cheon}의 해 중 {month_cheon}의 달 - {'에너지가 일치해요!' if annual_cheon == month_cheon else '다른 에너지가 교차해요'}"},
            {"id":"career","icon":"💼","title":"이달 커리어","titleEn":"Career","content":f"**전망**: {month_info.get('career', '꾸준한 노력이 빛나는 시기')}\n**행동**: {dm_profile.get('career_fit','').split(',')[0] if dm_profile.get('career_fit') else '본업'} 관련 전문성 강화\n**주의**: {dm_profile.get('weaknesses','').split(',')[0] if dm_profile.get('weaknesses') else '과욕'} 조심"},
            {"id":"love","icon":"💖","title":"이달 연애","titleEn":"Love","content":f"**분위기**: {month_info.get('love', '진심 어린 소통이 관계를 깊게 합니다')}\n**스타일**: 금성 {sign_ko.get(venus_s,venus_s)} - {zodiac_venus.get('love','') if zodiac_venus else '당신만의 사랑법'}\n**타이밍**: {dm_profile.get('love_timing','좋은 인연을 기다리는 중').split('.')[0] if dm_profile.get('love_timing') else '인연의 시기'}"},
            {"id":"wealth","icon":"💰","title":"이달 재물","titleEn":"Wealth","content":f"**재물운**: {month_info.get('wealth', '계획적인 지출과 저축 추천')}\n**수입 스타일**: {dm_profile.get('wealth_style','안정 추구').split('.')[0] if dm_profile.get('wealth_style') else '재물 관리'}\n**조언**: {'적극 투자 검토' if month_cheon in ['편재','편관'] else '안정적 저축 우선'}"},
            {"id":"weeks","icon":"📅","title":"주간 가이드","titleEn":"Weeks","content":f"**1주차**: {weeks['week1']}\n**2주차**: {weeks['week2']}\n**3주차**: {weeks['week3']}\n**4주차**: {weeks['week4']}\n\n💡 이번 달은 특히 {weeks['week2']} 시기가 중요해요!"},
            {"id":"nextmonth","icon":"🔮","title":"다음 달 미리보기","titleEn":"Next Month","content":f"**{now.month+1}월**: {next_month_cheon} 에너지\n{SIBSIN_MEANINGS.get(next_month_cheon, {}).get('meaning', '새로운 기회')}\n\n미리 준비하면 더 좋은 결과를 만들 수 있어요!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 이달은 {month_cheon} 에너지 - {month_energy}\n**점성 분석**: 태양 {sign_ko.get(sun_s,sun_s)} - {sun_trait}\n**종합**: 일간 {day_master}({dm_profile.get('element','')})에게 이번 달은 {'순조로운' if month_cheon in ['식신','정재','정인'] else '도전적인'} 시기. {'적극 추진!' if month_cheon in ['비견','겁재','편재'] else '신중하게 진행!'}"},
            {"id":"reminder","icon":"💫","title":"이달의 리마인더","titleEn":"Reminder","content":f"✅ {month_info.get('timing', '이번 달의 흐름을 타세요')}\n⚠️ {dm_profile.get('weaknesses','주의사항').split(',')[0] if dm_profile.get('weaknesses') else '균형'} 유지 필요\n💪 {now.month}월을 {month_cheon} 에너지로 잘 마무리하세요!"}]

    elif theme == "fortune_new_year" or theme == "fortune_next_year":
        target_year = now.year if theme == "fortune_new_year" else now.year + 1
        target_annual = cur_annual if theme == "fortune_new_year" else next_annual
        target_cheon = _get_sibsin_value(target_annual.get("sibsin"), "cheon", "")
        target_info = SIBSIN_MEANINGS.get(target_cheon, {})
        ganji = f"{target_annual.get('heavenlyStem','')}{target_annual.get('earthlyBranch','')}"

        # 대운 확인 - 올해가 대운 전환기인지
        is_daeun_change = False
        daeun_change_msg = ""
        for d in daeun:
            if d.get("age") == user_age:
                is_daeun_change = True
                new_daeun_sibsin = _get_sibsin_value(d.get("sibsin"), "cheon", "")
                daeun_change_msg = f"🔥 **중요**: 올해는 대운 전환기! {new_daeun_sibsin} 에너지 시작 - 인생의 새로운 10년이 열려요."
                break

        # 구체적인 분기별 흐름 (십신 기반)
        quarter_guide = {
            "식신": {"q1": "창의적 아이디어 발굴", "q2": "프로젝트 본격화", "q3": "결과물 완성", "q4": "성과 공유 및 수입화"},
            "상관": {"q1": "변화 계획 수립", "q2": "과감한 도전", "q3": "방향 수정", "q4": "새로운 길 확립"},
            "편재": {"q1": "기회 탐색", "q2": "투자 결정", "q3": "수익 실현", "q4": "재투자 계획"},
            "정재": {"q1": "연간 재정 계획", "q2": "안정적 수입 확보", "q3": "저축 강화", "q4": "자산 점검"},
            "편관": {"q1": "목표 설정", "q2": "적극 도전", "q3": "난관 극복", "q4": "성과 확인"},
            "정관": {"q1": "체계적 준비", "q2": "조직 내 인정", "q3": "책임 완수", "q4": "승진/보상"},
            "편인": {"q1": "학습 계획", "q2": "전문 지식 습득", "q3": "실전 적용", "q4": "자격/경력 확보"},
            "정인": {"q1": "멘토 찾기", "q2": "도움 받기", "q3": "성장 체감", "q4": "독립 준비"},
            "비견": {"q1": "네트워크 구축", "q2": "협업 시작", "q3": "경쟁/협력", "q4": "성과 공유"},
            "겁재": {"q1": "과감한 목표", "q2": "전력 투구", "q3": "리스크 관리", "q4": "결과 수용"}
        }
        quarters = quarter_guide.get(target_cheon, {"q1": "준비/계획", "q2": "본격 추진", "q3": "조율/보완", "q4": "결실/마무리"})

        # 올해 주요 월 찾기 (같은 십신 에너지가 겹치는 달)
        key_months = []
        for m in monthly[:12]:
            if m.get("year") == target_year:
                m_sibsin = _get_sibsin_value(m.get("sibsin"), "cheon", "")
                if m_sibsin == target_cheon:
                    key_months.append(f"{m.get('month')}월")
        key_months_str = ", ".join(key_months[:3]) if key_months else "연중 고르게"

        nl = "\n"
        daeun_status = "10년 주기가 바뀌는 전환점!" if is_daeun_change else f'대운 {user_age - cur_daeun.get("age", user_age) + 1}년째 - 안정기'
        reminder_status = "대운 전환기 - 새로운 10년을 준비하세요!" if is_daeun_change else "꾸준함이 성공의 열쇠!"

        return [
            {"id":"theme","icon":"🎊","title":"연간 한줄테마","titleEn":"Theme","content":f"{target_year}년 {ganji}년!{nl}**{target_cheon}** 에너지의 해{nl}{nl}💫 {target_info.get('meaning', '새로운 기회의 해')}{nl}{daeun_change_msg if is_daeun_change else ''}"},
            {"id":"daeun","icon":"📅","title":"대운 흐름","titleEn":"Daeun","content":f"**현재 대운**: {cur_cheon} ({cur_daeun.get('age',user_age)}~{cur_daeun.get('age',user_age)+9}세){nl}**의미**: {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '현재의 에너지')}{nl}{nl}{daeun_status}"},
            {"id":"career","icon":"💼","title":"올해 커리어","titleEn":"Career","content":f"**전망**: {target_info.get('career', '꾸준한 성장이 기대되는 해')}{nl}**적합 분야**: {dm_profile.get('career_fit','').split(',')[0] if dm_profile.get('career_fit') else '본업'}{nl}**행동**: {'적극 추진' if target_cheon in ['비견','겁재','편관'] else '꾸준히 쌓기'}{nl}**주요 시기**: {key_months_str}"},
            {"id":"love","icon":"💖","title":"올해 연애","titleEn":"Love","content":f"**분위기**: {target_info.get('love', '인연의 변화가 있는 해')}{nl}**당신의 매력**: {dm_profile.get('love_style','진심 어린 사랑').split('.')[0] if dm_profile.get('love_style') else '사랑법'}{nl}**연애 시기**: {dm_profile.get('love_timing','좋은 인연').split('.')[0] if dm_profile.get('love_timing') else '인연의 때'}{nl}**주요 월**: {key_months_str} 특히 주목!"},
            {"id":"wealth","icon":"💰","title":"올해 재물","titleEn":"Wealth","content":f"**재물운**: {target_info.get('wealth', '재정 관리가 중요한 해')}{nl}**재물 스타일**: {dm_profile.get('wealth_style','').split('.')[0] if dm_profile.get('wealth_style') else '안정 추구'}{nl}**전략**: {'공격적 투자 검토' if target_cheon in ['편재','겁재'] else '안정적 축적 우선'}{nl}**주의**: {'과욕 경계' if target_cheon in ['편재','겁재'] else '기회 놓치지 않기'}"},
            {"id":"quarters","icon":"📊","title":"분기별 흐름","titleEn":"Quarters","content":f"**1분기(1-3월)**: {quarters['q1']}{nl}**2분기(4-6월)**: {quarters['q2']}{nl}**3분기(7-9월)**: {quarters['q3']}{nl}**4분기(10-12월)**: {quarters['q4']}{nl}{nl}💡 특히 2분기({quarters['q2']})가 핵심!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: {ganji}년 {target_cheon} 에너지가 일간 {day_master}({dm_profile.get('element','')})와 만남{nl}**점성 분석**: 태양 {sign_ko.get(sun_s,sun_s)} - {zodiac_sun.get('trait','') if zodiac_sun else '본성'}{nl}**종합**: {'에너지가 조화로워 순조로운 해!' if target_cheon in ['식신','정재','정인'] else '도전적이지만 성장하는 해!'}"},
            {"id":"reminder","icon":"💫","title":"연간 리마인더","titleEn":"Reminder","content":f"✅ {target_info.get('timing', '올해의 흐름을 타고 성장하세요')}{nl}⚠️ {dm_profile.get('weaknesses','').split(',')[0] if dm_profile.get('weaknesses') else '약점'} 보완 필요{nl}🎯 {target_year}년은 {target_cheon} 에너지를 활용하는 해!{nl}💪 {reminder_status}"}]

    elif theme == "focus_career":
        mc_s = mc.get("sign","")
        mc_careers = {
            "Aries": "리더십, 스포츠, 군/경찰, 스타트업",
            "Taurus": "금융, 부동산, 예술, 요식업",
            "Gemini": "미디어, 마케팅, 교육, IT",
            "Cancer": "의료, 복지, 요식업, 상담",
            "Leo": "엔터테인먼트, 경영, 패션, 정치",
            "Virgo": "의료, IT, 편집, 품질관리",
            "Libra": "법률, 외교, 디자인, 예술",
            "Scorpio": "심리학, 수사, 금융, 연구",
            "Sagittarius": "교육, 여행, 출판, 무역",
            "Capricorn": "경영, 정치, 건축, 관리직",
            "Aquarius": "IT, 과학, 사회운동, 방송",
            "Pisces": "예술, 의료, 영성, 사회복지"
        }
        career_timing = sibsin_info.get("career", "현재 운에서 커리어 기회 모색")

        # 대운 시기별 커리어 전망
        career_daeun = []
        for d in daeun[:5]:
            d_age = d.get("age", 0)
            d_sibsin = _get_sibsin_value(d.get("sibsin"), "cheon", "")
            if d_sibsin in ["정관", "편관"]:
                career_daeun.append(f"{d_age}~{d_age+9}세: 승진/인정받는 시기")
            elif d_sibsin in ["정재", "편재"]:
                career_daeun.append(f"{d_age}~{d_age+9}세: 수입 증가 시기")

        return [
            {"id":"summary","icon":"💼","title":"커리어 적성","titleEn":"Aptitude","content":f"**당신의 적성**: {dm_profile.get('career_fit', '다양한 분야 적성')}\n**별자리로 보면**: {mc_careers.get(mc_s, '전문 분야')} 적성"},
            {"id":"current","icon":"📍","title":"현재 커리어운","titleEn":"Current","content":f"**지금 시기**: {career_timing}"},
            {"id":"timing","icon":"⏰","title":"주요 시기","titleEn":"Timing","content":"\n".join(career_daeun[:3]) if career_daeun else "꾸준한 노력이 쌓이는 시기"},
            {"id":"strength","icon":"💪","title":"강점 활용","titleEn":"Strength","content":f"{dm_profile.get('strengths', '당신만의 강점')}을 살린 커리어 전략!\n{zodiac_sun.get('trait', '')} 에너지 활용"},
            {"id":"action","icon":"🎯","title":"액션 플랜","titleEn":"Action","content":f"**단기**: 현재 역량 강화\n**중기**: 전문성 확보, 네트워크 확장\n**장기**: {mc_careers.get(mc_s, '목표 분야')} 전문가"},
            {"id":"cross","icon":"✨","title":"동서양 종합","titleEn":"Cross","content":f"**동양**: 당신의 {dm_profile.get('element','성향')} 특성\n**서양**: {sign_ko.get(mc_s,'')} 직업 성향"},
            {"id":"caution","icon":"⚠️","title":"주의점","titleEn":"Caution","content":f"{dm_profile.get('weaknesses', '단점')} 경계!\n완급 조절과 협업 능력도 중요"}]

    elif theme == "focus_love":
        v_s = venus.get("sign","")

        # 연애 시기 찾기
        love_years = []
        for a in annual[:5]:
            a_sibsin = _get_sibsin_value(a.get("sibsin"), "cheon", "")
            if a_sibsin in ["정관", "정재"]:
                love_years.append(f"{a.get('year')}년: 결혼/진지한 인연 가능")
            elif a_sibsin in ["편관", "편재"]:
                love_years.append(f"{a.get('year')}년: 새로운 만남 많음")

        # 궁합 좋은 일간
        good_match = {
            "甲": "己(기토) - 갑기합! 서로를 완성시키는 인연",
            "乙": "庚(경금) - 을경합! 강렬한 끌림",
            "丙": "辛(신금) - 병신합! 열정적 만남",
            "丁": "壬(임수) - 정임합! 깊은 교감",
            "戊": "癸(계수) - 무계합! 안정적 인연",
            "己": "甲(갑목) - 기갑합! 성장하는 관계",
            "庚": "乙(을목) - 경을합! 서로 보완",
            "辛": "丙(병화) - 신병합! 빛나는 만남",
            "壬": "丁(정화) - 임정합! 지적 교감",
            "癸": "戊(무토) - 계무합! 든든한 인연",
        }

        return [
            {"id":"summary","icon":"💖","title":"연애 스타일","titleEn":"Style","content":f"**당신의 사랑법**: {dm_profile.get('love_style', '진심 어린 사랑')}\n**별자리로 보면**: {zodiac_venus.get('love', '독특한 사랑 방식')}"},
            {"id":"ideal","icon":"👫","title":"이상형 & 궁합","titleEn":"Ideal","content":f"**이상형**: {dm_profile.get('ideal_partner', '마음이 통하는 사람')}\n**천생연분**: {good_match.get(day_master, '서로 성장하는 인연')}"},
            {"id":"timing","icon":"⏰","title":"연애 시기","titleEn":"Timing","content":f"{dm_profile.get('love_timing', '좋은 인연을 기다리는 중')}\n\n" + "\n".join(love_years[:3]) if love_years else dm_profile.get('love_timing', '좋은 인연의 시기')},
            {"id":"current","icon":"📍","title":"현재 연애운","titleEn":"Current","content":f"**지금 시기**: {sibsin_info.get('love', '연애에 변화가 있는 시기')}\n**올해**: {annual_sibsin_info.get('love', '새로운 인연을 기대해도 좋아요')}"},
            {"id":"comm","icon":"💬","title":"소통 스타일","titleEn":"Communication","content":f"**감정 표현**: {zodiac_moon.get('love', '감성적 교감')}\n감정 표현과 공감이 관계의 열쇠!"},
            {"id":"cross","icon":"✨","title":"동서양 종합","titleEn":"Cross","content":f"**동양**: 당신의 연애 성향 분석\n**서양**: {sign_ko.get(v_s,'')} 금성이 말하는 사랑법"},
            {"id":"advice","icon":"💝","title":"연애 조언","titleEn":"Advice","content":f"✅ {dm_profile.get('strengths', '강점').split(',')[0]} 어필하기\n⚠️ {dm_profile.get('weaknesses', '단점').split(',')[0]} 주의\n💕 상대의 입장에서 생각하기"}]

    elif theme == "focus_family":
        # 가족 관계 분석
        family_style = {
            "목": "성장을 돕는 부모/자녀. 교육에 관심 많고 독립심 키워줌.",
            "화": "활기찬 가정. 함께 활동하는 시간이 중요. 때로 다툼도.",
            "토": "안정적인 가정. 전통을 중시하고 가족 모임 챙김.",
            "금": "원칙 있는 가정. 규율이 있지만 정이 깊음.",
            "수": "유연한 가정. 대화가 많고 서로 존중하는 분위기.",
        }

        # 사주 pillars로 가족 관계 분석
        pillars = saju.get("pillars", {})
        year_pillar = pillars.get("year", {})
        month_pillar = pillars.get("month", {})
        time_pillar = pillars.get("time", {})

        # 년주 (Year Pillar) - 조상/부모/사회적 환경
        year_stem = year_pillar.get("heavenlyStem", {}).get("name", "") if isinstance(year_pillar, dict) else ""
        year_analysis = "조상/부모로부터 물려받은 기질이 강합니다" if year_stem else "가문의 영향을 받는 성향"

        # 월주 (Month Pillar) - 부모/형제/직업적 기반
        month_stem = month_pillar.get("heavenlyStem", {}).get("name", "") if isinstance(month_pillar, dict) else ""
        month_sibsin = month_pillar.get("sibsin", {}) if isinstance(month_pillar, dict) else {}
        month_sibsin_cheon = _get_sibsin_value(month_sibsin, "cheon", "")

        parent_relation = {
            "정인": "부모에게 많은 도움을 받는 관계. 교육과 지원이 풍부.",
            "편인": "독특한 방식의 양육. 자유로운 분위기.",
            "정관": "엄격하지만 체계적인 가정. 규율과 책임감.",
            "편관": "도전적인 환경. 강하게 성장.",
            "정재": "안정적인 가정. 경제적 여유.",
            "편재": "활동적인 가정. 다양한 경험.",
            "식신": "창의적 분위기. 표현의 자유.",
            "상관": "자유로운 환경. 독립심 강조.",
            "비견": "형제자매와 경쟁/협력. 동등한 관계.",
            "겁재": "강한 경쟁 환경. 독립적 성장."
        }
        parent_msg = parent_relation.get(month_sibsin_cheon, "부모와의 관계가 당신의 성장에 영향을 줍니다")

        # 시주 (Time Pillar) - 자녀/말년/창조적 결실
        time_stem = time_pillar.get("heavenlyStem", {}).get("name", "") if isinstance(time_pillar, dict) else ""
        time_sibsin = time_pillar.get("sibsin", {}) if isinstance(time_pillar, dict) else {}
        time_sibsin_cheon = _get_sibsin_value(time_sibsin, "cheon", "")

        children_relation = {
            "식신": "자녀와 창의적 교감. 재능 개발 지원.",
            "상관": "자녀에게 자유 존중. 독립적 양육.",
            "편재": "자녀에게 다양한 경험 제공.",
            "정재": "자녀에게 안정적 환경 제공.",
            "편관": "자녀에게 도전 격려. 강하게 키움.",
            "정관": "자녀에게 규율과 책임감 교육.",
            "편인": "자녀에게 독특한 교육 방식.",
            "정인": "자녀에게 전통적 교육. 학업 강조.",
            "비견": "자녀와 친구 같은 관계.",
            "겁재": "자녀의 독립성 강조."
        }
        children_msg = children_relation.get(time_sibsin_cheon, "자녀와의 관계에서 당신의 특성이 나타납니다")

        # 점성학 4하우스 (가정/뿌리)
        houses = astro.get("houses", [])
        house4_sign = houses[3].get("sign", "") if len(houses) > 3 else ""
        house4_analysis = {
            "Aries": "활동적이고 독립적인 가정 환경 선호",
            "Taurus": "안정적이고 편안한 가정 중시",
            "Gemini": "소통 많은 가정, 지적 교류",
            "Cancer": "전통적 가정, 깊은 유대감",
            "Leo": "따뜻하고 관대한 가정 분위기",
            "Virgo": "실용적이고 체계적인 가정",
            "Libra": "조화롭고 균형 잡힌 가정",
            "Scorpio": "깊은 정서적 유대, 비밀스러운 가정",
            "Sagittarius": "자유롭고 개방적인 가정",
            "Capricorn": "전통과 책임 중시하는 가정",
            "Aquarius": "독특하고 진보적인 가정",
            "Pisces": "감성적이고 직관적인 가정"
        }

        return [
            {"id":"summary","icon":"👪","title":"가족 관계 성향","titleEn":"Style","content":f"**당신의 가정**: {family_style.get(day_el, '조화로운 가정')}\n**감정 스타일**: 달 {sign_ko.get(moon_s,moon_s)} - {zodiac_moon.get('trait', '감정의 뿌리')}\n**가정 환경**: 4하우스 {sign_ko.get(house4_sign,house4_sign)} - {house4_analysis.get(house4_sign, '특별한 가정 분위기')}"},
            {"id":"pillars","icon":"🏛️","title":"사주 가족 구조","titleEn":"Pillars","content":f"**년주(조상/부모)**: {year_stem} - {year_analysis}\n**월주(부모 관계)**: {month_stem} {month_sibsin_cheon} - {parent_msg}\n**시주(자녀)**: {time_stem} {time_sibsin_cheon} - {children_msg}"},
            {"id":"role","icon":"🏠","title":"가정에서의 역할","titleEn":"Role","content":f"**성격**: {dm_profile.get('personality', '').split('.')[0] if dm_profile.get('personality') else '당신의 본성'}. 가정에서도 이 성향이 나타나요.\n**강점**: {dm_profile.get('strengths', '강점')}이 가족에게 힘이 됩니다.\n**역할**: 일간 {day_master} - {dm_profile.get('name','')} 특성이 가족 관계의 핵심"},
            {"id":"parent","icon":"👨‍👩‍👧","title":"부모/자녀 관계","titleEn":"Parent","content":f"**부모로서**: {children_msg.split('.')[0]}\n**자녀로서**: {parent_msg.split('.')[0]}\n**주의**: {dm_profile.get('weaknesses', '').split(',')[0] if dm_profile.get('weaknesses') else '균형'} 때문에 갈등 가능"},
            {"id":"comm","icon":"💬","title":"소통 포인트","titleEn":"Communication","content":f"✅ 경청하고 공감 표현하기\n✅ 서로의 입장 이해하기\n✅ 달 {sign_ko.get(moon_s,moon_s)} - {zodiac_moon.get('love','감성적 소통') if zodiac_moon else '마음의 교류'}\n⚠️ {dm_profile.get('weaknesses', '단점').split(',')[0] if dm_profile.get('weaknesses') else '감정 조절'} 자제"},
            {"id":"timing","icon":"⏰","title":"가정 관련 시기","titleEn":"Timing","content":f"**현재 대운**: {cur_cheon} - {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '가정에 집중하기 좋은 때')}\n**올해**: {annual_cheon} - {annual_sibsin_info.get('meaning', '가족과의 시간')}\n**특징**: {'가족 관계가 중요한 시기' if cur_cheon in ['정인','식신'] else '독립과 가족의 균형'}"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 월주 {month_sibsin_cheon} - {parent_msg.split('.')[0]}\n**점성 분석**: 달 {sign_ko.get(moon_s,moon_s)} + 4하우스 {sign_ko.get(house4_sign,house4_sign)}\n**종합**: 일간 {day_master}의 {dm_profile.get('element','')} 성향이 가족 관계에 {'조화롭게' if day_el in ['토','수'] else '활기차게'} 작용"},
            {"id":"advice","icon":"💝","title":"가족 관계 조언","titleEn":"Advice","content":f"✅ 함께하는 시간을 소중히!\n✅ 작은 관심과 표현이 관계를 깊게 합니다\n✅ {month_sibsin_cheon} 에너지 - {parent_msg.split('.')[0]}\n💕 {children_msg.split('.')[0]}"}]

    elif theme == "focus_health":
        m_s = mars.get("sign","")

        # 오행별 건강 루틴
        health_routine = {
            "목": {"exercise": "스트레칭, 요가, 산책", "food": "녹색 채소, 신맛 나는 음식", "caution": "스트레스, 분노 조절"},
            "화": {"exercise": "유산소, 수영, 심호흡", "food": "쓴맛, 수분 섭취", "caution": "과로, 흥분 자제"},
            "토": {"exercise": "걷기, 등산, 규칙적 운동", "food": "규칙적 식사, 단맛 적당히", "caution": "과식, 불규칙한 식사"},
            "금": {"exercise": "호흡 운동, 명상, 등산", "food": "매운맛 적당히, 백색 음식", "caution": "건조함, 피부 관리"},
            "수": {"exercise": "수영, 요가, 충분한 수면", "food": "검은 음식, 짠맛 적당히", "caution": "냉증, 과로 피하기"},
        }
        hr = health_routine.get(day_el, {"exercise": "균형 잡힌 운동", "food": "균형 식단", "caution": "무리하지 않기"})

        # 오행 균형으로 건강 분석
        five_elements = saju.get("fiveElements") or saju.get("facts", {}).get("fiveElements", {})
        weak_elements = [k for k, v in five_elements.items() if v == 0] if five_elements else []
        strong_elements = [k for k, v in five_elements.items() if v >= 3] if five_elements else []

        element_organs = {
            "wood": "간/담낭", "fire": "심장/소장", "earth": "위장/비장",
            "metal": "폐/대장", "water": "신장/방광",
            "목": "간/담낭", "화": "심장/소장", "토": "위장/비장",
            "금": "폐/대장", "수": "신장/방광"
        }
        weak_organs = ", ".join([element_organs.get(e, e) for e in weak_elements[:2]]) if weak_elements else "없음"
        strong_organs = ", ".join([element_organs.get(e, e) for e in strong_elements[:1]]) if strong_elements else day_el

        # 점성학 6하우스 (건강/일상)
        houses = astro.get("houses", [])
        house6_sign = houses[5].get("sign", "") if len(houses) > 5 else ""
        house6_health = {
            "Aries": "두통, 열성 질환 주의. 활동적 운동 필요.",
            "Taurus": "목/갑상선 관리. 규칙적 식사 중요.",
            "Gemini": "호흡기, 신경계 관리. 스트레스 해소.",
            "Cancer": "소화기 건강. 감정과 위장 연결.",
            "Leo": "심장, 등 관리. 과로 주의.",
            "Virgo": "소화기, 장 건강. 규칙적 생활.",
            "Libra": "신장, 허리 관리. 균형 유지.",
            "Scorpio": "생식기, 배설계. 정기 검진.",
            "Sagittarius": "간, 허벅지. 과음/과식 주의.",
            "Capricorn": "뼈, 관절, 피부 관리.",
            "Aquarius": "순환계, 발목. 규칙적 생활.",
            "Pisces": "발, 면역계. 충분한 휴식."
        }

        # Chiron (카이론) - 상처와 치유
        chiron_data = data.get("extraPoints", {}).get("chiron") if hasattr(data, 'get') else {}
        if not chiron_data and astro:
            # astro 내부에서 찾기
            extra = astro.get("extraPoints", {})
            chiron_data = extra.get("chiron", {}) if extra else {}

        chiron_sign = chiron_data.get("sign", "") if isinstance(chiron_data, dict) else ""
        chiron_meaning = {
            "Aries": "자신감 회복이 치유의 열쇠",
            "Taurus": "자기 가치 인정이 건강의 기반",
            "Gemini": "소통과 표현이 치유 방법",
            "Cancer": "감정 돌봄이 건강의 시작",
            "Leo": "자기 표현이 활력의 원천",
            "Virgo": "완벽주의 내려놓기가 치유",
            "Libra": "관계 균형이 건강 회복",
            "Scorpio": "깊은 감정 해소가 치유",
            "Sagittarius": "의미 찾기가 건강 회복",
            "Capricorn": "책임감 내려놓기가 휴식",
            "Aquarius": "고립 벗어나기가 치유",
            "Pisces": "경계 세우기가 건강 지킴"
        }
        chiron_msg = chiron_meaning.get(chiron_sign, "자기 돌봄이 건강의 기본")

        return [
            {"id":"summary","icon":"💊","title":"체질 & 건강 포인트","titleEn":"Constitution","content":f"**당신의 체질**: {dm_profile.get('health_focus', '전반적인 건강 관리')}\n**에너지 스타일**: 화성 {sign_ko.get(m_s,m_s)}\n**6하우스**: {sign_ko.get(house6_sign,house6_sign)} - {house6_health.get(house6_sign, '건강 관리 필요')}"},
            {"id":"organs","icon":"🫀","title":"주의 기관","titleEn":"Organs","content":f"**일간 체질**: {dm_profile.get('health_focus', '체질에 맞는 건강 관리')}\n**취약 오행**: {weak_organs} 관리 필요\n**강한 오행**: {strong_organs} 활력의 원천"},
            {"id":"chiron","icon":"💫","title":"카이론 - 치유 포인트","titleEn":"Chiron","content":f"**카이론 {sign_ko.get(chiron_sign,chiron_sign)}**: {chiron_msg}\n\n상처를 이해하고 받아들이면 그것이 오히려 치유의 힘이 됩니다. 당신만의 방식으로 회복하세요."},
            {"id":"routine","icon":"🏃","title":"추천 루틴","titleEn":"Routine","content":f"**운동**: {hr['exercise']}\n**음식**: {hr['food']}\n**주의**: {hr['caution']}\n\n{'취약 오행 ' + weak_organs + ' 보강 필요!' if weak_elements else '오행 균형 양호!'}"},
            {"id":"stress","icon":"🧘","title":"스트레스 관리","titleEn":"Stress","content":f"**스트레스 원인**: {dm_profile.get('weaknesses', '').split(',')[0] if dm_profile.get('weaknesses') else '과로'} 성향\n**해소법**: 명상, 취미 활동, {hr['exercise']}\n**정서 치유**: {chiron_msg}"},
            {"id":"timing","icon":"⏰","title":"건강 주의 시기","titleEn":"Timing","content":f"**현재 대운**: {cur_cheon} - {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '건강 관리 필요')}\n**올해**: {annual_cheon} - {'활력 넘치는 해' if annual_cheon in ['비견','겁재','식신'] else '휴식 필요한 해'}\n과로 피하고 규칙적인 생활 유지!"},
            {"id":"cross","icon":"✨","title":"동서양 교차 분석","titleEn":"Cross","content":f"**사주 분석**: 일간 {day_master} {day_el} 체질 - {dm_profile.get('health_focus','').split('.')[0] if dm_profile.get('health_focus') else '건강 관리'}\n**점성 분석**: 6하우스 {sign_ko.get(house6_sign,house6_sign)} + 카이론 {sign_ko.get(chiron_sign,chiron_sign)}\n**종합**: {'취약 부위 관리 필수' if weak_elements else '전반적 건강 양호'}, {chiron_msg}"},
            {"id":"reminder","icon":"💫","title":"건강 리마인더","titleEn":"Reminder","content":f"✅ 예방이 최선! 규칙적인 생활과 적당한 운동\n✅ 충분한 수면이 건강의 기본\n⚠️ {weak_organs} 정기 검진 권장\n💪 {chiron_msg}"}]

    else:  # focus_overall / life
        asc_s = asc.get("sign","")

        # 10년 주기 운세 (쉬운 말로)
        # 십신을 쉬운 말로 변환
        sibsin_easy = {
            "비견": "경쟁과 협력의 시기",
            "겁재": "도전과 추진의 시기",
            "식신": "창의력이 빛나는 시기",
            "상관": "자유와 변화의 시기",
            "편재": "재물 기회가 많은 시기",
            "정재": "안정적 수입의 시기",
            "편관": "도전과 성장의 시기",
            "정관": "인정받는 시기",
            "편인": "배움과 변화의 시기",
            "정인": "도움받는 시기",
        }
        daeun_forecast = []
        if daeun:
            for d in daeun[:6]:
                d_age = d.get("age", 0)
                d_sibsin = _get_sibsin_value(d.get("sibsin"), "cheon", "")
                is_current = d_age <= user_age < d_age + 10
                marker = "👉 " if is_current else ""
                easy_meaning = sibsin_easy.get(d_sibsin, "변화의 시기")
                daeun_forecast.append(f"{marker}**{d_age}~{d_age+9}세**: {easy_meaning}")
        else:
            # 데이터가 없을 때 대략적인 전망
            el_life = {
                "목": ["20대: 성장과 도전", "30대: 확장과 발전", "40대: 결실의 시작", "50대: 안정과 지혜"],
                "화": ["20대: 열정의 시기", "30대: 성과와 인정", "40대: 성숙과 조율", "50대: 내면의 빛"],
                "토": ["20대: 기반 다지기", "30대: 꾸준한 성장", "40대: 안정의 절정", "50대: 지혜의 축적"],
                "금": ["20대: 재능 연마", "30대: 전문성 확립", "40대: 결실과 성과", "50대: 통찰의 시기"],
                "수": ["20대: 탐색과 학습", "30대: 지혜의 축적", "40대: 유연한 적응", "50대: 깊은 통찰"],
            }
            daeun_forecast = el_life.get(day_el, ["인생의 흐름이 자연스럽게 전개됩니다"])

        # 현재 10년 운세 (쉬운 말로)
        if cur_daeun:
            cur_easy = sibsin_easy.get(cur_cheon, "변화의 시기")
            current_daeun_text = f"**지금 10년 운세**: {cur_easy}\n{sibsin_info.get('meaning', '새로운 기회가 찾아오는 시기입니다.')}"
        else:
            el_now = {
                "목": "성장과 발전의 에너지가 흐르는 시기입니다. 새로운 도전에 적극적으로 나서세요.",
                "화": "열정과 표현의 에너지가 강한 시기입니다. 적극적인 활동이 좋은 결과를 가져옵니다.",
                "토": "안정과 축적의 에너지가 흐르는 시기입니다. 꾸준한 노력이 빛을 발합니다.",
                "금": "결단과 정리의 에너지가 흐르는 시기입니다. 중요한 결정을 내리기 좋습니다.",
                "수": "지혜와 유연함의 에너지가 흐르는 시기입니다. 직관을 믿고 흐름을 타세요.",
            }
            current_daeun_text = f"**현재 흐름**: {el_now.get(day_el, '변화의 시기를 지나고 있습니다.')}"

        # 올해 운세 (쉬운 말로)
        if cur_annual:
            annual_easy = sibsin_easy.get(annual_cheon, "변화")
            annual_text = f"**{now.year}년 운세**: {annual_easy}\n{annual_sibsin_info.get('timing', '좋은 흐름이 이어집니다.')}"
        else:
            annual_text = f"**{now.year}년**: 꾸준한 노력이 좋은 결과로 이어지는 해입니다."

        # 별자리 성향 텍스트 (쉬운 말로)
        if sun_s or moon_s or asc_s:
            astro_combo = f"\n\n**별자리로 보는 성향**\n- {sign_ko.get(sun_s,'')} (핵심 성격): {zodiac_sun.get('trait', '당신다움')}\n- {sign_ko.get(moon_s,'')} (감정 스타일): {zodiac_moon.get('trait', '내면의 감성')}\n- {sign_ko.get(asc_s,'')} (첫인상): 주변에서 느끼는 당신의 이미지"
        else:
            el_traits = {
                "목": "봄의 기운처럼 성장과 창의성이 넘칩니다. 새로운 시작과 발전에 강합니다.",
                "화": "여름의 열정처럼 밝고 적극적입니다. 주변을 밝히는 카리스마가 있습니다.",
                "토": "대지의 안정감처럼 듬직하고 신뢰감 있습니다. 중심을 잡아주는 존재입니다.",
                "금": "가을의 결실처럼 결단력과 추진력이 있습니다. 완성과 성과에 강합니다.",
                "수": "겨울의 깊이처럼 지혜롭고 통찰력이 있습니다. 유연함과 적응력이 뛰어납니다.",
            }
            astro_combo = f"\n\n**성격 특성**: {el_traits.get(day_el, '균형 잡힌 성향입니다.')}"

        # 종합 인사이트 (쉬운 말로)
        if sun_s:
            cross_text = f"**동양+서양 성격 분석**\n\n당신은 '{type_name_ko}'의 성향과 '{sign_ko.get(sun_s,'')}' 별자리의 특성을 함께 가지고 있어요.\n\n🔮 **핵심 메시지**\n동양의 지혜와 서양의 통찰이 만나 더 깊은 이해를 제공합니다.\n성장형 에너지와 {sign_ko.get(sun_s,'')}의 특성이 조화를 이뤄요."
        else:
            el_fusion = {
                "목": "성장을 추구하는 에너지가 당신의 핵심입니다. 나무가 하늘을 향해 자라듯, 끊임없는 발전과 확장이 삶의 테마입니다. 새로운 아이디어와 시작에 강하며, 리더십과 창의성이 빛납니다.",
                "화": "빛과 열정의 에너지가 당신을 정의합니다. 태양처럼 주변을 밝히고, 적극적인 행동력으로 목표를 향해 나아갑니다. 표현력과 카리스마가 뛰어나며, 사람들에게 영감을 줍니다.",
                "토": "안정과 포용의 에너지가 당신의 중심입니다. 대지처럼 듬직하고 신뢰감 있으며, 주변 사람들의 버팀목이 됩니다. 균형과 조화를 추구하며, 꾸준한 노력으로 성과를 이룹니다.",
                "금": "결단과 완성의 에너지가 당신을 이끕니다. 날카로운 판단력과 추진력으로 목표를 향해 직진합니다. 정의감이 강하고, 완벽을 추구하며, 성과 지향적입니다.",
                "수": "지혜와 유연함의 에너지가 당신의 본질입니다. 물처럼 어디서든 적응하며, 깊은 통찰력으로 상황을 꿰뚫습니다. 직관력이 뛰어나고, 변화에 유연하게 대응합니다.",
            }
            cross_text = f"**심층 성격 분석**\n\n🔮 **당신의 핵심**\n{el_fusion.get(day_el, '당신만의 독특한 에너지가 흐르고 있습니다.')}\n\n💫 이 분석을 통해 당신만의 길을 찾아보세요."

        # 풍부한 조언 생성
        strengths = dm_profile.get('strengths', '강점').split(',')
        weaknesses = dm_profile.get('weaknesses', '약점').split(',')
        strength1 = strengths[0].strip() if strengths else "장점"
        weakness1 = weaknesses[0].strip() if weaknesses else "단점"

        el_advice = {
            "목": "🌱 **성장의 조언**: 새로운 도전을 두려워하지 마세요. 당신의 성장 에너지는 멈추지 않는 강입니다.\n🎯 **주의점**: 너무 빠른 확장은 뿌리를 흔들 수 있어요. 기반을 다지며 나아가세요.\n✨ **행운의 키워드**: 시작, 창의성, 리더십",
            "화": "🔥 **열정의 조언**: 당신의 빛을 아끼지 마세요. 주변을 밝히는 것이 당신의 사명입니다.\n🎯 **주의점**: 과한 열정은 타버릴 수 있어요. 적절한 휴식을 취하세요.\n✨ **행운의 키워드**: 표현, 열정, 인정",
            "토": "🏔️ **안정의 조언**: 당신의 든든함이 주변에 힘이 됩니다. 중심을 잡고 나아가세요.\n🎯 **주의점**: 변화를 두려워하지 마세요. 때로는 움직임이 필요합니다.\n✨ **행운의 키워드**: 신뢰, 안정, 포용",
            "금": "⚔️ **결단의 조언**: 당신의 판단력을 믿으세요. 결정적 순간에 빛을 발합니다.\n🎯 **주의점**: 지나친 완벽주의는 자신을 지치게 해요. 유연함도 필요합니다.\n✨ **행운의 키워드**: 성취, 완성, 정의",
            "수": "💧 **지혜의 조언**: 흐름을 읽고 때를 기다리세요. 당신의 직관은 정확합니다.\n🎯 **주의점**: 너무 수동적이면 기회를 놓칠 수 있어요. 때로는 먼저 움직이세요.\n✨ **행운의 키워드**: 통찰, 적응, 지혜",
        }
        advice_text = el_advice.get(day_el, f"✅ {strength1} 최대한 활용하기\n⚠️ {weakness1} 경계하기\n💫 때를 기다리며 실력 쌓기")

        # ============ 풍부한 섹션 내용 생성 ============
        # English element names
        el_name_en = {"목": "Wood", "화": "Fire", "토": "Earth", "금": "Metal", "수": "Water"}.get(day_el, day_el)
        # 쉬운 성격 타입 이름 (전문용어 제거)
        type_name_ko = {"목": "성장형", "화": "열정형", "토": "안정형", "금": "완벽형", "수": "지혜형"}.get(day_el, "균형형")
        type_name_en = {"목": "Growth Type", "화": "Passion Type", "토": "Stability Type", "금": "Perfectionist Type", "수": "Wisdom Type"}.get(day_el, "Balanced Type")

        # 1. 정체성 섹션 - 전문용어 없이 쉽게
        if is_en:
            identity_intro = {
                "목": f"🌳 You're the '{type_name_en}'!\n\nLike a tree, you grow steadily and persistently. New ideas sprout in your mind like spring buds. You have strong leadership and the power to guide people around you.\n\n🎯 **Your Keywords**: Growth, Creativity, Leadership, Patience\n\nYou have the persistence to never give up even in tough situations. Initially you may seem quiet, but over time you become someone who provides support for others.",
                "화": f"🔥 You're the '{type_name_en}'!\n\nBright and warm like the sun. You become the life of the party wherever you go, and people naturally gather around you. Your passionate and proactive nature is your charm.\n\n🎯 **Your Keywords**: Passion, Expression, Charisma, Vitality\n\nEven when standing still, your presence shines! Every word and action captures attention. You shine brightest on stage.",
                "토": f"🏔️ You're the '{type_name_en}'!\n\nSolid like a mountain. Being around you makes people feel secure. You don't rush, moving forward steadily. Trust is your weapon.\n\n🎯 **Your Keywords**: Stability, Trust, Acceptance, Persistence\n\nYou maintain your own pace without following trends. You're the first person people turn to when they're struggling.",
                "금": f"⚔️ You're the '{type_name_en}'!\n\nSharp and decisive. You say what needs to be said and get things done properly. Strong sense of justice and a true professional!\n\n🎯 **Your Keywords**: Decisiveness, Precision, Principles, Clarity\n\nAmbiguity is your enemy! You're black and white with clear standards. You value promises and once decided, you see things through.",
                "수": f"💧 You're the '{type_name_en}'!\n\nFlexible and adaptable. You handle any situation with excellent intuition. You quietly assess situations and show your power at the critical moment.\n\n🎯 **Your Keywords**: Adaptability, Wisdom, Flexibility, Insight\n\nCalm on the outside but deep inside. You read people's hearts well and navigate complex situations with wisdom.",
            }
            str1 = dm_profile.get('strengths', 'Various abilities')
            identity_content = f"{identity_intro.get(day_el, 'Unique charm')}\n\n✅ **Strengths**: {str1}\n⚠️ **Weaknesses**: {dm_profile.get('weaknesses', 'Watch out')}\n\n💬 **Friends see you as**: \"A {str1.split(',')[0].strip() if str1 else 'great'} person! Reliable to be around.\""
        else:
            identity_intro = {
                "목": f"🌳 당신은 '{type_name_ko}'이에요!\n\n나무처럼 꿋꿋하게 성장하는 당신. 봄에 새싹이 돋듯이 새로운 아이디어가 끊임없이 샘솟아요. 리더십이 강하고 주변 사람들을 이끄는 힘이 있죠.\n\n🎯 **당신의 키워드**: 성장, 창의력, 리더십, 인내\n\n어려운 상황에서도 포기하지 않고 끈기 있게 나아가요. 처음엔 조용해 보여도, 시간이 지나면 주변에 힘이 되어주는 사람이에요.",
                "화": f"🔥 당신은 '{type_name_ko}'이에요!\n\n태양처럼 밝고 따뜻한 당신. 어디서든 분위기 메이커가 되고, 사람들이 당신 주변에 모여들어요. 열정적이고 적극적인 게 매력이에요.\n\n🎯 **당신의 키워드**: 열정, 표현력, 카리스마, 활력\n\n가만히 있어도 존재감이 뿜뿜! 말 한마디, 행동 하나하나가 사람들의 시선을 끌어요. 무대 위에서 가장 빛나는 타입이죠.",
                "토": f"🏔️ 당신은 '{type_name_ko}'이에요!\n\n산처럼 듬직한 당신. 옆에 있으면 든든해지는 사람이에요. 급하게 서두르지 않고 꾸준히 나아가는 스타일. 신뢰가 당신의 무기예요.\n\n🎯 **당신의 키워드**: 안정, 신뢰, 포용력, 끈기\n\n유행을 쫓지 않고 본인만의 페이스를 유지해요. 사람들이 힘들 때 가장 먼저 찾는 사람이 바로 당신이에요.",
                "금": f"⚔️ 당신은 '{type_name_ko}'이에요!\n\n날카롭고 결단력 있는 당신. 할 말은 하고, 해야 할 일은 확실하게 해요. 정의감이 강하고 완벽을 추구하는 프로페셔널!\n\n🎯 **당신의 키워드**: 결단력, 정확함, 원칙, 깔끔함\n\n애매한 건 딱 질색! 기준이 확실해요. 약속을 중요하게 생각하고, 한번 정하면 끝까지 지키는 사람이에요.",
                "수": f"💧 당신은 '{type_name_ko}'이에요!\n\n물처럼 유연한 당신. 어떤 상황에도 적응하고, 직감이 뛰어나요. 조용히 상황을 파악하다가 결정적 순간에 힘을 발휘하는 타입이에요.\n\n🎯 **당신의 키워드**: 적응력, 지혜, 유연함, 통찰력\n\n겉으론 조용해 보여도 속은 깊어요. 사람 마음을 잘 읽고, 복잡한 상황도 술술 풀어나가는 지혜가 있어요.",
            }
            identity_content = f"{identity_intro.get(day_el, dm_profile.get('personality', '독특한 매력의 소유자'))}\n\n✅ **장점**: {dm_profile.get('strengths', '다양한 능력')}\n⚠️ **단점**: {dm_profile.get('weaknesses', '주의할 점')}\n\n💬 **친구들이 보는 당신**: \"{dm_profile.get('strengths', '멋진').split(',')[0].strip() if dm_profile.get('strengths') else '멋진'} 사람이야! 옆에 있으면 든든해.\""

        # 2. 인생 로드맵 - 10년 대운 설명
        if is_en:
            # English daeun forecast
            daeun_forecast_en = []
            if daeun:
                for d in daeun[:6]:
                    d_age = d.get("age", 0)
                    d_stem = d.get("heavenlyStem", "")
                    d_branch = d.get("earthlyBranch", "")
                    d_sibsin = _get_sibsin_value(d.get("sibsin"), "cheon", "")
                    d_info = SIBSIN_MEANINGS.get(d_sibsin, {})
                    is_current = d_age <= user_age < d_age + 10
                    marker = "👉 " if is_current else ""
                    sibsin_en = SIBSIN_EN.get(d_sibsin, d_sibsin)
                    daeun_forecast_en.append(f"{marker}**Age {d_age}~{d_age+9}** ({d_stem}{d_branch}): {sibsin_en}")
            if daeun_forecast_en:
                lifepath_content = "📅 **Your Life Timeline**\n\n" + "\n".join(daeun_forecast_en)
                lifepath_content += "\n\n💡 Different energy flows at each stage. Strategy that matches your current period is key! Know your destiny, prepare for it, and opportunities will come."
            else:
                lifepath_content = "Your life's journey is unfolding. Wait for the right moment while preparing. Opportunities come to those who are ready."
        else:
            if daeun_forecast:
                lifepath_content = "📅 **당신의 인생 시간표**\n\n" + "\n".join(daeun_forecast)
                lifepath_content += "\n\n💡 각 시기마다 다른 에너지가 흘러요. 지금 시기에 맞는 전략이 중요해요! 운명을 알면 대비할 수 있고, 대비하면 기회가 됩니다."
            else:
                lifepath_content = "인생의 큰 흐름이 펼쳐지고 있어요. 때를 기다리며 준비하세요. 준비된 사람에게 기회가 옵니다."

        # 3. 커리어 & 재물 - 구체적인 조언 + 확장
        if is_en:
            career_tips_en = {
                "목": "Startups, education, and leadership roles suit you. You excel at starting new projects or leading teams. Consulting and planning fields are also great!",
                "화": "Careers on stage suit you best. YouTuber, speaker, sales star... Your energy is your competitive edge! Entertainment, advertising, and events fit you well.",
                "토": "Stable fields like real estate, finance, or civil service are ideal. You shine brighter the longer you work. Agriculture, construction, and distribution also suit you.",
                "금": "Professional careers like law, medicine, or engineering fit you. Perfectionism is an asset in these fields! IT, financial analysis, and quality control are also good.",
                "수": "Research, consulting, and arts let you shine. Deep-dive work suits you best. Psychology, marketing analysis, and writing are also great matches.",
            }
            money_tips_en = {
                "목": "Grow wealth through business expansion rather than investment. Think big picture! Partnerships and franchises are worth considering.",
                "화": "Your network is your net worth! Opportunities come through relationships. Invest time in networking and money will follow.",
                "토": "Build wealth steadily without rushing. Real estate and savings are your financial tools. Physical assets bring fortune.",
                "금": "Analyze and make informed investment decisions. Your intuition is accurate. A systematic portfolio builds wealth.",
                "수": "Create multiple income streams. Side businesses, investments, various channels! Digital assets and intellectual property are worth watching.",
            }
            career_warning_en = {
                "목": "💡 Note: Spreading too thin drains energy. Focus and prioritize!",
                "화": "💡 Note: Chasing short-term wins makes you miss the big picture. Stay calm!",
                "토": "💡 Note: Resisting change too much can leave you behind. Embrace new things.",
                "금": "💡 Note: Perfectionism can hold you back. 80% is good enough!",
                "수": "💡 Note: Thinking without acting won't work. Build execution skills!",
            }
            career_content = f"💼 **Perfect Career Fit**\n{dm_profile.get('career_fit', 'Various fields')}\n\n{career_tips_en.get(day_el, '')}\n\n💰 **Money-Making Style**\n{money_tips_en.get(day_el, 'Steady accumulation')}\n\n{career_warning_en.get(day_el, '')}"
        else:
            career_tips = {
                "목": "창업, 스타트업, 교육 분야에서 빛나요. 새로운 프로젝트를 시작하거나 팀을 이끄는 역할이 잘 맞아요. 교육, 컨설팅, 기획 분야도 추천!",
                "화": "무대 위에서 빛나는 직업이 좋아요. 유튜버, 강사, 영업왕... 당신의 에너지가 곧 경쟁력! 엔터테인먼트, 광고, 이벤트 분야도 적성에 맞아요.",
                "토": "부동산, 금융, 공무원처럼 안정적인 분야가 맞아요. 오래 일할수록 빛나는 타입이에요. 농업, 건설, 유통 분야도 좋아요.",
                "금": "법률, 의료, 엔지니어링 같은 전문직이 어울려요. 완벽주의가 장점이 되는 분야로! IT, 금융 분석, 품질관리도 추천!",
                "수": "연구, 컨설팅, 예술 분야에서 재능을 발휘해요. 깊이 파고드는 일이 잘 맞아요. 심리상담, 마케팅 분석, 작가도 어울려요.",
            }
            money_tips = {
                "목": "투자보다는 사업 확장으로 돈을 벌어요. 큰 그림을 그리세요! 파트너십이나 프랜차이즈도 고려해볼 만해요.",
                "화": "인맥이 곧 재산! 사람들과의 관계에서 기회가 와요. 네트워킹에 시간을 투자하면 돈이 따라와요.",
                "토": "조급하지 않게 모아가세요. 부동산, 적금이 당신의 재테크. 땅이나 건물 같은 실물자산이 복을 불러요.",
                "금": "분석하고 판단해서 투자하세요. 당신의 직감은 정확해요. 체계적인 포트폴리오가 부를 만들어요.",
                "수": "다양한 수입원을 만드세요. 부업, 투자 등 여러 갈래로! 디지털 자산, 지적재산권도 눈여겨보세요.",
            }
            career_warning = {
                "목": "💡 주의: 너무 이것저것 벌리면 힘 빠져요. 선택과 집중이 필요해요!",
                "화": "💡 주의: 단기적 성과에 급급하면 큰 그림을 놓쳐요. 차분하게!",
                "토": "💡 주의: 변화를 너무 꺼리면 뒤처질 수 있어요. 새로운 것도 받아들이세요.",
                "금": "💡 주의: 완벽주의가 때로는 발목을 잡아요. 80%도 충분해요!",
                "수": "💡 주의: 생각만 하고 행동하지 않으면 안 돼요. 실행력을 키우세요!",
            }
            career_content = f"💼 **딱 맞는 직업**\n{dm_profile.get('career_fit', '다양한 분야')}\n\n{career_tips.get(day_el, '')}\n\n💰 **돈 버는 스타일**\n{money_tips.get(day_el, dm_profile.get('wealth_style', '꾸준한 축적'))}\n\n{career_warning.get(day_el, '')}"

        # 4. 연애 & 결혼 - 재미있는 연애 분석 + 확장
        if is_en:
            love_intro_en = {
                "목": "🌹 In love, you... commit fully once you give your heart! But sometimes you try too hard to do things your way, which can frustrate your partner. Leading is great, but listen to their opinion too!",
                "화": "🌹 In love, you... are romantic like a drama protagonist! But like a flame, you might burn bright then cool off... Consistency is key. Small gestures are nice, but everyday tenderness matters more!",
                "토": "🌹 In love, you... are slow but sure. Once you date, relationships last long! Even if you're not good with words, you show it through actions. Sometimes express it verbally too - it reassures your partner!",
                "금": "🌹 In love, you... seem cool and chic but are warm inside. You're devoted but don't show it. Try expressing affection sometimes - it makes your partner happy!",
                "수": "🌹 In love, you... are emotional and perceptive. You read your partner's heart well, but sometimes you accommodate too much and get tired. Express your own feelings honestly too!",
            }
            love_warning_en = {
                "목": "⚠️ Love tip: Being stubborn about being 'right' causes fights. Compromising is also cool!",
                "화": "⚠️ Love tip: Emotional ups and downs tire your partner. Practice emotional regulation!",
                "토": "⚠️ Love tip: Being too unresponsive makes your partner anxious. Show more reactions!",
                "금": "⚠️ Love tip: No criticizing! Give more compliments instead.",
                "수": "⚠️ Love tip: Being too passive makes things fizzle. Take the lead sometimes!",
            }
            love_content = f"{love_intro_en.get(day_el, 'Sincere love')}\n\n💍 **Marriage Timing**\n{dm_profile.get('love_timing', 'Waiting for the right connection')}\n\n👫 **Compatible Partner**\n{dm_profile.get('ideal_partner', 'Someone you connect with')}\n\n{love_warning_en.get(day_el, '')}"
        else:
            love_intro = {
                "목": "🌹 연애할 때 당신은... 한번 마음 주면 끝까지 책임지는 스타일! 근데 가끔 너무 내 방식대로 하려고 해서 상대가 답답할 수 있어요. 리드하는 건 좋지만, 상대 의견도 들어보세요!",
                "화": "🌹 연애할 때 당신은... 드라마 주인공처럼 로맨틱해요! 근데 불꽃처럼 확 타오르다 식을 수도... 꾸준함이 필요해요. 작은 이벤트도 좋지만 일상의 다정함이 더 중요해요!",
                "토": "🌹 연애할 때 당신은... 느리지만 확실해요. 한번 사귀면 오래가는 타입! 표현은 서툴러도 행동으로 보여줘요. 가끔은 말로도 표현해주세요, 상대가 안심해요!",
                "금": "🌹 연애할 때 당신은... 쿨하고 시크해 보이지만 속은 따뜻해요. 상대에게 헌신적이지만 티를 안 내요. 가끔은 애정표현도 해보세요, 상대가 행복해해요!",
                "수": "🌹 연애할 때 당신은... 감성적이고 눈치 빨라요. 상대 마음을 잘 읽지만, 가끔 너무 맞춰주다 지칠 수 있어요. 본인 감정도 솔직하게 표현하세요!",
            }
            love_warning = {
                "목": "⚠️ 연애 주의점: '내가 옳아' 고집 부리다 싸워요. 양보하는 것도 멋있어요!",
                "화": "⚠️ 연애 주의점: 감정 기복이 심하면 상대가 힘들어해요. 감정 조절 연습!",
                "토": "⚠️ 연애 주의점: 너무 무반응하면 상대가 불안해해요. 리액션 해주세요!",
                "금": "⚠️ 연애 주의점: 지적질은 금물! 칭찬을 더 자주 해주세요.",
                "수": "⚠️ 연애 주의점: 너무 수동적이면 흐지부지 돼요. 가끔은 리드하세요!",
            }
            love_content = f"{love_intro.get(day_el, dm_profile.get('love_style', '진심 어린 사랑'))}\n\n💍 **결혼 타이밍**\n{dm_profile.get('love_timing', '좋은 인연을 기다리는 중')}\n\n👫 **이런 사람이 잘 맞아요**\n{dm_profile.get('ideal_partner', '마음이 통하는 사람')}\n\n{love_warning.get(day_el, '')}"

        # 5. 건강 포인트 - 실용적인 건강 조언 + 확장
        if is_en:
            health_tips_en = {
                "목": "Watch your liver, eyes, and muscles. Stress causes eye fatigue and muscle tension. Stretching and walks are your medicine!",
                "화": "Watch your heart and blood pressure! Too much excitement strains your heart. Regular cardio and hydration are key.",
                "토": "Digestive health is crucial. Irregular meals and overeating are forbidden! Eat on time and chew slowly.",
                "금": "Take care of lungs, skin, and intestines. Dry environments are bad. Use moisturizer and drink lots of water!",
                "수": "Watch kidneys, bladder, and reproductive health! Keep your body warm and avoid cold foods. Foot baths recommended!",
            }
            health_food_en = {
                "목": "🥗 Recommended foods: Green vegetables like spinach, broccoli / Chrysanthemum tea",
                "화": "🥗 Recommended foods: Hydrating fruits like watermelon, cucumber / Schisandra tea",
                "토": "🥗 Recommended foods: Mixed grains, sweet potato, pumpkin / Jujube tea, ginger tea",
                "금": "🥗 Recommended foods: Pear, radish, lotus root / Pear juice",
                "수": "🥗 Recommended foods: Black beans, seaweed, nuts / Black sesame tea",
            }
            health_exercise_en = {
                "목": "🏃 Recommended exercise: Yoga, Pilates, hiking - loosen those tight muscles!",
                "화": "🏃 Recommended exercise: Swimming, jogging - sweat it out and feel refreshed!",
                "토": "🏃 Recommended exercise: Walking, golf - steady and gentle is best!",
                "금": "🏃 Recommended exercise: Gym, climbing - set goals and challenge yourself!",
                "수": "🏃 Recommended exercise: Meditation, stretching, swimming - be friends with water!",
            }
            health_content = f"🏥 **Areas to Watch**\n{dm_profile.get('health_focus', 'Overall health management')}\n\n🍎 **Health Tips**\n{health_tips_en.get(day_el, 'Regular lifestyle and exercise are fundamental!')}\n\n{health_food_en.get(day_el, '')}\n\n{health_exercise_en.get(day_el, '')}"
        else:
            health_tips = {
                "목": "간, 눈, 근육 건강에 신경 쓰세요. 스트레스 받으면 눈이 피로해지고 근육이 뭉쳐요. 스트레칭과 산책이 보약!",
                "화": "심장, 혈압 주의! 너무 흥분하면 심장에 무리가 와요. 규칙적인 유산소 운동과 충분한 수분 섭취가 중요해요.",
                "토": "위장, 소화기 건강이 관건이에요. 불규칙한 식사와 과식은 금물! 제때 먹고, 천천히 씹어 드세요.",
                "금": "폐, 피부, 대장 건강 챙기세요. 건조한 환경이 안 좋아요. 수분 크림 바르고, 물 많이 마시세요!",
                "수": "신장, 방광, 생식기 건강 주의! 몸을 따뜻하게 유지하고, 찬 음식은 피하세요. 족욕 추천!",
            }
            health_food = {
                "목": "🥗 추천 음식: 시금치, 브로콜리 등 초록 채소 / 결명자차, 국화차",
                "화": "🥗 추천 음식: 수박, 오이 등 수분 많은 과일 / 오미자차, 연근차",
                "토": "🥗 추천 음식: 잡곡밥, 고구마, 호박 / 대추차, 생강차",
                "금": "🥗 추천 음식: 배, 도라지, 무 / 도라지차, 배즙",
                "수": "🥗 추천 음식: 검은콩, 해조류, 견과류 / 두충차, 흑임자차",
            }
            health_exercise = {
                "목": "🏃 추천 운동: 요가, 필라테스, 등산 - 뭉친 근육을 풀어주세요!",
                "화": "🏃 추천 운동: 수영, 조깅 - 땀을 쫙 빼면 상쾌해져요!",
                "토": "🏃 추천 운동: 걷기, 골프 - 과격하지 않게 꾸준히!",
                "금": "🏃 추천 운동: 헬스, 클라이밍 - 목표 세우고 도전하세요!",
                "수": "🏃 추천 운동: 명상, 스트레칭, 수영 - 물과 친해지세요!",
            }
            health_content = f"🏥 **주의할 부분**\n{dm_profile.get('health_focus', '전반적인 건강 관리')}\n\n🍎 **건강 꿀팁**\n{health_tips.get(day_el, '규칙적인 생활과 운동이 기본!')}\n\n{health_food.get(day_el, '')}\n\n{health_exercise.get(day_el, '')}"

        # 6. 현재 운세 흐름 - 더 구체적으로 + 확장
        if is_en:
            current_tips_en = {
                "목": "Now is a great time to start new challenges. Invest in learning!",
                "화": "A high-energy period! But avoid overreaching. Balance is key.",
                "토": "A time to build foundations. Don't rush, be steady!",
                "금": "Time to organize and decide. Let go of what's unnecessary.",
                "수": "Be flexible. Adapting to change brings opportunities.",
            }
            # Generate English daeun text
            if cur_daeun:
                cur_daeun_sibsin_en = SIBSIN_EN.get(cur_cheon, cur_cheon)
                current_daeun_text_en = f"**Current Decade Luck**: {cur_daeun.get('heavenlyStem','')}{cur_daeun.get('earthlyBranch','')} ({cur_daeun_sibsin_en})"
            else:
                current_daeun_text_en = f"**Current Flow**: {day_master} Day Master ({el_name_en})"
            if cur_annual:
                annual_sibsin_en = SIBSIN_EN.get(annual_cheon, annual_cheon)
                annual_text_en = f"**{now.year} Fortune**: {cur_annual.get('heavenlyStem','')}{cur_annual.get('earthlyBranch','')} ({annual_sibsin_en})"
            else:
                annual_text_en = f"**{now.year}**: A year of steady progress."
            current_content = f"🌊 **Your 10-Year Luck Cycle**\n{current_daeun_text_en}\n\n📆 **{now.year} Fortune**\n{annual_text_en}\n\n🔑 **How to Use Your Fortune**\n{current_tips_en.get(day_el, 'Prepare while waiting for the right time!')}\n\n💫 Make the most of this period and transform your life! Those who know their destiny shape their destiny."
        else:
            current_tips = {
                "목": "지금은 새로운 도전을 시작하기 좋은 시기예요. 배움에 투자하세요!",
                "화": "에너지가 넘치는 시기! 단, 과욕은 금물. 적당히 조절하세요.",
                "토": "기반을 다지는 시기예요. 급하게 서두르지 말고 착실하게!",
                "금": "정리하고 결단할 때예요. 불필요한 건 과감히 버리세요.",
                "수": "유연하게 대처하세요. 변화에 적응하면 기회가 와요.",
            }
            current_content = f"🌊 **지금 10년 운세**\n{current_daeun_text}\n\n📆 **{now.year}년 운세**\n{annual_text}\n\n🔑 **운세 활용법**\n{current_tips.get(day_el, '때를 기다리며 준비하세요!')}\n\n💫 지금 이 시기를 잘 활용하면 인생이 달라져요! 운을 아는 사람이 운을 만듭니다."

        # 7. 종합 인사이트 - 확장
        if is_en:
            cross_simple_en = {
                "목": "Full of energy for new beginnings. Don't hesitate - take on challenges!",
                "화": "This is your time to shine. Step forward without hesitation!",
                "토": "A time to build foundations. Don't rush, take it step by step!",
                "금": "Time for decisions and organization. Let go of attachments!",
                "수": "Ride the flow. Your intuition will guide you to the right answer!",
            }
            cross_life_lesson_en = {
                "목": "🌱 **Life Lesson**: Trees don't grow overnight. Consistency wins in the end. Don't be impatient - grow a little each day!",
                "화": "🔥 **Life Lesson**: Fire illuminates others while shining itself. Don't try to shine alone - learn to shine together! Your light brightens the world.",
                "토": "🏔️ **Life Lesson**: Mountains don't move, yet everyone comes to them. You're the same. Stand firm without wavering!",
                "금": "⚔️ **Life Lesson**: Even a sharp blade dulls without sharpening. Keep refining yourself. Pursue growth over perfection!",
                "수": "💧 **Life Lesson**: Water finds another way when blocked, but eventually reaches the sea. Be flexible, but never lose sight of your goal!",
            }
            # English cross_text
            el_fusion_en = {
                "목": "The energy of Wood (growth) is your core. Like a tree reaching for the sky, endless development and expansion are your life's theme. Strong in new ideas and beginnings, with leadership and creativity that shine.",
                "화": "The energy of Fire (passion) defines you. Bright like the sun, you illuminate surroundings with active drive toward goals. Excellent expression and charisma that inspire people.",
                "토": "The energy of Earth (stability) is your center. Solid and trustworthy like the ground, you're the anchor for those around you. Pursuing balance and harmony, achieving through steady effort.",
                "금": "The energy of Metal (decision) guides you. Sharp judgment and drive push you straight toward goals. Strong sense of justice, pursuing perfection, result-oriented.",
                "수": "The energy of Water (wisdom) is your essence. Adapting anywhere like water, piercing situations with deep insight. Excellent intuition, flexible in responding to change.",
            }
            cross_text_en = f"【Deep Saju Analysis】{day_master} Day Master ({el_name_en})\n\n🔮 **Core of Your Destiny**\n{el_fusion_en.get(day_el, 'A unique energy flows through you.')}\n\n💫 Draw your destiny map with the wisdom of the Five Elements."
            cross_content = f"🔮 **Your Personal Key Message**\n\n{cross_simple_en.get(day_el, 'Walk your own path!')}\n\n{cross_life_lesson_en.get(day_el, '')}\n\n{cross_text_en}"
        else:
            cross_simple = {
                "목": "새로운 시작의 에너지가 가득해요. 망설이지 말고 도전하세요!",
                "화": "당신이 빛나는 시기예요. 주저하지 말고 나서세요!",
                "토": "기반을 다지는 시기예요. 조급해하지 말고 차근차근!",
                "금": "결단하고 정리할 때예요. 미련은 버리세요!",
                "수": "흐름을 타세요. 직감이 정답을 알려줄 거예요!",
            }
            cross_life_lesson = {
                "목": "🌱 **인생 교훈**: 나무는 하루아침에 크지 않아요. 꾸준함이 결국 승리합니다. 조급해하지 말고, 매일 조금씩 성장하세요!",
                "화": "🔥 **인생 교훈**: 불은 다른 사람을 밝히면서 자신도 빛나요. 혼자 빛나려 하지 말고, 함께 빛나는 법을 배우세요! 당신의 빛이 세상을 밝힙니다.",
                "토": "🏔️ **인생 교훈**: 산은 움직이지 않아도 모두가 찾아와요. 당신도 그래요. 흔들리지 말고 묵묵히 자리를 지키세요!",
                "금": "⚔️ **인생 교훈**: 날카로운 칼도 갈지 않으면 무뎌져요. 끊임없이 자신을 갈고닦으세요. 완벽보다 성장을 추구하세요!",
                "수": "💧 **인생 교훈**: 물은 막히면 돌아가지만, 결국 바다에 닿아요. 유연하게, 하지만 목표는 잃지 마세요!",
            }
            cross_content = f"🔮 **당신만을 위한 핵심 메시지**\n\n{cross_simple.get(day_el, '당신만의 길을 가세요!')}\n\n{cross_life_lesson.get(day_el, '')}\n\n{cross_text}"

        # 8. 인생 조언 - 추가 확장
        if is_en:
            el_advice_en = {
                "목": "🌱 **Growth Advice**: Don't fear new challenges. Your growth energy is an unstoppable river.\n🎯 **Watch out**: Too rapid expansion can shake your roots. Build foundations as you advance.\n✨ **Lucky Keywords**: Beginning, Creativity, Leadership",
                "화": "🔥 **Passion Advice**: Don't hold back your light. Illuminating others is your mission.\n🎯 **Watch out**: Too much passion can burn you out. Take appropriate rest.\n✨ **Lucky Keywords**: Expression, Passion, Recognition",
                "토": "🏔️ **Stability Advice**: Your dependability empowers those around you. Stay centered and move forward.\n🎯 **Watch out**: Don't fear change. Sometimes movement is necessary.\n✨ **Lucky Keywords**: Trust, Stability, Acceptance",
                "금": "⚔️ **Decision Advice**: Trust your judgment. You shine in decisive moments.\n🎯 **Watch out**: Excessive perfectionism can exhaust you. Flexibility is also needed.\n✨ **Lucky Keywords**: Achievement, Completion, Justice",
                "수": "💧 **Wisdom Advice**: Read the flow and wait for the right time. Your intuition is accurate.\n🎯 **Watch out**: Being too passive can make you miss opportunities. Sometimes move first.\n✨ **Lucky Keywords**: Insight, Adaptation, Wisdom",
            }
            advice_action_en = {
                "목": "\n\n📝 **This Month's To-Do**: Learn something new, morning stretching, get a green item!",
                "화": "\n\n📝 **This Month's To-Do**: Express yourself on social media, cardio exercise, add red accents!",
                "토": "\n\n📝 **This Month's To-Do**: Organize and declutter, eat regularly, place yellow items!",
                "금": "\n\n📝 **This Month's To-Do**: Declutter unnecessary items, meditate, wear white often!",
                "수": "\n\n📝 **This Month's To-Do**: Drink lots of water, follow your intuition, use black items!",
            }
            advice_text = el_advice_en.get(day_el, "✅ Maximize your strengths\n⚠️ Watch your weaknesses\n💫 Build skills while waiting for the right time") + advice_action_en.get(day_el, "")
        else:
            advice_action = {
                "목": "\n\n📝 **이번 달 할 일**: 새로운 것 하나 배우기, 아침 스트레칭, 초록색 아이템 갖기!",
                "화": "\n\n📝 **이번 달 할 일**: SNS에 자신 표현하기, 유산소 운동, 빨간색 포인트 주기!",
                "토": "\n\n📝 **이번 달 할 일**: 정리정돈하기, 규칙적인 식사, 노란색 소품 두기!",
                "금": "\n\n📝 **이번 달 할 일**: 불필요한 물건 정리, 명상하기, 흰색 옷 자주 입기!",
                "수": "\n\n📝 **이번 달 할 일**: 물 많이 마시기, 직감 따르기, 검은색 아이템 활용하기!",
            }
            advice_text = advice_text + advice_action.get(day_el, "")

        return [
            {"id":"identity","icon":"🌟","title":"당신은 누구인가","titleEn":"Identity","content":identity_content},
            {"id":"lifepath","icon":"🛤️","title":"인생 로드맵","titleEn":"Life Path","content":lifepath_content},
            {"id":"career","icon":"💼","title":"커리어 & 재물","titleEn":"Career","content":career_content},
            {"id":"love","icon":"💖","title":"연애 & 결혼","titleEn":"Love","content":love_content},
            {"id":"health","icon":"💊","title":"건강 포인트","titleEn":"Health","content":health_content},
            {"id":"current","icon":"📍","title":"현재 운세 흐름","titleEn":"Current","content":current_content},
            {"id":"cross","icon":"✨","title":"종합 인사이트","titleEn":"Insight","content":cross_content},
            {"id":"advice","icon":"💝","title":"인생 조언","titleEn":"Advice","content":advice_text}]


def _get_theme_summary(theme: str, saju: Dict, astro: Dict, locale: str = "ko") -> str:
    """Generate theme-specific summary line. Supports ko/en locales."""
    dm, _ = _normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    now = datetime.now()

    if locale == "en":
        t_map = {
            "fortune_today": f"{dm} Day Master | {moon.get('sign','')} Moon",
            "fortune_monthly": f"{now.strftime('%B')} Fortune | {dm} Day Master",
            "fortune_new_year": f"{now.year} New Year Fortune | {dm} Day Master",
            "fortune_next_year": f"{now.year+1} Fortune | {dm} Day Master",
            "focus_career": f"Career | {astro.get('mc',{}).get('sign','')} Career Sign",
            "focus_love": f"Love | Venus {venus.get('sign','')}",
            "focus_family": f"Family | Moon {moon.get('sign','')}",
            "focus_health": f"Health | Mars {mars.get('sign','')}",
        }
        return t_map.get(theme, f"Life Fortune | {dm} Day Master | {sun.get('sign','')} Sun")
    else:
        sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리","Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리","Sagittarius":"궁수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
        t_map = {
            "fortune_today": f"{dm} 일주 | {sign_ko.get(moon.get('sign',''),'')} 달",
            "fortune_monthly": f"{now.month}월 운세 | {dm} 일주",
            "fortune_new_year": f"{now.year}년 신년 운세 | {dm} 일주",
            "fortune_next_year": f"{now.year+1}년 운세 | {dm} 일주",
            "focus_career": f"커리어 | {sign_ko.get(astro.get('mc',{}).get('sign',''),'')} 직업운",
            "focus_love": f"연애 | 금성 {sign_ko.get(venus.get('sign',''),'')}",
            "focus_family": f"가족 | 달 {sign_ko.get(moon.get('sign',''),'')}",
            "focus_health": f"건강 | 화성 {sign_ko.get(mars.get('sign',''),'')}",
        }
        return t_map.get(theme, f"인생 총운 | {dm} 일주 | {sign_ko.get(sun.get('sign',''),'')} 태양")


def render_template_report(
    facts: Dict[str, Any],
    signals: Dict[str, Any],
    cross_summary: str,
    theme_cross: Dict[str, Any],
) -> str:
    """
    Return JSON report matching Display.tsx StructuredFortune format.
    Supports 9 themes: fortune_today/monthly/new_year/next_year, focus_career/love/family/health/overall
    Supports locales: ko (Korean), en (English)
    """
    saju = facts.get("saju") or {}
    astro = facts.get("astro") or {}
    theme = facts.get("theme", "focus_overall")
    locale = facts.get("locale", "ko")
    unse = saju.get("unse") or {}

    # DEBUG logging removed to avoid Windows encoding errors with Korean/Chinese characters

    # Locale-specific strings
    if locale == "en":
        life_desc = "Key life moments analyzed from your Saju and astrology data. Make the most of each period for better outcomes. Destiny is not fixed - opportunities come to those who prepare."
        cross_default = "Cross-analysis of Eastern and Western wisdom creates your unique destiny map. Use this insight for better choices."
    else:
        life_desc = "동양과 서양의 지혜를 기반으로 분석한 당신의 인생 주요 시점입니다. 각 시기를 잘 활용하면 더 좋은 결과를 얻을 수 있어요. 운명은 정해진 것이 아니라 준비하는 사람에게 기회가 옵니다."
        cross_default = "동양과 서양의 지혜가 만나 당신만의 운명 지도가 완성됩니다. 이 분석을 참고해 더 나은 선택을 하세요."

    structured = {
        "themeSummary": _get_theme_summary(theme, saju, astro, locale),
        "sections": _get_theme_sections(theme, saju, astro, locale),
        "lifeTimeline": {
            "description": life_desc,
            "importantYears": _get_important_years(unse, saju, astro, locale)
        },
        "categoryAnalysis": _get_category_analysis(signals, theme_cross, locale),
        "keyInsights": _get_key_insights(theme_cross, signals, saju, locale),
        "luckyElements": _get_lucky_elements(signals, saju, locale),
        "sajuHighlight": _get_saju_highlight(saju, locale),
        "astroHighlight": _get_astro_highlight(astro, signals, locale),
        "crossHighlights": {
            "summary": cross_summary or cross_default,
            "points": (theme_cross or {}).get("intersections", [])[:3]
        }
    }

    return json.dumps(structured, ensure_ascii=False, indent=2)
