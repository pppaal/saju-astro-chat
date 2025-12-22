# backend_ai/app/numerology_logic.py
"""
Numerology Analysis Logic
=========================
수비학 분석 로직 - 생년월일, 이름 기반 수비학 계산 및 해석
- Life Path Number (생명수)
- Expression Number (표현수)
- Soul Urge Number (영혼수)
- Personality Number (인격수)
- Personal Year/Month/Day
- Name Numerology (이름 수비학)
- Compatibility Analysis (궁합 분석)
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# ===============================================================
# DATA LOADING
# ===============================================================
_NUMEROLOGY_DATA_CACHE = {}


def _load_numerology_data() -> Dict:
    """Load all numerology JSON data files."""
    global _NUMEROLOGY_DATA_CACHE

    if _NUMEROLOGY_DATA_CACHE:
        return _NUMEROLOGY_DATA_CACHE

    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data" / "graph" / "rules" / "numerology"

    files_to_load = {
        "core": "numerology_core_rules.json",
        "compatibility": "numerology_compatibility_rules.json",
        "saju_mapping": "numerology_saju_mapping.json",
        "astro_mapping": "numerology_astro_mapping.json",
        "therapeutic": "numerology_therapeutic_questions.json",
    }

    for key, filename in files_to_load.items():
        filepath = data_dir / filename
        if filepath.exists():
            try:
                with open(filepath, encoding='utf-8') as f:
                    _NUMEROLOGY_DATA_CACHE[key] = json.load(f)
                    print(f"[NumerologyLogic] Loaded {filename}")
            except Exception as e:
                print(f"[NumerologyLogic] Failed to load {filename}: {e}")
                _NUMEROLOGY_DATA_CACHE[key] = {}
        else:
            _NUMEROLOGY_DATA_CACHE[key] = {}

    return _NUMEROLOGY_DATA_CACHE


def get_number_interpretation(number: int, category: str = "life_path") -> Dict:
    """Get interpretation for a numerology number from loaded data."""
    data = _load_numerology_data()
    core = data.get("core", {})
    interpretations = core.get("interpretations", core.get("numbers", {}))

    # Try to find interpretation
    key = str(number)
    if key in interpretations:
        return interpretations[key].get(category, interpretations[key])

    return {}


def get_saju_numerology_correlation(life_path: int, day_master_element: str) -> Dict:
    """Get correlation between numerology life path and saju day master."""
    data = _load_numerology_data()
    saju_map = data.get("saju_mapping", {})

    correlations = saju_map.get("element_number_correlation", {})
    element_numbers = correlations.get(day_master_element.lower(), {})

    return {
        "element": day_master_element,
        "life_path": life_path,
        "harmony": life_path in element_numbers.get("harmonious", []),
        "challenging": life_path in element_numbers.get("challenging", []),
        "insight": element_numbers.get("numbers", {}).get(str(life_path), "")
    }


def get_therapeutic_question(life_path: int) -> str:
    """Get therapeutic question for life path number."""
    data = _load_numerology_data()
    therapeutic = data.get("therapeutic", {})
    questions = therapeutic.get("life_path_questions", {})
    return questions.get(str(life_path), "이 숫자가 당신의 삶에서 어떻게 나타나고 있나요?")


# ===============================================================
# CONSTANTS
# ===============================================================

# Pythagorean letter-to-number mapping (English)
PYTHAGOREAN_MAP = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
    'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
}

# Vowels for soul urge calculation
VOWELS = set('AEIOU')

# Master numbers (not reduced)
MASTER_NUMBERS = {11, 22, 33}

# Korean name stroke counts (simplified - common characters)
# Full implementation would use a comprehensive database
KOREAN_STROKES = {
    # Common surname characters
    '김': 8, '이': 7, '박': 6, '최': 12, '정': 9, '강': 10, '조': 10, '윤': 4,
    '장': 11, '임': 6, '한': 15, '오': 4, '서': 10, '신': 9, '권': 22, '황': 12,
    '안': 6, '송': 11, '류': 10, '홍': 9, '유': 9, '고': 10, '문': 4, '양': 15,
    '손': 10, '배': 11, '백': 6, '허': 11, '남': 9, '심': 12, '노': 15, '하': 3,
    # Common given name characters
    '민': 5, '준': 10, '서': 10, '지': 6, '현': 16, '수': 4, '영': 5, '진': 10,
    '우': 6, '예': 13, '은': 14, '소': 8, '주': 6, '재': 13, '성': 7, '희': 12,
    '승': 12, '아': 8, '태': 4, '시': 5, '도': 12, '경': 8, '인': 6, '상': 11,
    '동': 12, '혜': 15, '연': 14, '미': 9, '원': 10, '호': 9, '석': 5, '용': 16,
    '하': 3, '윤': 4, '정': 9, '나': 7, '린': 15, '빈': 11, '율': 6, '채': 11,
}


# ===============================================================
# CORE CALCULATION FUNCTIONS
# ===============================================================

def reduce_to_single(num: int, keep_master: bool = True) -> int:
    """Reduce number to single digit, optionally keeping master numbers."""
    while num > 9:
        if keep_master and num in MASTER_NUMBERS:
            return num
        num = sum(int(d) for d in str(num))
    return num


def calculate_life_path(birth_date: str) -> Dict[str, Any]:
    """
    Calculate Life Path Number from birth date.

    Args:
        birth_date: Format 'YYYY-MM-DD' or 'YYYYMMDD'

    Returns:
        Dict with life_path number and calculation breakdown
    """
    # Parse date
    date_str = birth_date.replace('-', '').replace('/', '')
    if len(date_str) != 8:
        raise ValueError(f"Invalid date format: {birth_date}")

    year = int(date_str[:4])
    month = int(date_str[4:6])
    day = int(date_str[6:8])

    # Method 1: Reduce each component separately
    year_sum = reduce_to_single(sum(int(d) for d in str(year)), keep_master=True)
    month_sum = reduce_to_single(month, keep_master=True)
    day_sum = reduce_to_single(day, keep_master=True)

    # Final life path
    total = year_sum + month_sum + day_sum
    life_path = reduce_to_single(total, keep_master=True)

    return {
        'life_path': life_path,
        'year_component': year_sum,
        'month_component': month_sum,
        'day_component': day_sum,
        'calculation': f"{year} -> {year_sum}, {month} -> {month_sum}, {day} -> {day_sum} = {total} -> {life_path}",
        'is_master': life_path in MASTER_NUMBERS
    }


def calculate_expression_number(full_name: str) -> Dict[str, Any]:
    """
    Calculate Expression Number from full name (all letters).

    Args:
        full_name: Full name in English letters

    Returns:
        Dict with expression number and breakdown
    """
    name_upper = full_name.upper().replace(' ', '')
    total = 0
    letter_values = []

    for letter in name_upper:
        if letter in PYTHAGOREAN_MAP:
            val = PYTHAGOREAN_MAP[letter]
            total += val
            letter_values.append((letter, val))

    expression = reduce_to_single(total, keep_master=True)

    return {
        'expression': expression,
        'total_before_reduce': total,
        'letter_values': letter_values,
        'is_master': expression in MASTER_NUMBERS
    }


def calculate_soul_urge(full_name: str) -> Dict[str, Any]:
    """
    Calculate Soul Urge Number from vowels only.

    Args:
        full_name: Full name in English letters

    Returns:
        Dict with soul urge number and breakdown
    """
    name_upper = full_name.upper().replace(' ', '')
    total = 0
    vowel_values = []

    for letter in name_upper:
        if letter in VOWELS and letter in PYTHAGOREAN_MAP:
            val = PYTHAGOREAN_MAP[letter]
            total += val
            vowel_values.append((letter, val))

    soul_urge = reduce_to_single(total, keep_master=True)

    return {
        'soul_urge': soul_urge,
        'total_before_reduce': total,
        'vowel_values': vowel_values,
        'is_master': soul_urge in MASTER_NUMBERS
    }


def calculate_personality_number(full_name: str) -> Dict[str, Any]:
    """
    Calculate Personality Number from consonants only.

    Args:
        full_name: Full name in English letters

    Returns:
        Dict with personality number and breakdown
    """
    name_upper = full_name.upper().replace(' ', '')
    total = 0
    consonant_values = []

    for letter in name_upper:
        if letter not in VOWELS and letter in PYTHAGOREAN_MAP:
            val = PYTHAGOREAN_MAP[letter]
            total += val
            consonant_values.append((letter, val))

    personality = reduce_to_single(total, keep_master=True)

    return {
        'personality': personality,
        'total_before_reduce': total,
        'consonant_values': consonant_values,
        'is_master': personality in MASTER_NUMBERS
    }


def calculate_personal_year(birth_date: str, target_year: int = None) -> Dict[str, Any]:
    """
    Calculate Personal Year Number.

    Args:
        birth_date: Format 'YYYY-MM-DD'
        target_year: Year to calculate for (default: current year)

    Returns:
        Dict with personal year number
    """
    date_str = birth_date.replace('-', '').replace('/', '')
    month = int(date_str[4:6])
    day = int(date_str[6:8])

    if target_year is None:
        target_year = datetime.now().year

    # Personal Year = birth month + birth day + target year
    total = reduce_to_single(month) + reduce_to_single(day) + reduce_to_single(sum(int(d) for d in str(target_year)))
    personal_year = reduce_to_single(total, keep_master=False)

    return {
        'personal_year': personal_year,
        'target_year': target_year,
        'cycle_position': personal_year,  # 9-year cycle position
        'calculation': f"{month} + {day} + {target_year} -> {personal_year}"
    }


def calculate_personal_month(birth_date: str, target_year: int = None, target_month: int = None) -> Dict[str, Any]:
    """Calculate Personal Month Number."""
    if target_year is None:
        target_year = datetime.now().year
    if target_month is None:
        target_month = datetime.now().month

    py = calculate_personal_year(birth_date, target_year)
    personal_month = reduce_to_single(py['personal_year'] + target_month, keep_master=False)

    return {
        'personal_month': personal_month,
        'personal_year': py['personal_year'],
        'target_month': target_month,
        'target_year': target_year
    }


def calculate_personal_day(birth_date: str, target_date: str = None) -> Dict[str, Any]:
    """Calculate Personal Day Number."""
    if target_date is None:
        target_date = datetime.now().strftime('%Y-%m-%d')

    target_dt = datetime.strptime(target_date.replace('/', '-'), '%Y-%m-%d')
    pm = calculate_personal_month(birth_date, target_dt.year, target_dt.month)

    personal_day = reduce_to_single(pm['personal_month'] + target_dt.day, keep_master=False)

    return {
        'personal_day': personal_day,
        'personal_month': pm['personal_month'],
        'personal_year': pm['personal_year'],
        'target_date': target_date
    }


def calculate_korean_name_number(korean_name: str) -> Dict[str, Any]:
    """
    Calculate numerology number from Korean name using stroke counts.

    Args:
        korean_name: Korean name (한글)

    Returns:
        Dict with name number and stroke breakdown
    """
    total_strokes = 0
    stroke_breakdown = []
    unknown_chars = []

    for char in korean_name:
        if char in KOREAN_STROKES:
            strokes = KOREAN_STROKES[char]
            total_strokes += strokes
            stroke_breakdown.append((char, strokes))
        elif char.strip():  # Not whitespace
            unknown_chars.append(char)
            # Estimate strokes for unknown characters (middle value)
            estimated = 10
            total_strokes += estimated
            stroke_breakdown.append((char, f"~{estimated}"))

    name_number = reduce_to_single(total_strokes, keep_master=True)

    return {
        'name_number': name_number,
        'total_strokes': total_strokes,
        'stroke_breakdown': stroke_breakdown,
        'unknown_characters': unknown_chars,
        'is_master': name_number in MASTER_NUMBERS,
        'reliability': 'high' if not unknown_chars else 'estimated'
    }


# ===============================================================
# COMPREHENSIVE NUMEROLOGY ANALYSIS
# ===============================================================

def calculate_full_numerology(
    birth_date: str,
    english_name: str = None,
    korean_name: str = None
) -> Dict[str, Any]:
    """
    Calculate complete numerology profile.

    Args:
        birth_date: Format 'YYYY-MM-DD'
        english_name: Full name in English (optional)
        korean_name: Korean name in 한글 (optional)

    Returns:
        Complete numerology profile
    """
    result = {
        'birth_date': birth_date,
        'life_path': calculate_life_path(birth_date),
        'personal_year': calculate_personal_year(birth_date),
        'personal_month': calculate_personal_month(birth_date),
        'personal_day': calculate_personal_day(birth_date)
    }

    if english_name:
        result['expression'] = calculate_expression_number(english_name)
        result['soul_urge'] = calculate_soul_urge(english_name)
        result['personality'] = calculate_personality_number(english_name)
        result['english_name'] = english_name

    if korean_name:
        result['korean_name_number'] = calculate_korean_name_number(korean_name)
        result['korean_name'] = korean_name

    # Calculate core numbers summary
    core_numbers = [result['life_path']['life_path']]
    if 'expression' in result:
        core_numbers.append(result['expression']['expression'])
    if 'soul_urge' in result:
        core_numbers.append(result['soul_urge']['soul_urge'])

    # Check for master numbers
    master_numbers_found = [n for n in core_numbers if n in MASTER_NUMBERS]

    result['summary'] = {
        'core_numbers': core_numbers,
        'dominant_number': max(set(core_numbers), key=core_numbers.count) if core_numbers else None,
        'has_master_numbers': len(master_numbers_found) > 0,
        'master_numbers': master_numbers_found
    }

    return result


# ===============================================================
# COMPATIBILITY ANALYSIS
# ===============================================================

def calculate_numerology_compatibility(
    person1_birth: str,
    person2_birth: str,
    person1_name: str = None,
    person2_name: str = None
) -> Dict[str, Any]:
    """
    Calculate numerology compatibility between two people.

    Args:
        person1_birth: Person 1's birth date 'YYYY-MM-DD'
        person2_birth: Person 2's birth date 'YYYY-MM-DD'
        person1_name: Person 1's English name (optional)
        person2_name: Person 2's English name (optional)

    Returns:
        Compatibility analysis
    """
    # Get both profiles
    p1 = calculate_full_numerology(person1_birth, person1_name)
    p2 = calculate_full_numerology(person2_birth, person2_name)

    lp1 = p1['life_path']['life_path']
    lp2 = p2['life_path']['life_path']

    # Life Path compatibility matrix (simplified)
    # Higher score = better compatibility
    compatibility_matrix = {
        (1, 1): 70, (1, 2): 60, (1, 3): 85, (1, 4): 50, (1, 5): 90,
        (1, 6): 65, (1, 7): 55, (1, 8): 75, (1, 9): 80,
        (2, 2): 80, (2, 3): 75, (2, 4): 85, (2, 5): 55, (2, 6): 95,
        (2, 7): 70, (2, 8): 90, (2, 9): 65,
        (3, 3): 85, (3, 4): 50, (3, 5): 95, (3, 6): 90, (3, 7): 55,
        (3, 8): 60, (3, 9): 85,
        (4, 4): 70, (4, 5): 45, (4, 6): 80, (4, 7): 90, (4, 8): 85,
        (4, 9): 55,
        (5, 5): 75, (5, 6): 50, (5, 7): 85, (5, 8): 60, (5, 9): 90,
        (6, 6): 85, (6, 7): 55, (6, 8): 70, (6, 9): 95,
        (7, 7): 80, (7, 8): 50, (7, 9): 70,
        (8, 8): 75, (8, 9): 55,
        (9, 9): 85
    }

    # Normalize life path for lookup (reduce master numbers for compatibility)
    lp1_norm = lp1 if lp1 <= 9 else reduce_to_single(lp1, keep_master=False)
    lp2_norm = lp2 if lp2 <= 9 else reduce_to_single(lp2, keep_master=False)

    key = (min(lp1_norm, lp2_norm), max(lp1_norm, lp2_norm))
    base_score = compatibility_matrix.get(key, 70)

    # Bonus for master numbers
    master_bonus = 0
    if lp1 in MASTER_NUMBERS or lp2 in MASTER_NUMBERS:
        master_bonus = 5
    if lp1 in MASTER_NUMBERS and lp2 in MASTER_NUMBERS:
        master_bonus = 10

    # Expression number compatibility (if names provided)
    expression_score = None
    if 'expression' in p1 and 'expression' in p2:
        exp1 = p1['expression']['expression']
        exp2 = p2['expression']['expression']
        exp1_norm = exp1 if exp1 <= 9 else reduce_to_single(exp1, keep_master=False)
        exp2_norm = exp2 if exp2 <= 9 else reduce_to_single(exp2, keep_master=False)
        exp_key = (min(exp1_norm, exp2_norm), max(exp1_norm, exp2_norm))
        expression_score = compatibility_matrix.get(exp_key, 70)

    final_score = min(100, base_score + master_bonus)
    if expression_score:
        final_score = min(100, (final_score + expression_score) // 2 + master_bonus)

    # Generate compatibility description
    if final_score >= 90:
        level = "excellent"
        description = "영혼의 동반자 수준의 깊은 조화"
    elif final_score >= 80:
        level = "very_good"
        description = "자연스럽게 서로를 이해하는 좋은 궁합"
    elif final_score >= 70:
        level = "good"
        description = "약간의 노력으로 좋은 관계 유지 가능"
    elif final_score >= 60:
        level = "moderate"
        description = "차이점을 존중하면 성장할 수 있는 관계"
    else:
        level = "challenging"
        description = "서로 다른 에너지, 상호 이해가 필요"

    return {
        'overall_score': final_score,
        'level': level,
        'description': description,
        'life_path_comparison': {
            'person1': lp1,
            'person2': lp2,
            'base_score': base_score
        },
        'expression_comparison': {
            'person1': p1.get('expression', {}).get('expression'),
            'person2': p2.get('expression', {}).get('expression'),
            'score': expression_score
        } if expression_score else None,
        'master_number_bonus': master_bonus,
        'person1_profile': p1,
        'person2_profile': p2
    }


# ===============================================================
# DATA LOADING & INTERPRETATION
# ===============================================================

class NumerologyInterpreter:
    """Numerology interpretation engine using JSON data files."""

    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data" / "graph" / "numerology"
        self.data = {}
        self._load_data()

    def _load_data(self):
        """Load all numerology JSON data files."""
        if not self.data_dir.exists():
            print(f"[NumerologyInterpreter] Data directory not found: {self.data_dir}")
            return

        for json_file in self.data_dir.glob("*.json"):
            try:
                with open(json_file, encoding='utf-8') as f:
                    key = json_file.stem
                    self.data[key] = json.load(f)
                    print(f"[NumerologyInterpreter] Loaded {key}")
            except Exception as e:
                print(f"[NumerologyInterpreter] Failed to load {json_file}: {e}")

    def get_life_path_meaning(self, number: int, locale: str = "ko") -> Dict[str, Any]:
        """Get interpretation for a life path number."""
        core = self.data.get('core_meanings', {})
        life_paths = core.get('life_path_numbers', {})

        num_str = str(number)
        if num_str in life_paths:
            return life_paths[num_str]

        # Check master numbers
        master = self.data.get('master_numbers', {}).get('master_numbers', {})
        if num_str in master:
            return master[num_str]

        return {"meaning": f"생명수 {number}에 대한 해석을 찾을 수 없습니다."}

    def get_personal_year_meaning(self, number: int) -> Dict[str, Any]:
        """Get interpretation for a personal year number."""
        advanced = self.data.get('advanced_numerology', {})
        years = advanced.get('personal_year_cycles', {})

        num_str = str(number)
        if num_str in years:
            return years[num_str]

        return {"theme": f"개인년 {number}", "focus": "성장과 변화"}

    def get_compatibility_insight(self, num1: int, num2: int) -> Dict[str, Any]:
        """Get compatibility insight for two numbers."""
        combos = self.data.get('number_combinations', {})
        pairings = combos.get('life_path_pairings', {})

        # Try both orders
        key1 = f"{num1}-{num2}"
        key2 = f"{num2}-{num1}"

        if key1 in pairings:
            return pairings[key1]
        if key2 in pairings:
            return pairings[key2]

        return {"compatibility": "moderate", "description": "균형 잡힌 관계"}

    def interpret_full_profile(self, profile: Dict[str, Any], locale: str = "ko") -> Dict[str, Any]:
        """
        Generate full interpretation for a numerology profile.

        Args:
            profile: Output from calculate_full_numerology()
            locale: Language code

        Returns:
            Interpreted profile with meanings
        """
        result = {
            'numbers': profile,
            'interpretations': {}
        }

        # Life Path interpretation
        lp = profile.get('life_path', {}).get('life_path')
        if lp:
            result['interpretations']['life_path'] = self.get_life_path_meaning(lp, locale)

        # Personal Year interpretation
        py = profile.get('personal_year', {}).get('personal_year')
        if py:
            result['interpretations']['personal_year'] = self.get_personal_year_meaning(py)

        # Expression interpretation
        exp = profile.get('expression', {}).get('expression')
        if exp:
            result['interpretations']['expression'] = self.get_life_path_meaning(exp, locale)

        # Soul Urge interpretation
        su = profile.get('soul_urge', {}).get('soul_urge')
        if su:
            result['interpretations']['soul_urge'] = self.get_life_path_meaning(su, locale)

        return result


# ===============================================================
# MAIN INTERFACE FUNCTIONS
# ===============================================================

def analyze_numerology(
    birth_date: str,
    english_name: str = None,
    korean_name: str = None,
    locale: str = "ko"
) -> Dict[str, Any]:
    """
    Main numerology analysis function.

    Args:
        birth_date: Format 'YYYY-MM-DD'
        english_name: Full name in English (optional)
        korean_name: Korean name (optional)
        locale: Language code for interpretations

    Returns:
        Complete numerology analysis with interpretations
    """
    try:
        # Calculate numbers
        profile = calculate_full_numerology(birth_date, english_name, korean_name)

        # Get interpretations
        interpreter = NumerologyInterpreter()
        interpreted = interpreter.interpret_full_profile(profile, locale)

        return {
            'status': 'success',
            'profile': profile,
            'interpretations': interpreted['interpretations'],
            'summary': profile.get('summary', {})
        }

    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': str(e),
            'trace': traceback.format_exc()
        }


def analyze_numerology_compatibility(
    person1_birth: str,
    person2_birth: str,
    person1_name: str = None,
    person2_name: str = None,
    locale: str = "ko"
) -> Dict[str, Any]:
    """
    Analyze numerology compatibility between two people.

    Args:
        person1_birth: Person 1's birth date 'YYYY-MM-DD'
        person2_birth: Person 2's birth date 'YYYY-MM-DD'
        person1_name: Person 1's English name (optional)
        person2_name: Person 2's English name (optional)
        locale: Language code

    Returns:
        Compatibility analysis with interpretations
    """
    try:
        # Calculate compatibility
        compat = calculate_numerology_compatibility(
            person1_birth, person2_birth,
            person1_name, person2_name
        )

        # Get additional insights
        interpreter = NumerologyInterpreter()
        lp1 = compat['life_path_comparison']['person1']
        lp2 = compat['life_path_comparison']['person2']

        # Normalize for lookup
        lp1_norm = lp1 if lp1 <= 9 else reduce_to_single(lp1, keep_master=False)
        lp2_norm = lp2 if lp2 <= 9 else reduce_to_single(lp2, keep_master=False)

        compat['pairing_insight'] = interpreter.get_compatibility_insight(lp1_norm, lp2_norm)

        return {
            'status': 'success',
            'compatibility': compat
        }

    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': str(e),
            'trace': traceback.format_exc()
        }


# For testing
if __name__ == "__main__":
    # Test basic calculation
    result = calculate_life_path("1990-05-15")
    print(f"Life Path: {result}")

    # Test full analysis
    analysis = analyze_numerology(
        birth_date="1990-05-15",
        english_name="John Smith",
        korean_name="김민수"
    )
    print(f"\nFull Analysis: {json.dumps(analysis, indent=2, ensure_ascii=False)}")
