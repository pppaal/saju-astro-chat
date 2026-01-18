# backend_ai/app/numerology_logic/compatibility.py
"""
Numerology compatibility analysis.
Contains functions for calculating compatibility between two people.
"""

from typing import Dict, Any

from .constants import MASTER_NUMBERS, COMPATIBILITY_MATRIX
from .calculations import calculate_full_numerology, reduce_to_single


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

    # Normalize life path for lookup (reduce master numbers for compatibility)
    lp1_norm = lp1 if lp1 <= 9 else reduce_to_single(lp1, keep_master=False)
    lp2_norm = lp2 if lp2 <= 9 else reduce_to_single(lp2, keep_master=False)

    key = (min(lp1_norm, lp2_norm), max(lp1_norm, lp2_norm))
    base_score = COMPATIBILITY_MATRIX.get(key, 70)

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
        expression_score = COMPATIBILITY_MATRIX.get(exp_key, 70)

    final_score = min(100, base_score + master_bonus)
    if expression_score:
        final_score = min(100, (final_score + expression_score) // 2 + master_bonus)

    # Generate compatibility description
    level, description = _get_compatibility_description(final_score)

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


def _get_compatibility_description(score: int) -> tuple:
    """Get compatibility level and description from score."""
    if score >= 90:
        return "excellent", "영혼의 동반자 수준의 깊은 조화"
    elif score >= 80:
        return "very_good", "자연스럽게 서로를 이해하는 좋은 궁합"
    elif score >= 70:
        return "good", "약간의 노력으로 좋은 관계 유지 가능"
    elif score >= 60:
        return "moderate", "차이점을 존중하면 성장할 수 있는 관계"
    else:
        return "challenging", "서로 다른 에너지, 상호 이해가 필요"
