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
# 십신(十神)별 특성/운세 의미
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


def _get_important_years(unse: Dict[str, Any], saju: Dict[str, Any], astro: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Extract important years from saju unse data + astro transits.

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

    # DEBUG: Log incoming data
    print(f"[DEBUG _get_important_years] unse keys: {list((unse or {}).keys())}")
    print(f"[DEBUG _get_important_years] daeun count: {len((unse or {}).get('daeun', []))}")
    print(f"[DEBUG _get_important_years] annual count: {len((unse or {}).get('annual', []))}")
    print(f"[DEBUG _get_important_years] saju keys: {list((saju or {}).keys())}")
    # Show sample of daeun data if exists
    daeun_sample = (unse or {}).get('daeun', [])[:2]
    if daeun_sample:
        print(f"[DEBUG _get_important_years] daeun sample: {daeun_sample}")

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
        except:
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
                except:
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
                except:
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

    # DEBUG: Log years before filtering (avoid non-ASCII to prevent Windows encoding errors)
    print(f"[_get_important_years] Total years collected: {len(years)}")
    for i, y in enumerate(years[:3]):
        print(f"  [{i}] year={y.get('year')}, age={y.get('age')}, rating={y.get('rating')}")

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
        print(f"[_get_important_years] Using real unse data: {len(high_rated)} entries")
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
        "title": f"{age}세 대운",
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
            "astro": "목성이 5하우스를 축복합니다",
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
            "astro": "태양이 10하우스를 밝힙니다",
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


def _get_category_analysis(signals: Dict[str, Any], theme_cross: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Build category analysis from signals.

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
        else:
            parts.append(f"{trait} 성향이라 자율성이 높은 환경에서 빛납니다.")
            parts.append("스타트업, 프리랜서, 창업 등 유연한 환경이 더 맞을 수 있어요.")

    elif category == "wealth":
        if saju_data.get("has_wealth_sibsin"):
            parts.append(f"{trait} 성향으로 재물 감각이 뛰어납니다.")
            parts.append("투자나 사업에서 기회를 잘 포착하는 타입이에요.")
        else:
            parts.append(f"{trait} 성향으로 전문성을 통해 수입을 만듭니다.")
            parts.append("꾸준한 실력 쌓기가 장기적 재정 안정의 열쇠예요.")

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        if sinsal_count > 0:
            parts.append(f"{trait} 매력으로 이성에게 관심을 끌기 좋아요.")
            parts.append("만남의 기회가 많은 편이니 좋은 인연을 신중히 선택하세요.")
        else:
            parts.append(f"{trait} 성향으로 진지하고 깊은 관계를 추구합니다.")
            parts.append("첫인상보다 시간이 지나면서 매력이 드러나는 타입이에요.")

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
            parts.append(f"MC {sign_ko.get(mc_sign, mc_sign)} - {careers} 분야에 적성이 있어요.")
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
            parts.append(f"행운 포인트가 {pof_house}하우스 - {meaning}이 유리해요.")
        benefics = astro_data.get("benefics_in_money_houses", [])
        if benefics:
            parts.append("재물 하우스에 행운의 별이 있어 금전운이 좋은 편이에요.")
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

    return " ".join(parts) if parts else "개인 맞춤 점성 분석을 위해 더 많은 정보가 필요합니다."


def _build_cross_insight(category: str, saju_data: dict, astro_data: dict) -> str:
    """Build combined cross-system insight - 구체적인 조언으로."""
    if category == "career":
        has_officer = saju_data.get("has_officer_sibsin", False)
        mc_sign = astro_data.get("mc_sign", "")
        if has_officer and mc_sign:
            return f"사주에서 조직 적성이 보이고, MC {mc_sign}이 이를 뒷받침해요. 체계적인 조직에서 승진 가능성이 높습니다."
        elif has_officer:
            return "사주에서 조직 적성이 보여요. 안정적인 회사에서 경력을 쌓는 게 유리합니다."
        elif mc_sign:
            return f"MC {mc_sign}에 맞는 분야를 탐색하면서 자신만의 길을 개척해보세요."
        return "자신의 강점을 살린 커리어 전략이 필요해요. 다양한 경험이 도움됩니다."

    elif category == "wealth":
        has_wealth = saju_data.get("has_wealth_sibsin", False)
        pof = astro_data.get("pof_house", 0)
        if has_wealth and pof:
            return f"재물 감각이 있고, {pof}하우스 행운 포인트가 있어 금전운이 좋아요. 적극적인 투자도 괜찮습니다."
        elif has_wealth:
            return "재물 감각이 있어요. 기회가 왔을 때 과감히 잡되, 리스크 관리도 함께하세요."
        elif pof:
            return f"{pof}하우스 방향의 수입 창출에 집중하면 재정 안정이 빨라져요."
        return "꾸준한 저축과 실력 쌓기가 장기적 부의 기반입니다."

    elif category == "love":
        sinsal_count = saju_data.get("love_sinsal_count", 0)
        planets = astro_data.get("venus_mars_moon_in_rel_houses", [])
        if sinsal_count > 0 and planets:
            return "만남의 기회도 많고 매력도 있어요. 좋은 인연을 신중히 선택하는 게 관건입니다."
        elif sinsal_count > 0:
            return "인연이 많은 편이에요. 진정성 있는 관계에 집중하면 좋은 결과가 있어요."
        elif planets:
            return "관계 영역이 활성화되어 있어요. 자신을 솔직히 표현하면 좋은 만남이 와요."
        return "시간을 두고 깊이 알아가는 관계가 오래갑니다. 서두르지 마세요."

    elif category == "health":
        weak_elements = [k for k, v in (saju_data.get("five_element_flags", {}) or {}).items() if v == "weak"]
        malefics = astro_data.get("malefics_in_health_houses", [])
        if weak_elements and malefics:
            return f"{', '.join(weak_elements)} 관련 기관과 점성 건강 영역 모두 주의가 필요해요. 정기 검진을 권합니다."
        elif weak_elements:
            return f"{', '.join(weak_elements)} 관련 장기를 평소에 잘 관리하세요. 예방이 중요합니다."
        elif malefics:
            return "스트레스 관리와 규칙적인 생활이 건강 유지의 핵심이에요."
        return "전반적으로 양호하지만, 과로를 피하고 균형 잡힌 생활을 유지하세요."

    return "사주와 점성을 종합해 나에게 맞는 방향을 찾아보세요."


def _get_category_keywords(category: str, saju_data: dict, astro_data: dict) -> List[str]:
    """Generate relevant keywords for the category."""
    base_keywords = {
        "career": ["승진", "이직", "적성", "리더십"],
        "wealth": ["재물", "투자", "저축", "수입"],
        "love": ["인연", "소통", "매력", "관계"],
        "health": ["활력", "균형", "휴식", "운동"],
    }
    return base_keywords.get(category, [])


def _get_key_insights(theme_cross: Dict[str, Any], signals: Dict[str, Any], saju: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Extract key insights from cross analysis.

    Returns format matching Display.tsx KeyInsight interface:
    - type: "strength" | "opportunity" | "caution" | "advice"
    - text: string
    - icon?: string
    """
    insights = []
    saju = saju or {}

    # Map sources to insight types
    source_to_type = {
        "saju": "strength",
        "astro": "opportunity",
        "cross": "advice",
    }

    highlights = (theme_cross or {}).get("highlights", [])
    for h in highlights[:4]:
        source = h.get("source", "")
        title = h.get("title", "")
        if title and title.strip():
            insights.append({
                "type": source_to_type.get(source, "advice"),
                "text": title,
                "icon": h.get("icon", "")
            })

    # Add cross summary insights from saju factors
    saju_factors = (theme_cross or {}).get("saju_factors", [])
    for sf in saju_factors[:2]:
        desc = sf.get("description", "")
        if desc and desc.strip():
            insights.append({
                "type": "strength",
                "text": desc,
                "icon": "☯️"
            })

    # Add cross summary insights from astro factors
    astro_factors = (theme_cross or {}).get("astro_factors", [])
    for af in astro_factors[:2]:
        desc = af.get("description", "")
        if desc and desc.strip():
            insights.append({
                "type": "opportunity",
                "text": desc,
                "icon": "✨"
            })

    # Add default insights if none found
    saju_meta = (signals or {}).get("saju", {}).get("meta", {})
    astro_meta = (signals or {}).get("astro", {}).get("meta", {})

    # ========== 용신(用神) 정보 추가 ==========
    # 용신은 saju.advancedAnalysis.yongsin에서 가져옴
    advanced = saju.get("advancedAnalysis", {})
    yongsin_data = advanced.get("yongsin", {})
    # yongsin can be { element: "목", description: "..." } or just a string
    if isinstance(yongsin_data, dict):
        yongsin = yongsin_data.get("element") or yongsin_data.get("name") or ""
    else:
        yongsin = str(yongsin_data) if yongsin_data else ""
    # Fallback to signals meta
    if not yongsin:
        yongsin = saju_meta.get("yongsin") or saju_meta.get("yong_sin") or ""
    print(f"[_get_key_insights] yongsin extracted: {yongsin}")
    if yongsin:
        element_meaning = {
            "목": "성장과 창의력을 키워주는",
            "화": "열정과 표현력을 높여주는",
            "토": "안정과 신뢰를 가져다주는",
            "금": "결단력과 추진력을 강화하는",
            "수": "지혜와 유연성을 높여주는",
        }
        meaning = element_meaning.get(yongsin, f"{yongsin} 기운이 당신에게 도움이 되는")
        insights.append({
            "type": "strength",
            "text": f"용신: {yongsin} - {meaning} 에너지입니다. 이 기운을 보충하면 운이 좋아집니다.",
            "icon": "🔮"
        })

    if not insights:
        day_master = saju_meta.get("day_master")
        if day_master:
            insights.append({
                "type": "strength",
                "text": f"일간 {day_master} - 당신의 핵심 에너지입니다",
                "icon": "☯️"
            })

        dom_element = astro_meta.get("dominant_element")
        if dom_element:
            insights.append({
                "type": "opportunity",
                "text": f"{dom_element} 원소가 강해 관련 분야에서 빛을 발합니다",
                "icon": "✨"
            })

        # Add generic advice
        insights.append({
            "type": "advice",
            "text": "사주와 점성술의 조화로운 해석으로 균형 잡힌 삶을 추구하세요",
            "icon": "💡"
        })

    return insights[:6]  # Limit to 6 insights


def _get_lucky_elements(signals: Dict[str, Any], saju: Dict[str, Any]) -> Dict[str, Any]:
    """Extract lucky elements from analysis."""
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


def _get_saju_highlight(saju: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Get main saju highlight."""
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
                "meaning": f"일간 {dm_name}({dm_element}) - 당신의 본질적 성향"
            }
    return None


def _get_astro_highlight(astro: Dict[str, Any], signals: Dict[str, Any]) -> Optional[Dict[str, str]]:
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


def _get_theme_sections(theme: str, saju: Dict, astro: Dict) -> List[Dict[str, Any]]:
    """Generate theme-specific sections for 9 themes - 구체적이고 재미있는 내용!"""
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

    # DEBUG: Log saju data received
    print(f"[_get_theme_sections] saju keys: {list(saju.keys()) if saju else 'EMPTY'}")
    print(f"[_get_theme_sections] unse keys: {list(unse.keys()) if unse else 'EMPTY'}")
    print(f"[_get_theme_sections] daeun count: {len(daeun)}, annual count: {len(annual)}")
    if daeun:
        print(f"[_get_theme_sections] daeun[0]: age={daeun[0].get('age')}, sibsin={daeun[0].get('sibsin')}")

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
            print(f"[_get_theme_sections] birthDate={birth_date}, user_age={user_age}")
        except:
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
            print(f"[_get_theme_sections] No birthDate, estimated user_age={user_age} from daeun")

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

        return [
            {"id":"summary","icon":"☀️","title":"오늘 한줄요약","titleEn":"Summary","content":f"{dow}요일, {today_iljin.get('heavenlyStem','')}{today_iljin.get('earthlyBranch','')}일. {iljin_cheon} 에너지가 흐르는 날.\n{gwiin_msg}"},
            {"id":"energy","icon":"⚡","title":"오늘의 에너지","titleEn":"Energy","content":f"{daily_tip}"},
            {"id":"timing","icon":"⏰","title":"좋은 시간대","titleEn":"Best Times","content":f"**오전**: 9-11시 (창의적 업무)\n**오후**: 2-4시 (미팅/소통)\n**저녁**: 7-9시 (자기계발)"},
            {"id":"action","icon":"🎯","title":"행동 가이드","titleEn":"Action","content":f"{dm_profile.get('strengths', '당신의 강점')}을 발휘하기 좋은 날. {zodiac_sun.get('trait', '')} 태양 에너지 활용!"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master} 일간 + {iljin_cheon}운\n【점성】{sign_ko.get(sun_s,'')} 태양, {sign_ko.get(moon_s,'')} 달 조화"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":f"{dm_profile.get('weaknesses', '주의점')} 경계하고, 긍정 에너지로 하루 시작!"}]

    elif theme == "fortune_monthly":
        # 월운 가져오기
        monthly = unse.get("monthly", [])
        cur_month = next((m for m in monthly if m.get("month") == now.month and m.get("year") == now.year), {})
        month_cheon = _get_sibsin_value(cur_month.get("sibsin"), "cheon", "")
        month_info = SIBSIN_MEANINGS.get(month_cheon, {})

        return [
            {"id":"theme","icon":"🗓️","title":"월간 한줄테마","titleEn":"Theme","content":f"{now.month}월은 {month_cheon} 에너지의 달!\n{month_info.get('meaning', '변화와 성장의 기회')}"},
            {"id":"career","icon":"💼","title":"이달 커리어","titleEn":"Career","content":month_info.get("career", "꾸준한 노력이 빛나는 시기")},
            {"id":"love","icon":"💖","title":"이달 연애","titleEn":"Love","content":month_info.get("love", "진심 어린 소통이 관계를 깊게 합니다")},
            {"id":"wealth","icon":"💰","title":"이달 재물","titleEn":"Wealth","content":month_info.get("wealth", "계획적인 지출과 저축 추천")},
            {"id":"weeks","icon":"📅","title":"주간 가이드","titleEn":"Weeks","content":"**1주**: 계획 수립 **2주**: 적극 실행\n**3주**: 조율/수정 **4주**: 마무리/정리"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master} + {month_cheon} 월운\n【점성】{sign_ko.get(sun_s,'')} 태양 에너지"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":month_info.get("timing", "이번 달의 흐름을 타세요")}]

    elif theme == "fortune_new_year" or theme == "fortune_next_year":
        target_year = now.year if theme == "fortune_new_year" else now.year + 1
        target_annual = cur_annual if theme == "fortune_new_year" else next_annual
        target_cheon = _get_sibsin_value(target_annual.get("sibsin"), "cheon", "")
        target_info = SIBSIN_MEANINGS.get(target_cheon, {})
        ganji = f"{target_annual.get('heavenlyStem','')}{target_annual.get('earthlyBranch','')}"

        return [
            {"id":"theme","icon":"🎊","title":"연간 한줄테마","titleEn":"Theme","content":f"{target_year}년 {ganji}년!\n{target_cheon} 에너지의 해 - {target_info.get('meaning', '새로운 기회의 해')}"},
            {"id":"career","icon":"💼","title":"올해 커리어","titleEn":"Career","content":target_info.get("career", "꾸준한 성장이 기대되는 해")},
            {"id":"love","icon":"💖","title":"올해 연애","titleEn":"Love","content":target_info.get("love", "인연의 변화가 있는 해")},
            {"id":"wealth","icon":"💰","title":"올해 재물","titleEn":"Wealth","content":target_info.get("wealth", "재정 관리가 중요한 해")},
            {"id":"quarters","icon":"📊","title":"분기별 흐름","titleEn":"Quarters","content":f"**1분기**: 준비/계획\n**2분기**: 본격 추진\n**3분기**: 조율/보완\n**4분기**: 결실/마무리"},
            {"id":"cross","icon":"✨","title":"교차 하이라이트","titleEn":"Cross","content":f"【사주】{day_master} 일간 + {ganji} 세운\n【점성】목성/토성 트랜짓 영향"},
            {"id":"reminder","icon":"💫","title":"리마인더","titleEn":"Reminder","content":target_info.get("timing", "올해의 흐름을 타고 성장하세요")}]

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
            {"id":"summary","icon":"💼","title":"커리어 적성","titleEn":"Aptitude","content":f"**일간 {day_master}**: {dm_profile.get('career_fit', '다양한 분야 적성')}\n**MC {sign_ko.get(mc_s,mc_s)}**: {mc_careers.get(mc_s, '전문 분야')} 적성"},
            {"id":"current","icon":"📍","title":"현재 커리어운","titleEn":"Current","content":f"**현재 대운** {cur_daeun.get('heavenlyStem','')}{cur_daeun.get('earthlyBranch','')} ({cur_cheon})\n{career_timing}"},
            {"id":"timing","icon":"⏰","title":"주요 시기","titleEn":"Timing","content":"\n".join(career_daeun[:3]) if career_daeun else "꾸준한 노력이 쌓이는 시기"},
            {"id":"strength","icon":"💪","title":"강점 활용","titleEn":"Strength","content":f"{dm_profile.get('strengths', '당신만의 강점')}을 살린 커리어 전략!\n{zodiac_sun.get('trait', '')} 에너지 활용"},
            {"id":"action","icon":"🎯","title":"액션 플랜","titleEn":"Action","content":f"**단기**: 현재 역량 강화\n**중기**: 전문성 확보, 네트워크 확장\n**장기**: {mc_careers.get(mc_s, '목표 분야')} 전문가"},
            {"id":"cross","icon":"✨","title":"교차 인사이트","titleEn":"Cross","content":f"【사주】{day_master} 일간의 {dm_profile.get('element','오행')} 특성\n【점성】MC {sign_ko.get(mc_s,'')} + 10하우스"},
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
            {"id":"summary","icon":"💖","title":"연애 스타일","titleEn":"Style","content":f"**일간 {day_master}**: {dm_profile.get('love_style', '진심 어린 사랑')}\n**금성 {sign_ko.get(v_s,v_s)}**: {zodiac_venus.get('love', '독특한 사랑 방식')}"},
            {"id":"ideal","icon":"👫","title":"이상형 & 궁합","titleEn":"Ideal","content":f"**이상형**: {dm_profile.get('ideal_partner', '마음이 통하는 사람')}\n**천생연분**: {good_match.get(day_master, '서로 성장하는 인연')}"},
            {"id":"timing","icon":"⏰","title":"연애 시기","titleEn":"Timing","content":f"{dm_profile.get('love_timing', '좋은 인연을 기다리는 중')}\n\n" + "\n".join(love_years[:3]) if love_years else dm_profile.get('love_timing', '좋은 인연의 시기')},
            {"id":"current","icon":"📍","title":"현재 연애운","titleEn":"Current","content":f"**현재 대운**: {cur_cheon} - {sibsin_info.get('love', '연애에 변화가 있는 시기')}\n**올해 세운**: {annual_cheon} - {annual_sibsin_info.get('love', '')}"},
            {"id":"comm","icon":"💬","title":"소통 스타일","titleEn":"Communication","content":f"**달 {sign_ko.get(moon_s,moon_s)}**: {zodiac_moon.get('love', '감성적 교감')}\n감정 표현과 공감이 관계의 열쇠!"},
            {"id":"cross","icon":"✨","title":"교차 인사이트","titleEn":"Cross","content":f"【사주】{day_master} 일간 + 연애 신살\n【점성】금성 {sign_ko.get(v_s,'')} + 7하우스"},
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

        return [
            {"id":"summary","icon":"👪","title":"가족 관계 성향","titleEn":"Style","content":f"**일간 {day_master}의 가정**: {family_style.get(day_el, '조화로운 가정')}\n**달 {sign_ko.get(moon_s,moon_s)}**: {zodiac_moon.get('trait', '')} - 감정의 뿌리"},
            {"id":"role","icon":"🏠","title":"가정에서의 역할","titleEn":"Role","content":f"{dm_profile.get('personality', '').split('.')[0]}. 가정에서도 이 성향이 나타나요.\n{dm_profile.get('strengths', '강점')}이 가족에게 힘이 됩니다."},
            {"id":"parent","icon":"👨‍👩‍👧","title":"부모/자녀 관계","titleEn":"Parent","content":f"**부모로서**: {dm_profile.get('element', '오행')} 기운으로 양육\n**자녀로서**: {dm_profile.get('weaknesses', '').split(',')[0]} 때문에 갈등 가능"},
            {"id":"comm","icon":"💬","title":"소통 포인트","titleEn":"Communication","content":f"✅ 경청하고 공감 표현하기\n✅ 서로의 입장 이해하기\n⚠️ {dm_profile.get('weaknesses', '단점').split(',')[0]} 자제"},
            {"id":"timing","icon":"⏰","title":"가정 관련 시기","titleEn":"Timing","content":f"**현재 대운**: {cur_cheon} - {SIBSIN_MEANINGS.get(cur_cheon, {}).get('meaning', '')}"},
            {"id":"cross","icon":"✨","title":"교차 인사이트","titleEn":"Cross","content":f"【사주】{day_master} + 년/월주 관계\n【점성】달 {sign_ko.get(moon_s,'')} + 4하우스 (가정)"},
            {"id":"advice","icon":"💝","title":"가족 관계 조언","titleEn":"Advice","content":"함께하는 시간을 소중히!\n작은 관심과 표현이 관계를 깊게 합니다."}]

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

        return [
            {"id":"summary","icon":"💊","title":"체질 & 건강 포인트","titleEn":"Constitution","content":f"**일간 {day_master} ({el_ko.get(day_el,day_el)})**: {dm_profile.get('health_focus', '전반적인 건강 관리')}\n**화성 {sign_ko.get(m_s,m_s)}**: 에너지 사용 방식"},
            {"id":"organs","icon":"🫀","title":"주의 기관","titleEn":"Organs","content":f"{dm_profile.get('health_focus', '오행별 주의 기관')}"},
            {"id":"routine","icon":"🏃","title":"추천 루틴","titleEn":"Routine","content":f"**운동**: {hr['exercise']}\n**음식**: {hr['food']}\n**주의**: {hr['caution']}"},
            {"id":"stress","icon":"🧘","title":"스트레스 관리","titleEn":"Stress","content":f"{dm_profile.get('weaknesses', '').split(',')[0]} 성향이 스트레스 원인이 될 수 있어요.\n명상, 취미 활동으로 해소!"},
            {"id":"timing","icon":"⏰","title":"건강 주의 시기","titleEn":"Timing","content":f"**현재 대운**: {cur_cheon} - 건강 관리 필요\n과로 피하고 규칙적인 생활!"},
            {"id":"cross","icon":"✨","title":"교차 인사이트","titleEn":"Cross","content":f"【사주】{el_ko.get(day_el,day_el)} 오행 균형\n【점성】6하우스 (건강) + 화성 {sign_ko.get(m_s,'')}"},
            {"id":"reminder","icon":"💫","title":"건강 리마인더","titleEn":"Reminder","content":"예방이 최선! 규칙적인 생활과 적당한 운동,\n충분한 수면이 건강의 기본입니다."}]

    else:  # focus_overall / life
        asc_s = asc.get("sign","")

        # 대운 시기별 전망 (데이터가 없으면 일간 기반 생성)
        daeun_forecast = []
        if daeun:
            for d in daeun[:6]:
                d_age = d.get("age", 0)
                d_stem = d.get("heavenlyStem", "")
                d_branch = d.get("earthlyBranch", "")
                d_sibsin = _get_sibsin_value(d.get("sibsin"), "cheon", "")
                d_info = SIBSIN_MEANINGS.get(d_sibsin, {})
                is_current = d_age <= user_age < d_age + 10
                marker = "👉 " if is_current else ""
                daeun_forecast.append(f"{marker}**{d_age}~{d_age+9}세** ({d_stem}{d_branch}): {d_info.get('meaning', d_sibsin + ' 운')}")
        else:
            # 대운 데이터가 없을 때 일간 기반 대략적인 전망
            el_life = {
                "목": ["20대: 성장과 도전", "30대: 확장과 발전", "40대: 결실의 시작", "50대: 안정과 지혜"],
                "화": ["20대: 열정의 시기", "30대: 성과와 인정", "40대: 성숙과 조율", "50대: 내면의 빛"],
                "토": ["20대: 기반 다지기", "30대: 꾸준한 성장", "40대: 안정의 절정", "50대: 지혜의 축적"],
                "금": ["20대: 재능 연마", "30대: 전문성 확립", "40대: 결실과 성과", "50대: 통찰의 시기"],
                "수": ["20대: 탐색과 학습", "30대: 지혜의 축적", "40대: 유연한 적응", "50대: 깊은 통찰"],
            }
            daeun_forecast = el_life.get(day_el, ["인생의 흐름이 자연스럽게 전개됩니다"])

        # 현재 대운 정보 (없으면 일간 기반 메시지)
        if cur_daeun:
            current_daeun_text = f"**현재 대운**: {cur_daeun.get('heavenlyStem','')}{cur_daeun.get('earthlyBranch','')} ({cur_cheon})\n{sibsin_info.get('meaning', '변화의 시기')}"
        else:
            # 일간 오행 기반 현재 운세 추론
            el_now = {
                "목": "성장과 발전의 에너지가 흐르는 시기입니다. 새로운 도전에 적극적으로 나서세요.",
                "화": "열정과 표현의 에너지가 강한 시기입니다. 적극적인 활동이 좋은 결과를 가져옵니다.",
                "토": "안정과 축적의 에너지가 흐르는 시기입니다. 꾸준한 노력이 빛을 발합니다.",
                "금": "결단과 정리의 에너지가 흐르는 시기입니다. 중요한 결정을 내리기 좋습니다.",
                "수": "지혜와 유연함의 에너지가 흐르는 시기입니다. 직관을 믿고 흐름을 타세요.",
            }
            current_daeun_text = f"**현재 흐름**: {day_master} 일간 ({el_ko.get(day_el, day_el)})\n{el_now.get(day_el, '변화의 시기를 지나고 있습니다.')}"

        # 올해 세운 정보
        if cur_annual:
            annual_text = f"**{now.year}년 세운**: {cur_annual.get('heavenlyStem','')}{cur_annual.get('earthlyBranch','')} ({annual_cheon})\n{annual_sibsin_info.get('timing', '올해의 흐름')}"
        else:
            # 년도별 천간으로 추론
            year_stems = {2024: "갑진", 2025: "을사", 2026: "병오", 2027: "정미", 2028: "무신", 2029: "기유", 2030: "경술"}
            ganji = year_stems.get(now.year, f"{now.year}년")
            annual_text = f"**{now.year}년**: {ganji}년의 기운이 흐릅니다.\n꾸준한 노력이 좋은 결과로 이어집니다."

        return [
            {"id":"identity","icon":"🌟","title":"당신은 누구인가","titleEn":"Identity","content":f"**일간 {day_master}**: {dm_profile.get('personality', '독특한 매력의 소유자')}\n\n**강점**: {dm_profile.get('strengths', '다양한 능력')}\n**약점**: {dm_profile.get('weaknesses', '주의할 점')}\n\n**점성 조합**\n- 태양 {sign_ko.get(sun_s,'')}: {zodiac_sun.get('trait', '')}\n- 달 {sign_ko.get(moon_s,'')}: 감정의 뿌리\n- 상승 {sign_ko.get(asc_s,'')}: 첫인상/외면"},
            {"id":"lifepath","icon":"🛤️","title":"인생 로드맵","titleEn":"Life Path","content":"\n".join(daeun_forecast) if daeun_forecast else "인생의 여정이 펼쳐지고 있습니다."},
            {"id":"career","icon":"💼","title":"커리어 & 재물","titleEn":"Career","content":f"**적성 분야**: {dm_profile.get('career_fit', '다양한 분야')}\n\n**재물 스타일**: {dm_profile.get('wealth_style', '꾸준한 축적')}"},
            {"id":"love","icon":"💖","title":"연애 & 결혼","titleEn":"Love","content":f"**연애 스타일**: {dm_profile.get('love_style', '진심 어린 사랑')}\n\n**결혼 시기**: {dm_profile.get('love_timing', '좋은 인연을 기다리는 중')}\n\n**이상형**: {dm_profile.get('ideal_partner', '마음이 통하는 사람')}"},
            {"id":"health","icon":"💊","title":"건강 포인트","titleEn":"Health","content":f"**주의 기관**: {dm_profile.get('health_focus', '전반적인 건강 관리')}"},
            {"id":"current","icon":"📍","title":"현재 운세 흐름","titleEn":"Current","content":f"{current_daeun_text}\n\n{annual_text}"},
            {"id":"cross","icon":"✨","title":"사주×점성 융합","titleEn":"Cross","content":f"【사주】{day_master} 일간 ({el_ko.get(day_el,day_el)})\n【점성】{sign_ko.get(sun_s,'')} 태양 + {sign_ko.get(asc_s,'')} 상승\n\n동양과 서양의 지혜가 만나\n당신만의 운명 지도가 완성됩니다."},
            {"id":"advice","icon":"💝","title":"인생 조언","titleEn":"Advice","content":f"✅ {dm_profile.get('strengths', '강점').split(',')[0]} 최대한 활용하기\n⚠️ {dm_profile.get('weaknesses', '단점').split(',')[0]} 경계하기\n💫 때를 기다리며 실력 쌓기"}]


