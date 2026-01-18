# backend_ai/app/numerology_logic/interpreter.py
"""
Numerology interpretation engine.
Contains NumerologyInterpreter class and data loading functions.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any

from .constants import MASTER_NUMBERS
from .calculations import calculate_full_numerology, reduce_to_single
from .compatibility import calculate_numerology_compatibility


# ===============================================================
# DATA LOADING
# ===============================================================
_NUMEROLOGY_DATA_CACHE = {}


def _load_numerology_data() -> Dict:
    """Load all numerology JSON data files."""
    global _NUMEROLOGY_DATA_CACHE

    if _NUMEROLOGY_DATA_CACHE:
        return _NUMEROLOGY_DATA_CACHE

    base_dir = Path(__file__).parent.parent.parent
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


class NumerologyInterpreter:
    """Numerology interpretation engine using JSON data files."""

    def __init__(self):
        self.base_dir = Path(__file__).parent.parent.parent
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