def _get_theme_summary(theme: str, saju: Dict, astro: Dict) -> str:
    """Generate theme-specific summary line."""
    dm, _ = _normalize_day_master(saju)
    planets = astro.get("planets", [])
    sun = next((p for p in planets if p.get("name") == "Sun"), {})
    moon = next((p for p in planets if p.get("name") == "Moon"), {})
    venus = next((p for p in planets if p.get("name") == "Venus"), {})
    mars = next((p for p in planets if p.get("name") == "Mars"), {})
    sign_ko = {"Aries":"양자리","Taurus":"황소자리","Gemini":"쌍둥이자리","Cancer":"게자리","Leo":"사자자리","Virgo":"처녀자리","Libra":"천칭자리","Scorpio":"전갈자리","Sagittarius":"궁수자리","Capricorn":"염소자리","Aquarius":"물병자리","Pisces":"물고기자리"}
    now = datetime.now()
    t_map = {
        "fortune_today": f"{dm} 일주 | {sign_ko.get(moon.get('sign',''),'')} 달",
        "fortune_monthly": f"{now.month}월 운세 | {dm} 일주",
        "fortune_new_year": f"{now.year}년 신년 운세 | {dm} 일주",
        "fortune_next_year": f"{now.year+1}년 운세 | {dm} 일주",
        "focus_career": f"커리어 | MC {sign_ko.get(astro.get('mc',{}).get('sign',''),'')}",
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
    """
    saju = facts.get("saju") or {}
    astro = facts.get("astro") or {}
    theme = facts.get("theme", "focus_overall")
    unse = saju.get("unse") or {}

    # DEBUG: Log incoming data at render_template_report entry point
    print(f"[render_template_report] saju keys: {list(saju.keys()) if saju else 'EMPTY'}")
    print(f"[render_template_report] unse keys: {list(unse.keys()) if unse else 'EMPTY'}")
    print(f"[render_template_report] daeun count: {len(unse.get('daeun', []))}")
    print(f"[render_template_report] annual count: {len(unse.get('annual', []))}")
    if unse.get('daeun'):
        print(f"[render_template_report] daeun[0]: {unse['daeun'][0]}")

    structured = {
        "themeSummary": _get_theme_summary(theme, saju, astro),
        "sections": _get_theme_sections(theme, saju, astro),
        "lifeTimeline": {
            "description": "사주와 점성술 데이터를 기반으로 분석한 주요 시점입니다.",
            "importantYears": _get_important_years(unse, saju, astro)
        },
        "categoryAnalysis": _get_category_analysis(signals, theme_cross),
        "keyInsights": _get_key_insights(theme_cross, signals, saju),
        "luckyElements": _get_lucky_elements(signals, saju),
        "sajuHighlight": _get_saju_highlight(saju),
        "astroHighlight": _get_astro_highlight(astro, signals),
        "crossHighlights": {
            "summary": cross_summary or "사주와 점성술의 교차 분석 결과입니다.",
            "points": (theme_cross or {}).get("intersections", [])[:3]
        }
    }

    return json.dumps(structured, ensure_ascii=False, indent=2)
